// AI Storyteller System
// Inspired by RimWorld's AI Storytellers
// Dynamically adjusts event probability based on game state

export const STORYTELLER_PERSONALITIES = {
  cassandra: {
    name: '卡珊德拉',
    description: '讲究起承转合：绷紧，出事，再松开',
    style: 'dramatic',
    tensionCurve: 'sine', // 正弦波张力曲线
    helpThreshold: 0.3,   // 安全值低于30%时提供帮助
    challengeThreshold: 0.7 // 安全值高于70%时增加挑战
  },
  phoebe: {
    name: '菲比',
    description: '心软：只有你安稳了，才肯添些事',
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
    description: '看人下菜：照着你走过的路，安排下一着',
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

  setPersonality(personality) {
    this.personality = STORYTELLER_PERSONALITIES[personality] || STORYTELLER_PERSONALITIES.cassandra;
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
    if (!game) return;
    this.playerBehaviorHistory.push({
      turn: game.turn || 0,
      success: game.gameState === 'won',
      turnsUsed: game.turn || 0,
      maxTurns: (game.level && game.level.maxTurns) || 10,
      creationsUsed: Array.isArray(game.creations) ? game.creations.length : 0,
      entropy: game.entropy || 0,
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
        { name: '村民想通', effect: 'guidance', weight: 3 },
        { name: '巨兽停步', effect: 'beastStunned', weight: 2 },
        { name: '造物相和', effect: 'resonanceBoost', weight: 2 },
        { name: '风转了向', effect: 'hazardRedirect', weight: 1 }
      ],
      challenge: [
        { name: '忽来暴雨', effect: 'floodSpread', weight: 3 },
        { name: '地动', effect: 'terrainChange', weight: 2 },
        { name: '裂隙发颤', effect: 'entropyFluctuation', weight: 2 }
      ],
      neutral: [
        { name: '景物变了', effect: 'atmosphereChange', weight: 1 },
        { name: '有人开口', effect: 'npcDialogue', weight: 1 }
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
        '雾里有歌声，断断续续，像谁在喊人回家。',
        '一段记不起来的路，忽然就想明白了。',
        '耳根底下有人说话：往这边。'
      ],
      beastStunned: [
        '巨兽忽然站住了，像是在听什么。',
        '一道光晃过去，巨兽迟疑了。',
        '巨兽眼里泛起一层懵，脚步慢下来。'
      ],
      resonanceBoost: [
        '几个造物撞在一块，劲头反倒更大了。',
        '造物彼此应和，作用的地界宽了一圈。',
        '世界接了你的话，奇迹往下生了。'
      ],
      hazardRedirect: [
        '风改了向，灾往旁边歪过去了。',
        '不知什么力道，把灾引到了别处。',
        '势头一乱，眼前的险先缓了口气。'
      ],
      floodSpread: [
        '天说阴就阴，雨兜头浇下来。',
        '上游的堤开了，水正往这边赶。',
        '地发着抖，水从底下冒上来。'
      ],
      terrainChange: [
        '地晃了一下，跟前的东西挪了位。',
        '地上裂开一道口子，周遭全变了样。',
        '不知什么旧力醒了，地把脸换了一副。'
      ],
      entropyFluctuation: [
        '裂隙在抖，里头的力道往外渗。',
        '裂隙的劲儿散在空气里，眼前的景走样了。',
        '造物惊动了世界，裂隙又宽了一分。'
      ],
      atmosphereChange: [
        '周遭的气变了，说不上来哪儿不对。',
        '空气里多了股味儿，生分的。',
        '没声没响的，跟前的东西就不一样了。'
      ],
      npcDialogue: [
        '跟前的人像是有话。',
        '远处有个影子，正望着你这边。',
        '风里有人喊，听不真切。'
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
          name: '横生枝节',
          description: '世界想看看，你能不能接住不圆满',
          effect: 'minorSetback',
          severity: 'low',
          weight: 2
        };
      }
    }

    if (history.patterns.struggling && state.safety < 0.5) {
      // Struggling players get help when things are dire
      return {
          name: '一线生机',
          description: '最黑的那阵，偏有光照进来',
        effect: 'miracleHelp',
        severity: 'helpful',
        weight: 3
      };
    }

    if (history.patterns.highEmpathy && state.lost > 0) {
      // Empathetic players get narrative events when they lose units
      return {
          name: '旧人开口',
          description: '走掉的人在记忆里说话，给你添了把劲',
        effect: 'memorialBoost',
        severity: 'narrative',
        weight: 2
      };
    }

    if (history.patterns.creativePlayer && state.creationDiversity < 0.5) {
      // Creative players get encouraged to diversify
      return {
          name: '灵感来了',
          description: '你心里那股造的劲儿，在催你换花样',
        effect: 'creativityBoost',
        severity: 'helpful',
        weight: 2
      };
    }

    if (history.improving && state.timePressure > 0.7) {
      // Improving players get confidence-building events
      return {
          name: '看出长进',
          description: '你长进了，世界看得见',
        effect: 'confidenceBoost',
        severity: 'helpful',
        weight: 2
      };
    }

    return this.selectEvent(game);
  }

  // Apply adaptive event effects
  applyAdaptiveEvent(game, event, aiMemory) {
    if (!game || !event) return false;

    switch (event.effect) {
      case 'minorSetback': {
        // Small challenge that doesn't break perfection but tests adaptability
        if (game.entropy > 0) {
          game.entropy += 1;
          if (typeof game.log === 'function') {
            game.log(`【叙事事件】${event.name}：裂隙轻轻抖了一下 (+1)`);
          }
        }
        break;
      }
      case 'miracleHelp': {
        // Give a small boost to struggling players
        const civilians = game.units.filter(u => game.isCivilian(u) && u.status === 'active');
        if (civilians.length > 0) {
          const target = civilians[Math.floor(Math.random() * civilians.length)];
          target.guidedTurns = Math.max(target.guidedTurns, 2);
          if (typeof game.log === 'function') {
            game.log(`【叙事事件】${event.name}：${target.name} 眼里突然有了光`);
          }
        }
        break;
      }
      case 'memorialBoost': {
        // Narrative boost for empathetic players
        const maxMiracle = (game.level && game.level.miraclePoints) || 10;
        if (typeof game.miraclePoints === 'number') {
          game.miraclePoints = Math.min(game.miraclePoints + 1, maxMiracle);
        }
        if (typeof game.log === 'function') {
          game.log(`【叙事事件】${event.name}：记忆成了力气，奇迹点 +1`);
        }
        break;
      }
      case 'creativityBoost': {
        // Encourage creative players
        const maxCharges = ((game.level && game.level.creationCharges) || 0) + 2;
        if (typeof game.creationCharges === 'number') {
          game.creationCharges = Math.min(game.creationCharges + 1, maxCharges);
        }
        if (typeof game.log === 'function') {
          game.log(`【叙事事件】${event.name}：新的造物主意冒出来，造物次数 +1`);
        }
        break;
      }
      case 'confidenceBoost': {
        // Boost for improving players
        if (game.level && typeof game.level.maxTurns === 'number') {
          game.level.maxTurns += 1;
        }
        if (typeof game.log === 'function') {
          game.log(`【叙事事件】${event.name}：世界给你多让了一手 (+1回合)`);
        }
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
      narrative += `你造东西的路数独一份，世界正学着听懂你。`;
    } else if (history.patterns.highEmpathy) {
      narrative += `你把命当命，裂隙那头也觉出点暖意。`;
    } else if (history.patterns.avoidsRisk) {
      narrative += `你步步踩实，可世界也等着你豁出去那一回。`;
    }

    // Middle based on current state
    if (state.safety < 0.3) {
      narrative += `险就在跟前，但${history.improving ? '你已经撑过来过' : '还留着一口气'}。`;
    } else if (state.safety > 0.8) {
      narrative += `眼下还算顺，可${p.style === 'dramatic' ? '太平日子后头常跟着事' : '别太松心'}。`;
    }

    // Closing based on personality
    if (p.style === 'dramatic') {
      narrative += `往下怎么走，笔在你手里。`;
    } else if (p.style === 'gentle') {
      narrative += `不管出什么事，世界信你这着。`;
    } else if (p.style === 'chaotic') {
      narrative += `接下来会怎样？谁也说不准。`;
    } else {
      narrative += `你走过的路，有人记着。`;
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
    const personalityKey = Object.entries(STORYTELLER_PERSONALITIES)
      .find(([, value]) => value === this.personality || value.name === this.personality.name)?.[0] || 'cassandra';
    return {
      personality: personalityKey,
      tension: this.tension,
      lastEventTurn: this.lastEventTurn,
      eventHistory: this.eventHistory,
      playerBehaviorHistory: this.playerBehaviorHistory
    };
  }

  deserialize(data) {
    if (!data) return;
    const personality = STORYTELLER_PERSONALITIES[data.personality] ||
      Object.values(STORYTELLER_PERSONALITIES).find(p => p.name === data.personality);
    this.personality = personality || STORYTELLER_PERSONALITIES.cassandra;
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
