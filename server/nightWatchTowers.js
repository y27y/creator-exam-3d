const TOWER_TYPES = [
  'arrow',
  'slow',
  'magic',
  'cannon',
  'matrix',
  'electricCore',
  'thiefClaw',
  'sun',
  'pursuit',
  'frostPunish',
  'blast',
  'boomerang',
  'missileSilo',
  'tesla',
  'musicStand',
  'battery',
  'militaryBase',
  'gamma',
  'gravityBeacon',
  'shrineOfMerit',
  'annihilator',
  'spotlight',
  'heavyWeapons'
];

const ABILITY_TOWER_HINTS = {
  absorb_water: ['slow', 'frostPunish', 'gravityBeacon'],
  freeze_water: ['slow', 'frostPunish', 'cannon'],
  create_bridge: ['arrow', 'boomerang', 'militaryBase'],
  reveal_path: ['pursuit', 'missileSilo', 'arrow'],
  guide: ['pursuit', 'boomerang', 'musicStand'],
  illuminate: ['sun', 'spotlight', 'magic'],
  sun_blessing: ['sun', 'spotlight', 'electricCore'],
  block: ['matrix', 'militaryBase', 'gravityBeacon'],
  force_field: ['electricCore', 'matrix', 'battery'],
  calm: ['musicStand', 'shrineOfMerit', 'magic'],
  cleanse: ['magic', 'sun', 'gamma'],
  slow_beast: ['frostPunish', 'slow', 'tesla'],
  memory_beacon: ['magic', 'musicStand', 'pursuit'],
  transform_land: ['cannon', 'matrix', 'battery'],
  raise_earth: ['cannon', 'militaryBase', 'heavyWeapons'],
  grow_forest: ['thiefClaw', 'boomerang', 'shrineOfMerit'],
  dig_channel: ['boomerang', 'blast', 'slow'],
  trap: ['blast', 'gamma', 'annihilator'],
  dream_link: ['matrix', 'magic', 'musicStand'],
  time_dilation: ['tesla', 'gravityBeacon', 'annihilator'],
  haste: ['electricCore', 'pursuit', 'tesla'],
  teleport: ['missileSilo', 'gravityBeacon', 'annihilator'],
  shield_units: ['matrix', 'electricCore', 'militaryBase'],
  redirect_hazard: ['gravityBeacon', 'cannon', 'blast']
};

const TOWER_FLAVORS = {
  arrow: ['弩塔', '稳定穿刺', '#79d0b0'],
  slow: ['霜锚', '迟缓领域', '#67e8ff'],
  magic: ['言灵塔', '易伤咒印', '#b79cff'],
  cannon: ['断层炮', '溅射冲击', '#9d8f68'],
  matrix: ['矩阵塔', '连线过热', '#f87171'],
  electricCore: ['中枢', '攻速同步', '#7dd3fc'],
  thiefClaw: ['拾荒爪', '回收资源', '#d8c58a'],
  sun: ['日冕塔', '持续灼烧', '#f6d36b'],
  pursuit: ['追迹井', '追踪导弹', '#dbeafe'],
  frostPunish: ['寒誓弩', '惩戒冰封', '#7dd3fc'],
  blast: ['爆破塔', '范围爆裂', '#ff8f5a'],
  boomerang: ['回环刃', '滞留切割', '#a78bfa'],
  missileSilo: ['星轨井', '巡航轰击', '#cbd5e1'],
  tesla: ['雷纹桩', '连锁眩晕', '#5eead4'],
  musicStand: ['共鸣台', '折扣与增幅', '#f0a6ca'],
  battery: ['余烬池', '波次补给', '#86efac'],
  militaryBase: ['居民哨站', '召集守军', '#b8c2d6'],
  gamma: ['裂隙棱镜', '链式传染', '#ff6b7a'],
  gravityBeacon: ['引力标', '推回敌潮', '#60a5fa'],
  shrineOfMerit: ['功勋龛', '击杀赏金', '#facc15'],
  annihilator: ['裁决器', '低血斩杀', '#e5e7eb'],
  spotlight: ['聚光灯', '燃烧暴击', '#fff7bd'],
  heavyWeapons: ['重武台', '复合火力', '#f8fafc']
};

const BUFF_EFFECT_TYPES = ['starting_money', 'starting_hp', 'tower_damage', 'tower_range', 'tower_discount', 'wave_income'];

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampInt(value, min, max, fallback) {
  return Math.round(clampNumber(value, min, max, fallback));
}

function cleanText(value, fallback, max = 90) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return (text || fallback).slice(0, max);
}

function normalizeCreationNameValue(name, ability = '') {
  if (ability === 'consume_light') return '噬光黑核';
  return String(name || '').replace(/噬光之灯/g, '噬光黑核');
}

function cleanHex(value, fallback) {
  const text = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function normalizeCreation(item) {
  if (typeof item === 'string') return { name: normalizeCreationNameValue(item).slice(0, 30), ability: 'unknown', type: '造物' };
  const card = item?.card || item || {};
  const ability = cleanText(card.ability, 'unknown', 32);
  return {
    name: cleanText(normalizeCreationNameValue(card.name || card.creationName || item?.creationName, ability), '未命名造物', 30),
    ability,
    type: cleanText(card.type, '造物', 18),
    description: cleanText(card.description, '', 80),
    tags: Array.isArray(card.tags) ? card.tags.map(tag => cleanText(tag, '', 14)).filter(Boolean).slice(0, 4) : []
  };
}

export function normalizeNightWatchTowerInput(payload = {}) {
  const context = payload.context && typeof payload.context === 'object' ? payload.context : payload;
  const creations = Array.isArray(context.recentCreations) ? context.recentCreations.map(normalizeCreation) : [];
  return {
    contextId: cleanText(context.id, '', 60),
    regionId: cleanText(context.regionId, 'final-exam', 40),
    regionTitle: cleanText(context.regionTitle, '第七关之前', 40),
    entropy: clampInt(context.entropy, 0, 20, 0),
    rescuedResidents: Array.isArray(context.rescuedResidents) ? context.rescuedResidents.map(name => cleanText(name, '', 24)).filter(Boolean).slice(0, 12) : [],
    lostResidents: Array.isArray(context.lostResidents) ? context.lostResidents.map(name => cleanText(name, '', 24)).filter(Boolean).slice(0, 12) : [],
    recentCreations: creations.slice(-18),
    experiences: Array.isArray(context.experiences) ? context.experiences.map(item => cleanText(item, '', 90)).filter(Boolean).slice(-12) : [],
    discoveredLore: Array.isArray(context.discoveredLore) ? context.discoveredLore.map(item => cleanText(item, '', 80)).filter(Boolean).slice(-8) : [],
    playerStyle: cleanText(context.playerStyle, '未知', 120)
  };
}

function pickTowerType(creation, used, index) {
  const candidates = ABILITY_TOWER_HINTS[creation.ability] || [];
  const pool = candidates.length ? candidates : TOWER_TYPES;
  const direct = pool.find(type => !used.has(type));
  if (direct) return direct;
  return TOWER_TYPES.find(type => !used.has(type)) || TOWER_TYPES[index % TOWER_TYPES.length];
}

function themeTitle(input) {
  if (input.entropy >= 7) return '裂隙高潮';
  if (input.recentCreations.some(item => /记忆|梦|碑|灯|光/.test(item.name))) return '记忆守夜';
  if (input.rescuedResidents.length >= 4) return '万人灯火';
  return '长夜守城';
}

function mapId(input) {
  if (input.entropy >= 7) return 'MAP3';
  if (input.rescuedResidents.length >= 4) return 'MAP5';
  return 'MAP2';
}

function fallbackName(creation, towerType, index) {
  const [suffix] = TOWER_FLAVORS[towerType] || ['守夜塔'];
  const root = creation.name.replace(/[，。,.!?！？\s]/g, '').slice(0, 8) || `第${index + 1}造物`;
  return `${root}${suffix}`.slice(0, 14);
}

function statBias(input, creation, index) {
  const creative = Math.min(6, Math.max(0, String(creation.name || '').length + (creation.tags || []).length * 2));
  const entropyPressure = input.entropy >= 7 ? 0.08 : 0;
  const rescueSupport = Math.min(0.12, input.rescuedResidents.length * 0.015);
  return {
    damageMultiplier: Number((1 + entropyPressure + creative * 0.018).toFixed(2)),
    rangeBonus: Number((((index % 3) - 1) * 0.25 + rescueSupport).toFixed(2)),
    costMultiplier: Number((1 + input.entropy * 0.012 - rescueSupport).toFixed(2)),
    fireRateMultiplier: Number((1 - Math.min(0.12, creative * 0.01)).toFixed(2)),
    utilityMultiplier: Number((1 + rescueSupport + (creation.ability === 'calm' ? 0.08 : 0)).toFixed(2))
  };
}

function buildCauses(input, towers) {
  const causes = Object.values(towers).slice(0, 5).map(patch => ({
    source: `因为你创造过「${patch.sourceCreation}」`,
    result: `守夜队把它改造成「${patch.name}」`,
    towerType: patch.type
  }));
  if (input.rescuedResidents.length >= 3) {
    causes.push({
      source: `因为你救下了${input.rescuedResidents.slice(0, 3).join('、')}`,
      result: '居民会在夜里提供守城誓约',
      towerType: ''
    });
  }
  if (input.lostResidents.length || input.experiences.some(item => /失踪|遇难|失败|伤痕/.test(item))) {
    causes.push({
      source: '因为白天留下过失踪、失败或伤痕记录',
      result: '长夜会出现悼念型高压加成',
      towerType: ''
    });
  }
  if (input.discoveredLore.length || input.entropy >= 7) {
    causes.push({
      source: '因为裂隙传说或高熵锚点已经显形',
      result: '防线可以借用裂隙校准',
      towerType: ''
    });
  }
  return causes.slice(0, 6);
}

function buildBuffChoices(input, towerPool) {
  const primary = towerPool.slice(0, 3);
  const choices = [
    {
      id: 'resident_supply',
      name: input.rescuedResidents.length >= 3 ? '居民灯火补给' : '守夜预备金',
      description: input.rescuedResidents.length >= 3
        ? '开局金币增加，来自被救居民连夜送来的材料。'
        : '开局金币增加，守夜队把备用材料先押上城墙。',
      reason: input.rescuedResidents.length >= 3
        ? `来自${input.rescuedResidents.slice(0, 3).join('、')}等被救居民。`
        : '来自白天遗留的通用材料。',
      effect: { type: 'starting_money', value: input.rescuedResidents.length >= 3 ? 420 : 280, towerTypes: [] }
    },
    {
      id: 'creation_resonance',
      name: '造物回声校准',
      description: '本次守夜生成的核心塔伤害小幅提高。',
      reason: input.recentCreations[0]?.name ? `来自「${input.recentCreations[0].name}」等造物。` : '来自白天留下的造物痕迹。',
      effect: { type: 'tower_damage', value: input.entropy >= 7 ? 1.15 : 1.1, towerTypes: primary }
    },
    {
      id: 'night_route',
      name: input.discoveredLore.length || input.entropy >= 7 ? '裂隙测距' : '城墙测距',
      description: '核心塔射程略微提高，方便覆盖夜间弯道。',
      reason: input.discoveredLore.length ? '来自已发现的传说锚点。' : '来自防线临时测绘。',
      effect: { type: 'tower_range', value: input.discoveredLore.length || input.entropy >= 7 ? 0.75 : 0.5, towerTypes: primary }
    }
  ];

  if (input.lostResidents.length || input.experiences.some(item => /失踪|遇难|失败|伤痕/.test(item))) {
    choices[1] = {
      id: 'mourning_fire',
      name: '悼念火力',
      description: '核心塔伤害提高，来自失踪者名字刻进塔芯后的回响。',
      reason: input.lostResidents.length ? `来自${input.lostResidents.slice(0, 2).join('、')}的失踪记录。` : '来自失败区域留下的伤痕。',
      effect: { type: 'tower_damage', value: 1.16, towerTypes: primary }
    };
  }

  if (input.recentCreations.length >= 8) {
    choices[2] = {
      id: 'workshop_discount',
      name: '工坊余料',
      description: '核心塔建造与升级费用降低。',
      reason: '来自大量造物拆分后留下的可复用材料。',
      effect: { type: 'tower_discount', value: 0.9, towerTypes: primary }
    };
  }

  return choices.slice(0, 3);
}

function buildTowerPatch(input, creation, towerType, index) {
  const [suffix, mechanic, color] = TOWER_FLAVORS[towerType] || ['守夜塔', '原型火力', '#d8c58a'];
  const name = fallbackName(creation, towerType, index);
  const residentText = input.rescuedResidents.length
    ? `由${input.rescuedResidents.slice(0, 2).join('、')}协助固定。`
    : '由守夜队临时固定。';
  return {
    type: towerType,
    baseType: towerType,
    sourceCreation: creation.name,
    name,
    description: `白天的「${creation.name}」被改装成${suffix}，保留${creation.ability}的痕迹，战斗职责偏向${mechanic}。${residentText}`.slice(0, 120),
    exDescription: `EX会把「${creation.name}」的核心记忆压入塔芯，强化${mechanic}并放大第七天前的守夜回声。`.slice(0, 100),
    color,
    projectileColor: color,
    statBias: statBias(input, creation, index)
  };
}

export function buildNightWatchTowerFallback(input = {}) {
  const normalized = normalizeNightWatchTowerInput(input);
  const creations = normalized.recentCreations.length
    ? normalized.recentCreations
    : [{ name: '白天留下的造物', ability: 'guide', type: '造物', tags: [] }];
  const used = new Set();
  const towers = {};

  creations.slice(0, TOWER_TYPES.length).forEach((creation, index) => {
    const towerType = pickTowerType(creation, used, index);
    used.add(towerType);
    towers[towerType] = buildTowerPatch(normalized, creation, towerType, index);
  });

  for (const fallbackType of ['arrow', 'slow', 'magic', 'cannon', 'matrix', 'electricCore', 'thiefClaw']) {
    if (used.size >= Math.min(7, TOWER_TYPES.length)) break;
    if (used.has(fallbackType)) continue;
    used.add(fallbackType);
    towers[fallbackType] = buildTowerPatch(normalized, { name: '守夜备用件', ability: 'guide', type: '备用' }, fallbackType, used.size);
  }

  const towerPool = Array.from(used);
  const creationNames = creations.map(item => item.name).slice(0, 4).join('、');
  const causes = buildCauses(normalized, towers);
  const buffChoices = buildBuffChoices(normalized, towerPool);
  return {
    source: 'fallback_no_key',
    themeTitle: themeTitle(normalized),
    briefing: `${normalized.regionTitle}进入六夜守城。${creationNames}被搬上城墙，塔名、射程、造价和火力会随这些造物与居民经历变化。`,
    mapId: mapId(normalized),
    towerPool,
    towers,
    causes,
    buffChoices
  };
}

export function buildNightWatchTowerMessages(input = {}) {
  const normalized = normalizeNightWatchTowerInput(input);
  const fallback = buildNightWatchTowerFallback(normalized);
  return [
    {
      role: 'system',
      content: [
        '你是《造物者考核3D》的长夜守城设计器。根据玩家前六天的造物卡和经历，为第六到第七天之间的塔防生成一组守夜塔。',
        '必须只返回 JSON，不要 markdown，不要解释。',
        '不要发明新的塔 type，只能使用给定 towerPool 中的 type；底层战斗逻辑会复用这些 type，但名字、描述、EX说明和数值偏向必须贴合造物。',
        '普通放置上限已移除；不要输出 limit。EX上限由原塔保留。',
        'JSON schema: {"themeTitle":"短主题","briefing":"80字以内简报","mapId":"MAP2","towerPool":["arrow"],"towers":{"arrow":{"name":"14字以内","description":"120字以内","exDescription":"100字以内","color":"#79d0b0","projectileColor":"#d7fff0","statBias":{"damageMultiplier":1.1,"rangeBonus":0.25,"costMultiplier":0.95,"fireRateMultiplier":0.9,"utilityMultiplier":1.05}}},"causes":[{"source":"因为玩家做过什么","result":"所以得到什么塔或加成","towerType":"arrow"}],"buffChoices":[{"id":"resident_supply","name":"12字内","description":"60字内","reason":"因果理由","effect":{"type":"starting_money","value":300,"towerTypes":["arrow"]}}]}',
        `buffChoices.effect.type 只能是: ${BUFF_EFFECT_TYPES.join(', ')}；只提供三选一，不要超过3个。`,
        'statBias范围：damageMultiplier 0.75-1.55；rangeBonus -0.5 到 1；costMultiplier 0.75-1.35；fireRateMultiplier 0.75-1.25，越低越快；utilityMultiplier 0.75-1.35。',
        `可用 type: ${TOWER_TYPES.join(', ')}。`
      ].join('\n')
    },
    {
      role: 'user',
      content: JSON.stringify({
        context: normalized,
        fallbackShape: fallback
      })
    }
  ];
}

function sanitizeStatBias(raw = {}, fallback = {}) {
  return {
    damageMultiplier: clampNumber(raw.damageMultiplier, 0.75, 1.55, fallback.damageMultiplier || 1),
    rangeBonus: clampNumber(raw.rangeBonus, -0.5, 1, fallback.rangeBonus || 0),
    costMultiplier: clampNumber(raw.costMultiplier, 0.75, 1.35, fallback.costMultiplier || 1),
    fireRateMultiplier: clampNumber(raw.fireRateMultiplier, 0.75, 1.25, fallback.fireRateMultiplier || 1),
    utilityMultiplier: clampNumber(raw.utilityMultiplier, 0.75, 1.35, fallback.utilityMultiplier || 1)
  };
}

function sanitizeCause(raw = {}, fallback = {}) {
  const towerType = TOWER_TYPES.includes(String(raw.towerType || '')) ? String(raw.towerType) : '';
  return {
    source: cleanText(raw.source, fallback.source || '因为白天留下了造物记录', 60),
    result: cleanText(raw.result, fallback.result || '所以守夜队得到对应塔材', 70),
    towerType
  };
}

function sanitizeBuffChoice(raw = {}, fallback = {}, towerPool = []) {
  const fallbackEffect = fallback.effect || {};
  const rawEffect = raw.effect && typeof raw.effect === 'object' ? raw.effect : {};
  const type = BUFF_EFFECT_TYPES.includes(String(rawEffect.type || '')) ? String(rawEffect.type) : fallbackEffect.type || 'starting_money';
  const defaultValue = Number.isFinite(Number(fallbackEffect.value)) ? Number(fallbackEffect.value) : 1;
  const valueRanges = {
    starting_money: [100, 600],
    starting_hp: [1, 2],
    tower_damage: [1.04, 1.18],
    tower_range: [0.25, 1],
    tower_discount: [0.82, 0.96],
    wave_income: [60, 220]
  };
  const [min, max] = valueRanges[type] || [0, 1];
  const rawTowerTypes = Array.isArray(rawEffect.towerTypes) ? rawEffect.towerTypes : fallbackEffect.towerTypes;
  const towerTypes = Array.isArray(rawTowerTypes)
    ? rawTowerTypes.map(item => String(item)).filter(item => TOWER_TYPES.includes(item) && towerPool.includes(item)).slice(0, 5)
    : [];
  const every = type === 'wave_income' ? clampInt(rawEffect.every, 3, 6, fallbackEffect.every || 5) : undefined;
  return {
    id: cleanText(raw.id, fallback.id || type, 32).replace(/[^\w-]/g, '') || type,
    name: cleanText(raw.name, fallback.name || '守夜加成', 16),
    description: cleanText(raw.description, fallback.description || '为这次守夜提供一次可选加成。', 80),
    reason: cleanText(raw.reason, fallback.reason || '来自此前造物与经历。', 80),
    effect: {
      type,
      value: clampNumber(rawEffect.value, min, max, defaultValue),
      towerTypes,
      ...(every ? { every } : {})
    }
  };
}

export function sanitizeNightWatchTowerPlan(raw, input = {}) {
  const fallback = buildNightWatchTowerFallback(input);
  const source = raw && typeof raw === 'object' ? raw : {};
  const towerPool = Array.isArray(source.towerPool)
    ? source.towerPool.map(type => String(type)).filter(type => TOWER_TYPES.includes(type)).slice(0, TOWER_TYPES.length)
    : fallback.towerPool;
  const pool = towerPool.length ? towerPool : fallback.towerPool;
  const rawTowers = source.towers && typeof source.towers === 'object' ? source.towers : {};
  const towers = {};

  for (const type of pool) {
    const rawPatch = rawTowers[type] || {};
    const fallbackPatch = fallback.towers[type] || buildTowerPatch(normalizeNightWatchTowerInput(input), { name: '守夜备用件', ability: 'guide', type: '备用' }, type, pool.indexOf(type));
    towers[type] = {
      type,
      baseType: type,
      sourceCreation: cleanText(rawPatch.sourceCreation, fallbackPatch.sourceCreation || '', 30),
      name: cleanText(rawPatch.name, fallbackPatch.name, 14),
      description: cleanText(rawPatch.description, fallbackPatch.description, 120),
      exDescription: cleanText(rawPatch.exDescription, fallbackPatch.exDescription, 100),
      color: cleanHex(rawPatch.color, fallbackPatch.color),
      projectileColor: cleanHex(rawPatch.projectileColor, rawPatch.color || fallbackPatch.projectileColor || fallbackPatch.color),
      statBias: sanitizeStatBias(rawPatch.statBias || {}, fallbackPatch.statBias)
    };
  }
  const causeInput = Array.isArray(source.causes) && source.causes.length ? source.causes : fallback.causes;
  const rawBuffChoices = Array.isArray(source.buffChoices) ? source.buffChoices.slice(0, 3) : [];
  const buffInput = rawBuffChoices.length
    ? [...rawBuffChoices, ...fallback.buffChoices.slice(rawBuffChoices.length, 3)]
    : fallback.buffChoices;

  return {
    source: cleanText(source.source, fallback.source, 24),
    themeTitle: cleanText(source.themeTitle, fallback.themeTitle, 18),
    briefing: cleanText(source.briefing, fallback.briefing, 160),
    mapId: /^MAP[1-6]$/.test(String(source.mapId || '')) ? source.mapId : fallback.mapId,
    towerPool: pool,
    towers,
    causes: causeInput
      .slice(0, 6)
      .map((item, index) => sanitizeCause(item, fallback.causes[index] || {})),
    buffChoices: buffInput
      .slice(0, 3)
      .map((item, index) => sanitizeBuffChoice(item, fallback.buffChoices[index] || {}, pool))
  };
}
