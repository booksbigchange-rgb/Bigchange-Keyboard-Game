const BASE_URL=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:4173';
const {test,expect}=require('@playwright/test');

async function fresh(page){
  await page.goto(BASE_URL);
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
}

async function createStudent(page,name='Test Student'){
  await fresh(page);
  await page.locator('#student-name').fill(name);
  await page.locator('#save-profile').click();
  await expect(page.locator('#student-nav')).toBeVisible();
}

async function typePhrase(page,text){
  const words=text.trim().split(/\s+/);
  for(let i=0;i<words.length;i++){
    await page.keyboard.type(words[i]);
    if(i<words.length-1)await page.keyboard.press('Space');
  }
}

async function targetText(page){
  return (await page.locator('#target').textContent()).replace(/\s+/g,' ').trim();
}

test('deployed build marker identifies Typing Core V3',async({page})=>{
  await page.goto(BASE_URL);
  await expect(page.locator('meta[name="bigchange-build"]')).toHaveAttribute('content','core-v3-20261003-8');
  await expect(page.locator('footer')).toContainText('Build core-v3-20261003-8');
});

test('manual V3 engine page also passes in Chromium',async({page})=>{
  await page.goto(BASE_URL+'/tests/typing-engine.html');
  await expect(page).toHaveTitle(/PASS — BigChange V3 Typing Engine Tests/);
  await expect(page.locator('#out')).toContainText('8 passed · 0 failed');
});

test('classroom controls expose essential accessibility semantics',async({page})=>{
  await page.goto(BASE_URL);
  await expect(page.locator('#student-nav')).toHaveAttribute('aria-label','Student sections');
  await expect(page.locator('#target')).toHaveAttribute('aria-label','Typing target');
  await expect(page.locator('#challenge-timer')).toHaveAttribute('role','timer');
  await expect(page.locator('#game-message')).toHaveAttribute('aria-live','polite');
  await expect(page.locator('#message')).toHaveAttribute('aria-atomic','true');
});

test('typing field disables browser correction features',async({page})=>{
  await createStudent(page);
  await page.locator('[data-view="practice"]').click();
  const box=page.locator('#typed-display');
  await expect(box).toHaveAttribute('autocomplete','off');
  await expect(box).toHaveAttribute('autocapitalize','none');
  await expect(box).toHaveAttribute('autocorrect','off');
  await expect(box).toHaveAttribute('spellcheck','false');
});

test('profile gates the classroom app',async({page})=>{
  await fresh(page);
  await expect(page.locator('#profile')).toBeVisible();
  await expect(page.locator('#student-nav')).toBeHidden();
  await page.locator('#student-name').fill('Keyboard Student');
  await page.locator('#student-name').press('Enter');
  await expect(page.locator('#student-nav')).toBeVisible();
  await expect(page.locator('#lesson-list [data-lesson]')).toHaveCount(7);
});

test('Top Row extra letters show mistakes immediately without skipping',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="1"]').click();
  const box=page.locator('#typed-display');

  await expect(page.locator('#target .current-word')).toContainText('red');
  await page.keyboard.type('red');
  await expect(page.locator('#mistakes')).toHaveText('0');

  await page.keyboard.type('b');
  await expect(box).toHaveValue('redb');
  await expect(page.locator('#mistakes')).toHaveText('1');

  await page.keyboard.type('y');
  await expect(box).toHaveValue('redby');
  await expect(page.locator('#mistakes')).toHaveText('2');

  await page.keyboard.type('ree');
  await expect(box).toHaveValue('redbyree');
  await expect(page.locator('#mistakes')).toHaveText('5');
  await expect(page.locator('#target .current-word')).toContainText('red');
  await expect(box).toBeEditable();

  await page.keyboard.press('Space');
  await expect(box).toHaveValue('');
  await expect(page.locator('#target .current-word')).toContainText('tree');
});

test('wrong character never locks the current word',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  const box=page.locator('#typed-display');
  await page.keyboard.type('asx');
  await expect(page.locator('#mistakes')).toHaveText('1');
  await page.keyboard.type('f');
  await expect(box).toHaveValue('asxf');
  await expect(box).toBeEditable();
});

test('Backspace correction clears visible mistake while accuracy retains attempt',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  const box=page.locator('#typed-display');
  await page.keyboard.type('asx');
  await expect(page.locator('#mistakes')).toHaveText('1');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('d');
  await expect(box).toHaveValue('asd');
  await expect(page.locator('#mistakes')).toHaveText('0');
  await expect(page.locator('#accuracy')).not.toHaveText('100%');
  await expect(box).toBeEditable();
});

test('reported Home Row screenshot state has one visible extra-letter mistake',async({page})=>{
  await createStudent(page);
  await page.locator('[data-view="practice"]').click();
  const box=page.locator('#typed-display');

  await page.keyboard.type('asdf');
  await page.keyboard.press('Space');
  await expect(page.locator('#target .word-complete')).toHaveCount(1);
  await expect(page.locator('#target .word-error')).toHaveCount(0);

  await page.keyboard.type('jkl;i');
  await expect(box).toHaveValue('jkl;i');
  await expect(page.locator('#mistakes')).toHaveText('1');
  await expect(page.locator('#accuracy')).toHaveText('89%');
  await expect(page.locator('#target .typed-extra')).toHaveText('i');
});

test('deleting correct text after a middle edit preserves accuracy',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  const box=page.locator('#typed-display');
  await page.keyboard.type('as');
  await box.evaluate(el=>el.setSelectionRange(0,1));
  await page.keyboard.press('Backspace');
  await expect(box).toHaveValue('s');
  await box.selectText();
  await page.keyboard.press('Backspace');
  await page.keyboard.type('asdf');
  await expect(box).toHaveValue('asdf');
  await expect(page.locator('#mistakes')).toHaveText('0');
  await expect(page.locator('#accuracy')).toHaveText('100%');
});

test('middle insertion highlights the actual extra character',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  const box=page.locator('#typed-display');

  await box.fill('asxdf');
  await expect(page.locator('#mistakes')).toHaveText('1');
  await expect(page.locator('#accuracy')).toHaveText('80%');
  await expect(page.locator('#target .typed-extra')).toHaveText('x');
  await expect(page.locator('#target .typed-extra')).not.toHaveText('f');
});

test('middle omission is counted once after commit',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  await page.locator('#typed-display').fill('asf');
  await page.keyboard.press('Space');

  await expect(page.locator('#mistakes')).toHaveText('1');
  await expect(page.locator('#accuracy')).toHaveText('75%');
  await expect(page.locator('#target .current-word')).toContainText('jkl;');
});

test('mid-word editing uses the real textarea without jumping',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  const box=page.locator('#typed-display');
  await box.fill('asf');
  await box.evaluate(el=>el.setSelectionRange(2,2));
  await page.keyboard.type('d');
  await expect(box).toHaveValue('asdf');
  await expect(page.locator('#target .current-word')).toContainText('asdf');
});

test('Space commits exactly one word and advances exactly one word',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="1"]').click();
  await page.keyboard.type('red');
  await page.keyboard.press('Space');
  await expect(page.locator('#typed-display')).toHaveValue('');
  await expect(page.locator('#target .current-word')).toContainText('tree');
  await expect(page.locator('#target .word-complete')).toContainText('red');
});

test('empty Backspace reopens the previous committed word',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="1"]').click();
  await page.keyboard.type('red');
  await page.keyboard.press('Space');
  await expect(page.locator('#target .current-word')).toContainText('tree');
  await page.keyboard.press('Backspace');
  await expect(page.locator('#typed-display')).toHaveValue('red');
  await expect(page.locator('#target .current-word')).toContainText('red');
});

test('all seven lessons can complete with correct word-by-word typing',async({page})=>{
  await createStudent(page);
  for(let i=0;i<7;i++){
    await page.locator('[data-view="learn"]').click();
    await page.locator('[data-lesson="'+i+'"]').click();
    const target=await targetText(page);
    await typePhrase(page,target);
    await expect(page.locator('#message')).toContainText('Practice complete');
  }
  await page.locator('[data-view="progress"]').click();
  await expect(page.locator('#progress-content')).toContainText('7 of 7 lessons completed');
});

test('lesson below 90 percent does not unlock completion',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="1"]').click();
  await page.keyboard.type('xxxx');
  await page.keyboard.press('Space');
  await page.keyboard.type('yyyy');
  await page.keyboard.press('Space');
  await page.keyboard.type('zzzzz');
  await page.keyboard.press('Space');
  await page.keyboard.type('qqqq');
  await page.keyboard.press('Space');
  await page.keyboard.type('wwwww');
  await page.keyboard.press('Enter');
  await expect(page.locator('#message')).toContainText('Try again');
  await page.locator('[data-view="learn"]').click();
  await expect(page.locator('[data-lesson="1"] em')).toHaveCount(0);
});

test('restart clears current word and statistics',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  await page.keyboard.type('asx');
  await expect(page.locator('#mistakes')).toHaveText('1');
  await page.locator('#start').click();
  await expect(page.locator('#typed-display')).toHaveValue('');
  await expect(page.locator('#mistakes')).toHaveText('0');
  await expect(page.locator('#accuracy')).toHaveText('100%');
  await expect(page.locator('#target .current-word')).toContainText('asdf');
});

test('free Practice remains separate from Learn completion',async({page})=>{
  await createStudent(page);
  await page.locator('[data-view="practice"]').click();
  await expect(page.locator('.levels')).toBeVisible();
  const target=await targetText(page);
  await typePhrase(page,target);
  await expect(page.locator('#message')).toContainText('Practice complete');
  await page.locator('[data-view="learn"]').click();
  await expect(page.locator('#lesson-list em')).toHaveCount(0);
});

test('challenge waits for first letter and accepts mistakes continuously',async({page})=>{
  await createStudent(page);
  await page.locator('[data-view="challenge"]').click();
  await page.locator('#challenge-start').click();
  await expect(page.locator('#timer-seconds')).toHaveText('60');
  await page.waitForTimeout(1100);
  await expect(page.locator('#timer-seconds')).toHaveText('60');

  await page.keyboard.type('X');
  await expect(page.locator('#mistakes')).toHaveText('1');
  await page.keyboard.type('ractice');
  await expect(page.locator('#typed-display')).toHaveValue('Xractice');
  await expect(page.locator('#typed-display')).toBeEditable();

  await page.waitForTimeout(1200);
  const seconds=Number(await page.locator('#timer-seconds').textContent());
  expect(seconds).toBeLessThan(60);
  expect(seconds).toBeGreaterThanOrEqual(58);
});

test('leaving challenge stops its timer',async({page})=>{
  await createStudent(page);
  await page.locator('[data-view="challenge"]').click();
  await page.locator('#challenge-start').click();
  await page.keyboard.type('P');
  await page.waitForTimeout(1100);
  const before=await page.locator('#timer-seconds').textContent();
  await page.locator('[data-view="learn"]').click();
  await page.waitForTimeout(1200);
  await expect(page.locator('#timer-seconds')).toHaveText(before);
});

test('completed progress survives reload',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="1"]').click();
  await typePhrase(page,'red tree quiet type power');
  await expect(page.locator('#message')).toContainText('Practice complete');
  await page.reload();
  await expect(page.locator('[data-lesson="1"] em')).toContainText('Complete');
});

test('games still receive keyboard input',async({page})=>{
  await createStudent(page);
  await page.locator('[data-view="games"]').click();

  await page.locator('[data-game="bubble"]').click();
  let key=(await page.locator('#game-board').textContent()).trim();
  await page.keyboard.type(key);
  await expect(page.locator('#game-score')).toHaveText('1');

  await page.locator('[data-view="games"]').click();
  await page.locator('[data-game="race"]').click();
  key=(await page.locator('#game-board strong').textContent()).trim();
  await page.keyboard.type(key);
  await expect(page.locator('#game-score')).toHaveText('1');
});

test('empty and repeated spaces never skip target words',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="1"]').click();
  const box=page.locator('#typed-display');

  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#target .current-word')).toContainText('red');
  await expect(box).toHaveValue('');

  await page.keyboard.type('red');
  await page.keyboard.press('Space');
  await expect(page.locator('#target .current-word')).toContainText('tree');

  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#target .current-word')).toContainText('tree');
  await expect(box).toHaveValue('');
});

test('wrong committed word does not cascade into next word',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  const box=page.locator('#typed-display');

  await page.keyboard.type('asxf');
  await expect(page.locator('#mistakes')).toHaveText('1');
  await page.keyboard.press('Space');

  await expect(page.locator('#target .current-word')).toContainText('jkl;');
  await expect(box).toHaveValue('');
  await page.keyboard.type('jkl;');
  await expect(page.locator('#target .current-word')).toContainText('jkl;');
  await expect(page.locator('#mistakes')).toHaveText('1');
});

test('previous wrong word can be reopened repaired and recommitted',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  const box=page.locator('#typed-display');

  await page.keyboard.type('asxf');
  await page.keyboard.press('Space');
  await expect(page.locator('#target .word-error')).toHaveCount(1);

  await page.keyboard.press('Backspace');
  await expect(box).toHaveValue('asxf');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('df');
  await expect(box).toHaveValue('asdf');
  await expect(page.locator('#mistakes')).toHaveText('0');

  await page.keyboard.press('Space');
  await expect(page.locator('#target .word-error')).toHaveCount(0);
  await expect(page.locator('#target .current-word')).toContainText('jkl;');
});

test('Easy Medium and Hard practice each start clean and complete',async({page})=>{
  await createStudent(page);
  await page.locator('[data-view="practice"]').click();

  for(const level of ['easy','medium','hard']){
    await page.locator('[data-level="'+level+'"]').click();
    await expect(page.locator('#mistakes')).toHaveText('0');
    await expect(page.locator('#accuracy')).toHaveText('100%');
    const target=await targetText(page);
    expect(target.length).toBeGreaterThan(3);
    await typePhrase(page,target);
    await expect(page.locator('#message')).toContainText('Practice complete');
  }
});

test('existing saved student opens directly into Learn',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('bc-keyboard',JSON.stringify({
    name:'Returning Student',
    completed:[0,1],
    last:{wpm:20,accuracy:95},
    best:{wpm:30,accuracy:98}
  })));
  await page.goto(BASE_URL);
  await expect(page.locator('#profile')).toBeHidden();
  await expect(page.locator('#student-nav')).toBeVisible();
  await expect(page.locator('#learn')).toBeVisible();
  await expect(page.locator('#lesson-list em')).toHaveCount(2);
});

test('corrupt saved state cannot break startup',async({page})=>{
  await page.goto(BASE_URL);
  await page.evaluate(()=>localStorage.setItem('bc-keyboard','{broken'));
  await page.reload();
  await expect(page.locator('#profile')).toBeVisible();
  await expect(page.locator('#student-nav')).toBeHidden();

  await page.evaluate(()=>localStorage.setItem('bc-keyboard','"primitive"'));
  await page.reload();
  await expect(page.locator('#profile')).toBeVisible();
});

test('challenge restart resets timer stats and input',async({page})=>{
  await createStudent(page);
  await page.locator('[data-view="challenge"]').click();
  await page.locator('#challenge-start').click();
  await page.keyboard.type('X');
  await expect(page.locator('#mistakes')).toHaveText('1');
  await page.waitForTimeout(350);
  await page.locator('#start').click();
  await expect(page.locator('#timer-seconds')).toHaveText('60');
  await expect(page.locator('#mistakes')).toHaveText('0');
  await expect(page.locator('#accuracy')).toHaveText('100%');
  await expect(page.locator('#typed-display')).toHaveValue('');
});

test('forced challenge finish freezes result and saves it',async({page})=>{
  await createStudent(page);
  await page.locator('[data-view="challenge"]').click();
  await page.locator('#challenge-start').click();
  await page.keyboard.type('Practice');
  await page.evaluate(()=>finishChallenge('time'));
  await expect(page.locator('#typed-display')).toBeDisabled();
  await expect(page.locator('#message')).toContainText('Time!');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bc-keyboard')));
  expect(saved.last).toBeTruthy();
  expect(Number.isFinite(saved.last.wpm)).toBeTruthy();
  expect(saved.last.accuracy).toBeGreaterThanOrEqual(0);
  expect(saved.last.accuracy).toBeLessThanOrEqual(100);
});

test('New Student reset clears app state after confirmation',async({page})=>{
  await createStudent(page,'Student One');
  await page.locator('[data-view="progress"]').click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#new-student').click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('#profile')).toBeVisible();
  await expect(page.locator('#student-nav')).toBeHidden();
  expect(await page.evaluate(()=>localStorage.getItem('bc-keyboard'))).toBeNull();
});

test('Letter Rain accepts a key then stops changing after navigation',async({page})=>{
  await createStudent(page);
  await page.locator('[data-view="games"]').click();
  await page.locator('[data-game="rain"]').click();

  const key=(await page.locator('#game-board').textContent()).trim().slice(-1);
  await page.keyboard.type(key);
  await expect(page.locator('#game-score')).toHaveText('1');

  await page.locator('[data-view="learn"]').click();
  const before=await page.locator('#game-board').innerHTML();
  await page.waitForTimeout(900);
  const after=await page.locator('#game-board').innerHTML();
  expect(after).toBe(before);
});

test('Rocket Race completes exactly at 20 correct keys',async({page})=>{
  await createStudent(page);
  await page.locator('[data-view="games"]').click();
  await page.locator('[data-game="race"]').click();

  for(let i=1;i<=20;i++){
    const key=(await page.locator('#game-board strong').textContent()).trim();
    await page.keyboard.type(key);
    await expect(page.locator('#game-score')).toHaveText(String(i));
  }

  await expect(page.locator('#game-message')).toContainText('Finish!');
  await expect(page.locator('#game-board')).toContainText('Race complete!');
});

test('typing focus survives word commits and previous-word reopen',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="1"]').click();
  const box=page.locator('#typed-display');

  await page.keyboard.type('red');
  await page.keyboard.press('Space');
  await expect(box).toBeFocused();

  await page.keyboard.press('Backspace');
  await expect(box).toBeFocused();
  await expect(box).toHaveValue('red');

  await page.keyboard.press('Backspace');
  await page.keyboard.type('d');
  await expect(box).toBeFocused();
});

test('primary student flows produce no uncaught browser errors',async({page})=>{
  const pageErrors=[];
  const consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{
    if(message.type()==='error')consoleErrors.push(message.text());
  });

  await createStudent(page,'Error Check Student');
  await page.locator('[data-lesson="0"]').click();
  await page.keyboard.type('asdf');
  await page.keyboard.press('Space');
  await page.keyboard.type('jkl;');
  await page.keyboard.press('Space');

  await page.locator('[data-view="practice"]').click();
  await page.keyboard.type('asdf');
  await page.keyboard.press('Space');

  await page.locator('[data-view="challenge"]').click();
  await page.locator('#challenge-start').click();
  await page.keyboard.type('Practice');
  await page.keyboard.press('Space');
  await page.locator('[data-view="games"]').click();
  await page.locator('[data-game="bubble"]').click();
  const key=(await page.locator('#game-board').textContent()).trim();
  await page.keyboard.type(key);
  await page.locator('[data-view="progress"]').click();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('game keyboard listener releases control after leaving games',async({page})=>{
  await createStudent(page);
  await page.locator('[data-view="games"]').click();
  await page.locator('[data-game="bubble"]').click();
  const key=(await page.locator('#game-board').textContent()).trim();
  await page.keyboard.type(key);
  await expect(page.locator('#game-score')).toHaveText('1');

  await page.locator('[data-view="practice"]').click();
  const box=page.locator('#typed-display');
  await page.keyboard.type('asdf');
  await expect(box).toHaveValue('asdf');
  await expect(page.locator('#mistakes')).toHaveText('0');
});

test('stored progress is sanitized and bounded before rendering',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('bc-keyboard',JSON.stringify({
    name:'Returning Student',
    completed:[0,0,1,99,-1,'2'],
    last:{wpm:-20,accuracy:999},
    best:{wpm:22.4,accuracy:98.6}
  })));
  await page.goto(BASE_URL);
  await page.locator('[data-view="progress"]').click();
  await expect(page.locator('#progress-content')).toContainText('2 of 7 lessons completed');
  await expect(page.locator('#progress-content')).toContainText('Last result: 0 WPM · 100% accuracy');
  await expect(page.locator('#progress-content')).toContainText('Fastest 22 WPM · Highest 99% accuracy');
});

test('student name is always rendered as text',async({page})=>{
  await fresh(page);
  await page.locator('#student-name').fill('<b>XSS</b>');
  await page.locator('#save-profile').click();
  await expect(page.locator('#welcome')).toContainText('<b>XSS</b>');
  await expect(page.locator('#welcome b')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__xss||null)).toBeNull();
});

test('normal student interactions make no network requests after app load',async({page})=>{
  await createStudent(page,'Privacy Check');
  const requests=[];
  page.on('request',request=>requests.push(request.url()));

  await page.locator('[data-view="practice"]').click();
  await page.keyboard.type('asdf');
  await page.keyboard.press('Space');
  await page.locator('[data-view="challenge"]').click();
  await page.locator('#challenge-start').click();
  await page.keyboard.type('Practice');
  await page.locator('[data-view="games"]').click();
  await page.locator('[data-game="bubble"]').click();
  const key=(await page.locator('#game-board').textContent()).trim();
  await page.keyboard.type(key);
  await page.locator('[data-view="progress"]').click();

  expect(requests).toEqual([]);
});

test('mobile-style Space commits without a keydown event',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  const box=page.locator('#typed-display');
  await box.fill('asdf');

  const allowed=await box.evaluate(el=>{
    const before=new InputEvent('beforeinput',{
      bubbles:true,
      cancelable:true,
      inputType:'insertText',
      data:' '
    });
    const allowed=el.dispatchEvent(before);
    if(allowed){
      el.value+=' ';
      el.dispatchEvent(new InputEvent('input',{
        bubbles:true,
        inputType:'insertText',
        data:' '
      }));
    }
    return allowed;
  });

  expect(allowed).toBe(false);
  await expect(box).toHaveValue('');
  await expect(page.locator('#target .current-word')).toContainText('jkl;');
});

test('mobile-style empty Backspace reopens the previous word without keydown',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  const box=page.locator('#typed-display');
  await box.fill('asdf');

  await box.evaluate(el=>{
    const before=new InputEvent('beforeinput',{
      bubbles:true,
      cancelable:true,
      inputType:'insertText',
      data:' '
    });
    const allowed=el.dispatchEvent(before);
    if(allowed){
      el.value+=' ';
      el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:' '}));
    }
  });

  await expect(page.locator('#target .current-word')).toContainText('jkl;');
  await expect(box).toHaveValue('');

  const allowed=await box.evaluate(el=>{
    const before=new InputEvent('beforeinput',{
      bubbles:true,
      cancelable:true,
      inputType:'deleteContentBackward'
    });
    return el.dispatchEvent(before);
  });

  expect(allowed).toBe(false);
  await expect(box).toHaveValue('asdf');
  await expect(page.locator('#target .current-word')).toContainText('asdf');
});

test('IME composition text is not counted before composition finishes',async({page})=>{
  await createStudent(page);
  await page.locator('[data-lesson="1"]').click();
  const box=page.locator('#typed-display');

  await box.evaluate(el=>{
    el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));
    el.value='x';
    el.dispatchEvent(new InputEvent('input',{
      bubbles:true,
      inputType:'insertCompositionText',
      data:'x',
      isComposing:true
    }));
  });

  await expect(page.locator('#mistakes')).toHaveText('0');

  await box.evaluate(el=>{
    el.value='r';
    el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'r'}));
    el.dispatchEvent(new InputEvent('input',{
      bubbles:true,
      inputType:'insertText',
      data:'r',
      isComposing:false
    }));
  });

  await expect(box).toHaveValue('r');
  await expect(page.locator('#mistakes')).toHaveText('0');
  await expect(page.locator('#accuracy')).toHaveText('100%');
});

test('mobile layout has no horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await createStudent(page);
  const sizes=await page.evaluate(()=>({
    scroll:document.documentElement.scrollWidth,
    client:document.documentElement.clientWidth
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client+1);
});


test('Build 7 partial challenge score survives the deadline',async({page})=>{
  await createStudent(page);
  await page.locator('[data-view="challenge"]').click();
  await page.locator('#challenge-start').click();
  await page.keyboard.type('Practice');
  await page.evaluate(()=>finishChallenge('time'));
  await expect(page.locator('#accuracy')).toHaveText('100%');
  await expect(page.locator('#mistakes')).toHaveText('0');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bc-keyboard')).last.accuracy)).toBe(100);
});

test('Build 7 batch mobile input retains text before its space',async({page})=>{
  await createStudent(page);await page.locator('[data-lesson="0"]').click();
  await page.locator('#typed-display').evaluate(el=>el.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:'asdf jkl; '})));
  await expect(page.locator('#target .current-word')).toHaveText('asdf');
  await expect(page.locator('#accuracy')).toHaveText('100%');
  expect(await page.evaluate(()=>session.wordIndex)).toBe(2);
});

test('Build 7 save warning appears and retry preserves progress',async({page})=>{
  await createStudent(page);
  await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError')}});
  await page.locator('[data-lesson="1"]').click();await typePhrase(page,'red tree quiet type power');
  await expect(page.locator('#storage-warning')).toBeVisible();
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem});
  await page.locator('#retry-save').click();await expect(page.locator('#storage-warning')).toBeHidden();
  await page.reload();await expect(page.locator('[data-lesson="1"]')).toHaveClass(/done/);
});

test('Build 7 game allows navigation Space and browser shortcuts',async({page})=>{
  await createStudent(page);await page.locator('[data-view="games"]').click();await page.locator('[data-game="bubble"]').click();
  const target=(await page.locator('#game-board').textContent()).trim();
  const allowed=await page.locator('#game-board').evaluate((el,key)=>el.dispatchEvent(new KeyboardEvent('keydown',{key,ctrlKey:true,bubbles:true,cancelable:true})),target);
  expect(allowed).toBe(true);await expect(page.locator('#game-score')).toHaveText('0');
  await page.locator('[data-view="learn"]').press('Space');
  await expect(page.locator('#learn')).toBeVisible();
});

test('Build 7 current challenge word remains visible on desktop and phone',async({page})=>{
  for(const size of [{width:1280,height:720},{width:390,height:844}]){
    await page.setViewportSize(size);await createStudent(page);
    await page.locator('[data-view="challenge"]').click();await page.locator('#challenge-start').click();
    await page.keyboard.type('Pra');
    const word=await page.locator('#target .current-word').boundingBox();
    const box=await page.locator('#typed-display').boundingBox();
    expect(word.y).toBeGreaterThanOrEqual(0);expect(word.y+word.height).toBeLessThan(size.height);
    expect(box.y+box.height).toBeLessThanOrEqual(size.height);
    if(size.width===1280)await page.screenshot({path:require('node:path').resolve(__dirname,'../../../outputs/build7-preview.png')});
  }
});


test('keyboard guide follows letters, edits, Space and word commits',async({page})=>{
  await createStudent(page);await page.locator('[data-lesson="0"]').click();
  await expect(page.locator('#finger-hint')).toContainText('Left little finger');
  await expect(page.locator('[data-key="a"]')).toHaveAttribute('aria-current','true');
  await page.keyboard.type('as');await expect(page.locator('[data-key="d"]')).toHaveAttribute('aria-current','true');
  await page.keyboard.press('Backspace');await expect(page.locator('[data-key="s"]')).toHaveAttribute('aria-current','true');
  await page.keyboard.type('sdf');await expect(page.locator('[data-key="Space"]')).toHaveAttribute('aria-current','true');
  await page.keyboard.press('Space');await expect(page.locator('[data-key="j"]')).toHaveAttribute('aria-current','true');
  await expect(page.locator('#finger-hint')).toContainText('Right index finger');
});

test('keyboard guide teaches opposite Shift for capitals and punctuation',async({page})=>{
  await createStudent(page);await page.locator('[data-lesson="3"]').click();
  await expect(page.locator('[data-key="b"]')).toHaveAttribute('aria-current','true');
  await expect(page.locator('[data-key="ShiftRight"]')).toHaveAttribute('aria-current','true');
  await expect(page.locator('#finger-hint')).toContainText('Hold right Shift');
  await page.locator('[data-view="learn"]').click();await page.locator('[data-lesson="5"]').click();
  await expect(page.locator('[data-key="ShiftLeft"]')).toHaveAttribute('aria-current','true');
  await page.keyboard.type('Hello,');await page.keyboard.press('Space');await page.keyboard.type('student');
  await expect(page.locator('[data-key="1"]')).toHaveAttribute('aria-current','true');
  await expect(page.locator('[data-key="ShiftRight"]')).toHaveAttribute('aria-current','true');
  await expect(page.locator('#finger-hint')).toContainText('Next: !');
});

test('keyboard guide hides on request, does not type, and clears at completion',async({page})=>{
  await createStudent(page);await page.locator('[data-lesson="2"]').click();
  await page.locator('[data-key="v"]').click();await expect(page.locator('#typed-display')).toHaveValue('');
  await page.locator('#keyboard-guide summary').click();await expect(page.locator('#visual-keyboard')).toBeHidden();
  await page.locator('#keyboard-guide summary').click();await page.locator('#typed-display').click();
  await typePhrase(page,'van zoom mix cabin');await expect(page.locator('#finger-hint')).toContainText('Finished!');
  await expect(page.locator('#visual-keyboard [aria-current="true"]')).toHaveCount(0);
});

test('keyboard guide fits phone screens and provides clear hand diagrams',async({page})=>{
  await page.setViewportSize({width:390,height:844});await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  await page.locator('#keyboard-guide').scrollIntoViewIfNeeded();
  await expect(page.locator('#hand-guide')).toHaveAttribute('aria-label',/Left little finger/);
  await expect(page.locator('#hand-guide svg')).toHaveCount(2);
  const widths=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);
  await page.screenshot({path:require('node:path').resolve(__dirname,'../../../outputs/keyboard-guide-phone.png')});
  await page.setViewportSize({width:1280,height:900});await page.locator('#keyboard-guide').scrollIntoViewIfNeeded();
  await page.screenshot({path:require('node:path').resolve(__dirname,'../../../outputs/keyboard-guide-preview.png')});
});


test('transparent fingers align with highlighted keys after resize and reopening',async({page})=>{
  await createStudent(page);await page.locator('[data-lesson="3"]').click();
  for(const size of [{width:1280,height:900},{width:390,height:844},{width:900,height:720}]){
    await page.setViewportSize(size);
    await page.locator('#keyboard-guide summary').click();await page.locator('#keyboard-guide summary').click();
    await expect.poll(async()=>page.evaluate(()=>{
      const tips=[...document.querySelectorAll('.tip-active')].map(el=>{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
      const keys=[...document.querySelectorAll('#visual-keyboard [aria-current="true"]')].map(el=>{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
      return tips.length===2&&keys.every(key=>tips.some(tip=>Math.hypot(key.x-tip.x,key.y-tip.y)<3));
    })).toBe(true);
    expect(await page.locator('#hand-guide').evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
    await expect(page.locator('#hand-guide svg .hand-label')).toHaveCount(2);
  }
});
