# Typing Core V3 Release Checklist

## Current release status
- Stable/default source: `main`
- GitHub Pages deployment branch: `typing-core-v2`
- Preserved pre-V3 fallback: `typing-core-v2-frozen`
- Verified live build marker: `core-v3-20260926-3`
- GitHub Pages deployment #100: passed
- Public live-build marker verification: passed
- Engine suite: 25 passed
- Chromium classroom suite: 34 passed

## Core acceptance checks
- Wrong letters appear immediately.
- Typing never locks after a mistake.
- Extra letters remain local to the current word.
- Empty/repeated Space does not skip target words.
- Space advances exactly one word after typed input.
- Backspace edits the current word naturally.
- Empty Backspace can reopen the previous committed word.
- Repaired previous words do not double-count omissions.
- The reported Top Row extra-letter sequence is regression-tested.
- The reported Home Row screenshot state is regression-tested.
- Seven lessons complete with correct word-by-word typing.
- Below 90% does not unlock a lesson.
- Free Practice does not unlock Learn lessons.
- Easy, Medium, and Hard start clean and complete.
- Challenge stays at 60 until the first letter.
- Challenge restart resets timer/input/stats.
- Leaving Challenge stops the timer.
- Forced challenge finalization freezes/saves bounded results.
- Existing and corrupt saved state load safely.
- New Student reset clears app state after confirmation.
- Letter Rain stops after navigation.
- Bubble Pop and Rocket Race accept keyboard input.
- Rocket Race finishes at 20 correct keys.
- Game key handling releases control when leaving Games.
- Primary flows produce no uncaught page/console errors.
- Mobile width has no horizontal overflow.

## Debugging rule
For any new typing report:
1. Confirm the visible build marker.
2. Reproduce the exact current word and exact keystrokes.
3. Add a failing regression test first.
4. Fix the smallest code path.
5. Require engine + DOM + Chromium checks to pass.
6. Promote to the Pages branch.
7. Require the public live-build check to pass.

## Repository note
The branch name `typing-core-v2` is retained only because GitHub Pages is configured to publish from it. The code currently deployed from that branch is Typing Core V3.
