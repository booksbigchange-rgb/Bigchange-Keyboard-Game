# BigChange Keyboard Game

A classroom-friendly typing game for BigChange students.

## Source of truth

- `main` — release source of truth.
- `typing-core-v2` — GitHub Pages mirror of the released `main` commit. The name is historical.
- `typing-core-v3` — development/history branch only; do not release from it directly.
- `typing-core-v2-frozen` — preserved pre-V3 fallback.

Future changes should start from `main`, prove the bug with a regression test, merge to `main`, then mirror that exact commit to the Pages branch. Do not maintain a separate live code history.

Current release candidate build: `core-v3-20260928-5`.

## Why earlier versions kept failing

The failures were systemic, not one typo:

1. Input handling depended on desktop `keydown`, so mobile/virtual-keyboard Space, empty Backspace, and IME/composition paths were not represented.
2. Positional comparison let one inserted or omitted character cascade into several false errors inside a word.
3. Accuracy froze ambiguous positional guesses before later input could reveal the correct alignment.
4. Rendering separately guessed which character was extra, so the UI could disagree with the engine.
5. CI ran only Chromium, hiding a real WebKit empty-Backspace failure.
6. `main` and the Pages branch were maintained through separate commit histories, creating deployment/PR confusion even when file trees matched.

Build 5 addresses all six.

## Typing Core V3

- Real browser textarea for the current word
- `beforeinput` support for virtual/mobile keyboards
- composition-aware input handling
- cross-browser empty-Backspace recovery
- word-scoped dynamic alignment for insertions, omissions, and substitutions
- one real insertion/omission counts once instead of cascading
- renderer consumes the same alignment operations as scoring
- corrected wrong attempts can affect Accuracy without remaining as visible Mistakes
- Space commits exactly one word
- Practice and Challenge share the same core

## Automated checks

The release gate now includes:

- 27 engine regression/fuzz tests
- DOM/security smoke checks
- 43 classroom scenarios in Chromium
- the same 43 scenarios in Firefox
- the same 43 scenarios in WebKit
- **129 browser checks total**
- mobile-style Space without keydown
- mobile-style empty Backspace
- IME/composition input
- middle insertion and omission alignment
- exact extra-character rendering
- all seven lessons
- Easy/Medium/Hard practice
- challenge timing/restart/finalization
- persistence/reset/corrupt storage
- all three games and game cleanup
- XSS/privacy/no-network checks
- mobile width and accessibility checks
- public GitHub Pages build-marker verification on the live branch

## Release rule

A change is not considered fixed because one screenshot looks better or because Chromium is green.

A release requires:
1. reproduce the exact failure;
2. add a regression test that fails first;
3. fix the smallest shared cause;
4. pass engine + smoke + Chromium + Firefox + WebKit;
5. merge to `main`;
6. point the Pages branch at the exact released `main` commit;
7. verify the public Pages build marker.

## Open-source references

See `THIRD_PARTY_NOTICES.md`. GPL projects are behavior/architecture references only; BigChange V3 code is independently implemented.

## Running locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

Progress is stored locally in the browser.
