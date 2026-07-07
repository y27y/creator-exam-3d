// NPC Manager for narrative system
// Handles NPC states, memories, and dialogue generation
// Enhanced with dynamic mood system and game event reactions

import { SocialGraph } from './socialGraph.js';

const TYPE_PERSONAS = Object.freeze({
  villager: {
    mood: '不安',
    attitude: '友善',
    personality: '朴实、谨慎、遇险时会先确认脚下是否安全',
    dialogueStyle: '说话直，常提路、水位和家人，不放大话',
    lore: '被灾困住的普通人，最惦记能不能安全到地方。',
    dynamicTraits: { trustLevel: 45, fearLevel: 55, hopeLevel: 40 }
  },
  miner: {
    mood: '紧张',
    attitude: '中立',
    personality: '务实、吃苦耐劳、害怕黑暗但不轻易求饶',
    dialogueStyle: '短句多，常提到灯、出口、岩壁和脚下的路',
    lore: '困在永夜矿井里的矿工，靠经验和一点光摸方向。',
    dynamicTraits: { trustLevel: 40, fearLevel: 65, hopeLevel: 35 }
  },
  tribeA: {
    mood: '戒备',
    attitude: '中立',
    personality: '自尊、克制、急于证明自己的部落没有偷走星火',
    dialogueStyle: '语气紧绷，常提到误会、边境和必须送到的话',
    lore: '东岸部落的使者，在失语战争中寻找会谈机会。',
    dynamicTraits: { trustLevel: 35, fearLevel: 45, hopeLevel: 45 }
  },
  tribeB: {
    mood: '戒备',
    attitude: '中立',
    personality: '敏锐、固执、把族人的安全放在尊严之前',
    dialogueStyle: '答话小心，老确认对方啥意思、下一步会不会动手',
    lore: '西岸部落的使者，带着族人的疑惧靠近边境。',
    dynamicTraits: { trustLevel: 35, fearLevel: 45, hopeLevel: 45 }
  },
  beast: {
    mood: '焦躁',
    attitude: '警觉',
    personality: '本能强烈、并非恶意，只会被阻挡和威胁激怒',
    dialogueStyle: '不说人话，用低鸣、停步、甩水和呼吸变化表达需求',
    lore: '背负水源的古老生灵，需要被理解而不是征服。',
    dynamicTraits: { trustLevel: 20, fearLevel: 50, hopeLevel: 30 }
  }
});

const NAMED_UNIT_PERSONAS = Object.freeze({
  阿粟: {
    mood: '强作镇定',
    personality: '敏感、顾家、会先照看别人再说自己的害怕',
    dialogueStyle: '轻声说话，常把需求落到具体一步，不会说玄而空的长篇独白',
    lore: '洪水村庄的年轻居民，记得每一级石阶通向哪户人家。'
  },
  木匠: {
    mood: '焦急',
    personality: '踏实、手巧、习惯把危险拆成木料和支点来思考',
    dialogueStyle: '语气朴素，常提到桥、梁、木桩和能否承重',
    lore: '村里的木匠，知道什么样的落脚点能撑住逃生的人。'
  },
  邮差: {
    mood: '急迫',
    personality: '守信、方向感强、即使害怕也惦记必须送到的消息',
    dialogueStyle: '话短而快，常确认路线、终点和消息能否按时抵达',
    lore: '洪水村庄的邮差，背包里还有几封没送出的信。'
  },
  矿工甲: {
    personality: '沉着、老练、习惯先判断岩壁和风声',
    dialogueStyle: '低声短句，先问光在哪里，再问路能不能走'
  },
  矿工乙: {
    personality: '谨慎、细心、会记住同伴的位置',
    dialogueStyle: '回答会带上坐标感，常提醒不要让队伍散开'
  },
  矿工丙: {
    personality: '年轻、紧张、但很相信明确的指引',
    dialogueStyle: '问题多，常问下一步是不是安全'
  },
  矿工丁: {
    personality: '倔强、护短、愿意殿后',
    dialogueStyle: '语气硬，但会把真实需求说得很具体'
  },
  东岸使者: {
    personality: '克制、骄傲、害怕一句错话点燃战争',
    dialogueStyle: '措辞正式，常要求确认路线和会谈位置'
  },
  西岸使者: {
    personality: '警觉、敏锐、愿意谈判但不愿示弱',
    dialogueStyle: '先确认安全，再回应善意，避免夸张承诺'
  },
  南枝: {
    personality: '温柔、容易分神、靠植物和气味记路',
    dialogueStyle: '慢慢说，常把方向和树影、风声联系起来'
  },
  北声: {
    personality: '冷静、爱数步子，失忆时也会努力复盘',
    dialogueStyle: '短句清楚，常重复目标来稳住自己'
  },
  阿眠: {
    personality: '胆小、想象力强，害怕把梦和路混在一起',
    dialogueStyle: '声音轻，常问这是不是梦、下一步会不会消失'
  },
  谷雨: {
    personality: '乐观、爱照顾同伴，喜欢用节气和雨水记事情',
    dialogueStyle: '温和，常把请求说成可以马上执行的小事'
  },
  织火: {
    personality: '勇敢、急性子，怕忘记但不愿停下',
    dialogueStyle: '句子短促，常催促给出明确方向'
  },
  星砂: {
    personality: '沉默、坚韧，把恐惧藏在行动后面',
    dialogueStyle: '很少抒情，只问哪里能落脚、哪里能抵达'
  },
  青麦: {
    personality: '朴素、相信秩序，遇险时先照看身边人',
    dialogueStyle: '语气稳定，常请求可执行的路线和保护'
  },
  砾歌: {
    personality: '敏感、有节奏感，会用声音确认自己还在路上',
    dialogueStyle: '带一点诗意，但每次都会回到目标和下一步'
  },
  北境使者: {
    personality: '严肃、守礼、把会谈看作最后的秩序',
    dialogueStyle: '正式克制，常确认边境、证词和安全距离'
  },
  南境使者: {
    personality: '机警、务实、会优先避免误判升级',
    dialogueStyle: '直接询问风险，回答会贴近当前局势'
  }
});

function cloneTraits(traits = {}) {
  return { trustLevel: 45, fearLevel: 45, hopeLevel: 45, ...traits };
}

export class NPCManager {
  constructor(level, options = {}) {
    this.level = level;
    this.residentProjections = options.residentProjections || [];
    this.npcs = this.mergeResidentProjections(this.mergeLevelUnitPersonas(this.initializeNPCs()));
    this.socialGraph = new SocialGraph();
    this.initSocialGraph();
    this.dialogueHistory = [];
    this.worldState = {
      atmosphere: '平静',
      discoveredSecrets: [],
      playerReputation: 0,
      totalRescued: 0,
      totalLost: 0,
      creationsWitnessed: [],
      eventsObserved: []
    };

    // 动态情绪映射表
    this.moodTransitions = {
      '老渔夫': {
        default: '担忧',
        onRescue: '欣慰',
        onLoss: '悲伤',
        onCreation: '惊讶',
        onHazard: '恐惧',
        onWin: '感激',
        onLose: '绝望'
      },
      '小烛': {
        default: '好奇',
        onRescue: '兴奋',
        onLoss: '害怕',
        onCreation: '惊叹',
        onHazard: '困惑',
        onWin: '欢呼',
        onLose: '哭泣'
      },
      '矿灯幽灵': {
        default: '孤独',
        onRescue: '温暖',
        onLoss: '麻木',
        onCreation: '希望',
        onHazard: '颤抖',
        onWin: '安息',
        onLose: '消散'
      },
      '驯兽人': {
        default: '焦虑',
        onRescue: '敬佩',
        onLoss: '痛心',
        onCreation: '审慎',
        onHazard: '警觉',
        onWin: '释然',
        onLose: '自责'
      },
      '边境诗人': {
        default: '悲伤',
        onRescue: '感动',
        onLoss: '沉默',
        onCreation: '灵感',
        onHazard: '愤怒',
        onWin: '歌颂',
        onLose: '失声'
      },
      '守忆人': {
        default: '困惑',
        onRescue: '清晰',
        onLoss: '遗忘',
        onCreation: '熟悉',
        onHazard: '混乱',
        onWin: '铭记',
        onLose: '空白'
      },
      '世界之灵': {
        default: '平静',
        onRescue: '欣慰',
        onLoss: '哀伤',
        onCreation: '期待',
        onHazard: '警告',
        onWin: '祝福',
        onLose: '沉睡'
      }
    };
    this.ensureMoodTransitionsForNPCs();

    // 态度变化阈值
    this.attitudeThresholds = {
      rescue: { delta: 1, threshold: 2 },
      creation: { delta: 1, threshold: 3 },
      dialogue: { delta: 1, threshold: 5 },
      loss: { delta: -1, threshold: 2 },
      hazard: { delta: -1, threshold: 3 }
    };

    // 追踪玩家行为计数
    this.playerBehavior = {
      rescues: 0,
      creations: 0,
      dialogues: 0,
      losses: 0,
      hazardsTriggered: 0
    };
  }

  mergeResidentProjections(npcs) {
    const merged = [...npcs];
    for (const projection of this.residentProjections) {
      const existing = merged.find(npc => (
        npc.id === projection.id ||
        npc.name === projection.name ||
        (projection.residentId && npc.residentId === projection.residentId)
      ));
      const projectedNpc = {
        ...projection,
        id: projection.residentId,
        residentId: projection.residentId,
        attitude: projection.attitude || projection.attitudeToPlayer || '中立',
        memories: Array.isArray(projection.memories) ? projection.memories : [],
        dynamicTraits: projection.dynamicTraits || {}
      };
      if (existing) Object.assign(existing, projectedNpc);
      else merged.push(projectedNpc);
    }
    return merged;
  }

  mergeLevelUnitPersonas(npcs) {
    const merged = [...npcs];
    const units = Array.isArray(this.level?.units) ? this.level.units : [];
    units.forEach((unit, index) => {
      if (!unit?.name) return;
      const unitNpc = this.buildUnitPersona(unit, index);
      const existing = merged.find(npc => (
        npc.name === unit.name ||
        (unit.residentId && (npc.id === unit.residentId || npc.residentId === unit.residentId))
      ));
      if (existing) {
        if (unit.residentId) existing.residentId ||= unit.residentId;
        existing.personality ||= unitNpc.personality;
        existing.dialogueStyle ||= unitNpc.dialogueStyle;
        existing.lore ||= unitNpc.lore;
        existing.location ||= unitNpc.location;
        existing.mood ||= unitNpc.mood;
        existing.attitude ||= unitNpc.attitude;
        existing.dynamicTraits = cloneTraits(existing.dynamicTraits || unitNpc.dynamicTraits);
      } else {
        merged.push(unitNpc);
      }
    });
    return merged;
  }

  buildUnitPersona(unit, index = 0) {
    const typeDefaults = TYPE_PERSONAS[unit.type] || TYPE_PERSONAS.villager;
    const nameDefaults = NAMED_UNIT_PERSONAS[unit.name] || {};
    const persona = { ...typeDefaults, ...nameDefaults };
    const levelTitle = this.level?.shortTitle || this.level?.title || '当前关卡';
    return {
      id: unit.residentId || `unit-${this.level?.id || 'region'}-${index}`,
      residentId: unit.residentId,
      name: unit.name,
      type: unit.type || typeDefaults.type || 'villager',
      location: persona.location || levelTitle,
      mood: persona.mood || typeDefaults.mood || '不安',
      attitude: persona.attitude || typeDefaults.attitude || '中立',
      lore: persona.lore || typeDefaults.lore || `${unit.name}正在${levelTitle}中寻找安全路线。`,
      memories: [],
      personality: persona.personality || typeDefaults.personality,
      dialogueStyle: persona.dialogueStyle || typeDefaults.dialogueStyle,
      dynamicTraits: cloneTraits(persona.dynamicTraits || typeDefaults.dynamicTraits)
    };
  }

  ensureMoodTransitionsForNPCs() {
    for (const npc of this.npcs) {
      if (this.moodTransitions[npc.name]) continue;
      const typeDefaults = TYPE_PERSONAS[npc.type] || TYPE_PERSONAS.villager;
      this.moodTransitions[npc.name] = {
        default: npc.mood || typeDefaults.mood || '不安',
        onRescue: '安心',
        onLoss: '悲伤',
        onCreation: '惊讶',
        onHazard: '恐惧',
        onWin: '庆幸',
        onLose: '绝望'
      };
    }
  }

  initializeNPCs() {
    const npcConfigs = {
      'flood-village': [
        {
          id: 'old-fisherman',
          name: '老渔夫',
          type: 'villager',
          location: '河边',
          mood: '担忧',
          attitude: '友善',
          lore: '在这里捕鱼五十年，见过无数次洪水，但从未见过造物者。',
          memories: [],
          personality: '沉稳、经验丰富、略带神秘',
          dialogueStyle: '说话慢，喜欢用比喻，经常提到水里的声音',
          dynamicTraits: {
            trustLevel: 50, // 0-100
            fearLevel: 30,
            hopeLevel: 40
          }
        },
        {
          id: 'child-xiaozhu',
          name: '小烛',
          type: 'child',
          location: '村庄中心',
          mood: '好奇',
          attitude: '崇拜',
          lore: '村里最小的孩子，对造物者好奇得不行，成天想着看天上的鲸鱼。',
          memories: [],
          personality: '天真、话多、爱刨根问底',
          dialogueStyle: '说话快，问题一个接一个，词儿简单但亮堂',
          dynamicTraits: {
            trustLevel: 70,
            fearLevel: 20,
            hopeLevel: 80
          }
        }
      ],
      'night-mine': [
        {
          id: 'miner-ghost',
          name: '矿灯幽灵',
          type: 'ghost',
          location: '矿井深处',
          mood: '孤独',
          attitude: '谨慎',
          lore: '一个老矿工的魂，困在井里出不去，就等着谁给他一盏光。',
          memories: [],
          personality: '闷、心善、怕一个人待着',
          dialogueStyle: '话说得断断续续，老停顿，像从老远的地方传过来',
          dynamicTraits: {
            trustLevel: 30,
            fearLevel: 60,
            hopeLevel: 20
          }
        }
      ],
      'giant-city': [
        {
          id: 'beast-tamer',
          name: '驯兽人',
          type: 'scholar',
          location: '城市边缘',
          mood: '焦虑',
          attitude: '尊敬',
          lore: '跟巨兽打了一辈子交道的学者，心里清楚巨兽不是敌人，只是迷了路。',
          memories: [],
          personality: '讲理、心平、肚子里有货',
          dialogueStyle: '用词准，爱引老书上的话，说话一二三四',
          dynamicTraits: {
            trustLevel: 60,
            fearLevel: 40,
            hopeLevel: 50
          }
        }
      ],
      'wordless-war': [
        {
          id: 'border-poet',
          name: '边境诗人',
          type: 'artist',
          location: '边境',
          mood: '悲伤',
          attitude: '中立',
          lore: '从前靠诗把两个部落连在一起，如今话断了，诗也使不上劲了。',
          memories: [],
          personality: '心思细、认死理、眼睛毒',
          dialogueStyle: '说话带诗味，爱打暗比，一句一句像在念',
          dynamicTraits: {
            trustLevel: 40,
            fearLevel: 50,
            hopeLevel: 30
          }
        }
      ],
      'memory-plague': [
        {
          id: 'memory-keeper',
          name: '守忆人',
          type: 'elder',
          location: '圣树旁',
          mood: '困惑',
          attitude: '友善',
          lore: '守着村里记忆的老人，可这阵子他自己也开始忘事了。',
          memories: [],
          personality: '心善、老忘事但硬撑着想、不害人',
          dialogueStyle: '说着说着就卡住，话里头老夹着从前的事',
          dynamicTraits: {
            trustLevel: 45,
            fearLevel: 55,
            hopeLevel: 35
          }
        }
      ],
      'final-exam': [
        {
          id: 'world-spirit',
          name: '世界之灵',
          type: 'spirit',
          location: '世界中心',
          mood: '平静',
          attitude: '审视',
          lore: '裂隙那头醒着的东西，看着一茬一茬的造物者来了又走。',
          memories: [],
          personality: '看得开、想得透、心里有点凉',
          dialogueStyle: '声音轻得像风，话不多但沉，老提日子怎么过、怎么没的',
          dynamicTraits: {
            trustLevel: 50,
            fearLevel: 10,
            hopeLevel: 50
          }
        }
      ]
    };

    return npcConfigs[this.level.id] || [];
  }

  initSocialGraph() {
    // Add all NPCs to social graph
    for (const npc of this.npcs) {
      this.socialGraph.addNode(npc.id, npc);
    }
    // Create default faction for this level
    const factionId = this.level?.id || 'default';
    for (const npc of this.npcs) {
      this.socialGraph.joinFaction(npc.id, factionId);
    }
  }

  // ========== 动态情绪系统 ==========

  reactToGameEvent(eventType, eventData = {}) {
    this.lastEventType = eventType;
    this.lastEventData = eventData;

    const transitions = {
      onRescue: () => this.handleRescueEvent(eventData),
      onLoss: () => this.handleLossEvent(eventData),
      onCreation: () => this.handleCreationEvent(eventData),
      onHazard: () => this.handleHazardEvent(eventData),
      onWin: () => this.handleWinEvent(eventData),
      onLose: () => this.handleLoseEvent(eventData),
      onTurn: () => this.handleTurnEvent(eventData)
    };

    if (transitions[eventType]) {
      transitions[eventType]();
    }

    // 更新世界状态
    this.updateWorldState(eventType, eventData);

    // Record social event for relationship changes
    if (eventType === 'onRescue' || eventType === 'onLoss') {
      const impact = eventType === 'onRescue' ? 'positive' : 'negative';
      const witnesses = this.npcs.map(n => n.id);
      this.socialGraph.recordSocialEvent({
        type: eventType === 'onRescue' ? 'rescue' : 'loss',
        actor: 'player',
        target: eventData.unitName || 'unknown',
        witnesses,
        impact
      });
    }

    // 返回所有NPC的当前状态摘要
    return this.getNPCSummary();
  }

  handleRescueEvent(eventData) {
    this.playerBehavior.rescues++;
    const rescued = eventData.rescued || 1;
    this.worldState.totalRescued += rescued;

    for (const npc of this.npcs) {
      // 更新动态特质
      if (npc.dynamicTraits) {
        npc.dynamicTraits.hopeLevel = Math.min(100, npc.dynamicTraits.hopeLevel + 10 * rescued);
        npc.dynamicTraits.fearLevel = Math.max(0, npc.dynamicTraits.fearLevel - 5 * rescued);
      }

      // 更新情绪
      const transitionMap = this.moodTransitions[npc.name];
      if (transitionMap) {
        npc.mood = transitionMap.onRescue || transitionMap.default;
      }

      // 记录记忆
      npc.memories.push({
        text: `见证了 ${rescued} 个生命被拯救，希望重新燃起`,
        timestamp: Date.now(),
        type: 'rescue'
      });

      // 检查态度变化
      if (this.playerBehavior.rescues >= this.attitudeThresholds.rescue.threshold) {
        this.updateNPCAttitude(npc.id, this.attitudeThresholds.rescue.delta);
      }
    }

    this.worldState.atmosphere = '希望';
  }

  handleLossEvent(eventData) {
    this.playerBehavior.losses++;
    const lost = eventData.lost || 1;
    this.worldState.totalLost += lost;

    for (const npc of this.npcs) {
      if (npc.dynamicTraits) {
        npc.dynamicTraits.hopeLevel = Math.max(0, npc.dynamicTraits.hopeLevel - 15 * lost);
        npc.dynamicTraits.fearLevel = Math.min(100, npc.dynamicTraits.fearLevel + 10 * lost);
      }

      const transitionMap = this.moodTransitions[npc.name];
      if (transitionMap) {
        npc.mood = transitionMap.onLoss || transitionMap.default;
      }

      npc.memories.push({
        text: `目睹了 ${lost} 个生命消逝，心中充满悲伤`,
        timestamp: Date.now(),
        type: 'loss'
      });

      if (this.playerBehavior.losses >= this.attitudeThresholds.loss.threshold) {
        this.updateNPCAttitude(npc.id, this.attitudeThresholds.loss.delta);
      }
    }

    this.worldState.atmosphere = '悲伤';
  }

  handleCreationEvent(eventData) {
    this.playerBehavior.creations++;
    const creationName = eventData.creationName || '未知造物';
    this.worldState.creationsWitnessed.push(creationName);

    for (const npc of this.npcs) {
      if (npc.dynamicTraits) {
        npc.dynamicTraits.trustLevel = Math.min(100, npc.dynamicTraits.trustLevel + 5);
      }

      const transitionMap = this.moodTransitions[npc.name];
      if (transitionMap) {
        npc.mood = transitionMap.onCreation || transitionMap.default;
      }

      npc.memories.push({
        text: `见证了「${creationName}」的诞生，感受到造物的力量`,
        timestamp: Date.now(),
        type: 'creation'
      });

      if (this.playerBehavior.creations >= this.attitudeThresholds.creation.threshold) {
        this.updateNPCAttitude(npc.id, this.attitudeThresholds.creation.delta);
      }
    }
  }

  handleHazardEvent(eventData) {
    this.playerBehavior.hazardsTriggered++;
    const hazardType = eventData.hazardType || '灾害';

    for (const npc of this.npcs) {
      if (npc.dynamicTraits) {
        npc.dynamicTraits.fearLevel = Math.min(100, npc.dynamicTraits.fearLevel + 15);
      }

      const transitionMap = this.moodTransitions[npc.name];
      if (transitionMap) {
        npc.mood = transitionMap.onHazard || transitionMap.default;
      }

      npc.memories.push({
        text: `${hazardType}蔓延，危险正在逼近`,
        timestamp: Date.now(),
        type: 'hazard'
      });
    }

    this.worldState.atmosphere = '紧张';
  }

  handleWinEvent(eventData) {
    for (const npc of this.npcs) {
      if (npc.dynamicTraits) {
        npc.dynamicTraits.hopeLevel = 100;
        npc.dynamicTraits.fearLevel = 0;
      }

      const transitionMap = this.moodTransitions[npc.name];
      if (transitionMap) {
        npc.mood = transitionMap.onWin || transitionMap.default;
      }

      npc.memories.push({
        text: '关卡完成，见证了奇迹的发生',
        timestamp: Date.now(),
        type: 'victory'
      });

      // 胜利时大幅提升态度
      this.updateNPCAttitude(npc.id, 2);
    }

    this.worldState.atmosphere = '欢庆';
    this.worldState.playerReputation += 10;
  }

  handleLoseEvent(eventData) {
    for (const npc of this.npcs) {
      if (npc.dynamicTraits) {
        npc.dynamicTraits.hopeLevel = Math.max(0, npc.dynamicTraits.hopeLevel - 30);
        npc.dynamicTraits.fearLevel = Math.min(100, npc.dynamicTraits.fearLevel + 20);
      }

      const transitionMap = this.moodTransitions[npc.name];
      if (transitionMap) {
        npc.mood = transitionMap.onLose || transitionMap.default;
      }

      npc.memories.push({
        text: '关卡失败，希望破灭',
        timestamp: Date.now(),
        type: 'defeat'
      });

      this.updateNPCAttitude(npc.id, -1);
    }

    this.worldState.atmosphere = '绝望';
  }

  handleTurnEvent(eventData) {
    const turn = eventData.turn || 1;

    // 每3回合恢复一点默认情绪
    if (turn % 3 === 0) {
      for (const npc of this.npcs) {
        const transitionMap = this.moodTransitions[npc.name];
        if (transitionMap && npc.mood !== transitionMap.default) {
          // 50%概率恢复默认情绪
          if (Math.random() < 0.5) {
            npc.mood = transitionMap.default;
          }
        }
      }
    }
  }

  updateWorldState(eventType, eventData) {
    this.worldState.eventsObserved.push({
      type: eventType,
      data: eventData,
      timestamp: Date.now()
    });

    // 保持最近50个事件
    if (this.worldState.eventsObserved.length > 50) {
      this.worldState.eventsObserved = this.worldState.eventsObserved.slice(-50);
    }
  }

  // ========== 传承NPC集成 ==========

  addLegacyNPCs(legacyNPCs) {
    if (!legacyNPCs || legacyNPCs.length === 0) return;
    for (const npc of legacyNPCs) {
      // 避免重复添加同一传承NPC
      const exists = this.npcs.some(n => n.legacyId === npc.legacyId);
      if (exists) continue;

      // 为传承NPC添加动态情绪映射
      if (!this.moodTransitions[npc.name]) {
        this.moodTransitions[npc.name] = {
          default: '感激',
          onRescue: '欣慰',
          onLoss: '悲伤',
          onCreation: '惊讶',
          onHazard: '坚定',
          onWin: '欢庆',
          onLose: '绝望'
        };
      }

      this.npcs.push(npc);
      this.socialGraph.addNode(npc.id, npc);
      this.socialGraph.joinFaction(npc.id, this.level?.id || 'default');
    }
  }

  addUnitNPCs(units = [], options = {}) {
    for (const unit of units) {
      if (!unit?.name) continue;
      const npc = {
        ...this.buildUnitPersona(unit, this.npcs.length),
        isLegacy: !!unit.isLegacy,
        isLegacyReturn: !!unit.isLegacyReturn,
        legacyId: unit.legacyId,
        memories: unit.isLegacyReturn
          ? [`我记得上一次被救下，也记得这一次要自己走到${unit.goal ? `(${unit.goal.x + 1}, ${unit.goal.y + 1})` : '目标'}。`]
          : []
      };
      const existing = this.npcs.find(n => (
        n.id === npc.id ||
        n.name === npc.name ||
        (npc.residentId && n.residentId === npc.residentId)
      ));
      if (existing) {
        Object.assign(existing, npc, {
          dynamicTraits: { ...(existing.dynamicTraits || {}), ...(npc.dynamicTraits || {}) },
          memories: [...(existing.memories || []), ...(npc.memories || [])]
        });
        this.socialGraph.addNode(existing.id, existing);
        this.socialGraph.joinFaction(existing.id, this.level?.id || 'default');
        continue;
      }
      this.npcs.push(npc);
      this.socialGraph.addNode(npc.id, npc);
      this.socialGraph.joinFaction(npc.id, this.level?.id || 'default');
    }
  }

  getLegacyNPCs() {
    return this.npcs.filter(n => n.isLegacy);
  }

  // ========== 原有方法 ==========

  getNPC(npcId) {
    return this.npcs.find(n => n.id === npcId || n.name === npcId || n.residentId === npcId);
  }

  getNPCSummary() {
    return this.npcs.map(n => ({
      id: n.id,
      name: n.name,
      type: n.type,
      location: n.location,
      mood: n.mood,
      attitude: n.attitude,
      dynamicTraits: n.dynamicTraits || {}
    }));
  }

  updateNPCMemory(npcId, memory) {
    const npc = this.getNPC(npcId);
    if (npc) {
      npc.memories.push({
        text: memory,
        timestamp: Date.now()
      });
      // Keep only last 20 memories
      if (npc.memories.length > 20) {
        npc.memories = npc.memories.slice(-20);
      }
    }
  }

  updateNPCMood(npcId, newMood) {
    const npc = this.getNPC(npcId);
    if (npc) {
      npc.mood = newMood;
    }
  }

  updateNPCAttitude(npcId, delta) {
    const npc = this.getNPC(npcId);
    if (npc) {
      const attitudes = ['敌对', '冷淡', '中立', '友善', '亲密'];
      const currentIndex = attitudes.indexOf(npc.attitude);
      const newIndex = Math.max(0, Math.min(attitudes.length - 1, currentIndex + delta));
      npc.attitude = attitudes[newIndex];
    }
  }

  buildDialogueContext(npcId, playerInput) {
    const npc = this.getNPC(npcId);
    if (!npc) return null;

    return {
      type: 'dialogue',
      context: {
        characterName: npc.name,
        characterType: npc.type,
        mood: npc.mood,
        attitude: npc.attitude,
        memories: npc.memories.slice(-5).map(m => m.text),
        personality: npc.personality,
        dialogueStyle: npc.dialogueStyle,
        dynamicTraits: npc.dynamicTraits || {}
      },
      playerInput,
      worldState: {
        currentLevel: this.level.title,
        rescued: this.worldState.totalRescued,
        lost: this.worldState.totalLost,
        entropy: 0,
        entropyLimit: 7,
        creations: this.worldState.creationsWitnessed.slice(-5),
        discoveredLore: this.worldState.discoveredSecrets,
        playStyle: 'unknown',
        atmosphere: this.worldState.atmosphere
      }
    };
  }

  buildEnvironmentContext(location) {
    return {
      type: 'environment',
      context: {
        location: `${location.x},${location.y}`,
        terrain: this.level.map[location.y]?.[location.x] || '未知',
        atmosphere: this.worldState.atmosphere,
        creations: [],
        units: this.level.units?.map(u => u.name) || []
      },
      worldState: {
        currentLevel: this.level.title,
        rescued: this.worldState.totalRescued,
        lost: this.worldState.totalLost,
        entropy: 0,
        entropyLimit: 7,
        creations: this.worldState.creationsWitnessed.slice(-5),
        discoveredLore: this.worldState.discoveredSecrets,
        playStyle: 'unknown',
        atmosphere: this.worldState.atmosphere
      }
    };
  }

  getAtmosphere() {
    return this.worldState.atmosphere;
  }

  setAtmosphere(atmosphere) {
    this.worldState.atmosphere = atmosphere;
  }

  // Generate local fallback dialogue when AI is unavailable
  generateFallbackDialogue(npcId, playerInput) {
    const npc = this.getNPC(npcId);
    if (!npc) return '...';

    // 根据当前情绪选择不同的回应池
    const moodResponses = {
      '老渔夫': {
        default: [
          '水涨了，鱼都往上游去了，你也该走了。',
          '年轻时见过更大的水，可没见过你这样的。',
          '水里有动静，你听见没？',
          '洪水总会带走点什么，可也会留下点什么。'
        ],
        onRescue: [
          '你把他们捞上来了，真有你的。',
          '水里的动静消停了，像是松了口气。',
          '指望又回来了，跟鱼群似的。'
        ],
        onLoss: [
          '水卷走太多了，太多了。',
          '这动静我听过，是哭声。',
          '鱼都沉底了，指望也跟着沉了。'
        ],
        onCreation: [
          '你这造物，把水都镇住了。',
          '这种力道，我活这把年纪没见过。',
          '水里的动静，像是在道谢。'
        ]
      },
      '小烛': {
        default: [
          '你看！你的造物在发光！',
          '天怎么裂开了呀？',
          '我想看水母，行不行？',
          '你能变奇迹吗？故事里讲的那种！'
        ],
        onRescue: [
          '哇！你把他们救上来了！你真厉害！',
          '我看见他们在笑了！太好了！',
          '我长大了也要像你这样！'
        ],
        onLoss: [
          '他们……去哪儿了？',
          '我害怕，天更黑了。',
          '呜呜，别走嘛。'
        ],
        onCreation: [
          '好漂亮！跟星星似的！',
          '再变一个嘛，再变一个！',
          '这是法术吗？教我教我！'
        ]
      },
      '矿灯幽灵': {
        default: [
          '灯……还亮着吗？',
          '我等了很久了。',
          '黑倒不怕，一个人待着才怕。',
          '你能帮我……找着出口吗？'
        ],
        onRescue: [
          '光，我看见光了。',
          '多谢你，让我又想起暖和是什么滋味。',
          '他们出来了？那敢情好。'
        ],
        onLoss: [
          '又一个，散了。',
          '黑更沉了。',
          '我早习惯了。'
        ],
        onCreation: [
          '你这造物，跟灯似的，亮。',
          '光，真暖和。',
          '我要是也有这力道就好了。'
        ]
      },
      '驯兽人': {
        default: [
          '巨兽不是敌人，它只是迷了路。',
          '自然有自然的性子，别硬拧着来。',
          '你这造物有劲，可劲头得拿脑子牵着。',
          '古水巨兽背上那点水，养着整条河。'
        ],
        onRescue: [
          '你用的是脑子，不是蛮力。',
          '命和命之间搭上的那根线，比什么造物都金贵。',
          '这叫分寸，你摸着了。'
        ],
        onLoss: [
          '自然有时候下得去手。',
          '栽了跟头，得记住疼在哪。',
          '巨兽也在难过，我感觉得到。'
        ],
        onCreation: [
          '你这造物，把自然的势头拨过去了。',
          '当心，力头是把双刃的刀。',
          '设计有意思，可也得顾着这一片的活物。'
        ]
      },
      '边境诗人': {
        default: [
          '诗写完了，仗还没打完。',
          '话从前是桥，如今成了沟。',
          '兴许你的造物，能顶上一首新诗。',
          '两个部落都忘了，他们原先说的是一种话。'
        ],
        onRescue: [
          '这是顶好的诗，拿命写的。',
          '指望又在边境上冒头了。',
          '你这一手，比什么话都管用。'
        ],
        onLoss: [
          '不吭声，比打仗还吓人。',
          '这股子难过，诗写不出来。',
          '边境的风，在哭。'
        ],
        onCreation: [
          '你这造物，是一首不出声的诗。',
          '来念头了，我想写首新的。',
          '样子和用处都齐整了。'
        ]
      },
      '守忆人': {
        default: [
          '我记得好多人的名字，可是……',
          '记忆跟沙子似的，攥得越紧，漏得越快。',
          '你是谁来着？对不住，我忘了。',
          '圣树还记得每个人的名字，只要摸到那儿就行。'
        ],
        onRescue: [
          '我想起来了，他们的脸。',
          '记起来了，多谢你。',
          '圣树也会记着你这一笔。'
        ],
        onLoss: [
          '别，别，我又忘了。',
          '记性在散，跟他们一样散了。',
          '圣树，保佑他们吧。'
        ],
        onCreation: [
          '这是啥？怪眼熟的。',
          '记忆一闪一闪的，跟星星似的。',
          '我好似见过这东西，很久以前了。'
        ]
      },
      '世界之灵': {
        default: [
          '你每造一回，我就跟着变一点。',
          '裂隙在变大，可指望也在长。',
          '我见过太多造物者，你是不一样的那个。',
          '到了第七天，世界自己会挑一条路走。'
        ],
        onRescue: [
          '命的光，又把世界照亮了一回。',
          '你选了手软的那条路，我看着心里宽。',
          '每一条捞上来的命，都是世界又往下走了一程。'
        ],
        onLoss: [
          '难过，也是世界里头的一块。',
          '裂隙在变大，可别撒手。',
          '黑也有黑的用处，不全是白费。'
        ],
        onCreation: [
          '你这造物，在我这儿记下一笔了。',
          '新的力道醒了。',
          '造了又毁，毁了又造，兜圈子罢了。'
        ]
      }
    };

    const npcMoodResponses = moodResponses[npc.name];
    if (npcMoodResponses) {
      // 根据当前情绪选择回应池
      let responsePool = npcMoodResponses.default;
      if (npc.mood === '欣慰' || npc.mood === '兴奋' || npc.mood === '欢呼' || npc.mood === '温暖' || npc.mood === '感激' || npc.mood === '敬佩' || npc.mood === '感动' || npc.mood === '清晰' || npc.mood === '希望' || npc.mood === '灵感' || npc.mood === '安息' || npc.mood === '释然' || npc.mood === '歌颂' || npc.mood === '铭记' || npc.mood === '祝福' || npc.mood === '期待') {
        responsePool = npcMoodResponses.onRescue || npcMoodResponses.default;
      } else if (npc.mood === '悲伤' || npc.mood === '害怕' || npc.mood === '麻木' || npc.mood === '痛心' || npc.mood === '沉默' || npc.mood === '遗忘' || npc.mood === '混乱' || npc.mood === '恐惧' || npc.mood === '颤抖' || npc.mood === '消散' || npc.mood === '自责' || npc.mood === '失声' || npc.mood === '空白' || npc.mood === '绝望' || npc.mood === '哀伤' || npc.mood === '沉睡' || npc.mood === '愤怒') {
        responsePool = npcMoodResponses.onLoss || npcMoodResponses.default;
      } else if (npc.mood === '惊讶' || npc.mood === '惊叹' || npc.mood === '审慎' || npc.mood === '熟悉' || npc.mood === '警觉' || npc.mood === '期待') {
        responsePool = npcMoodResponses.onCreation || npcMoodResponses.default;
      }

      return responsePool[Math.floor(Math.random() * responsePool.length)];
    }

    return this.generatePersonaFallbackDialogue(npc, playerInput);
  }

  generatePersonaFallbackDialogue(npc, playerInput) {
    const input = String(playerInput || '');
    const latestMemory = [...(npc.memories || [])].reverse().find(memory => memory?.text)?.text || npc.lore || '眼前的事还没有定下来';
    const needText = this.getPersonaNeed(npc);

    if (/需要|最需要|创造什么|要我创造|帮你什么|缺什么/.test(input)) {
      return `${needText}你给我一个明确、能落脚的办法，我就照着走。`;
    }
    if (/相信|救下|救你|放心|别怕|安抚|别担心|我会/.test(input)) {
      return `我会稳住。${npc.dialogueStyle?.includes('短') ? '你指出下一步，我就走。' : `只要你的指引能让我靠近目标，我愿意相信你。`}`;
    }
    if (/记得|记忆|发生过|还记得|过去/.test(input)) {
      return `我记得：${String(latestMemory).slice(0, 72)}。可这会儿别让我在这儿耗着。`;
    }
    if (/入口|下一步|怎么走|路线|方向|安全|到达|抵达|帮你走|带你|往哪里|去哪/.test(input)) {
      return `${needText}先告诉我下一步脚往哪踩，别让我踏进险地里。`;
    }
    return `${needText}${npc.lore || '我照着眼前的路走，不说没用的。'}`;
  }

  getPersonaNeed(npc) {
    if (npc.type === 'miner') return '我最缺光，还有出口在哪个方向。';
    if (npc.type === 'tribeA' || npc.type === 'tribeB') return '我最得安全摸到会谈点，别让误会再往上烧。';
    if (npc.type === 'beast') return '它要的是地方，还有水声能安静下来，别再逼它。';
    return '我最缺一条能落脚、走得起的安全路。';
  }

  // Generate a short dialogue reflecting the latest world event
  getLatestDialogue() {
    if (!this.npcs || this.npcs.length === 0) return null;

    // Pick the most emotionally affected NPC
    const sorted = [...this.npcs].sort((a, b) => {
      const intensityA = (a.dynamicTraits?.hopeLevel || 50) + (a.dynamicTraits?.fearLevel || 50);
      const intensityB = (b.dynamicTraits?.hopeLevel || 50) + (b.dynamicTraits?.fearLevel || 50);
      return intensityB - intensityA;
    });

    const npc = sorted[0];
    let eventHint = this.lastEventType || 'onTurn';
    if (eventHint.startsWith('on')) {
      eventHint = eventHint.slice(2);
    }

    // Force a mood-matching response by temporarily adjusting mood
    const originalMood = npc.mood;
    const eventToMood = {
      Rescue: '欣慰',
      Loss: '悲伤',
      Creation: '惊讶',
      Hazard: '恐惧',
      Win: '欢呼',
      Lose: '绝望'
    };
    if (eventToMood[eventHint]) {
      npc.mood = eventToMood[eventHint];
    }

    const text = this.generateFallbackDialogue(npc.id, eventHint);
    npc.mood = originalMood;

    return {
      npcId: npc.id,
      npcName: npc.name,
      mood: npc.mood,
      attitude: npc.attitude,
      text,
      eventType: this.lastEventType
    };
  }
}
