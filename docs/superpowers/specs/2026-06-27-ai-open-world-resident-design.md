# AI开放世界与数字居民系统设计

日期：2026-06-27

## 目标

把《造物者考核3D》从“AI造物驱动的关卡制策略解谜”升级为“AI居民与AI区域共同驱动的开放探索世界”。玩家仍通过自然语言造物影响世界，但故事不再主要来自预设关卡文本，而是从玩家行为、NPC自主行动、区域生成、记忆传播和因果后果中自然生长。

核心体验目标：

- 玩家可以连续探索由AI生成但受规则验证的7x7区域网络。
- NPC不只是任务提供者，而是有记忆、情绪、关系、目标和行动计划的数字居民。
- 关键NPC必须是持久居民，而不是每个区域临时生成的一次性角色。
- 玩家每次造物、救援、失败、对话都会被记录为世界事件，并影响后续区域、NPC态度和支线故事。
- 叙事文本由AI辅助生成，但世界状态变化必须由可测试的本地规则执行。

非目标：

- 不做无限大实时开放世界。
- 不做完全自由的LLM直接改写游戏状态。
- 不在第一阶段引入语音、实时多人、建筑经营或复杂经济系统。
- 不推倒现有`GameEngine`、造物系统、NPC系统和测试套件。

## 参考

- Generative Agents: Interactive Simulacra of Human Behavior: https://arxiv.org/abs/2304.03442
- Voyager: An Open-Ended Embodied Agent with Large Language Models: https://arxiv.org/abs/2305.16291
- AI Town: https://github.com/a16z-infra/ai-town
- NVIDIA ACE for Games: https://developer.nvidia.com/ace-for-games
- Convai Actions docs: https://docs.convai.com/api-docs/plugins-and-integrations/unity-plugin/adding-actions-to-your-character

采用原则：

- 从Generative Agents借鉴“观察、记忆、反思、计划、行动”的居民循环。
- 从Voyager借鉴“探索反馈、技能沉淀、长期开放目标”的结构，但不复制Minecraft式无限技能生成。
- 从AI Town借鉴多居民模拟和事件流，但保持本项目的回合制、小地图、强规则验证。
- 从NVIDIA ACE和Convai借鉴“AI角色可以对话和触发动作”，但动作必须收敛为本地枚举。

## 当前基础

项目已经具备可复用基础：

- `GameEngine`：单关卡核心逻辑、7x7地图、回合结算、单位移动、灾害、胜负判定。
- `aiClient`：自然语言造物编译，AI优先、本地兜底。
- `server.js`：已有`/api/compile-creation`、`/api/narrative`、`/api/generate-region`。
- `NPCManager`：NPC情绪、记忆、态度、对话上下文。
- `SocialGraph`：关系网、知识传播、秘密、阴谋。
- `AIMemory`和`VectorMemory`：玩家行为记忆和语义检索。
- `WorldLegend`和`CausalGraph`：因果事件、蝴蝶效应、世界传说。
- `PersistentWorld`和`LegacySystem`：跨关卡角色延续。

主要缺口：

- 缺少统一事件总线，玩家行为、NPC反应、区域生成和叙事触发散落在不同模块。
- NPC有状态但没有自主行动循环。
- NPC身份仍主要绑定关卡，缺少跨区域、跨会话的居民身份注册表。
- `/api/generate-region`存在，但尚未成为探索世界的主流程。
- AI生成主要用于文本和卡牌，缺少“生成内容 -> 规则验证 -> 本地执行 -> 记忆沉淀”的闭环。

## 架构选择

### 方案一：整体重构为开放世界引擎

重写`GameEngine`，把关卡、区域、NPC、事件、地图统一到一个新引擎中。

优点：

- 架构最干净。
- 长期扩展空间最大。

缺点：

- 风险极高，会破坏现有24个模块和测试。
- 短期看不到可玩结果。
- AI系统和游戏规则会同时变化，难以定位问题。

结论：不采用。

### 方案二：在现有项目上增加世界模拟层

保留`GameEngine`作为“当前区域战术模拟器”，新增`WorldSimulation`作为外层开放世界调度器。

优点：

- 现有玩法和测试能继续使用。
- AI区域生成、NPC居民模拟、因果记忆可以逐步接入。
- 每个阶段都有可验证产物。

缺点：

- 初期会同时存在“关卡状态”和“世界状态”，需要严格定义所有权。
- 需要引入事件总线和状态同步约束。

结论：推荐采用。

### 方案三：接入外部AI NPC平台

使用Inworld、Convai、NVIDIA ACE等服务作为NPC大脑。

优点：

- 对话和角色表现成熟。
- 可快速获得自然语言互动效果。

缺点：

- 项目核心机制会被外部平台锁定。
- 本地测试、离线兜底和平衡验证困难。
- 容易变成“会聊天的NPC”，而不是“会改变世界的居民”。

结论：只作为未来可选适配层，不作为核心架构。

## 推荐架构

新增`WorldSimulation`层：

```text
WorldSimulation
  EventBus
  RegionManager
  ResidentAgentSystem
  MemoryStore
  NarrativeDirector
  RuleValidator
  WorldStateStore

GameEngine
  current 7x7 region simulation
```

边界原则：

- `WorldSimulation`拥有长期世界状态。
- `GameEngine`只拥有当前区域的短期战术状态。
- `NPCManager`继续管理当前区域可见NPC，但长期居民档案由`ResidentAgentSystem`拥有。
- `ResidentAgentSystem`必须维护稳定居民ID；区域只引用居民，不重新定义关键NPC。
- `server.js`可以请求AI生成候选内容，但所有候选内容必须经过`RuleValidator`后才能进入游戏。
- AI可以生成意图、解释、对话和候选区域，但不能直接修改`terrain`、`units`、`entropy`或胜负状态。

## 核心模块

### EventBus

统一记录所有世界事件。

事件示例：

```js
{
  id,
  type: 'creation_placed',
  turn,
  regionId,
  actorId: 'player',
  targets: ['old-fisherman'],
  payload: {
    creationName,
    ability,
    x,
    y,
    entropyDelta
  },
  importance: 0.7,
  tags: ['creation', 'water', 'rescue']
}
```

职责：

- 接收`GameEngine`、`NPCManager`、`RegionManager`产生的事件。
- 计算事件重要性。
- 广播给居民、记忆系统、因果图、叙事导演。
- 支持序列化和回放，便于测试。

### ResidentAgentSystem

把NPC升级为数字居民。

核心约束：

- 每个关键NPC拥有稳定`residentId`，跨区域、跨关卡、跨存档保持不变。
- 区域生成只能请求“哪些居民出现”和“是否生成新居民候选”，不能覆盖已有居民档案。
- 新居民候选必须先进入居民注册表，再被区域引用。
- 关卡单位和NPC同名时必须合并身份或显式标记为不同实体，避免“小烛既是村民单位又是独立NPC”的混乱。

居民档案：

```js
{
  id,
  residentId,
  name,
  role,
  homeRegionId,
  currentRegionId,
  personality,
  dialogueStyle,
  mood,
  attitudeToPlayer,
  longTermGoal,
  currentGoal,
  routine,
  relationships,
  memories,
  secrets,
  skills,
  pendingActions
}
```

每回合循环：

```text
observe events
retrieve relevant memories
update mood and relationships
select or revise current goal
plan one bounded action
execute local action
emit resulting event
```

允许的行动必须是枚举：

- `speak`：生成一句对话或传闻。
- `move_region`：迁移到相邻区域。
- `move_tile`：在当前7x7区域移动。
- `assist_unit`：给单位短期引导、免疫混乱、恢复等。
- `request_help`：向玩家生成支线请求。
- `spread_knowledge`：通过`SocialGraph`传播秘密或传闻。
- `change_relationship`：调整关系强度。
- `create_minor_event`：生成低风险局部事件。
- `withdraw`：因恐惧、愤怒或受伤暂时离开。

AI只负责选择“行动意图”和生成自然语言说明。本地代码负责检查行动是否合法并执行。

### RegionManager

负责开放探索世界。

区域数据：

```js
{
  id,
  title,
  biome,
  crisis,
  status: 'locked' | 'available' | 'active' | 'resolved' | 'lost',
  map,
  units,
  hazards,
  residents,
  entrances,
  exits,
  history,
  unresolvedThreads,
  consequencesFromPreviousRegions
}
```

生成流程：

```text
collect world summary
collect unresolved threads
collect relevant NPC memories
request AI region candidate
validate 7x7 map and units
simulate reachability and difficulty
repair or fallback if invalid
add region to world graph
```

区域之间是图，而不是线性关卡：

```text
flood-village
  -> highland-refuge
  -> broken-bridge
  -> river-spirit-shrine
```

第一版仍使用7x7地图，因为它能复用现有寻路、灾害、造物和测试体系。

### MemoryStore

统一长期记忆。

分三类：

- 玩家记忆：造物偏好、救援倾向、风险偏好、对NPC承诺。
- NPC记忆：亲历事件、对玩家态度、重要对话、未完成目标。
- 世界记忆：区域历史、灾害后果、传说、因果链。

现有`AIMemory`、`VectorMemory`、`CausalGraph`不废弃，改为由`MemoryStore`包装和调度。

### NarrativeDirector

叙事导演不负责“编剧情”，只负责判断哪些事件值得讲述。

输入：

- 最近事件流。
- 玩家画像。
- NPC记忆和关系。
- 当前区域危机。
- 未解决故事线。

输出：

- 编年史日志。
- NPC主动对话。
- 区域传闻。
- 支线提示。
- 结局或阶段总结。

叙事触发策略：

- 高重要性事件必讲。
- 重复低价值事件不讲。
- 涉及长期承诺、背叛、救援、牺牲、区域毁灭的事件优先。
- AI生成失败时使用本地模板兜底。

### RuleValidator

所有AI候选内容必须经过验证。

验证内容：

- 地图必须是7x7。
- 地形符号合法。
- 起点到目标可达。
- 单位数量在合理范围。
- 危机参数不会必败或无挑战。
- NPC行动不能越权。
- 对话不能直接给予不可验证奖励。
- 生成区域必须能序列化和导入`GameEngine`。

如果验证失败：

1. 尝试本地修复。
2. 降级参数。
3. 使用本地模板区域。
4. 记录AI失败原因用于调试。

## 数据流

### 当前区域回合

```text
player action
  -> GameEngine applies rule effect
  -> EventBus records canonical event
  -> MemoryStore indexes event
  -> ResidentAgentSystem updates residents
  -> ResidentAgentSystem emits bounded actions
  -> RuleValidator validates actions
  -> GameEngine applies legal actions
  -> NarrativeDirector emits story logs
```

### 区域完成

```text
GameEngine win/loss
  -> EventBus emits region_resolved or region_lost
  -> MemoryStore stores outcome
  -> ResidentAgentSystem updates long-term resident state
  -> RegionManager proposes next available regions
  -> RuleValidator validates region candidates
  -> UI presents exploration choices
```

### NPC对话

```text
player talks to NPC
  -> build resident context
  -> retrieve memories and relationship state
  -> AI generates dialogue and intent candidate
  -> RuleValidator maps intent to allowed action
  -> EventBus records dialogue event
  -> MemoryStore updates NPC/player memory
```

## 需要改造的现有系统

### `GameEngine`

保留核心逻辑，但新增轻量钩子：

- `onWorldEvent(event)`
- `loadRegion(regionData)`
- `exportRegionResult()`

不要把长期居民逻辑塞进`GameEngine`。

### `game.js`

增加探索UI：

- 当前世界图谱摘要。
- 可探索区域列表。
- 居民面板。
- NPC对话入口。

渲染仍只关心当前7x7区域。

### `NPCManager`

短期内保留为“当前区域NPC适配层”。长期状态迁移到`ResidentAgentSystem`。

需要拆分：

- 当前区域显示状态：留在`NPCManager`。
- 长期人格、目标、记忆、作息：放入`ResidentAgentSystem`。

### `server.js`

新增或收敛AI端点：

- `/api/generate-region`：保留，改成只返回候选区域。
- `/api/npc-intent`：生成居民下一步意图候选。
- `/api/npc-dialogue`：生成对话文本和可验证意图。
- `/api/narrative`：继续生成叙事文本。

所有端点都必须支持失败兜底。

## 文件规划

新增文件：

- `public/js/worldSimulation.js`
- `public/js/eventBus.js`
- `public/js/regionManager.js`
- `public/js/residentAgent.js`
- `public/js/memoryStore.js`
- `public/js/narrativeDirector.js`
- `public/js/ruleValidator.js`

测试文件：

- 在`debug/test-suite.js`增加对应单元测试和集成测试。
- 可选新增`debug/world-sim-scenarios.js`做长流程模拟。

文档：

- 更新`docs/systems/architecture.md`。
- 更新`README.md`的玩法描述和AI叙事技术栈。

## 状态所有权

避免状态混乱的硬规则：

- `WorldSimulation`是长期状态唯一来源。
- `GameEngine`是当前区域即时状态唯一来源。
- 当前区域结束后，`GameEngine`只导出结果，不保留世界历史。
- 居民长期档案不能直接从`NPCManager`改，必须通过`ResidentAgentSystem`。
- `NPCManager`里的NPC对象是居民档案在当前区域的投影，不能成为长期事实来源。
- 区域数据只能保存居民引用，例如`residentIds`，不能复制关键NPC的完整长期记忆。
- AI返回的数据永远是候选，不是事实。
- 所有事实变化必须通过`EventBus`记录。

## UI设计方向

右侧保留造物输入。

左侧增加世界层信息：

- 当前区域。
- 区域历史。
- 居民状态。
- 未解决线索。

通关后弹窗不再只有“下一关”，而是展示2到3个可探索区域：

- 安全但信息少的区域。
- 危险但能推进NPC目标的区域。
- 与玩家过去选择强相关的区域。

NPC对话入口可以先做成面板按钮，不必做3D场景中的复杂交互。

## 测试策略

必须新增测试：

- `EventBus`能记录、过滤、序列化事件。
- `RuleValidator`拒绝非法地图、非法单位、不可达目标。
- `RegionManager`在AI失败时能生成本地兜底区域。
- `ResidentAgentSystem`能从事件更新情绪、目标和记忆。
- NPC行动只能产生允许枚举。
- 区域完成后能生成至少一个有效后续区域。
- 长流程模拟10个回合不会产生无法序列化状态。

验收命令：

```bash
npm run check
node debug/test-suite.js
```

如果新增长流程脚本：

```bash
node debug/world-sim-scenarios.js
```

## 分阶段计划

### Phase 1：世界事件骨架

输出：

- `EventBus`
- `WorldSimulation`最小壳
- `ResidentRegistry`或等价的稳定居民身份注册表
- `GameEngine`关键事件接入
- 事件序列化测试

验收：

- 当前游戏行为不变。
- 玩家造物、救援、失败、胜利都会进入事件流。
- 老渔夫、小烛等关键NPC拥有稳定居民ID，并能被后续区域引用。

### Phase 2：居民Agent闭环

输出：

- `ResidentAgentSystem`
- 现有`NPCManager`与长期居民档案的适配层
- NPC观察事件、更新记忆和情绪、生成本地枚举行动
- 简单NPC主动对话

验收：

- NPC不是随机说话，而是基于最近事件和个人记忆回应。
- NPC行动能影响当前区域的小状态，例如短期引导、传播知识、请求帮助。
- 同一个居民跨区域出现时保留关系、记忆和长期目标。

### Phase 3：AI区域探索

输出：

- `RegionManager`
- AI候选区域生成和本地验证
- 通关后的区域选择UI

验收：

- 关卡结束后出现2到3个有效区域选择。
- AI失败时使用本地兜底。
- 新区域可载入现有`GameEngine`。

### Phase 4：长期因果与支线

输出：

- `MemoryStore`
- `NarrativeDirector`
- NPC跨区域迁移和未解决线索

验收：

- 被玩家影响过的NPC能在未来区域出现。
- 玩家过去选择能影响区域危机、居民态度或支线请求。

### Phase 5：开放世界打磨

输出：

- 世界图谱UI。
- 居民关系面板。
- 支线故事摘要。
- 存档导入导出。

验收：

- 玩家能理解“我做过什么、谁记得、世界哪里因此改变”。

## 关键风险

### 风险一：AI生成失控

缓解：

- AI只生成候选。
- 所有地图、行动、奖励、危机都通过`RuleValidator`。
- 保留本地兜底模板。

### 风险二：NPC变成昂贵台词机

缓解：

- 每次NPC对话都必须产生一个可记录的意图或记忆变化。
- NPC行动必须能被事件流追踪。
- 对话不是主循环，行动和记忆才是主循环。

### 风险三：状态双写

缓解：

- 明确`WorldSimulation`和`GameEngine`状态所有权。
- 长期状态只由事件归约得到。
- 禁止模块直接互相改长期状态。

### 风险四：项目过早膨胀

缓解：

- 区域继续使用7x7。
- 居民行动先限制在8种枚举。
- 第一阶段不引入经济、建筑、语音或实时模拟。

## 开放问题

- AI调用预算是否要限制为“每区域生成一次，每NPC关键对话一次”，避免每回合大量请求？
- 是否需要完整存档系统，还是先使用`localStorage`维持世界状态？
- NPC行动是否可以在玩家回合外自动发生，还是只在结束回合后统一结算？
- 第一个示范居民应选择谁：老渔夫、小烛、守忆人，还是新建一个跨区域向导？

## 成功标准

第一版成功不以“地图有多大”衡量，而以以下标准衡量：

- 玩家能连续探索至少3个AI生成或半生成区域。
- 至少2个NPC能记住玩家行为并在后续区域产生不同反应。
- 至少1个NPC能跨区域出现，并保留稳定身份、记忆、关系和目标。
- 至少1条支线不是预写脚本，而是由事件、记忆和区域生成共同形成。
- 所有AI失败场景都有本地兜底。
- 测试能证明生成区域合法、居民行动合法、长期状态可序列化。
