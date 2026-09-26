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

function compareWord(target, typed) {
  target = String(target ?? '');
  typed = String(typed ?? '');
  const targetStates = new Array(target.length).fill(KQ.PENDING);
  const typedStates = new Array(typed.length).fill(KQ.PENDING);
  let correct = 0;
  let currentErrors = 0;

  for (let i = 0; i < typed.length; i++) {
    if (i < target.length && typed[i] === target[i]) {
      typedStates[i] = KQ.CORRECT;
      targetStates[i] = KQ.CORRECT;
      correct++;
    } else {
      typedStates[i] = KQ.WRONG;
      if (i < target.length) targetStates[i] = KQ.WRONG;
      currentErrors++;
    }
  }

  return { targetStates, typedStates, correct, currentErrors };
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
    return word[this.input.length] ?? null;
  }

  currentComparison() {
    return compareWord(this.currentWord ?? '', this.input);
  }

  update(value, now = performance.now()) {
    if (this.done) return 'ignored';

    value = String(value ?? '').replace(/\s/g, '');
    if (this.startTime === null && value.length > 0) this.startTime = now;

    const previous = this.input;
    const detail = changeDetail(previous, value, this.currentWord ?? '');
    let insertedErrors = 0;

    for (const event of detail) {
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
    const comparison = compareWord(target, this.input);

    // Characters the student never typed are recorded when the word is
    // committed. They are mistakes, but they do not fabricate keypresses.
    const missed = Math.max(0, target.length - this.input.length);
    this.committedMisses += missed;

    this.history.push({
      target,
      input: this.input,
      correct: this.input === target,
      comparison,
      missed,
      mistakes: comparison.currentErrors + missed
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
