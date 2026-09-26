# BigChange Keyboard Game

A classroom-friendly typing game for BigChange students.

## Current release and deployment path

- `main` — stable/default branch. Do not develop directly here.
- `typing-core-v3` — active source branch for the V3 typing engine.
- `typing-core-v2` — **GitHub Pages live-preview branch**. Despite the historical branch name, it currently carries the tested V3 code.
- `typing-core-v2-frozen` — preserved pre-V3 V2 fallback.
- `student-flow` — older classroom-flow fallback/reference.
- `keyquest-import` — old import/experiment branch only.
- Draft PR #4 — intended V3 path into `main` after final live-device acceptance.

GitHub Pages continues to publish from `typing-core-v2` / repository root. V3 changes are tested on `typing-core-v3` first, then promoted into that live-preview branch.

Current expected live build marker: `core-v3-20260926-2`.

## Typing Core V3

V3 uses a **word-scoped event engine** instead of sentence-wide re-alignment.

- A real textarea contains only the current word.
- Every inserted/deleted character is processed immediately.
- Wrong characters appear immediately.
- Mistakes never lock the keyboard.
- Space commits exactly one word and advances exactly one word.
- Empty/repeated Space cannot skip words.
- Extra letters stay local to the current word.
- Backspace edits naturally; an empty Backspace can reopen the previous committed word.
- Visible Mistakes tracks unresolved/final word errors.
- Corrected wrong keypresses still reduce Accuracy without remaining as visible mistakes.
- Practice and the 1-minute Challenge share the same V3 engine.

## Current student experience

- Student profile with local progress
- Seven guided lessons
- Easy, Medium, and Hard free practice
- Live WPM, accuracy, and mistakes
- 90% lesson completion threshold
- 1-minute challenge
- Persistent local progress
- Letter Rain, Rocket Race, and Bubble Pop
- New-student reset
- Responsive classroom layout

## Automated checks

The active V3/live code is checked with:

- JavaScript syntax validation
- Typing-engine regression tests and deterministic fuzzing
- DOM/cache-busting smoke checks
- Chromium classroom acceptance tests
- Regression coverage for reported Top Row and Home Row failure states
- Practice-level, storage, timer, reset, games, and mobile-width checks

The app has no production build step and no runtime third-party dependency.

## Open-source references

BigChange uses open-source projects as architectural and interaction references. See `THIRD_PARTY_NOTICES.md` for license details. GPL projects are used as behavioral/architectural references only; BigChange V3 source is independently implemented.

## Running locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

Progress is stored in browser local storage on that computer.
