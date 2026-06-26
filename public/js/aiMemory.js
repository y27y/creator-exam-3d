// AI Memory System - Tracks player behavior, creations, and generates personalized narratives
// Inspired by AI-driven game narrative systems and emergent storytelling

export class AIMemorySystem {
  constructor() {
    this.playerProfile = {
      totalCreations: 0,
      totalRescued: 0,
      totalLost: 0,
      favoriteAbilities: {},
      playStyle: 'balanced', // creative, strategic, aggressive, careful, balanced
      creativityScores: [],
      riskTolerance: 0.5,
      empathyScore: 0.5,
      efficiencyScore: 0.5
    };

    this.worldState = {
      entropy: 0,
      entropyLimit: 7,
      currentLevel: null,
      rescued: 0,
      lost: 0,
      creations: [],
      discoveredLore: [],
      narrativeMemory: [],
      characterRelationships: {},
      worldEvents: [],
      playHistory: []
    };

    this.levelHistory = [];
    this.creationHistory = [];
    this.narrativeThreads = new Map();

    // Load from localStorage if available
    this.loadFromStorage();
  }

  // Record a creation event
  recordCreation(card, levelId, turn, context) {
    const creation = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      card: { ...card },
      levelId,
      turn,
      timestamp: Date.now(),
      context: { ...context },
      creativityScore: card._creativityScore || 50
    };

    this.creationHistory.push(creation);
    this.worldState.creations.push(card.name);
    this.playerProfile.totalCreations++;

    // Track favorite abilities
    const ability = card.ability;
    this.playerProfile.favoriteAbilities[ability] = (this.playerProfile.favoriteAbilities[ability] || 0) + 1;

    // Track creativity scores
    if (card._creativityScore) {
      this.playerProfile.creativityScores.push(card._creativityScore);
    }

    // Update play style based on ability choice
    this.updatePlayStyle();

    // Save to storage
    this.saveToStorage();

    return creation;
  }

  // Record level completion
  recordLevelCompletion(levelId, result, stats) {
    const levelRecord = {
      levelId,
      result, // 'won', 'lost', 'abandoned'
      timestamp: Date.now(),
      stats: { ...stats },
      creations: this.creationHistory
        .filter(c => c.levelId === levelId)
        .map(c => c.card.name),
      turns: stats.turns || 0,
      rescued: stats.rescued || 0,
      lost: stats.lost || 0,
      entropy: stats.entropy || 0
    };

    this.levelHistory.push(levelRecord);
    this.worldState.playHistory.push(levelRecord);

    // Update player profile
    this.playerProfile.totalRescued += stats.rescued || 0;
    this.playerProfile.totalLost += stats.lost || 0;

    // Calculate efficiency and empathy
    if (stats.turns && stats.maxTurns) {
      this.playerProfile.efficiencyScore = stats.turns / stats.maxTurns;
    }
    if (stats.rescued || stats.lost) {
      const total = (stats.rescued || 0) + (stats.lost || 0);
      if (total > 0) {
        this.playerProfile.empathyScore = (stats.rescued || 0) / total;
      }
    }

    this.saveToStorage();
    return levelRecord;
  }

  // Update play style based on behavior
  updatePlayStyle() {
    const abilities = this.playerProfile.favoriteAbilities;
    const total = Object.values(abilities).reduce((a, b) => a + b, 0);
    if (total === 0) return;

    // Calculate style scores
    const creative = (abilities['transform_land'] || 0) + (abilities['dream_link'] || 0) + (abilities['time_dilation'] || 0);
    const strategic = (abilities['guide'] || 0) + (abilities['reveal_path'] || 0) + (abilities['dig_channel'] || 0);
    const aggressive = (abilities['block'] || 0) + (abilities['slow_beast'] || 0) + (abilities['trap'] || 0);
    const careful = (abilities['force_field'] || 0) + (abilities['calm'] || 0) + (abilities['memory_beacon'] || 0);

    const scores = [
      { style: 'creative', score: creative / total },
      { style: 'strategic', score: strategic / total },
      { style: 'aggressive', score: aggressive / total },
      { style: 'careful', score: careful / total }
    ];

    scores.sort((a, b) => b.score - a.score);
    this.playerProfile.playStyle = scores[0].style;

    // Calculate risk tolerance
    const riskyAbilities = (abilities['time_dilation'] || 0) + (abilities['sun_blessing'] || 0);
    this.playerProfile.riskTolerance = Math.min(1, riskyAbilities / total + 0.3);
  }

  // Add narrative memory
  addNarrativeMemory(type, content, relatedEntities = []) {
    const memory = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      type, // 'dialogue', 'event', 'lore', 'creation', 'milestone'
      content,
      timestamp: Date.now(),
      relatedEntities,
      level: this.worldState.currentLevel
    };

    this.worldState.narrativeMemory.push(memory);

    // Keep only last 100 memories
    if (this.worldState.narrativeMemory.length > 100) {
      this.worldState.narrativeMemory = this.worldState.narrativeMemory.slice(-100);
    }

    this.saveToStorage();
    return memory;
  }

  // Discover lore
  discoverLore(loreId, text) {
    if (!this.worldState.discoveredLore.includes(loreId)) {
      this.worldState.discoveredLore.push(loreId);
      this.addNarrativeMemory('lore', { id: loreId, text }, [loreId]);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Get player profile summary
  getPlayerProfile() {
    const avgCreativity = this.playerProfile.creativityScores.length > 0
      ? this.playerProfile.creativityScores.reduce((a, b) => a + b, 0) / this.playerProfile.creativityScores.length
      : 50;

    return {
      ...this.playerProfile,
      averageCreativity: Math.round(avgCreativity),
      totalLevels: this.levelHistory.length,
      winRate: this.levelHistory.length > 0
        ? this.levelHistory.filter(l => l.result === 'won').length / this.levelHistory.length
        : 0
    };
  }

  // Generate world epic ending
  generateEpicEnding() {
    const profile = this.getPlayerProfile();
    const creations = this.creationHistory;
    const levels = this.levelHistory;

    // Determine ending type based on player behavior
    let endingType = 'balanced';
    if (profile.playStyle === 'creative' && profile.averageCreativity > 70) {
      endingType = 'poetic';
    } else if (profile.playStyle === 'strategic' && profile.efficiencyScore < 0.5) {
      endingType = 'tactical';
    } else if (profile.empathyScore > 0.8) {
      endingType = 'compassionate';
    } else if (profile.riskTolerance > 0.7) {
      endingType = 'bold';
    } else if (profile.totalLost > profile.totalRescued) {
      endingType = 'bittersweet';
    }

    // Generate ending text
    const endings = {
      poetic: this.generatePoeticEnding(profile, creations, levels),
      tactical: this.generateTacticalEnding(profile, creations, levels),
      compassionate: this.generateCompassionateEnding(profile, creations, levels),
      bold: this.generateBoldEnding(profile, creations, levels),
      bittersweet: this.generateBittersweetEnding(profile, creations, levels),
      balanced: this.generateBalancedEnding(profile, creations, levels)
    };

    const ending = endings[endingType] || endings.balanced;

    // Add to narrative memory
    this.addNarrativeMemory('milestone', {
      type: 'epic_ending',
      endingType,
      text: ending
    });

    return {
      endingType,
      text: ending,
      stats: profile
    };
  }

  generatePoeticEnding(profile, creations, levels) {
    const creationNames = creations.slice(-3).map(c => c.card.name);
    return `第七天到来时，世界没有崩塌。

你创造的${creationNames.join('、')}成为了新世界的传说。居民们说，每当月光照耀大地，那些造物会低声歌唱，唱的是你写下的诗篇。

裂隙之地不再裂隙。它学会了你的诗意——用温柔的方式改变，用想象的力量守护。

你证明了：最强大的造物，不是那些改变世界的工具，而是那些让世界学会自我疗愈的诗篇。`;
  }

  generateTacticalEnding(profile, creations, levels) {
    const winCount = levels.filter(l => l.result === 'won').length;
    return `第七天到来时，世界秩序井然。

你用${winCount}次精准的计算，证明了造物者的智慧不在于力量的强大，而在于时机的把握。每一个造物都被放置在最关键的位置，每一次行动都经过深思熟虑。

裂隙之地学会了你的谨慎——它不再盲目扩张，而是学会了在危机中寻找最优解。

你证明了：最持久的造物，是那些经过精密计算、恰到好处的改变。`;
  }

  generateCompassionateEnding(profile, creations, levels) {
    return `第七天到来时，世界充满了温暖。

你拯救了${profile.totalRescued}个生命，每一次救援都是一次心灵的触碰。那些被救下的居民，会在夜晚围坐在篝火旁，讲述一个关于温柔造物者的故事。

裂隙之地学会了你的善良——它不再吞噬无辜，而是学会了保护弱小。

你证明了：最强大的力量，不是改变世界的能力，而是守护生命的决心。`;
  }

  generateBoldEnding(profile, creations, levels) {
    const riskyCreations = creations.filter(c => c.card.cost >= 3 || c.card.stabilityCost >= 2);
    return `第七天到来时，世界焕然一新。

你敢于冒险，敢于用${riskyCreations.length}个高风险造物挑战命运。每一次赌博都惊心动魄，但正是这种勇气，让裂隙之地看到了新的可能。

裂隙之地学会了你的大胆——它不再畏惧改变，而是拥抱了不确定性。

你证明了：最伟大的造物，往往诞生于最勇敢的尝试。`;
  }

  generateBittersweetEnding(profile, creations, levels) {
    return `第七天到来时，世界依然站立，但伤痕犹在。

你失去了${profile.totalLost}个生命，每一次失去都是一次沉重的教训。但正是这些教训，让你学会了更谨慎地创造，更用心地守护。

裂隙之地记住了你的遗憾——它学会了珍惜，学会了在毁灭之前停下脚步。

你证明了：即使是最痛苦的失败，也能成为未来成功的基石。`;
  }

  generateBalancedEnding(profile, creations, levels) {
    return `第七天到来时，世界找到了平衡。

你走过了${levels.length}个区域，创造了${profile.totalCreations}个造物，拯救了${profile.totalRescued}个生命。你的旅程既有成功的喜悦，也有失败的教训，但最重要的是——你从未放弃。

裂隙之地学会了你的坚韧——它不再追求完美，而是学会了在不完美中寻找希望。

你证明了：真正的造物者，不是那些只创造完美的人，而是那些在失败中依然坚持创造的人。`;
  }

  // Generate personalized final exam based on player history
  generatePersonalizedFinalExam() {
    const profile = this.getPlayerProfile();
    const favoriteAbility = Object.entries(this.playerProfile.favoriteAbilities)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'transform_land';

    // Generate a final exam that tests the player's weaknesses
    const weaknesses = [];
    if (profile.empathyScore < 0.5) weaknesses.push('rescue');
    if (profile.riskTolerance < 0.3) weaknesses.push('risk');
    if (profile.efficiencyScore > 0.8) weaknesses.push('speed');
    if (Object.keys(this.playerProfile.favoriteAbilities).length < 5) weaknesses.push('variety');

    return {
      favoriteAbility,
      weaknesses,
      recommendedChallenge: weaknesses[0] || 'balanced',
      personalizedHint: this.generatePersonalizedHint(profile, weaknesses)
    };
  }

  generatePersonalizedHint(profile, weaknesses) {
    if (weaknesses.includes('rescue')) {
      return '你倾向于快速解决问题，但有时忽略了保护每一个生命。终考中，请记得：每一个居民都值得被拯救。';
    }
    if (weaknesses.includes('risk')) {
      return '你过于谨慎，有时会错过最佳时机。终考中，请相信你的直觉，敢于在关键时刻做出大胆的选择。';
    }
    if (weaknesses.includes('speed')) {
      return '你追求完美，但时间有限。终考中，学会在质量和速度之间找到平衡。';
    }
    if (weaknesses.includes('variety')) {
      return '你偏爱某些能力，但终考需要多样化的策略。尝试使用你从未用过的能力组合。';
    }
    return '你的能力很均衡，终考将是对你综合实力的最终测试。';
  }

  // Save to localStorage
  saveToStorage() {
    try {
      const data = {
        playerProfile: this.playerProfile,
        worldState: this.worldState,
        levelHistory: this.levelHistory,
        creationHistory: this.creationHistory.map(c => ({
          ...c,
          card: { ...c.card }
        }))
      };
      localStorage.setItem('creator_exam_memory', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save memory to storage:', e);
    }
  }

  // Load from localStorage
  loadFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem('creator_exam_memory'));
      if (data) {
        this.playerProfile = data.playerProfile || this.playerProfile;
        this.worldState = data.worldState || this.worldState;
        this.levelHistory = data.levelHistory || [];
        this.creationHistory = data.creationHistory || [];
      }
    } catch (e) {
      console.warn('Failed to load memory from storage:', e);
    }
  }

  // Clear all memory
  clearMemory() {
    this.playerProfile = {
      totalCreations: 0,
      totalRescued: 0,
      totalLost: 0,
      favoriteAbilities: {},
      playStyle: 'balanced',
      creativityScores: [],
      riskTolerance: 0.5,
      empathyScore: 0.5,
      efficiencyScore: 0.5
    };
    this.worldState = {
      entropy: 0,
      entropyLimit: 7,
      currentLevel: null,
      rescued: 0,
      lost: 0,
      creations: [],
      discoveredLore: [],
      narrativeMemory: [],
      characterRelationships: {},
      worldEvents: [],
      playHistory: []
    };
    this.levelHistory = [];
    this.creationHistory = [];
    this.saveToStorage();
  }

  // Get narrative context for AI
  getNarrativeContext() {
    return {
      playerProfile: this.getPlayerProfile(),
      recentCreations: this.creationHistory.slice(-5).map(c => ({
        name: c.card.name,
        ability: c.card.ability,
        level: c.levelId
      })),
      recentLevels: this.levelHistory.slice(-3),
      discoveredLore: this.worldState.discoveredLore,
      narrativeMemory: this.worldState.narrativeMemory.slice(-10)
    };
  }

  // Export memory data for analysis
  exportData() {
    return {
      playerProfile: this.getPlayerProfile(),
      worldState: this.worldState,
      levelHistory: this.levelHistory,
      creationHistory: this.creationHistory,
      narrativeThreads: Array.from(this.narrativeThreads.entries())
    };
  }
}

// Singleton instance
let memorySystemInstance = null;

export function getMemorySystem() {
  if (!memorySystemInstance) {
    memorySystemInstance = new AIMemorySystem();
  }
  return memorySystemInstance;
}

export function resetMemorySystem() {
  memorySystemInstance = new AIMemorySystem();
  memorySystemInstance.clearMemory();
  return memorySystemInstance;
}
