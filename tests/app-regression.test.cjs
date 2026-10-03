const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function app(storageFails=false){
  const els=new Map();
  function el(key){if(!els.has(key))els.set(key,{style:{},value:'',textContent:'',innerHTML:'',disabled:false,hidden:false,dataset:{},listeners:{},classList:{toggle(){}},setAttribute(){},focus(){sandbox.document.activeElement=this},scrollIntoView(){},contains(other){return other===this},setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end},addEventListener(type,fn){this.listeners[type]=fn}});return els.get(key)}
  const views=['learn','practice','challenge','games','game-play','progress'].map(x=>{const e=el('#'+x);e.id=x;return e});
  const navigation=['learn','practice','challenge','games','progress'].map(x=>{const e=el('nav:'+x);e.dataset.view=x;return e});
  const lessons=Array.from({length:7},(_,i)=>{const e=el('lesson:'+i);e.dataset.lesson=String(i);return e});
  const levels=['easy','medium','hard'].map(x=>{const e=el('level:'+x);e.dataset.level=x;return e});
  const gameButtons=['rain','race','bubble'].map(x=>{const e=el('game:'+x);e.dataset.game=x;return e});
  const documentListeners={},windowListeners={};let ticks=[];let now=0;let removeFails=false;let reloads=0;
  const data=new Map([['bc-keyboard',JSON.stringify({name:'Audit'})]]);
  const sandbox={console:{info(){}},performance:{now:()=>now},setInterval(fn){ticks.push(fn);return ticks.length},clearInterval(){},requestAnimationFrame(fn){fn()},CustomEvent:function(type,opts){this.type=type;this.detail=opts.detail},confirm:()=>true,location:{reload(){reloads++}},addEventListener(type,fn){windowListeners[type]=fn},localStorage:{getItem:k=>data.get(k)||null,setItem(k,v){if(storageFails)throw Error('QuotaExceededError');data.set(k,v)},removeItem(k){if(removeFails)throw Error('SecurityError');data.delete(k)}},document:{querySelector:el,querySelectorAll(selector){return {'.view':views,'[data-view]':navigation,'[data-lesson]':lessons,'[data-level]':levels,'[data-game]':gameButtons}[selector]||[]},addEventListener(type,fn){documentListeners[type]=fn},dispatchEvent(event){documentListeners[event.type]?.(event)}}};
  sandbox.window=sandbox;el('#typed-display').onbeforeinput=null;
  const ctx=vm.createContext(sandbox);
  for(const name of ['engine.js','bigchange.js','games.js'])vm.runInContext(fs.readFileSync(path.join(root,'js',name),'utf8'),ctx,{filename:name});
  return {el,ctx,run:code=>vm.runInContext(code,ctx),time:value=>now=value,tick:()=>ticks.at(-1)(),storageFailure:value=>storageFails=value,removeFailure:value=>removeFails=value,reloads:()=>reloads,storageEvent:()=>windowListeners.storage({key:'bc-keyboard',storageArea:sandbox.localStorage}),data,documentListeners};
}

const assert=require('node:assert/strict');
let passed=0;
function test(name,fn){fn();passed++;console.log('✓ '+name)}
function event(extra={}){return {prevented:false,preventDefault(){this.prevented=true},...extra}}
test('batched text and spaces preserve every word',()=>{
 const a=app();a.el('lesson:0').onclick();
 const e=event({inputType:'insertText',data:'asdf jkl; '});
 a.el('#typed-display').listeners.beforeinput(e);
 assert.equal(e.prevented,true);assert.equal(a.run('session.wordIndex'),2);
 assert.equal(a.run('session.stats().correct'),8);
});
test('selection replacement with trailing space commits new text',()=>{
 const a=app();a.el('lesson:0').onclick();a.run("applyTypedValue('asx')");
 a.el('#typed-display').setSelectionRange(0,3);
 a.el('#typed-display').listeners.beforeinput(event({inputType:'insertReplacementText',data:'asdf '}));
 assert.equal(a.run('session.history[0].input'),'asdf');
});
test('composition text with a separator and input fallback advance correctly',()=>{
 for(const kind of ['compositionend','input']){
  const a=app();a.el('lesson:0').onclick();const box=a.el('#typed-display');box.value='asdf j';
  box.listeners[kind]({target:box});
  assert.equal(a.run('session.wordIndex'),1);assert.equal(a.run('session.input'),'j');
  box.value='';box.listeners.input({target:box});assert.equal(a.run('session.input'),'');
 }
});
test('deadline blocks late typing, commit, backspace and composition before timer tick',()=>{
 for(const action of ['insert','commit','backspace','composition']){
  const a=app();a.el('#challenge-start').onclick();a.run("applyTypedValue('Practice',0)");
  if(action!=='commit')a.run("commitCurrentWord('space')");
  a.time(60000);
  if(action==='insert')a.run("applyTypedValue('makes',60000)");
  if(action==='commit')a.run("commitCurrentWord('space')");
  if(action==='backspace')a.run('reopenPreviousWordFromInput()');
  if(action==='composition'){const box=a.el('#typed-display');box.value='makes';box.listeners.compositionend({target:box})}
  assert.equal(a.run('session.done'),true);assert.equal(a.run('session.stats().correct'),8);
  assert.equal(a.run('session.endTime'),60000);assert.equal(a.run('state.last.accuracy'),100);
  assert.equal(a.el('#timer-seconds').textContent,0);
 }
});
test('challenge shows a bounded moving word window',()=>{
 const a=app();a.el('#challenge-start').onclick();
 assert.ok(a.el('#target').innerHTML.length<2000);
 a.run("for(let i=0;i<10;i++){applyTypedValue(session.currentWord);commitCurrentWord('space')}");
 assert.ok(a.el('#target').innerHTML.includes('current-word'));
 assert.ok(a.el('#target').innerHTML.length<2000);
});
test('game ignores navigation Space, shortcuts, composition and other controls',()=>{
 const a=app();a.el('game:bubble').onclick();
 const target=a.el('#game-board').innerHTML.match(/data-game-target[^>]*>([^<]+)</)[1];
 for(const extra of [{key:' ',target:a.el('nav:learn')},{key:target,target:a.el('nav:learn')},{ctrlKey:true},{altKey:true},{metaKey:true},{isComposing:true}]){
  const e=event({key:target,target:a.el('#game-board'),...extra});a.documentListeners.keydown(e);
  assert.equal(e.prevented,false);assert.equal(a.el('#game-score').textContent,0);
 }
 const e=event({key:target,target:a.el('#game-board')});a.documentListeners.keydown(e);
 assert.equal(e.prevented,true);assert.equal(a.el('#game-score').textContent,1);
});
test('failed progress save is visible and can be retried',()=>{
 const a=app(true);a.el('lesson:1').onclick();
 a.run("for(const word of ['red','tree','quiet','type','power']){applyTypedValue(word);commitCurrentWord('space')}");
 assert.equal(a.el('#storage-warning').hidden,false);
 assert.equal(JSON.parse(a.data.get('bc-keyboard')).completed,undefined);
 a.storageFailure(false);a.el('#retry-save').onclick();
 assert.equal(a.el('#storage-warning').hidden,true);
 assert.deepEqual(JSON.parse(a.data.get('bc-keyboard')).completed,[1]);
});
test('saving merges another tab lessons and independent best results',()=>{
 const a=app();const saved=JSON.parse(a.data.get('bc-keyboard'));
 saved.completed=[1];saved.best={wpm:30,accuracy:95};
 a.data.set('bc-keyboard',JSON.stringify(saved));
 a.run('state.completed=[2];state.best={wpm:40,accuracy:90};save()');
 const result=JSON.parse(a.data.get('bc-keyboard'));
 assert.deepEqual(result.completed,[1,2]);assert.deepEqual(result.best,{wpm:40,accuracy:95});
});
test('storage events repair overlapping writes without repeating writes forever',()=>{
 const a=app();a.run('state.completed=[1];save()');
 const saved=JSON.parse(a.data.get('bc-keyboard'));saved.completed=[2];
 a.data.set('bc-keyboard',JSON.stringify(saved));a.storageEvent();
 assert.deepEqual(JSON.parse(a.data.get('bc-keyboard')).completed,[2,1]);
 const after=a.data.get('bc-keyboard');a.storageEvent();assert.equal(a.data.get('bc-keyboard'),after);
});
test('stale tabs cannot restore reset progress or write into a same-name new profile',()=>{
 for(const replacement of [null,{name:'Audit',profileId:'new-student',completed:[]}]){
  const a=app();a.run('state.completed=[1]');
  if(replacement)a.data.set('bc-keyboard',JSON.stringify(replacement));else a.data.delete('bc-keyboard');
  assert.equal(a.run('save()'),false);assert.equal(a.reloads(),1);
  assert.equal(a.el('#typed-display').disabled,true);
  assert.deepEqual(a.data.get('bc-keyboard'),replacement?JSON.stringify(replacement):undefined);
 }
});
test('failed reset keeps progress and can be retried safely',()=>{
 const a=app();const before=a.data.get('bc-keyboard');a.removeFailure(true);
 a.el('#new-student').onclick();assert.equal(a.reloads(),0);
 assert.equal(a.el('#reset-warning').hidden,false);assert.equal(a.data.get('bc-keyboard'),before);
 a.removeFailure(false);a.el('#new-student').onclick();
 assert.equal(a.reloads(),1);assert.equal(a.data.has('bc-keyboard'),false);
});
test('drop and paste input cannot score while ordinary typing remains enabled',()=>{
 const a=app();a.el('lesson:0').onclick();const box=a.el('#typed-display');
 for(const type of ['insertFromDrop','insertFromPaste']){
  const e=event({inputType:type,data:'asdf jkl; '});box.listeners.beforeinput(e);
  assert.equal(e.prevented,true);box.value='asdf jkl; ';
  box.listeners.input({inputType:type,target:box});assert.equal(box.value,'');
  assert.equal(a.run('session.stats().correct'),0);
 }
 const drop=event();box.listeners.drop(drop);assert.equal(drop.prevented,true);
 a.run("applyTypedValue('asdf')");assert.equal(a.run('session.stats().correct'),4);
});
test('malformed stored JSON can be replaced with a working student profile',()=>{
 const a=app();a.data.set('bc-keyboard','broken JSON');
 // Model a newly opened profile form after the unreadable record was ignored.
 a.run("state=cleanState({name:'New Student'});hasSavedProfile=false");
 assert.equal(a.run('save()'),true);
 assert.equal(JSON.parse(a.data.get('bc-keyboard')).name,'New Student');
});
console.log(passed+' application regression tests passed');
