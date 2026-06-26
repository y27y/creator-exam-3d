import { GameEngine, TERRAIN_LABELS, TERRAIN_SYMBOLS } from '../public/js/gameEngine.js';
import { cloneLevel, LEVELS, SYMBOL_TO_TILE, TILE } from '../public/js/levels.js';
import { localCompile } from '../public/js/aiClient.js';
import { RESONANCE_CODEX, executeChainReaction } from '../public/js/chainReactionCodex.js';
import { legacySystem } from '../public/js/legacySystem.js';

class DebugGame extends GameEngine {
  constructor() {
    super();
    this.npcManager = new NPCManager(this);
  }

  reset() {
    super.reset();
    this.npcManager = new NPCManager(this);
    // Add legacy NPCs from previous rescues
    if (this.legacyUnits && this.legacyUnits.length > 0) {
      for (const npc of this.legacyUnits) {
        this.npcManager.npcs.push(npc);
      }
    }
  }

  // Override rescueUnit to add NPC reactions
  rescueUnit(unit) {
    super.rescueUnit(unit);
    if (this.npcManager) {
      this.npcManager.reactToGameEvent('onRescue', { rescued: 1, unitName: unit.name });
    }
  }

  // Override winLevel to add NPC reactions
  winLevel(message) {
    if (this.gameState !== 'playing') return;
    this.gameState = 'won';
    this.log(`通过：${message}`, true);
    if (this.npcManager) {
      this.npcManager.reactToGameEvent('onWin', { message });
    }
  }

  // Override failLevel to add NPC reactions
  failLevel(message) {
    if (this.gameState !== 'playing') return;
    this.gameState = 'lost';
    this.log(`失败：${message}`, true);
    if (this.npcManager) {
      this.npcManager.reactToGameEvent('onLose', { message });
    }
  }

  // Override moveCivilian to add NPC interactions
  moveCivilian(unit) {
    if (this.isGoalReached(unit)) {
      this.rescueUnit(unit);
      return;
    }
    const guided = unit.guidedTurns > 0 || this.nearActiveAbility(unit.x, unit.y, ['guide', 'memory_beacon', 'illuminate']);
    const hasRevealPath = unit.revealedPath > 0;
    const hasDreamLink = unit.dreamLinked && this.units.find(u => u.id === unit.dreamLinked && u.status === 'active');
    const immuneChaos = unit.immuneChaos > 0;

    if (hasDreamLink && !guided) {
      const linkedUnit = this.units.find(u => u.id === unit.dreamLinked);
      if (linkedUnit) {
        const myDist = this.distance(unit.x, unit.y, unit.goal.x, unit.goal.y);
        const linkedDist = this.distance(linkedUnit.x, linkedUnit.y, unit.goal.x, unit.goal.y);
        if (linkedDist < myDist) {
          unit.guidedTurns = 1;
        }
      }
    }

    // Check NPC interactions
    if (this.npcManager) {
      const npcsHere = this.npcManager.getNPCsAt(unit.x, unit.y);
      for (const npc of npcsHere) {
        if (npc.status !== 'met') {
          npc.status = 'met';
          this.log(`${unit.name} 遇到了 ${npc.name}...`, true);
          const buffType = npc.type === 'child' ? '希望' :
                          npc.type === 'elder' ? '智慧' :
                          npc.type === 'ghost' ? '勇气' : '祝福';
          unit.guidedTurns = Math.max(unit.guidedTurns, 1);
          if (npc.type === 'elder' || npc.type === 'divine') {
            unit.immuneChaos = Math.max(unit.immuneChaos || 0, 1);
          }
          this.log(`${npc.name} 给予 ${unit.name} ${buffType}的${npc.type === 'child' ? '鼓励' : '指引'}！`);
          this.npcManager.updateNPCMemory(npc.id, `${unit.name} 在危难中与我相遇，我给予了指引`);
        }
      }
    }

    let next = null;
    if (this.level.memoryChaos && !guided && !immuneChaos && Math.random() < 0.45) {
      next = this.randomPassableNeighbor(unit);
      if (next) this.log(`${unit.name} 被记忆瘟疫影响，偏离了道路`);
    }
    if (!next) next = this.nextStepToward(unit, unit.goal);
    if (next) {
      unit.x = next.x;
      unit.y = next.y;
      if (hasRevealPath && !this.isGoalReached(unit)) {
        const extraStep = this.nextStepToward(unit, unit.goal);
        if (extraStep) {
          unit.x = extraStep.x;
          unit.y = extraStep.y;
          this.log(`${unit.name} 借助路径指引快速移动`);
        }
      }
    }
    if (unit.guidedTurns > 0) unit.guidedTurns -= 1;
    if (unit.revealedPath > 0) unit.revealedPath -= 1;
    if (unit.immuneChaos > 0) unit.immuneChaos -= 1;
    if (this.isGoalReached(unit)) this.rescueUnit(unit);
  }

  // ========== CLI-specific methods ==========

  printMap() {
    console.log(`\n========== ${this.level.shortTitle} | 回合 ${this.turn}/${this.level.maxTurns} ==========`);
    console.log(`奇迹点: ${this.miraclePoints} | 造物次数: ${this.creationCharges} | 裂隙: ${this.entropy}/${this.level.entropyLimit} | 已救援: ${this.rescued}`);
    if (this.isWarLevel()) console.log(`战争值: ${this.warMeter}/${this.level.hazard?.warLimit || 9}`);
    const beast = this.units.find((u) => u.type === 'beast' && u.status === 'active');
    if (beast) console.log(`${beast.name} 怒气: ${beast.anger || 0}/${this.level.beastAngerLimit || 5}`);
    console.log('');

    const header = '    ' + Array.from({ length: BOARD_SIZE }, (_, i) => i + 1).join(' ');
    console.log(header);
    for (let y = 0; y < BOARD_SIZE; y++) {
      let row = ` ${y + 1}  `;
      for (let x = 0; x < BOARD_SIZE; x++) {
        const unit = this.unitAt(x, y);
        if (unit) {
          const symbol = unit.type === 'beast' ? 'B' : unit.type === 'tribeA' ? 'A' : unit.type === 'tribeB' ? 'a' : 'U';
          row += symbol + ' ';
        } else {
          row += TERRAIN_SYMBOLS[this.getTerrain(x, y)] || '?';
          row += ' ';
        }
      }
      console.log(row);
    }
    console.log('');

    console.log('--- 单位状态 ---');
    for (const unit of this.units) {
      let status = unit.status;
      if (unit.status === 'active') {
        if (unit.type === 'beast') status = `怒气${unit.anger || 0}`;
        else if (this.isMessenger(unit)) status = this.isGoalReached(unit) ? '已会合' : '行动中';
        else status = '行动中';
      }
      console.log(`  ${unit.name} (${unit.type}): [${unit.x + 1},${unit.y + 1}] → [${unit.goal.x + 1},${unit.goal.y + 1}] | ${status}`);
    }

    if (this.creations.some((c) => c.placed)) {
      console.log('--- 场上造物 ---');
      for (const c of this.creations.filter((c) => c.placed)) {
        console.log(`  「${c.card.name}」@[${c.x + 1},${c.y + 1}] 剩余${c.remaining}回合`);
      }
    }
    console.log('');
  }

  printLogs(limit = 20) {
    console.log('--- 最近日志 ---');
    for (const entry of this.logs.slice(0, limit)) {
      const marker = entry.important ? '✦' : ' ';
      console.log(`  [${entry.turn}] ${marker} ${entry.text}`);
    }
    console.log('');
  }
}

export { DebugGame };

// ========== AI角色人格系统 ==========

class NPCManager {
  constructor(game) {
    this.game = game;
    this.npcs = this.initNPCs();
  }

  initNPCs() {
    const levelNPCs = {
      'flood-village': [
        {
          id: 'old-fisherman',
          name: '老渔夫',
          type: 'villager',
          personality: '悲观但善良',
          speechStyle: '简短、带有比喻，常提到水和鱼',
          memories: [],
          attitude: '警惕',
          mood: '忧伤',
          location: { x: 1, y: 2 },
          lore: '他知道洪水来临前的征兆，但没人相信他'
        },
        {
          id: 'village-child',
          name: '小烛',
          type: 'child',
          personality: '天真好奇',
          speechStyle: '充满想象力，会问很多问题',
          memories: [],
          attitude: '好奇',
          mood: '兴奋',
          location: { x: 3, y: 3 },
          lore: '她能看到造物身上的光，但大人说那是幻觉'
        }
      ],
      'night-mine': [
        {
          id: 'mine-ghost',
          name: '矿灯幽灵',
          type: 'spirit',
          personality: '孤独、渴望被记住',
          speechStyle: '断断续续，像旧录音',
          memories: [],
          attitude: '中立',
          mood: '孤独',
          location: { x: 2, y: 2 },
          lore: '他是很久以前被困在矿井里的矿工，现在与黑暗共存'
        }
      ],
      'giant-city': [
        {
          id: 'beast-whisperer',
          name: '驯兽人',
          type: 'wanderer',
          personality: '冷静、与自然和谐',
          speechStyle: '缓慢、深思熟虑，常引用古语',
          memories: [],
          attitude: '友好',
          mood: '平静',
          location: { x: 3, y: 3 },
          lore: '他理解巨兽的语言，但很少有人相信他'
        }
      ],
      'wordless-war': [
        {
          id: 'border-poet',
          name: '边境诗人',
          type: 'artist',
          personality: '理想主义、浪漫',
          speechStyle: '诗意、充满隐喻',
          memories: [],
          attitude: '悲伤',
          mood: '绝望',
          location: { x: 3, y: 2 },
          lore: '他试图用诗歌阻止战争，但语言已经失效'
        }
      ],
      'memory-plague': [
        {
          id: 'memory-keeper',
          name: '守忆人',
          type: 'elder',
          personality: '固执、忠诚',
          speechStyle: '重复、像背诵',
          memories: [],
          attitude: '焦虑',
          mood: '困惑',
          location: { x: 3, y: 0 },
          lore: '他记得所有人的名字，但开始忘记自己的'
        }
      ],
      'final-exam': [
        {
          id: 'world-spirit',
          name: '世界之灵',
          type: 'divine',
          personality: '古老、疲惫但慈悲',
          speechStyle: '宏大、像风声',
          memories: [],
          attitude: '审判',
          mood: '疲惫',
          location: { x: 3, y: 3 },
          lore: '她是世界的意识本身，正在慢慢消散'
        }
      ]
    };

    return levelNPCs[this.game.level?.id] || [];
  }

  getNPC(id) {
    return this.npcs.find(n => n.id === id);
  }

  getNPCsAt(x, y) {
    return this.npcs.filter(n => n.location.x === x && n.location.y === y);
  }

  addLegacyNPCs(legacyNPCs) {
    if (!legacyNPCs || legacyNPCs.length === 0) return;
    for (const npc of legacyNPCs) {
      const exists = this.npcs.some(n => n.legacyId === npc.legacyId);
      if (exists) continue;
      this.npcs.push(npc);
    }
  }

  getLegacyNPCs() {
    return this.npcs.filter(n => n.isLegacy);
  }

  updateNPCMemory(npcId, memory) {
    const npc = this.getNPC(npcId);
    if (npc) {
      npc.memories.push({
        text: memory,
        turn: this.game.turn,
        timestamp: Date.now()
      });
      if (npc.memories.length > 10) {
        npc.memories = npc.memories.slice(-10);
      }
    }
  }

  updateNPCAttitude(npcId, playerAction) {
    const npc = this.getNPC(npcId);
    if (!npc) return;

    if (playerAction.type === 'helped') {
      npc.attitude = '友好';
      npc.mood = '感激';
    } else if (playerAction.type === 'harmed') {
      npc.attitude = '敌对';
      npc.mood = '愤怒';
    } else if (playerAction.type === 'ignored') {
      npc.attitude = '失望';
      npc.mood = '悲伤';
    }

    this.game.worldState.characterRelationships[npcId] = {
      attitude: npc.attitude,
      mood: npc.mood,
      lastInteraction: this.game.turn
    };
  }

  getNPCForNarrative(npcId) {
    const npc = this.getNPC(npcId);
    if (!npc) return null;

    return {
      characterName: npc.name,
      characterType: npc.type,
      mood: npc.mood,
      attitude: npc.attitude,
      memories: npc.memories.map(m => m.text),
      location: npc.location
    };
  }

  buildDialogueContext(npcId, playerInput) {
    const npc = this.getNPC(npcId);
    if (!npc) return null;

    const worldState = this.game.getWorldStateForAI();
    const recentEvents = this.game.logs.slice(-5).map(l => l.text);

    return {
      type: 'dialogue',
      context: {
        characterName: npc.name,
        characterType: npc.type,
        mood: npc.mood,
        attitude: npc.attitude,
        memories: npc.memories.map(m => m.text),
        recentEvents: recentEvents
      },
      worldState: worldState,
      playerInput: playerInput || '玩家走近了'
    };
  }

  buildEnvironmentContext(location) {
    const worldState = this.game.getWorldStateForAI();
    const terrain = this.game.getTerrain(location.x, location.y);
    const nearbyCreations = this.game.creations.filter(c =>
      c.placed && this.game.distance(c.x, c.y, location.x, location.y) <= 2
    );

    return {
      type: 'environment',
      context: {
        location: `${location.x + 1}, ${location.y + 1}`,
        terrain: TERRAIN_LABELS[terrain] || '未知',
        atmosphere: this.getAtmosphere(),
        creations: nearbyCreations.map(c => c.card.name),
        units: this.game.units.filter(u => u.status === 'active').map(u => u.name)
      },
      worldState: worldState
    };
  }

  getAtmosphere() {
    const entropy = this.game.entropy;
    const hazard = this.game.level?.hazard?.type || 'none';

    if (entropy > 6) return '崩解边缘，天空出现裂缝';
    if (entropy > 4) return '压抑，空气中弥漫着不安';
    if (hazard === 'flood') return '潮湿，水声不断';
    if (hazard === 'darkness') return '阴暗，视野受限';
    if (hazard === 'war') return '紧张，远处有争吵声';
    return '平静但脆弱';
  }

  reactToGameEvent(eventType, eventData = {}) {
    const moodMap = {
      'onRescue': { '老渔夫': '欣慰', '小烛': '兴奋', '矿灯幽灵': '温暖', '驯兽人': '敬佩', '边境诗人': '感动', '守忆人': '清晰', '世界之灵': '欣慰' },
      'onLoss': { '老渔夫': '悲伤', '小烛': '害怕', '矿灯幽灵': '麻木', '驯兽人': '痛心', '边境诗人': '沉默', '守忆人': '遗忘', '世界之灵': '哀伤' },
      'onWin': { '老渔夫': '感激', '小烛': '欢呼', '矿灯幽灵': '安息', '驯兽人': '释然', '边境诗人': '歌颂', '守忆人': '铭记', '世界之灵': '祝福' },
      'onLose': { '老渔夫': '绝望', '小烛': '哭泣', '矿灯幽灵': '消散', '驯兽人': '自责', '边境诗人': '失声', '守忆人': '空白', '世界之灵': '沉睡' }
    };

    const transition = moodMap[eventType];
    if (!transition) return;

    for (const npc of this.npcs) {
      const newMood = transition[npc.name];
      if (newMood) {
        npc.mood = newMood;
        npc.memories.push({
          text: `事件「${eventType}」发生，情绪变为${newMood}`,
          turn: this.game.turn,
          timestamp: Date.now()
        });
      }
    }
  }

  canTalkAt(x, y) {
    return this.getNPCsAt(x, y).length > 0;
  }

  getNPCSummary() {
    return this.npcs.map(npc => ({
      id: npc.id,
      name: npc.name,
      type: npc.type,
      location: `[${npc.location.x + 1}, ${npc.location.y + 1}]`,
      attitude: npc.attitude,
      mood: npc.mood
    }));
  }
}
