// AI Storyteller System
// Inspired by RimWorld's AI Storytellers
// Dynamically adjusts event probability based on game state

export const STORYTELLER_PERSONALITIES = {
  cassandra: {
    name: '卡珊德拉',
    description: '经典叙事弧：张力上升→事件→缓解',
    style: 'dramatic',
    tensionCurve: 'sine', // 正弦波张力曲线
    helpThreshold: 0.3,   // 安全值低于30%时提供帮助
    challengeThreshold: 0.7 // 安全值高于70%时增加挑战
  },
  phoebe: {
    name: '菲比',
    description: '温和叙述者：只在玩家很安全时触发事件',
    style: 'gentle',
    tensionCurve: 'flat',
    helpThreshold: 0.5,
    challengeThreshold: 0.9
  },
  randy: {
    name: '兰迪',
    description: '完全随机：任何事情都可能随时发生',
    style: 'chaotic',
    tensionCurve: 'random',
    helpThreshold: 0.0,
    challengeThreshold: 0.0
  },
  narrator: {
    name: '说书人',
    description: '基于玩家行为历史调整事件',
    style: 'adaptive',
    tensionCurve: 'adaptive',
    helpThreshold: 0.4,
    challengeThreshold: 0.8
  }
};

export class Storyteller {
  constructor(personality = 'cassandra') {
    this.personality = STORYTELLER_PERSONALITIES[personality] || STORYTELLER_PERSONALITIES.cassandra;
    this.tension = 0.5; // 0-1, current narrative tension
    this.lastEventTurn = 0;
    this.eventHistory = [];
    this.playerBehaviorHistory = [];
  }

  // Analyze current game state
  analyzeState(game) {
    const totalUnits = game.units.length;
    const activeUnits = game.units.filter(u => u.status === 'active').length;
    const rescued = game.rescued;
    const lost = game.lost;

    // Calculate safety metric (0-1)
    const safety = totalUnits > 0 ? (activeUnits + rescued) / (totalUnits + rescued) : 0;

    // Calculate resource pressure (0-1)
    const resourcePressure = game.entropy / (game.level.entropyLimit || 7);

    // Calculate time pressure (0-1)
    const timePressure = game.turn / (game.level.maxTurns || 10);

    // Calculate creation diversity
    const uniqueAbilities = new Set(game.creations.map(c => c.card.ability)).size;
    const creationDiversity = game.creations.length > 0 ? uniqueAbilities / game.creations.length : 0;

    return {
      safety,
      resourcePressure,
      timePressure,
      creationDiversity,
      activeUnits,
      lost,
      rescued,
      turn: game.turn,
      gameState: game.gameState
    };
  }

  // Calculate narrative tension based on personality
  calculateTension(state) {
    const p = this.personality;

    switch (p.tensionCurve) {
      case 'sine':
        // Classic dramatic arc: tension oscillates
        return 0.5 + 0.5 * Math.sin(state.turn * 0.3);

      case 'flat':
        // Gentle: low tension, slowly increasing
        return 0.3 + state.timePressure * 0.3;

      case 'random':
        // Chaotic: random tension
        return Math.random();

      case 'adaptive':
        // Adaptive based on player skill
        const skill = this.estimatePlayerSkill();
        return 0.3 + skill * 0.7;

      default:
        return 0.5;
    }
  }

  // Estimate player skill based on behavior history
  estimatePlayerSkill() {
    if (this.playerBehaviorHistory.length < 3) return 0.5;

    const recent = this.playerBehaviorHistory.slice(-5);
    const successRate = recent.filter(r => r.success).length / recent.length;
    const efficiency = recent.reduce((sum, r) => sum + (r.turnsUsed / r.maxTurns), 0) / recent.length;

    // Higher skill = higher success rate, lower resource usage
    return (successRate * 0.6 + (1 - efficiency) * 0.4);
  }

  // Record player behavior for adaptive storytelling
  recordBehavior(game, eventType) {
    this.playerBehaviorHistory.push({
      turn: game.turn,
      success: game.gameState === 'won',
      turnsUsed: game.turn,
      maxTurns: game.level.maxTurns,
      creationsUsed: game.creations.length,
      entropy: game.entropy,
      eventType
    });

    // Keep only last 20 records
    if (this.playerBehaviorHistory.length > 20) {
      this.playerBehaviorHistory = this.playerBehaviorHistory.slice(-20);
    }
  }

  // Decide whether to trigger an event
  shouldTriggerEvent(game) {
    const state = this.analyzeState(game);
    const p = this.personality;

    // Don't trigger if game is over
    if (state.gameState !== 'playing') return false;

    // Minimum cooldown between events
    if (game.turn - this.lastEventTurn < 2) return false;

    // Calculate tension
    this.tension = this.calculateTension(state);

    switch (p.style) {
      case 'dramatic':
        // Cassandra: trigger when tension is high or state is extreme
        return this.tension > 0.7 || state.safety < 0.3 || state.safety > 0.8;

      case 'gentle':
        // Phoebe: only trigger when player is very safe
        return state.safety > p.challengeThreshold && game.turn - this.lastEventTurn > 3;

      case 'chaotic':
        // Randy: random chance
        return Math.random() < 0.15;

      case 'adaptive':
        // Narrator: based on player skill
        const skill = this.estimatePlayerSkill();
        if (skill > 0.7) {
          // Skilled player: more challenges
          return state.safety > 0.6 || Math.random() < 0.2;
        } else if (skill < 0.3) {
          // Struggling player: more help
          return state.safety < 0.4 || Math.random() < 0.15;
        } else {
          return Math.random() < 0.1;
        }

      default:
        return false;
    }
  }

  // Select appropriate event type
  selectEvent(game) {
    const state = this.analyzeState(game);
    const p = this.personality;

    // Event pool
    const events = {
      help: [
        { name: '村民顿悟', effect: 'guidance', weight: 3 },
        { name: '巨兽犹豫', effect: 'beastStunned', weight: 2 },
        { name: '奇迹共鸣', effect: 'resonanceBoost', weight: 2 },
        { name: '风向改变', effect: 'hazardRedirect', weight: 1 }
      ],
      challenge: [
        { name: '突发暴雨', effect: 'floodSpread', weight: 3 },
        { name: '地震', effect: 'terrainChange', weight: 2 },
        { name: '裂隙波动', effect: 'entropyFluctuation', weight: 2 }
      ],
      neutral: [
        { name: '环境变化', effect: 'atmosphereChange', weight: 1 },
        { name: 'NPC对话', effect: 'npcDialogue', weight: 1 }
      ]
    };

    let pool;
    if (state.safety < p.helpThreshold) {
      // Player struggling: more help events
      pool = [...events.help, ...events.neutral];
    } else if (state.safety > p.challengeThreshold) {
      // Player doing well: more challenge events
      pool = [...events.challenge, ...events.neutral];
    } else {
      // Balanced: mix of all
      pool = [...events.help, ...events.challenge, ...events.neutral];
    }

    // Weighted random selection
    const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;

    for (const event of pool) {
      random -= event.weight;
      if (random <= 0) return event;
    }

    return pool[0];
  }

  // Generate narrative text for the event
  generateNarrative(event, game) {
    const narratives = {
      guidance: [
        '迷雾中传来古老的歌谣，为迷失者指引方向...',
        '一个模糊的记忆突然变得清晰，正确的道路浮现眼前...',
        '仿佛有人在耳边低语：往这边走...'
      ],
      beastStunned: [
        '巨兽突然停下脚步，仿佛在倾听什么...',
        '一阵奇异的光芒让巨兽犹豫了...',
        '巨兽的眼中闪过一丝迷茫...'
      ],
      resonanceBoost: [
        '你的造物之间产生了奇妙的共鸣，力量增强了...',
        '空气中弥漫着魔法的波动，造物的效果扩大了...',
        '世界回应了你的创造，奇迹正在发生...'
      ],
      hazardRedirect: [
        '风向突然改变，灾害的蔓延方向偏移了...',
        '一股神秘的力量引导着灾害流向别处...',
        '自然的节奏被打乱，危机暂时缓解...'
      ],
      floodSpread: [
        '天空突然阴沉，暴雨倾盆而下...',
        '远处的河流决堤，洪水正在逼近...',
        '大地在颤抖，水源从地下涌出...'
      ],
      terrainChange: [
        '地面突然震动，周围的地形发生了变化...',
        '一道裂缝出现在大地上，改变了周围的环境...',
        '古老的魔法唤醒了沉睡的地形...'
      ],
      entropyFluctuation: [
        '世界裂隙在颤动，不稳定的力量正在泄漏...',
        '空气中弥漫着裂隙的能量，现实变得扭曲...',
        '造物的力量引起了世界的共鸣，裂隙扩大了...'
      ],
      atmosphereChange: [
        '周围的氛围悄然改变...',
        '空气中弥漫着新的气息...',
        '环境在无声中发生了变化...'
      ],
      npcDialogue: [
        '附近的NPC似乎有话要说...',
        '一个身影在远处注视着你...',
        '风中传来低语，有人在呼唤...'
      ]
    };

    const pool = narratives[event.effect] || ['Something happened...'];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Main method: trigger storytelling event
  tellStory(game, aiMemory = null) {
    if (!this.shouldTriggerEvent(game)) return null;

    // Use adaptive event selection if aiMemory is available
    const event = aiMemory ? this.generateAdaptiveEvent(game, aiMemory) : this.selectEvent(game);
    if (!event) return null;

    const narrative = this.generateNarrative(event, game);

    // Apply adaptive effects if aiMemory is available
    if (aiMemory && event.severity) {
      this.applyAdaptiveEvent(game, event, aiMemory);
    }

    this.lastEventTurn = game.turn;
    this.eventHistory.push({
      turn: game.turn,
      event: event.name,
      effect: event.effect,
      narrative,
      tension: this.tension
    });

    return {
      event,
      narrative,
      tension: this.tension
    };
  }

  // Deep integration with AIMemory - analyze player history for adaptive storytelling
  analyzePlayerHistory(aiMemory) {
    if (!aiMemory) return null;
    const profile = aiMemory.getPlayerProfile ? aiMemory.getPlayerProfile() : null;
    if (!profile) return null;

    const levels = aiMemory.levelHistory || [];
    const creations = aiMemory.creationHistory || [];

    // Calculate player skill trajectory
    const recentLevels = levels.slice(-3);
    const improving = recentLevels.length >= 2 &&
      recentLevels[recentLevels.length - 1].rescued > recentLevels[0].rescued;
    const struggling = recentLevels.length >= 2 &&
      recentLevels[recentLevels.length - 1].lost > recentLevels[0].lost;

    // Detect patterns
    const patterns = {
      overusesSameAbility: Object.values(profile.favoriteAbilities || {}).some(c => c > 5),
      avoidsRisk: profile.riskTolerance < 0.3,
      highEmpathy: profile.empathyScore > 0.8,
      creativePlayer: profile.averageCreativity > 70,
      perfectionist: profile.winRate > 0.8 && profile.totalLost === 0,
      struggling: profile.winRate < 0.4
    };

    return {
      profile,
      improving,
      struggling,
      patterns,
      recentLevels,
      totalCreations: creations.length
    };
  }

  // Generate adaptive event based on player history
  generateAdaptiveEvent(game, aiMemory) {
    const history = this.analyzePlayerHistory(aiMemory);
    if (!history) return this.selectEvent(game);

    const state = this.analyzeState(game);
    const p = this.personality;

    // Override based on player patterns
    if (history.patterns.perfectionist && p.style === 'dramatic') {
      // Perfectionists get subtle challenges to break their comfort zone
      if (state.safety > 0.9 && Math.random() < 0.3) {
        return {
          name: '意外变数',
          description: '世界似乎想测试你是否能应对不完美',
          effect: 'minorSetback',
          severity: 'low',
          weight: 2
        };
      }
    }

    if (history.patterns.struggling && state.safety < 0.5) {
      // Struggling players get help when things are dire
      return {
        name: '一线希望',
        description: '在最黑暗的时刻，奇迹出现了',
        effect: 'miracleHelp',
        severity: 'helpful',
        weight: 3
      };
    }

    if (history.patterns.highEmpathy && state.lost > 0) {
      // Empathetic players get narrative events when they lose units
      return {
        name: '逝者之声',
        description: '失去的生命在记忆中低语，给予你力量',
        effect: 'memorialBoost',
        severity: 'narrative',
        weight: 2
      };
    }

    if (history.patterns.creativePlayer && state.creationDiversity < 0.5) {
      // Creative players get encouraged to diversify
      return {
        name: '灵感闪现',
        description: '你的创造力在呼唤新的可能性',
        effect: 'creativityBoost',
        severity: 'helpful',
        weight: 2
      };
    }

    if (history.improving && state.timePressure > 0.7) {
      // Improving players get confidence-building events
      return {
        name: '成长之证',
        description: '你的进步被世界看在眼里',
        effect: 'confidenceBoost',
        severity: 'helpful',
        weight: 2
      };
    }

    return this.selectEvent(game);
  }

  // Apply adaptive event effects
  applyAdaptiveEvent(game, event, aiMemory) {
    const history = this.analyzePlayerHistory(aiMemory);

    switch (event.effect) {
      case 'minorSetback': {
        // Small challenge that doesn't break perfection but tests adaptability
        if (game.entropy > 0) {
          game.entropy += 1;
          game.log(`【叙事事件】${event.name}：世界裂隙轻微波动 (+1)`);
        }
        break;
      }
      case 'miracleHelp': {
        // Give a small boost to struggling players
        const civilians = game.units.filter(u => game.isCivilian(u) && u.status === 'active');
        if (civilians.length > 0) {
          const target = civilians[Math.floor(Math.random() * civilians.length)];
          target.guidedTurns = Math.max(target.guidedTurns, 2);
          game.log(`【叙事事件】${event.name}：${target.name} 突然看到了希望的光芒`);
        }
        break;
      }
      case 'memorialBoost': {
        // Narrative boost for empathetic players
        game.miraclePoints = Math.min(game.miraclePoints + 1, game.level.miraclePoints || 10);
        game.log(`【叙事事件】${event.name}：记忆化为力量，奇迹点 +1`);
        break;
      }
      case 'creativityBoost': {
        // Encourage creative players
        game.creationCharges = Math.min(game.creationCharges + 1, game.level.creationCharges + 2);
        game.log(`【叙事事件】${event.name}：新的造物灵感涌现，造物次数 +1`);
        break;
      }
      case 'confidenceBoost': {
        // Boost for improving players
        game.level.maxTurns += 1;
        game.log(`【叙事事件】${event.name}：世界为你的成长让出更多时间 (+1回合)`);
        break;
      }
      default:
        return false;
    }
    return true;
  }

  // Generate personalized narrative based on player history
  tellPersonalizedStory(game, aiMemory) {
    const history = this.analyzePlayerHistory(aiMemory);
    const state = this.analyzeState(game);

    if (!history) return this.tellStory(game);

    const p = this.personality;
    let narrative = '';

    // Opening based on player style
    if (history.patterns.creativePlayer) {
      narrative += `你的造物风格独特，世界正在学习你的语言。`;
    } else if (history.patterns.highEmpathy) {
      narrative += `你对生命的珍视，让裂隙之地感受到了温暖。`;
    } else if (history.patterns.avoidsRisk) {
      narrative += `你的谨慎让每一步都踏实，但世界也在等待你大胆的瞬间。`;
    }

    // Middle based on current state
    if (state.safety < 0.3) {
      narrative += `危险正在逼近，但${history.improving ? '你已经证明过自己' : '希望依然存在'}。`;
    } else if (state.safety > 0.8) {
      narrative += `一切似乎顺利，但${p.style === 'dramatic' ? '平静往往预示着风暴' : '不要掉以轻心'}。`;
    }

    // Closing based on personality
    if (p.style === 'dramatic') {
      narrative += `故事的下一章，由你书写。`;
    } else if (p.style === 'gentle') {
      narrative += `无论发生什么，世界相信你的选择。`;
    } else if (p.style === 'chaotic') {
      narrative += `谁知道接下来会发生什么？`;
    } else {
      narrative += `你的故事，正在被记住。`;
    }

    return narrative;
  }

  // Get narrative context for AI prompts
  getNarrativeContext(game, aiMemory) {
    const history = this.analyzePlayerHistory(aiMemory);
    const state = this.analyzeState(game);

    if (!history) {
      return {
        tension: this.tension,
        safety: state.safety,
        turn: game.turn,
        style: this.personality.style
      };
    }

    return {
      tension: this.tension,
      safety: state.safety,
      turn: game.turn,
      style: this.personality.style,
      playerProfile: {
        playStyle: history.profile.playStyle,
        winRate: history.profile.winRate,
        empathyScore: history.profile.empathyScore,
        riskTolerance: history.profile.riskTolerance,
        improving: history.improving,
        struggling: history.struggling
      },
      recentEvents: this.eventHistory.slice(-3),
      narrativeArc: this.calculateNarrativeArc(history)
    };
  }

  calculateNarrativeArc(history) {
    const levels = history.recentLevels;
    if (levels.length < 2) return 'beginning';

    const wins = levels.filter(l => l.result === 'won').length;
    const losses = levels.filter(l => l.result === 'lost').length;

    if (losses === 0) return 'ascending';
    if (wins === 0) return 'descending';
    if (wins > losses) return 'recovering';
    return 'struggling';
  }

  // Original tellStory method (kept for backward compatibility)
  tellStoryLegacy(game) {
    if (!this.shouldTriggerEvent(game)) return null;

    const event = this.selectEvent(game);
    if (!event) return null;

    const narrative = this.generateNarrative(event, game);

    this.lastEventTurn = game.turn;
    this.eventHistory.push({
      turn: game.turn,
      event: event.name,
      effect: event.effect,
      narrative,
      tension: this.tension
    });

    return {
      event,
      narrative,
      tension: this.tension
    };
  }

  // Get storytelling statistics
  getStats() {
    return {
      personality: this.personality.name,
      eventsTriggered: this.eventHistory.length,
      averageTension: this.eventHistory.length > 0
        ? this.eventHistory.reduce((sum, e) => sum + e.tension, 0) / this.eventHistory.length
        : 0,
      lastEventTurn: this.lastEventTurn,
      playerSkill: this.estimatePlayerSkill()
    };
  }

  // Serialize for save/load
  serialize() {
    return {
      personality: this.personality.name,
      tension: this.tension,
      lastEventTurn: this.lastEventTurn,
      eventHistory: this.eventHistory,
      playerBehaviorHistory: this.playerBehaviorHistory
    };
  }

  deserialize(data) {
    if (!data) return;
    this.personality = STORYTELLER_PERSONALITIES[data.personality] || STORYTELLER_PERSONALITIES.cassandra;
    this.tension = data.tension || 0.5;
    this.lastEventTurn = data.lastEventTurn || 0;
    this.eventHistory = data.eventHistory || [];
    this.playerBehaviorHistory = data.playerBehaviorHistory || [];
  }
}

// Default storyteller instance
export const defaultStoryteller = new Storyteller('cassandra');

// CommonJS compatibility for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Storyteller, STORYTELLER_PERSONALITIES, defaultStoryteller };
}
