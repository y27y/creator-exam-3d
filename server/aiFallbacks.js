import { buildGroundedResidentDialogueText } from '../public/js/dialogueGrounding.js';

export function fallbackRegionCandidate(input = {}) {
  const hooks = Array.isArray(input.hooks) ? input.hooks : [];
  const residentHook = hooks.find(h => h.type === 'resident_migration' && h.residentId);
  const baseUnits = input.units || [
    { type: 'villager', name: '幸存者甲', x: 3, y: 2, goal: { x: 6, y: 2 } },
    { type: 'villager', name: '幸存者乙', x: 3, y: 3, goal: { x: 6, y: 3 } },
    { type: 'villager', name: '幸存者丙', x: 3, y: 4, goal: { x: 6, y: 4 } }
  ];

  const units = residentHook
    ? baseUnits.map((u, i) =>
        i === 0
          ? { ...u, residentId: residentHook.residentId, name: u.name }
          : u
      )
    : baseUnits;

  return {
    id: input.id || 'fallback-region',
    title: input.title || '未知区域',
    story: input.story || '一片被裂隙影响的土地。',
    objective: input.objective || '在危机中拯救生命，找到前进的道路。',
    maxTurns: 8,
    creationCharges: 3,
    miraclePoints: 6,
    entropyLimit: 7,
    map: input.map || [
      '.......',
      '.......',
      '...V...',
      '.......',
      '.......',
      '.......',
      '.......'
    ],
    units,
    hazard: input.hazard || { type: 'flood', spreadPerTurn: 2 },
    win: input.win || 'requiredRescue',
    requiredRescue: input.requiredRescue || 3,
    connections: input.connections || { from: 'unknown', reason: '世界的裂隙引导你来到这里' }
  };
}

export function fallbackResidentDialogue(input = {}) {
  const name = String(input.residentName || '居民').slice(0, 40);
  const memory = String(input.memoryText || '').slice(0, 240);
  const player = String(input.playerText || '').slice(0, 240);
  return {
    text: buildGroundedResidentDialogueText({
      residentName: name,
      memoryText: memory,
      playerText: player,
      currentGoal: input.currentGoal,
      regionId: input.regionId
    }),
    intent: { type: 'speak', confidence: 0.6 },
    memory,
    playerText: player,
    grounded: true
  };
}

export function fallbackRegionEnvelope(input = {}) {
  return {
    region: fallbackRegionCandidate(input),
    generated: true,
    fallback: true,
    source: input.source || 'fallback_no_key',
    playerState: input.playerState || {}
  };
}

export function fallbackResidentDialogueEnvelope(input = {}) {
  return {
    dialogue: fallbackResidentDialogue(input),
    fallback: true,
    source: input.source || 'fallback_no_key'
  };
}

export function fallbackCard(playerText = '') {
  return {
    name: String(playerText || 'Unnamed Creation').slice(0, 14),
    type: 'miracle',
    ability: 'transform_land',
    tags: ['fallback'],
    range: 1,
    duration: 2,
    cost: 2,
    stabilityCost: 1,
    description: 'A safe local creation used when the AI provider is unavailable.',
    side_effect: 'Entropy rises slightly.',
    specialEffect: { type: 'none', description: 'No special effect.', trigger: 'none' },
    source: 'fallback'
  };
}
