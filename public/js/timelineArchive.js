import { TIMELINE_ENDING_ART } from './timelineEndingManifest.js';

const LEVEL_NAMES = Object.freeze({
  'flood-village': '洪水村庄',
  'night-mine': '永夜矿井',
  'giant-city': '巨兽困城',
  'wordless-war': '失语战争',
  'memory-plague': '记忆瘟疫',
  'final-exam': '创世终考'
});

function stableHash(value) {
  const canonicalize = input => {
    if (Array.isArray(input)) return input.map(canonicalize);
    if (!input || typeof input !== 'object') return input;
    return Object.fromEntries(Object.keys(input).sort().map(key => [key, canonicalize(input[key])]));
  };
  const source = JSON.stringify(canonicalize(value));
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function cleanText(value, fallback = '') {
  return String(value || fallback).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

export class TimelineArchive {
  constructor(snapshot = {}) {
    this.snapshot = snapshot;
    this.seed = stableHash({
      levels: snapshot.levels || [],
      creations: (snapshot.creations || []).map(item => item.name || item.card?.name),
      residents: snapshot.rescuedResidents || [],
      air: snapshot.airCombatResult || null
    });
  }

  build() {
    const finalState = this.snapshot.finalState || this.snapshot.airCombatResult?.finalState || 'rift_open';
    const legacyBranch = this.snapshot.legacyBranch || this.snapshot.airCombatResult?.legacyBranch || 'standard';
    const anchors = this.buildAnchorCandidates();
    return {
      version: 1,
      timelineId: `CE-7D-${this.seed.toString(16).toUpperCase().padStart(8, '0').slice(-8)}`,
      observedTimelines: 7000000 + (this.seed % 3000000),
      reachedSeventhDay: 80 + (this.seed % 920),
      stableTimelines: finalState === 'cleansed' ? 1 : 0,
      timelineClass: this.timelineClass(finalState),
      legacyBranch,
      finalState,
      echoes: this.buildEchoes(),
      anchors,
      selectedAnchor: null,
      completed: false
    };
  }

  timelineClass(finalState) {
    return ({
      cleansed: 'first_stable',
      scarred_victory: 'scarred_survival',
      partial_seal: 'narrow_gate',
      rift_open: 'observer_legacy'
    })[finalState] || 'observer_legacy';
  }

  buildEchoes() {
    const levels = Array.isArray(this.snapshot.levels) ? this.snapshot.levels : [];
    return Object.keys(LEVEL_NAMES).map((levelId, index) => {
      const level = levels.find(entry => entry.levelId === levelId) || levels[index] || {};
      const variant = (this.seed + index + Number(level.lost || 0)) % 2;
      const lateTurn = Math.max(1, Number(level.turns || level.turn || 6) + 1);
      const rescued = Number(level.rescued || 0);
      const lost = Number(level.lost || 0);
      const texts = {
        'flood-village': variant ? '另一个世界抽干了洪水，却让土地再也长不出庄稼。' : `相邻记录慢了一个回合。第 ${lateTurn} 回合，通往高地的路已经消失。`,
        'night-mine': variant ? '矿井里的人走了出来，但黑暗也跟着他们一起离开。' : '那条记录没有找到能被世界承受的光，矿灯依次熄灭。',
        'giant-city': variant ? '城市活了下来，森林却在巨兽倒下后逐年枯萎。' : '另一位造物者选择了更快的答案，城墙外只剩沉默。',
        'wordless-war': variant ? '使者抵达中央时，双方已经忘记自己为何停战。' : '两名使者永远差一格，没有一句话越过边界。',
        'memory-plague': variant ? '太多世界的记忆同时涌入，幸存者再也分不清自己是谁。' : '所有人都活了下来，却没有任何人记得彼此。',
        'final-exam': variant ? '载体在最后一段航线坠落，黑匣子只送回了一次转向。' : '地面答案没有活过长夜，第七日从未在那条记录中到来。'
      };
      return {
        id: `${levelId}:${variant}`,
        levelId,
        title: `${LEVEL_NAMES[levelId]}：未抵达的记录`,
        text: texts[levelId],
        evidence: { rescued, lost, result: level.result || 'unknown' },
        art: TIMELINE_ENDING_ART.echoes[levelId][variant]
      };
    });
  }

  buildAnchorCandidates() {
    const candidates = [];
    const rescued = Array.isArray(this.snapshot.rescuedResidents) ? this.snapshot.rescuedResidents : [];
    const resident = rescued.find(item => item?.name) || null;
    if (resident) candidates.push({
      id: `resident:${cleanText(resident.id || resident.name)}`,
      kind: 'resident',
      title: cleanText(resident.name),
      description: '让一个具体的人，成为世界值得存在的证明。',
      art: TIMELINE_ENDING_ART.anchors.resident
    });

    const creations = Array.isArray(this.snapshot.creations) ? this.snapshot.creations : [];
    const creation = [...creations].reverse().find(item => item?.name || item?.card?.name) || null;
    if (creation) candidates.push({
      id: `creation:${cleanText(creation.id || creation.name || creation.card?.name)}`,
      kind: 'creation',
      title: cleanText(creation.name || creation.card?.name),
      description: '让一个本不可能存在的想法，穿过其他世界。',
      art: TIMELINE_ENDING_ART.anchors.creation
    });

    const oath = this.snapshot.nightWatchResult?.selectedBuff;
    if (oath?.name) candidates.push({
      id: `oath:${cleanText(oath.name)}`,
      kind: 'oath',
      title: cleanText(oath.name),
      description: '让长夜中的共同规则，成为后来世界的守望誓言。',
      art: TIMELINE_ENDING_ART.anchors.oath
    });

    const lost = Array.isArray(this.snapshot.lostResidents) ? this.snapshot.lostResidents : [];
    const sacrifice = lost.find(item => item?.name) || null;
    if (sacrifice) candidates.push({
      id: `sacrifice:${cleanText(sacrifice.id || sacrifice.name)}`,
      kind: 'sacrifice',
      title: cleanText(sacrifice.name),
      description: '不删除没有抵达终点的人，让成功永远记得代价。',
      art: TIMELINE_ENDING_ART.anchors.sacrifice
    });

    if (candidates.length < 3) candidates.push({
      id: 'memory:failed-records',
      kind: 'memory',
      title: '失败记录',
      description: '让失败本身成为航图，下一条时间线不必从零开始。',
      art: TIMELINE_ENDING_ART.anchors.memory
    });
    return candidates.slice(0, 4);
  }
}

export function buildTimelineArchive(snapshot) {
  return new TimelineArchive(snapshot).build();
}
