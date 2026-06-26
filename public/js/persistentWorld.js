// Persistent World System
// Cross-level persistent world state inspired by Wildermyth transformations
// and Crusader Kings 3 dynasty legacies

export const TRANSFORMATION_TYPES = {
  waterTouched: {
    id: 'waterTouched',
    name: '水之触',
    description: '被洪水吞噬但幸存，皮肤泛蓝，在水域中更加自如',
    effect: 'immune_to_water_loss',
    visual: 'blue_tint',
    trigger: 'survived_flood'
  },
  darkScarred: {
    id: 'darkScarred',
    name: '暗痕',
    description: '在黑暗中迷失后找回，眼中留下一抹暗影',
    effect: 'immune_to_dark_chaos',
    visual: 'dark_eyes',
    trigger: 'survived_darkness'
  },
  beastBonded: {
    id: 'beastBonded',
    name: '兽契',
    description: '被巨兽踩踏但存活，能感知巨兽的情绪',
    effect: 'beast_empathy',
    visual: 'beast_markings',
    trigger: 'survived_beast'
  },
  plagueResistant: {
    id: 'plagueResistant',
    name: '疫免',
    description: '抵抗过记忆瘟疫，心智更加坚韧',
    effect: 'chaos_resistance',
    visual: 'glow_aura',
    trigger: 'survived_plague'
  },
  warVeteran: {
    id: 'warVeteran',
    name: '战痕',
    description: '经历过战争的残酷，更懂得和平的珍贵',
    effect: 'extra_war_reduction',
    visual: 'battle_scars',
    trigger: 'survived_war'
  },
  creationTouched: {
    id: 'creationTouched',
    name: '造物之触',
    description: '被造物者的力量触碰过，移动速度略微提升',
    effect: 'move_speed_plus',
    visual: 'sparkle_particles',
    trigger: 'witnessed_creation'
  }
};

export const LEGACY_TRACKS = {
  humanitarian: {
    name: '人道主义',
    description: '累计救援生命，降低全局灾害扩散',
    levels: [
      { requirement: 5, effect: 'hazard_slow_10', label: '慈悲初心' },
      { requirement: 15, effect: 'hazard_slow_25', label: '救世之手' },
      { requirement: 30, effect: 'hazard_slow_50', label: '生命守护者' },
      { requirement: 50, effect: 'hazard_immunity', label: '不朽慈悲' }
    ]
  },
  creator: {
    name: '造物大师',
    description: '累计造物，增加造物持续时间',
    levels: [
      { requirement: 10, effect: 'duration_plus_1', label: '巧手' },
      { requirement: 30, effect: 'duration_plus_2', label: '匠魂' },
      { requirement: 60, effect: 'duration_plus_3', label: '创世者' },
      { requirement: 100, effect: 'permanent_creations', label: '永恒造物' }
    ]
  },
  harmony: {
    name: '和谐使者',
    description: '降低战争值，使者初始获得引导',
    levels: [
      { requirement: 5, effect: 'peace_boost_1', label: '调停者' },
      { requirement: 15, effect: 'peace_boost_2', label: '和平使者' },
      { requirement: 30, effect: 'peace_boost_3', label: '战争终结者' },
      { requirement: 50, effect: 'auto_peace', label: '和谐化身' }
    ]
  },
  survivor: {
    name: '幸存者',
    description: '经历损失后变得更强，单位获得紧急boost',
    levels: [
      { requirement: 3, effect: 'emergency_boost_10', label: '坚韧' },
      { requirement: 10, effect: 'emergency_boost_25', label: '不屈' },
      { requirement: 20, effect: 'emergency_boost_50', label: '浴火重生' },
      { requirement: 40, effect: 'death_defy', label: '向死而生' }
    ]
  },
  strategist: {
    name: '战略家',
    description: '完美通关获得策略加成',
    levels: [
      { requirement: 3, effect: 'extra_turn_1', label: '先见之明' },
      { requirement: 10, effect: 'extra_turn_2', label: '运筹帷幄' },
      { requirement: 20, effect: 'extra_turn_3', label: '算无遗策' },
      { requirement: 35, effect: 'foresight', label: '全知视角' }
    ]
  },
  explorer: {
    name: '探索者',
    description: '发现传说和秘密，解锁隐藏内容',
    levels: [
      { requirement: 3, effect: 'reveal_secret_1', label: '好奇' },
      { requirement: 10, effect: 'reveal_secret_2', label: '解谜者' },
      { requirement: 20, effect: 'reveal_secret_3', label: '真相追寻者' },
      { requirement: 40, effect: 'omniscience', label: '全视之眼' }
    ]
  },
  chaos: {
    name: '混沌行者',
    description: '高裂隙通关，获得混沌力量',
    levels: [
      { requirement: 3, effect: 'chaos_power_1', label: '裂隙触碰' },
      { requirement: 10, effect: 'chaos_power_2', label: '混沌使者' },
      { requirement: 20, effect: 'chaos_power_3', label: '裂隙之主' },
      { requirement: 40, effect: 'chaos_incarnate', label: '混沌化身' }
    ]
  },
  mentor: {
    name: '导师',
    description: '传承单位出现，获得教导加成',
    levels: [
      { requirement: 3, effect: 'legacy_boost_1', label: '引路人' },
      { requirement: 10, effect: 'legacy_boost_2', label: '传承守护者' },
      { requirement: 20, effect: 'legacy_boost_3', label: '先祖之声' },
      { requirement: 40, effect: 'ancestral_wisdom', label: '永恒导师' }
    ]
  },
  diplomat: {
    name: '外交家',
    description: '与NPC建立良好关系，获得对话加成',
    levels: [
      { requirement: 5, effect: 'dialogue_bonus_1', label: '善言者' },
      { requirement: 15, effect: 'dialogue_bonus_2', label: '说服者' },
      { requirement: 30, effect: 'dialogue_bonus_3', label: '心灵读者' },
      { requirement: 50, effect: 'mind_weaver', label: '意识编织者' }
    ]
  }
};

export class PersistentWorld {
  constructor() {
    this.worldEntropy = 0; // Global entropy that persists across levels
    this.biomeStates = new Map(); // Per-level terrain evolution
    this.npcEvolutions = new Map(); // NPC transformation history
    this.dynastyLegacies = new Map(); // Legacy track progress
    this.worldRenown = 0; // Global reputation currency
    this.levelHistory = []; // Completed level records
    this.persistentTerrain = new Map(); // Terrain changes that persist
    this.globalEvents = []; // World-wide events
  }

  // Record level completion and update persistent state
  recordLevelCompletion(levelId, result, stats) {
    const record = {
      levelId,
      result,
      stats: { ...stats },
      timestamp: Date.now(),
      transformations: [],
      legaciesProgressed: []
    };

    // Check for transformations based on level events
    if (stats.lost > 0) {
      const transformation = this.checkTransformation(levelId, stats);
      if (transformation) {
        record.transformations.push(transformation);
        this.applyTransformation(transformation);
      }
    }

    // Update legacy tracks
    const legacyUpdates = this.updateLegacyTracks(levelId, stats);
    record.legaciesProgressed = legacyUpdates;

    // Update world entropy
    this.worldEntropy += stats.entropy || 0;
    this.worldRenown += (stats.rescued || 0) * 10 + (stats.perfect ? 50 : 0);

    // Record persistent terrain changes
    this.recordTerrainChanges(levelId, stats.terrainChanges);

    this.levelHistory.push(record);
    return record;
  }

  checkTransformation(levelId, stats) {
    const triggerMap = {
      'flood-village': 'survived_flood',
      'night-mine': 'survived_darkness',
      'giant-city': 'survived_beast',
      'memory-plague': 'survived_plague',
      'wordless-war': 'survived_war',
      'final-exam': 'witnessed_creation'
    };

    const trigger = triggerMap[levelId];
    if (!trigger) return null;

    // Check if any unit matches the trigger condition
    for (const [id, type] of Object.entries(TRANSFORMATION_TYPES)) {
      if (type.trigger === trigger && Math.random() < 0.3) {
        return {
          type: id,
          name: type.name,
          description: type.description,
          effect: type.effect,
          visual: type.visual,
          levelId
        };
      }
    }
    return null;
  }

  applyTransformation(transformation) {
    if (!this.npcEvolutions.has(transformation.type)) {
      this.npcEvolutions.set(transformation.type, []);
    }
    this.npcEvolutions.get(transformation.type).push({
      ...transformation,
      acquiredAt: Date.now()
    });
  }

  updateLegacyTracks(levelId, stats) {
    const updates = [];

    // Humanitarian track
    if (stats.rescued > 0) {
      updates.push(this.progressTrack('humanitarian', stats.rescued));
    }

    // Creator track
    if (stats.creations > 0) {
      updates.push(this.progressTrack('creator', stats.creations));
    }

    // Harmony track
    if (stats.peaceTalks > 0) {
      updates.push(this.progressTrack('harmony', stats.peaceTalks));
    }

    // Survivor track
    if (stats.lost > 0) {
      updates.push(this.progressTrack('survivor', stats.lost));
    }

    // Strategist track
    if (stats.perfect) {
      updates.push(this.progressTrack('strategist', 1));
    }

    // Explorer track
    if (stats.secretsFound > 0) {
      updates.push(this.progressTrack('explorer', stats.secretsFound));
    }

    // Chaos track
    if (stats.entropy > 5) {
      updates.push(this.progressTrack('chaos', 1));
    }

    // Mentor track
    if (stats.legacyUnits > 0) {
      updates.push(this.progressTrack('mentor', stats.legacyUnits));
    }

    // Diplomat track
    if (stats.npcFriendships > 0) {
      updates.push(this.progressTrack('diplomat', stats.npcFriendships));
    }

    return updates.filter(u => u !== null);
  }

  progressTrack(trackId, amount) {
    const track = LEGACY_TRACKS[trackId];
    if (!track) return null;

    if (!this.dynastyLegacies.has(trackId)) {
      this.dynastyLegacies.set(trackId, { progress: 0, level: 0, unlocked: [] });
    }

    const legacy = this.dynastyLegacies.get(trackId);
    legacy.progress += amount;

    // Check for level up
    const nextLevel = track.levels[legacy.level];
    if (nextLevel && legacy.progress >= nextLevel.requirement) {
      legacy.level++;
      legacy.unlocked.push(nextLevel);
      return {
        track: trackId,
        newLevel: legacy.level,
        effect: nextLevel.effect,
        label: nextLevel.label
      };
    }

    return null;
  }

  recordTerrainChanges(levelId, changes) {
    if (!changes || changes.length === 0) return;

    if (!this.persistentTerrain.has(levelId)) {
      this.persistentTerrain.set(levelId, new Map());
    }

    const levelTerrain = this.persistentTerrain.get(levelId);
    for (const change of changes) {
      const key = `${change.x},${change.y}`;
      // Only record permanent changes (not temporary creations)
      if (change.permanent) {
        levelTerrain.set(key, {
          terrain: change.terrain,
          turn: change.turn,
          source: change.source
        });
      }
    }
  }

  // Apply persistent state when loading a level
  applyPersistentState(levelId, level) {
    // Apply terrain changes from previous visits
    const levelTerrain = this.persistentTerrain.get(levelId);
    if (levelTerrain) {
      for (const [key, change] of levelTerrain) {
        const [x, y] = key.split(',').map(Number);
        // Only apply if the level has been visited before
        if (this.levelHistory.some(r => r.levelId === levelId)) {
          // Modify the level's initial terrain
          // This would need to be integrated with the level loading system
        }
      }
    }

    // Apply legacy track effects
    const effects = this.getActiveLegacyEffects();
    return effects;
  }

  getActiveLegacyEffects() {
    const effects = [];
    for (const [trackId, legacy] of this.dynastyLegacies) {
      const track = LEGACY_TRACKS[trackId];
      if (track && legacy.level > 0) {
        const currentLevel = track.levels[Math.min(legacy.level - 1, track.levels.length - 1)];
        effects.push(currentLevel.effect);
      }
    }
    return effects;
  }

  // Get transformation effects for a unit
  getUnitTransformations() {
    const transformations = [];
    for (const [type, records] of this.npcEvolutions) {
      const transType = TRANSFORMATION_TYPES[type];
      if (transType) {
        transformations.push({
          ...transType,
          count: records.length
        });
      }
    }
    return transformations;
  }

  // Get world state summary
  getWorldSummary() {
    return {
      worldEntropy: this.worldEntropy,
      worldRenown: this.worldRenown,
      levelsCompleted: this.levelHistory.length,
      transformations: this.npcEvolutions.size,
      legacyTracks: Array.from(this.dynastyLegacies.entries()).map(([id, data]) => ({
        name: LEGACY_TRACKS[id]?.name || id,
        level: data.level,
        progress: data.progress
      })),
      activeEffects: this.getActiveLegacyEffects()
    };
  }

  // Serialize for save/load
  serialize() {
    return {
      worldEntropy: this.worldEntropy,
      worldRenown: this.worldRenown,
      biomeStates: Array.from(this.biomeStates.entries()),
      npcEvolutions: Array.from(this.npcEvolutions.entries()),
      dynastyLegacies: Array.from(this.dynastyLegacies.entries()),
      levelHistory: this.levelHistory,
      persistentTerrain: Array.from(this.persistentTerrain.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
      globalEvents: this.globalEvents
    };
  }

  deserialize(data) {
    if (!data) return;
    this.worldEntropy = data.worldEntropy || 0;
    this.worldRenown = data.worldRenown || 0;
    this.biomeStates = new Map(data.biomeStates || []);
    this.npcEvolutions = new Map(data.npcEvolutions || []);
    this.dynastyLegacies = new Map(data.dynastyLegacies || []);
    this.levelHistory = data.levelHistory || [];
    this.persistentTerrain = new Map(
      (data.persistentTerrain || []).map(([k, v]) => [k, new Map(v)])
    );
    this.globalEvents = data.globalEvents || [];
  }
}

// Export singleton
export const persistentWorld = new PersistentWorld();
