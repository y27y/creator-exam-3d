function normalizeContinuityText(text) {
  return String(text || '').replace(/噬光之灯/g, '噬光黑核');
}

export function buildContinuityViewModel(worldSimulation, options = {}) {
  const currentRegionId = options.currentRegionId || 'unknown';
  const residents = worldSimulation.residentRegistry.getResidentsForRegion(currentRegionId).map(resident => ({
    residentId: resident.residentId,
    name: resident.name,
    mood: resident.mood,
    currentGoal: resident.currentGoal,
    memoryCount: resident.memories.length,
    latestMemory: normalizeContinuityText(resident.memories[resident.memories.length - 1]?.text || '暂无关键记忆')
  }));

  const futureHooks = worldSimulation.getFutureHooks(currentRegionId).map(hook => ({
    id: hook.id,
    type: hook.type,
    priority: hook.priority || 0,
    summary: normalizeContinuityText(hook.summary || hook.type),
    residentId: hook.residentId || null,
    sourceRegionId: hook.sourceRegionId || currentRegionId
  })).sort((a, b) => b.priority - a.priority);

  const events = worldSimulation.eventBus.recent(20);
  const economySummary = worldSimulation.economySystem.getSummary();
  const pressures = Object.entries(economySummary.pressures).map(([category, data]) => ({
    category,
    value: data.value,
    trend: data.trend,
    status: data.status
  }));

  return {
    currentRegionId,
    residents,
    futureHooks,
    pressures,
    eventSummary: {
      totalEvents: worldSimulation.eventBus.events.length,
      recent: events.map(event => ({
        id: event.id,
        type: event.type,
        regionId: event.regionId,
        turn: event.turn
      }))
    }
  };
}
