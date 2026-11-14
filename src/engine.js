import { ITEMS, LESSONS, KAQ_TTS, EN_TTS } from './content.js';

// Graduated-interval recall (Pimsleur 1967): roughly 5s, 25s, 2min, 10min.
// Seconds of lesson time after an item's introduction / last recall.
export const INTERVALS = [10, 30, 90, 240, 600];
const CHIME_TURNS = 10;
const AFTER_SPEAK = 0.3;

export const key = (role, tts) => `${role}|${tts}`;

export function ttsify(role, text) {
  const map = role === 'narrator' ? KAQ_TTS : EN_TTS;
  let s = text;
  for (const [a, b] of map) s = s.split(a).join(b);
  return s.replace(/[«»]/g, '');
}

function estimate(role, tts) {
  const words = tts.split(/\s+/).length;
  const base = role === 'narrator' ? words * 0.36 : words * 0.38;
  return (role === 'slow' ? base * 1.5 : base) + 0.35;
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fill = (tpl, item) => tpl.replace('{kaq}', item.kaq);

export class Builder {
  constructor(manifest = {}, opts = {}) {
    this.m = manifest;
    this.opts = opts;
    this.ev = [];
    this.t = 0;
    this.g = 0;
    this.kind = 'talk';
    this.chapter = '';
    this.turns = opts.chimeOff ? CHIME_TURNS : 0;
    this.intros = 0;
  }
  group(kind, extra = {}) {
    this.g++;
    this.kind = kind;
    this.gextra = extra;
  }
  emit(e) {
    Object.assign(e, { t: this.t, g: this.g, kind: this.kind, chapter: this.chapter }, this.gextra);
    this.ev.push(e);
    this.t += e.dur;
    return e;
  }
  clip(role, text) {
    const tts = ttsify(role, text);
    const k = key(role, tts);
    return { tts, k, d: this.m[k]?.d ?? estimate(role, tts) };
  }
  speak(role, text, extra = {}) {
    const c = this.clip(role, text);
    return this.emit({ type: 'speak', role, text, tts: c.tts, key: c.k, clip: c.d, dur: c.d + AFTER_SPEAK, ...extra });
  }
  gap(dur) {
    this.emit({ type: 'gap', dur });
  }
  // Pause long enough to say the phrase at a learner's pace, not so long the
  // answer stops feeling like a retrieval attempt.
  turn(mode, ref, extra = {}) {
    const dur = mode === 'free' ? 5.5 : clamp(ref * 1.7 + 1.3, 2.4, 6.5);
    this.turns++;
    this.emit({ type: 'turn', mode, dur, chime: this.turns <= CHIME_TURNS, ...extra });
  }
  echo(role, text, extra = {}) {
    const ref = this.clip(role, text).d;
    this.speak(role, text, extra);
    this.turn('repeat', ref, { ...extra, expect: text });
  }
  intro(item, pre, tip, tipEcho) {
    this.group('intro', { item: item.id });
    const other = item.id.length % 2 ? 'ba' : 'ix';
    const first = other === 'ix' ? 'ba' : 'ix';
    this.speak('narrator', pre);
    this.speak(first, item.en, { model: true });
    this.gap(0.4);
    this.speak(other, item.en, { model: true });
    if (this.intros === 0) this.speak('narrator', 'Repite cada parte.');
    else if (this.intros === 1) this.speak('narrator', 'Repite.');
    for (const chunk of item.buildup) this.echo('slow', chunk);
    if (item.buildup.length > 1 || item.buildup[0] !== item.en) this.echo(first, item.en);
    if (tip) {
      this.speak('narrator', tip);
      if (tipEcho) this.echo('slow', tipEcho);
      this.echo(other, item.en);
    }
    this.intros++;
  }
  recall(item, n) {
    this.group('recall', { item: item.id });
    const role = n % 2 ? 'ba' : 'ix';
    this.speak('narrator', fill(item.cues[n % item.cues.length], item));
    const ref = this.clip(role, item.en).d;
    this.turn('recall', ref, { expect: item.en });
    this.speak(role, item.en, { confirm: true });
    if (n < 2) this.turn('repeat', ref, { expect: item.en });
    else this.gap(0.4);
  }
}

export function compile(lessonId, manifest = {}, opts = {}) {
  const L = LESSONS[lessonId];
  const hard = opts.hard || {};
  const b = new Builder(manifest, opts);
  const st = new Map();
  let quiet = false;

  const sched = (id) => {
    const s = st.get(id);
    s.due = s.n < INTERVALS.length ? b.t + INTERVALS[s.n] : Infinity;
  };
  const touch = (id) => {
    const s = st.get(id);
    if (!s) return;
    s.n++;
    sched(id);
  };
  const recall = (id, minN = 0) => {
    const s = st.get(id) || { n: 0 };
    s.n = Math.max(s.n, minN);
    st.set(id, s);
    b.recall(ITEMS[id], s.n);
    s.n++;
    sched(id);
  };
  const flush = () => {
    for (let k = 0; k < 2; k++) {
      let best = null;
      for (const [id, s] of st) if (s.due <= b.t && (!best || s.due < best[1].due)) best = [id, s];
      if (!best) return;
      recall(best[0]);
    }
  };
  const byHard = (ids) => [...ids].sort((a, c) => (hard[c] || 0) - (hard[a] || 0));

  for (const s of L.steps) {
    if (s.mark) {
      b.chapter = s.mark;
      quiet = !!s.quiet;
      continue;
    }
    if (s.n) {
      b.group('talk');
      b.speak('narrator', s.n);
    } else if (s.dialogue) {
      b.group('dialogue');
      for (const [role, text] of s.dialogue) b.speak(role, text, { line: true });
      b.gap(0.5);
    } else if (s.chime) {
      b.group('talk');
      b.emit({ type: 'chime', dur: 1.2 });
    } else if (s.introduce) {
      b.intro(ITEMS[s.introduce], s.pre, s.tip, s.tipEcho);
      st.set(s.introduce, { n: 0 });
      sched(s.introduce);
    } else if (s.echo) {
      b.group('drill');
      b.echo(s.echo[0], s.echo[1]);
    } else if (s.free) {
      b.group('free');
      b.turn('free', 0, { label: s.free });
    } else if (s.review) {
      const ids = s.review === 'all' ? Object.keys(ITEMS) : s.review === 'lesson' ? L.items : s.review;
      for (const id of byHard(ids)) recall(id, s.warm ? 2 : 0);
    } else if (s.converse !== undefined || s.prompt !== undefined) {
      const items = s.items || (s.prompt ? [s.prompt] : []);
      b.group('converse', { item: items[0], label: s.label });
      if (s.lead) b.speak('narrator', s.lead);
      if (s.converse) b.speak(s.converse[0], s.converse[1], { line: true });
      if (s.prompt) b.speak('narrator', fill(ITEMS[s.prompt].cues[1], ITEMS[s.prompt]));
      const ref = b.clip(s.answer[0], s.answer[1]).d;
      b.turn('recall', ref, { label: s.label, expect: s.answer[1] });
      b.speak(s.answer[0], s.answer[1], { confirm: true });
      if (s.reply) b.speak(s.reply[0], s.reply[1], { line: true });
      b.gap(0.4);
      items.forEach(touch);
    }
    if (!quiet) flush();
  }
  return finalize(b.ev);
}

// Renumber groups sequentially and recompute start times after any splice.
export function finalize(ev) {
  let g = 0, prev, t = 0;
  for (const e of ev) {
    const raw = e.rg ?? e.g;
    if (raw !== prev) { g++; prev = raw; }
    e.rg = raw;
    e.g = g;
    e.t = t;
    t += e.dur;
  }
  return ev;
}

let extra = 0;
export function extraRecall(itemId, manifest, n = 1) {
  const b = new Builder(manifest, { chimeOff: true });
  b.chapter = null;
  b.recall(ITEMS[itemId], n);
  const tag = `x${++extra}`;
  for (const e of b.ev) e.rg = tag;
  return b.ev;
}

export function catalog() {
  const seen = new Map();
  const add = (evs) => evs.forEach((e) => e.type === 'speak' && seen.set(e.key, { role: e.role, tts: e.tts, key: e.key }));
  for (const id of Object.keys(LESSONS)) add(compile(id));
  for (const id of Object.keys(ITEMS)) {
    const b = new Builder();
    for (let n = 0; n < 10; n++) b.recall(ITEMS[id], n);
    b.speak('ix', ITEMS[id].en);
    add(b.ev);
  }
  return [...seen.values()];
}
