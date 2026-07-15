// POST /api/night-watch-towers
// 长夜守城塔防生成：根据玩家造物经历生成守夜塔
import {
  aiGateway,
  AI_API_KEY,
  AI_MODEL,
  json,
  readRequestBody,
  buildNightWatchTowerFallback,
  buildNightWatchTowerMessages,
  normalizeNightWatchTowerInput,
  sanitizeNightWatchTowerPlan
} from '../_shared.js';

export async function onRequestPost(context) {
  const payload = await readRequestBody(context.request);
  if (!payload) return json({ error: 'invalid_json' }, 400);

  const input = normalizeNightWatchTowerInput(payload);
  const fallback = buildNightWatchTowerFallback(input);

  if (!AI_API_KEY) {
    return json(fallback);
  }

  const result = await aiGateway.requestJson({
    kind: 'night_watch_towers',
    temperature: 0.72,
    cacheKey: `night-watch-towers:${JSON.stringify(input)}`,
    fallback: { ...fallback, source: 'fallback_ai_failed' },
    messages: buildNightWatchTowerMessages(input)
  });

  const plan = sanitizeNightWatchTowerPlan(result.data, input);
  const aiSucceeded = result.source === 'provider' || result.source === 'cache';
  plan.source = aiSucceeded ? 'ai' : (plan.source || result.source);
  plan.model = AI_MODEL;
  if (!aiSucceeded) plan.fallback = true;
  return json(plan);
}
