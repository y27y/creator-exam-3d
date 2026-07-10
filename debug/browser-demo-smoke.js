import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function sourceBlock(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `missing start token: ${startToken}`);
  const end = source.indexOf(endToken, start + startToken.length);
  assert.notEqual(end, -1, `missing end token: ${endToken}`);
  return source.slice(start, end);
}

const gameSource = readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8');
const abilitySource = readFileSync(new URL('../public/js/abilities.js', import.meta.url), 'utf8');
const particleSource = readFileSync(new URL('../public/js/particles.js', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const smokeBlock = sourceBlock(gameSource, '  async runBrowserDemoSmoke(options = {}) {', '  demoCard(ability) {');
const pointerBlock = sourceBlock(gameSource, '  onPointerDown(event) {', '  placeCreation(x, y) {');
const loadLevelBlock = sourceBlock(gameSource, '  loadLevel(index) {', '  applyDebugGate(search = window.location.search) {');
const environmentConfigBlock = sourceBlock(gameSource, 'const LEVEL_ENVIRONMENTS = Object.freeze({', 'const ABILITY_COLORS = {');
const environmentMethodsBlock = sourceBlock(gameSource, '  clearLevelEnvironment() {', '  renderWorld() {');
const bridgeBlock = sourceBlock(gameSource, '  bindBrowserDemoSmokeBridge() {', '  // Override loadLevel to add browser-specific initialization');
const showCardBlock = sourceBlock(gameSource, '  showCard(card) {', '  startPlacement() {');
const startPlacementBlock = sourceBlock(gameSource, '  startPlacement() {', '  onPointerDown(event) {');
const failLevelBlock = sourceBlock(gameSource, '  failLevel(message) {', '  showModal(title, text, primary, secondary) {');
const showModalBlock = sourceBlock(gameSource, '  showModal(title, text, primary, secondary) {', '  nextLevel() {');
const handleLoseBlock = sourceBlock(gameSource, '  handleLose(message) {', '  handleRescue(unit) {');
const airResultBlock = sourceBlock(gameSource, '  applyAirCombatResult(result) {', '  renderAirCombatPanel() {');
const cinematicKeyBlock = sourceBlock(gameSource, "    this.ui.cinematic?.addEventListener('keydown', event => {", '    for (const button of this.ui.drawerButtons) {');
const turnPendingBlock = sourceBlock(gameSource, '  setTurnControlsPending(pending) {', '  releaseTurnResolutionLock() {');
const shellCssStart = cssSource.indexOf('/* ===== Map-first shell and context drawers ===== */');
assert.notEqual(shellCssStart, -1, 'missing map-first shell CSS override');
const shellCss = cssSource.slice(shellCssStart);

for (const asset of ['cg-prologue.webp', 'cg-ending.webp']) {
  assert.ok(gameSource.includes(asset) || cssSource.includes(asset), `main flow should use ${asset}`);
}
assert.ok(htmlSource.includes('id="cinematic"'), 'main page should expose a fixed cinematic dialog');
assert.ok(gameSource.includes("creatorExamPrologueSeen"), 'prologue should be session-scoped');
const airResultAdd = airResultBlock.indexOf('this.processedAirCombatResults.add(result.id)');
const endingCall = 'this.showEndingCinematic(result)';
assert.notEqual(airResultAdd, -1, 'air result should enter the first-result branch');
assert.equal((airResultBlock.match(/this\.showEndingCinematic\(result\)/g) || []).length, 1, 'air result should open one ending plate');
assert.ok(airResultBlock.indexOf(endingCall) > airResultAdd, 'ending plate should only open after first-result dedupe');
assert.ok(
  turnPendingBlock.includes('!pending && this.ui?.cinematic && !this.ui.cinematic.hidden')
    && turnPendingBlock.includes('this.cinematicWasResolving = false'),
  'cinematic lock snapshot should follow asynchronous turn unlocks'
);
for (const contract of ["event.key === 'Tab'", 'event.shiftKey', 'document.activeElement', 'this.ui.cinematicSkip', 'this.ui.cinematicPrimary']) {
  assert.ok(cinematicKeyBlock.includes(contract), `main cinematic should trap focus with ${contract}`);
}

for (const levelId of ['flood-village', 'night-mine', 'giant-city', 'wordless-war', 'memory-plague', 'final-exam']) {
  assert.ok(environmentConfigBlock.includes(`'${levelId}'`), `environment config should include ${levelId}`);
}
assert.ok(
  loadLevelBlock.indexOf('this.applyLevelEnvironment(this.level.id)') > loadLevelBlock.indexOf('super.loadLevel(index)'),
  'loadLevel should reconcile clamped or invalid indexes after super'
);
assert.ok(loadLevelBlock.includes('const targetLevelId = LEVELS[index]?.id'), 'loadLevel should safely resolve the requested environment');
assert.ok(
  loadLevelBlock.indexOf('if (targetLevelId) this.applyLevelEnvironment(targetLevelId)') >= 0
    && loadLevelBlock.indexOf('if (targetLevelId) this.applyLevelEnvironment(targetLevelId)') < loadLevelBlock.indexOf('super.loadLevel(index)'),
  'loadLevel should apply valid environments before the first super callback render'
);
assert.ok(gameSource.includes('this.environmentGroup.userData.levelId = levelId'), 'environment should publish the active level id');
assert.ok(smokeBlock.includes("'all six level environments install decorative geometry'"), 'live smoke should inspect all six environments');
assert.ok(
  smokeBlock.indexOf("'all six level environments install decorative geometry'") < smokeBlock.indexOf('return tacticalResult'),
  'live environment check must run before the reachable tactical smoke return'
);
assert.ok(pointerBlock.includes('Array.from(this.tileMeshPool.values())'), 'pointer raycasts should remain limited to tile meshes');
assert.ok(!pointerBlock.includes('environmentGroup'), 'decorative environments must stay out of pointer raycasts');
assert.doesNotMatch(environmentMethodsBlock, /\b(?:tileMeshes|tileMeshPool|unitMeshPool|creationMeshPool)\b/, 'environment methods must stay out of gameplay mesh pools');
assert.ok(!environmentMethodsBlock.includes('.dispose('), 'environment clearing must preserve shared cached resources');

for (const check of [
  'solid level environment props stay outside the board',
  'level loads apply environments before first render'
]) {
  assert.ok(smokeBlock.includes(`'${check}'`), `missing live smoke check: ${check}`);
  assert.ok(smokeBlock.indexOf(`'${check}'`) < smokeBlock.indexOf('return tacticalResult'), `${check} must run before the reachable tactical smoke return`);
}

for (const family of ['water', 'light', 'terrain', 'defense', 'mind', 'special']) {
  assert.ok(abilitySource.includes(`'${family}'`), `ability map should include ${family}`);
}
for (const family of ['water', 'light', 'terrain', 'defense', 'mind']) {
  assert.ok(gameSource.includes(`visual.family === '${family}'`), `creation meshes should render ${family}`);
}
assert.ok(gameSource.includes('group.userData.visualFamily = visual.family'), 'creation meshes should publish the selected family');
assert.ok(particleSource.includes('getAbilityVisualFamily(ability)'), 'particles should use the canonical family mapping');
assert.ok(particleSource.includes('.clone()'), 'cached particle templates should be cloned per effect');
assert.ok(particleSource.includes('this.maxParticles = 1000'), 'particle cap must remain unchanged');

for (const check of [
  'all six ability families render through creation mesh',
  'family creations retain one icosahedron core',
  'consume_light preserves absorption visual override'
]) {
  assert.ok(smokeBlock.includes(`'${check}'`), `missing live smoke check: ${check}`);
}

const missingShellContracts = [
  ['mobile drawer resets legacy height', /@media \(max-width: 760px\)\s*\{[\s\S]*?#right-panel\s*\{[^}]*height:\s*auto;[^}]*max-height:\s*none;[^}]*\}/],
  ['desktop drawer reserves creation dock space', /#right-panel\s*\{[^}]*bottom:\s*calc\(var\(--dock-height\)\s*\+\s*28px\);[^}]*height:\s*auto;[^}]*max-height:\s*none;/],
  ['topbar menu escapes clipping', /#topbar\s*\{[^}]*overflow:\s*visible;[^}]*clip-path:\s*none;/],
  ['glass override clears legacy effects', /\.glass\s*\{[^}]*background:\s*rgba\(21,\s*25,\s*35,\s*\.96\);[^}]*box-shadow:\s*none;[^}]*backdrop-filter:\s*none;[^}]*-webkit-backdrop-filter:\s*none;/],
  ['desktop creation dock permits the card preview to escape', /@media \(min-width: 761px\)\s*\{[\s\S]*?#creation-dock\s*\{[^}]*overflow:\s*visible;[^}]*clip-path:\s*none;[^}]*\}/],
  ['desktop card preview remains usable above the dock', /@media \(min-width: 761px\)\s*\{[\s\S]*?#creation-dock #card-panel\s*\{[^}]*position:\s*absolute;[^}]*bottom:\s*calc\(100%\s*\+\s*10px\);[^}]*max-height:\s*calc\(100vh\s*-\s*var\(--dock-height\)\s*-\s*112px\);[^}]*overflow:\s*auto;[^}]*pointer-events:\s*auto;[^}]*\}/],
  ['placement mode removes the card preview from the map', /#creation-dock #card-panel\.placement-collapsed\s*\{[^}]*display:\s*none;[^}]*\}/]
].filter(([, pattern]) => !pattern.test(shellCss)).map(([name]) => name);

assert.deepEqual(missingShellContracts, [], `missing map-first CSS contracts: ${missingShellContracts.join(', ')}`);
assert.ok(showCardBlock.includes('this.placementMode = false'), 'compiling a new card should exit the previous placement mode');
assert.ok(showCardBlock.includes("classList.remove('placement-collapsed')"), 'a new card should restore its preview');
assert.ok(startPlacementBlock.includes("classList.add('placement-collapsed')"), 'placement mode should collapse the card away from the map');
assert.ok(failLevelBlock.includes("this.showModal('考核失败', message, '重试', null)"), 'failure should expose one retry action');
assert.ok(handleLoseBlock.includes("this.showModal('考核失败', message, '重试', null)"), 'loss hook should expose one retry action');
assert.ok(showModalBlock.includes('this.ui.modalSecondary.hidden = !showSecondary'), 'modal should hide unused secondary actions');

for (const id of [
  'creation-input', 'compile-btn', 'place-btn', 'end-turn-btn',
  'creation-dock', 'drawer-rail', 'right-panel',
  'drawer-people', 'drawer-world', 'drawer-systems', 'world-signal'
]) {
  assert.equal(
    (htmlSource.match(new RegExp(`id="${id}"`, 'g')) || []).length,
    1,
    `missing or duplicated UI id: ${id}`
  );
}

for (const check of [
  'context drawers are mutually exclusive',
  'drawer Escape restores focus',
  'debug gate hides normal URL and shows ?debug=1'
]) {
  assert.ok(smokeBlock.includes(`'${check}'`), `missing live smoke check: ${check}`);
}

for (const check of [
  'drawer notifications dedupe stable ids',
  'drawer notifications merge by turn and target',
  'world signal opens legend and clears unread',
  'actionable drawer notice survives opening until ignored'
]) {
  assert.ok(smokeBlock.includes(`'${check}'`), `missing live smoke check: ${check}`);
}

assert.ok(gameSource.includes('notifyDrawer(name, notice)'), 'game should expose the drawer notice helper');
assert.ok(gameSource.includes('worldLegendSystem.myths.values()'), 'legend notifications must scan every myth, not only the top three');

assert.ok(cssSource.includes('@media (max-width: 760px)'), 'UI should define the approved mobile breakpoint');
assert.match(
  cssSource,
  /#right-panel\[hidden\]\s*\{\s*display:\s*none;/,
  'closed drawer must remain hidden despite the legacy display rule'
);

assert.match(
  htmlSource,
  /id="test-jump-panel"[^>]*\bhidden\b/,
  'test sandbox must be hidden in markup'
);
assert.ok(
  gameSource.includes('applyDebugGate(search = window.location.search)'),
  'game should gate the sandbox from the URL query'
);
assert.ok(
  gameSource.includes("new URLSearchParams(search).get('debug') === '1'"),
  'only ?debug=1 should reveal the sandbox'
);

assert.ok(htmlSource.includes('id="test-browser-smoke-btn"'), 'browser UI should expose a clickable smoke button in the sandbox panel');
assert.ok(gameSource.includes('handleBrowserDemoSmokeClick()'), 'browser game should handle smoke button clicks');
assert.ok(gameSource.includes('this.bindBrowserDemoSmokeBridge()'), 'browser game should install smoke bridge during startup');
assert.ok(bridgeBlock.includes("addEventListener('creator-demo-smoke'"), 'browser smoke should be invokable through a DOM event');
assert.ok(bridgeBlock.includes('dataset.browserDemoSmoke'), 'browser smoke bridge should publish JSON results in the DOM dataset');

assert.ok(smokeBlock.includes('button.click()'), 'browser smoke should trigger the real Advanced panel button path');
assert.ok(smokeBlock.includes('dataset?.debugState'), 'browser smoke should read DOM-visible debug state');
assert.ok(smokeBlock.includes('AI tactical room exposes 8 mechanism cards'), 'browser smoke should verify the tactical room card count');
assert.ok(smokeBlock.includes('AI tactical director is visible and contextual'), 'browser smoke should verify the AI tactical director');
assert.ok(smokeBlock.includes('AI tactical room enforces per-turn interference budget'), 'browser smoke should verify tactical action budget gating');
assert.ok(smokeBlock.includes('AI tactical cards show concrete targets and budget'), 'browser smoke should verify target and budget text');

for (const actionId of [
  'refresh-intent',
  'prepare-chain',
  'perform-ritual',
  'form-oath',
  'manifest-echo',
  'generate-riddle',
  'submit-riddle',
  'trigger-corruption',
  'modify-workshop'
]) {
  assert.ok(smokeBlock.includes(`'${actionId}'`), `browser smoke should cover ${actionId}`);
}

for (const mechanism of [
  '敌方意图预览',
  '连锁反应',
  '仪式熔炉',
  '言灵誓约',
  '裂隙回响',
  '认知深渊',
  '验证腐化',
  '造物者工坊'
]) {
  assert.ok(smokeBlock.includes(`'${mechanism}'`), `browser smoke should cover tactical mechanism ${mechanism}`);
}

assert.ok(smokeBlock.includes('renderEnemyIntentPanel()'), 'browser smoke should render enemy intent panel');
assert.ok(smokeBlock.includes('renderIntentArrows()'), 'browser smoke should render intent arrows');
assert.ok(smokeBlock.includes('summarizeTacticalBoard()'), 'browser smoke should compare board state before/after tactical cards');
assert.ok(smokeBlock.includes('resetTacticalBudgetForSmoke()'), 'browser smoke may reset budget between coverage clicks after separately testing the real budget gate');

console.log('Browser demo smoke harness tests passed.');
