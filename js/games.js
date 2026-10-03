(()=>{
  const $=selector=>document.querySelector(selector);
  const letters='asdfjkl;qwertyuiopzxcvbnm';
  const names={rain:'Letter Rain',race:'Rocket Race',bubble:'Bubble Pop'};
  const instructions={rain:'Type the falling letter before it touches the grass.',race:'Type 20 correct letters to reach the finish flag.',bubble:'Type the letter inside the big bubble.'};
  const rocket='<svg viewBox="0 0 120 70" aria-hidden="true"><defs><linearGradient id="game-body" x2="0" y2="1"><stop stop-color="#fff"/><stop offset=".46" stop-color="#f2f6f7"/><stop offset="1" stop-color="#99b1bd"/></linearGradient><linearGradient id="game-fin" x2="0" y2="1"><stop stop-color="#68af91"/><stop offset="1" stop-color="#1e6755"/></linearGradient><radialGradient id="game-glass" cx=".3" cy=".25"><stop stop-color="#e5fbff"/><stop offset=".5" stop-color="#70c6e0"/><stop offset="1" stop-color="#24617d"/></radialGradient></defs><path class="rocket-flame" d="M31 25L2 35 31 45Z" fill="#efa642"/><path d="M31 30L12 35 31 40Z" fill="#fff2bd"/><path d="M40 24L31 7 67 23M40 46L31 63 67 47" fill="url(#game-fin)" stroke="#286653" stroke-width="1.5"/><path d="M25 25L35 22 35 48 25 45Z" fill="#587080"/><path d="M32 23Q71 7 108 35Q71 63 32 47Z" fill="url(#game-body)" stroke="#3d645f" stroke-width="2"/><path d="M37 25Q71 14 96 30" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M39 45Q69 52 92 40" fill="none" stroke="#768f9e" stroke-width="1"/><circle cx="69" cy="35" r="12" fill="#d4e2e8" stroke="#466d78" stroke-width="2"/><circle cx="69" cy="35" r="8.5" fill="url(#game-glass)"/><path d="M64 31Q65 28 70 29" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M47 35L38 33 38 37Z" fill="url(#game-fin)"/><circle cx="38" cy="26" r="1" fill="#758e9a"/><circle cx="38" cy="44" r="1" fill="#758e9a"/></svg>';
  let type='rain',score=0,streak=0,target='',loop=null,pos=0,active=false,paused=false,painted='';
  const input=$('#game-letter');
  function pick(){return letters[Math.floor(Math.random()*letters.length)]}
  function stop(){clearInterval(loop);loop=null;active=false;paused=false}
  function scene(){
    if(type==='rain')return '<div class="rain-scene"><div class="scene-cloud cloud-one" aria-hidden="true"></div><div class="scene-cloud cloud-two" aria-hidden="true"></div><div class="scene-hills" aria-hidden="true"></div><div class="rain-target" data-game-target>'+target+'</div><div class="scene-ground" aria-hidden="true"></div></div>';
    if(type==='bubble')return '<div class="bubble-scene"><i class="scene-bubble bubble-one" aria-hidden="true"></i><i class="scene-bubble bubble-two" aria-hidden="true"></i><i class="scene-bubble bubble-three" aria-hidden="true"></i><div class="bubble-target" data-game-target>'+target+'</div></div>';
    const finished=!active&&score>=20;
    return '<div class="race-scene"><div class="scene-planet" aria-hidden="true"></div><div class="scene-stars" aria-hidden="true"></div><div class="race-track" aria-hidden="true"><div class="race-distance" style="width:'+Math.min(score*5,100)+'%"></div></div><div class="race-rocket" style="left:'+Math.min(10+score*4,90)+'%" aria-hidden="true">'+rocket+'</div><div class="finish-flag" aria-hidden="true">🏁</div>'+(finished?'<div class="race-result"><strong>Race complete!</strong><span>20 correct letters. You made it!</span></div>':'<div class="race-prompt">Type <strong data-game-target>'+target+'</strong></div>')+'</div>';
  }
  function paint(){
    const board=$('#game-board');
    const signature=[type,target,score,streak,active,paused].join('|');
    if(signature!==painted){
      board.innerHTML=scene()+(paused?'<div class="game-paused"><strong>Paused</strong><span>Choose Resume when you are ready.</span></div>':'');
      painted=signature;
    }
    board.dataset.scene=type;
    const falling=board.querySelector?.('[data-game-target]');
    if(type==='rain'&&falling)falling.style.transform='translate(-50%, '+pos+'px)';
    $('#game-score').textContent=score;$('#game-streak').textContent=streak;
    $('#game-key-hint').textContent=paused?'Take a break.':active?'Next key: '+target.toUpperCase():'Race finished!';
    $('#game-pause').textContent=paused?'Resume':'Pause';
    $('#game-pause').setAttribute('aria-pressed',String(paused));
    $('#game-pause').disabled=!active;
    input.disabled=!active||paused;
  }
  function next(){target=pick();pos=0;paint()}
  function focusGame(){
    if(window.matchMedia?.('(pointer: coarse)').matches)input.focus();
    else $('#game-board').focus();
  }
  function start(){
    stop();active=true;score=0;streak=0;painted='';composing=false;input.value='';next();
    $('#game-message').textContent='Ready! Type the shown letter.';focusGame();
    if(type==='rain')loop=setInterval(()=>{
      if(!active||paused)return;
      pos+=12;
      if(pos>180){streak=0;$('#game-message').textContent='Missed '+target+'. Try the next letter.';next()}
      paint();
    },350);
  }
  function hit(key){
    if(!active||paused)return;
    if(key.toLowerCase()===target.toLowerCase()){
      score++;streak++;
      $('#game-message').textContent=streak>=5?'Great streak — '+streak+'!':'Correct!';
      if(type==='race'&&score>=20){stop();$('#game-message').textContent='Finish! Rocket race complete!';paint();return}
      next();
    }else{streak=0;$('#game-message').textContent='Try the shown key.';paint()}
  }
  document.querySelectorAll('[data-game]').forEach(button=>button.onclick=()=>{
    type=button.dataset.game;
    $('#game-title').textContent=names[type];$('#game-instructions').textContent=instructions[type];
    window.show('game-play');start();
  });
  document.addEventListener('bc:viewchange',event=>{if(event.detail.id!=='game-play')stop()});
  document.addEventListener('keydown',event=>{
    if(!active||paused||$('#game-play').style.display!=='block'||event.key.length!==1||event.key===' '||event.ctrlKey||event.altKey||event.metaKey||event.isComposing||!$('#game-board').contains(event.target))return;
    event.preventDefault();hit(event.key);
  });
  let composing=false;
  function acceptInput(){
    const key=input.value;input.value='';
    if(key.length===1&&key.trim().length>0&&$('#game-play').style.display==='block')hit(key);
  }
  input.addEventListener('input',event=>{if(!composing&&!event.isComposing)acceptInput()});
  input.addEventListener('compositionstart',()=>{composing=true});
  input.addEventListener('compositionend',()=>{composing=false;acceptInput()});
  input.addEventListener('paste',event=>event.preventDefault());
  input.addEventListener('drop',event=>event.preventDefault());
  $('#game-pause').onclick=()=>{
    if(!active)return;
    paused=!paused;paint();
    if(!paused)focusGame();
  };
  $('#game-back').onclick=()=>window.show('games');
  $('#game-restart').onclick=start;
})();
