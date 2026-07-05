import {
  buildGroundedResidentDialogueText,
  sanitizeResidentDialogueCandidate
} from './dialogueGrounding.js'

export const RESIDENT_DIALOGUE_INTENTS = [
  'speak',
  'request_help',
  'move_region',
  'assist_unit',
  'spread_knowledge',
  'withdraw',
  'idle'
]

function latestMemory(resident = {}) {
  const memories = Array.isArray(resident.memories) ? resident.memories : []
  return memories
    .slice()
    .sort((a, b) => Number(b.importance || 0) - Number(a.importance || 0))[0] || null
}

function safeText(value, length) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, length)
}

export class ResidentDialogueSystem {
  buildContext(input = {}) {
    const resident = input.resident || {}
    const memory = latestMemory(resident)
    return {
      residentId: resident.residentId || 'resident-unknown',
      residentName: safeText(resident.name || 'Resident', 40),
      mood: safeText(resident.mood || 'neutral', 40),
      attitudeToPlayer: safeText(resident.attitudeToPlayer || 'neutral', 40),
      currentGoal: safeText(resident.currentGoal || 'observe the region', 120),
      memoryText: safeText(memory?.text || 'no clear memory yet', 220),
      playerText: safeText(input.playerText || '', 240),
      regionId: safeText(input.regionId || resident.currentRegionId || 'unknown', 80)
    }
  }

  generateLocalDialogue(input = {}) {
    const context = this.buildContext(input)
    return {
      text: buildGroundedResidentDialogueText(context),
      intent: {
        type: /lost|失踪|遇难|求救|救/.test(context.memoryText) ? 'request_help' : 'speak',
        confidence: 0.65
      },
      source: 'local_grounded',
      grounded: true
    }
  }

  sanitizeCandidate(candidate = {}, input = {}) {
    return sanitizeResidentDialogueCandidate(candidate, input)
  }
}
