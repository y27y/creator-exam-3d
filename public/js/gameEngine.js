import { cloneLevel, LEVELS, SYMBOL_TO_TILE, TILE } from './levels.js';
import { localCompile } from './aiClient.js';
import { RESONANCE_CODEX, executeChainReaction } from './chainReactionCodex.js';
import { legacySystem, TRAIT_POOL } from './legacySystem.js';
import { worldLegendSystem } from './worldLegend.js';
import { persistentWorld } from './persistentWorld.js';
import { RitualForge } from './ritualForge.js';
import { OathManager, OATH_TYPES } from './oathbinding.js';
import { CognitiveAbyss } from './cognitiveAbyss.js';
import { VerificationCorruption } from './verificationCorruption.js';
import { CreatorWorkshop, WorkshopCreation } from './creatorWorkshop.js';
import { EnemyIntentSystem } from './enemyIntent.js';
import { applyAbility, hasAbilityHandler } from './abilityHandlers.js';
import { normalizeCreationDisplayText, normalizeCreationName } from './creationDisplay.js';

const BOARD_SIZE = 7;
const MAX_LOGS = 100;
const KNOWN_UNIT_RESIDENT_IDS = Object.freeze({
  '小烛': 'resident-xiaozhu'
});

const TERRAIN_LABELS = {
  [TILE.LAND]: '平地',
  [TILE.WATER]: '水域',
  [TILE.HIGH]: '高地',
  [TILE.VILLAGE]: '村庄',
  [TILE.EXIT]: '出口',
  [TILE.CITY]: '城市',
  [TILE.BORDER]: '边境',
  [TILE.FOREST]: '森林',
  [TILE.MOUNTAIN]: '山体',
  [TILE.DARK]: '黑暗',
  [TILE.FOG]: '迷雾',
  [TILE.SACRED]: '圣树',
  [TILE.SWAMP]: '沼泽',
  [TILE.BRIDGE]: '桥梁',
  [TILE.WALL]: '屏障',
  [TILE.FIELD]: '结界',
  [TILE.POISON]: '污染'
};

const TERRAIN_SYMBOLS = {
  [TILE.LAND]: '.',
  [TILE.WATER]: '~',
  [TILE.HIGH]: 'H',
  [TILE.VILLAGE]: 'V',
  [TILE.EXIT]: 'E',
  [TILE.CITY]: 'C',
  [TILE.BORDER]: 'B',
  [TILE.FOREST]: 'F',
  [TILE.MOUNTAIN]: 'M',
  [TILE.DARK]: 'D',
  [TILE.FOG]: 'G',
  [TILE.SACRED]: 'S',
  [TILE.SWAMP]: 'W',
  [TILE.BRIDGE]: '=',
  [TILE.WALL]: '#',
  [TILE.FIELD]: '*',
  [TILE.POISON]: 'P'
};

/**
 * GameEngine - Pure logic base class for Creator Exam 3D.
 * No UI or rendering dependencies. Subclasses provide hooks for platform-specific behavior.
 */
class GameEngine {
  constructor(options = {}) {
    this.levelIndex = 0;
    this.hooks = {
      onLog: options.onLog || (() => {}),
      onWin: options.onWin || (() => {}),
      onLose: options.onLose || (() => {}),
      onRescue: options.onRescue || (() => {}),
      onPlacement: options.onPlacement || (() => {}),
      onTurnEnd: options.onTurnEnd || (() => {}),
      onStateChange: options.onStateChange || (() => {}),
      onHazardSpread: options.onHazardSpread || (() => {}),
      onCreationExpire: options.onCreationExpire || (() => {}),
      onWorldEvent: options.onWorldEvent || (() => {})
    };
    this.ritualForge = new RitualForge();
    this.oathManager = new OathManager();
    this.cognitiveAbyss = new CognitiveAbyss();
    this.verificationCorruption = new VerificationCorruption();
    this.creatorWorkshop = new CreatorWorkshop();
    this.enemyIntentSystem = new EnemyIntentSystem();
    this.reset();
  }

  // ========== State Management ==========

  reset() {
    if (this.levelIndex === -1 && this.level) {
      // Region loaded via loadRegion; keep level but reinitialize derived state
      this.terrain = this.level.map.map((row) => row.split('').map((char) => SYMBOL_TO_TILE[char] || TILE.LAND))
    } else {
      this.level = cloneLevel(LEVELS[this.levelIndex])
      this.terrain = this.level.map.map((row) => row.split('').map((char) => SYMBOL_TO_TILE[char] || TILE.LAND))
    }
    this.units = this.level.units.map((unit, unitIndex) => ({
      id: `${this.level.id}-${unitIndex}`,
      status: 'active',
      rescued: false,
      lost: false,
      stunnedTurns: 0,
      guidedTurns: 0,
      hazardCoverTurns: 0,
      lastHazardTerrain: null,
      met: false,
      ...unit,
      residentId: unit.residentId || this.resolveUnitResidentId(unit, unitIndex)
    }))
    this.creations = []
    this.turn = 1
    this.rescued = 0
    this.lost = 0
    this.entropy = 0
    this.creationCharges = this.level.creationCharges
    this.miraclePoints = this.level.miraclePoints
    this.warMeter = Number(this.level.hazard?.warMeter || 0)
    this.peaceTalks = 0
    this.gameState = 'playing'
    this.logs = []
    this.worldState = this.initWorldState()
    this.resonanceCodex = RESONANCE_CODEX
    this.resonanceCodex.reset()
    this.npcManager = null
    this.legacyUnits = []
    this.returnedLegacyUnits = []
  }

  loadLevel(index) {
    this.levelIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
    this.reset();
    this.log(`考核开始：${this.level.shortTitle}。`, true);
    for (const tip of this.level.tips || []) this.log(`提示：${tip}`);

    // 加载传承NPC
    const legacyNPCs = legacySystem.getNPCsForNextLevel(this.level.id);
    if (legacyNPCs && legacyNPCs.length > 0) {
      this.log(`【传承】${legacyNPCs.length} 位故人出现在此关卡`, true);
      for (const npc of legacyNPCs) {
        this.log(`  ${npc.name} - ${npc.lore}`);
      }
    }
    this.legacyUnits = legacyNPCs;
    this.applyLegacyUnitEffects(this.legacyUnits);

    // 加载会作为真实棋盘单位回归的传承角色，而不只是 NPC 面板展示。
    const legacyReturnUnits = legacySystem.getUnitsForNextLevel(this.level.id);
    this.integrateLegacyReturnUnits(legacyReturnUnits);

    this.hooks.onStateChange();
  }

  loadRegion(regionData) {
    if (!regionData?.id || !Array.isArray(regionData.map)) {
      throw new Error('loadRegion requires validated region data')
    }
    this.level = {
      ...regionData,
      map: regionData.map.map(row => String(row)),
      units: (regionData.units || []).map(unit => ({
        ...unit,
        goal: unit.goal ? { ...unit.goal } : undefined
      }))
    }
    this.levelIndex = -1
    this.reset()
    return this.level
  }

  integrateLegacyReturnUnits(legacyReturnUnits = []) {
    this.returnedLegacyUnits = []
    for (const legacyUnit of legacyReturnUnits) {
      const unit = this.prepareLegacyReturnUnit(legacyUnit)
      if (!unit) continue
      this.units.push(unit)
      this.returnedLegacyUnits.push(unit)
      this.log(`【传承回归】${unit.name} 作为${unit.tier || 'survivor'}单位加入本关，目标 ${this.tileName(unit.goal.x, unit.goal.y)}。`, true)
    }
    return this.returnedLegacyUnits
  }

  prepareLegacyReturnUnit(legacyUnit) {
    if (!legacyUnit) return null
    const goal = this.resolveLegacyReturnGoal(legacyUnit)
    if (!goal) return null
    const position = this.findLegacyReturnSpawn(legacyUnit, goal)
    if (!position) return null
    return {
      ...legacyUnit,
      id: this.uniqueLegacyReturnId(legacyUnit),
      residentId: legacyUnit.residentId || `legacy-resident-${legacyUnit.legacyId || legacyUnit.id}`,
      x: position.x,
      y: position.y,
      goal,
      status: 'active',
      rescued: false,
      lost: false,
      stunned: false,
      hazardCoverTurns: 0,
      lastHazardTerrain: null,
      guidedTurns: Math.max(legacyUnit.guidedTurns || 0, legacyUnit.guideOthers ? 1 : 0),
      met: false,
      isLegacy: true,
      isLegacyReturn: true
    }
  }

  uniqueLegacyReturnId(legacyUnit) {
    const baseId = legacyUnit.legacyId || legacyUnit.id || legacyUnit.name || 'unit'
    let index = 1
    let id = `legacy-return-${baseId}`
    while (this.units.some(unit => unit.id === id)) {
      index += 1
      id = `legacy-return-${baseId}-${index}`
    }
    return id
  }

  resolveLegacyReturnGoal(legacyUnit) {
    const sameType = this.level.units.find(unit => unit.type === legacyUnit.type && unit.goal)
    const guidedUnit = this.level.units.find(unit => (this.isCivilian(unit) || this.isMessenger(unit)) && unit.goal)
    const anyGoal = this.level.units.find(unit => unit.goal)
    const source = sameType || guidedUnit || anyGoal
    if (source?.goal) return { ...source.goal }
 
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const terrain = this.getTerrain(x, y)
        if (terrain === TILE.EXIT || terrain === TILE.SACRED || terrain === TILE.HIGH || terrain === TILE.CITY) {
          return { x, y }
        }
      }
    }
    return null
  }

  resolveUnitResidentId(unit, unitIndex) {
    if (!unit?.name) return null
    if (KNOWN_UNIT_RESIDENT_IDS[unit.name]) return KNOWN_UNIT_RESIDENT_IDS[unit.name]
    return `resident-${this.level?.id || 'region'}-${unitIndex}`
  }

  findLegacyReturnSpawn(legacyUnit, goal) {
    const probe = { ...legacyUnit, goal }
    const preferredTerrains = new Set([TILE.VILLAGE, TILE.LAND, TILE.BORDER, TILE.BRIDGE])
    const candidates = []
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.unitAt(x, y)) continue
        if (!this.isPassable(x, y, probe)) continue
        const terrain = this.getTerrain(x, y)
        const pathProbe = { ...probe, x, y }
        const canMove = x === goal.x && y === goal.y ? true : !!this.nextStepToward(pathProbe, goal)
        if (!canMove) continue
        candidates.push({
          x,
          y,
          score: (preferredTerrains.has(terrain) ? 100 : 0) + this.distance(x, y, goal.x, goal.y)
        })
      }
    }
    candidates.sort((a, b) => b.score - a.score)
    return candidates[0] || null
  }

  initWorldState() {
    return {
      currentLevel: this.level?.title || '未知',
      rescued: 0,
      lost: 0,
      entropy: 0,
      entropyLimit: this.level?.entropyLimit || 7,
      creations: [],
      discoveredLore: [],
      playStyle: '未知',
      actions: [],
      choices: [],
      narrativeMemory: [],
      characterRelationships: {},
      worldEvents: [],
      storySeeds: {
        sacrificeMade: false,
        livesSaved: 0,
        livesLost: 0,
        creationsUsed: [],
        uniqueStrategies: [],
        worldChanged: false
      }
    };
  }

  applyLegacyUnitEffects(legacyNPCs = []) {
    const legacyByName = new Map();
    for (const legacy of legacyNPCs) {
      if (legacy && legacy.name) legacyByName.set(legacy.name, legacy);
    }

    for (const unit of this.units) {
      const legacy = legacyByName.get(unit.name);
      if (!legacy) continue;

      unit.isLegacy = true;
      unit.legacyId = legacy.id;
      unit.legacyTier = legacy.tier;
      unit.legacyTraits = (legacy.traits || []).map(t => t.id);

      // Apply tier bonuses
      const tier = legacySystem.constructor === Object
        ? null
        : (typeof legacySystem.getTier === 'function' ? legacySystem.getTier(legacy.tier) : null);
      const tierData = tier || { survivor: { bonus: null }, hero: { bonus: 'random_trait' }, legend: { bonus: 'choose_trait' }, ancestor: { bonus: 'new_game_plus' } }[legacy.tier];

      if (legacy.tier === 'ancestor') {
        unit.maxExtraLives = (unit.maxExtraLives || 0) + 1;
        unit.extraLives = unit.maxExtraLives;
      }
      if (legacy.tier === 'legend' || legacy.tier === 'ancestor') {
        unit.moveBonus = (unit.moveBonus || 0) + 1;
        this.log(`【传承】${unit.name} 获得先祖移速加成，本关移动 +1 格。`);
      }

      // Apply trait effects
      for (const traitId of unit.legacyTraits) {
        const trait = Object.values(TRAIT_POOL).find(t => t.id === traitId);
        if (!trait) continue;
        switch (trait.effect) {
          case 'immune_to_water_loss':
            unit.waterImmune = true;
            break;
          case 'immune_to_dark_chaos':
            unit.chaosImmune = true;
            break;
          case 'beast_anger_slow':
            unit.beastCalm = true;
            break;
          case 'extra_war_reduction':
            unit.peaceBonus = true;
            break;
          case 'chaos_resistance':
            unit.chaosResist = true;
            break;
          case 'move_speed_plus':
            unit.moveBonus = (unit.moveBonus || 0) + 1;
            this.log(`【传承】${unit.name} 获得移速特质加成，本关移动 +1 格。`);
            break;
          case 'guide_others':
            unit.guideOthers = true;
            break;
          case 'emergency_boost':
            unit.emergencyBoost = true;
            break;
        }
      }
    }
  }

  // ========== World State Management ==========

  updateWorldState(action) {
    const detail = normalizeCreationDisplayText(action.detail);
    const creationName = action.creationName
      ? normalizeCreationName({ name: action.creationName, ability: action.ability })
      : '';
    this.worldState.actions.push({
      turn: this.turn,
      type: action.type,
      detail,
      timestamp: Date.now()
    });
    this.analyzePlayStyle();
    if (action.type === 'creation_placed') {
      this.worldState.storySeeds.creationsUsed.push(creationName);
      this.worldState.creations.push(creationName);
    }
    if (action.type === 'unit_rescued') {
      this.worldState.storySeeds.livesSaved += 1;
      this.worldState.rescued += 1;
    }
    if (action.type === 'unit_lost') {
      this.worldState.storySeeds.livesLost += 1;
      this.worldState.lost += 1;
    }
    if (action.type === 'sacrifice') {
      this.worldState.storySeeds.sacrificeMade = true;
    }
    if (this.worldState.actions.length > 50) {
      this.worldState.actions = this.worldState.actions.slice(-50);
    }
  }

  emitWorldEvent(type, payload = {}, options = {}) {
    const event = {
      type,
      regionId: this.level?.id || 'unknown',
      actorId: options.actorId || 'player',
      turn: this.turn,
      payload,
      importance: options.importance ?? 0.5,
      tags: options.tags || []
    };
    this.hooks.onWorldEvent(event);

    // Route to NPC manager if available
    if (this.npcManager) {
      const npcEventType = this.mapWorldEventToNPCEvent(type);
      if (npcEventType) {
        this.npcManager.reactToGameEvent(npcEventType, payload);
      }
    }

    return event;
  }

  mapWorldEventToNPCEvent(worldEventType) {
    const mapping = {
      'creation_placed': 'onCreation',
      'unit_rescued': 'onRescue',
      'unit_lost': 'onLoss',
      'hazard_spread': 'onHazard',
      'region_resolved': 'onWin',
      'region_lost': 'onLose'
    };
    return mapping[worldEventType] || null;
  }

  recordCreationPlacement(creation, x, y) {
    const card = creation.card;
    const creationName = normalizeCreationName(card);
    this.updateWorldState({ type: 'creation_placed', detail: creationName, creationName, ability: card.ability });

    // Record legendary event for high-impact or rare creations
    const isRare = card.tags?.some(tag => ['legendary', 'epic', 'sacred', 'forbidden'].includes(tag));
    const isHighCost = (card.cost || 0) >= 3 || (card.stabilityCost || 0) >= 2;
    if (isRare || isHighCost) {
      this.recordLegendaryEvent('creation', '造物者', creationName, isHighCost ? 'major' : 'minor');
    }

    return this.emitWorldEvent('creation_placed', {
      creationId: creation.id,
      creationName,
      ability: card.ability,
      x,
      y,
      entropyDelta: card.stabilityCost
    }, {
      importance: Math.min(1, 0.4 + card.stabilityCost * 0.2),
      tags: ['creation', card.ability]
    });
  }

  emitUnitLostEvent(unit, terrain) {
    return this.emitWorldEvent('unit_lost', {
      unitId: unit.id,
      unitName: unit.name,
      unitType: unit.type,
      residentId: unit.residentId || null,
      terrain
    }, {
      importance: 0.8,
      tags: ['loss', unit.type, terrain]
    });
  }

  emitRegionResolvedEvent(message) {
    return this.emitWorldEvent('region_resolved', {
      message,
      rescued: this.rescued,
      lost: this.lost,
      entropy: this.entropy,
      result: 'won'
    }, {
      importance: 0.9,
      tags: ['region', 'victory']
    });
  }

  emitRegionLostEvent(message) {
    return this.emitWorldEvent('region_lost', {
      message,
      rescued: this.rescued,
      lost: this.lost,
      entropy: this.entropy,
      result: 'lost'
    }, {
      importance: 0.9,
      tags: ['region', 'loss']
    });
  }

  analyzePlayStyle() {
    const actions = this.worldState.actions;
    const creationCount = actions.filter(a => a.type === 'creation_placed').length;
    const rescueCount = actions.filter(a => a.type === 'unit_rescued').length;
    const lossCount = actions.filter(a => a.type === 'unit_lost').length;
    if (creationCount === 0 && rescueCount > 0) {
      this.worldState.playStyle = '自然派';
    } else if (creationCount > rescueCount * 2) {
      this.worldState.playStyle = '造物狂';
    } else if (lossCount === 0 && rescueCount > 0) {
      this.worldState.playStyle = '完美主义者';
    } else if (this.worldState.storySeeds.sacrificeMade) {
      this.worldState.playStyle = '牺牲者';
    } else if (creationCount > 0 && rescueCount > 0) {
      this.worldState.playStyle = '平衡型';
    }
  }

  addDiscoveredLore(loreId, loreText) {
    if (!this.worldState.discoveredLore.includes(loreId)) {
      this.worldState.discoveredLore.push(loreId);
      this.worldState.narrativeMemory.push({
        type: 'lore',
        id: loreId,
        text: loreText,
        turn: this.turn,
        level: this.level?.title
      });
    }
  }

  addNarrativeMemory(type, content, relatedCharacters = []) {
    this.worldState.narrativeMemory.push({
      type,
      content,
      turn: this.turn,
      level: this.level?.title,
      relatedCharacters,
      timestamp: Date.now()
    });
    if (this.worldState.narrativeMemory.length > 30) {
      this.worldState.narrativeMemory = this.worldState.narrativeMemory.slice(-30);
    }
  }

  getWorldStateForAI() {
    return {
      currentLevel: this.worldState.currentLevel,
      rescued: this.worldState.rescued,
      lost: this.worldState.lost,
      entropy: this.entropy,
      entropyLimit: this.worldState.entropyLimit,
      creations: this.worldState.creations.slice(-5),
      discoveredLore: this.worldState.discoveredLore,
      playStyle: this.worldState.playStyle,
      recentActions: this.worldState.actions.slice(-5).map(a => `${a.type}: ${a.detail}`),
      storySeeds: this.worldState.storySeeds
    };
  }

  // ========== Query Interfaces ==========

  getAllData() {
    return {
      level: this.level,
      terrain: this.getTerrainGrid(),
      units: this.units.map((u) => ({ ...u })),
      creations: this.creations.map((c) => ({
        ...c,
        card: { ...c.card }
      })),
      state: {
        turn: this.turn,
        maxTurns: this.level.maxTurns,
        creationCharges: this.creationCharges,
        miraclePoints: this.miraclePoints,
        entropy: this.entropy,
        entropyLimit: this.level.entropyLimit,
        rescued: this.rescued,
        lost: this.lost,
        warMeter: this.warMeter,
        gameState: this.gameState,
        levelIndex: this.levelIndex
      },
      logs: [...this.logs]
    };
  }

  getTerrainGrid() {
    return this.terrain.map((row) => row.map((t) => ({
      type: t,
      label: TERRAIN_LABELS[t] || '未知',
      symbol: TERRAIN_SYMBOLS[t] || '?'
    })));
  }

  getUnits() {
    return this.units.map((u) => ({ ...u }));
  }

  getCreations() {
    return this.creations.map((c) => ({
      ...c,
      card: { ...c.card }
    }));
  }

  getGameState() {
    return {
      turn: this.turn,
      maxTurns: this.level.maxTurns,
      creationCharges: this.creationCharges,
      miraclePoints: this.miraclePoints,
      entropy: this.entropy,
      entropyLimit: this.level.entropyLimit,
      rescued: this.rescued,
      lost: this.lost,
      warMeter: this.warMeter,
      gameState: this.gameState
    };
  }

  getGameContext() {
    return {
      levelTitle: this.level.title,
      levelObjective: this.level.objective,
      hazardType: this.level.hazard?.type || '',
      turn: this.turn,
      maxTurns: this.level.maxTurns,
      miraclePoints: this.miraclePoints,
      creationCharges: this.creationCharges,
      entropy: this.entropy,
      rescued: this.rescued,
      warMeter: this.warMeter
    };
  }

  // ========== Phase 5 System Facades ==========

  generateEnemyIntentPreview() {
    return this.enemyIntentSystem.generatePreviews(this.worldState, this);
  }

  getRitualSuggestions() {
    const placed = this.creations.filter(c => c.placed && c.remaining > 0);
    return this.ritualForge.getSuggestions({
      entropy: this.entropy,
      entropyLimit: this.level.entropyLimit
    }, placed);
  }

  getAbyssState() {
    return this.cognitiveAbyss.getStateDescription();
  }

  getCorruptionStats() {
    return this.verificationCorruption.getStats();
  }

  attemptDecodeAbyss(input) {
    return this.cognitiveAbyss.attemptDecode(input);
  }

  generateAbyssRiddle(type = 'instruction') {
    const riddle = this.cognitiveAbyss.generateRiddle(type);
    if (riddle) {
      riddle.depth = this.cognitiveAbyss.depth;
      riddle.active = this.cognitiveAbyss.active;
    }
    return riddle;
  }

  createParadoxCard(paradoxType) {
    return this.verificationCorruption.createParadoxCard(paradoxType, this.worldState, this.getPlayerProfile?.());
  }

  workshopAddCreation(card) {
    return this.creatorWorkshop.addCreation(card);
  }

  workshopDismantle(invId) {
    return this.creatorWorkshop.dismantle(invId);
  }

  workshopModify(workshopId, modType) {
    return this.creatorWorkshop.modify(workshopId, modType);
  }

  workshopFuse(id1, id2) {
    return this.creatorWorkshop.fuse(id1, id2);
  }

  workshopGetInventory() {
    return this.creatorWorkshop.inventory;
  }

  workshopGetMaterials() {
    return this.creatorWorkshop.getMaterialsSummary();
  }

  // ========== Phase 6 Persistent State ==========

  getPersistentState() {
    return {
      persistentWorld: persistentWorld.serialize(),
      legacySystem: legacySystem.serialize(),
      socialGraph: this.npcManager?.socialGraph?.serialize() || null,
      workshop: this.creatorWorkshop ? {
        inventory: this.creatorWorkshop.inventory,
        materials: Array.from(this.creatorWorkshop.materials.entries()),
        workshopCreations: this.creatorWorkshop.workshopCreations.map(c => c.serialize()),
        legacyUnits: this.creatorWorkshop.legacyUnits,
        unlockedOperations: Array.from(this.creatorWorkshop.unlockedOperations)
      } : null
    };
  }

  applyPersistentState(state) {
    if (!state) return;
    if (state.persistentWorld) persistentWorld.deserialize(state.persistentWorld);
    if (state.legacySystem) legacySystem.deserialize(state.legacySystem);
    if (state.workshop && this.creatorWorkshop) {
      this.creatorWorkshop.inventory = state.workshop.inventory || [];
      this.creatorWorkshop.materials = new Map(state.workshop.materials || []);
      this.creatorWorkshop.workshopCreations = (state.workshop.workshopCreations || []).map(c => WorkshopCreation.deserialize ? WorkshopCreation.deserialize(c) : c);
      this.creatorWorkshop.legacyUnits = state.workshop.legacyUnits || [];
      this.creatorWorkshop.unlockedOperations = new Set(state.workshop.unlockedOperations || ['dismantle', 'modify']);
    }
    this.pendingSocialGraph = state.socialGraph || null;
  }

  applyPendingSocialGraph(npcManager) {
    if (this.pendingSocialGraph && npcManager && npcManager.socialGraph && npcManager.socialGraph.deserialize) {
      npcManager.socialGraph.deserialize(this.pendingSocialGraph);
      this.pendingSocialGraph = null;
    }
  }

  // ========== Game Operations ==========

  create(text) {
    if (this.gameState !== 'playing') return { error: '本关已结束' };
    if (this.creationCharges <= 0) return { error: '造物次数已用完' };
    if (!text.trim()) return { error: '请输入造物想法' };

    const card = localCompile(text, this.getGameContext());
    this.creationCharges -= 1;
    this.miraclePoints -= card.cost;
    this.entropy += card.stabilityCost;

    const creation = {
      id: card.id,
      card,
      x: -1,
      y: -1,
      remaining: card.duration,
      restores: [],
      placed: false
    };
    this.creations.push(creation);
    const creationName = normalizeCreationName(card);
    this.log(`造物编译完成：${creationName} (${card.type})`, true);
    this.log(`  能力: ${card.ability} | 范围: ${card.range} | 持续: ${card.duration} | 消耗: ${card.cost} | 裂隙: ${card.stabilityCost}`);
    this.log(`  ${card.description}`);
    this.log(`  副作用: ${card.side_effect}`);

    return { success: true, card, creationId: creation.id };
  }

  place(creationId, x, y) {
    if (this.gameState !== 'playing') return { error: '本关已结束' };
    if (!this.inBounds(x, y)) return { error: '坐标超出地图范围' };
    const creation = this.creations.find((c) => c.id === creationId && !c.placed);
    if (!creation) return { error: '找不到未放置的造物' };

    const card = creation.card;
    if (this.unitAt(x, y) && ['block', 'force_field'].includes(card.ability)) {
      return { error: '不能把屏障直接放在单位身上' };
    }

    creation.x = x;
    creation.y = y;
    creation.placed = true;

    this.applyImmediatePlacement(creation);
    this.log(`你在 ${this.tileName(x, y)} 放置了「${normalizeCreationName(card)}」`, true);
    if (card.stabilityCost > 0) {
      this.log(`副作用触发：世界裂隙 +${card.stabilityCost}`);
    }

    this.recordCreationPlacement(creation, x, y);
    this.hooks.onPlacement(creation, x, y);
    this.checkEndCondition(false);
    return { success: true };
  }

  createAndPlace(text, x, y) {
    const result = this.create(text);
    if (result.error) return result;
    return this.place(result.creationId, x, y);
  }

  simulate(turns = 1) {
    for (let i = 0; i < turns; i++) {
      if (this.gameState !== 'playing') break;
      this.endTurn();
    }
    return this.getGameState();
  }

  // ========== Core Game Loop ==========

  endTurn() {
    if (this.gameState !== 'playing') return { error: '本关已结束' };

    this.log(`========== 第 ${this.turn} 回合结算 ==========`, true);
    this.spreadHazards();
    this.triggerRandomEvent();
    this.applyActiveCreationEffects();
    this.applyChainReactions();
    this.moveUnits();
    this.applyTileHazardsToUnits();
    this.enemyIntentSystem.generatePreviews(this.worldState, this);
    this.cognitiveAbyss.update(this.entropy, this.level.entropyLimit || 7);
    this.decrementCreationDurations();
    this.checkOathBetrayals();

    // Evolve world myths every 5 turns
    if (this.turn % 5 === 0) {
      worldLegendSystem.evolveMyths();
    }

    this.checkEndCondition(true);

    if (this.gameState === 'playing') {
      this.turn += 1;
      if (this.turn > this.level.maxTurns) {
        this.checkEndCondition(true, true);
      }
    }

    this.hooks.onTurnEnd();
    return { success: true, gameState: this.gameState };
  }

  // ========== Creation Placement Effects ==========

  applyImmediatePlacement(creation) {
    const { card, x, y } = creation;
    const cardName = normalizeCreationName(card);
    const immediateAbilities = ['create_bridge', 'block', 'force_field', 'transform_land', 'freeze_water', 'raise_earth', 'grow_forest', 'trap', 'time_dilation', 'reveal_path', 'sun_blessing', 'dream_link'];
    if (!immediateAbilities.includes(card.ability) && hasAbilityHandler(card.ability, 'immediate')) {
      applyAbility(this, creation, 'immediate');
      return;
    }
    if (card.ability === 'create_bridge') {
      const hazardTiles = [TILE.WATER, TILE.SWAMP, TILE.FOG, TILE.DARK, TILE.POISON];

      // Collect all hazard tiles within range and sort by distance from placement point.
      const candidates = this.tilesWithin(x, y, Math.max(1, card.range)).filter((cell) =>
        hazardTiles.includes(this.getTerrain(cell.x, cell.y))
      );
      candidates.sort((a, b) => this.distance(x, y, a.x, a.y) - this.distance(x, y, b.x, b.y));

      // No hazard terrain: do not place anything.
      if (!candidates.length) return;

      // Place bridges on the nearest hazard tiles (up to 4).
      for (const cell of candidates.slice(0, 4)) {
        this.setTempTerrain(creation, cell.x, cell.y, TILE.BRIDGE);
      }
    }
    if (card.ability === 'block') {
      this.setTempTerrain(creation, x, y, TILE.WALL);
    }
    if (card.ability === 'force_field') {
      for (const cell of this.tilesWithin(x, y, card.range)) {
        if (this.getTerrain(cell.x, cell.y) !== TILE.WALL && !this.unitAt(cell.x, cell.y)) {
          this.setTempTerrain(creation, cell.x, cell.y, TILE.FIELD);
        }
      }
    }
    if (card.ability === 'transform_land') {
      let changed = 0;
      for (const cell of this.tilesWithin(x, y, card.range)) {
        const terrain = this.getTerrain(cell.x, cell.y);
        if ([TILE.WATER, TILE.SWAMP, TILE.DARK, TILE.FOG, TILE.POISON].includes(terrain)) {
          this.setTerrain(cell.x, cell.y, TILE.LAND);
          changed += 1;
        }
      }
      if (changed) this.log(`「${cardName}」改造了 ${changed} 处危险地形`);
    }
    if (card.ability === 'freeze_water') {
      let changed = 0;
      for (const cell of this.tilesWithin(x, y, card.range)) {
        if (this.getTerrain(cell.x, cell.y) === TILE.WATER) {
          this.setTempTerrain(creation, cell.x, cell.y, TILE.BRIDGE);
          changed += 1;
        }
      }
      if (changed) this.log(`「${cardName}」冻结了 ${changed} 格水域`);
      else this.log(`「${cardName}」没有冻结到水域`);
    }
    if (card.ability === 'raise_earth') {
      let changed = 0;
      for (const cell of this.tilesWithin(x, y, card.range)) {
        const terrain = this.getTerrain(cell.x, cell.y);
        if (terrain === TILE.LAND || terrain === TILE.SWAMP || terrain === TILE.WATER) {
          this.setTempTerrain(creation, cell.x, cell.y, TILE.HIGH);
          changed += 1;
        }
      }
      if (changed) this.log(`「${cardName}」抬升了 ${changed} 格地面`);
      else this.log(`「${cardName}」没有可抬升的地面`);
    }
    if (card.ability === 'grow_forest') {
      let changed = 0;
      for (const cell of this.tilesWithin(x, y, card.range)) {
        const terrain = this.getTerrain(cell.x, cell.y);
        if (terrain === TILE.LAND || terrain === TILE.DARK || terrain === TILE.FOG) {
          this.setTempTerrain(creation, cell.x, cell.y, TILE.FOREST);
          changed += 1;
        }
      }
      if (changed) this.log(`「${cardName}」种植了 ${changed} 格森林`);
      else this.log(`「${cardName}」没有可种植的土地`);
    }
    if (card.ability === 'dig_channel') {
      this.setTerrain(x, y, TILE.WATER);
      this.log(`「${cardName}」在 ${this.tileName(x, y)} 挖掘了水渠`);
    }
    if (card.ability === 'trap') {
      this.log(`「${cardName}」在 ${this.tileName(x, y)} 设置了陷阱`);
    }
    if (card.ability === 'time_dilation') {
      this.level.maxTurns += 2;
      this.log(`「${cardName}」延缓了时间，剩余回合 +2`);
    }
    if (card.ability === 'reveal_path') {
      let revealed = 0;
      for (const unit of this.units.filter((u) => (this.isCivilian(u) || this.isMessenger(u)) && u.status === 'active')) {
        if (this.distance(unit.x, unit.y, x, y) <= card.range + 1) {
          unit.revealedPath = 3;
          revealed += 1;
        }
      }
      if (revealed) this.log(`「${cardName}」为 ${revealed} 个单位显示了最优路径`);
    }
    if (card.ability === 'sun_blessing') {
      let changed = 0;
      for (const cell of this.tilesWithin(x, y, card.range + 1)) {
        const terrain = this.getTerrain(cell.x, cell.y);
        if (terrain === TILE.DARK || terrain === TILE.FOG) {
          this.setTerrain(cell.x, cell.y, TILE.LAND);
          changed += 1;
        }
      }
      for (const unit of this.units.filter((u) => u.status === 'active')) {
        if (this.distance(unit.x, unit.y, x, y) <= card.range + 1) {
          unit.immuneChaos = 3;
          unit.guidedTurns = Math.max(unit.guidedTurns, 1);
        }
      }
      if (changed) this.log(`「${cardName}」的大范围光照驱散了 ${changed} 格黑暗，并恢复了单位体力`);
    }
    if (card.ability === 'dream_link') {
      const targets = this.units.filter((u) => (this.isCivilian(u) || this.isMessenger(u)) && u.status === 'active' && this.distance(u.x, u.y, x, y) <= card.range + 1);
      if (targets.length >= 2) {
        for (let i = 0; i + 1 < targets.length; i += 2) {
          const a = targets[i];
          const b = targets[i + 1];
          a.dreamLinked = b.id;
          b.dreamLinked = a.id;
          a.guidedTurns = Math.max(a.guidedTurns, 2);
          b.guidedTurns = Math.max(b.guidedTurns, 2);
        }
        this.log(`「${cardName}」连接了 ${targets.length} 个单位的梦境，共享视野与方向`);
      }
    }

    // 回合持续能力在放置时立即生效（仅对没有上方硬编码即时逻辑的能力）
    if (!immediateAbilities.includes(card.ability)) {
      applyAbility(this, creation, 'active');
    }
  }



  applyActiveCreationEffects() {
    for (const creation of this.creations) {
      if (creation.remaining <= 0 || !creation.placed) continue;
      const { card, x, y } = creation;
      const cardName = normalizeCreationName(card);

      if (card.specialEffect?.type === 'mobile' || card.specialEffect?.type === 'movement') {
        this.moveCreationMobile(creation);
      }
      if (card.specialEffect?.type === 'environmental') {
        this.applyEnvironmentalEffect(creation);
      }
      if (card.specialEffect?.type === 'sacrifice') {
        this.applySacrificeEffect(creation);
      }

      if (card.ability === 'absorb_water') {
        let changed = 0;
        const effectiveRange = this.getEffectiveRange(creation);
        for (const cell of this.tilesWithin(x, y, effectiveRange)) {
          if (changed >= 3) break;
          if (this.getTerrain(cell.x, cell.y) === TILE.WATER) {
            this.setTerrain(cell.x, cell.y, TILE.LAND);
            changed += 1;
          }
        }
        if (changed) this.log(`「${cardName}」吸收了 ${changed} 格水域`);
      }

      if (card.ability === 'illuminate') {
        let changed = 0;
        const effectiveRange = this.getEffectiveRange(creation);
        for (const cell of this.tilesWithin(x, y, effectiveRange)) {
          const terrain = this.getTerrain(cell.x, cell.y);
          if (terrain === TILE.DARK || terrain === TILE.FOG) {
            this.setTerrain(cell.x, cell.y, TILE.LAND);
            changed += 1;
          }
        }
        if (changed) this.log(`「${cardName}」照亮了 ${changed} 格黑暗或迷雾`);
      }

      if (card.ability === 'cleanse') {
        let changed = 0;
        const effectiveRange = this.getEffectiveRange(creation);
        for (const cell of this.tilesWithin(x, y, effectiveRange)) {
          if ([TILE.DARK, TILE.FOG, TILE.SWAMP, TILE.POISON].includes(this.getTerrain(cell.x, cell.y))) {
            this.setTerrain(cell.x, cell.y, TILE.LAND);
            changed += 1;
          }
        }
        if (changed) this.log(`「${cardName}」净化了 ${changed} 格污染地形`);
      }

      if (card.ability === 'calm') {
        if (this.isWarLevel()) {
          const before = this.warMeter;
          this.warMeter = Math.max(0, this.warMeter - 2);
          if (before !== this.warMeter) this.log(`「${cardName}」降低战争值：${before} → ${this.warMeter}`);
        }
        for (const unit of this.units.filter((u) => u.type === 'beast' && u.status === 'active')) {
          if (this.distance(unit.x, unit.y, x, y) <= card.range + 1) {
            unit.anger = Math.max(0, (unit.anger || 0) - 1);
            unit.stunned = true;
            this.log(`「${cardName}」安抚了 ${unit.name}，怒气降至 ${unit.anger}`);
          }
        }
      }

      if (card.ability === 'guide') {
        let guided = 0;
        const effectiveRange = this.getEffectiveRange(creation);
        for (const unit of this.units.filter((u) => this.isCivilian(u) || this.isMessenger(u))) {
          if (unit.status === 'active' && this.distance(unit.x, unit.y, x, y) <= effectiveRange + 1) {
            unit.guidedTurns = 2;
            guided += 1;
          }
        }
        if (guided) this.log(`「${cardName}」正在引导 ${guided} 个单位`);
      }

      if (card.ability === 'slow_beast') {
        for (const unit of this.units.filter((u) => u.type === 'beast' && u.status === 'active')) {
          if (this.distance(unit.x, unit.y, x, y) <= card.range + 1) {
            unit.stunned = true;
            this.log(`「${cardName}」牵制了 ${unit.name}`);
          }
        }
      }

      if (card.ability === 'memory_beacon') {
        let changed = 0;
        const effectiveRange = this.getEffectiveRange(creation);
        for (const cell of this.tilesWithin(x, y, effectiveRange)) {
          if (this.getTerrain(cell.x, cell.y) === TILE.FOG || this.getTerrain(cell.x, cell.y) === TILE.DARK) {
            this.setTerrain(cell.x, cell.y, TILE.LAND);
            changed += 1;
          }
        }
        for (const unit of this.units.filter((u) => this.isCivilian(u) && u.status === 'active')) {
          if (this.distance(unit.x, unit.y, x, y) <= effectiveRange + 2) {
            unit.guidedTurns = 2;
          }
        }
        if (changed) this.log(`「${cardName}」唤回记忆，驱散 ${changed} 格迷雾`);
      }

      if (card.ability === 'freeze_water') {
        if (creation.remaining === 1) {
          this.log(`「${cardName}」冻结的水域即将融化`);
        }
      }

      if (card.ability === 'reveal_path') {
        let revealed = 0;
        const effectiveRange = this.getEffectiveRange(creation);
        for (const unit of this.units.filter((u) => (this.isCivilian(u) || this.isMessenger(u)) && u.status === 'active')) {
          if (this.distance(unit.x, unit.y, x, y) <= effectiveRange + 1) {
            unit.revealedPath = 3;
            revealed += 1;
          }
        }
        if (revealed) this.log(`「${cardName}」为 ${revealed} 个单位显示了最优路径`);
      }

      if (card.ability === 'sun_blessing') {
        let changed = 0;
        const effectiveRange = this.getEffectiveRange(creation);
        for (const cell of this.tilesWithin(x, y, effectiveRange + 1)) {
          const terrain = this.getTerrain(cell.x, cell.y);
          if (terrain === TILE.DARK || terrain === TILE.FOG) {
            this.setTerrain(cell.x, cell.y, TILE.LAND);
            changed += 1;
          }
        }
        for (const unit of this.units.filter((u) => u.status === 'active')) {
          if (this.distance(unit.x, unit.y, x, y) <= effectiveRange + 1) {
            unit.immuneChaos = 2;
            unit.guidedTurns = Math.max(unit.guidedTurns, 1);
          }
        }
        if (changed) this.log(`「${cardName}」的大范围光照驱散了 ${changed} 格黑暗，并恢复了单位体力`);
      }

      if (card.ability === 'raise_earth') {
        for (const unit of this.units.filter((u) => u.status === 'active')) {
          if (this.getTerrain(unit.x, unit.y) === TILE.HIGH && this.distance(unit.x, unit.y, x, y) <= card.range) {
            unit.onHighGround = true;
          }
        }
      }

      if (card.ability === 'grow_forest') {
        // Forest effects handled in spreadHazards
      }

      if (card.ability === 'dig_channel') {
        const channelNeighbors = this.neighbors(x, y).filter(n => {
          const t = this.getTerrain(n.x, n.y);
          return t === TILE.LAND || t === TILE.FOG || t === TILE.DARK;
        });
        if (channelNeighbors.length > 0) {
          const target = channelNeighbors[Math.floor(Math.random() * channelNeighbors.length)];
          this.setTerrain(target.x, target.y, TILE.WATER);
          this.log(`「${cardName}」的水渠将水流导向 ${this.tileName(target.x, target.y)}`);
        }
      }

      if (card.ability === 'dream_link') {
        const targets = this.units.filter((u) => (this.isCivilian(u) || this.isMessenger(u)) && u.status === 'active' && this.distance(u.x, u.y, x, y) <= card.range + 1);
        if (targets.length >= 2) {
          for (let i = 0; i + 1 < targets.length; i += 2) {
            const a = targets[i];
            const b = targets[i + 1];
            a.dreamLinked = b.id;
            b.dreamLinked = a.id;
            a.guidedTurns = Math.max(a.guidedTurns, 2);
            b.guidedTurns = Math.max(b.guidedTurns, 2);
          }
          this.log(`「${cardName}」连接了 ${targets.length} 个单位的梦境，共享视野与方向`);
        }
      }
    }
  }

  // ========== Unit Movement ==========

  // 吸引能力优先于单位原目标：被吸引期间有效目标为造物卡放置点
  getEffectiveGoal(unit) {
    return (unit.attractTurns > 0 && unit.attractedTo) ? unit.attractedTo : unit.goal;
  }

  // 单位到达吸引点后，标记为已到达以防重复吸引振荡
  markAttractArrived(unit) {
    if (!unit.attractedTo || !unit.attractedTo.creationId) return;
    const creation = this.creations.find(c => c.id === unit.attractedTo.creationId);
    if (creation && creation.arrivedIds) {
      const uid = unit.id ?? unit.name;
      if (uid != null) creation.arrivedIds.add(uid);
    }
    unit.attractedTo = null;
    unit.attractTurns = 0;
  }

  moveUnits() {
    for (const unit of this.units) {
      if (unit.status !== 'active') continue;
      if (this.isCivilian(unit)) this.moveCivilian(unit);
      else if (this.isMessenger(unit)) this.moveMessenger(unit);
      else if (unit.type === 'beast') this.moveBeast(unit);
    }
  }

  moveCivilian(unit) {
    if (this.isGoalReached(unit)) {
      this.rescueUnit(unit);
      return;
    }
    const guided = unit.guidedTurns > 0 || this.nearActiveAbility(unit.x, unit.y, ['guide', 'memory_beacon', 'illuminate']);
    const hasRevealPath = unit.revealedPath > 0;
    const hasDreamLink = unit.dreamLinked && this.units.find(u => u.id === unit.dreamLinked && u.status === 'active');
    const immuneChaos = unit.immuneChaos > 0;

    if (hasDreamLink && !guided) {
      const linkedUnit = this.units.find(u => u.id === unit.dreamLinked);
      if (linkedUnit) {
        const myDist = this.distance(unit.x, unit.y, unit.goal.x, unit.goal.y);
        const linkedDist = this.distance(linkedUnit.x, linkedUnit.y, unit.goal.x, unit.goal.y);
        if (linkedDist < myDist) {
          unit.guidedTurns = 1;
        }
      }
    }

    const attractGoal = (unit.attractTurns > 0 && unit.attractedTo) ? unit.attractedTo : null;
    let next = null;
    if (this.level.memoryChaos && !guided && !immuneChaos && !attractGoal && Math.random() < 0.45) {
      next = this.randomPassableNeighbor(unit);
      if (next) this.log(`${unit.name} 被记忆瘟疫影响，偏离了道路`);
    }
    if (!next) next = this.nextStepToward(unit, this.getEffectiveGoal(unit));
    if (next) {
      unit.x = next.x;
      unit.y = next.y;
      if (attractGoal && unit.x === attractGoal.x && unit.y === attractGoal.y) {
        this.markAttractArrived(unit);
        this.log(`${unit.name} 抵达吸引点，恢复原目标`);
      }
      if (hasRevealPath && !this.isGoalReached(unit)) {
        const extraStep = this.nextStepToward(unit, this.getEffectiveGoal(unit));
        if (extraStep) {
          unit.x = extraStep.x;
          unit.y = extraStep.y;
          this.log(`${unit.name} 借助路径指引快速移动`);
        }
      }
    }
    if (unit.guidedTurns > 0) unit.guidedTurns -= 1;
    if (unit.revealedPath > 0) unit.revealedPath -= 1;
    if (unit.immuneChaos > 0) unit.immuneChaos -= 1;
    if (unit.attractTurns > 0) unit.attractTurns -= 1;
    if (this.isGoalReached(unit)) this.rescueUnit(unit);
  }

  moveMessenger(unit) {
    if (this.isGoalReached(unit)) {
      unit.met = true;
      return;
    }
    const terrain = this.getTerrain(unit.x, unit.y);
    const guided = unit.guidedTurns > 0 || this.nearActiveAbility(unit.x, unit.y, ['calm', 'guide', 'memory_beacon']);
    const immuneChaos = unit.immuneChaos > 0;
    if ((terrain === TILE.FOG || terrain === TILE.DARK) && !guided && !immuneChaos) {
      this.warMeter = Math.min(this.level.hazard?.warLimit || 9, this.warMeter + 1);
      this.log(`${unit.name} 在迷雾中误判形势，战争值 +1`);
      return;
    }
    const attractGoal = (unit.attractTurns > 0 && unit.attractedTo) ? unit.attractedTo : null;
    const next = this.nextStepToward(unit, this.getEffectiveGoal(unit));
    if (next) {
      unit.x = next.x;
      unit.y = next.y;
      if (attractGoal && unit.x === attractGoal.x && unit.y === attractGoal.y) {
        this.markAttractArrived(unit);
        this.log(`${unit.name} 抵达吸引点，恢复原目标`);
      }
      if (unit.revealedPath > 0 && !this.isGoalReached(unit)) {
        const extraStep = this.nextStepToward(unit, this.getEffectiveGoal(unit));
        if (extraStep) {
          unit.x = extraStep.x;
          unit.y = extraStep.y;
          this.log(`${unit.name} 借助路径指引快速移动`);
        }
      }
    }
    if (unit.guidedTurns > 0) unit.guidedTurns -= 1;
    if (unit.revealedPath > 0) unit.revealedPath -= 1;
    if (unit.immuneChaos > 0) unit.immuneChaos -= 1;
    if (unit.attractTurns > 0) unit.attractTurns -= 1;
    if (this.isGoalReached(unit)) {
      unit.met = true;
      this.log(`${unit.name} 抵达边境会谈点`, true);
    }
  }

  moveBeast(unit) {
    if (unit.tamed) {
      this.log(`${unit.name} 已被驯服，安静地停留在原地`);
      return;
    }
    if (unit.stunnedTurns > 0) {
      unit.stunnedTurns -= 1;
      unit.anger = Math.min(this.level.beastAngerLimit || 5, (unit.anger || 0) + 1);
      this.log(`${unit.name} 本回合被牵制，怒气上升到 ${unit.anger}`);
      return;
    }
    const fromX = unit.x;
    const fromY = unit.y;
    const attractGoal = (unit.attractTurns > 0 && unit.attractedTo) ? unit.attractedTo : null;
    const next = this.nextStepToward(unit, this.getEffectiveGoal(unit));
    if (!next) {
      unit.anger = Math.min(this.level.beastAngerLimit || 5, (unit.anger || 0) + 1);
      this.log(`${unit.name} 被完全堵住，怒气上升到 ${unit.anger}`);
      return;
    }
    unit.x = next.x;
    unit.y = next.y;
    unit.lastMove = { dx: unit.x - fromX, dy: unit.y - fromY, x: fromX, y: fromY };
    if (attractGoal && unit.x === attractGoal.x && unit.y === attractGoal.y) {
      this.markAttractArrived(unit);
      this.log(`${unit.name} 抵达吸引点，恢复原目标`);
    }
    if (unit.attractTurns > 0) unit.attractTurns -= 1;
    const trapHere = this.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'trap' && c.x === unit.x && c.y === unit.y);
    if (trapHere) {
      unit.stunnedTurns = 2;
      trapHere.remaining = 0;
      this.log(`「${normalizeCreationName(trapHere.card)}」触发！${unit.name} 被困住`);
      return;
    }
    if (this.isGoalReached(unit)) {
      this.failLevel(`${unit.name} 抵达了城市，考核失败`);
    }
  }

  nextStepToward(unit, goal) {
    if (!goal) return null;
    const startKey = `${unit.x},${unit.y}`;
    const goalKey = `${goal.x},${goal.y}`;
    if (startKey === goalKey) return null;

    const openSet = [{ x: unit.x, y: unit.y, g: 0, f: this.distance(unit.x, unit.y, goal.x, goal.y) }];
    const closedSet = new Set([startKey]);
    const cameFrom = new Map([[startKey, null]]);
    const gScore = new Map([[startKey, 0]]);

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      const currentKey = `${current.x},${current.y}`;
      if (currentKey === goalKey) break;

      for (const nb of this.neighbors(current.x, current.y)) {
        const key = `${nb.x},${nb.y}`;
        if (closedSet.has(key)) continue;
        if (!this.isPassable(nb.x, nb.y, unit)) continue;

        const moveCost = this.getMoveCost(nb.x, nb.y, unit);
        const tentativeG = current.g + moveCost;

        if (!gScore.has(key) || tentativeG < gScore.get(key)) {
          gScore.set(key, tentativeG);
          const f = tentativeG + this.distance(nb.x, nb.y, goal.x, goal.y);
          openSet.push({ x: nb.x, y: nb.y, g: tentativeG, f });
          cameFrom.set(key, { x: current.x, y: current.y });
          closedSet.add(key);
        }
      }
    }

    if (!cameFrom.has(goalKey)) return null;

    let current = goal;
    let previous = cameFrom.get(goalKey);
    while (previous && !(previous.x === unit.x && previous.y === unit.y)) {
      current = previous;
      previous = cameFrom.get(`${current.x},${current.y}`);
    }
    return current.x === unit.x && current.y === unit.y ? null : current;
  }

  getMoveCost(x, y, unit) {
    const terrain = this.getTerrain(x, y);
    let cost = 1;
    // Beast passes through forest at no extra cost
    if (terrain === TILE.FOREST) cost = unit.type === 'beast' ? 1 : 2;
    else if (terrain === TILE.HIGH) cost = 1.5;
    else if (terrain === TILE.BRIDGE) cost = 1.2;
    else if (terrain === TILE.SWAMP) cost = 2.5;
    else if (terrain === TILE.FOG) cost = 1;
    else if (terrain === TILE.DARK) cost = unit.hazardPhase ? 1 : 3;

    const tempCreation = this.creations.find(c =>
      c.placed && c.remaining > 0 && c.remaining <= 1 &&
      this.distance(x, y, c.x, c.y) <= (c.card.range || 0) &&
      c.restores?.some(r => r.x === x && r.y === y)
    );
    if (tempCreation) cost += 5;

    if (this.isCivilian(unit) && unit.guidedTurns > 0) {
      const nearGuide = this.nearActiveAbility(x, y, ['guide', 'memory_beacon']);
      if (nearGuide) cost *= 0.8;
    }

    return cost;
  }

  randomPassableNeighbor(unit) {
    const options = this.neighbors(unit.x, unit.y).filter((cell) => this.isPassable(cell.x, cell.y, unit));
    if (!options.length) return null;
    return options[Math.floor(Math.random() * options.length)];
  }

  // ========== Hazard Spread ==========

  spreadHazards() {
    const type = this.level.hazard?.type;
    const amount = this.resolveSpreadPerTurn();
    if (type === 'flood') this.spreadTerrain(TILE.WATER, amount);
    if (type === 'darkness') this.spreadTerrain(TILE.DARK, amount);
    if (type === 'fog') this.spreadTerrain(TILE.FOG, amount);
    if (type === 'poison') this.spreadTerrain(TILE.POISON, amount);
    if (type === 'war') this.advanceWar();
    if (type === 'mixed') {
      this.spreadTerrain(TILE.WATER, amount);
      this.spreadTerrain(TILE.DARK, amount);
      this.spreadTerrain(TILE.FOG, amount);
      this.advanceWar();
    }
    if (type) this.hooks.onHazardSpread(type);
  }

  // 解析每回合扩散格数：尊重手动设置的 0（暂停扩散），仅 undefined/null 回退到默认 2
  resolveSpreadPerTurn() {
    const value = this.level.hazard?.spreadPerTurn;
    if (value === 0) return 0;
    return value ?? 2;
  }

  spreadTerrain(sourceTerrain, amount) {
    const candidates = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.getTerrain(x, y) !== sourceTerrain) continue;
        for (const nb of this.neighbors(x, y)) {
          const terrain = this.getTerrain(nb.x, nb.y);
          if (this.canHazardEnter(nb.x, nb.y, sourceTerrain, terrain)) {
            candidates.push({ ...nb, score: this.hazardScore(nb.x, nb.y, sourceTerrain) });
          }
        }
      }
    }
    const unique = this.uniqueCells(candidates).sort((a, b) => b.score - a.score);
    const picked = unique.slice(0, amount);
    for (const cell of picked) this.setTerrain(cell.x, cell.y, sourceTerrain);
    if (picked.length) {
      const label = sourceTerrain === TILE.WATER ? '洪水' : sourceTerrain === TILE.DARK ? '黑暗' : sourceTerrain === TILE.FOG ? '迷雾' : sourceTerrain === TILE.POISON ? '污染' : '灾害';
      this.log(`${label} 扩散了 ${picked.length} 格`);
    }
  }

  canHazardEnter(x, y, sourceTerrain, terrain) {
    if (this.isProtected(x, y)) return false;
    // All hazard types can now spread into units (no unit blocking)
    if ([TILE.HIGH, TILE.EXIT, TILE.CITY, TILE.MOUNTAIN, TILE.WALL, TILE.FIELD, TILE.SACRED].includes(terrain)) return false;
    if (terrain === sourceTerrain) return false;
    if (terrain === TILE.BRIDGE && sourceTerrain !== TILE.DARK) return false;
    // 森林天然阻挡灾害扩散
    if (terrain === TILE.FOREST) return false;
    // 不同灾害类型互不覆盖：水域不吞没黑暗/迷雾/污染，避免手动调整的灾害源被重置。
    // 灾害仅向非灾害地形（平地/村庄/边境/沼泽）扩散，原有灾害源作为有效源继续参与后续计算。
    return [TILE.LAND, TILE.VILLAGE, TILE.BORDER, TILE.SWAMP].includes(terrain);
  }

  hazardScore(x, y, sourceTerrain) {
    let score = 10;
    for (const unit of this.units.filter((u) => u.status === 'active')) {
      score += Math.max(0, 5 - this.distance(x, y, unit.x, unit.y));
    }
    if (sourceTerrain === TILE.WATER) score += Math.max(0, 5 - x);
    return score;
  }

  advanceWar() {
    const messengers = this.units.filter((unit) => this.isMessenger(unit));
    const allMet = messengers.length > 0 && messengers.every((unit) => this.isGoalReached(unit));
    const calmNearBorder = this.creations.some((creation) =>
      creation.remaining > 0 && creation.placed && ['calm', 'memory_beacon'].includes(creation.card.ability) && this.getTerrain(creation.x, creation.y) === TILE.BORDER
    );
    if (allMet) {
      this.peaceTalks += 1;
      this.warMeter = Math.max(0, this.warMeter - 2);
      this.log('两名使者在边境交换证词，战争值下降', true);
    } else if (calmNearBorder) {
      this.warMeter = Math.max(0, this.warMeter - 1);
      this.log('边境附近的和平造物压住了冲突');
    } else {
      this.warMeter += 1;
      this.log(`误会继续发酵，战争值升至 ${this.warMeter}`);
    }
  }

  // ========== Tile Hazards & Creation Durations ==========

  applyTileHazardsToUnits() {
    const HAZARD_TERRAINS = [TILE.WATER, TILE.DARK, TILE.FOG, TILE.POISON];
    for (const unit of this.units) {
      if (unit.status !== 'active') continue;
      const terrain = this.getTerrain(unit.x, unit.y);
      const isOnHazard = this.isCivilian(unit) && HAZARD_TERRAINS.includes(terrain);
      if (!isOnHazard) {
        // Unit is not on hazard terrain — reset hazard tracking
        unit.hazardCoverTurns = 0;
        unit.lastHazardTerrain = null;
        continue;
      }
      // 迷雾内的居民免疫致死（游戏中"迷失"=死亡）：迷雾只引发混乱（偏离寻路），不会让居民迷失死亡（适用于所有关卡）
      if (terrain === TILE.FOG) {
        unit.hazardCoverTurns = 0;
        unit.lastHazardTerrain = null;
        continue;
      }
      if (terrain === TILE.HIGH && this.isCivilian(unit)) continue;
      if (unit.shieldTurns > 0) {
        unit.shieldTurns -= 1;
        unit.hazardCoverTurns = 0;
        unit.lastHazardTerrain = null;
        this.log(`${unit.name} 的隐形庇护抵消了${TERRAIN_LABELS[terrain]}的伤害`);
        continue;
      }
      if (terrain === TILE.WATER && unit.waterImmune) {
        this.log(`${unit.name} 的洪灾幸存者体质使其在水中安然无恙`);
        unit.hazardCoverTurns = 0;
        unit.lastHazardTerrain = null;
        continue;
      }
      if ((terrain === TILE.DARK || terrain === TILE.POISON) && unit.chaosImmune) {
        this.log(`${unit.name} 的夜行者之眼使其不受黑暗侵蚀`);
        unit.hazardCoverTurns = 0;
        unit.lastHazardTerrain = null;
        continue;
      }

      // Track hazard coverage duration
      if (unit.lastHazardTerrain === terrain) {
        // Same hazard as previous turn — increment counter
        unit.hazardCoverTurns += 1;
      } else {
        // New hazard type or first time — start tracking from turn 1
        unit.hazardCoverTurns = 1;
        unit.lastHazardTerrain = terrain;
      }

      // First turn exemption: only log warning, do NOT trigger lost status
      if (unit.hazardCoverTurns === 1) {
        this.log(`${unit.name} 被${TERRAIN_LABELS[terrain]}覆盖，尚有一线生机（第一回合豁免）`);
        continue;
      }

      // Second turn or later under same hazard — trigger lost status
      unit.status = 'lost';
      unit.lost = true;
      this.lost += 1;
      this.log(`${unit.name} 被${TERRAIN_LABELS[terrain]}吞没（持续覆盖超过一回合）`);
      this.updateWorldState({ type: 'unit_lost', detail: unit.name });
      this.emitUnitLostEvent(unit, terrain);
    }
  }

  decrementCreationDurations() {
    for (const creation of this.creations) {
      if (creation.remaining <= 0) continue;
      creation.remaining -= 1;
      if (creation.remaining <= 0) {
        this.expireCreation(creation);
        this.log(`「${normalizeCreationName(creation.card)}」的持续时间结束`);
        this.hooks.onCreationExpire(creation);
      }
    }
    this.creations = this.creations.filter((creation) => creation.remaining > 0);
  }

  // ========== Win/Loss Conditions ==========

  checkEndCondition(afterTurn, forcedEnd = false) {
    if (this.gameState !== 'playing') return;
    if (this.entropy > this.level.entropyLimit) {
      this.failLevel('世界裂隙超过承受极限，造物失控');
      return;
    }
    const beast = this.units.find((unit) => unit.type === 'beast' && unit.status === 'active');
    if (beast && this.level.beastAngerLimit && (beast.anger || 0) >= this.level.beastAngerLimit) {
      this.failLevel(`${beast.name} 的怒气达到上限，城市陷入灾厄`);
      return;
    }
    if (this.isWarLevel() && this.level.hazard?.warLimit && this.warMeter >= this.level.hazard.warLimit) {
      this.failLevel('战争值达到上限，边境爆发冲突');
      return;
    }
    if (this.level.win === 'requiredRescue' && this.rescued >= this.level.requiredRescue) {
      this.winLevel(`你救下了 ${this.rescued} 名居民，完成考核`);
      return;
    }
    if (this.level.win === 'peace') {
      const messengers = this.units.filter((unit) => this.isMessenger(unit));
      const allMet = messengers.length > 0 && messengers.every((unit) => this.isGoalReached(unit));
      if (allMet && this.warMeter < 5) {
        this.winLevel('使者完成会谈，战争被阻止');
        return;
      }
    }
    if (this.level.win === 'survive' && (forcedEnd || (afterTurn && this.turn >= this.level.maxTurns))) {
      this.winLevel('城市仍然完整，巨兽没有被杀死，考核通过');
      return;
    }
    if (this.level.win === 'final') {
      const citySafe = !beast || !this.isGoalReached(beast);
      if ((forcedEnd || (afterTurn && this.turn >= this.level.maxTurns)) && this.rescued >= this.level.requiredRescue && this.warMeter < 6 && citySafe) {
        this.winLevel('第七天到来时，世界仍然站立。终考通过');
        return;
      }
    }
    if (afterTurn && (forcedEnd || this.turn >= this.level.maxTurns)) {
      this.failLevel('回合耗尽，目标没有达成');
    }
  }

  winLevel(message) {
    if (this.gameState !== 'playing') return;
    this.gameState = 'won';
    this.log(`通过：${message}`, true);

    // Record legendary event for victory
    const impact = this.lost === 0 ? 'major' : 'minor';
    this.recordLegendaryEvent('miracle', '造物者', this.level.title, impact);

    this.hooks.onWin(message);

    // Record in persistent world
    const stats = {
      turns: this.turn,
      maxTurns: this.level.maxTurns,
      rescued: this.rescued,
      lost: this.lost,
      entropy: this.entropy,
      perfect: this.lost === 0,
      creations: this.creations.length,
      legacyUnits: this.units.filter(u => u.isLegacy).length
    };
    persistentWorld.recordLevelCompletion(this.level.id, 'won', stats);
    this.emitRegionResolvedEvent(message);
  }

  failLevel(message) {
    if (this.gameState !== 'playing') return;
    this.gameState = 'lost';
    this.log(`失败：${message}`, true);

    // Record legendary event for defeat
    this.recordLegendaryEvent('cataclysm', '造物者', this.level.title, 'major');

    this.hooks.onLose(message);

    // Record in persistent world
    const stats = {
      turns: this.turn,
      maxTurns: this.level.maxTurns,
      rescued: this.rescued,
      lost: this.lost,
      entropy: this.entropy,
      perfect: false,
      creations: this.creations.length,
      legacyUnits: this.units.filter(u => u.isLegacy).length
    };
    persistentWorld.recordLevelCompletion(this.level.id, 'lost', stats);
    this.emitRegionLostEvent(message);
  }

  // ========== Chain Reactions ==========

  applyChainReactions() {
    const discoveries = this.resonanceCodex.checkReactions(this);
    for (const reaction of discoveries) {
      this.log(`【新发现】连锁反应：${reaction.name}！${reaction.description}`, true);
      executeChainReaction(this, reaction.id);
    }
    const discovered = this.resonanceCodex.getDiscovered();
    for (const reaction of discovered) {
      if (executeChainReaction(this, reaction.id)) {
        reaction.usageCount++;
      }
    }
  }

  // ========== Special Effects ==========

  getEffectiveRange(creation) {
    let range = creation.card.range || 1;
    if (creation.card.specialEffect?.type === 'environmental') {
      const terrain = this.getTerrain(creation.x, creation.y);
      if (terrain === TILE.WATER || terrain === TILE.SWAMP) {
        range += 1;
      }
    }
    const resonanceCount = this.checkResonance(creation);
    if (resonanceCount > 0) {
      range += 1;
    }
    return Math.min(range, 3);
  }

  moveCreationMobile(creation) {
    const { card, x, y } = creation;
    const cardName = normalizeCreationName(card);
    const se = card.specialEffect;
    if (!se || (se.trigger !== 'onTurnStart' && se.trigger !== 'none')) return;

    let targetTerrain = null;
    const desc = se.description || '';
    if (desc.includes('水') || desc.includes('域') || desc.includes('潮')) targetTerrain = TILE.WATER;
    else if (desc.includes('暗') || desc.includes('黑') || desc.includes('夜')) targetTerrain = TILE.DARK;
    else if (desc.includes('雾') || desc.includes('迷')) targetTerrain = TILE.FOG;
    else if (desc.includes('陆') || desc.includes('地') || desc.includes('平')) targetTerrain = TILE.LAND;
    else if (desc.includes('高') || desc.includes('山')) targetTerrain = TILE.HIGH;
    else if (desc.includes('森') || desc.includes('林') || desc.includes('木')) targetTerrain = TILE.FOREST;
    else targetTerrain = TILE.WATER;

    let best = null;
    let bestDist = Infinity;
    for (let dy = 0; dy < BOARD_SIZE; dy++) {
      for (let dx = 0; dx < BOARD_SIZE; dx++) {
        if (this.getTerrain(dx, dy) === targetTerrain) {
          const d = this.distance(x, y, dx, dy);
          if (d < bestDist && d > 0) {
            bestDist = d;
            best = { x: dx, y: dy };
          }
        }
      }
    }

    if (!best) return;
    const dx = Math.sign(best.x - x);
    const dy = Math.sign(best.y - y);
    const nx = x + dx;
    const ny = y + dy;
    if (this.inBounds(nx, ny) && this.getTerrain(nx, ny) !== TILE.WALL && this.getTerrain(nx, ny) !== TILE.MOUNTAIN) {
      creation.x = nx;
      creation.y = ny;
      this.log(`「${cardName}」向${TERRAIN_LABELS[targetTerrain]}移动至 (${nx + 1}, ${ny + 1})`);
    }
  }

  applyEnvironmentalEffect(creation) {
    const { card, x, y } = creation;
    const cardName = normalizeCreationName(card);
    const se = card.specialEffect;
    if (!se) return;
    const terrain = this.getTerrain(x, y);
    const desc = se.description || '';

    if ((desc.includes('水') || desc.includes('域') || desc.includes('潮')) && terrain === TILE.WATER) {
      this.log(`「${cardName}」在水中发挥更强效力，范围扩大`);
    }
    if ((desc.includes('高') || desc.includes('山') || desc.includes('上')) && terrain === TILE.HIGH) {
      this.log(`「${cardName}」在高处发挥更强效力，范围扩大`);
    }
    if ((desc.includes('森') || desc.includes('林')) && terrain === TILE.FOREST) {
      if (creation.remaining < card.duration + 1) {
        creation.remaining += 1;
        this.log(`「${cardName}」在森林中获得滋养，持续时间延长`);
      }
    }
    if (desc.includes('照明') || desc.includes('光') || desc.includes('亮')) {
      let lit = 0;
      for (const cell of this.neighbors(x, y)) {
        if (this.getTerrain(cell.x, cell.y) === TILE.WATER) {
          const nb = this.neighbors(cell.x, cell.y);
          for (const n of nb) {
            if (this.getTerrain(n.x, n.y) === TILE.DARK || this.getTerrain(n.x, n.y) === TILE.FOG) {
              this.setTerrain(n.x, n.y, TILE.LAND);
              lit += 1;
            }
          }
        }
      }
      if (lit) this.log(`「${cardName}」的光点照亮了 ${lit} 格黑暗`);
    }
  }

  applySacrificeEffect(creation) {
    const { card } = creation;
    const cardName = normalizeCreationName(card);
    const se = card.specialEffect;
    if (!se) return;
    const desc = se.description || '';

    if (desc.includes('奇迹点') || desc.includes('消耗') || desc.includes('代价')) {
      if (this.miraclePoints > 0) {
        this.miraclePoints -= 1;
        this.log(`「${cardName}」消耗了 1 点奇迹点维持存在`);
      } else {
        creation.remaining = 0;
        this.log(`「${cardName}」因缺乏奇迹点而消散`);
      }
    }
    if (desc.includes('裂隙') || desc.includes('稳定')) {
      this.entropy += 1;
      this.log(`「${cardName}」使世界裂隙增加了 1`);
    }
  }

  // ========== Resonance ==========

  checkResonance(creation) {
    const family = this.getAbilityFamily(creation.card.ability);
    const nearby = this.creations.filter(c =>
      c.id !== creation.id &&
      c.placed &&
      c.remaining > 0 &&
      this.getAbilityFamily(c.card.ability) === family &&
      this.distance(creation.x, creation.y, c.x, c.y) <= 2
    );
    return nearby.length;
  }

  getAbilityFamily(ability) {
    const families = {
      water: ['absorb_water', 'create_bridge', 'freeze_water', 'redirect_hazard'],
      light: ['illuminate', 'reveal_path', 'sun_blessing'],
      terrain: ['transform_land', 'raise_earth', 'grow_forest'],
      defense: ['block', 'force_field', 'trap', 'shield_units'],
      spirit: ['calm', 'guide', 'memory_beacon', 'dream_link', 'haste'],
      special: ['cleanse', 'time_dilation', 'slow_beast', 'teleport']
    };
    for (const [family, abilities] of Object.entries(families)) {
      if (abilities.includes(ability)) return family;
    }
    return 'special';
  }

  // ========== Random Events ==========

  triggerRandomEvent() {
    const events = [
      { name: '突发暴雨', effect: 'floodSpread', probability: 0.08, condition: () => this.level.hazard?.type === 'flood' || this.level.hazard?.type === 'mixed' },
      { name: '地震', effect: 'terrainChange', probability: 0.05, condition: () => true },
      { name: '村民顿悟', effect: 'guidance', probability: 0.12, condition: () => this.units.some(u => this.isCivilian(u) && u.status === 'active') },
      { name: '巨兽犹豫', effect: 'beastStunned', probability: 0.1, condition: () => this.units.some(u => u.type === 'beast' && u.status === 'active') },
      { name: '奇迹共鸣', effect: 'resonanceBoost', probability: 0.08, condition: () => this.creations.filter(c => c.placed && c.remaining > 0).length >= 2 },
      { name: '裂隙波动', effect: 'entropyFluctuation', probability: 0.06, condition: () => this.entropy > 2 },
      { name: '风向改变', effect: 'hazardRedirect', probability: 0.07, condition: () => this.level.hazard?.type === 'flood' || this.level.hazard?.type === 'mixed' }
    ];

    for (const event of events) {
      if (event.condition() && Math.random() < event.probability) {
        this.applyEvent(event);
        return;
      }
    }
  }

  applyEvent(event) {
    switch (event.effect) {
      case 'floodSpread': {
        this.spreadTerrain(TILE.WATER, 1);
        this.log(`【随机事件】${event.name}！洪水额外扩散了 1 格`, true);
        break;
      }
      case 'terrainChange': {
        const x = Math.floor(Math.random() * BOARD_SIZE);
        const y = Math.floor(Math.random() * BOARD_SIZE);
        const terrains = [TILE.LAND, TILE.WATER, TILE.DARK, TILE.FOG];
        const newTerrain = terrains[Math.floor(Math.random() * terrains.length)];
        const oldTerrain = this.getTerrain(x, y);
        if (oldTerrain !== newTerrain && oldTerrain !== TILE.WALL && oldTerrain !== TILE.MOUNTAIN) {
          this.setTerrain(x, y, newTerrain);
          this.log(`【随机事件】${event.name}！${this.tileName(x, y)} 的地形发生了变化`, true);
        }
        break;
      }
      case 'guidance': {
        const civilians = this.units.filter(u => this.isCivilian(u) && u.status === 'active');
        if (civilians.length > 0) {
          const target = civilians[Math.floor(Math.random() * civilians.length)];
          target.guidedTurns = Math.max(target.guidedTurns, 2);
          this.log(`【随机事件】${event.name}！${target.name} 突然想起了正确的方向`, true);
        }
        break;
      }
      case 'beastStunned': {
        const beast = this.units.find(u => u.type === 'beast' && u.status === 'active');
        if (beast) {
          beast.stunnedTurns = 2;
          this.log(`【随机事件】${event.name}！${beast.name} 突然停下脚步，似乎在犹豫什么`, true);
        }
        break;
      }
      case 'resonanceBoost': {
        const activeCreations = this.creations.filter(c => c.placed && c.remaining > 0);
        if (activeCreations.length >= 2) {
          const target = activeCreations[Math.floor(Math.random() * activeCreations.length)];
          target.remaining += 1;
          this.log(`【随机事件】${event.name}！「${normalizeCreationName(target.card)}」的持续时间意外延长了`, true);
        }
        break;
      }
      case 'entropyFluctuation': {
        const change = Math.random() < 0.5 ? -1 : 1;
        this.entropy = Math.max(0, this.entropy + change);
        this.log(`【随机事件】${event.name}！世界裂隙 ${change > 0 ? '增加' : '减少'}了 1`, true);
        break;
      }
      case 'hazardRedirect': {
        const x = Math.floor(Math.random() * BOARD_SIZE);
        const y = Math.floor(Math.random() * BOARD_SIZE);
        if (this.getTerrain(x, y) === TILE.LAND) {
          this.setTerrain(x, y, TILE.WATER);
          this.log(`【随机事件】${event.name}！洪水流向了 ${this.tileName(x, y)}`, true);
        }
        break;
      }
    }
  }

  // ========== Utility Methods ==========

  getTerrain(x, y) {
    if (!this.inBounds(x, y)) return TILE.MOUNTAIN;
    return this.terrain[y][x];
  }

  setTerrain(x, y, terrain) {
    if (this.inBounds(x, y)) this.terrain[y][x] = terrain;
  }

  setTempTerrain(creation, x, y, terrain) {
    if (!this.inBounds(x, y)) return;
    const prev = this.getTerrain(x, y);
    if (prev === terrain) return;
    creation.restores.push({ x, y, prev });
    this.setTerrain(x, y, terrain);
  }

  expireCreation(creation) {
    for (const item of creation.restores || []) {
      if (!this.inBounds(item.x, item.y)) continue;
      const current = this.getTerrain(item.x, item.y);
      if ([TILE.BRIDGE, TILE.WALL, TILE.FIELD].includes(current)) {
        this.setTerrain(item.x, item.y, item.prev);
      }
    }
    // 清除所有受此造物吸引的单位状态，使其立即恢复原目标
    if (creation.card?.ability === 'attract' && creation.arrivedIds) {
      for (const unit of this.units || []) {
        if (unit.attractedTo?.creationId === creation.id) {
          unit.attractedTo = null;
          unit.attractTurns = 0;
        }
      }
    }
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;
  }

  neighbors(x, y) {
    return [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 }
    ].filter((cell) => this.inBounds(cell.x, cell.y));
  }

  tilesWithin(cx, cy, range) {
    const cells = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.distance(cx, cy, x, y) <= range) cells.push({ x, y });
      }
    }
    return cells;
  }

  distance(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  tileName(x, y) {
    return `${TERRAIN_LABELS[this.getTerrain(x, y)] || '未知'} (${x + 1}, ${y + 1})`;
  }

  unitAt(x, y) {
    return this.units.find((unit) => unit.status === 'active' && unit.x === x && unit.y === y);
  }

  isCivilian(unit) {
    return unit.type === 'villager' || unit.type === 'miner';
  }

  isMessenger(unit) {
    return unit.type === 'tribeA' || unit.type === 'tribeB';
  }

  isWarLevel() {
    return ['war', 'mixed'].includes(this.level.hazard?.type);
  }

  isGoalReached(unit) {
    return unit.goal && unit.x === unit.goal.x && unit.y === unit.goal.y;
  }

  isPassable(x, y, unit) {
    // Support temporary pathfinding blocks used by _findNonReversingStep.
    if (unit?._pathfindBlock && unit._pathfindBlock.x === x && unit._pathfindBlock.y === y) return false;
    const terrain = this.getTerrain(x, y);
    if (terrain === TILE.MOUNTAIN || terrain === TILE.WALL) return false;
    // Multiple units may occupy the same tile.
    if (unit.type === 'beast') {
      // 裂隙兽（hazardPhase）可穿越黑暗、迷雾、洪水等灾害地形，仅被田地与墙阻挡
      if (unit.hazardPhase) {
        return ![TILE.FIELD, TILE.WALL].includes(terrain);
      }
      return ![TILE.WATER, TILE.FIELD, TILE.WALL].includes(terrain);
    }
    if (this.isMessenger(unit)) {
      return ![TILE.WATER, TILE.MOUNTAIN, TILE.WALL, TILE.DARK, TILE.POISON, TILE.FOREST].includes(terrain);
    }
    return ![TILE.WATER, TILE.MOUNTAIN, TILE.WALL, TILE.DARK, TILE.POISON, TILE.FOREST].includes(terrain);
  }

  isProtected(x, y) {
    return this.creations.some((creation) => {
      if (creation.remaining <= 0 || !creation.placed) return false;
      if (creation.card.ability === 'force_field' && this.distance(x, y, creation.x, creation.y) <= creation.card.range) return true;
      if (creation.card.ability === 'absorb_water' && this.distance(x, y, creation.x, creation.y) <= 1) return true;
      return false;
    });
  }

  nearActiveAbility(x, y, abilities) {
    return this.creations.some((creation) => creation.remaining > 0 && creation.placed && abilities.includes(creation.card.ability) && this.distance(x, y, creation.x, creation.y) <= creation.card.range + 1);
  }

  uniqueCells(cells) {
    const seen = new Set();
    const result = [];
    for (const cell of cells) {
      const key = `${cell.x},${cell.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(cell);
    }
    return result;
  }

  // ========== World Legend Integration ==========

  recordLegendaryEvent(type, actor, target, impact = 'minor') {
    const event = {
      type,
      actor: actor || '造物者',
      target: target || null,
      level: this.level?.title || '未知',
      turn: this.turn,
      description: `${actor || '造物者'}在${this.level?.title || '未知'}${type === 'creation' ? '创造了' : type === 'rescue' ? '拯救了' : '做出了'}${target || '伟大的事迹'}`,
      impact
    };
    return worldLegendSystem.recordLegendaryEvent(event);
  }

  createArtifact(creation, impact = 'minor') {
    return worldLegendSystem.createArtifact(creation, {
      creator: '造物者',
      level: this.level?.title,
      impact
    });
  }

  // ========== Movement helpers ==========

  findPath(unit, goal) {
    if (!goal) return null;
    const startKey = `${unit.x},${unit.y}`;
    const goalKey = `${goal.x},${goal.y}`;
    if (startKey === goalKey) return null;

    const heuristic = (x, y) => this.distance(x, y, goal.x, goal.y);
    const openSet = [{ x: unit.x, y: unit.y, g: 0, f: heuristic(unit.x, unit.y) }];
    const closedSet = new Set();
    const cameFrom = new Map([[startKey, null]]);
    const gScore = new Map([[startKey, 0]]);

    while (openSet.length > 0) {
      // Stable tie-breaking: prefer lower heuristic, lower g, then deterministic coords.
      openSet.sort((a, b) => {
        if (a.f !== b.f) return a.f - b.f;
        const ha = heuristic(a.x, a.y);
        const hb = heuristic(b.x, b.y);
        if (ha !== hb) return ha - hb;
        if (a.g !== b.g) return a.g - b.g;
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
      });
      const current = openSet.shift();
      const currentKey = `${current.x},${current.y}`;
      if (closedSet.has(currentKey)) continue;
      closedSet.add(currentKey);
      if (currentKey === goalKey) break;

      // Explore neighbors ordered by proximity to goal for more goal-directed paths.
      const nbs = this.neighbors(current.x, current.y)
        .filter((nb) => !closedSet.has(`${nb.x},${nb.y}`) && this.isPassable(nb.x, nb.y, unit));
      nbs.sort((a, b) => {
        const da = heuristic(a.x, a.y);
        const db = heuristic(b.x, b.y);
        if (da !== db) return da - db;
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
      });

      for (const nb of nbs) {
        const key = `${nb.x},${nb.y}`;
        const moveCost = this.getMoveCost(nb.x, nb.y, unit);
        const tentativeG = current.g + moveCost;
        if (!gScore.has(key) || tentativeG < gScore.get(key)) {
          gScore.set(key, tentativeG);
          cameFrom.set(key, { x: current.x, y: current.y });
          openSet.push({
            x: nb.x,
            y: nb.y,
            g: tentativeG,
            f: tentativeG + heuristic(nb.x, nb.y)
          });
        }
      }
    }

    if (!cameFrom.has(goalKey)) {
      // Goal unreachable: find nearest reachable point via Manhattan distance
      let bestKey = null;
      let bestDist = Infinity;
      for (const key of cameFrom.keys()) {
        if (key === startKey) continue;
        const [cx, cy] = key.split(',').map(Number);
        const dist = this.distance(cx, cy, goal.x, goal.y);
        if (dist < bestDist || (dist === bestDist && key < (bestKey || ''))) {
          bestDist = dist;
          bestKey = key;
        }
      }
      if (!bestKey) return null; // Completely trapped
      // Mark as fallback so nextStepToward doesn't cache
      if (unit && typeof unit === 'object') unit._pathfindFallback = true;
      // Reconstruct path to bestKey
      const [bx, by] = bestKey.split(',').map(Number);
      const path = [];
      let current = { x: bx, y: by };
      let previous = cameFrom.get(bestKey);
      while (previous && !(previous.x === unit.x && previous.y === unit.y)) {
        path.unshift(current);
        current = previous;
        previous = cameFrom.get(`${current.x},${current.y}`);
      }
      if (current.x !== unit.x || current.y !== unit.y) path.unshift(current);
      return path;
    }

    const path = [];
    let current = { x: goal.x, y: goal.y };
    let previous = cameFrom.get(goalKey);
    while (previous && !(previous.x === unit.x && previous.y === unit.y)) {
      path.unshift(current);
      current = previous;
      previous = cameFrom.get(`${current.x},${current.y}`);
    }
    if (current.x !== unit.x || current.y !== unit.y) path.unshift(current);
    return path;
  }

  nextStepToward(unit, goal) {
    if (!goal) return null;
    const goalKey = `${goal.x},${goal.y}`;
    const startKey = `${unit.x},${unit.y}`;
    if (startKey === goalKey) return null;

    // Prefer a cached path toward the same goal to avoid oscillation between turns.
    if (unit._pathCache && unit._pathCache.goalKey === goalKey) {
      const idx = unit._pathCache.index;
      if (idx < unit._pathCache.path.length) {
        const next = unit._pathCache.path[idx];
        if (this.isPassable(next.x, next.y, unit) && this.distance(unit.x, unit.y, next.x, next.y) === 1) {
          unit._pathCache.index += 1;
          return next;
        }
      }
    }

    const path = this.findPath(unit, goal);
    if (!path || path.length === 0) return null;

    if (!unit._pathfindFallback) {
      unit._pathCache = { goalKey, path, index: 1 };
    } else {
      unit._pathCache = null; // Don't cache fallback paths
      delete unit._pathfindFallback;
    }
    return path[0];
  }

  getUnitMoveSteps(unit) {
    const speed = Math.max(1, Math.floor(Number(unit.moveSpeed || 1)));
    const bonus = Math.max(0, Math.floor(Number(unit.moveBonus || 0)));
    const revealBonus = unit.revealedPath > 0 ? 1 : 0;
    const steps = Math.max(1, Math.min(3, Math.max(speed, 1 + bonus + revealBonus)));

    // 防御性降级：若步数大于 1 但没有任何合法加成来源，则强制移动 1 格并记录警告
    if (steps > 1 && speed <= 1 && bonus <= 0 && revealBonus <= 0) {
      this.log(`【警告】${unit.name} 的移动步数被计算为 ${steps}，但没有任何合法加成来源（moveSpeed=${unit.moveSpeed}, moveBonus=${unit.moveBonus}, revealedPath=${unit.revealedPath}），已强制降级为 1。`);
      return 1;
    }
    return steps;
  }

  moveUnitTowardGoal(unit, steps = 1) {
    let moved = 0;
    const limit = Math.max(1, Math.floor(Number(steps) || 1));
    for (let i = 0; i < limit; i += 1) {
      if (this.isGoalReached(unit)) break;
      const fromX = unit.x;
      const fromY = unit.y;
      const next = this.nextStepToward(unit, unit.goal);
      if (!next) break;
      // Avoid immediately reversing the previous move when we have a real alternative.
      if (moved === 0 && unit.lastMove && this._isReverseMove(unit, next)) {
        const alt = this._findNonReversingStep(unit, unit.goal);
        if (alt) {
          unit.x = alt.x;
          unit.y = alt.y;
          unit.lastMove = { dx: unit.x - fromX, dy: unit.y - fromY, x: fromX, y: fromY };
          unit._pathCache = null; // Cache was based on the reversing step; recalculate next turn.
          moved += 1;
          continue;
        }
      }
      unit.x = next.x;
      unit.y = next.y;
      unit.lastMove = { dx: unit.x - fromX, dy: unit.y - fromY, x: fromX, y: fromY };
      moved += 1;
    }
    return moved;
  }

  _isReverseMove(unit, next) {
    if (!unit.lastMove) return false;
    const dx = next.x - unit.x;
    const dy = next.y - unit.y;
    return dx === -unit.lastMove.dx && dy === -unit.lastMove.dy;
  }

  _findNonReversingStep(unit, goal) {
    if (!goal || !unit.lastMove) return null;
    const reverseX = unit.x - unit.lastMove.dx;
    const reverseY = unit.y - unit.lastMove.dy;
    if (!this.inBounds(reverseX, reverseY)) return null;
    // Temporarily block the reverse tile for this unit so isPassable rejects it.
    unit._pathfindBlock = { x: reverseX, y: reverseY };
    const path = this.findPath(unit, goal);
    delete unit._pathfindBlock;
    if (path && path.length > 0) {
      const alt = path[0];
      if (alt.x !== reverseX || alt.y !== reverseY) return alt;
    }
    return null;
  }

  endTurn() {
    if (this.gameState !== 'playing') return { error: 'level ended' };

    this.log(`========== turn ${this.turn} ==========`, true);
    this.applyActiveCreationEffects();
    this.applyChainReactions();
    this.triggerRandomEvent();
    this.moveUnits();
    this.spreadHazards();
    this.applyTileHazardsToUnits();
    this.enemyIntentSystem.generatePreviews(this.worldState, this);
    this.cognitiveAbyss.update(this.entropy, this.level.entropyLimit || 7);
    this.decrementCreationDurations();
    this.checkOathBetrayals();

    if (this.turn % 5 === 0) worldLegendSystem.evolveMyths();

    this.checkEndCondition(true);

    if (this.gameState === 'playing') {
      this.turn += 1;
      if (this.turn > this.level.maxTurns) this.checkEndCondition(true, true);
    }

    this.hooks.onTurnEnd();
    return { success: true, gameState: this.gameState };
  }

  applyActiveCreationEffects() {
    for (const creation of this.creations) {
      if (creation.remaining <= 0 || creation.placed === false) continue;
      const type = creation.card.specialEffect?.type;
      if (type === 'mobile' || type === 'movement') this.moveCreationMobile(creation);
      if (type === 'environmental') this.applyEnvironmentalEffect(creation);
      if (type === 'sacrifice') this.applySacrificeEffect(creation);
      applyAbility(this, creation, 'active');
    }
  }

  moveCivilian(unit) {
    if (this.isGoalReached(unit)) {
      this.rescueUnit(unit);
      return;
    }

    const guided = unit.guidedTurns > 0 || this.nearActiveAbility(unit.x, unit.y, ['guide', 'memory_beacon', 'illuminate']);
    const immuneChaos = unit.immuneChaos > 0;
    const hasDreamLink = unit.dreamLinked && this.units.find(u => u.id === unit.dreamLinked && u.status === 'active');
    if (hasDreamLink && !guided) {
      const linkedUnit = this.units.find(u => u.id === unit.dreamLinked);
      if (linkedUnit && this.distance(linkedUnit.x, linkedUnit.y, unit.goal.x, unit.goal.y) < this.distance(unit.x, unit.y, unit.goal.x, unit.goal.y)) {
        unit.guidedTurns = Math.max(unit.guidedTurns || 0, 1);
      }
    }

    // 记忆瘟疫乱走仅在居民身处迷雾内时触发：迷雾内四方向随机移动，迷雾外正常寻路
    const inFog = this.getTerrain(unit.x, unit.y) === TILE.FOG;
    let moved = 0;
    if (inFog && !guided && !immuneChaos) {
      const next = this.randomPassableNeighbor(unit);
      if (next) {
        unit.x = next.x;
        unit.y = next.y;
        moved = 1;
        this.log(`${unit.name} 在迷雾中迷失方向，四方向随机移动`);
      }
    } else {
      moved = this.moveUnitTowardGoal(unit, this.getUnitMoveSteps(unit));
    }

    if ((unit.revealedPath > 0 || unit.moveSpeed > 1 || unit.moveBonus > 0) && moved > 1) {
      this.log(`${unit.name} uses extra action to move ${moved} steps`);
    }
    if (unit.guidedTurns > 0) unit.guidedTurns -= 1;
    if (unit.revealedPath > 0) unit.revealedPath -= 1;
    if (unit.hasteTurns > 0) unit.hasteTurns -= 1;
    if (unit.hasteTurns === 0) unit.moveSpeed = 1;
    if (unit.immuneChaos > 0) unit.immuneChaos -= 1;
    if (this.isGoalReached(unit)) this.rescueUnit(unit);
  }

  moveMessenger(unit) {
    if (this.isGoalReached(unit)) {
      unit.met = true;
      return;
    }
    const terrain = this.getTerrain(unit.x, unit.y);
    const guided = unit.guidedTurns > 0 || this.nearActiveAbility(unit.x, unit.y, ['calm', 'guide', 'memory_beacon']);
    const immuneChaos = unit.immuneChaos > 0;
    if (terrain === TILE.FOG && !guided && !immuneChaos) {
      const fogNext = this.randomPassableNeighbor(unit);
      if (fogNext) {
        unit.x = fogNext.x;
        unit.y = fogNext.y;
        this.log(`${unit.name} 在迷雾中迷失方向，四方向随机移动`);
      }
      if (this.isGoalReached(unit)) {
        unit.met = true;
        this.log(`${unit.name} reaches the border meeting point`, true);
      }
      return;
    }
    if (terrain === TILE.DARK && !guided && !immuneChaos) {
      this.warMeter = Math.min(this.level.hazard?.warLimit || 9, this.warMeter + 1);
      this.log(`${unit.name} misjudges the fog; war meter +1`);
      return;
    }
    const moved = this.moveUnitTowardGoal(unit, this.getUnitMoveSteps(unit));
    if ((unit.revealedPath > 0 || unit.moveSpeed > 1 || unit.moveBonus > 0) && moved > 1) {
      this.log(`${unit.name} uses extra action to move ${moved} steps`);
    }
    if (unit.guidedTurns > 0) unit.guidedTurns -= 1;
    if (unit.revealedPath > 0) unit.revealedPath -= 1;
    if (unit.hasteTurns > 0) unit.hasteTurns -= 1;
    if (unit.hasteTurns === 0) unit.moveSpeed = 1;
    if (unit.immuneChaos > 0) unit.immuneChaos -= 1;
    if (this.isGoalReached(unit)) {
      unit.met = true;
      this.log(`${unit.name} reaches the border meeting point`, true);
    }
  }

  addLog(text, important = false) {
    this.log(text, important);
  }

  // ========== Logging ==========

  log(text, important = false) {
    const displayText = normalizeCreationDisplayText(text);
    this.logs.unshift({ text: displayText, important, turn: this.turn });
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }
    this.hooks.onLog(displayText, important, this.turn);
  }

  addLog(text, important = false) {
    this.log(text, important);
  }

  // ========== Rescue ==========

  rescueUnit(unit) {
    unit.status = 'rescued';
    unit.rescued = true;
    this.rescued += 1;
    this.log(`${unit.name} 抵达安全点`, true);
    this.updateWorldState({ type: 'unit_rescued', detail: unit.name });
    this.emitWorldEvent('unit_rescued', {
      unitId: unit.id,
      unitName: unit.name,
      unitType: unit.type,
      residentId: unit.residentId || null
    }, {
      importance: 0.8,
      tags: ['rescue', unit.type]
    });
    const levelStats = { turn: this.turn, maxTurns: this.level.maxTurns, lost: this.lost };
    const legacy = legacySystem.recordRescue(unit, this.level.id, levelStats);
    if (legacy && legacy.rescueCount > 1) {
      this.log(`【传承】${unit.name} 再次出现！传承等级：${legacy.tier}`, true);
    }
    // Record legendary event for significant rescues
    if (this.lost === 0 && this.rescued >= 2) {
      this.recordLegendaryEvent('rescue', '造物者', unit.name, 'major');
    }
    this.hooks.onRescue(unit);
  }

  // ========== Ritual Forge Integration ==========

  performRitual(creationIds) {
    if (this.gameState !== 'playing') return { success: false, warnings: ['本关已结束'] };
    const creations = this.creations.filter(c => creationIds.includes(c.id) && c.placed && c.remaining > 0);
    if (creations.length < 2) {
      return { success: false, warnings: ['请选择至少2张已放置的造物卡'] };
    }
    if (creations.length > 3) {
      return { success: false, warnings: ['仪式最多使用3张造物卡'] };
    }

    const center = creations[0];
    const targetTerrain = TERRAIN_LABELS[this.getTerrain(center.x, center.y)] || 'land';
    const gameState = {
      miraclePoints: this.miraclePoints,
      entropy: this.entropy,
      entropyLimit: this.level.entropyLimit,
      turn: this.turn,
      targetTerrain
    };

    const result = this.ritualForge.performRitual(creations, gameState, {});
    if (!result.success) {
      return result;
    }

    // Deduct costs
    this.miraclePoints -= result.miracleCost;
    this.entropy += result.entropyChange;

    // Consume sacrificed creations
    for (const id of result.consumed) {
      const c = this.creations.find(cc => cc.id === id);
      if (c) c.remaining = 0;
    }

    // Attach selected creations for effect targeting
    result.creations = creations;
    this.applyRitualEffect(result);

    this.log(`【仪式】${result.narrative}`, true);
    this.emitWorldEvent('ritual_performed', {
      recipeId: result.ritual?.id || 'emergent',
      creationNames: creations.map(c => normalizeCreationName(c.card))
    }, { importance: 0.8, tags: ['ritual'] });

    return result;
  }

  applyRitualEffect(result) {
    const recipe = result.ritual;
    const center = result.creations?.[0];

    if (recipe) {
      switch (recipe.id) {
        case 'water_purification': {
          let changed = 0;
          for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
              const t = this.getTerrain(x, y);
              if ([TILE.WATER, TILE.FOG, TILE.DARK].includes(t)) {
                this.setTerrain(x, y, TILE.LAND);
                changed++;
              }
            }
          }
          this.log(`净水圣仪净化了 ${changed} 格水域与迷雾`);
          break;
        }
        case 'earth_shaping': {
          const cells = [];
          for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) cells.push({ x, y });
          }
          let changed = 0;
          for (const cell of cells.sort(() => Math.random() - 0.5).slice(0, 8)) {
            const t = this.getTerrain(cell.x, cell.y);
            if ([TILE.LAND, TILE.SWAMP, TILE.FOG, TILE.DARK].includes(t)) {
              this.setTerrain(cell.x, cell.y, Math.random() < 0.5 ? TILE.HIGH : TILE.FOREST);
              changed++;
            }
          }
          this.log(`塑地秘仪重塑了 ${changed} 格地形`);
          break;
        }
        case 'beast_taming': {
          for (const unit of this.units.filter(u => u.type === 'beast' && u.status === 'active')) {
            unit.tamed = true;
            unit.anger = 0;
            unit.stunnedTurns = 2;
          }
          this.log('驯兽古仪让巨兽安静下来');
          break;
        }
        case 'light_forge': {
          let changed = 0;
          for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
              const t = this.getTerrain(x, y);
              if ([TILE.DARK, TILE.FOG].includes(t)) {
                this.setTerrain(x, y, TILE.LAND);
                changed++;
              }
            }
          }
          this.log(`光铸神仪驱散了 ${changed} 格黑暗`);
          break;
        }
        case 'shadow_ritual': {
          let shielded = 0;
          for (const creation of this.creations.filter(c => c.placed && c.remaining > 0)) {
            for (const unit of this.units.filter(u => u.status === 'active' && this.distance(u.x, u.y, creation.x, creation.y) <= 3)) {
              unit.shieldTurns = 2;
              shielded++;
            }
          }
          this.log(`暗影潜仪为 ${shielded} 个单位披上隐形庇护`);
          break;
        }
        case 'time_weave': {
          let extended = 0;
          for (const creation of this.creations) {
            if (creation.placed && creation.remaining > 0) {
              creation.remaining += 2;
              extended++;
            }
          }
          this.log(`织时幻仪延长了 ${extended} 个造物的持续时间`);
          break;
        }
        case 'nature_awakening': {
          let changed = 0;
          for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
              if (this.getTerrain(x, y) === TILE.LAND) {
                this.setTerrain(x, y, TILE.FOREST);
                changed++;
              }
            }
          }
          for (const unit of this.units.filter(u => u.status === 'active')) {
            unit.guidedTurns = Math.max(unit.guidedTurns, 1);
          }
          this.log(`自然觉醒让 ${changed} 格土地化为森林`);
          break;
        }
        case 'rift_sealing': {
          this.entropy = Math.max(0, this.entropy - 3);
          let sealed = 0;
          for (const c of this.creations) {
            if (c.placed && c.card.ability === 'memory_beacon') {
              c.remaining = 0;
              sealed++;
            }
          }
          this.log(`封隙禁仪封印了裂隙，${sealed} 个记忆信标熄灭`);
          break;
        }
      }
      return;
    }

    // Apply emergent effect
    const effect = result.effects?.[0];
    if (effect && center) {
      if (effect.terrainChanges) {
        for (const change of effect.terrainChanges) {
          let changed = 0;
          const range = change.range || 1;
          for (const cell of this.tilesWithin(center.x, center.y, range + 1)) {
            const t = this.getTerrain(cell.x, cell.y);
            if (change.type === 'fertile' && [TILE.LAND, TILE.SWAMP, TILE.FOG].includes(t)) {
              this.setTerrain(cell.x, cell.y, TILE.FOREST);
              changed++;
            } else if (change.type === 'random' && [TILE.LAND, TILE.FOG, TILE.DARK].includes(t)) {
              const terrains = [TILE.LAND, TILE.WATER, TILE.DARK, TILE.FOG];
              this.setTerrain(cell.x, cell.y, terrains[Math.floor(Math.random() * terrains.length)]);
              changed++;
            }
          }
          if (changed) this.log(`涌现仪式改变了 ${changed} 格地形`);
        }
      }
      if (effect.unitBuffs) {
        for (const buff of effect.unitBuffs) {
          for (const unit of this.units.filter(u => u.status === 'active')) {
            if (buff.type === 'balanced') {
              unit.immuneChaos = Math.max(unit.immuneChaos || 0, buff.duration || 2);
            } else if (buff.type === 'slowed') {
              unit.stunnedTurns = 2;
            }
          }
        }
      }
    }
  }

  // ========== Oathbinding Integration ==========

  bindOath(npcId, type) {
    if (!this.npcManager) {
      return { success: false, error: '当前区域没有NPC' };
    }
    const npc = this.npcManager.getNPC(npcId);
    if (!npc) {
      return { success: false, error: '找不到该NPC' };
    }
    const socialGraph = this.npcManager.socialGraph || null;
    const result = this.oathManager.createOath(type, npcId, npc.name, socialGraph);
    if (result.success) {
      const oathName = OATH_TYPES[type]?.name || type;
      this.log(`【誓约】你与 ${npc.name} 缔结了${oathName}。`, true);
      this.emitWorldEvent('oath_formed', {
        npcId,
        npcName: npc.name,
        type
      }, { importance: 0.7, tags: ['oath'] });
    } else {
      this.log(`缔结誓约失败：${result.error}`);
    }
    return result;
  }

  breakOath(oathId) {
    const result = this.oathManager.playerBreakOath(oathId);
    if (result.success) {
      const oathName = OATH_TYPES[result.oath.type]?.name || '';
      this.log(`【誓约】你主动背弃了与 ${result.oath.npcName} 的${oathName}。`, true);
      for (const consequence of result.consequences) {
        this.log(`  ${consequence.description}`);
      }
      this.oathManager.applyBetrayalConsequences(result.consequences, this.worldState || {});
      this.emitWorldEvent('oath_broken', {
        oathId,
        npcId: result.oath.npcId,
        type: result.oath.type
      }, { importance: 0.8, tags: ['oath'] });
    }
    return result;
  }

  checkOathBetrayals() {
    if (!this.oathManager) return;
    const socialGraph = this.npcManager?.socialGraph || null;
    const betrayals = this.oathManager.checkBetrayals(socialGraph);
    for (const betrayal of betrayals) {
      const oathName = OATH_TYPES[betrayal.oath.type]?.name || '';
      this.log(`【背叛】${betrayal.oath.npcName} 背弃了${oathName}！`, true);
      for (const consequence of betrayal.consequences) {
        this.log(`  ${consequence.description}`);
      }
      this.oathManager.applyBetrayalConsequences(betrayal.consequences, this.worldState || {});
      this.emitWorldEvent('oath_betrayed', {
        oathId: betrayal.oath.id,
        npcId: betrayal.oath.npcId,
        type: betrayal.oath.type
      }, { importance: 0.9, tags: ['oath', 'betrayal'] });
    }
  }
}

export { GameEngine, BOARD_SIZE, TERRAIN_LABELS, TERRAIN_SYMBOLS };
