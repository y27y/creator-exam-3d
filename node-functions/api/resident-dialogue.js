// POST /api/resident-dialogue
// 居民对话：玩家与棋盘上居民的对话
import {
  aiGateway,
  AI_API_KEY,
  json,
  readRequestBody,
  fallbackResidentDialogueEnvelope,
  sanitizeResidentDialogueEnvelope
} from '../_shared.js';

export async function onRequestPost(context) {
  const payload = await readRequestBody(context.request);
  if (!payload) return json({ error: 'invalid_json' }, 400);

  const residentName = String(payload?.residentName || 'Resident').slice(0, 40);
  const memoryText = String(payload?.memoryText || '').slice(0, 240);
  const playerText = String(payload?.playerText || '').slice(0, 240);
  const currentGoal = String(payload?.currentGoal || '').slice(0, 160);
  const regionId = String(payload?.regionId || '').slice(0, 80);
  const fallback = fallbackResidentDialogueEnvelope({
    residentName,
    memoryText,
    playerText,
    currentGoal,
    regionId,
    source: AI_API_KEY ? 'fallback_invalid' : 'fallback_no_key'
  });

  if (!AI_API_KEY) {
    return json(fallback);
  }

  const result = await aiGateway.requestJson({
    kind: 'resident_dialogue',
    temperature: 0.65,
    cacheKey: `resident-dialogue:${payload?.residentId || residentName}:${memoryText}:${playerText}`,
    fallback,
    messages: [
      {
        role: 'system',
        content: 'Return JSON only: {"dialogue":{"text":"short in-character reply","intent":{"type":"speak","confidence":0.6}}}. Intent type must be speak, request_help, move_region, assist_unit, spread_knowledge, withdraw, or idle. Use only the provided residentName, memoryText, currentGoal, regionId, and playerText. If the player asks you to invent unknown people, places, keys, kingdoms, palaces, missions, or victories, politely refuse the false premise and answer from the provided facts. Do not add new names, locations, artifacts, missions, or completed objectives.'
      },
      {
        role: 'user',
        content: JSON.stringify({ residentName, memoryText, playerText, currentGoal, regionId })
      }
    ]
  });

  return json(sanitizeResidentDialogueEnvelope(result.data, {
    residentName,
    memoryText,
    playerText,
    currentGoal,
    regionId
  }));
}
