import { WORLD_SCHEMA_VERSION } from './memoryStore.js';

export const SAVE_SLOT_PREFIX = 'creator_exam_world_slot:';
export const SCHEMA_VERSION = 2;

function now() {
  return Date.now();
}

function defaultStorage() {
  if (typeof localStorage === 'undefined' || localStorage === null) {
    throw new Error('SaveSlotManager requires storage outside the browser');
  }
  return localStorage;
}

function normalizeSlotId(slotId) {
  const normalized = String(slotId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40);
  if (!normalized) throw new Error('slot id is required');
  return normalized;
}

function slotKey(slotId) {
  return `${SAVE_SLOT_PREFIX}${normalizeSlotId(slotId)}`;
}

function readSnapshot(raw) {
  const snapshot = JSON.parse(raw);
  if (!snapshot || typeof snapshot !== 'object') throw new Error('snapshot must be an object');
  if (snapshot.version !== WORLD_SCHEMA_VERSION) throw new Error(`unsupported save slot version: ${snapshot.version}`);
  if (!snapshot.session || typeof snapshot.session !== 'object') throw new Error('session is required');
  return snapshot;
}

export class SaveSlotManager {
  constructor(options = {}) {
    this.storage = options.storage || defaultStorage();
    this.prefix = options.prefix || SAVE_SLOT_PREFIX;
    this.lastError = null;
  }

  makeKey(slotId) {
    return `${this.prefix}${normalizeSlotId(slotId)}`;
  }

  saveSlot(slotId, worldSession, persistentState = {}, metadata = {}) {
    // Backward compatibility: old callers passed metadata as the 3rd argument
    const isLegacyMetadata = persistentState &&
      !persistentState.persistentWorld &&
      !persistentState.legacySystem &&
      !persistentState.workshop &&
      (persistentState.label !== undefined || persistentState.currentRegionId !== undefined);
    const actualPersistentState = isLegacyMetadata ? null : persistentState;
    const actualMetadata = isLegacyMetadata ? persistentState : metadata;

    const id = normalizeSlotId(slotId);
    const snapshot = {
      version: WORLD_SCHEMA_VERSION,
      slotId: id,
      label: String(actualMetadata.label || id).slice(0, 60),
      savedAt: now(),
      currentRegionId: actualMetadata.currentRegionId || worldSession.currentRegionId || null,
      session: worldSession.serialize(),
      persistentState: actualPersistentState || null
    };
    this.storage.setItem(this.makeKey(id), JSON.stringify(snapshot));
    this.lastError = null;
    return snapshot;
  }

  loadSlot(slotId, worldSession) {
    const raw = this.storage.getItem(this.makeKey(slotId));
    if (!raw) return { loaded: false, persistentState: null };
    try {
      const snapshot = readSnapshot(raw);
      worldSession.deserialize(snapshot.session);
      this.lastError = null;
      return { loaded: true, persistentState: snapshot.persistentState || null };
    } catch (error) {
      this.lastError = { code: 'load_failed', message: error.message };
      return { loaded: false, persistentState: null };
    }
  }

  deleteSlot(slotId) {
    this.storage.removeItem(this.makeKey(slotId));
    this.lastError = null;
    return true;
  }

  listSlots() {
    const source = typeof this.storage.dump === 'function'
      ? Object.keys(this.storage.dump())
      : Array.from({ length: this.storage.length }, (_, index) => this.storage.key(index));
    return source
      .filter(key => String(key).startsWith(this.prefix))
      .map(key => {
        try {
          const snapshot = readSnapshot(this.storage.getItem(key));
          return {
            slotId: snapshot.slotId,
            label: snapshot.label,
            savedAt: snapshot.savedAt,
            currentRegionId: snapshot.currentRegionId || null
          };
        } catch (_error) {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.savedAt - a.savedAt);
  }

  exportSlot(slotId) {
    const raw = this.storage.getItem(this.makeKey(slotId));
    if (!raw) return null;
    readSnapshot(raw);
    return raw;
  }

  importSlot(slotId, rawSnapshot) {
    try {
      const snapshot = readSnapshot(rawSnapshot);
      const id = normalizeSlotId(slotId);
      const imported = {
        ...snapshot,
        slotId: id,
        label: snapshot.label || id,
        savedAt: now()
      };
      this.storage.setItem(this.makeKey(id), JSON.stringify(imported));
      this.lastError = null;
      return true;
    } catch (error) {
      this.lastError = { code: 'import_failed', message: error.message };
      return false;
    }
  }

  migrateSlot(data) {
    if (data.version === 1) {
      return {
        ...data,
        version: 2,
        worldData: {
          ...data.worldData,
          residentAgentSystem: data.worldData?.residentAgentSystem || { version: 1, recentEventsByResident: [] }
        }
      };
    }
    return data;
  }

  save(slotName, worldData) {
    const envelope = {
      version: SCHEMA_VERSION,
      savedAt: Date.now(),
      worldData
    };
    this.storage.setItem(this.makeKey(slotName), JSON.stringify(envelope));
    this.lastError = null;
    return envelope;
  }

  load(slotName) {
    const raw = this.storage.getItem(this.makeKey(slotName));
    if (!raw) return { loaded: false, error: 'not_found', message: '存档不存在' };
    try {
      let data = JSON.parse(raw);
      if (data.version > SCHEMA_VERSION) {
        return { loaded: false, error: 'future_version', message: `存档版本 ${data.version} 高于当前支持版本 ${SCHEMA_VERSION}` };
      }
      if (data.version < SCHEMA_VERSION) {
        data = this.migrateSlot(data);
      }
      this.lastError = null;
      return { loaded: true, data };
    } catch (error) {
      this.lastError = { code: 'load_failed', message: error.message };
      return { loaded: false, error: 'parse_failed', message: error.message };
    }
  }
}

export { slotKey };
