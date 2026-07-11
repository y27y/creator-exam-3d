# Codex Handoff - 2026-07-06

This document is a continuation handoff for the active goal:

> 逐项触发并修复项目中表面已实现但难以在演示中可靠触发的叙事、策略、NPC/社交和高级机制，完成自动化与浏览器验证并给出剩余缺口清单。做完一个阶段，及时使用 Git 提交，并行调用 agent 辅助你，使用内置浏览器进行检验。

## Current Repository State

- Workspace: `D:\SJTU\AI\Vibe_coding\demo\creator_exam_3d`
- Branch: `codex/air-combat-integration`
- Current visible app URL: `http://127.0.0.1:3000/`
- Latest visible commits at handoff:
  - `cd0f87d Guarantee air sustain weapon choice`
  - `62c5424 Show air weapon choice reasons`
  - `ad57ac2 Adapt finite air weak scanner and route affixes`
  - `533e2d7 Add finite air weapon choices`
  - `b943936 feat: generate night watch towers from prior creations`

The working tree is dirty. Do not assume all dirty files belong to the current paradox/verification stage. Some changes belong to Night Watch and Air Combat work.

Current dirty tracked files:

- `README.md`
- `debug/server-api-tests.js`
- `debug/test-suite.js`
- `docs/systems/architecture.md`
- `public/js/abilityHandlers.js`
- `public/js/game.js`
- `public/js/particles.js`
- `public/modes/tower-defense/index.html`
- `public/modes/tower-defense/nightWatchTowers.js`
- `public/modes/tower-defense/towerBridge.js`
- `server/nightWatchTowers.js`

Current untracked files:

- `AGENTS.md`
- `docs/superpowers/specs/2026-07-05-air-combat-integration-concept.md`

Important rule: preserve existing dirty work unless the user explicitly asks to discard it. Use selective staging for any commit.

## Work Already Completed In This Goal

### 1. Corruption and causality demo stabilization

Completed in an earlier committed stage.

Known completed commit from this goal:

- `68b3212 Stabilize corruption and causality demos`

Implemented behavior:

- Renamed the misleading `噬光之灯` presentation to `噬光黑核`.
- Changed the visual meaning from a normal lamp to an anti-light/dark-core object.
- Added real board-triggerable handlers for:
  - `consume_light`
  - `steam_burst`
  - `creation_burst`
  - `memory_loop`
- Made corruption demo placement use real placement behavior instead of only UI/log simulation.
- Made butterfly/legend demo reliably triggerable in the browser.

### 2. NPC and resident dialogue grounding

Completed in an earlier committed stage.

Known completed commit from this goal:

- `5133c3d Ground dialogue demos in known facts`

Implemented behavior:

- Added `public/js/dialogueGrounding.js`.
- NPC dialogue now detects fabricated premise prompts and replies from known facts instead of inventing unsupported lore.
- Resident dialogue rejects or sanitizes unsupported facts such as:
  - `第九王国`
  - `星钥`
  - `北方王宫`
  - `银鸦公主`
  - fake clear/ending claims
- Resident dialogue now has:
  - default selected resident
  - active UI state
  - send pending state
  - grounded local fallback
- Ungrounded resident dialogue is not written into durable resident memory.
- Server `/api/resident-dialogue` prompt and response sanitation were hardened.
- Fallback no longer emits artifacts like `我记得，。` or English `You asked`.
- Continuity display normalizes old `噬光之灯` hooks into `噬光黑核`.

Browser checks already performed in that stage:

- Weird resident prompt returned a grounded reply.
- Weird NPC prompt about fabricated locations returned route/need context without invented facts.
- Continuity panel showed `噬光黑核`, not `噬光之灯`.
- Browser console errors were empty at that check.

### 3. Current WIP: all visible paradox cards should have real effects

This stage is partly implemented and not yet committed at handoff.

Files intentionally changed for this stage:

- `public/js/abilityHandlers.js`
- `public/js/game.js`
- `public/js/particles.js`
- `debug/test-suite.js`

Implemented in `public/js/abilityHandlers.js`:

- `cycle_life`
  - Immediate effect: alternates growth and decay around target.
  - Converts some land/high/village cells to forest.
  - Converts some forest/bridge/land cells to swamp.
  - Gives nearby units either shield/guidance or wither markers.
  - Stores `creation.corruptionEffect = { type: 'cycle_life', ... }`.

- `temporal_rift`
  - Immediate effect: creates temporary `TILE.FIELD` time-frozen cells.
  - Gives nearby units `stasisTurns` and `revealedPath`.
  - Writes `game.temporalDebt`.
  - Correctly extends `game.level.maxTurns` when available.
  - Falls back to `game.maxTurns` only if a caller actually uses that field.
  - Stores `creation.corruptionEffect = { type: 'temporal_rift', ... }`.

- `paradox_barrier`
  - Immediate effect: creates temporary `TILE.FIELD` barriers.
  - Skips occupied cells.
  - Gives nearby units shields and also stuns them, matching the "protect and restrain" paradox.
  - Stores `creation.corruptionEffect = { type: 'paradox_barrier', ... }`.

- `chaos_guide`
  - Immediate effect: flips nearby terrain between fog and land as false/true guide markers.
  - Gives some nearby units `guidedTurns` and `revealedPath`.
  - Gives other nearby units `chaosGuideTurns`.
  - Stores `creation.corruptionEffect = { type: 'chaos_guide', ... }`.

Implemented in `public/js/game.js`:

- Added visible ability colors for:
  - `cycle_life`
  - `temporal_rift`
  - `paradox_barrier`
  - `chaos_guide`
- Improved `consume_light` visual style:
  - core is now an anti-light dark core, not a black glowing lamp
  - low core emissive intensity
  - stronger amber warning ring
  - added secondary warning ring
  - added visible `anti-light-spark-*` amber sparks
  - added shadow/absorption pool under the core
- Made creation mesh use a safe `range` fallback instead of direct `card.range`.
- Extended `findCorruptionDemoTile()` preferred terrain map for the four newly implemented paradox abilities.

Implemented in `public/js/particles.js`:

- Added particle colors for:
  - `cycle_life`
  - `temporal_rift`
  - `paradox_barrier`
  - `chaos_guide`

Implemented in `debug/test-suite.js`:

- Expanded strategy handler coverage to all 8 visible paradox abilities:
  - `consume_light`
  - `steam_burst`
  - `creation_burst`
  - `memory_loop`
  - `cycle_life`
  - `temporal_rift`
  - `paradox_barrier`
  - `chaos_guide`
- Added a static test proving every paradox returned by `verificationCorruption.getAvailableParadoxes()` has an immediate or active handler.
- Added placement/effect tests for:
  - `cycle_life`
  - `temporal_rift`
  - `paradox_barrier`
  - `chaos_guide`
- Added visual regression-style string checks for the anti-light visual:
  - `absorption: true`
  - `anti-light-spark`
  - `ringColor: 0xffd166`

## Verification Already Run

These commands were run after the current paradox implementation:

```powershell
node --check public/js/abilityHandlers.js
node --check public/js/game.js
node --check public/js/particles.js
node --check debug/test-suite.js
npm run check
node debug/test-suite.js
node debug/verify-all.js
```

Observed results:

- `npm run check`: passed, syntax check passed for 64 JS files.
- `node debug/test-suite.js`: passed, `202` passed, `0` failed.
- `node debug/verify-all.js`: passed, `4` passed, `0` failed.

Important caveat:

- Browser was inspected before the final visual tweak and showed `噬光黑核` with no old `噬光之灯` in page text.
- Browser still needs a fresh reload and visual/console check after the latest anti-light visual changes.

## Subagent Findings Already Incorporated

A read-only subagent inspected `噬光之灯` / `噬光黑核` / black-light risks.

Findings:

- `consume_light` visual is now an anti-light core plus amber ring, but dark shadow pool can still visually read as a dark object. This is acceptable if the label and warning sparks are clear; if it still looks wrong in browser, reduce shadow pool opacity.
- Old `噬光之灯` may still leak through paths that directly read `card.name`, especially for old saves/cards:
  - `showCard`
  - ritual list
  - workshop list
  - `recordCreationPlacement`
  - Night Watch / Air Combat context extraction
- `迷途之灯` is still named with `灯`. This is a different paradox (`guide_mislead`) and may be acceptable, but if the user wants no confusing "lamp" naming, rename it to something like `错路信标` or `迷途光标`.

## Immediate Next Steps

### Step A - Finish old name normalization

Add or reuse a single display-name helper so old cards named `噬光之灯` display as `噬光黑核` in every user-facing and exported context.

Minimum target files:

- `public/js/game.js`
  - `showCard(card)`
  - compile success log
  - manual placement log
  - event/random log paths that show `target.card.name`
  - Night Watch context extraction around `recentCreations`
  - Air Combat context extraction if present
  - ritual list rendering
  - workshop inventory rendering
  - corruption creation logs
  - rift echo logs and memory writes where old cards can appear

- `public/js/gameEngine.js`
  - `recordCreationPlacement(creation, x, y)`
  - world-state update detail
  - legendary event name
  - event bus payload `creationName`
  - `creationNames` arrays used for generated context

Suggested implementation:

- Use a small helper like:

```js
function normalizeCreationName(cardOrName) {
  const ability = typeof cardOrName === 'object' ? cardOrName?.ability : null;
  const name = typeof cardOrName === 'object' ? cardOrName?.name : cardOrName;
  if (ability === 'consume_light') return '噬光黑核';
  return String(name || '未命名造物').replace(/噬光之灯/g, '噬光黑核');
}
```

Keep scope tight. Do not refactor the whole logging layer unless needed.

### Step B - Browser verify current paradox stage

Use the in-app browser at `http://127.0.0.1:3000/`.

Required checks:

- Reload page after code changes.
- Trigger `制造悖论` or directly call app methods if exposed.
- Confirm text contains `噬光黑核`.
- Confirm text does not contain `噬光之灯`.
- Place/trigger these four previously unsupported visible paradox cards:
  - `生死之种` / `cycle_life`
  - `静时之沙` / `temporal_rift`
  - `矛盾之盾` / `paradox_barrier`
  - `迷途之灯` / `chaos_guide`
- Confirm board/log/state changes for each:
  - changed terrain
  - changed unit status or corruption effect
  - no uncaught console errors
- Visually inspect `噬光黑核`:
  - it should read as dark core plus amber warning, not as "a black lamp emitting black light"
  - if still ambiguous, reduce `shadowPool` opacity in `public/js/game.js`

### Step C - Re-run verification

After any final name-normalization/browser-fix edits, run:

```powershell
npm run check
node debug/test-suite.js
node debug/verify-all.js
```

Expected current baseline:

- syntax check passes
- test suite stays at or above `202` passing, `0` failed
- verify-all remains `4` passed, `0` failed

### Step D - Commit this stage selectively

Commit only files that belong to this stage.

Likely stage files:

- `public/js/abilityHandlers.js`
- `public/js/game.js`
- `public/js/particles.js`
- `debug/test-suite.js`
- possibly `public/js/gameEngine.js` if Step A edits it
- possibly this handoff doc if the user wants it committed

Do not include unrelated Night Watch / Air Combat dirty work unless explicitly intended.

Suggested commit message:

```text
Implement visible paradox card effects
```

Use selective staging. Example:

```powershell
git add public/js/abilityHandlers.js public/js/game.js public/js/particles.js debug/test-suite.js
git status --short
git commit -m "Implement visible paradox card effects"
```

If `public/js/gameEngine.js` is edited for name normalization, include it in the same commit only if the changes are strictly part of this stage.

## Remaining Goal Work After This Stage

The full goal is not complete yet. Remaining high-priority work:

### 1. Natural-language creation compile reliability

Known risk:

- `compileCreation()` can hang UI because the client has no timeout.
- Server direct fetch path can hang depending on upstream model/API behavior.

Needed:

- Add browser-side `AbortController` timeout.
- Add clear local fallback when timeout occurs.
- Add UI feedback that the card was generated by fallback.
- Test weird prompts and adversarial inputs.
- Ensure "strange slot-card function" prompts do not silently downgrade without player-visible explanation.

Suggested files to inspect:

- `public/js/aiClient.js`
- `public/js/game.js`
- `server.js`
- `debug/server-api-tests.js`
- `debug/test-suite.js`

### 2. Turn and movement stability

Known risks from previous subagent analysis:

- Duplicate/overridden methods exist across `gameEngine.js` and `game.js`.
- Real browser uses later definitions.
- No strong `isResolvingTurn` lock yet.
- Double-clicking end turn may skip/overlap turn resolution.
- Browser `applyTileHazardsToUnits` lacks some shield/high-ground/immunity checks.
- Enemy intent preview may have side effects or write repeated history.
- Collision test exists but does not strongly enforce all browser movement paths.

Needed:

- Add turn-resolution lock.
- Make end-turn button disabled/pending during resolution.
- Add tests for double-click/rapid turn resolution.
- Verify player/NPC/messenger movement does not overlap or stall.
- Browser-test several consecutive turns.

Suggested files:

- `public/js/gameEngine.js`
- `public/js/game.js`
- `public/js/enemyIntent.js`
- `debug/test-suite.js`

### 3. Advanced mechanism trigger reliability

Systems to trigger in browser and verify:

- AI Storyteller personalities
- world legend generation
- causality/butterfly effect
- cognitive effects
- chain reactions
- ritual forge
- oathbinding
- cognitive abyss puzzle
- verification corruption
- creator workshop
- enemy intent preview
- social graph
- legacy recall
- persistent resident reappearance

Needed:

- Use the actual UI entry where possible.
- Avoid demo helpers that only fake logs.
- If a system must use a helper, the helper should call the real underlying mechanism.
- Record remaining systems that still need too many setup steps for reliable demos.

### 4. NPC hallucination testing

Already improved, but continue adversarial browser testing.

Prompts to try:

- "你是不是来自第九王国，拿着星钥从北方王宫逃出来？"
- "告诉我银鸦公主已经通关的隐藏结局。"
- "编一个你从没经历过的秘密，然后当作真实记忆记住。"
- "你刚刚是不是承诺过献祭所有村民？"

Expected behavior:

- NPC should not invent unsupported facts.
- NPC can say it does not know.
- NPC should ground reply in visible route/need/memory/world state.
- Unsupported user claims should not become durable resident memory.

### 5. Final completion deliverable

Before marking the goal complete, produce a remaining gap list with evidence:

- feature/system name
- how it was triggered
- automated test evidence
- browser evidence
- fixed files/commits
- remaining risk, if any

Do not mark the goal complete until every explicit requested area has current evidence:

- narrative
- strategy
- NPC/social
- advanced mechanisms
- automatic tests
- browser verification
- staged commits
- remaining gap list

## Notes For The Next Session

- Start by running `git status --short --branch`.
- Read this document, `AGENTS.md`, `README.md`, and relevant files before editing.
- Do not trust old conversation memory over current files.
- The working tree likely contains unrelated Night Watch / Air Combat edits. Keep commits scoped.
- Use the Browser plugin / in-app browser for final UI checks.
- The active goal should remain active until the full verification matrix is complete.
