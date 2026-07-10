import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

const mainHtml = read('public/index.html');
const mainGame = read('public/js/game.js');
const towerHtml = read('public/modes/tower-defense/index.html');
const towerBridge = read('public/modes/tower-defense/towerBridge.js');
const airHtml = read('public/modes/air-combat/index.html');
const airBridge = read('public/modes/air-combat/airCombatBridge.js');
const airGame = read('public/modes/air-combat/airCombatGame.js');
const airAssets = read('public/modes/air-combat/airCombatAssets.js');
const airCss = read('public/modes/air-combat/style.css');
const nightWatchKeyStart = towerBridge.indexOf("overlay.addEventListener('keydown', event => {");
const nightWatchKeyEnd = towerBridge.indexOf('    });', nightWatchKeyStart);
const nightWatchKeyBlock = towerBridge.slice(nightWatchKeyStart, nightWatchKeyEnd);

for (const id of ['test-night-watch-btn', 'test-air-combat-btn']) {
  assert.ok(mainHtml.includes(`id="${id}"`), `main page should expose #${id}`);
}
assert.ok(mainGame.includes('openNightWatchTestMode()'), 'main game should route Night Watch test entry in-page');
assert.ok(mainGame.includes('openAirCombatMode({ testEntry: true })'), 'main game should route Air Combat test entry in-page');
assert.ok(mainGame.includes("localStorage.setItem('creatorExamNightWatchContext'"), 'main game should publish Night Watch context');
assert.ok(mainGame.includes("localStorage.setItem('creatorExamAirCombatContext'"), 'main game should publish Air Combat context');

for (const id of [
  'select-map-btn',
  'start-game-from-map-btn',
  'start-wave-btn',
  'night-watch-causes',
  'night-watch-buff-choices'
]) {
  assert.ok(towerHtml.includes(`id="${id}"`) || towerBridge.includes(`id="${id}"`), `Night Watch should expose #${id}`);
}
assert.ok(towerBridge.includes("CONTEXT_KEY = 'creatorExamNightWatchContext'"), 'Night Watch should read the main-game context key');
assert.ok(towerBridge.includes("RESULT_KEY = 'creatorExamNightWatchResult'"), 'Night Watch should publish the result key');
assert.ok(towerBridge.includes("document.body.dataset.mode = 'night-watch'"), 'Night Watch should mark the page mode');
assert.ok(towerBridge.includes("dataset.nightWatchReady = 'true'"), 'Night Watch should publish a ready marker for browser smoke');
assert.ok(towerBridge.includes('getBuffChoices') && towerBridge.includes('selectBuffChoice'), 'Night Watch should expose buff selection hooks');
assert.ok(towerBridge.includes('complete,'), 'Night Watch bridge should expose completion for result verification');
assert.ok(towerHtml.includes('function startRandomNightWatchMap()'), 'Night Watch test path should start its default map directly');
assert.ok(towerHtml.includes('window.NightWatchBridge?.complete?.(isVictory'), 'Night Watch game should publish settlement through the bridge');
assert.ok(towerHtml.includes('startWaveBtn.onclick = spawnWave'), 'Night Watch should expose the real wave button path');
assert.ok(towerBridge.includes('../../assets/art/cg-night-watch.webp'), 'Night Watch should use the local panorama');
for (const position of ['0% 50%', '50% 50%', '100% 50%']) {
  assert.ok(towerBridge.includes(position), `Night Watch should include crop ${position}`);
}
assert.ok(airCss.includes('../../assets/art/cg-airspace-bridge.webp'), 'Air briefing should use the local bridge CG');
assert.match(
  towerBridge,
  /\.night-watch-cg\s*\{[^}]*min-height:\s*min\(380px, calc\(100dvh - 56px\)\);[^}]*max-height:\s*calc\(100dvh - 56px\);[^}]*grid-template-rows:\s*minmax\(0, 1fr\) auto;/s,
  'Night Watch cinematic should keep its footer inside short viewports'
);
assert.match(
  towerBridge,
  /\.night-watch-cg-frame\s*\{[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;/s,
  'Night Watch cinematic frame should scroll while the footer stays visible'
);
assert.ok(towerBridge.includes('min-height: min(330px, calc(100dvh - 56px));'), 'Night Watch compact height should respect short viewports');
for (const contract of ["event.key === 'Tab'", 'event.shiftKey', 'document.activeElement', "'[data-cg-skip]'", "'[data-cg-next]'"]) {
  assert.ok(nightWatchKeyBlock.includes(contract), `Night Watch cinematic should trap focus with ${contract}`);
}

for (const id of [
  'airspace-start',
  'airspace-choices',
  'airspace-hud',
  'hud-stage',
  'hud-affix',
  'airspace-result'
]) {
  assert.ok(airHtml.includes(`id="${id}"`), `Air Combat should expose #${id}`);
}
assert.ok(airBridge.includes("CONTEXT_KEY = 'creatorExamAirCombatContext'"), 'Air Combat should read the main-game context key');
assert.ok(airBridge.includes("RESULT_KEY = 'creatorExamAirCombatResult'"), 'Air Combat should publish the result key');
assert.ok(airBridge.includes('publishResult'), 'Air Combat bridge should expose result publishing');
assert.ok(airBridge.includes('weaponOptions') && airBridge.includes('selectWeaponOption'), 'Air Combat should expose weapon choice hooks');
assert.ok(airGame.includes('renderWeaponChoices()'), 'Air Combat should render weapon choices before combat');
assert.ok(airGame.includes('className = `airspace-choice'), 'Air Combat choices should use stable .airspace-choice buttons');
assert.ok(airGame.includes('advanceBriefing()'), 'Air Combat should advance through briefing with the start button');
assert.ok(airGame.includes('startBtn.addEventListener'), 'Air Combat should wire the real start button');
assert.ok(airGame.includes("this.finish('victory')"), 'Air Combat should have a finite victory path');
assert.ok(airGame.includes("document.documentElement.dataset.airCombatReady = 'true'"), 'Air Combat should publish a ready marker');
assert.ok(airGame.includes('window.airCombatGame = game'), 'Air Combat should expose the runtime for browser smoke settlement');
assert.ok(!airGame.includes('assets?.load();'), 'Air Combat must not load the full manifest at module start');
assert.ok(airAssets.includes('prepareStages(current, next = null)'), 'Air assets should expose current/next preparation');
assert.ok(airGame.includes('assetPlanForSegment(index)'), 'Air game should derive a stage plan from the route');
assert.ok(airGame.includes('this.prepareSegmentAssets(this.segmentIndex)'), 'segment changes should refresh the current/next cache');
assert.ok(airGame.includes('const pool = enemyPoolForStage(stage)'), 'spawning and art planning should share the stage pool');
assert.ok(airGame.includes('includeWingman: (this.difficulty.allyWings || 0) > 0'), 'asset plans should preload wingmen exactly when Player draws allied wings');
assert.ok(airGame.includes("if (enemyTypes.has('splitter')) enemyTypes.add('small');"), 'splitter plans should include their spawned small-enemy art');
assert.ok(airGame.includes("if (enemyTypes.has('carrier')) enemyTypes.add('medium');"), 'carrier plans should include their spawned medium-enemy art');
assert.ok(airGame.includes('if (assets && index !== undefined && index !== null) return assets.boss(index)'), 'managed Boss art should not trigger a duplicate fallback request');

console.log('Browser mode smoke harness tests passed.');
