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

test('single substitution does not block later typing',()=>{
  const s=new KQ.TypingSession('abc');
  s.update('ax',1000);
  eq(s.stats(1000).mistakes,1);
  eq(s.update('axc',1500),'complete');
  eq(s.stats(1500).targetProgress,3)
});

test('extra inserted character does not cascade the rest of the sentence',()=>{
  const s=new KQ.TypingSession('red tree quiet');
  s.update('redb',1000);
  assert.ok(s.stats(1000).targetProgress<=4);
  s.update('redb tree quiet',3000);
  eq(s.done,true);
  assert.ok(s.stats(3000).mistakes>=1);
  assert.ok(s.stats(3000).accuracy<100)
});

test('top-row screenshot regression keeps later words aligned after early extras',()=>{
  const s=new KQ.TypingSession('red tree quiet type power');
  s.update('redb',1000);
  s.update('redby',1100);
  s.update('redbyree quiet type power',4000);
  const st=s.stats(4000);
  eq(s.done,true);
  assert.ok(st.mistakes>=2);
  assert.ok(st.correct>=20);
  assert.ok(st.accuracy<100);
});

test('omitted character realigns when later characters match',()=>{
  const s=new KQ.TypingSession('red tree');
  s.update('redtree',1000);
  eq(s.done,true);
  eq(s.stats(1000).targetProgress,8);
  assert.ok(s.stats(1000).mistakes>=1)
});

test('Backspace correction is natural because the raw value is authoritative',()=>{
  const s=new KQ.TypingSession('abc');
  s.update('ax',1000);
  const historical=s.stats(1000).mistakes;
  s.update('a',1200);
  s.update('ab',1400);
  eq(s.stats(1400).targetProgress,2);
  eq(s.stats(1400).mistakes,historical);
  eq(s.update('abc',1600),'complete')
});

test('replacing a same-length wrong value can recover alignment',()=>{
  const s=new KQ.TypingSession('abc');
  s.update('ax',1000);
  s.update('ab',1200);
  eq(s.stats(1200).targetProgress,2);
  assert.ok(s.stats(1200).currentErrors===0)
});

test('typed state reports wrong inserted characters',()=>{
  const a=KQ.alignText('abc','axbc');
  assert.ok(a.typedStates.includes(KQ.WRONG));
  eq(a.progress,3)
});

test('target state reports omitted characters',()=>{
  const a=KQ.alignText('abc','ac');
  assert.ok(a.targetStates.includes(KQ.WRONG));
  eq(a.progress,3)
});

test('repeated letters align without throwing or jumping outside target',()=>{
  const a=KQ.alignText('aaaa bbbb','aaax bbbb');
  assert.ok(a.progress>=0&&a.progress<=9);
  assert.ok(a.errors>=1)
});

test('lesson can finish with a wrong final substitution',()=>{
  const s=new KQ.TypingSession('abc');
  eq(s.update('abx',2000),'complete');
  eq(s.done,true);
  eq(s.stats(2000).mistakes,1)
});

test('short input cannot finish a longer target just through deletions',()=>{
  const s=new KQ.TypingSession('abcdefghij');
  s.update('abc',1000);
  eq(s.done,false);
  assert.ok(s.stats(1000).targetProgress<10)
});

test('mistake count never decreases after a Backspace correction',()=>{
  const s=new KQ.TypingSession('hello');
  s.update('hez',1000);
  const before=s.stats(1000).mistakes;
  s.update('he',1200);
  assert.ok(s.stats(1200).mistakes>=before)
});

test('accuracy is always bounded',()=>{
  const s=new KQ.TypingSession('abcdef');
  for(const value of ['x','xy','xyz','xyza','xyzab','xyzabc']){
    if(!s.done)s.update(value,1000+value.length*100)
    const a=s.stats(2000).accuracy;
    assert.ok(Number.isFinite(a)&&a>=0&&a<=100)
  }
});

test('WPM uses aligned correct characters, not raw typed length',()=>{
  const s=new KQ.TypingSession('abcdefghij');
  s.startTime=1000;
  s.value='abcdefghij';
  s.lastAlignment=KQ.alignText(s.text,s.value);
  s.finish(61000);
  eq(s.stats(61000).wpm,2)
});

test('wrong inserted text does not inflate WPM',()=>{
  const s=new KQ.TypingSession('abcdefghij');
  s.startTime=1000;
  s.value='xxxxxxxxxx';
  s.lastAlignment=KQ.alignText(s.text,s.value);
  s.finish(61000);
  assert.ok(s.stats(61000).wpm<=2)
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

test('alignment handles spaces punctuation capitals and numbers',()=>{
  for(const [target,typed] of [
    ['Hello, student!','Hello, student!'],
    ['2026 123','2026 123'],
    ['Big Change','Big Change']
  ]){
    const a=KQ.alignText(target,typed);
    eq(a.progress,target.length);eq(a.errors,0);eq(a.correct,target.length)
  }
});

test('deterministic fuzz keeps alignment and session invariants valid',()=>{
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
