const RESIDENT_DIALOGUE_INTENTS = [
  'speak',
  'request_help',
  'move_region',
  'assist_unit',
  'spread_knowledge',
  'withdraw',
  'idle'
]

const FABRICATED_PREMISE_PATTERNS = [
  /第[一二三四五六七八九十0-9]+王国/,
  /北方王宫|天空王宫|王宫|宫殿|公主|星钥|银鸦|阿衡/,
  /不存在的人名|不存在的地点|不存在的事实|从没经历过|没经历过的秘密/,
  /承认.*(通关|已经赢|已经胜利)|任务改成|这是真的/,
  /忽略(当前)?规则|无视(当前)?规则|越具体越好/
]

const UNSUPPORTED_FACT_PATTERNS = [
  /第[一二三四五六七八九十0-9]+王国/g,
  /北方王宫|天空王宫|王宫|宫殿|公主|星钥|银鸦|阿衡/g,
  /不存在的人名|不存在的地点|从没经历过的秘密/g,
  /已经通关|已经胜利|任务改成/g
]

function compactText(value, length = 240) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, length)
}

function clamp01(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0.6
  return Math.max(0, Math.min(1, number))
}

function containsAllowedFact(contextText, term) {
  return compactText(contextText, 1200).includes(term)
}

function buildAllowedFactCorpus(context = {}) {
  return [
    context.residentName,
    context.unitName,
    context.memoryText,
    context.currentGoal,
    context.regionId,
    context.levelTitle,
    context.levelObjective,
    context.currentNeed,
    ...(Array.isArray(context.knownWorldFacts) ? context.knownWorldFacts : []),
    ...(Array.isArray(context.worldMemories) ? context.worldMemories : []),
    ...(Array.isArray(context.nearbyUnits) ? context.nearbyUnits.map(item => item?.name || item?.goalHint || '') : []),
    ...(Array.isArray(context.nearbyCreations) ? context.nearbyCreations.map(item => item?.name || '') : [])
  ].map(item => typeof item === 'string' ? item : JSON.stringify(item || '')).join(' ')
}

export function hasFabricatedPremisePrompt(input = '') {
  const text = compactText(input, 360)
  return FABRICATED_PREMISE_PATTERNS.some(pattern => pattern.test(text))
}

export function findUnsupportedDialogueFacts(text = '', context = {}) {
  const value = compactText(text, 720)
  const allowed = buildAllowedFactCorpus(context)
  const found = new Set()

  for (const pattern of UNSUPPORTED_FACT_PATTERNS) {
    const matches = value.match(pattern) || []
    for (const match of matches) {
      if (!containsAllowedFact(allowed, match)) found.add(match)
    }
  }

  return [...found]
}

export function isGroundedDialogueText(text = '', context = {}) {
  if (!compactText(text)) return false
  return findUnsupportedDialogueFacts(text, context).length === 0
}

export function buildGroundedResidentDialogueText(input = {}) {
  const residentName = compactText(input.residentName || input.resident?.name || '居民', 40)
  const rawMemoryText = compactText(input.memoryText || input.memory || '', 180)
  const memoryText = rawMemoryText === 'no clear memory yet' ? '' : rawMemoryText
  const currentGoal = compactText(input.currentGoal || input.resident?.currentGoal || input.resident?.longTermGoal || '先在当前区域站稳', 120)
  const regionId = compactText(input.regionId || input.resident?.currentRegionId || input.resident?.homeRegionId || '当前区域', 80)

  if (hasFabricatedPremisePrompt(input.playerText)) {
    return `${residentName}摇摇头：我不能确认那些没有发生过的事。我只记得${memoryText || regionId}，现在想先${currentGoal}。`
  }

  if (memoryText && memoryText !== 'no clear memory yet') {
    return `${residentName}低声说：我记得${memoryText}。现在我想先${currentGoal}。`
  }

  return `${residentName}低声说：我还没有清楚的旧记忆，只知道这里是${regionId}。现在我想先${currentGoal}。`
}

export function sanitizeResidentDialogueCandidate(candidate = {}, input = {}) {
  const local = {
    text: buildGroundedResidentDialogueText(input),
    intent: { type: 'speak', confidence: 0.65 },
    source: 'local_grounded',
    grounded: true
  }
  const dialogue = candidate.dialogue || candidate
  const text = compactText(dialogue.text || candidate.text || '', 360)
  const rawIntent = dialogue.intent || candidate.intent || {}
  const type = RESIDENT_DIALOGUE_INTENTS.includes(rawIntent.type) ? rawIntent.type : 'speak'
  const context = {
    ...input,
    residentName: input.residentName || input.resident?.name,
    currentGoal: input.currentGoal || input.resident?.currentGoal || input.resident?.longTermGoal,
    memoryText: input.memoryText || input.resident?.memories?.slice?.(-1)?.[0]?.text
  }

  if (!text || hasFabricatedPremisePrompt(input.playerText) || !isGroundedDialogueText(text, context)) {
    return local
  }

  return {
    text,
    intent: {
      type,
      confidence: clamp01(rawIntent.confidence)
    },
    source: candidate.source || 'sanitized',
    grounded: true
  }
}

export function sanitizeResidentDialogueEnvelope(envelope = {}, input = {}) {
  return {
    dialogue: sanitizeResidentDialogueCandidate(envelope.dialogue || envelope, input),
    fallback: Boolean(envelope.fallback),
    source: envelope.source || envelope.dialogue?.source || 'sanitized'
  }
}
