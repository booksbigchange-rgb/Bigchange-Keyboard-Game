const assert = require('node:assert/strict');
global.window = global;
require('../js/engine.js');

let passed=0, failed=0;
function test(name,fn){try{fn();console.log('✓',name);passed++}catch(err){console.error('✗',name,'-',err.message);failed++}}
function eq(a,b){assert.equal(a,b)}

test('correct key advances',()=>{const s=new KQ.TypingSession('ab');eq(s.input('a'),'correct');eq(s.pos,1)});
test('wrong substitution records one mistake and advances',()=>{const s=new KQ.TypingSession('ab');eq(s.input('x'),'wrong');eq(s.pos,1);eq(s.states[0],KQ.WRONG);eq(s.stats().mistakes,1)});
test('typing continues after a wrong substitution',()=>{const s=new KQ.TypingSession('ab');s.input('x');eq(s.input('b'),'complete');eq(s.pos,2);eq(s.stats().mistakes,1)});
test('extra character can be repaired without cascade or Backspace',()=>{const s=new KQ.TypingSession('a b');s.input('a');s.input('p');eq(s.pos,2);eq(s.input(' '),'corrected');eq(s.pos,2);eq(s.states[1],KQ.CORRECT);eq(s.input('b'),'complete');eq(s.stats().mistakes,1)});
test('skipped character resyncs on the next expected character',()=>{const s=new KQ.TypingSession('a b');s.input('a');eq(s.input('b'),'complete');eq(s.states[1],KQ.WRONG);eq(s.states[2],KQ.CORRECT);eq(s.stats().mistakes,1)});
test('backspace can revisit the previous committed character',()=>{const s=new KQ.TypingSession('ab');s.input('x');eq(s.backspace(),true);eq(s.pos,0);eq(s.states[0],KQ.PENDING);eq(s.input('a'),'correct')});
test('backspace cannot move before zero',()=>{const s=new KQ.TypingSession('a');eq(s.backspace(),false);eq(s.pos,0)});
test('accuracy counts corrected historical mistakes once',()=>{const s=new KQ.TypingSession('abcd');s.input('x');s.backspace();for(const ch of 'abcd')s.input(ch);eq(s.stats().mistakes,1);eq(s.stats().accuracy,80)});
test('accuracy stays bounded',()=>{const s=new KQ.TypingSession('a');s.input('x');const a=s.stats().accuracy;assert.ok(a>=0&&a<=100)});
test('one mistake plus nine corrected characters gives exactly 90 percent',()=>{const s=new KQ.TypingSession('abcdefghi');s.input('x');s.backspace();for(const ch of 'abcdefghi')s.input(ch);eq(s.stats().mistakes,1);eq(s.stats().accuracy,90)});
test('one mistake plus eight corrected characters rounds below pass mark',()=>{const s=new KQ.TypingSession('abcdefgh');s.input('x');s.backspace();for(const ch of 'abcdefgh')s.input(ch);eq(s.stats().mistakes,1);eq(s.stats().accuracy,89)});
test('wpm stays zero before minimum sample',()=>{const s=new KQ.TypingSession('abcdefghij');s.startTime=1000;s.endTime=4000;s.pos=10;s.states.fill(KQ.CORRECT);s.updateWpm();eq(s.wpm,0)});
test('wpm uses correct characters and elapsed time',()=>{const s=new KQ.TypingSession('abcdefghij');s.startTime=1000;s.endTime=61000;s.pos=10;s.states.fill(KQ.CORRECT);s.updateWpm();eq(s.wpm,2)});
test('wpm freezes after finish',()=>{const s=new KQ.TypingSession('abcdefghij');s.startTime=1000;s.endTime=61000;s.pos=10;s.states.fill(KQ.CORRECT);s.done=true;s.updateWpm();const first=s.stats().wpm;const second=s.stats().wpm;eq(first,2);eq(second,2)});
test('forced finish preserves a final wrong state',()=>{const s=new KQ.TypingSession('ab');s.input('a');s.input('x');eq(s.done,true);eq(s.states[1],KQ.WRONG);eq(s.stats().currentErrors,1);eq(s.stats().mistakes,1)});
test('finish is idempotent',()=>{const s=new KQ.TypingSession('ab');s.input('a');s.finish();const end=s.endTime;s.finish();eq(s.endTime,end);eq(s.done,true)});
test('multiple corrected mistakes keep bounded accuracy',()=>{const s=new KQ.TypingSession('abc');s.input('x');s.backspace();s.input('a');s.input('y');s.backspace();s.input('b');s.input('c');eq(s.stats().mistakes,2);eq(s.stats().accuracy,60)});
test('input is ignored after finish',()=>{const s=new KQ.TypingSession('a');s.input('a');eq(s.input('x'),'ignored')});
test('progress continues through a wrong character without cascade',()=>{const s=new KQ.TypingSession('abc');s.input('x');eq(s.stats().progress,1/3);s.input('b');eq(s.stats().progress,2/3)});

console.log(`\n${passed} passed · ${failed} failed`);
if(failed) process.exit(1);
