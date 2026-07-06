import { readFileSync } from 'node:fs';
import { buildAdvancedMechanicsViewModel } from '../public/js/advancedMechanicsPresenter.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sourceBlock(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert(start !== -1, `missing start token: ${startToken}`);
  const end = source.indexOf(endToken, start + startToken.length);
  assert(end !== -1, `missing end token: ${endToken}`);
  return source.slice(start, end);
}

const gameSource = readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8');
const presenterSource = readFileSync(new URL('../public/js/advancedMechanicsPresenter.js', import.meta.url), 'utf8');
const socialDemoBlock = sourceBlock(gameSource, '  triggerSocialDemo() {', '  updateMissionDossier() {');
const advancedActionBlock = sourceBlock(gameSource, '  handleAdvancedAction(actionId) {', '  demoCard(ability) {');
const decodeBlock = sourceBlock(gameSource, '  handleDecodeAbyss() {', '  handleCreateCorruption() {');
const abyssPanelBlock = sourceBlock(gameSource, '  renderAbyssPanel() {', '  renderCorruptionPanel() {');

assert(socialDemoBlock.includes('social-demo-witness-a'), 'social demo should seed fallback NPCs when a level has too few NPCs');
assert(socialDemoBlock.includes('this.npcManager.npcs.push(npc)'), 'seeded social demo NPCs should enter the NPC manager');
assert(socialDemoBlock.includes('graph.addNode(npc.id, npc)'), 'seeded social demo NPCs should enter the real social graph');
assert(socialDemoBlock.includes("graph.addEdge(ids[i], ids[i + 1], type"), 'social demo should still use real relationship edges');
assert(socialDemoBlock.includes('graph.recordSocialEvent({'), 'social demo should still record a real social event');
assert(socialDemoBlock.includes('graph.detectCliques({ minStrength: 8, minSize: 3 })'), 'social demo should verify clique formation through SocialGraph');

assert(advancedActionBlock.includes('this.ui.advancedDecodeInput'), 'advanced riddle submit should use the Advanced panel textarea');
assert(decodeBlock.includes('this.ui.advancedDecodeInput?.value?.trim()'), 'Abyss decoder should read the Advanced panel textarea');
assert(decodeBlock.includes('this.ui.advancedDecodeInput) this.ui.advancedDecodeInput.value ='), 'successful decode should clear the Advanced panel textarea');
assert(decodeBlock.includes('this.suppressAbyssAutoRiddle = true'), 'successful decode should not immediately auto-generate another riddle');
assert(abyssPanelBlock.includes('!this.suppressAbyssAutoRiddle'), 'Abyss panel should respect the post-decode auto-generation guard');
assert(advancedActionBlock.includes('this.currentAbyssRiddle || this.cognitiveAbyss?.currentRiddle'), 'Advanced submit should reuse the real pending Abyss riddle');
assert(gameSource.includes('const created = this.oathManager.getAllActiveOaths()[0];'), 'break-oath demo should bootstrap and then break an oath in one click');

const emptyModel = buildAdvancedMechanicsViewModel({
  workshop: { inventory: [], materials: {}, workshopCreations: [] },
  ritual: { suggestions: [], placedCreationCount: 0 },
  oath: { selectedNpc: null, available: [], activeOaths: [] },
  rift: { entropyRatio: 0, activeEchoes: [] },
  abyss: { state: { level: 'dormant', description: 'quiet' }, currentRiddle: null },
  story: { summary: {}, availableBeats: 0 },
  resident: { actions: [] },
  social: {},
  legacy: { total: 0, returned: [], canAdvance: true }
});

for (const id of ['dismantle-workshop', 'modify-workshop', 'fuse-workshop', 'perform-ritual', 'form-oath', 'break-oath', 'advance-story']) {
  const action = emptyModel.actions.find(item => item.id === id);
  assert(action?.enabled === true, `${id} should stay clickable because its handler seeds demo prerequisites`);
}

assert(presenterSource.includes("id: 'submit-riddle'"), 'Advanced presenter should expose riddle submit action');

console.log('Advanced mechanisms reliability tests passed.');
