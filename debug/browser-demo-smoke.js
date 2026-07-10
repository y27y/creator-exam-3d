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
const htmlSource = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const smokeBlock = sourceBlock(gameSource, '  async runBrowserDemoSmoke(options = {}) {', '  demoCard(ability) {');
const bridgeBlock = sourceBlock(gameSource, '  bindBrowserDemoSmokeBridge() {', '  // Override loadLevel to add browser-specific initialization');

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
