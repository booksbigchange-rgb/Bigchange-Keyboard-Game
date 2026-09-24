// Typing session engine adapted from KeyQuest (MIT).
window.KQ = window.KQ || {};
KQ.PENDING=0;KQ.CORRECT=1;KQ.WRONG=2;KQ.FIXED=3;
KQ.TypingSession=class{
  constructor(text,opts={}){this.text=text;this.stopOnError=opts.stopOnError!==false;this.pos=0;this.states=new Array(text.length).fill(0);this.keystrokes=0;this.errors=0;this.startTime=null;this.endTime=null;this.done=false;this.keyStats={};this.wpm=0;this.lastWrong=''}
  get expected(){return this.done?null:this.text[this.pos]}
  input(ch){
    if(this.done)return"ignored";
    if(this.startTime===null)this.startTime=performance.now();
    const e=this.text[this.pos];this.keystrokes++;const k=this.keyStats[e]=this.keyStats[e]||{attempts:0,errors:0};k.attempts++;
    if(ch===e){this.lastWrong='';this.states[this.pos]=this.states[this.pos]===2?3:1;this.pos++;this.updateWpm();if(this.pos>=this.text.length){this.finish();return"complete"}return"correct"}
    this.errors++;k.errors++;this.lastWrong=ch;this.states[this.pos]=2;this.updateWpm();if(!this.stopOnError){this.pos++;if(this.pos>=this.text.length){this.finish();return"complete"}}return"wrong"
  }
  backspace(){if(this.done)return false;this.lastWrong='';if(this.states[this.pos]===2){this.states[this.pos]=0;return true}if(this.pos>0){this.pos--;this.states[this.pos]=0;this.updateWpm();return true}return false}
  finish(){if(!this.done){this.done=true;this.endTime=performance.now();this.updateWpm()}}
  elapsedMs(){return this.startTime===null?0:(this.endTime===null?performance.now():this.endTime)-this.startTime}
  updateWpm(){
    const ms=this.elapsedMs();
    if(this.startTime===null||this.pos<10||ms<5000){this.wpm=0;return}
    this.wpm=Math.max(0,Math.round((this.pos/5)/(ms/60000)));
  }
  stats(){const ms=this.elapsedMs(),accuracy=this.keystrokes===0?100:Math.round(((this.keystrokes-this.errors)/this.keystrokes)*100);return{wpm:this.wpm,accuracy,errors:this.errors,keystrokes:this.keystrokes,typed:this.pos,seconds:Math.round(ms/1000),done:this.done,progress:this.pos/this.text.length,lastWrong:this.lastWrong,expected:this.expected}}
};