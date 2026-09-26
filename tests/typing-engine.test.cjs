const assert=require('node:assert/strict');
global.window=global;
global.performance={now:()=>Date.now()};
require('../js/engine.js');

let passed=0,failed=0;
function test(name,fn){try{fn();console.log('✓',name);passed++}catch(error){console.error('✗',name,'-',error.message);failed++}}
function eq(a,b){assert.equal(a,b)}

test('session splits lesson into words',()=>{
  const s=new KQ.TypingSession('red tree quiet');
  assert.deepEqual(s.words,['red','tree','quiet']);
  eq(s.currentWord,'red');
});

test('correct current-word typing is immediate',()=>{
  const s=new KQ.TypingSession('red tree');
  s.update('r',1000);
  eq(s.stats(1000).targetStates[0],KQ.CORRECT);
  s.update('red',1200);
  eq(s.stats(1200).currentErrors,0);
});

test('wrong letters appear immediately and never wait for later input',()=>{
  const s=new KQ.TypingSession('red tree quiet type power');
  s.update('red',1000);eq(s.stats(1000).mistakes,0);
  s.update('redb',1100);eq(s.stats(1100).mistakes,1);eq(s.stats(1100).currentErrors,1);
  s.update('redby',1200);eq(s.stats(1200).mistakes,2);eq(s.stats(1200).currentErrors,2);
  s.update('redbyr',1300);eq(s.stats(1300).mistakes,3);eq(s.stats(1300).currentErrors,3);
});

test('extra letters stay local to the current word',()=>{
  const s=new KQ.TypingSession('red tree quiet');
  s.update('redbyree',1000);
  eq(s.currentWord,'red');
  eq(s.wordIndex,0);
  eq(s.stats(1000).currentErrors,5);
  eq(s.commitWord(1100,'space'),'next-word');
  eq(s.currentWord,'tree');
  eq(s.input,'');
  eq(s.wordIndex,1);
});

test('correct word commit advances exactly one word',()=>{
  const s=new KQ.TypingSession('red tree');
  s.update('red',1000);
  eq(s.commitWord(1100,'space'),'next-word');
  eq(s.currentWord,'tree');
  eq(s.history.length,1);
  eq(s.history[0].correct,true);
});

test('missing letters are counted at word commit',()=>{
  const s=new KQ.TypingSession('tree quiet');
  s.update('tr',1000);
  eq(s.stats(1000).mistakes,0);
  s.commitWord(1100,'space');
  eq(s.stats(1100).mistakes,2);
});

test('Backspace correction removes visible mistake but keeps accuracy penalty',()=>{
  const s=new KQ.TypingSession('red tree');
  s.update('rex',1000);
  eq(s.stats(1000).mistakes,1);
  s.update('re',1100);
  eq(s.stats(1100).mistakes,0);
  s.update('red',1200);
  eq(s.stats(1200).mistakes,0);
  eq(s.stats(1200).currentErrors,0);
  eq(s.stats(1200).attemptErrors,1);
});

test('editing inside current word is evaluated immediately',()=>{
  const s=new KQ.TypingSession('tree');
  s.update('tree',1000);
  // final exact word auto-finishes, so use a longer word for mid-edit.
  const x=new KQ.TypingSession('trees');
  x.update('tres',1000);
  eq(x.stats(1000).currentErrors,1);
  x.update('trees',1200);
  eq(x.stats(1200).currentErrors,0);
});

test('empty Backspace can reopen previous committed word',()=>{
  const s=new KQ.TypingSession('red tree');
  s.update('red',1000);
  s.commitWord(1100);
  eq(s.wordIndex,1);
  eq(s.reopenPreviousWord(1200),true);
  eq(s.wordIndex,0);
  eq(s.input,'red');
});

test('reopen is ignored when current input is not empty',()=>{
  const s=new KQ.TypingSession('red tree');
  s.update('red',1000);s.commitWord(1100);s.update('t',1200);
  eq(s.reopenPreviousWord(1300),false);
  eq(s.wordIndex,1);
});

test('last exact word auto-completes',()=>{
  const s=new KQ.TypingSession('red');
  eq(s.update('red',1000),'complete');
  eq(s.done,true);
  eq(s.history.length,1);
});

test('wrong final word can be explicitly committed to finish',()=>{
  const s=new KQ.TypingSession('red');
  s.update('rex',1000);
  eq(s.done,false);
  eq(s.commitWord(1100,'enter'),'complete');
  eq(s.done,true);
  eq(s.stats(1100).mistakes,1);
});

test('accuracy includes corrected historical mistakes',()=>{
  const s=new KQ.TypingSession('red');
  s.update('rex',1000);
  s.update('re',1100);
  s.update('red',1200);
  eq(s.done,true);
  eq(s.stats(1200).mistakes,0);
  eq(s.stats(1200).attemptErrors,1);
  eq(s.stats(1200).accuracy,75);
});

test('reopening a missed word does not double count omissions',()=>{
  const s=new KQ.TypingSession('asdf jkl;');
  s.update('as',1000);
  s.commitWord(1100,'space');
  eq(s.stats(1100).mistakes,2);
  eq(s.stats(1100).attemptErrors,2);
  eq(s.reopenPreviousWord(1200),true);
  eq(s.stats(1200).mistakes,0);
  eq(s.stats(1200).attemptErrors,0);
  s.update('asdf',1300);
  s.commitWord(1400,'space');
  eq(s.stats(1400).mistakes,0);
  eq(s.stats(1400).attemptErrors,0);
});

test('screenshot regression keeps visible mistakes aligned with current word',()=>{
  const s=new KQ.TypingSession('asdf jkl; asdf');
  s.update('asdf',1000);
  s.commitWord(1100,'space');
  eq(s.history[0].correct,true);
  s.update('jkl;i',1200);
  eq(s.stats(1200).mistakes,1);
  eq(s.stats(1200).currentErrors,1);
  eq(s.stats(1200).attemptErrors,1);
  eq(s.stats(1200).accuracy,89);
});

test('wrong committed word stays local and next word starts clean',()=>{
  const s=new KQ.TypingSession('asdf jkl; asdf');
  s.update('asxf',1000);
  eq(s.stats(1000).mistakes,1);
  s.commitWord(1100,'space');
  eq(s.currentWord,'jkl;');
  eq(s.input,'');
  eq(s.stats(1100).currentErrors,0);
  eq(s.stats(1100).mistakes,1);
  s.update('jkl;',1200);
  eq(s.stats(1200).currentErrors,0);
  eq(s.stats(1200).mistakes,1);
});

test('reopening and repairing a wrong committed word clears its visible error',()=>{
  const s=new KQ.TypingSession('asdf jkl;');
  s.update('asxf',1000);
  s.commitWord(1100,'space');
  eq(s.stats(1100).mistakes,1);
  eq(s.reopenPreviousWord(1200),true);
  s.update('asdf',1300);
  eq(s.stats(1300).mistakes,0);
  eq(s.stats(1300).attemptErrors,1);
  s.commitWord(1400,'space');
  eq(s.history[0].correct,true);
  eq(s.stats(1400).mistakes,0);
});

test('committing a word never advances more than one target',()=>{
  const s=new KQ.TypingSession('one two three');
  s.update('one',1000);
  s.commitWord(1100,'space');
  eq(s.wordIndex,1);
  eq(s.currentWord,'two');
  s.update('two',1200);
  s.commitWord(1300,'space');
  eq(s.wordIndex,2);
  eq(s.currentWord,'three');
});

test('empty session is safely complete with bounded stats',()=>{
  const s=new KQ.TypingSession('   ');
  eq(s.done,true);
  const st=s.stats(1000);
  eq(st.accuracy,100);
  eq(st.mistakes,0);
  eq(st.progress,0);
  eq(st.wpm,0);
});

test('event log records inserts deletes and commits',()=>{
  const s=new KQ.TypingSession('red tree');
  s.update('rex',1000);
  s.update('re',1100);
  s.update('red',1200);
  s.commitWord(1300);
  assert.ok(s.events.some(e=>e.type==='insert'&&e.correct===false));
  assert.ok(s.events.some(e=>e.type==='delete'));
  assert.ok(s.events.some(e=>e.type==='commit'));
});

test('spaces punctuation capitals and numbers stay inside word targets',()=>{
  const s=new KQ.TypingSession('Big 2026 Hello!');
  s.update('Big',1000);s.commitWord(1100);
  s.update('2026',1200);s.commitWord(1300);
  eq(s.update('Hello!',1500),'complete');
  eq(s.done,true);
  eq(s.stats(1500).mistakes,0);
});

test('WPM uses correct characters only',()=>{
  const s=new KQ.TypingSession('abcdefghij next');
  s.startTime=1000;
  s.update('abcdefghij',1000);
  s.commitWord(1100);
  s.finish(61000);
  eq(s.stats(61000).wpm,2);
});

test('forced challenge finish freezes elapsed time',()=>{
  const s=new KQ.TypingSession('practice makes progress');
  s.update('practice',1000);
  s.commitWord(1200);
  s.finish(61000);
  eq(s.stats(999999).seconds,60);
  const wpm=s.stats(999999).wpm;
  eq(s.stats(1999999).wpm,wpm);
});

test('completed session ignores more input',()=>{
  const s=new KQ.TypingSession('red');
  s.update('red',1000);
  eq(s.update('redx',1100),'ignored');
  eq(s.commitWord(1200),'ignored');
});

test('deterministic fuzz preserves word-session invariants',()=>{
  let seed=987654321;
  const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
  const chars='asdfjklqwertyuiopzxcvbnm123ABC!?';
  for(let run=0;run<200;run++){
    const s=new KQ.TypingSession('red tree quiet type power');
    for(let step=0;step<80&&!s.done;step++){
      if(rnd()<0.15&&s.input.length){
        s.update(s.input.slice(0,-1),1000+step*100);
      }else if(rnd()<0.12&&s.input.length){
        s.commitWord(1000+step*100,'space');
      }else{
        s.update(s.input+chars[Math.floor(rnd()*chars.length)],1000+step*100);
      }
      const st=s.stats(1000+step*100);
      assert.ok(st.currentWordIndex>=0&&st.currentWordIndex<=st.totalWords);
      assert.ok(st.accuracy>=0&&st.accuracy<=100);
      assert.ok(st.mistakes>=0);
      assert.ok(Number.isFinite(st.wpm)&&st.wpm>=0);
    }
  }
});

console.log('\n'+passed+' passed · '+failed+' failed');
if(failed)process.exit(1);
