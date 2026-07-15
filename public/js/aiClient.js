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

const COMPILE_TIMEOUT_MS = 60000;
const FALLBACK_MESSAGES = {
  timeout: '云端编译超时，已改用本地规则。',
  network_error: '云端连接失败，已改用本地规则。',
  server_error: '云端编译暂不可用，已改用本地规则。',
  invalid_response: '云端返回异常，已改用本地规则。',
  no_key: '未配置云端编译，当前使用本地规则。',
  provider_failed: '云端编译失败，已改用本地规则。'
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
    steam_burst: 2, nature_awakening: 2, rift_sealing: 1, beast_taming: 2, time_weave: 0,
    attract: 2
  };
  const range = ability === 'haste' ? inferHasteRange(text) : (rangeMap[ability] ?? 1);

  const durationMap = {
    create_bridge: 3, freeze_water: 2, trap: 2, time_dilation: 1,
    grow_forest: 4, raise_earth: 3, force_field: 2, sun_blessing: 2, calm: 1,
    haste: 2, teleport: 2, shield_units: 3, redirect_hazard: 3, dig_channel: 3,
    steam_burst: 3, nature_awakening: 4, rift_sealing: 2, beast_taming: 2, time_weave: 1,
    attract: 3
  };
  const duration = isTooStrong ? 2 : (durationMap[ability] ?? 3);

  const costMap = {
    guide: 2, reveal_path: 1, block: 1,
    absorb_water: 2, illuminate: 2, gale: 2, cleanse: 2, calm: 2, slow_beast: 2,
    create_bridge: 2, freeze_water: 2, raise_earth: 2, grow_forest: 2,
    dig_channel: 2, trap: 2, dream_link: 2, memory_beacon: 2,
    force_field: 2, sun_blessing: 2, transform_land: 3, time_dilation: 4,
    haste: 2, teleport: 3, shield_units: 2, redirect_hazard: 2,
    steam_burst: 3, nature_awakening: 3, rift_sealing: 3, beast_taming: 2, time_weave: 3,
    attract: 2
  };
  const cost = isTooStrong ? 3 : (costMap[ability] ?? 2);

  const stabilityMap = {
    guide: 1, reveal_path: 0, block: 0,
    absorb_water: 1, illuminate: 1, gale: 1, cleanse: 1, calm: 1, slow_beast: 1,
    create_bridge: 1, freeze_water: 1, raise_earth: 1, grow_forest: 1,
    dig_channel: 1, trap: 1, dream_link: 1, memory_beacon: 1,
    force_field: 1, sun_blessing: 1, transform_land: 1, time_dilation: 2,
    haste: 1, teleport: 2, shield_units: 1, redirect_hazard: 1,
    steam_burst: 2, nature_awakening: 1, rift_sealing: 2, beast_taming: 1, time_weave: 2,
    attract: 1
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
    ...(ability === 'attract' ? { attractTarget: inferAttractTarget(text) } : {}),
    source: 'local'
  }, text, 'local');
}

function inferAbility(text, gameContext) {
  if (wantsAttract(text)) return 'attract';
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

function wantsAttract(text) {
  return /吸引|引力|诱惑|勾引|磁石|磁|吸过来|引过来|拉过来/.test(String(text || '').toLowerCase());
}

function inferAttractTarget(text) {
  const clean = String(text || '').toLowerCase();
  if (/所有|全部|一切/.test(clean)) return 'all';
  if (/村民|平民|居民|信使|使者|npc|人/.test(clean)) return 'human';
  if (/巨兽|兽/.test(clean)) return 'beast';
  return 'beast';
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
  const prefix = isTooStrong ? '这个想法太大，只落下一小截。' : '';
  const suffix = needsPlacement ? '点一个格子放下去才生效。' : '放下后会影响附近的人和地形。';
  const effect = {
    absorb_water: '每回合吸走附近的水，把洪水压下去。',
    create_bridge: '把水面、沼泽或裂隙临时变成能走的路。',
    illuminate: '点亮附近，把黑暗赶开，帮人找着路。',
    gale: '起风，把附近迷雾吹散，露出被盖住的地。',
    block: '起一道屏障，挡住灾或巨兽。',
    calm: '把附近的敌意、战争值或巨兽火气压低。',
    guide: '领着附近的人往目标走。',
    cleanse: '把附近的沼泽或毒洗掉。',
    slow_beast: '不伤命地把巨兽或危险家伙拖慢。',
    memory_beacon: '让迷路的人想起目标，重新认得路（雾里没用）。',
    force_field: '罩住一片地，短时间里挡住灾。',
    transform_land: '改附近的地，把危险格弄成能走的。',
    freeze_water: '把附近的水冻上，能走2回合，过后化开。',
    reveal_path: '给附近的人显出最顺的路，移动+1。',
    sun_blessing: '照亮一大片，赶开黑暗，也让人稳住。',
    raise_earth: '把附近地面顶起来，成临时高地，能躲水。',
    grow_forest: '种一片林子，挡住灾，也当屏障使。',
    dig_channel: '挖渠，把附近的洪水或毒引走，露出能走的地面。',
    trap: '下套，踩进来的巨兽迟缓2回合。',
    dream_link: '把两个人连上，共享视野和方向感。',
    time_dilation: '把这一小片拖慢，多争2回合。',
    haste: '给附近的人提速，一回合最多走2到3格。',
    teleport: '把附近一个人送到目标点，范围有限，代价不低。',
    shield_units: '给附近的人套层短护盾，挡一次危险地形的伤。',
    redirect_hazard: '临时把附近的洪水、雾或毒拨开，腾出一条通路。',
    steam_burst: '蒸汽炸开，遮住视线，附近的人会短时迷路。',
    nature_awakening: '附近长出林子，人借着树根走得更快。',
    rift_sealing: '封住3点裂隙，但会吃掉范围内的记忆信标。',
    beast_taming: '把附近巨兽降住，安静2回合，走也慢。',
    time_weave: '把时间续上一截，场上造物多撑2回合。',
    attract: '在3回合内把范围内的目标吸过来，期间它们会朝这里移动。'
  }[ability] || '改一块附近地。';
  return `${prefix}${effect}${suffix}`.slice(0, 120);
}

function buildSideEffect(ability, isTooStrong) {
  if (isTooStrong) return '已经降格，裂隙还是会涨。';
  return {
    absorb_water: '水吸多了，地上会又湿又滑。',
    create_bridge: '桥撑不了几回合。',
    illuminate: '光太亮，黑暗反而往边上缩。',
    gale: '风一吹，雾可能被赶到旁边地块。',
    block: '路堵死了，巨兽会发火，村民也走不动。',
    calm: '得离冲突中心近，仪式才管用。',
    guide: '管的一圈有限，出了圈人就自己走了。',
    cleanse: '净化费奇迹点。',
    slow_beast: '拖太久，巨兽的火气会攒起来。',
    memory_beacon: '雾一进信标，它就失效了。',
    force_field: '结界会抬高裂隙。',
    transform_land: '改地可能留下沼泽边。',
    freeze_water: '冻上的水化开还是水。',
    reveal_path: '显路费人元气。',
    sun_blessing: '',
    raise_earth: '顶起来的地不稳，可能塌。',
    grow_forest: '林子可能挡住自己人的路。',
    dig_channel: '渠会留新的水路，挖错位置可能把路切断。',
    trap: '套子对村民也管用。',
    dream_link: '',
    time_dilation: '拨弄时间，裂隙会吃重。',
    haste: '加速撑不长，出了圈就没了。',
    teleport: '空间一折，裂隙涨得厉害。',
    shield_units: '护盾挡完一下就快没了。',
    redirect_hazard: '拨开的灾，造物没了可能又流回来。',
    steam_burst: '蒸汽挡一会眼。',
    nature_awakening: '林子可能挡住自己人。',
    rift_sealing: '吃掉的记忆信标要不回来。',
    beast_taming: '降住的效果会随时间散。',
    time_weave: '续时间，裂隙还会往上撕。',
    attract: '强引力会撕裂空间，裂隙上升。'
  }[ability] ?? '裂隙往上动一点。';
}

function buildResolvedDescription(ability, range, isTooStrong = false) {
  if (ability === 'haste') {
    const steps = range >= 2 ? 3 : 2;
    return `给附近的人提速，本回合最多走${steps}格。`;
  }
  if (ability === 'teleport') return '把附近一个人送到目标点，范围有限，代价不低。';
  if (ability === 'shield_units') return '给附近的人套层短护盾，挡一次危险地形的伤。';
  if (ability === 'redirect_hazard') return '临时把附近最多两格洪水、雾或毒改道拨开，腾出通路。';
  if (ability === 'attract') return '在3回合内把范围内的目标吸过来，期间它们会朝这里移动。';
  return buildDescription(ability, isTooStrong, true);
}

function sanitizeCard(raw, playerText, source) {
  const card = raw && typeof raw === 'object' ? raw : {};
  let ability = ABILITY_SET.has(card.ability) ? card.ability : 'transform_land';
  if (wantsAttract(playerText)) ability = 'attract';
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
    ...(ability === 'attract' ? { attractTarget: String(card.attractTarget || inferAttractTarget(playerText)).slice(0, 8) } : {}),
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
