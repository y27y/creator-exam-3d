// Legacy System for Creator Exam 3D
// Inspired by Wildermyth - rescued units can appear in future levels with traits

export const TRAIT_POOL = {
  // 洪水相关
  flood_survivor: {
    id: 'flood_survivor',
    name: '洪灾幸存者',
    description: '经历过洪水的洗礼，在水域中不会迷失',
    effect: 'immune_to_water_loss',
    icon: '💧',
    rarity: 'common'
  },
  // 黑暗相关
  dark_walker: {
    id: 'dark_walker',
    name: '夜行者',
    description: '在黑暗中行走过，迷雾和黑暗不再使其混乱',
    effect: 'immune_to_dark_chaos',
    icon: '🌙',
    rarity: 'uncommon'
  },
  // 巨兽相关
  beast_friend: {
    id: 'beast_friend',
    name: '兽友',
    description: '与巨兽共存过，理解它们的语言',
    effect: 'beast_anger_slow',
    icon: '🐋',
    rarity: 'rare'
  },
  // 和平相关
  peacemaker: {
    id: 'peacemaker',
    name: '调停者',
    description: '见证过战争的残酷，更懂得和平的珍贵',
    effect: 'extra_war_reduction',
    icon: '🕊️',
    rarity: 'uncommon'
  },
  // 记忆相关
  memory_keeper: {
    id: 'memory_keeper',
    name: '守忆者',
    description: '抵抗过记忆瘟疫，心智更加坚韧',
    effect: 'chaos_resistance',
    icon: '📖',
    rarity: 'common'
  },
  // 创世相关
  creator_touched: {
    id: 'creator_touched',
    name: '造物之触',
    description: '被造物者的力量触碰过，移动速度略微提升',
    effect: 'move_speed_plus',
    icon: '✨',
    rarity: 'rare'
  },
  // 英雄特质
  hero_of_village: {
    id: 'hero_of_village',
    name: '村庄英雄',
    description: '独自拯救了一个村庄，获得所有人的尊敬',
    effect: 'guide_others',
    icon: '🏆',
    rarity: 'legendary'
  },
  // 牺牲特质
  sacrifice_bearer: {
    id: 'sacrifice_bearer',
    name: '牺牲者',
    description: '为了他人甘愿冒险，在危急时刻能激发潜能',
    effect: 'emergency_boost',
    icon: '🔥',
    rarity: 'epic'
  }
};

// 传承等级系统
export const LEGACY_TIERS = {
  survivor: {
    name: '幸存者',
    requirement: '被救援',
    probability: 0.5, // 50%出现在后续关卡
    bonus: null
  },
  hero: {
    name: '英雄',
    requirement: '被救援且本关无其他单位迷失',
    probability: 0.8,
    bonus: 'random_trait'
  },
  legend: {
    name: '传奇',
    requirement: '在3+关卡中被救援',
    probability: 1.0,
    bonus: 'choose_trait'
  },
  ancestor: {
    name: '先祖',
    requirement: '通关后仍存活',
    probability: 1.0,
    bonus: 'new_game_plus'
  }
};

export class LegacySystem {
  constructor() {
    this.legacyUnits = new Map(); // 存储传承单位
    this.globalTraits = new Set(); // 全局已解锁特质
    this.rescueHistory = []; // 救援历史
    this.levelCompletions = 0; // 完成关卡数
  }

  // 记录单位被救援
  recordRescue(unit, levelId, levelStats) {
    const rescueRecord = {
      unitId: unit.id,
      unitName: unit.name,
      unitType: unit.type,
      levelId,
      turn: levelStats.turn,
      maxTurns: levelStats.maxTurns,
      timestamp: Date.now(),
      perfect: levelStats.lost === 0
    };

    this.rescueHistory.push(rescueRecord);

    // 检查是否已存在该单位的传承记录
    let legacy = this.legacyUnits.get(unit.id);
    if (!legacy) {
      legacy = {
        id: unit.id,
        name: unit.name,
        type: unit.type,
        rescueCount: 0,
        levels: [],
        traits: [],
        tier: 'survivor',
        createdAt: Date.now()
      };
      this.legacyUnits.set(unit.id, legacy);
    }

    legacy.rescueCount++;
    legacy.levels.push(levelId);

    // 更新传承等级
    this.updateTier(legacy);

    // 如果是英雄级（完美救援），随机赋予特质
    if (rescueRecord.perfect && legacy.rescueCount === 1) {
      this.grantRandomTrait(legacy);
    }

    // 如果是传奇级，赋予额外特质
    if (legacy.rescueCount >= 3 && legacy.traits.length < 2) {
      this.grantRandomTrait(legacy);
    }

    return legacy;
  }

  // 更新传承等级
  updateTier(legacy) {
    if (legacy.rescueCount >= 3) {
      legacy.tier = 'legend';
    } else if (legacy.rescueCount >= 1 && legacy.levels.length >= 1) {
      // 检查是否有完美救援
      const hasPerfect = this.rescueHistory.some(
        r => r.unitId === legacy.id && r.perfect
      );
      if (hasPerfect) {
        legacy.tier = 'hero';
      }
    }
  }

  // 随机赋予特质
  grantRandomTrait(legacy) {
    const availableTraits = Object.values(TRAIT_POOL).filter(
      t => !legacy.traits.some(lt => lt.id === t.id)
    );
    if (availableTraits.length === 0) return;

    const trait = availableTraits[Math.floor(Math.random() * availableTraits.length)];
    legacy.traits.push({
      ...trait,
      grantedAt: Date.now(),
      level: legacy.levels.length
    });
    this.globalTraits.add(trait.id);
  }

  // 获取可用于下一关卡的传承NPC
  getNPCsForNextLevel(nextLevelId) {
    const npcs = [];

    for (const legacy of this.legacyUnits.values()) {
      const tier = LEGACY_TIERS[legacy.tier];
      if (!tier) continue;

      // 检查概率
      if (Math.random() < tier.probability) {
        // 检查是否已经在该关卡出现过
        if (!legacy.levels.includes(nextLevelId)) {
          npcs.push(this.createLegacyNPC(legacy, nextLevelId));
        }
      }
    }

    return npcs;
  }

  // 创建传承NPC实例
  createLegacyNPC(legacy, levelId) {
    const traitDescriptions = legacy.traits.map(t => t.description).join('；');
    const rescueStories = this.rescueHistory
      .filter(r => r.unitId === legacy.id)
      .map(r => {
        const levelNames = {
          'flood-village': '洪水村庄',
          'night-mine': '永夜矿井',
          'giant-city': '巨兽困城',
          'wordless-war': '失语战争',
          'memory-plague': '记忆瘟疫',
          'final-exam': '创世终考'
        };
        return `在${levelNames[r.levelId] || r.levelId}被救援（第${r.turn}/${r.maxTurns}回合）`;
      });

    return {
      id: `legacy-npc-${legacy.id}`,
      name: legacy.name,
      type: 'legacy',
      personality: '感恩、坚韧',
      speechStyle: '温暖而坚定，常提到过去的经历和未来的希望',
      memories: rescueStories,
      attitude: '友好',
      mood: '感激',
      location: this.generateNPCLocation(levelId),
      lore: `${legacy.name}曾被你在危难中救下，如今以${LEGACY_TIERS[legacy.tier].name}的身份再次出现。${traitDescriptions ? '特质：' + traitDescriptions : ''}`,
      traits: legacy.traits.map(t => t.id),
      isLegacy: true,
      legacyId: legacy.id,
      rescueCount: legacy.rescueCount,
      tier: legacy.tier,
      // NPC增益效果
      buffs: this.generateNPCBuffs(legacy.traits)
    };
  }

  // 生成NPC位置（根据关卡类型）
  generateNPCLocation(levelId) {
    const levelPositions = {
      'flood-village': [{ x: 2, y: 2 }, { x: 4, y: 4 }],
      'night-mine': [{ x: 1, y: 1 }, { x: 5, y: 5 }],
      'giant-city': [{ x: 3, y: 3 }, { x: 2, y: 4 }],
      'wordless-war': [{ x: 3, y: 2 }, { x: 4, y: 3 }],
      'memory-plague': [{ x: 3, y: 0 }, { x: 2, y: 2 }],
      'final-exam': [{ x: 3, y: 3 }, { x: 4, y: 4 }]
    };

    const positions = levelPositions[levelId] || [{ x: 3, y: 3 }];
    return positions[Math.floor(Math.random() * positions.length)];
  }

  // 生成NPC增益效果
  generateNPCBuffs(traits) {
    const buffs = [];
    for (const trait of traits) {
      switch (trait.effect) {
        case 'immune_to_water_loss':
          buffs.push({ type: 'water_protection', description: '水域保护' });
          break;
        case 'immune_to_dark_chaos':
          buffs.push({ type: 'dark_immunity', description: '黑暗免疫' });
          break;
        case 'beast_anger_slow':
          buffs.push({ type: 'beast_calm', description: '安抚巨兽' });
          break;
        case 'extra_war_reduction':
          buffs.push({ type: 'peace_boost', description: '和平加成' });
          break;
        case 'chaos_resistance':
          buffs.push({ type: 'chaos_resist', description: '混乱抵抗' });
          break;
        case 'move_speed_plus':
          buffs.push({ type: 'speed_boost', description: '移动加速' });
          break;
        case 'guide_others':
          buffs.push({ type: 'guidance', description: '引导他人' });
          break;
        case 'emergency_boost':
          buffs.push({ type: 'emergency', description: '危急加成' });
          break;
      }
    }
    return buffs;
  }

  // 获取可用于下一关卡的传承单位
  getUnitsForNextLevel(nextLevelId) {
    const candidates = [];

    for (const legacy of this.legacyUnits.values()) {
      const tier = LEGACY_TIERS[legacy.tier];
      if (!tier) continue;

      // 检查概率
      if (Math.random() < tier.probability) {
        // 检查是否已经在该关卡出现过
        if (!legacy.levels.includes(nextLevelId)) {
          candidates.push(this.createLegacyUnit(legacy, nextLevelId));
        }
      }
    }

    return candidates;
  }

  // 创建传承单位实例
  createLegacyUnit(legacy, levelId) {
    const unit = {
      id: `legacy-${legacy.id}-${Date.now()}`,
      name: legacy.name,
      type: legacy.type,
      status: 'active',
      rescued: false,
      lost: false,
      stunned: false,
      guidedTurns: 0,
      met: false,
      traits: legacy.traits.map(t => t.id),
      isLegacy: true,
      legacyId: legacy.id,
      rescueCount: legacy.rescueCount,
      tier: legacy.tier
    };

    // 应用特质效果
    for (const traitId of unit.traits) {
      this.applyTraitEffect(unit, traitId);
    }

    return unit;
  }

  // 应用特质效果到单位
  applyTraitEffect(unit, traitId) {
    const trait = TRAIT_POOL[traitId];
    if (!trait) return;

    switch (trait.effect) {
      case 'immune_to_water_loss':
        unit.immuneWater = true;
        break;
      case 'immune_to_dark_chaos':
        unit.immuneDark = true;
        break;
      case 'beast_anger_slow':
        unit.beastCalming = true;
        break;
      case 'extra_war_reduction':
        unit.peaceBonus = 1;
        break;
      case 'chaos_resistance':
        unit.chaosResist = 0.25; // 25%混乱概率减免
        break;
      case 'move_speed_plus':
        unit.moveSpeed = (unit.moveSpeed || 1) + 0.5;
        break;
      case 'guide_others':
        unit.canGuide = true;
        break;
      case 'emergency_boost':
        unit.emergencyBoost = true;
        break;
    }
  }

  // 获取传承统计
  getStats() {
    return {
      totalLegacyUnits: this.legacyUnits.size,
      totalRescues: this.rescueHistory.length,
      globalTraits: Array.from(this.globalTraits),
      tierDistribution: this.getTierDistribution(),
      completionProgress: this.calculateCompletion()
    };
  }

  getTierDistribution() {
    const dist = { survivor: 0, hero: 0, legend: 0, ancestor: 0 };
    for (const legacy of this.legacyUnits.values()) {
      dist[legacy.tier] = (dist[legacy.tier] || 0) + 1;
    }
    return dist;
  }

  calculateCompletion() {
    const totalTraits = Object.keys(TRAIT_POOL).length;
    const unlocked = this.globalTraits.size;
    return {
      traits: { unlocked, total: totalTraits, percentage: Math.round((unlocked / totalTraits) * 100) },
      ancestors: { current: this.legacyUnits.size, target: 20 }
    };
  }

  // 序列化
  serialize() {
    return {
      legacyUnits: Array.from(this.legacyUnits.entries()),
      globalTraits: Array.from(this.globalTraits),
      rescueHistory: this.rescueHistory,
      levelCompletions: this.levelCompletions
    };
  }

  // 反序列化
  deserialize(data) {
    if (!data) return;
    this.legacyUnits = new Map(data.legacyUnits || []);
    this.globalTraits = new Set(data.globalTraits || []);
    this.rescueHistory = data.rescueHistory || [];
    this.levelCompletions = data.levelCompletions || 0;
  }

  // 生成传承单位的故事
  generateLegacyStory(legacyId) {
    const legacy = this.legacyUnits.get(legacyId);
    if (!legacy) return null;

    const stories = [];
    for (let i = 0; i < legacy.levels.length; i++) {
      const level = legacy.levels[i];
      const rescue = this.rescueHistory.find(r => r.unitId === legacy.id && r.levelId === level);
      if (rescue) {
        stories.push({
          level,
          turn: rescue.turn,
          maxTurns: rescue.maxTurns,
          perfect: rescue.perfect,
          story: this.generateMicroStory(legacy, rescue, i + 1)
        });
      }
    }

    return {
      name: legacy.name,
      tier: LEGACY_TIERS[legacy.tier].name,
      rescueCount: legacy.rescueCount,
      traits: legacy.traits.map(t => t.name),
      stories
    };
  }

  generateMicroStory(legacy, rescue, chapter) {
    const templates = [
      `第${chapter}章：在${rescue.levelId}的危难中，${legacy.name}于第${rescue.turn}回合获救。`,
      `第${chapter}章：${rescue.perfect ? '完美' : '惊险'}的救援——${legacy.name}在${rescue.levelId}幸存。`,
      `第${chapter}章：${legacy.name}的故事在${rescue.levelId}继续，${rescue.turn}/${rescue.maxTurns}回合。`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
}

// 导出单例
export const legacySystem = new LegacySystem();
