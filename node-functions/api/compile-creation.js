// POST /api/compile-creation
// 造物编译：玩家自然语言 → 游戏卡牌
import {
  aiGateway,
  AI_API_KEY,
  json,
  readRequestBody,
  buildFallbackCreation,
  sanitizeCard,
  buildCompileCreationSystemPrompt
} from '../_shared.js';

export async function onRequestPost(context) {
  const payload = await readRequestBody(context.request);
  if (!payload) return json({ error: 'invalid_json' }, 400);

  const { text, levelTitle, levelObjective, context: ctx } = payload || {};
  const playerText = String(text || '').trim();
  if (!playerText) return json({ error: 'missing_text' }, 400);

  if (!AI_API_KEY) {
    return json(buildFallbackCreation(playerText));
  }

  const systemPrompt = buildCompileCreationSystemPrompt();
  const userPrompt = JSON.stringify({
    playerText,
    levelTitle: String(levelTitle || ''),
    levelObjective: String(levelObjective || ''),
    context: ctx || {}
  });

  const result = await aiGateway.requestJson({
    kind: 'compile_creation',
    temperature: 0.55,
    cacheKey: `compile-creation:${playerText}:${levelTitle || ''}:${levelObjective || ''}`,
    fallback: buildFallbackCreation(playerText, 'provider_failed'),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });

  if (result.source !== 'provider' && result.source !== 'cache') {
    const reason = result.source === 'fallback_budget' ? 'budget' : (result.error === 'missing_key' ? 'no_key' : result.error === 'invalid_json' ? 'invalid_response' : (['timeout', 'budget', 'no_key'].includes(result.error) ? result.error : 'provider_failed'));
    return json(buildFallbackCreation(playerText, reason));
  }

  return json(sanitizeCard(result.data, playerText));
}
