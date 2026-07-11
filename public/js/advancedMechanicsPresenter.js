const MATERIAL_LABELS = {
  wood: '灵木',
  stone: '岩心',
  water: '源水',
  light: '光尘',
  shadow: '影纹',
  time: '时砂',
  memory: '忆晶',
  chaos: '混沌碎片'
}

const ECHO_LABELS = {
  benevolent: '善意回响',
  malicious: '恶意回响',
  paradoxical: '悖论回响',
  prophetic: '预言回响'
}

const OATH_LABELS = {
  protection: '守护誓约',
  knowledge: '知识誓约',
  vengeance: '复仇誓约',
  sacrifice: '牺牲誓约',
  kinship: '血盟誓约'
}

function materialSummary(materials = {}) {
  const entries = Object.entries(materials)
  if (!entries.length) return '暂无材料'
  return entries
    .map(([type, item]) => `${item.name || MATERIAL_LABELS[type] || type} x${item.count || 0}`)
    .join('、')
}

function cardName(item) {
  return item?.card?.name || item?.name || item?.baseCard?.name || '未命名造物'
}

function echoName(echo) {
  const type = ECHO_LABELS[echo.echoType] || echo.echoType || '未知回响'
  const original = echo.originalCreation?.name || echo.originalCreation?.card?.name || '旧造物'
  return `${type}：${original}`
}

function formatCost(cost = {}) {
  const parts = []
  if (cost.interference) parts.push(`AI干涉 ${cost.interference}`)
  if (cost.miracle) parts.push(`${cost.miracle} 奇迹`)
  if (cost.entropy) parts.push(`裂隙 +${cost.entropy}`)
  if (cost.corruption) parts.push(`腐化 +${cost.corruption}`)
  if (cost.material) parts.push(`${cost.material} 材料`)
  if (cost.oath) parts.push(cost.oath)
  return parts.join(' / ') || '免费'
}

function formatOptionHint(option = {}) {
  const pieces = [
    option.target ? `目标：${option.target}` : '',
    option.forecast || option.impact || '',
    `代价：${formatCost(option.cost)}`,
    option.budgetLabel ? `预算：${option.budgetLabel}` : '',
    option.disabledReason ? `不可用：${option.disabledReason}` : '',
    option.risk ? `风险：${option.risk}` : ''
  ].filter(Boolean)
  return pieces.join(' · ')
}

export function buildAdvancedMechanicsViewModel(state = {}) {
  const workshop = state.workshop || {}
  const ritual = state.ritual || {}
  const oath = state.oath || {}
  const rift = state.rift || {}
  const abyss = state.abyss || {}
  const chain = state.chain || {}
  const corruption = state.corruption || {}
  const intent = state.intent || {}
  const story = state.story || {}
  const resident = state.resident || {}
  const social = state.social || {}
  const legacy = state.legacy || {}
  const tactical = state.tactical || {}

  const inventory = workshop.inventory || []
  const workshopCreations = workshop.workshopCreations || []
  const ritualSuggestions = ritual.suggestions || []
  const selectedNpc = oath.selectedNpc || null
  const availableOaths = oath.available || []
  const activeOaths = oath.activeOaths || []
  const activeEchoes = rift.activeEchoes || []
  const entropyRatio = Number(rift.entropyRatio || 0)
  const abyssState = abyss.state || { level: 'dormant', description: '深渊沉睡' }
  const chainProgress = chain.total ? Math.round(((chain.discovered || 0) / chain.total) * 100) : 0
  const corruptionLevel = corruption.corruptionLevel || 0
  const intentCount = intent.previewCount || 0
  const highThreatCount = intent.highThreatCount || 0
  const storySummary = story.summary || {}
  const residentActions = resident.actions || []
  const tacticalOptions = tactical.options || []
  const tacticalBudget = tactical.budget || null

  const systems = [
    {
      id: 'chain',
      title: '连锁反应',
      status: `发现 ${chain.discovered || 0}/${chain.total || 0} · ${chain.latest || '等待共鸣'}`,
      tone: (chain.discovered || 0) > 0 ? 'active' : chainProgress >= 50 ? 'ready' : 'idle'
    },
    {
      id: 'workshop',
      title: '造物者工坊',
      status: `库存 ${inventory.length} · 材料 ${materialSummary(workshop.materials)}`,
      tone: inventory.length || workshopCreations.length ? 'ready' : 'idle'
    },
    {
      id: 'ritual',
      title: '仪式熔炉',
      status: ritualSuggestions.length
        ? `可执行 ${ritualSuggestions[0].recipe?.name || '未知仪式'}`
        : `需要 2-3 个场上造物（当前 ${ritual.placedCreationCount || 0}）`,
      tone: ritualSuggestions.length ? 'ready' : 'idle'
    },
    {
      id: 'oath',
      title: '言灵誓约',
      status: selectedNpc
        ? `${selectedNpc.name} · 可立誓 ${availableOaths.filter(o => o.canForm !== false).length} · 活跃 ${activeOaths.length}`
        : `先点击一名 NPC · 活跃 ${activeOaths.length}`,
      tone: selectedNpc && availableOaths.length ? 'ready' : activeOaths.length ? 'active' : 'idle'
    },
    {
      id: 'rift',
      title: '裂隙回响',
      status: `裂隙 ${Math.round(entropyRatio * 100)}% · 活跃 ${activeEchoes.length}`,
      tone: entropyRatio >= 0.6 ? 'danger' : activeEchoes.length ? 'active' : 'idle'
    },
    {
      id: 'abyss',
      title: '认知深渊',
      status: `${abyssState.level || 'dormant'} · ${abyss.currentRiddle ? '有待解谜题' : '无待解谜题'}`,
      tone: abyssState.level === 'deep' || abyssState.level === 'apocalyptic' ? 'danger' : abyssState.level === 'approaching' ? 'active' : 'idle'
    },
    {
      id: 'corruption',
      title: '验证腐化',
      status: `腐化 ${corruptionLevel} · ${corruption.engineOverloaded ? '引擎过载' : (corruption.state?.description || '稳定')}`,
      tone: corruption.engineOverloaded || corruptionLevel >= 8 ? 'danger' : corruptionLevel > 0 ? 'active' : 'idle'
    },
    {
      id: 'intent',
      title: '敌方意图',
      status: intentCount
        ? `预览 ${intentCount} · 高威胁 ${highThreatCount}`
        : '暂无可预览行动',
      tone: highThreatCount > 0 ? 'danger' : intentCount > 0 ? 'ready' : 'idle'
    }
  ]

  const defaultActions = [
    {
      id: 'trigger-story',
      label: '让事发生',
      enabled: true,
      hint: '按当前旁白风格，给棋盘添一件小事'
    },
    {
      id: 'trigger-legend',
      label: '记一段传闻',
      enabled: true,
      hint: '把刚才的造物和后果记进民间说法'
    },
    {
      id: 'prepare-chain',
      label: '压出连锁',
      enabled: true,
      hint: '把信标、净化和雾压在同一条线上'
    },
    {
      id: 'refresh-intent',
      label: '重读意图',
      enabled: true,
      hint: intentCount ? `已有 ${intentCount} 个行动箭头` : '先看敌人、灾害和单位下一步'
    },
    {
      id: 'prepare-ritual',
      label: '准备仪式',
      enabled: true,
      hint: '放置可执行仪式的两张造物'
    },
    {
      id: 'trigger-corruption',
      label: '制造悖论',
      enabled: true,
      hint: '换一张脏牌，立刻有用，也会留下账'
    },
    {
      id: 'showcase-workshop',
      label: '开工坊',
      enabled: true,
      hint: '拆掉旧东西，改一件能马上用的'
    },
    {
      id: 'dismantle-workshop',
      label: '拆解库存',
      enabled: true,
      hint: inventory.length ? `拆解 ${cardName(inventory[0])}` : '先拿一件旧造物开刀'
    },
    {
      id: 'modify-workshop',
      label: '改造造物',
      enabled: true,
      hint: '消耗材料强化最近造物'
    },
    {
      id: 'fuse-workshop',
      label: '融合造物',
      enabled: true,
      hint: '用两件库存拼一张新卡'
    },
    {
      id: 'perform-ritual',
      label: '执行仪式',
      enabled: true,
      hint: ritualSuggestions[0]?.recipe?.name || '先凑出两件能互相咬合的造物'
    },
    {
      id: 'form-oath',
      label: '立下誓约',
      enabled: true,
      hint: selectedNpc ? `${selectedNpc.name} · ${OATH_LABELS[availableOaths.find(o => o.canForm !== false)?.type] || '誓约'}` : '先找一个还信你的人',
      oathType: availableOaths.find(o => o.canForm !== false)?.type || 'protection'
    },
    {
      id: 'break-oath',
      label: '背弃誓约',
      enabled: true,
      hint: activeOaths.length ? '这会伤关系，也可能换来一手急救' : '没有誓约可背'
    },
    {
      id: 'record-legacy',
      label: '记下这个人',
      enabled: true,
      hint: '让他下关还有机会回来'
    },
    {
      id: 'return-legacy',
      label: '叫人回来',
      enabled: (legacy.total || 0) > 0 || legacy.canAdvance !== false,
      hint: (legacy.returned || []).length
        ? `已回归 ${(legacy.returned || []).map(unit => unit.name).join('、')}`
        : (legacy.total || 0) > 0 ? '让名单里的人在下一关回归' : '先把一个活下来的人记进名单，下一关再召回'
    },
    {
      id: 'trigger-social',
      label: '听居民说话',
      enabled: true,
      hint: '让关系、抱怨和小团体浮出来'
    },
    {
      id: 'manifest-echo',
      label: '召出回响',
      enabled: true,
      hint: activeEchoes.length ? `当前活跃 ${activeEchoes.length} 个回响` : '裂隙够深时，旧造物会回头'
    },
    {
      id: 'generate-riddle',
      label: '翻开谜题',
      enabled: true,
      hint: abyss.currentRiddle ? '已有谜题，别乱加深' : '裂隙够深时才会露题'
    },
    {
      id: 'submit-riddle',
      label: '提交解码',
      enabled: !!abyss.currentRiddle,
      hint: abyss.currentRiddle ? `尝试 ${abyss.currentRiddle.attempts || 0}/3` : '暂无谜题'
    },
    {
      id: 'advance-story',
      label: '往下走',
      enabled: true,
      hint: (story.availableBeats || 0) > 0 ? '接上一个剧情节拍' : '让当前旁白添一件事'
    }
  ]

  const actions = tacticalOptions.length
    ? tacticalOptions.map(option => ({
        id: option.id,
        label: option.label,
        enabled: option.enabled !== false,
        hint: formatOptionHint(option),
        mechanism: option.mechanism,
        target: option.target,
        budgetLabel: option.budgetLabel,
        disabledReason: option.disabledReason,
        interference: option.interference || 0,
        tone: option.tone || 'ready'
      }))
    : defaultActions

  const director = tactical.director || {
    title: 'AI 考核者',
    text: '先看箭头。哪一格会出事，就只改那一格。',
    source: 'local'
  }

  const detail = [
    tacticalBudget ? `AI干涉：${tacticalBudget.remaining}/${tacticalBudget.limit}。这回合别贪。` : '',
    tactical.threatLine || (intentCount ? `已读到 ${intentCount} 条下一步。` : '先读箭头，再决定放什么。'),
    chain.latest ? `最新共鸣：${chain.latest}` : '两种相邻造物咬上，才会出连锁。',
    inventory.length ? `工坊库存：${inventory.slice(0, 3).map(cardName).join('、')}` : '工坊没货。先把造物放到场上。',
    ritualSuggestions.length ? `可做仪式：${ritualSuggestions[0].recipe?.name || '未知仪式'}，风险 ${ritualSuggestions[0].risk || 'low'}` : '场上有两件以上造物，仪式才有料。',
    activeEchoes.length ? `回响：${activeEchoes.slice(0, 2).map(echoName).join('；')}` : '裂隙深了，旧造物会回来。',
    residentActions.length ? `居民记忆：${residentActions.slice(-2).map(action => action.payload?.text || action.type).join('；')}` : (social.summary || '居民会记住你如何使用这些危险手段。'),
    intentCount ? `敌方意图：${intent.narrative || '箭头已经标出来。'}` : '没有箭头时，别急着花预算。',
    corruptionLevel ? `腐化：${corruptionLevel}。脏牌救命，也会污染棋盘。` : '验证腐化是急救，不是常规手段。',
    abyss.currentRiddle ? `谜题：${abyss.currentRiddle.displayed}` : (abyssState.description || '深渊还没伸手。')
  ].filter(Boolean).join('\n')

  return {
    systems,
    actions,
    director,
    budget: tacticalBudget,
    next: tacticalOptions.slice(0, 3).map(option => ({
      label: option.mechanism || option.label,
      text: option.forecast || option.impact || ''
    })),
    detail,
    logs: (state.logs || []).slice(0, 8)
  }
}

export { MATERIAL_LABELS, ECHO_LABELS, OATH_LABELS }
