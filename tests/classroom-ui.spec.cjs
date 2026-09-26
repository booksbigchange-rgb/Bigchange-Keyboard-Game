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
  await expect(page.locator('meta[name="bigchange-build"]')).toHaveAttribute('content','core-v3-20260926-2');
  await expect(page.locator('footer')).toContainText('Build core-v3-20260926-2');
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

test('mobile layout has no horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await createStudent(page);
  const sizes=await page.evaluate(()=>({
    scroll:document.documentElement.scrollWidth,
    client:document.documentElement.clientWidth
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client+1);
});
