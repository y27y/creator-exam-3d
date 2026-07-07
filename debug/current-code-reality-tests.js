import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

function configuredAirAffixKeys() {
  const bridgeSource = readSource('public/modes/air-combat/airCombatBridge.js');
  const affixBlock = sourceBlock(bridgeSource, '  const BOSS_AFFIXES = {', '  const WEAPON_MAP = {');
  return [...affixBlock.matchAll(/\n    \w+: \{\n      key: '([^']+)'/g)].map(match => match[1]);
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
  const airAssetsSource = readSource('public/modes/air-combat/airCombatAssets.js');
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
  assert.ok(bridgeSource.includes('weaponOptions') && bridgeSource.includes('selectWeaponOption'), 'air bridge must expose prior-flow weapon choices before combat');
  assert.ok(bridgeSource.includes('选择依据') && bridgeSource.includes('reason'), 'air bridge must explain why prior flow unlocked each air weapon');
  assert.ok(bridgeSource.includes('focusText') && bridgeSource.includes('路线续构'), 'air bridge must adapt upstream focused draft reason labels for weapon choices');
  assert.ok(bridgeSource.includes('sustainWeaponOption') && bridgeSource.includes('生命续航'), 'air bridge must adapt upstream HP sustain draft guarantees into air weapon choices');
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
  assert.ok(bridgeSource.includes('creationDescription') && bridgeSource.includes('weaponSourceDescription') && bridgeSource.includes('造物原意'), 'air bridge must preserve original creation descriptions for AI and loadout text');
  assert.ok(bridgeSource.includes('pressure >= 0.82') && bridgeSource.includes("keys.push('armored')"), 'high final pressure must harden finite boss affixes');
  assert.ok(bridgeSource.includes('lore && index === BOSS_ROUTE.length - 1'), 'final boss memory must inherit discovered lore');
  assert.ok(bridgeSource.includes('最终压力') && bridgeSource.includes('传说：'), 'briefing/loadout must surface final pressure and lore signal');
  assert.ok(bridgeSource.includes("route().map(boss => boss.affix.name)"), 'loadout affix list must show the actual finite route, not unused candidate affixes');
  assert.ok(bridgeSource.includes('BOSS_AFFIXES'), 'air bridge must adapt upstream boss affixes into finite route modifiers');
  assert.ok(bridgeSource.includes('contextualAffixKeys'), 'air bridge must derive boss affixes from main-game context');
  assert.ok(bridgeSource.includes('ROUTE_FILLER_AFFIX_KEYS'), 'air bridge must adapt upstream recent-affix repeat avoidance for sparse finite routes');
  assert.ok(bridgeSource.includes('routeResonance'), 'air bridge must derive creation route resonance from prior player flow');
  assert.ok(bridgeSource.includes('airspaceAffixes'), 'AI world state must include airspace affix context');
  assert.ok(bridgeSource.includes('communicator()'), 'air bridge must derive communicator identity from prior player flow');
  assert.ok(bridgeSource.includes('residentNames(context.rescuedResidents)'), 'rescued residents must feed air combat communicator and AI context');
  assert.ok(bridgeSource.includes('residentNames(context.lostResidents)'), 'lost residents must feed air combat hallucination fallback and AI context');
  assert.ok(bridgeSource.includes('失踪幻听'), 'air combat must use lost residents as hallucinated comms when nobody was rescued');
  assert.ok(bridgeSource.includes('resonance: routeResonance()'), 'air combat result must return route resonance to main game');
  assert.ok(bridgeSource.includes('communicator: communicator()'), 'air combat result must return communicator identity');
  assert.ok(bridgeSource.includes('affixes:'), 'air combat result must return finite boss affixes');
  assert.ok(bridgeSource.includes('cleanClears:'), 'air combat result must return finite clean-clear count');
  assert.ok(bridgeSource.includes('jammedTime:'), 'air combat result must return jammer pressure to main game');
  assert.ok(bridgeSource.includes('lastStandShield'), 'air bridge must turn prior night-watch success into finite last-stand protection');
  assert.ok(bridgeSource.includes('ionStorm') && bridgeSource.includes('离子风暴'), 'air bridge must adapt upstream ion storm as a finite boss-route affix');
  assert.ok(bridgeSource.includes('escort') && bridgeSource.includes('护卫'), 'air bridge must adapt upstream boss escort as a finite boss-route affix');
  assert.ok(bridgeSource.includes('ewar') && bridgeSource.includes('电子战'), 'air bridge must adapt upstream electronic warfare as a finite boss-route affix');
  assert.ok(bridgeSource.includes('jammer') && bridgeSource.includes('扰频'), 'air bridge must adapt upstream jammer as a finite boss-route affix');
  assert.ok(bridgeSource.includes('jammerCloud') && bridgeSource.includes('扰频云层'), 'air bridge must adapt upstream jammer cloud as finite enemy-pressure affix');
  assert.ok(bridgeSource.includes('jammerElite') && bridgeSource.includes('精英扰频'), 'air bridge must adapt upstream jammer elite as finite enemy-pressure affix');
  assert.ok(bridgeSource.includes('sniperLockdown') && bridgeSource.includes('狙击封锁'), 'air bridge must adapt upstream sniper lockdown as finite enemy-pressure affix');
  assert.ok(bridgeSource.includes('minefield') && bridgeSource.includes('爆雷空域'), 'air bridge must adapt upstream minefield as finite enemy-pressure affix');
  assert.ok(bridgeSource.includes("attack: 'repair'") && bridgeSource.includes('维修词缀'), 'air bridge must adapt upstream repair boss affix into finite route pressure');
  assert.ok(bridgeSource.includes('berserker') && bridgeSource.includes('狂暴'), 'air bridge must adapt upstream berserker elite as finite enemy-pressure affix');
  assert.ok(bridgeSource.includes('regenerator') && bridgeSource.includes('再生精英'), 'air bridge must adapt upstream regenerating elite as finite enemy-pressure affix');
  assert.ok(bridgeSource.includes('carrierWing') && bridgeSource.includes('母舰残群'), 'air bridge must adapt upstream carrier enemies as finite enemy-pressure affix');
  assert.ok(bridgeSource.includes('barrage') && bridgeSource.includes("attack: 'ring'"), 'air bridge must adapt upstream barrage boss affix into finite ring pressure');
  assert.ok(bridgeSource.includes('prismBurst') && bridgeSource.includes('棱爆') && bridgeSource.includes('boss-08-prism-judge.png'), 'air bridge must adapt latest Skyward prism judge boss image and prism burst affix');
  assert.ok(bridgeSource.includes('ironCarrier') && bridgeSource.includes('铁幕') && bridgeSource.includes('boss-09-iron-carrier.png'), 'air bridge must adapt latest Skyward iron carrier boss image and escort pressure');
  assert.ok(bridgeSource.includes('tideCore') && bridgeSource.includes('引潮') && bridgeSource.includes('boss-10-tide-core.png'), 'air bridge must adapt latest Skyward tide core boss image and gravity pressure');
  assert.ok(bridgeSource.includes('skywardBossSignals') && bridgeSource.includes('Skyward更新回响'), 'air bridge must expose AI-driven Skyward boss signals to narrative context');
  assert.ok(bridgeSource.includes('fieldRepair') && bridgeSource.includes('纳米修复'), 'air bridge must adapt upstream field repair as a prior-flow reward');
  assert.ok(bridgeSource.includes('repairLoopEvery') && bridgeSource.includes('维修循环'), 'air bridge must adapt upstream repair loop as finite shield-route sustain');
  assert.ok(bridgeSource.includes('exposedCore') && bridgeSource.includes("attack: 'weak'") && bridgeSource.includes('weakDamageMult'), 'air bridge must adapt upstream exposed core as a finite boss weak-point affix');
  assert.ok(bridgeSource.includes("keys.push('exposedCore')"), 'air bridge must derive exposed core from prior-flow context instead of unconditional route filler');
  assert.ok(bridgeSource.includes('phantomEscort') && bridgeSource.includes('幻影护航') && bridgeSource.includes("enemy: 'phantom'"), 'air bridge must adapt upstream phantom escort as finite lost-resident pressure');
  assert.ok(bridgeSource.includes('weakScannerDamageMult') && bridgeSource.includes('weakScannerDuration') && bridgeSource.includes('弱点标定'), 'air bridge must adapt upstream weak scanner as finite prior-flow resonance');
  assert.ok(bridgeSource.includes('damageTakenMult') && bridgeSource.includes('钛合装甲'), 'air bridge must adapt upstream armor plating as finite shield resonance');
  assert.ok(bridgeSource.includes('钨芯重弹') && bridgeSource.includes('fireIntervalMult: 1.12'), 'air bridge must adapt upstream heavy rounds as finite cannon resonance');
  assert.ok(bridgeSource.includes('破甲弹芯') && bridgeSource.includes('armorPierceMult: 0.35'), 'air bridge must adapt upstream armor piercer as finite cannon resonance');
  assert.ok(bridgeSource.includes('装甲口径') && bridgeSource.includes('armorCaliberDamage'), 'air bridge must adapt upstream armor caliber as finite prior-flow resonance');
  assert.ok(bridgeSource.includes('生命炉心') && bridgeSource.includes('vitalReactorDamageMult'), 'air bridge must adapt upstream vital reactor as finite prior-flow damage resonance');
  assert.ok(bridgeSource.includes('护盾放大器') && bridgeSource.includes('shieldAmplifierDamageMult'), 'air bridge must adapt upstream shield amplifier as finite shield damage resonance');
  assert.ok(bridgeSource.includes('猎首协议') && bridgeSource.includes('bossHunterDamageMult'), 'air bridge must adapt upstream boss hunter as finite prior-flow boss damage resonance');
  assert.ok(bridgeSource.includes('处决算法') && bridgeSource.includes('executionerDamageMult'), 'air bridge must adapt upstream executioner as finite prior-flow low-HP damage resonance');
  assert.ok(bridgeSource.includes('导弹齐射') && bridgeSource.includes('missileVolleyBonus'), 'air bridge must adapt upstream missile route volley as finite cannon resonance');
  assert.ok(bridgeSource.includes('痛觉转换') && bridgeSource.includes('painConverterCooldownPerHp'), 'air bridge must adapt upstream pain converter as finite prior-flow resonance');
  assert.ok(bridgeSource.includes('近防协议') && bridgeSource.includes('pointDefenseRange'), 'air bridge must adapt upstream point defense as finite prior-flow resonance');
  assert.ok(bridgeSource.includes('抗干扰滤波') && bridgeSource.includes('signalFilterJamResist'), 'air bridge must adapt upstream anti-jam bonus as finite prior-flow resonance');
  assert.ok(bridgeSource.includes('flowHpBonus') && bridgeSource.includes('机体构筑记录前置流程'), 'air bridge must adapt upstream HP build visibility into finite prior-flow resonance');
  assert.ok(bridgeSource.includes('活性装甲') && bridgeSource.includes('livingArmorEvery'), 'air bridge must adapt upstream living armor as finite prior-flow resonance');
  assert.ok(bridgeSource.includes('splitPairs') && bridgeSource.includes('分束棱镜'), 'air bridge must adapt upstream split laser as beam resonance');
  assert.ok(bridgeSource.includes('sidePairs') && bridgeSource.includes('侧翼炮塔'), 'air bridge must adapt upstream side cannons as cannon resonance');

  assert.ok(airGameSource.includes('class Boss'), 'air combat slice must include boss logic');
  assert.ok(airGameSource.includes('class Enemy'), 'air combat slice must include enemy logic');
  assert.ok(airGameSource.includes('useSkill()'), 'air combat slice must include creation weapon pulse');
  assert.ok(airIndexSource.includes('airCombatAssets.js'), 'air combat page must load the Skyward asset manifest before game runtime');
  assert.ok(airGameSource.includes('AirCombatAssets') && airGameSource.includes('assets.draw') && airGameSource.includes('assets.drawScrolling'), 'air combat runtime must draw through the unified Skyward asset loader');
  assert.ok(airGameSource.includes('SKYWARD_BOSS_PROTOTYPES') && airGameSource.includes('runSkywardAttack'), 'air combat Bosses must use migrated Skyward phase attack prototypes');
  assert.ok(bridgeSource.includes('skywardBossIndex'), 'air bridge must map finite story bosses and Skyward signals to copied Boss prototypes');
  for (const key of ['shieldWall', 'beaconTrace', 'rearGuard', 'mineLayerRun', 'tetherNet', 'harvestRush']) {
    assert.ok(bridgeSource.includes(key), `air bridge must derive Skyward enemy pressure affix ${key}`);
  }
  for (const type of ['large', 'shieldCarrier', 'kamikaze', 'beacon', 'mineLayer', 'phaseWing', 'mirrorDrone', 'tether', 'warden', 'harvester']) {
    assert.ok(airGameSource.includes(type), `air combat runtime must include migrated Skyward enemy type ${type}`);
  }
  for (const behavior of ['updateBeacon', 'updateMineLayer', 'updatePhaseWing', 'updateWarden', 'reflectShot', 'stealPowerupFor', 'explodeMine']) {
    assert.ok(airGameSource.includes(behavior), `air combat runtime must include migrated Skyward enemy behavior ${behavior}`);
  }
  for (const token of ['player-wingman-attacker.png', 'enemy-warden.png', 'enemy-kamikaze.png', 'boss-11-unstable-prototype.png', 'world-08-base.png']) {
    assert.ok(airAssetsSource.includes(token), `airCombatAssets.js must include Skyward runtime asset ${token}`);
  }
  assert.ok(airGameSource.includes('renderWeaponChoices') && airGameSource.includes('airspace-choice'), 'air combat opening must render prior-flow weapon choice cards');
  assert.ok(airGameSource.includes('空域标记') && airGameSource.includes('option.focusText'), 'air combat opening must show compact choice reason tags');
  assert.ok(airGameSource.includes('syncUiState') && airGameSource.includes("this.state === 'playing'"), 'air combat opening must hide battle HUD until combat starts');
  assert.ok(airGameSource.includes('bridge.routeResonance()'), 'air combat slice must consume creation resonance locally');
  assert.ok(airGameSource.includes('firePrismLane'), 'air combat slice must apply prism boss affix locally');
  assert.ok(airGameSource.includes('bossImageCache') && airGameSource.includes('drawImage(img'), 'air combat slice must draw copied Skyward boss images with canvas fallback');
  assert.ok(airGameSource.includes('_hitFlash = 0.09') && airGameSource.includes('rgba(255, 212, 59'), 'air combat slice must preserve latest Skyward boss-hit feedback for copied boss art');
  assert.ok(airGameSource.includes('firePrismBurst') && airGameSource.includes('finishPrismBurst'), 'air combat slice must apply Skyward prism burst as finite laser-side-bullet pressure');
  assert.ok(airGameSource.includes('fireGravityPulse') && airGameSource.includes('gravityPullAt') && airGameSource.includes('drawGravityPulses'), 'air combat slice must apply Skyward tide core as visible finite gravity pressure');
  assert.ok(airGameSource.includes('guardDR') && airGameSource.includes('bossGuardCount') && airGameSource.includes('guardWeakDamageMult'), 'air combat slice must apply Skyward iron carrier guard reduction and weak deck window');
  assert.ok(airIndexSource.includes('airCombatAssets.js'), 'air combat page must load the Skyward asset manifest before game runtime');
  assert.ok(airAssetsSource.includes('window.AirCombatAssets') && airAssetsSource.includes('drawScrolling') && airAssetsSource.includes('imageBounds'), 'air combat assets must expose cropped texture drawing and scrolling backgrounds');
  for (const token of ['player-wingman-attacker.png', 'enemy-warden.png', 'enemy-kamikaze.png', 'enemy-mine-layer.png', 'boss-11-unstable-prototype.png', 'world-08-base.png']) {
    assert.ok(airAssetsSource.includes(token), `air asset manifest must include ${token}`);
  }
  for (const token of ['AirCombatAssets', 'assets.draw', 'assets.drawScrolling', 'assets.player', 'assets.wingman', 'assets.enemy', 'assets.boss', 'SKYWARD_BOSS_PROTOTYPES']) {
    assert.ok(airGameSource.includes(token), `air combat game must consume ${token}`);
  }
  for (const type of ['shieldCarrier', 'kamikaze', 'beacon', 'mineLayer', 'phaseWing', 'mirrorDrone', 'tether', 'warden', 'harvester']) {
    assert.ok(airGameSource.includes(type), `air combat runtime must migrate Skyward enemy behavior for ${type}`);
  }
  assert.ok(airGameSource.includes('updateBeacon') && airGameSource.includes('updateMineLayer') && airGameSource.includes('updatePhaseWing') && airGameSource.includes('updateWarden'), 'air combat runtime must run distinct Skyward enemy skills locally');
  assert.ok(airGameSource.includes('stealPowerupFor') && airGameSource.includes('nearestPowerup') && airGameSource.includes('reflectShot'), 'air combat runtime must include Skyward harvester and mirror-drone behaviors');
  assert.ok(airGameSource.includes('enemy.stolenKind') && airGameSource.includes('收割机掉回了被夺走的补给'), 'harvester kills must return stolen powerups instead of only deleting them');
  assert.ok(bridgeSource.includes('skywardBossIndex') && bridgeSource.includes('shieldWall') && bridgeSource.includes('beaconTrace') && bridgeSource.includes('tetherNet') && bridgeSource.includes('harvestRush'), 'air bridge must route AI/prior-flow context into migrated Skyward boss prototypes and enemy pressures');
  assert.ok(airGameSource.includes('movingWallGap') && airGameSource.includes('wallGapStep') && airGameSource.includes('laneOffset'), 'wall-pattern Boss bullets must scan their safe gap left and right instead of keeping a static center');
  assert.ok(airGameSource.includes('wallGapLanes') && airGameSource.includes('-0.78') && airGameSource.includes('0.78'), 'stage-2 wall Boss gap must sweep visibly across left and right lanes');
  assert.ok(airGameSource.includes('bossContactCd') && airGameSource.includes('this.player.takeDamage(28 + this.boss.def.stage * 2)'), 'Boss body contact must damage the player with a short collision cooldown');
  assert.ok(airGameSource.includes('bulletRateMult'), 'air combat slice must apply boss affix bullet-rate modifiers locally');
  assert.ok(airGameSource.includes('jamFactor'), 'air combat slice must apply jammer pressure locally');
  assert.ok(airGameSource.includes('jamStatus'), 'air combat HUD must show jammer weapon-slow feedback');
  assert.ok(airGameSource.includes('this.boss?.affix?.jamRadius'), 'air combat slice must let jammer boss affixes slow creation weapons');
  assert.ok(airGameSource.includes('jammedTime') && airGameSource.includes('updateJammerPressure'), 'air combat result must track finite jammer pressure');
  assert.ok(airGameSource.includes('repairNearbyEnemies'), 'air combat slice must apply support enemy depth locally');
  assert.ok(airGameSource.includes('jammer') && airGameSource.includes('support'), 'air combat enemy pool must include selected upstream enemy roles');
  assert.ok(airGameSource.includes('sniper') && airGameSource.includes('sniperWarn'), 'air combat slice must adapt upstream sniper warning shots locally');
  assert.ok(airGameSource.includes('this.sniperAim') && /stage < 5 \? \[[^\]]*'sniper'/.test(airGameSource), 'sniper enemies must warn before entering late finite route pools');
  assert.ok(airGameSource.includes('detonator') && airGameSource.includes('ringCount') && airGameSource.includes("enemy.type === 'detonator'"), 'air combat slice must adapt upstream detonator minefield enemies locally');
  assert.ok(airGameSource.includes('carrier') && airGameSource.includes('spawnCarrierChildren') && airGameSource.includes("enemy.type === 'carrier'"), 'air combat slice must adapt upstream carrier split-spawn enemies locally');
  assert.ok(airGameSource.includes('fireBarrageRing') && airGameSource.includes("this.affix.attack === 'ring'"), 'air combat slice must adapt upstream barrage boss affix locally');
  assert.ok(airGameSource.includes('applyBerserkerElite') && airGameSource.includes('eliteFireMult') && airGameSource.includes('enemy.fireMult'), 'air combat slice must apply upstream berserker elite pressure locally');
  assert.ok(airGameSource.includes('applyRegeneratorElite') && airGameSource.includes('regenPct') && airGameSource.includes("enemy.elite = 'regenerator'"), 'air combat slice must apply upstream regenerating elite pressure locally');
  assert.ok(airGameSource.includes('applyJammerElite') && airGameSource.includes("enemy.elite = 'jammer'") && airGameSource.includes("enemy.elite !== 'jammer'"), 'air combat slice must apply upstream jammer elite pressure locally');
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
  assert.ok(airGameSource.includes("if (affix.elite === 'jammer') this.applyJammerElite(escort, affix)"), 'air combat slice must let electronic warfare escorts become jammer elites');
  assert.ok(airGameSource.includes("this.affix.attack === 'repair'") && airGameSource.includes('repairBoss'), 'air combat slice must apply upstream repair boss affix locally');
  assert.ok(airGameSource.includes('updateRepairLoop') && airGameSource.includes('repairLoopStatus') && airGameSource.includes('维修循环'), 'air combat slice must apply upstream repair-loop sustain locally and in HUD');
  assert.ok(airGameSource.includes("this.affix.attack === 'weak'") && airGameSource.includes('openBossWeakPoint') && airGameSource.includes('_weakTimer'), 'air combat slice must apply upstream exposed-core weak windows locally');
  assert.ok(airGameSource.includes('target._weakTimer > 0') && airGameSource.includes('target.affix?.weakDamageMult'), 'air combat slice must increase Boss damage only during exposed-core windows');
  assert.ok(airGameSource.includes('this.resonance.weakScannerDamageMult') && airGameSource.includes('weakScannerStatus') && airGameSource.includes('弱点标定+'), 'air combat slice must fold finite weak scanner into weak-window damage and HUD');
  assert.ok(airGameSource.includes("affix.key === 'phantomEscort'") && airGameSource.includes('幻影护航'), 'air combat slice must surface phantom escort pressure separately from generic escorts');
  assert.ok(airGameSource.includes('updateFieldRepair') && airGameSource.includes('fieldRepairStatus'), 'air combat slice must apply upstream field repair locally');
  assert.ok(airGameSource.includes('this.resonance.damageTakenMult'), 'air combat slice must apply finite armor-plating damage reduction locally');
  assert.ok(airGameSource.includes('armorPierces') && airGameSource.includes('playerBulletDamage') && airGameSource.includes('armorPierceMinHp') && airGameSource.includes('bullet.main'), 'air combat slice must apply finite armor-piercer bonus only to main bullets');
  assert.ok(airGameSource.includes("this.burst(b.x, b.y, '#ff922b', 6)"), 'air combat slice must show finite armor-piercer hit feedback');
  assert.ok(airGameSource.includes('armorCaliberDamage()') && airGameSource.includes('armorCaliberStatus') && airGameSource.includes('装甲口径+'), 'air combat slice must fold prior-flow armor caliber into main cannon damage and HUD');
  assert.ok(airGameSource.includes('playerDamage(amount') && airGameSource.includes('vitalReactorStatus') && airGameSource.includes('生命炉心+'), 'air combat slice must fold upstream vital reactor into all player damage and HUD');
  assert.ok(airGameSource.includes('this.player?.shield') && airGameSource.includes('shieldAmplifierStatus') && airGameSource.includes('护盾放大器+'), 'air combat slice must apply shield amplifier only while shielded and HUD');
  assert.ok(airGameSource.includes('target?.isBoss') && airGameSource.includes('bossHunterStatus') && airGameSource.includes('猎首协议+'), 'air combat slice must apply boss hunter only to finite Boss targets and HUD');
  assert.ok(airGameSource.includes('target.hp / target.maxHp <= threshold') && airGameSource.includes('executionerStatus') && airGameSource.includes('处决算法+'), 'air combat slice must apply executioner only to low-HP finite targets and HUD');
  assert.ok(airGameSource.includes('missileVolley: true') && airGameSource.includes('missileVolleyStatus') && airGameSource.includes('导弹齐射+1'), 'air combat slice must apply upstream missile volley as finite cannon pressure and HUD');
  assert.ok(airGameSource.includes('triggerPainConverter') && airGameSource.includes('painConverterStatus') && airGameSource.includes('痛觉转译'), 'air combat slice must convert real HP loss into finite creation-pulse cooldown');
  assert.ok(airGameSource.includes('clearEnemyBulletsNear') && airGameSource.includes('triggerPointDefense') && airGameSource.includes('pointDefenseStatus'), 'air combat slice must clear enemy bullets near kills for finite point-defense resonance');
  assert.ok(airGameSource.includes('signalFilterStatus') && airGameSource.includes('signalFilterJamResist') && airGameSource.includes('Math.max(0.35, 1 - resist)'), 'air combat slice must reduce jammer slow with finite anti-jam resonance');
  assert.ok(airGameSource.includes('机体构筑') && airGameSource.includes('flowHpBonus'), 'air combat finite review must show prior-flow HP build gains');
  assert.ok(airGameSource.includes('triggerLivingArmorGrowth') && airGameSource.includes('livingArmorHpGained') && airGameSource.includes('livingArmorStatus'), 'air combat slice must grow max HP from finite living armor resonance');
  assert.ok(airGameSource.includes('弱点') && airGameSource.includes('露核窗口'), 'air combat HUD and review must surface exposed-core weak windows');
  assert.ok(airGameSource.includes('splitDamage') && airGameSource.includes('#be4bdb'), 'air combat slice must fire finite split laser side beams for beam resonance');
  assert.ok(airGameSource.includes('sideDamage') && airGameSource.includes('#ffd43b'), 'air combat slice must fire finite side cannon shots for cannon resonance');
  assert.ok(airGameSource.includes('showClearanceCard') && airGameSource.includes('updateClearanceCard'), 'air combat must show a short boss clearance card after each boss defeat');
  assert.ok(airGameSource.includes('clearanceReward') && airGameSource.includes('完美清算奖励') && airGameSource.includes('cleanClears'), 'air combat must adapt upstream cleared-event reward into finite boss-clear rewards');
  assert.ok(airGameSource.includes('this.time = 0'), 'air combat restart must reset run timer');
  assert.ok(airGameSource.includes('advanceBriefing') && airGameSource.includes('renderBriefingStep'), 'air combat must gate combat start behind briefing steps');
  assert.ok(airGameSource.includes("finish('victory')"), 'air combat route must have a finite victory state');
  assert.ok(airGameSource.includes('CREATOR_EXAM_AIR_COMBAT_READY'), 'browser verification should have a readiness signal');
  assert.ok(airGameSource.includes("dataset.airCombatReady = 'true'"), 'browser verification should have a DOM-visible readiness signal');
  assert.ok(airIndexSource.includes('id="hud-affix"'), 'air combat markup must expose an affix HUD line');
  assert.ok(airIndexSource.includes('id="airspace-choices"'), 'air combat markup must expose prior-flow weapon choices');
  assert.ok(airIndexSource.includes('id="airspace-hud" class="airspace-hud hidden"'), 'air combat battle HUD must start hidden during briefing');
  assert.ok(airIndexSource.includes('id="airspace-clearance-card"'), 'air combat markup must expose a boss clearance card');
  for (const asset of [
    'public/modes/air-combat/assets/images/bosses/boss-08-prism-judge.png',
    'public/modes/air-combat/assets/images/bosses/boss-09-iron-carrier.png',
    'public/modes/air-combat/assets/images/bosses/boss-10-tide-core.png'
  ]) {
    assert.ok(existsSync(new URL(asset, rootUrl)), `${asset} must exist for copied Skyward boss art`);
  }
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
  const nextSegmentBlock = sourceBlock(airGameSource, '    nextSegment() {', '    currentAffix() {');
  assert.ok(nextSegmentBlock.includes('this.segmentStartDamage = this.damageTaken'), 'clean-clear tracking must cover the whole finite segment, not just the Boss phase');
  const spawnBossBlock = sourceBlock(airGameSource, '    spawnBoss() {', '    firePlayer() {');
  assert.ok(!spawnBossBlock.includes('segmentStartDamage'), 'Boss spawn must not reset clean-clear damage baseline after pre-boss waves');

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
  assert.ok(highPressure.routeResonance().flowHpBonus >= 20, 'prior-flow HP build gain should be visible to finite air review');
  assert.ok(highPressure.routeResonance().shieldAmplifierDamageMult > 0, 'starting shield should unlock finite shield amplifier resonance');
  assert.ok(highPressure.routeResonance().shieldAmplifierDamageMult <= 0.18, 'shield amplifier damage multiplier must stay bounded');
  assert.ok(highPressure.routeResonance().bossHunterDamageMult > 0, 'discovered lore or high final pressure should unlock finite boss hunter resonance');
  assert.ok(highPressure.routeResonance().bossHunterDamageMult <= 0.4, 'boss hunter damage multiplier must stay bounded');
  assert.equal(highPressure.routeResonance().missileVolleyBonus, 1, 'block/cannon creations should unlock finite missile volley');
  assert.ok(highPressure.routeResonance().painConverterCooldownPerHp > 0, 'high final pressure should unlock finite pain converter resonance');
  assert.ok(highPressure.routeResonance().painConverterMaxCooldown <= 4.2, 'pain converter cooldown refund must stay bounded');
  assert.ok(highPressure.routeResonance().pointDefenseRange > 0, 'rescued residents should unlock finite point-defense resonance');
  assert.ok(highPressure.routeResonance().signalFilterJamResist > 0, 'light/memory or stable defense flow should unlock finite anti-jam resonance');
  assert.ok(highPressure.routeResonance().signalFilterJamResist <= 0.28, 'anti-jam resonance must stay bounded');
  assert.equal(highPressure.routeResonance().livingArmorEvery, 12, 'stable defense flow should unlock finite living armor growth');
  assert.equal(highPressure.routeResonance().livingArmorMaxHp, 30, 'finite living armor growth must stay capped');
  for (const boss of highRoute) {
    assert.ok(['prism', 'prismBurst', 'ionStorm', 'ring', 'escort', 'repair', 'weak', 'gravity', undefined].includes(boss.affix.attack), `unknown finite affix attack ${boss.affix.attack}`);
    assert.ok(boss.hp >= 300 && boss.hp <= 1100, `boss ${boss.title} hp is outside finite route bounds`);
  }

  const exposedCoreRoute = loadAirBridgeForContext({
    entropy: 6,
    endingPressure: 0.78,
    rescuedResidents: [{ name: '阿岚' }],
    lostResidents: [],
    recentCreations: [{ name: '会发光并指路的月亮树', ability: 'illuminate' }],
    towerDefenseResult: { victory: false },
    discoveredLore: [{ title: '裂隙核心会被光照出轮廓' }]
  });
  assert.ok(exposedCoreRoute.contextualAffixKeys().includes('exposedCore'), 'light/lore route should unlock finite exposed-core windows');
  const exposedCoreBoss = exposedCoreRoute.route().find(boss => boss.affix.key === 'exposedCore');
  assert.ok(exposedCoreBoss, 'finite route should include exposed-core affix when prior creations reveal the core');
  assert.equal(exposedCoreBoss.affix.weakDamageMult, 0.35, 'exposed-core weak window damage bonus must stay bounded');
  assert.equal(exposedCoreRoute.routeResonance().weakScannerDamageMult, 0.25, 'light/lore routes should unlock finite weak scanner damage resonance');
  assert.equal(exposedCoreRoute.routeResonance().weakScannerDuration, 0.4, 'finite weak scanner should only extend exposed-core windows by a small bounded amount');

  const aggressiveCoreRoute = loadAirBridgeForContext({
    entropy: 2,
    endingPressure: 0.67,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '秩序重炮', ability: 'block' }],
    playerStyle: 'aggressive'
  });
  assert.equal(aggressiveCoreRoute.route()[0].affix.key, 'exposedCore', 'aggressive high-pressure flow should be able to expose the first boss core');
  const aggressiveAffixKeys = aggressiveCoreRoute.route().map(boss => boss.affix.key);
  assert.equal(new Set(aggressiveAffixKeys).size, aggressiveAffixKeys.length, 'sparse finite routes should avoid repeating recent boss affixes');
  assert.equal(aggressiveCoreRoute.weaponOptions().length, 3, 'prior-flow air opening should offer three weapon choices');
  assert.ok(aggressiveCoreRoute.weaponOptions().every(option => option.reason), 'each air weapon choice should explain its prior-flow reason');
  const firstChoice = aggressiveCoreRoute.weaponLoadout().ability;
  aggressiveCoreRoute.selectWeaponOption(1);
  assert.notEqual(aggressiveCoreRoute.weaponLoadout().ability, firstChoice, 'selecting an air weapon card should change the active loadout');

  const contextualChoiceRoute = loadAirBridgeForContext({
    entropy: 0,
    endingPressure: 0.67,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '未定形造物', ability: 'unknown' }],
    playerStyle: 'aggressive'
  });
  assert.ok(contextualChoiceRoute.weaponOptions().some(option => option.focusText === '路线续构'), 'contextual air weapon choices should show focused route reason tags');
  assert.ok(contextualChoiceRoute.weaponOptions().some(option => option.kind === 'shield' && option.focusText === '生命续航'), 'air weapon choices should include one HP/sustain option when none was already present');

  const describedCreationRoute = loadAirBridgeForContext({
    entropy: 3,
    endingPressure: 0.4,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '会把洪水唱成星图的透明鲸鱼', ability: 'absorb_water', description: '玩家原句：它把水声筛成可以导航的星点', tags: ['水', '记忆'] }]
  });
  assert.equal(describedCreationRoute.weaponLoadout().sourceDescription, '玩家原句：它把水声筛成可以导航的星点', 'air weapon loadout should keep original creation description for AI');

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
  assert.ok(lostRoute.route().some(boss => boss.affix.key === 'phantomEscort'), 'lost residents plus final pressure should introduce finite phantom escort pressure');

  const mineRoute = loadAirBridgeForContext({
    entropy: 6,
    endingPressure: 0.7,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '鲸潮护盾', ability: 'absorb_water' }],
    towerDefenseResult: { victory: true }
  });
  assert.ok(mineRoute.route().some(boss => boss.affix.key === 'minefield'), 'missile-like pressure should introduce finite minefield enemy pressure');
  assert.ok(mineRoute.route().some(boss => boss.affix.key === 'barrage'), 'high pressure should introduce finite barrage ring pressure');
  assert.ok(mineRoute.route().some(boss => boss.affix.key === 'regenerator'), 'successful night-watch pressure should introduce finite regenerating elite pressure');
  assert.ok(mineRoute.route().some(boss => boss.affix.key === 'carrierWing'), 'deep finite routes should introduce carrier split-spawn enemy pressure');

  const memoryRoute = loadAirBridgeForContext({
    entropy: 2,
    endingPressure: 0.4,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '记忆航标', ability: 'memory_beacon' }]
  });
  assert.ok(memoryRoute.route().some(boss => boss.affix.key === 'jammerElite'), 'memory beacon routes should introduce finite jammer elite pressure');
  assert.ok(memoryRoute.routeResonance().pointDefenseRange > 0, 'memory beacon weapons should unlock finite point-defense even without rescued residents');
  assert.equal(memoryRoute.routeResonance().shieldAmplifierDamageMult, 0, 'routes without starting shield must not get shield amplifier damage');
  assert.equal(memoryRoute.routeResonance().bossHunterDamageMult, 0, 'low-pressure routes without lore must not get boss hunter damage');
  assert.equal(memoryRoute.routeResonance().executionerDamageMult, 0, 'low-pressure routes without aggressive style must not get executioner damage');

  const aggressiveRoute = loadAirBridgeForContext({
    entropy: 3,
    endingPressure: 0.48,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '月亮树', ability: 'illuminate' }],
    playerStyle: 'aggressive'
  });
  assert.equal(aggressiveRoute.routeResonance().executionerThreshold, 0.4, 'executioner threshold should mirror upstream finite low-HP cutoff');
  assert.equal(aggressiveRoute.routeResonance().executionerDamageMult, 0.3, 'aggressive prior style should unlock bounded finite executioner damage');

  const shieldRoute = loadAirBridgeForContext({
    entropy: 1,
    endingPressure: 0.3,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '鲸潮护盾', ability: 'absorb_water' }]
  });
  assert.equal(shieldRoute.routeResonance().shieldAmplifierDamageMult, 0.18, 'shield weapons should unlock upstream shield amplifier damage');
  assert.equal(shieldRoute.routeResonance().repairLoopEvery, 14, 'shield weapons should unlock finite repair-loop sustain');
  assert.equal(shieldRoute.routeResonance().repairLoopHealPct, 0.06, 'finite repair-loop healing should stay bounded');
  assert.equal(shieldRoute.routeResonance().repairLoopMaxShield, 36, 'finite repair-loop shielding should stay capped');

  const failedDefenseRoute = loadAirBridgeForContext({
    entropy: 4,
    endingPressure: 0.6,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '断裂路标', ability: 'terrain' }],
    towerDefenseResult: { victory: false }
  });
  const ewarRoute = loadAirBridgeForContext({
    entropy: 4,
    endingPressure: 0.62,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '记忆航标', ability: 'memory_beacon' }],
    towerDefenseResult: { victory: false }
  });
  assert.ok(ewarRoute.route().some(boss => boss.affix.key === 'ewar'), 'failed defense plus memory routes should introduce finite electronic warfare pressure');

  const shieldWallRoute = loadAirBridgeForContext({
    entropy: 1,
    endingPressure: 0.72,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '屏障造物', ability: 'block' }]
  });
  assert.ok(shieldWallRoute.route().some(boss => boss.affix.key === 'shieldWall'), 'block routes should introduce finite Skyward shield-wall pressure');

  const rearGuardRoute = loadAirBridgeForContext({
    entropy: 1,
    endingPressure: 0.4,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '尖刺航线', ability: 'terrain' }],
    playerStyle: 'aggressive'
  });
  assert.ok(rearGuardRoute.route().some(boss => boss.affix.key === 'rearGuard'), 'aggressive routes should introduce finite Skyward rear-guard pressure');

  const harvestRoute = loadAirBridgeForContext({
    entropy: 0,
    endingPressure: 0.62,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '补给塔', ability: 'terrain' }],
    towerDefenseResult: { victory: true }
  });
  assert.ok(harvestRoute.route().some(boss => boss.affix.key === 'harvestRush'), 'successful night-watch routes should introduce finite Skyward harvester pressure');

  const skywardRoute = loadAirBridgeForContext({
    entropy: 2,
    endingPressure: 0.58,
    rescuedResidents: [],
    lostResidents: [],
    recentCreations: [{ name: '会折射重力潮汐的棱镜护卫舰', ability: 'illuminate', description: '玩家提到棱镜审判者、铁幕空母和引潮核心都会在空域重现' }],
    skywardRaidUpdate: 'Skyward 最新重大更新：棱镜审判者、铁幕空母、引潮核心 Boss 设计完成。'
  });
  assert.equal(skywardRoute.skywardBossSignals().map(signal => signal.key).join(' / '), 'prismBurst / ironCarrier / tideCore', 'AI/Skyward update context should expose three latest boss signals');
  const skywardKeys = skywardRoute.route().map(boss => boss.affix.key);
  assert.ok(skywardKeys.includes('prismBurst'), 'Skyward prism judge signal should introduce finite prism burst route pressure');
  assert.ok(skywardKeys.includes('ironCarrier'), 'Skyward iron carrier signal should introduce finite guard escort route pressure');
  assert.ok(skywardKeys.includes('tideCore'), 'Skyward tide core signal should introduce finite gravity route pressure');

  const coveredAffixes = new Set([
    ...highPressure.route(),
    ...repairOpening.route(),
    ...lostRoute.route(),
    ...mineRoute.route(),
    ...memoryRoute.route(),
    ...exposedCoreRoute.route(),
    ...failedDefenseRoute.route(),
    ...ewarRoute.route(),
    ...shieldWallRoute.route(),
    ...rearGuardRoute.route(),
    ...harvestRoute.route(),
    ...skywardRoute.route()
  ].map(boss => boss.affix.key));
  for (const key of configuredAirAffixKeys()) {
    assert.ok(coveredAffixes.has(key), `configured finite air affix ${key} must be reachable from a main-flow context`);
  }
}

function assertMainMobileLayoutContracts() {
  const cssSource = readSource('public/styles.css');
  assert.ok(cssSource.includes('.test-jump-panel[open] > .test-jump-grid'), 'closed test jump details must not leak its grid over later panels');
  assert.ok(/@media \(max-width: 760px\)[\s\S]*#game-root\s*\{[\s\S]*width:\s*100%;/.test(cssSource), 'mobile root must use client width instead of 100vw to avoid horizontal overflow');
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
    assert.ok(!String(narrative.json.text || '').includes('Local chronicle'), 'fallback narrative must not expose English template prefixes');
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
assertMainMobileLayoutContracts();
await assertNoKeyServerFallbacks();

console.log('Current-code reality tests passed');
