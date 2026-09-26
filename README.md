# BigChange Keyboard Game

A classroom-friendly typing game for BigChange students.

## Current release and deployment

- `main` — **audited stable source and default branch**.
- `typing-core-v2` — **GitHub Pages deployment branch**. The historical branch name remains, but it currently carries the audited V3 release.
- `typing-core-v3` — V3 development/history branch used to build and validate the current release.
- `typing-core-v2-frozen` — preserved pre-V3 fallback.
- `student-flow` — older classroom-flow fallback/reference.
- `keyquest-import` — old import/experiment branch only.

GitHub Pages publishes from `typing-core-v2` / repository root.

Current verified live build: `core-v3-20260926-3`.

The release was promoted to `main` after engine tests, Chromium classroom tests, GitHub Pages deployment, and an automated check against the public Pages URL all passed.

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

The stable/live code is checked with:

- JavaScript syntax validation
- 25 typing-engine regression/fuzz tests
- DOM/cache-busting smoke checks
- 34 Chromium classroom acceptance tests
- no-uncaught-browser-error coverage for primary student flows
- reported Top Row and Home Row regression coverage
- all lessons and practice levels
- storage/corrupt-state/reset behavior
- challenge timing/restart/finalization
- game input, game-loop cleanup, and Rocket Race completion
- mobile-width overflow
- public GitHub Pages build-marker verification on live-branch pushes

The app has no production build step and no runtime third-party dependency.

## Change policy

For future typing changes:

1. Reproduce the exact student keystrokes.
2. Add a failing regression test.
3. Fix the smallest code path.
4. Require engine, smoke, and Chromium checks to pass.
5. Promote the tested change to the Pages branch.
6. Require the public live-build verification to pass before treating the change as deployed.

## Open-source references

BigChange uses open-source projects as architectural and interaction references. See `THIRD_PARTY_NOTICES.md` for license details. GPL projects are used as behavioral/architectural references only; BigChange V3 source is independently implemented.

## Running locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

Progress is stored in browser local storage on that computer.
