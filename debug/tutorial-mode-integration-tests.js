import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TUTORIAL_CAMPAIGN, tutorialCampaignCoverage } from '../public/js/tutorialCampaign.js'

const read = relative => readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8')

const html = read('public/index.html')
const css = read('public/styles.css')
const game = read('public/js/game.js')
const engine = read('public/js/gameEngine.js')
const director = read('public/js/tutorialDirector.js')
const storyteller = read('public/js/storyteller.js')
const towerHtml = read('public/modes/tower-defense/index.html')
const towerBridge = read('public/modes/tower-defense/towerBridge.js')
const airHtml = read('public/modes/air-combat/index.html')
const airCss = read('public/modes/air-combat/style.css')
const airBridge = read('public/modes/air-combat/airCombatBridge.js')
const airGame = read('public/modes/air-combat/airCombatGame.js')

for (const id of [
  'tutorial-toggle',
  'tutorial-choice',
  'tutorial-choice-start',
  'tutorial-choice-free',
  'tutorial-panel',
  'tutorial-prompt',
  'tutorial-rail-btn',
  'tutorial-primary',
  'tutorial-recover',
  'tutorial-reset-all',
  'tutorial-reset-confirm',
  'tutorial-reset-confirm-btn',
  'tutorial-reset-cancel-btn',
  'tutorial-target-marker'
]) {
  assert.ok(html.includes(`id="${id}"`), `main tutorial UI should expose #${id}`)
}

for (const selector of ['.tutorial-choice', '.tutorial-panel', '.tutorial-target-marker', '.tutorial-focus']) {
  assert.ok(css.includes(selector), `main tutorial UI should style ${selector}`)
}

assert.ok(game.includes("import { TutorialDirector } from './tutorialDirector.js'"), 'game should import TutorialDirector')
assert.ok(game.includes('prepareCompiledCard(card, text)'), 'compile path should calibrate recommended tutorial cards')
assert.ok(game.includes('fixedTutorialCard || await compileCreation'), 'recommended prompts should load fixed cards before cloud compilation')
assert.ok(director.includes('fixedCardForPrompt(text)') && director.includes('createFixedTutorialCard(spec)'), 'tutorial director should resolve exact recommended prompts deterministically')
assert.ok(game.includes('super.applyActiveCreationEffects()'), 'browser turns should use the core tutorial effect implementation')
assert.ok(engine.includes('isTutorialRouteProtected()'), 'golden cards should protect authored routes from harmful random board mutations')
assert.ok(game.includes("['floodSpread', 'terrainChange', 'entropyFluctuation', 'hazardRedirect']"), 'browser storyteller events should respect golden-route protection')
assert.ok(storyteller.includes("event.effect === 'minorSetback' && game.isTutorialRouteProtected?.()"), 'adaptive narration should not add tutorial-breaking entropy')
assert.ok(game.includes('validatePlacement(this.activeCard, x, y)'), 'placement path should validate the golden target')
assert.ok(game.includes('recordPlacement(creation, x, y)'), 'placement path should advance tutorial state')
assert.ok(game.includes('recordLevelWon()'), 'victory path should record tutorial completion')
assert.ok(game.includes('tutorialMode: this.tutorialDirector?.modeContext?.()'), 'finale contexts should carry tutorial mode')
assert.ok(director.includes("checkpoint('before-turn')") && director.includes('restoreCheckpoint()'), 'tutorial should save and restore tactical checkpoints')
assert.ok(director.includes("value = 'tutorial-campaign'"), 'tutorial should use an isolated save slot')
assert.ok(director.includes('resetCurrentLesson()') && director.includes('resetAllTutorial()'), 'tutorial should expose separate current-level and full-campaign resets')
assert.ok(director.includes("message: '全部教学进度已重置，已返回第一关。普通存档保持不变。'"), 'full tutorial reset should explain its scope')
assert.ok(director.includes("['compile', 'place'].includes(phase.kind)"), 'the map target should stay visible from prompt through placement')
assert.ok(director.includes('this.panelExpanded = !this.panelExpanded'), 'the tutorial rail button should collapse and expand the guide')
assert.ok(!director.includes('推荐卡必须放在第'), 'tutorial placement feedback should point to the map instead of printing coordinates')
assert.ok(director.includes('advancedPanelContext()'), 'the Advanced panel should receive the current tutorial step and placed golden creations')
assert.ok(!director.includes("this.game.openDrawer?.(spec.id === 'intent' ? 'world' : 'systems')"), 'tutorial actions should not repeatedly force the Advanced drawer open')
assert.ok(game.includes('tutorial: this.tutorialDirector?.advancedPanelContext?.()'), 'the Advanced presenter state should include tutorial context')

const coverage = tutorialCampaignCoverage()
assert.equal(coverage.levelIds.length, 6, 'tutorial should cover all six ground levels')
assert.equal(coverage.cardIds.length, 7, 'tutorial should use one golden card in levels 1-5 and two in the final exam')
assert.ok(coverage.systemIds.length >= 24, 'advanced systems should be used repeatedly rather than checked once')

const repeatedActions = new Map()
for (const lesson of TUTORIAL_CAMPAIGN) {
  for (const entry of lesson.systems) repeatedActions.set(entry.action, (repeatedActions.get(entry.action) || 0) + 1)
}
for (const action of ['refresh-intent', 'prepare-chain', 'form-oath', 'modify-workshop']) {
  assert.ok((repeatedActions.get(action) || 0) >= 3, `${action} should participate in several real lessons`)
}

assert.ok(towerBridge.includes('function isTutorialMode()'), 'Night Watch should detect tutorial context')
assert.ok(towerBridge.includes("mapId: 'MAP5'"), 'Night Watch tutorial should force the authored golden map')
assert.ok(towerBridge.includes('hp: 12, money: 9000'), 'Night Watch tutorial should have a recoverable starting state')
assert.ok(towerBridge.includes('id = \'night-watch-tutorial-targets\'') || towerBridge.includes("overlay.id = 'night-watch-tutorial-targets'"), 'Night Watch should render placement targets on the map')
assert.ok(towerBridge.includes('markTutorialPlacement') && towerHtml.includes('markTutorialPlacement?.(gridX, gridY)'), 'Night Watch placement targets should clear after use')
assert.ok(!towerBridge.includes('第 10 列、第 6 行'), 'Night Watch guide should not print grid coordinates')
assert.ok(towerHtml.includes('isTutorialMode?.() && towers.length >= 3'), 'three guided towers should prevent an unrecoverable Night Watch defeat')
assert.ok(/id="highlight-protocol-btn"[^>]*hidden[^>]*data-tutorial-bailout="true"/.test(towerHtml), 'Night Watch should start with a tutorial-only bailout control')
assert.ok(towerHtml.includes('window.activateNightWatchHighlightProtocol = activateNightWatchHighlightProtocol'), 'Night Watch should expose the bailout API')
assert.ok(towerBridge.includes("bailout.hidden = false") && towerBridge.includes('想跳过本模块，可直接点“一键通关”'), 'Night Watch should reveal and explain the one-click clear')
assert.ok(towerHtml.includes('wave = FINAL_WAVE') && towerHtml.includes('gameOver(true)') && towerHtml.includes('NightWatchBridge?.returnToMain?.()'), 'Night Watch one-click clear should publish a victory and continue')
assert.ok(towerBridge.includes('night-watch-tutorial-toggle') && towerBridge.includes("guide.classList.toggle('collapsed')"), 'Night Watch guide should collapse behind a 教 button')

assert.ok(airBridge.includes('function isTutorialMode()'), 'Air Combat should detect tutorial context')
assert.ok(airBridge.includes('playerHp: 240') && airBridge.includes('startingShield: 100'), 'Air Combat tutorial should lower failure pressure')
assert.ok(airBridge.includes('(isTutorialMode() ? 0.58 : 1)'), 'Air Combat tutorial should shorten boss routes')
assert.ok(airHtml.includes('id="airspace-tutorial"'), 'Air Combat should expose an in-flight guide')
assert.ok(airCss.includes('.airspace-tutorial'), 'Air Combat guide should be styled')
assert.ok(airGame.includes('bridge.isTutorialMode?.()') && airGame.includes('教学护航接住了载体'), 'Air Combat should recover from tutorial lethal damage')
assert.ok(/id="airspace-highlight"[^>]*hidden[^>]*data-tutorial-bailout="true"/.test(airHtml), 'Air Combat should start with a tutorial-only bailout control')
assert.ok(airGame.includes('window.activateAirspaceHighlightProtocol = activateAirspaceHighlightProtocol'), 'Air Combat should expose the bailout API')
assert.ok(airHtml.includes('想跳过本模块，可直接点“一键通关”'), 'Air Combat should explain the one-click clear')
assert.ok(airGame.includes("game.finish('victory')") && airGame.includes('bridge.returnToMain()'), 'Air Combat one-click clear should publish a victory and continue')
assert.ok(airHtml.includes('id="airspace-tutorial-toggle"') && airGame.includes("tutorialGuide.classList.toggle('collapsed')"), 'Air Combat guide should collapse behind a 教 button')

console.log(`Tutorial mode integration tests passed: ${coverage.systemIds.length} guided system uses`)
