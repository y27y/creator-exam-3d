# Art and Map-First UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把主游戏改造成“裂隙战术档案”式地图优先体验，为六关增加不干扰规则的实时环境、为实时造物增加能力族视觉语法，并用四张本地固定 CG 串起序章、长夜、空域和终局。

**Architecture:** 保留 `GameEngine`、关卡规则、桥接协议和原生 ES Module 架构，只重组现有 DOM，并在 `CreatorExam3D` 的呈现层增加普通抽屉／通知 helper 与独立的 `environmentGroup`。固定剧情图在开发期生成并作为本地 WebP 使用；实时内容继续由 Three.js 原生几何、现有材质缓存和能力元数据驱动，任何素材失败都回退到现有程序化画面。

**Tech Stack:** Node.js >=18、原生 HTML/CSS/JavaScript ES Modules、Three.js 0.160.0 import map、Canvas 2D 空战、Node `assert`/VM 烟测、OpenAI image-2（仅开发期）、ambientCG CC0 素材、Codex bundled Sharp（仅离线 WebP 转换）。

## Global Constraints

- 不修改 `GameEngine` 数值、能力效果、敌人规则、关卡胜负条件、AI 生成逻辑或守城／空战 localStorage 与 postMessage 协议。
- 不引入 React、Vue、状态库、美术管理器、通知类、新后端服务或新的项目运行时依赖；继续使用原生 DOM、CSS 与现有 Three.js 0.160.0。
- 运行时绝不调用图像生成 API；image-2 只生成固定开发期 CG，游戏运行不得依赖网络图片热链。
- 固定 CG 必须是 `cg-prologue.webp`（16:9）、`cg-night-watch.webp`（21:9）、`cg-airspace-bridge.webp`（16:9）、`cg-ending.webp`（16:9），且不得内嵌文字、Logo、水印或具体玩家造物。
- 六关环境只位于棋盘外圈、远景或天空；不得进入碰撞、寻路、选格射线或胜负计算。
- 实时自然语言造物只按 `water | light | terrain | defense | mind | special` 六个能力族映射几何、色彩、符文和粒子；不得建立逐名词美术表或逐造物类。
- 新增 `public/assets/art/` 全部文件总计不得超过 `10 * 1024 * 1024` bytes；透明小图以外优先 WebP。
- 外部素材只使用明确 CC0 的单个文件并本地托管；`ATTRIBUTION.md` 必须记录本地路径、官方页面、作者／发布者、许可证、下载日期、修改和 SHA-256。
- 色彩令牌固定为世界底色 `#070a11`、哑光面板 `#151923`、主文字 `#f0e4c1`、叙事金 `#d2b86b`、交互青 `#59c7a6`、裂隙紫 `#8f73c8`、危险红 `#e87f72`。
- 普通 URL 必须隐藏 `#test-jump-panel`；只有 `?debug=1` 显示，且所有原有测试按钮与 DOM ID 保留。
- 新传说不得只用会消失的 toast 呈现；必须有可点击持久信号、`志` 抽屉未读数、会话内稳定 ID 去重与目标定位。
- 三个抽屉必须使用真实按钮、维护 `aria-expanded`，同一时间只开一个；`Escape` 关闭并把焦点还给入口。
- 关键 modal／CG 的层级永远高于轻提示；行动提示只有处理或明确忽略后才消失。
- 保留并验证 `prefers-reduced-motion` 与高对比模式；素材缺失时按钮、文字、造物、放置与结束回合仍可用。

---

## Baseline and Scope Guard

实施前已记录 2026-07-10 基线：

- `npm run check`：PASS，76 个 JS 文件语法通过。
- `npm run test:reality`：PASS。
- `node debug/browser-demo-smoke.js`：PASS。
- `node debug/browser-modes-smoke.js`：FAIL，仅因为烟测仍期待已移除的 `#hud-weapon`，当前 DOM 使用 `#hud-affix`。
- `node debug/test-suite.js`：199 PASS / 9 FAIL；这 9 项是本计划外的既有逻辑／断言失败。

除 Task 1 修复与本计划直接相关的过时 mode smoke 外，不顺带修改那 9 个既有失败。每个任务必须证明没有增加失败项；最终 `verify-all` 允许只剩 `test-suite` 这一组已知失败，不得出现新的失败 suite。

## File Structure

**Create**

- `public/assets/art/cg-prologue.webp`：主页面首次进入的 1920×1080 序章 CG。
- `public/assets/art/cg-night-watch.webp`：守城三页共用的 2520×1080 横向长卷。
- `public/assets/art/cg-airspace-bridge.webp`：空战简报背景的 1920×1080 桥接 CG。
- `public/assets/art/cg-ending.webp`：空战结果回写后的 1920×1080 终局 CG。
- `public/assets/art/textures/paper002-ui-grain.webp`：ambientCG Paper 002 的 512×512 CC0 UI 纸纹。
- `public/assets/art/ATTRIBUTION.md`：所有外部／生成素材的来源、提示词、许可、哈希和处理记录。
- `debug/art-assets-tests.js`：验证文件名、WebP magic、尺寸、体积、出处记录和 MIME 契约。
- `docs/iterations/art-ui-visual-qa-2026-07-10.md`：桌面、移动端、无障碍和素材阻断的最终视觉验收记录。

**Modify**

- `public/index.html`：地图优先外壳、底部造物坞、三入口情境抽屉、持久信号与主 CG 对话框；保留原 ID。
- `public/styles.css`：裂隙战术档案令牌、地图优先定位、抽屉、信号、CG、响应式、降动效与高对比。
- `public/js/abilities.js`：六能力族的纯映射与查询函数。
- `public/js/game.js`：debug 门控、抽屉／信号 helper、六关环境、能力族造物外观、主 CG 接入。
- `public/js/particles.js`：能力族粒子运动与缓存材质克隆所有权修复。
- `public/modes/tower-defense/towerBridge.js`：一张守夜横卷的三段裁切与无障碍对话框。
- `public/modes/air-combat/style.css`：空域桥接 CG 本地背景与渐变降级。
- `public/modes/air-combat/airCombatAssets.js`：按当前／下一段描述符加载并回收 JS 图片引用。
- `public/modes/air-combat/airCombatGame.js`：生成阶段资产计划，不再启动时全量加载。
- `server.js`：静态资源 MIME 表加入 WebP。
- `debug/browser-demo-smoke.js`：核心 ID、debug 门控、抽屉、世界信号、环境与主 CG 契约。
- `debug/browser-modes-smoke.js`：修正 HUD 契约并覆盖守夜 CG、空域 CG 和分阶段加载。
- `debug/current-code-reality-tests.js`：能力族与 air asset VM 行为测试。
- `debug/server-api-tests.js`：真实 HTTP WebP Content-Type 测试。
- `debug/verify-all.js`：加入 `art-assets-tests.js`。
- `README.md`：玩家界面、debug URL 与美术资产目录说明。
- `docs/systems/architecture.md`：呈现层、环境层、固定 CG 与空战资产加载边界。

### Task 1: Align the Air-Combat Smoke Baseline

**Files:**
- Modify: `debug/browser-modes-smoke.js:43-51`
- Test: `debug/browser-modes-smoke.js`

**Interfaces:**
- Consumes: `public/modes/air-combat/index.html` 中现存的 `#hud-affix`。
- Produces: 一个绿色的 mode smoke 基线，后续 CG 与加载任务可以可靠地先红后绿。

- [ ] **Step 1: Run the existing failing smoke and preserve its evidence**

Run:

```powershell
node debug/browser-modes-smoke.js
```

Expected: FAIL，唯一首个断言为 `Air Combat should expose #hud-weapon`。

- [ ] **Step 2: Change the stale expected ID**

在 air HTML ID 数组里只把过时条目改成当前真实 DOM ID：

```js
for (const id of [
  'airspace-start',
  'airspace-choices',
  'airspace-hud',
  'hud-stage',
  'hud-affix',
  'airspace-result'
]) {
  assert.ok(airHtml.includes(`id="${id}"`), `Air Combat should expose #${id}`);
}
```

- [ ] **Step 3: Run the focused smoke**

Run:

```powershell
node debug/browser-modes-smoke.js
```

Expected: `Browser mode smoke harness tests passed.`

- [ ] **Step 4: Commit the baseline correction**

```powershell
git add debug/browser-modes-smoke.js
git commit -m "test: align air combat smoke HUD contract"
```

### Task 2: Gate the Examiner Sandbox Behind `?debug=1`

**Files:**
- Modify: `public/index.html:111-124`
- Modify: `public/js/game.js:101-206,308-417`
- Modify: `debug/browser-demo-smoke.js:12-62`
- Modify: `debug/test-suite.js:4875-4899`
- Test: `debug/browser-demo-smoke.js`

**Interfaces:**
- Consumes: `window.location.search` and the existing `#test-jump-panel`.
- Produces: `applyDebugGate(search = window.location.search) -> boolean`；`true` 表示测试沙盘可见。

- [ ] **Step 1: Add a failing source contract**

在 `debug/browser-demo-smoke.js` 读取 HTML 后加入：

```js
assert.match(
  htmlSource,
  /id="test-jump-panel"[^>]*\bhidden\b/,
  'test sandbox must be hidden in markup'
);
assert.ok(
  gameSource.includes('applyDebugGate(search = window.location.search)'),
  'game should gate the sandbox from the URL query'
);
assert.ok(
  gameSource.includes("new URLSearchParams(search).get('debug') === '1'"),
  'only ?debug=1 should reveal the sandbox'
);
```

- [ ] **Step 2: Run the smoke to verify RED**

Run:

```powershell
node debug/browser-demo-smoke.js
```

Expected: FAIL with `test sandbox must be hidden in markup`。

- [ ] **Step 3: Hide the sandbox in markup without deleting any button**

把 details 开始标签改为：

```html
<details id="test-jump-panel" class="test-jump-panel" open hidden>
```

保留六个 `data-test-level` 按钮、`#test-night-watch-btn`、`#test-air-combat-btn` 和 `#test-browser-smoke-btn` 原样。

- [ ] **Step 4: Collect the node and apply the URL gate during startup**

在 `collectUi()` 返回对象加入：

```js
testJumpPanel: document.getElementById('test-jump-panel'),
```

在 constructor 的 `this.ui = this.collectUi();` 后立即调用：

```js
this.applyDebugGate();
```

在 `collectUi()` 前加入完整 helper：

```js
applyDebugGate(search = window.location.search) {
  const enabled = new URLSearchParams(search).get('debug') === '1';
  if (this.ui?.testJumpPanel) this.ui.testJumpPanel.hidden = !enabled;
  if (this.root) this.root.dataset.debugUi = enabled ? 'true' : 'false';
  return enabled;
}
```

- [ ] **Step 5: Update the existing test-suite DOM assertion**

把“正常布局流中可见”的断言替换为下面两条；不要改该测试末尾与移动格占用有关的既有失败断言：

```js
runner.assert(/id="test-jump-panel"[^>]*\bhidden\b/.test(html), 'test sandbox should be hidden by default');
runner.assert(game.includes('applyDebugGate(search = window.location.search)'), 'test sandbox should be gated by the URL query');
```

- [ ] **Step 6: Run focused and baseline checks**

Run:

```powershell
node debug/browser-demo-smoke.js
npm run check
node debug/test-suite.js
```

Expected: browser smoke and syntax PASS；test suite 仍为已知的 199 PASS / 9 FAIL，且不再因沙盘可见性断言失败。

- [ ] **Step 7: Commit the debug gate**

```powershell
git add public/index.html public/js/game.js debug/browser-demo-smoke.js debug/test-suite.js
git commit -m "test: gate examiner sandbox behind debug query"
```

### Task 3: Build the Map-First Shell and Three Context Drawers

**Files:**
- Modify: `public/index.html:18-324`
- Modify: `public/styles.css:1-187,1420-1476,1505-1687,1720-1735,1868-1877,2157-2160`
- Modify: `public/js/game.js:101-206,308-417,541-713,3188-3391,4523-4680`
- Modify: `debug/browser-demo-smoke.js:12-62`
- Test: `debug/browser-demo-smoke.js` and live `runBrowserDemoSmoke()`

**Interfaces:**
- Consumes: Task 2 的 `applyDebugGate()` 与所有现有 UI ID。
- Produces: `openDrawer(name, targetId = null, trigger = null) -> boolean`、`closeDrawer() -> boolean`；`name` 只能是 `people | world | systems`。

- [ ] **Step 1: Add failing DOM and live-smoke contracts**

在 `debug/browser-demo-smoke.js` 增加 CSS 读取与唯一 ID 检查：

```js
const cssSource = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');

for (const id of [
  'creation-input', 'compile-btn', 'place-btn', 'end-turn-btn',
  'creation-dock', 'drawer-rail', 'right-panel',
  'drawer-people', 'drawer-world', 'drawer-systems', 'world-signal'
]) {
  assert.equal(
    (htmlSource.match(new RegExp(`id="${id}"`, 'g')) || []).length,
    1,
    `missing or duplicated UI id: ${id}`
  );
}

for (const check of [
  'context drawers are mutually exclusive',
  'drawer Escape restores focus',
  'debug gate hides normal URL and shows ?debug=1'
]) {
  assert.ok(smokeBlock.includes(`'${check}'`), `missing live smoke check: ${check}`);
}

assert.ok(cssSource.includes('@media (max-width: 760px)'), 'UI should define the approved mobile breakpoint');
```

- [ ] **Step 2: Run the source smoke to verify RED**

Run:

```powershell
node debug/browser-demo-smoke.js
```

Expected: FAIL with `missing or duplicated UI id: creation-dock`。

- [ ] **Step 3: Rebuild only the outer DOM structure and preserve inner IDs**

使用下面的外壳；把表格列出的现有节点连同其完整内部 markup 剪切到对应容器，不复制、不改名：

```html
<header id="topbar" class="glass panel-row">
  <div class="brand-block">
    <div class="eyebrow">七格战术 · 自然语言造物</div>
    <h1>裂隙考核：造物者</h1>
  </div>
  <div class="topbar-status" aria-label="当前关卡状态">
    <div class="stat"><span>回合</span><strong id="turn-stat">1 / 6</strong></div>
    <div class="stat"><span>还能造</span><strong id="charges-stat">3</strong></div>
    <div class="stat"><span>奇迹点</span><strong id="miracle-stat">6</strong></div>
    <div class="stat"><span>裂隙</span><strong id="entropy-stat">0 / 7</strong></div>
    <div id="level-chip" class="chip">第 1 关</div>
  </div>
  <details class="secondary-menu">
    <summary>更多</summary>
    <a id="wiki-link" class="wiki-link" href="./wiki.html" target="_blank" rel="noopener">玩法 WIKI</a>
    <button id="restart-btn" class="secondary" type="button">重开本关</button>
  </details>
</header>

<section id="left-panel" class="glass panel mission-panel">
  <!-- 保留原 .mission-dossier、#special-meters 及其全部子节点；删除这里原有 stat-grid、unit-list、intent-preview-list 的旧位置。 -->
</section>

<section id="creation-dock" class="glass creation-dock" aria-label="造物操作">
  <!-- 依次放入原 #creation-input、compile/random button-row、#ai-mode、#card-panel、结束回合 button-row 和 #next-btn。 -->
</section>

<nav id="drawer-rail" class="drawer-rail" aria-label="情境档案">
  <button id="drawer-people-btn" type="button" data-drawer="people" aria-controls="right-panel" aria-expanded="false">人 <span id="drawer-people-badge" class="drawer-badge" hidden>0</span></button>
  <button id="drawer-world-btn" type="button" data-drawer="world" aria-controls="right-panel" aria-expanded="false">志 <span id="drawer-world-badge" class="drawer-badge" hidden>0</span></button>
  <button id="drawer-systems-btn" type="button" data-drawer="systems" aria-controls="right-panel" aria-expanded="false">术 <span id="drawer-systems-badge" class="drawer-badge" hidden>0</span></button>
</nav>

<section id="right-panel" class="glass context-drawer" aria-hidden="true" hidden>
  <header class="drawer-head">
    <div>
      <div class="eyebrow">情境档案</div>
      <h2 id="drawer-title" tabindex="-1">人物</h2>
    </div>
    <button id="drawer-close-btn" class="secondary small" type="button" aria-label="关闭情境档案">关闭</button>
  </header>
  <div id="drawer-people" class="drawer-view" data-drawer-view="people" hidden></div>
  <div id="drawer-world" class="drawer-view" data-drawer-view="world" hidden></div>
  <div id="drawer-systems" class="drawer-view" data-drawer-view="systems" hidden></div>
</section>

<section id="world-signal" class="world-signal" aria-live="polite" hidden>
  <button id="world-signal-open" type="button">
    <span id="world-signal-kicker">世界有了新说法</span>
    <strong id="world-signal-title"></strong>
    <span id="world-signal-summary"></span>
  </button>
  <button id="world-signal-dismiss" type="button" aria-label="忽略这条提示">×</button>
</section>
```

节点移动顺序必须是：

| 目标容器 | 现有节点，按顺序 |
|---|---|
| `#drawer-people` | 新建“当前单位”小节包住 `#unit-list`；`#npc-dialogue-panel`；`#resident-dialogue-panel`；`#legacy-panel` |
| `#drawer-world` | 新建“行动指引”小节包住 `#intent-preview-list`；`#enemy-intent-panel`；`#legend-panel`；`#bottom-log`；`#night-watch-panel`；`#air-combat-panel` |
| `#drawer-systems` | 原 `.storyteller-bar` 连标题；`#advanced-mechanics-panel`；`#ritual-panel`；`#oath-panel`；`#abyss-panel`；`#corruption-panel`；`#workshop-panel`；`#save-slot-panel`；`#test-jump-panel` |

HTML 注释只用于说明本计划，最终文件中不保留上面两条说明性注释；最终每个原 ID 必须恰好出现一次。

- [ ] **Step 4: Initialize and collect drawer state**

在 constructor、`collectUi()` 之前初始化：

```js
this.activeDrawer = null;
this.drawerFocusReturn = null;
```

在 `collectUi()` 返回对象加入：

```js
drawer: document.getElementById('right-panel'),
drawerTitle: document.getElementById('drawer-title'),
drawerCloseBtn: document.getElementById('drawer-close-btn'),
drawerButtons: [...document.querySelectorAll('[data-drawer]')],
drawerViews: [...document.querySelectorAll('[data-drawer-view]')],
drawerBadges: {
  people: document.getElementById('drawer-people-badge'),
  world: document.getElementById('drawer-world-badge'),
  systems: document.getElementById('drawer-systems-badge')
},
worldSignal: document.getElementById('world-signal'),
worldSignalOpen: document.getElementById('world-signal-open'),
worldSignalDismiss: document.getElementById('world-signal-dismiss'),
worldSignalTitle: document.getElementById('world-signal-title'),
worldSignalSummary: document.getElementById('world-signal-summary'),
```

删除旧的 `rightPanel` 别名，后续统一使用 `this.ui.drawer`。

- [ ] **Step 5: Implement one-drawer behavior and focus restoration**

在 `bindEvents()` 前加入：

```js
openDrawer(name, targetId = null, trigger = null) {
  const titles = { people: '人物', world: '世界志', systems: '造物术' };
  const view = this.ui.drawerViews.find(node => node.dataset.drawerView === name);
  if (!view || !titles[name]) return false;

  this.drawerFocusReturn = trigger || document.activeElement;
  this.activeDrawer = name;
  this.ui.drawer.hidden = false;
  this.ui.drawer.setAttribute('aria-hidden', 'false');
  this.ui.drawerTitle.textContent = titles[name];

  for (const button of this.ui.drawerButtons) {
    button.setAttribute('aria-expanded', button.dataset.drawer === name ? 'true' : 'false');
  }
  for (const candidate of this.ui.drawerViews) {
    candidate.hidden = candidate !== view;
  }

  window.requestAnimationFrame(() => {
    const target = targetId ? document.getElementById(targetId) : null;
    if (target) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
      const focusable = target.querySelector('button, input, textarea, select, [tabindex]');
      (focusable || this.ui.drawerTitle).focus({ preventScroll: true });
    } else {
      this.ui.drawerTitle.focus();
    }
  });
  return true;
}

closeDrawer() {
  if (!this.activeDrawer) return false;
  this.activeDrawer = null;
  this.ui.drawer.hidden = true;
  this.ui.drawer.setAttribute('aria-hidden', 'true');
  for (const button of this.ui.drawerButtons) button.setAttribute('aria-expanded', 'false');
  for (const view of this.ui.drawerViews) view.hidden = true;
  const focusReturn = this.drawerFocusReturn;
  this.drawerFocusReturn = null;
  focusReturn?.focus?.();
  return true;
}
```

在 `bindEvents()` 加入：

```js
for (const button of this.ui.drawerButtons) {
  button.addEventListener('click', () => {
    if (this.activeDrawer === button.dataset.drawer) this.closeDrawer();
    else this.openDrawer(button.dataset.drawer, null, button);
  });
}
this.ui.drawerCloseBtn?.addEventListener('click', () => this.closeDrawer());
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && this.activeDrawer) {
    event.preventDefault();
    this.closeDrawer();
  }
});
```

在 `handleUnitInteraction(unit)` 的合法分支开头调用：

```js
this.openDrawer('people', 'npc-dialogue-panel', document.getElementById('drawer-people-btn'));
```

删除 `rightPanel.dialogue-active` 的添加／移除和相应 CSS；对话是否显示继续由 `#npc-dialogue-panel.hidden` 控制。

- [ ] **Step 6: Add live smoke checks before the existing early return**

在 `runBrowserDemoSmoke()` 现有约第 3391 行的 return 之前加入：

```js
const peopleButton = document.getElementById('drawer-people-btn');
const systemsButton = document.getElementById('drawer-systems-btn');
peopleButton.focus();
peopleButton.click();
systemsButton.click();
record('context drawers are mutually exclusive',
  this.activeDrawer === 'systems'
  && document.getElementById('drawer-people').hidden
  && !document.getElementById('drawer-systems').hidden
);
systemsButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
record('drawer Escape restores focus', this.activeDrawer === null && document.activeElement === systemsButton);

const normalDebug = this.applyDebugGate('');
const explicitDebug = this.applyDebugGate('?debug=1');
record('debug gate hides normal URL and shows ?debug=1',
  normalDebug === false && explicitDebug === true && !this.ui.testJumpPanel.hidden
);
this.applyDebugGate(window.location.search);
```

- [ ] **Step 7: Append the approved visual shell override**

在 `public/styles.css` 末尾加入这一组确定性覆盖；保留现有内部组件规则：

```css
:root {
  --world-bg: #070a11;
  --panel-bg: #151923;
  --text-main: #f0e4c1;
  --narrative: #d2b86b;
  --interactive: #59c7a6;
  --rift: #8f73c8;
  --danger: #e87f72;
  --dock-height: 176px;
}

html, body, #game-root { width: 100%; height: 100%; overflow: hidden; }
body { margin: 0; background: var(--world-bg); color: var(--text-main); }
.glass {
  border: 1px solid color-mix(in srgb, var(--narrative) 24%, transparent);
  border-radius: 6px;
  background-color: rgba(21, 25, 35, .96);
  backdrop-filter: none;
  clip-path: polygon(0 10px, 10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%);
}
#game-canvas { position: fixed; inset: 0; width: 100%; height: 100%; }
#topbar {
  position: fixed; z-index: 30; top: 12px; left: 16px; right: 16px;
  min-height: 58px; display: grid; grid-template-columns: minmax(180px, 1fr) auto auto;
  align-items: center; gap: 16px; padding: 8px 12px;
}
.topbar-status { display: flex; align-items: center; gap: 8px; }
.topbar-status .stat { min-width: 62px; padding: 4px 8px; }
.secondary-menu { position: relative; }
.secondary-menu[open] { display: grid; gap: 8px; }
#left-panel {
  position: fixed; z-index: 20; top: 86px; left: 16px; width: min(310px, calc(100vw - 96px));
  max-height: calc(100vh - 286px); overflow: auto; padding: 14px;
}
#creation-dock {
  position: fixed; z-index: 40; left: 50%; bottom: 14px; transform: translateX(-50%);
  width: min(760px, calc(100vw - 190px)); max-height: var(--dock-height); overflow: auto;
  display: grid; grid-template-columns: minmax(220px, 1fr) auto; gap: 10px; padding: 12px;
}
#creation-dock #creation-input { min-height: 66px; }
#creation-dock #card-panel { grid-column: 1 / -1; }
.drawer-rail {
  position: fixed; z-index: 45; top: 92px; right: 16px; display: grid; gap: 8px;
}
.drawer-rail > button {
  min-width: 44px; min-height: 48px; color: var(--text-main); border: 1px solid rgba(89, 199, 166, .42);
  border-radius: 4px; background: rgba(21, 25, 35, .96); cursor: pointer;
}
.drawer-rail > button[aria-expanded="true"] { color: #07100d; background: var(--interactive); }
.drawer-badge { min-width: 18px; padding: 1px 5px; border-radius: 999px; color: #07100d; background: var(--narrative); }
#right-panel {
  position: fixed; z-index: 44; top: 84px; right: 70px; bottom: 14px;
  width: min(420px, calc(100vw - 100px)); padding: 14px; overflow: hidden;
}
.drawer-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.drawer-view { height: calc(100% - 58px); overflow: auto; padding-right: 4px; }
.drawer-view > section, .drawer-view > .drawer-section { margin-top: 12px; border-radius: 4px; }
.world-signal { position: fixed; z-index: 43; right: 78px; bottom: 198px; width: min(360px, calc(100vw - 32px)); }

@media (max-width: 760px) {
  :root { --dock-height: 190px; }
  #topbar { left: 8px; right: 8px; grid-template-columns: 1fr auto; }
  .brand-block .eyebrow, .topbar-status .stat:nth-of-type(2), .topbar-status .stat:nth-of-type(3) { display: none; }
  #left-panel { top: 78px; left: 8px; width: min(270px, calc(100vw - 72px)); max-height: 178px; }
  #creation-dock { left: 8px; right: 8px; bottom: 8px; width: auto; transform: none; grid-template-columns: 1fr auto; z-index: 60; }
  .drawer-rail { top: 80px; right: 8px; z-index: 61; }
  #right-panel { inset: 0; width: auto; padding: 16px 68px calc(var(--dock-height) + 24px) 16px; z-index: 55; }
  .world-signal { left: 8px; right: 8px; bottom: calc(var(--dock-height) + 24px); width: auto; z-index: 62; }
}

@media (prefers-reduced-motion: reduce) {
  #right-panel, .world-signal, #creation-dock, .drawer-view * { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
}

@media (prefers-contrast: more), (forced-colors: active) {
  .glass, .drawer-rail > button, .world-signal { border-width: 2px; }
  .drawer-rail > button:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid var(--interactive); outline-offset: 2px; }
}
```

- [ ] **Step 8: Run focused and syntax checks**

Run:

```powershell
node debug/browser-demo-smoke.js
npm run check
npm run test:reality
```

Expected: all three PASS。

- [ ] **Step 9: Commit the shell and drawer behavior**

```powershell
git add public/index.html public/styles.css public/js/game.js debug/browser-demo-smoke.js
git commit -m "feat: add map-first shell and context drawers"
```

### Task 4: Add Persistent Drawer Signals for New Myths and Actions

**Files:**
- Modify: `public/js/game.js:101-206,541-713,2441-2495,5087-5140`
- Modify: `public/styles.css` after the Task 3 shell override
- Modify: `debug/browser-demo-smoke.js:12-62`
- Test: `debug/browser-demo-smoke.js` and live `runBrowserDemoSmoke()`

**Interfaces:**
- Consumes: Task 3 的 `openDrawer()`、`#world-signal`、三个 badge；`worldLegendSystem.myths: Map<string, Myth[]>`。
- Produces: `notifyDrawer(name, notice) -> boolean`、`acknowledgeDrawer(name)`、`dismissDrawerNotice(groupKey)`、`renderDrawerSignals()`；`notice = { id, priority, title, summary, targetId }`。

- [ ] **Step 1: Add failing signal contracts**

在 `debug/browser-demo-smoke.js` 增加：

```js
for (const check of [
  'drawer notifications dedupe stable ids',
  'drawer notifications merge by turn and target',
  'world signal opens legend and clears unread',
  'actionable drawer notice survives opening until ignored'
]) {
  assert.ok(smokeBlock.includes(`'${check}'`), `missing live smoke check: ${check}`);
}
assert.ok(gameSource.includes('notifyDrawer(name, notice)'), 'game should expose the drawer notice helper');
assert.ok(gameSource.includes('worldLegendSystem.myths.values()'), 'legend notifications must scan every myth, not only the top three');
```

- [ ] **Step 2: Run the source smoke to verify RED**

Run:

```powershell
node debug/browser-demo-smoke.js
```

Expected: FAIL with `missing live smoke check: drawer notifications dedupe stable ids`。

- [ ] **Step 3: Initialize session-only notice state**

在 constructor 的抽屉状态旁加入：

```js
this.drawerNotices = { people: [], world: [], systems: [] };
this.drawerUnread = { people: 0, world: 0, systems: 0 };
this.seenDrawerNoticeIds = new Set();
this.knownLegendIds = null;
this.knownResidentActionIds = null;
this.activeDrawerNoticeKey = null;
```

- [ ] **Step 4: Implement dedupe, same-turn grouping, acknowledgement and rendering**

在 `openDrawer()` 前加入：

```js
notifyDrawer(name, notice) {
  if (!this.drawerNotices[name] || !notice?.id || !notice?.targetId) return false;
  const priority = notice.priority === 'actionable' ? 'actionable' : 'ambient';
  const stableKey = `${name}:${notice.id}`;
  if (this.seenDrawerNoticeIds.has(stableKey)) return false;
  this.seenDrawerNoticeIds.add(stableKey);

  const groupKey = [
    this.level?.id || 'unknown',
    this.turn || 0,
    name,
    priority,
    notice.targetId
  ].join(':');
  let group = this.drawerNotices[name].find(item => item.groupKey === groupKey);
  if (group) {
    group.count += 1;
    group.ids.push(notice.id);
    group.summary = notice.summary || group.summary;
  } else {
    group = {
      groupKey,
      ids: [notice.id],
      name,
      priority,
      title: notice.title || '档案有了新内容',
      summary: notice.summary || '',
      targetId: notice.targetId,
      count: 1
    };
    this.drawerNotices[name].push(group);
  }
  this.drawerUnread[name] += 1;
  this.renderDrawerSignals();
  return true;
}

acknowledgeDrawer(name) {
  if (!Object.prototype.hasOwnProperty.call(this.drawerUnread, name)) return;
  this.drawerUnread[name] = 0;
  this.drawerNotices[name] = this.drawerNotices[name].filter(item => item.priority === 'actionable');
  this.renderDrawerSignals();
}

dismissDrawerNotice(groupKey) {
  for (const name of Object.keys(this.drawerNotices)) {
    const before = this.drawerNotices[name].length;
    this.drawerNotices[name] = this.drawerNotices[name].filter(item => item.groupKey !== groupKey);
    if (this.drawerNotices[name].length !== before) {
      this.renderDrawerSignals();
      return true;
    }
  }
  return false;
}

renderDrawerSignals() {
  for (const [name, badge] of Object.entries(this.ui.drawerBadges || {})) {
    const count = this.drawerUnread[name] || 0;
    badge.textContent = String(count);
    badge.hidden = count === 0;
    badge.setAttribute('aria-label', count ? `${count} 条未读` : '没有未读');
  }

  const all = Object.values(this.drawerNotices).flat();
  const selected = all.find(item => item.priority === 'actionable') || all.at(-1) || null;
  this.activeDrawerNoticeKey = selected?.groupKey || null;
  this.ui.worldSignal.hidden = !selected;
  if (!selected) return;
  this.ui.worldSignal.dataset.priority = selected.priority;
  this.ui.worldSignal.dataset.drawer = selected.name;
  this.ui.worldSignal.dataset.targetId = selected.targetId;
  this.ui.worldSignalTitle.textContent = selected.count > 1 ? `${selected.title} · ${selected.count} 条` : selected.title;
  this.ui.worldSignalSummary.textContent = selected.summary;
}
```

在 `openDrawer()` 找到合法 view 后、修改 DOM 前加入：

```js
this.acknowledgeDrawer(name);
```

注意：`acknowledgeDrawer()` 只移除该抽屉的 ambient 组；actionable 组仍保留，直到 `dismissDrawerNotice()`。

- [ ] **Step 5: Bind the persistent signal**

在 `bindEvents()` 加入：

```js
this.ui.worldSignalOpen?.addEventListener('click', () => {
  const notice = Object.values(this.drawerNotices).flat().find(item => item.groupKey === this.activeDrawerNoticeKey);
  if (!notice) return;
  this.openDrawer(notice.name, notice.targetId, document.querySelector(`[data-drawer="${notice.name}"]`));
  if (notice.priority === 'ambient') this.dismissDrawerNotice(notice.groupKey);
});
this.ui.worldSignalDismiss?.addEventListener('click', () => {
  if (this.activeDrawerNoticeKey) this.dismissDrawerNotice(this.activeDrawerNoticeKey);
});
```

- [ ] **Step 6: Detect every newly added myth while still rendering only the top three**

在 `renderLegendPanel()` 的 `getTopMyths(3)` 之前加入：

```js
const allMyths = Array.from(worldLegendSystem.myths.values()).flat();
if (this.knownLegendIds === null) {
  this.knownLegendIds = new Set(allMyths.map(myth => myth.id));
} else {
  for (const myth of allMyths) {
    if (this.knownLegendIds.has(myth.id)) continue;
    this.knownLegendIds.add(myth.id);
    this.notifyDrawer('world', {
      id: myth.id,
      priority: 'ambient',
      title: '新的传说正在流传',
      summary: myth.text,
      targetId: 'legend-panel'
    });
  }
}
```

保留后面的 `worldLegendSystem.getTopMyths(3)` 与现有四组渲染；新传说即使因 popularity 相同未进入前三，也仍会触发信号。

- [ ] **Step 7: Promote real resident and ritual opportunities to actionable notices**

在 `updateUi()` 的渲染调用末尾调用：

```js
this.syncActionableSignals();
```

加入完整 helper：

```js
syncActionableSignals() {
  const actions = this.worldSimulation?.eventBus?.query?.({ type: 'resident_action' }) || [];
  if (this.knownResidentActionIds === null) {
    this.knownResidentActionIds = new Set(actions.map(event => event.id));
  } else {
    for (const event of actions) {
      if (this.knownResidentActionIds.has(event.id) || event.payload?.type === 'idle') continue;
      this.knownResidentActionIds.add(event.id);
      this.notifyDrawer('people', {
        id: event.id,
        priority: 'actionable',
        title: `${event.payload?.residentName || '居民'}需要回应`,
        summary: event.payload?.reason || event.payload?.type || '有人正在等你的决定。',
        targetId: 'resident-dialogue-panel'
      });
    }
  }

  const ritualReady = this.creations.filter(creation => creation.placed && creation.remaining > 0).length >= 2;
  if (ritualReady) {
    this.notifyDrawer('systems', {
      id: `ritual-ready:${this.level?.id}:${this.turn}`,
      priority: 'actionable',
      title: '仪式熔炉已经可用',
      summary: '至少两件造物可以组合；打开造物术查看或明确忽略。',
      targetId: 'ritual-panel'
    });
  }
}
```

胜负、裂隙临界、守夜和空域继续使用现有 modal／CG，不通过 `notifyDrawer()` 降级为轻提示。

- [ ] **Step 8: Add signal styling below modal and above the dock**

```css
.world-signal {
  display: grid; grid-template-columns: 1fr auto; gap: 4px;
  border: 1px solid rgba(210, 184, 107, .64); border-radius: 4px;
  background: rgba(21, 25, 35, .98); box-shadow: 0 18px 48px rgba(0, 0, 0, .38);
}
.world-signal[hidden] { display: none; }
.world-signal[data-priority="actionable"] { border-color: var(--interactive); }
#world-signal-open { display: grid; gap: 3px; padding: 12px; text-align: left; color: var(--text-main); border: 0; background: transparent; }
#world-signal-kicker { color: var(--narrative); font-size: 11px; letter-spacing: .12em; }
#world-signal-summary { color: rgba(240, 228, 193, .76); font-size: 12px; }
#world-signal-dismiss { align-self: start; margin: 6px; color: var(--text-main); border: 0; background: transparent; }
.modal { z-index: 100; }
```

- [ ] **Step 9: Exercise real dedupe, grouping, navigation and actionable persistence**

在 `runBrowserDemoSmoke()` 的现有 return 之前加入：

```js
const signalA = this.notifyDrawer('world', {
  id: 'smoke-myth-a', priority: 'ambient', title: '新的传说正在流传',
  summary: '烟测传说甲', targetId: 'legend-panel'
});
const duplicateA = this.notifyDrawer('world', {
  id: 'smoke-myth-a', priority: 'ambient', title: '新的传说正在流传',
  summary: '烟测传说甲', targetId: 'legend-panel'
});
const signalB = this.notifyDrawer('world', {
  id: 'smoke-myth-b', priority: 'ambient', title: '新的传说正在流传',
  summary: '烟测传说乙', targetId: 'legend-panel'
});
const mythGroup = this.drawerNotices.world.find(item => item.ids.includes('smoke-myth-a'));
record('drawer notifications dedupe stable ids', signalA && !duplicateA);
record('drawer notifications merge by turn and target', signalB && mythGroup?.count === 2);
this.ui.worldSignalOpen.click();
record('world signal opens legend and clears unread', this.activeDrawer === 'world' && this.drawerUnread.world === 0);

this.notifyDrawer('systems', {
  id: 'smoke-action-a', priority: 'actionable', title: '烟测行动',
  summary: '需要明确处理', targetId: 'ritual-panel'
});
this.ui.worldSignalOpen.click();
record('actionable drawer notice survives opening until ignored',
  this.drawerNotices.systems.some(item => item.ids.includes('smoke-action-a'))
);
this.ui.worldSignalDismiss.click();
```

- [ ] **Step 10: Run regression checks and commit**

Run:

```powershell
node debug/browser-demo-smoke.js
npm run check
npm run test:reality
```

Expected: all PASS。

```powershell
git add public/js/game.js public/styles.css debug/browser-demo-smoke.js
git commit -m "feat: add persistent context drawer signals"
```

### Task 5: Define Ability Families and Render Family-Specific Creations

**Files:**
- Modify: `public/js/abilities.js:1-120`
- Modify: `public/js/game.js:1-100,2232-2322`
- Modify: `public/js/particles.js:1-82,295-407,474-482`
- Modify: `debug/current-code-reality-tests.js:1-15`
- Modify: `debug/browser-demo-smoke.js:1-62`
- Test: `debug/current-code-reality-tests.js` and `debug/browser-demo-smoke.js`

**Interfaces:**
- Consumes: canonical `ABILITIES` and existing `createCreationMesh()` / `spawnAbilityParticles()` calls.
- Produces: `getAbilityVisualFamily(ability) -> 'water' | 'light' | 'terrain' | 'defense' | 'mind' | 'special'`；unknown abilities return `special`。

- [ ] **Step 1: Write the failing pure mapping test**

在 `debug/current-code-reality-tests.js` imports 加入：

```js
import { ABILITIES, getAbilityVisualFamily } from '../public/js/abilities.js';
```

在顶层测试区加入：

```js
const VISUAL_FAMILIES = new Set(['water', 'light', 'terrain', 'defense', 'mind', 'special']);
for (const [ability, expected] of Object.entries({
  absorb_water: 'water',
  illuminate: 'light',
  raise_earth: 'terrain',
  force_field: 'defense',
  memory_beacon: 'mind',
  time_dilation: 'special'
})) {
  assert.equal(getAbilityVisualFamily(ability), expected, `${ability} should use ${expected} visuals`);
}
for (const ability of ABILITIES) {
  assert.ok(VISUAL_FAMILIES.has(getAbilityVisualFamily(ability)), `${ability} must have a visual family`);
}
assert.equal(getAbilityVisualFamily('unknown_live_creation'), 'special');
```

- [ ] **Step 2: Run reality tests to verify RED**

Run:

```powershell
npm run test:reality
```

Expected: FAIL because `getAbilityVisualFamily` is not exported。

- [ ] **Step 3: Add the complete canonical family mapping**

在 `ABILITY_SET` 后加入：

```js
export const ABILITY_VISUAL_FAMILIES = Object.freeze({
  absorb_water: 'water', freeze_water: 'water', dig_channel: 'water', redirect_hazard: 'water', steam_burst: 'water',
  illuminate: 'light', reveal_path: 'light', sun_blessing: 'light',
  create_bridge: 'terrain', transform_land: 'terrain', raise_earth: 'terrain', grow_forest: 'terrain', nature_awakening: 'terrain',
  block: 'defense', slow_beast: 'defense', force_field: 'defense', trap: 'defense', shield_units: 'defense', rift_sealing: 'defense',
  calm: 'mind', guide: 'mind', memory_beacon: 'mind', dream_link: 'mind', attract: 'mind', beast_taming: 'mind',
  gale: 'special', cleanse: 'special', time_dilation: 'special', haste: 'special', teleport: 'special', time_weave: 'special'
});

export function getAbilityVisualFamily(ability) {
  return ABILITY_VISUAL_FAMILIES[ability] || 'special';
}
```

- [ ] **Step 4: Make family the single input to creation styling**

在 `game.js` imports 加入下面一行，然后用下面的完整函数替换 `getCreationVisualStyle()`：

```js
import { getAbilityVisualFamily } from './abilities.js';
```

```js
getCreationVisualStyle(card) {
  const family = getAbilityVisualFamily(card?.ability);
  const baseColor = ABILITY_COLORS[card?.ability] || 0xffffff;
  const familyStyles = {
    water: { coreColor: 0x55cfe3, ringColor: 0x8ee8ef, accentColor: 0x3aa6c4 },
    light: { coreColor: 0xf1d47b, ringColor: 0xffefb0, accentColor: 0xffd36a },
    terrain: { coreColor: 0x74906c, ringColor: 0xb59a68, accentColor: 0x59c77f },
    defense: { coreColor: 0x69cdb2, ringColor: 0xa8ead8, accentColor: 0x4f8f83 },
    mind: { coreColor: 0x987bc9, ringColor: 0xc1a5e8, accentColor: 0x7b63b2 },
    special: { coreColor: baseColor, ringColor: 0xf0e4c1, accentColor: 0xd2b86b }
  };
  const style = familyStyles[family];
  if (card?.ability === 'consume_light') {
    return {
      family: 'special', coreColor: 0x4b275d, ringColor: 0xffd166,
      coreEmissive: 0x14051d, ringEmissive: 0xffa64d,
      coreEmissiveIntensity: 0.08, ringEmissiveIntensity: 0.95,
      accentColor: 0xfff0a8, shadowColor: 0x09040d, absorption: true
    };
  }
  return {
    family,
    ...style,
    coreEmissive: style.coreColor,
    ringEmissive: style.ringColor,
    coreEmissiveIntensity: family === 'light' ? 0.38 : 0.18,
    ringEmissiveIntensity: family === 'special' ? 0.42 : 0.25
  };
}
```

- [ ] **Step 5: Add one cached accent helper and retain the shared icosahedron core**

在 `createCreationMesh()` 前加入：

```js
addCreationFamilyAccent(group, visual, range) {
  const material = this.material(visual.accentColor, {
    transparent: true, opacity: 0.72,
    emissive: visual.accentColor, emissiveIntensity: 0.28,
    roughness: 0.5, side: THREE.DoubleSide
  });
  const add = (key, factory, position, rotation = [0, 0, 0], scale = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(this.getCachedGeometry(`creation-${key}`, factory), material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.scale.set(...scale);
    group.add(mesh);
  };

  if (visual.family === 'water') {
    add('water-ripple-a', () => new THREE.TorusGeometry(0.46, 0.018, 6, 32), [0, 0.08, 0], [Math.PI / 2, 0, 0]);
    add('water-ripple-b', () => new THREE.TorusGeometry(0.62, 0.012, 6, 32), [0, 0.02, 0], [Math.PI / 2, 0, 0]);
  } else if (visual.family === 'light') {
    add('light-beam', () => new THREE.CylinderGeometry(0.035, 0.08, 0.72, 10), [0, 0.34, 0]);
  } else if (visual.family === 'terrain') {
    for (let i = 0; i < 3; i += 1) {
      const angle = i * Math.PI * 2 / 3;
      add('terrain-rock', () => new THREE.DodecahedronGeometry(0.12, 0), [Math.cos(angle) * 0.34, 0.02, Math.sin(angle) * 0.34], [i * 0.3, angle, 0]);
    }
  } else if (visual.family === 'defense') {
    for (let i = 0; i < 4; i += 1) {
      const angle = i * Math.PI / 2;
      add('defense-wall', () => new THREE.BoxGeometry(0.28, 0.18, 0.06), [Math.cos(angle) * 0.44, 0.12, Math.sin(angle) * 0.44], [0, -angle, 0]);
    }
  } else if (visual.family === 'mind') {
    add('mind-link', () => new THREE.TorusGeometry(0.34, 0.014, 6, 32), [0, 0.28, 0], [0, 0, Math.PI / 2]);
    add('mind-link', () => new THREE.TorusGeometry(0.34, 0.014, 6, 32), [0, 0.28, 0], [Math.PI / 2, 0, 0]);
  } else {
    for (let i = 0; i < 3; i += 1) {
      const angle = i * Math.PI * 2 / 3;
      add('special-fracture', () => new THREE.BoxGeometry(0.035, 0.42, 0.035), [Math.cos(angle) * 0.34, 0.24, Math.sin(angle) * 0.34], [0.2, angle, -0.3]);
    }
  }
  group.userData.visualFamily = visual.family;
  group.userData.visualRange = range;
}
```

把 `createCreationMesh()` 中四个新建 geometry 改为缓存：

```js
const core = new THREE.Mesh(
  this.getCachedGeometry('creation-core', () => new THREE.IcosahedronGeometry(0.25, 1)),
  this.material(visual.coreColor, { emissive: visual.coreEmissive, emissiveIntensity: visual.coreEmissiveIntensity, roughness: 0.45 })
);
const ring = new THREE.Mesh(
  this.getCachedGeometry('creation-range-ring', () => new THREE.TorusGeometry(0.38, 0.025, 8, 32)),
  this.material(visual.ringColor, { transparent: true, opacity: 0.72, emissive: visual.ringEmissive, emissiveIntensity: visual.ringEmissiveIntensity })
);
```

范围继续通过 `ring.scale.setScalar(1 + range * 0.16)` 表达；在基础 ring 加入 group 后调用：

```js
this.addCreationFamilyAccent(group, visual, range);
```

保留原 icosahedron core，以免破坏 `renderWorld()` 和 animation 通过 `IcosahedronGeometry` 找核心的现有契约；`consume_light` 的 warning ring 与 shadow pool 逻辑保留并把 geometry 改为缓存。

- [ ] **Step 6: Give particles family motion and clone cached material templates**

在 `particles.js` import 加入：

```js
import { getAbilityVisualFamily } from './abilities.js';
```

用下面逻辑替换 `getParticleMaterial()` 的返回部分：

```js
if (!this.particleMaterials.has(key)) {
  this.particleMaterials.set(key, new THREE.PointsMaterial({
    color,
    size: options.size || 0.15,
    transparent: true,
    opacity: options.opacity || 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  }));
}
return this.particleMaterials.get(key).clone();
```

在 `spawnAbilityParticles()` 初始化循环前加入：

```js
const family = getAbilityVisualFamily(ability);
```

用下面的 family switch 设置每个粒子的 velocity；保留原 particleCount、lifetime、size 和最大粒子数：

```js
const radialX = Math.cos(angle) * (0.012 + Math.random() * 0.012);
const radialZ = Math.sin(angle) * (0.012 + Math.random() * 0.012);
if (family === 'water') {
  velocities[i * 3] = radialX;
  velocities[i * 3 + 1] = 0.006;
  velocities[i * 3 + 2] = radialZ;
} else if (family === 'light') {
  velocities[i * 3] = radialX * 0.25;
  velocities[i * 3 + 1] = 0.035 + Math.random() * 0.02;
  velocities[i * 3 + 2] = radialZ * 0.25;
} else if (family === 'terrain') {
  velocities[i * 3] = radialX * 0.45;
  velocities[i * 3 + 1] = 0.003;
  velocities[i * 3 + 2] = radialZ * 0.45;
} else if (family === 'defense') {
  velocities[i * 3] = -Math.sin(angle) * 0.018;
  velocities[i * 3 + 1] = 0.008;
  velocities[i * 3 + 2] = Math.cos(angle) * 0.018;
} else if (family === 'mind') {
  velocities[i * 3] = -Math.sin(angle) * 0.015;
  velocities[i * 3 + 1] = 0.018;
  velocities[i * 3 + 2] = Math.cos(angle) * 0.015;
} else {
  velocities[i * 3] = -radialX;
  velocities[i * 3 + 1] = 0.024;
  velocities[i * 3 + 2] = -radialZ;
}
```

在 `clear()` 中为每个粒子补充克隆材质释放，并在清空 particles 后保留 template map：

```js
if (particle.mesh.material) particle.mesh.material.dispose();
```

不要 dispose `this.particleMaterials` 中的模板，直到 ParticleSystem 实例整体销毁；现有过期／超限路径继续 dispose 每个克隆。

- [ ] **Step 7: Add source contracts for all six families and ownership**

在 `debug/browser-demo-smoke.js` 读取两个源文件并加入：

```js
const abilitySource = readFileSync(new URL('../public/js/abilities.js', import.meta.url), 'utf8');
const particleSource = readFileSync(new URL('../public/js/particles.js', import.meta.url), 'utf8');
for (const family of ['water', 'light', 'terrain', 'defense', 'mind', 'special']) {
  assert.ok(abilitySource.includes(`'${family}'`), `ability map should include ${family}`);
}
for (const family of ['water', 'light', 'terrain', 'defense', 'mind']) {
  assert.ok(gameSource.includes(`visual.family === '${family}'`), `creation meshes should render ${family}`);
}
assert.ok(gameSource.includes('group.userData.visualFamily = visual.family'), 'creation meshes should publish the selected family');
assert.ok(particleSource.includes('getAbilityVisualFamily(ability)'), 'particles should use the canonical family mapping');
assert.ok(particleSource.includes('.clone()'), 'cached particle templates should be cloned per effect');
assert.ok(particleSource.includes('this.maxParticles = 1000'), 'particle cap must remain unchanged');
```

- [ ] **Step 8: Run tests and commit**

Run:

```powershell
npm run test:reality
node debug/browser-demo-smoke.js
npm run check
```

Expected: all PASS。

```powershell
git add public/js/abilities.js public/js/game.js public/js/particles.js debug/current-code-reality-tests.js debug/browser-demo-smoke.js
git commit -m "feat: render creations by ability family"
```

### Task 6: Add Six Procedural Level Environments Outside the Board

**Files:**
- Modify: `public/js/game.js:55-100,101-206,260-306,420-483,1714-1832`
- Modify: `debug/browser-demo-smoke.js:12-62`
- Test: `debug/browser-demo-smoke.js` and live `runBrowserDemoSmoke()`

**Interfaces:**
- Consumes: authoritative level IDs from `LEVELS` and existing `getCachedGeometry()` / `material()` caches.
- Produces: `applyLevelEnvironment(levelId)`、`clearLevelEnvironment()`、`addEnvironmentPrimitive(...)`；`environmentGroup.userData.levelId` identifies the applied preset.

- [ ] **Step 1: Add failing six-level environment contracts**

在 source smoke 加入：

```js
for (const levelId of ['flood-village', 'night-mine', 'giant-city', 'wordless-war', 'memory-plague', 'final-exam']) {
  assert.ok(gameSource.includes(`'${levelId}'`), `environment config should include ${levelId}`);
}
assert.ok(gameSource.includes('applyLevelEnvironment(this.level.id)'), 'loadLevel should apply its environment');
assert.ok(gameSource.includes('this.environmentGroup.userData.levelId = levelId'), 'environment should publish the active level id');
assert.ok(smokeBlock.includes("'all six level environments install decorative geometry'"), 'live smoke should inspect all six environments');
```

- [ ] **Step 2: Run the smoke to verify RED**

Run:

```powershell
node debug/browser-demo-smoke.js
```

Expected: FAIL with `environment config should include flood-village` or the missing hook assertion。

- [ ] **Step 3: Add exact light/fog presets**

在 `game.js` 顶层颜色常量后加入：

```js
const LEVEL_ENVIRONMENTS = Object.freeze({
  'flood-village': { background: 0x07151b, fog: 0x102b33, near: 13, far: 30, ambient: 1.85, sun: 0xffd487, sunPower: 2.35, rim: 0x59c7a6 },
  'night-mine': { background: 0x050609, fog: 0x090b10, near: 10, far: 24, ambient: 1.05, sun: 0xdceeff, sunPower: 1.45, rim: 0xf2e7c2 },
  'giant-city': { background: 0x081512, fog: 0x173027, near: 14, far: 31, ambient: 1.75, sun: 0xe0b86a, sunPower: 2.4, rim: 0x59c7a6 },
  'wordless-war': { background: 0x0d0b14, fog: 0x292338, near: 12, far: 27, ambient: 1.45, sun: 0xe6c778, sunPower: 2.05, rim: 0x8f73c8 },
  'memory-plague': { background: 0x071310, fog: 0x241e35, near: 13, far: 29, ambient: 1.7, sun: 0xb9e8d5, sunPower: 2.25, rim: 0xa993da },
  'final-exam': { background: 0x070a11, fog: 0x181429, near: 14, far: 32, ambient: 1.65, sun: 0xd2b86b, sunPower: 2.3, rim: 0x8f73c8 }
});
```

- [ ] **Step 4: Own a decorative group and light references**

在 constructor 创建 `worldGroup` 旁加入：

```js
this.environmentGroup = new THREE.Group();
this.environmentGroup.name = 'level-environment';
```

在 `initScene()` 把三盏灯保存为实例字段：

```js
this.ambientLight = new THREE.HemisphereLight(0xcfe8ff, 0x12162e, 2.1);
this.scene.add(this.ambientLight);

this.sunLight = new THREE.DirectionalLight(0xffffff, 2.8);
this.sunLight.position.set(6, 12, 8);
this.sunLight.castShadow = true;
this.sunLight.shadow.mapSize.width = 2048;
this.sunLight.shadow.mapSize.height = 2048;
this.sunLight.shadow.camera.left = -12;
this.sunLight.shadow.camera.right = 12;
this.sunLight.shadow.camera.top = 12;
this.sunLight.shadow.camera.bottom = -12;
this.scene.add(this.sunLight);

this.rimLight = new THREE.PointLight(0x7c68ff, 3, 32);
this.rimLight.position.set(-7, 5, -6);
this.scene.add(this.rimLight);
```

在 `this.scene.add(this.worldGroup)` 前加入：

```js
this.scene.add(this.environmentGroup);
```

- [ ] **Step 5: Add the deterministic primitive builder**

在 `renderWorld()` 前加入：

```js
clearLevelEnvironment() {
  this.environmentGroup.clear();
  this.environmentGroup.userData.levelId = null;
}

addEnvironmentPrimitive(kind, color, position, scale, rotation = [0, 0, 0], materialOptions = {}) {
  const factories = {
    box: () => new THREE.BoxGeometry(1, 1, 1),
    cone: () => new THREE.ConeGeometry(0.5, 1, 7),
    cylinder: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
    rock: () => new THREE.DodecahedronGeometry(0.5, 0),
    crown: () => new THREE.IcosahedronGeometry(0.5, 1),
    ring: () => new THREE.RingGeometry(5.5, 9.2, 64)
  };
  const factory = factories[kind];
  if (!factory) return null;
  const mesh = new THREE.Mesh(
    this.getCachedGeometry(`environment-${kind}`, factory),
    this.material(color, { roughness: 0.88, metalness: 0.02, ...materialOptions })
  );
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.castShadow = kind !== 'ring' && materialOptions.transparent !== true;
  mesh.receiveShadow = kind !== 'cone';
  mesh.userData.decorative = true;
  this.environmentGroup.add(mesh);
  return mesh;
}
```

该 helper 只返回显示对象；不把对象加入 `tileMeshes`、`tileMeshPool`、单位池、寻路图或任何规则数据。

- [ ] **Step 6: Implement the six explicit procedural stages**

加入完整方法：

```js
createProceduralEnvironment(levelId) {
  const add = (...args) => this.addEnvironmentPrimitive(...args);
  const circle = (count, radius, callback) => {
    for (let i = 0; i < count; i += 1) {
      const angle = i * Math.PI * 2 / count;
      callback(i, angle, Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
  };

  if (levelId === 'flood-village') {
    add('ring', 0x28758a, [0, -0.18, 0], [1, 1, 1], [-Math.PI / 2, 0, 0], { transparent: true, opacity: 0.58, side: THREE.DoubleSide });
    for (const [x, z] of [[-6.4, -2.8], [-6.1, 2.6], [6.3, -3.1], [6.5, 2.4]]) {
      add('box', 0x8e633f, [x, 0.1, z], [0.72, 0.42, 0.72]);
      add('cone', 0x5a3045, [x, 0.58, z], [0.88, 0.52, 0.88], [0, Math.PI / 4, 0]);
    }
    circle(18, 6.8, (i, angle, x, z) => add('box', 0x9cdde5, [x, 2.1 + (i % 3) * 0.35, z], [0.018, 0.65, 0.018], [0, angle, 0.28], { transparent: true, opacity: 0.34 }));
  } else if (levelId === 'night-mine') {
    circle(14, 7.1, (i, angle, x, z) => add('rock', i % 2 ? 0x252832 : 0x343741, [x, 0.35, z], [1.2, 1 + (i % 3) * 0.22, 1.1], [i * 0.2, angle, 0]));
    add('box', 0x5f4a37, [0, -0.02, -6.0], [8.5, 0.06, 0.08]);
    add('box', 0x5f4a37, [0, -0.02, 6.0], [8.5, 0.06, 0.08]);
    circle(6, 6.2, (_i, angle, x, z) => add('cylinder', 0xe8dfc2, [x, 0.72, z], [0.16, 0.7, 0.16], [0, angle, 0], { emissive: 0xe8dfc2, emissiveIntensity: 0.75 }));
  } else if (levelId === 'giant-city') {
    circle(12, 7.0, (i, angle, x, z) => {
      add('cylinder', 0x5a4130, [x, 0.45, z], [0.22, 0.9, 0.22]);
      add('cone', i % 2 ? 0x2f7259 : 0x3e8767, [x, 1.25, z], [0.82, 1.4, 0.82], [0, angle, 0]);
    });
    for (let i = -4; i <= 4; i += 1) add('box', 0x7b7162, [i * 1.2, 0.42, -6.1], [1.05, 0.9, 0.48]);
    add('cylinder', 0x111713, [6.2, -0.08, -1.6], [1.5, 0.05, 0.72], [Math.PI / 2, 0.2, 0], { transparent: true, opacity: 0.45 });
    add('cylinder', 0x111713, [6.0, -0.08, 1.8], [1.8, 0.05, 0.8], [Math.PI / 2, -0.15, 0], { transparent: true, opacity: 0.45 });
  } else if (levelId === 'wordless-war') {
    for (const side of [-1, 1]) {
      for (const z of [-3, 0, 3]) {
        add('cylinder', 0x6e665b, [side * 6.25, 0.7, z], [0.09, 1.4, 0.09]);
        add('box', side < 0 ? 0x8d5466 : 0x675b92, [side * 6.05, 1.12, z], [0.48, 0.52, 0.035]);
      }
    }
    for (let i = -4; i <= 4; i += 1) add('rock', 0x7a746c, [i * 1.25, 0.18, 5.8], [0.42, 0.55, 0.42], [0, i * 0.3, 0]);
    add('box', 0x7e7396, [-5.7, 1.0, 0], [0.3, 2.2, 5.6], [0, 0, 0], { transparent: true, opacity: 0.12, depthWrite: false });
    add('box', 0xd4c07c, [5.7, 1.0, 0], [0.3, 2.2, 5.6], [0, 0, 0], { transparent: true, opacity: 0.08, depthWrite: false });
  } else if (levelId === 'memory-plague') {
    add('cylinder', 0x62462f, [0, 1.1, -6.45], [0.72, 2.2, 0.72]);
    add('crown', 0x58c99d, [0, 2.75, -6.45], [2.15, 1.55, 2.15], [0, 0, 0], { emissive: 0x173e32, emissiveIntensity: 0.35 });
    circle(18, 6.1, (i, angle, x, z) => add('box', i % 2 ? 0xaa94d3 : 0xd7ca93, [x, 1.0 + (i % 4) * 0.4, z], [0.035, 0.28, 0.08], [0.2, angle, i * 0.12], { transparent: true, opacity: 0.62, emissive: 0x6f579c, emissiveIntensity: 0.2 }));
  } else if (levelId === 'final-exam') {
    const fragments = [
      ['cone', 0x5a3045, 0.8], ['rock', 0x343741, 1.0], ['cone', 0x3e8767, 1.2],
      ['box', 0x675b92, 0.85], ['crown', 0x58c99d, 1.05]
    ];
    fragments.forEach(([kind, color, scale], index) => {
      const angle = index * Math.PI * 2 / fragments.length;
      add(kind, color, [Math.cos(angle) * 6.6, 0.72, Math.sin(angle) * 6.6], [scale, scale, scale], [0.2, -angle, 0.15]);
    });
    add('ring', 0x8f73c8, [0, 0.02, 0], [0.76, 0.76, 0.76], [-Math.PI / 2, 0, 0], { transparent: true, opacity: 0.32, emissive: 0x8f73c8, emissiveIntensity: 0.35, side: THREE.DoubleSide });
  }
}
```

- [ ] **Step 7: Apply preset synchronously during level load**

加入：

```js
applyLevelEnvironment(levelId) {
  const preset = LEVEL_ENVIRONMENTS[levelId] || LEVEL_ENVIRONMENTS['final-exam'];
  this.clearLevelEnvironment();
  this.scene.background.setHex(preset.background);
  this.scene.fog.color.setHex(preset.fog);
  this.scene.fog.near = preset.near;
  this.scene.fog.far = preset.far;
  this.ambientLight.intensity = preset.ambient;
  this.sunLight.color.setHex(preset.sun);
  this.sunLight.intensity = preset.sunPower;
  this.rimLight.color.setHex(preset.rim);
  this.createProceduralEnvironment(levelId);
  this.environmentGroup.userData.levelId = levelId;
}
```

在 `loadLevel()` 的 `renderWorld()` 之前调用：

```js
this.applyLevelEnvironment(this.level.id);
```

保持 `onPointerDown()` 只从 `tileMeshPool` 形成 raycast targets；不要把 `environmentGroup` 传给 `intersectObjects()`。

- [ ] **Step 8: Exercise all six stages without changing game rules**

在 `runBrowserDemoSmoke()` 的 return 前加入：

```js
const environmentChecks = LEVELS.map(level => {
  this.applyLevelEnvironment(level.id);
  return this.environmentGroup.userData.levelId === level.id
    && this.environmentGroup.children.length > 0
    && this.environmentGroup.children.every(child => child.userData.decorative === true);
});
this.applyLevelEnvironment(this.level.id);
record('all six level environments install decorative geometry', environmentChecks.every(Boolean));
```

- [ ] **Step 9: Run focused regressions and commit**

Run:

```powershell
node debug/browser-demo-smoke.js
npm run check
npm run test:reality
```

Expected: all PASS；环境切换不改变 level state、tile pools 或规则测试。

```powershell
git add public/js/game.js debug/browser-demo-smoke.js
git commit -m "feat: add six procedural level environments"
```

### Task 7: Generate, Audit and Serve the Fixed Art Set

**Files:**
- Create: `public/assets/art/cg-prologue.webp`
- Create: `public/assets/art/cg-night-watch.webp`
- Create: `public/assets/art/cg-airspace-bridge.webp`
- Create: `public/assets/art/cg-ending.webp`
- Create: `public/assets/art/textures/paper002-ui-grain.webp`
- Create: `public/assets/art/ATTRIBUTION.md`
- Create: `debug/art-assets-tests.js`
- Modify: `public/styles.css`
- Modify: `server.js:63-73`
- Modify: `debug/server-api-tests.js:61-148`
- Modify: `debug/verify-all.js:3-19`
- Test: `debug/art-assets-tests.js` and `debug/server-api-tests.js`

**Interfaces:**
- Consumes: built-in `image_gen` tool, Codex bundled Sharp 0.34.5, ambientCG official CC0 file.
- Produces: five local WebP files, an auditable attribution ledger, server response `Content-Type: image/webp` and a hard 10 MiB art budget.

- [ ] **Step 1: Write the failing asset audit**

创建 `debug/art-assets-tests.js`：

```js
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const artUrl = new URL('../public/assets/art/', import.meta.url);
const artPath = fileURLToPath(artUrl);
const required = new Map([
  ['cg-prologue.webp', { width: 1920, height: 1080, maxBytes: 2621440 }],
  ['cg-night-watch.webp', { width: 2520, height: 1080, maxBytes: 3145728 }],
  ['cg-airspace-bridge.webp', { width: 1920, height: 1080, maxBytes: 2097152 }],
  ['cg-ending.webp', { width: 1920, height: 1080, maxBytes: 2621440 }],
  ['textures/paper002-ui-grain.webp', { width: 512, height: 512, maxBytes: 32768 }]
]);

function uint24(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function webpSize(buffer) {
  assert.equal(buffer.subarray(0, 4).toString(), 'RIFF');
  assert.equal(buffer.subarray(8, 12).toString(), 'WEBP');
  const chunk = buffer.subarray(12, 16).toString();
  if (chunk === 'VP8X') {
    return { width: uint24(buffer, 24) + 1, height: uint24(buffer, 27) + 1 };
  }
  if (chunk === 'VP8 ') {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff
    };
  }
  if (chunk === 'VP8L') {
    const b1 = buffer[21];
    const b2 = buffer[22];
    const b3 = buffer[23];
    const b4 = buffer[24];
    return {
      width: 1 + (b1 | ((b2 & 0x3f) << 8)),
      height: 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10))
    };
  }
  throw new Error(`Unsupported WebP chunk ${chunk}`);
}

function listFiles(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const relative = path.posix.join(prefix, entry.name);
    return entry.isDirectory()
      ? listFiles(path.join(dir, entry.name), relative)
      : [relative];
  });
}

assert.ok(existsSync(artPath), 'public/assets/art must exist');
const attribution = readFileSync(new URL('../public/assets/art/ATTRIBUTION.md', import.meta.url), 'utf8');
for (const [relative, expected] of required) {
  const filePath = path.join(artPath, ...relative.split('/'));
  assert.ok(existsSync(filePath), `missing art asset ${relative}`);
  const data = readFileSync(filePath);
  const size = webpSize(data);
  assert.deepEqual(size, { width: expected.width, height: expected.height }, `${relative} dimensions`);
  assert.ok(data.length <= expected.maxBytes, `${relative} exceeds its byte ceiling`);
  assert.ok(attribution.includes(relative), `${relative} must appear in ATTRIBUTION.md`);
}

const assetFiles = listFiles(artPath).filter(file => !file.endsWith('.md'));
const totalBytes = assetFiles.reduce((sum, relative) => sum + statSync(path.join(artPath, ...relative.split('/'))).size, 0);
assert.ok(totalBytes <= 10 * 1024 * 1024, `art assets exceed 10 MiB: ${totalBytes}`);

const serverSource = readFileSync(new URL('../server.js', import.meta.url), 'utf8');
assert.ok(serverSource.includes("'.webp': 'image/webp'"), 'server MIME table must include WebP');
assert.ok(attribution.includes('CC0 1.0'), 'attribution must record the public asset license');
assert.ok(attribution.includes('11AE4A4057C81FAADC0F8BBE8E1C230BC939DCC3DF9222CEC83BD107B1D7C8C4'), 'Paper002 hash must be pinned');

console.log(`Art asset tests passed (${assetFiles.length} files, ${totalBytes} bytes).`);
```

在 `debug/verify-all.js` 的 `suites` 中、server-api 前加入：

```js
{ label: 'art-assets', command: 'node', args: ['debug/art-assets-tests.js'] },
```

- [ ] **Step 2: Run the audit to verify RED**

Run:

```powershell
node debug/art-assets-tests.js
```

Expected: FAIL with `public/assets/art must exist`。

- [ ] **Step 3: Download and pin the one worthwhile public asset**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'public\assets\art\textures' | Out-Null
Invoke-WebRequest -Uri 'https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/512-WEBP/Paper002.webp' -OutFile 'public\assets\art\textures\paper002-ui-grain.webp'
$paper = Get-Item -LiteralPath 'public\assets\art\textures\paper002-ui-grain.webp'
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $paper.FullName).Hash
if ($paper.Length -ne 23062 -or $hash -ne '11AE4A4057C81FAADC0F8BBE8E1C230BC939DCC3DF9222CEC83BD107B1D7C8C4') { throw 'Paper002 integrity check failed' }
```

Expected: command exits 0；精确大小 23,062 bytes，哈希与固定值一致。

把它作为低透明 UI 纹理加入 Task 3 的 `.glass` 规则，不改变本地 fallback：

```css
.glass {
  background-image:
    linear-gradient(rgba(21, 25, 35, .95), rgba(21, 25, 35, .98)),
    url('./assets/art/textures/paper002-ui-grain.webp');
  background-blend-mode: normal, soft-light;
  background-size: auto, 512px 512px;
}
```

- [ ] **Step 4: Generate the four CGs with the built-in image generation tool**

This step is caused by the approved `imagegen` skill: call `image_gen__imagegen` once for each prompt below, omit both reference-image arguments, and retain each returned local output path for Step 5.

**`cg-prologue` prompt**

```text
Create a wide 16:9 cinematic environment key art for a mythic tactical game, viewed at blue hour. A fractured world surrounds a distant seven-by-seven stone strategy board on a floating plateau; a black-violet rift crosses the sky. At the far edges, subtly unify flooded village roofs, cold mine lights, a forest wall, two opposing border banners, and a pale sacred tree. Human presence is limited to tiny anonymous silhouettes, never a central hero. Do not depict any identifiable summoned object or player creation. Matte gouache mixed with elegant low-poly faceted forms, restrained painterly texture, deep navy world, antique warm gold story light, jade interaction light, muted rift purple. Strong foreground-midground-background separation. Keep the left 35 percent calm and dark for an HTML title and keep the lower-right corner readable for an HTML button. No words, letters, numbers, UI, logo, signature, or watermark.
```

**`cg-night-watch` prompt**

```text
Create one continuous ultrawide 21:9 cinematic panorama for a three-slide night-watch sequence in a mythic low-poly world. The left third shows residents repairing a distant city wall under warm lamps before the siege; the middle third shows six layered bands of night and abstract rift tide pressing toward the wall; the right third shows the final gate, exhausted residents, and a thin cold horizon with no sunrise. The three thirds must feel like one uninterrupted landscape and each third must work as a 16:9 crop. Only tiny anonymous resident silhouettes and abstract miracle light; do not show a specific weapon, tower, creature, or player creation. Matte dark faceted geometry with painterly atmosphere, deep charcoal and navy, warm antique gold, restrained jade, muted purple anomaly light. Leave quiet dark zones in the upper-left of each third for HTML copy. No text, letters, numbers, UI, logo, signature, or watermark.
```

**`cg-airspace-bridge` prompt**

```text
Create a 16:9 cinematic transition environment for entering a mythic rift airspace after a long night defense. The ground world folds upward into the sky like layered map fragments compressed by a vertical violet rift; distant wall, flooded roofs, forest, mine lights, banners, and sacred-tree glow become tiny abstract strata below. A narrow path of white-gold and jade light rises into a vast dark aerial corridor. No visible aircraft in the foreground, no named hero, and no concrete player creation; the miracle must remain abstract. Matte gouache and sophisticated low-poly facets, deep navy and charcoal, antique gold, jade, restrained purple. Keep the left third dark and low-detail for HTML briefing copy and the lower-right safe for a button. No words, letters, numbers, UI, logo, signature, or watermark.
```

**`cg-ending` prompt**

```text
Create a neutral 16:9 final-world environment plate for a mythic tactical game's ending. Five remembered landscapes—flooded village, dark mine, forest city wall, divided border, and luminous sacred tree—have become quiet fragments orbiting a healed but still visible rift above a distant world horizon. The image must support either victory or loss through later HTML color overlays, so avoid triumphant celebration and avoid total destruction. Only tiny anonymous silhouettes, no hero portrait, no identifiable summoned object, and no specific player creation. Matte painterly low-poly facets, deep blue-black world, balanced antique gold and jade, soft muted purple cracks. Preserve calm negative space across the center-left for dynamic ending text and keep all critical details away from the lower-right button zone. No words, letters, numbers, UI, logo, signature, or watermark.
```

Expected: four generated bitmap results with the requested safe zones, no text artifacts and no specific realtime creation.

- [ ] **Step 5: Inspect each generated result before conversion**

Use `view_image` on each returned local path at original detail. Reject and regenerate a result if it contains text-like marks, a central hero, a concrete summon, a watermark, or fills its reserved HTML safe zone. Do not repair these failures with code; use the same prompt with one concise corrective sentence appended.

- [ ] **Step 6: Convert the accepted results to exact local WebP targets**

First call `codex_app__load_workspace_dependencies` and use the returned paths. In this workspace the bundle is located below; this is a build-time tool only and is not added to `package.json`:

```powershell
$node = 'C:\Users\liu_j\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$pnpmStore = 'C:\Users\liu_j\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm'
$sharpPackage = (Get-ChildItem -LiteralPath $pnpmStore -Directory -Filter 'sharp@*' | Sort-Object Name -Descending | Select-Object -First 1).FullName
$sharp = Join-Path $sharpPackage 'node_modules\sharp'
$conversionScript = @'
const sharp = require(process.argv[1]);
const [input, output, width, height] = process.argv.slice(2);
sharp(input)
  .resize(Number(width), Number(height), { fit: 'cover', position: 'attention' })
  .webp({ quality: 82, effort: 6, smartSubsample: true })
  .toFile(output)
  .then(info => console.log(JSON.stringify(info)))
  .catch(error => { console.error(error); process.exit(1); });
'@
function Convert-Cg([string]$InputPath, [string]$OutputPath, [int]$Width, [int]$Height) {
  & $node -e $conversionScript $sharp $InputPath $OutputPath $Width $Height
  if ($LASTEXITCODE -ne 0) { throw "WebP conversion failed: $OutputPath" }
}
```

Assign the exact four local paths returned by Step 4 to `$prologueOutput`, `$nightWatchOutput`, `$airspaceOutput`, and `$endingOutput`, then run:

```powershell
New-Item -ItemType Directory -Force -Path 'public\assets\art' | Out-Null
Convert-Cg $prologueOutput 'public\assets\art\cg-prologue.webp' 1920 1080
Convert-Cg $nightWatchOutput 'public\assets\art\cg-night-watch.webp' 2520 1080
Convert-Cg $airspaceOutput 'public\assets\art\cg-airspace-bridge.webp' 1920 1080
Convert-Cg $endingOutput 'public\assets\art\cg-ending.webp' 1920 1080
```

Expected: Sharp prints four JSON results with the exact target dimensions; no source image is copied into the repository.

- [ ] **Step 7: Reinspect the final WebPs after the exact crop**

Use `view_image` on all four files under `public/assets/art/`. Confirm the night panorama still has three useful crop regions and the 16:9 attention crops did not remove the title/button safe zones.

- [ ] **Step 8: Write the complete provenance ledger**

创建 `public/assets/art/ATTRIBUTION.md` with these exact sections and full metadata. Generated CG provenance is defined by model, date, full prompt and deterministic post-processing; the externally downloaded CC0 file additionally uses its pinned SHA-256.

```markdown
# Art Asset Provenance

All files are stored locally. The running game does not request any image-generation or third-party asset service.

## cg-prologue.webp

- Kind: development-time generated fixed CG
- Model: OpenAI image-2
- Generated: 2026-07-10
- Local file: `cg-prologue.webp`
- Dimensions: 1920×1080
- Final prompt: Create a wide 16:9 cinematic environment key art for a mythic tactical game, viewed at blue hour. A fractured world surrounds a distant seven-by-seven stone strategy board on a floating plateau; a black-violet rift crosses the sky. At the far edges, subtly unify flooded village roofs, cold mine lights, a forest wall, two opposing border banners, and a pale sacred tree. Human presence is limited to tiny anonymous silhouettes, never a central hero. Do not depict any identifiable summoned object or player creation. Matte gouache mixed with elegant low-poly faceted forms, restrained painterly texture, deep navy world, antique warm gold story light, jade interaction light, muted rift purple. Strong foreground-midground-background separation. Keep the left 35 percent calm and dark for an HTML title and keep the lower-right corner readable for an HTML button. No words, letters, numbers, UI, logo, signature, or watermark.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 82, effort 6, smart subsample

## cg-night-watch.webp

- Kind: development-time generated fixed CG
- Model: OpenAI image-2
- Generated: 2026-07-10
- Local file: `cg-night-watch.webp`
- Dimensions: 2520×1080
- Final prompt: Create one continuous ultrawide 21:9 cinematic panorama for a three-slide night-watch sequence in a mythic low-poly world. The left third shows residents repairing a distant city wall under warm lamps before the siege; the middle third shows six layered bands of night and abstract rift tide pressing toward the wall; the right third shows the final gate, exhausted residents, and a thin cold horizon with no sunrise. The three thirds must feel like one uninterrupted landscape and each third must work as a 16:9 crop. Only tiny anonymous resident silhouettes and abstract miracle light; do not show a specific weapon, tower, creature, or player creation. Matte dark faceted geometry with painterly atmosphere, deep charcoal and navy, warm antique gold, restrained jade, muted purple anomaly light. Leave quiet dark zones in the upper-left of each third for HTML copy. No text, letters, numbers, UI, logo, signature, or watermark.
- Post-processing: Sharp attention crop to 2520×1080, WebP quality 82, effort 6, smart subsample

## cg-airspace-bridge.webp

- Kind: development-time generated fixed CG
- Model: OpenAI image-2
- Generated: 2026-07-10
- Local file: `cg-airspace-bridge.webp`
- Dimensions: 1920×1080
- Final prompt: Create a 16:9 cinematic transition environment for entering a mythic rift airspace after a long night defense. The ground world folds upward into the sky like layered map fragments compressed by a vertical violet rift; distant wall, flooded roofs, forest, mine lights, banners, and sacred-tree glow become tiny abstract strata below. A narrow path of white-gold and jade light rises into a vast dark aerial corridor. No visible aircraft in the foreground, no named hero, and no concrete player creation; the miracle must remain abstract. Matte gouache and sophisticated low-poly facets, deep navy and charcoal, antique gold, jade, restrained purple. Keep the left third dark and low-detail for HTML briefing copy and the lower-right safe for a button. No words, letters, numbers, UI, logo, signature, or watermark.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 82, effort 6, smart subsample

## cg-ending.webp

- Kind: development-time generated fixed CG
- Model: OpenAI image-2
- Generated: 2026-07-10
- Local file: `cg-ending.webp`
- Dimensions: 1920×1080
- Final prompt: Create a neutral 16:9 final-world environment plate for a mythic tactical game's ending. Five remembered landscapes—flooded village, dark mine, forest city wall, divided border, and luminous sacred tree—have become quiet fragments orbiting a healed but still visible rift above a distant world horizon. The image must support either victory or loss through later HTML color overlays, so avoid triumphant celebration and avoid total destruction. Only tiny anonymous silhouettes, no hero portrait, no identifiable summoned object, and no specific player creation. Matte painterly low-poly facets, deep blue-black world, balanced antique gold and jade, soft muted purple cracks. Preserve calm negative space across the center-left for dynamic ending text and keep all critical details away from the lower-right button zone. No words, letters, numbers, UI, logo, signature, or watermark.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 82, effort 6, smart subsample

## textures/paper002-ui-grain.webp

- Kind: public CC0 texture preview
- Original asset: ambientCG Paper 002
- Official page: https://ambientcg.com/a/Paper002
- Official file: https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/512-WEBP/Paper002.webp
- Author / publisher: ambientCG, operated by Lennart Demes
- License: CC0 1.0; ambientCG license explicitly covers asset preview renders
- License page: https://docs.ambientcg.com/license/
- Downloaded: 2026-07-10
- Local file: `textures/paper002-ui-grain.webp`
- Dimensions: 512×512
- Modification: renamed only; rendered at low opacity as a local matte-paper UI overlay
- SHA-256: `11AE4A4057C81FAADC0F8BBE8E1C230BC939DCC3DF9222CEC83BD107B1D7C8C4`
```

- [ ] **Step 9: Add WebP MIME support and a real HTTP assertion**

在 `server.js` MIME map 加入：

```js
'.webp': 'image/webp',
```

不要加入 `.glb`，因为本计划没有提交 GLB。

在 `debug/server-api-tests.js` health assertions 后加入：

```js
const cgResponse = await fetch(`${baseUrl}/assets/art/cg-prologue.webp`);
assert(cgResponse.status === 200, 'prologue CG should be served');
assert(cgResponse.headers.get('content-type') === 'image/webp', 'WebP should use image/webp');
const cgBytes = new Uint8Array(await cgResponse.arrayBuffer());
assert(new TextDecoder().decode(cgBytes.slice(0, 4)) === 'RIFF', 'served CG should keep RIFF magic');
assert(new TextDecoder().decode(cgBytes.slice(8, 12)) === 'WEBP', 'served CG should keep WEBP magic');
```

- [ ] **Step 10: Run art, HTTP and syntax verification**

Run:

```powershell
node debug/art-assets-tests.js
node debug/server-api-tests.js
npm run check
```

Expected: `Art asset tests passed (5 files, ... bytes).`、`Server API tests passed`、syntax PASS；总 art bytes 不超过 10 MiB。

- [ ] **Step 11: Commit the audited local art set**

```powershell
git add public/assets/art public/styles.css server.js debug/art-assets-tests.js debug/server-api-tests.js debug/verify-all.js
git commit -m "feat: add audited fixed art assets"
```

### Task 8: Integrate Prologue, Night-Watch, Airspace and Ending CGs

**Files:**
- Modify: `public/index.html` before `#toast`
- Modify: `public/styles.css` after signal styles
- Modify: `public/js/game.js:101-206,308-417,541-713,1272-1323`
- Modify: `public/modes/tower-defense/towerBridge.js:296-365,563-667`
- Modify: `public/modes/air-combat/style.css:200-240`
- Modify: `debug/browser-demo-smoke.js`
- Modify: `debug/browser-modes-smoke.js`
- Test: `debug/browser-demo-smoke.js` and `debug/browser-modes-smoke.js`

**Interfaces:**
- Consumes: Task 7 的四张本地 CG；现有 tower `cutsceneSlides()`、air `briefingSlides()` 和 main `applyAirCombatResult()`。
- Produces: `showCinematic(options)`、`closeCinematic()`、`showPrologueCinematic()`、`showEndingCinematic(result)`；tower slide field `artPosition`。

- [ ] **Step 1: Add failing main/mode CG source contracts**

在 `debug/browser-demo-smoke.js` 加入：

```js
for (const asset of ['cg-prologue.webp', 'cg-ending.webp']) {
  assert.ok(gameSource.includes(asset) || cssSource.includes(asset), `main flow should use ${asset}`);
}
assert.ok(htmlSource.includes('id="cinematic"'), 'main page should expose a fixed cinematic dialog');
assert.ok(gameSource.includes("creatorExamPrologueSeen"), 'prologue should be session-scoped');
assert.ok(gameSource.includes('showEndingCinematic(result)'), 'air result should open the ending plate');
```

在 `debug/browser-modes-smoke.js` 读取 air CSS：

```js
const airCss = read('public/modes/air-combat/style.css');
assert.ok(towerBridge.includes('../../assets/art/cg-night-watch.webp'), 'Night Watch should use the local panorama');
for (const position of ['0% 50%', '50% 50%', '100% 50%']) {
  assert.ok(towerBridge.includes(position), `Night Watch should include crop ${position}`);
}
assert.ok(airCss.includes('../../assets/art/cg-airspace-bridge.webp'), 'Air briefing should use the local bridge CG');
```

- [ ] **Step 2: Run both smokes to verify RED**

Run:

```powershell
node debug/browser-demo-smoke.js
node debug/browser-modes-smoke.js
```

Expected: both FAIL on missing CG integration assertions。

- [ ] **Step 3: Add one reusable main-page cinematic dialog**

在 `#world-signal` 后、toast 前加入：

```html
<section id="cinematic" class="cinematic" role="dialog" aria-modal="true" aria-labelledby="cinematic-title" hidden>
  <div class="cinematic-art" aria-hidden="true"></div>
  <div class="cinematic-copy">
    <div id="cinematic-kicker" class="eyebrow"></div>
    <h2 id="cinematic-title" tabindex="-1"></h2>
    <p id="cinematic-text"></p>
    <div class="cinematic-actions">
      <button id="cinematic-skip" class="secondary" type="button">跳过</button>
      <button id="cinematic-primary" class="primary" type="button">继续</button>
    </div>
  </div>
</section>
```

在 `collectUi()` 加入全部六个 ID：`cinematic`、`cinematicKicker`、`cinematicTitle`、`cinematicText`、`cinematicSkip`、`cinematicPrimary`。

- [ ] **Step 4: Implement the main cinematic lifecycle**

在 constructor 初始化：

```js
this.cinematicCloseAction = null;
this.cinematicWasResolving = false;
```

加入完整方法：

```js
showCinematic({ variant, kicker, title, text, primary = '继续', onClose = null }) {
  this.cinematicWasResolving = this.isResolvingTurn;
  this.cinematicCloseAction = onClose;
  this.ui.cinematic.dataset.cinematic = variant;
  this.ui.cinematicKicker.textContent = kicker;
  this.ui.cinematicTitle.textContent = title;
  this.ui.cinematicText.textContent = text;
  this.ui.cinematicPrimary.textContent = primary;
  this.ui.cinematic.hidden = false;
  this.setTurnControlsPending(true);
  window.requestAnimationFrame(() => this.ui.cinematicTitle.focus());
}

closeCinematic() {
  if (this.ui.cinematic.hidden) return false;
  const action = this.cinematicCloseAction;
  this.cinematicCloseAction = null;
  this.ui.cinematic.hidden = true;
  this.setTurnControlsPending(this.cinematicWasResolving);
  action?.();
  return true;
}

showPrologueCinematic() {
  let seen = false;
  try { seen = sessionStorage.getItem('creatorExamPrologueSeen') === '1'; } catch (_error) {}
  if (seen) return;
  this.showCinematic({
    variant: 'prologue',
    kicker: '考核开始',
    title: '世界只接受能落在棋盘上的答案',
    text: '读懂眼前的灾难，用一句话造物，再把它放到真正需要它的格子。',
    primary: '开始造物',
    onClose: () => {
      try { sessionStorage.setItem('creatorExamPrologueSeen', '1'); } catch (_error) {}
      this.ui.input.focus();
    }
  });
}

showEndingCinematic(result) {
  const victory = result?.outcome === 'victory';
  this.showCinematic({
    variant: victory ? 'ending-victory' : 'ending-loss',
    kicker: '第七日清算',
    title: victory ? '世界记住了你的答案' : '裂隙记住了这次代价',
    text: `${result?.notableMoment || '空域已经给出裁决。'} 结局修饰：${result?.endingModifier || '未命名'}`,
    primary: '回到世界志',
    onClose: () => this.openDrawer('world', 'air-combat-panel', document.getElementById('drawer-world-btn'))
  });
}
```

在 `bindEvents()` 加入：

```js
this.ui.cinematicSkip?.addEventListener('click', () => this.closeCinematic());
this.ui.cinematicPrimary?.addEventListener('click', () => this.closeCinematic());
this.ui.cinematic?.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    this.closeCinematic();
  }
});
```

constructor 在 `loadLevel(0)` 后加入：

```js
window.requestAnimationFrame(() => this.showPrologueCinematic());
```

`applyAirCombatResult(result)` 的首次结果路径在 `updateUi()` 后加入：

```js
this.showEndingCinematic(result);
```

- [ ] **Step 5: Style main CGs with complete gradient fallbacks**

```css
.cinematic {
  position: fixed; inset: 0; z-index: 110; display: grid; place-items: center;
  padding: clamp(18px, 4vw, 64px); background: #070a11;
}
.cinematic[hidden] { display: none; }
.cinematic-art { position: absolute; inset: 0; background-color: #0b0f18; background-position: center; background-size: cover; }
.cinematic[data-cinematic="prologue"] .cinematic-art {
  background-image: linear-gradient(90deg, rgba(7, 10, 17, .92) 0%, rgba(7, 10, 17, .38) 58%, rgba(7, 10, 17, .76) 100%), url('./assets/art/cg-prologue.webp');
}
.cinematic[data-cinematic^="ending"] .cinematic-art {
  background-image: linear-gradient(90deg, rgba(7, 10, 17, .9) 0%, rgba(7, 10, 17, .42) 62%, rgba(7, 10, 17, .78) 100%), url('./assets/art/cg-ending.webp');
}
.cinematic[data-cinematic="ending-loss"] .cinematic-art { filter: saturate(.7) hue-rotate(12deg); }
.cinematic-copy {
  position: relative; justify-self: start; width: min(540px, 88vw); padding: clamp(20px, 4vw, 48px);
  color: var(--text-main); background: rgba(7, 10, 17, .78); border-left: 3px solid var(--narrative);
}
.cinematic-copy h2 { font-family: Georgia, 'Songti SC', serif; font-size: clamp(30px, 5vw, 68px); line-height: 1.04; }
.cinematic-actions { display: flex; gap: 10px; margin-top: 24px; }
@media (prefers-reduced-motion: reduce) { .cinematic-art { transition: none; transform: none; } }
```

If a WebP is missing or fails to decode, the `background-color` and linear gradient remain; copy and both buttons are independent HTML.

- [ ] **Step 6: Reuse one night-watch panorama across all three slides**

在 `cutsceneSlides()` 三个对象分别加入：

```js
artPosition: '0% 50%'
```

```js
artPosition: '50% 50%'
```

```js
artPosition: '100% 50%'
```

在 overlay attributes 加入：

```js
overlay.setAttribute('aria-modal', 'true');
```

在 `render()` 写入 crop：

```js
overlay.querySelector('.night-watch-cg-visual').style.setProperty('--night-watch-cg-position', slide.artPosition);
```

在 tower 注入 CSS 中替换 `.night-watch-cg-visual` 的纯 CSS 图形背景：

```css
.night-watch-cg-visual {
  min-height: min(58vh, 620px);
  background-color: #0b0f18;
  background-image:
    linear-gradient(90deg, rgba(7,10,17,.82), rgba(7,10,17,.2) 58%, rgba(7,10,17,.62)),
    url('../../assets/art/cg-night-watch.webp');
  background-position: center, var(--night-watch-cg-position, 50% 50%);
  background-size: cover;
  transition: background-position 520ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .night-watch-cg-visual { transition: none; }
}
```

保留原 skip/next 按钮和文案；过场创建后将 next button focus。

- [ ] **Step 7: Put the airspace bridge behind the existing briefing UI**

在 `public/modes/air-combat/style.css` 的 `.airspace-menu` 使用：

```css
.airspace-menu {
  background-color: rgba(9, 13, 16, .96);
  background-image:
    linear-gradient(90deg, rgba(7, 10, 17, .86), rgba(7, 10, 17, .54) 58%, rgba(7, 10, 17, .9)),
    url('../../assets/art/cg-airspace-bridge.webp');
  background-position: center;
  background-size: cover;
}
```

不新增空战状态、不修改 `AirCombatBridge.briefingSlides()`、context keys 或 result payload；图片失败时 solid color 与 gradient 仍完整。

- [ ] **Step 8: Run both focused smokes and asset audit**

Run:

```powershell
node debug/browser-demo-smoke.js
node debug/browser-modes-smoke.js
node debug/art-assets-tests.js
npm run check
```

Expected: all PASS。

- [ ] **Step 9: Commit all four integration seams**

```powershell
git add public/index.html public/styles.css public/js/game.js public/modes/tower-defense/towerBridge.js public/modes/air-combat/style.css debug/browser-demo-smoke.js debug/browser-modes-smoke.js
git commit -m "feat: integrate fixed story cinematics"
```

### Task 9: Load Only the Current and Next Air-Combat Stage Assets

**Files:**
- Modify: `public/modes/air-combat/airCombatAssets.js:103-127,202-215`
- Modify: `public/modes/air-combat/airCombatGame.js:1-5,1299-1311,1246-1293`
- Modify: `debug/current-code-reality-tests.js`
- Modify: `debug/browser-modes-smoke.js`
- Test: `debug/current-code-reality-tests.js` VM sandbox and `debug/browser-modes-smoke.js`

**Interfaces:**
- Consumes: current route boss, loadout, resonance, `backgroundWorldForRoute()` and `SKYWARD_BOSS_PROTOTYPES`.
- Produces: `StageAssetPlan = { shipKey, includeWingman, world, bossIndex, enemyTypes, effectKeys }`；`AirCombatAssets.prepareStages(current, next) -> { current: string[], prefetched: string[] }`。

- [ ] **Step 1: Add a failing VM behavior test**

在 `debug/current-code-reality-tests.js` 顶层加入：

```js
function loadAirAssetsForRequests() {
  const requests = [];
  class FakeImage {
    constructor() {
      this.complete = false;
      this.naturalWidth = 0;
      this.fetchPriority = 'auto';
    }
    set src(value) {
      this._src = value;
      requests.push({ src: value, priority: this.fetchPriority });
    }
    get src() { return this._src; }
  }
  const sandbox = { window: {}, Image: FakeImage };
  runInNewContext(readSource('public/modes/air-combat/airCombatAssets.js'), sandbox);
  return { assets: sandbox.window.AirCombatAssets, requests };
}

{
  const { assets, requests } = loadAirAssetsForRequests();
  assert.equal(requests.length, 0, 'air assets should make zero requests before a stage plan');
  const current = {
    shipKey: 'balanced', includeWingman: false, world: 8, bossIndex: 9,
    enemyTypes: ['small', 'medium', 'mineLayer'], effectKeys: ['floatingMine']
  };
  const next = {
    shipKey: 'balanced', includeWingman: true, world: 6, bossIndex: 7,
    enemyTypes: ['medium', 'gunner', 'phantom'], effectKeys: []
  };
  const first = assets.prepareStages(current, next);
  assert.ok(first.current.length > 0 && first.prefetched.length > 0, 'current and next stage should both be planned');
  assert.ok(requests.some(item => item.src.includes('world-08') && item.priority === 'high'), 'current background should be high priority');
  assert.ok(requests.some(item => item.src.includes('world-06') && item.priority === 'low'), 'next background should be low priority');
  assert.ok(!requests.some(item => item.src.includes('world-03')), 'unplanned stage backgrounds must not load');
  const afterFirst = requests.length;
  assets.prepareStages(current, next);
  assert.equal(requests.length, afterFirst, 'repeating the same plan must not create duplicate Image requests');
  assert.equal(assets.ready(assets.manifest.background[8].base), null, 'incomplete images must use the procedural fallback');

  const later = {
    shipKey: 'attacker', includeWingman: false, world: 3, bossIndex: 2,
    enemyTypes: ['large', 'sniper'], effectKeys: []
  };
  assets.prepareStages(next, later);
  assert.ok(!assets.cachedSources().some(src => src.includes('world-08')), 'past-stage JS references should be evicted');
  assert.ok(assets.cachedSources().some(src => src.includes('world-03')), 'newly prefetched stage should be retained');
  assert.ok(assets.cachedSources().length < assets.sources().length, 'stage cache must stay smaller than the full manifest');
}
```

- [ ] **Step 2: Run reality tests to verify RED**

Run:

```powershell
npm run test:reality
```

Expected: FAIL with `assets.prepareStages is not a function`。

- [ ] **Step 3: Replace full-manifest loading with descriptor loading**

在 `airCombatAssets.js` 用下面实现替换 `load()`；保留 `ready()`、draw helpers 与 manifest：

```js
function stageSources(plan) {
  if (!plan) return [];
  const sources = [
    manifest.player[plan.shipKey],
    plan.includeWingman ? manifest.wingman[plan.shipKey] : null,
    manifest.boss[plan.bossIndex],
    ...Object.values(manifest.background[plan.world] || {}),
    ...(plan.enemyTypes || []).map(type => manifest.enemy[type]),
    ...(plan.effectKeys || []).map(key => manifest.effect[key])
  ];
  return [...new Set(sources.filter(Boolean))];
}

function loadSources(sources, fetchPriority) {
  for (const src of sources) {
    if (!src || cache.has(src)) continue;
    const img = new Image();
    img.decoding = 'async';
    try { img.fetchPriority = fetchPriority; } catch (_error) {}
    cache.set(src, img);
    img.src = src;
  }
}

function prepareStages(current, next = null) {
  const currentSources = stageSources(current);
  const prefetchedSources = stageSources(next).filter(src => !currentSources.includes(src));
  const keep = new Set([...currentSources, ...prefetchedSources]);
  for (const src of cache.keys()) {
    if (!keep.has(src)) cache.delete(src);
  }
  loadSources(currentSources, 'high');
  loadSources(prefetchedSources, 'low');
  return { current: currentSources, prefetched: prefetchedSources };
}

function load(plan) {
  return plan ? prepareStages(plan) : { current: [], prefetched: [] };
}
```

用下面对象替换 window export 的加载字段，同时保留其余 accessors：

```js
window.AirCombatAssets = {
  manifest,
  load,
  stageSources,
  prepareStages,
  cachedSources: () => [...cache.keys()],
  ready,
  draw,
  drawScrolling,
  player: key => ready(manifest.player[key]),
  wingman: key => ready(manifest.wingman[key]),
  enemy: type => ready(manifest.enemy[type]),
  boss: index => ready(manifest.boss[index]),
  effect: key => ready(manifest.effect[key]),
  background: (world, layer) => ready(manifest.background[world]?.[layer]),
  sources: () => collectSources(manifest, [])
};
```

The compatibility `load()` deliberately performs no request when called without a plan; no path may call `collectSources(manifest)` for eager loading.

- [ ] **Step 4: Extract the exact enemy pool so rendering and asset planning share it**

在 `airCombatGame.js` 的 helpers 区加入：

```js
function enemyPoolForStage(stage) {
  return stage < 2 ? ['small', 'small', 'medium']
    : stage < 3 ? ['small', 'medium', 'large', 'gunner', 'splitter', 'beacon']
      : stage < 5 ? ['medium', 'large', 'gunner', 'splitter', 'sniper', 'detonator', 'phantom', 'shieldCarrier', 'mirrorDrone']
        : ['medium', 'gunner', 'sniper', 'detonator', 'phantom', 'carrier', 'jammer', 'support', 'beacon', 'mineLayer', 'phaseWing', 'tether', 'warden', 'harvester', 'kamikaze'];
}
```

把 `spawnEnemy()` 内原始嵌套 pool expression 替换为：

```js
const pool = enemyPoolForStage(stage);
```

保留重复的 stage-1 `small`，因为它是权重，不是错误。

同时阻止旧的 Boss fallback cache 在受管图片尚未解码时重复请求同一 PNG。把 `bossImageFor()` 改为：

```js
function bossImageFor(def, affix) {
  const index = affix?.skywardBossIndex ?? def?.skywardBossIndex;
  if (assets && index !== undefined && index !== null) return assets.boss(index);
  return bossImage(affix?.image);
}
```

- [ ] **Step 5: Build a complete plan for one route segment**

在 game object 的 `renderBriefingStep()` 前加入：

```js
assetPlanForSegment(index) {
  const boss = this.route[index];
  if (!boss) return null;
  const affix = boss.affix || {};
  const bossIndex = affix.skywardBossIndex ?? boss.skywardBossIndex ?? boss.stage - 1;
  const enemyTypes = new Set(enemyPoolForStage(index + 1));
  for (const type of affix.enemyBias || []) enemyTypes.add(type);
  if (affix.enemy) enemyTypes.add(affix.enemy);

  const prototype = SKYWARD_BOSS_PROTOTYPES[bossIndex];
  for (const phase of prototype?.phases || []) {
    for (const attack of phase.attacks || []) {
      if (attack.type === 'escort' && attack.enemy) enemyTypes.add(attack.enemy);
    }
  }

  return {
    shipKey: shipKeyForLoadout(this.difficulty, this.weapon, this.resonance),
    includeWingman: (this.resonance.sidePairs || 0) > 0,
    world: backgroundWorldForRoute([boss], index),
    bossIndex,
    enemyTypes: [...enemyTypes],
    effectKeys: enemyTypes.has('mineLayer') ? ['floatingMine'] : []
  };
},

prepareSegmentAssets(index) {
  return assets?.prepareStages(
    this.assetPlanForSegment(index),
    this.assetPlanForSegment(index + 1)
  );
},
```

- [ ] **Step 6: Wire current/next preparation without awaiting art**

删除文件顶部：

```js
assets?.load();
```

在 `renderBriefingStep()` 开头加入：

```js
this.prepareSegmentAssets(0);
```

在 `nextSegment()` 设置 `this.backgroundWorld` 后加入：

```js
this.prepareSegmentAssets(this.segmentIndex);
```

Do not await either call. Existing `ready()` returns null while loading or after failure, so procedural player/enemy/boss/background/mine drawing remains the immediate fallback.

- [ ] **Step 7: Add mode source contracts**

在 `debug/browser-modes-smoke.js` 加入：

```js
const airAssets = read('public/modes/air-combat/airCombatAssets.js');
assert.ok(!airGame.includes('assets?.load();'), 'Air Combat must not load the full manifest at module start');
assert.ok(airAssets.includes('prepareStages(current, next = null)'), 'Air assets should expose current/next preparation');
assert.ok(airGame.includes('assetPlanForSegment(index)'), 'Air game should derive a stage plan from the route');
assert.ok(airGame.includes('this.prepareSegmentAssets(this.segmentIndex)'), 'segment changes should refresh the current/next cache');
assert.ok(airGame.includes('const pool = enemyPoolForStage(stage)'), 'spawning and art planning should share the stage pool');
assert.ok(airGame.includes('if (assets && index !== undefined && index !== null) return assets.boss(index)'), 'managed Boss art should not trigger a duplicate fallback request');
```

- [ ] **Step 8: Run focused tests**

Run:

```powershell
npm run test:reality
node debug/browser-modes-smoke.js
npm run check
```

Expected: all PASS；VM confirms zero pre-plan requests, high/low priorities, dedupe, eviction and null fallback。

- [ ] **Step 9: Measure fresh-cache request scope**

Start the server with cache disabled in a browser, enter the air briefing, and inspect Resource Timing:

```js
performance.getEntriesByType('resource')
  .filter(entry => entry.name.includes('/modes/air-combat/assets/images/'))
  .map(entry => ({ name: entry.name.split('/').at(-1), bytes: entry.transferSize || entry.encodedBodySize }))
```

Acceptance:

- Initial briefing requests only the current and next plans, never all 70 manifest PNGs.
- No background outside those two `world` values appears before segment transition.
- Current images use high priority and prefetched images use low priority where the browser exposes it.
- Current + next JS cache stays below the full manifest and advancing evicts previous-only URLs.
- During 30 seconds of play plus the first Boss spawn, missing/not-yet-ready art uses the existing procedural fallback without an exception.

- [ ] **Step 10: Commit staged loading**

```powershell
git add public/modes/air-combat/airCombatAssets.js public/modes/air-combat/airCombatGame.js debug/current-code-reality-tests.js debug/browser-modes-smoke.js
git commit -m "perf: stage air combat assets by route segment"
```

### Task 10: Document, Visually Verify and Review the Complete Redesign

**Files:**
- Modify: `README.md`
- Modify: `docs/systems/architecture.md`
- Create: `docs/iterations/art-ui-visual-qa-2026-07-10.md`
- Test: focused suites, full verification baseline comparison, headless visual matrix

**Interfaces:**
- Consumes: every prior task and the stable debug URL `/?debug=1`.
- Produces: documented presentation boundaries, visual QA evidence and a final diff with no unrelated files staged.

- [ ] **Step 1: Add failing documentation assertions to the art audit**

在 `debug/art-assets-tests.js` 末尾、console.log 前加入：

```js
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const architecture = readFileSync(new URL('../docs/systems/architecture.md', import.meta.url), 'utf8');
assert.ok(readme.includes('?debug=1'), 'README should document the hidden examiner sandbox');
assert.ok(readme.includes('public/assets/art'), 'README should document local art assets');
assert.ok(architecture.includes('environmentGroup'), 'architecture should document the decorative environment boundary');
assert.ok(architecture.includes('prepareStages(current, next)'), 'architecture should document staged air assets');
```

- [ ] **Step 2: Run the audit to verify RED**

Run:

```powershell
node debug/art-assets-tests.js
```

Expected: FAIL on the first missing README or architecture phrase。

- [ ] **Step 3: Update the README with player-visible behavior and debug access**

在 feature list 加入：

```markdown
- **地图优先界面**：任务、棋盘与造物坞常驻；人物、世界志和高级造物术按需从情境抽屉打开，新传说会留下可回看的未读信号。
- **六关环境与固定过场**：每关使用不参与规则计算的实时 3D 环境；序章、长夜、空域和终局使用本地固定 CG，素材缺失时自动回退到程序化画面。
```

在运行说明后加入：

```markdown
普通玩家入口不会显示考官沙盘。需要关卡跳转、守城／空战预演或浏览器烟测时，使用 `http://localhost:3000/?debug=1`。

固定 CG、CC0 纹理和完整来源记录位于 `public/assets/art/`；运行时不会调用图像生成服务，也不会热链第三方图片。
```

在项目结构的 `public/` 树加入：

```text
│   ├── assets/art/           # 本地固定 CG、CC0 纹理与 ATTRIBUTION.md
```

- [ ] **Step 4: Document presentation-layer boundaries in architecture**

在 `CreatorExam3D` 章节后加入：

```markdown
### 2.0.1 地图优先呈现层

- `#creation-dock` 常驻自然语言输入、造物卡、放置和结束回合；`人 / 志 / 术` 共用一个 `#right-panel` 情境抽屉。
- `notifyDrawer(name, notice)` 只保存会话内未读与定位信息；传说、居民、工坊和世界状态仍由既有系统持久化。
- 关键胜负、守夜、空域和不可逆节点继续使用 modal／固定 CG，优先级高于抽屉信号。
- `environmentGroup` 只承载六关外圈程序化美术，不进入 tile raycast、碰撞、寻路或胜负计算；`loadLevel()` 先同步安装程序化环境再渲染棋盘。
- 实时造物通过 `getAbilityVisualFamily()` 归入六种视觉语法，仍由一个 `createCreationMesh()` 入口生成。
- 固定 CG 和 CC0 纹理全部位于 `public/assets/art/`；缺失时 CSS 渐变或现有程序化画面继续工作。

### 2.2.1 空战资产阶段计划

- `AirCombatAssets.prepareStages(current, next)` 只保留当前段和下一段的飞船、Boss、背景、可达敌机与实际使用效果。
- 当前段请求使用高优先级，下一段预取使用低优先级；阶段推进时释放旧段仅有的 JS 图片引用。
- `ready()` 在未完成或失败时返回 `null`，Canvas 继续使用原有程序化绘制；加载不阻塞 briefing 或战斗循环。
```

- [ ] **Step 5: Run the documentation audit to verify GREEN**

Run:

```powershell
node debug/art-assets-tests.js
```

Expected: PASS。

- [ ] **Step 6: Start a hidden local server for visual QA**

Run:

```powershell
$server = Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory 'D:\SJTU\AI\Vibe_coding\demo\creator_exam_3d' -WindowStyle Hidden -PassThru
$serverPidFile = Join-Path $env:TEMP 'creator-exam-art-ui-qa-server.pid'
Set-Content -LiteralPath $serverPidFile -Value $server.Id
try {
  $deadline = (Get-Date).AddSeconds(10)
  do {
    try { $health = Invoke-RestMethod 'http://127.0.0.1:3000/health'; break } catch { Start-Sleep -Milliseconds 200 }
  } while ((Get-Date) -lt $deadline)
  if (-not $health.ok) { throw 'Visual QA server did not become healthy' }
} catch {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  throw
}
```

Keep the process ID for Step 9 and do not start a visible helper window.

- [ ] **Step 7: Capture a deterministic desktop/mobile/accessibility matrix**

Use the bundled Playwright only for QA; do not add it to `package.json`. Run this PowerShell block:

```powershell
$node = 'C:\Users\liu_j\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$playwright = 'C:\Users\liu_j\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm\playwright@1.61.1\node_modules\playwright'
$qaDir = Join-Path $env:TEMP 'creator-exam-art-ui-qa'
New-Item -ItemType Directory -Force -Path $qaDir | Out-Null
$qaScript = @'
const { chromium } = require(process.argv[1]);
const outDir = process.argv[2];
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const captureLevels = async (viewport, label, options = {}) => {
    const context = await browser.newContext({ viewport, ...options });
    await context.addInitScript(() => sessionStorage.setItem('creatorExamPrologueSeen', '1'));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
    await page.goto('http://127.0.0.1:3000/?debug=1', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.__creatorExam3D));
    for (let level = 0; level < 6; level += 1) {
      await page.evaluate(index => window.__creatorExam3D.jumpToTestLevel(index), level);
      await page.waitForTimeout(220);
      const ids = ['creation-input', 'compile-btn', 'end-turn-btn'];
      if (level === 0) {
        await page.fill('#creation-input', '造一座会发光的桥，给居民一条安全的路');
        await page.click('#compile-btn');
        await page.waitForSelector('#card-panel:not(.hidden)');
        ids.push('place-btn');
      }
      for (const id of ids) {
        const box = await page.locator(`#${id}`).boundingBox();
        if (!box || box.x < 0 || box.y < 0 || box.x + box.width > viewport.width || box.y + box.height > viewport.height) {
          throw new Error(`${label} level ${level + 1}: #${id} is outside the viewport`);
        }
      }
      await page.screenshot({ path: path.join(outDir, `${label}-level-${level + 1}.png`), fullPage: false });
    }
    await context.close();
  };

  await captureLevels({ width: 1280, height: 720 }, 'desktop-1280x720');
  await captureLevels({ width: 1440, height: 900 }, 'desktop-1440x900');

  const mobile = await browser.newContext({ viewport: { width: 760, height: 900 } });
  await mobile.addInitScript(() => sessionStorage.setItem('creatorExamPrologueSeen', '1'));
  const mobilePage = await mobile.newPage();
  mobilePage.on('pageerror', error => errors.push(`mobile: ${error.message}`));
  await mobilePage.goto('http://127.0.0.1:3000/?debug=1', { waitUntil: 'networkidle' });
  await mobilePage.click('#drawer-world-btn');
  await mobilePage.screenshot({ path: path.join(outDir, 'mobile-760-world-drawer.png'), fullPage: false });
  const dockVisible = await mobilePage.locator('#creation-dock').isVisible();
  if (!dockVisible) throw new Error('mobile creation dock disappeared behind the drawer');
  await mobile.close();

  for (const [label, options] of [
    ['reduced-motion', { reducedMotion: 'reduce' }],
    ['forced-colors', { forcedColors: 'active' }]
  ]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...options });
    await context.addInitScript(() => sessionStorage.setItem('creatorExamPrologueSeen', '1'));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(outDir, `${label}.png`), fullPage: false });
    await context.close();
  }

  const fallback = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await fallback.addInitScript(() => sessionStorage.setItem('creatorExamPrologueSeen', '1'));
  await fallback.route('**/assets/art/**', route => route.abort());
  const fallbackPage = await fallback.newPage();
  fallbackPage.on('pageerror', error => errors.push(`fallback: ${error.message}`));
  await fallbackPage.goto('http://127.0.0.1:3000/?debug=1', { waitUntil: 'networkidle' });
  await fallbackPage.fill('#creation-input', '造一座会发光的桥，给居民一条安全的路');
  await fallbackPage.click('#compile-btn');
  await fallbackPage.waitForSelector('#card-panel:not(.hidden)');
  await fallbackPage.click('#place-btn');
  const canvas = await fallbackPage.locator('#game-canvas').boundingBox();
  for (const point of [[.5,.5],[.42,.5],[.58,.5],[.5,.42],[.5,.58],[.34,.5],[.66,.5]]) {
    if (!await fallbackPage.evaluate(() => window.__creatorExam3D.placementMode)) break;
    await fallbackPage.mouse.click(canvas.x + canvas.width * point[0], canvas.y + canvas.height * point[1]);
    await fallbackPage.waitForTimeout(80);
  }
  if (await fallbackPage.evaluate(() => window.__creatorExam3D.placementMode)) throw new Error('fallback art block prevented creation placement');
  const turnBefore = await fallbackPage.locator('#turn-stat').textContent();
  await fallbackPage.click('#end-turn-btn');
  await fallbackPage.waitForFunction(before => document.getElementById('turn-stat').textContent !== before, turnBefore, { timeout: 5000 });
  await fallbackPage.screenshot({ path: path.join(outDir, 'art-blocked-fallback.png'), fullPage: false });
  await fallback.close();

  await browser.close();
  if (errors.length) throw new Error(errors.join('\n'));
  fs.writeFileSync(path.join(outDir, 'qa-result.json'), JSON.stringify({ passed: true, screenshots: fs.readdirSync(outDir).filter(name => name.endsWith('.png')) }, null, 2));
})().catch(error => { console.error(error); process.exit(1); });
'@
& $node -e $qaScript $playwright $qaDir
if ($LASTEXITCODE -ne 0) { throw 'Art/UI visual QA failed' }
Get-Content -LiteralPath (Join-Path $qaDir 'qa-result.json')
```

Expected: 16 PNG screenshots plus `qa-result.json` with `"passed": true`；all four core controls fit the two desktop viewports, mobile keeps the dock visible, accessibility contexts produce no page error, and blocked art still permits compile/place/end-turn.

- [ ] **Step 8: Inspect the visual matrix, including all six environments**

Use `view_image` on:

- all six `desktop-1280x720-level-*.png` images;
- at least levels 1, 2, 4 and 6 at 1440×900;
- `mobile-760-world-drawer.png`;
- `reduced-motion.png` and `forced-colors.png`;
- `art-blocked-fallback.png`.

Acceptance: board, units, path cues and enemy intent remain legible; six levels are visually distinct; no environment prop appears to sit on a playable tile; mission and dock do not overlap; the world drawer is usable on mobile; fallback retains all core controls. If any image fails, fix the relevant CSS or procedural positions, rerun Task 10 Steps 7–8, then continue.

- [ ] **Step 9: Stop the QA server**

```powershell
$serverPidFile = Join-Path $env:TEMP 'creator-exam-art-ui-qa-server.pid'
if (Test-Path -LiteralPath $serverPidFile) {
  $serverPid = [int](Get-Content -LiteralPath $serverPidFile)
  Stop-Process -Id $serverPid -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $serverPidFile -Force
}
```

- [ ] **Step 10: Record the completed QA matrix**

After every acceptance in Steps 7–8 is true, create `docs/iterations/art-ui-visual-qa-2026-07-10.md` with this final content:

```markdown
# 2026-07-10 美术与地图优先 UI 视觉验收

## 自动截图矩阵

| 场景 | 结果 |
|---|---|
| 1280×720，六关逐关 | PASS：任务、造物输入、生成、放置和结束回合均在视口内 |
| 1440×900，六关逐关 | PASS：棋盘保持主视觉，环境不遮挡单位、路径和敌方意图 |
| 760×900，世界志抽屉 | PASS：抽屉全屏呈现，底部造物坞继续可用 |
| `prefers-reduced-motion: reduce` | PASS：核心状态完整，无依赖长转场的信息 |
| forced colors / 高对比 | PASS：核心按钮、焦点与文本可辨认 |
| 阻断 `/assets/art/**` | PASS：渐变／程序化降级，仍可生成、放置并结束回合 |

## 人工视觉复核

- 六关环境能通过外圈水与屋顶、矿岩与灯轨、森林城墙与足印、双边旗与雾、圣树与名字碎片、五关残片裂隙环快速区分。
- 所有环境对象只承担呈现；没有发现覆盖可玩格或改变选格的对象。
- 序章、长夜三裁切、空域桥接与终局 CG 的 HTML 文字安全区有效，无生成文字或具体实时造物。
- `人 / 志 / 术` 同时只开一个；Escape 恢复焦点；新传说信号能定位并清除未读。

截图保存在执行机器的临时目录 `creator-exam-art-ui-qa`，不作为不稳定的像素金图提交。
```

- [ ] **Step 11: Run the complete verification set with baseline-aware expectations**

Run:

```powershell
npm run check
npm run test:reality
node debug/browser-demo-smoke.js
node debug/browser-modes-smoke.js
node debug/art-assets-tests.js
node debug/server-api-tests.js
node debug/test-suite.js
node debug/verify-all.js
```

Expected:

- syntax, reality, browser-demo, browser-modes, art-assets and server-api all PASS；
- `test-suite.js` 不得比基线的 199 PASS / 9 FAIL 更差，也不得出现本计划新增失败；
- `verify-all.js` 可因已知 `test-suite` suite 返回 nonzero，但其余 suite 全部 PASS；
- 若任何其他 suite 失败，使用 `superpowers:systematic-debugging` 找根因并在完成前修复。

- [ ] **Step 12: Review the final diff and request code review**

Run:

```powershell
git status --short
git diff --check
git diff --stat
git diff -- public/index.html public/styles.css public/js/game.js public/js/abilities.js public/js/particles.js server.js
```

Expected: only this plan's tracked files plus the user's pre-existing unrelated untracked files；no whitespace errors, generated source PNGs, temp screenshots or downloaded asset packs。

Invoke `superpowers:requesting-code-review` for the complete diff. Address correctness feedback with `superpowers:receiving-code-review`; do not expand into unrelated baseline failures.

- [ ] **Step 13: Commit documentation and QA evidence**

```powershell
git add README.md docs/systems/architecture.md docs/iterations/art-ui-visual-qa-2026-07-10.md debug/art-assets-tests.js
git commit -m "docs: record art and UI visual verification"
```

- [ ] **Step 14: Perform verification-before-completion**

Invoke `superpowers:verification-before-completion`, rerun its selected fresh commands, inspect `git status`, and only then report the implementation complete. Preserve these unrelated pre-existing untracked paths without staging or deleting them: `.env.example`, `.superpowers/`, `AGENTS.md`, `debug/headless-page-screenshot.png`, `docs/iterations/codex_handoff_2026-07-06.md`, and `docs/superpowers/specs/2026-07-05-air-combat-integration-concept.md`.
