import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WorldSimulation } from '../public/js/worldSimulation.js';
import { ResidentRegistry } from '../public/js/residentRegistry.js';

const rootUrl = new URL('../', import.meta.url);
const rootPath = fileURLToPath(rootUrl);

function readSource(relativePath) {
  return readFileSync(new URL(relativePath, rootUrl), 'utf8');
}

function sourceBlock(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `missing start token: ${startToken}`);
  const end = source.indexOf(endToken, start + startToken.length);
  assert.notEqual(end, -1, `missing end token: ${endToken}`);
  return source.slice(start, end);
}

function postJson(baseUrl, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(async response => ({
    status: response.status,
    json: await response.json()
  }));
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 8000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`server did not become healthy: ${lastError?.message || 'timeout'}`);
}

async function withNoKeyServer(testBody) {
  const port = String(43000 + Math.floor(Math.random() * 1000));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: rootPath,
    env: {
      ...process.env,
      PORT: port,
      AI_API_KEY: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForHealth(baseUrl);
    await testBody(baseUrl);
  } finally {
    child.kill();
  }
}

function assertBrowserImportsAndEscapes() {
  const gameSource = readSource('public/js/game.js');
  assert.match(
    gameSource,
    /import\s+\{\s*buildContinuityViewModel\s*\}\s+from\s+['"]\.\/continuityPresenter\.js['"];/,
    'game.js must import buildContinuityViewModel before renderContinuity uses it'
  );

  const continuityBlock = sourceBlock(gameSource, '  renderContinuity() {', '  showExplorationChoices(choices, winMessage) {');
  assert.ok(continuityBlock.includes('escapeHtml(resident.name)'), 'continuity resident name must be escaped');
  assert.ok(continuityBlock.includes('escapeHtml(resident.mood)'), 'continuity resident mood must be escaped');
  assert.ok(continuityBlock.includes('escapeHtml(resident.latestMemory)'), 'continuity resident memory must be escaped');
  assert.ok(continuityBlock.includes('escapeHtml(hook.type)'), 'continuity hook type must be escaped');
  assert.ok(continuityBlock.includes('escapeHtml(hook.summary)'), 'continuity hook summary must be escaped');

  const explorationBlock = sourceBlock(gameSource, '  showExplorationChoices(choices, winMessage) {', '  async handleExplorationChoice(choiceId) {');
  assert.ok(explorationBlock.includes('escapeHtml(vm.id)'), 'exploration choice id must be escaped before HTML insertion');
  assert.ok(explorationBlock.includes('escapeHtml(vm.title)'), 'exploration choice title must be escaped');
  assert.ok(explorationBlock.includes('escapeHtml(vm.description)'), 'exploration choice description must be escaped');
  assert.ok(explorationBlock.includes('escapeHtml(vm.meta)'), 'exploration choice meta must be escaped');
  assert.ok(explorationBlock.includes('escapeHtml(vm.badge)'), 'exploration choice badge must be escaped');

  const narrativeBlock = sourceBlock(gameSource, '  addEnvironmentalNarrative(eventType, context) {', '  async fetchNarrative(type, context) {');
  assert.ok(narrativeBlock.includes('this.addLocalNarrative(eventType, context)'), 'narrative 503/null responses must fall back to local narrative text');
}

function assertWorldTextAndResidents() {
  const worldSource = readSource('public/js/worldSimulation.js');
  assert.doesNotMatch(worldSource, /\?\{event\.regionId\}|\?\{payload\./, 'world event text must not contain broken template placeholders');

  const registry = new ResidentRegistry({ seedDefaults: false });
  const world = new WorldSimulation({ residentRegistry: registry });
  world.recordGameEvent({
    type: 'unit_rescued',
    regionId: 'test-region',
    actorId: 'player',
    payload: {
      residentId: 'resident-generated-001',
      unitName: 'Generated Resident'
    },
    importance: 0.8,
    tags: ['rescue']
  });

  const resident = registry.getResident('resident-generated-001');
  assert.ok(resident, 'unknown resident ids from world events must become durable residents');
  assert.equal(resident.name, 'Generated Resident');
  assert.equal(resident.currentRegionId, 'test-region');
  assert.equal(resident.memories.length, 1);
}

function assertRuleAlphabetMatchesGeneratedRegions() {
  const validatorSource = readSource('public/js/ruleValidator.js');
  for (const symbol of ['~', 'H', 'V', 'E', 'C', 'B', 'F', 'M', 'D', 'G', 'S', 'W', 'P']) {
    assert.ok(validatorSource.includes(`'${symbol}'`), `RuleValidator must accept terrain symbol ${symbol} from levels/server prompts`);
  }
  for (const unitType of ['villager', 'miner', 'beast', 'tribeA', 'tribeB']) {
    assert.ok(validatorSource.includes(`'${unitType}'`), `RuleValidator must accept unit type ${unitType} used by GameEngine/server`);
  }
}

function assertAirCombatIntegration() {
  const gameSource = readSource('public/js/game.js');
  const bridgeSource = readSource('public/modes/air-combat/airCombatBridge.js');
  const airGameSource = readSource('public/modes/air-combat/airCombatGame.js');
  const airIndexSource = readSource('public/modes/air-combat/index.html');

  assert.ok(gameSource.includes('buildAirCombatContext()'), 'main game must build air combat context');
  assert.ok(gameSource.includes('creatorExamAirCombatContext'), 'main game must publish air combat context');
  assert.ok(gameSource.includes('creatorExamAirCombatResult'), 'main game must consume air combat result');
  assert.ok(gameSource.includes("type: 'airspace_resolved'"), 'air combat result must become airspace_resolved world event');
  assert.ok(gameSource.includes('renderAirCombatPanel()'), 'final exam UI must expose the airspace panel');

  assert.ok(bridgeSource.includes('BOSS_ROUTE'), 'air bridge must define finite boss route');
  assert.ok(bridgeSource.includes('洪水残响'), 'air route must reframe early memories as bosses');
  assert.ok(bridgeSource.includes('终考秩序'), 'air route must include final-exam boss wrapper');
  assert.ok(bridgeSource.includes('WEAPON_MAP'), 'air bridge must map creations into weapons');
  assert.ok(bridgeSource.includes('publishResult'), 'air bridge must return a result to main game');
  assert.ok(bridgeSource.includes('requestAirCombatText'), 'air bridge must expose AI narrative requests');
  assert.ok(bridgeSource.includes('/api/narrative'), 'air bridge must use the shared narrative endpoint');
  assert.ok(bridgeSource.includes('airspace_brief'), 'air bridge must generate a context-driven airspace briefing');
  assert.ok(bridgeSource.includes('worldState'), 'air bridge must send main-flow world state to AI narrative');
  assert.ok(bridgeSource.includes('BOSS_AFFIXES'), 'air bridge must adapt upstream boss affixes into finite route modifiers');
  assert.ok(bridgeSource.includes('contextualAffixKeys'), 'air bridge must derive boss affixes from main-game context');
  assert.ok(bridgeSource.includes('routeResonance'), 'air bridge must derive creation route resonance from prior player flow');
  assert.ok(bridgeSource.includes('airspaceAffixes'), 'AI world state must include airspace affix context');
  assert.ok(bridgeSource.includes('resonance: routeResonance()'), 'air combat result must return route resonance to main game');
  assert.ok(bridgeSource.includes('affixes:'), 'air combat result must return finite boss affixes');

  assert.ok(airGameSource.includes('class Boss'), 'air combat slice must include boss logic');
  assert.ok(airGameSource.includes('class Enemy'), 'air combat slice must include enemy logic');
  assert.ok(airGameSource.includes('useSkill()'), 'air combat slice must include creation weapon pulse');
  assert.ok(airGameSource.includes('bridge.routeResonance()'), 'air combat slice must consume creation resonance locally');
  assert.ok(airGameSource.includes('firePrismLane'), 'air combat slice must apply prism boss affix locally');
  assert.ok(airGameSource.includes('jamFactor'), 'air combat slice must apply jammer pressure locally');
  assert.ok(airGameSource.includes('repairNearbyEnemies'), 'air combat slice must apply support enemy depth locally');
  assert.ok(airGameSource.includes('jammer') && airGameSource.includes('support'), 'air combat enemy pool must include selected upstream enemy roles');
  assert.ok(airGameSource.includes('hudAffix'), 'air combat HUD must show boss affix details');
  assert.ok(airGameSource.includes('reviewTags'), 'air combat result must adapt upstream run review tags to finite route review');
  assert.ok(airGameSource.includes("finish('victory')"), 'air combat route must have a finite victory state');
  assert.ok(airGameSource.includes('CREATOR_EXAM_AIR_COMBAT_READY'), 'browser verification should have a readiness signal');
  assert.ok(airIndexSource.includes('id="hud-affix"'), 'air combat markup must expose an affix HUD line');
  for (const eventType of [
    'airspace_intro',
    'airspace_segment',
    'airspace_boss',
    'airspace_boss_phase',
    'airspace_weapon',
    'airspace_near',
    'airspace_boss_defeated',
    'airspace_victory',
    'airspace_defeat'
  ]) {
    assert.ok(airGameSource.includes(eventType), `air combat must request AI narrative for ${eventType}`);
  }
  const airUpdateStart = airGameSource.lastIndexOf('    update(dt) {');
  assert.notEqual(airUpdateStart, -1, 'air combat must have a frame update loop');
  const airUpdateEnd = airGameSource.indexOf('    draw() {', airUpdateStart);
  assert.notEqual(airUpdateEnd, -1, 'air combat update loop must be followed by draw loop');
  const airUpdateBlock = airGameSource.slice(airUpdateStart, airUpdateEnd);
  assert.ok(!airUpdateBlock.includes('requestAirCombatText'), 'air combat must not request AI narrative inside the frame update loop');

  const combinedModeSource = `${bridgeSource}\n${airGameSource}\n${airIndexSource}`;
  assert.doesNotMatch(combinedModeSource, /Multiplayer|WebRTC|Leaderboard|ChallengeHistory|EndlessBoard|chipselect|drawChipSelect|routePreviewText|selectMap|普通关卡|排行榜/, 'air combat mode must not carry over old multiplayer, leaderboard, endless draft, or normal-level shell');

  const world = new WorldSimulation();
  world.recordGameEvent({
    type: 'airspace_resolved',
    regionId: 'final-exam',
    payload: { id: 'air-test', outcome: 'victory', clearedLayers: 6 },
    importance: 1,
    tags: ['airspace']
  });
  assert.ok(world.getFutureHooks('final-exam').some(hook => hook.type === 'airspace_ending'), 'airspace_resolved must create an ending hook');
}

async function assertNoKeyServerFallbacks() {
  await withNoKeyServer(async baseUrl => {
    const creation = await postJson(baseUrl, '/api/compile-creation', { text: 'create a small guiding lantern' });
    assert.equal(creation.status, 200, 'compile-creation must return a playable local card without API key');
    assert.ok(creation.json.ability, 'fallback card must include ability');
    assert.equal(creation.json.source, 'fallback');

    const narrative = await postJson(baseUrl, '/api/narrative', {
      type: 'rescue',
      context: { unitName: 'Ari' },
      worldState: { currentLevel: 'flood-village', rescued: 1, lost: 0, entropy: 2 }
    });
    assert.equal(narrative.status, 200, 'narrative must return local text without API key');
    assert.ok(String(narrative.json.text || '').length >= 20, 'fallback narrative must contain visible story text');
    assert.equal(narrative.json.source, 'fallback_no_key');

    const region = await postJson(baseUrl, '/api/generate-region', {
      playerState: { currentRegionId: 'flood-village' },
      regionCount: 3
    });
    assert.equal(region.status, 200, 'generate-region must return local playable region without API key');
    const regionData = region.json.region || region.json;
    assert.ok(Array.isArray(regionData.map), 'fallback region must include map rows');
    assert.ok(Array.isArray(regionData.units), 'fallback region must include units');
    assert.ok(region.json.source === 'fallback_no_key' || region.json.fallback === true, 'fallback region source should be explicit');
  });
}

assertBrowserImportsAndEscapes();
assertWorldTextAndResidents();
assertRuleAlphabetMatchesGeneratedRegions();
assertAirCombatIntegration();
await assertNoKeyServerFallbacks();

console.log('Current-code reality tests passed');
