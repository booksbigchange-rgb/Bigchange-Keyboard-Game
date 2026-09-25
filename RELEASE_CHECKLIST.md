# Typing Core V2 Release Checklist

Use this checklist before changing the typing engine or merging V2 into `main`.

## Source of truth
- Active test branch: `typing-core-v2`
- Live GitHub Pages source: `typing-core-v2` / `(root)`
- Expected visible build marker: `core-v2-20260925-2`
- Release pull request: Draft PR #3
- `student-flow` is fallback/reference only
- `keyquest-import` is archive/experiment only

## Before debugging a reported issue
1. Confirm the footer shows the expected build marker.
2. If it does not, treat the report as deployment/cache-related first.
3. If it does, reproduce the exact keystrokes on `typing-core-v2`.
4. Add a regression test that fails for the report.
5. Change the smallest possible code path.
6. Require green engine, DOM, and Chromium checks before considering the fix complete.

## Core acceptance checks
- Student can type after a wrong character without the keyboard locking.
- Backspace edits the real textarea naturally.
- Editing in the middle of existing text works.
- Insertions, omissions, and substitutions do not cascade the rest of the sentence.
- Top Row regression sequence `redbyree quiet type power` finishes without freezing.
- Easy, Medium, and Hard free practice remain separate from Learn lessons.
- Lesson completion requires at least 90% accuracy.
- Progress persists after reload.
- New Student reset clears only this app's local saved state.
- Challenge timer remains at 60 until the first input.
- Challenge accepts wrong characters and keeps accepting input.
- Challenge timer stops when leaving the view and freezes at completion.
- WPM and accuracy remain finite and bounded.
- Letter Rain, Bubble Pop, and Rocket Race accept keyboard input.
- Rocket Race reaches a clean finish.
- Mobile-width layout has no horizontal overflow.

## Merge gate
Do not merge PR #3 until:
- Push CI passes.
- PR CI passes.
- GitHub Pages deployment passes.
- A real-device test confirms the expected build marker.
- A real-device test confirms normal typing, mistakes, Backspace, and the 1-minute challenge.

After acceptance, mark PR #3 ready for review and merge it into `main`.
