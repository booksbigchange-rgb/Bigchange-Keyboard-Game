# BigChange Keyboard Game

A classroom-friendly typing game for BigChange students.

## Current release path

- `main` — stable fallback / current default branch. Do not develop directly here.
- `student-flow` — previous classroom version with the older custom typing core. Kept only as a fallback reference.
- `typing-core-v2` — active development and GitHub Pages test branch.
- `keyquest-import` — old import/experimentation branch. It is not a release branch.
- Draft PR #3 — the only intended path from `typing-core-v2` into `main` after live-device acceptance.

GitHub Pages is configured to publish `typing-core-v2` from the repository root.

Current visible asset build marker: `core-v2-20260925-2`.

## Typing Core V2

The active development branch `typing-core-v2` replaces the older artificial-cursor typing model with a real browser textarea as the source of truth. Students can keep typing after mistakes, use Backspace naturally, and the comparison engine aligns the raw typed text against the target without locking the keyboard.

The V2 direction is informed by MIT-licensed open-source typing projects documented in `THIRD_PARTY_NOTICES.md`.

## Current student experience

- Student profile with local progress on the current computer
- Seven guided typing lessons
- Separate Easy, Medium, and Hard free-practice modes
- Live WPM, accuracy, and mistake feedback
- Continuous typing after mistakes using a real browser text field
- Natural Backspace editing without a locked error state
- 90% lesson-completion threshold
- Real one-minute typing challenge that starts on the first keystroke
- Saved best challenge WPM and accuracy
- Progress tracking
- Letter Rain, Rocket Race, and Bubble Pop keyboard games
- New-student reset for shared classroom computers
- Responsive browser layout
- Local/offline-friendly plain HTML, CSS, and JavaScript

## Classroom core checks

The `typing-core-v2` branch runs automated checks on pushes and on the V2 pull request:

- JavaScript syntax checks
- Typing-engine regression tests
- DOM and cache-busting smoke checks
- Chromium browser acceptance tests for profile, lessons, free practice, mistakes, Backspace, challenge timing, persistence, games, navigation, reset flow, and mobile-width overflow

The V2 test suite currently contains 21 engine regression tests and 21 Chromium browser acceptance tests.

The app has no build step.

## Running locally

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

Progress is stored in the browser's local storage on that computer.

## Project base and attribution

This project began from the open-source KeyQuest typing tutor and retains the relevant MIT license attribution. Typing Core V2 also draws on MIT-licensed interaction and architecture ideas documented in `THIRD_PARTY_NOTICES.md`.

The student-facing product is branded as **BigChange Keyboard Game**.
