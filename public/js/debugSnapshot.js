export class DebugSnapshot {
  constructor(options = {}) {
    this.worldSimulation = options.worldSimulation || null
    this.includeEvents = options.includeEvents !== false
    this.includeResidents = options.includeResidents !== false
    this.includeHooks = options.includeHooks !== false
    this.maxEvents = options.maxEvents || 100
  }

  capture() {
    if (!this.worldSimulation) return { error: 'no world simulation' }
    const snapshot = this.worldSimulation.serialize()
    return {
      capturedAt: new Date().toISOString(),
      version: snapshot.version || 1,
      events: this.includeEvents ? (snapshot.eventBus?.events || []).slice(-this.maxEvents) : [],
      residents: this.includeResidents ? (snapshot.residentRegistry?.residents || []) : [],
      futureHooks: this.includeHooks ? (snapshot.futureHooks || []) : [],
      residentAgentSystem: snapshot.residentAgentSystem || null,
      regionManager: snapshot.regionManager || null
    }
  }

  toJson() {
    return JSON.stringify(this.capture(), null, 2)
  }

  download(filename = 'world-snapshot.json') {
    const blob = new Blob([this.toJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}

export function captureWorldSnapshot(worldSimulation, options = {}) {
  const snapshot = new DebugSnapshot({ worldSimulation, ...options })
  return snapshot.capture()
}
