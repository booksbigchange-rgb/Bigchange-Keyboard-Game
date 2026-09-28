// BigChange Typing Core V3.
//
// V3 is intentionally word-scoped. It does not realign whole sentences.
// A real textarea contains only the current word, and every insert/delete is
// recorded immediately. Space commits a word and moves to the next word.
// This keeps mistakes local and prevents delayed sentence-wide error jumps.
//
// Inspired by the interaction patterns of mature typing tutors such as
// Monkeytype and Qwerty Learner. This implementation is original BigChange
// code and does not copy GPL source.

window.KQ = window.KQ || {};
KQ.PENDING = 0;
KQ.CORRECT = 1;
KQ.WRONG = 2;

function splitWords(text) {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean);
}

function compareWord(target, typed, complete = false) {
  target = String(target ?? '');
  typed = String(typed ?? '');

  const m = target.length;
  const n = typed.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const substitution = dp[i - 1][j - 1] + (target[i - 1] === typed[j - 1] ? 0 : 1);
      const omission = dp[i - 1][j] + 1;
      const insertion = dp[i][j - 1] + 1;
      dp[i][j] = Math.min(substitution, omission, insertion);
    }
  }

  let targetProgress = m;
  if (!complete) {
    let best = dp[0][n];
    targetProgress = 0;
    for (let i = 1; i <= m; i++) {
      if (dp[i][n] < best) {
        best = dp[i][n];
        targetProgress = i;
      }
      // On equal cost, keep the smaller target prefix. A wrong key therefore
      // does not silently advance the expected target character. More input
      // can later prove that the key was a substitution instead of an extra.
    }
  }

  const targetStates = new Array(m).fill(KQ.PENDING);
  const typedStates = new Array(n).fill(KQ.PENDING);
  const operations = [];
  let correct = 0;
  let omissions = 0;
  let insertions = 0;
  let substitutions = 0;
  let i = targetProgress;
  let j = n;

  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      target[i - 1] === typed[j - 1] &&
      dp[i][j] === dp[i - 1][j - 1]
    ) {
      targetStates[i - 1] = KQ.CORRECT;
      typedStates[j - 1] = KQ.CORRECT;
      operations.push({ type: 'match', targetIndex: i - 1, typedIndex: j - 1 });
      correct++;
      i--;
      j--;
      continue;
    }

    // Prefer treating an ambiguous wrong character as an insertion. This
    // keeps the expected target character in place until later input proves
    // that the character was actually a substitution.
    if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      typedStates[j - 1] = KQ.WRONG;
      operations.push({ type: 'insert', typedIndex: j - 1 });
      insertions++;
      j--;
      continue;
    }

    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      targetStates[i - 1] = KQ.WRONG;
      typedStates[j - 1] = KQ.WRONG;
      operations.push({ type: 'substitute', targetIndex: i - 1, typedIndex: j - 1 });
      substitutions++;
      i--;
      j--;
      continue;
    }

    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      targetStates[i - 1] = KQ.WRONG;
      operations.push({ type: 'omit', targetIndex: i - 1 });
      omissions++;
      i--;
      continue;
    }

    // Defensive escape: the DP matrix should always provide one valid step.
    break;
  }

  operations.reverse();

  return {
    targetStates,
    typedStates,
    correct,
    currentErrors: dp[targetProgress][n],
    targetProgress,
    omissions,
    insertions,
    substitutions,
    operations
  };
}

function changeDetail(previousValue, nextValue, target) {
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

  const inserted = nextValue.slice(start, newEnd);
  const deleted = previousValue.slice(start, oldEnd);
  const events = [];

  for (let i = 0; i < deleted.length; i++) {
    events.push({
      type: 'delete',
      charIndex: start,
      char: deleted[i]
    });
  }

  for (let i = 0; i < inserted.length; i++) {
    const charIndex = start + i;
    const char = inserted[i];
    events.push({
      type: 'insert',
      charIndex,
      char,
      correct: charIndex < target.length && char === target[charIndex]
    });
  }

  return events;
}

KQ.compareWord = compareWord;

KQ.TypingSession = class TypingSession {
  constructor(text) {
    this.text = String(text ?? '');
    this.words = splitWords(this.text);
    this.wordIndex = 0;
    this.input = '';
    this.history = [];
    this.events = [];
    // Wrong key presses stay historical for accuracy.
    // Missed letters belong to committed words and can be undone by reopening.
    this.rawErrors = 0;
    this.committedMisses = 0;
    this.totalInserted = 0;
    this.startTime = null;
    this.endTime = null;
    this.done = this.words.length === 0;
    this.wpm = 0;
    this.resultHandled = false;
    this.challengeResultHandled = false;
  }

  get currentWord() {
    return this.done ? null : this.words[this.wordIndex] ?? null;
  }

  get expected() {
    const word = this.currentWord;
    if (word === null) return null;
    return word[this.currentComparison().targetProgress] ?? null;
  }

  currentComparison() {
    return compareWord(this.currentWord ?? '', this.input);
  }

  update(value, now = performance.now()) {
    if (this.done) return 'ignored';

    value = String(value ?? '').replace(/\s/g, '');
    if (this.startTime === null && value.length > 0) this.startTime = now;

    const previous = this.input;
    const target = this.currentWord ?? '';
    const nextComparison = compareWord(target, value);
    const detail = changeDetail(previous, value, target);
    let insertedErrors = 0;

    for (const event of detail) {
      if (event.type === 'insert') {
        event.correct = nextComparison.typedStates[event.charIndex] === KQ.CORRECT;
      }
      const logged = { ...event, wordIndex: this.wordIndex, at: now };
      this.events.push(logged);
      if (event.type === 'insert') {
        this.totalInserted++;
        if (!event.correct) {
          this.rawErrors++;
          insertedErrors++;
        }
      }
    }

    this.input = value;
    this.updateWpm(now);

    // The final word may finish automatically once it is exactly correct.
    if (
      this.wordIndex === this.words.length - 1 &&
      this.input === this.currentWord
    ) {
      return this.commitWord(now, 'auto');
    }

    if (insertedErrors > 0) return 'mistake';
    if (value.length < previous.length) return 'corrected';
    return 'updated';
  }

  commitWord(now = performance.now(), reason = 'space') {
    if (this.done) return 'ignored';
    if (this.startTime === null && this.input.length > 0) this.startTime = now;

    const target = this.currentWord ?? '';
    const comparison = compareWord(target, this.input, true);

    // Omitted target characters are recorded at commit time. Insertions and
    // substitutions were already recorded from actual input events.
    const missed = comparison.omissions;
    this.committedMisses += missed;

    this.history.push({
      target,
      input: this.input,
      correct: this.input === target,
      comparison,
      missed,
      mistakes: comparison.currentErrors
    });
    this.events.push({
      type: 'commit',
      wordIndex: this.wordIndex,
      input: this.input,
      target,
      correct: this.input === target,
      missed,
      reason,
      at: now
    });

    this.wordIndex++;
    this.input = '';

    if (this.wordIndex >= this.words.length) {
      this.finish(now);
      return 'complete';
    }

    this.updateWpm(now);
    return 'next-word';
  }

  reopenPreviousWord(now = performance.now()) {
    if (this.done || this.input.length > 0 || this.wordIndex <= 0) return false;

    const previous = this.history.pop();
    if (!previous) return false;

    this.wordIndex--;
    this.committedMisses = Math.max(0, this.committedMisses - (previous.missed || 0));
    this.input = previous.input;
    this.events.push({
      type: 'reopen',
      wordIndex: this.wordIndex,
      input: this.input,
      at: now
    });
    this.updateWpm(now);
    return true;
  }

  correctCharacterCount() {
    let correct = 0;
    for (const word of this.history) correct += word.comparison.correct;
    correct += this.currentComparison().correct;
    return correct;
  }

  completedCharacterCount() {
    let count = 0;
    for (let i = 0; i < this.wordIndex; i++) count += this.words[i].length;
    return count;
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
    const correct = this.correctCharacterCount();

    if (this.startTime === null || correct < 5 || ms < 1000) {
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
    const current = this.currentComparison();
    const correct = this.correctCharacterCount();
    const attemptErrors = this.rawErrors + this.committedMisses;
    const attempts = correct + attemptErrors;
    const committedMistakes = this.history.reduce((sum, word) => sum + (word.mistakes || 0), 0);
    const visibleMistakes = committedMistakes + current.currentErrors;
    const completedWords = this.history.length;

    return {
      wpm: this.wpm,
      accuracy: attempts
        ? Math.max(0, Math.min(100, Math.round((correct / attempts) * 100)))
        : 100,
      // "mistakes" mirrors what the student can currently see: final mistakes
      // in committed words + unresolved mistakes in the active word.
      // Corrected key presses still affect accuracy through attemptErrors.
      mistakes: visibleMistakes,
      attemptErrors,
      currentErrors: current.currentErrors,
      typed: this.input.length,
      correct,
      seconds: Math.round(this.elapsedMs(now) / 1000),
      done: this.done,
      progress: this.words.length ? Math.min(1, completedWords / this.words.length) : 0,
      expected: this.expected,
      currentWord: this.currentWord,
      currentWordIndex: this.wordIndex,
      totalWords: this.words.length,
      input: this.input,
      targetStates: current.targetStates,
      typedStates: current.typedStates,
      history: this.history,
      eventCount: this.events.length
    };
  }
};
