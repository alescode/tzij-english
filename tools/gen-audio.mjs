// Synthesizes every utterance the lessons can play using macOS `say`,
// trims silence, normalizes loudness, and writes audio/manifest.js.
// Usage: node tools/gen-audio.mjs [--force]
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog } from '../src/engine.js';
import { VOICES } from '../src/content.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const clipsDir = join(root, 'audio', 'clips');
mkdirSync(clipsDir, { recursive: true });
const force = process.argv.includes('--force');
const tmp = join(tmpdir(), `tzij-${process.pid}.aiff`);

const trim = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-18:TP=-2,apad=pad_dur=0.04';

const manifest = {};
const keep = new Set();
const all = catalog();
let made = 0;
for (const u of all) {
  const v = VOICES[u.role];
  const name = createHash('sha1').update(`${v.voice}|${v.rate}|${u.tts}`).digest('hex').slice(0, 12) + '.m4a';
  const out = join(clipsDir, name);
  keep.add(name);
  if (force || !existsSync(out)) {
    execFileSync('say', ['-v', v.voice, '-r', String(v.rate), '-o', tmp, u.tts]);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-af', trim, '-ar', '44100', '-ac', '1', '-c:a', 'aac', '-b:a', '64k', out]);
    made++;
  }
  const d = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString());
  manifest[u.key] = { f: `audio/clips/${name}`, d: Math.round(d * 100) / 100 };
}
for (const f of readdirSync(clipsDir)) if (!keep.has(f)) unlinkSync(join(clipsDir, f));
writeFileSync(join(root, 'audio', 'manifest.js'), `export default ${JSON.stringify(manifest, null, 0).replace(/},"/g, '},\n"')};\n`);
console.log(`${all.length} clips (${made} new) → audio/manifest.js`);
