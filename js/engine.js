// Typing session engine adapted from KeyQuest (MIT).
window.KQ = window.KQ || {};
KQ.PENDING=0;KQ.CORRECT=1;KQ.WRONG=2;
KQ.TypingSession=class{
  constructor(text){
    this.text=text;this.pos=0;this.states=new Array(text.length).fill(KQ.PENDING);this.typedChars=new Array(text.length).fill('');
    this.keystrokes=0;this.totalErrors=0;this.startTime=null;this.endTime=null;this.done=false;this.wpm=0;
  }
  get expected(){return this.done?null:this.text[this.pos]}
  finishIfNeeded(result){
    this.updateWpm();
    if(this.pos>=this.text.length){this.finish();return'complete'}
    return result
  }
  input(ch){
    if(this.done||this.pos>=this.text.length)return'ignored';
    if(this.startTime===null)this.startTime=performance.now();
    this.keystrokes++;

    // If the previous wrong key was an accidental extra character and the
    // student now types the character that was expected there, repair the
    // alignment without blocking the session.
    if(this.pos>0&&this.states[this.pos-1]===KQ.WRONG&&ch===this.text[this.pos-1]&&ch!==this.text[this.pos]){
      this.typedChars[this.pos-1]=ch;
      this.states[this.pos-1]=KQ.CORRECT;
      this.updateWpm();
      return'corrected';
    }

    if(ch===this.text[this.pos]){
      this.typedChars[this.pos]=ch;
      this.states[this.pos]=KQ.CORRECT;
      this.pos++;
      return this.finishIfNeeded('correct');
    }

    // One-character look-ahead keeps a skipped character from cascading
    // every following character into an error.
    if(this.pos+1<this.text.length&&ch===this.text[this.pos+1]){
      this.totalErrors++;
      this.typedChars[this.pos]='';
      this.states[this.pos]=KQ.WRONG;
      this.pos++;
      this.typedChars[this.pos]=ch;
      this.states[this.pos]=KQ.CORRECT;
      this.pos++;
      return this.finishIfNeeded('resynced');
    }

    // Normal substitution: record one mistake and keep moving.
    this.totalErrors++;
    this.typedChars[this.pos]=ch;
    this.states[this.pos]=KQ.WRONG;
    this.pos++;
    return this.finishIfNeeded('wrong');
  }
  backspace(){
    if(this.done||this.pos<=0)return false;
    this.pos--;
    this.states[this.pos]=KQ.PENDING;
    this.typedChars[this.pos]='';
    this.updateWpm();
    return true
  }
  finish(){if(this.done)return;this.done=true;this.endTime=performance.now();this.updateWpm()}
  elapsedMs(){return this.startTime===null?0:(this.endTime??performance.now())-this.startTime}
  correctCount(){let n=0;for(let i=0;i<this.pos;i++)if(this.states[i]===KQ.CORRECT)n++;return n}
  currentErrors(){return this.pos>0&&this.states[this.pos-1]===KQ.WRONG?1:0}
  updateWpm(){const ms=this.elapsedMs(),correct=this.correctCount();if(!this.startTime||correct<10||ms<5000){this.wpm=0;return}this.wpm=Math.max(0,Math.round((correct/5)/(ms/60000)))}
  stats(){const ms=this.elapsedMs(),correct=this.correctCount(),attempts=correct+this.totalErrors;return{wpm:this.wpm,accuracy:attempts?Math.max(0,Math.round((correct/attempts)*100)):100,mistakes:this.totalErrors,currentErrors:this.currentErrors(),keystrokes:this.keystrokes,typed:this.pos,correct,seconds:Math.round(ms/1000),done:this.done,progress:this.text.length?this.pos/this.text.length:0,expected:this.expected}}
};