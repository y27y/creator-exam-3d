import { EventBus } from './eventBus.js';
import { ResidentRegistry } from './residentRegistry.js';
import { ResidentAgentSystem } from './residentAgentSystem.js';
import { AIDirector } from './aiDirector.js';
import { ResidentScheduleSystem } from './residentScheduleSystem.js';
import { ResidentRumorSystem } from './residentRumorSystem.js';
import { ExplorationDirector } from './explorationDirector.js';

function hookId(type, eventId) {
  return `hook-${type}-${eventId}`;
}

function eventText(event) {
  const payload = event.payload || {};
  if (event.type === 'unit_rescued') return `${payload.unitName || '某位居民'}在${event.regionId}被玩家救下`;
  if (event.type === 'unit_lost') return `${payload.unitName || '某位居民'}在${event.regionId}失踪或遇难`;
  if (event.type === 'creation_placed') return `玩家在${event.regionId}创造了「${payload.creationName || '未命名造物'}」`;
  if (event.type === 'defense_resolved') return `${event.regionId}完成长夜守城：守住${payload.survivedWaves || 0}波，裂隙变化${Number(payload.entropyDelta || 0) >= 0 ? '+' : ''}${payload.entropyDelta || 0}`;
  if (event.type === 'airspace_resolved') return `${event.regionId}完成第七天裂隙空域：${payload.outcome === 'victory' ? '清算成功' : '清算失败'}，清除${payload.clearedLayers || 0}段`;
  if (event.type === 'region_resolved') return `${event.regionId}的危机被解决`;
  if (event.type === 'region_lost') return `${event.regionId}的危机留下了伤痕`;
  return `${event.regionId}发生了${event.type}`;
}

export class WorldSimulation {
  constructor(options = {}) {
    this.eventBus = options.eventBus || new EventBus();
    this.residentRegistry = options.residentRegistry || new ResidentRegistry();
    this.residentAgentSystem = options.residentAgentSystem || new ResidentAgentSystem({
      residentRegistry: this.residentRegistry
    });
    this.aiDirector = options.aiDirector || new AIDirector({
      worldSimulation: this
    });
    this.scheduleSystem = options.scheduleSystem || new ResidentScheduleSystem({
      residentRegistry: this.residentRegistry
    });
    this.rumorSystem = options.rumorSystem || new ResidentRumorSystem({
      residentRegistry: this.residentRegistry,
      eventBus: this.eventBus
    });
    this.explorationDirector = new ExplorationDirector(this);
    this.futureHooks = new Map();
  }

  recordGameEvent(rawEvent) {
    const event = this.eventBus.emit(rawEvent);
    this.ensureResidentFromEvent(event);
    this.residentAgentSystem.observeEvent(event);
    for (const hook of this.deriveFutureHooks(event)) {
      this.addFutureHook(event.regionId, hook);
    }
    return event;
  }

  ensureResidentFromEvent(event) {
    const payload = event.payload || {};
    if (!payload.residentId) return null;
    const resident = this.residentRegistry.upsertResident({
      residentId: payload.residentId,
      name: payload.unitName || payload.residentName || payload.residentId,
      currentRegionId: event.regionId,
      homeRegionId: event.regionId,
      mood: event.type === 'unit_lost' ? 'grieving' : 'alert',
      currentGoal: event.type === 'unit_lost'
        ? 'leave a trace for whoever can still help'
        : 'decide whether to trust the player again'
    });
    return resident;
  }

  deriveFutureHooks(event) {
    const hooks = [];
    const payload = event.payload || {};

    if (event.type === 'unit_rescued' && payload.residentId) {
      hooks.push({
        id: hookId('resident_migration', event.id),
        type: 'resident_migration',
        sourceEventId: event.id,
        sourceRegionId: event.regionId,
        residentId: payload.residentId,
        summary: `${payload.unitName || '被救居民'}可能在后续区域再次出现`,
        priority: 0.8
      });
    }

    if (event.type === 'unit_lost') {
      hooks.push({
        id: hookId('missing_person', event.id),
        type: 'missing_person',
        sourceEventId: event.id,
        sourceRegionId: event.regionId,
        residentName: payload.unitName || '未知居民',
        summary: `${payload.unitName || '某人'}的失踪会留下遗物、传闻或关系后果`,
        priority: 0.7
      });
    }

    if (event.type === 'creation_placed' && Number(payload.entropyDelta || 0) > 0) {
      hooks.push({
        id: hookId('entropy_scar', event.id),
        type: 'entropy_scar',
        sourceEventId: event.id,
        sourceRegionId: event.regionId,
        creationName: payload.creationName || '未命名造物',
        ability: payload.ability || 'unknown',
        summary: `「${payload.creationName || '未命名造物'}」留下的裂隙可能污染未来区域`,
        priority: Math.min(1, 0.4 + Number(payload.entropyDelta || 0) * 0.2)
      });
    }

    if (event.type === 'region_lost') {
      hooks.push({
        id: hookId('region_aftermath', event.id),
        type: 'region_aftermath',
        sourceEventId: event.id,
        sourceRegionId: event.regionId,
        summary: `${event.regionId}失败后的后果会影响附近区域`,
        priority: 0.9
      });
    }

    if (event.type === 'defense_resolved') {
      hooks.push({
        id: hookId('night_watch_legend', event.id),
        type: 'night_watch_legend',
        sourceEventId: event.id,
        sourceRegionId: event.regionId,
        summary: `长夜守城的结果会影响第七天的传说与裂隙压力`,
        priority: event.payload?.victory ? 0.8 : 0.95
      });
    }

    if (event.type === 'airspace_resolved') {
      hooks.push({
        id: hookId('airspace_ending', event.id),
        type: 'airspace_ending',
        sourceEventId: event.id,
        sourceRegionId: event.regionId,
        summary: `第七天裂隙空域的${event.payload?.outcome === 'victory' ? '清算' : '坠落'}会修饰最终结局`,
        priority: event.payload?.outcome === 'victory' ? 0.9 : 1
      });
    }

    return hooks;
  }

  addFutureHook(regionId, hook) {
    if (!this.futureHooks.has(regionId)) this.futureHooks.set(regionId, []);
    const hooks = this.futureHooks.get(regionId);
    if (!hooks.some(existing => existing.id === hook.id)) hooks.push(hook);
  }

  getFutureHooks(regionId = null) {
    if (regionId) return [...(this.futureHooks.get(regionId) || [])];
    return Array.from(this.futureHooks.values()).flat();
  }

  proposeExplorationChoices(options = {}) {
    const sourceRegionId = options.sourceRegionId || 'unknown';
    const count = options.count || 3;
    const hooks = this.getFutureHooks(sourceRegionId);
    const baseChoices = [];

    for (let i = 0; i < count; i++) {
      const hook = hooks[i];
      const id = hook ? hook.id : `exploration-${sourceRegionId}-${i}`;
      const title = hook ? hook.summary : `探索区域 ${sourceRegionId} 的未知方向 ${i + 1}`;
      baseChoices.push({
        id,
        title,
        regionId: hook?.sourceRegionId || sourceRegionId,
        hookType: hook?.type || 'exploration',
        priority: hook?.priority || 0.5
      });
    }

    // 用旧版 ExplorationDirector 补充风险等级/描述/承诺等丰富信息
    try {
      const enriched = this.explorationDirector.buildChoices({
        sourceRegionId,
        hooks: baseChoices
      });
      if (Array.isArray(enriched) && enriched.length > 0) {
        return enriched;
      }
    } catch (_) {
      // 降级返回基础选择项
    }

    return baseChoices;
  }

  async resolveExplorationChoice(choiceId, options = {}) {
    return {
      id: choiceId,
      title: options.title || '未命名区域',
      units: options.units || [],
      objective: options.objective || 'requiredRescue',
      win: options.win || 'requiredRescue'
    };
  }

  tickResidents(regionId, context = {}) {
    const actions = this.residentAgentSystem.tickRegion(regionId, context);
    for (const action of actions) {
      this.eventBus.emit({
        type: 'resident_action',
        regionId: action.regionId,
        actorId: action.residentId,
        turn: action.turn,
        payload: action,
        importance: action.type === 'idle' ? 0.2 : 0.6,
        tags: ['resident', action.type]
      });
    }
    this.scheduleSystem.tick(context.turn || 0, this);
    this.rumorSystem.tick(context.turn || 0);
    return actions;
  }

  recordResidentDialogue(dialogueEvent = {}) {
    const event = this.eventBus.emit({
      type: 'resident_dialogue',
      regionId: dialogueEvent.regionId || 'unknown',
      actorId: dialogueEvent.residentId || 'unknown',
      turn: dialogueEvent.turn || 0,
      payload: {
        residentId: dialogueEvent.residentId,
        residentName: dialogueEvent.residentName,
        playerText: dialogueEvent.playerText,
        residentText: dialogueEvent.residentText,
        intent: dialogueEvent.intent,
        grounded: dialogueEvent.grounded === true
      },
      importance: 0.7,
      tags: ['dialogue', 'resident']
    });

    const resident = this.residentRegistry.getResident(dialogueEvent.residentId);
    if (resident && dialogueEvent.grounded === true) {
      resident.memories.push({
        type: 'resident_dialogue',
        text: dialogueEvent.residentText || '',
        turn: dialogueEvent.turn || 0,
        importance: 0.7
      });
    }

    return event;
  }

  serialize() {
    return {
      version: 1,
      eventBus: this.eventBus.serialize(),
      residentRegistry: this.residentRegistry.serialize(),
      residentAgentSystem: this.residentAgentSystem.serialize(),
      aiDirector: this.aiDirector.serialize(),
      scheduleSystem: this.scheduleSystem.serialize(),
      rumorSystem: this.rumorSystem.serialize(),
      futureHooks: Array.from(this.futureHooks.entries())
    };
  }

  deserialize(data = {}) {
    this.eventBus.deserialize(data.eventBus || {});
    this.residentRegistry.deserialize(data.residentRegistry || {});
    this.residentAgentSystem.deserialize(data.residentAgentSystem || {});
    this.aiDirector.deserialize(data.aiDirector || {});
    this.scheduleSystem.deserialize(data.scheduleSystem || {});
    this.rumorSystem.deserialize(data.rumorSystem || {});
    this.futureHooks = new Map(Array.isArray(data.futureHooks) ? data.futureHooks : []);
  }
}
