# Typing Core V3 Release Checklist

## Build 6 accuracy-fix gate
- Expected build marker: `core-v3-20261002-6`
- Engine tests: 32
- Chromium scenarios: 44
- Firefox scenarios: 44
- WebKit scenarios: 44
- Total browser checks: 132

## Input invariants
- Wrong letters appear immediately.
- Typing never locks after a mistake.
- Mobile/virtual-keyboard Space commits without requiring keydown.
- Empty Backspace can reopen the previous word through both modern and WebKit-style paths.
- IME/composition intermediate text is not scored as final input.
- Empty/repeated Space cannot skip a target word.
- Space advances exactly one word.
- Editing in the middle of the textarea remains natural.

## Alignment/scoring invariants
- One middle insertion counts once.
- One middle omission counts once.
- A correct continuation after an insertion does not create cascading errors.
- The extra character shown in the target is the actual extra character.
- Correcting a visible wrong character clears the visible Mistake.
- A genuinely corrected wrong attempt may still reduce Accuracy.
- Clearing correctly typed letters after a middle edit does not freeze false accuracy penalties.
- Reopening a word preserves character provenance for historical penalties.
- Reopening a committed word does not double-count omissions.
- Accuracy stays between 0 and 100.
- WPM stays finite and non-negative.

## Classroom invariants
- All seven lessons complete with correct typing.
- Below 90% does not unlock a lesson.
- Free Practice does not unlock Learn lessons.
- Easy, Medium, and Hard start clean.
- Challenge waits for first real input.
- Challenge restart and leaving the view stop/reset timing correctly.
- Saved progress and corrupt storage are handled safely.
- New Student reset clears only app state.
- Letter Rain, Bubble Pop, and Rocket Race accept input.
- Game keyboard handlers release control when leaving Games.
- Rocket Race finishes at 20.
- No primary-flow page/console errors.
- Student names cannot inject markup.
- Normal interaction makes no post-load network request.
- Mobile width has no horizontal overflow.

## Release process
- `main` is the only release source.
- The Pages branch must mirror the exact released `main` commit.
- Do not maintain separate code commits on the Pages branch.
- Public Pages must report the expected build marker before the release is accepted.
