// NPC Manager for narrative system
// Handles NPC states, memories, and dialogue generation

export class NPCManager {
  constructor(level) {
    this.level = level;
    this.npcs = this.initializeNPCs();
    this.dialogueHistory = [];
    this.worldState = {
      atmosphere: '平静',
      discoveredSecrets: [],
      playerReputation: 0
    };
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
          dialogueStyle: '说话慢，喜欢用比喻，经常提到水里的声音'
        },
        {
          id: 'child-xiaozhu',
          name: '小烛',
          type: 'child',
          location: '村庄中心',
          mood: '好奇',
          attitude: '崇拜',
          lore: '村庄里最小的孩子，对造物者充满好奇，梦想着看到天空中的鲸鱼。',
          memories: [],
          personality: '天真、活泼、充满想象力',
          dialogueStyle: '说话快，经常问问题，用词简单但富有诗意'
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
          lore: '一位老矿工的灵魂，被困在矿井中，等待着有人能带给他光明。',
          memories: [],
          personality: '忧郁、善良、渴望陪伴',
          dialogueStyle: '断断续续，经常停顿，声音像是从远处传来'
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
          lore: '研究巨兽多年的学者，知道巨兽并非敌人，只是迷失了方向。',
          memories: [],
          personality: '理性、温和、博学',
          dialogueStyle: '用词准确，经常引用古籍，说话有条理'
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
          lore: '曾经用诗歌连接两个部落，但现在语言断裂，诗歌也失去了力量。',
          memories: [],
          personality: '敏感、理想主义、善于观察',
          dialogueStyle: '富有诗意，经常隐喻，说话像朗诵诗歌'
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
          lore: '负责守护村庄记忆的老人，但记忆瘟疫让他也开始遗忘。',
          memories: [],
          personality: '温和、健忘但努力回忆、善良',
          dialogueStyle: '经常停顿回忆，话语中夹杂着过去的记忆碎片'
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
          lore: '裂隙之地的意识化身，见证过无数造物者的兴衰。',
          memories: [],
          personality: '超然、智慧、略带忧伤',
          dialogueStyle: '声音像风一样轻柔，用词古老而深刻，经常提到时间的流逝'
        }
      ]
    };

    return npcConfigs[this.level.id] || [];
  }

  getNPC(npcId) {
    return this.npcs.find(n => n.id === npcId || n.name === npcId);
  }

  getNPCSummary() {
    return this.npcs.map(n => ({
      id: n.id,
      name: n.name,
      type: n.type,
      location: n.location,
      mood: n.mood,
      attitude: n.attitude
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
        dialogueStyle: npc.dialogueStyle
      },
      playerInput,
      worldState: {
        currentLevel: this.level.title,
        rescued: this.worldState.playerReputation,
        lost: 0,
        entropy: 0,
        entropyLimit: 7,
        creations: [],
        discoveredLore: this.worldState.discoveredSecrets,
        playStyle: 'unknown'
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
        rescued: 0,
        lost: 0,
        entropy: 0,
        entropyLimit: 7,
        creations: [],
        discoveredLore: this.worldState.discoveredSecrets,
        playStyle: 'unknown'
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

    const responses = {
      '老渔夫': [
        '水涨了，鱼都往上游去了...你也该走了。',
        '我年轻时见过更大的洪水，但没见过像你这样的人。',
        '水里有声音，你听到了吗？',
        '每一次洪水都会带走一些东西，但也会留下礼物。'
      ],
      '小烛': [
        '你看！你的造物在发光呢！',
        '为什么天空会裂开呀？',
        '我想看看水母，可以吗？',
        '你会创造奇迹吗？就像故事里说的那样！'
      ],
      '矿灯幽灵': [
        '...灯...还亮着...吗？',
        '我...等了很久...',
        '黑暗...不可怕...孤独...才可怕...',
        '你...能帮我...找到...出口吗？'
      ],
      '驯兽人': [
        '巨兽并非敌人，只是迷失了方向。',
        '自然有它自己的节奏，不要强行改变。',
        '你的造物...很有力量，但力量需要智慧引导。',
        '古水巨兽背上的水源，维系着整条河的生机。'
      ],
      '边境诗人': [
        '诗写完了，但战争还没有结束。',
        '语言曾是桥梁，现在成了深渊。',
        '也许你的造物能成为新的诗篇...',
        '两个部落都忘记了，他们曾经说的是同一种语言。'
      ],
      '守忆人': [
        '我记得...很多人的名字...但...',
        '记忆像沙子，抓得越紧，流得越快。',
        '你...是谁？对不起，我忘了...',
        '圣树还记得所有人的名字，只要我们能到达那里。'
      ],
      '世界之灵': [
        '你每一次创造，都在改变我。',
        '裂隙在扩大，但希望也在生长。',
        '我见过无数造物者，你是最特别的一个。',
        '第七天到来时，世界会选择自己的命运。'
      ]
    };

    const npcResponses = responses[npc.name] || ['...', '嗯？', '我不明白你的意思。'];
    return npcResponses[Math.floor(Math.random() * npcResponses.length)];
  }
}
