export const RESIDENT_PROTOTYPES = [
  { id: 'xiaozhu', name: '小烛', defaultMood: '警觉', defaultGoal: '寻找安全避难所', tags: ['refugee', 'youth'] },
  { id: 'laolin', name: '老林', defaultMood: '谨慎', defaultGoal: '守护最后的家园', tags: ['elder', 'guardian'] },
  { id: 'ashui', name: '阿水', defaultMood: '好奇', defaultGoal: '探索未知的世界', tags: ['child', 'explorer'] },
  { id: 'tiezhu', name: '铁柱', defaultMood: '愤怒', defaultGoal: '为失去的亲人复仇', tags: ['warrior', 'refugee'] },
  { id: 'yuner', name: '云儿', defaultMood: '忧郁', defaultGoal: '寻找失散的家人', tags: ['refugee', 'youth'] },
  { id: 'shitou', name: '石头', defaultMood: '麻木', defaultGoal: '维持基本生存', tags: ['laborer', 'survivor'] },
  { id: 'caifeng', name: '彩凤', defaultMood: '希望', defaultGoal: '重建社区信任', tags: ['healer', 'elder'] },
  { id: 'heiye', name: '黑叶', defaultMood: '怀疑', defaultGoal: '揭露隐藏的真相', tags: ['scout', 'youth'] },
  { id: 'baihua', name: '白花', defaultMood: '温柔', defaultGoal: '照顾受伤的生命', tags: ['healer', 'child'] },
  { id: 'huoshao', name: '火烧', defaultMood: '狂热', defaultGoal: '传播变革的火种', tags: ['warrior', 'youth'] },
  { id: 'muyang', name: '牧羊', defaultMood: '平静', defaultGoal: '带领羊群找到新牧场', tags: ['herder', 'elder'] },
  { id: 'bingmei', name: '冰妹', defaultMood: '冷漠', defaultGoal: '守护古老的秘密', tags: ['guardian', 'youth'] },
  { id: 'fengzi', name: '疯子', defaultMood: '狂乱', defaultGoal: '寻找失落的记忆', tags: ['survivor', 'explorer'] },
  { id: 'xiaoyu', name: '小雨', defaultMood: '悲伤', defaultGoal: '为逝去的同伴祈祷', tags: ['refugee', 'child'] }
]

export const REGION_THEMES = [
  { id: 'flood-village', title: '洪水村庄', hazardType: 'flood', mapBias: 'wet', residentTags: ['refugee', 'survivor'] },
  { id: 'ash-forest', title: '灰烬森林', hazardType: 'fire', mapBias: 'dry', residentTags: ['scout', 'guardian'] },
  { id: 'crystal-cave', title: '水晶洞穴', hazardType: 'cave_in', mapBias: 'dark', residentTags: ['explorer', 'guardian'] },
  { id: 'wind-cliff', title: '风啸崖', hazardType: 'fall', mapBias: 'dry', residentTags: ['warrior', 'scout'] },
  { id: 'mist-lake', title: '迷雾湖', hazardType: 'drowning', mapBias: 'wet', residentTags: ['refugee', 'healer'] },
  { id: 'rust-factory', title: '锈蚀工厂', hazardType: 'machinery', mapBias: 'dry', residentTags: ['laborer', 'survivor'] },
  { id: 'bone-desert', title: '白骨沙漠', hazardType: 'heat', mapBias: 'dry', residentTags: ['explorer', 'herder'] },
  { id: 'echo-valley', title: '回音谷', hazardType: 'sound', mapBias: 'wet', residentTags: ['child', 'youth'] },
  { id: 'frozen-ruins', title: '冰封废墟', hazardType: 'cold', mapBias: 'dark', residentTags: ['guardian', 'elder'] },
  { id: 'thorn-marsh', title: '荆棘沼泽', hazardType: 'poison', mapBias: 'wet', residentTags: ['survivor', 'scout'] },
  { id: 'star-plateau', title: '星落高原', hazardType: 'fall', mapBias: 'dry', residentTags: ['explorer', 'warrior'] },
  { id: 'sunken-city', title: '沉没之城', hazardType: 'flood', mapBias: 'wet', residentTags: ['refugee', 'laborer'] },
  { id: 'ember-grove', title: '余烬林', hazardType: 'fire', mapBias: 'dry', residentTags: ['healer', 'child'] },
  { id: 'shadow-rift', title: '暗影裂隙', hazardType: 'void', mapBias: 'dark', residentTags: ['guardian', 'warrior'] },
  { id: 'salt-flats', title: '盐原', hazardType: 'heat', mapBias: 'dry', residentTags: ['herder', 'laborer'] },
  { id: 'weeping-grove', title: '哭泣林', hazardType: 'poison', mapBias: 'wet', residentTags: ['healer', 'elder'] },
  { id: 'iron-mountain', title: '铁山', hazardType: 'cave_in', mapBias: 'dark', residentTags: ['laborer', 'warrior'] },
  { id: 'whisper-dunes', title: '低语沙丘', hazardType: 'sound', mapBias: 'dry', residentTags: ['scout', 'explorer'] },
  { id: 'glass-canyon', title: '玻璃峡谷', hazardType: 'fall', mapBias: 'dry', residentTags: ['youth', 'warrior'] },
  { id: 'moss-dungeon', title: '苔藓地牢', hazardType: 'void', mapBias: 'dark', residentTags: ['survivor', 'guardian'] },
  { id: 'tide-ruins', title: '潮汐遗迹', hazardType: 'flood', mapBias: 'wet', residentTags: ['refugee', 'explorer'] },
  { id: 'smoke-maze', title: '烟雾迷宫', hazardType: 'machinery', mapBias: 'dark', residentTags: ['laborer', 'scout'] }
]

export const WORLD_EVENTS = [
  { type: 'flood_surge', description: '洪水突然上涨，威胁低洼区域', pressureEffects: { safety: -15, stability: -10 }, hookType: 'environmental_crisis' },
  { type: 'wildfire_spread', description: '野火蔓延，烧毁大片森林', pressureEffects: { safety: -20, resources: -15 }, hookType: 'environmental_crisis' },
  { type: 'cave_in', description: '洞穴坍塌，阻断通道', pressureEffects: { safety: -10, mobility: -20 }, hookType: 'infrastructure_damage' },
  { type: 'bandit_raid', description: '匪徒袭击村庄，掠夺资源', pressureEffects: { safety: -25, resources: -20 }, hookType: 'social_conflict' },
  { type: 'disease_outbreak', description: '疾病在居民中蔓延', pressureEffects: { health: -20, stability: -15 }, hookType: 'health_crisis' },
  { type: 'food_shortage', description: '食物储备即将耗尽', pressureEffects: { resources: -30, morale: -20 }, hookType: 'resource_crisis' },
  { type: 'refugee_influx', description: '大量难民涌入，资源紧张', pressureEffects: { resources: -25, stability: -10 }, hookType: 'social_conflict' },
  { type: 'strange_artifact', description: '挖出件来路不明的古物', pressureEffects: { curiosity: 15, stability: -5 }, hookType: 'discovery' },
  { type: 'prophecy_whisper', description: '居民听见不知哪来的预言声', pressureEffects: { morale: 10, stability: -10 }, hookType: 'supernatural' },
  { type: 'trade_caravan', description: '商队抵达，带来稀缺物资', pressureEffects: { resources: 20, stability: 10 }, hookType: 'economic_opportunity' },
  { type: 'earthquake', description: '地震摧毁部分建筑', pressureEffects: { safety: -20, infrastructure: -25 }, hookType: 'environmental_crisis' },
  { type: 'plague_rats', description: '鼠群携带瘟疫入侵', pressureEffects: { health: -15, safety: -10 }, hookType: 'health_crisis' },
  { type: 'meteor_shower', description: '流星雨带来稀有矿物', pressureEffects: { resources: 15, curiosity: 20 }, hookType: 'discovery' },
  { type: 'fog_of_dread', description: '怕人的雾罩住了一片地', pressureEffects: { morale: -25, safety: -15 }, hookType: 'supernatural' },
  { type: 'rebel_uprising', description: '居民反抗压迫者', pressureEffects: { stability: -30, safety: -20 }, hookType: 'social_conflict' },
  { type: 'ancient_gate', description: '老传送门冷不丁给激活了', pressureEffects: { curiosity: 25, safety: -15 }, hookType: 'discovery' },
  { type: 'winter_storm', description: '暴风雪封锁道路', pressureEffects: { mobility: -30, resources: -15 }, hookType: 'environmental_crisis' },
  { type: 'miracle_healing', description: '一股说不清的劲治好了伤员', pressureEffects: { health: 20, morale: 15 }, hookType: 'supernatural' },
  { type: 'corruption_spread', description: '腐化的劲在地里头爬', pressureEffects: { safety: -20, health: -15, stability: -10 }, hookType: 'supernatural' },
  { type: 'festival', description: '居民自发举办庆典', pressureEffects: { morale: 20, stability: 10 }, hookType: 'social_event' },
  { type: 'monster_hunt', description: '巨兽出没，威胁居民', pressureEffects: { safety: -25, resources: -10 }, hookType: 'combat' },
  { type: 'lost_expedition', description: '探险队失踪，留下线索', pressureEffects: { curiosity: 15, morale: -10 }, hookType: 'discovery' }
]

export const ENDING_SEEDS = [
  {
    id: 'golden_age',
    title: '黄金时代',
    conditions: { safety: 90, reputation: 80, resources: 70 },
    narrative: '你守住了这片地。日子稳下来，人也有了盼头。往后逢年过节，有人会念起你。'
  },
  {
    id: 'bitter_victory',
    title: '苦涩的胜利',
    conditions: { safety: 90, reputation: 30 },
    narrative: '世界是救下来了，可人心散了。你一个人守着空荡荡的地方，没人再来搭话。'
  },
  {
    id: 'forgotten_hero',
    title: '被遗忘的英雄',
    conditions: { safety: 40, reputation: 80 },
    narrative: '嘴上都说你好，可地还是在塌。好心挡不住祸，到头是一场空。'
  },
  {
    id: 'doomsday',
    title: '末日降临',
    conditions: { safety: 20, reputation: 20 },
    narrative: '世界就这么乱了套，散了。最后剩几个人在烂摊子里念叨：要是当初……'
  },
  {
    id: 'wandering_sage',
    title: '流浪贤者',
    conditions: { safety: 60, reputation: 60, curiosity: 80 },
    narrative: '你没停下，接着往没去过的地方走。世界算不上好，可地里埋下了能发芽的东西。'
  }
]

export class ContentCodex {
  constructor() {
    this.residents = new Map(RESIDENT_PROTOTYPES.map(r => [r.id, r]))
    this.regions = new Map(REGION_THEMES.map(r => [r.id, r]))
    this.events = new Map(WORLD_EVENTS.map(e => [e.type, e]))
    this.endings = new Map(ENDING_SEEDS.map(e => [e.id, e]))
  }

  getResidentPrototype(id) {
    return this.residents.get(id) || null
  }

  getRegionTheme(id) {
    return this.regions.get(id) || null
  }

  getWorldEvent(type) {
    return this.events.get(type) || null
  }

  getEndingSeed(id) {
    return this.endings.get(id) || null
  }

  pickRandomResident(tag = null) {
    const list = tag
      ? RESIDENT_PROTOTYPES.filter(r => r.tags.includes(tag))
      : RESIDENT_PROTOTYPES
    if (list.length === 0) return null
    return list[Math.floor(Math.random() * list.length)]
  }

  pickRandomRegionTheme(bias = null) {
    const list = bias
      ? REGION_THEMES.filter(r => r.mapBias === bias)
      : REGION_THEMES
    if (list.length === 0) return null
    return list[Math.floor(Math.random() * list.length)]
  }

  checkEndingConditions(pressures = {}) {
    for (const ending of ENDING_SEEDS) {
      const conditions = ending.conditions
      const satisfied = Object.entries(conditions).every(([key, value]) => {
        const actual = pressures[key] || 0
        return actual >= value
      })
      if (satisfied) return ending
    }
    return null
  }

  serialize() {
    return {
      version: 1,
      residents: Array.from(this.residents.keys()),
      regions: Array.from(this.regions.keys()),
      events: Array.from(this.events.keys()),
      endings: Array.from(this.endings.keys())
    }
  }

  deserialize(data = {}) {
    if (data.version !== 1) return
    this.residents = new Map(RESIDENT_PROTOTYPES.map(r => [r.id, r]))
    this.regions = new Map(REGION_THEMES.map(r => [r.id, r]))
    this.events = new Map(WORLD_EVENTS.map(e => [e.type, e]))
    this.endings = new Map(ENDING_SEEDS.map(e => [e.id, e]))
  }
}
