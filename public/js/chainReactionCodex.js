// Chain Reaction Codex System
// Tracks discovered resonance combinations and provides in-game encyclopedia

export const RESONANCE_CODEX = {
  // All possible chain reactions
  reactions: new Map([
    ['steam_fog', {
      id: 'steam_fog',
      name: '蒸汽迷雾',
      abilities: ['illuminate', 'absorb_water'],
      description: '照明与吸水产生共鸣，在两者之间升起蒸汽迷雾，临时阻挡视野但可通行',
      effect: '生成2回合持续的迷雾地形',
      discovered: false,
      discoverTurn: null,
      usageCount: 0
    }],
    ['indestructible_barrier', {
      id: 'indestructible_barrier',
      name: '森林屏障',
      abilities: ['grow_forest', 'block'],
      description: '森林中的屏障获得自然加固，持续时间延长1回合',
      effect: '森林中的屏障持续时间+1',
      discovered: false,
      discoverTurn: null,
      usageCount: 0
    }],
    ['guided_memory_immunity', {
      id: 'guided_memory_immunity',
      name: '记忆守护',
      abilities: ['guide', 'memory_beacon'],
      description: '引导与记忆信标共鸣，被引导的单位获得免疫混乱能力',
      effect: '被引导单位immuneChaos+2',
      discovered: false,
      discoverTurn: null,
      usageCount: 0
    }],
    ['trap_slow_combo', {
      id: 'trap_slow_combo',
      name: '困兽之笼',
      abilities: ['trap', 'slow_beast'],
      description: '陷阱与迟缓共鸣，陷阱中的巨兽额外停留1回合',
      effect: '陷阱触发后巨兽额外stunned',
      discovered: false,
      discoverTurn: null,
      usageCount: 0
    }],
    ['frozen_high_ground', {
      id: 'frozen_high_ground',
      name: '永冻高地',
      abilities: ['freeze_water', 'raise_earth'],
      description: '冻结与抬升共鸣，重叠区域的高地永久存在',
      effect: '移除重叠区域的临时标记',
      discovered: false,
      discoverTurn: null,
      usageCount: 0
    }],
    // 新增组合
    ['frostwood', {
      id: 'frostwood',
      name: '霜木林',
      abilities: ['freeze_water', 'grow_forest'],
      description: '冰与森林共鸣，形成霜木林，永久阻挡灾害扩散',
      effect: '在重叠区域生成永久森林',
      discovered: false,
      discoverTurn: null,
      usageCount: 0
    }],
    ['earthquake', {
      id: 'earthquake',
      name: '地裂',
      abilities: ['raise_earth', 'dig_channel'],
      description: '抬升与挖掘共鸣，引发小型地震改变周围地形',
      effect: '随机改变周围1格地形',
      discovered: false,
      discoverTurn: null,
      usageCount: 0
    }],
    ['dream_guidance', {
      id: 'dream_guidance',
      name: '梦境引导',
      abilities: ['guide', 'dream_link'],
      description: '引导与梦境链接共鸣，被引导单位获得梦境共享视野',
      effect: '被引导单位获得3回合immuneChaos',
      discovered: false,
      discoverTurn: null,
      usageCount: 0
    }],
    ['peace_field', {
      id: 'peace_field',
      name: '和平领域',
      abilities: ['force_field', 'calm'],
      description: '结界与安抚共鸣，结界内单位免疫混乱且战争值下降加速',
      effect: '结界内单位免疫混乱，战争值额外-1',
      discovered: false,
      discoverTurn: null,
      usageCount: 0
    }],
    ['transform_forest', {
      id: 'transform_forest',
      name: '生机改造',
      abilities: ['transform_land', 'grow_forest'],
      description: '改造与森林共鸣，改造的地形直接变成森林',
      effect: '改造范围额外生成森林',
      discovered: false,
      discoverTurn: null,
      usageCount: 0
    }],
    ['sun_highland', {
      id: 'sun_highland',
      name: '日华高地',
      abilities: ['sun_blessing', 'raise_earth'],
      description: '日华与高地共鸣，高地获得永久光照，驱散周围黑暗',
      effect: '高地周围2格黑暗永久驱散',
      discovered: false,
      discoverTurn: null,
      usageCount: 0
    }],
    ['cleanse_memory', {
      id: 'cleanse_memory',
      name: '净化记忆',
      abilities: ['cleanse', 'memory_beacon'],
      description: '净化与记忆信标共鸣，大范围净化+记忆恢复，迷失单位直接获救',
      effect: '范围内迷雾中单位直接guidedTurns+2',
      discovered: false,
      discoverTurn: null,
      usageCount: 0
    }],
    ['time_stop', {
      id: 'time_stop',
      name: '时间停滞',
      abilities: ['time_dilation', 'reveal_path'],
      description: '时间延缓与显路共鸣，时间延缓期间所有造物持续时间暂停',
      effect: '所有造物remaining暂停减少1回合',
      discovered: false,
      discoverTurn: null,
      usageCount: 0
    }]
  ]),

  // 检查并触发连锁反应
  checkReactions(game) {
    const activeAbilities = new Set(
      game.creations
        .filter(c => c.placed && c.remaining > 0)
        .map(c => c.card.ability)
    );

    const discoveries = [];

    for (const [id, reaction] of this.reactions) {
      if (!reaction.discovered &&
          reaction.abilities.every(a => activeAbilities.has(a))) {
        // 检查距离条件
        const creations = game.creations.filter(c =>
          c.placed && c.remaining > 0 && reaction.abilities.includes(c.card.ability)
        );

        if (creations.length >= 2) {
          let foundPair = false;
          for (let i = 0; i < creations.length; i++) {
            for (let j = i + 1; j < creations.length; j++) {
              if (game.distance(creations[i].x, creations[i].y, creations[j].x, creations[j].y) <= 3) {
                foundPair = true;
                break;
              }
            }
            if (foundPair) break;
          }

          if (foundPair) {
            reaction.discovered = true;
            reaction.discoverTurn = game.turn;
            reaction.usageCount += 1;
            discoveries.push(reaction);
          }
        }
      }
    }

    return discoveries;
  },

  // 获取已发现的反应
  getDiscovered() {
    return Array.from(this.reactions.values()).filter(r => r.discovered);
  },

  // 获取未发现的反应
  getUndiscovered() {
    return Array.from(this.reactions.values()).filter(r => !r.discovered);
  },

  // 获取图鉴统计
  getStats() {
    const total = this.reactions.size;
    const discovered = this.getDiscovered().length;
    return {
      total,
      discovered,
      progress: Math.round((discovered / total) * 100),
      completion: discovered === total
    };
  },

  // 重置图鉴（新游戏）
  reset() {
    for (const reaction of this.reactions.values()) {
      reaction.discovered = false;
      reaction.discoverTurn = null;
      reaction.usageCount = 0;
    }
  },

  // 序列化（保存游戏）
  serialize() {
    return Array.from(this.reactions.entries()).map(([id, r]) => ({
      id,
      discovered: r.discovered,
      discoverTurn: r.discoverTurn,
      usageCount: r.usageCount
    }));
  },

  // 反序列化（加载游戏）
  deserialize(data) {
    if (!data) return;
    for (const item of data) {
      const reaction = this.reactions.get(item.id);
      if (reaction) {
        reaction.discovered = item.discovered;
        reaction.discoverTurn = item.discoverTurn;
        reaction.usageCount = item.usageCount;
      }
    }
  }
};

// 连锁反应效果执行器
export function executeChainReaction(game, reactionId) {
  const reaction = RESONANCE_CODEX.reactions.get(reactionId);
  if (!reaction || !reaction.discovered) return false;

  switch (reactionId) {
    case 'steam_fog':
      return applySteamFog(game);
    case 'indestructible_barrier':
      return applyIndestructibleBarrier(game);
    case 'guided_memory_immunity':
      return applyGuidedMemoryImmunity(game);
    case 'trap_slow_combo':
      return applyTrapSlowCombo(game);
    case 'frozen_high_ground':
      return applyFrozenHighGround(game);
    case 'frostwood':
      return applyFrostwood(game);
    case 'earthquake':
      return applyEarthquake(game);
    case 'dream_guidance':
      return applyDreamGuidance(game);
    case 'peace_field':
      return applyPeaceField(game);
    case 'transform_forest':
      return applyTransformForest(game);
    case 'sun_highland':
      return applySunHighland(game);
    case 'cleanse_memory':
      return applyCleanseMemory(game);
    case 'time_stop':
      return applyTimeStop(game);
    default:
      return false;
  }
}

// ========== 具体效果实现 ==========

function applySteamFog(game) {
  const illuminate = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'illuminate');
  const absorb = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'absorb_water');
  if (!illuminate || !absorb) return false;

  const midX = Math.round((illuminate.x + absorb.x) / 2);
  const midY = Math.round((illuminate.y + absorb.y) / 2);
  if (game.getTerrain(midX, midY) === 0) { // TILE.LAND
    game.setTerrain(midX, midY, 10); // TILE.FOG
    game.log(`照明与吸水产生共鸣，${game.tileName(midX, midY)} 升起蒸汽迷雾`);
    return true;
  }
  return false;
}

function applyIndestructibleBarrier(game) {
  for (const creation of game.creations.filter(c => c.placed && c.remaining > 0 && c.card.ability === 'block')) {
    const hadForest = creation.restores?.some(r => r.prev === 7 || r.prev === 'forest'); // TILE.FOREST
    if (hadForest && creation.remaining < 6) {
      creation.remaining += 1;
      game.log(`「${creation.card.name}」在森林中获得加固，持续时间延长`);
      return true;
    }
  }
  return false;
}

function applyGuidedMemoryImmunity(game) {
  let affected = 0;
  for (const unit of game.units.filter(u => u.status === 'active' && u.guidedTurns > 0)) {
    unit.immuneChaos = Math.max(unit.immuneChaos || 0, 2);
    affected++;
  }
  if (affected > 0) {
    game.log(`引导与记忆信标共鸣，${affected}个被引导单位获得免疫混乱`);
    return true;
  }
  return false;
}

function applyTrapSlowCombo(game) {
  for (const creation of game.creations.filter(c => c.placed && c.remaining > 0 && c.card.ability === 'trap')) {
    const beastHere = game.units.find(u => u.type === 'beast' && u.status === 'active' && u.x === creation.x && u.y === creation.y);
    if (beastHere && beastHere.stunned) {
      beastHere.extraStunned = true;
      game.log(`「${creation.card.name}」与迟缓效果共鸣，${beastHere.name} 被额外牵制`);
      return true;
    }
  }
  return false;
}

function applyFrozenHighGround(game) {
  for (const freeze of game.creations.filter(c => c.placed && c.remaining > 0 && c.card.ability === 'freeze_water')) {
    for (const raise of game.creations.filter(c => c.placed && c.remaining > 0 && c.card.ability === 'raise_earth')) {
      if (game.distance(freeze.x, freeze.y, raise.x, raise.y) <= 2) {
        const freezeCells = game.tilesWithin(freeze.x, freeze.y, freeze.card.range);
        const raiseCells = game.tilesWithin(raise.x, raise.y, raise.card.range);
        for (const fc of freezeCells) {
          for (const rc of raiseCells) {
            if (fc.x === rc.x && fc.y === rc.y && game.getTerrain(fc.x, fc.y) === 2) { // TILE.HIGH
              const tempRestore = freeze.restores?.find(r => r.x === fc.x && r.y === fc.y);
              if (tempRestore) {
                const idx = freeze.restores.indexOf(tempRestore);
                if (idx > -1) freeze.restores.splice(idx, 1);
                game.log(`冻结与抬升共鸣，${game.tileName(fc.x, fc.y)} 的高地永久存在`);
                return true;
              }
            }
          }
        }
      }
    }
  }
  return false;
}

// 新增效果
function applyFrostwood(game) {
  const freeze = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'freeze_water');
  const forest = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'grow_forest');
  if (!freeze || !forest) return false;

  if (game.distance(freeze.x, freeze.y, forest.x, forest.y) <= 2) {
    const overlap = game.tilesWithin(freeze.x, freeze.y, freeze.card.range)
      .filter(fc => game.tilesWithin(forest.x, forest.y, forest.card.range).some(rc => fc.x === rc.x && fc.y === rc.y));

    let changed = 0;
    for (const cell of overlap) {
      if (game.getTerrain(cell.x, cell.y) === 7) { // TILE.FOREST
        // 霜木林：永久森林，不可被灾害改变
        const tempRestore = forest.restores?.find(r => r.x === cell.x && r.y === cell.y);
        if (tempRestore) {
          const idx = forest.restores.indexOf(tempRestore);
          if (idx > -1) forest.restores.splice(idx, 1);
          changed++;
        }
      }
    }
    if (changed > 0) {
      game.log(`冰与森林共鸣，${changed}格霜木林永久存在，不可被灾害侵蚀`);
      return true;
    }
  }
  return false;
}

function applyEarthquake(game) {
  const raise = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'raise_earth');
  const dig = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'dig_channel');
  if (!raise || !dig) return false;

  if (game.distance(raise.x, raise.y, dig.x, dig.y) <= 2) {
    const neighbors = game.neighbors(raise.x, raise.y);
    if (neighbors.length > 0) {
      const target = neighbors[Math.floor(Math.random() * neighbors.length)];
      const terrains = [0, 1, 9, 10]; // LAND, WATER, DARK, FOG
      const newTerrain = terrains[Math.floor(Math.random() * terrains.length)];
      game.setTerrain(target.x, target.y, newTerrain);
      game.log(`抬升与挖掘共鸣，${game.tileName(target.x, target.y)} 发生地裂，地形改变`);
      return true;
    }
  }
  return false;
}

function applyDreamGuidance(game) {
  const guide = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'guide');
  const dream = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'dream_link');
  if (!guide || !dream) return false;

  let affected = 0;
  for (const unit of game.units.filter(u => u.status === 'active' && u.guidedTurns > 0)) {
    if (game.distance(unit.x, unit.y, guide.x, guide.y) <= guide.card.range + 1) {
      unit.immuneChaos = Math.max(unit.immuneChaos || 0, 3);
      affected++;
    }
  }
  if (affected > 0) {
    game.log(`引导与梦境链接共鸣，${affected}个单位获得梦境守护`);
    return true;
  }
  return false;
}

function applyPeaceField(game) {
  const field = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'force_field');
  const calm = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'calm');
  if (!field || !calm) return false;

  if (game.distance(field.x, field.y, calm.x, calm.y) <= 3) {
    let affected = 0;
    for (const unit of game.units.filter(u => u.status === 'active')) {
      if (game.distance(unit.x, unit.y, field.x, field.y) <= field.card.range + 1) {
        unit.immuneChaos = Math.max(unit.immuneChaos || 0, 2);
        affected++;
      }
    }
    if (game.isWarLevel && game.warMeter > 0) {
      game.warMeter = Math.max(0, game.warMeter - 1);
      game.log(`和平领域共鸣，战争值下降，${affected}个单位获得免疫混乱`);
      return true;
    } else if (affected > 0) {
      game.log(`和平领域共鸣，${affected}个单位获得免疫混乱`);
      return true;
    }
  }
  return false;
}

function applyTransformForest(game) {
  const transform = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'transform_land');
  const forest = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'grow_forest');
  if (!transform || !forest) return false;

  if (game.distance(transform.x, transform.y, forest.x, forest.y) <= 2) {
    const transformCells = game.tilesWithin(transform.x, transform.y, transform.card.range);
    let changed = 0;
    for (const cell of transformCells) {
      const terrain = game.getTerrain(cell.x, cell.y);
      if (terrain === 0 || terrain === 12) { // LAND or SWAMP
        game.setTerrain(cell.x, cell.y, 7); // FOREST
        changed++;
      }
    }
    if (changed > 0) {
      game.log(`改造与森林共鸣，${changed}格地形直接变成森林`);
      return true;
    }
  }
  return false;
}

function applySunHighland(game) {
  const sun = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'sun_blessing');
  const raise = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'raise_earth');
  if (!sun || !raise) return false;

  if (game.distance(sun.x, sun.y, raise.x, raise.y) <= 3) {
    let changed = 0;
    const highCells = game.tilesWithin(raise.x, raise.y, raise.card.range)
      .filter(c => game.getTerrain(c.x, c.y) === 2); // TILE.HIGH

    for (const cell of highCells) {
      const neighbors = game.tilesWithin(cell.x, cell.y, 2);
      for (const n of neighbors) {
        if (game.getTerrain(n.x, n.y) === 9 || game.getTerrain(n.x, n.y) === 10) { // DARK or FOG
          game.setTerrain(n.x, n.y, 0); // LAND
          changed++;
        }
      }
    }
    if (changed > 0) {
      game.log(`日华与高地共鸣，高地周围${changed}格黑暗被永久驱散`);
      return true;
    }
  }
  return false;
}

function applyCleanseMemory(game) {
  const cleanse = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'cleanse');
  const beacon = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'memory_beacon');
  if (!cleanse || !beacon) return false;

  if (game.distance(cleanse.x, cleanse.y, beacon.x, beacon.y) <= 3) {
    let affected = 0;
    for (const unit of game.units.filter(u => u.status === 'active')) {
      const terrain = game.getTerrain(unit.x, unit.y);
      if ((terrain === 9 || terrain === 10) && game.distance(unit.x, unit.y, beacon.x, beacon.y) <= beacon.card.range + 2) { // DARK or FOG
        unit.guidedTurns = Math.max(unit.guidedTurns, 2);
        affected++;
      }
    }
    if (affected > 0) {
      game.log(`净化与记忆信标共鸣，${affected}个迷失单位找回方向`);
      return true;
    }
  }
  return false;
}

function applyTimeStop(game) {
  const time = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'time_dilation');
  const reveal = game.creations.find(c => c.placed && c.remaining > 0 && c.card.ability === 'reveal_path');
  if (!time || !reveal) return false;

  if (game.distance(time.x, time.y, reveal.x, reveal.y) <= 3) {
    let affected = 0;
    for (const creation of game.creations.filter(c => c.placed && c.remaining > 0)) {
      creation.remaining += 1;
      affected++;
    }
    if (affected > 0) {
      game.log(`时间停滞共鸣，所有造物持续时间暂停1回合`);
      return true;
    }
  }
  return false;
}
