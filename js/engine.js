// Typing session engine adapted from KeyQuest (MIT).
window.KQ = window.KQ || {};
KQ.PENDING=0;KQ.CORRECT=1;KQ.WRONG=2;KQ.FIXED=3;
KQ.TypingSession=class{
  constructor(text,opts={}){
    this.text=text;
    this.stopOnError=opts.stopOnError!==false;
    this.pos=0;
    this.states=new Array(text.length).fill(0);
    this.keystrokes=0;
    this.errors=0;
    this.startTime=null;
    this.endTime=null;
    this.done=false;
    this.keyStats={};
  }
  get expected(){return this.done?null:this.text[this.pos]}
  input(ch){
    if(this.done)return"ignored";
    if(this.startTime===null)this.startTime=performance.now();
    const e=this.text[this.pos];
    this.keystrokes++;
    const k=this.keyStats[e]=this.keyStats[e]||{attempts:0,errors:0};
    k.attempts++;
    if(ch===e){
      this.states[this.pos]=this.states[this.pos]===2?3:1;
      this.pos++;
      if(this.pos>=this.text.length){this.finish();return"complete"}
      return"correct";
    }
    this.errors++;k.errors++;this.states[this.pos]=2;
    if(!this.stopOnError){this.pos++;if(this.pos>=this.text.length){this.finish();return"complete"}}
    return"wrong";
  }
  backspace(){
    if(this.done)return false;
    if(this.states[this.pos]===2){this.states[this.pos]=0;return true}
    if(this.pos>0){this.pos--;this.states[this.pos]=0;return true}
    return false;
  }
  finish(){if(!this.done){this.done=true;this.endTime=performance.now()}}
  elapsedMs(){return this.startTime===null?0:(this.endTime===null?performance.now():this.endTime)-this.startTime}
  stats(){
    const ms=this.elapsedMs();
    const typed=this.pos;
    // Keep WPM at zero until typing begins. During the first few seconds,
    // use a short warm-up floor so the display does not spike and rapidly
    // count down from an unrealistic value after the first character.
    let wpm=0;
    if(this.startTime!==null&&typed>0){
      const effectiveMs=this.done?Math.max(ms,1000):Math.max(ms,5000);
      wpm=Math.max(0,Math.round((typed/5)/(effectiveMs/60000)));
    }
    const accuracy=this.keystrokes===0?100:Math.round(((this.keystrokes-this.errors)/this.keystrokes)*100);
    return{wpm,accuracy,errors:this.errors,keystrokes:this.keystrokes,typed,seconds:Math.round(ms/1000),done:this.done,progress:this.pos/this.text.length};
  }
};