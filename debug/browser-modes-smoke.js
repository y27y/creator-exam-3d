import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

function sourceBlock(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `missing start token: ${startToken}`);
  const end = source.indexOf(endToken, start + startToken.length);
  assert.notEqual(end, -1, `missing end token: ${endToken}`);
  return source.slice(start, end);
}

const mainHtml = read('public/index.html');
const mainGame = read('public/js/game.js');
const mainCss = read('public/styles.css');
const towerHtml = read('public/modes/tower-defense/index.html');
const towerBridge = read('public/modes/tower-defense/towerBridge.js');
const towerArt = read('public/modes/tower-defense/nightWatchArt.js');
const airHtml = read('public/modes/air-combat/index.html');
const airBridge = read('public/modes/air-combat/airCombatBridge.js');
const airGame = read('public/modes/air-combat/airCombatGame.js');
const airAssets = read('public/modes/air-combat/airCombatAssets.js');
const airCss = read('public/modes/air-combat/style.css');
const nightWatchSlides = sourceBlock(towerBridge, '  function cutsceneSlides() {', '  function showNightWatchCinematic() {');
const airBriefingSlides = sourceBlock(airBridge, '  function briefingSlides() {', '  function difficulty() {');
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
assert.ok(mainCss.includes('.cinematic[data-cinematic^="airspace-bridge-"] .cinematic-art'), 'main cinematic should render the generated airspace bridge art');
assert.ok(mainCss.includes('var(--cinematic-image)'), 'main cinematic should consume its runtime art URL');

for (const id of [
  'select-map-btn',
  'start-game-from-map-btn',
  'start-wave-btn',
  'night-watch-causes',
  'night-watch-buff-choices'
]) {
  assert.ok(towerHtml.includes(`id="${id}"`) || towerBridge.includes(`id="${id}"`), `Night Watch should expose #${id}`);
}
assert.ok(towerHtml.includes('id="highlight-protocol-btn"'), 'Night Watch should expose the highlight protocol button');
assert.ok(towerHtml.includes("highlight-protocol-core.png"), 'Night Watch highlight protocol should use the generated rift-core emblem');
assert.ok(towerHtml.includes('enemy.takeDamage(Math.max(enemy.hp, enemy.maxHp) * 2'), 'Night Watch highlight protocol should execute active enemies');
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
assert.equal((nightWatchSlides.match(/artPosition:/g) || []).length, 4, 'Night Watch should explain the finale across four CG pages');
for (const position of ['0% 50%', '34% 50%', '64% 50%', '100% 50%']) {
  assert.ok(towerBridge.includes(position), `Night Watch should include crop ${position}`);
}
for (const phrase of ['地面终考', '长夜六更', '第七日']) {
  assert.ok(nightWatchSlides.includes(phrase), `Night Watch four-page CG should include ${phrase}`);
}
assert.ok(towerHtml.includes('<script src="nightWatchArt.js"></script>'), 'Night Watch should load its local tower-art adapter');
for (const asset of ['tower-assault.webp', 'tower-control.webp', 'tower-support.webp']) {
  assert.ok(towerArt.includes(`../../assets/art/towers/${asset}`), `Night Watch tower art should use ${asset}`);
}
assert.ok(towerArt.includes("entry.status === 'ready'") && towerArt.includes('return false'), 'Night Watch art should report unavailable images without blocking setup');
assert.ok(towerHtml.includes("if (!rendered && typeof fallbackDraw === 'function') fallbackDraw(portraitCtx)"), 'Night Watch tower portraits should retain procedural fallback drawing');
assert.ok(airCss.includes('../../assets/art/cg-airspace-bridge.webp'), 'Air briefing should use the local bridge CG');
assert.ok(airCss.includes('filter: saturate(.78) contrast(1.04) brightness(.94)'), 'Air combat should color-grade the inherited sci-fi canvas toward the finale palette');
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
assert.ok(airHtml.includes('id="airspace-highlight"') && airHtml.includes('data-tutorial-bailout="true"'), 'Air Combat should retain a tutorial bailout control');
assert.ok(airGame.includes("const showTutorialBailout = bridge.isTutorialMode?.() === true && inGame"), 'Air Combat bailout should only appear during tutorial combat');
assert.ok(airCss.includes("highlight-protocol-core.png"), 'Air Combat highlight protocol should use the generated rift-core emblem');
assert.ok(airGame.includes('if (game.highlightInvulnerable)'), 'Air Combat highlight protocol should prevent player damage');
assert.ok(airGame.includes('window.activateAirspaceHighlightProtocol = activateAirspaceHighlightProtocol'), 'Air Combat should also expose its bailout API for recovery automation');
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
assert.equal((airBriefingSlides.match(/phase:/g) || []).length, 4, 'Air Combat should explain the finale across four briefing pages');
for (const phase of ['ground-exam', 'night-watch', 'carrier-rise', 'seventh-day']) {
  assert.ok(airBriefingSlides.includes(`phase: '${phase}'`), `Air Combat briefing should include ${phase}`);
}
assert.ok(airHtml.includes('id="airspace-bridge-cg"') && airHtml.includes('id="airspace-briefing-progress"'), 'Air Combat should expose its bridge CG and four-step progress');
assert.ok(airGame.includes("briefingCg.addEventListener('error', () => markBriefingCg('fallback'))"), 'Air Combat should mark a broken bridge CG for fallback rendering');
assert.ok(airCss.includes('.airspace-briefing-visual[data-cg-state="fallback"] img'), 'Air Combat should preserve its gradient plate when the CG is unavailable');
for (const asset of ['rift-carrier.webp', 'lantern-wingman.webp']) {
  assert.ok(airAssets.includes(`../../assets/art/ships/${asset}`), `Air Combat should use ${asset}`);
}
assert.ok(airGame.includes('if (!textured)') && airGame.includes('const texturedWingman = assets?.draw'), 'Air Combat should retain procedural ship and wingman fallbacks');
assert.ok(!airGame.includes('assets?.load();'), 'Air Combat must not load the full manifest at module start');
assert.ok(airAssets.includes('prepareStages(current, next = null)'), 'Air assets should expose current/next preparation');
assert.ok(airGame.includes('assetPlanForSegment(index)'), 'Air game should derive a stage plan from the route');
assert.ok(airGame.includes('this.prepareSegmentAssets(this.segmentIndex)'), 'segment changes should refresh the current/next cache');
assert.ok(airGame.includes('const pool = enemyPoolForStage(stage)'), 'spawning and art planning should share the stage pool');
assert.ok(airGame.includes('includeWingman: (this.difficulty.allyWings || 0) > 0'), 'asset plans should preload wingmen exactly when Player draws allied wings');
assert.ok(airGame.includes("if (enemyTypes.has('splitter')) enemyTypes.add('small');"), 'splitter plans should include their spawned small-enemy art');
assert.ok(airGame.includes("if (enemyTypes.has('carrier')) enemyTypes.add('medium');"), 'carrier plans should include their spawned medium-enemy art');
assert.ok(airGame.includes('if (assets && index !== undefined && index !== null) return assets.boss(index)'), 'managed Boss art should not trigger a duplicate fallback request');

for (const asset of [
  'public/assets/art/cg-night-watch.webp',
  'public/assets/art/cg-airspace-bridge.webp',
  'public/assets/art/towers/tower-assault.webp',
  'public/assets/art/towers/tower-control.webp',
  'public/assets/art/towers/tower-support.webp',
  'public/assets/art/ships/rift-carrier.webp',
  'public/assets/art/ships/lantern-wingman.webp'
]) {
  assert.ok(existsSync(new URL(`../${asset}`, import.meta.url)), `missing local finale art ${asset}`);
}

console.log('Browser mode smoke harness tests passed.');
