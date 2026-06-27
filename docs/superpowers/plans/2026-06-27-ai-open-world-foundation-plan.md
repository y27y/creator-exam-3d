# AI Open World Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 foundation for persistent residents and cross-region narrative continuity without changing the current 7x7 tactical gameplay.

**Architecture:** Add a thin world-simulation layer around the existing `GameEngine`. `GameEngine` remains the source of current-region tactical state; `WorldSimulation`, `EventBus`, and `ResidentRegistry` become the source of long-term world facts, persistent resident identity, and future story hooks.

**Tech Stack:** Native ES Modules, browser-compatible JavaScript, Node.js test runner in `debug/test-suite.js`, no new npm dependencies.

---

## Scope

This plan implements Phase 1 only. It does not implement full AI region generation, autonomous NPC planning, or new UI panels. Those depend on stable events and persistent resident identities, so they should be planned separately after this foundation passes tests.

## Current Improvement Areas

- Persistent NPC identity is the highest-priority gap. Current `NPCManager` recreates NPCs per level, so memory and relationships are too short for AI-driven continuity.
- Cross-region continuity needs structured facts. Current logs and generated narrative text are not enough because AI text cannot safely become long-term game truth.
- `GameEngine` already has hooks and persistent-world recording, but it lacks one canonical world-event outlet.
- Region generation should not be expanded before there is a `futureHook` mechanism; otherwise generated regions will feel disconnected.
- Quality gates are too narrow. `npm run check` currently checks only a few JS files, so new world-simulation modules need either direct inclusion or a small syntax-check helper.
- AI costs and retries need a later budget layer. For Phase 1, no new AI calls are added.
- Save data needs schema versioning before long-term world state expands. For Phase 1, serialization formats include explicit `version` fields.

## File Structure

- Create `public/js/eventBus.js`: canonical world event recording, filtering, listener dispatch, serialization.
- Create `public/js/residentRegistry.js`: stable resident identities, resident projection into current-region NPC shape, resident memories.
- Create `public/js/worldSimulation.js`: Phase 1 orchestration, game-event ingestion, resident memory updates, future-hook derivation.
- Modify `public/js/gameEngine.js`: add `onWorldEvent` hook and emit canonical events for creation placement, rescue, win, and loss.
- Modify `debug/test-suite.js`: add focused tests for `EventBus`, `ResidentRegistry`, `WorldSimulation`, and `GameEngine` event emission.
- Create `debug/syntax-check.js` and update `package.json` so `npm run check` validates all project JS files.

## Architecture Corrections To Preserve

- `NPCManager` objects are current-region projections, not the long-term resident source of truth.
- `ResidentRegistry` owns stable identity and long-term resident facts.
- `EventBus` owns factual history, not prose logs.
- `WorldSimulation` derives `futureHooks` from structured events, not from AI narrative text.
- AI-generated text can explain facts, but cannot create durable facts without a validated event.

---

### Task 1: Add EventBus

**Files:**
- Create: `public/js/eventBus.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write failing EventBus tests**

Add this near the existing narrative/AI-system tests in `debug/test-suite.js`:

```js
runner.test('EventBus - 应记录、查询并序列化世界事件', async () => {
  const { EventBus } = await import('../public/js/eventBus.js');
  const bus = new EventBus({ maxEvents: 3 });

  const first = bus.emit({
    type: 'creation_placed',
    regionId: 'flood-village',
    actorId: 'player',
    turn: 2,
    payload: { creationName: '云鲸群', entropyDelta: 1 },
    importance: 0.8,
    tags: ['creation', 'water']
  });

  runner.assert(first.id, '事件应生成id');
  runner.assertEqual(first.type, 'creation_placed', '事件类型应保留');
  runner.assertEqual(first.regionId, 'flood-village', '区域ID应保留');
  runner.assertEqual(first.payload.creationName, '云鲸群', 'payload应保留');

  bus.emit({ type: 'unit_rescued', regionId: 'flood-village', payload: { unitName: '小烛' }, tags: ['rescue'] });
  bus.emit({ type: 'region_resolved', regionId: 'flood-village', payload: { result: 'won' }, tags: ['region'] });
  bus.emit({ type: 'unit_lost', regionId: 'night-mine', payload: { unitName: '矿工甲' }, tags: ['loss'] });

  runner.assertEqual(bus.events.length, 3, '应按maxEvents裁剪旧事件');
  runner.assertEqual(bus.query({ type: 'unit_lost' }).length, 1, '应能按类型查询');
  runner.assertEqual(bus.query({ regionId: 'flood-village' }).length, 2, '应能按区域查询');
  runner.assertEqual(bus.query({ tag: 'region' }).length, 1, '应能按标签查询');

  const serialized = bus.serialize();
  const restored = new EventBus();
  restored.deserialize(serialized);
  runner.assertEqual(restored.events.length, 3, '反序列化应恢复事件');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node debug/test-suite.js
```

Expected: FAIL with module-not-found for `../public/js/eventBus.js`.

- [ ] **Step 3: Implement `public/js/eventBus.js`**

Create `public/js/eventBus.js`:

```js
const DEFAULT_MAX_EVENTS = 500;

function createId(prefix = 'event') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clampImportance(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.5;
  return Math.max(0, Math.min(1, number));
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map(String).filter(Boolean).slice(0, 12);
}

export class EventBus {
  constructor(options = {}) {
    this.maxEvents = Number.isFinite(options.maxEvents) ? Math.max(1, options.maxEvents) : DEFAULT_MAX_EVENTS;
    this.events = [];
    this.listeners = new Map();
  }

  emit(event) {
    if (!event || !event.type) {
      throw new Error('EventBus.emit requires an event with type');
    }

    const canonical = {
      id: event.id || createId(),
      type: String(event.type),
      regionId: event.regionId || 'unknown',
      actorId: event.actorId || 'system',
      turn: Number.isFinite(Number(event.turn)) ? Number(event.turn) : 0,
      timestamp: Number.isFinite(Number(event.timestamp)) ? Number(event.timestamp) : Date.now(),
      payload: event.payload && typeof event.payload === 'object' ? { ...event.payload } : {},
      importance: clampImportance(event.importance),
      tags: normalizeTags(event.tags)
    };

    this.events.push(canonical);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    this.dispatch(canonical);
    return canonical;
  }

  on(type, handler) {
    const eventType = String(type || '*');
    if (typeof handler !== 'function') {
      throw new Error('EventBus.on requires a function handler');
    }
    if (!this.listeners.has(eventType)) this.listeners.set(eventType, new Set());
    this.listeners.get(eventType).add(handler);
    return () => this.listeners.get(eventType)?.delete(handler);
  }

  dispatch(event) {
    for (const handler of this.listeners.get(event.type) || []) handler(event);
    for (const handler of this.listeners.get('*') || []) handler(event);
  }

  query(filter = {}) {
    return this.events.filter(event => {
      if (filter.type && event.type !== filter.type) return false;
      if (filter.regionId && event.regionId !== filter.regionId) return false;
      if (filter.actorId && event.actorId !== filter.actorId) return false;
      if (filter.tag && !event.tags.includes(filter.tag)) return false;
      return true;
    });
  }

  recent(count = 10) {
    return this.events.slice(-Math.max(0, count));
  }

  serialize() {
    return {
      version: 1,
      maxEvents: this.maxEvents,
      events: this.events.map(event => ({
        ...event,
        payload: { ...event.payload },
        tags: [...event.tags]
      }))
    };
  }

  deserialize(data = {}) {
    this.maxEvents = Number.isFinite(data.maxEvents) ? Math.max(1, data.maxEvents) : this.maxEvents;
    this.events = Array.isArray(data.events)
      ? data.events.map(event => ({
          ...event,
          payload: event.payload && typeof event.payload === 'object' ? { ...event.payload } : {},
          tags: normalizeTags(event.tags),
          importance: clampImportance(event.importance)
        })).slice(-this.maxEvents)
      : [];
  }
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
node debug/test-suite.js
```

Expected: EventBus test passes. Existing tests should still pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/eventBus.js debug/test-suite.js
git commit -m "feat: add world event bus"
```

---

### Task 2: Add ResidentRegistry

**Files:**
- Create: `public/js/residentRegistry.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write failing ResidentRegistry tests**

Add this to `debug/test-suite.js`:

```js
runner.test('ResidentRegistry - 应为关键NPC提供稳定居民身份', async () => {
  const { ResidentRegistry } = await import('../public/js/residentRegistry.js');
  const registry = new ResidentRegistry();

  const xiaozhu = registry.getResident('resident-xiaozhu');
  runner.assert(xiaozhu, '应存在小烛居民档案');
  runner.assertEqual(xiaozhu.residentId, 'resident-xiaozhu', '小烛ID应稳定');
  runner.assert(xiaozhu.homeRegionId === 'flood-village', '小烛应归属洪水村庄');

  registry.recordMemory('resident-xiaozhu', {
    type: 'rescue',
    text: '玩家在洪水村庄救下了小烛',
    regionId: 'flood-village',
    importance: 0.9
  });

  const projection = registry.projectForRegion('resident-xiaozhu', 'highland-refuge');
  runner.assertEqual(projection.residentId, 'resident-xiaozhu', '当前区域投影应保留residentId');
  runner.assert(projection.memories.some(memory => memory.text.includes('救下了小烛')), '投影应包含长期记忆');

  const serialized = registry.serialize();
  const restored = new ResidentRegistry({ seedDefaults: false });
  restored.deserialize(serialized);
  runner.assert(restored.getResident('resident-xiaozhu'), '反序列化应恢复居民');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node debug/test-suite.js
```

Expected: FAIL with module-not-found for `../public/js/residentRegistry.js`.

- [ ] **Step 3: Implement `public/js/residentRegistry.js`**

Create `public/js/residentRegistry.js`:

```js
const MAX_RESIDENT_MEMORIES = 80;

export const DEFAULT_RESIDENTS = [
  {
    residentId: 'resident-old-fisherman',
    name: '老渔夫',
    role: '河边见证者',
    type: 'villager',
    homeRegionId: 'flood-village',
    personality: '沉稳、经验丰富、略带神秘',
    dialogueStyle: '说话慢，喜欢用比喻，经常提到水里的声音',
    mood: '担忧',
    attitudeToPlayer: '友善',
    aliases: ['old-fisherman', '老渔夫'],
    longTermGoal: '守住洪水村庄的记忆'
  },
  {
    residentId: 'resident-xiaozhu',
    name: '小烛',
    role: '洪水村庄孩子',
    type: 'child',
    homeRegionId: 'flood-village',
    personality: '天真、活泼、充满想象力',
    dialogueStyle: '说话快，经常问问题，用词简单但富有诗意',
    mood: '好奇',
    attitudeToPlayer: '崇拜',
    aliases: ['child-xiaozhu', '小烛'],
    longTermGoal: '找到一个不会被洪水带走的家'
  },
  {
    residentId: 'resident-miner-ghost',
    name: '矿灯幽灵',
    role: '永夜矿井幽灵',
    type: 'ghost',
    homeRegionId: 'night-mine',
    personality: '忧郁、善良、渴望陪伴',
    dialogueStyle: '断断续续，经常停顿，声音像是从远处传来',
    mood: '孤独',
    attitudeToPlayer: '谨慎',
    aliases: ['miner-ghost', '矿灯幽灵'],
    longTermGoal: '确认矿井里的灯没有全部熄灭'
  },
  {
    residentId: 'resident-beast-tamer',
    name: '驯兽人',
    role: '巨兽研究者',
    type: 'scholar',
    homeRegionId: 'giant-city',
    personality: '理性、温和、博学',
    dialogueStyle: '用词准确，经常引用古籍，说话有条理',
    mood: '焦虑',
    attitudeToPlayer: '尊敬',
    aliases: ['beast-tamer', '驯兽人'],
    longTermGoal: '证明巨兽不是敌人'
  },
  {
    residentId: 'resident-border-poet',
    name: '边境诗人',
    role: '失语战争见证者',
    type: 'artist',
    homeRegionId: 'wordless-war',
    personality: '敏感、理想主义、善于观察',
    dialogueStyle: '富有诗意，经常隐喻，说话像朗诵诗歌',
    mood: '悲伤',
    attitudeToPlayer: '中立',
    aliases: ['border-poet', '边境诗人'],
    longTermGoal: '让两个部落重新听懂彼此'
  },
  {
    residentId: 'resident-memory-keeper',
    name: '守忆人',
    role: '圣树记忆守护者',
    type: 'elder',
    homeRegionId: 'memory-plague',
    personality: '温和、健忘但努力回忆、善良',
    dialogueStyle: '经常停顿回忆，话语中夹杂着过去的记忆碎片',
    mood: '困惑',
    attitudeToPlayer: '友善',
    aliases: ['memory-keeper', '守忆人'],
    longTermGoal: '保住每个被迷雾抹去的名字'
  },
  {
    residentId: 'resident-world-spirit',
    name: '世界之灵',
    role: '裂隙之地意识',
    type: 'spirit',
    homeRegionId: 'final-exam',
    personality: '超然、智慧、略带忧伤',
    dialogueStyle: '声音像风一样轻柔，用词古老而深刻，经常提到时间的流逝',
    mood: '平静',
    attitudeToPlayer: '审视',
    aliases: ['world-spirit', '世界之灵'],
    longTermGoal: '判断造物者是否能与世界共存'
  }
];

function cloneResident(resident) {
  return {
    residentId: resident.residentId,
    name: resident.name,
    role: resident.role,
    type: resident.type,
    homeRegionId: resident.homeRegionId,
    currentRegionId: resident.currentRegionId || resident.homeRegionId,
    personality: resident.personality,
    dialogueStyle: resident.dialogueStyle,
    mood: resident.mood || '平静',
    attitudeToPlayer: resident.attitudeToPlayer || '中立',
    longTermGoal: resident.longTermGoal || '在裂隙之地生存',
    currentGoal: resident.currentGoal || resident.longTermGoal || '观察世界变化',
    aliases: Array.isArray(resident.aliases) ? [...resident.aliases] : [],
    relationships: resident.relationships ? { ...resident.relationships } : {},
    memories: Array.isArray(resident.memories) ? resident.memories.map(memory => ({ ...memory })) : [],
    flags: resident.flags ? { ...resident.flags } : {}
  };
}

export class ResidentRegistry {
  constructor(options = {}) {
    this.residents = new Map();
    this.aliasIndex = new Map();
    if (options.seedDefaults !== false) {
      for (const resident of DEFAULT_RESIDENTS) this.registerResident(resident);
    }
  }

  registerResident(profile) {
    if (!profile?.residentId) {
      throw new Error('ResidentRegistry.registerResident requires residentId');
    }
    const resident = cloneResident(profile);
    this.residents.set(resident.residentId, resident);
    this.indexResident(resident);
    return resident;
  }

  indexResident(resident) {
    this.aliasIndex.set(resident.residentId, resident.residentId);
    this.aliasIndex.set(resident.name, resident.residentId);
    for (const alias of resident.aliases || []) {
      this.aliasIndex.set(alias, resident.residentId);
    }
  }

  resolveId(idOrAlias) {
    return this.aliasIndex.get(idOrAlias) || idOrAlias;
  }

  getResident(idOrAlias) {
    const residentId = this.resolveId(idOrAlias);
    return this.residents.get(residentId) || null;
  }

  getResidentsForRegion(regionId) {
    return Array.from(this.residents.values()).filter(resident =>
      resident.homeRegionId === regionId || resident.currentRegionId === regionId
    );
  }

  recordMemory(idOrAlias, memory) {
    const resident = this.getResident(idOrAlias);
    if (!resident) return null;
    const entry = {
      id: memory.id || `memory-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: memory.type || 'event',
      text: String(memory.text || ''),
      regionId: memory.regionId || resident.currentRegionId,
      timestamp: Number.isFinite(memory.timestamp) ? memory.timestamp : Date.now(),
      importance: Number.isFinite(memory.importance) ? Math.max(0, Math.min(1, memory.importance)) : 0.5
    };
    resident.memories.push(entry);
    if (resident.memories.length > MAX_RESIDENT_MEMORIES) {
      resident.memories = resident.memories.slice(-MAX_RESIDENT_MEMORIES);
    }
    return entry;
  }

  moveResident(idOrAlias, regionId) {
    const resident = this.getResident(idOrAlias);
    if (!resident) return null;
    resident.currentRegionId = regionId;
    return resident;
  }

  projectForRegion(idOrAlias, regionId) {
    const resident = this.getResident(idOrAlias);
    if (!resident) return null;
    return {
      id: resident.aliases[0] || resident.residentId,
      residentId: resident.residentId,
      name: resident.name,
      type: resident.type,
      location: regionId === resident.homeRegionId ? '故乡附近' : '旅途中',
      mood: resident.mood,
      attitude: resident.attitudeToPlayer,
      personality: resident.personality,
      dialogueStyle: resident.dialogueStyle,
      longTermGoal: resident.longTermGoal,
      currentGoal: resident.currentGoal,
      memories: resident.memories.slice(-20).map(memory => ({ ...memory })),
      dynamicTraits: {
        trustLevel: resident.attitudeToPlayer === '友善' || resident.attitudeToPlayer === '崇拜' ? 70 : 50,
        fearLevel: resident.mood === '恐惧' || resident.mood === '悲伤' ? 60 : 30,
        hopeLevel: resident.mood === '希望' || resident.mood === '好奇' ? 70 : 45
      }
    };
  }

  serialize() {
    return {
      version: 1,
      residents: Array.from(this.residents.values()).map(cloneResident)
    };
  }

  deserialize(data = {}) {
    this.residents.clear();
    this.aliasIndex.clear();
    for (const resident of data.residents || []) {
      this.registerResident(resident);
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
node debug/test-suite.js
```

Expected: ResidentRegistry test passes. Existing tests should still pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/residentRegistry.js debug/test-suite.js
git commit -m "feat: add persistent resident registry"
```

---

### Task 3: Add WorldSimulation And Future Hooks

**Files:**
- Create: `public/js/worldSimulation.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write failing WorldSimulation tests**

Add this to `debug/test-suite.js`:

```js
runner.test('WorldSimulation - 应从区域事件生成跨区域剧情钩子', async () => {
  const { WorldSimulation } = await import('../public/js/worldSimulation.js');
  const world = new WorldSimulation();

  world.recordGameEvent({
    type: 'unit_rescued',
    regionId: 'flood-village',
    actorId: 'player',
    turn: 3,
    payload: {
      unitName: '小烛',
      residentId: 'resident-xiaozhu'
    },
    tags: ['rescue', 'resident']
  });

  world.recordGameEvent({
    type: 'creation_placed',
    regionId: 'flood-village',
    actorId: 'player',
    turn: 4,
    payload: {
      creationName: '幼年太阳',
      ability: 'sun_blessing',
      entropyDelta: 2
    },
    tags: ['creation', 'entropy']
  });

  const hooks = world.getFutureHooks('flood-village');
  runner.assert(hooks.some(hook => hook.type === 'resident_migration'), '救援居民应生成迁移钩子');
  runner.assert(hooks.some(hook => hook.type === 'entropy_scar'), '高熵造物应生成污染钩子');

  const xiaozhu = world.residentRegistry.getResident('resident-xiaozhu');
  runner.assert(xiaozhu.memories.some(memory => memory.text.includes('小烛')), '居民应记住相关事件');

  const serialized = world.serialize();
  const restored = new WorldSimulation();
  restored.deserialize(serialized);
  runner.assert(restored.getFutureHooks('flood-village').length >= 2, '反序列化应恢复futureHooks');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node debug/test-suite.js
```

Expected: FAIL with module-not-found for `../public/js/worldSimulation.js`.

- [ ] **Step 3: Implement `public/js/worldSimulation.js`**

Create `public/js/worldSimulation.js`:

```js
import { EventBus } from './eventBus.js';
import { ResidentRegistry } from './residentRegistry.js';

function hookId(type, eventId) {
  return `hook-${type}-${eventId}`;
}

function eventText(event) {
  const payload = event.payload || {};
  if (event.type === 'unit_rescued') return `${payload.unitName || '某位居民'}在${event.regionId}被玩家救下`;
  if (event.type === 'unit_lost') return `${payload.unitName || '某位居民'}在${event.regionId}失踪或遇难`;
  if (event.type === 'creation_placed') return `玩家在${event.regionId}创造了「${payload.creationName || '未命名造物'}」`;
  if (event.type === 'region_resolved') return `${event.regionId}的危机被解决`;
  if (event.type === 'region_lost') return `${event.regionId}的危机留下了伤痕`;
  return `${event.regionId}发生了${event.type}`;
}

export class WorldSimulation {
  constructor(options = {}) {
    this.eventBus = options.eventBus || new EventBus();
    this.residentRegistry = options.residentRegistry || new ResidentRegistry();
    this.futureHooks = new Map();
  }

  recordGameEvent(rawEvent) {
    const event = this.eventBus.emit(rawEvent);
    this.updateResidentMemories(event);
    for (const hook of this.deriveFutureHooks(event)) {
      this.addFutureHook(event.regionId, hook);
    }
    return event;
  }

  updateResidentMemories(event) {
    const residentIds = new Set();
    if (event.payload?.residentId) residentIds.add(event.payload.residentId);
    for (const target of event.payload?.residentIds || []) residentIds.add(target);
    for (const target of event.payload?.targets || []) residentIds.add(target);

    for (const residentId of residentIds) {
      this.residentRegistry.recordMemory(residentId, {
        type: event.type,
        text: eventText(event),
        regionId: event.regionId,
        importance: event.importance
      });
    }
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

  serialize() {
    return {
      version: 1,
      eventBus: this.eventBus.serialize(),
      residentRegistry: this.residentRegistry.serialize(),
      futureHooks: Array.from(this.futureHooks.entries())
    };
  }

  deserialize(data = {}) {
    this.eventBus.deserialize(data.eventBus || {});
    this.residentRegistry.deserialize(data.residentRegistry || {});
    this.futureHooks = new Map(Array.isArray(data.futureHooks) ? data.futureHooks : []);
  }
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
node debug/test-suite.js
```

Expected: WorldSimulation test passes. Existing tests should still pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/worldSimulation.js debug/test-suite.js
git commit -m "feat: add world simulation future hooks"
```

---

### Task 4: Emit Canonical Events From GameEngine

**Files:**
- Modify: `public/js/gameEngine.js`
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write failing GameEngine event emission test**

Add this to `debug/test-suite.js`:

```js
runner.test('GameEngine - 应通过onWorldEvent发出规范世界事件', () => {
  const events = [];
  const game = new DebugGame({
    onWorldEvent: event => events.push(event)
  });
  game.levelIndex = 0;
  game.reset();

  const result = game.createAndPlace('造一座桥', 3, 3);
  runner.assertTrue(result.success, '造物应成功放置');
  runner.assert(events.some(event => event.type === 'creation_placed'), '应发出creation_placed事件');

  const villager = game.units.find(unit => unit.type === 'villager' && unit.status === 'active');
  game.rescueUnit(villager);
  runner.assert(events.some(event => event.type === 'unit_rescued'), '应发出unit_rescued事件');

  game.winLevel('测试通过');
  runner.assert(events.some(event => event.type === 'region_resolved'), '应发出region_resolved事件');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node debug/test-suite.js
```

Expected: FAIL because `DebugGame` does not pass constructor options to `GameEngine`, and `GameEngine` does not emit `onWorldEvent`.

- [ ] **Step 3: Modify `DebugGame` constructor to accept options**

In `debug/debugGame.js`, change:

```js
constructor() {
  super();
```

to:

```js
constructor(options = {}) {
  super(options);
```

- [ ] **Step 4: Add `onWorldEvent` hook and `emitWorldEvent` to `GameEngine`**

In `public/js/gameEngine.js`, extend the `hooks` object in the constructor:

```js
onCreationExpire: options.onCreationExpire || (() => {}),
onWorldEvent: options.onWorldEvent || (() => {})
```

Add this method near `updateWorldState`:

```js
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
  return event;
}
```

- [ ] **Step 5: Emit creation event from `place`**

In `public/js/gameEngine.js`, after:

```js
this.updateWorldState({ type: 'creation_placed', detail: card.name, creationName: card.name });
```

add:

```js
this.emitWorldEvent('creation_placed', {
  creationId: creation.id,
  creationName: card.name,
  ability: card.ability,
  x,
  y,
  entropyDelta: card.stabilityCost
}, {
  importance: Math.min(1, 0.4 + card.stabilityCost * 0.2),
  tags: ['creation', card.ability]
});
```

- [ ] **Step 6: Emit rescue event from `rescueUnit`**

In `public/js/gameEngine.js`, after:

```js
this.updateWorldState({ type: 'unit_rescued', detail: unit.name });
```

add:

```js
this.emitWorldEvent('unit_rescued', {
  unitId: unit.id,
  unitName: unit.name,
  unitType: unit.type,
  residentId: unit.residentId || null
}, {
  importance: 0.8,
  tags: ['rescue', unit.type]
});
```

- [ ] **Step 7: Emit win/loss region events**

In `winLevel`, after `persistentWorld.recordLevelCompletion(...)`, add:

```js
this.emitWorldEvent('region_resolved', {
  message,
  rescued: this.rescued,
  lost: this.lost,
  entropy: this.entropy,
  result: 'won'
}, {
  importance: 0.9,
  tags: ['region', 'victory']
});
```

In `failLevel`, after `persistentWorld.recordLevelCompletion(...)`, add:

```js
this.emitWorldEvent('region_lost', {
  message,
  rescued: this.rescued,
  lost: this.lost,
  entropy: this.entropy,
  result: 'lost'
}, {
  importance: 0.9,
  tags: ['region', 'loss']
});
```

- [ ] **Step 8: Run tests**

Run:

```bash
node debug/test-suite.js
```

Expected: GameEngine event emission test passes. Existing tests should still pass.

- [ ] **Step 9: Commit**

```bash
git add public/js/gameEngine.js debug/debugGame.js debug/test-suite.js
git commit -m "feat: emit canonical world events"
```

---

### Task 5: Connect WorldSimulation In Tests Without Changing UI

**Files:**
- Modify: `debug/test-suite.js`

- [ ] **Step 1: Write integration test**

Add this to `debug/test-suite.js`:

```js
runner.test('WorldSimulation集成 - GameEngine事件应生成futureHooks', async () => {
  const { WorldSimulation } = await import('../public/js/worldSimulation.js');
  const world = new WorldSimulation();
  const game = new DebugGame({
    onWorldEvent: event => world.recordGameEvent(event)
  });

  game.levelIndex = 0;
  game.reset();

  const villager = game.units.find(unit => unit.name === '小烛');
  villager.residentId = 'resident-xiaozhu';
  game.rescueUnit(villager);

  const hooks = world.getFutureHooks('flood-village');
  runner.assert(hooks.some(hook => hook.type === 'resident_migration'), '救下小烛应生成跨区域迁移钩子');

  const projection = world.residentRegistry.projectForRegion('resident-xiaozhu', 'highland-refuge');
  runner.assert(projection.memories.some(memory => memory.text.includes('小烛')), '小烛投影应保留救援记忆');
});
```

- [ ] **Step 2: Run tests**

Run:

```bash
node debug/test-suite.js
```

Expected: Integration test passes.

- [ ] **Step 3: Commit**

```bash
git add debug/test-suite.js
git commit -m "test: cover world simulation integration"
```

---

### Task 6: Improve Syntax Check Coverage

**Files:**
- Create: `debug/syntax-check.js`
- Modify: `package.json`

- [ ] **Step 1: Create syntax-check helper**

Create `debug/syntax-check.js`:

```js
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['server.js', 'public/js', 'debug'];
const files = [];

function collect(path) {
  const info = statSync(path);
  if (info.isFile() && extname(path) === '.js') {
    files.push(path);
    return;
  }
  if (!info.isDirectory()) return;
  for (const entry of readdirSync(path)) {
    collect(join(path, entry));
  }
}

for (const root of roots) collect(root);

let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) failed++;
}

if (failed > 0) {
  console.error(`Syntax check failed for ${failed} file(s).`);
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} JS file(s).`);
```

- [ ] **Step 2: Update package check script**

In `package.json`, change:

```json
"check": "node --check server.js && node --check public/js/aiClient.js && node --check public/js/levels.js && node --check public/js/game.js"
```

to:

```json
"check": "node debug/syntax-check.js"
```

- [ ] **Step 3: Run verification**

Run:

```bash
npm run check
node debug/test-suite.js
```

Expected: syntax check reports all JS files passed; test suite passes.

- [ ] **Step 4: Commit**

```bash
git add debug/syntax-check.js package.json
git commit -m "test: check syntax for all js files"
```

---

## Later Plans To Write Separately

### Phase 2 Resident Agent Plan

Build `ResidentAgentSystem`, event observation, memory retrieval, bounded local actions, and NPC dialogue that can cite prior-region facts. This plan should not start until Phase 1 proves stable resident identity and `futureHooks`.

### Phase 3 Region Manager Plan

Promote `/api/generate-region` into a validated `RegionManager` pipeline. The key improvement is not more AI text; it is `futureHooks -> candidate region -> RuleValidator -> loadable 7x7 region`.

### Phase 4 Memory And Save Plan

Unify `AIMemory`, `VectorMemory`, `CausalGraph`, `PersistentWorld`, and `ResidentRegistry` behind a schema-versioned `MemoryStore`. Include migration from existing `creator_exam_memory` localStorage data.

### Phase 5 UI Continuity Plan

Add a continuity panel showing “who remembers what”, “which prior event caused this area”, and “which unresolved hooks are active”. This is required for players to perceive the generated story as coherent.

### Phase 6 AI Budget And Reliability Plan

Add AI request budgeting, cache keys, retry policy, and local fallback reporting. No per-turn AI calls should be added until this is in place.

## Verification Before Execution Completion

Run these commands after all Phase 1 tasks:

```bash
npm run check
node debug/test-suite.js
git status --short
```

Expected:

- `npm run check` passes.
- `node debug/test-suite.js` passes.
- `git status --short` contains no unintended modifications beyond user-owned pre-existing worktree changes.

## Execution Notes

- Do not modify current gameplay balance in Phase 1.
- Do not add UI in Phase 1.
- Do not add new AI endpoints in Phase 1.
- Do not change existing localStorage keys in Phase 1.
- Keep commits small and task-scoped.
