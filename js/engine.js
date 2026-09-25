// BigChange Typing Core V2.
//
// The browser textarea is the source of truth. Live feedback is deliberately
// positional: typed character i is compared with target character i.
// Nothing is re-aligned later, so feedback cannot pause, jump forward, or
// retroactively move mistakes after more keys arrive. Backspace and normal
// textarea editing remain fully native.
//
// Architecture is intentionally pure (no DOM, storage, or timers), following
// the separation used by open-source typing tutors such as Layer Tutor (MIT).

window.KQ = window.KQ || {};
KQ.PENDING = 0;
KQ.CORRECT = 1;
KQ.WRONG = 2;

KQ.alignText = function alignText(target, typed) {
  target = String(target ?? '');
  typed = String(typed ?? '');

  const progress = Math.min(typed.length, target.length);
  const targetStates = new Array(target.length).fill(KQ.PENDING);
  const typedStates = new Array(typed.length).fill(KQ.PENDING);
  const operations = [];
  let correct = 0;
  let errors = 0;

  for (let i = 0; i < progress; i++) {
    if (typed[i] === target[i]) {
      targetStates[i] = KQ.CORRECT;
      typedStates[i] = KQ.CORRECT;
      operations.push({ type: 'match', targetIndex: i, typedIndex: i });
      correct++;
    } else {
      targetStates[i] = KQ.WRONG;
      typedStates[i] = KQ.WRONG;
      operations.push({ type: 'substitute', targetIndex: i, typedIndex: i });
      errors++;
    }
  }

  for (let i = target.length; i < typed.length; i++) {
    typedStates[i] = KQ.WRONG;
    operations.push({ type: 'insert', targetIndex: target.length, typedIndex: i });
    errors++;
  }

  return {
    progress,
    correct,
    errors,
    distance: errors,
    targetStates,
    typedStates,
    operations
  };
};

function inputChange(previousValue, nextValue, target) {
  let start = 0;
  const shared = Math.min(previousValue.length, nextValue.length);
  while (start < shared && previousValue[start] === nextValue[start]) start++;

  let oldEnd = previousValue.length;
  let newEnd = nextValue.length;
  while (
    oldEnd > start &&
    newEnd > start &&
    previousValue[oldEnd - 1] === nextValue[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }

  let keystrokes = 0;
  let errors = 0;
  for (let i = start; i < newEnd; i++) {
    keystrokes++;
    if (i >= target.length || nextValue[i] !== target[i]) errors++;
  }

  return { keystrokes, errors };
}

KQ.TypingSession = class TypingSession {
  constructor(text) {
    this.text = String(text ?? '');
    this.value = '';
    this.startTime = null;
    this.endTime = null;
    this.done = this.text.length === 0;
    this.wpm = 0;
    this.totalErrors = 0;
    this.totalKeystrokes = 0;
    this.lastAlignment = KQ.alignText(this.text, '');
    this.resultHandled = false;
    this.challengeResultHandled = false;
  }

  get expected() {
    return this.done ? null : this.text[this.lastAlignment.progress] ?? null;
  }

  update(value, now = performance.now()) {
    if (this.done) return 'ignored';

    value = String(value ?? '');
    const previousValue = this.value;
    const previous = this.lastAlignment;

    if (this.startTime === null && value.length > 0) this.startTime = now;

    const change = inputChange(previousValue, value, this.text);
    this.totalKeystrokes += change.keystrokes;
    this.totalErrors += change.errors;
    this.value = value;
    const next = KQ.alignText(this.text, value);
    this.lastAlignment = next;
    this.updateWpm(now);

    if (next.progress >= this.text.length && value.length > 0) {
      this.finish(now);
      return 'complete';
    }

    if (change.errors > 0) return 'mistake';
    if (value.length < previousValue.length || next.errors < previous.errors) return 'corrected';
    return 'updated';
  }

  finish(at = performance.now()) {
    if (this.done) return;
    this.done = true;
    this.endTime = Math.max(this.startTime ?? at, at);
    this.updateWpm(this.endTime);
  }

  elapsedMs(now = performance.now()) {
    if (this.startTime === null) return 0;
    return (this.endTime ?? now) - this.startTime;
  }

  updateWpm(now = performance.now()) {
    const ms = this.elapsedMs(now);
    const correct = this.lastAlignment.correct;
    if (!this.startTime || correct < 5 || ms < 1000) {
      this.wpm = 0;
      return;
    }
    if (!this.done && (correct < 10 || ms < 5000)) {
      this.wpm = 0;
      return;
    }
    this.wpm = Math.max(0, Math.round((correct / 5) / (ms / 60000)));
  }

  stats(now = performance.now()) {
    const alignment = this.lastAlignment;
    const attempts = this.totalKeystrokes;
    const successful = Math.max(0, attempts - this.totalErrors);
    return {
      wpm: this.wpm,
      accuracy: attempts ? Math.max(0, Math.min(100, Math.round((successful / attempts) * 100))) : 100,
      mistakes: this.totalErrors,
      currentErrors: alignment.errors,
      typed: this.value.length,
      correct: alignment.correct,
      seconds: Math.round(this.elapsedMs(now) / 1000),
      done: this.done,
      progress: this.text.length ? alignment.progress / this.text.length : 0,
      expected: this.expected,
      targetProgress: alignment.progress,
      targetStates: alignment.targetStates,
      typedStates: alignment.typedStates,
      value: this.value
    };
  }
};
