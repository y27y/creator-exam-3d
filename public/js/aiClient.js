const ABILITY_SET = new Set([
  'absorb_water',
  'create_bridge',
  'illuminate',
  'block',
  'calm',
  'guide',
  'cleanse',
  'slow_beast',
  'memory_beacon',
  'force_field',
  'transform_land',
  'freeze_water',
  'reveal_path',
  'sun_blessing',
  'raise_earth',
  'grow_forest',
  'dig_channel',
  'trap',
  'dream_link',
  'time_dilation'
]);

const ABILITY_LABELS = {
  absorb_water: '吸水/转移',
  create_bridge: '造路/搭桥',
  illuminate: '照明',
  block: '阻挡',
  calm: '安抚/沟通',
  guide: '引导',
  cleanse: '净化',
  slow_beast: '牵制巨兽',
  memory_beacon: '记忆信标',
  force_field: '保护结界',
  transform_land: '改变地形',
  freeze_water: '冻结水域',
  reveal_path: '显路/加速',
  sun_blessing: '日华祝福',
  raise_earth: '抬升地面',
  grow_forest: '种植森林',
  dig_channel: '挖掘水渠',
  trap: '设置陷阱',
  dream_link: '梦境链接',
  time_dilation: '时间延缓'
};

const TYPE_BY_ABILITY = {
  absorb_water: '生物',
  create_bridge: '地形',
  illuminate: '奇迹',
  block: '地形',
  calm: '仪式',
  guide: '生物',
  cleanse: '机械',
  slow_beast: '法则',
  memory_beacon: '法则',
  force_field: '奇迹',
  transform_land: '法则',
  freeze_water: '法则',
  reveal_path: '奇迹',
  sun_blessing: '仪式',
  raise_earth: '地形',
  grow_forest: '生物',
  dig_channel: '地形',
  trap: '机械',
  dream_link: '仪式',
  time_dilation: '奇迹'
};

const NAME_SEEDS = {
  absorb_water: ['云鲸群', '饮洪菌林', '吞潮莲', '搬雨兽'],
  create_bridge: ['浮石桥律', '舞桥木灵', '月桥', '渡水藤'],
  illuminate: ['月亮树', '晨星灯塔', '萤火圣枝', '日核花'],
  block: ['静默墙', '岩壳屏障', '藤蔓城垣', '眠石阵'],
  calm: ['同梦圆桌', '真言白鸟', '和声花园', '静心水钟'],
  guide: ['归路鹿', '指路风铃', '影行使者', '北星狐'],
  cleanse: ['月光净机', '澄泉祭坛', '白盐塔', '净毒蜂群'],
  slow_beast: ['悲伤花园', '眠兽笛', '迟步月环', '柔水锁链'],
  memory_beacon: ['记忆碑', '家乡歌塔', '名册圣石', '回声灯'],
  force_field: ['护世穹顶', '星砂结界', '无雨环', '守夜罩'],
  transform_land: ['改土律', '生路之种', '软泥硬化术', '开原令'],
  freeze_water: ['冰镜莲', '霜息花', '凝冰蝶', '冻时晶'],
  reveal_path: ['路光苔', '径显萤', '航标灵', '道标花'],
  sun_blessing: ['日华轮', '光暖树', '阳炎蝶', '晨曦钟'],
  raise_earth: ['地隆笋', '土丘芽', '石升藤', '隆地根'],
  grow_forest: ['速生林', '木灵种', '森罗籽', '树界芽'],
  dig_channel: ['引流蚓', '水脉渠', '导洪沟', '分流蚁'],
  trap: ['缚兽藤', '陷地阵', '迟步网', '缠根索'],
  dream_link: ['同梦蛛', '共感茧', '心桥蛾', '识海丝'],
  time_dilation: ['时漏沙', '缓时花', '凝刻钟', '延流晶']
};

const TAGS_BY_ABILITY = {
  absorb_water: ['水', '吸收', '潮湿'],
  create_bridge: ['道路', '通行', '临时'],
  illuminate: ['光', '驱散', '显形'],
  block: ['屏障', '阻挡', '稳定'],
  calm: ['情绪', '沟通', '和平'],
  guide: ['移动', '方向', '护送'],
  cleanse: ['净化', '污染', '恢复'],
  slow_beast: ['巨兽', '迟缓', '非杀伤'],
  memory_beacon: ['记忆', '路标', '归家'],
  force_field: ['保护', '结界', '隔离'],
  transform_land: ['地形', '转化', '塑造'],
  freeze_water: ['冰', '冻结', '临时通行'],
  reveal_path: ['路径', '加速', '显形'],
  sun_blessing: ['光', '恢复', '大范围'],
  raise_earth: ['地形', '高地', '防御'],
  grow_forest: ['植物', '阻挡', '持续'],
  dig_channel: ['水', '引导', '控制'],
  trap: ['控制', '巨兽', '临时'],
  dream_link: ['精神', '连接', '共享'],
  time_dilation: ['时间', '延缓', '紧急']
};

const KEYWORDS = [
  { ability: 'absorb_water', words: ['水', '洪', '雨', '潮', '河', '海', '抽水', '吸水', '鲸', '蘑菇', '云'] },
  { ability: 'create_bridge', words: ['桥', '路', '渡', '浮', '跨', '通道', '木板', '石头', '道路'] },
  { ability: 'illuminate', words: ['光', '灯', '太阳', '月亮', '发光', '黑暗', '夜', '萤火', '星'] },
  { ability: 'block', words: ['墙', '挡', '封', '拦', '城墙', '屏障', '围栏', '堤坝'] },
  { ability: 'calm', words: ['安抚', '和平', '沟通', '翻译', '语言', '真话', '谎言', '梦境', '圆桌', '花园'] },
  { ability: 'guide', words: ['引导', '指路', '带路', '风', '鹿', '鸟', '影子', '护送', '方向'] },
  { ability: 'cleanse', words: ['净化', '毒', '病', '瘟疫', '污染', '治疗', '治愈', '清除'] },
  { ability: 'slow_beast', words: ['巨兽', '催眠', '迟缓', '睡', '锁链', '笛', '牵制'] },
  { ability: 'memory_beacon', words: ['记忆', '家乡', '歌', '名字', '碑', '路标', '圣树', '回忆'] },
  { ability: 'force_field', words: ['结界', '保护', '护盾', '罩', '穹顶', '领域'] },
  { ability: 'transform_land', words: ['地形', '土地', '沼泽', '山', '树', '森林', '变成', '创造', '法则'] },
  { ability: 'freeze_water', words: ['冰', '冻', '冻结', '霜', '雪', '冷', '凝固', '结冰'] },
  { ability: 'reveal_path', words: ['路', '径', '路径', '显示', '显现', '导航', '地图', '加速', '快步'] },
  { ability: 'sun_blessing', words: ['太阳', '日', '光', '温暖', '祝福', '治愈', '恢复', '大范围'] },
  { ability: 'raise_earth', words: ['抬', '升', '高', '地', '土', '丘', '隆', '地面'] },
  { ability: 'grow_forest', words: ['森林', '树', '木', '林', '种', '植物', '生长', '芽'] },
  { ability: 'dig_channel', words: ['渠', '沟', '挖', '引', '流', '导', '水渠', '分流'] },
  { ability: 'trap', words: ['陷阱', '坑', '网', '索', '绊', '捕', '捉', '机关'] },
  { ability: 'dream_link', words: ['梦', '链接', '连接', '共享', '心', '精神', '同梦', '共感'] },
  { ability: 'time_dilation', words: ['时间', '缓', '慢', '延', '钟', '沙漏', '凝', '延缓'] }
];

export function abilityLabel(ability) {
  return ABILITY_LABELS[ability] || ability;
}

export async function compileCreation(text, gameContext = {}) {
  const clean = String(text || '').trim();
  if (!clean) {
    throw new Error('请先输入一个造物想法。');
  }

  try {
    const response = await fetch('/api/compile-creation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: clean,
        levelTitle: gameContext.levelTitle || '',
        levelObjective: gameContext.levelObjective || '',
        context: gameContext
      })
    });

    if (response.ok) {
      const card = await response.json();
      return sanitizeCard(card, clean, 'ai');
    }
  } catch (_error) {
    // Local fallback below.
  }

  return localCompile(clean, gameContext);
}

export function localCompile(text, gameContext = {}) {
  const ability = inferAbility(text, gameContext);
  const strongWords = ['所有', '全', '永远', '无敌', '毁灭', '瞬间', '神龙', '太阳', '海啸', '世界'];
  const isTooStrong = strongWords.some((word) => text.includes(word));
  const needsPlacement = ['flood', 'darkness', 'mixed'].includes(gameContext.hazardType || '');

  // 新能力参数配置
  const rangeMap = {
    force_field: 2, illuminate: 2, calm: 2, sun_blessing: 2,
    grow_forest: 2, dig_channel: 2, trap: 2, dream_link: 2,
    reveal_path: 1, freeze_water: 1, raise_earth: 1,
    time_dilation: 0, slow_beast: 2
  };
  const range = rangeMap[ability] ?? 1;

  const durationMap = {
    create_bridge: 3, freeze_water: 2, trap: 2, time_dilation: 1,
    grow_forest: 4, raise_earth: 3
  };
  const duration = isTooStrong ? 2 : (durationMap[ability] ?? 3);

  const costMap = {
    force_field: 3, sun_blessing: 3, time_dilation: 3,
    memory_beacon: 2, guide: 2, dream_link: 2, trap: 2
  };
  const cost = isTooStrong ? 3 : (costMap[ability] ?? 2);

  const stabilityMap = {
    force_field: 1, time_dilation: 2, sun_blessing: 1,
    transform_land: 1, dig_channel: 1
  };
  const stabilityCost = isTooStrong ? 2 : (stabilityMap[ability] ?? 0);

  const name = chooseName(ability, text, isTooStrong);
  const type = TYPE_BY_ABILITY[ability] || '奇迹';
  const tags = [...(TAGS_BY_ABILITY[ability] || ['奇迹'])];
  if (isTooStrong) tags.push('降格');

  return sanitizeCard({
    name,
    type,
    ability,
    tags,
    range,
    duration,
    cost,
    stabilityCost,
    description: buildDescription(ability, isTooStrong, needsPlacement),
    side_effect: buildSideEffect(ability, isTooStrong),
    source: 'local'
  }, text, 'local');
}

function inferAbility(text, gameContext) {
  let best = { ability: null, score: -1 };
  for (const item of KEYWORDS) {
    const score = item.words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
    if (score > best.score) best = { ability: item.ability, score };
  }

  if (best.score > 0) return best.ability;

  const hazard = gameContext.hazardType;
  if (hazard === 'flood') return 'absorb_water';
  if (hazard === 'darkness') return 'illuminate';
  if (hazard === 'beast') return 'slow_beast';
  if (hazard === 'war') return 'calm';
  if (hazard === 'fog') return 'memory_beacon';
  if (hazard === 'mixed') return 'transform_land';
  return 'transform_land';
}

function chooseName(ability, text, isTooStrong) {
  const seeds = NAME_SEEDS[ability] || NAME_SEEDS.transform_land;
  let index = 0;
  for (const char of text) index = (index + char.charCodeAt(0)) % seeds.length;
  const base = seeds[index];
  return isTooStrong ? `幼年${base}`.slice(0, 8) : base;
}

function buildDescription(ability, isTooStrong, needsPlacement) {
  const prefix = isTooStrong ? '世界无法承受完整形态，只降生出幼年版本。' : '';
  const suffix = needsPlacement ? '点击地图格子放置后生效。' : '放置后持续影响附近单位与地形。';
  const effect = {
    absorb_water: '每回合吸收附近水域或削弱洪水。',
    create_bridge: '把水面、沼泽或裂隙临时变成可通行道路。',
    illuminate: '驱散附近黑暗与迷雾，并帮助单位找到道路。',
    block: '生成阻挡灾害或巨兽的屏障。',
    calm: '降低附近敌意、战争值或巨兽怒气。',
    guide: '引导附近单位朝目标前进。',
    cleanse: '净化附近毒、雾、黑暗或污染。',
    slow_beast: '非杀伤地迟缓巨兽或危险单位。',
    memory_beacon: '让迷路者记起目标，并削弱记忆迷雾。',
    force_field: '保护一片区域，使灾害短时间无法扩散进入。',
    transform_land: '改造附近地形，使危险地块变得可通行。',
    freeze_water: '冻结附近水域，使其可通行2回合，之后融化。',
    reveal_path: '显示附近单位的最优路径，使其移动速度+1。',
    sun_blessing: '大范围光照驱散黑暗，并恢复单位体力使其免疫混乱。',
    raise_earth: '抬升附近地面形成临时高地，可躲避洪水。',
    grow_forest: '种植森林，阻挡灾害扩散并作为天然屏障。',
    dig_channel: '挖掘水渠，引导洪水流向指定方向。',
    trap: '设置陷阱，使进入的巨兽迟缓2回合。',
    dream_link: '连接两个单位，使其共享视野和方向感。',
    time_dilation: '延缓局部时间，增加1回合（消耗大量奇迹点）。'
  }[ability] || '改写附近世界规则。';
  return `${prefix}${effect}${suffix}`.slice(0, 120);
}

function buildSideEffect(ability, isTooStrong) {
  if (isTooStrong) return '强行降格仍会使世界裂隙上升。';
  return {
    absorb_water: '吸收过多水分会留下湿滑地面。',
    create_bridge: '桥梁只会维持数回合。',
    illuminate: '强光会吸引黑暗向边缘聚集。',
    block: '完全堵路可能激怒巨兽或拖慢村民。',
    calm: '和平仪式需要靠近冲突中心。',
    guide: '引导范围有限，离开范围后单位会恢复自主行动。',
    cleanse: '净化会消耗奇迹点。',
    slow_beast: '牵制过久会让巨兽积累怒气。',
    memory_beacon: '信标被雾包围时效果减弱。',
    force_field: '结界会提升世界裂隙。',
    transform_land: '改造地形可能产生沼泽边缘。',
    freeze_water: '冻结的水域融化后会恢复原状。',
    reveal_path: '显示路径会消耗单位体力。',
    sun_blessing: '大范围光照会吸引黑暗注意。',
    raise_earth: '抬升的地面不稳定，可能塌陷。',
    grow_forest: '森林可能阻挡己方单位的移动。',
    dig_channel: '水渠可能改变洪水方向，造成新威胁。',
    trap: '陷阱对村民同样有效。',
    dream_link: '链接断裂时双方都会迷失方向。',
    time_dilation: '操控时间会严重撕裂世界稳定性。'
  }[ability] || '世界裂隙轻微上升。';
}

function sanitizeCard(raw, playerText, source) {
  const ability = ABILITY_SET.has(raw.ability) ? raw.ability : 'transform_land';
  const tags = Array.isArray(raw.tags) ? raw.tags.map(String).filter(Boolean).slice(0, 4) : [];

  // 处理 specialEffect
  let specialEffect = null;
  if (raw.specialEffect && typeof raw.specialEffect === 'object') {
    const se = raw.specialEffect;
    const validTypes = ['mobile', 'movement', 'reactive', 'environmental', 'sacrifice', 'none'];
    const validTriggers = ['onTurnStart', 'onPlacement', 'onExpire', 'onResonance', 'none'];
    if (validTypes.includes(se.type) && validTriggers.includes(se.trigger)) {
      specialEffect = {
        type: se.type,
        description: String(se.description || '').slice(0, 30),
        trigger: se.trigger
      };
    }
  }

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name: String(raw.name || '未命名造物').slice(0, 14),
    type: String(raw.type || TYPE_BY_ABILITY[ability] || '奇迹').slice(0, 10),
    ability,
    tags,
    range: clamp(raw.range, 0, 2, 1),
    duration: clamp(raw.duration, 1, 4, 3),
    cost: clamp(raw.cost, 1, 3, 2),
    stabilityCost: clamp(raw.stabilityCost ?? raw.stability_cost, 0, 2, 1),
    description: String(raw.description || buildDescription(ability, false, true)).slice(0, 120),
    side_effect: String(raw.side_effect || raw.sideEffect || buildSideEffect(ability, false)).slice(0, 80),
    specialEffect,
    playerText,
    source: raw.source || source
  };
}

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}
