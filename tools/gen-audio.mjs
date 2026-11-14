// Synthesizes every utterance the lessons can play, trims silence,
// normalizes loudness, and writes audio/manifest.js.
// Uses ElevenLabs when ELEVENLABS_API_KEY is set (env or .env), else macOS `say`.
// Usage: node tools/gen-audio.mjs [--force] [--say] [--dry-run] [--budget=3000]
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog } from '../src/engine.js';
import { VOICES, ELEVEN_VOICES } from '../src/content.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const clipsDir = join(root, 'audio', 'clips');
mkdirSync(clipsDir, { recursive: true });
const force = process.argv.includes('--force');

const envFile = join(root, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const KEY = process.argv.includes('--say') ? null : process.env.ELEVENLABS_API_KEY;
const engine = KEY ? 'eleven' : 'say';
const engineFor = (role) => (engine === 'eleven' && voiceIds[role] ? 'eleven' : 'say');
const MODEL = 'eleven_multilingual_v2';
// Credits per character (self-serve plans): Flash/Turbo cost half.
const RATE = { eleven_multilingual_v2: 1, eleven_flash_v2_5: 0.5, eleven_turbo_v2_5: 0.5 };
const BUDGET = Number(process.argv.find((a) => a.startsWith('--budget='))?.split('=')[1] ?? 3000);
const DRY = process.argv.includes('--dry-run');
const modelFor = (role) => ELEVEN_VOICES[role].model ?? MODEL;

const trim = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-18:TP=-2,apad=pad_dur=0.04';
const encode = (input, out) =>
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', input, '-af', trim, '-ar', '44100', '-ac', '1', '-c:a', 'aac', '-b:a', '64k', out]);

let voiceIds = {};
async function elevenVoices() {
  for (const [role, v] of Object.entries(ELEVEN_VOICES)) if (v.id) voiceIds[role] = v.id;
  if (Object.keys(ELEVEN_VOICES).every((r) => voiceIds[r])) return;
  const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': KEY } });
  if (!res.ok) {
    const missing = Object.keys(ELEVEN_VOICES).filter((r) => !voiceIds[r]);
    console.warn(`Can't look up voices (${res.status}); using macOS say for: ${missing.join(', ')}. Give the key voices_read + voices_write to fix.`);
    return;
  }
  const { voices } = await res.json();
  for (const [role, v] of Object.entries(ELEVEN_VOICES)) {
    if (voiceIds[role]) continue;
    if (v.library && !voices.some((x) => x.name === v.name)) voices.push(await addLibraryVoice(v));
    const hit = voices.find((x) => x.name.toLowerCase().startsWith(v.name.toLowerCase()));
    if (!hit) throw new Error(`No ElevenLabs voice named ${v.name} (for ${role})`);
    voiceIds[role] = hit.voice_id;
  }
}

// Copies a native-speaker voice from the public Voice Library into the
// account (free) so non-English narration doesn't get an English accent.
async function addLibraryVoice(v) {
  const q = new URLSearchParams({ page_size: '20', sort: 'usage_character_count_1y', ...v.library });
  const res = await fetch(`https://api.elevenlabs.io/v1/shared-voices?${q}`, { headers: { 'xi-api-key': KEY } });
  if (!res.ok) throw new Error(`shared-voices: ${res.status} ${await res.text()}`);
  const { voices } = await res.json();
  const pick = voices.find((x) => x.free_users_allowed !== false) ?? voices[0];
  if (!pick) throw new Error(`No library voice for ${JSON.stringify(v.library)}`);
  const add = await fetch(`https://api.elevenlabs.io/v1/voices/add/${pick.public_owner_id}/${pick.voice_id}`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ new_name: v.name }),
  });
  if (!add.ok) throw new Error(`add voice: ${add.status} ${await add.text()}`);
  console.log(`added library voice "${pick.name}" (${pick.accent}, ${pick.language}) as "${v.name}"`);
  return { name: v.name, voice_id: (await add.json()).voice_id };
}

async function synthEleven(role, text, out) {
  const v = ELEVEN_VOICES[role];
  const body = {
    text,
    model_id: modelFor(role),
    ...(v.lang && modelFor(role).includes('v2_5') ? { language_code: v.lang } : {}),
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true, speed: v.speed ?? 1 },
  };
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceIds[role]}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const tmp = join(tmpdir(), `tzij-${process.pid}-${Math.random().toString(36).slice(2)}.mp3`);
      writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
      encode(tmp, out);
      unlinkSync(tmp);
      return;
    }
    if (res.status === 429 && attempt < 5) { await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue; }
    throw new Error(`${role} "${text}": ${res.status} ${await res.text()}`);
  }
}

function synthSay(role, text, out) {
  const v = VOICES[role];
  const tmp = join(tmpdir(), `tzij-${process.pid}.aiff`);
  execFileSync('say', ['-v', v.voice, '-r', String(v.rate), '-o', tmp, text]);
  encode(tmp, out);
}

const fileFor = (u) => {
  const id = engineFor(u.role) === 'eleven'
    ? `11|${modelFor(u.role)}|${JSON.stringify(ELEVEN_VOICES[u.role])}|${u.tts}`
    : `${VOICES[u.role].voice}|${VOICES[u.role].rate}|${u.tts}`;
  return createHash('sha1').update(id).digest('hex').slice(0, 12) + '.m4a';
};

const all = catalog();
if (engine === 'eleven') await elevenVoices();
const pending = all.filter((u) => force || !existsSync(join(clipsDir, fileFor(u))));
async function credits() {
  const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': KEY } });
  if (!res.ok) return null;
  const j = await res.json();
  return j.character_limit - j.character_count;
}
let before = null;
if (engine === 'eleven') {
  const est = Math.ceil(pending.filter((u) => engineFor(u.role) === 'eleven').reduce((a, u) => a + u.tts.length * (RATE[modelFor(u.role)] ?? 1), 0));
  before = await credits();
  console.log(`engine: eleven, ${pending.length}/${all.length} clips to make, ~${est} credits (budget ${BUDGET}, account has ${before ?? '?'})`);
  if (DRY) process.exit(0);
  if (est > BUDGET || (before !== null && est > before)) {
    console.error('Over budget; nothing generated. Raise with --budget=N if intended.');
    process.exit(1);
  }
  const sample = process.argv.find((a) => a.startsWith('--sample='))?.split('=')[1];
  if (sample) {
    mkdirSync(sample, { recursive: true });
    for (const role of Object.keys(ELEVEN_VOICES).filter((r) => voiceIds[r])) {
      const u = all.find((x) => x.role === role);
      await synthEleven(role, u.tts, join(sample, `${role}.m4a`));
      console.log(`${role}: ${u.tts}`);
    }
    process.exit(0);
  }
} else {
  console.log(`engine: say, ${pending.length}/${all.length} clips to make`);
  if (DRY) process.exit(0);
}

const manifest = {};
const keep = new Set();
let made = 0, i = 0;
const queue = [...all];
async function worker() {
  while (queue.length) {
    const u = queue.shift();
    const name = fileFor(u);
    const out = join(clipsDir, name);
    keep.add(name);
    if (force || !existsSync(out)) {
      if (engineFor(u.role) === 'eleven') await synthEleven(u.role, u.tts, out);
      else synthSay(u.role, u.tts, out);
      made++;
    }
    const d = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString());
    manifest[u.key] = { f: `audio/clips/${name}`, d: Math.round(d * 100) / 100 };
    if (++i % 20 === 0) console.log(`${i}/${all.length}`);
  }
}
await Promise.all(Array.from({ length: engine === 'eleven' ? 2 : 1 }, worker));

for (const f of readdirSync(clipsDir)) if (!keep.has(f)) unlinkSync(join(clipsDir, f));
const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(root, 'audio', 'manifest.js'), `export default ${JSON.stringify(sorted, null, 0).replace(/},"/g, '},\n"')};\n`);
console.log(`done: ${made} new → audio/manifest.js`);
if (engine === 'eleven' && before !== null) console.log(`credits used: ${before - (await credits())}, left: ${await credits()}`);
