import { ITEMS, LESSONS, CAST } from './content.js';
import { compile, finalize, extraRecall } from './engine.js';
import manifest from '../audio/manifest.js';

const $ = (s) => document.querySelector(s);
const SLOW_ANSWER = 3.0; // seconds of silence before speaking that counts as "hard"

// ---------- storage (per-device convenience only) ----------
const store = {
  get() {
    try { return JSON.parse(localStorage.getItem('tzij.v1')) || {}; } catch { return {}; }
  },
  set(fn) {
    const s = this.get();
    fn(s);
    try { localStorage.setItem('tzij.v1', JSON.stringify(s)); } catch {}
    return s;
  },
};
const today = () => new Date().toISOString().slice(0, 10);

// ---------- audio ----------
let ctx;
const buffers = new Map();
function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    // iOS: play through the silent switch like a media app.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
  }
  if (ctx.state !== 'running') ctx.resume();
  return ctx;
}
async function load(keys, onProgress) {
  const todo = [...new Set(keys)].filter((k) => !buffers.has(k) && manifest[k]);
  let done = 0;
  const work = async (k) => {
    try {
      const res = await fetch(manifest[k].f);
      buffers.set(k, await ctx.decodeAudioData(await res.arrayBuffer()));
    } catch (e) { console.warn('audio', k, e); }
    onProgress?.(++done / todo.length);
  };
  const q = [...todo];
  await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) await work(q.shift()); }));
}
function chime(at = ctx.currentTime) {
  [[784, 0], [1175, 0.09]].forEach(([f, dt]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, at + dt);
    g.gain.linearRampToValueAtTime(0.18, at + dt + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, at + dt + 0.45);
    o.connect(g).connect(ctx.destination);
    o.start(at + dt); o.stop(at + dt + 0.5);
  });
}

// ---------- microphone: detects *that* you spoke, never records ----------
const mic = {
  on: false, an: null, buf: null, floor: 0.01,
  async enable() {
    audio();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const src = ctx.createMediaStreamSource(stream);
    this.an = ctx.createAnalyser();
    this.an.fftSize = 1024;
    this.buf = new Float32Array(this.an.fftSize);
    src.connect(this.an);
    this.on = true;
  },
  level() {
    this.an.getFloatTimeDomainData(this.buf);
    let s = 0;
    for (const v of this.buf) s += v * v;
    return Math.sqrt(s / this.buf.length);
  },
  sample() {
    if (!this.on) return;
    const l = this.level();
    this.floor = this.floor * 0.97 + Math.min(l, 0.05) * 0.03;
  },
  get threshold() { return Math.max(0.02, this.floor * 3); },
};

// ---------- runner ----------
class Runner {
  constructor(lessonId, events) {
    this.lessonId = lessonId;
    this.ev = events;
    this.idx = 0;
    this.gen = 0;
    this.cancel = null;
    this.paused = false;
    this.turnState = null;
    this.stats = { turns: 0, spoke: 0, latencies: [], hard: new Set() };
  }
  get total() { const e = this.ev.at(-1); return e.t + e.dur; }
  get cur() { return this.ev[this.idx]; }
  start(i = 0) {
    this.idx = i;
    const my = ++this.gen;
    this.loop(my);
  }
  async loop(my) {
    while (this.idx < this.ev.length) {
      const e = this.ev[this.idx];
      this.evStart = ctx.currentTime;
      ui.event(e);
      await this.exec(e, my);
      if (my !== this.gen) return;
      this.idx++;
    }
    finish(this);
  }
  stop() { this.gen++; this.cancel?.(); }
  seek(i) {
    this.stop();
    if (this.paused) this.togglePause();
    this.start(Math.max(0, Math.min(i, this.ev.length - 1)));
  }
  togglePause() {
    this.paused = !this.paused;
    this.paused ? ctx.suspend() : ctx.resume();
    ui.paused(this.paused);
  }
  groupStart(g) { return this.ev.findIndex((e) => e.g === g); }
  back() {
    const e = this.cur;
    const s = this.groupStart(e.g);
    const into = ctx.currentTime - this.evStart;
    this.seek(this.idx > s || into > 1.5 ? s : this.groupStart(Math.max(1, e.g - 1)));
  }
  forward() {
    const i = this.ev.findIndex((e) => e.g > this.cur.g);
    if (i >= 0) this.seek(i);
  }
  play(buf, my) {
    return new Promise((res) => {
      if (my !== this.gen) return res();
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(ctx.destination);
      s.onended = () => res();
      s.start();
      this.cancel = () => { s.onended = null; try { s.stop(); } catch {} res(); };
    });
  }
  // Waits on the audio clock, so pausing (ctx.suspend) freezes it too.
  wait(sec, my) {
    if (sec <= 0) return Promise.resolve();
    const b = ctx.createBuffer(1, Math.max(1, Math.round(sec * ctx.sampleRate)), ctx.sampleRate);
    return this.play(b, my);
  }
  async exec(e, my) {
    if (e.type === 'speak') {
      const b = buffers.get(e.key);
      if (b) { await this.play(b, my); await this.wait(e.dur - b.duration, my); }
      else await this.wait(e.dur, my);
    } else if (e.type === 'gap') {
      await this.wait(e.dur, my);
    } else if (e.type === 'chime') {
      chime(); await this.wait(e.dur, my);
    } else if (e.type === 'turn') {
      await this.turn(e, my);
    }
  }
  // Forced production: with a mic, the answer is withheld until the learner
  // has actually said something (or a generous timeout passes).
  async turn(e, my) {
    if (e.chime) chime();
    this.stats.turns++;
    const t0 = ctx.currentTime;
    const ts = (this.turnState = { e, t0, heard: false, onset: null, nudged: false, level: 0 });
    if (!mic.on) {
      await this.wait(e.dur, my);
      this.turnDone(e, ts, null);
      return;
    }
    const minWait = 0.35;
    const maxSilent = e.dur + 4;
    const maxTalk = e.mode === 'free' ? 6 : Math.max(3, e.dur * 1.4);
    let quietSince = null, loudFor = 0, last = ctx.currentTime;
    await new Promise((res) => {
      const iv = setInterval(() => {
        if (my !== this.gen) { clearInterval(iv); return res(); }
        if (this.paused) return;
        const now = ctx.currentTime, dt = now - last; last = now;
        const el = now - t0;
        const l = mic.level();
        ts.level = l;
        const loud = el > minWait && l > mic.threshold;
        if (!ts.heard) {
          loudFor = loud ? loudFor + dt : 0;
          if (loudFor > 0.12) { ts.heard = true; ts.onset = el - loudFor; }
          if (!ts.heard && el > e.dur && !ts.nudged) { ts.nudged = true; ui.nudge(); }
          if (!ts.heard && el > maxSilent) { clearInterval(iv); res(); }
        } else {
          quietSince = loud ? null : quietSince ?? now;
          if ((quietSince && now - quietSince > 0.6) || el - ts.onset > maxTalk) { clearInterval(iv); res(); }
        }
      }, 30);
      this.cancel = () => { clearInterval(iv); res(); };
    });
    if (my !== this.gen) return;
    this.turnDone(e, ts, ts.heard ? ts.onset : Infinity);
  }
  turnDone(e, ts, latency) {
    this.turnState = null;
    if (latency !== null && latency !== Infinity) { this.stats.spoke++; this.stats.latencies.push(latency); }
    if (e.mode !== 'recall' || !e.item) return;
    if (latency === Infinity || latency > SLOW_ANSWER) this.markHard(e.item, true);
  }
  // Pulls a struggling item forward: an extra recall ~3 blocks from now.
  markHard(item, auto = false) {
    if (this.stats.hard.has(item + this.cur.g)) return;
    this.stats.hard.add(item + this.cur.g);
    store.set((s) => { s.hard = s.hard || {}; s.hard[item] = (s.hard[item] || 0) + 1; });
    let at = this.ev.findIndex((e) => e.g >= this.cur.g + 3);
    if (at < 0) at = this.ev.length;
    const block = extraRecall(item, manifest, 1);
    block.forEach((e) => (e.chapter = this.ev[Math.max(0, at - 1)].chapter));
    this.ev.splice(at, 0, ...block);
    finalize(this.ev);
    ui.toast(auto ? 'Esa frase vuelve pronto ↻' : 'Va a volver pronto ↻');
    ui.hardUsed();
  }
}

// ---------- UI ----------
let runner = null;
const stage = $('#stage');
const ring = $('#ring');
const RING_LEN = 2 * Math.PI * 100;
ring.style.strokeDasharray = RING_LEN;

const HINTS = {
  repeat: 'Repite en voz alta',
  recall: 'Dilo en inglés',
  free: 'Tu turno',
};

const ui = {
  cc: (() => { try { return localStorage.getItem('tzij.cc') === '1'; } catch { return false; } })(),
  event(e) {
    const turn = e.type === 'turn';
    stage.dataset.state = turn ? 'turn' : e.type === 'speak' ? 'speak' : 'idle';
    stage.dataset.mode = e.mode || '';
    stage.classList.remove('nudge', 'heard');
    if (e.type === 'speak') {
      const c = CAST[e.role];
      stage.dataset.color = c.color;
      $('#avatar').innerHTML = c.img ? `<img src="${c.img}" alt="">` : `<span>${c.short}</span>`;
      $('#who').textContent = c.name + (c.sub ? ` · ${c.sub}` : '');
      $('#hint').textContent = e.confirm ? 'Escucha y compara' : e.role === 'slow' ? 'Escucha' : '';
      const lang = e.role === 'narrator' ? 'es' : 'en';
      $('#caption').innerHTML = `<span class="${lang}">${esc(e.text)}</span>`;
    } else if (turn) {
      stage.dataset.color = 'you';
      $('#who').textContent = 'Tu turno';
      $('#hint').textContent = e.label || HINTS[e.mode];
      $('#caption').innerHTML = '';
    } else if (e.type === 'chime') {
      stage.dataset.color = 'you';
      $('#who').textContent = '';
      $('#hint').textContent = '';
      $('#caption').innerHTML = '';
    }
    if (e.chapter) $('#p-chapter').textContent = e.chapter;
    const hardable = e.item && (e.kind === 'recall' || e.kind === 'converse') && (turn || e.confirm);
    if (hardable && !runner.stats.hard.has(e.item + e.g)) $('#p-hard').hidden = false;
    else if (!e.item || e.type === 'speak' && !e.confirm) $('#p-hard').hidden = true;
  },
  nudge() { stage.classList.add('nudge'); $('#hint').textContent = '¡En voz alta! 🙂'; },
  hardUsed() { $('#p-hard').hidden = true; },
  paused(p) { $('#player').classList.toggle('is-paused', p); $('#p-play').setAttribute('aria-label', p ? 'Seguir' : 'Pausa'); },
  toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('show'), 2200);
  },
  setCC(on) {
    this.cc = on;
    $('#player').classList.toggle('show-cc', on);
    $('#p-cc').setAttribute('aria-pressed', on);
    try { localStorage.setItem('tzij.cc', on ? '1' : '0'); } catch {}
  },
};
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function frame() {
  requestAnimationFrame(frame);
  if (!runner || !ctx) return;
  mic.sample();
  const e = runner.cur;
  if (!e) return;
  const el = ctx.currentTime - runner.evStart;
  $('#p-bar').style.width = `${Math.min(100, ((e.t + Math.min(el, e.dur)) / runner.total) * 100)}%`;
  const ts = runner.turnState;
  if (ts) {
    if (mic.on) {
      const lv = Math.min(1, ts.level / (mic.threshold * 2.5));
      stage.style.setProperty('--lv', lv.toFixed(2));
      if (ts.heard) stage.classList.add('heard');
      ring.style.strokeDashoffset = ts.heard ? 0 : RING_LEN * (1 - Math.min(1, (ctx.currentTime - ts.t0) / (ts.e.dur + 4)));
    } else {
      ring.style.strokeDashoffset = RING_LEN * Math.min(1, (ctx.currentTime - ts.t0) / ts.e.dur);
    }
  }
}
requestAnimationFrame(frame);

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
}

async function startLesson(id) {
  audio();
  const s = store.get();
  const events = compile(id, manifest, { hard: s.hard || {} });
  show('player');
  ui.setCC(ui.cc);
  ui.paused(false);
  $('#p-lesson').textContent = LESSONS[id].title;
  $('#p-bar').style.width = '0';
  $('#p-hard').hidden = true;
  const loading = $('#loading');
  loading.classList.add('show');
  const keys = Object.keys(manifest).filter((k) => events.some((e) => e.key === k) || k.startsWith('ix|') || k.startsWith('ba|'));
  await load(keys, (p) => (loading.querySelector('p').textContent = `Preparando el audio… ${Math.round(p * 100)}%`));
  loading.classList.remove('show');
  runner = new Runner(id, events);
  runner.start();
}

function finish(r) {
  const st = store.set((s) => {
    s.done = s.done || {};
    s.done[r.lessonId] = today();
    s.items = s.items || {};
    for (const id of LESSONS[r.lessonId].items) s.items[id] = today();
  });
  runner = null;
  const L = LESSONS[r.lessonId];
  $('#done-sub').textContent = `Terminaste «${L.title}».`;
  const avg = r.stats.latencies.length ? r.stats.latencies.reduce((a, b) => a + b, 0) / r.stats.latencies.length : null;
  $('#stats').innerHTML = `
    <div><b>${mic.on ? r.stats.spoke : r.stats.turns}</b><span>veces hablaste<br>en inglés</span></div>
    ${avg !== null ? `<div><b>${avg.toFixed(1)} s</b><span>para empezar<br>a responder</span></div>` : ''}
    <div><b>${L.items.length}</b><span>frases<br>nuevas</span></div>`;
  renderVocab($('#done-vocab'), L.items);
  const nextId = r.lessonId === 'l1' ? 'l2' : 'review';
  $('#next').innerHTML = `<p><b>Mañana:</b> ${r.lessonId === 'l1' ? 'empieza la lección 2 con un repaso de hoy.' : 'un repaso rápido de 2 minutos.'} Dormir entre repasos ayuda a recordar.</p>`;
  show('done');
  renderHome(st);
}

function renderVocab(ul, ids) {
  ul.innerHTML = ids.map((id) => {
    const it = ITEMS[id];
    return `<li><button class="v-play" data-id="${id}" aria-label="Escuchar ${esc(it.en)}">▶</button>
      <div><p class="kaq">${esc(it.kaq)}</p><p class="en">${esc(it.en)}</p><p class="say">${esc(it.say)} · ${esc(it.es)}</p></div></li>`;
  }).join('');
}

async function playItem(id) {
  audio();
  const k = `ix|${ITEMS[id].en.replace("B'alam", 'Bah-lahm')}`;
  if (!buffers.has(k)) await load([k]);
  const b = buffers.get(k);
  if (!b) return;
  const s = ctx.createBufferSource();
  s.buffer = b; s.connect(ctx.destination); s.start();
}

function renderHome(s = store.get()) {
  const done = s.done || {};
  const order = ['l1', 'l2', 'review'];
  $('#lessons').innerHTML = order.map((id, i) => {
    const L = LESSONS[id];
    const evs = compile(id, manifest);
    const min = Math.round((evs.at(-1).t + evs.at(-1).dur) / 60);
    const prev = order[i - 1];
    const soon = prev && done[prev] === today() && !done[id];
    const tag = done[id] ? `<span class="tag ok">✓ hecha</span>` : soon ? `<span class="tag">mejor mañana</span>` : '';
    return `<li><button class="lesson" data-id="${id}">
      <span class="num">${id === 'review' ? '↻' : i + 1}</span>
      <span class="l-text"><b>${esc(L.title)}</b><small>${esc(L.subtitle)} · ${min} min</small></span>
      ${tag}<span class="go">▶</span></button></li>`;
  }).join('');
  const learned = Object.keys(ITEMS).filter((id) => s.items?.[id]);
  renderVocab($('#vocab'), learned);
  $('#vocab-note').hidden = learned.length === Object.keys(ITEMS).length;
}

function renderMic() {
  $('#mic-ico').textContent = mic.on ? '✅' : '🎙️';
  $('#mic-text').innerHTML = mic.on
    ? 'Micrófono activo: la app <b>espera a que hables</b>. No graba ni envía nada.'
    : 'Con el micrófono, la app <b>te espera</b> hasta que hables. No graba nada.';
  $('#mic-btn').hidden = mic.on;
}

// ---------- wiring ----------
$('#lessons').addEventListener('click', (ev) => {
  const b = ev.target.closest('.lesson');
  if (b) startLesson(b.dataset.id);
});
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('.v-play');
  if (b) playItem(b.dataset.id);
});
$('#mic-btn').addEventListener('click', async () => {
  try { await mic.enable(); store.set((s) => (s.mic = true)); }
  catch { ui.toast('No se pudo usar el micrófono'); $('#mic-text').textContent = 'Sin micrófono: la app hará pausas fijas para que hables.'; }
  renderMic();
});
$('#p-play').addEventListener('click', () => runner?.togglePause());
$('#p-back').addEventListener('click', () => runner?.back());
$('#p-fwd').addEventListener('click', () => runner?.forward());
$('#p-cc').addEventListener('click', () => ui.setCC(!ui.cc));
$('#p-hard').addEventListener('click', () => { const e = runner?.cur; if (e?.item) runner.markHard(e.item); });
$('#p-close').addEventListener('click', () => { runner?.stop(); runner = null; ctx?.resume(); show('home'); });
$('#done-home').addEventListener('click', () => show('home'));
$('#about-btn').addEventListener('click', () => $('#about').showModal());
$('#about').addEventListener('click', (e) => { if (e.target.id === 'about') e.target.close(); });

renderHome();
renderMic();
if (store.get().mic && navigator.permissions) {
  navigator.permissions.query({ name: 'microphone' }).then((p) => {
    if (p.state === 'granted') {
      const once = async () => { document.removeEventListener('pointerdown', once, true); try { await mic.enable(); } catch {} renderMic(); };
      document.addEventListener('pointerdown', once, true);
    }
  }).catch(() => {});
}

window.tzijDebug = { get runner() { return runner; }, mic };
