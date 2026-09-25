const BASE_URL=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:4173';
const { test, expect } = require('@playwright/test');

async function createStudent(page,name='Test Student'){
  await page.goto(BASE_URL);
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await expect(page.locator('#profile')).toBeVisible();
  await expect(page.locator('#student-nav')).toBeHidden();
  await page.locator('#student-name').fill(name);
  await page.locator('#save-profile').click();
  await expect(page.locator('#student-nav')).toBeVisible();
  await expect(page.locator('#learn')).toBeVisible();
}

test('profile gates the classroom app until a student starts', async ({ page })=>{
  await createStudent(page);
  await expect(page.locator('#profile')).toBeHidden();
  await expect(page.locator('#lesson-list [data-lesson]')).toHaveCount(7);
});

test('wrong key locks once and requires Backspace before continuing', async ({ page })=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  await page.keyboard.type('asdf');
  await page.keyboard.press('p');
  await expect(page.locator('#mistakes')).toHaveText('1');
  await expect(page.locator('.typed-wrong')).toHaveText('p');
  await page.keyboard.type('xyz');
  await expect(page.locator('#mistakes')).toHaveText('1');
  await expect(page.locator('.typed-wrong')).toHaveText('p');
  await page.keyboard.press('Backspace');
  await expect(page.locator('.typed-wrong')).toHaveCount(0);
  await page.keyboard.press('Space');
  await page.keyboard.press('j');
  await expect(page.locator('.reference-current')).toHaveText('k');
});

test('practice below 90 percent retries and clean retry can complete', async ({ page })=>{
  await createStudent(page);
  await page.locator('[data-lesson="0"]').click();
  const target=(await page.locator('#target').textContent()).replace(/\u00a0/g,' ');

  for(let i=0;i<5;i++){
    await page.keyboard.press('x');
    await page.keyboard.press('Backspace');
    await page.keyboard.press(target[i]);
  }
  await page.keyboard.type(target.slice(5));
  await expect(page.locator('#message')).toContainText('Try again');
  await expect(page.locator('#lesson-list [data-lesson="0"] em')).toHaveCount(0);

  await page.locator('#start').click();
  await page.keyboard.press('x');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(target);
  await expect(page.locator('#message')).toContainText('Practice complete');
  await expect(page.locator('#lesson-list [data-lesson="0"] em')).toContainText('Complete');
});

test('challenge waits for first key before countdown starts', async ({ page })=>{
  await createStudent(page);
  await page.locator('[data-view="challenge"]').click();
  await page.locator('#challenge-start').click();
  await expect(page.locator('#challenge-timer')).toBeVisible();
  await expect(page.locator('#timer-seconds')).toHaveText('60');
  await page.waitForTimeout(1200);
  await expect(page.locator('#timer-seconds')).toHaveText('60');
  await page.keyboard.press('P');
  await page.waitForTimeout(1200);
  const seconds=Number(await page.locator('#timer-seconds').textContent());
  expect(seconds).toBeLessThan(60);
  expect(seconds).toBeGreaterThanOrEqual(58);
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
  await expect(page.locator('#progress-content')).toContainText('Best 1-minute challenge: 22 WPM · 99%');
});

test('leaving Letter Rain stops its animation loop', async ({ page })=>{
  await createStudent(page);
  await page.locator('[data-view="games"]').click();
  await page.locator('[data-game="rain"]').click();
  await page.waitForTimeout(450);
  const before=await page.locator('#game-board').innerHTML();
  await page.locator('[data-view="learn"]').click();
  await page.waitForTimeout(900);
  const after=await page.locator('#game-board').innerHTML();
  expect(after).toBe(before);
});
