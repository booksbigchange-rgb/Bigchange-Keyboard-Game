# Typing Core V3 Release Checklist

## Build 8 keyboard-guide gate
- Expected build marker: `core-v3-20261003-8`
- Engine tests: 34
- Controlled application regression groups: 7
- Chromium scenarios: 54
- Firefox scenarios: 54
- WebKit scenarios: 54
- Total browser checks: 162

Build 8 is currently a local preview. All three browser projects must pass before release; phone viewport testing does not replace a real mobile keyboard check.

## Input invariants
- Wrong letters appear immediately.
- Typing never locks after a mistake.
- Mobile/virtual-keyboard Space commits without requiring keydown.
- Empty Backspace can reopen the previous word through both modern and WebKit-style paths.
- IME/composition intermediate text is not scored as final input.
- Empty/repeated Space cannot skip a target word.
- One separator advances one word; batched text preserves all delivered letters.
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
- Timeout preserves correct letters in an unfinished word.
- Deleting an extra repeated letter keeps the genuine mistake penalty.
- Input at or after the deadline cannot alter the result.

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

## Keyboard-guide invariants
- Key and finger follow the next expected character after edits and commits.
- Capitals and symbols highlight the opposite-hand Shift key.
- Space highlights either thumb, and completion clears active key highlights.
- Guide can be collapsed without changing scores or typing.
- US QWERTY layout is labeled explicitly; keyboard fits phone widths.
