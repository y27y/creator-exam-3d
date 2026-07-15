// POST /api/generate-region
// 区域生成：根据玩家历史生成下一个 7x7 棋盘区域
import {
  aiGateway,
  AI_API_KEY,
  AI_BASE_URL,
  AI_MODEL,
  json,
  readRequestBody,
  buildRegionPrompt,
  parseRegionFromAI,
  fallbackRegionEnvelope
} from '../_shared.js';

export async function onRequestPost(context) {
  const payload = await readRequestBody(context.request);
  if (!payload) return json({ error: 'invalid_json' }, 400);

  const sourceRegionId = payload?.sourceRegionId || payload?.playerState?.currentRegionId || 'unknown';
  const hooks = Array.isArray(payload?.hooks) ? payload.hooks : [];
  const worldSummary = payload?.worldSummary || {};
  const { playerState, difficulty = 'normal', regionCount = 0 } = payload || {};
  const state = playerState || {};

  if (!AI_API_KEY) {
    return json(fallbackRegionEnvelope({
      sourceRegionId,
      hooks,
      worldSummary,
      playerState: state,
      source: 'fallback_no_key'
    }));
  }

  try {
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
      return json({ error: 'ai_request_failed', detail: body.slice(0, 300), fallback: true }, 502);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message || {};
    const content = message.content || message.reasoning_content || '';

    const region = parseRegionFromAI(content, state, regionCount);

    return json({
      region,
      generated: true,
      source: 'ai',
      playerState: state
    });
  } catch (error) {
    const fallbackRegion = parseRegionFromAI('', state, regionCount);
    return json({
      region: fallbackRegion,
      generated: true,
      fallback: true,
      playerState: state
    });
  }
}
