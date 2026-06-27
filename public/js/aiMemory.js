// AI Memory System - Tracks player behavior, creations, and generates personalized narratives
// Inspired by AI-driven game narrative systems and emergent storytelling

import { VectorMemory } from './vectorMemory.js';

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

    // Semantic vector memory for narrative retrieval
    this.vectorMemory = new VectorMemory();

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

  // Add narrative memory with semantic vector encoding
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

    // Also encode in vector memory for semantic retrieval
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    this.vectorMemory.addMemory(text, {
      type,
      level: this.worldState.currentLevel,
      entities: relatedEntities,
      turn: this.worldState.currentTurn || 0
    });

    // Keep only last 100 memories
    if (this.worldState.narrativeMemory.length > 100) {
      this.worldState.narrativeMemory = this.worldState.narrativeMemory.slice(-100);
    }

    this.saveToStorage();
    return memory;
  }

  // Semantic query for related memories using vector similarity
  queryRelatedMemories(queryText, topK = 5) {
    return this.vectorMemory.query(queryText, topK);
  }

  // Find narrative arcs in player history
  findNarrativeArcs(minLength = 3) {
    return this.vectorMemory.findNarrativeArcs(minLength);
  }

  // Get thematic memories (sacrifice, hope, despair, creation, war)
  getThematicMemories(theme, topK = 5) {
    return this.vectorMemory.queryByTheme(theme, topK);
  }

  // Generate narrative summary from vector memory
  generateNarrativeSummary() {
    return this.vectorMemory.generateNarrativeSummary();
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

  // Get short profile summary string for AI prompts
  getProfileSummary() {
    const profile = this.getPlayerProfile();
    const styleMap = {
      poetic: '诗意',
      tactical: '谋略',
      compassionate: '慈悲',
      bold: '果敢',
      bittersweet: ' bittersweet',
      creative: '诗意',
      strategic: '谋略',
      aggressive: '果敢',
      careful: '慈悲',
      balanced: ' bittersweet'
    };
    const style = styleMap[profile.playStyle] || profile.playStyle || '未知';
    return `${style}风格，创意均分${profile.averageCreativity}，胜率${Math.round(profile.winRate * 100)}%`;
  }

  // Generate world epic ending with branching
  generateEpicEnding() {
    const profile = this.getPlayerProfile();
    const creations = this.creationHistory;
    const levels = this.levelHistory;

    // Determine primary and secondary ending types
    const styleScores = this.calculateStyleScores(profile, creations, levels);
    const primaryStyle = styleScores[0].style;
    const secondaryStyle = styleScores[1].style;

    // Check for mixed ending eligibility (both styles have significant scores)
    const isMixed = styleScores[1].score >= styleScores[0].score * 0.6 && styleScores[0].score > 0.2;

    let endingType = primaryStyle;
    if (isMixed) {
      endingType = `${primaryStyle}-${secondaryStyle}`;
    }

    // Determine ending branch based on player choices
    const endingBranch = this.determineEndingBranch(profile, levels);

    // Generate ending text with specific references
    const ending = this.generateEndingText(endingType, endingBranch, profile, creations, levels);

    // Add to narrative memory
    this.addNarrativeMemory('milestone', {
      type: 'epic_ending',
      endingType,
      endingBranch,
      text: ending
    });

    return {
      endingType,
      endingBranch,
      text: ending,
      stats: profile,
      isMixed
    };
  }

  // Determine ending branch based on player behavior
  determineEndingBranch(profile, levels) {
    const winRate = profile.winRate;
    const totalLost = profile.totalLost;
    const totalRescued = profile.totalRescued;
    const riskTolerance = profile.riskTolerance;
    const empathyScore = profile.empathyScore;

    // Perfect ending: no losses, high win rate
    if (totalLost === 0 && winRate >= 0.8) {
      return 'perfect';
    }

    // Sacrifice ending: saved many but lost some, high empathy
    if (totalRescued >= 10 && totalLost > 0 && empathyScore > 0.6) {
      return 'sacrifice';
    }

    // Redemption ending: lost many early but recovered
    const earlyLosses = levels.slice(0, 3).filter(l => l.lost > 0).length;
    const lateWins = levels.slice(-3).filter(l => l.result === 'won').length;
    if (earlyLosses >= 2 && lateWins >= 2) {
      return 'redemption';
    }

    // Tragic ending: high losses, low win rate
    if (winRate < 0.5 && totalLost > 5) {
      return 'tragic';
    }

    // Hidden ending: high risk tolerance, unique creations
    if (riskTolerance > 0.7 && profile.totalCreations >= 15) {
      return 'hidden';
    }

    // Standard ending
    return 'standard';
  }

  calculateStyleScores(profile, creations, levels) {
    const abilities = this.playerProfile.favoriteAbilities;
    const total = Object.values(abilities).reduce((a, b) => a + b, 0) || 1;

    const scores = [
      {
        style: 'poetic',
        score: ((abilities['transform_land'] || 0) + (abilities['dream_link'] || 0) + (abilities['time_dilation'] || 0)) / total
          + (profile.averageCreativity > 70 ? 0.3 : 0)
      },
      {
        style: 'tactical',
        score: ((abilities['guide'] || 0) + (abilities['reveal_path'] || 0) + (abilities['dig_channel'] || 0)) / total
          + (profile.efficiencyScore < 0.6 ? 0.2 : 0)
      },
      {
        style: 'compassionate',
        score: ((abilities['calm'] || 0) + (abilities['memory_beacon'] || 0) + (abilities['cleanse'] || 0)) / total
          + (profile.empathyScore > 0.7 ? 0.3 : 0)
      },
      {
        style: 'bold',
        score: ((abilities['block'] || 0) + (abilities['slow_beast'] || 0) + (abilities['trap'] || 0)) / total
          + (profile.riskTolerance > 0.6 ? 0.2 : 0)
      },
      {
        style: 'bittersweet',
        score: profile.totalLost > 0 ? Math.min(1, profile.totalLost / (profile.totalRescued + 1)) * 0.8 : 0
      }
    ];

    scores.sort((a, b) => b.score - a.score);
    return scores;
  }

  generateEndingText(endingType, endingBranch, profile, creations, levels) {
    // Get specific references from player history
    const creationNames = creations.slice(-3).map(c => c.card.name);
    const favoriteCreation = this.getFavoriteCreation(creations);
    const mostMemorableLevel = this.getMostMemorableLevel(levels);
    const lostNames = this.getLostUnitNames(levels);
    const rescuedNames = this.getRescuedUnitNames(levels);

    // Generate branch-specific prologue
    const prologue = this.generateBranchPrologue(endingBranch, profile, levels, lostNames, rescuedNames);

    // Generate style-specific main text
    const mainText = this.generateStyleEnding(endingType, profile, creations, levels, creationNames, favoriteCreation, mostMemorableLevel, lostNames, rescuedNames);

    // Generate branch-specific epilogue
    const epilogue = this.generateBranchEpilogue(endingBranch, profile, creations, levels);

    return `${prologue}\n\n${mainText}\n\n${epilogue}`;
  }

  generateBranchPrologue(branch, profile, levels, lostNames, rescuedNames) {
    const prologues = {
      perfect: `当第七天的晨曦穿透裂隙，世界完好如初。\n\n你没有让任何一个人失去。在${rescuedNames.join('、') || '所有经过的地方'}，每一个生命都找到了归宿。这是造物者最完美的答卷——不是因为没有失败，而是因为你从未放弃任何一个灵魂。`,
      sacrifice: `第七天到来时，世界依然在哭泣，但也在微笑。\n\n你拯救了${profile.totalRescued}个生命，但失去了${profile.totalLost}个。在${lostNames.join('、') || '那些地方'}，风会记住他们的名字。你证明了：即使无法拯救所有人，每一次努力都值得。`,
      redemption: `第七天到来时，世界见证了奇迹。\n\n你的开始并不顺利——早期的失败几乎让你放弃。但你在黑暗中找到了光，在绝望中创造了希望。从失败到胜利，你走过了最长的路。`,
      tragic: `第七天到来时，世界依然站立，但伤痕累累。\n\n你失去了太多。${profile.totalLost}个生命，${levels.filter(l => l.result === 'lost').length}次失败。但裂隙之地记住了你的坚持——即使每一次尝试都以泪水结束，你依然站了起来。`,
      hidden: `第七天到来时，世界发生了不可思议的变化。\n\n你的大胆创造唤醒了沉睡的力量。那些被认为是疯狂的造物，最终成为了改变世界的钥匙。裂隙之地不仅学会了你的风格——它学会了你的灵魂。`,
      standard: `第七天到来时，世界找到了新的平衡。\n\n你走过了${levels.length}个区域，创造了${profile.totalCreations}个造物，拯救了${profile.totalRescued}个生命。你的旅程有欢笑也有泪水，但最重要的是——你从未停止创造。`
    };

    return prologues[branch] || prologues.standard;
  }

  generateBranchEpilogue(branch, profile, creations, levels) {
    const epilogues = {
      perfect: `\n\n【完美结局】\n裂隙完全愈合。世界不再需要造物者，但它会永远记住你。\n在完美之后，你选择了离开——去下一个需要奇迹的地方。`,
      sacrifice: `\n\n【牺牲结局】\n裂隙缩小了，但没有完全消失。它成为了世界的一部分——一个提醒人们珍惜的伤疤。\n你选择了留下，继续守护那些还在危险中的生命。`,
      redemption: `\n\n【救赎结局】\n裂隙变成了桥梁，连接了过去与未来。\n你成为了裂隙之地的守护者，用自己的经历告诉每一个新来的造物者：失败不是终点。`,
      tragic: `\n\n【悲剧结局】\n裂隙依然存在，但世界学会了与它共存。\n你离开了裂隙之地，但你的故事成为了传说——一个关于坚持与遗憾的永恒诗篇。`,
      hidden: `\n\n【隐藏结局】\n裂隙不仅没有愈合，反而成为了新的创造之源。\n你发现了造物者最大的秘密：裂隙不是错误，而是世界进化的方式。你成为了新世界的引路人。`,
      standard: `\n\n【标准结局】\n裂隙逐渐愈合，世界慢慢恢复。\n你的故事被传唱，你的造物被纪念。在裂隙之地的每一个角落，都有你留下的痕迹。`
    };

    return epilogues[branch] || epilogues.standard;
  }

  generateStyleEnding(endingType, profile, creations, levels, creationNames, favoriteCreation, mostMemorableLevel, lostNames, rescuedNames) {
    // Generate based on ending type
    const generators = {
      'poetic': () => this.generatePoeticEnding(profile, creations, levels, creationNames, favoriteCreation),
      'tactical': () => this.generateTacticalEnding(profile, creations, levels, creationNames, mostMemorableLevel),
      'compassionate': () => this.generateCompassionateEnding(profile, creations, levels, rescuedNames, favoriteCreation),
      'bold': () => this.generateBoldEnding(profile, creations, levels, creationNames),
      'bittersweet': () => this.generateBittersweetEnding(profile, creations, levels, lostNames, rescuedNames),
      'balanced': () => this.generateBalancedEnding(profile, creations, levels),
      'poetic-tactical': () => this.generateMixedEnding('poetic', 'tactical', profile, creations, levels, creationNames, mostMemorableLevel),
      'poetic-compassionate': () => this.generateMixedEnding('poetic', 'compassionate', profile, creations, levels, creationNames, rescuedNames),
      'tactical-compassionate': () => this.generateMixedEnding('tactical', 'compassionate', profile, creations, levels, mostMemorableLevel, rescuedNames),
      'poetic-bold': () => this.generateMixedEnding('poetic', 'bold', profile, creations, levels, creationNames, null),
      'compassionate-bold': () => this.generateMixedEnding('compassionate', 'bold', profile, creations, levels, rescuedNames, null),
      'tactical-bold': () => this.generateMixedEnding('tactical', 'bold', profile, creations, levels, mostMemorableLevel, null)
    };

    const generator = generators[endingType] || generators['balanced'];
    return generator();
  }

  getFavoriteCreation(creations) {
    if (!creations.length) return null;
    const abilityCounts = {};
    for (const c of creations) {
      abilityCounts[c.card.ability] = (abilityCounts[c.card.ability] || 0) + 1;
    }
    const favoriteAbility = Object.entries(abilityCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return creations.filter(c => c.card.ability === favoriteAbility).pop()?.card || null;
  }

  getMostMemorableLevel(levels) {
    if (!levels.length) return null;
    // Most memorable = highest entropy or most dramatic (many rescued or lost)
    return levels.sort((a, b) => {
      const dramaA = (a.rescued || 0) + (a.lost || 0) * 2 + (a.entropy || 0);
      const dramaB = (b.rescued || 0) + (b.lost || 0) * 2 + (b.entropy || 0);
      return dramaB - dramaA;
    })[0];
  }

  getLostUnitNames(levels) {
    const lostLevels = levels.filter(l => l.lost > 0);
    if (!lostLevels.length) return [];
    // Return level names where units were lost
    return lostLevels.map(l => {
      const levelNames = {
        'flood-village': '洪水村庄',
        'night-mine': '永夜矿井',
        'giant-city': '巨兽困城',
        'wordless-war': '失语战争',
        'memory-plague': '记忆瘟疫',
        'final-exam': '创世终考'
      };
      return levelNames[l.levelId] || l.levelId;
    });
  }

  getRescuedUnitNames(levels) {
    const rescuedLevels = levels.filter(l => l.rescued > 0);
    if (!rescuedLevels.length) return [];
    const levelNames = {
      'flood-village': '洪水村庄',
      'night-mine': '永夜矿井',
      'giant-city': '巨兽困城',
      'wordless-war': '失语战争',
      'memory-plague': '记忆瘟疫',
      'final-exam': '创世终考'
    };
    return rescuedLevels.map(l => levelNames[l.levelId] || l.levelId);
  }

  generatePoeticEnding(profile, creations, levels, creationNames, favoriteCreation) {
    const favName = favoriteCreation?.name || creationNames[0] || '造物';
    const favDesc = favoriteCreation?.description?.slice(0, 30) || '改变了世界的造物';

    return `第七天到来时，世界没有崩塌。

你创造的${creationNames.join('、')}成为了新世界的传说。${favName}尤其特别——${favDesc}...

居民们说，每当月光照耀大地，那些造物会低声歌唱，唱的是你写下的诗篇。在${this.getRescuedUnitNames(levels).join('、') || '你拯救的村庄'}，人们会在篝火旁讲述你的故事。

裂隙之地不再裂隙。它学会了你的诗意——用温柔的方式改变，用想象的力量守护。

你证明了：最强大的造物，不是那些改变世界的工具，而是那些让世界学会自我疗愈的诗篇。`;
  }

  generateTacticalEnding(profile, creations, levels, creationNames, mostMemorableLevel) {
    const winCount = levels.filter(l => l.result === 'won').length;
    const memorableName = mostMemorableLevel ? {
      'flood-village': '洪水村庄',
      'night-mine': '永夜矿井',
      'giant-city': '巨兽困城',
      'wordless-war': '失语战争',
      'memory-plague': '记忆瘟疫',
      'final-exam': '创世终考'
    }[mostMemorableLevel.levelId] || '那场考核' : '那些考核';

    return `第七天到来时，世界秩序井然。

你用${winCount}次精准的计算，证明了造物者的智慧不在于力量的强大，而在于时机的把握。在${memorableName}中，你的布局尤为精妙——每一个造物都被放置在最关键的位置。

裂隙之地学会了你的谨慎——它不再盲目扩张，而是学会了在危机中寻找最优解。

你证明了：最持久的造物，是那些经过精密计算、恰到好处的改变。`;
  }

  generateCompassionateEnding(profile, creations, levels, rescuedNames, favoriteCreation) {
    const favName = favoriteCreation?.name || '那些造物';

    return `第七天到来时，世界充满了温暖。

你拯救了${profile.totalRescued}个生命，每一次救援都是一次心灵的触碰。在${rescuedNames.join('、') || '你经过的村庄'}，那些被救下的居民会在夜晚围坐在篝火旁，讲述一个关于温柔造物者的故事。

${favName}成为了希望的象征——它不仅改变了地形，更改变了人们心中的绝望。

裂隙之地学会了你的善良——它不再吞噬无辜，而是学会了保护弱小。

你证明了：最强大的力量，不是改变世界的能力，而是守护生命的决心。`;
  }

  generateBoldEnding(profile, creations, levels, creationNames) {
    const riskyCreations = creations.filter(c => c.card.cost >= 3 || c.card.stabilityCost >= 2);
    const riskyNames = riskyCreations.slice(-2).map(c => c.card.name);

    return `第七天到来时，世界焕然一新。

你敢于冒险，敢于用${riskyCreations.length}个高风险造物挑战命运。${riskyNames.join('和') || '那些大胆的造物'}每一次出现都惊心动魄，但正是这种勇气，让裂隙之地看到了新的可能。

你走过的${levels.length}个区域，每一个都留下了你大胆创造的痕迹。

裂隙之地学会了你的大胆——它不再畏惧改变，而是拥抱了不确定性。

你证明了：最伟大的造物，往往诞生于最勇敢的尝试。`;
  }

  generateBittersweetEnding(profile, creations, levels, lostNames, rescuedNames) {
    const lossContext = lostNames.length > 0
      ? `在${lostNames.join('、')}，你经历了最痛苦的失去。`
      : '你经历了失去的痛苦。';
    const redemptionContext = rescuedNames.length > 0
      ? `但你也曾在${rescuedNames.join('、')}带来希望。`
      : '';

    return `第七天到来时，世界依然站立，但伤痕犹在。

${lossContext}${redemptionContext}

你失去了${profile.totalLost}个生命，每一次失去都是一次沉重的教训。但正是这些教训，让你学会了更谨慎地创造，更用心地守护。

裂隙之地记住了你的遗憾——它学会了珍惜，学会了在毁灭之前停下脚步。

你证明了：即使是最痛苦的失败，也能成为未来成功的基石。`;
  }

  generateBalancedEnding(profile, creations, levels) {
    const creationNames = creations.slice(-3).map(c => c.card.name);
    const levelNames = levels.map(l => {
      const names = {
        'flood-village': '洪水村庄',
        'night-mine': '永夜矿井',
        'giant-city': '巨兽困城',
        'wordless-war': '失语战争',
        'memory-plague': '记忆瘟疫',
        'final-exam': '创世终考'
      };
      return names[l.levelId] || l.levelId;
    });

    return `第七天到来时，世界找到了平衡。

你走过了${levelNames.join('、')}，创造了${profile.totalCreations}个造物${creationNames.length > 0 ? '——' + creationNames.join('、') + '等' : ''}，拯救了${profile.totalRescued}个生命。你的旅程既有成功的喜悦，也有失败的教训，但最重要的是——你从未放弃。

裂隙之地学会了你的坚韧——它不再追求完美，而是学会了在不完美中寻找希望。

你证明了：真正的造物者，不是那些只创造完美的人，而是那些在失败中依然坚持创造的人。`;
  }

  generateMixedEnding(style1, style2, profile, creations, levels, ref1, ref2) {
    const style1Names = { poetic: '诗意', tactical: '谋略', compassionate: '慈悲', bold: '勇气' };
    const style2Names = { poetic: '诗意', tactical: '谋略', compassionate: '慈悲', bold: '勇气' };

    const mixedTexts = {
      'poetic-tactical': `第七天到来时，世界既美丽又秩序井然。

你以${style1Names[style1]}的想象和${style2Names[style2]}的精密，创造了独一无二的奇迹。${ref1 || '你的造物'}不仅是艺术品，更是经过深思熟虑的解决方案。

裂隙之地学会了你的双重智慧——它既学会了梦想，也学会了脚踏实地。`,
      'poetic-compassionate': `第七天到来时，世界充满了温柔的光芒。

你的${style1Names[style1]}之心与${style2Names[style2]}之手共同编织了救赎的篇章。${ref2 || '那些被拯救的生命'}永远记得你创造的美丽希望。

裂隙之地学会了你的温柔——它用诗意的方式守护每一个生命。`,
      'tactical-compassionate': `第七天到来时，世界在理性与温情中找到了道路。

你用${style1Names[style1]}的头脑和${style2Names[style2]}的心灵，证明了智慧与善良可以共存。${ref1 || '每一次精准的行动'}都拯救了宝贵的生命。

裂隙之地学会了你的平衡——它既追求效率，也珍惜每一个灵魂。`,
      'poetic-bold': `第七天到来时，世界因大胆的想象而焕发生机。

你的${style1Names[style1]}梦想与${style2Names[style2]}行动结合，创造了前所未有的奇迹。${ref1 || '那些造物'}既是诗篇，也是壮举。

裂隙之地学会了你的激情——它敢于梦想，更敢于实现。`,
      'compassionate-bold': `第七天到来时，世界因勇敢的爱而更加强大。

你以${style1Names[style1]}之心，行${style2Names[style2]}之事。${ref2 || '那些被拯救的生命'}见证了温柔与力量的完美结合。

裂隙之地学会了你的守护——它用坚定的意志保护每一个脆弱的灵魂。`,
      'tactical-bold': `第七天到来时，世界在精密与勇气中前进。

你以${style1Names[style1]}的布局，配${style2Names[style2]}的决断。${ref1 || '每一次行动'}都精准而有力。

裂隙之地学会了你的果敢——它既深思熟虑，又敢于出击。`
    };

    return mixedTexts[`${style1}-${style2}`] || this.generateBalancedEnding(profile, creations, levels);
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
    if (!this.hasStorage()) return;

    try {
      const data = {
        playerProfile: this.playerProfile,
        worldState: this.worldState,
        levelHistory: this.levelHistory,
        creationHistory: this.creationHistory.map(c => ({
          ...c,
          card: { ...c.card }
        })),
        vectorMemory: this.vectorMemory.serialize()
      };
      localStorage.setItem('creator_exam_memory', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save memory to storage:', e);
    }
  }

  // Load from localStorage
  loadFromStorage() {
    if (!this.hasStorage()) return;

    try {
      const data = JSON.parse(localStorage.getItem('creator_exam_memory'));
      if (data) {
        this.playerProfile = data.playerProfile || this.playerProfile;
        this.worldState = data.worldState || this.worldState;
        this.levelHistory = data.levelHistory || [];
        this.creationHistory = data.creationHistory || [];
        if (data.vectorMemory) {
          this.vectorMemory.deserialize(data.vectorMemory);
        }
      }
    } catch (e) {
      console.warn('Failed to load memory from storage:', e);
    }
  }

  hasStorage() {
    return typeof localStorage !== 'undefined' && localStorage !== null;
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
    this.vectorMemory = new VectorMemory();
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
