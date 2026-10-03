// Original lightweight US QWERTY finger guide. It never changes typing input.
(()=>{
  const groups={lp:'`1qaz',lr:'2wsx',lm:'3edc',li:'45rtfgvb',ri:'67yuhjnm',rm:'8ik,',rr:'9ol.',rp:"0-=p[];'/\\"};
  const names={lp:'Left little finger',lr:'Left ring finger',lm:'Left middle finger',li:'Left index finger',ri:'Right index finger',rm:'Right middle finger',rr:'Right ring finger',rp:'Right little finger',thumb:'Either thumb'};
  const shifted='~!@#$%^&*()_+{}:"<>?|';
  const plain="`1234567890-=[];',./\\";
  const rows=[['`','1','2','3','4','5','6','7','8','9','0','-','=','Backspace'],['Tab','q','w','e','r','t','y','u','i','o','p','[',']','\\'],['Caps','a','s','d','f','g','h','j','k','l',';',"'",'Enter'],['ShiftLeft','z','x','c','v','b','n','m',',','.','/','ShiftRight'],['Space']];
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function finger(key){return Object.keys(groups).find(id=>groups[id].includes(key))||'thumb'}
  let lastGuide='';
  let handState={key:null,shift:null,active:[]};
  function paintHands(){
    const board=document.querySelector('#visual-keyboard');
    const bounds=document.querySelector('#hand-guide').getBoundingClientRect();
    if(!bounds.width)return;
    const width=bounds.width,height=bounds.height;
    function point(key){
      const el=[...board.querySelectorAll('[data-key]')].find(el=>el.dataset.key===key);
      if(!el)return null;
      const r=el.getBoundingClientRect();
      return {x:r.x-bounds.x+r.width/2,y:r.y-bounds.y+r.height/2};
    }
    function hand(side){
      const ids=side==='Left'?['lp','lr','lm','li']:['ri','rm','rr','rp'];
      const homes=side==='Left'?['a','s','d','f']:['j','k','l',';'];
      const rest=homes.map(point),spacing=Math.abs(rest[1].x-rest[0].x);
      const left=rest[0].x-spacing*.45,right=rest[3].x+spacing*.45;
      const base=bounds.height-45;
      let svg='<svg viewBox="0 0 '+width+' '+height+'" aria-hidden="true">';
      svg+='<path class="hand-palm" d="M '+left+' '+(base-18)+' Q '+left+' '+(height-6)+' '+(left+spacing)+' '+(height-6)+' L '+(right-spacing)+' '+(height-6)+' Q '+right+' '+(height-6)+' '+right+' '+(base-18)+' Z"/>';
      ids.forEach((id,i)=>{
        let tip=rest[i];
        if(handState.active.includes(id))tip=point((id==='lp'&&handState.shift==='ShiftLeft')||(id==='rp'&&handState.shift==='ShiftRight')?handState.shift:handState.key);
        tip=tip||rest[i];
        const start=rest[i].x,thickness=spacing*.48;
        const curve="M "+start+" "+base+" Q "+start+" "+(tip.y+spacing*.6)+" "+tip.x+" "+tip.y;
        svg+='<path class="finger-outline" d="'+curve+'" style="stroke-width:'+(thickness+2)+'"/>';
        svg+='<path class="hand-finger '+id+(handState.active.includes(id)?' finger-active':'')+'" d="'+curve+'" style="stroke-width:'+thickness+'"/>';
        svg+='<ellipse class="finger-tip'+(handState.active.includes(id)?' tip-active':'')+'" cx="'+tip.x+'" cy="'+tip.y+'" rx="'+(thickness*.33)+'" ry="'+(thickness*.22)+'"/>';
      });
      const thumb=point('Space'),start=side==='Left'?right:left;
      const thumbX=thumb.x+(side==='Left'?-spacing:spacing);
      svg+='<path class="hand-finger thumb'+(handState.active.includes('thumb')?' finger-active':'')+'" d="M '+start+' '+(base+5)+' Q '+start+' '+thumb.y+' '+thumbX+' '+thumb.y+'" style="stroke-width:'+(spacing*.5)+'"/>';
      svg+='<text class="hand-label" x="'+((left+right)/2)+'" y="'+(height-13)+'" text-anchor="middle">'+side+' hand</text>';
      return svg+'</svg>';
    }
    document.querySelector('#hand-guide').innerHTML=hand('Left')+hand('Right');
  }
  window.renderKeyboardGuide=stats=>{
    let key=null,shift=null,active=[];
    if(stats&&!stats.done){
      const next=stats.expected;
      if(next===null){key='Space';active=['thumb']}
      else{
        const pos=shifted.indexOf(next);
        key=pos>=0?plain[pos]:next.toLowerCase();
        const id=finger(key);active=[id];
        if(pos>=0||/[A-Z]/.test(next)){shift=id.startsWith('l')?'ShiftRight':'ShiftLeft';active.push(shift==='ShiftLeft'?'lp':'rp')}
      }
    }
    const label=key==='Space'?'Space':stats?.expected||'';
    const hint=!stats?'Start a lesson to see the next key.':stats.done?'Finished! Rest your fingers on the home row.':key==='Space'?'Next: Space — use either thumb.':'Next: '+label+' — '+names[active[0]]+(shift?'. Hold '+(shift==='ShiftLeft'?'left':'right')+' Shift with your little finger.':'.');
    document.querySelector('#finger-hint').textContent=hint;
    if(lastGuide===hint)return;
    lastGuide=hint;
    document.querySelector('#visual-keyboard').innerHTML=rows.map(row=>'<div class="keyboard-row">'+row.map(k=>{
      const group=k==='Space'?'thumb':k==='ShiftLeft'?'lp':k==='ShiftRight'?'rp':k.length===1?finger(k):'neutral';
      const display=k.startsWith('Shift')?'Shift':k==='Space'?'Space':k.length===1?k.toUpperCase():k;
      const isActive=k===key||k===shift;
      const symbol=k.length===1?plain.indexOf(k):-1;
      return '<span data-key="'+escape(k)+'" class="guide-key '+group+(k.length>1?' key-wide':'')+(k==='Space'?' key-space':'')+(isActive?' key-active':'')+(['f','j'].includes(k)?' key-anchor':'')+'"'+(isActive?' aria-current="true"':'')+'>'+(symbol>=0?'<small>'+escape(shifted[symbol])+'</small>':'')+escape(display)+'</span>';
    }).join('')+'</div>').join('');
    handState={key,shift,active};
    paintHands();
    document.querySelector('#hand-guide').setAttribute('aria-label',hint);
  };
  document.querySelector('#keyboard-guide').addEventListener('toggle',paintHands);
  new ResizeObserver(paintHands).observe(document.querySelector('#visual-keyboard'));
  window.renderKeyboardGuide(null);
})();
