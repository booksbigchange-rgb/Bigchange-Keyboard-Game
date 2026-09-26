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

let state={};
try{state=JSON.parse(localStorage.getItem('bc-keyboard')||'{}')||{}}catch{state={}}
if(!state||typeof state!=='object'||Array.isArray(state))state={};
state.name=typeof state.name==='string'?state.name.trim().slice(0,20):'';
state.completed=Array.isArray(state.completed)
  ? [...new Set(state.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<lessons.length))]
  : [];

function cleanResult(value){
  if(!value||typeof value!=='object'||!Number.isFinite(Number(value.wpm))||!Number.isFinite(Number(value.accuracy)))return null;
  return{
    wpm:Math.max(0,Math.round(Number(value.wpm))),
    accuracy:Math.max(0,Math.min(100,Math.round(Number(value.accuracy))))
  };
}
state.last=cleanResult(state.last);
state.best=cleanResult(state.best);

function save(){
  try{localStorage.setItem('bc-keyboard',JSON.stringify(state))}catch{}
}

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
  for(let i=0;i<word.length;i++){
    const charState=stats.targetStates[i];
    const classes=[];
    if(charState===KQ.CORRECT)classes.push('reference-correct');
    if(charState===KQ.WRONG)classes.push('reference-wrong');
    if(i===stats.input.length)classes.push('reference-current');
    html+='<span class="'+classes.join(' ')+'">'+esc(word[i])+'</span>';
  }
  if(stats.input.length>word.length){
    const extra=stats.input.slice(word.length);
    html+='<span class="typed-extra">'+esc(extra)+'</span>';
  }
  if(stats.input.length>=word.length)html+='<span class="word-caret">▏</span>';
  html+='</span>';
  return html;
}

function renderReference(){
  if(!session)return;
  const stats=session.stats();
  $('#target').innerHTML=session.words.map((word,index)=>renderWord(word,index,stats)).join(' ');
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
  if(!session||session.done||!session.input.length)return false;

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

$('#typed-display').addEventListener('paste',event=>event.preventDefault());

$('#typed-display').addEventListener('keydown',event=>{
  if(!session||session.done||$('#practice').style.display!=='block')return;

  if(event.key===' '||event.key==='Enter'){
    event.preventDefault();
    commitCurrentWord(event.key===' '?'space':'enter');
    return;
  }

  if(event.key==='Backspace'&&$('#typed-display').value.length===0){
    if(session.reopenPreviousWord(performance.now())){
      event.preventDefault();
      $('#typed-display').value=session.input;
      $('#message').textContent='Previous word reopened.';
      render();
      requestAnimationFrame(()=>{
        const box=$('#typed-display');
        box.setSelectionRange(box.value.length,box.value.length);
      });
    }
  }
});

$('#typed-display').addEventListener('input',event=>{
  if(!session||session.done||$('#practice').style.display!=='block')return;

  const beginChallenge=challengeMode&&!challengeRunning;
  const result=session.update(event.target.value,performance.now());

  if(event.target.value!==session.input)event.target.value=session.input;
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
});

$('#start').onclick=start;

function renderProgress(){
  const count=state.completed.length;
  $('#progress-content').innerHTML=
    '<p><strong>'+count+' of '+lessons.length+' lessons completed</strong></p>'+
    '<progress value="'+count+'" max="'+lessons.length+'"></progress>'+
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
  try{localStorage.removeItem('bc-keyboard')}catch{}
  location.reload();
};

renderLessons();
renderProgress();

if(state.name){
  show('learn');
}else{
  document.querySelectorAll('.view').forEach(view=>view.style.display='none');
}
