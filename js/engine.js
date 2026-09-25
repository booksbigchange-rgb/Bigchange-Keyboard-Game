// BigChange Typing Core V2.
//
// Interaction pattern: a real browser text input is the source of truth.
// The engine never owns an artificial cursor and never blocks a wrong key.
// It aligns the student's current text to the nearest target prefix so
// insertions, omissions, substitutions, and Backspace edits do not cascade.
//
// Architecture is intentionally pure (no DOM, storage, or timers), following
// the separation used by open-source typing tutors such as Layer Tutor (MIT).

window.KQ = window.KQ || {};
KQ.PENDING = 0;
KQ.CORRECT = 1;
KQ.WRONG = 2;

const ALIGN_LOOKAHEAD = 12;

function chooseStep(match, sub, insert, del) {
  const best = Math.min(match, sub, insert, del);
  if (match === best) return ['match', best];
  // Prefer treating a trailing mismatch as an extra typed character instead
  // of prematurely consuming the next target character. Future input can then
  // realign naturally without a cascade.
  if (insert === best) return ['insert', best];
  if (sub === best) return ['sub', best];
  return ['delete', best];
}

KQ.alignText = function alignText(target, typed) {
  target = String(target ?? '');
  typed = String(typed ?? '');

  const m = typed.length;
  const limit = Math.min(target.length, Math.max(0, m + ALIGN_LOOKAHEAD));
  const width = limit + 1;

  const cost = Array.from({ length: m + 1 }, () => new Uint16Array(width));
  const op = Array.from({ length: m + 1 }, () => new Uint8Array(width));
  // 1 match, 2 substitution, 3 insertion (extra typed), 4 deletion (missed target)

  for (let j = 1; j <= limit; j++) {
    cost[0][j] = j;
    op[0][j] = 4;
  }
  for (let i = 1; i <= m; i++) {
    cost[i][0] = i;
    op[i][0] = 3;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= limit; j++) {
      const same = typed[i - 1] === target[j - 1];
      const match = same ? cost[i - 1][j - 1] : 65535;
      const sub = same ? 65535 : cost[i - 1][j - 1] + 1;
      const insert = cost[i - 1][j] + 1;
      const del = cost[i][j - 1] + 1;
      const [kind, best] = chooseStep(match, sub, insert, del);
      cost[i][j] = best;
      op[i][j] = kind === 'match' ? 1 : kind === 'sub' ? 2 : kind === 'insert' ? 3 : 4;
    }
  }

  let end = 0;
  let bestCost = cost[m][0];
  for (let j = 1; j <= limit; j++) {
    const value = cost[m][j];
    if (value < bestCost) {
      bestCost = value;
      end = j;
      continue;
    }
    if (value !== bestCost) continue;

    const endMatches = m > 0 && j > 0 && typed[m - 1] === target[j - 1];
    const chosenMatches = m > 0 && end > 0 && typed[m - 1] === target[end - 1];

    if (endMatches && !chosenMatches) {
      end = j;
    } else if (endMatches === chosenMatches) {
      // At the actual end of a lesson, let an equal-cost final substitution
      // finish instead of requiring a phantom extra character.
      if (m >= target.length && j === target.length) end = j;
      else if (!endMatches && j < end) end = j;
      else if (endMatches && j > end) end = j;
    }
  }

  const targetStates = new Array(target.length).fill(KQ.PENDING);
  const typedStates = new Array(m).fill(KQ.PENDING);
  const operations = [];

  let i = m;
  let j = end;
  let correct = 0;
  let errors = 0;

  while (i > 0 || j > 0) {
    const code = op[i]?.[j] ?? (i > 0 ? 3 : 4);

    if (code === 1) {
      targetStates[j - 1] = KQ.CORRECT;
      typedStates[i - 1] = KQ.CORRECT;
      operations.push({ type: 'match', targetIndex: j - 1, typedIndex: i - 1 });
      correct++;
      i--;
      j--;
    } else if (code === 2) {
      targetStates[j - 1] = KQ.WRONG;
      typedStates[i - 1] = KQ.WRONG;
      operations.push({ type: 'substitute', targetIndex: j - 1, typedIndex: i - 1 });
      errors++;
      i--;
      j--;
    } else if (code === 3) {
      typedStates[i - 1] = KQ.WRONG;
      operations.push({ type: 'insert', targetIndex: j, typedIndex: i - 1 });
      errors++;
      i--;
    } else {
      targetStates[j - 1] = KQ.WRONG;
      operations.push({ type: 'delete', targetIndex: j - 1, typedIndex: i });
      errors++;
      j--;
    }
  }

  operations.reverse();

  return {
    progress: end,
    correct,
    errors,
    distance: bestCost,
    targetStates,
    typedStates,
    operations
  };
};

KQ.TypingSession = class TypingSession {
  constructor(text) {
    this.text = String(text ?? '');
    this.value = '';
    this.startTime = null;
    this.endTime = null;
    this.done = this.text.length === 0;
    this.wpm = 0;
    this.totalErrors = 0;
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

    this.value = value;
    const next = KQ.alignText(this.text, value);

    // Only typing/forward edits can add historical mistakes. Backspace or
    // corrections may reduce the current edit distance, but the original
    // mistake still counts toward lesson accuracy.
    const grew = value.length > previousValue.length;
    const changedWithoutShrink = value.length === previousValue.length && value !== previousValue;
    if (grew || changedWithoutShrink) {
      this.totalErrors += Math.max(0, next.errors - previous.errors);
    }

    this.lastAlignment = next;
    this.updateWpm(now);

    if (next.progress >= this.text.length && value.length > 0) {
      this.finish(now);
      return 'complete';
    }

    return next.errors > previous.errors ? 'mistake' : next.errors < previous.errors ? 'corrected' : 'updated';
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
    const attempts = alignment.correct + this.totalErrors;
    return {
      wpm: this.wpm,
      accuracy: attempts ? Math.max(0, Math.min(100, Math.round((alignment.correct / attempts) * 100))) : 100,
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
