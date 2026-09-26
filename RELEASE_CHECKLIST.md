# Typing Core V3 Release Checklist

## Source of truth
- Active upgrade branch: `typing-core-v3`
- Expected V3 build marker: `core-v3-20260926-2`
- V2 remains frozen fallback.
- V3 release path: Draft PR #4 -> `main`

## Core acceptance checks
- Wrong letters appear immediately.
- Typing never locks after a mistake.
- Extra letters remain local to the current word.
- Space advances exactly one word.
- Backspace edits the current word naturally.
- Empty Backspace can reopen the previous committed word.
- The Top Row sequence `redbyree` shows each extra-letter mistake as it is typed.
- Seven lessons can complete with correct word-by-word typing.
- Below 90% does not unlock a lesson.
- Free Practice does not unlock Learn lessons.
- Challenge stays at 60 until the first letter.
- Challenge accepts mistakes continuously.
- Leaving Challenge stops the timer.
- Progress survives reload.
- Games still accept keyboard input.
- Mobile width has no horizontal overflow.

## Debugging rule
For any typing report:
1. Confirm the visible build marker.
2. Reproduce the exact current word and exact keystrokes.
3. Add a failing regression test first.
4. Fix the smallest code path.
5. Require engine + DOM + Chromium checks to pass.

## Merge gate
Do not merge V3 into `main` until:
- V3 push CI passes.
- V3 PR CI passes.
- V3 is intentionally selected for GitHub Pages testing.
- Real-device testing confirms Top Row, Backspace, Practice, and the 1-minute Challenge.
