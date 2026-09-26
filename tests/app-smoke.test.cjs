const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const build='core-v3-20260926-2';

const requiredIds=[
  'profile','student-name','save-profile','student-nav','learn','lesson-list',
  'practice','practice-heading','challenge-timer','timer-seconds','target',
  'typed-display','message','wpm','accuracy','mistakes','start','challenge',
  'challenge-start','best-wpm','best-accuracy','games','game-play','game-title',
  'game-instructions','game-board','game-score','game-streak','game-message',
  'game-restart','progress','progress-content','new-student'
];

for(const id of requiredIds){
  assert.match(html,new RegExp(`id=["']${id}["']`),`missing #${id} in index.html`);
}

const ids=[...html.matchAll(/id=["']([^"']+)["']/g)].map(m=>m[1]);
const duplicates=ids.filter((id,i)=>ids.indexOf(id)!==i);
assert.deepEqual([...new Set(duplicates)],[],'duplicate HTML ids found');

for(const file of ['css/style.css','js/engine.js','js/bigchange.js','js/games.js']){
  assert.ok(fs.existsSync(path.join(root,file)),`missing local asset ${file}`);
  assert.ok(html.includes(`${file}?v=${build}`),`asset ${file} is missing cache-busting build version`);
}

assert.ok(html.includes(`meta name="bigchange-build" content="${build}"`),'missing V3 build marker');

for(const view of ['learn','practice','challenge','games','progress']){
  assert.match(html,new RegExp(`data-view=["']${view}["']`),`missing navigation button for ${view}`);
}

console.log('✓ application DOM smoke checks passed');
