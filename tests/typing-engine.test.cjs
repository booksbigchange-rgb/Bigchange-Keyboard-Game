const assert = require('node:assert/strict');
global.window = global;
require('../js/engine.js');

let passed=0, failed=0;
function test(name,fn){try{fn();console.log('✓',name);passed++}catch(err){console.error('✗',name,'-',err.message);failed++}}
function eq(a,b){assert.equal(a,b)}

test('empty input stays at the beginning',()=>{
  const s=new KQ.TypingSession('abc');
  const st=s.stats(0);
  eq(st.targetProgress,0);eq(st.accuracy,100);eq(st.mistakes,0)
});

test('correct text advances naturally',()=>{
  const s=new KQ.TypingSession('abc');
  s.update('a',1000);eq(s.stats(1000).targetProgress,1);
  s.update('ab',1500);eq(s.stats(1500).targetProgress,2);
  eq(s.update('abc',2000),'complete');eq(s.done,true)
});

test('a substitution is visible immediately and never blocks input',()=>{
  const s=new KQ.TypingSession('abc');
  s.update('ax',1000);
  const st=s.stats(1000);
  eq(st.targetProgress,2);eq(st.mistakes,1);eq(st.currentErrors,1);
  eq(st.targetStates[1],KQ.WRONG);
  eq(s.update('axc',1500),'complete');
});

test('progress follows raw input one position at a time without jumps',()=>{
  const s=new KQ.TypingSession('red tree quiet type power');
  for(const [value,progress] of [['r',1],['re',2],['red',3],['redb',4],['redby',5],['redbyr',6]]){
    s.update(value,1000+progress*100);
    eq(s.stats(2000).targetProgress,progress)
  }
});

test('reported Top Row mistake sequence marks mistakes as they happen',()=>{
  const s=new KQ.TypingSession('red tree quiet type power');
  s.update('redb',1000);
  let st=s.stats(1000);
  eq(st.mistakes,1);eq(st.currentErrors,1);eq(st.targetStates[3],KQ.WRONG);
  s.update('redby',1100);
  st=s.stats(1100);
  eq(st.mistakes,2);eq(st.currentErrors,2);eq(st.targetStates[4],KQ.WRONG);
  s.update('redbyr',1200);
  st=s.stats(1200);
  eq(st.targetProgress,6);eq(st.mistakes,2)
});

test('append-only input cannot retroactively recolor an earlier position',()=>{
  const s=new KQ.TypingSession('red tree quiet type power');
  s.update('redby',1000);
  const before=s.stats(1000).targetStates.slice(0,5);
  s.update('redbyree',1500);
  assert.deepEqual(s.stats(1500).targetStates.slice(0,5),before)
});

test('an omitted character does not trigger hidden automatic realignment',()=>{
  const a=KQ.alignText('red tree','redtree');
  eq(a.progress,7);
  assert.ok(a.errors>=1);
  eq(a.targetStates[7],KQ.PENDING)
});

test('Backspace correction is natural and historical mistakes remain counted',()=>{
  const s=new KQ.TypingSession('abc');
  s.update('ax',1000);
  const historical=s.stats(1000).mistakes;
  s.update('a',1200);
  s.update('ab',1400);
  eq(s.stats(1400).targetProgress,2);
  eq(s.stats(1400).currentErrors,0);
  eq(s.stats(1400).mistakes,historical);
  eq(s.update('abc',1600),'complete')
});

test('replacing a same-length wrong value updates live feedback without erasing history',()=>{
  const s=new KQ.TypingSession('abc');
  s.update('ax',1000);
  s.update('ab',1200);
  eq(s.stats(1200).targetProgress,2);
  eq(s.stats(1200).currentErrors,0);
  eq(s.stats(1200).mistakes,1)
});

test('extra characters beyond the target are marked wrong',()=>{
  const a=KQ.alignText('abc','abcx');
  eq(a.progress,3);eq(a.typedStates[3],KQ.WRONG);eq(a.errors,1)
});

test('target state is a literal position-by-position comparison',()=>{
  const a=KQ.alignText('abc','ax');
  eq(a.targetStates[0],KQ.CORRECT);
  eq(a.targetStates[1],KQ.WRONG);
  eq(a.targetStates[2],KQ.PENDING);
  eq(a.progress,2)
});

test('repeated letters remain bounded and deterministic',()=>{
  const a=KQ.alignText('aaaa bbbb','aaax bbbb');
  eq(a.progress,9);assert.ok(a.errors>=1)
});

test('lesson can finish with a wrong final substitution',()=>{
  const s=new KQ.TypingSession('abc');
  eq(s.update('abx',2000),'complete');
  eq(s.done,true);eq(s.stats(2000).mistakes,1)
});

test('short input cannot finish a longer target',()=>{
  const s=new KQ.TypingSession('abcdefghij');
  s.update('abc',1000);
  eq(s.done,false);eq(s.stats(1000).targetProgress,3)
});

test('mistake count never decreases after a Backspace correction',()=>{
  const s=new KQ.TypingSession('hello');
  s.update('hez',1000);
  const before=s.stats(1000).mistakes;
  s.update('he',1200);
  assert.ok(s.stats(1200).mistakes>=before)
});

test('accuracy is historical keystroke accuracy and always bounded',()=>{
  const s=new KQ.TypingSession('abcdef');
  s.update('a',1000);
  s.update('ax',1100);
  eq(s.stats(1100).accuracy,50);
  s.update('a',1200);
  s.update('ab',1300);
  eq(s.stats(1300).mistakes,1);
  assert.ok(s.stats(1300).accuracy>=0&&s.stats(1300).accuracy<=100)
});

test('WPM uses currently correct target positions, not raw typed length',()=>{
  const s=new KQ.TypingSession('abcdefghij');
  s.startTime=1000;
  s.value='abcdefghij';
  s.lastAlignment=KQ.alignText(s.text,s.value);
  s.finish(61000);
  eq(s.stats(61000).wpm,2)
});

test('wrong text does not inflate WPM',()=>{
  const s=new KQ.TypingSession('abcdefghij');
  s.startTime=1000;
  s.value='xxxxxxxxxx';
  s.lastAlignment=KQ.alignText(s.text,s.value);
  s.finish(61000);
  eq(s.stats(61000).wpm,0)
});

test('forced challenge finish freezes time',()=>{
  const s=new KQ.TypingSession('abcdefghijklmnopqrstuvwxyz');
  s.update('abcdefghij',1000);
  s.finish(61000);
  eq(s.stats(999999).seconds,60);
  const wpm=s.stats(999999).wpm;
  eq(s.stats(1999999).wpm,wpm)
});

test('input after finish is ignored',()=>{
  const s=new KQ.TypingSession('a');
  s.update('a',1000);
  eq(s.update('ab',2000),'ignored')
});

test('comparison handles spaces punctuation capitals and numbers',()=>{
  for(const [target,typed] of [
    ['Hello, student!','Hello, student!'],
    ['2026 123','2026 123'],
    ['Big Change','Big Change']
  ]){
    const a=KQ.alignText(target,typed);
    eq(a.progress,target.length);eq(a.errors,0);eq(a.correct,target.length)
  }
});

test('deterministic fuzz keeps positional session invariants valid',()=>{
  let seed=246813579;
  const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
  const chars='asdf jkl;qwertyuiopzxcvbnm,.!?123ABC';
  for(let run=0;run<200;run++){
    let target='';
    const n=5+Math.floor(rnd()*45);
    for(let i=0;i<n;i++)target+=chars[Math.floor(rnd()*chars.length)];
    const s=new KQ.TypingSession(target);
    let value='';
    for(let step=0;step<70&&!s.done;step++){
      const r=rnd();
      if(r<0.15&&value.length)value=value.slice(0,-1);
      else value+=chars[Math.floor(rnd()*chars.length)];
      s.update(value,1000+step*100);
      const st=s.stats(1000+step*100);
      assert.ok(st.targetProgress>=0&&st.targetProgress<=target.length);
      eq(st.targetProgress,Math.min(value.length,target.length));
      assert.ok(st.progress>=0&&st.progress<=1);
      assert.ok(st.accuracy>=0&&st.accuracy<=100);
      assert.ok(st.mistakes>=0);
      eq(st.targetStates.length,target.length);
      eq(st.typedStates.length,value.length)
    }
  }
});

console.log(`\n${passed} passed · ${failed} failed`);
if(failed) process.exit(1);
