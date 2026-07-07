// Cognitive Abyss System
// Core gameplay layer activated at high entropy (>= 90%)
// Inspired by Disco Elysium's skill inner monologue system
// Transforms cognitive effects from visual decoration to gameplay mechanic

import { cognitiveEffects } from './cognitiveEffects.js';
import { validationEngine } from './validationEngine.js';

// Abyss riddle templates - player must decode distorted information
const ABYSS_RIDDLES = {
  instruction: [
    {
      distorted: '向...光...走...不...要...停...',
      decoded: '向光走，不要停',
      hint: '寻找光源方向移动',
      reward: { type: 'knowledge', category: 'lore' }
    },
    {
      distorted: '水...即...是...路...也...是...墙...',
      decoded: '水即是路，也是墙',
      hint: '水域可通行但需要桥梁',
      reward: { type: 'knowledge', category: 'secret' }
    },
    {
      distorted: '三...个...声...音...汇...聚...时...门...开...',
      decoded: '三个声音汇聚时，门开',
      hint: '需要三种共鸣同时存在',
      reward: { type: 'ritual', recipeId: 'light_forge' }
    }
  ],
  npc_dialogue: [
    {
      npc: '老渔夫',
      distorted: '我...曾...经...害...怕...黑...暗...现...在...黑...暗...是...我...的...朋...友...',
      decoded: '我曾经害怕黑暗，现在黑暗是我的朋友',
      meaning: 'NPC态度反转，从高恐惧变为接受黑暗',
      emotionalShift: { fear: -30, hope: 10 }
    },
    {
      npc: '小烛',
      distorted: '光...太...亮...了...我...想...回...到...黑...暗...中...',
      decoded: '光太亮了，我想回到黑暗中',
      meaning: 'NPC产生光敏感，照明可能伤害她',
      emotionalShift: { fear: 20, hope: -20 }
    },
    {
      npc: '守忆人',
      distorted: '我...记...得...一...切...也...什...么...都...不...记...得...',
      decoded: '我记得一切，也什么都不记得',
      meaning: 'NPC记忆混乱，提供的信息真假参半',
      emotionalShift: { trust: -15 }
    }
  ],
  myth_fragment: [
    {
      distorted: '创...世...者...来...自...裂...隙...又...回...到...裂...隙...',
      decoded: '创世者来自裂隙，又回到裂隙',
      archetype: 'CycleMyth',
      truth: 0.7
    },
    {
      distorted: '救...赎...即...是...毁...灭...毁...灭...即...是...救...赎...',
      decoded: '救赎即是毁灭，毁灭即是救赎',
      archetype: 'Tragedy',
      truth: 0.5
    }
  ]
};

// Abyss state thresholds
const ABYSS_THRESHOLDS = {
  mild: 0.6,    // 60% entropy - text jitter, subtle hints
  moderate: 0.8, // 80% entropy - riddles appear, NPCs reverse
  deep: 0.9     // 90% entropy - full abyss mode, gameplay shifts
};

export class CognitiveAbyss {
  constructor() {
    this.active = false;
    this.depth = 0; // 0-1, current abyss depth
    this.riddlesSolved = 0;
    this.riddlesFailed = 0;
    this.decodedMessages = []; // Successfully decoded messages
    this.npcReversals = new Map(); // npcId -> reversed traits
    this.abyssLog = []; // History of abyss events
    this.currentRiddle = null;
    this.mythFragmentsRevealed = [];
  }

  // Update abyss state based on current entropy
  update(entropy, entropyLimit = 7) {
    const ratio = entropy / entropyLimit;
    const prevDepth = this.depth;
    this.depth = ratio;

    // Activate/deactivate abyss mode
    if (ratio >= ABYSS_THRESHOLDS.deep) {
      if (!this.active) {
        this.active = true;
        this.enterAbyss();
      }
    } else if (ratio < ABYSS_THRESHOLDS.mild) {
      if (this.active) {
        this.active = false;
        this.exitAbyss();
      }
    }

    // Check for depth transitions
    if (prevDepth < ABYSS_THRESHOLDS.moderate && ratio >= ABYSS_THRESHOLDS.moderate) {
      this.onModerateThreshold();
    }

    cognitiveEffects.updateDistortion(entropy, entropyLimit);
  }

  // Enter full abyss mode
  enterAbyss() {
    this.abyssLog.push({
      type: 'enter',
      timestamp: Date.now(),
      depth: this.depth
    });
  }

  // Exit abyss mode
  exitAbyss() {
    this.abyssLog.push({
      type: 'exit',
      timestamp: Date.now(),
      depth: this.depth
    });
  }

  // Triggered when crossing moderate threshold
  onModerateThreshold() {
    this.abyssLog.push({
      type: 'moderate_threshold',
      timestamp: Date.now()
    });
  }

  // Generate a riddle for the player to decode
  generateRiddle(type = 'instruction') {
    if (!this.active && this.depth < ABYSS_THRESHOLDS.moderate) return null;

    const pool = ABYSS_RIDDLES[type];
    if (!pool || pool.length === 0) return null;

    const riddle = pool[Math.floor(Math.random() * pool.length)];

    // Apply cognitive distortion based on depth
    const distortionIntensity = Math.min(1, this.depth * 1.2);
    const distorted = cognitiveEffects.distortText(riddle.distorted, distortionIntensity);

    this.currentRiddle = {
      ...riddle,
      displayed: distorted,
      type,
      createdAt: Date.now(),
      attempts: 0
    };

    return this.currentRiddle;
  }

  // Attempt to decode a riddle
  attemptDecode(playerInput) {
    if (!this.currentRiddle) return { success: false, message: '没有待解码的谜题' };

    this.currentRiddle.attempts++;

    // Check if player input matches decoded text (fuzzy match)
    const decoded = this.currentRiddle.decoded;
    const similarity = this.calculateSimilarity(playerInput, decoded);

    if (similarity > 0.7) {
      // Success
      const reward = this.currentRiddle.reward;
      this.decodedMessages.push({
        original: this.currentRiddle.distorted,
        decoded: decoded,
        type: this.currentRiddle.type,
        attempts: this.currentRiddle.attempts,
        timestamp: Date.now()
      });
      this.riddlesSolved++;

      const result = {
        success: true,
        message: `解码成功：「${decoded}」`,
        reward,
        hint: this.currentRiddle.hint
      };

      this.currentRiddle = null;
      return result;
    } else if (this.currentRiddle.attempts >= 3) {
      // Failed after 3 attempts
      this.riddlesFailed++;
      const result = {
        success: false,
        message: '解码失败...谜题消散了',
        hint: this.currentRiddle.hint,
        penalty: { entropy: 1 }
      };

      this.currentRiddle = null;
      return result;
    }

    return {
      success: false,
      message: `不完全正确...（尝试 ${this.currentRiddle.attempts}/3）`,
      similarity: Math.round(similarity * 100)
    };
  }

  // Calculate text similarity (simple Chinese-aware)
  calculateSimilarity(a, b) {
    const cleanA = a.replace(/[\s.\.。，！？]/g, '');
    const cleanB = b.replace(/[\s.\.。，！？]/g, '');

    if (cleanA === cleanB) return 1.0;

    // Count common bigrams
    const getBigrams = (text) => {
      const bigrams = new Set();
      for (let i = 0; i < text.length - 1; i++) {
        bigrams.add(text[i] + text[i + 1]);
      }
      return bigrams;
    };

    const bigramsA = getBigrams(cleanA);
    const bigramsB = getBigrams(cleanB);

    let common = 0;
    for (const bg of bigramsA) {
      if (bigramsB.has(bg)) common++;
    }

    const total = bigramsA.size + bigramsB.size - common;
    return total > 0 ? common / Math.min(bigramsA.size, bigramsB.size) : 0;
  }

  // Get reversed NPC dialogue in abyss mode
  getNPCDialogue(npcId, npcName, originalDialogue) {
    if (!this.active && this.depth < ABYSS_THRESHOLDS.moderate) {
      return {
        text: originalDialogue,
        isReversed: false
      };
    }

    // Check if this NPC has a reversal pattern
    const reversal = ABYSS_RIDDLES.npc_dialogue.find(r => r.npc === npcName);
    if (reversal && Math.random() < this.depth) {
      return {
        text: cognitiveEffects.distortText(reversal.distorted, this.depth),
        decoded: reversal.decoded,
        meaning: reversal.meaning,
        emotionalShift: reversal.emotionalShift,
        isReversed: true
      };
    }

    // Regular distortion
    return {
      text: cognitiveEffects.distortText(originalDialogue, this.depth * 0.7),
      isReversed: false
    };
  }

  // Generate myth fragment in abyss mode
  generateMythFragment() {
    if (!this.active) return null;

    const pool = ABYSS_RIDDLES.myth_fragment;
    const fragment = pool[Math.floor(Math.random() * pool.length)];

    const distortionIntensity = Math.min(1, this.depth * 1.1);
    const distorted = cognitiveEffects.distortText(fragment.distorted, distortionIntensity);

    const result = {
      ...fragment,
      displayed: distorted,
      revealedAt: Date.now()
    };

    this.mythFragmentsRevealed.push(result);
    return result;
  }

  // Validate creation in abyss mode (inverted validation)
  validateCreationInAbyss(card, gameState) {
    const baseValidation = validationEngine.validate(card, gameState);

    if (!this.active) return baseValidation;

    // In abyss, "wrong" abilities might produce correct effects
    const invertedChance = (this.depth - 0.9) * 5; // 0-0.5 range
    if (Math.random() < invertedChance && !baseValidation.passed) {
      return {
        ...baseValidation,
        passed: true,
        abyssInverted: true,
        warnings: [...baseValidation.warnings, '深渊扭曲了验证逻辑...']
      };
    }

    return baseValidation;
  }

  // Get current abyss state description
  getStateDescription() {
    if (!this.active) {
      if (this.depth >= ABYSS_THRESHOLDS.moderate) {
        return {
          level: 'approaching',
          description: '裂隙快开了……世界边上在打哆嗦。',
          effects: ['text_jitter', 'subtle_hints']
        };
      }
      return {
        level: 'dormant',
        description: '深渊沉睡中。',
        effects: []
      };
    }

    const depth = this.depth;
    if (depth >= 0.95) {
      return {
        level: 'apocalyptic',
        description: '脑子里的界限全垮了。真也是假，假也是真。想把出谜语的理清楚，才活得下去。',
        effects: ['full_distortion', 'riddles', 'npc_reversal', 'myth_fragments', 'inverted_validation'],
        riddlesAvailable: true,
        npcReversal: true
      };
    } else if (depth >= 0.85) {
      return {
        level: 'deep',
        description: '深渊铺开了。眼前冒出谜语，NPC说的话也信不得了。',
        effects: ['riddles', 'npc_reversal', 'myth_fragments'],
        riddlesAvailable: true,
        npcReversal: true
      };
    } else {
      return {
        level: 'shallow',
        description: '深渊冒头了。字开始扭，时不时能瞅见藏着的东西。',
        effects: ['text_jitter', 'occasional_riddles'],
        riddlesAvailable: Math.random() < 0.3
      };
    }
  }

  // Get abyss statistics
  getStats() {
    return {
      totalRiddles: this.riddlesSolved + this.riddlesFailed,
      solved: this.riddlesSolved,
      failed: this.riddlesFailed,
      successRate: this.riddlesSolved + this.riddlesFailed > 0
        ? this.riddlesSolved / (this.riddlesSolved + this.riddlesFailed)
        : 0,
      decodedMessages: this.decodedMessages.length,
      mythFragments: this.mythFragmentsRevealed.length,
      maxDepth: this.abyssLog.reduce((max, e) => Math.max(max, e.depth || 0), 0),
      timesEntered: this.abyssLog.filter(e => e.type === 'enter').length
    };
  }

  // Generate CLI visualization of abyss state
  visualizeAbyss() {
    const state = this.getStateDescription();
    const lines = [];

    lines.push('=== 认知深渊 ===');
    lines.push(`深度: ${(this.depth * 100).toFixed(0)}% | 状态: ${state.level}`);
    lines.push(state.description);
    lines.push('');

    if (this.currentRiddle) {
      lines.push('--- 待解谜题 ---');
      lines.push(`[谜题] ${this.currentRiddle.displayed}`);
      lines.push(`尝试: ${this.currentRiddle.attempts}/3`);
      lines.push('');
    }

    if (this.decodedMessages.length > 0) {
      lines.push('--- 已解码信息 ---');
      for (const msg of this.decodedMessages.slice(-3)) {
        lines.push(`✓ ${msg.decoded}`);
      }
      lines.push('');
    }

    if (this.mythFragmentsRevealed.length > 0) {
      lines.push('--- 神话碎片 ---');
      for (const frag of this.mythFragmentsRevealed.slice(-2)) {
        lines.push(`? ${frag.displayed}`);
      }
    }

    return lines.join('\n');
  }

  // Serialize
  serialize() {
    return {
      active: this.active,
      depth: this.depth,
      riddlesSolved: this.riddlesSolved,
      riddlesFailed: this.riddlesFailed,
      decodedMessages: this.decodedMessages,
      npcReversals: Array.from(this.npcReversals.entries()),
      abyssLog: this.abyssLog,
      mythFragmentsRevealed: this.mythFragmentsRevealed
    };
  }

  deserialize(data) {
    if (!data) return;
    this.active = data.active || false;
    this.depth = data.depth || 0;
    this.riddlesSolved = data.riddlesSolved || 0;
    this.riddlesFailed = data.riddlesFailed || 0;
    this.decodedMessages = data.decodedMessages || [];
    this.npcReversals = new Map(data.npcReversals || []);
    this.abyssLog = data.abyssLog || [];
    this.mythFragmentsRevealed = data.mythFragmentsRevealed || [];
  }
}

// Export singleton
export const cognitiveAbyss = new CognitiveAbyss();
