# BigChange Keyboard Game

A classroom-friendly typing game for BigChange students.

## Current release path

- `main` — stable/default branch. Do not develop directly here.
- `student-flow` — previous classroom version kept as fallback/reference.
- `typing-core-v2` — frozen V2 fallback with sentence-wide typing.
- `typing-core-v3` — active upgrade branch.
- `keyquest-import` — old import/experiment branch only.
- Draft PR #4 — intended V3 path into `main` after live-device acceptance.

## Typing Core V3

V3 changes the typing model from sentence-wide comparison to a **word-scoped event engine**.

- A real textarea contains only the current word.
- Every inserted/deleted character is recorded immediately.
- A mistake appears immediately on the current word.
- A mistake never locks the keyboard.
- Space commits exactly one word and advances exactly one word.
- Extra letters stay local to the current word instead of shifting the entire sentence.
- Empty Backspace can reopen the previous committed word.
- Practice and the 1-minute challenge share the same word engine.
- Learn remains lesson-based while we prepare the later Qwerty Learner-style review system.

Visible V3 build marker: `core-v3-20260926-1`.

## Current student experience

- Student profile with local progress
- Seven guided lessons
- Easy, Medium, and Hard free practice
- Live WPM, accuracy, and mistakes
- Word-scoped typing with immediate feedback
- Natural Backspace editing
- 90% lesson completion threshold
- 1-minute challenge
- Progress tracking
- Letter Rain, Rocket Race, and Bubble Pop
- New-student reset
- Responsive classroom layout

## V3 automated checks

The V3 branch runs:

- JavaScript syntax checks
- Word-engine regression tests
- DOM/cache-busting smoke checks
- Chromium classroom acceptance tests

The regression suite includes the reported Top Row failure pattern so extra letters after `red` must appear as mistakes immediately and cannot make the engine jump later.

## Open-source references

BigChange uses open-source projects as architectural and interaction references. See `THIRD_PARTY_NOTICES.md` for license details. GPL projects are used as behavioral/architectural references only; BigChange V3 source is independently implemented.

## Running locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

Progress is stored in browser local storage on that computer.
