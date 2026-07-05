import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { compileCreation, abilityLabel } from './aiClient.js';
import { INSPIRATIONS, LEVELS, TILE } from './levels.js';
import { getMemorySystem } from './aiMemory.js';
import { ParticleSystem, ScreenEffects } from './particles.js';
import { NPCManager } from './npcManager.js';
import { applyAbility } from './abilityHandlers.js';
import { defaultStoryteller } from './storyteller.js';
import { GameEngine, TERRAIN_LABELS } from './gameEngine.js';
import { executeChainReaction } from './chainReactionCodex.js';
import { CognitiveEffects } from './cognitiveEffects.js';
import { worldLegendSystem } from './worldLegend.js';
import { legacySystem } from './legacySystem.js';
import { persistentWorld } from './persistentWorld.js';
import { buildContinuityViewModel } from './continuityPresenter.js';
import { ResidentDialogueSystem } from './residentDialogueSystem.js';
import { DebugSnapshot } from './debugSnapshot.js';
import { SaveSlotManager } from './saveSlotManager.js';
import { MemoryStore } from './memoryStore.js';
import { WorldSession } from './worldSession.js';

const TILE_SIZE = 1.55;
const BOARD_SIZE = 7;
const MAX_LOGS = 18;

// AI Narrative endpoint configuration
const NARRATIVE_ENDPOINT = '/api/narrative';
const NARRATIVE_TIMEOUT = 5000; // 5s timeout to avoid blocking gameplay

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text || '');
  return div.innerHTML;
}

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

class CreatorExam3D extends GameEngine {
  constructor() {
    super({
      onLog: (text, important) => {
        if (this.ui?.logList) this.updateLogs();
      },
      onWin: (message) => {
        this.handleWin(message);
      },
      onLose: (message) => {
        this.handleLose(message);
      },
      onRescue: (unit) => {
        this.handleRescue(unit);
      },
      onPlacement: (creation, x, y) => {
        this.handlePlacement(creation, x, y);
      },
      onTurnEnd: () => {
        this.renderWorld();
        this.updateUi();
      },
      onStateChange: () => {
        this.renderWorld();
        this.updateUi();
      },
      onHazardSpread: (type) => {
        this.addEnvironmentalNarrative('hazard', { hazardType: type });
      },
      onCreationExpire: (creation) => {
        // No-op: rendering handled in renderWorld
      },
      onWorldEvent: (event) => {
        this.recordGameEvent(event);
        if (this.npcManager) {
          const dialogue = this.npcManager.getLatestDialogue();
          if (dialogue) {
            this.renderNPCReaction(dialogue);
          }
        }
        if (this.memoryStore && this.worldSession?.worldSimulation) {
          this.memoryStore.saveWorld(this.worldSession.worldSimulation);
        }
      }
    });

    this.canvas = document.getElementById('game-canvas');
    this.root = document.getElementById('game-root');
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.tileMeshes = [];
    this.worldGroup = new THREE.Group();
    this.activeCard = null;
    this.placementMode = false;
    this.selectedRitualCreations = new Set();
    this.selectedWorkshopItems = new Set();
    this.currentAbyssRiddle = null;
    this.materials = new Map();
    this.geometryCache = new Map();
    this.labelCache = new Map();
    this.tileMeshPool = new Map();
    this.unitMeshPool = new Map();
    this.creationMeshPool = new Map();
    this.rescuedMarkerPool = new Map();
    this.intentArrowGroup = new THREE.Group();

    // Initialize new systems
    this.memorySystem = getMemorySystem();
    this.worldSession = new WorldSession();
    this.memoryStore = new MemoryStore();
    this.memoryStore.loadWorld(this.worldSession.worldSimulation);
    this.saveSlotManager = new SaveSlotManager();
    this.residentDialogueSystem = new ResidentDialogueSystem();
    this.particleSystem = null;
    this.screenEffects = null;
    this.npcManager = null;
    this.storyteller = defaultStoryteller;
    this.cognitiveEffects = new CognitiveEffects();
    this.lastFrameTime = 0;

    this.ui = this.collectUi();
    this.initScene();
    this.bindEvents();
    this.bindSaveSlotUI();
    this.bindResidentDialogueUI();
    this.loadLevel(0);
    this.animate();
  }

  // Override loadLevel to add browser-specific initialization
  loadLevel(index) {
    super.loadLevel(index);
    this.activeCard = null;
    this.placementMode = false;
    this.selectedRitualCreations.clear();
    this.selectedWorkshopItems.clear();
    this.currentAbyssRiddle = null;
    this.ui.modal.classList.add('hidden');
    this.ui.nextBtn.classList.add('hidden');
    this.ui.cardPanel.classList.add('hidden');

    // Clear screen overlays and particles from previous level / defeat
    if (this.screenEffects) this.screenEffects.clear();
    if (this.particleSystem) this.particleSystem.clear();

    // Clear 3D intent arrows from previous level
    this.clearIntentArrows();

    // Initialize NPC manager for this level
    this.npcManager = new NPCManager(this.level);
    this.applyPendingSocialGraph(this.npcManager);

    // Add legacy NPCs from previous rescues
    if (this.legacyUnits && this.legacyUnits.length > 0) {
      this.npcManager.addLegacyNPCs(this.legacyUnits);
    }

    // Update memory system
    this.memorySystem.worldState.currentLevel = this.level.id;

    this.renderWorld();
    this.updateUi();
    this.renderContinuity();
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
      storytellerSelect: document.getElementById('storyteller-select'),
      storytellerDesc: document.getElementById('storyteller-desc'),
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
      modalSecondary: document.getElementById('modal-secondary'),
      saveSlotPanel: document.getElementById('save-slot-panel'),
      saveSlotList: document.getElementById('save-slot-list'),
      saveSlotName: document.getElementById('save-slot-name'),
      saveSlotSave: document.getElementById('save-slot-save'),
      saveSlotLoad: document.getElementById('save-slot-load'),
      saveSlotDelete: document.getElementById('save-slot-delete'),
      saveSlotExport: document.getElementById('save-slot-export'),
      saveSlotImport: document.getElementById('save-slot-import'),
      saveSlotImportData: document.getElementById('save-slot-import-data'),
      residentDialoguePanel: document.getElementById('resident-dialogue-panel'),
      residentDialogueList: document.getElementById('resident-dialogue-list'),
      residentDialogueInput: document.getElementById('resident-dialogue-input'),
      residentDialogueSend: document.getElementById('resident-dialogue-send'),
      residentDialogueLog: document.getElementById('resident-dialogue-log'),
      continuityResidents: document.getElementById('continuity-residents'),
      continuityHooks: document.getElementById('continuity-hooks'),
      continuityPressures: document.getElementById('continuity-pressures'),
      legendMyths: document.getElementById('legend-myths'),
      legendArtifacts: document.getElementById('legend-artifacts'),
      legendFigures: document.getElementById('legend-figures'),
      ritualCreationList: document.getElementById('ritual-creation-list'),
      performRitualBtn: document.getElementById('perform-ritual-btn'),
      ritualResult: document.getElementById('ritual-result'),
      oathNpcList: document.getElementById('oath-npc-list'),
      activeOathList: document.getElementById('active-oath-list'),
      enemyIntentList: document.getElementById('enemyIntentList'),
      enemyIntentNarrative: document.getElementById('enemyIntentNarrative'),
      abyssRiddleText: document.getElementById('abyssRiddleText'),
      abyssRiddleInput: document.getElementById('abyssRiddleInput'),
      abyssDecodeBtn: document.getElementById('abyssDecodeBtn'),
      abyssResult: document.getElementById('abyssResult'),
      corruptionList: document.getElementById('corruptionList'),
      corruptionCreateBtn: document.getElementById('corruptionCreateBtn'),
      workshopInventoryList: document.getElementById('workshopInventoryList'),
      workshopMaterialsList: document.getElementById('workshopMaterialsList'),
      workshopDismantleBtn: document.getElementById('workshopDismantleBtn'),
      workshopModifyBtn: document.getElementById('workshopModifyBtn'),
      workshopFuseBtn: document.getElementById('workshopFuseBtn'),
      legacyUnitList: document.getElementById('legacy-unit-list'),
      legacyWorldStats: document.getElementById('legacy-world-stats'),
      legacyResidentList: document.getElementById('legacy-resident-list')
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
    this.worldGroup.add(this.intentArrowGroup);

    // Initialize particle system and screen effects
    this.particleSystem = new ParticleSystem(this.scene);
    this.screenEffects = new ScreenEffects();

    // Performance optimization: InstancedMesh for static tiles
    this.instancedMeshes = new Map(); // terrain type -> InstancedMesh
    this.initInstancedMeshes();

    // Performance optimization: Pathfinding cache (LRU)
    this.pathCache = new Map();
    this.pathCacheMaxSize = 50;
  }

  initInstancedMeshes() {
    // Pre-create instanced meshes for each terrain type
    const geometry = new THREE.BoxGeometry(TILE_SIZE, 0.4, TILE_SIZE);
    for (const [terrainType, color] of Object.entries(MATERIAL_COLORS)) {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.82,
        metalness: 0.05
      });
      const instancedMesh = new THREE.InstancedMesh(geometry, material, BOARD_SIZE * BOARD_SIZE);
      instancedMesh.count = 0; // Start with 0 visible instances
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawPattern);
      this.instancedMeshes.set(parseInt(terrainType), instancedMesh);
      this.worldGroup.add(instancedMesh);
    }
  }

  // Clear path cache when terrain changes
  clearPathCache() {
    this.pathCache.clear();
  }

  // Get cached path or compute new one
  getCachedPath(unit, goal) {
    const cacheKey = `${unit.x},${unit.y}-${goal.x},${goal.y}-${unit.type}`;
    const cached = this.pathCache.get(cacheKey);
    if (cached && cached.terrainHash === this.getTerrainHash()) {
      return cached.path;
    }
    return null;
  }

  setCachedPath(unit, goal, path) {
    const cacheKey = `${unit.x},${unit.y}-${goal.x},${goal.y}-${unit.type}`;
    // LRU: remove oldest if at capacity
    if (this.pathCache.size >= this.pathCacheMaxSize) {
      const firstKey = this.pathCache.keys().next().value;
      this.pathCache.delete(firstKey);
    }
    this.pathCache.set(cacheKey, {
      path,
      terrainHash: this.getTerrainHash()
    });
  }

  getTerrainHash() {
    // Simple hash of current terrain state for cache invalidation
    let hash = 0;
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        hash = (hash * 31 + this.getTerrain(x, y)) & 0xFFFFFFFF;
      }
    }
    return hash;
  }

  bindEvents() {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('pointerdown', (event) => this.onPointerDown(event));

    this.ui.compileBtn.addEventListener('click', () => this.handleCompile());
    this.ui.randomBtn.addEventListener('click', () => this.insertInspiration());
    this.ui.storytellerSelect?.addEventListener('change', (e) => this.handleStorytellerChange(e.target.value));
    this.ui.placeBtn.addEventListener('click', () => this.startPlacement());
    this.ui.endTurnBtn.addEventListener('click', () => this.endTurn());
    this.ui.restartBtn.addEventListener('click', () => this.loadLevel(this.levelIndex));
    this.ui.nextBtn.addEventListener('click', () => this.nextLevel());
    this.ui.performRitualBtn?.addEventListener('click', () => this.handlePerformRitual());

    // Ritual creation checkbox delegation
    this.ui.ritualCreationList?.addEventListener('change', (e) => {
      if (e.target.classList.contains('ritual-creation-checkbox')) {
        const id = e.target.dataset.creationId;
        if (e.target.checked) this.selectedRitualCreations.add(id);
        else this.selectedRitualCreations.delete(id);
      }
    });

    // Oath NPC / active oath delegation
    this.ui.oathNpcList?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-bind-oath]');
      if (!btn) return;
      const npcId = btn.dataset.npcId;
      const type = btn.dataset.oathType;
      this.handleBindOath(npcId, type);
    });
    this.ui.activeOathList?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-break-oath]');
      if (!btn) return;
      this.handleBreakOath(btn.dataset.oathId);
    });

    // Phase 5 panels
    this.ui.abyssDecodeBtn?.addEventListener('click', () => this.handleDecodeAbyss());
    this.ui.corruptionCreateBtn?.addEventListener('click', () => this.handleCreateCorruption());
    this.ui.workshopDismantleBtn?.addEventListener('click', () => this.handleWorkshopDismantle());
    this.ui.workshopModifyBtn?.addEventListener('click', () => this.handleWorkshopModify());
    this.ui.workshopFuseBtn?.addEventListener('click', () => this.handleWorkshopFuse());

    // Workshop selection delegation
    this.ui.workshopInventoryList?.addEventListener('change', (e) => {
      if (e.target.classList.contains('workshop-select')) {
        const id = e.target.dataset.invId;
        if (e.target.checked) this.selectedWorkshopItems.add(id);
        else this.selectedWorkshopItems.delete(id);
      }
    });

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
    const hits = this.raycaster.intersectObjects(Array.from(this.tileMeshPool.values()), false);

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

    this.recordCreationPlacement(creation, x, y);

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

  // Override endTurn to add browser-specific features (storyteller, applyAbility)
  endTurn() {
    if (this.gameState !== 'playing') {
      this.showToast('本关已经结束。');
      return;
    }
    this.addLog(`第 ${this.turn} 回合开始结算。`, true);
    this.applyActiveCreationEffects();
    this.applyChainReactions();
    this.moveUnits();
    this.spreadHazards();
    this.triggerRandomEvent();
    this.applyTileHazardsToUnits();
    this.decrementCreationDurations();
    this.checkEndCondition(true);
    if (this.gameState === 'playing') {
      this.turn += 1;
      // Evolve world myths every 5 turns
      if (this.turn % 5 === 0) {
        worldLegendSystem.evolveMyths();
      }
      // Storyteller 叙事触发 (传入aiMemory实现深度联动)
      const storyResult = this.storyteller.tellStory(this, this.memorySystem);
      if (storyResult) {
        this.addLog(`【叙事】${storyResult.narrative}`, true);
        this.applyStorytellerEvent(storyResult.event);
      }
      this.storyteller.recordBehavior(this, 'turn_end');
      if (this.turn > this.level.maxTurns) {
        this.checkEndCondition(true, true);
      }
    }
    this.renderWorld();
    this.updateUi();
  }

  applyStorytellerEvent(event) {
    if (!event) return;

    // Adaptive events are already applied by Storyteller.applyAdaptiveEvent
    // when severity is set. Re-apply here only if severity exists and effect
    // is one of the adaptive types not handled below.
    const adaptiveEffects = ['minorSetback', 'miracleHelp', 'memorialBoost', 'creativityBoost', 'confidenceBoost'];
    if (event.severity && adaptiveEffects.includes(event.effect)) {
      // Log adaptive effect if Storyteller didn't already log it
      const alreadyLogged = this.logs.some(l => l.turn === this.turn && l.text.includes(`【叙事事件】${event.name}`));
      if (!alreadyLogged) {
        this.storyteller.applyAdaptiveEvent(this, event, this.memorySystem);
      }
      return;
    }

    switch (event.effect) {
      case 'guidance': {
        const civilians = this.units.filter(u => this.isCivilian(u) && u.status === 'active');
        if (civilians.length > 0) {
          const target = civilians[Math.floor(Math.random() * civilians.length)];
          target.guidedTurns = Math.max(target.guidedTurns, 2);
          this.addLog(`【事件】${target.name} 获得了神秘指引`);
        }
        break;
      }
      case 'beastStunned': {
        const beast = this.units.find(u => u.type === 'beast' && u.status === 'active');
        if (beast) {
          beast.stunned = true;
          this.addLog(`【事件】${beast.name} 被神秘力量牵制`);
        }
        break;
      }
      case 'resonanceBoost': {
        const activeCreations = this.creations.filter(c => c.placed && c.remaining > 0);
        if (activeCreations.length >= 1) {
          const target = activeCreations[Math.floor(Math.random() * activeCreations.length)];
          target.remaining += 1;
          this.addLog(`【事件】「${target.card.name}」的持续时间延长了`);
        }
        break;
      }
      case 'floodSpread': {
        this.spreadTerrain(TILE.WATER, 1);
        this.addLog(`【事件】洪水额外扩散了 1 格`);
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
          this.addLog(`【事件】地形发生了变化`);
        }
        break;
      }
      case 'entropyFluctuation': {
        const change = Math.random() < 0.5 ? -1 : 1;
        this.entropy = Math.max(0, this.entropy + change);
        this.addLog(`【事件】世界裂隙 ${change > 0 ? '增加' : '减少'}了 1`);
        break;
      }
      case 'hazardRedirect': {
        const x = Math.floor(Math.random() * BOARD_SIZE);
        const y = Math.floor(Math.random() * BOARD_SIZE);
        if (this.getTerrain(x, y) === TILE.LAND) {
          this.setTerrain(x, y, TILE.WATER);
          this.addLog(`【事件】洪水流向了新的方向`);
        }
        break;
      }
      case 'atmosphereChange':
      case 'npcDialogue':
        // 纯叙事事件，不修改游戏状态
        break;
    }
  }

  applyActiveCreationEffects() {
    for (const creation of this.creations) {
      if (creation.remaining <= 0) continue;
      applyAbility(this, creation, 'active');
    }
  }

  // Override rescueUnit for browser-specific effects
  rescueUnit(unit) {
    super.rescueUnit(unit);
    // Environmental narrative for rescue
    this.addEnvironmentalNarrative('rescue', { unit, levelId: this.level.id });
    // Spawn rescue particle effect
    const pos = this.tileToWorld(unit.x, unit.y);
    this.particleSystem.spawnRescueEffect(pos.x, 0.5, pos.z);
  }

  // Override winLevel for browser-specific effects
  winLevel(message) {
    if (this.gameState !== 'playing') return;
    this.gameState = 'won';
    this.addLog(`通过：${message}`, true);

    // Record legendary event for victory
    const impact = this.lost === 0 ? 'major' : 'minor';
    this.recordLegendaryEvent('miracle', '造物者', this.level.title, impact);

    const isFinal = this.levelIndex === LEVELS.length - 1;

    // Record level completion in memory
    this.memorySystem.recordLevelCompletion(this.level.id, 'won', {
      turns: this.turn,
      maxTurns: this.level.maxTurns,
      rescued: this.rescued,
      lost: this.lost,
      entropy: this.entropy
    });
    this.emitRegionResolvedEvent(message);
    this.renderContinuity();

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

  // Override failLevel for browser-specific effects
  failLevel(message) {
    if (this.gameState !== 'playing') return;
    this.gameState = 'lost';
    this.addLog(`失败：${message}`, true);

    // Record legendary event for defeat
    this.recordLegendaryEvent('cataclysm', '造物者', this.level.title, 'major');

    // Record level completion in memory
    this.memorySystem.recordLevelCompletion(this.level.id, 'lost', {
      turns: this.turn,
      maxTurns: this.level.maxTurns,
      rescued: this.rescued,
      lost: this.lost,
      entropy: this.entropy
    });
    this.emitRegionLostEvent(message);
    this.renderContinuity();

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

  loadNextRegion(regionData) {
    this.loadRegion(regionData)
  }

  // Override applyTileHazardsToUnits for browser-specific effects
  applyTileHazardsToUnits() {
    for (const unit of this.units) {
      if (unit.status !== 'active') continue;
      const terrain = this.getTerrain(unit.x, unit.y);
      if (this.isCivilian(unit) && [TILE.WATER, TILE.DARK, TILE.POISON].includes(terrain)) {
        unit.status = 'lost';
        unit.lost = true;
        this.lost += 1;
        this.addLog(`${unit.name} 被${TERRAIN_LABELS[terrain]}吞没。`);
        this.updateWorldState({ type: 'unit_lost', detail: unit.name });
        this.emitUnitLostEvent(unit, terrain);
        this.renderContinuity();

        // Environmental narrative for loss
        this.addEnvironmentalNarrative('loss', { levelId: this.level.id });

        // Spawn loss particle effect
        const pos = this.tileToWorld(unit.x, unit.y);
        this.particleSystem.spawnLossEffect(pos.x, 0.5, pos.z);
      }
    }
  }

  // Override spreadHazards for browser-specific effects
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

  // Override moveCivilian for simpler browser version (no NPC interactions, no revealedPath/dreamLink)
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

  // Override moveMessenger for simpler browser version (no revealedPath)
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

  // Override moveBeast for simpler browser version (no trap check)
  moveBeast(unit) {
    if (unit.tamed) {
      this.addLog(`${unit.name} 已被驯服，安静地停留在原地。`);
      return;
    }
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

  // Override nextStepToward with path caching
  nextStepToward(unit, goal) {
    if (!goal) return null;
    const startKey = `${unit.x},${unit.y}`;
    const goalKey = `${goal.x},${goal.y}`;
    if (startKey === goalKey) return null;

    // Try cache first
    const cached = this.getCachedPath(unit, goal);
    if (cached && cached.length > 0) {
      const next = cached[0];
      if (next.x === unit.x && next.y === unit.y) {
        // Remove current position from cache
        cached.shift();
        return cached[0] || null;
      }
      return next;
    }

    // Compute path using A*
    const path = this.computePath(unit, goal);
    if (path && path.length > 0) {
      this.setCachedPath(unit, goal, path);
      return path[0];
    }
    return null;
  }

  computePath(unit, goal) {
    const startKey = `${unit.x},${unit.y}`;
    const goalKey = `${goal.x},${goal.y}`;

    const openSet = [{ x: unit.x, y: unit.y, g: 0, f: this.distance(unit.x, unit.y, goal.x, goal.y) }];
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
    const path = [];
    let current = goal;
    let previous = cameFrom.get(goalKey);
    while (previous && !(previous.x === unit.x && previous.y === unit.y)) {
      path.unshift(current);
      current = previous;
      previous = cameFrom.get(`${current.x},${current.y}`);
    }
    if (current.x !== unit.x || current.y !== unit.y) {
      path.unshift(current);
    }
    return path;
  }

  // Override setTerrain to clear path cache
  setTerrain(x, y, terrain) {
    if (this.inBounds(x, y)) {
      this.terrain[y][x] = terrain;
      this.clearPathCache();
    }
  }

  // Override isPassable for simpler browser version (no trap avoidance)
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

  // Override nearActiveAbility for simpler browser version (no placed flag)
  nearActiveAbility(x, y, abilities) {
    return this.creations.some((creation) => creation.remaining > 0 && abilities.includes(creation.card.ability) && this.distance(x, y, creation.x, creation.y) <= creation.card.range + 1);
  }

  // Override canHazardEnter for simpler browser version (no forest block)
  canHazardEnter(x, y, sourceTerrain, terrain) {
    if (this.isProtected(x, y)) return false;
    if ([TILE.HIGH, TILE.EXIT, TILE.CITY, TILE.MOUNTAIN, TILE.WALL, TILE.FIELD, TILE.SACRED].includes(terrain)) return false;
    if (terrain === sourceTerrain) return false;
    if (terrain === TILE.BRIDGE && sourceTerrain !== TILE.DARK) return false;
    return [TILE.LAND, TILE.VILLAGE, TILE.FOREST, TILE.BORDER, TILE.SWAMP, TILE.FOG, TILE.DARK].includes(terrain);
  }

  // Override getEffectiveRange for simpler browser version (no resonance)
  getEffectiveRange(creation) {
    let range = creation.card.range || 1;
    if (creation.card.specialEffect?.type === 'environmental') {
      const terrain = this.getTerrain(creation.x, creation.y);
      if (terrain === TILE.WATER || terrain === TILE.SWAMP) {
        range += 1;
      }
    }
    return Math.min(range, 3);
  }

  // Override applyChainReactions to use codex system + add particle effects
  applyChainReactions() {
    const discoveries = this.resonanceCodex.checkReactions(this);
    for (const reaction of discoveries) {
      this.addLog(`【新发现】连锁反应：${reaction.name}！${reaction.description}`, true);
      executeChainReaction(this, reaction.id);
    }
    const discovered = this.resonanceCodex.getDiscovered();
    for (const reaction of discovered) {
      if (executeChainReaction(this, reaction.id)) {
        reaction.usageCount++;
        // Spawn resonance particles for known reactions
        const abilityA = reaction.abilities[0];
        const abilityB = reaction.abilities[1];
        const creationA = this.creations.find(c => c.remaining > 0 && c.card.ability === abilityA);
        const creationB = this.creations.find(c => c.remaining > 0 && c.card.ability === abilityB);
        if (creationA && creationB) {
          const posA = this.tileToWorld(creationA.x, creationA.y);
          const posB = this.tileToWorld(creationB.x, creationB.y);
          this.particleSystem.spawnResonanceEffect(
            (posA.x + posB.x) / 2, 0.5, (posA.z + posB.z) / 2,
            this.particleSystem.getAbilityColor(creationA.card.ability)
          );
        }
      }
    }
  }

  handleWin(message) {
    const isFinal = this.levelIndex === LEVELS.length - 1;
    this.ui.nextBtn.classList.toggle('hidden', isFinal);

    // Store surviving creations into workshop for cross-level crafting
    const surviving = this.creations.filter(c => c.placed && c.remaining > 0);
    if (surviving.length > 0 && typeof this.workshopAddCreation === 'function') {
      for (const c of surviving) {
        this.workshopAddCreation(c.card);
      }
      this.addLog(`【工坊】${surviving.length} 个造物已存入跨关工坊。`, true);
    }

    this.showModal('考核通过', message + (isFinal ? ' 你完成了完整原型的全部关卡。' : ' 可以进入下一关。'), '继续', '重试');
  }

  handleLose(message) {
    this.showModal('考核失败', message, '重试', '重试');
  }

  handleRescue(unit) {
    // Environmental narrative for rescue
    this.addEnvironmentalNarrative('rescue', { unit, levelId: this.level.id });
    // Spawn rescue particle effect
    const pos = this.tileToWorld(unit.x, unit.y);
    this.particleSystem.spawnRescueEffect(pos.x, 0.5, pos.z);
  }

  handlePlacement(creation, x, y) {
    // Environmental narrative for placement
    this.addEnvironmentalNarrative('placement', { card: creation.card, x, y, terrain: this.getTerrain(x, y) });

    // Record creation in memory system
    this.memorySystem.recordCreation(creation.card, this.level.id, this.turn, {
      x, y,
      remainingUnits: this.units.filter(u => u.status === 'active').length,
      currentEntropy: this.entropy
    });

    // Spawn particle effects
    const pos = this.tileToWorld(x, y);
    this.particleSystem.spawnAbilityParticles(pos.x, 0.5, pos.z, creation.card.ability, creation.card.range);
    this.particleSystem.spawnFloatingText(pos.x, 1.5, pos.z, creation.card.name, this.particleSystem.getAbilityColor(creation.card.ability));

    // Screen flash for high-cost creations
    if (creation.card.cost >= 3) {
      this.screenEffects.flash('#' + this.particleSystem.getAbilityColor(creation.card.ability).toString(16).padStart(6, '0'), 400);
    }
  }

  recordGameEvent(event) {
    if (this.worldSession?.recordTacticalEvent) {
      this.worldSession.recordTacticalEvent(event);
    }
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

  clearIntentArrows() {
    if (!this.intentArrowGroup) return;
    const disposeObject = (obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          for (const m of obj.material) m.dispose();
        } else {
          obj.material.dispose();
        }
      }
      if (obj.children) {
        for (const child of obj.children) disposeObject(child);
      }
    };
    for (const child of this.intentArrowGroup.children) {
      disposeObject(child);
    }
    this.intentArrowGroup.clear();
  }

  renderIntentArrows() {
    if (!this.intentArrowGroup || typeof this.generateEnemyIntentPreview !== 'function') return;

    this.clearIntentArrows();
    if (this.gameState !== 'playing') return;

    const result = this.generateEnemyIntentPreview();
    if (!result || !result.previews || result.previews.length === 0) return;

    const threatColor = {
      high: 0xff3333,
      medium: 0xffaa33,
      low: 0x33ff88,
      none: 0x888888
    };

    for (const p of result.previews) {
      const color = threatColor[p.threat] || threatColor.low;
      const isDangerous = p.intentType === 'rampage' || p.intentType === 'intensify';
      const start = this.tileToWorld(p.position.x, p.position.y);

      if (p.targetPosition) {
        const end = this.tileToWorld(p.targetPosition.x, p.targetPosition.y);
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) continue;

        const direction = new THREE.Vector3(dx / length, 0, dz / length);
        const arrowOrigin = new THREE.Vector3(start.x, 0.35, start.z);
        const arrowLength = Math.max(0.2, length * 0.86);
        const headLength = isDangerous ? 0.32 : 0.22;
        const headWidth = isDangerous ? 0.22 : 0.14;
        const arrow = new THREE.ArrowHelper(direction, arrowOrigin, arrowLength, color, headLength, headWidth);
        arrow.userData = { intentType: p.intentType, unitId: p.unitId };
        this.intentArrowGroup.add(arrow);

        if (isDangerous) {
          const pulse = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 8, 8),
            this.material(color, { transparent: true, opacity: 0.6, emissive: color, emissiveIntensity: 0.5 })
          );
          pulse.position.set(start.x, 0.9, start.z);
          pulse.userData = { pulse: true, baseScale: 1, phase: Math.random() * Math.PI * 2 };
          this.intentArrowGroup.add(pulse);
        }
      } else {
        const iconGroup = new THREE.Group();
        iconGroup.position.set(start.x, 1.05, start.z);

        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(isDangerous ? 0.16 : 0.12, 8, 8),
          this.material(color, { transparent: true, opacity: 0.85, emissive: color, emissiveIntensity: 0.35 })
        );
        marker.userData = { intentType: p.intentType, unitId: p.unitId };
        iconGroup.add(marker);

        if (isDangerous) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.22, 0.025, 6, 18),
            this.material(color, { transparent: true, opacity: 0.5, emissive: color, emissiveIntensity: 0.3 })
          );
          ring.rotation.x = Math.PI / 2;
          ring.userData = { pulse: true, baseScale: 1, phase: Math.random() * Math.PI * 2 };
          iconGroup.add(ring);
        }

        this.intentArrowGroup.add(iconGroup);
      }
    }
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
    this.renderLegendPanel();
    this.renderRitualPanel();
    this.renderOathPanel();
    this.renderEnemyIntentPanel();
    this.renderAbyssPanel();
    this.renderCorruptionPanel();
    this.renderWorkshopPanel();
    this.renderPersistentPanel();
    this.renderStorytellerPanel();
    this.renderIntentArrows();
  }

  renderLegendPanel() {
    if (!this.ui.legendMyths) return;

    const myths = worldLegendSystem.getTopMyths(3);
    this.ui.legendMyths.innerHTML = myths.length
      ? myths.map(m => `<div class="continuity-item">${escapeHtml(m.text)}</div>`).join('')
      : '<div class="continuity-item">尚无重大传说</div>';

    const artifacts = Array.from(worldLegendSystem.artifacts.values())
      .sort((a, b) => b.power - a.power)
      .slice(0, 3);
    this.ui.legendArtifacts.innerHTML = artifacts.length
      ? artifacts.map(a => `<div class="continuity-item"><strong>${escapeHtml(a.name)}</strong> — ${escapeHtml(a.description)}</div>`).join('')
      : '<div class="continuity-item">尚无神器</div>';

    const figures = Array.from(worldLegendSystem.historicalFigures.values())
      .sort((a, b) => b.worshipLevel - a.worshipLevel)
      .slice(0, 3);
    this.ui.legendFigures.innerHTML = figures.length
      ? figures.map(f => `<div class="continuity-item"><strong>${escapeHtml(f.name)}</strong> — ${escapeHtml(f.reason)}</div>`).join('')
      : '<div class="continuity-item">尚无封神者</div>';
  }

  renderRitualPanel() {
    if (!this.ui.ritualCreationList) return;

    const placed = this.creations.filter(c => c.placed && c.remaining > 0);
    if (placed.length === 0) {
      this.ui.ritualCreationList.innerHTML = '<div class="continuity-item">还没有已放置的造物</div>';
      this.ui.performRitualBtn.disabled = true;
      return;
    }

    this.ui.ritualCreationList.innerHTML = placed.map(c => {
      const checked = this.selectedRitualCreations.has(c.id) ? 'checked' : '';
      return `
        <label class="ritual-creation-item">
          <input type="checkbox" class="ritual-creation-checkbox" data-creation-id="${escapeHtml(c.id)}" ${checked}>
          <span><strong>${escapeHtml(c.card.name)}</strong> · ${escapeHtml(c.card.ability)}</span>
        </label>
      `;
    }).join('');

    this.ui.performRitualBtn.disabled = this.gameState !== 'playing' || this.selectedRitualCreations.size < 2;
  }

  renderOathPanel() {
    if (!this.ui.oathNpcList) return;

    const npcs = this.npcManager?.getNPCSummary() || [];
    if (npcs.length === 0) {
      this.ui.oathNpcList.innerHTML = '<div class="continuity-item">当前区域没有可缔结誓约的居民</div>';
      this.ui.activeOathList.innerHTML = '';
      return;
    }

    const socialGraph = this.npcManager?.socialGraph || null;
    this.ui.oathNpcList.innerHTML = npcs.map(npc => {
      const available = this.oathManager.getAvailableOathTypes(npc.id, socialGraph);
      const buttons = available.map(o => `
        <button class="secondary oath-btn" data-bind-oath data-npc-id="${escapeHtml(npc.id)}" data-oath-type="${escapeHtml(o.type)}" ${o.canForm ? '' : 'disabled'}>
          ${escapeHtml(o.name)}
        </button>
      `).join('');
      return `
        <div class="continuity-item">
          <strong>${escapeHtml(npc.name)}</strong> · ${escapeHtml(npc.mood)} · ${escapeHtml(npc.attitude)}
          <div class="oath-btn-row">${buttons || '暂无可用誓约'}</div>
        </div>
      `;
    }).join('');

    const activeOaths = this.oathManager.getAllActiveOaths();
    this.ui.activeOathList.innerHTML = activeOaths.length
      ? activeOaths.map(o => {
          const typeData = this.oathManager.oaths.get(o.id) ? null : null; // avoid extra lookup
          const typeName = this.getOathTypeName(o.type);
          return `
            <div class="continuity-item">
              <strong>${escapeHtml(typeName)}</strong> — ${escapeHtml(o.npcName)}
              <span class="oath-risk">信任 ${o.trustLevel} · 背叛 ${(o.calculateBetrayalChance(socialGraph) * 100).toFixed(0)}%</span>
              <button class="secondary small" data-break-oath data-oath-id="${escapeHtml(o.id)}">背弃</button>
            </div>
          `;
        }).join('')
      : '<div class="continuity-item">当前没有活跃誓约</div>';
  }

  getOathTypeName(type) {
    const names = {
      protection: '守护誓约',
      knowledge: '知识誓约',
      vengeance: '复仇誓约',
      sacrifice: '牺牲誓约',
      kinship: '血盟誓约'
    };
    return names[type] || type;
  }

  // ========== Phase 5 UI Rendering ==========

  renderEnemyIntentPanel() {
    if (!this.ui.enemyIntentList) return;

    if (typeof this.generateEnemyIntentPreview !== 'function') {
      this.ui.enemyIntentList.innerHTML = '<div class="continuity-item">当前没有可预见的行动</div>';
      this.ui.enemyIntentNarrative.innerHTML = '';
      return;
    }

    const result = this.generateEnemyIntentPreview();
    if (!result || !result.previews || result.previews.length === 0) {
      this.ui.enemyIntentList.innerHTML = '<div class="continuity-item">当前没有可预见的行动</div>';
      this.ui.enemyIntentNarrative.innerHTML = '';
      return;
    }

    this.ui.enemyIntentList.innerHTML = result.previews.map(p => {
      const threatClass = p.threat || 'low';
      return `
        <div class="continuity-item intent-${threatClass}">
          <strong>${escapeHtml(p.icon || '•')} ${escapeHtml(p.unitName)}</strong>
          <span class="intent-type">${escapeHtml(p.name || p.intentType)}</span>
          <div class="intent-desc">${escapeHtml(p.description || '')}</div>
          <div class="intent-action">${escapeHtml(p.predictedAction || '')}</div>
        </div>
      `;
    }).join('');

    this.ui.enemyIntentNarrative.innerHTML = `<div class="continuity-item">${escapeHtml(result.narrative || '')}</div>`;
  }

  renderAbyssPanel() {
    if (!this.ui.abyssRiddleText) return;

    if (typeof this.generateAbyssRiddle !== 'function') {
      this.ui.abyssRiddleText.innerHTML = '<div class="continuity-item">世界裂隙尚浅，认知深渊沉睡中。</div>';
      this.ui.abyssRiddleInput.classList.add('hidden');
      this.ui.abyssDecodeBtn.classList.add('hidden');
      this.ui.abyssResult.innerHTML = '';
      return;
    }

    if (!this.currentAbyssRiddle) {
      this.currentAbyssRiddle = this.generateAbyssRiddle('instruction');
    }

    const riddle = this.currentAbyssRiddle;
    const active = riddle && riddle.active !== false;
    const depth = riddle?.depth ?? 0;
    if (!active && depth < 0.8) {
      this.ui.abyssRiddleText.innerHTML = '<div class="continuity-item">世界裂隙尚浅，认知深渊沉睡中。</div>';
      this.ui.abyssRiddleInput.classList.add('hidden');
      this.ui.abyssDecodeBtn.classList.add('hidden');
      this.ui.abyssResult.innerHTML = '';
      return;
    }

    this.ui.abyssRiddleInput.classList.remove('hidden');
    this.ui.abyssDecodeBtn.classList.remove('hidden');

    if (!riddle) {
      this.ui.abyssRiddleText.innerHTML = '<div class="continuity-item">深渊静默，未生成谜题。</div>';
      return;
    }

    this.ui.abyssRiddleText.innerHTML = `
      <div class="continuity-item abyss-riddle">
        <div class="riddle-label">裂隙浓度 ${(depth * 100).toFixed(0)}%</div>
        <div class="riddle-text">${escapeHtml(riddle.displayed || riddle.distorted || '')}</div>
        <div class="riddle-hint">提示：${escapeHtml(riddle.hint || '倾听深渊的低语')}</div>
      </div>
    `;
  }

  renderCorruptionPanel() {
    if (!this.ui.corruptionList) return;

    if (typeof this.createParadoxCard !== 'function') {
      this.ui.corruptionList.innerHTML = '<div class="continuity-item">腐化验证系统尚未就绪。</div>';
      this.ui.corruptionCreateBtn.disabled = true;
      return;
    }

    const stats = typeof this.getCorruptionStats === 'function' ? this.getCorruptionStats() : null;
    const level = stats?.corruptionLevel || 0;
    const engineState = stats?.engineOverloaded ? '已崩溃' : '稳定';

    const paradoxTypes = [
      { key: 'light_dark', name: '噬光之灯' },
      { key: 'life_death', name: '生死之种' },
      { key: 'creation_destruction', name: '创灭之锤' },
      { key: 'time_stillness', name: '静时之沙' },
      { key: 'shield_spear', name: '矛盾之盾' },
      { key: 'memory_forget', name: '忘忆之镜' },
      { key: 'water_fire', name: '蒸腾之焰' },
      { key: 'guide_mislead', name: '迷途之灯' }
    ];

    this.ui.corruptionList.innerHTML = `
      <div class="continuity-item">
        <strong>当前腐化值：${level}</strong> · 引擎状态：${engineState}
      </div>
      <div class="continuity-item paradox-grid">
        ${paradoxTypes.map(p => `
          <label class="paradox-option">
            <input type="radio" name="paradox-type" value="${escapeHtml(p.key)}" ${level >= 10 ? 'disabled' : ''}>
            <span>${escapeHtml(p.name)}</span>
          </label>
        `).join('')}
      </div>
    `;

    this.ui.corruptionCreateBtn.disabled = this.gameState !== 'playing' || level >= 10;
  }

  renderWorkshopPanel() {
    if (!this.ui.workshopInventoryList) return;

    if (typeof this.workshopGetInventory !== 'function' || typeof this.workshopGetMaterials !== 'function') {
      this.ui.workshopInventoryList.innerHTML = '<div class="continuity-item">造物者工坊系统尚未就绪。</div>';
      this.ui.workshopMaterialsList.innerHTML = '';
      this.ui.workshopDismantleBtn.disabled = true;
      this.ui.workshopModifyBtn.disabled = true;
      this.ui.workshopFuseBtn.disabled = true;
      return;
    }

    const inventory = this.workshopGetInventory();
    const materials = this.workshopGetMaterials();

    if (inventory.length === 0) {
      this.ui.workshopInventoryList.innerHTML = '<div class="continuity-item">工坊库存为空。胜利后可将本关造物存入工坊。</div>';
    } else {
      this.ui.workshopInventoryList.innerHTML = inventory.map(item => `
        <label class="continuity-item workshop-item">
          <input type="checkbox" class="workshop-select" data-inv-id="${escapeHtml(item.id)}">
          <span><strong>${escapeHtml(item.card.name)}</strong> · ${escapeHtml(item.card.ability)}</span>
        </label>
      `).join('');
      // 保持重新渲染后的选中状态
      for (const cb of this.ui.workshopInventoryList.querySelectorAll('.workshop-select')) {
        cb.checked = this.selectedWorkshopItems.has(cb.dataset.invId);
      }
    }

    const materialEntries = Array.isArray(materials) ? materials : Object.entries(materials || {});
    if (materialEntries.length === 0) {
      this.ui.workshopMaterialsList.innerHTML = '<div class="continuity-item">没有可用材料</div>';
    } else {
      this.ui.workshopMaterialsList.innerHTML = materialEntries.map(m => {
        const [name, count] = Array.isArray(m) ? m : [m.name || m.type, m.count];
        return `<div class="continuity-item"><strong>${escapeHtml(name)}</strong> × ${escapeHtml(String(count))}</div>`;
      }).join('');
    }

    const canOperate = this.gameState === 'playing' || inventory.length > 0;
    this.ui.workshopDismantleBtn.disabled = !canOperate || this.selectedWorkshopItems.size < 1;
    this.ui.workshopModifyBtn.disabled = !canOperate || this.selectedWorkshopItems.size !== 1;
    this.ui.workshopFuseBtn.disabled = !canOperate || this.selectedWorkshopItems.size !== 2;
  }

  renderPersistentPanel() {
    if (!this.ui.legacyUnitList) return;

    const legacyUnits = Array.from(legacySystem.legacyUnits.values());
    if (legacyUnits.length === 0) {
      this.ui.legacyUnitList.innerHTML = '<div class="continuity-item">尚未有单位被传承。</div>';
    } else {
      this.ui.legacyUnitList.innerHTML = legacyUnits.map(l => {
        const tierNames = { survivor: '幸存者', hero: '英雄', legend: '传奇', ancestor: '先祖' };
        const traits = (l.traits || []).map(t => t.name).join('、') || '无';
        return `<div class="continuity-item">
          <strong>${escapeHtml(l.name)}</strong> · ${escapeHtml(tierNames[l.tier] || l.tier)}
          <div class="legacy-meta">救援 ${l.rescueCount} 次 · 特质：${escapeHtml(traits)}</div>
        </div>`;
      }).join('');
    }

    if (this.ui.legacyWorldStats) {
      this.ui.legacyWorldStats.innerHTML = `
        <div class="continuity-item">
          <strong>世界熵值</strong> ${persistentWorld.worldEntropy}
          <br><strong>世界名望</strong> ${persistentWorld.worldRenown}
          <br><strong>已完成关卡</strong> ${persistentWorld.levelHistory.length}
        </div>
      `;
    }

    if (this.ui.legacyResidentList) {
      const residents = this.npcManager?.npcs?.filter(n => n.isLegacy) || [];
      this.ui.legacyResidentList.innerHTML = residents.length
        ? residents.map(r => `<div class="continuity-item"><strong>${escapeHtml(r.name)}</strong> · ${escapeHtml(r.tier || '故人')} · ${escapeHtml(r.lore || '')}</div>`).join('')
        : '<div class="continuity-item">当前关卡没有持久居民。</div>';
    }
  }

  renderStorytellerPanel() {
    if (!this.ui.storytellerSelect || !this.ui.storytellerDesc) return;
    const desc = defaultStoryteller.personality?.description || '';
    this.ui.storytellerDesc.textContent = desc;
  }

  handleStorytellerChange(personality) {
    if (defaultStoryteller.setPersonality) {
      defaultStoryteller.setPersonality(personality);
      this.addLog(`【叙事引擎】已切换为${defaultStoryteller.personality.name}人格。`, true);
      this.renderStorytellerPanel();
    }
  }

  handleDecodeAbyss() {
    const input = this.ui.abyssRiddleInput?.value?.trim();
    if (!input) {
      this.showToast('请输入解码答案。');
      return;
    }

    if (typeof this.attemptDecodeAbyss !== 'function') {
      this.showToast('认知深渊系统尚未就绪。');
      return;
    }

    const result = this.attemptDecodeAbyss(input);
    if (this.ui.abyssResult) {
      this.ui.abyssResult.innerHTML = `<div class="continuity-item ${result.success ? 'success' : 'warning'}">${escapeHtml(result.message)}</div>`;
    }

    if (result.success) {
      this.currentAbyssRiddle = null;
      this.ui.abyssRiddleInput.value = '';
      if (result.reward) {
        if (result.reward.type === 'knowledge') {
          this.showToast(`获得知识：${result.reward.category}`);
        } else if (result.reward.type === 'ritual') {
          this.showToast(`发现仪式配方：${result.reward.recipeId}`);
        }
      }
    }

    this.updateUi();
  }

  handleCreateCorruption() {
    const selected = this.ui.corruptionList?.querySelector('input[name="paradox-type"]:checked');
    if (!selected) {
      this.showToast('请先选择一种悖论类型。');
      return;
    }

    if (typeof this.createParadoxCard !== 'function') {
      this.showToast('腐化验证系统尚未就绪。');
      return;
    }

    const result = this.createParadoxCard(selected.value);
    if (result.success && result.card) {
      this.activeCard = result.card;
      this.showCard(result.card);
      this.addLog(`【腐化】生成悖论造物「${result.card.name}」，腐化值 +${result.corruption}。`, true);
      if (result.narrative) this.addLog(result.narrative);
    } else {
      const warning = result.warnings?.join('；') || result.narrative || '腐化造物生成失败';
      this.showToast(warning);
      this.addLog(`【腐化】${warning}`, true);
    }

    this.updateUi();
  }

  handleWorkshopDismantle() {
    const ids = Array.from(this.selectedWorkshopItems);
    if (ids.length < 1) {
      this.showToast('请选择至少一个要拆解的造物。');
      return;
    }

    if (typeof this.workshopDismantle !== 'function') {
      this.showToast('造物者工坊系统尚未就绪。');
      return;
    }

    let dismantled = 0;
    for (const id of ids) {
      const result = this.workshopDismantle(id);
      if (result.success) dismantled++;
    }

    this.selectedWorkshopItems.clear();
    this.showToast(`拆解完成，获得 ${dismantled} 份材料。`);
    this.updateUi();
  }

  handleWorkshopModify() {
    const ids = Array.from(this.selectedWorkshopItems);
    if (ids.length !== 1) {
      this.showToast('请选择一个要改造的造物。');
      return;
    }

    if (typeof this.workshopModify !== 'function') {
      this.showToast('造物者工坊系统尚未就绪。');
      return;
    }

    const result = this.workshopModify(ids[0], 'range_boost');
    if (result.success) {
      this.showToast(`改造成功：${result.card.name}`);
    } else {
      this.showToast(result.error || '改造失败');
    }
    this.selectedWorkshopItems.clear();
    this.updateUi();
  }

  handleWorkshopFuse() {
    const ids = Array.from(this.selectedWorkshopItems);
    if (ids.length !== 2) {
      this.showToast('请选择两个要融合的造物。');
      return;
    }

    if (typeof this.workshopFuse !== 'function') {
      this.showToast('造物者工坊系统尚未就绪。');
      return;
    }

    const result = this.workshopFuse(ids[0], ids[1]);
    if (result.success) {
      this.showToast(`融合成功：${result.creation.baseCard.name}`);
    } else {
      this.showToast(result.error || '融合失败');
    }
    this.selectedWorkshopItems.clear();
    this.updateUi();
  }

  handlePerformRitual() {
    if (this.gameState !== 'playing') {
      this.showToast('本关已结束。');
      return;
    }
    const ids = Array.from(this.selectedRitualCreations);
    if (ids.length < 2) {
      this.showToast('请选择至少 2 张造物卡。');
      return;
    }

    const result = this.performRitual(ids);
    if (result.success) {
      this.selectedRitualCreations.clear();
      this.ui.ritualResult.textContent = result.narrative;
      this.ui.ritualResult.className = 'ritual-result success';
    } else {
      const warning = result.warnings?.join('；') || result.error || '仪式失败';
      this.ui.ritualResult.textContent = warning;
      this.ui.ritualResult.className = 'ritual-result warning';
      this.showToast(warning);
    }

    this.renderWorld();
    this.updateUi();
  }

  handleBindOath(npcId, type) {
    const result = this.bindOath(npcId, type);
    if (result.success) {
      this.showToast(`已与 ${result.oath.npcName} 缔结${this.getOathTypeName(type)}。`);
    } else {
      this.showToast(result.error || '缔结誓约失败');
    }
    this.updateUi();
  }

  handleBreakOath(oathId) {
    const result = this.breakOath(oathId);
    if (result.success) {
      this.showToast(`已背弃与 ${result.oath.npcName} 的誓约。`);
    } else {
      this.showToast(result.error || '背弃誓约失败');
    }
    this.updateUi();
  }

  renderNPCReaction(dialogue) {
    if (!this.ui.residentDialogueLog) return;

    const moodClass = dialogue.mood || 'neutral';
    const item = document.createElement('li');
    item.className = `resident-dialogue-entry npc-reaction mood-${moodClass}`;
    item.innerHTML = `
      <div class="resident-dialogue-meta">
        <strong>${escapeHtml(dialogue.npcName)}</strong>
        <span class="resident-mood">${escapeHtml(dialogue.mood)}</span>
        <span class="resident-attitude">${escapeHtml(dialogue.attitude)}</span>
      </div>
      <div class="resident-dialogue-text">${escapeHtml(dialogue.text)}</div>
    `;

    this.ui.residentDialogueLog.prepend(item);

    // Keep only the latest 20 entries
    while (this.ui.residentDialogueLog.children.length > 20) {
      this.ui.residentDialogueLog.lastElementChild.remove();
    }
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
    const entropyLimit = (this.level && this.level.entropyLimit) || 7;
    this.cognitiveEffects.updateDistortion(this.entropy, entropyLimit);
    const distortionLevel = this.cognitiveEffects.distortionLevel;

    this.ui.logList.innerHTML = this.logs.map((entry) => {
      let cls = 'log-item';
      if (entry.important) cls += ' important';
      if (entry.text.includes('共鸣')) cls += ' resonance';
      let text = entry.text;
      if (distortionLevel > 0.5) {
        text = this.cognitiveEffects.distortText(text, distortionLevel * 0.5);
      }
      return `<div class="${cls}">${entry.important ? '<strong>✦</strong> ' : ''}${escapeHtml(text)}</div>`;
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

  addEnvironmentalNarrative(eventType, context) {
    this.fetchNarrative(eventType, context).then((text) => {
      if (text) {
        this.addLog(text, false);
      } else {
        this.addLocalNarrative(eventType, context);
      }
    }).catch(() => {
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

  renderContinuity() {
    if (!this.worldSimulation || !this.ui?.continuityResidents || !this.ui?.continuityHooks) return;
    const model = buildContinuityViewModel(this.worldSimulation, {
      currentRegionId: this.level?.id || 'unknown'
    });

    this.ui.continuityResidents.innerHTML = model.residents.map(resident => `
      <div class="continuity-item">
        <strong>${escapeHtml(resident.name)}</strong> · ${escapeHtml(resident.mood)}<br>
        ${escapeHtml(resident.latestMemory)}
      </div>
    `).join('') || '<div class="continuity-item">暂无居民记忆</div>';

    this.ui.continuityHooks.innerHTML = model.futureHooks.map(hook => `
      <div class="continuity-item">
        <strong>${escapeHtml(hook.type)}</strong><br>
        ${escapeHtml(hook.summary)}
      </div>
    `).join('') || '<div class="continuity-item">暂无未解决线索</div>';

    if (this.ui.continuityPressures) {
      this.ui.continuityPressures.innerHTML = model.pressures.map(p => {
        const pct = Math.max(0, Math.min(100, p.value));
        let barClass = '';
        if (pct >= 90) barClass = 'danger';
        else if (pct >= 70) barClass = 'warning';
        return `<div class="continuity-item">
          <strong>${escapeHtml(p.category)}</strong> · ${escapeHtml(p.status)}<br>
          <div class="meter-bar"><div class="meter-fill ${barClass}" style="width:${pct}%"></div></div>
          ${pct}% ${p.trend > 0 ? '↑' : p.trend < 0 ? '↓' : '→'}
        </div>`;
      }).join('') || '<div class="continuity-item">暂无压力数据</div>';
    }
  }

  showExplorationChoices(choices, winMessage) {
    const container = document.getElementById('exploration-choices');
    if (!container) return;
    const html = choices.map((vm) => {
      const id = escapeHtml(vm.id);
      const title = escapeHtml(vm.title);
      const description = escapeHtml(vm.description);
      const meta = escapeHtml(vm.meta);
      const badge = escapeHtml(vm.badge);
      return `<button class="exploration-choice" data-choice-id="${id}">
        <span class="badge">${badge}</span>
        <h4>${title}</h4>
        <p>${description}</p>
        <span class="meta">${meta}</span>
      </button>`;
    }).join('');
    container.innerHTML = html;
    if (winMessage) {
      this.showModal('区域完成', winMessage, '继续', '继续');
    }
  }

  async handleExplorationChoice(choiceId) {
    if (this.explorationDirector) {
      await this.explorationDirector.resolveChoice(choiceId);
    }
  }

  exportDebugSnapshot() {
    const snapshot = new DebugSnapshot({
      worldSimulation: this.worldSession?.worldSimulation || this.worldSimulation
    });
    snapshot.download(`world-snapshot-${Date.now()}.json`);
  }

  bindSaveSlotUI() {
    this.ui.saveSlotSave?.addEventListener('click', () => this.saveCurrentSlot());
    this.ui.saveSlotLoad?.addEventListener('click', () => this.loadSelectedSlot());
    this.ui.saveSlotDelete?.addEventListener('click', () => this.deleteSelectedSlot());
    this.ui.saveSlotExport?.addEventListener('click', () => this.exportSelectedSlot());
    this.ui.saveSlotImport?.addEventListener('click', () => this.importSelectedSlot());
    this.renderSaveSlots();
  }

  currentSlotId() {
    return this.ui.saveSlotName?.value?.trim() || 'main';
  }

  saveCurrentSlot() {
    const persistentState = this.getPersistentState();
    const snapshot = this.saveSlotManager.saveSlot(this.currentSlotId(), this.worldSession, persistentState, {
      label: this.currentSlotId(),
      currentRegionId: this.worldSession.currentRegionId || this.level?.id || null
    });
    this.addLog?.(`World saved to slot ${snapshot.slotId}.`);
    this.renderSaveSlots();
  }

  loadSelectedSlot() {
    const result = this.saveSlotManager.loadSlot(this.currentSlotId(), this.worldSession);
    if (!result.loaded) {
      this.addLog?.(`No save slot found for ${this.currentSlotId()}.`);
      return;
    }
    this.applyPersistentState(result.persistentState);
    this.worldSimulation = this.worldSession.worldSimulation;
    this.memoryStore?.saveWorld(this.worldSession);
    this.reloadCurrentSessionRegion?.();
    this.renderContinuity?.();
    this.renderExplorationChoices?.();
    this.renderWorldMap?.();
    this.addLog?.(`World loaded from slot ${this.currentSlotId()}.`);
  }

  deleteSelectedSlot() {
    this.saveSlotManager.deleteSlot(this.currentSlotId());
    this.renderSaveSlots();
    this.addLog?.(`World save slot ${this.currentSlotId()} deleted.`);
  }

  exportSelectedSlot() {
    const raw = this.saveSlotManager.exportSlot(this.currentSlotId());
    if (!raw) {
      this.addLog?.(`No save slot found for ${this.currentSlotId()}.`);
      return;
    }
    this.ui.saveSlotImportData.value = raw;
  }

  importSelectedSlot() {
    const raw = this.ui.saveSlotImportData?.value || '';
    const imported = this.saveSlotManager.importSlot(this.currentSlotId(), raw);
    this.renderSaveSlots();
    this.addLog?.(imported ? `World save imported to ${this.currentSlotId()}.` : 'World save import failed.');
  }

  renderSaveSlots() {
    if (!this.ui.saveSlotList) return;
    const slots = this.saveSlotManager.listSlots();
    this.ui.saveSlotList.innerHTML = slots.map(slot => {
      const savedAt = new Date(slot.savedAt).toLocaleString();
      return `<li data-slot-id="${slot.slotId}"><button type="button" data-slot-select="${slot.slotId}">${slot.label}</button><span>${savedAt}</span></li>`;
    }).join('');
    this.ui.saveSlotList.querySelectorAll('[data-slot-select]').forEach(button => {
      button.addEventListener('click', () => {
        this.ui.saveSlotName.value = button.dataset.slotSelect;
      });
    });
  }

  bindResidentDialogueUI() {
    this.ui.residentDialogueSend?.addEventListener('click', () => this.sendResidentDialogue());
    this.renderResidentDialogueList();
  }

  renderResidentDialogueList() {
    if (!this.ui.residentDialogueList) return;
    const residents = this.worldSimulation?.residentRegistry?.getResidentsForRegion(this.level?.id) || [];
    this.ui.residentDialogueList.innerHTML = residents.map(resident => `
      <div class="resident-card" data-resident-id="${resident.residentId}">
        <strong>${resident.name}</strong> · ${resident.mood}
        <br><em>${resident.currentGoal || 'No current goal'}</em>
      </div>
    `).join('');
    this.ui.residentDialogueList.querySelectorAll('.resident-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectedResidentId = card.dataset.residentId;
        this.addLog?.(`Selected resident: ${card.querySelector('strong')?.textContent || ''}`);
      });
    });
  }

  async sendResidentDialogue() {
    const text = this.ui.residentDialogueInput?.value?.trim();
    if (!text || !this.selectedResidentId) {
      this.addLog?.('Select a resident and type a message first.');
      return;
    }
    const resident = this.worldSimulation?.residentRegistry?.getResident(this.selectedResidentId);
    if (!resident) {
      this.addLog?.('Selected resident not found.');
      return;
    }

    const localResponse = this.residentDialogueSystem.generateLocalDialogue({
      resident,
      playerText: text,
      regionId: this.level?.id
    });

    let response = localResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const fetchResponse = await fetch('/api/resident-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentId: resident.residentId,
          residentName: resident.name,
          playerText: text,
          memoryText: resident.memories?.slice(-1)?.[0]?.text || ''
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        if (data?.dialogue) {
          response = this.residentDialogueSystem.sanitizeCandidate(data, { resident, playerText: text });
        }
      }
    } catch (_error) {
      // Use local fallback
    }

    this.worldSimulation?.recordResidentDialogue?.({
      residentId: resident.residentId,
      residentName: resident.name,
      regionId: this.level?.id,
      playerText: text,
      residentText: response.text,
      intent: response.intent,
      turn: this.turn || 0
    });

    this.addLog?.(`${resident.name}: ${response.text}`);
    if (this.ui.residentDialogueLog) {
      const entry = document.createElement('li');
      entry.textContent = `${resident.name}: ${response.text}`;
      this.ui.residentDialogueLog.appendChild(entry);
    }
    this.ui.residentDialogueInput.value = '';
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

    // Pulse dangerous intent markers
    if (this.intentArrowGroup) {
      for (const child of this.intentArrowGroup.children) {
        this.animateIntentMarker(child, t);
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  animateIntentMarker(child, t) {
    if (!child) return;
    if (child.userData?.pulse) {
      const phase = child.userData.phase || 0;
      const baseScale = child.userData.baseScale || 1;
      const s = baseScale + Math.sin(t * 3 + phase) * 0.15;
      child.scale.setScalar(s);
    }
    if (child.type === 'Group') {
      for (const nested of child.children) {
        this.animateIntentMarker(nested, t);
      }
    }
  }
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

window.addEventListener('DOMContentLoaded', () => {
  new CreatorExam3D();
});
