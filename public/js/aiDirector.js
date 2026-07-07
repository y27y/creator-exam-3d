export const STORY_BEAT_TYPES = [
  'inciting_incident',
  'rising_action',
  'climax',
  'falling_action',
  'resolution',
  'twist',
  'character_moment',
  'world_reveal'
];

export class AIDirector {
  constructor(options = {}) {
    this.worldSimulation = options.worldSimulation;
    this.storyArcs = new Map();
    this.beatHistory = [];
    this.pacing = {
      minTurnsBetweenBeats: 3,
      maxBeatsPerRegion: 4,
      entropyThreshold: 5
    };
    this.narrativeProvider = options.narrativeProvider || null;
  }

  registerArc(arcId, config = {}) {
    this.storyArcs.set(arcId, {
      id: arcId,
      title: config.title || '未命名弧线',
      beats: config.beats || [],
      currentBeatIndex: 0,
      status: 'active',
      priority: config.priority || 0.5,
      triggerRegionId: config.triggerRegionId || null,
      requiredTags: config.requiredTags || []
    });
  }

  evaluateBeats(regionId, context = {}) {
    const beats = [];
    const turn = context.turn || 0;
    const entropy = context.entropy || 0;
    const recentBeats = this.beatHistory.filter(b => b.regionId === regionId);

    // Pacing gate
    if (recentBeats.length >= this.pacing.maxBeatsPerRegion) return beats;
    const lastBeat = recentBeats[recentBeats.length - 1];
    if (lastBeat && (turn - lastBeat.turn) < this.pacing.minTurnsBetweenBeats) return beats;

    for (const [arcId, arc] of this.storyArcs) {
      if (arc.status !== 'active') continue;
      if (arc.triggerRegionId && arc.triggerRegionId !== regionId) continue;

      const nextBeat = arc.beats[arc.currentBeatIndex];
      if (!nextBeat) continue;

      // Check entropy threshold for tension beats
      if (nextBeat.type === 'climax' && entropy < this.pacing.entropyThreshold) continue;

      beats.push({
        arcId,
        beatId: nextBeat.id,
        type: nextBeat.type,
        priority: arc.priority * (nextBeat.priority || 1),
        payload: nextBeat.payload || {}
      });
    }

    return beats.sort((a, b) => b.priority - a.priority);
  }

  async resolveBeat(beat, context = {}) {
    this.beatHistory.push({
      beatId: beat.beatId,
      arcId: beat.arcId,
      type: beat.type,
      regionId: context.regionId || 'unknown',
      turn: context.turn || 0,
      resolvedAt: Date.now()
    });

    // Advance arc
    const arc = this.storyArcs.get(beat.arcId);
    if (arc) {
      arc.currentBeatIndex += 1;
      if (arc.currentBeatIndex >= arc.beats.length) {
        arc.status = 'completed';
      }
    }

    // Generate narrative
    if (this.narrativeProvider) {
      try {
        const narrative = await this.narrativeProvider({
          type: beat.type,
          context: { ...context, beat }
        });
        return { ...beat, narrative, source: 'ai' };
      } catch (_error) {
        // Fall through to local
      }
    }

    // Local fallback narrative
    return {
      ...beat,
      narrative: this.generateLocalNarrative(beat, context),
      source: 'local'
    };
  }

  generateLocalNarrative(beat, context) {
    const templates = {
      inciting_incident: '在' + (context.regionId || '此地') + '出了岔子，事情拐了个弯。',
      rising_action: '越往后越紧，每一步都踩在刀刃上。',
      climax: '到了最要紧的关头，撑住撑不住就看这一下。',
      falling_action: '风头过去了，可后头的乱子还没完。',
      resolution: '这一段算是了了，下一段还没起头。',
      twist: '半路杀出一手，把所有人的盘算都打乱了。',
      character_moment: '有个人的底，到这会儿才露出来。',
      world_reveal: '世界藏着的底细，一点点透出来了。'
    };
    return templates[beat.type] || '事情还在往前走。';
  }

  getActiveArcs() {
    return Array.from(this.storyArcs.values()).filter(arc => arc.status === 'active');
  }

  getArcSummary() {
    return {
      activeArcs: this.getActiveArcs().length,
      completedArcs: Array.from(this.storyArcs.values()).filter(arc => arc.status === 'completed').length,
      totalBeats: this.beatHistory.length,
      recentBeats: this.beatHistory.slice(-5)
    };
  }

  serialize() {
    return {
      version: 1,
      storyArcs: Array.from(this.storyArcs.entries()),
      beatHistory: this.beatHistory,
      pacing: this.pacing
    };
  }

  deserialize(data = {}) {
    this.storyArcs = new Map();
    if (Array.isArray(data.storyArcs)) {
      for (const [key, value] of data.storyArcs) {
        this.storyArcs.set(key, {
          id: value.id || key,
          title: value.title || '未命名弧线',
          beats: value.beats || [],
          currentBeatIndex: value.currentBeatIndex || 0,
          status: value.status || 'active',
          priority: value.priority || 0.5,
          triggerRegionId: value.triggerRegionId || null,
          requiredTags: value.requiredTags || []
        });
      }
    }
    this.beatHistory = Array.isArray(data.beatHistory) ? data.beatHistory : [];
    if (data.pacing) this.pacing = { ...this.pacing, ...data.pacing };
  }
}
