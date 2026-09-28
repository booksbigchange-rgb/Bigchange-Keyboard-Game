# Root Cause Audit — September 28, 2026

The repeated failures were caused by multiple layers implementing different assumptions about the same typing action.

## Confirmed failures found by tests

### Desktop-only delimiter handling
The app committed words from `keydown` while the input handler stripped whitespace. A virtual/mobile keyboard can deliver Space through `beforeinput/input` without a normal keydown. Result: Space was swallowed and the word did not advance.

### Empty Backspace browser difference
Chromium passed the previous-word reopen flow. WebKit exposed `beforeinput` support but did not provide the same empty-field backward-delete event in this path. Result: Safari/WebKit could not reopen the previous word.

### Composition/IME scoring
Intermediate composition text was being sent directly into scoring. Result: a character that was not yet final could be counted as a mistake.

### Within-word positional cascade
The word engine still compared typed and target characters by raw index. Target `asdf` with typed `asxdf` treated later correct letters as additional errors. A single insertion became several mistakes.

### Omission double counting
Target `asdf` with typed `asf` could first classify `f` as positionally wrong and then add a missing-character penalty at commit. One omission hurt accuracy twice.

### Renderer disagreement
The renderer assumed extras were simply `typed.slice(target.length)`. For `asxdf`, the engine could identify `x` as the extra while the target UI highlighted final `f`.

### Browser coverage gap
Chromium-only CI hid the WebKit Backspace defect. The release gate now runs the same classroom scenarios in Chromium, Firefox, and WebKit.

### Release-history confusion
The Pages branch and `main` were updated through separate commits. Even identical file trees became divergent histories, making PR status and deployment reasoning harder than necessary.

## Architecture after the audit

There is one word-level alignment result. Scoring and rendering consume that same result.

Input is split into:
- `beforeinput` for virtual/mobile delimiters;
- normal `input` for text changes;
- composition-aware handling for IME;
- a cross-browser keydown safety path for empty Backspace.

Release source is `main`. The Pages branch is a mirror, not a second development line.

## Acceptance evidence

Before release, the audit branch passed:
- 27 engine/fuzz tests;
- 43 Chromium scenarios;
- 43 Firefox scenarios;
- 43 WebKit scenarios;
- 129 browser scenarios total.
