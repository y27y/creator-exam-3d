import { cloneLevel, LEVELS, SYMBOL_TO_TILE, TILE } from './levels.js';
import { localCompile } from './aiClient.js';
import { RESONANCE_CODEX, executeChainReaction } from './chainReactionCodex.js';
import { legacySystem } from './legacySystem.js';
import { worldLegendSystem } from './worldLegend.js';

const BOARD_SIZE = 7;
const MAX_LOGS = 100;

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
      onCreationExpire: options.onCreationExpire || (() => {})
    };
    this.reset();
  }

  // ========== State Management ==========

  reset() {
    this.level = cloneLevel(LEVELS[this.levelIndex]);
    this.terrain = this.level.map.map((row) => row.split('').map((char) => SYMBOL_TO_TILE[char] || TILE.LAND));
    this.units = this.level.units.map((unit, unitIndex) => ({
      id: `${this.level.id}-${unitIndex}`,
      status: 'active',
      rescued: false,
      lost: false,
      stunned: false,
      guidedTurns: 0,
      met: false,
      ...unit
    }));
    this.creations = [];
    this.turn = 1;
    this.rescued = 0;
    this.lost = 0;
    this.entropy = 0;
    this.creationCharges = this.level.creationCharges;
    this.miraclePoints = this.level.miraclePoints;
    this.warMeter = Number(this.level.hazard?.warMeter || 0);
    this.peaceTalks = 0;
    this.gameState = 'playing';
    this.logs = [];
    this.worldState = this.initWorldState();
    this.resonanceCodex = RESONANCE_CODEX;
    this.resonanceCodex.reset();
    this.npcManager = null;
    this.legacyUnits = [];
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

    this.hooks.onStateChange();
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

  // ========== World State Management ==========

  updateWorldState(action) {
    this.worldState.actions.push({
      turn: this.turn,
      type: action.type,
      detail: action.detail,
      timestamp: Date.now()
    });
    this.analyzePlayStyle();
    if (action.type === 'creation_placed') {
      this.worldState.storySeeds.creationsUsed.push(action.creationName);
      this.worldState.creations.push(action.creationName);
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
    this.log(`造物编译完成：${card.name} (${card.type})`, true);
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
    this.log(`你在 ${this.tileName(x, y)} 放置了「${card.name}」`, true);
    if (card.stabilityCost > 0) {
      this.log(`副作用触发：世界裂隙 +${card.stabilityCost}`);
    }

    this.updateWorldState({ type: 'creation_placed', detail: card.name, creationName: card.name });
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
    this.applyActiveCreationEffects();
    this.applyChainReactions();
    this.triggerRandomEvent();
    this.moveUnits();
    this.spreadHazards();
    this.applyTileHazardsToUnits();
    this.decrementCreationDurations();
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
    if (card.ability === 'create_bridge') {
      const cells = this.tilesWithin(x, y, Math.max(1, card.range));
      let changed = 0;
      for (const cell of cells) {
        if (changed >= 4) break;
        if ([TILE.WATER, TILE.SWAMP, TILE.FOG, TILE.DARK, TILE.POISON].includes(this.getTerrain(cell.x, cell.y))) {
          this.setTempTerrain(creation, cell.x, cell.y, TILE.BRIDGE);
          changed += 1;
        }
      }
      if (!changed) this.setTempTerrain(creation, x, y, TILE.BRIDGE);
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
      if (changed) this.log(`「${card.name}」改造了 ${changed} 处危险地形`);
    }
    if (card.ability === 'freeze_water') {
      let changed = 0;
      for (const cell of this.tilesWithin(x, y, card.range)) {
        if (this.getTerrain(cell.x, cell.y) === TILE.WATER) {
          this.setTempTerrain(creation, cell.x, cell.y, TILE.BRIDGE);
          changed += 1;
        }
      }
      if (changed) this.log(`「${card.name}」冻结了 ${changed} 格水域`);
      else this.log(`「${card.name}」没有冻结到水域`);
    }
    if (card.ability === 'raise_earth') {
      let changed = 0;
      for (const cell of this.tilesWithin(x, y, card.range)) {
        const terrain = this.getTerrain(cell.x, cell.y);
        if (terrain === TILE.LAND || terrain === TILE.SWAMP || terrain === TILE.FOG) {
          this.setTempTerrain(creation, cell.x, cell.y, TILE.HIGH);
          changed += 1;
        }
      }
      if (changed) this.log(`「${card.name}」抬升了 ${changed} 格地面`);
      else this.log(`「${card.name}」没有可抬升的地面`);
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
      if (changed) this.log(`「${card.name}」种植了 ${changed} 格森林`);
      else this.log(`「${card.name}」没有可种植的土地`);
    }
    if (card.ability === 'dig_channel') {
      this.setTerrain(x, y, TILE.WATER);
      this.log(`「${card.name}」在 ${this.tileName(x, y)} 挖掘了水渠`);
    }
    if (card.ability === 'trap') {
      this.log(`「${card.name}」在 ${this.tileName(x, y)} 设置了陷阱`);
    }
    if (card.ability === 'time_dilation') {
      this.level.maxTurns += 1;
      this.log(`「${card.name}」延缓了时间，剩余回合 +1`);
    }
    if (card.ability === 'reveal_path') {
      let revealed = 0;
      for (const unit of this.units.filter((u) => (this.isCivilian(u) || this.isMessenger(u)) && u.status === 'active')) {
        if (this.distance(unit.x, unit.y, x, y) <= card.range + 1) {
          unit.revealedPath = 3;
          revealed += 1;
        }
      }
      if (revealed) this.log(`「${card.name}」为 ${revealed} 个单位显示了最优路径`);
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
      if (changed) this.log(`「${card.name}」的大范围光照驱散了 ${changed} 格黑暗，并恢复了单位体力`);
    }
    if (card.ability === 'dream_link') {
      const targets = this.units.filter((u) => (this.isCivilian(u) || this.isMessenger(u)) && u.status === 'active' && this.distance(u.x, u.y, x, y) <= card.range + 1);
      if (targets.length >= 2) {
        const a = targets[0];
        const b = targets[1];
        a.dreamLinked = b.id;
        b.dreamLinked = a.id;
        a.guidedTurns = Math.max(a.guidedTurns, 2);
        b.guidedTurns = Math.max(b.guidedTurns, 2);
        this.log(`「${card.name}」连接了 ${a.name} 和 ${b.name} 的梦境，共享视野`);
      }
    }
  }

  applyActiveCreationEffects() {
    for (const creation of this.creations) {
      if (creation.remaining <= 0 || !creation.placed) continue;
      const { card, x, y } = creation;

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
        if (changed) this.log(`「${card.name}」吸收了 ${changed} 格水域`);
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
        if (changed) this.log(`「${card.name}」照亮了 ${changed} 格黑暗或迷雾`);
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
        if (changed) this.log(`「${card.name}」净化了 ${changed} 格污染地形`);
      }

      if (card.ability === 'calm') {
        if (this.isWarLevel()) {
          const before = this.warMeter;
          this.warMeter = Math.max(0, this.warMeter - 2);
          if (before !== this.warMeter) this.log(`「${card.name}」降低战争值：${before} → ${this.warMeter}`);
        }
        for (const unit of this.units.filter((u) => u.type === 'beast' && u.status === 'active')) {
          if (this.distance(unit.x, unit.y, x, y) <= card.range + 1) {
            unit.anger = Math.max(0, (unit.anger || 0) - 1);
            unit.stunned = true;
            this.log(`「${card.name}」安抚了 ${unit.name}，怒气降至 ${unit.anger}`);
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
        if (guided) this.log(`「${card.name}」正在引导 ${guided} 个单位`);
      }

      if (card.ability === 'slow_beast') {
        for (const unit of this.units.filter((u) => u.type === 'beast' && u.status === 'active')) {
          if (this.distance(unit.x, unit.y, x, y) <= card.range + 1) {
            unit.stunned = true;
            this.log(`「${card.name}」牵制了 ${unit.name}`);
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
        if (changed) this.log(`「${card.name}」唤回记忆，驱散 ${changed} 格迷雾`);
      }

      if (card.ability === 'freeze_water') {
        if (creation.remaining === 1) {
          this.log(`「${card.name}」冻结的水域即将融化`);
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
        if (revealed) this.log(`「${card.name}」为 ${revealed} 个单位显示了最优路径`);
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
        if (changed) this.log(`「${card.name}」的大范围光照驱散了 ${changed} 格黑暗，并恢复了单位体力`);
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
          this.log(`「${card.name}」的水渠将水流导向 ${this.tileName(target.x, target.y)}`);
        }
      }

      if (card.ability === 'dream_link') {
        const targets = this.units.filter((u) => (this.isCivilian(u) || this.isMessenger(u)) && u.status === 'active' && this.distance(u.x, u.y, x, y) <= card.range + 1);
        if (targets.length >= 2) {
          const a = targets[0];
          const b = targets[1];
          a.dreamLinked = b.id;
          b.dreamLinked = a.id;
          a.guidedTurns = Math.max(a.guidedTurns, 2);
          b.guidedTurns = Math.max(b.guidedTurns, 2);
          this.log(`「${card.name}」连接了 ${a.name} 和 ${b.name} 的梦境，共享视野`);
        }
      }
    }
  }

  // ========== Unit Movement ==========

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

    let next = null;
    if (this.level.memoryChaos && !guided && !immuneChaos && Math.random() < 0.45) {
      next = this.randomPassableNeighbor(unit);
      if (next) this.log(`${unit.name} 被记忆瘟疫影响，偏离了道路`);
    }
    if (!next) next = this.nextStepToward(unit, unit.goal);
    if (next) {
      unit.x = next.x;
      unit.y = next.y;
      if (hasRevealPath && !this.isGoalReached(unit)) {
        const extraStep = this.nextStepToward(unit, unit.goal);
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
    const next = this.nextStepToward(unit, unit.goal);
    if (next) {
      unit.x = next.x;
      unit.y = next.y;
      if (unit.revealedPath > 0 && !this.isGoalReached(unit)) {
        const extraStep = this.nextStepToward(unit, unit.goal);
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
    if (this.isGoalReached(unit)) {
      unit.met = true;
      this.log(`${unit.name} 抵达边境会谈点`, true);
    }
  }

  moveBeast(unit) {
    if (unit.stunned) {
      unit.stunned = false;
      this.log(`${unit.name} 本回合被牵制，没有前进`);
      return;
    }
    const next = this.nextStepToward(unit, unit.goal);
    if (!next) {
      unit.anger = Math.min(this.level.beastAngerLimit || 5, (unit.anger || 0) + 1);
      this.log(`${unit.name} 被完全堵住，怒气上升到 ${unit.anger}`);
      return;
    }
    unit.x = next.x;
    unit.y = next.y;
    const trapHere = this.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'trap' && c.x === unit.x && c.y === unit.y);
    if (trapHere) {
      unit.stunned = true;
      trapHere.remaining = 0;
      this.log(`「${trapHere.card.name}」触发！${unit.name} 被困住`);
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
    if (terrain === TILE.FOREST) cost = 2;
    else if (terrain === TILE.HIGH) cost = 1.5;
    else if (terrain === TILE.BRIDGE) cost = 1.2;
    else if (terrain === TILE.SWAMP) cost = 2.5;
    else if (terrain === TILE.FOG || terrain === TILE.DARK) cost = 3;

    const tempCreation = this.creations.find(c =>
      c.placed && c.remaining > 0 && c.remaining <= 1 &&
      this.distance(x, y, c.x, c.y) <= (c.card.range || 0) &&
      c.restores?.some(r => r.x === x && r.y === y)
    );
    if (tempCreation) cost += 5;

    if (unit.type === 'beast') {
      const trapHere = this.creations.some(c =>
        c.placed && c.remaining > 0 && c.card.ability === 'trap' &&
        c.x === x && c.y === y
      );
      if (trapHere) cost += 10;
    }

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
    if (type === 'flood') this.spreadTerrain(TILE.WATER, this.level.hazard.spreadPerTurn || 2);
    if (type === 'darkness') this.spreadTerrain(TILE.DARK, this.level.hazard.spreadPerTurn || 2);
    if (type === 'fog') this.spreadTerrain(TILE.FOG, this.level.hazard.spreadPerTurn || 2);
    if (type === 'war') this.advanceWar();
    if (type === 'mixed') {
      this.spreadTerrain(TILE.WATER, 1);
      this.spreadTerrain(TILE.DARK, 1);
      this.spreadTerrain(TILE.FOG, 1);
      this.advanceWar();
    }
    if (type) this.hooks.onHazardSpread(type);
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
      const label = sourceTerrain === TILE.WATER ? '洪水' : sourceTerrain === TILE.DARK ? '黑暗' : '迷雾';
      this.log(`${label} 扩散了 ${picked.length} 格`);
    }
  }

  canHazardEnter(x, y, sourceTerrain, terrain) {
    if (this.isProtected(x, y)) return false;
    if ([TILE.HIGH, TILE.EXIT, TILE.CITY, TILE.MOUNTAIN, TILE.WALL, TILE.FIELD, TILE.SACRED].includes(terrain)) return false;
    if (terrain === sourceTerrain) return false;
    if (terrain === TILE.BRIDGE && sourceTerrain !== TILE.DARK) return false;
    if (terrain === TILE.FOREST) return false;
    return [TILE.LAND, TILE.VILLAGE, TILE.FOREST, TILE.BORDER, TILE.SWAMP, TILE.FOG, TILE.DARK].includes(terrain);
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
    for (const unit of this.units) {
      if (unit.status !== 'active') continue;
      const terrain = this.getTerrain(unit.x, unit.y);
      if (terrain === TILE.HIGH && this.isCivilian(unit)) continue;
      if (this.isCivilian(unit) && [TILE.WATER, TILE.DARK, TILE.POISON].includes(terrain)) {
        unit.status = 'lost';
        unit.lost = true;
        this.lost += 1;
        this.log(`${unit.name} 被${TERRAIN_LABELS[terrain]}吞没`);
        this.updateWorldState({ type: 'unit_lost', detail: unit.name });
      }
    }
  }

  decrementCreationDurations() {
    for (const creation of this.creations) {
      if (creation.remaining <= 0) continue;
      creation.remaining -= 1;
      if (creation.remaining <= 0) {
        this.expireCreation(creation);
        this.log(`「${creation.card.name}」的持续时间结束`);
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
    this.hooks.onWin(message);
  }

  failLevel(message) {
    if (this.gameState !== 'playing') return;
    this.gameState = 'lost';
    this.log(`失败：${message}`, true);
    this.hooks.onLose(message);
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
      this.log(`「${card.name}」向${TERRAIN_LABELS[targetTerrain]}移动至 (${nx + 1}, ${ny + 1})`);
    }
  }

  applyEnvironmentalEffect(creation) {
    const { card, x, y } = creation;
    const se = card.specialEffect;
    if (!se) return;
    const terrain = this.getTerrain(x, y);
    const desc = se.description || '';

    if ((desc.includes('水') || desc.includes('域') || desc.includes('潮')) && terrain === TILE.WATER) {
      this.log(`「${card.name}」在水中发挥更强效力，范围扩大`);
    }
    if ((desc.includes('高') || desc.includes('山') || desc.includes('上')) && terrain === TILE.HIGH) {
      this.log(`「${card.name}」在高处发挥更强效力，范围扩大`);
    }
    if ((desc.includes('森') || desc.includes('林')) && terrain === TILE.FOREST) {
      if (creation.remaining < card.duration + 1) {
        creation.remaining += 1;
        this.log(`「${card.name}」在森林中获得滋养，持续时间延长`);
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
      if (lit) this.log(`「${card.name}」的光点照亮了 ${lit} 格黑暗`);
    }
  }

  applySacrificeEffect(creation) {
    const { card } = creation;
    const se = card.specialEffect;
    if (!se) return;
    const desc = se.description || '';

    if (desc.includes('奇迹点') || desc.includes('消耗') || desc.includes('代价')) {
      if (this.miraclePoints > 0) {
        this.miraclePoints -= 1;
        this.log(`「${card.name}」消耗了 1 点奇迹点维持存在`);
      } else {
        creation.remaining = 0;
        this.log(`「${card.name}」因缺乏奇迹点而消散`);
      }
    }
    if (desc.includes('裂隙') || desc.includes('稳定')) {
      this.entropy += 1;
      this.log(`「${card.name}」使世界裂隙增加了 1`);
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
      water: ['absorb_water', 'create_bridge', 'freeze_water', 'dig_channel'],
      light: ['illuminate', 'reveal_path', 'sun_blessing'],
      terrain: ['transform_land', 'raise_earth', 'grow_forest', 'dig_channel'],
      defense: ['block', 'force_field', 'trap'],
      spirit: ['calm', 'guide', 'memory_beacon', 'dream_link'],
      special: ['cleanse', 'time_dilation', 'slow_beast']
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
          beast.stunned = true;
          this.log(`【随机事件】${event.name}！${beast.name} 突然停下脚步，似乎在犹豫什么`, true);
        }
        break;
      }
      case 'resonanceBoost': {
        const activeCreations = this.creations.filter(c => c.placed && c.remaining > 0);
        if (activeCreations.length >= 2) {
          const target = activeCreations[Math.floor(Math.random() * activeCreations.length)];
          target.remaining += 1;
          this.log(`【随机事件】${event.name}！「${target.card.name}」的持续时间意外延长了`, true);
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
    const terrain = this.getTerrain(x, y);
    if (terrain === TILE.MOUNTAIN || terrain === TILE.WALL) return false;
    if (unit.type === 'beast') {
      return ![TILE.WATER, TILE.FIELD, TILE.WALL].includes(terrain);
    }
    if (this.isMessenger(unit)) {
      return ![TILE.WATER, TILE.MOUNTAIN, TILE.WALL, TILE.DARK, TILE.POISON].includes(terrain);
    }
    return ![TILE.WATER, TILE.MOUNTAIN, TILE.WALL, TILE.DARK, TILE.POISON].includes(terrain);
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

  // ========== Logging ==========

  log(text, important = false) {
    this.logs.unshift({ text, important, turn: this.turn });
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }
    this.hooks.onLog(text, important, this.turn);
  }

  // ========== Rescue ==========

  rescueUnit(unit) {
    unit.status = 'rescued';
    unit.rescued = true;
    this.rescued += 1;
    this.log(`${unit.name} 抵达安全点`, true);
    this.updateWorldState({ type: 'unit_rescued', detail: unit.name });
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
}

export { GameEngine, BOARD_SIZE, TERRAIN_LABELS, TERRAIN_SYMBOLS };
