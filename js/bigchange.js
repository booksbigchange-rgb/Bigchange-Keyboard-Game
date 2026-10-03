const BIGCHANGE_BUILD=document.querySelector('meta[name="bigchange-build"]')?.content||'unknown';
console.info('[BigChange Keyboard Game]',BIGCHANGE_BUILD,'engine=word-scoped-v3');

const lessons=[
  ['Home Row','asdf jkl;','asdf jkl; asdf jkl; dad sad fall ask'],
  ['Top Row','qwerty uiop','red tree quiet type power'],
  ['Bottom Row','zxcv bnm','van zoom mix cabin'],
  ['Shift & Capitals','Shift + letters','Big Change Students Type Well.'],
  ['Numbers','1234567890','2026 123 456 7890'],
  ['Punctuation','.,!?;:','Hello, student! Type well; stay calm.'],
  ['Sentences','All keys','Practice makes typing feel natural.']
];

const passages={
  easy:lessons[0][2],
  medium:'The quick student learns to type with calm hands and steady rhythm.',
  hard:'Accuracy comes first; speed follows when good keyboard habits become automatic.'
};

const challengeText='Practice makes progress. Keep your hands calm and your eyes on the screen. Good typing starts with accuracy. BigChange students learn one key at a time. Speed grows naturally when correct habits become automatic. Keep going and do your best. ';
const PASS_ACCURACY=90;

let level='easy';
let session=null;
let timer=null;
let currentLesson=0;
let lessonMode=false;
let challengeMode=false;
let challengeSeconds=60;
let challengeRunning=false;
let challengeEndAt=0;

const $=selector=>document.querySelector(selector);

function cleanResult(value){
  if(!value||typeof value!=='object'||!Number.isFinite(Number(value.wpm))||!Number.isFinite(Number(value.accuracy)))return null;
  return{
    wpm:Math.max(0,Math.round(Number(value.wpm))),
    accuracy:Math.max(0,Math.min(100,Math.round(Number(value.accuracy))))
  };
}
function cleanState(value){
  if(!value||typeof value!=='object'||Array.isArray(value))value={};
  return{
    name:typeof value.name==='string'?value.name.trim().slice(0,20):'',
    profileId:typeof value.profileId==='string'&&value.profileId?value.profileId:null,
    completed:Array.isArray(value.completed)
      ? [...new Set(value.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<lessons.length))]:[],
    last:cleanResult(value.last),best:cleanResult(value.best)
  };
}

function readState(){
  const raw=localStorage.getItem('bc-keyboard');
  try{return cleanState(JSON.parse(raw||'{}'))}catch{return cleanState({})}
}

let state;
try{state=readState()}catch{state=cleanState({})}
let profileChanged=false;
let savePending=false;
let hasSavedProfile=!!state.name;

function sameProfile(saved){
  // Legacy profiles acquire an ID on their first successful save. An ID
  // distinguishes a new student even when they use the same name.
  return state.profileId?saved.profileId===state.profileId:
    saved.profileId===null&&(saved.name===state.name||(!saved.name&&!hasSavedProfile));
}

function mergeProgress(saved){
  state.completed=[...new Set([...saved.completed,...state.completed])];
  if(saved.best){
    state.best={wpm:Math.max(state.best?.wpm||0,saved.best.wpm),
      accuracy:Math.max(state.best?.accuracy||0,saved.best.accuracy)};
  }
}

function reloadChangedProfile(){
  profileChanged=true;
  stopTypingTimer();
  $('#typed-display').disabled=true;
  location.reload();
}

function save(){
  if(profileChanged)return false;
  try{
    const saved=readState();
    if(!sameProfile(saved)){reloadChangedProfile();return false;}
    mergeProgress(saved);
    const previousId=state.profileId;
    state.profileId=previousId||window.crypto?.randomUUID?.()||Date.now()+'-'+Math.random();
    try{
      localStorage.setItem('bc-keyboard',JSON.stringify(state));
    }catch(error){state.profileId=previousId;throw error;}
    hasSavedProfile=true;
    savePending=false;
    $('#storage-warning').hidden=true;
    return true;
  }catch{
    savePending=true;
    $('#storage-warning').hidden=false;
    return false;
  }
}

$('#retry-save').onclick=save;

window.addEventListener?.('storage',event=>{
  if(event.storageArea!==localStorage||(event.key!==null&&event.key!=='bc-keyboard'))return;
  try{
    // Read current storage, rather than an event value that may already be old.
    const saved=readState();
    if(!sameProfile(saved)){reloadChangedProfile();return;}
    mergeProgress(saved);
    if(!savePending)state.last=saved.last;
    // Repair overlapping writes only when the stored record is missing progress.
    // This converges without making every storage event trigger another write.
    if(state.completed.some(index=>!saved.completed.includes(index))||
      (state.best&&(state.best.wpm>(saved.best?.wpm||0)||state.best.accuracy>(saved.best?.accuracy||0))))save();
    renderLessons();
    renderProgress();
  }catch{$('#storage-warning').hidden=false;}
});

function stopTypingTimer(){
  if(timer)clearInterval(timer);
  timer=null;
  challengeRunning=false;
  challengeEndAt=0;
}

function show(id){
  stopTypingTimer();
  document.dispatchEvent(new CustomEvent('bc:viewchange',{detail:{id:id}}));
  document.querySelectorAll('.view').forEach(view=>{
    view.style.display=view.id===id?'block':'none';
  });
  if(id==='progress')renderProgress();
}
window.show=show;

document.querySelectorAll('[data-view]').forEach(button=>{
  button.onclick=()=>{
    const id=button.dataset.view;
    if(id==='practice'){
      challengeMode=false;
      lessonMode=false;
      level='easy';
      $('#practice-heading').textContent='Practice';
      document.querySelectorAll('[data-level]').forEach(x=>x.classList.toggle('active',x.dataset.level==='easy'));
      show('practice');
      start();
      return;
    }
    challengeMode=false;
    lessonMode=false;
    show(id);
  };
});

function saveProfile(){
  state.name=$('#student-name').value.trim().slice(0,20)||'Student';
  save();
  $('#profile').style.display='none';
  $('#student-nav').style.display='grid';
  $('#welcome').textContent='Welcome, '+state.name+'. Choose Learn to begin.';
  show('learn');
}

$('#save-profile').onclick=saveProfile;
$('#student-name').addEventListener('keydown',event=>{
  if(event.key==='Enter'){
    event.preventDefault();
    saveProfile();
  }
});

if(state.name){
  $('#student-name').value=state.name;
  $('#profile').style.display='none';
  $('#student-nav').style.display='grid';
  $('#welcome').textContent='Welcome back, '+state.name+'. Keep building your keyboard skills.';
}else{
  $('#student-nav').style.display='none';
}

function renderLessons(){
  $('#lesson-list').innerHTML=lessons.map((lesson,index)=>{
    return '<button class="lesson '+(state.completed.includes(index)?'done':'')+'" data-lesson="'+index+'">'+
      '<strong>'+(index+1)+'. '+lesson[0]+'</strong><span>'+lesson[1]+'</span>'+
      (state.completed.includes(index)?'<em>✓ Complete</em>':'')+'</button>';
  }).join('');

  document.querySelectorAll('[data-lesson]').forEach(button=>{
    button.onclick=()=>{
      challengeMode=false;
      lessonMode=true;
      currentLesson=Number(button.dataset.lesson);
      level='easy';
      $('#practice-heading').textContent='Lesson: '+lessons[currentLesson][0];
      document.querySelectorAll('[data-level]').forEach(x=>x.classList.toggle('active',x.dataset.level==='easy'));
      show('practice');
      start();
    };
  });
}

function esc(value){
  return String(value).replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
}

function renderWord(word,index,stats){
  const history=session.history[index];

  if(index<stats.currentWordIndex){
    const cls=history&&history.correct?'word-complete':'word-complete word-error';
    return '<span class="'+cls+'">'+esc(word)+'</span>';
  }

  if(index>stats.currentWordIndex||session.done){
    return '<span class="reference-word">'+esc(word)+'</span>';
  }

  let html='<span class="reference-word current-word">';
  let nextTarget=0;

  for(const operation of stats.operations||[]){
    if(operation.type==='insert'){
      html+='<span class="typed-extra">'+esc(stats.input[operation.typedIndex]||'')+'</span>';
      continue;
    }

    const targetIndex=operation.targetIndex;
    while(nextTarget<targetIndex){
      const classes=nextTarget===stats.targetProgress?['reference-current']:[];
      html+='<span class="'+classes.join(' ')+'">'+esc(word[nextTarget])+'</span>';
      nextTarget++;
    }

    const classes=[];
    if(operation.type==='match')classes.push('reference-correct');
    if(operation.type==='substitute'||operation.type==='omit')classes.push('reference-wrong');
    html+='<span class="'+classes.join(' ')+'">'+esc(word[targetIndex])+'</span>';
    nextTarget=targetIndex+1;
  }

  for(let i=nextTarget;i<word.length;i++){
    const classes=i===stats.targetProgress?['reference-current']:[];
    html+='<span class="'+classes.join(' ')+'">'+esc(word[i])+'</span>';
  }

  if(stats.targetProgress>=word.length)html+='<span class="word-caret">▏</span>';
  html+='</span>';
  return html;
}

function renderReference(){
  if(!session)return;
  const stats=session.stats();
  const first=challengeMode?Math.max(0,stats.currentWordIndex-1):0;
  const last=challengeMode?stats.currentWordIndex+5:session.words.length;
  $('#target').innerHTML=session.words.slice(first,last).map((word,index)=>renderWord(word,index+first,stats)).join(' ');
}

function updateInputHint(){
  if(!session||session.done)return;
  const word=session.currentWord||'';
  $('#typed-display').placeholder='Type current word: '+word;
  $('#typed-display').setAttribute('aria-label','Type current word: '+word);
}

function updateTimer(){
  $('#timer-seconds').textContent=challengeSeconds;
}

function sessionText(){
  if(challengeMode)return challengeText.repeat(8);
  if(lessonMode)return lessons[currentLesson][2];
  return passages[level];
}

function start(){
  stopTypingTimer();
  session=new KQ.TypingSession(sessionText());
  challengeSeconds=60;
  updateTimer();

  $('#challenge-timer').hidden=!challengeMode;
  $('.levels').style.display=(challengeMode||lessonMode)?'none':'flex';
  $('#start').textContent=challengeMode?'Restart Challenge':lessonMode?'Restart Lesson':'Restart Practice';
  $('#message').textContent=challengeMode
    ? 'Ready — timer starts with your first letter. Press Space after each word.'
    : 'Type one word at a time. Press Space for the next word.';

  $('#typed-display').disabled=false;
  $('#typed-display').value='';
  updateInputHint();
  render();
  $('#typed-display').focus();
  if(challengeMode)$('#typed-display').scrollIntoView({block:'center'});
}

function startChallengeClock(){
  if(!challengeMode||challengeRunning||!session||session.done)return;
  challengeRunning=true;
  challengeEndAt=(session.startTime??performance.now())+60000;

  const tick=()=>{
    if(!challengeRunning||!session||session.done)return;
    const now=performance.now();
    challengeSeconds=Math.max(0,Math.ceil((challengeEndAt-now)/1000));
    updateTimer();
    if(now>=challengeEndAt)finishChallenge('time');
  };

  tick();
  timer=setInterval(tick,200);
}

function finishChallenge(reason='time'){
  if(!session||session.challengeResultHandled)return;

  const exactEnd=reason==='time'&&challengeEndAt?challengeEndAt:null;
  if(reason==='time'){challengeSeconds=0;updateTimer();}
  stopTypingTimer();
  if(!session.done)session.finish(exactEnd??performance.now());
  session.challengeResultHandled=true;
  $('#typed-display').disabled=true;

  const result=session.stats();
  const best=state.best||{wpm:0,accuracy:0};
  state.best={
    wpm:Math.max(best.wpm,result.wpm),
    accuracy:Math.max(best.accuracy,result.accuracy)
  };
  state.last={wpm:result.wpm,accuracy:result.accuracy};
  save();

  $('#message').textContent=(reason==='finished'?'Challenge complete!':'Time!')+' '+result.wpm+' WPM · '+result.accuracy+'% accuracy';
  render();
  renderProgress();
}

function finishPractice(){
  const result=session.stats();
  $('#typed-display').disabled=true;
  state.last={wpm:result.wpm,accuracy:result.accuracy};

  if(result.accuracy>=PASS_ACCURACY){
    $('#message').textContent='Practice complete — '+result.accuracy+'% accuracy!';
    if(lessonMode&&!state.completed.includes(currentLesson))state.completed.push(currentLesson);
  }else{
    $('#message').textContent='Try again — '+result.accuracy+'% accuracy. Aim for '+PASS_ACCURACY+'% or better.';
  }

  save();
  renderLessons();
}

function render(){
  if(!session)return;
  const stats=session.stats();

  renderReference();
  updateInputHint();
  $('#wpm').textContent=stats.wpm;
  $('#accuracy').textContent=stats.accuracy+'%';
  $('#mistakes').textContent=stats.mistakes;
  window.renderKeyboardGuide?.(stats);

  if(stats.done&&challengeMode&&!session.challengeResultHandled){
    finishChallenge('finished');
    return;
  }

  if(stats.done&&!challengeMode&&!session.resultHandled){
    session.resultHandled=true;
    stopTypingTimer();
    finishPractice();
  }
}

function commitCurrentWord(reason){
  if(!typingActive()||!session.input.length)return false;

  const comparison=session.currentComparison();
  const result=session.commitWord(performance.now(),reason||'space');
  $('#typed-display').value='';

  if(!challengeMode&&result!=='complete'){
    $('#message').textContent=comparison.currentErrors
      ? 'Word recorded with mistakes — keep going.'
      : 'Good. Next word.';
  }

  render();
  $('#typed-display').focus();
  return true;
}

document.querySelectorAll('[data-level]').forEach(button=>{
  button.onclick=()=>{
    challengeMode=false;
    lessonMode=false;
    level=button.dataset.level;
    document.querySelectorAll('[data-level]').forEach(x=>x.classList.toggle('active',x===button));
    $('#practice-heading').textContent='Practice — '+level[0].toUpperCase()+level.slice(1);
    start();
  };
});

const typingBox=$('#typed-display');
const supportsBeforeInput='onbeforeinput' in typingBox;
let composingInput=false;

function typingActive(now=performance.now()){
  if(challengeRunning&&now>=challengeEndAt){
    typingBox.value=session.input;
    finishChallenge('time');
    return false;
  }
  return !!session&&!session.done&&$('#practice').style.display==='block';
}

function applyTypedValue(value,now=performance.now()){
  if(!typingActive(now)){
    typingBox.value=session?.input||'';
    return 'ignored';
  }

  const beginChallenge=challengeMode&&!challengeRunning;
  const result=session.update(value,now);

  if(typingBox.value!==session.input)typingBox.value=session.input;
  if(beginChallenge&&session.startTime!==null&&!session.done)startChallengeClock();

  if(!challengeMode&&result!=='complete'){
    if(result==='mistake'){
      $('#message').textContent='Mistake shown immediately — keep typing or Backspace to correct it.';
    }else if(result==='corrected'){
      $('#message').textContent='Correction recognized.';
    }else if(session.currentComparison().currentErrors===0){
      $('#message').textContent='Keep going.';
    }
  }

  render();
  return result;
}

function reopenPreviousWordFromInput(){
  if(!typingActive()||typingBox.value.length!==0)return false;
  if(!session.reopenPreviousWord(performance.now()))return false;

  typingBox.value=session.input;
  $('#message').textContent='Previous word reopened.';
  render();
  requestAnimationFrame(()=>{
    typingBox.setSelectionRange(typingBox.value.length,typingBox.value.length);
    typingBox.focus();
  });
  return true;
}

typingBox.addEventListener('paste',event=>event.preventDefault());
typingBox.addEventListener('drop',event=>event.preventDefault());

typingBox.addEventListener('compositionstart',()=>{
  composingInput=true;
});

function applyTextWithSpaces(value){
  if(!/\s/.test(value))return applyTypedValue(value);
  const parts=String(value).split(/(\s+)/);
  for(const part of parts){
    if(!typingActive())break;
    if(/\s/.test(part))commitCurrentWord('space');
    else if(part)applyTypedValue(part);
  }
  typingBox.value=session.input;
}

typingBox.addEventListener('compositionend',event=>{
  composingInput=false;
  applyTextWithSpaces(event.target.value);
});

typingBox.addEventListener('beforeinput',event=>{
  if(!typingActive()){event.preventDefault();return;}
  if(composingInput||event.isComposing)return;

  const type=event.inputType||'';
  if(type==='insertFromDrop'||type==='insertFromPaste'){event.preventDefault();return;}
  const isSpace=(type==='insertText'||type==='insertReplacementText')&&typeof event.data==='string'&&/\s/.test(event.data);
  const isEnter=type==='insertLineBreak'||type==='insertParagraph';

  if(isSpace||isEnter){
    event.preventDefault();
    if(isEnter)commitCurrentWord('enter');
    else{
      const start=typingBox.selectionStart??typingBox.value.length;
      const end=typingBox.selectionEnd??start;
      applyTextWithSpaces(typingBox.value.slice(0,start)+event.data+typingBox.value.slice(end));
    }
    return;
  }

  if(type==='deleteContentBackward'&&typingBox.value.length===0){
    if(reopenPreviousWordFromInput())event.preventDefault();
  }
});

// Backspace on an empty input is handled on keydown on every browser.
// WebKit can expose beforeinput support but omit the empty-field backward
// deletion event. Preventing the keydown after reopening also avoids a second
// deletion from the browser's default action.
typingBox.addEventListener('keydown',event=>{
  if(!typingActive())return;

  if(event.key==='Backspace'&&typingBox.value.length===0&&reopenPreviousWordFromInput()){
    event.preventDefault();
    return;
  }

  // Space/Enter use beforeinput when available so virtual keyboards that do
  // not emit a normal keydown still commit words correctly.
  if(supportsBeforeInput)return;

  if(event.key===' '||event.key==='Enter'){
    event.preventDefault();
    commitCurrentWord(event.key===' '?'space':'enter');
  }
});

typingBox.addEventListener('input',event=>{
  if(!typingActive()){typingBox.value=session?.input||'';return;}
  if(event.inputType==='insertFromDrop'||event.inputType==='insertFromPaste'){
    typingBox.value=session.input;
    return;
  }
  if(composingInput||event.isComposing)return;
  applyTextWithSpaces(event.target.value);
});

$('#start').onclick=start;

function renderProgress(){
  const count=state.completed.length;
  $('#progress-content').innerHTML=
    '<p><strong>'+count+' of '+lessons.length+' lessons completed</strong></p>'+
    '<progress value="'+count+'" max="'+lessons.length+'" aria-label="Lessons completed"></progress>'+
    '<p>'+(state.last?'Last result: '+state.last.wpm+' WPM · '+state.last.accuracy+'% accuracy':'Complete a lesson to record your first result.')+'</p>'+
    (state.best?'<p>Best challenge results: <strong>Fastest '+state.best.wpm+' WPM · Highest '+state.best.accuracy+'% accuracy</strong></p>':'');

  if(state.best){
    $('#best-wpm').textContent=state.best.wpm;
    $('#best-accuracy').textContent=state.best.accuracy+'%';
  }
}

$('#challenge-start').onclick=()=>{
  challengeMode=true;
  lessonMode=false;
  level='hard';
  show('practice');
  $('#practice-heading').textContent='1-Minute Challenge';
  start();
};

$('#new-student').onclick=()=>{
  if(!confirm('Start a new student? This clears the saved progress on this computer.'))return;
  try{
    localStorage.removeItem('bc-keyboard');
    reloadChangedProfile();
  }catch{
    $('#reset-warning').hidden=false;
  }
};

// Preserve existing progress while upgrading old records with a profile ID.
if(state.name&&!state.profileId)save();
renderLessons();
renderProgress();

if(state.name){
  show('learn');
}else{
  document.querySelectorAll('.view').forEach(view=>view.style.display='none');
}
