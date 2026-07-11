export const TUTORIAL_CAMPAIGN_VERSION = 1
export const TUTORIAL_STORAGE_KEY = 'creatorExamTutorialCampaign:v1'
export const TUTORIAL_CHOICE_KEY = 'creatorExamTutorialChoice:v1'

const card = (id, ability, prompt, x, y, options = {}) => Object.freeze({
  id,
  ability,
  acceptedAbilities: Object.freeze(options.acceptedAbilities || [ability]),
  prompt,
  target: Object.freeze({ x, y }),
  range: options.range || 1,
  duration: options.duration || 12,
  name: options.name || '考核教学造物',
  type: options.type || '教学奇迹',
  description: options.description || '',
  expected: options.expected || '',
  reason: options.reason || '',
  tutorialEffects: Object.freeze(options.tutorialEffects || []),
  tutorialEffectsGlobal: Boolean(options.tutorialEffectsGlobal)
})

const system = (id, action, title, instruction, expected) => Object.freeze({
  id,
  action,
  title,
  instruction,
  expected
})

export const TUTORIAL_CAMPAIGN = Object.freeze([
  Object.freeze({
    levelId: 'flood-village',
    title: '第一课 · 给洪水让路',
    cards: Object.freeze([
      card('flood-drain', 'absorb_water', '创造一朵会饮尽暴雨的巨大莲花，让退潮的叶脉在村民脚下亮成通往高地的路', 3, 3, {
        name: '饮潮莲',
        range: 3,
        tutorialEffects: ['reveal_path'],
        duration: 9,
        description: '持续吸走附近洪水，为四名居民保住通往东侧高地的道路。',
        expected: '洪水退开，四名居民在第 6 回合前抵达东侧高地。',
        reason: '落在四名居民之间，能在队伍排队前进时持续挡住洪水。'
      })
    ]),
    systems: Object.freeze([
      system('intent', 'refresh-intent', '阅读行动指引', '打开“志”，重算一次单位与灾害的下一步。', '棋盘出现可读的行动方向。'),
      system('npc-dialogue', 'npc-dialogue', '和居民交谈', '选择一名仍在棋盘上的居民，询问他下一步需要什么。', '居民从当前地形和目标给出有根据的回应。'),
      system('save', 'save-tutorial', '保存教学战役', '把当前进度写入独立的 tutorial-campaign 存档槽。', '教学进度不会覆盖普通存档。')
    ])
  }),
  Object.freeze({
    levelId: 'night-mine',
    title: '第二课 · 在黑暗里留下方向',
    cards: Object.freeze([
      card('mine-light', 'illuminate', '让熄灭的矿轨重新生出一棵月亮树，用枝头冷光把矿工的名字一路送到东北出口', 1, 1, {
        acceptedAbilities: ['illuminate', 'memory_beacon', 'sun_blessing'],
        name: '轨道月树',
        range: 5,
        tutorialEffects: ['reveal_path'],
        duration: 10,
        description: '驱散矿井入口附近的黑暗，让矿工持续辨认东北出口。',
        expected: '至少三名矿工在第 8 回合前抵达出口。',
        reason: '第 2 列、第 2 行覆盖出口前的黑暗瓶颈。'
      })
    ]),
    systems: Object.freeze([
      system('intent-mine', 'refresh-intent', '再次读取意图', '比较照明前后的路径箭头，确认黑暗如何改变矿工行动。', '行动指引反映照明后的新路线。'),
      system('chain', 'prepare-chain', '触发连锁反应', '让净化与记忆信标在真实棋盘上产生一次共鸣。', '连锁图鉴记录一条新发现。'),
      system('workshop-mine', 'modify-workshop', '把旧造物改成战术备件', '让工坊针对眼前威胁改造一件造物并投入棋盘。', '改造后的造物真实影响矿工路线。'),
      system('legacy', 'record-legacy', '记录传承', '把一名获救者写入跨关名单。', '后续关卡可以看到被记住的人。')
    ])
  }),
  Object.freeze({
    levelId: 'giant-city',
    title: '第三课 · 不杀死也能阻止',
    cards: Object.freeze([
      card('beast-calm', 'calm', '用退潮后留下的白骨做一支长笛，只唱给古水巨兽听，让它在城门前梦见尚未断流的河', 0, 1, {
        acceptedAbilities: ['calm', 'beast_taming'],
        name: '潮声骨笛',
        duration: 18,
        description: '持续安抚古水巨兽，保护城市，也不切断它背上的河流。',
        expected: '城市撑到第 15 回合，巨兽怒气始终低于上限。',
        reason: '第 1 列、第 2 行靠近巨兽起点，能在它第一次移动前生效。'
      })
    ]),
    systems: Object.freeze([
      system('intent-beast', 'refresh-intent', '预读巨兽冲锋', '先看巨兽下一步指向哪一格，再决定如何改写。', '棋盘标出巨兽的目标格与威胁。'),
      system('ritual', 'perform-ritual', '完成一次仪式', '用真实场上造物执行仪式，观察造物被消耗并换成新效果。', '仪式结果写入回合记录。'),
      system('oath', 'form-oath', '立下言灵誓约', '与一名居民建立守护誓约。', '活跃誓约列表出现新誓约与背叛风险。'),
      system('chain-beast', 'prepare-chain', '用连锁改写冲锋', '再用净化与记忆共鸣保护巨兽前方的关键单位。', '巨兽或关键单位获得真实引导与免混乱状态。')
    ])
  }),
  Object.freeze({
    levelId: 'wordless-war',
    title: '第四课 · 让双方走到同一张桌前',
    cards: Object.freeze([
      card('war-path', 'reveal_path', '在边境种下两面彼此映照的路牌，让东岸与西岸的使者循着同一束星火走到桌前', 3, 3, {
        acceptedAbilities: ['reveal_path', 'guide', 'memory_beacon', 'calm', 'dream_link'],
        name: '停战路标',
        range: 4,
        tutorialEffects: ['guide', 'calm'],
        duration: 10,
        description: '显现使者的最优路线，减少在迷雾中的误判。',
        expected: '两名使者会面，战争值保持在上限以下。',
        reason: '第 4 列、第 4 行正是双方目标点，也是两条路线的交汇处。'
      })
    ]),
    systems: Object.freeze([
      system('intent-war', 'refresh-intent', '预读双方误判', '读取两名使者下一步，找出最可能推高战争值的位置。', '会谈路线和高威胁点被明确标出。'),
      system('chain-war', 'prepare-chain', '用共鸣保护会谈', '把连锁反应放进使者的真实路线，而不是只保留为图鉴记录。', '一名使者的混乱意图被改写。'),
      system('oath-war', 'form-oath', '让誓约承担风险', '兑现守护誓约，为会谈路线上的关键单位提供护盾。', '誓约消耗信任并产生实际保护。'),
      system('storyteller', 'storyteller', '切换 AI 旁白', '切到“说书人”，让旁白依据当前局面生成一次事件。', '旁白风格和事件历史发生变化。'),
      system('legend', 'trigger-legend', '形成世界传说', '把本关造物与后果写进民间说法。', '“志”中出现传闻、因果或蝴蝶效应。'),
      system('social', 'trigger-social', '观察社会关系', '让居民关系和小团体通过真实 SocialGraph 浮现。', '人物关系产生可见变化。')
    ])
  }),
  Object.freeze({
    levelId: 'memory-plague',
    title: '第五课 · 把名字叫回来',
    cards: Object.freeze([
      card('memory-beacon', 'memory_beacon', '让圣树结出会呼唤姓名的银色果实，每亮起一颗，就替雾里的人记住回家的方向', 2, 0, {
        acceptedAbilities: ['memory_beacon', 'guide', 'reveal_path', 'sun_blessing', 'dream_link'],
        name: '唤名信标',
        tutorialEffects: ['guide', 'reveal_path'],
        tutorialEffectsGlobal: true,
        duration: 13,
        description: '持续唤回目标与方向，抵抗记忆瘟疫造成的随机偏离。',
        expected: '至少四名居民在第 10 回合前抵达圣树。',
        reason: '第 3 列、第 1 行紧邻圣树，所有成功路线最终都会进入它的覆盖范围。'
      })
    ]),
    systems: Object.freeze([
      system('intent-memory', 'refresh-intent', '辨认迷路的下一步', '先读出谁正在偏离圣树，再决定把高级能力用在哪里。', '迷路单位与目标线被明确标出。'),
      system('chain-memory', 'prepare-chain', '让记忆共鸣落在路上', '用净化与记忆的真实连锁帮助一名迷路居民。', '居民获得引导与短暂免混乱。'),
      system('rift', 'manifest-echo', '召回裂隙回响', '从过往造物记忆中召回一次真实效果。', '棋盘或日志出现旧造物回响。'),
      system('abyss-open', 'generate-riddle', '进入认知深渊', '消耗裂隙打开一个可解的深渊谜题。', '“术”中出现待解谜题。'),
      system('abyss-solve', 'submit-riddle', '解开深渊谜题', '提交解码答案，观察全局战术奖励。', '谜题关闭，单位获得显路或抗混乱效果。'),
      system('workshop', 'modify-workshop', '改造一件造物', '使用真实库存或材料完成一次工坊改造。', '工坊产出一件强化造物。'),
      system('oath-memory', 'form-oath', '让誓约抵抗遗忘', '再次兑现守护誓约，保护最容易迷失的居民。', '居民得到护盾、引导和免混乱。')
    ])
  }),
  Object.freeze({
    levelId: 'final-exam',
    title: '终课 · 不再逐步替你作答',
    cards: Object.freeze([
      card('final-redirect', 'redirect_hazard', '在终考裂隙前竖起一座三向风门，把洪水、黑暗与迷雾折成绕城长河，也把裂隙兽的脚步吹向沉睡的荒原', 5, 0, {
        name: '三向风门',
        range: 2,
        tutorialEffects: ['restrain_beast'],
        duration: 12,
        description: '持续把混合灾害从居民路线和城门附近拨开，并牵制终考裂隙兽。',
        expected: '城门与居民路线不再被混合灾害迅速封死，裂隙兽无法抢先冲入城市。',
        reason: '第 6 列、第 1 行靠近城市和目标区，是混合灾害的关键出口。'
      }),
      card('final-path', 'reveal_path', '从第一位居民脚下放出一束不会遗忘的路光，让它穿过裂隙，也让两位使者在同一处看见彼此', 1, 0, {
        name: '终考路光',
        range: 2,
        tutorialEffects: ['guide', 'reveal_path', 'calm'],
        tutorialEffectsGlobal: true,
        duration: 12,
        description: '让居民快速沿最优路线前进，并减少混合灾害中的误判。',
        expected: '三名居民被救下，战争值低于 9，城市仍然完整。',
        reason: '第 2 列、第 1 行能从左侧覆盖居民出发区并连接北侧安全线。'
      })
    ]),
    systems: Object.freeze([
      system('intent-final', 'refresh-intent', '阅读终考全局', '先把居民、使者、裂隙兽和混合灾害的下一步同时读清。', '终考高威胁目标被排序。'),
      system('chain-final', 'prepare-chain', '建立终考连锁', '把净化与记忆共鸣落在最高威胁线上。', '关键单位的意图被真实改写。'),
      system('ritual-final', 'perform-ritual', '用仪式处理混合灾害', '执行一次针对当前最高威胁的真实仪式。', '危险地形或裂隙兽行动被仪式改变。'),
      system('oath-final', 'form-oath', '兑现终考誓约', '让过去建立的关系在终考里承担一次风险。', '关键单位获得誓约保护，信任发生变化。'),
      system('rift-final', 'manifest-echo', '召回旧日答案', '把前五关的造物回响召到终考棋盘。', '旧造物能力在最高威胁点真实触发。'),
      system('workshop-final', 'modify-workshop', '锻造终考备件', '让工坊根据终考威胁再制造一件可立即使用的造物。', '强化造物被投入棋盘。'),
      system('corruption', 'trigger-corruption', '体验验证腐化', '制造并投放一次悖论造物，理解它的即时收益与长期代价。', '腐化值上升，棋盘出现真实悖论效果。')
    ])
  })
])

export const TUTORIAL_ADVANCED_SYSTEM_IDS = Object.freeze(
  TUTORIAL_CAMPAIGN.flatMap(lesson => lesson.systems.map(item => item.id))
)

export function tutorialLessonForLevel(levelId) {
  return TUTORIAL_CAMPAIGN.find(lesson => lesson.levelId === levelId) || null
}

export function createTutorialCard(spec, sourceCard = {}) {
  return {
    ...sourceCard,
    id: sourceCard.id || `tutorial-${spec.id}-${Date.now()}`,
    name: sourceCard.name || spec.name,
    type: spec.type,
    ability: spec.ability,
    tags: [...new Set([...(sourceCard.tags || []), '教学校准', spec.ability])],
    range: spec.range,
    duration: spec.duration,
    cost: 0,
    stabilityCost: 0,
    stability_cost: 0,
    description: spec.description,
    side_effect: '教学校准：不额外增加裂隙。',
    source: sourceCard.source || 'tutorial',
    tutorialLessonCardId: spec.id,
    tutorialEffects: [...(spec.tutorialEffects || [])],
    tutorialEffectsGlobal: Boolean(spec.tutorialEffectsGlobal),
    tutorialTarget: { ...spec.target }
  }
}

export function createFixedTutorialCard(spec) {
  return createTutorialCard(spec, {
    id: `tutorial-fixed-${spec.id}`,
    name: spec.name,
    source: 'tutorial-fixed',
    fallbackMessage: '固定教学造物已载入，不经过云端编译。'
  })
}

export function tutorialCampaignCoverage() {
  return {
    levelIds: TUTORIAL_CAMPAIGN.map(lesson => lesson.levelId),
    cardIds: TUTORIAL_CAMPAIGN.flatMap(lesson => lesson.cards.map(item => item.id)),
    systemIds: [...TUTORIAL_ADVANCED_SYSTEM_IDS]
  }
}
