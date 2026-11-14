import { ITEMS, LESSONS, CAST } from './content.js';
import { compile, finalize, extraRecall, Builder } from './engine.js';
import manifest from '../audio/manifest.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let srBroken = null;

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
    setSession('playback');
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

function ding() {
  const at = ctx.currentTime;
  [[1319, 0], [1760, 0.07]].forEach(([f, dt]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, at + dt);
    g.gain.exponentialRampToValueAtTime(0.08, at + dt + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dt + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start(at + dt); o.stop(at + dt + 0.35);
  });
}

// ---------- microphone: detects *that* you spoke, never records ----------
// Two modes. 'sr': the browser's speech recognizer owns the mic (one capture
// only; a second getUserMedia stream breaks recognition on Android). 'vad':
// no recognizer, so we measure loudness locally to know that you spoke.
const mic = {
  on: false, mode: null, denied: false, an: null, buf: null, floor: 0.01,
  enable() {
    if (this.on) return Promise.resolve();
    return (this._p ??= this._enable().finally(() => (this._p = null)));
  },
  async _enable() {
    audio();
    setSession('play-and-record');
    try {
      if (SR) await srPermission();
      else await this.vad();
      this.on = true;
    } catch (e) {
      setSession('playback');
      throw e;
    }
  },
  async vad() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const src = ctx.createMediaStreamSource(stream);
    this.an = ctx.createAnalyser();
    this.an.fftSize = 1024;
    this.buf = new Float32Array(this.an.fftSize);
    src.connect(this.an);
    this.mode = 'vad';
  },
  level() {
    if (this.mode !== 'vad') return 0;
    this.an.getFloatTimeDomainData(this.buf);
    let s = 0;
    for (const v of this.buf) s += v * v;
    return Math.sqrt(s / this.buf.length);
  },
  sample() {
    if (this.mode !== 'vad') return;
    const l = this.level();
    this.floor = this.floor * 0.97 + Math.min(l, 0.05) * 0.03;
  },
  get threshold() { return Math.max(0.02, this.floor * 3); },
};

// iOS: 'playback' ignores the silent switch; 'play-and-record' is required
// while capturing or Safari may duck or reroute our audio.
function setSession(type) {
  try { if (navigator.audioSession) navigator.audioSession.type = type; } catch {}
}

// Starting a recognizer is what triggers the permission prompt.
function srPermission() {
  return new Promise((resolve, reject) => {
    const r = new SR();
    r.lang = 'en-US';
    let done = false;
    const finish = (ok, err) => { if (done) return; done = true; try { r.abort(); } catch {} ok ? resolve() : reject(err); };
    r.onaudiostart = () => { mic.mode = 'sr'; finish(true); };
    r.onerror = (ev) => {
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(ev.error)) finish(false, new Error(ev.error));
      else { mic.mode = 'sr'; finish(true); }
    };
    setTimeout(() => { mic.mode = 'sr'; finish(true); }, 6000);
    try { r.start(); } catch (e) { finish(false, e); }
  });
}

// ---------- speech recognition: checks what was said ----------
function listen() {
  const r = new SR();
  r.lang = 'en-US';
  r.interimResults = true;
  r.maxAlternatives = 5;
  r.continuous = false;
  const st = { alts: [], interim: '', final: false, ended: false, speechAt: null };
  r.onspeechstart = () => (st.speechAt ??= ctx.currentTime);
  r.onresult = (ev) => {
    const res = ev.results[ev.results.length - 1];
    if (res.isFinal) { st.alts = Array.from(res, (a) => a.transcript); st.final = true; }
    else st.interim = res[0].transcript;
    st.speechAt ??= ctx.currentTime;
  };
  r.onend = () => (st.ended = true);
  r.onerror = (ev) => {
    st.ended = true;
    if (['not-allowed', 'service-not-allowed', 'network', 'audio-capture'].includes(ev.error) && !srBroken) {
      srBroken = ev.error;
      ui.toast('Este navegador no puede corregirte');
      ui.micBadge();
    }
  };
  st.stop = () => { try { r.stop(); } catch {} };
  st.abort = () => { try { r.abort(); } catch {} };
  try { r.start(); } catch { st.ended = true; }
  return st;
}
const EXPAND = { im: 'i am', whats: 'what is', youre: 'you are', its: 'it is' };
const NAMES = /\b(b'?alam|ixlem)\b/g;
function words(s) {
  return s.toLowerCase().replace(NAMES, ' ').replace(/[’']/g, '').replace(/[^a-z\s]/g, ' ')
    .split(/\s+/).filter(Boolean).flatMap((w) => (EXPAND[w] || w).split(' '));
}
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// Short words must match exactly so "tank" doesn't pass for "thank".
function grade(expect, alts) {
  const E = words(expect);
  if (!E.length || !alts.length) return null;
  let best = null;
  for (const alt of alts) {
    const H = words(alt);
    const hit = E.map((w) => H.some((h) => h === w || (w.length >= 6 && lev(h, w) <= 1)));
    const score = hit.filter(Boolean).length / E.length;
    if (!best || score > best.score) best = { score, hit, heard: alt };
  }
  best.words = expect.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  best.level = best.score >= 1 ? 'good' : best.score >= 0.5 ? 'close' : 'miss';
  // Map hits back onto display words (contractions expand to two hits).
  let k = 0;
  best.marks = best.words.map((w) => { const n = words(w).length; const ok = best.hit.slice(k, k + n).every(Boolean); k += n; return ok; });
  return best;
}

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
    this.stats = { turns: 0, spoke: 0, good: 0, latencies: [], hard: new Set() };
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
  // has actually said something (or a generous timeout passes). Where the
  // browser has speech recognition, what they said is also checked.
  async turn(e, my) {
    if (e.chime) chime();
    this.stats.turns++;
    const t0 = ctx.currentTime;
    const ts = (this.turnState = { e, t0, heard: false, onset: null, nudged: false, level: 0 });
    if (!mic.on || (mic.mode === 'sr' && srBroken)) {
      await this.wait(e.dur, my);
      this.turnDone(e, ts, null, null);
      return;
    }
    const maxSilent = e.dur + 4;
    const maxTalk = e.mode === 'free' ? 6 : Math.max(3, e.dur * 1.4);
    const rec = mic.mode === 'sr' ? await this.listenTurn(e, ts, my, maxSilent, maxTalk) : await this.vadTurn(e, ts, my, maxSilent, maxTalk);
    if (my !== this.gen) return;
    if (!rec || !e.expect) return this.turnDone(e, ts, ts.heard ? ts.onset : Infinity, null);
    const result = grade(e.expect, rec.alts.length ? rec.alts : rec.interim ? [rec.interim] : []);
    this.turnDone(e, ts, ts.heard ? ts.onset : Infinity, result || { level: ts.heard ? 'unclear' : 'silent' });
  }
  poll(my, tick) {
    return new Promise((res) => {
      const end = () => { clearInterval(iv); res(); };
      const iv = setInterval(() => {
        if (my !== this.gen) return end();
        if (!this.paused) tick(end);
      }, 30);
      this.cancel = end;
    });
  }
  async listenTurn(e, ts, my, maxSilent, maxTalk) {
    let rec = listen(), restarts = 0, stopAt = null;
    await this.poll(my, (end) => {
      const now = ctx.currentTime, el = now - ts.t0;
      if (rec.speechAt !== null && !ts.heard) { ts.heard = true; ts.onset = Math.max(0, rec.speechAt - ts.t0); }
      if (rec.final) return end();
      if (stopAt !== null) { if (rec.ended || now > stopAt) end(); return; }
      if (rec.ended) {
        // Recognizers give up on silence early; keep listening until our timeout.
        if (!ts.heard && el < maxSilent - 1 && restarts < 3 && !srBroken) { rec = listen(); restarts++; return; }
        return end();
      }
      if (!ts.heard && el > e.dur && !ts.nudged) { ts.nudged = true; ui.nudge(); }
      if (!ts.heard && el > maxSilent) { rec.abort(); return end(); }
      if (ts.heard && el - ts.onset > maxTalk) { rec.stop(); stopAt = now + 1.5; }
    });
    if (my !== this.gen) rec.abort();
    return rec;
  }
  async vadTurn(e, ts, my, maxSilent, maxTalk) {
    let quietSince = null, loudFor = 0, last = ctx.currentTime;
    await this.poll(my, (end) => {
      const now = ctx.currentTime, dt = now - last; last = now;
      const el = now - ts.t0;
      const l = (ts.level = mic.level());
      const loud = el > 0.35 && l > mic.threshold;
      if (!ts.heard) {
        loudFor = loud ? loudFor + dt : 0;
        if (loudFor > 0.12) { ts.heard = true; ts.onset = el - loudFor; }
        if (!ts.heard && el > e.dur && !ts.nudged) { ts.nudged = true; ui.nudge(); }
        if (!ts.heard && el > maxSilent) end();
      } else {
        quietSince = loud ? null : quietSince ?? now;
        if ((quietSince && now - quietSince > 0.7) || el - ts.onset > maxTalk) end();
      }
    });
    return null;
  }
  turnDone(e, ts, latency, result) {
    this.turnState = null;
    const spoke = latency !== null && latency !== Infinity;
    if (spoke) { this.stats.spoke++; this.stats.latencies.push(latency); }
    if (result) {
      if (result.level === 'good') { this.stats.good++; ding(); }
      ui.feedback(result);
    } else if (latency === Infinity && e.mode !== 'free') {
      ui.feedback({ level: 'silent' });
    }
    const weak = result && (result.level === 'close' || result.level === 'miss');
    if (weak && e.mode === 'repeat' && !e.retry) this.retry(e);
    if (e.mode !== 'recall' || !e.item) return;
    if (!spoke || latency > SLOW_ANSWER || weak) this.markHard(e.item, true);
  }
  // One immediate second try on a weak repetition: model again, then you.
  retry(e) {
    const prev = this.ev[this.idx - 1];
    const role = prev?.type === 'speak' && prev.role !== 'narrator' ? prev.role : 'slow';
    const b = new Builder(manifest, { chimeOff: true });
    b.echo(role, e.expect);
    for (const x of b.ev) Object.assign(x, { rg: e.rg, chapter: e.chapter, kind: e.kind, item: e.item });
    b.ev.at(-1).retry = true;
    this.ev.splice(this.idx + 1, 0, ...b.ev);
    finalize(this.ev);
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
    if (e.type === 'turn' || e.role === 'narrator' || e.type === 'chime') $('#fb').className = 'fb';
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
  feedback(r) {
    const fb = $('#fb');
    const heard = r.heard ? `<small>Oí: «${esc(r.heard.trim())}»</small>` : '';
    const ws = r.words ? `<span class="ws">${r.words.map((w, i) => `<span class="${r.marks[i] ? 'ok' : 'no'}">${esc(w)}</span>`).join(' ')}</span>` : '';
    const msg = { good: '✓ ¡Bien!', close: 'Casi', miss: 'Escucha', unclear: 'No te entendí', silent: 'En voz alta' }[r.level];
    fb.className = `fb show ${r.level}`;
    fb.innerHTML = `<b>${msg}</b>${r.level === 'good' ? '' : ws}${heard}`;
  },
  micBadge() {
    const b = $('#p-mic');
    const msg = !mic.on ? 'Micrófono apagado · sin corrección' : !SR || srBroken ? 'Sin corrección en este navegador' : '';
    b.textContent = msg;
    b.hidden = !msg;
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
  if (!mic.on && !mic.denied && (SR || navigator.mediaDevices?.getUserMedia)) {
    try { await mic.enable(); store.set((x) => (x.mic = true)); } catch { mic.denied = true; }
    renderMic();
  }
  ui.micBadge();
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
    <div><b>${mic.on ? r.stats.spoke : r.stats.turns}</b><span>veces<br>hablaste</span></div>
    ${SR && mic.on ? `<div><b>${r.stats.good}</b><span>¡bien<br>dichas!</span></div>` : ''}
    ${avg !== null ? `<div><b>${avg.toFixed(1)} s</b><span>para empezar<br>a responder</span></div>` : ''}
    <div><b>${L.items.length}</b><span>frases<br>nuevas</span></div>`;
  renderVocab($('#done-vocab'), L.items);
  const nextId = r.lessonId === 'l1' ? 'l2' : 'review';
  $('#next').innerHTML = `<p><b>Mañana:</b> ${r.lessonId === 'l1' ? 'lección 2.' : 'repaso.'}</p>`;
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
  $('#mic-ico').textContent = mic.on ? '✅' : mic.denied ? '⚠️' : '🎙️';
  $('#mic-text').innerHTML = mic.on
    ? SR ? 'Micrófono activo: te escucha y corrige.' : 'Micrófono activo, pero este navegador no corrige.'
    : mic.denied ? '<b>Micrófono bloqueado.</b> Sin él no hay corrección. Usa Chrome o Safari.' : 'Micrófono: te escucha y te corrige.';
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
  catch { mic.denied = true; ui.toast('No se pudo usar el micrófono'); }
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

window.tzijDebug = { get runner() { return runner; }, mic, grade, ui };
