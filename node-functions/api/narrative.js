// POST /api/narrative
// 叙事生成：对话、环境、事件、起源故事等
import {
  aiGateway,
  AI_API_KEY,
  AI_BASE_URL,
  AI_MODEL,
  json,
  readRequestBody,
  buildNarrativePrompt,
  fallbackNarrativeText
} from '../_shared.js';

export async function onRequestPost(context) {
  const payload = await readRequestBody(context.request);
  if (!payload) return json({ error: 'invalid_json' }, 400);

  const { type, context: ctx, playerInput, worldState } = payload || {};
  const narrativeType = String(type || 'dialogue');
  const contextObj = ctx || {};
  const input = String(playerInput || contextObj.playerInput || contextObj.playerText || '').trim();
  const state = worldState || {};

  if (!AI_API_KEY) {
    return json({
      type: narrativeType,
      text: fallbackNarrativeText(narrativeType, input, contextObj),
      context: contextObj,
      worldState: state,
      fallback: true,
      source: 'fallback_no_key'
    });
  }

  const systemPrompt = buildNarrativePrompt(narrativeType, contextObj, state);
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
      return json({ error: 'ai_request_failed', detail: body.slice(0, 300), fallback: true }, 502);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message || {};
    const content = message.content || message.reasoning_content || '';

    return json({
      type: narrativeType,
      text: content,
      context: contextObj,
      worldState: state
    });
  } catch (error) {
    return json({ error: 'ai_proxy_error', message: String(error?.message || error), fallback: true }, 500);
  }
}
