import assert from 'node:assert/strict'
import { DebugGame } from './debugGame.js'
import {
  TUTORIAL_ADVANCED_SYSTEM_IDS,
  TUTORIAL_CAMPAIGN,
  createFixedTutorialCard,
  createTutorialCard,
  tutorialCampaignCoverage
} from '../public/js/tutorialCampaign.js'
import { worldLegendSystem } from '../public/js/worldLegend.js'

class TutorialRouteGame extends DebugGame {
  endTurn() {
    if (this.gameState !== 'playing') return { error: '本关已结束' }
    this.applyActiveCreationEffects()
    this.applyChainReactions()
    this.triggerRandomEvent()
    this.moveUnits()
    this.spreadHazards()
    this.applyTileHazardsToUnits()
    this.enemyIntentSystem.generatePreviews(this.worldState, this)
    this.cognitiveAbyss.update(this.entropy, this.level.entropyLimit || 7)
    this.processRiftEchoes?.()
    this.decrementCreationDurations()
    this.checkOathBetrayals()
    this.checkEndCondition(true)
    if (this.gameState === 'playing') {
      this.turn += 1
      if (this.turn % 5 === 0) worldLegendSystem.evolveMyths()
      if (this.turn > this.level.maxTurns) this.checkEndCondition(true, true)
    }
    return { success: true, gameState: this.gameState }
  }
}

function placeTutorialCard(game, spec) {
  const card = createTutorialCard(spec, { id: `route-${spec.id}`, source: 'test' })
  const creation = {
    id: card.id,
    card,
    x: -1,
    y: -1,
    remaining: card.duration,
    restores: [],
    placed: false
  }
  game.creations.push(creation)
  const result = game.place(creation.id, spec.target.x, spec.target.y)
  assert.equal(result.success, true, `${game.level.id}/${spec.id} 应能放在推荐格`)
}

function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function runGoldenRoute(index, lesson, seed) {
  Math.random = seededRandom(seed)
  const game = new TutorialRouteGame()
  game.levelIndex = index
  game.reset()
  for (const spec of lesson.cards) placeTutorialCard(game, spec)

  while (game.gameState === 'playing' && game.turn <= game.level.maxTurns + 1) game.endTurn()
  const outcome = `回合 ${game.turn}，救援 ${game.rescued}，损失 ${game.lost}，战争值 ${game.warMeter}`
  assert.equal(game.gameState, 'won', `${lesson.levelId} 黄金路线在随机种子 ${seed} 下必须通关（${outcome}）`)
  if (game.level.requiredRescue) {
    assert.ok(game.rescued >= game.level.requiredRescue, `${lesson.levelId} 在随机种子 ${seed} 下必须达到救援人数`)
  }
  if (game.isWarLevel()) {
    assert.ok(game.warMeter < (game.level.hazard?.warLimit || 9), `${lesson.levelId} 在随机种子 ${seed} 下战争值必须低于上限`)
  }
}

const originalRandom = Math.random
const originalWarn = console.warn
console.warn = () => {}

try {
  const coverage = tutorialCampaignCoverage()
  assert.deepEqual(coverage.levelIds, [
    'flood-village',
    'night-mine',
    'giant-city',
    'wordless-war',
    'memory-plague',
    'final-exam'
  ])
  assert.equal(new Set(coverage.cardIds).size, coverage.cardIds.length, '教学卡 ID 必须唯一')
  assert.equal(new Set(TUTORIAL_ADVANCED_SYSTEM_IDS).size, TUTORIAL_ADVANCED_SYSTEM_IDS.length, '高级系统教学 ID 必须唯一')

  for (const [index, lesson] of TUTORIAL_CAMPAIGN.entries()) {
    for (const spec of lesson.cards) {
      assert.ok(spec.prompt.length >= 28, `${spec.id} 的推荐提示词应包含足够完整的诗性意象与目标`)
      assert.doesNotMatch(spec.prompt, /生成一个|随便|测试卡|debug/i, `${spec.id} 不应使用生硬占位提示词`)
      assert.ok(Number.isInteger(spec.target.x) && Number.isInteger(spec.target.y), `${spec.id} 必须提供整数目标格`)
      assert.ok(spec.target.x >= 0 && spec.target.x < 7 && spec.target.y >= 0 && spec.target.y < 7, `${spec.id} 目标格必须在 7x7 棋盘内`)
      const fixedCard = createFixedTutorialCard(spec)
      assert.deepEqual(fixedCard, createFixedTutorialCard(spec), `${spec.id} 的固定教学造物必须完全确定`)
      assert.equal(fixedCard.source, 'tutorial-fixed', `${spec.id} 必须标记为固定教学造物`)
      assert.equal(fixedCard.ability, spec.ability, `${spec.id} 的固定造物能力必须与黄金路线一致`)
    }

    for (let seed = 1; seed <= 64; seed += 1) runGoldenRoute(index, lesson, seed)
  }

  console.log(`Tutorial campaign tests passed: ${TUTORIAL_CAMPAIGN.length} levels x 64 seeds, ${coverage.cardIds.length} fixed golden cards, ${coverage.systemIds.length} system lessons`)
} finally {
  Math.random = originalRandom
  console.warn = originalWarn
}
