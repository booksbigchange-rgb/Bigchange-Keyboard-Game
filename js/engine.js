// Typing session engine adapted from KeyQuest (MIT).
window.KQ = window.KQ || {};
KQ.PENDING=0;KQ.CORRECT=1;KQ.WRONG=2;KQ.FIXED=3;
KQ.TypingSession=class{
  constructor(text,opts={}){this.text=text;this.pos=0;this.states=new Array(text.length).fill(KQ.PENDING);this.typedChars=new Array(text.length).fill('');this.keystrokes=0;this.errors=0;this.startTime=null;this.endTime=null;this.done=false;this.keyStats={};this.wpm=0}
  get expected(){return this.done?null:this.text[this.pos]}
  input(ch){if(this.done)return'ignored';if(this.startTime===null)this.startTime=performance.now();const e=this.text[this.pos];this.keystrokes++;const k=this.keyStats[e]=this.keyStats[e]||{attempts:0,errors:0};k.attempts++;this.typedChars[this.pos]=ch;if(ch===e){this.states[this.pos]=KQ.CORRECT}else{this.states[this.pos]=KQ.WRONG;this.errors++;k.errors++}this.pos++;this.updateWpm();if(this.pos>=this.text.length){this.finish();return'complete'}return ch===e?'correct':'wrong'}
  backspace(){if(this.done)return false;if(this.pos<=0)return false;this.pos--;this.states[this.pos]=KQ.PENDING;this.typedChars[this.pos]='';this.updateWpm();return true}
  finish(){if(!this.done){this.done=true;this.endTime=performance.now();this.updateWpm()}}
  elapsedMs(){return this.startTime===null?0:(this.endTime===null?performance.now():this.endTime)-this.startTime}
  correctCount(){let n=0;for(let i=0;i<this.pos;i++)if(this.states[i]===KQ.CORRECT)n++;return n}
  updateWpm(){const ms=this.elapsedMs(),correct=this.correctCount();if(this.startTime===null||correct<10||ms<5000){this.wpm=0;return}this.wpm=Math.max(0,Math.round((correct/5)/(ms/60000)))}
  stats(){const ms=this.elapsedMs(),correct=this.correctCount(),accuracy=this.keystrokes===0?100:Math.round((correct/this.keystrokes)*100);return{wpm:this.wpm,accuracy,errors:this.errors,keystrokes:this.keystrokes,typed:this.pos,correct,seconds:Math.round(ms/1000),done:this.done,progress:this.pos/this.text.length,expected:this.expected}}
};