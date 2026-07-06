import {
  ABILITY_SET,
  ABILITY_LABELS,
  TYPE_BY_ABILITY,
  NAME_SEEDS,
  TAGS_BY_ABILITY,
  KEYWORDS,
  RULE_DESCRIBED_ABILITIES
} from './abilities.js';

export { ABILITY_SET };

const COMPILE_TIMEOUT_MS = 20000;
const FALLBACK_MESSAGES = {
  timeout: 'AI 编译超时，已使用本地规则兜底。',
  network_error: 'AI 编译连接失败，已使用本地规则兜底。',
  server_error: 'AI 编译服务暂不可用，已使用本地规则兜底。',
  invalid_response: 'AI 编译返回异常，已使用本地规则兜底。',
  no_key: 'AI 编译未配置，已使用本地规则兜底。',
  provider_failed: 'AI 编译失败，已使用本地规则兜底。'
};

export function abilityLabel(ability) {
  return ABILITY_LABELS[ability] || ability;
}

export async function compileCreation(text, gameContext = {}) {
  const clean = String(text || '').trim();
  if (!clean) {
    throw new Error('请先输入一个造物想法。');
  }

  let fallbackReason = 'network_error';
  const timeoutMs = Number.isFinite(gameContext.compileTimeoutMs) ? gameContext.compileTimeoutMs : COMPILE_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('/api/compile-creation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
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
    fallbackReason = 'server_error';
  } catch (error) {
    fallbackReason = error?.name === 'AbortError'
      ? 'timeout'
      : error instanceof SyntaxError ? 'invalid_response' : 'network_error';
  } finally {
    clearTimeout(timeoutId);
  }

  return withFallbackMeta(localCompile(clean, gameContext), fallbackReason);
}

function withFallbackMeta(card, reason) {
  const fallbackReason = FALLBACK_MESSAGES[reason] ? reason : 'provider_failed';
  return {
    ...card,
    fallbackReason,
    fallbackMessage: FALLBACK_MESSAGES[fallbackReason]
  };
}

export function localCompile(text, gameContext = {}) {
  const ability = inferAbility(text, gameContext);
  const strongWords = ['所有', '全', '永远', '无敌', '毁灭', '瞬间', '神龙', '太阳', '海啸', '世界'];
  const isTooStrong = strongWords.some((word) => text.includes(word));
  const needsPlacement = ['flood', 'darkness', 'mixed'].includes(gameContext.hazardType || '');

  // 新能力参数配置
  const rangeMap = {
    force_field: 2, illuminate: 2, gale: 2, calm: 2, sun_blessing: 2,
    grow_forest: 2, trap: 2, dream_link: 2,
    reveal_path: 1, freeze_water: 1, raise_earth: 1,
    time_dilation: 0, haste: 1, teleport: 2, shield_units: 2,
    redirect_hazard: 2, dig_channel: 1, slow_beast: 2, absorb_water: 2, cleanse: 2,
    steam_burst: 2, nature_awakening: 2, rift_sealing: 1, beast_taming: 2, time_weave: 0
  };
  const range = ability === 'haste' ? inferHasteRange(text) : (rangeMap[ability] ?? 1);

  const durationMap = {
    create_bridge: 3, freeze_water: 2, trap: 2, time_dilation: 1,
    grow_forest: 4, raise_earth: 3, force_field: 2, sun_blessing: 2, calm: 1,
    haste: 2, teleport: 2, shield_units: 3, redirect_hazard: 3, dig_channel: 3,
    steam_burst: 3, nature_awakening: 4, rift_sealing: 2, beast_taming: 2, time_weave: 1
  };
  const duration = isTooStrong ? 2 : (durationMap[ability] ?? 3);

  const costMap = {
    guide: 2, reveal_path: 1, block: 1,
    absorb_water: 2, illuminate: 2, gale: 2, cleanse: 2, calm: 2, slow_beast: 2,
    create_bridge: 2, freeze_water: 2, raise_earth: 2, grow_forest: 2,
    dig_channel: 2, trap: 2, dream_link: 2, memory_beacon: 2,
    force_field: 2, sun_blessing: 2, transform_land: 3, time_dilation: 4,
    haste: 2, teleport: 3, shield_units: 2, redirect_hazard: 2,
    steam_burst: 3, nature_awakening: 3, rift_sealing: 3, beast_taming: 2, time_weave: 3
  };
  const cost = isTooStrong ? 3 : (costMap[ability] ?? 2);

  const stabilityMap = {
    guide: 1, reveal_path: 0, block: 0,
    absorb_water: 1, illuminate: 1, gale: 1, cleanse: 1, calm: 1, slow_beast: 1,
    create_bridge: 1, freeze_water: 1, raise_earth: 1, grow_forest: 1,
    dig_channel: 1, trap: 1, dream_link: 1, memory_beacon: 1,
    force_field: 1, sun_blessing: 1, transform_land: 1, time_dilation: 2,
    haste: 1, teleport: 2, shield_units: 1, redirect_hazard: 1,
    steam_burst: 2, nature_awakening: 1, rift_sealing: 2, beast_taming: 1, time_weave: 2
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
  if (wantsDigChannel(text)) return 'dig_channel';
  if (wantsShield(text)) return 'shield_units';
  if (wantsBridge(text)) return 'create_bridge';
  if (wantsCleanse(text)) return 'cleanse';
  if (wantsDreamLink(text)) return 'dream_link';
  if (wantsGale(text)) return 'gale';
  if (wantsHazardRedirect(text)) return 'redirect_hazard';
  if (wantsHaste(text)) return 'haste';

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

function wantsHazardRedirect(text) {
  const clean = String(text || '').toLowerCase();
  const hasRedirectIntent = /改道|转向|风向|吹走|引开|绕开|redirect/.test(clean);
  const hasHazardTarget = /洪|水|灾害|迷雾|雾|污染|毒|黑暗|flood|hazard|poison|dark/.test(clean);
  const isDiggingChannel = /挖|开渠|水渠|沟渠|渠道/.test(clean);
  return hasRedirectIntent && hasHazardTarget && !isDiggingChannel;
}

function wantsDigChannel(text) {
  const clean = String(text || '').toLowerCase();
  return /水渠|沟渠|渠道|开渠|挖沟|导流|排水沟|引洪渠/.test(clean);
}

function wantsBridge(text) {
  return /桥|浮石|木板|渡水|临时通行|水面.*浮|bridge/.test(String(text || '').toLowerCase());
}

function wantsShield(text) {
  return /护盾|庇护|保护伞|护身|罩住|挡灾害|挡危险|shield/.test(String(text || '').toLowerCase());
}

function wantsCleanse(text) {
  return /净化|清除污染|清毒|解毒|瘟疫|污染|poison/.test(String(text || '').toLowerCase());
}

function wantsDreamLink(text) {
  const clean = String(text || '').toLowerCase();
  return /同梦|共感|梦境.*(相遇|连接|链接|共享|同一)|梦.*(相遇|连接|链接|共享)/.test(clean);
}

function wantsGale(text) {
  return /吹散.*雾|雾.*吹散|驱散.*雾|雾.*驱散|清除.*雾|散雾|gale/.test(String(text || '').toLowerCase());
}

function wantsHaste(text) {
  const clean = String(text || '').toLowerCase();
  const hasSpeedIntent = /行动力|移动力|加速|加快|提速|速度|多走|快跑|疾行|冲刺|move|speed/.test(clean);
  if (!hasSpeedIntent) return false;

  const hasPathIntent = /指路|带路|路径|显示|显现|导航|地图|路标|灯塔|发光|照明/.test(clean);
  const negatesPathIntent = negatesPathReveal(clean);
  const explicitActionStat = /行动力|移动力|多走|加一|加二|\+|＋|move|speed/.test(clean);
  return !hasPathIntent || negatesPathIntent || explicitActionStat;
}

function wantsPathReveal(text) {
  const clean = String(text || '').toLowerCase();
  if (negatesPathReveal(clean)) return false;
  return /指路|带路|路径|显示路线|显示道路|显现道路|导航|路标/.test(clean);
}

function negatesPathReveal(text) {
  return /不要\s*指路|不\s*要\s*指路|无需\s*指路|不用\s*指路|不是\s*指路|不要\s*路径|不\s*显示\s*路径/.test(String(text || '').toLowerCase());
}

function inferHasteRange(text) {
  return getExplicitHasteRange(text) ?? 1;
}

function getExplicitHasteRange(text) {
  const clean = String(text || '').toLowerCase();
  if (/(?:\+|＋)?\s*2|two|double|加二|二行动力|两行动力|2行动力|二步/.test(clean)) return 2;
  if (/(?:\+|＋)?\s*1|one|single|加一|一行动力|1行动力|一步/.test(clean)) return 1;
  return null;
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
    illuminate: '驱散附近黑暗，并帮助单位找到道路。',
    gale: '吹散附近迷雾，使被遮蔽的地形重见天日。',
    block: '生成阻挡灾害或巨兽的屏障。',
    calm: '降低附近敌意、战争值或巨兽怒气。',
    guide: '引导附近单位朝目标前进。',
    cleanse: '净化附近沼泽或毒污染。',
    slow_beast: '非杀伤地迟缓巨兽或危险单位。',
    memory_beacon: '让迷路者记起目标并重新定向（在迷雾中无效）。',
    force_field: '保护一片区域，使灾害短时间无法扩散进入。',
    transform_land: '改造附近地形，使危险地块变得可通行。',
    freeze_water: '冻结附近水域，使其可通行2回合，之后融化。',
    reveal_path: '显示附近单位的最优路径，使其移动速度+1。',
    sun_blessing: '大范围光照驱散黑暗，并恢复单位体力使其免疫混乱。',
    raise_earth: '抬升附近地面形成临时高地，可躲避洪水。',
    grow_forest: '种植森林，阻挡灾害扩散并作为天然屏障。',
    dig_channel: '挖出水渠，把附近洪水或污染导走并露出可通行地面。',
    trap: '设置陷阱，使进入的巨兽迟缓2回合。',
    dream_link: '连接两个单位，使其共享视野和方向感。',
    time_dilation: '延缓局部时间，增加2回合（消耗大量奇迹点）。',
    haste: '给附近单位增加行动力，使其一回合最多移动2到3格。',
    teleport: '将附近一名单位传送到其目标点，范围有限且代价很高。',
    shield_units: '给附近单位套上短暂护盾，抵消危险地形伤害。',
    redirect_hazard: '临时改道附近洪水、迷雾或污染，打开安全通路。',
    steam_burst: '蒸汽爆发，制造遮蔽迷雾并让附近单位短暂失去路径感。',
    nature_awakening: '自然觉醒，将附近土地化为森林并增强单位行动力。',
    rift_sealing: '封印裂隙3点，但会消耗范围内记忆信标。',
    beast_taming: '驯服附近巨兽，使其安静且迟缓2回合。',
    time_weave: '编织时间，延长所有活跃造物2回合持续时间。'
  }[ability] || '改写附近世界规则。';
  return `${prefix}${effect}${suffix}`.slice(0, 120);
}

function buildSideEffect(ability, isTooStrong) {
  if (isTooStrong) return '强行降格仍会使世界裂隙上升。';
  return {
    absorb_water: '吸收过多水分会留下湿滑地面。',
    create_bridge: '桥梁只会维持数回合。',
    illuminate: '强光会吸引黑暗向边缘聚集。',
    gale: '大风可能把迷雾吹向周围地块。',
    block: '完全堵路可能激怒巨兽或拖慢村民。',
    calm: '和平仪式需要靠近冲突中心。',
    guide: '引导范围有限，离开范围后单位会恢复自主行动。',
    cleanse: '净化会消耗奇迹点。',
    slow_beast: '牵制过久会让巨兽积累怒气。',
    memory_beacon: '当迷雾侵蚀了信标，它就会失去效果。',
    force_field: '结界会提升世界裂隙。',
    transform_land: '改造地形可能产生沼泽边缘。',
    freeze_water: '冻结的水域融化后会恢复原状。',
    reveal_path: '显示路径会消耗单位体力。',
    sun_blessing: '',
    raise_earth: '抬升的地面不稳定，可能塌陷。',
    grow_forest: '森林可能阻挡己方单位的移动。',
    dig_channel: '水渠会留下新的水路，放错位置可能切断通行。',
    trap: '陷阱对村民同样有效。',
    dream_link: '',
    time_dilation: '操控时间会严重撕裂世界稳定性。',
    haste: '加速效果持续短，离开范围后会消失。',
    teleport: '空间折叠会显著提升世界裂隙。',
    shield_units: '护盾会在抵消伤害后快速衰减。',
    redirect_hazard: '被改道的灾害可能在造物消失后回流。',
    steam_burst: '蒸汽会短暂阻挡视野。',
    nature_awakening: '森林可能阻碍己方通行。',
    rift_sealing: '消耗记忆信标是不可逆的。',
    beast_taming: '驯服效果可能随时间衰退。',
    time_weave: '时间编织会进一步撕裂世界稳定性。'
  }[ability] ?? '世界裂隙轻微上升。';
}

function buildResolvedDescription(ability, range, isTooStrong = false) {
  if (ability === 'haste') {
    const steps = range >= 2 ? 3 : 2;
    return `给附近单位增加行动力，使其本回合最多移动${steps}格。`;
  }
  if (ability === 'teleport') return '将附近一名单位传送到其目标点，范围有限且代价很高。';
  if (ability === 'shield_units') return '给附近单位套上短暂护盾，抵消危险地形伤害。';
  if (ability === 'redirect_hazard') return '临时改道附近最多两格洪水、迷雾或污染，打开安全通路。';
  return buildDescription(ability, isTooStrong, true);
}

function sanitizeCard(raw, playerText, source) {
  const card = raw && typeof raw === 'object' ? raw : {};
  let ability = ABILITY_SET.has(card.ability) ? card.ability : 'transform_land';
  if (wantsDigChannel(playerText)) ability = 'dig_channel';
  else if (wantsShield(playerText)) ability = 'shield_units';
  else if (wantsBridge(playerText)) ability = 'create_bridge';
  else if (wantsCleanse(playerText)) ability = 'cleanse';
  else if (wantsDreamLink(playerText)) ability = 'dream_link';
  else if (wantsGale(playerText)) ability = 'gale';
  else if (wantsHazardRedirect(playerText)) ability = 'redirect_hazard';
  else if (wantsHaste(playerText)) ability = 'haste';
  else if (wantsPathReveal(playerText)) ability = 'reveal_path';
  const tags = Array.isArray(card.tags) ? card.tags.map(String).filter(Boolean).slice(0, 4) : [];
  const sanitizedRange = clamp(card.range, 0, 3, 1);
  const explicitHasteRange = getExplicitHasteRange(playerText);
  const range = ability === 'haste' ? (explicitHasteRange ?? sanitizedRange) : sanitizedRange;
  const description = RULE_DESCRIBED_ABILITIES.has(ability)
    ? buildResolvedDescription(ability, range)
    : String(card.description || buildDescription(ability, false, true)).slice(0, 120);
  const sideEffect = RULE_DESCRIBED_ABILITIES.has(ability)
    ? buildSideEffect(ability, false)
    : String(card.side_effect || card.sideEffect || buildSideEffect(ability, false)).slice(0, 80);

  // 处理 specialEffect
  let specialEffect = null;
  if (card.specialEffect && typeof card.specialEffect === 'object') {
    const se = card.specialEffect;
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

  const sanitized = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name: String(card.name || '未命名造物').slice(0, 14),
    type: String(card.type || TYPE_BY_ABILITY[ability] || '奇迹').slice(0, 10),
    ability,
    tags,
    range,
    duration: clamp(card.duration, 1, 4, 3),
    cost: clamp(card.cost, 1, 3, 2),
    stabilityCost: clamp(card.stabilityCost ?? card.stability_cost, 0, 2, 1),
    description: description.slice(0, 120),
    side_effect: sideEffect.slice(0, 80),
    specialEffect,
    playerText,
    source: card.source || source
  };

  if (card.fallbackReason) sanitized.fallbackReason = String(card.fallbackReason).slice(0, 40);
  if (card.fallbackMessage) sanitized.fallbackMessage = String(card.fallbackMessage).slice(0, 80);

  return sanitized;
}

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}
