import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
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

function loadAirBridgeForContext(context) {
  const bridgeSource = readSource('public/modes/air-combat/airCombatBridge.js');
  const sandbox = {
    URLSearchParams,
    decodeURIComponent,
    encodeURIComponent,
    window: {
      location: { search: `?context=${encodeURIComponent(JSON.stringify(context))}` }
    },
    document: {
      title: '',
      getElementById: () => null
    }
  };
  runInNewContext(bridgeSource, sandbox);
  return sandbox.window.AirCombatBridge;
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
  const port = String(await findFreePort());
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

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
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
  assert.ok(bridgeSource.includes('briefingSlides'), 'air bridge must expose a multi-step airspace briefing before combat');
  assert.ok(bridgeSource.includes('worldState'), 'air bridge must send main-flow world state to AI narrative');
  assert.ok(bridgeSource.includes('function endingPressure()'), 'air bridge must read final-flow ending pressure');
  assert.ok(bridgeSource.includes('function discoveredLore()'), 'air bridge must read discovered lore from prior flow');
  assert.ok(bridgeSource.includes('function loreSignal()'), 'air bridge must turn discovered lore into route narrative');
  assert.ok(bridgeSource.includes('endingPressure: endingPressure()'), 'AI world state must include ending pressure');
  assert.ok(bridgeSource.includes('discoveredLore: discoveredLore()'), 'AI world state must include discovered lore');
  assert.ok(bridgeSource.includes('pressure >= 0.82') && bridgeSource.includes("keys.push('armored')"), 'high final pressure must harden finite boss affixes');
  assert.ok(bridgeSource.includes('lore && index === BOSS_ROUTE.length - 1'), 'final boss memory must inherit discovered lore');
  assert.ok(bridgeSource.includes('最终压力') && bridgeSource.includes('传说：'), 'briefing/loadout must surface final pressure and lore signal');
  assert.ok(bridgeSource.includes("route().map(boss => boss.affix.name)"), 'loadout affix list must show the actual finite route, not unused candidate affixes');
  assert.ok(bridgeSource.includes('BOSS_AFFIXES'), 'air bridge must adapt upstream boss affixes into finite route modifiers');
  assert.ok(bridgeSource.includes('contextualAffixKeys'), 'air bridge must derive boss affixes from main-game context');
  assert.ok(bridgeSource.includes('routeResonance'), 'air bridge must derive creation route resonance from prior player flow');
  assert.ok(bridgeSource.includes('airspaceAffixes'), 'AI world state must include airspace affix context');
  assert.ok(bridgeSource.includes('communicator()'), 'air bridge must derive communicator identity from prior player flow');
  assert.ok(bridgeSource.includes('residentNames(context.rescuedResidents)'), 'rescued residents must feed air combat communicator and AI context');
  assert.ok(bridgeSource.includes('residentNames(context.lostResidents)'), 'lost residents must feed air combat hallucination fallback and AI context');
  assert.ok(bridgeSource.includes('失踪幻听'), 'air combat must use lost residents as hallucinated comms when nobody was rescued');
  assert.ok(bridgeSource.includes('resonance: routeResonance()'), 'air combat result must return route resonance to main game');
  assert.ok(bridgeSource.includes('communicator: communicator()'), 'air combat result must return communicator identity');
  assert.ok(bridgeSource.includes('affixes:'), 'air combat result must return finite boss affixes');
  assert.ok(bridgeSource.includes('jammedTime:'), 'air combat result must return jammer pressure to main game');
  assert.ok(bridgeSource.includes('lastStandShield'), 'air bridge must turn prior night-watch success into finite last-stand protection');
  assert.ok(bridgeSource.includes('ionStorm') && bridgeSource.includes('离子风暴'), 'air bridge must adapt upstream ion storm as a finite boss-route affix');
  assert.ok(bridgeSource.includes('escort') && bridgeSource.includes('护卫'), 'air bridge must adapt upstream boss escort as a finite boss-route affix');
  assert.ok(bridgeSource.includes('jammer') && bridgeSource.includes('扰频'), 'air bridge must adapt upstream jammer as a finite boss-route affix');
  assert.ok(bridgeSource.includes('jammerCloud') && bridgeSource.includes('扰频云层'), 'air bridge must adapt upstream jammer cloud as finite enemy-pressure affix');
  assert.ok(bridgeSource.includes('sniperLockdown') && bridgeSource.includes('狙击封锁'), 'air bridge must adapt upstream sniper lockdown as finite enemy-pressure affix');
  assert.ok(bridgeSource.includes('minefield') && bridgeSource.includes('爆雷空域'), 'air bridge must adapt upstream minefield as finite enemy-pressure affix');
  assert.ok(bridgeSource.includes("attack: 'repair'") && bridgeSource.includes('维修词缀'), 'air bridge must adapt upstream repair boss affix into finite route pressure');
  assert.ok(bridgeSource.includes('berserker') && bridgeSource.includes('狂暴'), 'air bridge must adapt upstream berserker elite as finite enemy-pressure affix');
  assert.ok(bridgeSource.includes('fieldRepair') && bridgeSource.includes('纳米修复'), 'air bridge must adapt upstream field repair as a prior-flow reward');
  assert.ok(bridgeSource.includes('damageTakenMult') && bridgeSource.includes('钛合装甲'), 'air bridge must adapt upstream armor plating as finite shield resonance');
  assert.ok(bridgeSource.includes('钨芯重弹') && bridgeSource.includes('fireIntervalMult: 1.12'), 'air bridge must adapt upstream heavy rounds as finite cannon resonance');
  assert.ok(bridgeSource.includes('破甲弹芯') && bridgeSource.includes('armorPierceMult: 0.35'), 'air bridge must adapt upstream armor piercer as finite cannon resonance');
  assert.ok(bridgeSource.includes('装甲口径') && bridgeSource.includes('armorCaliberDamage'), 'air bridge must adapt upstream armor caliber as finite prior-flow resonance');
  assert.ok(bridgeSource.includes('生命炉心') && bridgeSource.includes('vitalReactorDamageMult'), 'air bridge must adapt upstream vital reactor as finite prior-flow damage resonance');
  assert.ok(bridgeSource.includes('痛觉转换') && bridgeSource.includes('painConverterCooldownPerHp'), 'air bridge must adapt upstream pain converter as finite prior-flow resonance');
  assert.ok(bridgeSource.includes('近防协议') && bridgeSource.includes('pointDefenseRange'), 'air bridge must adapt upstream point defense as finite prior-flow resonance');
  assert.ok(bridgeSource.includes('splitPairs') && bridgeSource.includes('分束棱镜'), 'air bridge must adapt upstream split laser as beam resonance');
  assert.ok(bridgeSource.includes('sidePairs') && bridgeSource.includes('侧翼炮塔'), 'air bridge must adapt upstream side cannons as cannon resonance');

  assert.ok(airGameSource.includes('class Boss'), 'air combat slice must include boss logic');
  assert.ok(airGameSource.includes('class Enemy'), 'air combat slice must include enemy logic');
  assert.ok(airGameSource.includes('useSkill()'), 'air combat slice must include creation weapon pulse');
  assert.ok(airGameSource.includes('bridge.routeResonance()'), 'air combat slice must consume creation resonance locally');
  assert.ok(airGameSource.includes('firePrismLane'), 'air combat slice must apply prism boss affix locally');
  assert.ok(airGameSource.includes('bulletRateMult'), 'air combat slice must apply boss affix bullet-rate modifiers locally');
  assert.ok(airGameSource.includes('jamFactor'), 'air combat slice must apply jammer pressure locally');
  assert.ok(airGameSource.includes('jamStatus'), 'air combat HUD must show jammer weapon-slow feedback');
  assert.ok(airGameSource.includes('this.boss?.affix?.jamRadius'), 'air combat slice must let jammer boss affixes slow creation weapons');
  assert.ok(airGameSource.includes('jammedTime') && airGameSource.includes('updateJammerPressure'), 'air combat result must track finite jammer pressure');
  assert.ok(airGameSource.includes('repairNearbyEnemies'), 'air combat slice must apply support enemy depth locally');
  assert.ok(airGameSource.includes('jammer') && airGameSource.includes('support'), 'air combat enemy pool must include selected upstream enemy roles');
  assert.ok(airGameSource.includes('sniper') && airGameSource.includes('sniperWarn'), 'air combat slice must adapt upstream sniper warning shots locally');
  assert.ok(airGameSource.includes('this.sniperAim') && airGameSource.includes("['medium', 'gunner', 'splitter', 'sniper'"), 'sniper enemies must warn before entering late finite route pools');
  assert.ok(airGameSource.includes('detonator') && airGameSource.includes('ringCount') && airGameSource.includes("enemy.type === 'detonator'"), 'air combat slice must adapt upstream detonator minefield enemies locally');
  assert.ok(airGameSource.includes('applyBerserkerElite') && airGameSource.includes('eliteFireMult') && airGameSource.includes('enemy.fireMult'), 'air combat slice must apply upstream berserker elite pressure locally');
  assert.ok(airGameSource.includes('hudAffix'), 'air combat HUD must show boss affix details');
  assert.ok(airGameSource.includes('reviewTags'), 'air combat result must adapt upstream run review tags to finite route review');
  assert.ok(airGameSource.includes('renderResultBody'), 'air combat result panel must support late AI verdict updates');
  assert.ok(airGameSource.includes('bridge.publishResult({ ...result, notableMoment: aiText })'), 'late AI verdict must update the stored air combat result payload');
  assert.ok(airGameSource.includes('lastStandReady'), 'air combat slice must apply upstream last-stand protection locally');
  assert.ok(airGameSource.includes('airspace_last_stand'), 'last-stand protection must be available to AI/local narrative hooks');
  assert.ok(airGameSource.includes('fireIonStormLane'), 'air combat slice must apply upstream ion storm as finite laser-lane pressure');
  assert.ok(airGameSource.includes('updateLasers') && airGameSource.includes('drawLasers'), 'ion storm laser lanes must have warning/update/draw logic');
  assert.ok(airGameSource.includes('lastStandStatus'), 'air combat HUD must expose last-stand readiness after upstream HUD update');
  assert.ok(airGameSource.includes('fireBossEscort'), 'air combat slice must apply upstream escort affix as finite add pressure');
  assert.ok(airGameSource.includes("this.affix.attack === 'repair'") && airGameSource.includes('repairBoss'), 'air combat slice must apply upstream repair boss affix locally');
  assert.ok(airGameSource.includes('updateFieldRepair') && airGameSource.includes('fieldRepairStatus'), 'air combat slice must apply upstream field repair locally');
  assert.ok(airGameSource.includes('this.resonance.damageTakenMult'), 'air combat slice must apply finite armor-plating damage reduction locally');
  assert.ok(airGameSource.includes('armorPierces') && airGameSource.includes('playerBulletDamage') && airGameSource.includes('armorPierceMinHp') && airGameSource.includes('bullet.main'), 'air combat slice must apply finite armor-piercer bonus only to main bullets');
  assert.ok(airGameSource.includes("this.burst(b.x, b.y, '#ff922b', 6)"), 'air combat slice must show finite armor-piercer hit feedback');
  assert.ok(airGameSource.includes('armorCaliberDamage()') && airGameSource.includes('armorCaliberStatus') && airGameSource.includes('装甲口径+'), 'air combat slice must fold prior-flow armor caliber into main cannon damage and HUD');
  assert.ok(airGameSource.includes('playerDamage(amount') && airGameSource.includes('vitalReactorStatus') && airGameSource.includes('生命炉心+'), 'air combat slice must fold upstream vital reactor into all player damage and HUD');
  assert.ok(airGameSource.includes('triggerPainConverter') && airGameSource.includes('painConverterStatus') && airGameSource.includes('痛觉转译'), 'air combat slice must convert real HP loss into finite creation-pulse cooldown');
  assert.ok(airGameSource.includes('clearEnemyBulletsNear') && airGameSource.includes('triggerPointDefense') && airGameSource.includes('pointDefenseStatus'), 'air combat slice must clear enemy bullets near kills for finite point-defense resonance');
  assert.ok(airGameSource.includes('splitDamage') && airGameSource.includes('#be4bdb'), 'air combat slice must fire finite split laser side beams for beam resonance');
  assert.ok(airGameSource.includes('sideDamage') && airGameSource.includes('#ffd43b'), 'air combat slice must fire finite side cannon shots for cannon resonance');
  assert.ok(airGameSource.includes('showClearanceCard') && airGameSource.includes('updateClearanceCard'), 'air combat must show a short boss clearance card after each boss defeat');
  assert.ok(airGameSource.includes('advanceBriefing') && airGameSource.includes('renderBriefingStep'), 'air combat must gate combat start behind briefing steps');
  assert.ok(airGameSource.includes("finish('victory')"), 'air combat route must have a finite victory state');
  assert.ok(airGameSource.includes('CREATOR_EXAM_AIR_COMBAT_READY'), 'browser verification should have a readiness signal');
  assert.ok(airIndexSource.includes('id="hud-affix"'), 'air combat markup must expose an affix HUD line');
  assert.ok(airIndexSource.includes('id="airspace-clearance-card"'), 'air combat markup must expose a boss clearance card');
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

function assertAirCombatRouteBalance() {
  const highPressure = loadAirBridgeForContext({
    entropy: 8,
    endingPressure: 0.9,
    rescuedResidents: [{ name: '阿岚' }, { name: '小满' }, { name: '砾' }],
    lostResidents: [],
    recentCreations: [{ name: '城墙核心', ability: 'block' }],
    towerDefenseResult: { victory: true },
    discoveredLore: [{ title: '秩序会在高空折返' }]
  });
  const highRoute = highPressure.route();
  assert.equal(highRoute.length, 6, 'air combat must stay a finite 6-layer route');
  assert.equal(
    highRoute.map(boss => boss.affix.name).join(' / '),
    '离子风暴 / 棱镜 / 装甲 / 狙击封锁 / 护卫 / 维修',
    'high-pressure block route must show the actual six affixes in order'
  );
  assert.equal(highPressure.routeResonance().armorCaliberDamage, 2, 'prior-flow armor caliber must remain bounded and derived from context');
  assert.ok(highPressure.routeResonance().vitalReactorDamageMult > 0, 'prior-flow extra HP should unlock finite vital reactor damage resonance');
  assert.ok(highPressure.routeResonance().vitalReactorDamageMult <= 0.2, 'vital reactor damage multiplier must stay bounded');
  assert.ok(highPressure.routeResonance().painConverterCooldownPerHp > 0, 'high final pressure should unlock finite pain converter resonance');
  assert.ok(highPressure.routeResonance().painConverterMaxCooldown <= 4.2, 'pain converter cooldown refund must stay bounded');
  assert.ok(highPressure.routeResonance().pointDefenseRange > 0, 'rescued residents should unlock finite point-defense resonance');
  for (const boss of highRoute) {
    assert.ok(['prism', 'ionStorm', 'escort', 'repair', undefined].includes(boss.affix.attack), `unknown finite affix attack ${boss.affix.attack}`);
    assert.ok(boss.hp >= 300 && boss.hp <= 1100, `boss ${boss.title} hp is outside finite route bounds`);
  }

  const repairOpening = loadAirBridgeForContext({
    entropy: 1,
    endingPressure: 0.76,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '透明鲸鱼', ability: 'absorb_water' }],
    towerDefenseResult: { victory: true }
  });
  assert.equal(repairOpening.route()[0].affix.key, 'repair', 'successful night-watch pressure should be able to open with repair affix');

  const lostRoute = loadAirBridgeForContext({
    entropy: 5,
    endingPressure: 0.68,
    rescuedResidents: [],
    lostResidents: [{ name: '砾' }],
    recentCreations: [{ name: '透明鲸鱼', ability: 'absorb_water' }],
    towerDefenseResult: { victory: true }
  });
  assert.ok(lostRoute.route().some(boss => boss.affix.key === 'berserker'), 'lost residents plus entropy should introduce finite berserker elite pressure');

  const mineRoute = loadAirBridgeForContext({
    entropy: 6,
    endingPressure: 0.7,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '鲸潮护盾', ability: 'absorb_water' }],
    towerDefenseResult: { victory: true }
  });
  assert.ok(mineRoute.route().some(boss => boss.affix.key === 'minefield'), 'missile-like pressure should introduce finite minefield enemy pressure');

  const memoryRoute = loadAirBridgeForContext({
    entropy: 2,
    endingPressure: 0.4,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '记忆航标', ability: 'memory_beacon' }]
  });
  assert.ok(memoryRoute.routeResonance().pointDefenseRange > 0, 'memory beacon weapons should unlock finite point-defense even without rescued residents');
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
assertAirCombatRouteBalance();
await assertNoKeyServerFallbacks();

console.log('Current-code reality tests passed');
