const assert = require('node:assert/strict');
global.window = global;
require('../js/engine.js');

let passed=0, failed=0;
function test(name,fn){try{fn();console.log('✓',name);passed++}catch(err){console.error('✗',name,'-',err.message);failed++}}
function eq(a,b){assert.equal(a,b)}

test('correct key advances',()=>{const s=new KQ.TypingSession('ab');eq(s.input('a'),'correct');eq(s.pos,1)});
test('wrong key locks position',()=>{const s=new KQ.TypingSession('ab');eq(s.input('x'),'wrong');eq(s.pos,0);eq(s.stats().mistakes,1)});
test('locked extra keys do not add mistakes',()=>{const s=new KQ.TypingSession('ab');s.input('x');eq(s.input('y'),'locked');eq(s.input('z'),'locked');eq(s.stats().mistakes,1)});
test('backspace clears locked mistake',()=>{const s=new KQ.TypingSession('ab');s.input('x');eq(s.backspace(),true);eq(s.states[0],KQ.PENDING);eq(s.input('a'),'correct')});
test('wrong space cannot cascade',()=>{const s=new KQ.TypingSession('a b');s.input('a');s.input('x');eq(s.pos,1);eq(s.input('b'),'locked');s.backspace();eq(s.input(' '),'correct');eq(s.input('b'),'complete')});
test('accuracy counts corrected mistakes once',()=>{const s=new KQ.TypingSession('abcd');s.input('x');s.backspace();s.input('a');s.input('b');s.input('c');s.input('d');eq(s.stats().mistakes,1);eq(s.stats().accuracy,80)});
test('accuracy stays bounded',()=>{const s=new KQ.TypingSession('a');s.input('x');const a=s.stats().accuracy;assert.ok(a>=0&&a<=100)});
test('wpm stays zero before minimum sample',()=>{const s=new KQ.TypingSession('abcdefghij');s.startTime=1000;s.endTime=4000;s.pos=10;s.states.fill(KQ.CORRECT);s.updateWpm();eq(s.wpm,0)});
test('wpm uses correct characters and elapsed time',()=>{const s=new KQ.TypingSession('abcdefghij');s.startTime=1000;s.endTime=61000;s.pos=10;s.states.fill(KQ.CORRECT);s.updateWpm();eq(s.wpm,2)});
test('wpm freezes after finish',()=>{const s=new KQ.TypingSession('abcdefghij');s.startTime=1000;s.endTime=61000;s.pos=10;s.states.fill(KQ.CORRECT);s.done=true;s.updateWpm();const first=s.stats().wpm;const second=s.stats().wpm;eq(first,2);eq(second,2)});
test('forced finish preserves active mistake',()=>{const s=new KQ.TypingSession('ab');s.input('x');s.finish();eq(s.done,true);eq(s.stats().currentErrors,1);eq(s.states[0],KQ.WRONG)});
test('input is ignored after finish',()=>{const s=new KQ.TypingSession('a');s.input('a');eq(s.input('x'),'ignored')});
test('progress only counts corrected positions',()=>{const s=new KQ.TypingSession('ab');s.input('x');eq(s.stats().progress,0);s.backspace();s.input('a');eq(s.stats().progress,.5)});

console.log(`\n${passed} passed · ${failed} failed`);
if(failed) process.exit(1);
