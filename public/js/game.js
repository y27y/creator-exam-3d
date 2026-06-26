import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { compileCreation, abilityLabel } from './aiClient.js';
import { cloneLevel, INSPIRATIONS, LEVELS, SYMBOL_TO_TILE, TILE } from './levels.js';
import { getMemorySystem } from './aiMemory.js';
import { ParticleSystem, ScreenEffects } from './particles.js';
import { NPCManager } from './npcManager.js';
import { AbilityHandlers, applyAbility } from './abilityHandlers.js';

const TILE_SIZE = 1.55;
const BOARD_SIZE = 7;
const MAX_LOGS = 18;

// AI Narrative endpoint configuration
const NARRATIVE_ENDPOINT = '/api/narrative';
const NARRATIVE_TIMEOUT = 5000; // 5s timeout to avoid blocking gameplay

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

const MATERIAL_COLORS = {
  [TILE.LAND]: 0x52634c,
  [TILE.WATER]: 0x1c78d2,
  [TILE.HIGH]: 0x9b8a5a,
  [TILE.VILLAGE]: 0x9d6f45,
  [TILE.EXIT]: 0x4ed6ff,
  [TILE.CITY]: 0xbeb9d8,
  [TILE.BORDER]: 0x775d8f,
  [TILE.FOREST]: 0x2d7a52,
  [TILE.MOUNTAIN]: 0x6b6d77,
  [TILE.DARK]: 0x101426,
  [TILE.FOG]: 0x98a2bc,
  [TILE.SACRED]: 0x45d19a,
  [TILE.SWAMP]: 0x55622e,
  [TILE.BRIDGE]: 0xcda969,
  [TILE.WALL]: 0x5d6473,
  [TILE.FIELD]: 0x67e8ff,
  [TILE.POISON]: 0x7ed957
};

const ABILITY_COLORS = {
  absorb_water: 0x54c7ff,
  create_bridge: 0xffc46b,
  illuminate: 0xfff39a,
  block: 0xaeb7c8,
  calm: 0xd4a6ff,
  guide: 0x80f0a5,
  cleanse: 0xb4ffdd,
  slow_beast: 0xff91a8,
  memory_beacon: 0x8cb5ff,
  force_field: 0x64f3ff,
  transform_land: 0xb4e66e
};

class CreatorExam3D {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.root = document.getElementById('game-root');
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.tileMeshes = [];
    this.worldGroup = new THREE.Group();
    this.activeCard = null;
    this.placementMode = false;
    this.levelIndex = 0;
    this.logs = [];
    this.gameState = 'playing';
    this.materials = new Map();
    this.geometryCache = new Map();
    this.labelCache = new Map();
    this.tileMeshPool = new Map();
    this.unitMeshPool = new Map();
    this.creationMeshPool = new Map();
    this.rescuedMarkerPool = new Map();

    // Initialize new systems
    this.memorySystem = getMemorySystem();
    this.particleSystem = null;
    this.screenEffects = null;
    this.npcManager = null;
    this.lastFrameTime = 0;

    this.ui = this.collectUi();
    this.initScene();
    this.bindEvents();
    this.loadLevel(0);
    this.animate();
  }

  collectUi() {
    return {
      levelChip: document.getElementById('level-chip'),
      title: document.getElementById('level-title'),
      story: document.getElementById('level-story'),
      objective: document.getElementById('level-objective'),
      turn: document.getElementById('turn-stat'),
      charges: document.getElementById('charges-stat'),
      miracle: document.getElementById('miracle-stat'),
      entropy: document.getElementById('entropy-stat'),
      specialMeters: document.getElementById('special-meters'),
      unitList: document.getElementById('unit-list'),
      input: document.getElementById('creation-input'),
      compileBtn: document.getElementById('compile-btn'),
      randomBtn: document.getElementById('random-btn'),
      aiMode: document.getElementById('ai-mode'),
      cardPanel: document.getElementById('card-panel'),
      cardType: document.getElementById('card-type'),
      cardName: document.getElementById('card-name'),
      cardCost: document.getElementById('card-cost'),
      cardDesc: document.getElementById('card-desc'),
      cardTags: document.getElementById('card-tags'),
      cardAbility: document.getElementById('card-ability'),
      cardRange: document.getElementById('card-range'),
      cardDuration: document.getElementById('card-duration'),
      cardSide: document.getElementById('card-side'),
      placeBtn: document.getElementById('place-btn'),
      endTurnBtn: document.getElementById('end-turn-btn'),
      restartBtn: document.getElementById('restart-btn'),
      nextBtn: document.getElementById('next-btn'),
      logList: document.getElementById('log-list'),
      toast: document.getElementById('toast'),
      modal: document.getElementById('modal'),
      modalKicker: document.getElementById('modal-kicker'),
      modalTitle: document.getElementById('modal-title'),
      modalText: document.getElementById('modal-text'),
      modalPrimary: document.getElementById('modal-primary'),
      modalSecondary: document.getElementById('modal-secondary')
    };
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070918);
    this.scene.fog = new THREE.Fog(0x070918, 15, 34);

    this.camera = new THREE.PerspectiveCamera(47, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(6.8, 9.2, 10.5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 22;

    const ambient = new THREE.HemisphereLight(0xcfe8ff, 0x12162e, 2.1);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2.8);
    sun.position.set(6, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    this.scene.add(sun);

    const rim = new THREE.PointLight(0x7c68ff, 3, 32);
    rim.position.set(-7, 5, -6);
    this.scene.add(rim);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(8.8, 9.6, 0.28, 8),
      new THREE.MeshStandardMaterial({ color: 0x11162c, roughness: 0.8, metalness: 0.1 })
    );
    base.position.y = -0.25;
    base.receiveShadow = true;
    this.scene.add(base);

    this.scene.add(this.worldGroup);

    // Initialize particle system and screen effects
    this.particleSystem = new ParticleSystem(this.scene);
    this.screenEffects = new ScreenEffects();
  }

  bindEvents() {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('pointerdown', (event) => this.onPointerDown(event));

    this.ui.compileBtn.addEventListener('click', () => this.handleCompile());
    this.ui.randomBtn.addEventListener('click', () => this.insertInspiration());
    this.ui.placeBtn.addEventListener('click', () => this.startPlacement());
    this.ui.endTurnBtn.addEventListener('click', () => this.endTurn());
    this.ui.restartBtn.addEventListener('click', () => this.loadLevel(this.levelIndex));
    this.ui.nextBtn.addEventListener('click', () => this.nextLevel());
    this.ui.modalPrimary.addEventListener('click', () => {
      if (this.gameState === 'won') this.nextLevel();
      else this.loadLevel(this.levelIndex);
    });
    this.ui.modalSecondary.addEventListener('click', () => this.loadLevel(this.levelIndex));

    // Path visualization toggle with Shift key
    this.showPaths = false;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') {
        this.showPaths = true;
        this.updatePathLines();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') {
        this.showPaths = false;
        this.updatePathLines();
      }
    });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  loadLevel(index) {
    this.levelIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
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
    this.activeCard = null;
    this.placementMode = false;
    this.logs = [];
    this.ui.modal.classList.add('hidden');
    this.ui.nextBtn.classList.add('hidden');
    this.ui.cardPanel.classList.add('hidden');

    // Initialize NPC manager for this level
    this.npcManager = new NPCManager(this.level);

    // Update memory system
    this.memorySystem.worldState.currentLevel = this.level.id;

    this.addLog(`考核开始：${this.level.shortTitle}。`, true);
    for (const tip of this.level.tips || []) this.addLog(`提示：${tip}`);
    this.renderWorld();
    this.updateUi();
  }

  async handleCompile() {
    if (this.gameState !== 'playing') {
      this.showToast('本关已经结束，请进入下一关或重试。');
      return;
    }
    if (this.creationCharges <= 0) {
      this.showToast('造物次数已经用完。');
      return;
    }
    const text = this.ui.input.value.trim();
    if (!text) {
      this.showToast('先写下你想创造的东西。');
      return;
    }

    this.ui.compileBtn.disabled = true;
    this.ui.compileBtn.textContent = '编译中...';
    try {
      const card = await compileCreation(text, this.getGameContext());
      this.activeCard = card;
      this.showCard(card);
      this.addLog(`造物编译完成：${card.name}。${card.source === 'ai' ? 'AI 已生成结构化卡牌。' : '使用本地兜底编译器。'}`, true);
      this.ui.aiMode.textContent = card.source === 'ai'
        ? '当前使用后端 AI 接口编译。'
        : '当前使用本地兜底编译器；配置 .env 后可切换为真实 AI。';
    } catch (error) {
      this.showToast(error.message || '造物编译失败。');
    } finally {
      this.ui.compileBtn.disabled = false;
      this.ui.compileBtn.textContent = '生成造物卡';
    }
  }

  insertInspiration() {
    const sample = INSPIRATIONS[Math.floor(Math.random() * INSPIRATIONS.length)];
    this.ui.input.value = sample;
    this.ui.input.focus();
  }

  showCard(card) {
    this.ui.cardPanel.classList.remove('hidden');
    this.ui.cardType.textContent = card.type;
    this.ui.cardName.textContent = card.name;
    this.ui.cardCost.textContent = card.cost;
    this.ui.cardDesc.textContent = card.description;
    this.ui.cardAbility.textContent = abilityLabel(card.ability);
    this.ui.cardRange.textContent = `范围 ${card.range}`;
    this.ui.cardDuration.textContent = `持续 ${card.duration}`;
    this.ui.cardSide.textContent = `副作用：${card.side_effect}`;
    this.ui.cardTags.innerHTML = card.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    this.ui.placeBtn.disabled = card.cost > this.miraclePoints || this.creationCharges <= 0;
  }

  startPlacement() {
    if (!this.activeCard) {
      this.showToast('请先生成造物卡。');
      return;
    }
    if (this.activeCard.cost > this.miraclePoints) {
      this.showToast('奇迹点不足，无法放置这个造物。');
      return;
    }
    this.placementMode = true;
    this.showToast('点击 3D 地图上的一个格子放置造物。');
  }

  onPointerDown(event) {
    if (!this.placementMode || !this.activeCard || this.gameState !== 'playing') return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.tileMeshes, false);
    if (!hits.length) return;
    const { x, y } = hits[0].object.userData;
    this.placeCreation(x, y);
  }

  placeCreation(x, y) {
    if (this.unitAt(x, y) && ['block', 'force_field'].includes(this.activeCard.ability)) {
      this.showToast('不能把屏障直接放在单位身上。');
      return;
    }
    const card = this.activeCard;
    this.creationCharges -= 1;
    this.miraclePoints -= card.cost;
    this.entropy += card.stabilityCost;
    const creation = {
      id: card.id,
      card,
      x,
      y,
      remaining: card.duration,
      restores: [],
      pulse: Math.random() * Math.PI * 2
    };
    this.creations.push(creation);
    this.placementMode = false;
    this.activeCard = null;
    this.ui.input.value = '';
    this.ui.cardPanel.classList.add('hidden');

    this.applyImmediatePlacement(creation);
    this.addLog(`你在 ${this.tileName(x, y)} 创造了「${card.name}」：${card.description}`, true);
    if (card.stabilityCost > 0) {
      this.addLog(`副作用触发：${card.side_effect} 世界裂隙 +${card.stabilityCost}。`);
    }

    // Environmental narrative for placement
    this.addEnvironmentalNarrative('placement', { card, x, y, terrain: this.getTerrain(x, y) });

    // Record creation in memory system
    this.memorySystem.recordCreation(card, this.level.id, this.turn, {
      x, y,
      remainingUnits: this.units.filter(u => u.status === 'active').length,
      currentEntropy: this.entropy
    });

    // Spawn particle effects
    const pos = this.tileToWorld(x, y);
    this.particleSystem.spawnAbilityParticles(pos.x, 0.5, pos.z, card.ability, card.range);
    this.particleSystem.spawnFloatingText(pos.x, 1.5, pos.z, card.name, this.particleSystem.getAbilityColor(card.ability));

    // Screen flash for high-cost creations
    if (card.cost >= 3) {
      this.screenEffects.flash('#' + this.particleSystem.getAbilityColor(card.ability).toString(16).padStart(6, '0'), 400);
    }

    this.checkEndCondition(false);
    this.renderWorld();
    this.updateUi();
  }

  applyImmediatePlacement(creation) {
    applyAbility(this, creation, 'immediate');
  }

  endTurn() {
    if (this.gameState !== 'playing') {
      this.showToast('本关已经结束。');
      return;
    }
    this.addLog(`第 ${this.turn} 回合开始结算。`, true);
    this.applyActiveCreationEffects();
    this.checkChainReactions();
    this.moveUnits();
    this.spreadHazards();
    this.triggerRandomEvent();
    this.applyTileHazardsToUnits();
    this.decrementCreationDurations();
    this.checkEndCondition(true);
    if (this.gameState === 'playing') {
      this.turn += 1;
      if (this.turn > this.level.maxTurns) {
        this.checkEndCondition(true, true);
      }
    }
    this.renderWorld();
    this.updateUi();
  }

  checkChainReactions() {
    const resonancePairs = [
      { a: 'illuminate', b: 'absorb_water', result: 'steam', text: '照明与吸水共鸣，产生蒸汽驱散更多迷雾' },
      { a: 'calm', b: 'memory_beacon', result: 'peace', text: '安抚与记忆共鸣，使者心中的疑虑消散' },
      { a: 'force_field', b: 'transform_land', result: 'sanctuary', text: '结界与地形改造共鸣，形成神圣庇护所' },
      { a: 'freeze_water', b: 'illuminate', result: 'prism', text: '冰与光共鸣，折射出指引道路的光棱' },
      { a: 'guide', b: 'reveal_path', result: 'clarity', text: '引导与显路共鸣，所有单位获得清晰视野' },
      { a: 'sun_blessing', b: 'cleanse', result: 'renewal', text: '日华与净化共鸣，大地焕发生机' }
    ];

    for (const pair of resonancePairs) {
      const creationA = this.creations.find(c => c.remaining > 0 && c.card.ability === pair.a);
      const creationB = this.creations.find(c => c.remaining > 0 && c.card.ability === pair.b);
      if (creationA && creationB && this.distance(creationA.x, creationA.y, creationB.x, creationB.y) <= 3) {
        this.applyResonanceEffect(pair.result, creationA, creationB);
        this.addLog(`共鸣！${pair.text}。`, true);
        // Spawn resonance particles
        const posA = this.tileToWorld(creationA.x, creationA.y);
        const posB = this.tileToWorld(creationB.x, creationB.y);
        this.particleSystem.spawnResonanceEffect(
          (posA.x + posB.x) / 2, 0.5, (posA.z + posB.z) / 2,
          this.particleSystem.getAbilityColor(creationA.card.ability)
        );
      }
    }
  }

  applyResonanceEffect(result, creationA, creationB) {
    const midX = Math.round((creationA.x + creationB.x) / 2);
    const midY = Math.round((creationA.y + creationB.y) / 2);

    switch (result) {
      case 'steam':
        for (const cell of this.tilesWithin(midX, midY, 2)) {
          if (this.getTerrain(cell.x, cell.y) === TILE.FOG) {
            this.setTerrain(cell.x, cell.y, TILE.LAND);
          }
        }
        break;
      case 'peace':
        if (this.isWarLevel()) {
          this.warMeter = Math.max(0, this.warMeter - 1);
        }
        for (const unit of this.units.filter(u => this.isMessenger(u))) {
          unit.guidedTurns = Math.max(unit.guidedTurns, 2);
        }
        break;
      case 'sanctuary':
        for (const cell of this.tilesWithin(midX, midY, 2)) {
          if (this.getTerrain(cell.x, cell.y) === TILE.LAND) {
            this.setTerrain(cell.x, cell.y, TILE.SACRED);
          }
        }
        break;
      case 'prism':
        for (const unit of this.units.filter(u => u.status === 'active')) {
          if (this.distance(unit.x, unit.y, midX, midY) <= 3) {
            unit.guidedTurns = Math.max(unit.guidedTurns, 2);
            unit.immuneChaos = true;
          }
        }
        break;
      case 'clarity':
        for (const unit of this.units.filter(u => u.status === 'active')) {
          unit.guidedTurns = Math.max(unit.guidedTurns, 3);
        }
        break;
      case 'renewal':
        for (const cell of this.tilesWithin(midX, midY, 2)) {
          const terrain = this.getTerrain(cell.x, cell.y);
          if ([TILE.DARK, TILE.FOG, TILE.POISON, TILE.SWAMP].includes(terrain)) {
            this.setTerrain(cell.x, cell.y, TILE.LAND);
          }
        }
        break;
    }
  }

  applyActiveCreationEffects() {
    for (const creation of this.creations) {
      if (creation.remaining <= 0) continue;
      applyAbility(this, creation, 'active');
    }
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
    let next = null;
    if (this.level.memoryChaos && !guided && Math.random() < 0.45) {
      next = this.randomPassableNeighbor(unit);
      if (next) this.addLog(`${unit.name} 被记忆瘟疫影响，偏离了道路。`);
    }
    if (!next) next = this.nextStepToward(unit, unit.goal);

    if (next) {
      unit.x = next.x;
      unit.y = next.y;
    }

    if (unit.guidedTurns > 0) unit.guidedTurns -= 1;

    if (this.isGoalReached(unit)) {
      this.rescueUnit(unit);
    }
  }

  moveMessenger(unit) {
    if (this.isGoalReached(unit)) {
      unit.met = true;
      return;
    }

    const terrain = this.getTerrain(unit.x, unit.y);
    const guided = unit.guidedTurns > 0 || this.nearActiveAbility(unit.x, unit.y, ['calm', 'guide', 'memory_beacon']);
    if ((terrain === TILE.FOG || terrain === TILE.DARK) && !guided) {
      this.warMeter = Math.min(this.level.hazard?.warLimit || 9, this.warMeter + 1);
      this.addLog(`${unit.name} 在迷雾中误判形势，战争值 +1。`);
      return;
    }

    const next = this.nextStepToward(unit, unit.goal);
    if (next) {
      unit.x = next.x;
      unit.y = next.y;
    }
    if (unit.guidedTurns > 0) unit.guidedTurns -= 1;
    if (this.isGoalReached(unit)) {
      unit.met = true;
      this.addLog(`${unit.name} 抵达边境会谈点。`, true);
    }
  }

  moveBeast(unit) {
    if (unit.stunned) {
      unit.stunned = false;
      unit.anger = Math.min(this.level.beastAngerLimit || 5, (unit.anger || 0) + 0);
      this.addLog(`${unit.name} 本回合被牵制，没有前进。`);
      return;
    }

    const next = this.nextStepToward(unit, unit.goal);
    if (!next) {
      unit.anger = Math.min(this.level.beastAngerLimit || 5, (unit.anger || 0) + 1);
      this.addLog(`${unit.name} 被完全堵住，怒气上升到 ${unit.anger}。`);
      return;
    }
    unit.x = next.x;
    unit.y = next.y;
    if (this.isGoalReached(unit)) {
      this.failLevel(`${unit.name} 抵达了城市，考核失败。`);
    }
  }

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

    // Environmental narrative for hazard spread
    if (type) {
      this.addEnvironmentalNarrative('hazard', { hazardType: type });
    }
  }

  // ========== 随机事件系统 ==========

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
        return; // 每回合最多触发一个事件
      }
    }
  }

  applyEvent(event) {
    switch (event.effect) {
      case 'floodSpread': {
        this.spreadTerrain(TILE.WATER, 1);
        this.addLog(`【随机事件】${event.name}！洪水额外扩散了 1 格`, true);
        break;
      }
      case 'terrainChange': {
        const x = Math.floor(Math.random() * 7);
        const y = Math.floor(Math.random() * 7);
        const terrains = [TILE.LAND, TILE.WATER, TILE.DARK, TILE.FOG];
        const newTerrain = terrains[Math.floor(Math.random() * terrains.length)];
        const oldTerrain = this.getTerrain(x, y);
        if (oldTerrain !== newTerrain && oldTerrain !== TILE.WALL && oldTerrain !== TILE.MOUNTAIN) {
          this.setTerrain(x, y, newTerrain);
          this.addLog(`【随机事件】${event.name}！${TERRAIN_LABELS[oldTerrain] || '未知'} 的地形发生了变化`, true);
        }
        break;
      }
      case 'guidance': {
        const civilians = this.units.filter(u => this.isCivilian(u) && u.status === 'active');
        if (civilians.length > 0) {
          const target = civilians[Math.floor(Math.random() * civilians.length)];
          target.guidedTurns = Math.max(target.guidedTurns, 2);
          this.addLog(`【随机事件】${event.name}！${target.name} 突然想起了正确的方向`, true);
        }
        break;
      }
      case 'beastStunned': {
        const beast = this.units.find(u => u.type === 'beast' && u.status === 'active');
        if (beast) {
          beast.stunned = true;
          this.addLog(`【随机事件】${event.name}！${beast.name} 突然停下脚步，似乎在犹豫什么`, true);
        }
        break;
      }
      case 'resonanceBoost': {
        const activeCreations = this.creations.filter(c => c.placed && c.remaining > 0);
        if (activeCreations.length >= 2) {
          const target = activeCreations[Math.floor(Math.random() * activeCreations.length)];
          target.remaining += 1;
          this.addLog(`【随机事件】${event.name}！「${target.card.name}」的持续时间意外延长了`, true);
        }
        break;
      }
      case 'entropyFluctuation': {
        const change = Math.random() < 0.5 ? -1 : 1;
        this.entropy = Math.max(0, this.entropy + change);
        this.addLog(`【随机事件】${event.name}！世界裂隙 ${change > 0 ? '增加' : '减少'}了 1`, true);
        break;
      }
      case 'hazardRedirect': {
        const x = Math.floor(Math.random() * 7);
        const y = Math.floor(Math.random() * 7);
        if (this.getTerrain(x, y) === TILE.LAND) {
          this.setTerrain(x, y, TILE.WATER);
          this.addLog(`【随机事件】${event.name}！洪水流向了 ${TERRAIN_LABELS[TILE.LAND]}`, true);
        }
        break;
      }
    }
  }

  spreadTerrain(sourceTerrain, amount) {
    const candidates = [];
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        if (this.getTerrain(x, y) !== sourceTerrain) continue;
        for (const nb of this.neighbors(x, y)) {
          const terrain = this.getTerrain(nb.x, nb.y);
          if (this.canHazardEnter(nb.x, nb.y, sourceTerrain, terrain)) {
            candidates.push({ ...nb, score: this.hazardScore(nb.x, nb.y, sourceTerrain) });
          }
        }
      }
    }
    const unique = uniqueCells(candidates).sort((a, b) => b.score - a.score);
    const picked = unique.slice(0, amount);
    for (const cell of picked) this.setTerrain(cell.x, cell.y, sourceTerrain);
    if (picked.length) {
      const label = sourceTerrain === TILE.WATER ? '洪水' : sourceTerrain === TILE.DARK ? '黑暗' : '迷雾';
      this.addLog(`${label} 扩散了 ${picked.length} 格。`);
    }
  }

  canHazardEnter(x, y, sourceTerrain, terrain) {
    if (this.isProtected(x, y)) return false;
    if ([TILE.HIGH, TILE.EXIT, TILE.CITY, TILE.MOUNTAIN, TILE.WALL, TILE.FIELD, TILE.SACRED].includes(terrain)) return false;
    if (terrain === sourceTerrain) return false;
    if (terrain === TILE.BRIDGE && sourceTerrain !== TILE.DARK) return false;
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
      creation.remaining > 0 && ['calm', 'memory_beacon'].includes(creation.card.ability) && this.getTerrain(creation.x, creation.y) === TILE.BORDER
    );
    if (allMet) {
      this.peaceTalks += 1;
      this.warMeter = Math.max(0, this.warMeter - 2);
      this.addLog('两名使者在边境交换证词，战争值下降。', true);
    } else if (calmNearBorder) {
      this.warMeter = Math.max(0, this.warMeter - 1);
      this.addLog('边境附近的和平造物压住了冲突。');
    } else {
      this.warMeter += 1;
      this.addLog(`误会继续发酵，战争值升至 ${this.warMeter}。`);
    }
  }

  applyTileHazardsToUnits() {
    for (const unit of this.units) {
      if (unit.status !== 'active') continue;
      const terrain = this.getTerrain(unit.x, unit.y);
      if (this.isCivilian(unit) && [TILE.WATER, TILE.DARK, TILE.POISON].includes(terrain)) {
        unit.status = 'lost';
        unit.lost = true;
        this.lost += 1;
        this.addLog(`${unit.name} 被${TERRAIN_LABELS[terrain]}吞没。`);

        // Environmental narrative for loss
        this.addEnvironmentalNarrative('loss', { levelId: this.level.id });

        // Spawn loss particle effect
        const pos = this.tileToWorld(unit.x, unit.y);
        this.particleSystem.spawnLossEffect(pos.x, 0.5, pos.z);
      }
    }
  }

  decrementCreationDurations() {
    for (const creation of this.creations) {
      if (creation.remaining <= 0) continue;
      creation.remaining -= 1;
      if (creation.remaining <= 0) {
        this.expireCreation(creation);
        this.addLog(`「${creation.card.name}」的持续时间结束。`);
      }
    }
    this.creations = this.creations.filter((creation) => creation.remaining > 0);
  }

  checkEndCondition(afterTurn, forcedEnd = false) {
    if (this.gameState !== 'playing') return;
    if (this.entropy > this.level.entropyLimit) {
      this.failLevel('世界裂隙超过承受极限，造物失控。');
      return;
    }

    const beast = this.units.find((unit) => unit.type === 'beast' && unit.status === 'active');
    if (beast && this.level.beastAngerLimit && (beast.anger || 0) >= this.level.beastAngerLimit) {
      this.failLevel(`${beast.name} 的怒气达到上限，城市陷入灾厄。`);
      return;
    }

    if (this.isWarLevel() && this.level.hazard?.warLimit && this.warMeter >= this.level.hazard.warLimit) {
      this.failLevel('战争值达到上限，边境爆发冲突。');
      return;
    }

    if (this.level.win === 'requiredRescue' && this.rescued >= this.level.requiredRescue) {
      this.winLevel(`你救下了 ${this.rescued} 名居民，完成考核。`);
      return;
    }

    if (this.level.win === 'peace') {
      const messengers = this.units.filter((unit) => this.isMessenger(unit));
      const allMet = messengers.length > 0 && messengers.every((unit) => this.isGoalReached(unit));
      if (allMet && this.warMeter < 5) {
        this.winLevel('使者完成会谈，战争被阻止。');
        return;
      }
    }

    if (this.level.win === 'survive' && (forcedEnd || (afterTurn && this.turn >= this.level.maxTurns))) {
      this.winLevel('城市仍然完整，巨兽没有被杀死，考核通过。');
      return;
    }

    if (this.level.win === 'final') {
      const citySafe = !beast || !this.isGoalReached(beast);
      if ((forcedEnd || (afterTurn && this.turn >= this.level.maxTurns)) && this.rescued >= this.level.requiredRescue && this.warMeter < 6 && citySafe) {
        this.winLevel('第七天到来时，世界仍然站立。终考通过。');
        return;
      }
    }

    if (afterTurn && (forcedEnd || this.turn >= this.level.maxTurns)) {
      this.failLevel('回合耗尽，目标没有达成。');
    }
  }

  winLevel(message) {
    if (this.gameState !== 'playing') return;
    this.gameState = 'won';
    this.addLog(`通过：${message}`, true);
    const isFinal = this.levelIndex === LEVELS.length - 1;

    // Record level completion in memory
    this.memorySystem.recordLevelCompletion(this.level.id, 'won', {
      turns: this.turn,
      maxTurns: this.level.maxTurns,
      rescued: this.rescued,
      lost: this.lost,
      entropy: this.entropy
    });

    // Screen effects for victory
    this.screenEffects.flash('#9dffb3', 500);
    if (isFinal) {
      // Generate epic ending for final level
      const epicEnding = this.memorySystem.generateEpicEnding();
      message += `\n\n${epicEnding.text}`;
    }

    this.ui.nextBtn.classList.toggle('hidden', isFinal);
    this.showModal('考核通过', message + (isFinal ? ' 你完成了完整原型的全部关卡。' : ' 可以进入下一关。'), '继续', '重试');
  }

  failLevel(message) {
    if (this.gameState !== 'playing') return;
    this.gameState = 'lost';
    this.addLog(`失败：${message}`, true);

    // Record level completion in memory
    this.memorySystem.recordLevelCompletion(this.level.id, 'lost', {
      turns: this.turn,
      maxTurns: this.level.maxTurns,
      rescued: this.rescued,
      lost: this.lost,
      entropy: this.entropy
    });

    // Screen shake for failure
    this.screenEffects.shake(8, 500);
    this.screenEffects.vignette('rgba(255, 0, 50, 0.3)', 1000);

    this.showModal('考核失败', message, '重试', '重试');
  }

  showModal(title, text, primary, secondary) {
    this.ui.modalTitle.textContent = title;
    this.ui.modalText.textContent = text;
    this.ui.modalPrimary.textContent = primary;
    this.ui.modalSecondary.textContent = secondary;
    this.ui.modal.classList.remove('hidden');
  }

  nextLevel() {
    if (this.levelIndex >= LEVELS.length - 1) {
      this.showToast('已经完成所有关卡。');
      return;
    }
    this.loadLevel(this.levelIndex + 1);
  }

  renderWorld() {
    // Incremental terrain update - only rebuild changed tiles
    const activeTileKeys = new Set();
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const terrain = this.getTerrain(x, y);
        const key = `${x},${y}`;
        activeTileKeys.add(key);
        const existing = this.tileMeshPool.get(key);
        if (existing && existing.userData.terrain === terrain) {
          // Terrain unchanged, skip
          continue;
        }
        // Remove old tile if exists
        if (existing) {
          this.worldGroup.remove(existing);
          if (existing.marker) this.worldGroup.remove(existing.marker);
        }
        // Create new tile
        const mesh = this.createTileMesh(terrain, x, y);
        this.worldGroup.add(mesh);
        this.tileMeshPool.set(key, mesh);
        const marker = this.createTerrainMarker(terrain, x, y);
        if (marker) {
          this.worldGroup.add(marker);
          mesh.marker = marker;
        }
      }
    }
    // Remove tiles that no longer exist (shouldn't happen in normal gameplay)
    for (const [key, mesh] of this.tileMeshPool) {
      if (!activeTileKeys.has(key)) {
        this.worldGroup.remove(mesh);
        if (mesh.marker) this.worldGroup.remove(mesh.marker);
        this.tileMeshPool.delete(key);
      }
    }

    // Update creations - rebuild only if changed
    const activeCreationIds = new Set();
    for (const creation of this.creations) {
      activeCreationIds.add(creation.id);
      const existing = this.creationMeshPool.get(creation.id);
      if (existing) {
        // Update position and rotation only
        const pos = this.tileToWorld(creation.x, creation.y);
        existing.position.set(pos.x, 0.45, pos.z);
        const core = existing.children.find(c => c.geometry?.type === 'IcosahedronGeometry');
        if (core) core.rotation.y = creation.remaining * 0.5;
        continue;
      }
      const mesh = this.createCreationMesh(creation);
      this.worldGroup.add(mesh);
      this.creationMeshPool.set(creation.id, mesh);
    }
    // Remove expired creations
    for (const [id, mesh] of this.creationMeshPool) {
      if (!activeCreationIds.has(id)) {
        this.worldGroup.remove(mesh);
        this.creationMeshPool.delete(id);
      }
    }

    // Update units - position only for existing, rebuild for new/changed status
    const activeUnitIds = new Set();
    for (const unit of this.units) {
      activeUnitIds.add(unit.id);
      if (unit.status === 'active') {
        const existing = this.unitMeshPool.get(unit.id);
        if (existing && existing.userData.unitStatus === unit.status) {
          // Only update position
          const pos = this.tileToWorld(unit.x, unit.y);
          existing.position.set(pos.x, 0.36, pos.z);
          // Update guided halo
          const hasHalo = existing.children.some(c => c.geometry?.type === 'TorusGeometry');
          if (unit.guidedTurns > 0 && !hasHalo) {
            existing.add(this.createHalo(0x9dffb3));
          } else if (unit.guidedTurns <= 0 && hasHalo) {
            const haloIndex = existing.children.findIndex(c => c.geometry?.type === 'TorusGeometry');
            if (haloIndex >= 0) existing.children.splice(haloIndex, 1);
          }
          continue;
        }
        // Remove old if status changed
        if (existing) {
          this.worldGroup.remove(existing);
          this.unitMeshPool.delete(unit.id);
        }
        const mesh = this.createUnitMesh(unit);
        this.worldGroup.add(mesh);
        this.unitMeshPool.set(unit.id, mesh);
      } else if (unit.status === 'rescued') {
        const existing = this.rescuedMarkerPool.get(unit.id);
        if (!existing) {
          const marker = this.createRescuedMarker(unit);
          this.worldGroup.add(marker);
          this.rescuedMarkerPool.set(unit.id, marker);
        }
      }
    }
    // Remove inactive units
    for (const [id, mesh] of this.unitMeshPool) {
      if (!activeUnitIds.has(id)) {
        this.worldGroup.remove(mesh);
        this.unitMeshPool.delete(id);
      }
    }
    // Remove rescued markers for non-rescued units
    for (const [id, marker] of this.rescuedMarkerPool) {
      const unit = this.units.find(u => u.id === id);
      if (!unit || unit.status !== 'rescued') {
        this.worldGroup.remove(marker);
        this.rescuedMarkerPool.delete(id);
      }
    }

    // Update path lines for active units
    this.updatePathLines();
  }

  updatePathLines() {
    // Clean up old path lines
    if (this.pathLineGroup) {
      this.worldGroup.remove(this.pathLineGroup);
      this.pathLineGroup = null;
    }

    // Only show paths when Shift is held or a unit is hovered
    if (!this.showPaths) return;

    this.pathLineGroup = new THREE.Group();
    for (const unit of this.units) {
      if (unit.status !== 'active') continue;
      const path = this.calculateFullPath(unit);
      if (!path || path.length < 2) continue;

      const points = path.map(p => {
        const pos = this.tileToWorld(p.x, p.y);
        return new THREE.Vector3(pos.x, 0.5, pos.z);
      });

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const color = unit.type === 'beast' ? 0xff6b6b : unit.type === 'tribeA' || unit.type === 'tribeB' ? 0xc792ea : 0x9dffb3;
      const material = new THREE.LineDashedMaterial({
        color,
        dashSize: 0.3,
        gapSize: 0.2,
        transparent: true,
        opacity: 0.6
      });
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      this.pathLineGroup.add(line);
    }

    if (this.pathLineGroup.children.length > 0) {
      this.worldGroup.add(this.pathLineGroup);
    }
  }

  createTileMesh(terrain, x, y) {
    const height = terrain === TILE.HIGH ? 0.46 : terrain === TILE.MOUNTAIN ? 0.72 : terrain === TILE.WATER ? 0.08 : 0.18;
    const geometry = this.getCachedGeometry(`tile-${height}`, () => new THREE.BoxGeometry(TILE_SIZE * 0.94, height, TILE_SIZE * 0.94));
    const material = this.getTerrainMaterial(terrain);
    const mesh = new THREE.Mesh(geometry, material);
    const pos = this.tileToWorld(x, y);
    mesh.position.set(pos.x, height / 2, pos.z);
    mesh.receiveShadow = true;
    mesh.castShadow = terrain !== TILE.WATER;
    mesh.userData = { x, y, terrain, tile: true };
    return mesh;
  }

  getCachedGeometry(key, factory) {
    if (!this.geometryCache.has(key)) {
      this.geometryCache.set(key, factory());
    }
    return this.geometryCache.get(key);
  }

  createLabel(text) {
    const cached = this.labelCache.get(text);
    if (cached) return cached.clone();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    ctx.fillStyle = 'rgba(5, 9, 20, 0.72)';
    roundRect(ctx, 8, 10, 240, 44, 18);
    ctx.fill();
    ctx.font = 'bold 24px Microsoft YaHei, sans-serif';
    ctx.fillStyle = '#f4f7ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, 10), 128, 32);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.2, 0.3, 1);
    this.labelCache.set(text, sprite);
    return sprite.clone();
  }

  createTerrainMarker(terrain, x, y) {
    const pos = this.tileToWorld(x, y);
    if (terrain === TILE.VILLAGE) {
      const group = new THREE.Group();
      const house = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.46), this.material(0xa06f42));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.32, 4), this.material(0x4d263e));
      roof.position.y = 0.34;
      roof.rotation.y = Math.PI / 4;
      house.castShadow = true;
      roof.castShadow = true;
      group.add(house, roof);
      group.position.set(pos.x, 0.24, pos.z);
      return group;
    }
    if (terrain === TILE.CITY) {
      const group = new THREE.Group();
      for (let i = 0; i < 3; i += 1) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.45 + i * 0.12, 0.26), this.material(0xc8c4dc));
        tower.position.set((i - 1) * 0.28, 0.23 + i * 0.06, 0);
        tower.castShadow = true;
        group.add(tower);
      }
      group.position.set(pos.x, 0.22, pos.z);
      return group;
    }
    if (terrain === TILE.SACRED) {
      const group = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.55, 8), this.material(0x6f4c32));
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 1), this.material(0x4ee89c, { emissive: 0x123d2d }));
      crown.position.y = 0.52;
      group.add(trunk, crown);
      group.position.set(pos.x, 0.28, pos.z);
      return group;
    }
    if (terrain === TILE.EXIT || terrain === TILE.HIGH) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 24), this.material(terrain === TILE.EXIT ? 0x67e8ff : 0xffdb82, { emissive: terrain === TILE.EXIT ? 0x0b3a48 : 0x402c0a }));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(pos.x, 0.32, pos.z);
      return ring;
    }
    if (terrain === TILE.DARK || terrain === TILE.FOG) {
      const radius = terrain === TILE.DARK ? 0.58 : 0.5;
      const haze = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 12, 8),
        new THREE.MeshStandardMaterial({ color: terrain === TILE.DARK ? 0x0b0d19 : 0xb8c2d6, transparent: true, opacity: terrain === TILE.DARK ? 0.45 : 0.28, roughness: 1 })
      );
      haze.position.set(pos.x, 0.5, pos.z);
      return haze;
    }
    return null;
  }

  createUnitMesh(unit) {
    const group = new THREE.Group();
    const pos = this.tileToWorld(unit.x, unit.y);
    group.position.set(pos.x, 0.36, pos.z);

    if (this.isCivilian(unit)) {
      const bodyColor = unit.type === 'miner' ? 0xf0c15c : 0x77d7ff;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.42, 10), this.material(bodyColor));
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), this.material(0xffd6ad));
      head.position.y = 0.32;
      body.castShadow = true;
      head.castShadow = true;
      group.add(body, head);
      if (unit.guidedTurns > 0) group.add(this.createHalo(0x9dffb3));
    } else if (this.isMessenger(unit)) {
      const color = unit.type === 'tribeA' ? 0xff8f70 : 0x7aa2ff;
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 4), this.material(color));
      body.castShadow = true;
      body.rotation.y = Math.PI / 4;
      group.add(body);
      if (unit.met) group.add(this.createHalo(0xd4a6ff));
    } else if (unit.type === 'beast') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.48, 0.48), this.material(0x3d8caa));
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), this.material(0x6bd3ff));
      const hornA = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 8), this.material(0xf3f7ff));
      const hornB = hornA.clone();
      head.position.set(0.45, 0.12, 0);
      hornA.position.set(0.54, 0.34, -0.12);
      hornB.position.set(0.54, 0.34, 0.12);
      hornA.rotation.z = -Math.PI / 6;
      hornB.rotation.z = -Math.PI / 6;
      body.castShadow = true;
      head.castShadow = true;
      group.add(body, head, hornA, hornB);
      if (unit.stunned) group.add(this.createHalo(0xfff39a, 0.54));
    }

    const labelSprite = this.createLabel(unit.name);
    labelSprite.position.y = unit.type === 'beast' ? 0.88 : 0.7;
    group.add(labelSprite);
    return group;
  }

  createCreationMesh(creation) {
    const { card, x, y, remaining } = creation;
    const group = new THREE.Group();
    const pos = this.tileToWorld(x, y);
    group.position.set(pos.x, 0.45, pos.z);

    const color = ABILITY_COLORS[card.ability] || 0xffffff;
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.25, 1),
      this.material(color, { emissive: color, emissiveIntensity: 0.18, roughness: 0.45 })
    );
    core.castShadow = true;
    core.rotation.y = remaining * 0.5;
    group.add(core);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.38 + card.range * 0.08, 0.025, 8, 32),
      this.material(color, { transparent: true, opacity: 0.72, emissive: color, emissiveIntensity: 0.25 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    group.add(ring);

    const timer = this.createLabel(`${card.name} · ${remaining}`);
    timer.position.y = 0.62;
    group.add(timer);
    return group;
  }

  createRescuedMarker(unit) {
    const group = new THREE.Group();
    const goal = unit.goal || { x: unit.x, y: unit.y };
    const pos = this.tileToWorld(goal.x, goal.y);
    group.position.set(pos.x, 0.72, pos.z);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), this.material(0x9dffb3, { emissive: 0x114426 }));
    group.add(star);
    return group;
  }

  createHalo(color, radius = 0.32) {
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.018, 8, 24),
      this.material(color, { transparent: true, opacity: 0.72, emissive: color, emissiveIntensity: 0.22 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.5;
    return halo;
  }

  createLabel(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    ctx.fillStyle = 'rgba(5, 9, 20, 0.72)';
    roundRect(ctx, 8, 10, 240, 44, 18);
    ctx.fill();
    ctx.font = 'bold 24px Microsoft YaHei, sans-serif';
    ctx.fillStyle = '#f4f7ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, 10), 128, 32);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.2, 0.3, 1);
    return sprite;
  }

  updateUi() {
    this.ui.levelChip.textContent = `第 ${this.levelIndex + 1} / ${LEVELS.length} 关`;
    this.ui.title.textContent = this.level.title;
    this.ui.story.textContent = this.level.story;
    this.ui.objective.textContent = this.level.objective;
    this.ui.turn.textContent = `${Math.min(this.turn, this.level.maxTurns)} / ${this.level.maxTurns}`;
    this.ui.charges.textContent = `${this.creationCharges}`;
    this.ui.miracle.textContent = `${this.miraclePoints}`;
    this.ui.entropy.textContent = `${this.entropy} / ${this.level.entropyLimit}`;
    this.ui.endTurnBtn.disabled = this.gameState !== 'playing';
    this.ui.compileBtn.disabled = this.gameState !== 'playing';
    this.ui.placeBtn.disabled = !this.activeCard || this.activeCard.cost > this.miraclePoints || this.creationCharges <= 0 || this.gameState !== 'playing';

    // Dynamic stat urgency classes
    const entropyStat = this.ui.entropy.closest('.stat');
    if (entropyStat) {
      entropyStat.classList.remove('urgent', 'warning');
      if (this.entropy >= this.level.entropyLimit) {
        entropyStat.classList.add('urgent');
      } else if (this.entropy >= this.level.entropyLimit * 0.7) {
        entropyStat.classList.add('warning');
      }
    }

    const turnStat = this.ui.turn.closest('.stat');
    if (turnStat) {
      turnStat.classList.remove('urgent', 'warning');
      const turnRatio = this.turn / this.level.maxTurns;
      if (turnRatio >= 0.9) {
        turnStat.classList.add('urgent');
      } else if (turnRatio >= 0.7) {
        turnStat.classList.add('warning');
      }
    }

    this.updateSpecialMeters();
    this.updateUnitList();
    this.updateLogs();
  }

  updateSpecialMeters() {
    const meters = [];
    if (this.level.requiredRescue) {
      meters.push({ label: '已救援', value: this.rescued, max: this.level.requiredRescue, text: `${this.rescued} / ${this.level.requiredRescue}`, type: 'rescue' });
    }
    if (this.isWarLevel()) {
      meters.push({ label: '战争值', value: this.warMeter, max: this.level.hazard?.warLimit || 9, text: `${this.warMeter} / ${this.level.hazard?.warLimit || 9}`, type: 'war' });
    }
    const beast = this.units.find((unit) => unit.type === 'beast' && unit.status === 'active');
    if (beast) {
      meters.push({ label: `${beast.name} 怒气`, value: beast.anger || 0, max: this.level.beastAngerLimit || 5, text: `${beast.anger || 0} / ${this.level.beastAngerLimit || 5}`, type: 'anger' });
    }

    this.ui.specialMeters.innerHTML = meters.map((meter) => {
      const pct = Math.max(0, Math.min(100, (meter.value / meter.max) * 100));
      let fillClass = '';
      if (pct >= 80) fillClass = 'danger';
      else if (pct >= 50) fillClass = 'warning';
      return `<div class="meter"><div class="meter-label">${escapeHtml(meter.label)}：${escapeHtml(meter.text)}</div><div class="meter-bar"><div class="meter-fill ${fillClass}" style="width:${pct}%"></div></div></div>`;
    }).join('');
  }

  updateUnitList() {
    this.ui.unitList.innerHTML = this.units.map((unit) => {
      let status = '行动中';
      let cls = '';
      if (unit.status === 'rescued') {
        status = '已抵达';
        cls = 'unit-ok';
      }
      if (unit.status === 'lost') {
        status = '迷失/受困';
        cls = 'unit-bad';
      }
      if (unit.type === 'beast' && unit.status === 'active') status = `怒气 ${unit.anger || 0}`;
      if (this.isMessenger(unit) && unit.status === 'active') status = this.isGoalReached(unit) ? '已会合' : '前往边境';
      return `<div class="unit-row"><strong>${escapeHtml(unit.name)}</strong><span class="${cls}">${escapeHtml(status)}</span></div>`;
    }).join('');
  }

  updateLogs() {
    this.ui.logList.innerHTML = this.logs.map((entry) => {
      let cls = 'log-item';
      if (entry.important) cls += ' important';
      if (entry.text.includes('共鸣')) cls += ' resonance';
      return `<div class="${cls}">${entry.important ? '<strong>✦</strong> ' : ''}${escapeHtml(entry.text)}</div>`;
    }).join('');
  }

  addLog(text, important = false) {
    this.logs.unshift({ text, important });
    this.logs = this.logs.slice(0, MAX_LOGS);
    if (this.ui?.logList) this.updateLogs();
  }

  showToast(text) {
    this.ui.toast.textContent = text;
    this.ui.toast.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.ui.toast.classList.add('hidden'), 2400);
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
      warMeter: this.warMeter,
      activeTerrains: this.countTerrains()
    };
  }

  countTerrains() {
    const counts = {};
    for (const row of this.terrain) {
      for (const tile of row) counts[tile] = (counts[tile] || 0) + 1;
    }
    return counts;
  }

  material(color, options = {}) {
    const key = JSON.stringify({ color, ...options });
    if (this.materials.has(key)) return this.materials.get(key);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.08, ...options });
    this.materials.set(key, material);
    return material;
  }

  getTerrainMaterial(terrain) {
    const color = MATERIAL_COLORS[terrain] || MATERIAL_COLORS[TILE.LAND];
    if (terrain === TILE.WATER) return this.material(color, { transparent: true, opacity: 0.74, roughness: 0.25, metalness: 0.08 });
    if (terrain === TILE.DARK) return this.material(color, { roughness: 1, emissive: 0x02030a });
    if (terrain === TILE.FOG) return this.material(color, { transparent: true, opacity: 0.72, roughness: 1 });
    if (terrain === TILE.FIELD) return this.material(color, { transparent: true, opacity: 0.52, emissive: 0x0d4c5a, emissiveIntensity: 0.2 });
    if (terrain === TILE.EXIT || terrain === TILE.SACRED) return this.material(color, { emissive: color, emissiveIntensity: 0.12 });
    return this.material(color);
  }

  tileToWorld(x, y) {
    return {
      x: (x - (BOARD_SIZE - 1) / 2) * TILE_SIZE,
      z: (y - (BOARD_SIZE - 1) / 2) * TILE_SIZE
    };
  }

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
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
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

  rescueUnit(unit) {
    unit.status = 'rescued';
    unit.rescued = true;
    this.rescued += 1;
    this.addLog(`${unit.name} 抵达安全点。`, true);

    // Environmental narrative for rescue
    this.addEnvironmentalNarrative('rescue', { unit, levelId: this.level.id });

    // Spawn rescue particle effect
    const pos = this.tileToWorld(unit.x, unit.y);
    this.particleSystem.spawnRescueEffect(pos.x, 0.5, pos.z);
  }

  addEnvironmentalNarrative(eventType, context) {
    // Try AI narrative first, fallback to local
    this.fetchNarrative(eventType, context).then((text) => {
      if (text) this.addLog(text, false);
    }).catch(() => {
      // Fallback to local hardcoded narratives
      this.addLocalNarrative(eventType, context);
    });
  }

  async fetchNarrative(type, context) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NARRATIVE_TIMEOUT);

      const response = await fetch(NARRATIVE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          context,
          worldState: {
            currentLevel: this.level?.id || 'unknown',
            rescued: this.rescued || 0,
            lost: this.lost || 0,
            entropy: this.entropy || 0,
            entropyLimit: this.level?.entropyLimit || 7,
            creations: this.creations?.map((c) => c.card?.name).filter(Boolean) || [],
            playStyle: this.memorySystem?.getProfileSummary?.() || '未知'
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) return null;
      const data = await response.json();
      return data?.text || null;
    } catch (_error) {
      return null;
    }
  }

  addLocalNarrative(eventType, context) {
    const narratives = {
      placement: {
        absorb_water: '水面上泛起涟漪，仿佛大地在深呼吸。',
        create_bridge: '一道光芒连接了两岸，断裂的世界重新找到了通路。',
        illuminate: '光芒刺破黑暗，连空气都变得清澈起来。',
        block: '屏障升起的那一刻，周围的风都静止了。',
        calm: '一种难以言喻的宁静蔓延开来，连巨兽的呼吸都变得缓慢。',
        guide: '微风中传来低语，为迷失者指引方向。',
        cleanse: '污浊被净化，大地仿佛松了一口气。',
        slow_beast: '时间在这一刻变慢，巨兽的步伐变得沉重。',
        memory_beacon: '记忆的光芒亮起，遗忘的名字重新被想起。',
        force_field: '结界展开时，空间本身都发出了轻微的共鸣。',
        transform_land: '大地在你的意志下改变形态，仿佛在做一个漫长的梦。',
        freeze_water: '冰霜蔓延，水面凝固成镜，倒映着天空。',
        raise_earth: '地面隆隆作响，新的高地从大地深处升起。',
        grow_forest: '种子在瞬间发芽，树木以肉眼可见的速度生长。',
        dig_channel: '水流找到了新的方向，大地被重新雕刻。',
        trap: '藤蔓悄然生长，编织出等待的网。',
        dream_link: '两个梦境开始交织，现实与幻象的边界变得模糊。',
        time_dilation: '周围的一切都变得缓慢，唯有你的心跳如常。',
        reveal_path: '隐藏的道路显现，仿佛世界揭开了面纱。',
        sun_blessing: '阳光穿透云层，温暖如母亲的怀抱。'
      },
      rescue: {
        'flood-village': '终于，洪水无法触及的高地上，一个新的故事开始了。',
        'night-mine': '矿工走出黑暗时，第一缕阳光照在了脸上。',
        'giant-city': '城市依然完整，巨兽的背上承载着整条河流的未来。',
        'wordless-war': '使者的脚步跨越了边境，语言的桥梁正在重建。',
        'memory-plague': '圣树的光芒下，遗忘的名字重新被唤醒。',
        'final-exam': '在世界的尽头，希望依然站立。'
      },
      loss: {
        'flood-village': '洪水吞没了一切，只留下水面上的涟漪。',
        'night-mine': '黑暗永远记住那些迷失其中的灵魂。',
        'giant-city': '巨兽的脚步无法阻挡，城市在颤抖。',
        'wordless-war': '误会继续发酵，和平的曙光尚未到来。',
        'memory-plague': '又一个名字被迷雾抹去，圣树在无声地哭泣。',
        'final-exam': '世界裂隙扩大，造物者的力量在衰退。'
      },
      hazard: {
        flood: '水位在上涨，大地逐渐被淹没。',
        darkness: '黑暗像活物一样蔓延，吞噬着每一丝光芒。',
        fog: '迷雾从深处涌来，模糊了边界与记忆。',
        war: '边境的紧张气氛越来越浓，战争的阴影在逼近。',
        beast: '巨兽的呼吸变得沉重，大地随之震颤。',
        mixed: '多重灾难同时降临，世界在考验你的极限。'
      }
    };

    let text = null;
    if (eventType === 'placement' && context.card) {
      text = narratives.placement[context.card.ability];
    } else if (eventType === 'rescue' && context.levelId) {
      text = narratives.rescue[context.levelId];
    } else if (eventType === 'loss' && context.levelId) {
      text = narratives.loss[context.levelId];
    } else if (eventType === 'hazard' && context.hazardType) {
      text = narratives.hazard[context.hazardType];
    }

    if (text) {
      this.addLog(text, false);
    }
  }

  nextStepToward(unit, goal) {
    if (!goal) return null;
    const startKey = `${unit.x},${unit.y}`;
    const goalKey = `${goal.x},${goal.y}`;
    if (startKey === goalKey) return null;

    // A* algorithm with terrain cost
    const openSet = [{ x: unit.x, y: unit.y, g: 0, f: this.distance(unit.x, unit.y, goal.x, goal.y) }];
    const closedSet = new Set([startKey]);
    const cameFrom = new Map([[startKey, null]]);
    const gScore = new Map([[startKey, 0]]);

    while (openSet.length) {
      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      const currentKey = `${current.x},${current.y}`;

      if (currentKey === goalKey) break;

      for (const nb of this.neighbors(current.x, current.y)) {
        const key = `${nb.x},${nb.y}`;
        if (closedSet.has(key)) continue;
        if (!this.isPassable(nb.x, nb.y, unit)) continue;

        const terrain = this.getTerrain(nb.x, nb.y);
        let moveCost = 1;
        if (terrain === TILE.FOREST) moveCost = 2;
        else if (terrain === TILE.HIGH) moveCost = 1.5;
        else if (terrain === TILE.BRIDGE) moveCost = 1.2;

        const tentativeG = current.g + moveCost;
        const existingG = gScore.get(key);

        if (existingG === undefined || tentativeG < existingG) {
          cameFrom.set(key, { x: current.x, y: current.y });
          gScore.set(key, tentativeG);
          const f = tentativeG + this.distance(nb.x, nb.y, goal.x, goal.y);
          if (existingG === undefined) {
            openSet.push({ x: nb.x, y: nb.y, g: tentativeG, f });
          } else {
            const node = openSet.find((n) => `${n.x},${n.y}` === key);
            if (node) { node.g = tentativeG; node.f = f; }
          }
          closedSet.add(key);
        }
      }
    }

    if (!cameFrom.has(goalKey)) return null;

    // Reconstruct path
    let current = goal;
    let previous = cameFrom.get(goalKey);
    while (previous && !(previous.x === unit.x && previous.y === unit.y)) {
      current = previous;
      previous = cameFrom.get(`${current.x},${current.y}`);
    }
    return current.x === unit.x && current.y === unit.y ? null : current;
  }

  // Calculate full path for visualization
  calculateFullPath(unit) {
    if (!unit.goal || unit.status !== 'active') return null;
    const path = [];
    const startKey = `${unit.x},${unit.y}`;
    const goalKey = `${unit.goal.x},${unit.goal.y}`;
    if (startKey === goalKey) return null;

    // Use A* to get full path
    const openSet = [{ x: unit.x, y: unit.y, g: 0, f: this.distance(unit.x, unit.y, unit.goal.x, unit.goal.y) }];
    const closedSet = new Set([startKey]);
    const cameFrom = new Map([[startKey, null]]);
    const gScore = new Map([[startKey, 0]]);

    while (openSet.length) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      const currentKey = `${current.x},${current.y}`;
      if (currentKey === goalKey) break;

      for (const nb of this.neighbors(current.x, current.y)) {
        const key = `${nb.x},${nb.y}`;
        if (closedSet.has(key)) continue;
        if (!this.isPassable(nb.x, nb.y, unit)) continue;

        const terrain = this.getTerrain(nb.x, nb.y);
        let moveCost = 1;
        if (terrain === TILE.FOREST) moveCost = 2;
        else if (terrain === TILE.HIGH) moveCost = 1.5;
        else if (terrain === TILE.BRIDGE) moveCost = 1.2;

        const tentativeG = current.g + moveCost;
        const existingG = gScore.get(key);

        if (existingG === undefined || tentativeG < existingG) {
          cameFrom.set(key, { x: current.x, y: current.y });
          gScore.set(key, tentativeG);
          const f = tentativeG + this.distance(nb.x, nb.y, unit.goal.x, unit.goal.y);
          if (existingG === undefined) {
            openSet.push({ x: nb.x, y: nb.y, g: tentativeG, f });
          } else {
            const node = openSet.find((n) => `${n.x},${n.y}` === key);
            if (node) { node.g = tentativeG; node.f = f; }
          }
          closedSet.add(key);
        }
      }
    }

    if (!cameFrom.has(goalKey)) return null;

    // Reconstruct full path
    let current = { x: unit.goal.x, y: unit.goal.y };
    while (current) {
      path.unshift(current);
      const prev = cameFrom.get(`${current.x},${current.y}`);
      if (prev && prev.x === unit.x && prev.y === unit.y) break;
      current = prev;
    }
    return path.length > 1 ? path : null;
  }

  randomPassableNeighbor(unit) {
    const options = this.neighbors(unit.x, unit.y).filter((cell) => this.isPassable(cell.x, cell.y, unit));
    if (!options.length) return null;
    return options[Math.floor(Math.random() * options.length)];
  }

  isPassable(x, y, unit) {
    const terrain = this.getTerrain(x, y);
    if (terrain === TILE.MOUNTAIN || terrain === TILE.WALL) return false;
    if (unit.type === 'beast') {
      return ![TILE.WATER, TILE.FIELD].includes(terrain);
    }
    if (this.isMessenger(unit)) {
      return ![TILE.WATER, TILE.MOUNTAIN, TILE.WALL, TILE.DARK, TILE.POISON].includes(terrain);
    }
    return ![TILE.WATER, TILE.MOUNTAIN, TILE.WALL, TILE.DARK, TILE.POISON].includes(terrain);
  }

  isProtected(x, y) {
    return this.creations.some((creation) => {
      if (creation.remaining <= 0) return false;
      if (creation.card.ability === 'force_field' && this.distance(x, y, creation.x, creation.y) <= creation.card.range) return true;
      if (creation.card.ability === 'absorb_water' && this.distance(x, y, creation.x, creation.y) <= 1) return true;
      return false;
    });
  }

  nearActiveAbility(x, y, abilities) {
    return this.creations.some((creation) => creation.remaining > 0 && abilities.includes(creation.card.ability) && this.distance(x, y, creation.x, creation.y) <= creation.card.range + 1);
  }

  animate(now) {
    requestAnimationFrame((t) => this.animate(t));
    const deltaTime = Math.min((now - this.lastFrameTime) / 1000 || 0.016, 0.1); // Limit max delta
    this.lastFrameTime = now;
    const t = performance.now() / 1000;

    for (const child of this.worldGroup.children) {
      if (child.type === 'Group' && child.children.length > 0) {
        const hasCore = child.children.some((item) => item.geometry?.type === 'IcosahedronGeometry');
        if (hasCore) child.rotation.y = Math.sin(t * 0.8) * 0.08;
      }
    }

    // Update particle system
    if (this.particleSystem) {
      this.particleSystem.update(deltaTime);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

function uniqueCells(cells) {
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

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.addEventListener('DOMContentLoaded', () => {
  new CreatorExam3D();
});
