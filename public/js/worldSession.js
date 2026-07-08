import { WorldSimulation } from './worldSimulation.js'
import { GameplayAdapter } from './gameplayAdapter.js'

export class WorldSession {
  constructor(options = {}) {
    this.worldSimulation = options.worldSimulation || new WorldSimulation()
    this.adapter = options.adapter || new GameplayAdapter()
    this.currentRegionId = options.currentRegionId || null
    this.completedRegionCount = options.completedRegionCount || 0
    this.tacticalSnapshot = options.tacticalSnapshot || null
    this.endingFlags = Array.isArray(options.endingFlags) ? [...options.endingFlags] : []
  }

  recordTacticalEvent(gameEvent) {
    const event = this.adapter.toWorldEvent(gameEvent)
    this.currentRegionId = event.regionId
    return this.worldSimulation.recordGameEvent(event)
  }

  proposeNextRoutes(options = {}) {
    return this.worldSimulation.proposeExplorationChoices({
      sourceRegionId: options.sourceRegionId || this.currentRegionId || 'unknown',
      outcome: options.outcome || 'unknown',
      count: options.count || 3,
      turn: options.turn || 0
    })
  }

  updateTacticalSnapshot(snapshot = {}) {
    this.tacticalSnapshot = {
      levelId: snapshot.levelId || this.currentRegionId || null,
      turn: Number(snapshot.turn || 0),
      gameState: snapshot.gameState || 'playing',
      units: Array.isArray(snapshot.units) ? snapshot.units.map(unit => ({ ...unit })) : [],
      creations: Array.isArray(snapshot.creations) ? snapshot.creations.map(creation => ({ ...creation })) : [],
      entropy: Number(snapshot.entropy || 0),
      objective: snapshot.objective || null
    }
    if (this.tacticalSnapshot.levelId) this.currentRegionId = this.tacticalSnapshot.levelId
    return this.tacticalSnapshot
  }

  async resolveRoute(choiceId, options = {}) {
    const region = await this.worldSimulation.resolveExplorationChoice(choiceId, options)
    this.currentRegionId = region.id
    this.completedRegionCount += 1
    this.updateTacticalSnapshot({
      levelId: region.id,
      turn: 0,
      gameState: 'playing',
      units: region.units || [],
      objective: region.objective || region.win || null
    })
    return region
  }

  tickResidents(context = {}) {
    return this.worldSimulation.tickResidents(this.currentRegionId || context.regionId || 'unknown', {
      ...context,
      regionId: this.currentRegionId || context.regionId || 'unknown'
    })
  }

  tickWorld(context = {}) {
    const residentActions = this.tickResidents(context)
    return { residentActions }
  }

  talkToResident(residentId, playerText) {
    if (!this.worldSimulation.talkToResident) {
      return { text: 'The world is quiet.', intent: { type: 'idle', confidence: 0.5 } }
    }
    return this.worldSimulation.talkToResident(residentId, playerText)
  }

  serialize() {
    return {
      currentRegionId: this.currentRegionId,
      completedRegionCount: this.completedRegionCount,
      tacticalSnapshot: this.tacticalSnapshot,
      endingFlags: [...this.endingFlags],
      worldSimulation: this.worldSimulation.serialize ? this.worldSimulation.serialize() : null
    }
  }

  deserialize(data = {}) {
    this.currentRegionId = data.currentRegionId || null
    this.completedRegionCount = data.completedRegionCount || 0
    this.tacticalSnapshot = data.tacticalSnapshot || null
    this.endingFlags = Array.isArray(data.endingFlags) ? [...data.endingFlags] : []
    if (data.worldSimulation && this.worldSimulation.deserialize) {
      this.worldSimulation.deserialize(data.worldSimulation)
    }
  }
}
