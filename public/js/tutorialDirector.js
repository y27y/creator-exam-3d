import {
  TUTORIAL_CAMPAIGN,
  TUTORIAL_CAMPAIGN_VERSION,
  TUTORIAL_CHOICE_KEY,
  TUTORIAL_STORAGE_KEY,
  createFixedTutorialCard,
  createTutorialCard,
  tutorialLessonForLevel
} from './tutorialCampaign.js'

function safeClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

function freshState() {
  return {
    version: TUTORIAL_CAMPAIGN_VERSION,
    active: false,
    currentLevelIndex: 0,
    completedLevels: [],
    progress: {},
    assists: 0,
    startedAt: null,
    completedAt: null
  }
}

function readJson(storage, key, fallback) {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null')
    return value && typeof value === 'object' ? value : fallback
  } catch (_error) {
    return fallback
  }
}

export class TutorialDirector {
  constructor(game, options = {}) {
    this.game = game
    this.storage = options.storage || window.localStorage
    this.state = readJson(this.storage, TUTORIAL_STORAGE_KEY, freshState())
    if (this.state.version !== TUTORIAL_CAMPAIGN_VERSION) this.state = freshState()
    this.focusedElement = null
    this.lastPhaseKey = ''
    this.panelExpanded = Boolean(this.state.active)
    this.bindUi()
  }

  bindUi() {
    const ui = this.game.ui
    ui.tutorialToggle?.addEventListener('click', () => this.toggle())
    ui.tutorialChoiceStart?.addEventListener('click', () => this.start({ reset: true }))
    ui.tutorialChoiceFree?.addEventListener('click', () => this.chooseFreePlay())
    ui.tutorialPrimary?.addEventListener('click', () => this.handlePrimary())
    ui.tutorialRecover?.addEventListener('click', () => this.resetCurrentLesson())
    ui.tutorialRailBtn?.addEventListener('click', () => this.togglePanel())
    ui.tutorialCollapse?.addEventListener('click', () => this.setPanelExpanded(false))
    for (const button of ui.drawerButtons || []) {
      button.addEventListener('click', () => this.setPanelExpanded(false))
    }
  }

  initialize() {
    const choice = this.storage.getItem(TUTORIAL_CHOICE_KEY)
    if (!choice) this.game.ui.tutorialChoice.hidden = false

    if (this.state.active) {
      const index = Math.max(0, Math.min(TUTORIAL_CAMPAIGN.length - 1, Number(this.state.currentLevelIndex) || 0))
      this.clearLevelProgress(TUTORIAL_CAMPAIGN[index].levelId)
      if (this.game.levelIndex !== index) this.game.loadLevel(index)
      this.ensureResources()
      this.persist()
    }
    this.render()
  }

  isActive() {
    return Boolean(this.state.active)
  }

  start(options = {}) {
    if (options.reset) this.state = freshState()
    this.state.active = true
    this.panelExpanded = true
    this.state.startedAt ||= Date.now()
    this.state.currentLevelIndex = Math.max(0, Number(this.state.currentLevelIndex) || 0)
    this.storage.setItem(TUTORIAL_CHOICE_KEY, 'tutorial')
    this.game.ui.tutorialChoice.hidden = true
    this.game.closeCinematic?.()
    this.clearLevelProgress(TUTORIAL_CAMPAIGN[this.state.currentLevelIndex]?.levelId)
    if (this.game.levelIndex !== this.state.currentLevelIndex || options.reset) {
      this.game.loadLevel(this.state.currentLevelIndex)
    }
    this.ensureResources()
    this.persist()
    this.render()
    this.game.showToast?.('完整教学已开启。按考核官给出的造物与目标格操作即可通关。')
  }

  chooseFreePlay() {
    this.state.active = false
    this.panelExpanded = false
    this.storage.setItem(TUTORIAL_CHOICE_KEY, 'free')
    this.game.ui.tutorialChoice.hidden = true
    this.persist()
    this.render()
  }

  toggle() {
    if (this.state.active) this.pause()
    else this.start({ reset: false })
  }

  pause() {
    this.state.active = false
    this.panelExpanded = false
    this.persist()
    this.render()
    this.game.showToast?.('教学已暂停；当前游戏状态不会被删除。')
  }

  setPanelExpanded(expanded) {
    this.panelExpanded = this.isActive() && Boolean(expanded)
    this.render()
  }

  togglePanel() {
    if (!this.isActive()) return
    this.panelExpanded = !this.panelExpanded
    if (this.panelExpanded) this.game.closeDrawer?.()
    this.render()
  }

  persist() {
    try { this.storage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(this.state)) } catch (_error) {}
  }

  lesson() {
    return tutorialLessonForLevel(this.game.level?.id)
  }

  levelProgress() {
    const levelId = this.game.level?.id
    if (!levelId) return { cards: [], systems: [] }
    if (!this.state.progress[levelId]) this.state.progress[levelId] = { cards: [], systems: [] }
    return this.state.progress[levelId]
  }

  clearLevelProgress(levelId) {
    if (levelId) delete this.state.progress[levelId]
  }

  currentCardSpec() {
    const lesson = this.lesson()
    if (!lesson) return null
    const completed = new Set(this.levelProgress().cards)
    return lesson.cards.find(item => !completed.has(item.id)) || null
  }

  currentSystemSpec() {
    const lesson = this.lesson()
    if (!lesson) return null
    const completed = new Set(this.levelProgress().systems)
    return lesson.systems.find(item => !completed.has(item.id)) || null
  }

  phase() {
    if (!this.isActive() || !this.lesson()) return { kind: 'inactive' }
    if (this.game.gameState === 'lost') return { kind: 'lost' }
    if (this.game.gameState === 'won') return { kind: 'level-complete' }
    const cardSpec = this.currentCardSpec()
    if (cardSpec) {
      const ready = this.game.activeCard?.tutorialLessonCardId === cardSpec.id
      return { kind: ready ? 'place' : 'compile', card: cardSpec }
    }
    const systemSpec = this.currentSystemSpec()
    if (systemSpec) return { kind: 'system', system: systemSpec }
    return { kind: 'turns' }
  }

  ensureResources() {
    if (!this.isActive() || !this.game.level) return
    const remainingCards = this.lesson()?.cards?.filter(item => !this.levelProgress().cards.includes(item.id)).length || 0
    this.game.creationCharges = Math.max(this.game.creationCharges || 0, remainingCards + 1)
    this.game.miraclePoints = Math.max(this.game.miraclePoints || 0, 6)
    const limit = this.game.level.entropyLimit || 7
    this.game.entropy = Math.min(this.game.entropy || 0, Math.max(0, limit - 3))
    this.game.updateUi?.()
  }

  fixedCardForPrompt(text) {
    if (!this.isActive()) return null
    const spec = this.currentCardSpec()
    if (!spec || String(text || '').trim() !== spec.prompt) return null
    const fixedCard = createFixedTutorialCard(spec)
    this.game.showToast?.(`固定教学造物已载入：${spec.name}。`)
    window.requestAnimationFrame(() => this.render())
    return fixedCard
  }

  prepareCompiledCard(sourceCard, text) {
    if (!this.isActive()) return sourceCard
    const spec = this.currentCardSpec()
    if (!spec) return sourceCard
    const exactPrompt = String(text || '').trim() === spec.prompt
    const compatible = spec.acceptedAbilities.includes(sourceCard?.ability)
    if (!exactPrompt && !compatible) {
      this.game.showToast?.(`这张卡是“${sourceCard?.ability || '未知'}”，本步需要 ${spec.acceptedAbilities.join(' / ')}。你可以自由尝试，也可以使用推荐描述。`)
      return sourceCard
    }
    const calibrated = createTutorialCard(spec, sourceCard)
    this.game.showToast?.(`考核校准完成：能力 ${spec.ability}。目标格已经在棋盘上标亮。`)
    window.requestAnimationFrame(() => this.render())
    return calibrated
  }

  validatePlacement(card, x, y) {
    if (!this.isActive() || !card?.tutorialLessonCardId) return true
    const spec = this.currentCardSpec()
    if (!spec || card.tutorialLessonCardId !== spec.id) return true
    if (x === spec.target.x && y === spec.target.y) return true
    this.game.showToast?.('这张推荐卡需要放在金色标记处。')
    this.state.assists += 1
    this.persist()
    this.render()
    return false
  }

  recordPlacement(creation, x, y) {
    if (!this.isActive()) return
    const spec = this.currentCardSpec()
    if (!spec || creation?.card?.tutorialLessonCardId !== spec.id) return
    if (x !== spec.target.x || y !== spec.target.y) return
    const progress = this.levelProgress()
    if (!progress.cards.includes(spec.id)) progress.cards.push(spec.id)
    this.checkpoint('placement')
    this.persist()
    this.ensureResources()
    this.render()
  }

  recordSystemAction(action) {
    if (!this.isActive()) return false
    const spec = this.currentSystemSpec()
    if (!spec || spec.action !== action) return false
    const progress = this.levelProgress()
    if (!progress.systems.includes(spec.id)) progress.systems.push(spec.id)
    this.checkpoint(`system:${spec.id}`)
    this.persist()
    this.ensureResources()
    this.render()
    return true
  }

  recordLevelWon() {
    if (!this.isActive() || !this.game.level?.id) return
    if (!this.state.completedLevels.includes(this.game.level.id)) this.state.completedLevels.push(this.game.level.id)
    this.checkpoint('level-complete')
    this.persist()
    this.render()
  }

  recordFinaleComplete() {
    if (!this.isActive()) return
    this.state.completedAt = Date.now()
    if (this.game.ui.saveSlotName) this.game.ui.saveSlotName.value = 'tutorial-campaign'
    this.game.saveCurrentSlot?.()
    this.state.active = false
    this.storage.setItem(TUTORIAL_CHOICE_KEY, 'complete')
    this.persist()
    this.render()
    this.game.showToast?.('完整教学战役已通关；tutorial-campaign 已转为普通已通关存档。')
  }

  afterLevelLoad(index) {
    if (!this.isActive()) return
    this.state.currentLevelIndex = index
    this.ensureResources()
    this.persist()
    this.render()
  }

  async executeSystem(spec) {
    if (!spec) return
    this.ensureResources()
    if (spec.action === 'npc-dialogue') {
      const unit = this.game.getDialogueParticipants?.()[0]
      if (!unit) {
        this.game.showToast?.('当前没有可交流的居民。')
        return
      }
      this.game.openNpcDialogue(unit, this.game.getNpcForUnit?.(unit))
      if (this.game.ui.npcDialogueInput) {
        this.game.ui.npcDialogueInput.value = '你现在最需要我改变哪一格地形？'
        this.game.ui.npcDialogueInput.focus()
      }
      this.game.showToast?.('问题已经填好；点击“发送回应”完成这一步。')
      return
    }
    if (spec.action === 'storyteller') {
      if (this.game.ui.storytellerSelect) this.game.ui.storytellerSelect.value = 'narrator'
      this.game.handleStorytellerChange?.('narrator')
      this.game.handleAdvancedAction?.('trigger-story')
      this.recordSystemAction('storyteller')
      return
    }
    if (spec.action === 'save-tutorial') {
      if (this.game.ui.saveSlotName) this.game.ui.saveSlotName.value = 'tutorial-campaign'
      this.game.saveCurrentSlot?.()
      this.recordSystemAction('save-tutorial')
      return
    }
    this.game.openDrawer?.(spec.id === 'intent' ? 'world' : 'systems')
    this.game.tacticalActionHistory = []
    const result = this.game.handleAdvancedAction?.(spec.action)
    if (result?.success === false) {
      this.game.showToast?.(`这次没有成功触发“${spec.title}”，请按提示再试一次。`)
    }
  }

  handlePrimary() {
    const phase = this.phase()
    if (phase.kind === 'compile') {
      this.ensureResources()
      this.game.ui.input.value = phase.card.prompt
      this.game.ui.input.focus()
      this.game.showToast?.('推荐描述已填入。你仍然需要点击“生成造物卡”。')
      this.render()
      return
    }
    if (phase.kind === 'place') {
      this.game.startPlacement?.()
      this.render()
      return
    }
    if (phase.kind === 'system') {
      this.executeSystem(phase.system)
      return
    }
    if (phase.kind === 'turns') {
      this.checkpoint('before-turn')
      this.game.endTurn?.()
      window.requestAnimationFrame(() => this.render())
      return
    }
    if (phase.kind === 'lost') {
      this.restoreCheckpoint() || this.resetCurrentLesson()
      return
    }
    if (phase.kind === 'level-complete') {
      if (this.game.levelIndex < TUTORIAL_CAMPAIGN.length - 1) {
        this.state.currentLevelIndex = this.game.levelIndex + 1
        this.persist()
        this.game.nextLevel?.()
      } else {
        this.game.openNightWatch?.()
      }
    }
  }

  resetCurrentLesson() {
    if (!this.isActive()) return
    const levelId = this.game.level?.id
    this.clearLevelProgress(levelId)
    delete this.state.checkpoint
    this.state.assists += 1
    this.persist()
    this.game.loadLevel(this.game.levelIndex)
    this.ensureResources()
    this.render()
    this.game.showToast?.('本课已重置，黄金路线重新开始。')
  }

  checkpoint(reason) {
    if (!this.isActive()) return
    const game = this.game
    this.state.checkpoint = safeClone({
      reason,
      levelIndex: game.levelIndex,
      levelId: game.level?.id,
      turn: game.turn,
      terrain: game.terrain,
      units: game.units,
      creations: game.creations,
      creationCharges: game.creationCharges,
      miraclePoints: game.miraclePoints,
      entropy: game.entropy,
      rescued: game.rescued,
      lost: game.lost,
      warMeter: game.warMeter,
      gameState: game.gameState,
      progress: this.levelProgress(),
      ritual: game.ritualForge?.serialize?.(),
      oath: game.oathManager?.serialize?.(),
      abyss: game.cognitiveAbyss?.serialize?.(),
      corruption: game.verificationCorruption?.serialize?.(),
      workshop: game.creatorWorkshop?.serialize?.(),
      rift: game.riftEchoSystem?.serialize?.()
    })
  }

  restoreCheckpoint() {
    const snapshot = this.state.checkpoint
    if (!this.isActive() || !snapshot || snapshot.levelId !== this.game.level?.id) return false
    const game = this.game
    for (const key of ['turn', 'creationCharges', 'miraclePoints', 'entropy', 'rescued', 'lost', 'warMeter', 'gameState']) {
      game[key] = safeClone(snapshot[key])
    }
    game.terrain = safeClone(snapshot.terrain)
    game.units = safeClone(snapshot.units)
    game.creations = safeClone(snapshot.creations)
    this.state.progress[snapshot.levelId] = safeClone(snapshot.progress)
    game.ritualForge?.deserialize?.(snapshot.ritual)
    game.oathManager?.deserialize?.(snapshot.oath)
    game.cognitiveAbyss?.deserialize?.(snapshot.abyss)
    game.verificationCorruption?.deserialize?.(snapshot.corruption)
    game.creatorWorkshop?.deserialize?.(snapshot.workshop)
    game.riftEchoSystem?.deserialize?.(snapshot.rift)
    game.activeCard = null
    game.placementMode = false
    game.ui.modal.classList.add('hidden')
    game.renderWorld?.()
    game.updateUi?.()
    this.state.assists += 1
    this.persist()
    this.render()
    game.showToast?.('已恢复到最近的教学检查点。')
    return true
  }

  modeContext() {
    return this.isActive() ? {
      active: true,
      campaignVersion: TUTORIAL_CAMPAIGN_VERSION,
      assists: this.state.assists,
      completedLevels: [...this.state.completedLevels]
    } : { active: false }
  }

  clearFocus() {
    if (this.focusedElement) this.focusedElement.classList.remove('tutorial-focus')
    this.focusedElement = null
  }

  focusSelector(selector) {
    this.clearFocus()
    const element = selector ? document.querySelector(selector) : null
    if (element) {
      element.classList.add('tutorial-focus')
      this.focusedElement = element
    }
  }

  positionMarker() {
    const marker = this.game.ui.tutorialTargetMarker
    const phase = this.phase()
    if (!marker || !['compile', 'place'].includes(phase.kind) || !this.game.camera || !this.game.renderer) {
      if (marker) marker.hidden = true
      return
    }
    const world = this.game.tileToWorld(phase.card.target.x, phase.card.target.y)
    const point = this.game.camera.position.clone().set(world.x, 0.2, world.z)
    point.project(this.game.camera)
    const rect = this.game.renderer.domElement.getBoundingClientRect()
    marker.style.left = `${rect.left + (point.x + 1) * rect.width / 2}px`
    marker.style.top = `${rect.top + (1 - point.y) * rect.height / 2}px`
    marker.hidden = point.z < -1 || point.z > 1
  }

  render() {
    const ui = this.game.ui
    if (!ui.tutorialPanel) return
    ui.tutorialToggle.textContent = this.isActive() ? '暂停教学' : '完整教学'
    if (ui.tutorialRailBtn) {
      ui.tutorialRailBtn.hidden = !this.isActive()
      ui.tutorialRailBtn.setAttribute('aria-expanded', String(this.isActive() && this.panelExpanded))
      ui.tutorialRailBtn.setAttribute('aria-label', this.panelExpanded ? '收起教学' : '展开教学')
    }
    ui.tutorialPanel.hidden = !this.isActive() || !this.panelExpanded
    this.clearFocus()
    if (!this.isActive()) {
      ui.tutorialTargetMarker.hidden = true
      return
    }

    const lesson = this.lesson()
    if (!lesson) return
    const phase = this.phase()
    const lessonIndex = TUTORIAL_CAMPAIGN.findIndex(item => item.levelId === lesson.levelId)
    const progress = this.levelProgress()
    const total = lesson.cards.length + lesson.systems.length
    const done = progress.cards.length + progress.systems.length
    ui.tutorialProgress.textContent = `教学战役 · 第 ${lessonIndex + 1}/6 课 · ${done}/${total}`
    ui.tutorialTitle.textContent = lesson.title
    ui.tutorialPromptBlock.hidden = true
    ui.tutorialRecover.hidden = phase.kind === 'level-complete'

    if (phase.kind === 'compile') {
      ui.tutorialCopy.textContent = '写下这件造物，或直接使用推荐描述。金色标记就是放置点。'
      ui.tutorialPromptBlock.hidden = false
      ui.tutorialPrompt.textContent = phase.card.prompt
      ui.tutorialPrimary.textContent = '使用推荐描述'
      this.focusSelector('#creation-input')
    } else if (phase.kind === 'place') {
      ui.tutorialCopy.textContent = '点击棋盘上闪烁的金色目标格。'
      ui.tutorialPrimary.textContent = this.game.placementMode ? '请点击金色目标格' : '进入放置模式'
      ui.tutorialPrimary.disabled = this.game.placementMode
      this.focusSelector(this.game.placementMode ? null : '#place-btn')
    } else if (phase.kind === 'system') {
      ui.tutorialCopy.textContent = phase.system.instruction
      ui.tutorialPrimary.textContent = phase.system.title
      this.focusSelector('#drawer-systems-btn')
    } else if (phase.kind === 'turns') {
      ui.tutorialCopy.textContent = '结束回合，观察造物怎样改变局面。'
      ui.tutorialPrimary.textContent = `结束第 ${this.game.turn} 回合`
      this.focusSelector('#end-turn-btn')
    } else if (phase.kind === 'lost') {
      ui.tutorialCopy.textContent = '没有达成目标，先恢复最近检查点。'
      ui.tutorialPrimary.textContent = '恢复最近检查点'
    } else if (phase.kind === 'level-complete') {
      ui.tutorialCopy.textContent = '本课通过。人物与造物记录会继续保留。'
      ui.tutorialPrimary.textContent = lessonIndex < TUTORIAL_CAMPAIGN.length - 1 ? '进入下一课' : '进入长夜守城'
    }

    if (!['compile', 'place'].includes(phase.kind)) ui.tutorialTargetMarker.hidden = true
    ui.tutorialPrimary.disabled = phase.kind === 'place' && this.game.placementMode
    this.lastPhaseKey = `${lesson.levelId}:${phase.kind}:${phase.card?.id || phase.system?.id || ''}`
    this.positionMarker()
  }
}
