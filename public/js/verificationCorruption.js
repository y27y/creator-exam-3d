// Verification Corruption System
// Cultist Simulator-inspired forbidden knowledge + NieR: Automata system crash aesthetics
// Players deliberately overload the validation engine with semantic paradoxes
// to generate illegal but powerful creation cards

import { validationEngine } from './validationEngine.js';
import { cognitiveEffects } from './cognitiveEffects.js';

// Paradox templates that overload the validation engine
const PARADOX_PATTERNS = {
  light_dark: {
    name: '噬光黑核',
    paradox: 'illuminate + absorb_light',
    description: '既照亮一切又吞噬一切光芒',
    illegalAbility: 'consume_light',
    powerMultiplier: 2.5,
    corruption: 3,
    sideEffect: '范围内所有光源熄灭，包括玩家已放置的照明造物'
  },
  life_death: {
    name: '生死之种',
    paradox: 'grow_forest + wither',
    description: '在生长的同时枯萎，生命与死亡共存',
    illegalAbility: 'cycle_life',
    powerMultiplier: 2.0,
    corruption: 2,
    sideEffect: '范围内单位随机获得或失去1点生命值'
  },
  creation_destruction: {
    name: '创灭之锤',
    paradox: 'transform_land + shatter',
    description: '创造与毁灭同时发生',
    illegalAbility: 'creation_burst',
    powerMultiplier: 3.0,
    corruption: 4,
    sideEffect: '地形改变后，相邻地形随机被破坏'
  },
  time_stillness: {
    name: '静时之沙',
    paradox: 'time_dilation + freeze_time',
    description: '时间加速与停滞的叠加态',
    illegalAbility: 'temporal_rift',
    powerMultiplier: 2.0,
    corruption: 3,
    sideEffect: '玩家下回合无法行动'
  },
  shield_spear: {
    name: '矛盾之盾',
    paradox: 'force_field + pierce',
    description: '绝对防御与绝对穿透的悖论',
    illegalAbility: 'paradox_barrier',
    powerMultiplier: 2.5,
    corruption: 3,
    sideEffect: '结界同时阻挡友方和敌方'
  },
  memory_forget: {
    name: '忘忆之镜',
    paradox: 'memory_beacon + erase',
    description: '铭记与遗忘的永恒循环',
    illegalAbility: 'memory_loop',
    powerMultiplier: 1.5,
    corruption: 2,
    sideEffect: '随机清除一个已发现的连锁反应'
  },
  water_fire: {
    name: '蒸腾之焰',
    paradox: 'absorb_water + ignite',
    description: '水与火同时存在又相互否定',
    illegalAbility: 'steam_burst',
    powerMultiplier: 2.0,
    corruption: 2,
    sideEffect: '范围内产生持续2回合的蒸汽迷雾'
  },
  guide_mislead: {
    name: '迷途之灯',
    paradox: 'guide + confuse',
    description: '引导与迷惑无法区分',
    illegalAbility: 'chaos_guide',
    powerMultiplier: 1.5,
    corruption: 2,
    sideEffect: '被引导单位有50%概率向反方向移动'
  }
};

// Corruption level thresholds
const CORRUPTION_THRESHOLDS = {
  mild: 2,      // Minor visual glitches
  moderate: 5,  // Validation engine starts rejecting normal cards
  severe: 8,    // Cognitive abyss acceleration
  critical: 12  // System breakdown events
};

export class VerificationCorruption {
  constructor() {
    this.corruptionLevel = 0; // Total accumulated corruption
    this.illegalCardsCreated = [];
    this.paradoxHistory = [];
    this.engineOverloaded = false;
    this.overloadThreshold = 10;
    this.corruptionEvents = [];
    this.bannedAbilities = new Set(); // Abilities banned by overload
  }

  // Attempt to create an illegal card by overloading the validation engine
  createParadoxCard(paradoxType, gameState, playerProfile = {}) {
    const result = {
      success: false,
      card: null,
      corruption: 0,
      warnings: [],
      narrative: '',
      sideEffects: [],
      engineState: 'stable'
    };

    const paradox = PARADOX_PATTERNS[paradoxType];
    if (!paradox) {
      result.warnings.push('未知的悖论类型');
      return result;
    }

    // Check if engine is already overloaded
    if (this.engineOverloaded) {
      result.warnings.push('验证引擎已过载，无法处理更多悖论');
      result.engineState = 'broken';
      return result;
    }

    // Calculate overload chance based on current corruption
    const overloadChance = this.corruptionLevel / this.overloadThreshold;
    if (Math.random() < overloadChance * 0.3) {
      this.triggerEngineOverload();
      result.warnings.push('验证引擎过载！系统进入崩溃模式...');
      result.engineState = 'overloaded';
      result.narrative = this.generateOverloadNarrative();
      return result;
    }

    // Generate the illegal card
    const card = this.generateIllegalCard(paradox, gameState);

    // Validate through engine (expecting failure, then override)
    const validation = validationEngine.validate(card, gameState, playerProfile);

    // Corruption overrides validation
    const corruptedValidation = this.corruptValidation(validation, paradox);

    result.success = true;
    result.card = card;
    result.corruption = paradox.corruption;
    result.warnings.push(`警告：${paradox.description}`);
    result.warnings.push(`副作用：${paradox.sideEffect}`);
    result.narrative = this.generateCorruptionNarrative(paradox, corruptedValidation);
    result.sideEffects.push(paradox.sideEffect);

    // Apply corruption
    this.corruptionLevel += paradox.corruption;
    this.illegalCardsCreated.push({
      type: paradoxType,
      timestamp: Date.now(),
      corruption: paradox.corruption
    });
    this.paradoxHistory.push(paradoxType);

    // Check corruption thresholds
    this.checkCorruptionThresholds(result);

    return result;
  }

  // Generate an illegal card based on paradox pattern
  generateIllegalCard(paradox, gameState) {
    return {
      id: `paradox-${paradox.illegalAbility}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: paradox.name,
      ability: paradox.illegalAbility,
      range: Math.floor(Math.random() * 3) + 1,
      duration: Math.floor(Math.random() * 3) + 2,
      cost: Math.floor(Math.random() * 2) + 2,
      stabilityCost: Math.floor(Math.random() * 2) + 1,
      description: paradox.description,
      side_effect: paradox.sideEffect,
      tags: ['illegal', 'paradox', 'corrupted'],
      powerMultiplier: paradox.powerMultiplier,
      isIllegal: true
    };
  }

  // Corrupt the validation result (override failures)
  corruptValidation(validation, paradox) {
    const corrupted = { ...validation };

    // Override validation failures
    if (!validation.passed) {
      corrupted.passed = true;
      corrupted.corrupted = true;
      corrupted.originalPassed = false;
      corrupted.warnings = [
        ...validation.warnings,
        '验证引擎被悖论过载...',
        `非法能力「${paradox.illegalAbility}」被强制通过`
      ];
    }

    // Amplify mutations
    if (validation.mutations && validation.mutations.length > 0) {
      corrupted.mutations = validation.mutations.map(m => ({
        ...m,
        corrupted: true,
        amplified: true
      }));
    }

    // Reduce narrative consistency
    corrupted.narrativeConsistency = Math.max(0, (validation.narrativeConsistency || 1) - 0.3);

    return corrupted;
  }

  // Trigger engine overload
  triggerEngineOverload() {
    this.engineOverloaded = true;
    this.corruptionEvents.push({
      type: 'overload',
      timestamp: Date.now(),
      corruptionLevel: this.corruptionLevel
    });

    // Ban random abilities
    const abilities = [
      'illuminate', 'absorb_water', 'grow_forest', 'transform_land',
      'time_dilation', 'force_field', 'memory_beacon', 'guide'
    ];
    const banCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < banCount; i++) {
      const ability = abilities[Math.floor(Math.random() * abilities.length)];
      this.bannedAbilities.add(ability);
    }
  }

  // Check and trigger corruption threshold events
  checkCorruptionThresholds(result) {
    if (this.corruptionLevel >= CORRUPTION_THRESHOLDS.critical &&
        !this.corruptionEvents.some(e => e.type === 'critical')) {
      this.corruptionEvents.push({ type: 'critical', timestamp: Date.now() });
      result.warnings.push('临界警告：验证引擎即将彻底崩溃！');
      result.sideEffects.push('所有正常造物卡有50%概率被判定为非法');
    } else if (this.corruptionLevel >= CORRUPTION_THRESHOLDS.severe &&
               !this.corruptionEvents.some(e => e.type === 'severe')) {
      this.corruptionEvents.push({ type: 'severe', timestamp: Date.now() });
      result.warnings.push('严重警告：认知深渊加速侵蚀！');
      result.sideEffects.push('认知深渊深度增加20%');
    } else if (this.corruptionLevel >= CORRUPTION_THRESHOLDS.moderate &&
               !this.corruptionEvents.some(e => e.type === 'moderate')) {
      this.corruptionEvents.push({ type: 'moderate', timestamp: Date.now() });
      result.warnings.push('验证引擎出现不稳定迹象');
      result.sideEffects.push('验证时间增加，偶尔出现错误提示');
    }
  }

  // Attempt to purify corruption (reduce corruption level)
  purify(amount = 2) {
    if (this.corruptionLevel <= 0) return { success: false, message: '无需净化' };

    const previousLevel = this.corruptionLevel;
    this.corruptionLevel = Math.max(0, this.corruptionLevel - amount);

    // Reset engine overload if corruption drops below threshold
    if (this.engineOverloaded && this.corruptionLevel < this.overloadThreshold * 0.5) {
      this.engineOverloaded = false;
      this.bannedAbilities.clear();
    }

    return {
      success: true,
      previousLevel,
      newLevel: this.corruptionLevel,
      message: `净化完成，腐化值从${previousLevel}降至${this.corruptionLevel}`
    };
  }

  // Generate corruption narrative
  generateCorruptionNarrative(paradox, validation) {
    const narratives = [
      `你硬把「${paradox.description}」塞进验证引擎。引擎叫了一声，就没声了。一张不该有的卡，从裂隙里掉了出来。`,
      `悖论在引擎里撞来撞去。${paradox.name}——一个讲不通的东西，硬给编成了真的。`,
      `引擎想挡，没挡住。${paradox.name}就这么给收下了，引擎自己也折了寿。`,
      `引擎里头咔嚓一声。${paradox.name}出来了，带着一股这世界里没有的劲。`
    ];

    return narratives[Math.floor(Math.random() * narratives.length)];
  }

  // Generate overload narrative
  generateOverloadNarrative() {
    return cognitiveEffects.distortText(
      '验证引擎撑爆了。系统散了。规矩全不作数。这回是真的乱了套。',
      0.8
    );
  }

  // Get available paradox types based on current state
  getAvailableParadoxes() {
    return Object.entries(PARADOX_PATTERNS).map(([type, data]) => ({
      type,
      ...data,
      risk: this.corruptionLevel + data.corruption > CORRUPTION_THRESHOLDS.critical ? 'critical' :
            this.corruptionLevel + data.corruption > CORRUPTION_THRESHOLDS.severe ? 'severe' :
            this.corruptionLevel + data.corruption > CORRUPTION_THRESHOLDS.moderate ? 'moderate' : 'low',
      canCreate: !this.engineOverloaded
    }));
  }

  // Get corruption statistics
  getStats() {
    return {
      corruptionLevel: this.corruptionLevel,
      totalIllegalCards: this.illegalCardsCreated.length,
      totalCorruptionGenerated: this.illegalCardsCreated.reduce((sum, c) => sum + c.corruption, 0),
      engineOverloaded: this.engineOverloaded,
      bannedAbilities: Array.from(this.bannedAbilities),
      paradoxTypesUsed: [...new Set(this.paradoxHistory)],
      thresholdEvents: this.corruptionEvents.map(e => e.type)
    };
  }

  // Get corruption state description
  getStateDescription() {
    if (this.corruptionLevel >= CORRUPTION_THRESHOLDS.critical) {
      return {
        level: 'critical',
        description: '验证引擎快塌了。真的假的全搅在一块，分不清了。',
        effects: ['all_cards_risky', 'engine_unstable', 'cognitive_bleed']
      };
    } else if (this.corruptionLevel >= CORRUPTION_THRESHOLDS.severe) {
      return {
        level: 'severe',
        description: '验证引擎严重受损。非法造物开始影响正常系统。',
        effects: ['validation_delayed', 'random_rejections', 'cognitive_acceleration']
      };
    } else if (this.corruptionLevel >= CORRUPTION_THRESHOLDS.moderate) {
      return {
        level: 'moderate',
        description: '验证引擎出现裂痕。偶尔会产生不可预知的行为。',
        effects: ['minor_glitches', 'occasional_overrides']
      };
    } else if (this.corruptionLevel > 0) {
      return {
        level: 'mild',
        description: '验证引擎轻微受损。系统仍基本稳定。',
        effects: ['visual_glitches']
      };
    }

    return {
      level: 'clean',
      description: '验证引擎运行正常。',
      effects: []
    };
  }

  // Generate CLI visualization
  visualizeCorruption() {
    const state = this.getStateDescription();
    const lines = [];

    lines.push('=== 验证腐化状态 ===');
    lines.push(`腐化值: ${this.corruptionLevel} | 状态: ${state.level}`);
    lines.push(state.description);
    lines.push('');

    if (this.engineOverloaded) {
      lines.push('⚠ 验证引擎已过载！');
      lines.push(`禁用能力: ${Array.from(this.bannedAbilities).join(', ') || '无'}`);
      lines.push('');
    }

    if (this.illegalCardsCreated.length > 0) {
      lines.push('--- 非法造物历史 ---');
      for (const card of this.illegalCardsCreated.slice(-5)) {
        lines.push(`  ${card.type} (+${card.corruption}腐化)`);
      }
      lines.push('');
    }

    const paradoxes = this.getAvailableParadoxes();
    lines.push('--- 可用悖论 ---');
    for (const p of paradoxes) {
      const riskSymbol = p.risk === 'critical' ? '☠' : p.risk === 'severe' ? '!' : p.risk === 'moderate' ? '?' : '·';
      lines.push(`  ${riskSymbol} ${p.name} (${p.paradox}) - 腐化+${p.corruption}`);
    }

    return lines.join('\n');
  }

  // Serialize
  serialize() {
    return {
      corruptionLevel: this.corruptionLevel,
      illegalCardsCreated: this.illegalCardsCreated,
      paradoxHistory: this.paradoxHistory,
      engineOverloaded: this.engineOverloaded,
      bannedAbilities: Array.from(this.bannedAbilities),
      corruptionEvents: this.corruptionEvents
    };
  }

  deserialize(data) {
    if (!data) return;
    this.corruptionLevel = data.corruptionLevel || 0;
    this.illegalCardsCreated = data.illegalCardsCreated || [];
    this.paradoxHistory = data.paradoxHistory || [];
    this.engineOverloaded = data.engineOverloaded || false;
    this.bannedAbilities = new Set(data.bannedAbilities || []);
    this.corruptionEvents = data.corruptionEvents || [];
  }
}

// Export singleton
export const verificationCorruption = new VerificationCorruption();
