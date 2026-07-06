/**
 * === 能力元数据单一真相源 ===
 * server.js、aiClient.js、validationEngine.js、creatorWorkshop.js 共享此文件。
 * 包含 25 标准能力 + 5 融合能力 = 30 项。
 */

// ======================== abilities list ========================

export const ABILITIES = [
  // --- 24 standard abilities (existing) ---
  'absorb_water',
  'create_bridge',
  'illuminate',
  'gale',
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
  'trap',
  'dream_link',
  'time_dilation',
  'haste',
  'teleport',
  'shield_units',
  'redirect_hazard',
  // --- 1 newly added standard ability ---
  'dig_channel',
  // --- 5 fusion abilities ---
  'steam_burst',
  'nature_awakening',
  'rift_sealing',
  'beast_taming',
  'time_weave'
];

export const ABILITY_SET = new Set(ABILITIES);

// ======================== labels ========================

export const ABILITY_LABELS = {
  absorb_water: '吸水/转移',
  create_bridge: '造路/搭桥',
  illuminate: '照明',
  gale: '大风',
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
  trap: '设置陷阱',
  dream_link: '梦境链接',
  time_dilation: '时间延缓',
  haste: '行动力/加速',
  teleport: '传送',
  shield_units: '护盾/庇护',
  redirect_hazard: '灾害改道',
  dig_channel: '挖渠/排水',
  steam_burst: '蒸汽爆发',
  nature_awakening: '自然觉醒',
  rift_sealing: '封隙禁仪',
  beast_taming: '驯兽',
  time_weave: '织时'
};

// ======================== type mapping ========================

export const TYPE_BY_ABILITY = {
  absorb_water: '生物',
  create_bridge: '地形',
  illuminate: '奇迹',
  gale: '奇迹',
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
  trap: '机械',
  dream_link: '仪式',
  time_dilation: '奇迹',
  haste: '奇迹',
  teleport: '法则',
  shield_units: '奇迹',
  redirect_hazard: '法则',
  dig_channel: '地形',
  steam_burst: '奇迹',
  nature_awakening: '生物',
  rift_sealing: '仪式',
  beast_taming: '法则',
  time_weave: '法则'
};

// ======================== name seeds ========================

export const NAME_SEEDS = {
  absorb_water: ['云鲸群', '饮洪菌林', '吞潮莲', '搬雨兽'],
  create_bridge: ['浮石桥律', '舞桥木灵', '月桥', '渡水藤'],
  illuminate: ['月亮树', '晨星灯塔', '萤火圣枝', '日核花'],
  gale: ['卷雾风灵', '长风笛', '吹雾者', '裂空羽'],
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
  trap: ['缚兽藤', '陷地阵', '迟步网', '缠根索'],
  dream_link: ['同梦蛛', '共感茧', '心桥蛾', '识海丝'],
  time_dilation: ['时漏沙', '缓时花', '凝刻钟', '延流晶'],
  haste: ['疾行铃', '二步风', '迅足符', '赶路鼓'],
  teleport: ['星门', '折路环', '归途门', '瞬径石'],
  shield_units: ['守护伞', '避水罩', '庇护灯', '护身铃'],
  redirect_hazard: ['引灾风标', '分洪罗盘', '转流旗', '改道铃'],
  dig_channel: ['引水渠', '排水沟', '导流槽', '疏洪道'],
  steam_burst: ['蒸汽巨兽', '沸水之灵', '雾炎使者', '热浪花'],
  nature_awakening: ['觉醒之藤', '万物复苏', '大地之息', '回春草'],
  rift_sealing: ['缝隙者', '补天石', '安定符印', '缝合针'],
  beast_taming: ['驯心者', '温柔之链', '宁兽符', '牧歌笛'],
  time_weave: ['织时者', '岁月之梭', '轮回织机', '延缕丝']
};

// ======================== tags ========================

export const TAGS_BY_ABILITY = {
  absorb_water: ['水', '吸收', '潮湿'],
  create_bridge: ['道路', '通行', '临时'],
  illuminate: ['光', '驱散', '显形'],
  gale: ['风', '驱散', '显形'],
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
  trap: ['控制', '巨兽', '临时'],
  dream_link: ['精神', '连接', '共享'],
  time_dilation: ['时间', '延缓', '紧急'],
  haste: ['行动力', '加速', '移动'],
  teleport: ['传送', '空间', '救援'],
  shield_units: ['护盾', '庇护', '防护'],
  redirect_hazard: ['改道', '灾害', '引导'],
  dig_channel: ['水', '渠道', '排水', '引流'],
  steam_burst: ['融合', '蒸汽', '破坏'],
  nature_awakening: ['融合', '自然', '生长'],
  rift_sealing: ['融合', '封印', '牺牲'],
  beast_taming: ['融合', '驯服', '安抚'],
  time_weave: ['融合', '时间', '延长']
};

// ======================== nlp keywords (local fallback compiler) ========================

export const KEYWORDS = [
  { ability: 'absorb_water', words: ['水', '洪', '雨', '潮', '河', '海', '抽水', '吸水', '鲸', '蘑菇', '云'] },
  { ability: 'create_bridge', words: ['桥', '路', '渡', '浮', '跨', '通道', '木板', '石头', '道路'] },
  { ability: 'illuminate', words: ['光', '灯', '太阳', '月亮', '发光', '黑暗', '夜', '萤火', '星'] },
  { ability: 'gale', words: ['风', '大风', '吹', '刮', '气流', '狂风', '暴风', '清风', '岚', '迷雾', '雾'] },
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
  { ability: 'trap', words: ['陷阱', '坑', '网', '索', '绊', '捕', '捉', '机关'] },
  { ability: 'dream_link', words: ['梦', '链接', '连接', '共享', '心', '精神', '同梦', '共感'] },
  { ability: 'time_dilation', words: ['时间', '缓', '慢', '延', '钟', '沙漏', '凝', '延缓'] },
  { ability: 'haste', words: ['行动力', '加一', '加二', '多走', '快跑', '疾行', '冲刺', '移动力', '加速', '加快', '提速', '速度', 'move', 'speed'] },
  { ability: 'teleport', words: ['传送', '星门', '瞬移', '空间门', 'portal', 'teleport'] },
  { ability: 'shield_units', words: ['护盾', '庇护', '保护伞', '雨伞', '罩住', 'shield'] },
  { ability: 'redirect_hazard', words: ['改道', '转向', '引流', '分洪', '风向', '吹走', 'redirect'] },
  { ability: 'dig_channel', words: ['挖', '渠', '沟', '排水', '引流', '导流', '疏洪', '水道', '水槽', '渠道'] },
  { ability: 'steam_burst', words: ['蒸汽', '爆发', '沸腾', '蒸化', 'steam', 'burst'] },
  { ability: 'nature_awakening', words: ['自然觉醒', '万物复苏', '觉醒', '回春', 'nature', 'awakening'] },
  { ability: 'rift_sealing', words: ['封隙', '缝合', '封印', '修补', 'rift', 'sealing'] },
  { ability: 'beast_taming', words: ['驯兽', '驯服', '驯化', '牧歌', 'beast', 'taming'] },
  { ability: 'time_weave', words: ['织时', '编织时间', '时间编织', '延缕', 'time', 'weave'] }
];

// ======================== rule-described abilities (use fixed description) ========================

export const RULE_DESCRIBED_ABILITIES = new Set([
  'reveal_path',
  'haste',
  'teleport',
  'shield_units',
  'redirect_hazard',
  'dig_channel',
  'steam_burst',
  'nature_awakening',
  'rift_sealing',
  'beast_taming',
  'time_weave'
]);

// ======================== fusion table ========================

export const FUSION_TABLE = {
  'illuminate+absorb_water': 'steam_burst',
  'absorb_water+illuminate': 'steam_burst',
  'grow_forest+transform_land': 'nature_awakening',
  'transform_land+grow_forest': 'nature_awakening',
  'force_field+memory_beacon': 'rift_sealing',
  'memory_beacon+force_field': 'rift_sealing',
  'calm+trap': 'beast_taming',
  'trap+calm': 'beast_taming',
  'time_dilation+reveal_path': 'time_weave',
  'reveal_path+time_dilation': 'time_weave'
};

export const FUSED_ABILITIES = new Set(['steam_burst', 'nature_awakening', 'rift_sealing', 'beast_taming', 'time_weave']);

// ======================== helper functions ========================

/**
 * Check if an ability string is a valid known ability.
 * Accepts:
 *   1. Any entry in ABILITY_SET (25 standard + 5 fusion)
 *   2. Strings starting with "fused_" followed by a known ability
 */
export function isKnownAbility(ability) {
  if (ABILITY_SET.has(ability)) return true;
  if (ability && ability.startsWith('fused_')) {
    const base = ability.slice(6);
    return ABILITY_SET.has(base);
  }
  return false;
}

/**
 * Quick label lookup for UI display.
 */
export function abilityLabel(ability) {
  return ABILITY_LABELS[ability] || ability;
}
