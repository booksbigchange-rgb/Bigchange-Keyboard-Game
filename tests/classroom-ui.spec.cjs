const BASE_URL=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:4173';
const { test, expect } = require('@playwright/test');

async function fresh(page){
  await page.goto(BASE_URL);
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
}
async function createStudent(page,name='Test Student'){
  await fresh(page);
  await expect(page.locator('#profile')).toBeVisible();
  await expect(page.locator('#student-nav')).toBeHidden();
  await page.locator('#student-name').fill(name);
  await page.locator('#save-profile').click();
  await expect(page.locator('#student-nav')).toBeVisible();
  await expect(page.locator('#learn')).toBeVisible();
}
async function targetText(page){
  return (await page.locator('#target').textContent()).replace(/\u00a0/g,' ');
}

test('profile gates the app and Enter starts the student session', async ({ page })=>{
  await fresh(page);
  await page.locator('#student-name').fill('Keyboard Student');
  await page.locator('#student-name').press('Enter');
  await expect(page.locator('#profile')).toBeHidden();
  await expect(page.locator('#student-nav')).toBeVisible();
  await expect(page.locator('#lesson-list [data-lesson]')).toHaveCount(7);
});

test('every lesson opens a fresh typing session with non-empty target text', async ({ page })=>{
  await createStudent(page);
  for(let i=0;i<7;i++){
    await page.locator('[data-view="learn"]').click();
    await page.locator(`[data-lesson="${i}"]`).click();
    await expect(page.locator('#practice')).toBeVisible();
    expect((await targetText(page)).length).toBeGreaterThan(3);
    await expect(page.locator('#accuracy')).toHaveText('100%');
    await expect(page.locator('#mistakes')).toHaveText('0');
    await expect(page.locator('.levels')).toBeHidden();
    await expect(page.locator('#start')).toHaveText('Restart Lesson');
  }
});

test('free Practice stays separate from Learn lesson completion', async ({ page })=>{
  await createStudent(page);
  await page.locator('[data-view="practice"]').click();
  await expect(page.locator('.levels')).toBeVisible();
  await expect(page.locator('#practice-heading')).toHaveText('Practice');
  const target=await targetText(page);
  await page.keyboard.type(target);
  await expect(page.locator('#message')).toContainText('Practice complete');
  await page.locator('[data-view="learn"]').click();
  await expect(page.locator('#lesson-list em')).toHaveCount(0);
});

test('typing continues after a mistake and a single insertion realigns', async ({ page })=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  await page.keyboard.type('asdf');
  await page.keyboard.type('p');
  await expect(page.locator('#mistakes')).toHaveText('1');
  await expect(page.locator('.typed-wrong')).toContainText('p');
  await page.keyboard.type(' ');
  await page.keyboard.type('jkl;');
  await expect(page.locator('#mistakes')).toHaveText('1');
  await expect(page.locator('.reference-current')).toHaveText(' ');
});

test('multiple accidental inserted characters recover instead of cascading', async ({ page })=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  await page.keyboard.type('asdf');
  await page.keyboard.type('pq');
  await expect(page.locator('#mistakes')).toHaveText('2');
  await page.keyboard.type(' ');
  await page.keyboard.type('j');
  await page.keyboard.type('kl;');
  await expect(page.locator('#mistakes')).toHaveText('2');
  await expect(page.locator('.reference-current')).toHaveText(' ');
});

test('restart clears typed output and live stats', async ({ page })=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  await page.keyboard.type('asx');
  await expect(page.locator('#mistakes')).toHaveText('1');
  await page.locator('#start').click();
  await expect(page.locator('#mistakes')).toHaveText('0');
  await expect(page.locator('#accuracy')).toHaveText('100%');
  await expect(page.locator('#typed-display')).toContainText('Start typing here');
});

test('practice below 90 percent retries and a 90-plus retry completes', async ({ page })=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  const target=await targetText(page);

  for(let i=0;i<5;i++){
    await page.keyboard.type('x');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(target[i]);
  }
  await page.keyboard.type(target.slice(5));
  await expect(page.locator('#message')).toContainText('Try again');
  await expect(page.locator('#lesson-list [data-lesson="0"] em')).toHaveCount(0);

  await page.locator('#start').click();
  await page.keyboard.type('x');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(target);
  await expect(page.locator('#message')).toContainText('Practice complete');
  await expect(page.locator('#lesson-list [data-lesson="0"] em')).toContainText('Complete');
});

test('challenge waits for first key, accepts mistakes, and keeps accepting input', async ({ page })=>{
  await createStudent(page);
  await page.locator('[data-view="challenge"]').click();
  await page.locator('#challenge-start').click();
  await expect(page.locator('#challenge-timer')).toBeVisible();
  await expect(page.locator('#timer-seconds')).toHaveText('60');
  await page.waitForTimeout(1100);
  await expect(page.locator('#timer-seconds')).toHaveText('60');

  await page.keyboard.type('X');
  await expect(page.locator('#mistakes')).toHaveText('1');
  await page.keyboard.type('Practice');
  await expect(page.locator('#typed-display')).toContainText('Practice');
  await page.waitForTimeout(1200);
  const seconds=Number(await page.locator('#timer-seconds').textContent());
  expect(seconds).toBeLessThan(60);
  expect(seconds).toBeGreaterThanOrEqual(58);
});

test('leaving a running challenge stops its timer', async ({ page })=>{
  await createStudent(page);
  await page.locator('[data-view="challenge"]').click();
  await page.locator('#challenge-start').click();
  await page.keyboard.type('P');
  await page.waitForTimeout(1100);
  const before=Number(await page.locator('#timer-seconds').textContent());
  await page.locator('[data-view="learn"]').click();
  await page.waitForTimeout(1300);
  const after=Number(await page.locator('#timer-seconds').textContent());
  expect(after).toBe(before);
});

test('saved progress is deduplicated and stored results are bounded', async ({ page })=>{
  await page.addInitScript(()=>{
    localStorage.setItem('bc-keyboard',JSON.stringify({
      name:'Returning Student',
      completed:[0,0,1,99,-1,'2'],
      last:{wpm:-5,accuracy:999},
      best:{wpm:22.4,accuracy:98.6}
    }));
  });
  await page.goto(BASE_URL);
  await expect(page.locator('#profile')).toBeHidden();
  await page.locator('[data-view="progress"]').click();
  await expect(page.locator('#progress-content')).toContainText('2 of 7 lessons completed');
  await expect(page.locator('#progress-content')).toContainText('Last result: 0 WPM · 100% accuracy');
  await expect(page.locator('#progress-content')).toContainText('Best challenge results: Fastest 22 WPM · Highest 99% accuracy');
});

test('primitive or corrupt saved state cannot crash the app', async ({ page })=>{
  await page.goto(BASE_URL);
  await page.evaluate(()=>localStorage.setItem('bc-keyboard','"broken-state"'));
  await page.reload();
  await expect(page.locator('#profile')).toBeVisible();
  await expect(page.locator('#student-nav')).toBeHidden();
  await page.locator('#student-name').fill('Recovered');
  await page.locator('#save-profile').click();
  await expect(page.locator('#learn')).toBeVisible();
});

test('Letter Rain accepts input and stops animating after navigation', async ({ page })=>{
  await createStudent(page);
  await page.locator('[data-view="games"]').click();
  await page.locator('[data-game="rain"]').click();
  const key=(await page.locator('#game-board').textContent()).trim().slice(-1);
  await page.keyboard.type(key);
  await expect(page.locator('#game-score')).toHaveText('1');
  await page.waitForTimeout(450);
  const before=await page.locator('#game-board').innerHTML();
  await page.locator('[data-view="learn"]').click();
  await page.waitForTimeout(900);
  const after=await page.locator('#game-board').innerHTML();
  expect(after).toBe(before);
});

test('Bubble Pop and Rocket Race accept their displayed keys', async ({ page })=>{
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

test('new student reset clears saved classroom progress only after confirmation', async ({ page })=>{
  await createStudent(page,'Student One');
  await page.locator('[data-view="progress"]').click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#new-student').click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('#profile')).toBeVisible();
  await expect(page.locator('#student-nav')).toBeHidden();
  expect(await page.evaluate(()=>localStorage.getItem('bc-keyboard'))).toBeNull();
});

test('mobile-width page does not create horizontal overflow', async ({ page })=>{
  await page.setViewportSize({width:390,height:844});
  await createStudent(page);
  const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client+1);
});
