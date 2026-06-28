export const RUMOR_TYPES = [
  'memory_rumor',
  'route_proposal',
  'warning',
  'invitation'
]

function createId(prefix = 'rumor') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function rewriteMemoryAsRumor(memory, residentName) {
  const text = memory.text || ''
  // 简单改写：把陈述句变为带有传闻色彩的表达
  if (text.includes('被玩家救下')) {
    return `${residentName}说，有人在洪水里看到了奇迹……`
  }
  if (text.includes('失踪') || text.includes('遇难')) {
    return `${residentName}低声说，那地方不太对劲……`
  }
  if (text.includes('创造')) {
    return `${residentName}提到，有人在那里留下了奇怪的东西。`
  }
  if (text.includes('对话')) {
    return `${residentName}似乎知道一些内情。`
  }
  return `${residentName}说：「${text}」`
}

function inferRumorType(memory) {
  const type = memory.type || 'event'
  if (type === 'unit_lost') return 'warning'
  if (type === 'creation_placed') return 'memory_rumor'
  if (type === 'resident_dialogue') return 'invitation'
  return 'memory_rumor'
}

export class ResidentRumorSystem {
  constructor(options = {}) {
    this.residentRegistry = options.residentRegistry
    this.eventBus = options.eventBus
    this.rumors = new Map()
    this.routeProposals = new Map()
  }

  generateRumorFromMemory(residentId, memoryIndex) {
    if (!this.residentRegistry) return null
    const resident = this.residentRegistry.getResident(residentId)
    if (!resident) return null
    const memories = resident.memories || []
    if (memoryIndex < 0 || memoryIndex >= memories.length) return null
    const memory = memories[memoryIndex]
    const rumor = {
      id: createId('rumor'),
      residentId: resident.residentId,
      residentName: resident.name,
      type: inferRumorType(memory),
      text: rewriteMemoryAsRumor(memory, resident.name),
      turn: memory.turn || 0,
      regionId: memory.regionId || resident.currentRegionId || 'unknown',
      credibility: memory.importance || 0.5
    }
    this.rumors.set(rumor.id, rumor)
    return rumor
  }

  generateRouteProposal(residentId, targetRegionId, reason) {
    if (!this.residentRegistry) return null
    const resident = this.residentRegistry.getResident(residentId)
    if (!resident) return null
    const proposal = {
      id: createId('proposal'),
      residentId: resident.residentId,
      residentName: resident.name,
      targetRegionId,
      reason: reason || '',
      turn: 0,
      votes: 0,
      status: 'pending'
    }
    this.routeProposals.set(proposal.id, proposal)
    return proposal
  }

  voteForProposal(proposalId, residentId) {
    const proposal = this.routeProposals.get(proposalId)
    if (!proposal) return false
    if (proposal.status !== 'pending') return false
    if (!this.residentRegistry) return false
    const voter = this.residentRegistry.getResident(residentId)
    if (!voter) return false
    proposal.votes += 1
    return true
  }

  resolveProposal(proposalId, accepted) {
    const proposal = this.routeProposals.get(proposalId)
    if (!proposal) return false
    if (proposal.status !== 'pending') return false
    proposal.status = accepted ? 'accepted' : 'rejected'
    if (this.eventBus) {
      this.eventBus.emit({
        type: accepted ? 'route_proposal_accepted' : 'route_proposal_rejected',
        regionId: proposal.targetRegionId,
        actorId: proposal.residentId,
        turn: proposal.turn,
        payload: { proposalId, proposal },
        importance: 0.7,
        tags: ['route_proposal', 'resident']
      })
    }
    return true
  }

  tick(turn) {
    if (!this.residentRegistry) return
    const residents = Array.from(this.residentRegistry.residents.values())
    // 每回合随机选择 0-2 个居民尝试生成谣言
    const shuffled = residents.sort(() => Math.random() - 0.5)
    const count = Math.floor(Math.random() * 3)
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const resident = shuffled[i]
      const memories = resident.memories || []
      if (memories.length === 0) continue
      const memoryIndex = Math.floor(Math.random() * memories.length)
      this.generateRumorFromMemory(resident.residentId, memoryIndex)
    }
  }

  getRumorsForRegion(regionId) {
    return Array.from(this.rumors.values()).filter(rumor => rumor.regionId === regionId)
  }

  getPendingProposals() {
    return Array.from(this.routeProposals.values()).filter(proposal => proposal.status === 'pending')
  }

  serialize() {
    return {
      version: 1,
      rumors: Array.from(this.rumors.values()),
      routeProposals: Array.from(this.routeProposals.values())
    }
  }

  deserialize(data = {}) {
    this.rumors = new Map((data.rumors || []).map(rumor => [rumor.id, rumor]))
    this.routeProposals = new Map((data.routeProposals || []).map(proposal => [proposal.id, proposal]))
  }
}
