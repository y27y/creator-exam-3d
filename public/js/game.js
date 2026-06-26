import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { compileCreation, abilityLabel } from './aiClient.js';
import { cloneLevel, INSPIRATIONS, LEVELS, SYMBOL_TO_TILE, TILE } from './levels.js';

const TILE_SIZE = 1.55;
const BOARD_SIZE = 7;
const MAX_LOGS = 18;

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

    this.checkEndCondition(false);
    this.renderWorld();
    this.updateUi();
  }

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
      if (changed) this.addLog(`「${card.name}」改造了 ${changed} 处危险地形。`);
    }
  }

  endTurn() {
    if (this.gameState !== 'playing') {
      this.showToast('本关已经结束。');
      return;
    }
    this.addLog(`第 ${this.turn} 回合开始结算。`, true);
    this.applyActiveCreationEffects();
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
    this.renderWorld();
    this.updateUi();
  }

  applyActiveCreationEffects() {
    for (const creation of this.creations) {
      if (creation.remaining <= 0) continue;
      const { card, x, y } = creation;
      const cells = this.tilesWithin(x, y, card.range);

      if (card.ability === 'absorb_water') {
        let changed = 0;
        for (const cell of cells) {
          if (changed >= 3) break;
          if (this.getTerrain(cell.x, cell.y) === TILE.WATER) {
            this.setTerrain(cell.x, cell.y, TILE.LAND);
            changed += 1;
          }
        }
        if (changed) this.addLog(`「${card.name}」吸收了 ${changed} 格水域。`);
      }

      if (card.ability === 'illuminate') {
        let changed = 0;
        for (const cell of cells) {
          const terrain = this.getTerrain(cell.x, cell.y);
          if (terrain === TILE.DARK || terrain === TILE.FOG) {
            this.setTerrain(cell.x, cell.y, TILE.LAND);
            changed += 1;
          }
        }
        if (changed) this.addLog(`「${card.name}」照亮了 ${changed} 格黑暗或迷雾。`);
      }

      if (card.ability === 'cleanse') {
        let changed = 0;
        for (const cell of cells) {
          if ([TILE.DARK, TILE.FOG, TILE.SWAMP, TILE.POISON].includes(this.getTerrain(cell.x, cell.y))) {
            this.setTerrain(cell.x, cell.y, TILE.LAND);
            changed += 1;
          }
        }
        if (changed) this.addLog(`「${card.name}」净化了 ${changed} 格污染地形。`);
      }

      if (card.ability === 'calm') {
        if (this.isWarLevel()) {
          const before = this.warMeter;
          this.warMeter = Math.max(0, this.warMeter - 2);
          if (before !== this.warMeter) this.addLog(`「${card.name}」降低战争值：${before} → ${this.warMeter}。`);
        }
        for (const unit of this.units.filter((u) => u.type === 'beast' && u.status === 'active')) {
          if (this.distance(unit.x, unit.y, x, y) <= card.range + 1) {
            unit.anger = Math.max(0, (unit.anger || 0) - 1);
            unit.stunned = true;
            this.addLog(`「${card.name}」安抚了 ${unit.name}，怒气降至 ${unit.anger}。`);
          }
        }
      }

      if (card.ability === 'guide') {
        let guided = 0;
        for (const unit of this.units.filter((u) => this.isCivilian(u) || this.isMessenger(u))) {
          if (unit.status === 'active' && this.distance(unit.x, unit.y, x, y) <= card.range + 1) {
            unit.guidedTurns = 2;
            guided += 1;
          }
        }
        if (guided) this.addLog(`「${card.name}」正在引导 ${guided} 个单位。`);
      }

      if (card.ability === 'slow_beast') {
        for (const unit of this.units.filter((u) => u.type === 'beast' && u.status === 'active')) {
          if (this.distance(unit.x, unit.y, x, y) <= card.range + 1) {
            unit.stunned = true;
            this.addLog(`「${card.name}」牵制了 ${unit.name}。`);
          }
        }
      }

      if (card.ability === 'memory_beacon') {
        let changed = 0;
        for (const cell of cells) {
          if (this.getTerrain(cell.x, cell.y) === TILE.FOG || this.getTerrain(cell.x, cell.y) === TILE.DARK) {
            this.setTerrain(cell.x, cell.y, TILE.LAND);
            changed += 1;
          }
        }
        for (const unit of this.units.filter((u) => this.isCivilian(u) && u.status === 'active')) {
          if (this.distance(unit.x, unit.y, x, y) <= card.range + 2) {
            unit.guidedTurns = 2;
          }
        }
        if (changed) this.addLog(`「${card.name}」唤回记忆，驱散 ${changed} 格迷雾。`);
      }
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
    this.ui.nextBtn.classList.toggle('hidden', isFinal);
    this.showModal('考核通过', message + (isFinal ? ' 你完成了完整原型的全部关卡。' : ' 可以进入下一关。'), '继续', '重试');
  }

  failLevel(message) {
    if (this.gameState !== 'playing') return;
    this.gameState = 'lost';
    this.addLog(`失败：${message}`, true);
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
    this.worldGroup.clear();
    this.tileMeshes = [];

    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const terrain = this.getTerrain(x, y);
        const mesh = this.createTileMesh(terrain, x, y);
        this.worldGroup.add(mesh);
        this.tileMeshes.push(mesh);
        const marker = this.createTerrainMarker(terrain, x, y);
        if (marker) this.worldGroup.add(marker);
      }
    }

    for (const creation of this.creations) {
      this.worldGroup.add(this.createCreationMesh(creation));
    }

    for (const unit of this.units) {
      if (unit.status === 'active') this.worldGroup.add(this.createUnitMesh(unit));
      if (unit.status === 'rescued') this.worldGroup.add(this.createRescuedMarker(unit));
    }
  }

  createTileMesh(terrain, x, y) {
    const height = terrain === TILE.HIGH ? 0.46 : terrain === TILE.MOUNTAIN ? 0.72 : terrain === TILE.WATER ? 0.08 : 0.18;
    const geometry = new THREE.BoxGeometry(TILE_SIZE * 0.94, height, TILE_SIZE * 0.94);
    const material = this.getTerrainMaterial(terrain);
    const mesh = new THREE.Mesh(geometry, material);
    const pos = this.tileToWorld(x, y);
    mesh.position.set(pos.x, height / 2, pos.z);
    mesh.receiveShadow = true;
    mesh.castShadow = terrain !== TILE.WATER;
    mesh.userData = { x, y, terrain, tile: true };
    return mesh;
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
    this.updateSpecialMeters();
    this.updateUnitList();
    this.updateLogs();
  }

  updateSpecialMeters() {
    const meters = [];
    if (this.level.requiredRescue) {
      meters.push({ label: '已救援', value: this.rescued, max: this.level.requiredRescue, text: `${this.rescued} / ${this.level.requiredRescue}` });
    }
    if (this.isWarLevel()) {
      meters.push({ label: '战争值', value: this.warMeter, max: this.level.hazard?.warLimit || 9, text: `${this.warMeter} / ${this.level.hazard?.warLimit || 9}` });
    }
    const beast = this.units.find((unit) => unit.type === 'beast' && unit.status === 'active');
    if (beast) {
      meters.push({ label: `${beast.name} 怒气`, value: beast.anger || 0, max: this.level.beastAngerLimit || 5, text: `${beast.anger || 0} / ${this.level.beastAngerLimit || 5}` });
    }

    this.ui.specialMeters.innerHTML = meters.map((meter) => {
      const pct = Math.max(0, Math.min(100, (meter.value / meter.max) * 100));
      return `<div class="meter"><div class="meter-label">${escapeHtml(meter.label)}：${escapeHtml(meter.text)}</div><div class="meter-bar"><div class="meter-fill" style="width:${pct}%"></div></div></div>`;
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
    this.ui.logList.innerHTML = this.logs.map((entry) => `<div class="log-item">${entry.important ? '<strong>✦</strong> ' : ''}${escapeHtml(entry.text)}</div>`).join('');
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
  }

  nextStepToward(unit, goal) {
    if (!goal) return null;
    const startKey = `${unit.x},${unit.y}`;
    const goalKey = `${goal.x},${goal.y}`;
    const queue = [{ x: unit.x, y: unit.y }];
    const cameFrom = new Map([[startKey, null]]);

    while (queue.length) {
      const current = queue.shift();
      const currentKey = `${current.x},${current.y}`;
      if (currentKey === goalKey) break;
      const nbs = this.neighbors(current.x, current.y).sort((a, b) => this.distance(a.x, a.y, goal.x, goal.y) - this.distance(b.x, b.y, goal.x, goal.y));
      for (const nb of nbs) {
        const key = `${nb.x},${nb.y}`;
        if (cameFrom.has(key)) continue;
        if (!this.isPassable(nb.x, nb.y, unit)) continue;
        cameFrom.set(key, current);
        queue.push(nb);
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

  animate() {
    requestAnimationFrame(() => this.animate());
    const t = performance.now() / 1000;
    for (const child of this.worldGroup.children) {
      if (child.type === 'Group' && child.children.length > 0) {
        const hasCore = child.children.some((item) => item.geometry?.type === 'IcosahedronGeometry');
        if (hasCore) child.rotation.y = Math.sin(t * 0.8) * 0.08;
      }
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
