import assert from 'node:assert/strict'
import { LEVELS } from '../public/js/levels.js'
import {
  TUTORIAL_CAMPAIGN_VERSION,
  TUTORIAL_CHOICE_KEY,
  TUTORIAL_STORAGE_KEY
} from '../public/js/tutorialCampaign.js'
import { TutorialDirector } from '../public/js/tutorialDirector.js'

class MemoryStorage {
  constructor(entries = {}) {
    this.data = new Map(Object.entries(entries))
  }

  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null
  }

  setItem(key, value) {
    this.data.set(key, String(value))
  }
}

function control() {
  const listeners = new Map()
  const classes = new Set(['hidden'])
  return {
    focused: false,
    addEventListener(type, listener) {
      listeners.set(type, listener)
    },
    click() {
      listeners.get('click')?.()
    },
    focus() {
      this.focused = true
    },
    classList: {
      add(name) { classes.add(name) },
      remove(name) { classes.delete(name) },
      contains(name) { return classes.has(name) }
    }
  }
}

function tutorialState(currentLevelIndex = 0) {
  return {
    version: TUTORIAL_CAMPAIGN_VERSION,
    active: true,
    currentLevelIndex,
    completedLevels: LEVELS.slice(0, currentLevelIndex).map(level => level.id),
    progress: {},
    assists: 0,
    startedAt: 1,
    completedAt: null
  }
}

function createFixture(state) {
  const storage = new MemoryStorage({
    [TUTORIAL_CHOICE_KEY]: 'tutorial',
    [TUTORIAL_STORAGE_KEY]: JSON.stringify(state)
  })
  const ui = {
    tutorialChoice: { hidden: true },
    tutorialPanel: null,
    tutorialRecover: control(),
    tutorialResetAll: control(),
    tutorialResetConfirm: control(),
    tutorialResetConfirmBtn: control(),
    tutorialResetCancelBtn: control()
  }
  const game = {
    levelIndex: 0,
    level: LEVELS[0],
    gameState: 'playing',
    creations: [],
    ui,
    loadHistory: [],
    loadLevel(index) {
      this.levelIndex = Math.max(0, Math.min(index, LEVELS.length - 1))
      this.level = LEVELS[this.levelIndex]
      this.loadHistory.push(this.levelIndex)
      this.tutorialDirector?.afterLevelLoad(this.levelIndex)
    },
    updateUi() {}
  }
  game.tutorialDirector = new TutorialDirector(game, { storage })
  return { game, storage, director: game.tutorialDirector }
}

const resumed = createFixture(tutorialState(5))
resumed.director.initialize()
assert.equal(resumed.game.levelIndex, 5, 'active tutorial should resume its saved level')
assert.deepEqual(resumed.game.loadHistory, [5], 'cold resume should load the saved final lesson once')

resumed.director.state.progress['final-exam'] = { cards: ['final-redirect'], systems: [] }
resumed.director.state.checkpoint = { levelId: 'final-exam' }
resumed.director.state.completedLevels.push('final-exam')
const completedBeforeRestart = [...resumed.director.state.completedLevels]
resumed.game.ui.tutorialRecover.click()
assert.equal(resumed.game.levelIndex, 5, 'restarting the current level must stay on that level')
assert.deepEqual(resumed.director.state.completedLevels, completedBeforeRestart.filter(id => id !== 'final-exam'), 'current-level restart must clear current completion and preserve other chapters')
assert.deepEqual(resumed.director.state.progress['final-exam'], { cards: [], systems: [] }, 'current-level restart must recreate empty current progress')
assert.equal(resumed.director.state.checkpoint, undefined, 'current-level restart must clear the current checkpoint')

resumed.director.state.progress['final-exam'] = { cards: ['final-redirect'], systems: ['intent-final'] }
resumed.game.ui.tutorialResetAll.click()
assert.equal(resumed.game.ui.tutorialResetConfirm.classList.contains('hidden'), false, 'full reset must require confirmation')
assert.equal(resumed.game.levelIndex, 5, 'opening confirmation must not reset progress yet')
resumed.game.ui.tutorialResetConfirmBtn.click()
assert.equal(resumed.game.ui.tutorialResetConfirm.classList.contains('hidden'), true, 'confirmation should close after full reset')
assert.equal(resumed.game.levelIndex, 0, 'full reset must return to the first level')
assert.deepEqual(resumed.director.state.completedLevels, [], 'full reset must clear completed chapters')
assert.deepEqual(resumed.director.state.progress, {
  'flood-village': { cards: [], systems: [] }
}, 'full reset must clear prior progress and recreate only the empty first lesson')
assert.equal(resumed.director.state.checkpoint, undefined, 'full reset must clear every checkpoint')
assert.equal(resumed.director.state.active, true, 'full reset should keep tutorial mode active')
assert.equal(resumed.storage.getItem(TUTORIAL_CHOICE_KEY), 'tutorial', 'full reset should remain in tutorial mode')

console.log('Tutorial state tests passed: resume, current-level restart, full-campaign reset')
