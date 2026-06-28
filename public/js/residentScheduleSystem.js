/**
 * 居民日程系统 (Resident Schedule System)
 * 让居民拥有自主日程和议程，不依赖玩家行动也能推动世界变化
 */

export const RESIDENT_SCHEDULE_TYPES = [
  'patrol',
  'gather',
  'rest',
  'meet',
  'travel',
  'quest'
]

export class ResidentScheduleSystem {
  constructor(options = {}) {
    if (!options.residentRegistry) {
      throw new Error('ResidentScheduleSystem requires options.residentRegistry')
    }
    this.residentRegistry = options.residentRegistry
    this.schedules = new Map()
  }

  /**
   * 为居民分配日程
   * @param {string} residentId - 居民ID
   * @param {Object} schedule - 日程对象
   * @param {string} schedule.type - 日程类型，必须是 RESIDENT_SCHEDULE_TYPES 之一
   * @param {string} [schedule.targetRegionId] - 目标区域ID（可选）
   * @param {number} schedule.interval - 每隔多少回合触发
   * @param {number} schedule.nextTriggerTurn - 下次触发回合
   */
  assignSchedule(residentId, schedule) {
    if (!residentId) {
      throw new Error('assignSchedule requires residentId')
    }
    if (!schedule || typeof schedule !== 'object') {
      throw new Error('assignSchedule requires schedule object')
    }
    if (!RESIDENT_SCHEDULE_TYPES.includes(schedule.type)) {
      throw new Error(`invalid schedule type: ${schedule.type}`)
    }
    const interval = Number.isFinite(schedule.interval) && schedule.interval > 0 ? schedule.interval : 1
    const nextTriggerTurn = Number.isFinite(schedule.nextTriggerTurn) ? schedule.nextTriggerTurn : 0
    this.schedules.set(residentId, {
      type: schedule.type,
      targetRegionId: schedule.targetRegionId || null,
      interval,
      nextTriggerTurn
    })
  }

  /**
   * 获取居民当前日程
   * @param {string} residentId - 居民ID
   * @returns {Object|null} 日程对象或null
   */
  getSchedule(residentId) {
    return this.schedules.get(residentId) || null
  }

  /**
   * 清除居民日程
   * @param {string} residentId - 居民ID
   */
  clearSchedule(residentId) {
    this.schedules.delete(residentId)
  }

  /**
   * 遍历所有日程，触发到达触发回合的日程
   * @param {number} turn - 当前回合
   * @param {Object} worldSimulation - 世界模拟实例
   */
  tick(turn, worldSimulation) {
    if (!worldSimulation || typeof worldSimulation !== 'object') {
      throw new Error('tick requires worldSimulation')
    }
    for (const [residentId, schedule] of this.schedules.entries()) {
      if (turn < schedule.nextTriggerTurn) continue
      const resident = this.residentRegistry.getResident(residentId)
      if (!resident) continue
      const regionId = resident.currentRegionId || 'unknown'
      worldSimulation.eventBus.emit({
        type: 'resident_action',
        regionId,
        actorId: residentId,
        turn,
        payload: {
          residentId,
          residentName: resident.name,
          scheduleType: schedule.type,
          targetRegionId: schedule.targetRegionId,
          reason: `自主日程: ${schedule.type}`
        },
        importance: schedule.type === 'quest' ? 0.8 : 0.5,
        tags: ['resident', 'schedule', schedule.type]
      })
      if (schedule.type === 'travel' && schedule.targetRegionId) {
        this.residentRegistry.moveResident(residentId, schedule.targetRegionId)
      }
      schedule.nextTriggerTurn = turn + schedule.interval
    }
  }

  /**
   * 序列化所有日程状态
   * @returns {Object}
   */
  serialize() {
    const schedules = []
    for (const [residentId, schedule] of this.schedules.entries()) {
      schedules.push({ residentId, schedule: { ...schedule } })
    }
    return {
      version: 1,
      schedules
    }
  }

  /**
   * 反序列化恢复日程状态
   * @param {Object} data - 序列化数据
   */
  deserialize(data = {}) {
    this.schedules.clear()
    for (const entry of data.schedules || []) {
      if (entry.residentId && entry.schedule) {
        this.schedules.set(entry.residentId, {
          type: entry.schedule.type,
          targetRegionId: entry.schedule.targetRegionId || null,
          interval: Number.isFinite(entry.schedule.interval) ? entry.schedule.interval : 1,
          nextTriggerTurn: Number.isFinite(entry.schedule.nextTriggerTurn) ? entry.schedule.nextTriggerTurn : 0
        })
      }
    }
  }
}
