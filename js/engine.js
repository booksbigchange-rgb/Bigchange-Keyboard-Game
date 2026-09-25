// Typing session engine adapted from KeyQuest (MIT).
window.KQ = window.KQ || {};
KQ.PENDING=0;KQ.CORRECT=1;KQ.WRONG=2;
KQ.RESYNC_WINDOW=4;
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
  repairRecentInsertion(ch){
    if(this.pos<=0||ch===this.text[this.pos])return false;
    const floor=Math.max(0,this.pos-KQ.RESYNC_WINDOW);
    for(let i=this.pos-1;i>=floor;i--){
      if(this.states[i]===KQ.CORRECT)break;
      if(this.states[i]===KQ.WRONG&&ch===this.text[i]){
        this.typedChars[i]=ch;
        this.states[i]=KQ.CORRECT;
        return true;
      }
    }
    return false;
  }
  findAhead(ch){
    const end=Math.min(this.text.length-1,this.pos+KQ.RESYNC_WINDOW);
    for(let i=this.pos+1;i<=end;i++)if(this.text[i]===ch)return i;
    return -1;
  }
  input(ch){
    if(this.done||this.pos>=this.text.length)return'ignored';
    if(this.startTime===null)this.startTime=performance.now();
    this.keystrokes++;

    // Recover from one or more accidental extra characters without forcing
    // the student to stop. The mistake remains in the historical error count.
    if(this.repairRecentInsertion(ch)){
      this.updateWpm();
      return'corrected';
    }

    if(ch===this.text[this.pos]){
      this.typedChars[this.pos]=ch;
      this.states[this.pos]=KQ.CORRECT;
      this.pos++;
      return this.finishIfNeeded('correct');
    }

    // Recover from short omissions by matching the nearest upcoming target
    // character and marking the skipped target positions as mistakes.
    const ahead=this.findAhead(ch);
    if(ahead!==-1){
      for(let i=this.pos;i<ahead;i++){
        this.totalErrors++;
        this.typedChars[i]='';
        this.states[i]=KQ.WRONG;
      }
      this.typedChars[ahead]=ch;
      this.states[ahead]=KQ.CORRECT;
      this.pos=ahead+1;
      return this.finishIfNeeded('resynced');
    }

    // Normal substitution: count one mistake and continue immediately.
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
  currentErrors(){let n=0;for(let i=0;i<this.pos;i++)if(this.states[i]===KQ.WRONG)n++;return n}
  updateWpm(){const ms=this.elapsedMs(),correct=this.correctCount();if(!this.startTime||correct<10||ms<5000){this.wpm=0;return}this.wpm=Math.max(0,Math.round((correct/5)/(ms/60000)))}
  stats(){const ms=this.elapsedMs(),correct=this.correctCount(),attempts=correct+this.totalErrors;return{wpm:this.wpm,accuracy:attempts?Math.max(0,Math.round((correct/attempts)*100)):100,mistakes:this.totalErrors,currentErrors:this.currentErrors(),keystrokes:this.keystrokes,typed:this.pos,correct,seconds:Math.round(ms/1000),done:this.done,progress:this.text.length?this.pos/this.text.length:0,expected:this.expected}}
};