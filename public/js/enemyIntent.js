// Enemy Intent Preview System
// Inspired by Into the Breach's "perfect information" design
// AI-driven tactical narrative that reveals enemy intentions before they act
// Connects game engine state with narrative generation

// Intent types for different entities
export const INTENT_TYPES = {
  // Beast intents
  beast: {
    advance: { name: '前进', icon: '→', threat: 'low', description: '向目标移动' },
    charge: { name: '冲锋', icon: '⇒', threat: 'medium', description: '快速接近目标' },
    rampage: { name: '暴走', icon: '☠', threat: 'high', description: '怒气满溢，即将毁灭一切' },
    blocked: { name: '受阻', icon: '⊘', threat: 'low', description: '被地形或造物阻挡' },
    trapped: { name: '被困', icon: '⛓', threat: 'none', description: '陷入陷阱，无法行动' },
    attracted: { name: '被吸引', icon: '◎', threat: 'low', description: '被引力场吸引，向造物移动' }
  },
  // Civilian intents
  civilian: {
    wander: { name: '徘徊', icon: '~', threat: 'low', description: '漫无目的地移动' },
    advance: { name: '前进', icon: '→', threat: 'low', description: '向目标移动' },
    guided: { name: '受引导', icon: '★', threat: 'none', description: '被造物引导前进' },
    confused: { name: '混乱', icon: '?', threat: 'medium', description: '受记忆瘟疫影响，方向混乱' },
    dreamLinked: { name: '梦境连接', icon: '∞', threat: 'none', description: '与另一单位共享视野' },
    attracted: { name: '被吸引', icon: '◎', threat: 'none', description: '被引力场吸引，偏离原路线' }
  },
  // Messenger intents
  messenger: {
    advance: { name: '前进', icon: '→', threat: 'low', description: '向边境移动' },
    misjudge: { name: '误判', icon: '!', threat: 'high', description: '在迷雾中误判形势' },
    guided: { name: '受引导', icon: '★', threat: 'none', description: '被引导前进' },
    attracted: { name: '被吸引', icon: '◎', threat: 'none', description: '被引力场吸引，偏离原路线' }
  },
  // Hazard intents
  hazard: {
    spread: { name: '扩散', icon: '◌', threat: 'medium', description: '向周围蔓延' },
    intensify: { name: '加剧', icon: '◉', threat: 'high', description: '扩散速度加快' },
    dormant: { name: '休眠', icon: '○', threat: 'none', description: '暂时停止扩散' }
  }
};

export class IntentPreview {
  constructor(data) {
    this.unitId = data.unitId || null;
    this.unitName = data.unitName || '未知';
    this.unitType = data.unitType || 'unknown';
    this.intentType = data.intentType || 'advance';
    this.category = data.category || 'beast'; // beast, civilian, messenger, hazard
    this.threat = data.threat || 'low';
    this.description = data.description || '';
    this.narrative = data.narrative || '';
    this.position = data.position || { x: 0, y: 0 };
    this.targetPosition = data.targetPosition || null;
    this.predictedAction = data.predictedAction || '';
    this.turn = data.turn || 0;
    this.confidence = data.confidence || 0.8; // 0-1, how certain the prediction is
  }

  serialize() {
    return {
      unitId: this.unitId,
      unitName: this.unitName,
      unitType: this.unitType,
      intentType: this.intentType,
      category: this.category,
      threat: this.threat,
      description: this.description,
      narrative: this.narrative,
      position: this.position,
      targetPosition: this.targetPosition,
      predictedAction: this.predictedAction,
      turn: this.turn,
      confidence: this.confidence
    };
  }

  static deserialize(data) {
    return new IntentPreview(data);
  }
}

export class EnemyIntentSystem {
  constructor() {
    this.previews = []; // Current turn's previews
    this.previewHistory = []; // All previews across turns
    this.narrativeStyle = 'tactical'; // tactical, poetic, ominous
    this.accuracy = 0.85; // Base prediction accuracy
    this.maxPreviews = 10;
  }

  // Generate intent previews for the upcoming turn
  generatePreviews(gameState, gameEngine) {
    this.previews = [];
    const turn = gameState.turn || 1;

    // Analyze beasts
    for (const unit of gameEngine.units.filter(u => u.type === 'beast' && u.status === 'active')) {
      const preview = this.predictBeastIntent(unit, gameEngine, turn);
      if (preview) this.previews.push(preview);
    }

    // Analyze civilians
    for (const unit of gameEngine.units.filter(u => gameEngine.isCivilian(u) && u.status === 'active')) {
      const preview = this.predictCivilianIntent(unit, gameEngine, turn);
      if (preview) this.previews.push(preview);
    }

    // Analyze messengers
    for (const unit of gameEngine.units.filter(u => gameEngine.isMessenger(u) && u.status === 'active')) {
      const preview = this.predictMessengerIntent(unit, gameEngine, turn);
      if (preview) this.previews.push(preview);
    }

    // Analyze hazards
    const hazardPreview = this.predictHazardIntent(gameEngine, turn);
    if (hazardPreview) this.previews.push(hazardPreview);

    // Generate narrative summary
    const narrative = this.generateTacticalNarrative(this.previews, gameEngine);

    // Store in history
    this.previewHistory.push({
      turn,
      previews: this.previews.map(p => p.serialize()),
      narrative,
      timestamp: Date.now()
    });

    // Trim history
    if (this.previewHistory.length > 50) {
      this.previewHistory = this.previewHistory.slice(-50);
    }

    return {
      previews: this.previews,
      narrative,
      turn
    };
  }

  // Predict beast's next action
  predictBeastIntent(unit, engine, turn) {
    const isTrapped = engine.creations.some(c =>
      c.placed && c.remaining > 0 && c.card.ability === 'trap' &&
      c.x === unit.x && c.y === unit.y
    );

    if (isTrapped) {
      return new IntentPreview({
        unitId: unit.id,
        unitName: unit.name,
        unitType: 'beast',
        category: 'beast',
        intentType: 'trapped',
        ...INTENT_TYPES.beast.trapped,
        position: { x: unit.x, y: unit.y },
        predictedAction: `${unit.name} 被困在陷阱中，无法行动`,
        turn,
        confidence: 1.0
      });
    }

    if (unit.stunnedTurns > 0) {
      return new IntentPreview({
        unitId: unit.id,
        unitName: unit.name,
        unitType: 'beast',
        category: 'beast',
        intentType: 'blocked',
        ...INTENT_TYPES.beast.blocked,
        position: { x: unit.x, y: unit.y },
        predictedAction: `${unit.name} 被牵制，本回合无法行动`,
        turn,
        confidence: 1.0
      });
    }

    // Use effective goal (attract overrides original goal when active)
    const effectiveGoal = engine.getEffectiveGoal(unit);
    const isAttracted = unit.attractTurns > 0 && unit.attractedTo;

    // Attracted: show intent pointing toward attract point
    if (isAttracted) {
      const nextStep = engine.nextStepToward(unit, effectiveGoal);
      if (!nextStep) {
        return new IntentPreview({
          unitId: unit.id,
          unitName: unit.name,
          unitType: 'beast',
          category: 'beast',
          intentType: 'blocked',
          ...INTENT_TYPES.beast.blocked,
          position: { x: unit.x, y: unit.y },
          predictedAction: `${unit.name} 被吸引但路径受阻`,
          turn,
          confidence: 0.9
        });
      }
      return new IntentPreview({
        unitId: unit.id,
        unitName: unit.name,
        unitType: 'beast',
        category: 'beast',
        intentType: 'advance',
        ...INTENT_TYPES.beast.attracted,
        position: { x: unit.x, y: unit.y },
        targetPosition: nextStep,
        predictedAction: `${unit.name} 被引力吸引，向吸引点移动`,
        turn,
        confidence: 0.9
      });
    }

    // Check if path is blocked
    const nextStep = engine.nextStepToward(unit, effectiveGoal);
    if (!nextStep) {
      const angerRatio = (unit.anger || 0) / (engine.level.beastAngerLimit || 5);
      if (angerRatio >= 1) {
        return new IntentPreview({
          unitId: unit.id,
          unitName: unit.name,
          unitType: 'beast',
          category: 'beast',
          intentType: 'rampage',
          ...INTENT_TYPES.beast.rampage,
          position: { x: unit.x, y: unit.y },
          predictedAction: `${unit.name} 怒气爆发，将摧毁阻挡的一切`,
          turn,
          confidence: 0.9
        });
      }
      return new IntentPreview({
        unitId: unit.id,
        unitName: unit.name,
        unitType: 'beast',
        category: 'beast',
        intentType: 'blocked',
        ...INTENT_TYPES.beast.blocked,
        position: { x: unit.x, y: unit.y },
        predictedAction: `${unit.name} 被完全堵住，怒气上升`,
        turn,
        confidence: 0.9
      });
    }

    // Check if near goal
    const distToGoal = engine.distance(unit.x, unit.y, effectiveGoal.x, effectiveGoal.y);
    if (distToGoal <= 2) {
      return new IntentPreview({
        unitId: unit.id,
        unitName: unit.name,
        unitType: 'beast',
        category: 'beast',
        intentType: 'charge',
        ...INTENT_TYPES.beast.charge,
        position: { x: unit.x, y: unit.y },
        targetPosition: nextStep,
        predictedAction: `${unit.name} 即将抵达城市！`,
        turn,
        confidence: 0.85
      });
    }

    return new IntentPreview({
      unitId: unit.id,
      unitName: unit.name,
      unitType: 'beast',
      category: 'beast',
      intentType: 'advance',
      ...INTENT_TYPES.beast.advance,
      position: { x: unit.x, y: unit.y },
      targetPosition: nextStep,
      predictedAction: `${unit.name} 向城市移动`,
      turn,
      confidence: 0.8
    });
  }

  // Predict civilian's next action
  predictCivilianIntent(unit, engine, turn) {
    const effectiveGoal = engine.getEffectiveGoal(unit);
    const isAttracted = unit.attractTurns > 0 && unit.attractedTo;
    const guided = unit.guidedTurns > 0 || engine.nearActiveAbility(unit.x, unit.y, ['guide', 'memory_beacon', 'illuminate']);
    const immuneChaos = unit.immuneChaos > 0;
    const hasDreamLink = unit.dreamLinked && engine.units.find(u => u.id === unit.dreamLinked && u.status === 'active');

    // Attracted overrides other intents — show direction toward attract point
    if (isAttracted) {
      const nextStep = engine.nextStepToward(unit, effectiveGoal);
      return new IntentPreview({
        unitId: unit.id,
        unitName: unit.name,
        unitType: 'civilian',
        category: 'civilian',
        intentType: 'attracted',
        ...INTENT_TYPES.civilian.attracted,
        position: { x: unit.x, y: unit.y },
        targetPosition: nextStep,
        predictedAction: `${unit.name} 被引力吸引，向吸引点移动`,
        turn,
        confidence: 0.9
      });
    }

    const nextStep = engine.nextStepToward(unit, effectiveGoal);

    if (guided) {
      return new IntentPreview({
        unitId: unit.id,
        unitName: unit.name,
        unitType: 'civilian',
        category: 'civilian',
        intentType: 'guided',
        ...INTENT_TYPES.civilian.guided,
        position: { x: unit.x, y: unit.y },
        targetPosition: nextStep,
        predictedAction: `${unit.name} 被造物引导，稳步向目标前进`,
        turn,
        confidence: 0.95
      });
    }

    if (hasDreamLink) {
      return new IntentPreview({
        unitId: unit.id,
        unitName: unit.name,
        unitType: 'civilian',
        category: 'civilian',
        intentType: 'dreamLinked',
        ...INTENT_TYPES.civilian.dreamLinked,
        position: { x: unit.x, y: unit.y },
        targetPosition: nextStep,
        predictedAction: `${unit.name} 通过梦境连接感知方向`,
        turn,
        confidence: 0.85
      });
    }

    if (engine.level.memoryChaos && !guided && !immuneChaos && engine.getTerrain(unit.x, unit.y) === 'fog') {
      return new IntentPreview({
        unitId: unit.id,
        unitName: unit.name,
        unitType: 'civilian',
        category: 'civilian',
        intentType: 'confused',
        ...INTENT_TYPES.civilian.confused,
        position: { x: unit.x, y: unit.y },
        targetPosition: null,
        predictedAction: `${unit.name} 在迷雾中迷失方向，四方向随机移动`,
        turn,
        confidence: 0.9 // 迷雾内必定四方向随机移动
      });
    }

    return new IntentPreview({
      unitId: unit.id,
      unitName: unit.name,
      unitType: 'civilian',
      category: 'civilian',
      intentType: 'advance',
      ...INTENT_TYPES.civilian.advance,
      position: { x: unit.x, y: unit.y },
      targetPosition: nextStep,
      predictedAction: `${unit.name} 向目标移动`,
      turn,
      confidence: 0.8
    });
  }

  // Predict messenger's next action
  predictMessengerIntent(unit, engine, turn) {
    const effectiveGoal = engine.getEffectiveGoal(unit);
    const isAttracted = unit.attractTurns > 0 && unit.attractedTo;
    const terrain = engine.getTerrain(unit.x, unit.y);
    const guided = unit.guidedTurns > 0 || engine.nearActiveAbility(unit.x, unit.y, ['calm', 'guide', 'memory_beacon']);
    const immuneChaos = unit.immuneChaos > 0;

    // Attracted overrides other intents
    if (isAttracted) {
      const nextStep = engine.nextStepToward(unit, effectiveGoal);
      return new IntentPreview({
        unitId: unit.id,
        unitName: unit.name,
        unitType: 'messenger',
        category: 'messenger',
        intentType: 'attracted',
        ...INTENT_TYPES.messenger.attracted,
        position: { x: unit.x, y: unit.y },
        targetPosition: nextStep,
        predictedAction: `${unit.name} 被引力吸引，向吸引点移动`,
        turn,
        confidence: 0.9
      });
    }

    const nextStep = engine.nextStepToward(unit, effectiveGoal);

    if ((terrain === 'fog' || terrain === 'dark') && !guided && !immuneChaos) {
      return new IntentPreview({
        unitId: unit.id,
        unitName: unit.name,
        unitType: 'messenger',
        category: 'messenger',
        intentType: 'misjudge',
        ...INTENT_TYPES.messenger.misjudge,
        position: { x: unit.x, y: unit.y },
        predictedAction: `${unit.name} 在迷雾中可能误判形势，战争值将上升`,
        turn,
        confidence: 0.9
      });
    }

    if (guided) {
      return new IntentPreview({
        unitId: unit.id,
        unitName: unit.name,
        unitType: 'messenger',
        category: 'messenger',
        intentType: 'guided',
        ...INTENT_TYPES.messenger.guided,
        position: { x: unit.x, y: unit.y },
        targetPosition: nextStep,
        predictedAction: `${unit.name} 被引导向边境`,
        turn,
        confidence: 0.9
      });
    }

    return new IntentPreview({
      unitId: unit.id,
      unitName: unit.name,
      unitType: 'messenger',
      category: 'messenger',
      intentType: 'advance',
      ...INTENT_TYPES.messenger.advance,
      position: { x: unit.x, y: unit.y },
      targetPosition: nextStep,
      predictedAction: `${unit.name} 向边境移动`,
      turn,
      confidence: 0.85
    });
  }

  // Predict hazard's next action
  predictHazardIntent(engine, turn) {
    const hazard = engine.level.hazard;
    if (!hazard || !hazard.type) return null;

    const type = hazard.type;
    const spreadPerTurn = hazard.spreadPerTurn || 2;
    const currentTurn = engine.turn || 1;

    // Hazard intensifies over time
    if (currentTurn > engine.level.maxTurns * 0.6) {
      return new IntentPreview({
        unitId: 'hazard',
        unitName: '灾害',
        unitType: 'hazard',
        category: 'hazard',
        intentType: 'intensify',
        ...INTENT_TYPES.hazard.intensify,
        position: { x: -1, y: -1 },
        predictedAction: `${type} 灾害加剧，扩散速度加快`,
        turn,
        confidence: 0.7
      });
    }

    return new IntentPreview({
      unitId: 'hazard',
      unitName: '灾害',
      unitType: 'hazard',
      category: 'hazard',
      intentType: 'spread',
      ...INTENT_TYPES.hazard.spread,
      position: { x: -1, y: -1 },
      predictedAction: `${type} 将向周围扩散 ${spreadPerTurn} 格`,
      turn,
      confidence: 0.85
    });
  }

  // Generate tactical narrative from previews
  generateTacticalNarrative(previews, engine) {
    const highThreats = previews.filter(p => p.threat === 'high');
    const mediumThreats = previews.filter(p => p.threat === 'medium');
    const lowThreats = previews.filter(p => p.threat === 'low');

    const lines = [];
    lines.push('=== 敌方意图预览 ===');
    lines.push(`高威胁: ${highThreats.length} | 中威胁: ${mediumThreats.length} | 低威胁: ${lowThreats.length}`);
    lines.push('');

    if (highThreats.length > 0) {
      lines.push('【紧急】');
      for (const p of highThreats) {
        lines.push(`  ${p.narrative || p.predictedAction}`);
      }
      lines.push('');
    }

    if (mediumThreats.length > 0) {
      lines.push('【警告】');
      for (const p of mediumThreats) {
        lines.push(`  ${p.narrative || p.predictedAction}`);
      }
      lines.push('');
    }

    // Generate strategic advice based on previews
    const advice = this.generateStrategicAdvice(previews, engine);
    if (advice) {
      lines.push('【建议】');
      lines.push(`  ${advice}`);
    }

    return lines.join('\n');
  }

  // Generate strategic advice based on intent previews
  generateStrategicAdvice(previews, engine) {
    const advices = [];

    // Check for rampaging beast
    const rampaging = previews.find(p => p.intentType === 'rampage');
    if (rampaging) {
      advices.push('巨兽即将暴走，优先使用安抚或陷阱');
    }

    // Check for confused civilians
    const confused = previews.filter(p => p.intentType === 'confused');
    if (confused.length > 0) {
      advices.push(`${confused.length}个单位可能混乱，考虑使用引导造物`);
    }

    // Check for misjudging messengers
    const misjudging = previews.find(p => p.intentType === 'misjudge');
    if (misjudging) {
      advices.push('使者在迷雾中可能误判，需要照明或记忆信标');
    }

    // Check for blocked beast
    const blocked = previews.find(p => p.intentType === 'blocked' && p.category === 'beast');
    if (blocked && !rampaging) {
      advices.push('巨兽被阻挡，注意其怒气积累');
    }

    // Check hazard spread
    const hazard = previews.find(p => p.category === 'hazard');
    if (hazard) {
      advices.push('灾害即将扩散，优先保护关键路径');
    }

    return advices.length > 0 ? advices.join('；') : null;
  }

  // Get previews for a specific unit
  getPreviewsForUnit(unitId) {
    return this.previews.filter(p => p.unitId === unitId);
  }

  // Get high threat previews
  getHighThreats() {
    return this.previews.filter(p => p.threat === 'high');
  }

  // Get statistics
  getStats() {
    const allPreviews = this.previewHistory.flatMap(h => h.previews);
    const total = allPreviews.length;
    const accurate = allPreviews.filter((p, i) => {
      // Simple accuracy check: high confidence predictions
      return p.confidence > 0.8;
    }).length;

    return {
      totalPreviews: total,
      currentTurnPreviews: this.previews.length,
      highThreatsDetected: allPreviews.filter(p => p.threat === 'high').length,
      averageConfidence: total > 0
        ? allPreviews.reduce((sum, p) => sum + p.confidence, 0) / total
        : 0,
      historyLength: this.previewHistory.length
    };
  }

  // Generate CLI visualization
  visualizeIntents() {
    const lines = [];
    const stats = this.getStats();

    lines.push('=== 敌方意图 ===');
    lines.push(`本回合: ${stats.currentTurnPreviews}个意图 | 历史: ${stats.historyLength}回合`);
    lines.push('');

    for (const preview of this.previews) {
      const symbol = preview.threat === 'high' ? '☠' :
                    preview.threat === 'medium' ? '!' :
                    preview.threat === 'none' ? '·' : '·';
      const icon = preview.category === 'beast' ? 'B' :
                  preview.category === 'civilian' ? 'C' :
                  preview.category === 'messenger' ? 'M' : 'H';
      lines.push(`  ${symbol}[${icon}] ${preview.unitName}: ${preview.description}`);
      lines.push(`     → ${preview.predictedAction}`);
      if (preview.confidence < 0.7) {
        lines.push(`     (不确定)`);
      }
    }

    return lines.join('\n');
  }

  // Serialize
  serialize() {
    return {
      previews: this.previews.map(p => p.serialize()),
      previewHistory: this.previewHistory,
      narrativeStyle: this.narrativeStyle,
      accuracy: this.accuracy
    };
  }

  deserialize(data) {
    if (!data) return;
    this.previews = (data.previews || []).map(p => IntentPreview.deserialize(p));
    this.previewHistory = data.previewHistory || [];
    this.narrativeStyle = data.narrativeStyle || 'tactical';
    this.accuracy = data.accuracy || 0.85;
  }
}

// Export singleton
export const enemyIntentSystem = new EnemyIntentSystem();
