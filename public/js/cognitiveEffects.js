// Cognitive Effects System
// Simulates memory distortion, confirmation bias, and narrative bias
// Inspired by cognitive psychology: confirmation bias, recency effect, narrative bias
// Works in both browser and CLI environments

export class CognitiveEffects {
  constructor() {
    this.entropyThresholds = {
      mild: 5,      // Text jitter, color hints
      moderate: 7,  // Contradictory NPC dialogue, memory fragments
      severe: 9     // Full cognitive distortion, reality breakdown
    };
    this.memoryFragments = []; // Past level memory fragments
    this.distortionLevel = 0; // Current distortion intensity (0-1)
  }

  // Update distortion level based on game entropy
  updateDistortion(entropy, entropyLimit = 7) {
    this.distortionLevel = Math.min(1, entropy / entropyLimit);
  }

  // Apply text distortion to a string (works in CLI)
  distortText(text, intensity = this.distortionLevel) {
    if (intensity <= 0) return text;

    const original = String(text);
    const chars = text.split('');
    const distortionCount = Math.max(1, Math.floor(chars.length * intensity * 0.3));

    for (let i = 0; i < distortionCount; i++) {
      const idx = Math.floor(Math.random() * chars.length);
      if (chars[idx] === ' ' || chars[idx] === '\n') continue;

      const roll = Math.random();
      if (roll < 0.3 * intensity) {
        // Replace with similar-looking character
        chars[idx] = this.getDistortedChar(chars[idx]);
      } else if (roll < 0.6 * intensity) {
        // Duplicate character
        chars[idx] = chars[idx] + chars[idx];
      } else {
        // Add visual noise marker
        chars[idx] = chars[idx] + '*';
      }
    }

    const distorted = chars.join('');
    return distorted === original ? `${original}*` : distorted;
  }

  getDistortedChar(char) {
    const distortions = {
      '的': 'の', '了': '勒', '在': '再', '是': '事', '我': '吾',
      '有': '友', '和': '禾', '就': '救', '不': '步', '人': '入',
      '光': '火', '明': '名', '暗': '谙', '黑': '墨', '水': '氷',
      '山': '彡', '大': '太', '小': '少', '上': '下', '下': '上',
      '生': '死', '死': '生', '来': '去', '去': '来', '好': '女',
      '心': '必', '情': '晴', '思': '丝', '想': '相', '梦': '林',
      '创': '枪', '造': '遭', '物': '勿', '神': '申', '灵': '火',
      '界': '介', '世': '廿', '界': '介', '裂': '列', '隙': '细'
    };
    return distortions[char] || char;
  }

  // Generate contradictory NPC dialogue based on distorted memory
  generateContradictoryDialogue(originalDialogue, npcName, intensity = this.distortionLevel) {
    if (intensity < 0.5) return originalDialogue;

    const contradictions = {
      '老渔夫': [
        '水涨了...不，水退了。我记得...我不记得了。',
        '你救过他们？还是...你创造了洪水？',
        '时间不是线性的，鱼群告诉我。'
      ],
      '小烛': [
        '你是好人...不对，你是怪物！不...你是...谁？',
        '昨天你说要救我，但今天...你好像变了。',
        '记忆像泡泡，一碰就碎。'
      ],
      '矿灯幽灵': [
        '我...等了很久...或者...我刚到？',
        '黑暗...不可怕...不，黑暗是最可怕的...',
        '你...是救我的人...还是...困住我的人？'
      ],
      '驯兽人': [
        '巨兽是敌人...不，巨兽是朋友...也许两者都是。',
        '自然有节奏...但现在节奏乱了。',
        '你上次说...什么？我记不起来了。'
      ],
      '边境诗人': [
        '诗歌是真实的...不，真实是诗歌...',
        '我写过关于你的诗...但我忘了内容。',
        '语言断裂了...就像...我的心。'
      ],
      '守忆人': [
        '我记得...一切...不，我什么都不记得。',
        '你...我们以前见过吗？在...哪里？',
        '记忆像沙子...抓得越紧...流得越快...'
      ],
      '世界之灵': [
        '你是造物者...不，你是毁灭者...也许两者都是。',
        '时间...不是线性的...你感觉到了吗？',
        '裂隙...在扩大...也在愈合...同时发生。'
      ]
    };

    const pool = contradictions[npcName];
    if (!pool) return originalDialogue;

    // Replace with contradictory version based on intensity
    if (Math.random() < intensity) {
      return pool[Math.floor(Math.random() * pool.length)];
    }

    return originalDialogue;
  }

  // Generate memory fragments for high entropy (works in CLI as text)
  generateMemoryFragments(pastEvents, intensity = this.distortionLevel) {
    if (intensity < 0.6 || !pastEvents || pastEvents.length === 0) return [];

    const fragments = [];
    const fragmentCount = Math.floor(intensity * 3) + 1;

    for (let i = 0; i < fragmentCount; i++) {
      const event = pastEvents[Math.floor(Math.random() * pastEvents.length)];
      const distorted = this.distortText(event, intensity * 0.7);
      fragments.push({
        text: distorted,
        opacity: 0.3 + Math.random() * 0.5,
        position: {
          x: Math.random() * 80 + 10, // 10-90% of screen
          y: Math.random() * 80 + 10
        }
      });
    }

    return fragments;
  }

  // Get cognitive distortion description for current state (CLI-friendly)
  getDistortionDescription(entropy, entropyLimit = 7) {
    const ratio = entropy / entropyLimit;

    if (ratio < 0.5) {
      return {
        level: 'stable',
        description: '记忆清晰，世界稳定。',
        effects: []
      };
    } else if (ratio < 0.7) {
      return {
        level: 'mild',
        description: '裂隙开始搅你的脑子。字偶尔闪一下，记忆叠了影。',
        effects: ['text_jitter', 'color_shift']
      };
    } else if (ratio < 0.9) {
      return {
        level: 'moderate',
        description: '眼前的东西靠不住了。NPC的话前后对不上，旧画面在眼角晃。',
        effects: ['text_jitter', 'color_shift', 'memory_fragments', 'contradictory_dialogue']
      };
    } else {
      return {
        level: 'severe',
        description: '脑子里的界限垮了。世界在重搭，记忆在乱拼，你分不清哪是真的。',
        effects: ['text_jitter', 'color_shift', 'memory_fragments', 'contradictory_dialogue', 'reality_break']
      };
    }
  }

  // Apply cognitive distortion to game log entries
  distortLogEntry(entry, intensity = this.distortionLevel) {
    if (intensity <= 0.3) return entry;

    const distorted = { ...entry };

    // Distort text based on intensity
    if (intensity > 0.5) {
      distorted.text = this.distortText(entry.text, intensity * 0.5);
    }

    // Add memory bleed (past events bleeding into current)
    if (intensity > 0.7 && this.memoryFragments.length > 0) {
      const fragment = this.memoryFragments[Math.floor(Math.random() * this.memoryFragments.length)];
      distorted.text += ` [记忆碎片: ${fragment}]`;
    }

    return distorted;
  }

  // Store past events for memory fragments
  storeMemoryFragment(event) {
    this.memoryFragments.push(event);
    // Keep only last 20 fragments
    if (this.memoryFragments.length > 20) {
      this.memoryFragments = this.memoryFragments.slice(-20);
    }
  }

  // Generate "deja vu" narrative when similar events repeat
  generateDejaVu(currentEvent, pastEvents, intensity = this.distortionLevel) {
    if (intensity < 0.4 || !pastEvents || pastEvents.length === 0) return null;

    // Find semantically similar past events
    const similar = pastEvents.filter(past => {
      const commonWords = this.countCommonWords(currentEvent, past);
      return commonWords >= 2; // At least 2 common words
    });

    if (similar.length === 0) return null;

    const dejaVuTemplates = [
      `这一幕……眼熟。在${similar.length > 1 ? '过去' : '记忆中'}，像是也遇过差不多的。`,
      `时间……在打转。你觉得这事儿像经历过。`,
      `世界在转圈，还是你的记忆在糊弄你？`,
      `裂隙不光拧了空间，也拧了时间。这一幕……你敢说是头一回？`
    ];

    return {
      type: 'deja_vu',
      text: dejaVuTemplates[Math.floor(Math.random() * dejaVuTemplates.length)],
      similarEvents: similar.length,
      intensity
    };
  }

  countCommonWords(text1, text2) {
    // Chinese-aware tokenization: split by punctuation and also extract 2-grams
    const clean1 = text1.replace(/[\s,，。！？.\-\[\]]+/g, ' ');
    const clean2 = text2.replace(/[\s,，。！？.\-\[\]]+/g, ' ');

    // Extract words (2+ chars) and 2-grams
    const getTokens = (text) => {
      const tokens = new Set();
      const chars = text.replace(/\s/g, '').split('');
      for (let i = 0; i < chars.length - 1; i++) {
        const bigram = chars[i] + chars[i + 1];
        if (bigram.length >= 2) tokens.add(bigram);
      }
      return tokens;
    };

    const tokens1 = getTokens(clean1);
    const tokens2 = getTokens(clean2);

    let count = 0;
    for (const token of tokens1) {
      if (tokens2.has(token)) count++;
    }
    return count;
  }

  // Get CSS/THREE.js effects for browser (returns effect descriptors)
  getVisualEffects(entropy, entropyLimit = 7) {
    const ratio = entropy / entropyLimit;
    const effects = [];

    if (ratio > 0.5) {
      effects.push({
        type: 'chromatic_aberration',
        intensity: (ratio - 0.5) * 2,
        description: 'RGB通道分离'
      });
    }

    if (ratio > 0.6) {
      effects.push({
        type: 'vignette',
        intensity: (ratio - 0.6) * 2.5,
        description: '边缘暗角'
      });
    }

    if (ratio > 0.7) {
      effects.push({
        type: 'noise',
        intensity: (ratio - 0.7) * 3.3,
        description: '噪点干扰'
      });
    }

    if (ratio > 0.8) {
      effects.push({
        type: 'warp',
        intensity: (ratio - 0.8) * 5,
        description: '空间扭曲'
      });
    }

    return effects;
  }

  // Serialize
  serialize() {
    return {
      distortionLevel: this.distortionLevel,
      memoryFragments: this.memoryFragments
    };
  }

  deserialize(data) {
    if (!data) return;
    this.distortionLevel = data.distortionLevel || 0;
    this.memoryFragments = data.memoryFragments || [];
  }
}

// Export singleton
export const cognitiveEffects = new CognitiveEffects();
