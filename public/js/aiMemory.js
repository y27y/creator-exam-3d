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

    this.vectorMemory.addMemory(`${card.name}：${card.description || card.ability || '造物'}`, {
      type: 'creation',
      level: levelId,
      turn,
      ability: card.ability,
      demo: !!context?.demo
    });

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
    const strategic = (abilities['guide'] || 0) + (abilities['reveal_path'] || 0);
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
  generateEpicEnding(finaleContext = {}) {
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
    const legacyBranch = this.determineEndingBranch(profile, levels);
    const finalState = this.determineFinalState(finaleContext.nightWatchResult, finaleContext.airCombatResult);

    // Generate ending text with specific references
    const ending = this.generateEndingText(endingType, legacyBranch, profile, creations, levels, {
      ...finaleContext,
      finalState
    });
    const title = this.generateFinaleTitle(legacyBranch, finalState);
    const summary = this.generateFinaleSummary(finaleContext.nightWatchResult, finaleContext.airCombatResult, finalState);

    // Add to narrative memory
    this.addNarrativeMemory('milestone', {
      type: 'epic_ending',
      endingType,
      endingBranch: legacyBranch,
      legacyBranch,
      finalState,
      title,
      summary,
      text: ending
    });

    return {
      endingType,
      endingBranch: legacyBranch,
      legacyBranch,
      finalState,
      title,
      summary,
      text: ending,
      stats: profile,
      isMixed
    };
  }

  determineFinalState(nightWatchResult, airCombatResult) {
    if (!airCombatResult) return 'legacy_only';
    const clearedLayers = Number(airCombatResult.clearedLayers || 0);
    if (airCombatResult.outcome === 'victory') {
      return nightWatchResult?.victory === false || clearedLayers < 6 ? 'scarred_victory' : 'cleansed';
    }
    return clearedLayers >= 4 ? 'partial_seal' : 'rift_open';
  }

  generateFinaleTitle(legacyBranch, finalState) {
    const branchNames = {
      perfect: '完美结局', sacrifice: '牺牲结局', redemption: '救赎结局',
      tragic: '悲剧结局', hidden: '隐藏结局', standard: '标准结局'
    };
    const stateNames = {
      cleansed: '第七日净空', scarred_victory: '带伤封印',
      partial_seal: legacyBranch === 'perfect' ? '无损者的坠落' : '未竟封印',
      rift_open: legacyBranch === 'perfect' ? '无损者的坠落' : '裂隙未闭'
    };
    const branchName = branchNames[legacyBranch] || branchNames.standard;
    return stateNames[finalState] ? `${branchName}·${stateNames[finalState]}` : branchName;
  }

  generateFinaleSummary(nightWatchResult, airCombatResult, finalState) {
    if (!airCombatResult) return '';
    const watch = nightWatchResult
      ? `长夜${nightWatchResult.victory ? '守住' : '失守'}，坚持${nightWatchResult.survivedWaves || 0}波，保护${nightWatchResult.residentsProtected || 0}名居民`
      : '长夜结果未记录';
    const stateText = {
      cleansed: '六段空域全部清算，裂隙完成净化',
      scarred_victory: '空域清算完成，但世界保留了长夜的伤痕',
      partial_seal: '载体坠落前完成大部分清算，裂隙被暂时封住',
      rift_open: '空域载体坠落，裂隙仍然开放'
    }[finalState] || '空域结果已经写入世界';
    return `${watch}；${stateText}。`;
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
        score: ((abilities['guide'] || 0) + (abilities['reveal_path'] || 0)) / total
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

  generateEndingText(endingType, endingBranch, profile, creations, levels, finaleContext = {}) {
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
    const finalePassage = this.generateFinalePassage(finaleContext);
    const epilogue = this.generateBranchEpilogue(endingBranch, profile, creations, levels, finaleContext.finalState);

    return [prologue, mainText, finalePassage, epilogue].filter(Boolean).join('\n\n');
  }

  generateFinalePassage({ nightWatchResult, airCombatResult, finalState } = {}) {
    if (!airCombatResult) return '';
    const watchText = nightWatchResult
      ? `长夜${nightWatchResult.victory ? '守住了' : '失守了'}。防线坚持${nightWatchResult.survivedWaves || 0}波，护住${nightWatchResult.residentsProtected || 0}名居民。`
      : '长夜留下的记录已经模糊。';
    const cleared = Number(airCombatResult.clearedLayers || 0);
    const airText = {
      cleansed: `第七日，空域载体走完六段航线。裂隙被清算干净，天空重新连成一片。`,
      scarred_victory: `第七日，空域载体完成${cleared}/6段清算。裂隙封住了，长夜留下的伤痕却没有消失。`,
      partial_seal: `第七日，空域载体在第${Math.min(6, cleared + 1)}段前后坠落。已经完成的${cleared}/6段清算把裂隙压成一道不稳定的封口。`,
      rift_open: `第七日，空域载体在只完成${cleared}/6段清算后坠落。裂隙没有合上，警戒线重新围住了地平线。`
    }[finalState] || '';
    return `${watchText}\n\n${airText}`.trim();
  }

  generateBranchPrologue(branch, profile, levels, lostNames, rescuedNames) {
    const prologues = {
      perfect: `第七天亮起来时，裂隙边缘只剩细线。\n\n${rescuedNames.join('、') || '沿途村镇'}没有少人。被你带出来的人开始清点工具、修门、找亲戚；这场考核没有漂亮收尾，只有一地湿泥和活着的人。`,
      sacrifice: `第七天到了，名单没有对齐。\n\n你救下${profile.totalRescued}个人，也失去${profile.totalLost}个人。${lostNames.join('、') || '那些地方'}还留着空位。没人把这算成胜利，但留下的人还得继续过。`,
      redemption: `第七天到了，你是从坏局里爬出来的。\n\n早几关的失误还在记录里，后来你把路补上、把人带出危险地块。裂隙没有给你掌声，只是慢慢收窄。`,
      tragic: `第七天到了，棋盘还没塌。\n\n${profile.totalLost}个人没能回来，${levels.filter(l => l.result === 'lost').length}处区域留下失败记录。你还站着，但有些格子再也不会刷新。`,
      hidden: `第七天到了，裂隙没有按旧规则合上。\n\n那些高风险造物留下了新的路径。它们不稳定，也不干净，但确实把一部分死局撬开了。`,
      standard: `第七天到了，局面暂时稳住。\n\n你走过${levels.length}个区域，造了${profile.totalCreations}件东西，救下${profile.totalRescued}个人。不是每一步都好看，但结果写进了存档。`
    };

    return prologues[branch] || prologues.standard;
  }

  generateBranchEpilogue(branch, profile, creations, levels, finalState = 'legacy_only') {
    const finalStateEpilogues = {
      cleansed: `【最终裁决】\n裂隙完成净化。世界没有忘记此前的代价，但第七日的天空终于安静下来。`,
      scarred_victory: `【最终裁决】\n裂隙被封住了。仍会发光的伤口提醒所有人：这次胜利不是一次无损的归还。`,
      partial_seal: `【最终裁决】\n裂隙被暂时压成窄缝。守望没有结束，下一班人已经接过地图和警戒表。`,
      rift_open: `【最终裁决】\n裂隙仍然开放。居民退到新的警戒线后，而你留下的记录成为下一次升空的航图。`
    };
    if (finalStateEpilogues[finalState]) return finalStateEpilogues[finalState];
    const epilogues = {
      perfect: `\n\n【完美结局】\n裂隙合上了。考核台撤掉警戒线，你留下最后一张地图，然后离开。`,
      sacrifice: `\n\n【牺牲结局】\n裂隙缩小了，仍有几处夜里会发光。你留在防线边，继续处理没清完的危险格。`,
      redemption: `\n\n【救赎结局】\n裂隙成了可通行的窄桥。后来的人会看到你的失败记录，也会看到你怎么把它改回来。`,
      tragic: `\n\n【悲剧结局】\n裂隙还在。你离开后，居民把危险地块用木桩圈起，别让孩子靠近。`,
      hidden: `\n\n【隐藏结局】\n裂隙没有愈合，反而露出新的规则层。你没有关掉它，只是学会了在边缘工作。`,
      standard: `\n\n【标准结局】\n裂隙慢慢收口。那些造物没有被供起来，只被放进仓库，等下次出事时再拿出来。`
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
    const favDesc = favoriteCreation?.description?.slice(0, 30) || '改过棋盘的造物';

    return `第七天到了，天没有塌。

你最后留下的${creationNames.join('、')}还在仓库里。${favName}最常被提起：${favDesc}...

在${this.getRescuedUnitNames(levels).join('、') || '你救过的地方'}，有人会把它画在门板上，提醒后来的人哪条路曾经被打开过。

裂隙还会响，但声音小了。你造过的东西没有变成诗，只是继续派得上用场。`;
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

    return `第七天到了，盘面终于顺了。

你赢下${winCount}场，靠的是落点、回合数和代价。在${memorableName}，最关键的不是造物名字，而是它刚好卡在该卡的位置。

后来复盘时，考核台只留下一句话：少一步不够，多一步浪费。`;
  }

  generateCompassionateEnding(profile, creations, levels, rescuedNames, favoriteCreation) {
    const favName = favoriteCreation?.name || '那些造物';

    return `第七天到了，避难点还有炊烟。

你救下${profile.totalRescued}个人。在${rescuedNames.join('、') || '你经过的村庄'}，他们先点名，再分水，再骂几句这场灾。

${favName}被记住，不是因为名字好听，是因为它让人多走了那几格。

等路修好，有人会回去看那块地，确认自己确实从那里活着出来过。`;
  }

  generateBoldEnding(profile, creations, levels, creationNames) {
    const riskyCreations = creations.filter(c => c.card.cost >= 3 || c.card.stabilityCost >= 2);
    const riskyNames = riskyCreations.slice(-2).map(c => c.card.name);

    return `第七天到了，记录员把你的几次冒险单独圈了出来。

你用了${riskyCreations.length}个高风险造物。${riskyNames.join('和') || '那些大胆的造物'}有几次差点把局面撕开，也有几次硬是把死路撑成了活路。

这种打法不适合写进教材，但防线被压扁的时候，没人会嫌它太冒险。`;
  }

  generateBittersweetEnding(profile, creations, levels, lostNames, rescuedNames) {
    const lossContext = lostNames.length > 0
      ? `在${lostNames.join('、')}，你经历了最痛苦的失去。`
      : '你经历了失去的痛苦。';
    const redemptionContext = rescuedNames.length > 0
      ? `但你也曾在${rescuedNames.join('、')}把人带出来。`
      : '';

    return `第七天到了，废墟没有立刻安静。

${lossContext}${redemptionContext}

你失去了${profile.totalLost}个人。后来每次放置造物，你都会多看一眼出口和水线。

这不是补偿，只是下一局开始前，手会稳一点。`;
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

    return `第七天到了，局面算是压住了。

你走过${levelNames.join('、')}，造了${profile.totalCreations}件东西${creationNames.length > 0 ? '——' + creationNames.join('、') + '等' : ''}，救下${profile.totalRescued}个人。

有些选择很粗糙，有些落点刚刚好。考核记录没有替你美化，只把结果照实留下。`;
  }

  generateMixedEnding(style1, style2, profile, creations, levels, ref1, ref2) {
    const style1Names = { poetic: '诗意', tactical: '谋略', compassionate: '慈悲', bold: '勇气' };
    const style2Names = { poetic: '诗意', tactical: '谋略', compassionate: '慈悲', bold: '勇气' };

    const mixedTexts = {
      'poetic-tactical': `第七天到了，棋盘收得很干净。

你有${style1Names[style1]}的念头，也肯算${style2Names[style2]}的代价。${ref1 || '你的造物'}看着奇怪，落点却准。

裂隙没被说服，只是被一步步压回去了。`,
      'poetic-compassionate': `第七天到了，避难点里有人开始说话。

你的${style1Names[style1]}想法没有飘走，因为${style2Names[style2]}让它落到了人身边。${ref2 || '那些被拯救的生命'}记得的不是大道理，是那条能走的路。

裂隙边上，救援名单终于有人签字。`,
      'tactical-compassionate': `第七天到了，清点结果比口号实在。

你用${style1Names[style1]}算路线，也用${style2Names[style2]}决定先救谁。${ref1 || '每一次精准的行动'}都少浪费了一步。

这套打法冷静，但不是冷漠。`,
      'poetic-bold': `第七天到了，几处裂隙还留着烧痕。

你的${style1Names[style1]}点子配上${style2Names[style2]}出手，造出了几件没人敢先试的东西。${ref1 || '那些造物'}不稳，但管用。

风险没有消失，只是被你压进了能承受的范围。`,
      'compassionate-bold': `第七天到了，有人还在发抖，但人还在。

你带着${style1Names[style1]}去冒${style2Names[style2]}的险。${ref2 || '那些被拯救的生命'}没有见证什么完美，只是被你从坏格子里拉了出来。

这就够了。`,
      'tactical-bold': `第七天到了，沙盘边缘还冒着烟。

你以${style1Names[style1]}的布局，配${style2Names[style2]}的决断。${ref1 || '每一次行动'}都精准而有力。

你没有把风险讲得漂亮，只是在该出手的时候出了手。`
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
      return '你解题很快，但容易漏人。终考先看居民站位，再动第一件造物。';
    }
    if (weaknesses.includes('risk')) {
      return '你很谨慎，但有些回合不能等。终考里，看到缺口就要先压住。';
    }
    if (weaknesses.includes('speed')) {
      return '你喜欢把局面修干净，但回合数不等人。终考里先保通路。';
    }
    if (weaknesses.includes('variety')) {
      return '你常用同几种能力。终考会把洪水、黑暗和雾混在一起，别只带一套解法。';
    }
    return '你的打法比较均衡。终考重点看落点和顺序，别被同时出现的灾害牵着走。';
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
