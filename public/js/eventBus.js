const DEFAULT_MAX_EVENTS = 500;

function createId(prefix = 'event') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clampImportance(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.5;
  return Math.max(0, Math.min(1, number));
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map(String).filter(Boolean).slice(0, 12);
}

export class EventBus {
  constructor(options = {}) {
    this.maxEvents = Number.isFinite(options.maxEvents) ? Math.max(1, options.maxEvents) : DEFAULT_MAX_EVENTS;
    this.events = [];
    this.listeners = new Map();
  }

  emit(event) {
    if (!event || !event.type) {
      throw new Error('EventBus.emit requires an event with type');
    }

    const canonical = {
      id: event.id || createId(),
      type: String(event.type),
      regionId: event.regionId || 'unknown',
      actorId: event.actorId || 'system',
      turn: Number.isFinite(Number(event.turn)) ? Number(event.turn) : 0,
      timestamp: Number.isFinite(Number(event.timestamp)) ? Number(event.timestamp) : Date.now(),
      payload: event.payload && typeof event.payload === 'object' ? { ...event.payload } : {},
      importance: clampImportance(event.importance),
      tags: normalizeTags(event.tags)
    };

    // 将非payload的顶层字段也保留到canonical上（如category等）
    for (const key of Object.keys(event)) {
      if (!(key in canonical) && key !== 'payload') {
        canonical[key] = event[key]
      }
    }

    this.events.push(canonical);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    this.dispatch(canonical);
    return canonical;
  }

  on(type, handler) {
    const eventType = String(type || '*');
    if (typeof handler !== 'function') {
      throw new Error('EventBus.on requires a function handler');
    }
    if (!this.listeners.has(eventType)) this.listeners.set(eventType, new Set());
    this.listeners.get(eventType).add(handler);
    return () => this.listeners.get(eventType)?.delete(handler);
  }

  dispatch(event) {
    for (const handler of this.listeners.get(event.type) || []) handler(event);
    for (const handler of this.listeners.get('*') || []) handler(event);
  }

  query(filter = {}) {
    return this.events.filter(event => {
      if (filter.type && event.type !== filter.type) return false;
      if (filter.regionId && event.regionId !== filter.regionId) return false;
      if (filter.actorId && event.actorId !== filter.actorId) return false;
      if (filter.tag && !event.tags.includes(filter.tag)) return false;
      return true;
    });
  }

  recent(count = 10) {
    return this.events.slice(-Math.max(0, count));
  }

  serialize() {
    return {
      version: 1,
      maxEvents: this.maxEvents,
      events: this.events.map(event => ({
        ...event,
        payload: { ...event.payload },
        tags: [...event.tags]
      }))
    };
  }

  deserialize(data = {}) {
    this.maxEvents = Number.isFinite(data.maxEvents) ? Math.max(1, data.maxEvents) : this.maxEvents;
    this.events = Array.isArray(data.events)
      ? data.events.map(event => ({
          ...event,
          payload: event.payload && typeof event.payload === 'object' ? { ...event.payload } : {},
          tags: normalizeTags(event.tags),
          importance: clampImportance(event.importance)
        })).slice(-this.maxEvents)
      : [];
  }
}
