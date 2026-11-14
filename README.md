# Tzij · English

Audio-first prototype that teaches English to Kaqchikel-speaking teens (13–16), built around **spaced retrieval with forced production**. Unit 1 (*Q'ejelonïk · Saludos · Greetings*) is split into two ~8-minute lessons plus a quick review.

## Run

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173 at phone width. To use the microphone on a real phone, the page has to be served over HTTPS (for example GitHub Pages or a tunnel).

## How a lesson works

- **Anticipation turns.** Every prompt is a Kaqchikel cue or a situation ("It's 3pm, greet someone"). The learner says the English aloud *before* hearing the model answer. After that, they hear the answer and compare.
- **Forced production.** With the mic on, the answer is held back until the app detects the learner's voice, or until a generous timeout passes, with a nudge partway through. The mic only measures loudness and never records anything.
- **Graduated-interval recall.** After an item is introduced, it comes back at about 10s, 30s, 90s, 4min, and 10min of lesson time (`INTERVALS` in `src/engine.js`). Lesson 2 opens with a review of lesson 1, and *Repaso* covers the whole unit, so spacing also stretches across days.
- **Adaptive.** If the learner stays silent, takes longer than 3s to start answering, or taps *Me costó*, the item gets an extra recall about 3 blocks later. Items marked hard come first in later reviews.
- **Backward build-up.** Long phrases are built from the end (*you · are you · how are you?*), at slow speed first.
- **Several voices** (Ixlem, B'alam, the teacher) model each phrase, as a light form of high-variability input.
- **Transfer from Kaqchikel.** For example, the *tz* in *tzij* is used to teach *what's*.
- **Listen before reading.** Captions are off by default. Written phrases are shown only after a lesson is finished.
- The turn chime fades out after the first 10 turns, and there are no scores.

## Files

- `src/content.js`: all lesson content (items, cues, dialogue, lesson scripts). This is the file to edit.
- `src/engine.js`: compiles a lesson script into a timed event list and schedules spaced recalls.
- `src/app.js`: the player (Web Audio, mic voice detection, UI).
- `tools/gen-audio.mjs`: synthesizes every clip with macOS `say` and ffmpeg, and writes `audio/manifest.js`. Run `node tools/gen-audio.mjs` after changing content.

## Prototype caveats

- **The voices are synthetic** (macOS Samantha, Flo, and Reed for English, Paulina for narration). The English voices sound adult, not teenage.
- **Narration is in Spanish** as a stand-in. The real product should have Kaqchikel narration recorded by a native speaker. Kaqchikel phrases are read by a Spanish voice using approximate spellings (`KAQ_TTS`), which is rough.
- Kaqchikel text comes from the unit sheet. Narration lines that use Kaqchikel need review by a native speaker.
- The mic only detects *that* the learner spoke, not *what* they said. Checking correctness needs speech recognition, which is a later step.

## Next ideas

- An HVPT minimal-pair game (*thank / tank / sank*, *three / tree*) with many voices, framed as a quick challenge.
- Recorded native Kaqchikel narration and real English speakers who are teens.
- Spacing across days driven by item history, not a fixed review lesson.
