(function () {
  const DEFAULT_TOWERS = ['arrow', 'slow', 'magic', 'cannon', 'matrix', 'electricCore', 'thiefClaw'];
  const TOWER_TYPES = [
    'arrow', 'slow', 'magic', 'cannon', 'matrix', 'electricCore', 'thiefClaw',
    'sun', 'pursuit', 'frostPunish', 'blast', 'boomerang', 'missileSilo', 'tesla',
    'musicStand', 'battery', 'militaryBase', 'gamma', 'gravityBeacon', 'shrineOfMerit',
    'annihilator', 'spotlight', 'heavyWeapons'
  ];
  const BUFF_EFFECT_TYPES = ['starting_money', 'starting_hp', 'tower_damage', 'tower_range', 'tower_discount', 'wave_income'];

  const TOWER_THEME = {
    arrow: { name: '守夜弩塔', description: '由撤离路标改造成的守夜弩，稳定、廉价，适合把第一道裂隙潮压回路口。', color: '#79d0b0', projectileColor: '#d7fff0' },
    cannon: { name: '断层冲锤', description: '以城墙碎片和回声火药铸成的重炮，命中处会震开裂隙残渣。', color: '#9d8f68', projectileColor: '#f2d78b' },
    magic: { name: '言灵术塔', description: '把造物者曾说过的话刻进塔芯，击中敌人时会削弱它们的裂隙护层。', color: '#b79cff', projectileColor: '#eadcff' },
    slow: { name: '霜雾锚', description: '冻结敌人的步伐，也固定居民残留的记忆。适合守住漫长弯道。', color: '#67e8ff', projectileColor: '#d8fbff' },
    blast: { name: '裂响爆破', description: '把不稳定造物封入爆心，爆炸时短暂撕开敌群的推进节奏。', color: '#ff8f5a', projectileColor: '#ffd3bd' },
    gamma: { name: '腐化棱镜', description: '危险但高效的裂隙折射塔，光束会在敌群之间传染式跳跃。', color: '#ff6b7a', projectileColor: '#ffd1d8' },
    sun: { name: '黎明塔', description: '把第七天之前的第一缕光提前封存，持续灼烧最顽固的来袭者。', color: '#f6d36b', projectileColor: '#fff2ae' },
    electricCore: { name: '奇迹中枢', description: '从主考核残留的奇迹点里抽取脉冲，为周围塔群同步节律。', color: '#7dd3fc' },
    tesla: { name: '雷纹桩', description: '在地面钉下雷纹，连锁电光会让裂隙生物短暂停摆。', color: '#5eead4' },
    thiefClaw: { name: '拾荒爪', description: '居民临时拼出的回收装置，从敌人身上夺回可用材料。', color: '#d8c58a' },
    musicStand: { name: '共鸣台', description: '救下的居民轮流敲响铜片，让附近塔的升级更顺滑。', color: '#f0a6ca' },
    militaryBase: { name: '居民哨站', description: '被救下的人们守在撤离线上，定期派出临时防守小队。', color: '#b8c2d6' },
    matrix: { name: '秩序矩阵', description: '把多件造物的副作用束成网，连线越稳，防线越不容易崩散。', color: '#f87171', projectileColor: '#fecaca' },
    battery: { name: '余烬电池', description: '储存白天剩下的奇迹余温，每波开始时为防线补给资源。', color: '#86efac' },
    missileSilo: { name: '星轨井', description: '沿着夜空裂纹发射巡航星火，延迟命中但控制范围极大。', color: '#cbd5e1', projectileColor: '#f8fafc' },
    pursuit: { name: '回声追击', description: '追踪导弹会沿着居民记忆里的路线回响，叠满干扰后反推敌人。', color: '#dbeafe', projectileColor: '#ffffff' },
    heavyWeapons: { name: '终考重台', description: '把终考后剩余的重型材料全数压上防线，昂贵但足够直接。', color: '#f8fafc', projectileColor: '#fde68a' },
    boomerang: { name: '回环刃', description: '刀刃沿撤离路线往复巡弋，适合清理在道路上拖延的敌群。', color: '#a78bfa', projectileColor: '#e9d5ff' },
    frostPunish: { name: '寒誓弩', description: '居民在城墙上立下的寒誓，专门惩戒已经被迟缓的强敌。', color: '#7dd3fc', projectileColor: '#e0f2fe' }
  };

  const MAP_THEME = {
    MAP1: { name: '城墙回廊' },
    MAP2: { name: '撤离小径', modifierText: '居民引路：敌人血量 x0.8，移速 x0.8' },
    MAP3: { name: '记忆螺旋' },
    MAP4: { name: '边境折线', modifierText: '旧路狭窄：敌人血量 x0.75，移速 x0.75' },
    MAP5: { name: '双子防线', modifierText: '双线牵制：敌人血量 x0.7，移速 x0.7' },
    MAP6: { name: '裂隙弧道', modifierText: '地势回响：敌人血量 x0.7，移速 x0.7' }
  };

  const CREATION_TOWER_MAP = {
    absorb_water: ['slow', 'frostPunish'],
    create_bridge: ['arrow', 'boomerang'],
    illuminate: ['sun', 'spotlight'],
    block: ['matrix', 'militaryBase'],
    calm: ['musicStand', 'shrineOfMerit'],
    guide: ['pursuit', 'boomerang'],
    cleanse: ['magic', 'sun'],
    slow_beast: ['frostPunish', 'slow'],
    memory_beacon: ['magic', 'musicStand'],
    force_field: ['electricCore', 'matrix'],
    transform_land: ['cannon', 'battery'],
    freeze_water: ['slow', 'frostPunish'],
    reveal_path: ['pursuit', 'missileSilo'],
    sun_blessing: ['sun', 'spotlight'],
    raise_earth: ['cannon', 'heavyWeapons'],
    grow_forest: ['thiefClaw', 'shrineOfMerit'],
    dig_channel: ['boomerang', 'blast'],
    trap: ['blast', 'gamma'],
    dream_link: ['matrix', 'magic'],
    time_dilation: ['tesla', 'gravityBeacon'],
    haste: ['electricCore', 'tesla'],
    teleport: ['missileSilo', 'annihilator'],
    shield_units: ['matrix', 'electricCore'],
    redirect_hazard: ['gravityBeacon', 'cannon']
  };

  const DAMAGE_KEYS = ['damage', 'minDamage', 'maxDamage', 'missileDamage', 'specialDamage'];
  const RANGE_KEYS = ['range'];
  const UTILITY_KEYS = ['slow', 'stun', 'buff', 'damageBuff', 'rangeBuff', 'upgradeDiscount', 'pushback', 'moneyMultiplier', 'burnPercent', 'bossBurnPercent', 'critChance'];
  const RATE_KEYS = ['fireRate', 'reloadTime', 'spawnRate', 'tankSpawnRate', 'missileFireRate', 'salvoInterval'];

  function clamp(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function color(value, fallback) {
    const text = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
  }

  function normalizeCreationNameValue(name, ability = '') {
    if (ability === 'consume_light') return '噬光黑核';
    return String(name || '').replace(/噬光之灯/g, '噬光黑核');
  }

  function creationName(item) {
    if (typeof item === 'string') return normalizeCreationNameValue(item);
    return normalizeCreationNameValue(item?.name || item?.creationName || item?.card?.name, creationAbility(item));
  }

  function creationAbility(item) {
    return typeof item === 'object' ? item.ability || item.card?.ability || '' : '';
  }

  function creations(context = {}) {
    return Array.isArray(context.recentCreations) ? context.recentCreations : [];
  }

  function residentsCount(context = {}) {
    if (Array.isArray(context.rescuedResidents)) return context.rescuedResidents.length;
    const count = Number(context.rescuedResidents);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  }

  function lostCount(context = {}) {
    if (Array.isArray(context.lostResidents)) return context.lostResidents.length;
    const count = Number(context.lostResidents);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  }

  function contextExperiences(context = {}) {
    return Array.isArray(context.experiences) ? context.experiences.map(String) : [];
  }

  function buildLocalCauses(context = {}, towerPool = []) {
    const causeList = creations(context).slice(-18, -18 + Math.min(5, towerPool.length)).map((creation, index) => ({
      source: `因为你创造过「${creationName(creation) || '未命名造物'}」`,
      result: `所以守夜队准备了「${towerPool[index] || '守夜塔'}」原型`,
      towerType: towerPool[index] || ''
    }));
    if (residentsCount(context) >= 3) {
      causeList.push({
        source: '因为你救下了多名居民',
        result: '所以开局可选择居民补给类加成',
        towerType: ''
      });
    }
    if (lostCount(context) > 0 || contextExperiences(context).some(item => /失踪|遇难|失败|伤痕/.test(item))) {
      causeList.push({
        source: '因为白天留下过失踪或失败记录',
        result: '所以可选择悼念火力类加成',
        towerType: ''
      });
    }
    return causeList.slice(0, 6);
  }

  function buildLocalBuffChoices(context = {}, towerPool = []) {
    const primary = towerPool.slice(0, 3);
    const choices = [
      {
        id: 'resident_supply',
        name: residentsCount(context) >= 3 ? '居民灯火补给' : '守夜预备金',
        description: residentsCount(context) >= 3 ? '开局金币增加，来自被救居民送来的材料。' : '开局金币增加，守夜队动用备用材料。',
        reason: residentsCount(context) >= 3 ? '来自此前救下的居民。' : '来自白天留下的通用物资。',
        effect: { type: 'starting_money', value: residentsCount(context) >= 3 ? 420 : 280, towerTypes: [] }
      },
      {
        id: 'creation_resonance',
        name: '造物回声校准',
        description: '核心守夜塔伤害提高。',
        reason: creations(context)[0] ? `来自「${creationName(creations(context)[0])}」等造物。` : '来自白天造物痕迹。',
        effect: { type: 'tower_damage', value: Number(context.entropy || 0) >= 7 ? 1.15 : 1.1, towerTypes: primary }
      },
      {
        id: 'night_route',
        name: Number(context.entropy || 0) >= 7 ? '裂隙测距' : '城墙测距',
        description: '核心守夜塔射程提高。',
        reason: Number(context.entropy || 0) >= 7 ? '来自高熵裂隙锚点。' : '来自守夜队临时测绘。',
        effect: { type: 'tower_range', value: Number(context.entropy || 0) >= 7 ? 0.75 : 0.5, towerTypes: primary }
      }
    ];
    if (lostCount(context) > 0 || contextExperiences(context).some(item => /失踪|遇难|失败|伤痕/.test(item))) {
      choices[1] = {
        id: 'mourning_fire',
        name: '悼念火力',
        description: '核心守夜塔伤害提高。',
        reason: '来自失踪者与失败区域留下的名字。',
        effect: { type: 'tower_damage', value: 1.16, towerTypes: primary }
      };
    }
    if (creations(context).length >= 8) {
      choices[2] = {
        id: 'workshop_discount',
        name: '工坊余料',
        description: '核心守夜塔费用降低。',
        reason: '来自大量造物拆分后的余料。',
        effect: { type: 'tower_discount', value: 0.9, towerTypes: primary }
      };
    }
    return choices.slice(0, 3);
  }

  function pickTowerTypes(context = {}) {
    const used = new Set();
    const result = [];
    for (const item of creations(context).slice(-18)) {
      const candidates = CREATION_TOWER_MAP[creationAbility(item)] || TOWER_TYPES;
      const type = candidates.find(candidate => !used.has(candidate)) || TOWER_TYPES.find(candidate => !used.has(candidate));
      if (!type) break;
      used.add(type);
      result.push(type);
    }
    for (const type of DEFAULT_TOWERS) {
      if (result.length >= 7) break;
      if (!used.has(type)) {
        used.add(type);
        result.push(type);
      }
    }
    return result.length ? result : DEFAULT_TOWERS;
  }

  function localPlan(context = {}) {
    const towerPool = pickTowerTypes(context);
    const names = creations(context).map(creationName).filter(Boolean);
    const entropy = Number(context.entropy || 0);
    return {
      source: 'local_frontend',
      themeTitle: entropy >= 7 ? '裂隙高潮' : names.some(name => /记忆|梦|碑|灯|光/.test(name)) ? '记忆守夜' : residentsCount(context) >= 4 ? '万人灯火' : '长夜守城',
      briefing: `${(names.slice(0, 4).join('、') || '白天留下的造物')}被搬上城墙，守夜塔会沿用这些造物的名字和数值偏向。`,
      mapId: entropy >= 7 ? 'MAP3' : residentsCount(context) >= 4 ? 'MAP5' : 'MAP2',
      towerPool,
      towers: {},
      causes: buildLocalCauses(context, towerPool),
      buffChoices: buildLocalBuffChoices(context, towerPool)
    };
  }

  function normalizeCause(raw = {}) {
    return {
      source: String(raw.source || '因为白天留下了造物记录').slice(0, 70),
      result: String(raw.result || '所以守夜队得到对应塔材').slice(0, 80),
      towerType: TOWER_TYPES.includes(String(raw.towerType || '')) ? String(raw.towerType) : ''
    };
  }

  function normalizeBuffChoice(raw = {}, fallback = {}, towerPool = []) {
    const rawEffect = raw.effect && typeof raw.effect === 'object' ? raw.effect : {};
    const fallbackEffect = fallback.effect || {};
    const type = BUFF_EFFECT_TYPES.includes(String(rawEffect.type || '')) ? String(rawEffect.type) : fallbackEffect.type || 'starting_money';
    const ranges = {
      starting_money: [100, 600, 280],
      starting_hp: [1, 2, 1],
      tower_damage: [1.04, 1.18, 1.1],
      tower_range: [0.25, 1, 0.5],
      tower_discount: [0.82, 0.96, 0.9],
      wave_income: [60, 220, 100]
    };
    const [min, max, defaultValue] = ranges[type] || [0, 1, 0];
    const rawTypes = Array.isArray(rawEffect.towerTypes) ? rawEffect.towerTypes : fallbackEffect.towerTypes;
    const towerTypes = Array.isArray(rawTypes)
      ? rawTypes.map(String).filter(item => TOWER_TYPES.includes(item) && towerPool.includes(item)).slice(0, 5)
      : [];
    const every = type === 'wave_income' ? clamp(rawEffect.every, 3, 6, fallbackEffect.every || 5) : undefined;
    return {
      id: String(raw.id || fallback.id || type).replace(/[^\w-]/g, '').slice(0, 32) || type,
      name: String(raw.name || fallback.name || '守夜加成').slice(0, 16),
      description: String(raw.description || fallback.description || '为这次守夜提供一次可选加成。').slice(0, 90),
      reason: String(raw.reason || fallback.reason || '来自此前造物与经历。').slice(0, 90),
      effect: {
        type,
        value: clamp(rawEffect.value, min, max, fallbackEffect.value || defaultValue),
        towerTypes,
        ...(every ? { every } : {})
      }
    };
  }

  function normalizePlan(raw, fallback) {
    const plan = raw && typeof raw === 'object' ? raw : {};
    const towerPool = Array.isArray(plan.towerPool)
      ? plan.towerPool.map(String).filter(type => TOWER_TYPES.includes(type))
      : fallback.towerPool;
    const normalizedPool = towerPool.length ? towerPool : fallback.towerPool;
    const rawCauses = Array.isArray(plan.causes) && plan.causes.length ? plan.causes : fallback.causes || [];
    const sourceBuffChoices = Array.isArray(plan.buffChoices) ? plan.buffChoices.slice(0, 3) : [];
    const rawBuffChoices = sourceBuffChoices.length
      ? [...sourceBuffChoices, ...(fallback.buffChoices || []).slice(sourceBuffChoices.length, 3)]
      : fallback.buffChoices || [];
    return {
      source: String(plan.source || fallback.source || ''),
      themeTitle: String(plan.themeTitle || fallback.themeTitle || '长夜守城').slice(0, 18),
      briefing: String(plan.briefing || fallback.briefing || '').slice(0, 180),
      mapId: /^MAP[1-6]$/.test(String(plan.mapId || '')) ? plan.mapId : fallback.mapId,
      towerPool: normalizedPool,
      towers: plan.towers && typeof plan.towers === 'object' ? plan.towers : fallback.towers || {},
      causes: rawCauses.slice(0, 6).map(normalizeCause),
      buffChoices: rawBuffChoices.slice(0, 3).map((item, index) => normalizeBuffChoice(item, (fallback.buffChoices || [])[index] || {}, normalizedPool))
    };
  }

  async function requestTowerPlan(context = {}) {
    const fallback = localPlan(context);
    try {
      const response = await fetch('/api/night-watch-towers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context })
      });
      if (!response.ok) return fallback;
      return normalizePlan(await response.json(), fallback);
    } catch (_error) {
      return fallback;
    }
  }

  function cloneLevels(levels) {
    return Array.isArray(levels) ? levels.map(level => ({ ...level })) : [];
  }

  function resetLevels(data) {
    if (!data || !Array.isArray(data.levels)) return;
    if (!data._nightWatchBaseLevels) data._nightWatchBaseLevels = cloneLevels(data.levels);
    data.levels = cloneLevels(data._nightWatchBaseLevels);
  }

  function scaleKeys(level, keys, multiplier, options = {}) {
    for (const key of keys) {
      if (!Number.isFinite(Number(level[key]))) continue;
      const next = Number(level[key]) * multiplier + (options.add || 0);
      level[key] = options.integer ? Math.max(1, Math.round(next)) : Number(next.toFixed(3));
    }
  }

  function applyStatBias(data, bias = {}) {
    resetLevels(data);
    const damageMultiplier = clamp(bias.damageMultiplier, 0.75, 1.55, 1);
    const rangeBonus = clamp(bias.rangeBonus, -0.5, 1, 0);
    const costMultiplier = clamp(bias.costMultiplier, 0.75, 1.35, 1);
    const fireRateMultiplier = clamp(bias.fireRateMultiplier, 0.75, 1.25, 1);
    const utilityMultiplier = clamp(bias.utilityMultiplier, 0.75, 1.35, 1);

    for (const level of data.levels || []) {
      scaleKeys(level, DAMAGE_KEYS, damageMultiplier);
      scaleKeys(level, RANGE_KEYS, 1, { add: rangeBonus });
      scaleKeys(level, ['cost'], costMultiplier, { integer: true });
      scaleKeys(level, RATE_KEYS, fireRateMultiplier, { integer: true });
      scaleKeys(level, UTILITY_KEYS, utilityMultiplier);
    }
  }

  function applyBuffChoice(towerData = {}, buffChoice = null) {
    const effect = buffChoice?.effect;
    if (!effect || !BUFF_EFFECT_TYPES.includes(effect.type)) return;
    const affected = Array.isArray(effect.towerTypes) && effect.towerTypes.length
      ? effect.towerTypes.filter(type => towerData[type])
      : Object.keys(towerData);
    for (const type of affected) {
      const data = towerData[type];
      if (!data || !Array.isArray(data.levels)) continue;
      for (const level of data.levels) {
        if (effect.type === 'tower_damage') scaleKeys(level, DAMAGE_KEYS, clamp(effect.value, 1.04, 1.18, 1.1));
        if (effect.type === 'tower_range') scaleKeys(level, RANGE_KEYS, 1, { add: clamp(effect.value, 0.25, 1, 0.5) });
        if (effect.type === 'tower_discount') scaleKeys(level, ['cost'], clamp(effect.value, 0.82, 0.96, 0.9), { integer: true });
      }
    }
  }

  function removeNormalLimits(towerData = {}) {
    for (const data of Object.values(towerData)) {
      if (!data || typeof data !== 'object') continue;
      if (data.limit !== undefined && data._nightWatchOriginalLimit === undefined) {
        data._nightWatchOriginalLimit = data.limit;
      }
      delete data.limit;
    }
  }

  function applyStaticTheme(towerData = {}, mapData = {}) {
    for (const data of Object.values(towerData)) resetLevels(data);
    removeNormalLimits(towerData);
    for (const [key, value] of Object.entries(TOWER_THEME)) {
      if (towerData[key]) Object.assign(towerData[key], value);
    }
    for (const [key, value] of Object.entries(MAP_THEME)) {
      if (mapData[key]) Object.assign(mapData[key], value);
    }
  }

  function applyPlan(towerData = {}, mapData = {}, plan = null, buffChoice = null) {
    applyStaticTheme(towerData, mapData);
    const normalized = normalizePlan(plan, localPlan({}));
    for (const [type, patch] of Object.entries(normalized.towers || {})) {
      const data = towerData[type];
      if (!data || !patch) continue;
      data.name = String(patch.name || data.name).slice(0, 14);
      data.description = String(patch.description || data.description).slice(0, 140);
      if (patch.exDescription || data.exDescription) data.exDescription = String(patch.exDescription || data.exDescription).slice(0, 120);
      data.color = color(patch.color, data.color);
      data.projectileColor = color(patch.projectileColor, patch.color || data.projectileColor || data.color);
      data.sourceCreation = String(patch.sourceCreation || '').slice(0, 30);
      applyStatBias(data, patch.statBias || {});
    }
    applyBuffChoice(towerData, buffChoice);
    return normalized;
  }

  function availableTowerTypes(plan, towerData = {}) {
    const normalized = normalizePlan(plan, localPlan({}));
    const pool = normalized.towerPool.filter(type => towerData[type]);
    return pool.length ? pool : Object.keys(towerData);
  }

  function defaultSelection(context = {}, plan = null, towerData = {}) {
    const normalized = normalizePlan(plan, localPlan(context));
    return {
      towerPool: availableTowerTypes(normalized, towerData).slice(0, 7),
      mapId: normalized.mapId
    };
  }

  window.NightWatchTowers = {
    localPlan,
    requestTowerPlan,
    applyPlan,
    applyBuffChoice,
    availableTowerTypes,
    defaultSelection
  };
})();
