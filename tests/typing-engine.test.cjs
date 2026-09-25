const assert = require('node:assert/strict');
global.window = global;
require('../js/engine.js');

let passed=0, failed=0;
function test(name,fn){try{fn();console.log('✓',name);passed++}catch(err){console.error('✗',name,'-',err.message);failed++}}
function eq(a,b){assert.equal(a,b)}

test('correct key advances',()=>{const s=new KQ.TypingSession('ab');eq(s.input('a'),'correct');eq(s.pos,1)});
test('wrong substitution records one mistake and advances',()=>{const s=new KQ.TypingSession('ab');eq(s.input('x'),'wrong');eq(s.pos,1);eq(s.states[0],KQ.WRONG);eq(s.stats().mistakes,1)});
test('typing continues after a substitution',()=>{const s=new KQ.TypingSession('ab');s.input('x');eq(s.input('b'),'complete');eq(s.stats().mistakes,1)});
test('single inserted character repairs without Backspace',()=>{const s=new KQ.TypingSession('a b');s.input('a');s.input('p');eq(s.input(' '),'corrected');eq(s.pos,2);eq(s.input('b'),'complete');eq(s.stats().mistakes,1)});
test('two inserted characters repair without cascade',()=>{const s=new KQ.TypingSession('a bc');s.input('a');s.input('x');s.input('y');eq(s.input(' '),'corrected');eq(s.input('b'),'corrected');eq(s.input('c'),'complete');eq(s.stats().mistakes,2)});
test('repair window does not jump through an intervening correct character',()=>{const s=new KQ.TypingSession('abcd');s.input('x');s.input('b');eq(s.input('a'),'wrong');eq(s.pos,3)});
test('one skipped character resyncs ahead',()=>{const s=new KQ.TypingSession('a b');s.input('a');eq(s.input('b'),'complete');eq(s.states[1],KQ.WRONG);eq(s.states[2],KQ.CORRECT);eq(s.stats().mistakes,1)});
test('multiple skipped characters resync within the window',()=>{const s=new KQ.TypingSession('abcde');s.input('a');eq(s.input('d'),'resynced');eq(s.pos,4);eq(s.stats().mistakes,2);eq(s.input('e'),'complete')});
test('lookahead uses nearest matching target',()=>{const s=new KQ.TypingSession('abcb');s.input('a');eq(s.input('b'),'correct');eq(s.input('b'),'resynced');eq(s.pos,4);eq(s.stats().mistakes,1)});
test('backspace revisits previous committed position',()=>{const s=new KQ.TypingSession('ab');s.input('x');eq(s.backspace(),true);eq(s.pos,0);eq(s.states[0],KQ.PENDING);eq(s.input('a'),'correct')});
test('backspace cannot move before zero',()=>{const s=new KQ.TypingSession('a');eq(s.backspace(),false);eq(s.pos,0)});
test('historical mistake remains after correction',()=>{const s=new KQ.TypingSession('ab');s.input('x');s.backspace();s.input('a');eq(s.stats().mistakes,1);eq(s.states[0],KQ.CORRECT)});
test('accuracy counts historical corrections once',()=>{const s=new KQ.TypingSession('abcd');s.input('x');s.backspace();for(const ch of 'abcd')s.input(ch);eq(s.stats().accuracy,80)});
test('accuracy stays bounded',()=>{const s=new KQ.TypingSession('a');s.input('x');const a=s.stats().accuracy;assert.ok(a>=0&&a<=100)});
test('one mistake plus nine correct characters gives exactly 90 percent',()=>{const s=new KQ.TypingSession('abcdefghi');s.input('x');s.backspace();for(const ch of 'abcdefghi')s.input(ch);eq(s.stats().accuracy,90)});
test('one mistake plus eight correct characters rounds below pass mark',()=>{const s=new KQ.TypingSession('abcdefgh');s.input('x');s.backspace();for(const ch of 'abcdefgh')s.input(ch);eq(s.stats().accuracy,89)});
test('currentErrors counts unresolved wrong target positions',()=>{const s=new KQ.TypingSession('abcd');s.input('x');s.input('y');eq(s.stats().currentErrors,2);s.backspace();eq(s.stats().currentErrors,1)});
test('wpm stays zero before minimum sample',()=>{const s=new KQ.TypingSession('abcdefghij');s.startTime=1000;s.endTime=4000;s.pos=10;s.states.fill(KQ.CORRECT);s.updateWpm();eq(s.wpm,0)});
test('wpm uses correct characters and elapsed time',()=>{const s=new KQ.TypingSession('abcdefghij');s.startTime=1000;s.endTime=61000;s.pos=10;s.states.fill(KQ.CORRECT);s.updateWpm();eq(s.wpm,2)});
test('wrong characters do not inflate wpm',()=>{const s=new KQ.TypingSession('abcdefghij');s.startTime=1000;s.endTime=61000;s.pos=10;s.states.fill(KQ.WRONG);s.updateWpm();eq(s.wpm,0)});
test('wpm freezes after finish',()=>{const s=new KQ.TypingSession('abcdefghij');s.startTime=1000;s.endTime=61000;s.pos=10;s.states.fill(KQ.CORRECT);s.done=true;s.updateWpm();const first=s.stats().wpm;const second=s.stats().wpm;eq(first,2);eq(second,2)});
test('finish is idempotent',()=>{const s=new KQ.TypingSession('ab');s.input('a');s.finish();const end=s.endTime;s.finish();eq(s.endTime,end);eq(s.done,true)});
test('input is ignored after finish',()=>{const s=new KQ.TypingSession('a');s.input('a');eq(s.input('x'),'ignored')});
test('progress advances continuously through mistakes',()=>{const s=new KQ.TypingSession('abc');s.input('x');eq(s.stats().progress,1/3);s.input('b');eq(s.stats().progress,2/3)});
test('empty text reports safe zero progress',()=>{const s=new KQ.TypingSession('');eq(s.stats().progress,0);eq(s.input('x'),'ignored')});

console.log(`\n${passed} passed · ${failed} failed`);
if(failed) process.exit(1);
