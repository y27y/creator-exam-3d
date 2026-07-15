// EdgeOne Pages Node Functions 共享模块
// 整合 server.js 的业务逻辑（AI 网关、fallback、sanitizer、prompt 构建）
// 供 5 个 /api/* 端点复用。下划线前缀文件不会暴露为路由。

import { AIGateway } from '../server/aiGateway.js';
import {
  fallbackRegionEnvelope,
  fallbackResidentDialogueEnvelope,
  fallbackCard
} from '../server/aiFallbacks.js';
import {
  buildNightWatchTowerFallback,
  buildNightWatchTowerMessages,
  normalizeNightWatchTowerInput,
  sanitizeNightWatchTowerPlan
} from '../server/nightWatchTowers.js';
import { sanitizeResidentDialogueEnvelope } from '../public/js/dialogueGrounding.js';
import { ABILITY_SET as ABILITIES, RULE_DESCRIBED_ABILITIES } from '../public/js/abilities.js';

// ========== 环境变量（Node Functions 用 process.env） ==========

export const AI_API_KEY = process.env.AI_API_KEY || '';
export const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
export const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

// ========== 工具函数 ==========

export function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders
    }
  });
}

export async function readRequestBody(request) {
  try {
    return await request.json();
  } catch (_error) {
    return null;
  }
}

// ========== AI 网关实例 ==========

export const aiGateway = new AIGateway({
  budget: { maxCalls: clampNumber(process.env.AI_BUDGET_MAX_CALLS, 0, 1000, 20) },
  retries: clampNumber(process.env.AI_RETRIES, 0, 3, 1),
  timeoutMs: clampNumber(process.env.AI_TIMEOUT_MS, 1000, 120000, 45000),
  provider: async (request) => {
    if (!AI_API_KEY) {
      return { ok: false, json: null, reason: 'missing_key' };
    }
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: request.temperature ?? 0.7,
        messages: request.messages
      }),
      signal: request.signal
    });
    if (!response.ok) return { ok: false, json: null, reason: 'http_error' };
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning_content || '';
    const parsed = extractJson(content);
    return { ok: Boolean(parsed), json: parsed, reason: parsed ? null : 'invalid_json' };
  }
});

// ========== JSON 提取 ==========

function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate);
  } catch (_error) {
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(candidate.slice(first, last + 1));
      } catch (_ignored) {
        return null;
      }
    }
  }
  return null;
}

// ========== 造物编译（compile-creation） ==========

function wantsDigChannel(text) {
  return /水渠|沟渠|渠道|开渠|挖沟|导流|排水沟|引洪渠/.test(String(text || '').toLowerCase());
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
  return /驱散迷雾|驱雾|吹散迷雾|迷雾.*吹散|清除迷雾|散雾|驱散.{0,2}雾|吹散.{0,2}雾|gale/.test(String(text || '').toLowerCase());
}

function getExplicitHasteRange(text) {
  const clean = String(text || '').toLowerCase();
  if (/(?:\+|＋)?\s*2|two|double|加二|二行动力|两行动力|2行动力|二步/.test(clean)) return 2;
  if (/(?:\+|＋)?\s*1|one|single|加一|一行动力|1行动力|一步/.test(clean)) return 1;
  return null;
}

function inferHasteRange(text) {
  return getExplicitHasteRange(text) ?? 1;
}

function buildResolvedDescription(ability, range) {
  if (ability === 'haste') {
    const steps = range >= 2 ? 3 : 2;
    return `给附近的人提速，本回合最多走${steps}格。`;
  }
  if (ability === 'teleport') return '把附近一个人送到目标点，范围有限，代价不低。';
  if (ability === 'shield_units') return '给附近的人套层短护盾，挡一次危险地形的伤。';
  if (ability === 'redirect_hazard') return '临时把附近最多两格洪水、雾或毒拨开，腾出通路。';
  if (ability === 'reveal_path') return '给附近的人显出最顺的路，短时间里走得更快。';
  if (ability === 'steam_burst') return '蒸汽炸开，造一片遮眼雾，让附近的人短时找不着路。';
  if (ability === 'nature_awakening') return '附近长出林子，人借着树根走得更快。';
  if (ability === 'rift_sealing') return '封3点裂隙，吃掉范围内的记忆信标。';
  if (ability === 'beast_taming') return '把附近巨兽降住，安静2回合，走也慢。';
  if (ability === 'time_weave') return '把时间续上一截，场上造物多撑2回合。';
  if (ability === 'dig_channel') return '挖排水渠，吸走附近的水，把洪水引开。';
  return '按玩家描述整理出的可放置效果。';
}

function buildResolvedSideEffect(ability) {
  if (ability === 'haste') return '加速撑不长，出了圈就没了。';
  if (ability === 'teleport') return '空间一折，裂隙涨得厉害。';
  if (ability === 'shield_units') return '护盾挡完一下就快没了。';
  if (ability === 'redirect_hazard') return '拨开的灾，造物没了可能又流回来。';
  if (ability === 'reveal_path') return '显路费人元气。';
  if (ability === 'steam_burst') return '蒸汽挡一会眼。';
  if (ability === 'nature_awakening') return '林子可能挡住自己人。';
  if (ability === 'rift_sealing') return '吃掉的记忆信标要不回来。';
  if (ability === 'beast_taming') return '降住的效果会随时间散。';
  if (ability === 'time_weave') return '续时间，裂隙还会往上撕。';
  if (ability === 'dig_channel') return '渠得常看着，不然可能被水倒灌。';
  return '裂隙往上动一点。';
}

function calculateCreativityScore(playerText) {
  let score = 50;
  const text = String(playerText || '');
  score += Math.min(20, text.length / 2);
  const poeticWords = ['梦', '月', '星', '光', '影', '风', '云', '雾', '雨', '雪', '花', '叶', '根', '魂', '灵', '歌', '诗', '舞', '画', '镜', '纱', '茧', '丝', '网', '链', '轮', '环', '钟', '漏', '晶', '砂', '尘', '烟', '焰', '冰', '霜', '露', '霞', '虹', '泉', '溪', '河', '湖', '海', '潮', '浪', '波', '涡', '礁', '岛', '岸', '滩', '丘', '岭', '峰', '谷', '崖', '洞', '穴', '窟', '林', '森', '木', '树', '枝', '芽', '藤', '蔓', '草', '苔', '菌', '菇', '藻', '莲', '荷', '萍', '苇', '芦', '竹', '笋', '梅', '兰', '菊', '桂', '桃', '杏', '梨', '枣', '栗', '橡', '松', '柏', '杉', '桦', '杨', '柳', '槐', '榆', '桐', '枫', '梧', '樟', '茶', '桑', '麻', '棉', '禾', '麦', '稻', '黍', '稷', '豆', '瓜', '果', '菜', '蔬', '药', '香', '蜜', '蜡', '胶', '漆', '墨', '纸', '布', '绸', '缎', '锦', '绣', '染', '陶', '瓷', '玉', '石', '金', '银', '铜', '铁', '锡', '铅', '汞', '丹', '砂', '矾', '碱', '盐', '糖', '酒', '醋', '油', '茶', '水', '火', '土', '木'];
  const poeticCount = poeticWords.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  score += Math.min(15, poeticCount * 2);
  const uniquePatterns = [
    /像|如同|仿佛|似|好比/,
    /会|能|可以|喜欢|害怕|想要/,
    /让|使|令|把/,
    /透明|发光|隐形|变色|变形|生长|移动|飞行|游泳|爬行|跳跃|奔跑|歌唱|舞蹈|绘画|书写|思考|记忆|遗忘|沉睡|苏醒|呼吸|心跳|生长|枯萎|绽放|凋零/
  ];
  for (const pattern of uniquePatterns) {
    if (pattern.test(text)) score += 5;
  }
  const directAbilityWords = ['照明', '灯', '光', '桥', '路', '墙', '挡', '安抚', '引导', '净化', '迟缓', '记忆', '结界', '保护', '改变地形', '冻结', '显路', '太阳', '抬升', '森林', '水渠', '陷阱', '梦境', '时间'];
  const directCount = directAbilityWords.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  score -= Math.min(20, directCount * 3);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function sanitizeCard(raw, playerText) {
  const card = raw && typeof raw === 'object' ? raw : {};
  let ability = ABILITIES.has(card.ability) ? card.ability : 'transform_land';
  if (playerText && wantsDigChannel(playerText)) {
    ability = 'dig_channel';
  } else if (playerText && wantsShield(playerText)) {
    ability = 'shield_units';
  } else if (playerText && wantsBridge(playerText)) {
    ability = 'create_bridge';
  } else if (playerText && wantsCleanse(playerText)) {
    ability = 'cleanse';
  } else if (playerText && wantsDreamLink(playerText)) {
    ability = 'dream_link';
  } else if (playerText && wantsGale(playerText) && ability !== 'gale') {
    ability = 'gale';
  }
  const name = typeof card.name === 'string' && card.name.trim()
    ? card.name.trim().slice(0, 14)
    : '未命名造物';
  const type = typeof card.type === 'string' && card.type.trim()
    ? card.type.trim().slice(0, 10)
    : '奇迹';
  const description = typeof card.description === 'string' && card.description.trim()
    ? card.description.trim().slice(0, 120)
    : `从"${String(playerText || '').slice(0, 24)}"整理出的临时造物。`;
  const sideEffect = typeof card.side_effect === 'string' && card.side_effect.trim()
    ? card.side_effect.trim().slice(0, 80)
    : '世界裂隙轻微上升。';
  const tags = Array.isArray(card.tags)
    ? card.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 4)
    : [];

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

  let range = card.range ?? 1;
  let duration = card.duration ?? 3;
  let cost = card.cost ?? 2;

  const score = calculateCreativityScore(playerText);
  if (score >= 60) {
    cost = Math.max(1, cost - 1);
    range = Math.min(3, range + 1);
    if (score >= 75) {
      duration = Math.min(4, duration + 1);
    }
  }
  if (score <= 35) {
    cost = Math.min(3, cost + 1);
  }

  const explicitHasteRange = ability === 'haste' ? getExplicitHasteRange(playerText) : null;
  if (explicitHasteRange !== null) range = explicitHasteRange;
  const resolvedDescription = RULE_DESCRIBED_ABILITIES.has(ability)
    ? buildResolvedDescription(ability, range)
    : description;
  const resolvedSideEffect = RULE_DESCRIBED_ABILITIES.has(ability)
    ? buildResolvedSideEffect(ability)
    : sideEffect;

  return {
    name,
    type,
    ability,
    tags,
    range: clampNumber(range, 0, 3, 1),
    duration: clampNumber(duration, 1, 4, 3),
    cost: clampNumber(cost, 1, 3, 2),
    stabilityCost: clampNumber(card.stabilityCost ?? card.stability_cost, 0, 2, 1),
    description: resolvedDescription,
    side_effect: resolvedSideEffect,
    specialEffect,
    source: 'ai',
    _creativityScore: score
  };
}

const COMPILE_FALLBACK_MESSAGES = {
  no_key: '未配置云端编译，当前使用本地规则。',
  timeout: '云端编译超时，已改用本地规则。',
  budget: '云端调用预算已用尽，已改用本地规则。',
  invalid_response: '云端返回异常，已改用本地规则。',
  provider_failed: '云端编译暂不可用，已改用本地规则。'
};

function normalizeCompileFallbackReason(reason) {
  if (reason === 'missing_key') return 'no_key';
  if (reason === 'invalid_json') return 'invalid_response';
  if (reason === 'timeout' || reason === 'budget' || reason === 'no_key') return reason;
  return 'provider_failed';
}

export function buildFallbackCreation(text, fallbackReason = 'no_key') {
  const clean = String(text || '').trim();
  const reason = normalizeCompileFallbackReason(fallbackReason);
  const ability = /teleport|portal|传送|星门|瞬移|空间门/.test(clean) ? 'teleport'
    : /行动力|加一|加二|多走|快跑|疾行|冲刺|移动力|speed|move|action/.test(clean) ? 'haste'
    : wantsShield(clean) || /shield|护盾|庇护|保护伞|雨伞|罩住/.test(clean) ? 'shield_units'
    : wantsDigChannel(clean) ? 'dig_channel'
    : wantsBridge(clean) ? 'create_bridge'
    : wantsCleanse(clean) ? 'cleanse'
    : wantsDreamLink(clean) ? 'dream_link'
    : wantsGale(clean) ? 'gale'
    : /redirect|改道|转向|引流|分洪|风向|吹走/.test(clean) ? 'redirect_hazard'
    : /挖|渠|沟|排水|导流|疏洪|水道|水槽|渠道/.test(clean) ? 'dig_channel'
    : /water|flood|river|雨|水|洪/.test(clean) ? 'absorb_water'
    : /light|lamp|sun|光|灯|照/.test(clean) ? 'illuminate'
    : /gale|大风|吹散|驱散迷雾|迷雾|清风|狂风|暴风|岚/.test(clean) ? 'gale'
    : /bridge|road|path|桥|路/.test(clean) ? 'create_bridge'
    : /calm|peace|talk|安抚|沟通/.test(clean) ? 'calm'
    : 'guide';
  const strong = ability === 'teleport';
  const range = ability === 'haste' ? inferHasteRange(clean) : (['illuminate', 'gale', 'shield_units', 'redirect_hazard', 'teleport'].includes(ability) ? 2 : 1);
  return {
    name: clean.slice(0, 12) || '临时造物',
    type: '奇迹',
    ability,
    tags: ['本地', ability],
    range,
    duration: ['haste', 'teleport'].includes(ability) ? 2 : 3,
    cost: strong ? 3 : 2,
    stabilityCost: strong ? 2 : ability === 'haste' ? 1 : 0,
    description: RULE_DESCRIBED_ABILITIES.has(ability) ? buildResolvedDescription(ability, range) : `按「${clean}」整理成可放置造物。`,
    side_effect: RULE_DESCRIBED_ABILITIES.has(ability) ? buildResolvedSideEffect(ability) : '本地规则兜底，效果偏保守。',
    source: 'fallback',
    fallback: true,
    fallbackReason: reason,
    fallbackMessage: COMPILE_FALLBACK_MESSAGES[reason]
  };
}

// ========== 造物编译 prompt ==========

export function buildCompileCreationSystemPrompt() {
  return `你是3D游戏《裂隙考核：造物者》的造物编译器。玩家会用自然语言创造一个物件、生物或世界法则。你要把它翻译成受规则约束的游戏卡牌，并尽量保留原句里具体的物件、动作和限制。

【绝对规则】
1. 只输出JSON对象，不要Markdown，不要解释，不要注释。
2. JSON必须包含完整的specialEffect字段，缺少此字段视为错误输出。
3. 数值必须保守，禁止一键胜利。

【ability枚举】（必须从中选择一项）
- absorb_water：吸收/转移水、洪水、雨云
- create_bridge：生成桥梁、道路、临时通行路径
- illuminate：照明、驱散黑暗、显露道路
- gale：大风、驱散/吹散迷雾（不驱散黑暗），将迷雾地形永久变为陆地
- block：墙、屏障、封路、阻挡灾害或巨兽
- calm：安抚、沟通、翻译、降低敌意/战争值
- guide：领着人走、指路、召回、护送
- cleanse：洗毒、去污染、治病、解咒
- slow_beast：拖慢、催眠、牵制巨兽/敌人
- memory_beacon：记忆、路标、歌声、碑文、归家信标
- force_field：护一片地、结界、隔开灾
- transform_land：改地形、弄出能走能用的地块
- freeze_water：把水冻上能走，但会化
- reveal_path：显最顺的路、让人走得快
- sun_blessing：大范围照亮+回人元气
- raise_earth：顶起地面成临时高地
- grow_forest：种林子挡灾
- trap：下套拖慢巨兽
- dream_link：把两人连上共享视野
- time_dilation：拖慢时间多2回合（费劲）
- haste：给人提速；加一用range=1，加二用range=2，每回合可多走
- teleport：有限范围传送一名相邻/附近单位到目标点，高cost和高stabilityCost
- shield_units：给附近人短暂护盾，挡一次危险地形伤害
- redirect_hazard：临时把洪水、雾、毒等灾害拨开，腾出通路
- dig_channel：挖渠引洪水，把水域/沼泽弄成能走的平地

【融合能力】（由造物者工坊融合产生，玩家不能直接选择）
- steam_burst：蒸汽炸开，造一片遮眼雾，让附近的人短时找不着路
- nature_awakening：附近的地醒过来，长成林子，人也走得快了
- rift_sealing：封3点裂隙，吃掉范围内的记忆信标
- beast_taming：把附近巨兽降住，安静迟缓
- time_weave：把时间续上，所有活跃造物多撑2回合

【JSON Schema】
{
  "name": "2到7个中文字的卡名",
  "type": "生物/地形/机械/法则/仪式/奇迹之一",
  "ability": "上方枚举之一",
  "tags": ["最多4个短标签"],
  "range": 0到3的整数,
  "duration": 1到4的整数,
  "cost": 1到3的整数,
  "stabilityCost": 0到2的整数,
  "description": "不超过60字，说明实际游戏效果",
  "side_effect": "不超过40字，说明副作用或限制",
  "specialEffect": {
    "type": "必须是 mobile 或 movement 或 reactive 或 environmental 或 sacrifice 或 none 这六个字符串之一",
    "description": "不超过30字，说明这个造物与标准版本有何不同",
    "trigger": "必须是 onTurnStart 或 onPlacement 或 onExpire 或 onResonance 或 none 这五个字符串之一"
  }
}

【specialEffect type 说明】
- mobile/movement：造物每回合自动向特定地形移动，如"向水域移动"、"向黑暗移动"。
- reactive：当特定事件发生时触发额外效果，如"当洪水扩散时吸收它"。
- environmental：改变周围环境的行为，如"在水域中范围+1"。
- sacrifice：获得额外效果但付出代价，如"每回合消耗1奇迹点"。
- none：标准造物，没有特殊机制。

【设计原则】
1. 保留玩家创意里的具体画面，但能力必须落在枚举中。
2. 越强的造物 cost 和 stabilityCost 越高。
3. 不允许全图清除、不允许直接过关、不允许永久无敌。
4. 当前关卡目标优先，输出要能帮助玩家解决关卡但仍需要玩家放置和结算。
5. 相同ability可以有完全不同的玩法：例如"发光水母"和"月光灯塔"都是illuminate，但水母应该mobile（向水域移动），灯塔应该environmental（在高点范围+1）。
6. 文案不要写"前所未有""命运""伟大""希望之光""震撼体验""创世奇迹"等模板词。
7. description 和 side_effect 写短句，先说棋盘效果，再说限制。
8. 如果玩家描述非常标准，没有独特之处，specialEffect的type填"none"，description填"无特殊效果"，trigger填"none"。`;
}

// ========== 叙事 prompt ==========

function formatPromptValue(value, fallback = '无') {
  if (value === undefined || value === null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.map((item) => formatPromptValue(item, '')).filter(Boolean).join('；') : fallback;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return fallback;
    }
  }
  return String(value);
}

function containsCjk(text) {
  return /[\u3400-\u9fff]/.test(String(text || ''));
}

function fallbackNarrativeText(narrativeType, input, ctx = {}) {
  const clean = String(input || '').trim();
  if (clean && containsCjk(clean)) return `本地叙事：${clean}`;
  if (narrativeType === 'airspace_brief') {
    return '本地叙事：长夜过后，白天留下的造物被压进空域载体。第七天不等神谕，只结算你做过的事。';
  }
  if (containsCjk(ctx.unitName)) {
    return `本地叙事：${ctx.unitName}还在名单上。这次选择会留下回声。`;
  }
  return '本地叙事：没有远方回复，棋盘也会把后果记下来。';
}

export function buildNarrativePrompt(type, context, worldState) {
  const basePrompt = `你是《裂隙考核：造物者》的叙事调度器。你只写玩家当前能看到、能验证的场面和对话。

【绝对规则】
1. 只输出纯文本叙事内容，不要JSON，不要Markdown格式，不要解释。
2. 叙事风格：短句、具体、有现场感；少用抽象总结。
3. 每次输出控制在60-140字之间。
4. 必须根据提供的世界状态和上下文生成内容，不能脱离上下文。
5. 不要写"命运""奇迹""希望重新点燃""世界见证""前所未有""史诗""灵魂"等套话，除非输入事实里已有。
6. 不要写广告腔、总结句或排比句；多写具体动作、格子、路线、伤口、沉默。

【世界背景】
这里叫裂隙之地。地形、灾害和居民状态都写在棋盘上。玩家能造物，但每次造物都会让裂隙更深。

【当前世界状态】
- 当前关卡：${worldState.currentLevel || '未知'}
- 已拯救的生命：${worldState.rescued || 0}
- 已失去的生命：${worldState.lost || 0}
- 裂隙：${worldState.entropy || 0}/${worldState.entropyLimit || 7}
- 已创造的造物：${(worldState.creations || []).join('、') || '无'}
- 已发现的故事片段：${(worldState.discoveredLore || []).join('、') || '无'}
- 玩家的行为倾向：${worldState.playStyle || '未知'}
`;

  const typePrompts = {
    dialogue: `
【任务：生成角色对话】
你正在扮演棋盘上的一个人或存在。不要提自己是 AI、系统、模型或旁白。

角色信息：
- 名称：${context.characterName || '神秘存在'}
- 类型：${context.characterType || '中立'}
- 当前情绪：${context.mood || '平静'}
- 对玩家的态度：${context.attitude || '好奇'}
- 性格基底：${context.personality || '谨慎、贴近当前处境'}
- 说话方式：${context.dialogueStyle || '先回应玩家问题，再用简短自然的话补充处境'}
- 记忆：${(context.memories || []).join('；') || '暂无'}
- 玩家刚刚说：${context.playerInput || context.playerText || '未提供'}
- 对话意图：${context.dialogueAction || '自由对话'}
- 当前关卡：${context.levelTitle || worldState.currentLevel || '未知'}
- 关卡目标：${context.levelObjective || '未知'}
- 当前单位：${context.unitName || context.characterName || '未知'}（${context.unitType || context.characterType || '未知类型'}）
- 当前位置：${formatPromptValue(context.currentTerrain, '未知')}
- 当前需求：${context.currentNeed || '未知'}
- 下一步建议：${formatPromptValue(context.nextStep, '未知')}
- 周边单位：${formatPromptValue(context.nearbyUnits, '无')}
- 周边造物：${formatPromptValue(context.nearbyCreations, '无')}
- 已知世界事实：${formatPromptValue(context.knownWorldFacts, '无')}

对话规则：
1. 角色要像正在现场说话的人：句子短，有具体需求，不写宣言。
2. 角色会记住之前与玩家的对话，并据此调整态度。
3. 如果玩家帮助过角色或与其目标一致，态度会更友好。
4. 如果玩家的行为造成了伤害，角色会表现出悲伤或愤怒。
5. 对话中可以透露一点背景，但必须从当前关卡、当前位置或记忆里长出来。
6. 必须先直接回应"玩家刚刚说"的内容；如果玩家询问需求、路线、记忆或正在安抚，请先给出具体回应，再保留角色口吻。
7. 不要输出与当前单位、当前位置、关卡目标无关的泛泛环境独白。
8. 只引用上方提供的当前位置、关卡目标、周边单位、周边造物、已知世界事实和记忆；不知道就说不确定。
9. 不得新增未提供的人名、地名、道具、任务、王国、宫殿、亲属关系或已经通关等事实。
10. 不要写"在这个充满危机的世界中""你将""我们必须守护希望"这类模板句。

请直接输出角色的对话内容（不要加角色名前缀，不要加引号）。`,

    environment: `
【任务：生成环境描述】
你正在描述一个游戏场景的环境。

场景信息：
- 地点：${context.location || '未知地点'}
- 地形：${context.terrain || '平地'}
- 当前天气/氛围：${context.atmosphere || '平静'}
- 存在的造物：${(context.creations || []).join('、') || '无'}
- 活跃的单位：${(context.units || []).join('、') || '无'}

描述规则：
1. 用一两个感官细节让场景站得住。
2. 如果场景中有玩家的造物，描述它们如何改变了环境。
3. 如果裂隙较高，描述具体异常（格子裂纹、灯抖、雾倒流等）。
4. 描述中暗示可能的危险或机会，但不要直接说明。

请直接输出环境描述。`,

    event: `
【任务：生成事件叙事】
一个游戏事件刚刚发生，你需要将其转化为叙事文本。

事件信息：
- 事件类型：${context.eventType || '未知'}
- 涉及角色：${(context.characters || []).join('、') || '无'}
- 地点：${context.location || '未知'}
- 结果：${context.result || '未知'}
- 关键事实：${formatPromptValue(context.keyFacts, '无')}
- 风格约束：${formatPromptValue(context.styleGuide, '无')}

叙事规则：
1. 从受影响最深的角色的视角描述事件。
2. 先写发生了什么，再写角色的反应。
3. 如果事件是悲剧性的，直接写损失，不煽情。
4. 如果事件是胜利的，写具体变化：谁活下来了，哪条路通了，哪片灾害退了。
5. 伏笔只写当前事实能推出的后果。
6. 如果提供了风格约束，必须优先遵守，不要为了诗意牺牲可读性。

请直接输出事件叙事。`,

    tactical_director: `
【任务：生成AI考核者的战术预言】
你不是旁白，也不是系统菜单。你是正在考核玩家的AI战术导演，必须围绕下一回合可验证的棋盘意图说话。

当前战术事实：
- 回合：${context.turn || 1}
- AI干涉预算：${context.budget ? `${context.budget.remaining}/${context.budget.limit} 可用` : '未知'}
- 主要意图：${context.primaryIntent ? `${context.primaryIntent.unitName} / ${context.primaryIntent.intent} / ${context.primaryIntent.threat} / ${context.primaryIntent.predictedAction}` : '暂无'}
- 可用战术：${formatPromptValue((context.options || []).map(o => `${o.mechanism}:${o.label};收益=${o.impact};代价=${JSON.stringify(o.cost || {})};风险=${o.risk}`).join(' | '), '无')}
- 最近使用：${formatPromptValue((context.recentActions || []).map(a => `${a.mechanism}:${a.summary}`).join('；'), '无')}

规则：
1. 只输出 1-2 句中文，总字数 80 字以内。
2. 必须点名一个当前可用战术及其代价或风险。
3. 不许编造未提供的单位、地点、任务或隐藏规则。
4. 语气像有性格的考核者：冷静、有压迫感、会诱惑玩家冒险，但不卖弄诗意。
5. 建议必须能被棋盘验证，不要说"命运""神谕"这类无法操作的话。

请直接输出战术预言。`,

    lore: `
【任务：生成造物起源故事】
玩家刚刚创造了一个造物，你需要为它编写一个起源故事。

造物信息：
- 名称：${context.creationName || '未命名'}
- 类型：${context.creationType || '奇迹'}
- 能力：${context.ability || '未知'}
- 特殊效果：${context.specialEffect || '无'}
- 玩家的原始描述：${context.playerText || '无'}

故事规则：
1. 故事必须抓住玩家原始描述里的具体物件和动作。
2. 解释这个造物为什么存在，它从哪里被捡起、拼好或唤醒。
3. 可以暗示这个造物与裂隙的关系。
4. 不写寓言总结，不拔高主题。
5. 控制在60-120字。

请直接输出起源故事。`
  };

  return basePrompt + (typePrompts[type] || typePrompts.dialogue);
}

export { fallbackNarrativeText };

// ========== 区域生成 prompt ==========

export function buildRegionPrompt(state, difficulty, regionCount) {
  const playStyle = state.playStyle || '未知';
  const entropy = state.entropy || 0;
  const rescued = state.rescued || 0;
  const lost = state.lost || 0;
  const creations = (state.creations || []).slice(-5);
  const previousRegions = (state.previousRegions || []).slice(-3);
  const relationships = state.relationships || {};
  const discoveredLore = (state.discoveredLore || []).slice(-3);

  let themeHint = '';
  if (playStyle === 'creative') themeHint = '出现一个具体、怪异但可操作的地形问题';
  else if (playStyle === 'strategic') themeHint = '需要规划路线、落点和回合顺序';
  else if (playStyle === 'aggressive') themeHint = '压力来得快，但要给玩家可验证的反制点';
  else if (playStyle === 'careful') themeHint = '危险推进较慢，但错误落点会扩大损失';
  else themeHint = '有清楚威胁，也有一两个能利用的机会';

  let atmosphereHint = '';
  if (entropy > 6) atmosphereHint = '裂隙很高，地块边缘有裂纹，规则会偶尔失真';
  else if (entropy > 4) atmosphereHint = '压抑，路标、灯和水线会出现小异常';
  else if (entropy > 2) atmosphereHint = '有紧张感，但问题仍能从棋盘上读出来';
  else atmosphereHint = '相对平静，危险藏在地形布置里';

  return `你是《裂隙考核：造物者》的区域生成器。你根据玩家历史生成下一个7x7棋盘区域，重点是可玩的危机，不是宏大旁白。

【绝对规则】
1. 只输出JSON对象，不要Markdown，不要解释，不要注释。
2. JSON必须包含完整的区域定义，包括地图、单位、危机、目标。
3. 地图必须是7x7的字符串数组，每个字符代表一种地形。
4. 区域必须与玩家的历史行为有逻辑连接。
5. story 和 objective 必须短、具体，避免"命运、史诗、希望之光、前所未有、世界见证"等模板词。

【地形符号】
. = 平地
~ = 水域
H = 高地
V = 村庄/居民点
E = 出口
C = 城市
B = 边境
F = 森林
M = 山体
D = 黑暗
G = 迷雾
S = 圣树
W = 沼泽
P = 污染

【单位类型】
villager = 村民（需要救援）
miner = 矿工（需要救援）
beast = 巨兽（需要安抚或牵制）
tribeA = 部落A使者
tribeB = 部落B使者

【危机类型】
flood = 洪水扩散
darkness = 黑暗扩散
beast = 巨兽移动
war = 战争升级
fog = 迷雾扩散
mixed = 多种危机混合

【JSON Schema】
{
  "id": "唯一标识符",
  "title": "区域名称（2-6个中文字）",
  "story": "区域背景故事（50-100字），必须与玩家历史相关",
  "objective": "区域目标（20-40字）",
  "maxTurns": "6-10的整数",
  "creationCharges": "3-5的整数",
  "miraclePoints": "6-10的整数",
  "entropyLimit": "7-10的整数",
  "map": ["7个字符串，每个7个字符"],
  "units": [
    {
      "type": "单位类型",
      "name": "单位名称",
      "x": "0-6的整数",
      "y": "0-6的整数",
      "goal": {"x": "0-6", "y": "0-6"}
    }
  ],
  "hazard": {
    "type": "危机类型",
    "spreadPerTurn": "1-3的整数"
  },
  "win": "胜利条件类型（requiredRescue/survive/peace/final）",
  "requiredRescue": "需要救援的数量（如果有）",
  "connections": {
    "from": "前一个区域ID",
    "reason": "为什么这个区域会出现在这里（与玩家历史相关的解释）"
  }
}

【玩家历史状态】
- 已探索区域数：${regionCount}
- 玩家风格：${playStyle}
- 总救援数：${rescued}
- 总损失数：${lost}
- 当前裂隙：${entropy}
- 最近使用的造物：${creations.join('、') || '无'}
- 之前去过的区域：${previousRegions.join('、') || '无'}
- 角色关系：${Object.entries(relationships).map(([k,v]) => `${k}:${v}`).join('、') || '无'}
- 已发现的故事：${discoveredLore.join('、') || '无'}

【生成要求】
1. 主题倾向：${themeHint}
2. 氛围：${atmosphereHint}
3. 区域必须与之前去过的区域有逻辑连接（地理或因果）。
4. 如果玩家救了某个角色，那个角色可能在新区域出现或提及。
5. 如果玩家使用了某种能力，新区域应该提供使用这种能力的机会。
6. 难度应该适中，不要太简单也不要太困难。
7. 地图必须保证目标可达（从起点到终点有路径）。
8. 单位数量3-6个，不要太多也不要太少。`;
}

export function parseRegionFromAI(content, state, regionCount) {
  let parsed = null;
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : content;
  try {
    parsed = JSON.parse(candidate);
  } catch (_e) {
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        parsed = JSON.parse(candidate.slice(first, last + 1));
      } catch (_ignored) {
        parsed = null;
      }
    }
  }
  if (!parsed) {
    return generateFallbackRegion(state, regionCount);
  }
  return {
    id: parsed.id || `region-${Date.now()}`,
    title: parsed.title || `未知区域 ${regionCount + 1}`,
    story: parsed.story || '一片未知的土地。',
    objective: parsed.objective || '探索并生存。',
    maxTurns: clampNumber(parsed.maxTurns, 6, 10, 8),
    creationCharges: clampNumber(parsed.creationCharges, 3, 5, 3),
    miraclePoints: clampNumber(parsed.miraclePoints, 6, 10, 6),
    entropyLimit: clampNumber(parsed.entropyLimit, 7, 10, 7),
    map: validateMap(parsed.map),
    units: validateUnits(parsed.units),
    hazard: parsed.hazard || { type: 'flood', spreadPerTurn: 2 },
    win: parsed.win || 'requiredRescue',
    requiredRescue: parsed.requiredRescue || 3,
    connections: parsed.connections || { from: 'unknown', reason: '未知的连接' }
  };
}

function validateMap(map) {
  if (!Array.isArray(map) || map.length !== 7) {
    return [
      '~~~....',
      '~~..~~~',
      '~..V..H',
      '~~~V~~H',
      '~~.V..H',
      '~~~....',
      '~~~~...'
    ];
  }
  return map.map(row => {
    if (typeof row !== 'string' || row.length !== 7) {
      return '.......';
    }
    return row;
  });
}

function validateUnits(units) {
  if (!Array.isArray(units) || units.length === 0) {
    return [
      { type: 'villager', name: '村民甲', x: 3, y: 2, goal: { x: 6, y: 2 } },
      { type: 'villager', name: '村民乙', x: 3, y: 3, goal: { x: 6, y: 3 } },
      { type: 'villager', name: '村民丙', x: 3, y: 4, goal: { x: 6, y: 4 } }
    ];
  }
  return units.map((unit, index) => ({
    type: ['villager', 'miner', 'beast', 'tribeA', 'tribeB'].includes(unit.type) ? unit.type : 'villager',
    name: unit.name || `单位${index + 1}`,
    x: clampNumber(unit.x, 0, 6, 3),
    y: clampNumber(unit.y, 0, 6, 3),
    goal: {
      x: clampNumber(unit.goal?.x, 0, 6, 6),
      y: clampNumber(unit.goal?.y, 0, 6, 2)
    }
  }));
}

function generateFallbackRegion(state, regionCount) {
  const themes = [
    { title: '迷雾沼泽', hazard: 'fog', map: ['WW~~...', 'W..V..~', '~..F..~', '...S...', '~..F..~', 'W..V..~', 'WW~~...'] },
    { title: '崩塌矿道', hazard: 'darkness', map: ['E..D...', '..DDD..', '.DD....', '..M.M..', '..V....', '...V...', '..V....'] },
    { title: '裂隙平原', hazard: 'mixed', map: ['~~..D.C', '~..DD..', '..G.B..', '..V.B..', '.WV.BF.', '~.V....', '~~~....'] },
    { title: '遗忘森林', hazard: 'fog', map: ['...S...', '..GGG..', '.G.W.G.', '...W...', '.G.W.G.', '..V.V..', '.V...V.'] },
    { title: '洪水遗迹', hazard: 'flood', map: ['~~~....', '~~..~~~', '~..V..H', '~~~V~~H', '~~.V..H', '~~~....', '~~~~...'] }
  ];
  const theme = themes[regionCount % themes.length];
  return {
    id: `fallback-${regionCount}`,
    title: `${theme.title} ${regionCount + 1}`,
    story: `这是${theme.title}，一片被裂隙影响的土地。你之前的选择塑造了这里的一切。`,
    objective: '在危机中拯救生命，找到前进的道路。',
    maxTurns: 8,
    creationCharges: 3,
    miraclePoints: 6,
    entropyLimit: 7,
    map: theme.map,
    units: [
      { type: 'villager', name: '幸存者甲', x: 3, y: 2, goal: { x: 6, y: 2 } },
      { type: 'villager', name: '幸存者乙', x: 3, y: 3, goal: { x: 6, y: 3 } },
      { type: 'villager', name: '幸存者丙', x: 3, y: 4, goal: { x: 6, y: 4 } }
    ],
    hazard: { type: theme.hazard, spreadPerTurn: 2 },
    win: 'requiredRescue',
    requiredRescue: 3,
    connections: { from: 'previous', reason: '世界的裂隙引导你来到这里' }
  };
}

// 重新导出供端点使用的工具
export {
  fallbackRegionEnvelope,
  fallbackResidentDialogueEnvelope,
  fallbackCard,
  buildNightWatchTowerFallback,
  buildNightWatchTowerMessages,
  normalizeNightWatchTowerInput,
  sanitizeNightWatchTowerPlan,
  sanitizeResidentDialogueEnvelope
};
