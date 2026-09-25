# BigChange Keyboard Game

A classroom-friendly typing game for BigChange students.

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
The `student-flow` branch runs automated checks on pushes and pull requests:

- JavaScript syntax checks
- Typing-engine regression tests
- DOM smoke checks
- Chromium browser acceptance tests for profile, lessons, practice, mistakes, challenge timing, persistence, games, navigation, reset flow, and mobile-width overflow

The app has no build step.

## Running locally
Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

Progress is stored in the browser's local storage on that computer.

## Project base and attribution
This project is adapted from the open-source KeyQuest typing tutor by its contributors and retains the original MIT License notice.

Original project: https://github.com/ovurevu/keyquest

The student-facing product is branded as **BigChange Keyboard Game**.
