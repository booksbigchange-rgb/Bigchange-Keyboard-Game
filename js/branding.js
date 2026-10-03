// The welcome animation is optional: the profile form is ready immediately.
(()=>{
  const video=document.querySelector('#brand-video');
  const logo=document.querySelector('#welcome-logo');
  const replay=document.querySelector('#replay-brand');
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const showLogo=()=>{video.hidden=true;logo.hidden=false;};
  const stop=()=>{video.pause();showLogo();};
  const play=()=>{
    if(document.querySelector('#profile').style.display==='none')return;
    video.muted=true;
    if(!video.getAttribute('src'))video.src=video.dataset.src;
    if(video.error)video.load();
    video.currentTime=0;
    video.play().catch(showLogo);
  };
  video.addEventListener('playing',()=>{video.hidden=false;logo.hidden=true;});
  video.addEventListener('ended',showLogo);
  video.addEventListener('error',showLogo);
  replay.addEventListener('click',play);
  document.addEventListener('bc:viewchange',stop);
  reducedMotion.addEventListener('change',event=>{if(event.matches)stop();});
  if(!reducedMotion.matches)play();
})();
