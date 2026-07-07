// Rift Echoes System
// Past creations manifest as ghostly echoes at high entropy
// Inspired by Return of the Obra Dinn's death flashbacks + Elden Ring message system
// Connects VectorMemory (past creations) with CognitiveAbyss (distortion)

import { cognitiveEffects } from './cognitiveEffects.js';

// Echo types determine how the past creation manifests
export const ECHO_TYPES = {
  benevolent: {
    name: '善意回响',
    description: '过去的造物以温和的形式重现，保留原有效果',
    effectMultiplier: 0.7,
    distortionChance: 0.2,
    visualStyle: 'translucent_glow',
    narrativeTone: 'nostalgic'
  },
  malicious: {
    name: '恶意回响',
    description: '过去的造物被裂隙扭曲，产生反向效果',
    effectMultiplier: -0.5, // Reverse effect
    distortionChance: 0.8,
    visualStyle: 'corrupted_glitch',
    narrativeTone: 'menacing'
  },
  paradoxical: {
    name: '悖论回响',
    description: '同时存在和不存在，效果随机触发',
    effectMultiplier: 1.0,
    distortionChance: 0.5,
    visualStyle: 'flickering',
    narrativeTone: 'uncertain'
  },
  prophetic: {
    name: '预言回响',
    description: '来自未来的造物投影，效果增强但短暂',
    effectMultiplier: 1.5,
    distortionChance: 0.3,
    visualStyle: 'ethereal',
    narrativeTone: 'mystical'
  }
};

// Ability reversals for malicious echoes
export const ABILITY_REVERSALS = {
  'illuminate': 'darken',
  'absorb_water': 'flood',
  'grow_forest': 'wither',
  'transform_land': 'shatter',
  'force_field': 'vulnerability',
  'calm': 'enrage',
  'guide': 'mislead',
  'create_bridge': 'destroy_bridge',
  'cleanse': 'corrupt',
  'sun_blessing': 'shadow_curse',
  'memory_beacon': 'memory_erase',
  'time_dilation': 'time_freeze',
  'reveal_path': 'obscure_path',
  'dream_link': 'nightmare_link',
  'raise_earth': 'sink_earth',
  'block': 'unblock',
  'trap': 'free',
  'slow_beast': 'hasten_beast',
  'pierce': 'shield',
  'ignite': 'extinguish'
};

export class RiftEcho {
  constructor(data) {
    this.id = data.id || `echo-${Date.now()}-${Math.random()}`;
    this.originalCreation = data.originalCreation || null; // The past creation memory
    this.echoType = data.echoType || 'benevolent';
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.remainingTurns = data.remainingTurns || 3;
    this.active = true;
    this.triggered = false;
    this.manifestedAt = Date.now();
    this.narrative = data.narrative || '';
    this.distortedAbility = data.distortedAbility || null;
    this.visualState = 'forming'; // forming, stable, fading
  }

  // Determine if echo triggers its effect this turn
  shouldTrigger() {
    if (!this.active || this.remainingTurns <= 0) return false;

    const echoType = ECHO_TYPES[this.echoType];
    if (this.echoType === 'paradoxical') {
      // 50% chance each turn
      return Math.random() < 0.5;
    }

    return true;
  }

  // Get the effective ability for this echo
  getEffectiveAbility() {
    if (!this.originalCreation) return null;

    const echoType = ECHO_TYPES[this.echoType];
    const originalAbility = this.originalCreation.ability || this.originalCreation.card?.ability;

    if (this.echoType === 'malicious') {
      return ABILITY_REVERSALS[originalAbility] || originalAbility;
    }

    return originalAbility;
  }

  // Get effect description
  getEffectDescription() {
    const echoType = ECHO_TYPES[this.echoType];
    const ability = this.getEffectiveAbility();
    const originalName = this.originalCreation?.name || this.originalCreation?.card?.name || '未知造物';

    if (this.echoType === 'malicious') {
      return `${originalName}的恶意回响：能力被扭曲为「${ability}」`;
    } else if (this.echoType === 'paradoxical') {
      return `${originalName}的悖论回响：效果不稳定，随机触发`;
    } else if (this.echoType === 'prophetic') {
      return `${originalName}的预言回响：效果增强但即将消散`;
    }

    return `${originalName}的善意回响：温柔地重现过去的力量`;
  }

  // Advance one turn
  tick() {
    if (this.remainingTurns <= 0) {
      this.active = false;
      this.visualState = 'faded';
      return { expired: true };
    }

    this.remainingTurns--;

    if (this.remainingTurns === 1) {
      this.visualState = 'fading';
    } else if (this.remainingTurns > 1) {
      this.visualState = 'stable';
    }

    return { expired: false, remaining: this.remainingTurns };
  }

  // Generate narrative text for echo manifestation
  generateNarrative(depth = 0.5) {
    const echoType = ECHO_TYPES[this.echoType];
    const originalName = this.originalCreation?.name || this.originalCreation?.card?.name || '某个造物';

    const narratives = {
      benevolent: [
        `你瞥见${originalName}的影子——它护过这地方，那点念想还在护着。`,
        `裂隙里透出${originalName}的回声，软和和的，像谁在冲你点头。`,
        `时间像是回了一下头，${originalName}的光又把这地方照亮了。`,
        `耳熟的声音响起来——是${originalName}，它没走干净。`
      ],
      malicious: [
        `裂隙把${originalName}的记忆拧歪了，这会儿带着恨回来了。`,
        `${originalName}的影子里进了脏东西，劲儿现在冲着你来。`,
        `你看见${originalName}……可它不对劲，像是叫什么东西啃过。`,
        `旧造物的残壳在裂隙里打颤，${originalName}成了你不认得的样子。`
      ],
      paradoxical: [
        `${originalName}在又不在，你一眼看去了它的来和去。`,
        `裂隙把${originalName}卡在半道上——你不瞧它，它就定不下形。`,
        `你瞅见${originalName}的影，一眨眼又没了。`,
        `时间在这儿叠上了，${originalName}的从前和往后一块冒出来。`
      ],
      prophetic: [
        `${originalName}往后那副样子，趟着时间到了眼前，带着你还没摸着的劲。`,
        `你瞅了一眼后头——${originalName}比现在更壮实，亮堂堂的。`,
        `这不是从前的回声，是后头的兆头：${originalName}要换一副新样子来。`,
        `时间倒着淌了一截，把${originalName}更老练的那面带了过来。`
      ]
    };

    const pool = narratives[this.echoType] || narratives.benevolent;
    let narrative = pool[Math.floor(Math.random() * pool.length)];

    // Apply cognitive distortion based on abyss depth
    if (depth > 0.7) {
      narrative = cognitiveEffects.distortText(narrative, depth * 0.5);
    }

    return narrative;
  }

  serialize() {
    return {
      id: this.id,
      originalCreation: this.originalCreation,
      echoType: this.echoType,
      x: this.x,
      y: this.y,
      remainingTurns: this.remainingTurns,
      active: this.active,
      triggered: this.triggered,
      manifestedAt: this.manifestedAt,
      narrative: this.narrative,
      distortedAbility: this.distortedAbility,
      visualState: this.visualState
    };
  }

  static deserialize(data) {
    return new RiftEcho(data);
  }
}

export class RiftEchoSystem {
  constructor() {
    this.echoes = []; // Active echoes on the field
    this.echoHistory = []; // All echoes that have manifested
    this.maxEchoes = 3; // Maximum simultaneous echoes
    this.entropyThreshold = 0.6; // 60% entropy to start echoes
    this.echoChance = 0.3; // Base chance per turn when threshold met
    this.totalManifested = 0;
  }

  // Check if echoes should manifest based on game state
  shouldManifest(gameState) {
    const entropy = gameState.entropy || 0;
    const entropyLimit = gameState.entropyLimit || 7;
    const ratio = entropy / entropyLimit;

    if (ratio < this.entropyThreshold) return false;

    // Higher entropy = higher chance
    const chance = this.echoChance + (ratio - this.entropyThreshold) * 0.5;
    return Math.random() < chance;
  }

  // Determine echo type based on game state
  determineEchoType(gameState, depth = 0) {
    const entropy = gameState.entropy || 0;
    const entropyLimit = gameState.entropyLimit || 7;
    const ratio = entropy / entropyLimit;

    // Corruption increases malicious chance
    const corruptionLevel = gameState.corruptionLevel || 0;
    const corruptionBonus = corruptionLevel * 0.05;

    // Abyss depth increases paradoxical chance
    const abyssBonus = depth * 0.3;

    const roll = Math.random();

    if (roll < 0.15 + abyssBonus) return 'prophetic';
    if (roll < 0.35 + corruptionBonus + abyssBonus) return 'malicious';
    if (roll < 0.55 + abyssBonus) return 'paradoxical';
    return 'benevolent';
  }

  // Manifest a new echo from memory
  manifestEcho(memory, gameState, position = null) {
    if (this.echoes.length >= this.maxEchoes) {
      return { success: false, error: '场上回响已达上限' };
    }

    if (!memory) {
      return { success: false, error: '无可用记忆' };
    }

    const depth = gameState.abyssDepth || 0;
    const echoType = this.determineEchoType(gameState, depth);

    // Determine position
    let x, y;
    if (position) {
      x = position.x;
      y = position.y;
    } else {
      // Random position on board (7x7)
      x = Math.floor(Math.random() * 7);
      y = Math.floor(Math.random() * 7);
    }

    const echo = new RiftEcho({
      originalCreation: memory,
      echoType,
      x,
      y,
      remainingTurns: Math.floor(Math.random() * 3) + 2 // 2-4 turns
    });

    echo.narrative = echo.generateNarrative(depth);

    // Determine distorted ability for malicious echoes
    if (echoType === 'malicious') {
      const originalAbility = memory.ability || memory.card?.ability;
      echo.distortedAbility = ABILITY_REVERSALS[originalAbility] || originalAbility;
    }

    this.echoes.push(echo);
    this.echoHistory.push({
      echoId: echo.id,
      type: echoType,
      originalName: memory.name || memory.card?.name || '未知',
      manifestedAt: Date.now(),
      turn: gameState.turn || 0
    });
    this.totalManifested++;

    return {
      success: true,
      echo,
      narrative: echo.narrative
    };
  }

  // Try to manifest echoes from vector memory
  tryManifestFromMemory(vectorMemory, gameState, query = 'creation') {
    if (!this.shouldManifest(gameState)) {
      return { success: false, reason: '裂隙值不足以产生回响' };
    }

    // Query memory for past creations
    const memories = vectorMemory.query(query, 5);
    if (!memories || memories.length === 0) {
      return { success: false, reason: '没有找到相关记忆' };
    }

    // Filter for creation-related memories
    const creationMemories = memories.filter(m =>
      m.metadata?.type === 'creation' ||
      m.text?.includes('造物') ||
      m.text?.includes('创造')
    );

    // If no creation memories, use any memory
    const candidatePool = creationMemories.length > 0 ? creationMemories : memories;

    // Pick random memory from candidates
    const memory = candidatePool[Math.floor(Math.random() * candidatePool.length)];

    return this.manifestEcho(memory, gameState);
  }

  // Process all active echoes at end of turn
  processTurn(gameState) {
    const results = [];

    for (let i = this.echoes.length - 1; i >= 0; i--) {
      const echo = this.echoes[i];
      const tickResult = echo.tick();

      if (tickResult.expired) {
        results.push({
          echo,
          type: 'expired',
          narrative: `${echo.originalCreation?.name || '回响'}消散了...`
        });
        this.echoes.splice(i, 1);
      } else {
        // Check if echo triggers effect
        if (echo.shouldTrigger()) {
          results.push({
            echo,
            type: 'triggered',
            ability: echo.getEffectiveAbility(),
            description: echo.getEffectDescription()
          });
        } else {
          results.push({
            echo,
            type: 'dormant',
            remaining: tickResult.remaining
          });
        }
      }
    }

    return results;
  }

  // Get echoes at a specific position
  getEchoesAt(x, y) {
    return this.echoes.filter(e => e.x === x && e.y === y && e.active);
  }

  // Get all active echoes
  getActiveEchoes() {
    return this.echoes.filter(e => e.active);
  }

  // Remove an echo by ID
  dismissEcho(echoId) {
    const index = this.echoes.findIndex(e => e.id === echoId);
    if (index >= 0) {
      const echo = this.echoes[index];
      echo.active = false;
      this.echoes.splice(index, 1);
      return { success: true, echo };
    }
    return { success: false, error: '回响不存在' };
  }

  // Get statistics
  getStats() {
    const active = this.getActiveEchoes();
    const typeCounts = {};

    for (const echo of this.echoHistory) {
      typeCounts[echo.type] = (typeCounts[echo.type] || 0) + 1;
    }

    return {
      totalManifested: this.totalManifested,
      currentlyActive: active.length,
      typeDistribution: typeCounts,
      echoHistory: this.echoHistory.length
    };
  }

  // Generate CLI visualization
  visualizeEchoes() {
    const lines = [];
    const active = this.getActiveEchoes();

    lines.push('=== 裂隙回响 ===');
    lines.push(`已显现: ${this.totalManifested} | 当前活跃: ${active.length}`);
    lines.push('');

    if (active.length > 0) {
      lines.push('--- 活跃回响 ---');
      for (const echo of active) {
        const echoType = ECHO_TYPES[echo.echoType];
        const symbol = echo.echoType === 'malicious' ? '☠' :
                      echo.echoType === 'paradoxical' ? '?' :
                      echo.echoType === 'prophetic' ? '✦' : '·';
        const originalName = echo.originalCreation?.name || echo.originalCreation?.card?.name || '未知';
        lines.push(`  ${symbol} ${echoType.name} — ${originalName} @[${echo.x + 1},${echo.y + 1}] 剩余${echo.remainingTurns}回合`);
        lines.push(`     ${echo.getEffectDescription()}`);
        if (echo.narrative) {
          lines.push(`     "${echo.narrative}"`);
        }
      }
      lines.push('');
    }

    if (this.echoHistory.length > 0) {
      lines.push('--- 回响历史 ---');
      for (const record of this.echoHistory.slice(-5)) {
        const typeName = ECHO_TYPES[record.type]?.name || record.type;
        lines.push(`  ${record.originalName} → ${typeName} (第${record.turn}回合)`);
      }
    }

    return lines.join('\n');
  }

  // Serialize
  serialize() {
    return {
      echoes: this.echoes.map(e => e.serialize()),
      echoHistory: this.echoHistory,
      maxEchoes: this.maxEchoes,
      entropyThreshold: this.entropyThreshold,
      echoChance: this.echoChance,
      totalManifested: this.totalManifested
    };
  }

  deserialize(data) {
    if (!data) return;
    this.echoes = (data.echoes || []).map(e => RiftEcho.deserialize(e));
    this.echoHistory = data.echoHistory || [];
    this.maxEchoes = data.maxEchoes || 3;
    this.entropyThreshold = data.entropyThreshold || 0.6;
    this.echoChance = data.echoChance || 0.3;
    this.totalManifested = data.totalManifested || 0;
  }
}

// Export singleton
export const riftEchoSystem = new RiftEchoSystem();
