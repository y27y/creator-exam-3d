// Emergent World Legend System
// Dwarf Fortress-style procedural world legends
// Generates persistent world history, myths, and cultural artifacts

import { VectorMemory } from './vectorMemory.js';

// ========== Narrative Causality Engine ==========
// Tracks cause-effect chains across levels for butterfly effect narrative

export class CausalGraph {
  constructor() {
    this.nodes = new Map(); // eventId -> CausalNode
    this.edges = new Map(); // eventId -> [CausalEdge]
    this.vectorMemory = new VectorMemory();
    this.butterflyEffects = new Map(); // levelId -> [consequence]
  }

  // Record an event with optional cause
  recordEvent(event, causeId = null) {
    const node = {
      id: event.id || `event-${Date.now()}-${Math.random()}`,
      type: event.type,
      description: event.description,
      level: event.level,
      turn: event.turn || 1,
      timestamp: Date.now(),
      causeId,
      consequences: [],
      causalChain: [],
      impact: event.impact || 'minor',
      tags: event.tags || []
    };

    // Build causal chain from cause
    if (causeId && this.nodes.has(causeId)) {
      const cause = this.nodes.get(causeId);
      node.causalChain = [...cause.causalChain, causeId];
      cause.consequences.push(node.id);
    }

    // Encode in vector memory for semantic retrieval
    this.vectorMemory.addMemory(event.description, {
      type: event.type,
      level: event.level,
      impact: event.impact,
      tags: event.tags
    });

    this.nodes.set(node.id, node);

    // Check for butterfly effects across levels
    this.checkButterflyEffect(node);

    return node;
  }

  // Create a causal edge between two events
  linkCauseEffect(causeId, effectId, relationType = 'caused') {
    if (!this.nodes.has(causeId) || !this.nodes.has(effectId)) return null;

    const edge = {
      from: causeId,
      to: effectId,
      relation: relationType, // 'caused', 'prevented', 'enabled', 'accompanied'
      strength: this.calculateCausalStrength(causeId, effectId),
      timestamp: Date.now()
    };

    if (!this.edges.has(causeId)) {
      this.edges.set(causeId, []);
    }
    this.edges.get(causeId).push(edge);

    // Update node consequences
    const cause = this.nodes.get(causeId);
    cause.consequences.push(effectId);

    const effect = this.nodes.get(effectId);
    effect.causeId = causeId;
    effect.causalChain = [...cause.causalChain, causeId];

    return edge;
  }

  // Calculate causal strength based on semantic similarity and temporal proximity
  calculateCausalStrength(causeId, effectId) {
    const cause = this.nodes.get(causeId);
    const effect = this.nodes.get(effectId);
    if (!cause || !effect) return 0;

    // Semantic similarity using vector memory
    const semanticResults = this.vectorMemory.query(cause.description, 5);
    const semanticMatch = semanticResults.find(r => r.text === effect.description);
    const semanticScore = semanticMatch ? semanticMatch.similarity : 0;

    // Temporal proximity (closer in time = stronger causation)
    const timeDiff = Math.abs(effect.timestamp - cause.timestamp);
    const temporalScore = Math.max(0, 1 - timeDiff / (1000 * 60 * 60 * 24)); // Decay over 24 hours

    // Chain length penalty (longer chains = weaker direct causation)
    const chainPenalty = Math.max(0.3, 1 - effect.causalChain.length * 0.1);

    return (semanticScore * 0.5 + temporalScore * 0.3 + chainPenalty * 0.2);
  }

  // Check if an event triggers cross-level butterfly effects
  checkButterflyEffect(node) {
    // Only major+ impacts can create butterfly effects
    if (node.impact !== 'major' && node.impact !== 'world-shaking') return;

    // Query related past events
    const related = this.vectorMemory.query(node.description, 3);

    for (const past of related) {
      if (past.metadata && past.metadata.level && past.metadata.level !== node.level) {
        // Cross-level connection found
        const consequence = {
          sourceLevel: past.metadata.level,
          sourceEvent: past.id,
          targetLevel: node.level,
          targetEvent: node.id,
          description: this.generateButterflyDescription(past, node),
          strength: past.similarity
        };

        if (!this.butterflyEffects.has(node.level)) {
          this.butterflyEffects.set(node.level, []);
        }
        this.butterflyEffects.get(node.level).push(consequence);
      }
    }
  }

  generateButterflyDescription(past, current) {
    const templates = [
      `在${past.metadata.level}的${past.metadata.type}，竟然在${current.level}引发了回响。`,
      `谁能想到，${past.metadata.level}的往事会成为${current.level}的伏笔？`,
      `命运的丝线从${past.metadata.level}延伸到${current.level}，编织出意想不到的故事。`,
      `${past.metadata.level}的余波，在${current.level}化作了新的浪潮。`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Find all consequences of a given event (direct and indirect)
  findConsequences(eventId, depth = 5) {
    const consequences = [];
    const visited = new Set();
    const queue = [{ id: eventId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth: currentDepth } = queue.shift();
      if (visited.has(id) || currentDepth > depth) continue;
      visited.add(id);

      const node = this.nodes.get(id);
      if (!node) continue;

      for (const consequenceId of node.consequences) {
        const edge = this.getEdge(id, consequenceId);
        consequences.push({
          eventId: consequenceId,
          relation: edge ? edge.relation : 'caused',
          strength: edge ? edge.strength : 0.5,
          depth: currentDepth + 1
        });
        queue.push({ id: consequenceId, depth: currentDepth + 1 });
      }
    }

    return consequences;
  }

  // Find all causes of a given event (tracing back)
  findCauses(eventId, depth = 5) {
    const causes = [];
    const visited = new Set();
    const queue = [{ id: eventId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth: currentDepth } = queue.shift();
      if (visited.has(id) || currentDepth > depth) continue;
      visited.add(id);

      const node = this.nodes.get(id);
      if (!node || !node.causeId) continue;

      const edge = this.getEdge(node.causeId, id);
      causes.push({
        eventId: node.causeId,
        relation: edge ? edge.relation : 'caused',
        strength: edge ? edge.strength : 0.5,
        depth: currentDepth + 1
      });

      queue.push({ id: node.causeId, depth: currentDepth + 1 });
    }

    return causes;
  }

  // Get a specific edge
  getEdge(fromId, toId) {
    const edges = this.edges.get(fromId);
    if (!edges) return null;
    return edges.find(e => e.to === toId);
  }

  // Generate narrative summary of a causal chain
  generateCausalNarrative(eventId) {
    const node = this.nodes.get(eventId);
    if (!node) return '故事刚刚开始...';

    const causes = this.findCauses(eventId, 3);
    const consequences = this.findConsequences(eventId, 3);

    const parts = [];

    // Prologue: causes
    if (causes.length > 0) {
      const rootCause = causes[causes.length - 1];
      const rootNode = this.nodes.get(rootCause.eventId);
      parts.push(`这一切始于${rootNode.level}的${rootNode.description}...`);
    }

    // Main event
    parts.push(`而在${node.level}，${node.description}`);

    // Epilogue: consequences
    if (consequences.length > 0) {
      const directEffects = consequences.filter(c => c.depth === 1);
      parts.push(`这一事件的涟漪扩散开来，影响了${directEffects.length}个后续事件。`);
    }

    // Butterfly effects
    const butterflyEffects = this.butterflyEffects.get(node.level);
    if (butterflyEffects && butterflyEffects.length > 0) {
      const strongest = butterflyEffects.sort((a, b) => b.strength - a.strength)[0];
      parts.push(`最令人惊讶的是，${strongest.description}`);
    }

    return parts.join('\n');
  }

  // Query events by semantic similarity with causal context
  queryWithCausality(queryText, topK = 5) {
    const semanticResults = this.vectorMemory.query(queryText, topK * 2);
    const enriched = semanticResults.map(result => {
      const node = this.nodes.get(result.id);
      if (!node) return result;

      return {
        ...result,
        causalChain: node.causalChain,
        consequences: node.consequences.length,
        hasButterflyEffect: this.butterflyEffects.has(node.level) &&
          this.butterflyEffects.get(node.level).some(b => b.sourceEvent === node.id || b.targetEvent === node.id)
      };
    });

    return enriched.slice(0, topK);
  }

  // Get all butterfly effects for a level
  getButterflyEffectsForLevel(levelId) {
    return this.butterflyEffects.get(levelId) || [];
  }

  // Get stats
  getStats() {
    return {
      totalEvents: this.nodes.size,
      totalCausalLinks: Array.from(this.edges.values()).reduce((sum, arr) => sum + arr.length, 0),
      butterflyEffects: Array.from(this.butterflyEffects.values()).reduce((sum, arr) => sum + arr.length, 0),
      avgChainLength: Array.from(this.nodes.values()).reduce((sum, n) => sum + n.causalChain.length, 0) / (this.nodes.size || 1)
    };
  }

  // Serialize
  serialize() {
    return {
      nodes: Array.from(this.nodes.entries()),
      edges: Array.from(this.edges.entries()),
      butterflyEffects: Array.from(this.butterflyEffects.entries()),
      vectorMemory: this.vectorMemory.serialize()
    };
  }

  deserialize(data) {
    if (!data) return;
    this.nodes = new Map(data.nodes || []);
    this.edges = new Map(data.edges || []);
    this.butterflyEffects = new Map(data.butterflyEffects || []);
    if (data.vectorMemory) {
      this.vectorMemory.deserialize(data.vectorMemory);
    }
  }
}

// ========== World Legend System ==========

export class WorldLegendSystem {
  constructor() {
    this.legends = []; // World-level historical events
    this.myths = new Map(); // Cultural myths by region
    this.artifacts = new Map(); // Legendary artifacts
    this.historicalFigures = new Map(); // NPCs who became legends
    this.worldAges = []; // Ages of the world
    this.currentAge = 1;
    this.worldSeed = this.generateWorldSeed();
    this.causalGraph = new CausalGraph(); // Narrative causality engine
  }

  generateWorldSeed() {
    return Math.floor(Math.random() * 1000000);
  }

  // Record a significant event that becomes part of world legend
  recordLegendaryEvent(event) {
    const legend = {
      id: `legend-${Date.now()}-${Math.random()}`,
      type: event.type, // 'creation', 'rescue', 'sacrifice', 'battle', 'miracle', 'cataclysm'
      turn: event.turn || 1,
      level: event.level || 'unknown',
      actor: event.actor || 'unknown', // Who did it
      target: event.target || null, // What/who was affected
      description: event.description,
      impact: event.impact || 'minor', // minor, major, world-shaking
      timestamp: Date.now(),
      age: this.currentAge
    };

    this.legends.push(legend);

    // Record in causal graph for narrative causality tracking
    this.causalGraph.recordEvent({
      id: legend.id,
      type: legend.type,
      description: legend.description,
      level: legend.level,
      turn: legend.turn,
      impact: legend.impact,
      tags: [legend.type, legend.actor, legend.level]
    }, event.causeId);

    // Major events create myths
    if (legend.impact === 'major' || legend.impact === 'world-shaking') {
      this.generateMyth(legend);
    }

    // World-shaking events can start a new age
    if (legend.impact === 'world-shaking') {
      this.startNewAge(legend);
    }

    return legend;
  }

  // Generate a cultural myth from a legendary event
  generateMyth(legend) {
    const mythTemplates = {
      creation: [
        '在{level}的危难时刻，{actor}创造了{target}，从此{effect}。',
        '传说{actor}的造物{target}拥有{quality}的力量，能{effect}。',
        '{level}的古老歌谣中唱着：当{actor}举起{target}，世界便{effect}。'
      ],
      rescue: [
        '{actor}在{level}救下了{target}，这一义举被传颂了数代。',
        '当{target}陷入绝境，{actor}如神明般降临{level}。',
        '{level}的居民至今仍讲述{actor}拯救{target}的故事。'
      ],
      sacrifice: [
        '{actor}为了拯救{target}，在{level}献出了一切。',
        '有人说{actor}从未真正离去，{level}的风中仍能听到{actor}的低语。',
        '{actor}的牺牲让{level}明白了什么是真正的勇气。'
      ],
      battle: [
        '在{level}的激战中，{actor}与{target}展开了史诗般的对决。',
        '{actor}面对{target}时展现的力量，成为了{level}的传说。',
        '那场战斗改变了{level}的命运，{actor}的名字被永远铭记。'
      ],
      miracle: [
        '在{level}，{actor}创造了不可思议的奇迹——{effect}。',
        '没有人相信{actor}能做到，但{level}见证了奇迹的发生。',
        '神迹降临{level}，{actor}成为了活着的传奇。'
      ],
      cataclysm: [
        '{level}的灾难让世界颤抖，但{actor}在废墟中找到了希望。',
        '当{target}摧毁{level}时，{actor}证明了毁灭不是终点。',
        '大灾变后，{actor}在{level}的废墟上重建了未来。'
      ]
    };

    const templates = mythTemplates[legend.type] || mythTemplates.creation;
    const template = templates[Math.floor(Math.random() * templates.length)];

    const mythText = template
      .replace('{actor}', legend.actor)
      .replace('{target}', legend.target || '未知')
      .replace('{level}', legend.level)
      .replace('{effect}', this.generateEffectDescription(legend))
      .replace('{quality}', this.generateQualityDescription());

    const myth = {
      id: `myth-${legend.id}`,
      legendId: legend.id,
      text: mythText,
      region: legend.level,
      age: this.currentAge,
      variations: [mythText],
      popularity: legend.impact === 'world-shaking' ? 100 : legend.impact === 'major' ? 60 : 30
    };

    if (!this.myths.has(legend.level)) {
      this.myths.set(legend.level, []);
    }
    this.myths.get(legend.level).push(myth);

    return myth;
  }

  generateEffectDescription(legend) {
    const effects = {
      creation: ['改变了河流的走向', '让黑暗退散', '治愈了大地', '连接了分离的心灵', '创造了新的生命'],
      rescue: ['让希望重新燃起', '拯救了一个村庄', '改变了命运的轨迹', '证明了善良的力量'],
      sacrifice: ['永远改变了世界', '成为了永恒的传说', '让后来者找到了勇气', '让牺牲有了意义'],
      battle: ['决定了世界的命运', '让和平成为可能', '证明了正义的力量', '书写了新的历史'],
      miracle: ['让不可能变为可能', '创造了新的法则', '让世界学会了相信', '开启了新的时代'],
      cataclysm: ['从毁灭中重生', '找到了新的道路', '让废墟变成了花园', '证明了生命的顽强']
    };
    const pool = effects[legend.type] || effects.creation;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  generateQualityDescription() {
    const qualities = ['不可思议', '神圣', '古老', '神秘', '永恒', '无限', '温柔', '强大'];
    return qualities[Math.floor(Math.random() * qualities.length)];
  }

  // Start a new world age
  startNewAge(catalystEvent) {
    const ageNames = [
      '创造之纪元', '裂隙之纪元', '救赎之纪元', '重生之纪元',
      '传说之纪元', '奇迹之纪元', '黄昏之纪元', '黎明之纪元'
    ];

    const ageName = ageNames[(this.currentAge - 1) % ageNames.length];

    this.worldAges.push({
      number: this.currentAge,
      name: ageName,
      startEvent: catalystEvent,
      legends: this.legends.filter(l => l.age === this.currentAge),
      duration: 0 // Will be updated when next age starts
    });

    // Update previous age duration
    if (this.worldAges.length > 1) {
      const prevAge = this.worldAges[this.worldAges.length - 2];
      prevAge.duration = this.currentAge - prevAge.number;
    }

    this.currentAge++;
  }

  // Create a legendary artifact from a significant creation
  createArtifact(creation, context) {
    const artifactTypes = {
      'absorb_water': '潮汐之杯',
      'create_bridge': '连接之石',
      'illuminate': '永恒之光',
      'block': '守护之壁',
      'calm': '宁静之铃',
      'guide': '引路之星',
      'cleanse': '净化之瓶',
      'slow_beast': '束缚之链',
      'memory_beacon': '记忆之烛',
      'force_field': '庇护之盾',
      'transform_land': '重塑之铲',
      'freeze_water': '霜冻之晶',
      'raise_earth': '大地之杖',
      'grow_forest': '生命之种',
      'dig_channel': '开凿之锄',
      'trap': '捕获之网',
      'dream_link': '梦境之线',
      'time_dilation': '时光之沙',
      'reveal_path': '显路之镜',
      'sun_blessing': '日华之冕'
    };

    const artifactName = artifactTypes[creation.ability] || `传说之${creation.name}`;

    const artifact = {
      id: `artifact-${Date.now()}`,
      name: artifactName,
      creator: context.creator || '未知造物者',
      origin: context.level || '未知',
      ability: creation.ability,
      description: this.generateArtifactDescription(creation, artifactName),
      power: context.impact === 'world-shaking' ? 100 : context.impact === 'major' ? 70 : 40,
      legends: [],
      currentLocation: context.level || 'unknown',
      discovered: false
    };

    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  generateArtifactDescription(creation, artifactName) {
    const descriptions = [
      `${artifactName}是${creation.name}的具现化，拥有${creation.ability}的力量。`,
      `传说${artifactName}在创造时吸收了世界的精华，能引发${creation.ability}的奇迹。`,
      `古老的文献记载，${artifactName}是第一位造物者留下的遗物，蕴含着${creation.ability}的秘密。`,
      `${artifactName}并非普通的造物，它是世界对${creation.name}的回应，承载着${creation.ability}的意志。`
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  // Promote an NPC to historical figure status
  enshrineNPC(npc, reason) {
    const figure = {
      id: `figure-${npc.id || Date.now()}`,
      name: npc.name,
      originalType: npc.type,
      reason: reason, // 'rescued', 'sacrificed', 'legendary_deed', 'wisdom'
      deeds: [],
      legends: [],
      worshipLevel: 0, // 0-100, how much they're revered
      shrines: [],
      quotes: this.generateQuotes(npc, reason)
    };

    this.historicalFigures.set(figure.id, figure);
    return figure;
  }

  generateQuotes(npc, reason) {
    const quotePools = {
      rescued: [
        `我曾被拯救，如今我要拯救他人。`,
        `黑暗中的那道光，我永远记得。`,
        `当你拉我一把时，我学会了什么是希望。`
      ],
      sacrificed: [
        `不要为我哭泣，我为所爱的人付出了一切。`,
        `传说我没有真正离开，只是变成了风。`,
        `我的故事结束了，但你的还在继续。`
      ],
      legendary_deed: [
        `那一刻，我知道自己注定要做些什么。`,
        `世界记住了我的名字，但更重要的是记住了那一刻。`,
        `传奇不是天生的，是在选择中诞生的。`
      ],
      wisdom: [
        `知识是光，但智慧知道何时点亮它。`,
        `我见过太多，但学到更多。`,
        `真正的智慧不是知道一切，而是知道何时行动。`
      ]
    };

    const pool = quotePools[reason] || quotePools.legendary_deed;
    return pool;
  }

  // Generate a world legend report
  generateWorldLegendReport() {
    const report = {
      currentAge: this.currentAge,
      totalLegends: this.legends.length,
      totalMyths: Array.from(this.myths.values()).reduce((sum, arr) => sum + arr.length, 0),
      totalArtifacts: this.artifacts.size,
      historicalFigures: this.historicalFigures.size,
      ages: this.worldAges.map(a => ({
        name: a.name,
        legendCount: a.legends.length,
        duration: a.duration
      })),
      topMyths: this.getTopMyths(5),
      legendaryArtifacts: Array.from(this.artifacts.values())
        .sort((a, b) => b.power - a.power)
        .slice(0, 5),
      reveredFigures: Array.from(this.historicalFigures.values())
        .sort((a, b) => b.worshipLevel - a.worshipLevel)
        .slice(0, 5)
    };

    return report;
  }

  getTopMyths(limit = 5) {
    const allMyths = [];
    for (const regionMyths of this.myths.values()) {
      allMyths.push(...regionMyths);
    }
    return allMyths.sort((a, b) => b.popularity - a.popularity).slice(0, limit);
  }

  // Generate a random legend from current world state
  generateRandomLegend(currentState) {
    const eventTypes = ['creation', 'rescue', 'sacrifice', 'battle', 'miracle', 'cataclysm'];
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    const actors = ['造物者', '守护者', '流浪者', '先知', '战士', '治愈者'];
    const actor = actors[Math.floor(Math.random() * actors.length)];

    return this.recordLegendaryEvent({
      type,
      actor,
      level: currentState.level || '未知之地',
      description: `在${currentState.level || '未知之地'}发生了${type}事件。`,
      impact: Math.random() < 0.1 ? 'world-shaking' : Math.random() < 0.3 ? 'major' : 'minor'
    });
  }

  // Evolve myths over time - add variations
  evolveMyths() {
    for (const regionMyths of this.myths.values()) {
      for (const myth of regionMyths) {
        if (Math.random() < 0.3) {
          // Add a variation
          const variations = [
            `有人说，${myth.text}但真相可能更复杂。`,
            `另一种说法是，${myth.text}这背后另有隐情。`,
            `在遥远的村庄，人们相信${myth.text}`
          ];
          const variation = variations[Math.floor(Math.random() * variations.length)];
          if (!myth.variations.includes(variation)) {
            myth.variations.push(variation);
            myth.popularity += 5;
          }
        }
      }
    }
  }

  // ========== Generative Myth Grammar ==========
  // Context-Free Grammar for myth generation inspired by Dwarf Fortress

  generateMythWithGrammar(playerData, narrativeArcs) {
    // Select myth archetype based on narrative arcs
    const archetype = this.selectMythArchetype(narrativeArcs);

    // Build grammar rules for this archetype
    const grammar = this.buildMythGrammar(archetype, playerData);

    // Generate myth text using CFG
    const mythText = this.expandGrammar(grammar, 'Myth');

    // Extract myth power from player data
    const mythPower = this.calculateMythPower(playerData);

    const myth = {
      id: `myth-cfg-${Date.now()}`,
      archetype: archetype.name,
      text: mythText,
      grammar: grammar,
      power: mythPower,
      popularity: 0,
      variations: [],
      realityEvents: [], // Events that make this myth "real"
      isActive: false // Whether "Myth Becomes Reality" is triggered
    };

    return myth;
  }

  selectMythArchetype(narrativeArcs) {
    const archetypes = {
      HeroJourney: {
        name: 'HeroJourney',
        rules: {
          'Myth': ['{Departure} {Initiation} {Return} {Sacrifice}'],
          'Departure': [
            '在{Origin}的平凡日子里，{Hero}从未想过自己会成为传说。',
            '当裂隙第一次出现在{Origin}的天空时，{Hero}知道世界需要改变。'
          ],
          'Initiation': [
            '面对{Challenge}，{Hero}用{Artifact}证明了{Virtue}的力量。',
            '在{Challenge}的试炼中，{Hero}发现了自己内心深处的{Virtue}。'
          ],
          'Return': [
            '当{Hero}回到{Origin}时，一切都变了——但{Hero}也变了。',
            '{Hero}带着{Artifact}和新的智慧回到了{Origin}。'
          ],
          'Sacrifice': [
            '为了拯救{Target}，{Hero}付出了{Cost}——但传说永远不会忘记。',
            '有人说{Hero}还在守护着{Origin}，只是换了一种方式。'
          ]
        }
      },
      Tragedy: {
        name: 'Tragedy',
        rules: {
          'Myth': ['{Hubris} {Fall} {Aftermath} {Legacy}'],
          'Hubris': [
            '{Hero}曾相信{Virtue}可以征服一切，包括{Challenge}。',
            '在{Origin}的辉煌时刻，{Hero}忘记了谦卑。'
          ],
          'Fall': [
            '但{Challenge}太强大了，{Hero}的{Artifact}碎裂在黑暗中。',
            '当{Cost}降临时，{Hero}才明白有些代价无法承受。'
          ],
          'Aftermath': [
            '{Origin}沉默了很长时间，风中有{Target}的哭泣。',
            '世界记住了{Hero}的失败，但比失败更深刻的是{Hero}的勇气。'
          ],
          'Legacy': [
            '如今，每当{Challenge}重现，人们会想起{Hero}的教训。',
            '悲剧不是终点——{Hero}的故事成为了{Origin}的守护。'
          ]
        }
      },
      CreationMyth: {
        name: 'CreationMyth',
        rules: {
          'Myth': ['{Void} {Spark} {Shaping} {Legacy}'],
          'Void': [
            '在{Origin}还是一片虚无时，{Hero}听到了创造的召唤。',
            '世界尚未成形，{Hero}手中握着{Artifact}的雏形。'
          ],
          'Spark': [
            '第一道光芒来自{Hero}的{Virtue}，照亮了{Challenge}的黑暗。',
            '当{Hero}举起{Artifact}，{Origin}第一次有了颜色。'
          ],
          'Shaping': [
            '{Hero}用{Artifact}塑造了{Target}，每一个细节都倾注了心血。',
            '从{Challenge}中，{Hero}提炼出了{Target}——不完美，但真实。'
          ],
          'Legacy': [
            '如今{Target}依然在{Origin}守护着，提醒着创造的代价与荣耀。',
            '每一个来到{Origin}的造物者，都会感受到{Hero}留下的{Virtue}。'
          ]
        }
      },
      CycleMyth: {
        name: 'CycleMyth',
        rules: {
          'Myth': ['{Beginning} {Rise} {Turning} {Renewal}'],
          'Beginning': [
            '传说{Origin}经历过无数次{Challenge}，每一次都有一位{Hero}。',
            '在时间的轮回中，{Hero}不是第一个，也不会是最后一个。'
          ],
          'Rise': [
            '但这一次，{Hero}带着{Artifact}和前所未有的{Virtue}。',
            '{Hero}在{Origin}的崛起，让古老的预言开始应验。'
          ],
          'Turning': [
            '当{Cost}降临时，轮回似乎要重演——但{Hero}做出了不同的选择。',
            '在{Challenge}的最高潮，{Hero}打破了循环。'
          ],
          'Renewal': [
            '新的轮回开始了，但这一次{Origin}学会了{Hero}的{Virtue}。',
            '{Hero}成为了轮回的一部分，{Artifact}在等待着下一个守护者。'
          ]
        }
      }
    };

    // Select based on narrative arc themes
    if (narrativeArcs && narrativeArcs.length > 0) {
      const topArc = narrativeArcs[0];
      const themeMap = {
        'sacrifice': 'Tragedy',
        'hope': 'HeroJourney',
        'despair': 'Tragedy',
        'creation': 'CreationMyth',
        'war': 'CycleMyth'
      };
      const selected = themeMap[topArc.theme] || 'HeroJourney';
      return archetypes[selected];
    }

    // Default random selection
    const keys = Object.keys(archetypes);
    return archetypes[keys[Math.floor(Math.random() * keys.length)]];
  }

  buildMythGrammar(archetype, playerData) {
    const grammar = { ...archetype.rules };

    // Fill slots from player data
    const slots = {
      Hero: playerData.heroName || '造物者',
      Origin: playerData.favoriteLevel || '裂隙之地',
      Challenge: playerData.hardestLevel || '未知的试炼',
      Artifact: playerData.favoriteCreation || '传说中的造物',
      Virtue: playerData.dominantTrait || '勇气',
      Target: playerData.mostRescuedNPC || '世界',
      Cost: playerData.greatestLoss || '无法衡量的代价'
    };

    // Expand all rules with slots
    for (const [key, rules] of Object.entries(grammar)) {
      grammar[key] = rules.map(rule => {
        let expanded = rule;
        for (const [slot, value] of Object.entries(slots)) {
          expanded = expanded.replace(new RegExp(`{${slot}}`, 'g'), value);
        }
        return expanded;
      });
    }

    return grammar;
  }

  expandGrammar(grammar, symbol) {
    const rules = grammar[symbol];
    if (!rules) return symbol;

    // Check if this is a terminal (no matching rules in grammar)
    const isTerminal = !Object.keys(grammar).some(key => rules.some(r => r.includes(`{${key}}`)));
    if (isTerminal) {
      return rules[Math.floor(Math.random() * rules.length)];
    }

    // Expand recursively
    let result = rules[Math.floor(Math.random() * rules.length)];
    for (const key of Object.keys(grammar)) {
      const pattern = new RegExp(`{${key}}`, 'g');
      if (result.match(pattern)) {
        result = result.replace(pattern, this.expandGrammar(grammar, key));
      }
    }

    return result;
  }

  calculateMythPower(playerData) {
    let power = 30; // Base power
    if (playerData.totalCreations > 10) power += 20;
    if (playerData.totalRescued > 20) power += 20;
    if (playerData.winRate > 0.7) power += 15;
    if (playerData.riskTolerance > 0.6) power += 10;
    return Math.min(100, power);
  }

  // "Myth Becomes Reality" - when myth popularity exceeds threshold, spawn in-game events
  checkMythReality(myth, currentLevel) {
    if (myth.popularity < 50 || myth.isActive) return null;

    myth.isActive = true;

    // Generate reality event based on myth archetype
    const realityEvent = {
      type: 'myth_manifestation',
      mythId: myth.id,
      level: currentLevel,
      description: this.generateRealityManifestation(myth),
      effect: this.generateMythEffect(myth)
    };

    myth.realityEvents.push(realityEvent);
    return realityEvent;
  }

  generateRealityManifestation(myth) {
    const manifestations = {
      HeroJourney: '传说中的英雄气息弥漫在空气中，单位的移动速度略微提升。',
      Tragedy: '空气中弥漫着古老的悲伤，裂隙的扩散速度减缓但更加深沉。',
      CreationMyth: '创造之力在周围涌动，造物的效果持续时间延长。',
      CycleMyth: '时间的轮回在此刻显现，某些地形发生了周期性变化。'
    };
    return manifestations[myth.archetype] || '神话的力量在此显现。';
  }

  generateMythEffect(myth) {
    const effects = {
      HeroJourney: { type: 'movement_boost', value: 1 },
      Tragedy: { type: 'entropy_slow', value: 0.5 },
      CreationMyth: { type: 'duration_extend', value: 1 },
      CycleMyth: { type: 'terrain_cycle', value: 1 }
    };
    return effects[myth.archetype] || { type: 'generic_boost', value: 1 };
  }

  // Generate myth from narrative arcs using vector memory
  generateMythFromArcs(narrativeArcs, playerData) {
    if (!narrativeArcs || narrativeArcs.length === 0) {
      return this.generateMythWithGrammar(playerData, null);
    }

    // Use the most coherent arc as the foundation
    const topArc = narrativeArcs.sort((a, b) => b.coherence - a.coherence)[0];

    // Extract key elements from arc memories
    const arcMemories = topArc.memories.map(m => m.text).join(' ');
    const extractedData = {
      ...playerData,
      heroName: '造物者',
      dominantTrait: topArc.theme || '勇气'
    };

    return this.generateMythWithGrammar(extractedData, [topArc]);
  }

  // Serialize for save/load
  serialize() {
    return {
      legends: this.legends,
      myths: Array.from(this.myths.entries()),
      artifacts: Array.from(this.artifacts.entries()),
      historicalFigures: Array.from(this.historicalFigures.entries()),
      worldAges: this.worldAges,
      currentAge: this.currentAge,
      worldSeed: this.worldSeed,
      causalGraph: this.causalGraph.serialize()
    };
  }

  deserialize(data) {
    if (!data) return;
    this.legends = data.legends || [];
    this.myths = new Map(data.myths || []);
    this.artifacts = new Map(data.artifacts || []);
    this.historicalFigures = new Map(data.historicalFigures || []);
    this.worldAges = data.worldAges || [];
    this.currentAge = data.currentAge || 1;
    this.worldSeed = data.worldSeed || this.generateWorldSeed();
    if (data.causalGraph) {
      this.causalGraph.deserialize(data.causalGraph);
    }
  }
}

// Export singleton
export const worldLegendSystem = new WorldLegendSystem();
