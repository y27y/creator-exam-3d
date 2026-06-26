import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

loadDotEnv(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 3000);
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

const ABILITIES = new Set([
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

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

async function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('request_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function calculateCreativityScore(playerText) {
  let score = 50; // 基础分
  const text = String(playerText || '');

  // 长度加分：描述越长，创意度越高（最多+20）
  score += Math.min(20, text.length / 2);

  // 诗意词汇加分
  const poeticWords = ['梦', '月', '星', '光', '影', '风', '云', '雾', '雨', '雪', '花', '叶', '根', '魂', '灵', '歌', '诗', '舞', '画', '镜', '纱', '茧', '丝', '网', '链', '轮', '环', '钟', '漏', '晶', '砂', '尘', '烟', '焰', '冰', '霜', '露', '霞', '虹', '泉', '溪', '河', '湖', '海', '潮', '浪', '波', '涡', '礁', '岛', '岸', '滩', '丘', '岭', '峰', '谷', '崖', '洞', '穴', '窟', '林', '森', '木', '树', '枝', '芽', '藤', '蔓', '草', '苔', '菌', '菇', '藻', '莲', '荷', '萍', '苇', '芦', '竹', '笋', '梅', '兰', '菊', '桂', '桃', '杏', '梨', '枣', '栗', '橡', '松', '柏', '杉', '桦', '杨', '柳', '槐', '榆', '桐', '枫', '梧', '樟', '茶', '桑', '麻', '棉', '禾', '麦', '稻', '黍', '稷', '豆', '瓜', '果', '菜', '蔬', '药', '香', '蜜', '蜡', '胶', '漆', '墨', '纸', '布', '绸', '缎', '锦', '绣', '染', '陶', '瓷', '玉', '石', '金', '银', '铜', '铁', '锡', '铅', '汞', '丹', '砂', '矾', '碱', '盐', '糖', '酒', '醋', '油', '茶', '水', '火', '土', '木'];
  const poeticCount = poeticWords.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  score += Math.min(15, poeticCount * 2);

  // 独特描述加分（包含比喻、拟人等修辞）
  const uniquePatterns = [
    /像|如同|仿佛|似|好比/, // 比喻
    /会|能|可以|喜欢|害怕|想要/, // 拟人
    /让|使|令|把/, // 使动
    /透明|发光|隐形|变色|变形|生长|移动|飞行|游泳|爬行|跳跃|奔跑|歌唱|舞蹈|绘画|书写|思考|记忆|遗忘|沉睡|苏醒|呼吸|心跳|生长|枯萎|绽放|凋零/ // 特殊能力
  ];
  for (const pattern of uniquePatterns) {
    if (pattern.test(text)) score += 5;
  }

  // 直接说能力名称减分
  const directAbilityWords = ['照明', '灯', '光', '桥', '路', '墙', '挡', '安抚', '引导', '净化', '迟缓', '记忆', '结界', '保护', '改变地形', '冻结', '显路', '太阳', '抬升', '森林', '水渠', '陷阱', '梦境', '时间'];
  const directCount = directAbilityWords.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  score -= Math.min(20, directCount * 3);

  // 限制在 0-100 之间
  return Math.max(0, Math.min(100, Math.round(score)));
}

function adjustCardByCreativity(card, playerText) {
  const score = calculateCreativityScore(playerText);
  card._creativityScore = score; // 记录评分

  // 高创意度奖励
  if (score >= 80) {
    // 成本-1（最低1）
    card.cost = Math.max(1, (card.cost || 2) - 1);
    // 范围+1（最高3，但sanitize会限制到2）
    card.range = Math.min(3, (card.range || 1) + 1);
    // 持续时间+1（最高4）
    card.duration = Math.min(4, (card.duration || 3) + 1);
  } else if (score >= 60) {
    // 中等创意度：成本-1 或 范围+1
    if (Math.random() < 0.5) {
      card.cost = Math.max(1, (card.cost || 2) - 1);
    } else {
      card.range = Math.min(3, (card.range || 1) + 1);
    }
  }

  // 低创意度惩罚
  if (score <= 30) {
    card.cost = Math.min(3, (card.cost || 2) + 1);
  }

  return card;
}

function sanitizeCard(raw, playerText) {
  const card = raw && typeof raw === 'object' ? raw : {};
  const ability = ABILITIES.has(card.ability) ? card.ability : 'transform_land';
  const name = typeof card.name === 'string' && card.name.trim()
    ? card.name.trim().slice(0, 14)
    : '未命名造物';
  const type = typeof card.type === 'string' && card.type.trim()
    ? card.type.trim().slice(0, 10)
    : '奇迹';
  const description = typeof card.description === 'string' && card.description.trim()
    ? card.description.trim().slice(0, 120)
    : `由”${String(playerText || '').slice(0, 24)}”凝成的创世奇迹。`;
  const sideEffect = typeof card.side_effect === 'string' && card.side_effect.trim()
    ? card.side_effect.trim().slice(0, 80)
    : '世界裂隙轻微上升。';
  const tags = Array.isArray(card.tags)
    ? card.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 4)
    : [];

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

  // 先应用创意评分调整（允许突破常规限制）
  let range = card.range ?? 1;
  let duration = card.duration ?? 3;
  let cost = card.cost ?? 2;

  const score = calculateCreativityScore(playerText);

  // 高创意度奖励（>=60分）
  if (score >= 60) {
    cost = Math.max(1, cost - 1);
    range = Math.min(3, range + 1);
    if (score >= 75) {
      duration = Math.min(4, duration + 1);
    }
  }

  // 低创意度惩罚（<=35分）
  if (score <= 35) {
    cost = Math.min(3, cost + 1);
  }

  return {
    name,
    type,
    ability,
    tags,
    range: clampNumber(range, 0, 3, 1), // 允许创意评分突破到3
    duration: clampNumber(duration, 1, 4, 3),
    cost: clampNumber(cost, 1, 3, 2),
    stabilityCost: clampNumber(card.stabilityCost ?? card.stability_cost, 0, 2, 1),
    description,
    side_effect: sideEffect,
    specialEffect,
    source: 'ai',
    _creativityScore: score
  };
}

function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate);
  } catch (error) {
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

async function handleCompileCreation(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readRequestBody(req));
  } catch (_error) {
    sendJson(res, 400, { error: 'invalid_json' });
    return;
  }

  const { text, levelTitle, levelObjective, context } = payload || {};
  const playerText = String(text || '').trim();
  if (!playerText) {
    sendJson(res, 400, { error: 'missing_text' });
    return;
  }

  if (!AI_API_KEY) {
    sendJson(res, 503, { error: 'ai_not_configured', fallback: true });
    return;
  }

  const systemPrompt = `你是3D游戏《创世计划：造物者考核》的”造物编译器”。玩家会用自然语言创造一个物件、生物或世界法则。你必须把它翻译成受规则约束的游戏卡牌，同时根据玩家的创意描述生成独特的机制变体。

【绝对规则】
1. 只输出JSON对象，不要Markdown，不要解释，不要注释。
2. JSON必须包含完整的specialEffect字段，缺少此字段视为错误输出。
3. 数值必须保守，禁止一键胜利。

【ability枚举】（必须从中选择一项）
- absorb_water：吸收/转移水、洪水、雨云
- create_bridge：生成桥梁、道路、临时通行路径
- illuminate：照明、驱散黑暗、显露道路
- block：墙、屏障、封路、阻挡灾害或巨兽
- calm：安抚、沟通、翻译、降低敌意/战争值
- guide：引导单位移动、指路、召回、护送
- cleanse：净化毒、雾、污染、疾病、诅咒
- slow_beast：迟缓、催眠、牵制巨兽/敌人
- memory_beacon：记忆、路标、歌声、碑文、归家信标
- force_field：区域保护、结界、隔离灾害
- transform_land：改变地形、创造可通行/可利用地块
- freeze_water：冻结水域使其可通行，但会融化
- reveal_path：显示最优路径、加速单位移动
- sun_blessing：大范围光照+恢复单位体力
- raise_earth：抬升地面形成临时高地
- grow_forest：种植森林阻挡灾害扩散
- dig_channel：挖掘水渠引导洪水流向
- trap：设置陷阱迟缓巨兽
- dream_link：连接两个单位共享视野
- time_dilation：延缓时间增加1回合（高代价）

【JSON Schema】
{
  “name”: “2到7个中文字的卡名”,
  “type”: “生物/地形/机械/法则/仪式/奇迹之一”,
  “ability”: “上方枚举之一”,
  “tags”: [“最多4个短标签”],
  “range”: 0到2的整数,
  “duration”: 1到4的整数,
  “cost”: 1到3的整数,
  “stabilityCost”: 0到2的整数,
  “description”: “不超过60字，说明实际游戏效果”,
  “side_effect”: “不超过40字，说明副作用或限制”,
  “specialEffect”: {
    “type”: “必须是 mobile 或 movement 或 reactive 或 environmental 或 sacrifice 或 none 这六个字符串之一”,
    “description”: “不超过30字，说明这个造物与标准版本有何不同”,
    “trigger”: “必须是 onTurnStart 或 onPlacement 或 onExpire 或 onResonance 或 none 这五个字符串之一”
  }
}

【specialEffect type 说明】
- mobile/movement：造物每回合自动向特定地形移动，如”向水域移动”、”向黑暗移动”。
- reactive：当特定事件发生时触发额外效果，如”当洪水扩散时吸收它”。
- environmental：改变周围环境的行为，如”在水域中范围+1”。
- sacrifice：获得强大效果但付出代价，如”每回合消耗1奇迹点”。
- none：标准造物，没有特殊机制。

【设计原则】
1. 保留玩家创意的诗意，但能力必须落在枚举中。
2. 越强的造物 cost 和 stabilityCost 越高。
3. 不允许全图清除、不允许直接过关、不允许永久无敌。
4. 当前关卡目标优先，输出要能帮助玩家解决关卡但仍需要玩家放置和结算。
5. 相同ability可以有完全不同的玩法：例如”发光水母”和”月光灯塔”都是illuminate，但水母应该mobile（向水域移动），灯塔应该environmental（在高点范围+1）。
6. 如果玩家描述非常标准，没有独特之处，specialEffect的type填”none”，description填”无特殊效果”，trigger填”none”。`;

  const userPrompt = JSON.stringify({
    playerText,
    levelTitle: String(levelTitle || ''),
    levelObjective: String(levelObjective || ''),
    context: context || {}
  });

  try {
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.55,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      sendJson(res, 502, { error: 'ai_request_failed', detail: body.slice(0, 300), fallback: true });
      return;
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message || {};
    const content = message.content || message.reasoning_content || '';
    const parsed = extractJson(content);
    if (!parsed) {
      sendJson(res, 502, { error: 'ai_invalid_json', fallback: true, content: content.slice(0, 300) });
      return;
    }

    sendJson(res, 200, sanitizeCard(parsed, playerText));
  } catch (error) {
    sendJson(res, 500, { error: 'ai_proxy_error', message: String(error?.message || error), fallback: true });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const safePath = path.normalize(pathname).replace(/^\.\.(\/[\\])?/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    const finalPath = info.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    const ext = path.extname(finalPath).toLowerCase();
    const body = await readFile(finalPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(body);
  } catch (_error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

async function handleNarrative(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readRequestBody(req));
  } catch (_error) {
    sendJson(res, 400, { error: 'invalid_json' });
    return;
  }

  const { type, context, playerInput, worldState } = payload || {};
  const narrativeType = String(type || 'dialogue'); // dialogue | environment | event | lore
  const input = String(playerInput || '').trim();
  const ctx = context || {};
  const state = worldState || {};

  if (!AI_API_KEY) {
    sendJson(res, 503, { error: 'ai_not_configured', fallback: true });
    return;
  }

  // 构建叙事提示词
  const systemPrompt = buildNarrativePrompt(narrativeType, ctx, state);
  const userPrompt = input || '请生成叙事内容。';

  try {
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.8,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      sendJson(res, 502, { error: 'ai_request_failed', detail: body.slice(0, 300), fallback: true });
      return;
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message || {};
    const content = message.content || message.reasoning_content || '';

    sendJson(res, 200, {
      type: narrativeType,
      text: content,
      context: ctx,
      worldState: state
    });
  } catch (error) {
    sendJson(res, 500, { error: 'ai_proxy_error', message: String(error?.message || error), fallback: true });
  }
}

function buildNarrativePrompt(type, context, worldState) {
  const basePrompt = `你是《创世计划：造物者考核》的叙事引擎。你负责构建一个由AI共同创造的开放世界，玩家的每一个选择都会影响世界的走向。

【绝对规则】
1. 只输出纯文本叙事内容，不要JSON，不要Markdown格式，不要解释。
2. 叙事风格：诗意、神秘、略带忧伤，带有东方奇幻色彩。
3. 每次输出控制在100-200字之间。
4. 必须根据提供的世界状态和上下文生成内容，不能脱离上下文。

【世界背景】
这个世界被称为"裂隙之地"，是一个正在缓慢崩解的幻想世界。玩家是"造物者"，拥有用意念创造物体和改变世界的能力。但每一次创造都会加深世界的裂隙。

【当前世界状态】
- 当前关卡：${worldState.currentLevel || '未知'}
- 已拯救的生命：${worldState.rescued || 0}
- 已失去的生命：${worldState.lost || 0}
- 世界裂隙：${worldState.entropy || 0}/${worldState.entropyLimit || 7}
- 已创造的造物：${(worldState.creations || []).join('、') || '无'}
- 已发现的故事片段：${(worldState.discoveredLore || []).join('、') || '无'}
- 玩家的行为倾向：${worldState.playStyle || '未知'}
`;

  const typePrompts = {
    dialogue: `
【任务：生成角色对话】
你正在扮演一个具有独立人格的AI角色。

角色信息：
- 名称：${context.characterName || '神秘存在'}
- 类型：${context.characterType || '中立'}
- 当前情绪：${context.mood || '平静'}
- 对玩家的态度：${context.attitude || '好奇'}
- 记忆：${(context.memories || []).join('；') || '暂无'}

对话规则：
1. 角色要有自己独特的说话方式（口头禅、语气、用词习惯）。
2. 角色会记住之前与玩家的对话，并据此调整态度。
3. 如果玩家帮助过角色或与其目标一致，态度会更友好。
4. 如果玩家的行为造成了伤害，角色会表现出悲伤或愤怒。
5. 对话中可以适当透露一些世界背景信息，但不要一次性说完。

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
1. 用感官细节（视觉、听觉、嗅觉）让场景生动。
2. 如果场景中有玩家的造物，描述它们如何改变了环境。
3. 如果世界裂隙较高，描述一些异常现象（地面轻微震动、空气中飘浮的光点等）。
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

叙事规则：
1. 从受影响最深的角色的视角描述事件。
2. 强调事件的情感冲击，而不是机械地陈述事实。
3. 如果事件是悲剧性的，用诗意的语言描述损失。
4. 如果事件是胜利的，描述希望如何重新点燃。
5. 在叙事中埋下伏笔，暗示未来可能发生的事。

请直接输出事件叙事。`,

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
1. 故事应该与玩家的描述紧密相关，体现玩家的创意。
2. 解释这个造物为什么存在，它从何而来。
3. 可以暗示这个造物与世界裂隙的关系。
4. 故事要有文学性，像一个微型童话或寓言。
5. 控制在100-150字。

请直接输出起源故事。`
  };

  return basePrompt + (typePrompts[type] || typePrompts.dialogue);
}

// ========== 区域生成系统 ==========

async function handleGenerateRegion(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readRequestBody(req));
  } catch (_error) {
    sendJson(res, 400, { error: 'invalid_json' });
    return;
  }

  const { playerState, difficulty = 'normal', regionCount = 0 } = payload || {};
  const state = playerState || {};

  if (!AI_API_KEY) {
    sendJson(res, 503, { error: 'ai_not_configured', fallback: true });
    return;
  }

  try {
    // 构建区域生成提示词
    const systemPrompt = buildRegionPrompt(state, difficulty, regionCount);
    const userPrompt = '请生成下一个区域。';

    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      sendJson(res, 502, { error: 'ai_request_failed', detail: body.slice(0, 300), fallback: true });
      return;
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message || {};
    const content = message.content || message.reasoning_content || '';

    // 解析AI生成的区域数据
    const region = parseRegionFromAI(content, state, regionCount);

    sendJson(res, 200, {
      region,
      generated: true,
      playerState: state
    });
  } catch (error) {
    console.error('Region generation error:', error);
    // 回退到本地生成
    const fallbackRegion = generateFallbackRegion(state, regionCount);
    sendJson(res, 200, {
      region: fallbackRegion,
      generated: true,
      fallback: true,
      playerState: state
    });
  }
}

function buildRegionPrompt(state, difficulty, regionCount) {
  const playStyle = state.playStyle || '未知';
  const entropy = state.entropy || 0;
  const rescued = state.rescued || 0;
  const lost = state.lost || 0;
  const creations = (state.creations || []).slice(-5);
  const previousRegions = (state.previousRegions || []).slice(-3);
  const relationships = state.relationships || {};
  const discoveredLore = (state.discoveredLore || []).slice(-3);

  // 根据玩家风格确定主题
  let themeHint = '';
  if (playStyle === 'creative') themeHint = '充满想象力和诗意的环境';
  else if (playStyle === 'strategic') themeHint = '需要策略和规划的环境';
  else if (playStyle === 'aggressive') themeHint = '充满冲突和挑战的环境';
  else if (playStyle === 'careful') themeHint = '需要谨慎和耐心的环境';
  else themeHint = '平衡的环境，既有挑战也有机会';

  // 根据裂隙值确定氛围
  let atmosphereHint = '';
  if (entropy > 6) atmosphereHint = '世界濒临崩解，天空出现裂缝，现实不稳定';
  else if (entropy > 4) atmosphereHint = '压抑，空气中弥漫着不安，偶尔出现异象';
  else if (entropy > 2) atmosphereHint = '微妙的紧张感，世界在缓慢变化';
  else atmosphereHint = '相对平静，但隐藏着不确定性';

  return `你是《创世计划：造物者考核》的区域生成引擎。你负责根据玩家的历史行为和当前状态，生成下一个游戏区域。

【绝对规则】
1. 只输出JSON对象，不要Markdown，不要解释，不要注释。
2. JSON必须包含完整的区域定义，包括地图、单位、危机、目标。
3. 地图必须是7x7的字符串数组，每个字符代表一种地形。
4. 区域必须与玩家的历史行为有逻辑连接。

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

function parseRegionFromAI(content, state, regionCount) {
  // 尝试提取JSON
  let parsed = null;

  // 尝试匹配代码块
  const fenced = content.match(/\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`/i);
  const candidate = fenced ? fenced[1] : content;

  try {
    parsed = JSON.parse(candidate);
  } catch (e) {
    // 尝试找到第一个 { 和最后一个 }
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

  // 验证和补充默认值
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
    // 返回默认地图
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
  // 本地回退生成
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

const server = createServer(async (req, res) => {
  // Debug logging
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  if (req.method === 'GET' && req.url?.startsWith('/health')) {
    sendJson(res, 200, { ok: true, aiConfigured: Boolean(AI_API_KEY), model: AI_MODEL });
    return;
  }

  if (req.method === 'POST' && req.url?.startsWith('/api/compile-creation')) {
    await handleCompileCreation(req, res);
    return;
  }

  if (req.method === 'POST' && req.url?.startsWith('/api/narrative')) {
    await handleNarrative(req, res);
    return;
  }

  if (req.method === 'POST' && req.url?.startsWith('/api/generate-region')) {
    await handleGenerateRegion(req, res);
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    await serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { error: 'method_not_allowed' });
});

server.listen(PORT, () => {
  console.log(`Creator Exam 3D is running at http://localhost:${PORT}`);
  console.log(AI_API_KEY ? `AI proxy enabled: ${AI_MODEL}` : 'AI proxy not configured; client fallback compiler will be used.');
});
