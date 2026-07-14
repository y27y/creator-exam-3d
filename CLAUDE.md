# CLAUDE.md — 造物者考核3D 项目上下文

> 本文档为AI助手提供项目背景、架构决策、开发规范和迭代指导。

---

## 项目概述

**名称**：造物者考核3D (Creator Exam 3D)
**类型**：AI驱动3D策略解谜游戏
**核心机制**：自然语言造物 → AI/本地编译 → 3D格子地图策略 → 长夜守城 → 裂隙空域 → 多时间线终章
**当前状态**：完整可体验展示版
**代码规模**：103个JavaScript文件，覆盖主游戏、两种终局战斗模式、终章与自动验证工具

---

## 架构决策

### 1. 无框架后端
- 使用Node.js原生http模块，无Express依赖
- 理由：减少依赖、轻量、足够处理静态文件+AI代理
- 注意：手动处理路由、CORS、静态文件服务

### 2. ES Modules
- 全部使用`import/export`，不使用CommonJS
- 前端通过importmap加载Three.js
- 后端package.json设置`"type": "module"`

### 3. 三层架构
```
GameEngine (核心逻辑) ← 可测试、无DOM依赖
  ↑ 继承
CreatorExam3D (3D渲染+UI) ← 浏览器环境
  ↑ 继承
DebugGame (CLI调试) ← Node.js环境
```

### 4. AI + 本地兜底
- 优先调用AI API编译自然语言
- 5秒超时后自动切换到本地编译器
- 本地编译器使用正则+模板匹配，保证离线可玩

### 5. 无npm依赖
- 项目零依赖（除Node.js标准库）
- Three.js通过CDN加载
- 测试套件使用原生Node.js

---

## 开发规范

### 代码风格
- 使用单引号字符串
- 缩进2个空格
- 无分号（除必要情况）
- 注释使用中文（项目面向中文玩家）
- 类名使用PascalCase，函数/变量使用camelCase
- 常量使用UPPER_SNAKE_CASE

### 文件组织
- 每个系统一个文件，位于`public/js/`
- 测试文件在`debug/`
- 文档在`docs/`
- 归档文档在`docs/archive/`

### 命名约定
- 系统类：`XxxSystem`（如EnemyIntentSystem）
- 管理类：`XxxManager`（如NPCManager）
- 数据类：`Xxx`（如IntentPreview）
- 常量对象：`UPPER_SNAKE_CASE`（如INTENT_TYPES）

### 测试规范
- 每个新系统必须添加测试
- 测试覆盖：单元测试 + 集成测试 + 边界测试
- 测试命名：`testXxxYyy()`
- 断言使用`assertTrue()` / `assertEquals()`
- 目标：100%测试通过率

---

## AI集成说明

### 1. AI API端点
```
POST /api/compile-creation
  Body: { text: "自然语言描述" }
  Response: { card: { ability, range, duration, cost, ... } }

POST /api/narrative
  Body: { type, context }
  Response: { narrative: "叙事文本" }
```

### 2. 提示词工程
- 系统提示词定义世界观、角色、约束
- 用户提示词包含当前游戏状态
- 强制要求JSON格式输出
- 提供完整示例（few-shot prompting）

### 3. 本地编译器 (localCompile)
- 关键词映射：自然语言关键词 → 能力类型
- 创意评分：诗意词汇+修辞手法+直接能力词
- 数值生成：基于创意评分调整range/duration/cost
- 兜底机制：AI失败时自动切换

### 4. 创意评分算法
```javascript
score = 基础分(50)
  + 诗意词汇分(每个+5)
  + 修辞手法分(比喻+10, 拟人+10)
  + 直接能力词分(+15)
  - 重复惩罚(-10)
  - 空泛惩罚(-20)

if score >= 60: cost-1, range+1
if score >= 75: 额外duration+1
if score <= 35: cost+1
```

---

## 迭代历史

### 第1-4轮：核心基础
- 修复边界条件、平衡性调整
- 重构能力处理为策略模式
- NPC动态系统、连锁反应图鉴、单位传承
- 提取GameEngine基类、AI Storyteller、多结局分支

### 第5-7轮：持久化与社交
- 跨关卡持久化、涌现式世界传说
- 社交图谱、向量记忆、持久世界状态

### 第8-9轮：叙事深度
- 叙事因果引擎、认知效果、生成式神话语法
- 秘密知识经济、语义验证层

### 第10-12轮：策略系统
- 仪式熔炉、认知深渊、验证腐化

### 第13-16轮：高级机制
- 言灵誓约、裂隙回响、造物者工坊、敌方意图预览

---

## 未来可选扩展

以下方向不影响当前完整流程，仅作为后续产品化或平台化扩展：

### 叙事生成（用户最关注）
- AI生成支线任务系统（基于CausalGraph和VectorMemory）
- 更开放的自然语言NPC对话
- 基于玩家行为的动态支线生成
- 多模态叙事与更多本地化演出

### 游戏性
- 动态难度调整
- 更多连锁反应组合
- 玩家关卡编辑器
- 平台成就系统

### 技术
- TypeScript迁移
- Web Workers与GPU侧性能优化
- 移动端触控适配
- 多语言支持

---

## 子代理任务分配

当任务涉及>5个独立文件时，启动并行子代理：

### 子代理1：叙事系统
- 负责：storyteller.js, worldLegend.js, causalGraph, cognitiveEffects.js
- 专长：AI叙事生成、世界传说、因果推理

### 子代理2：NPC与社交
- 负责：npcManager.js, socialGraph.js, legacySystem.js, persistentWorld.js
- 专长：NPC行为、关系网络、持久化

### 子代理3：策略系统
- 负责：chainReactionCodex.js, ritualForge.js, oathbinding.js, cognitiveAbyss.js
- 专长：游戏机制、策略深度、平衡性

### 子代理4：UI与渲染
- 负责：game.js, particles.js, index.html, styles.css
- 专长：3D渲染、UI交互、视觉特效

### 子代理5：测试与质量
- 负责：test-suite.js, test-runner.js, debugGame.js
- 专长：测试设计、边界条件、性能测试

---

## 关键文件索引

| 文件 | 职责 | 行数 | 最后修改 |
|------|------|------|----------|
| game.js | 3D渲染+UI | ~8,300 |
| gameEngine.js | 核心逻辑 | ~2,700 |
| aiClient.js | AI编译 | ~400 |
| storyteller.js | AI叙事 | ~600 |
| npcManager.js | NPC系统 | ~1,100 |
| chainReactionCodex.js | 连锁反应 | ~500 |
| creatorWorkshop.js | 工坊 | ~600 |
| enemyIntent.js | 意图预览 | ~600 |
| test-suite.js | 综合测试套件 | ~5,200 |

---

## 常见陷阱

1. **GameEngine与game.js重复**：所有新逻辑必须放在gameEngine.js，game.js只负责渲染
2. **AI API超时**：始终提供本地编译器兜底，避免游戏卡死
3. **边界条件**：地图坐标[0,6]，注意检查x/y范围
4. **状态共享**：GameEngine实例在浏览器和Node.js环境都使用，避免DOM依赖
5. **测试隔离**：每个测试必须独立，使用`game.reset()`清理状态

---

## 性能基准

- 3D渲染：60fps（InstancedMesh优化后）
- 寻路算法：<10ms（7x7地图，LRU缓存）
- AI编译：<5s（超时自动切换本地）
- 关键语法、现实契约与教学回归可在本地数秒内完成
- 内存占用：<100MB（浏览器）

---

## 扩展指南

### 添加新系统
1. 在`public/js/`创建新模块
2. 在`GameEngine`或`DebugGame`中实例化
3. 在`test-suite.js`添加测试
4. 在`docs/systems/architecture.md`更新
5. 在`README.md`更新特性列表

### 添加新能力
1. 在`abilityHandlers.js`添加策略函数
2. 在`aiClient.js`添加关键词映射
3. 在`chainReactionCodex.js`更新共鸣组合
4. 在`test-suite.js`添加测试

### 添加新关卡
1. 在`levels.js`添加配置
2. 在`game.js`添加特定渲染逻辑（如需要）
3. 在`test-suite.js`添加测试

---

## 联系与反馈

- 项目问题：通过GitHub Issues提交
- 迭代建议：在当前会话中直接提出
- 紧急修复：优先保证测试通过率100%

---

*文档状态：完整体验版*
*最后更新：2026-07-14*
*维护者：AI辅助开发团队*
