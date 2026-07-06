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

assert.ok(htmlSource.includes('id="test-browser-smoke-btn"'), 'browser UI should expose a clickable smoke button in the sandbox panel');
assert.ok(gameSource.includes('handleBrowserDemoSmokeClick()'), 'browser game should handle smoke button clicks');
assert.ok(gameSource.includes('this.bindBrowserDemoSmokeBridge()'), 'browser game should install smoke bridge during startup');
assert.ok(bridgeBlock.includes("addEventListener('creator-demo-smoke'"), 'browser smoke should be invokable through a DOM event');
assert.ok(bridgeBlock.includes('dataset.browserDemoSmoke'), 'browser smoke bridge should publish JSON results in the DOM dataset');

assert.ok(smokeBlock.includes('button.click()'), 'browser smoke should trigger the real Advanced panel button path');
assert.ok(smokeBlock.includes('dataset?.debugState'), 'browser smoke should read DOM-visible debug state');
assert.ok(smokeBlock.includes('submitNpcDialogue(fabricatedPrompt'), 'browser smoke should exercise NPC dialogue through the UI submit path');
assert.ok(smokeBlock.includes('sendResidentDialogue()'), 'browser smoke should exercise resident dialogue through the UI submit path');
assert.ok(smokeBlock.includes('hasForbiddenTerm'), 'browser smoke should reject fabricated lore in replies and memory');

for (const actionId of [
  'trigger-story',
  'trigger-legend',
  'prepare-chain',
  'perform-ritual',
  'form-oath',
  'break-oath',
  'return-legacy',
  'trigger-social',
  'generate-riddle',
  'submit-riddle',
  'modify-workshop',
  'manifest-echo'
]) {
  assert.ok(smokeBlock.includes(`clickAdvancedAction('${actionId}')`), `browser smoke should cover ${actionId}`);
}

for (const paradoxType of [
  'light_dark',
  'life_death',
  'creation_destruction',
  'time_stillness',
  'shield_spear',
  'memory_forget',
  'water_fire',
  'guide_mislead'
]) {
  assert.ok(smokeBlock.includes(`'${paradoxType}'`), `browser smoke should cover paradox ${paradoxType}`);
}

assert.ok(smokeBlock.includes('renderEnemyIntentPanel()'), 'browser smoke should render enemy intent panel');
assert.ok(smokeBlock.includes('renderIntentArrows()'), 'browser smoke should render intent arrows');

for (const term of ['第九王国', '星钥', '北方王宫', '银鸦公主', '银鸦']) {
  assert.ok(smokeBlock.includes(term), `browser smoke should guard fabricated term ${term}`);
}

console.log('Browser demo smoke harness tests passed.');
