// Ability Handlers - Strategy Pattern for Creation Effects
// Separates ability logic from game.js to improve maintainability

import { TILE } from './levels.js';

export const AbilityHandlers = {
  // Immediate placement effects (applied once when creation is placed)
  immediate: new Map(),

  // Active turn effects (applied each turn while creation persists)
  active: new Map()
};

// Helper to set temporary terrain linked to a creation
function setTempTerrain(game, creation, x, y, tile) {
  if (!creation.restores) creation.restores = [];
  const prev = game.getTerrain(x, y);
  if (prev === tile) return;
  game.setTerrain(x, y, tile);
  creation.restores.push({ x, y, prev, tile: prev });
}

function logGame(game, text, important = false) {
  if (typeof game.addLog === 'function') game.addLog(text, important);
  else if (typeof game.log === 'function') game.log(text, important);
}

function canRewriteTerrain(terrain) {
  return ![TILE.MOUNTAIN, TILE.WALL, TILE.EXIT, TILE.CITY, TILE.SACRED].includes(terrain);
}

// Check whether a unit matches the attract target type
function matchesAttractTarget(game, unit, target) {
  if (!unit || unit.status !== 'active') return false;
  if (target === 'all') return true;
  if (target === 'beast') return unit.type === 'beast';
  if (target === 'human') return game.isCivilian(unit) || game.isMessenger(unit);
  // Default fallback: match beasts
  return unit.type === 'beast';
}

function rewriteTerrain(game, x, y, tile) {
  if (typeof game.inBounds === 'function' && !game.inBounds(x, y)) return false;
  const current = game.getTerrain(x, y);
  if (current === tile || !canRewriteTerrain(current)) return false;
  game.setTerrain(x, y, tile);
  return true;
}

function affectNearbyUnits(game, x, y, range, updater) {
  let affected = 0;
  for (const unit of game.units || []) {
    if (unit.status !== 'active') continue;
    if (game.distance(unit.x, unit.y, x, y) <= range) {
      updater(unit);
      affected += 1;
    }
  }
  return affected;
}

const HAZARD_TILES = [TILE.WATER, TILE.SWAMP, TILE.FOG, TILE.DARK, TILE.POISON];

// ========== Immediate Handlers ==========

AbilityHandlers.immediate.set('create_bridge', (game, creation) => {
  const { card, x, y } = creation;
  const hazardTiles = [TILE.WATER, TILE.SWAMP, TILE.FOG, TILE.DARK, TILE.POISON];

  // Collect all hazard tiles within range and sort by distance from placement point.
  const candidates = game.tilesWithin(x, y, Math.max(1, card.range)).filter((cell) =>
    hazardTiles.includes(game.getTerrain(cell.x, cell.y))
  );
  candidates.sort((a, b) => game.distance(x, y, a.x, a.y) - game.distance(x, y, b.x, b.y));

  // No hazard terrain: do not place anything.
  if (!candidates.length) return;

  // Place bridges on the nearest hazard tiles (up to 4).
  for (const cell of candidates.slice(0, 4)) {
    setTempTerrain(game, creation, cell.x, cell.y, TILE.BRIDGE);
  }
});

AbilityHandlers.immediate.set('dig_channel', (game, creation) => {
  const { card, x, y } = creation;
  let channeled = 0;
  if (!game.unitAt(x, y) && canRewriteTerrain(game.getTerrain(x, y))) {
    game.setTerrain(x, y, TILE.WATER);
  }
  for (const cell of game.tilesWithin(x, y, Math.max(1, card.range) + 1)) {
    if (channeled >= 3) break;
    if (cell.x === x && cell.y === y) continue;
    if (!HAZARD_TILES.includes(game.getTerrain(cell.x, cell.y))) continue;
    if (rewriteTerrain(game, cell.x, cell.y, TILE.LAND)) channeled += 1;
  }
  logGame(game, `${card.name} digs a channel and redirects ${channeled} hazard tile(s).`);
});

AbilityHandlers.immediate.set('block', (game, creation) => {
  setTempTerrain(game, creation, creation.x, creation.y, TILE.WALL);
});

AbilityHandlers.immediate.set('force_field', (game, creation) => {
  const { card, x, y } = creation;
  for (const cell of game.tilesWithin(x, y, card.range)) {
    if (game.getTerrain(cell.x, cell.y) !== TILE.WALL && !game.unitAt(cell.x, cell.y)) {
      setTempTerrain(game, creation, cell.x, cell.y, TILE.FIELD);
    }
  }
});

AbilityHandlers.immediate.set('transform_land', (game, creation) => {
  const { card, x, y } = creation;
  let changed = 0;
  for (const cell of game.tilesWithin(x, y, card.range)) {
    const terrain = game.getTerrain(cell.x, cell.y);
    if ([TILE.WATER, TILE.SWAMP, TILE.DARK, TILE.FOG, TILE.POISON].includes(terrain)) {
      game.setTerrain(cell.x, cell.y, TILE.LAND);
      changed += 1;
    }
  }
  if (changed) game.addLog(`「${card.name}」改造了 ${changed} 处危险地形。`);
});

AbilityHandlers.immediate.set('freeze_water', (game, creation) => {
  const { card, x, y } = creation;
  let changed = 0;
  for (const cell of game.tilesWithin(x, y, Math.max(1, card.range))) {
    if (game.getTerrain(cell.x, cell.y) === TILE.WATER) {
      setTempTerrain(game, creation, cell.x, cell.y, TILE.BRIDGE);
      changed += 1;
    }
  }
  if (!changed) setTempTerrain(game, creation, x, y, TILE.BRIDGE);
});

AbilityHandlers.immediate.set('raise_earth', (game, creation) => {
  const { card, x, y } = creation;
  let changed = 0;
  for (const cell of game.tilesWithin(x, y, card.range)) {
    const terrain = game.getTerrain(cell.x, cell.y);
    if ([TILE.LAND, TILE.WATER, TILE.SWAMP].includes(terrain)) {
      setTempTerrain(game, creation, cell.x, cell.y, TILE.HIGH);
      changed += 1;
    }
  }
  if (!changed) setTempTerrain(game, creation, x, y, TILE.HIGH);
});

AbilityHandlers.immediate.set('grow_forest', (game, creation) => {
  const { card, x, y } = creation;
  let changed = 0;
  for (const cell of game.tilesWithin(x, y, card.range)) {
    const terrain = game.getTerrain(cell.x, cell.y);
    if ([TILE.LAND, TILE.SWAMP].includes(terrain)) {
      setTempTerrain(game, creation, cell.x, cell.y, TILE.FOREST);
      changed += 1;
    }
  }
  if (!changed) setTempTerrain(game, creation, x, y, TILE.FOREST);
});

AbilityHandlers.immediate.set('trap', (game, creation) => {
  // Trap doesn't change terrain - triggers on beast entry (see moveBeast)
});

AbilityHandlers.immediate.set('sun_blessing', (game, creation) => {
  const { card, x, y } = creation;
  for (const cell of game.tilesWithin(x, y, card.range + 1)) {
    const terrain = game.getTerrain(cell.x, cell.y);
    if (terrain === TILE.DARK || terrain === TILE.FOG) {
      game.setTerrain(cell.x, cell.y, TILE.LAND);
    }
  }
  for (const unit of game.units.filter((u) => game.isCivilian(u) && u.status === 'active')) {
    if (game.distance(unit.x, unit.y, x, y) <= card.range + 1) {
      unit.immuneChaos = 3;
      unit.guidedTurns = Math.max(unit.guidedTurns, 1);
    }
  }
  game.addLog(`「${card.name}」降下日华，大范围驱散黑暗并庇佑生灵。`);
});

AbilityHandlers.immediate.set('attract', (game, creation) => {
  const { card, x, y } = creation;
  const target = card.attractTarget || 'beast';
  creation.arrivedIds = new Set();
  let attracted = 0;
  for (const unit of game.units || []) {
    if (!matchesAttractTarget(game, unit, target)) continue;
    if (game.distance(unit.x, unit.y, x, y) > card.range + 1) continue;
    unit.attractedTo = { x, y, creationId: creation.id };
    unit.attractTurns = card.duration;
    attracted += 1;
  }
  if (attracted) logGame(game, `「${card.name}」的引力场启动，${attracted} 个目标开始向这里移动。`, true);
});

// ========== Active Turn Handlers ==========

AbilityHandlers.active.set('absorb_water', (game, creation) => {
  const { card, x, y } = creation;
  const cells = game.tilesWithin(x, y, card.range);
  let changed = 0;
  for (const cell of cells) {
    if (changed >= 3) break;
    if (game.getTerrain(cell.x, cell.y) === TILE.WATER) {
      game.setTerrain(cell.x, cell.y, TILE.LAND);
      changed += 1;
    }
  }
  if (changed) game.addLog(`「${card.name}」吸收了 ${changed} 格水域。`);
});

AbilityHandlers.active.set('illuminate', (game, creation) => {
  const { card, x, y } = creation;
  const cells = game.tilesWithin(x, y, card.range);
  let changed = 0;
  for (const cell of cells) {
    const terrain = game.getTerrain(cell.x, cell.y);
    if (terrain === TILE.DARK) {
      game.setTerrain(cell.x, cell.y, TILE.LAND);
      changed += 1;
    }
  }
  if (changed) game.addLog(`「${card.name}」照亮了 ${changed} 格黑暗。`);
});

AbilityHandlers.active.set('gale', (game, creation) => {
  const { card, x, y } = creation;
  const cells = game.tilesWithin(x, y, card.range);
  let changed = 0;
  for (const cell of cells) {
    const terrain = game.getTerrain(cell.x, cell.y);
    if (terrain === TILE.FOG) {
      game.setTerrain(cell.x, cell.y, TILE.LAND);
      changed += 1;
    }
  }
  if (changed) game.addLog(`「${card.name}」吹散了 ${changed} 格迷雾。`);
});

AbilityHandlers.active.set('dig_channel', (game, creation) => {
  const { card, x, y } = creation;
  let channeled = 0;
  for (const cell of game.tilesWithin(x, y, Math.max(1, card.range) + 1)) {
    if (channeled >= 1) break;
    if (cell.x === x && cell.y === y) continue;
    if (!HAZARD_TILES.includes(game.getTerrain(cell.x, cell.y))) continue;
    if (rewriteTerrain(game, cell.x, cell.y, TILE.LAND)) channeled += 1;
  }
  if (channeled) logGame(game, `${card.name} channels away ${channeled} spreading hazard tile.`);
});

AbilityHandlers.active.set('cleanse', (game, creation) => {
  const { card, x, y } = creation;
  const cells = game.tilesWithin(x, y, card.range);
  let changed = 0;
  for (const cell of cells) {
    if ([TILE.SWAMP, TILE.POISON].includes(game.getTerrain(cell.x, cell.y))) {
      game.setTerrain(cell.x, cell.y, TILE.LAND);
      changed += 1;
    }
  }
  if (changed) game.addLog(`「${card.name}」净化了 ${changed} 格污染地形。`);
});

AbilityHandlers.active.set('calm', (game, creation) => {
  const { card, x, y } = creation;
  if (game.isWarLevel()) {
    const before = game.warMeter;
    game.warMeter = Math.max(0, game.warMeter - 2);
    if (before !== game.warMeter) game.addLog(`「${card.name}」降低战争值：${before} → ${game.warMeter}。`);
  }
  for (const unit of game.units.filter((u) => u.type === 'beast' && u.status === 'active')) {
    if (game.distance(unit.x, unit.y, x, y) <= card.range + 1) {
      unit.anger = Math.max(0, (unit.anger || 0) - 1);
      unit.stunnedTurns = 2;
      game.addLog(`「${card.name}」安抚了 ${unit.name}，怒气降至 ${unit.anger}。`);
    }
  }
});

AbilityHandlers.active.set('guide', (game, creation) => {
  const { card, x, y } = creation;
  let guided = 0;
  for (const unit of game.units.filter((u) => game.isCivilian(u) || game.isMessenger(u))) {
    if (unit.status === 'active' && game.distance(unit.x, unit.y, x, y) <= card.range + 1) {
      unit.guidedTurns = 2;
      guided += 1;
    }
  }
  if (guided) game.addLog(`「${card.name}」正在引导 ${guided} 个单位。`);
});

AbilityHandlers.active.set('slow_beast', (game, creation) => {
  const { card, x, y } = creation;
  for (const unit of game.units.filter((u) => u.type === 'beast' && u.status === 'active')) {
    if (game.distance(unit.x, unit.y, x, y) <= card.range + 1) {
        unit.stunnedTurns = 2;
        game.addLog(`「${card.name}」牵制了 ${unit.name}。`);
    }
  }
});

AbilityHandlers.active.set('freeze_water', (game, creation) => {
  const { card, x, y } = creation;
  const cells = game.tilesWithin(x, y, card.range);
  let changed = 0;
  for (const cell of cells) {
    if (game.getTerrain(cell.x, cell.y) === TILE.WATER) {
      setTempTerrain(game, creation, cell.x, cell.y, TILE.BRIDGE);
      changed += 1;
    }
  }
  if (changed) game.addLog(`「${card.name}」冻结了 ${changed} 格水域，形成临时冰桥。`);
});

AbilityHandlers.active.set('raise_earth', (game, creation) => {
  const { card, x, y } = creation;
  const cells = game.tilesWithin(x, y, card.range);
  let changed = 0;
  for (const cell of cells) {
    const terrain = game.getTerrain(cell.x, cell.y);
    if ([TILE.LAND, TILE.WATER, TILE.SWAMP].includes(terrain)) {
      setTempTerrain(game, creation, cell.x, cell.y, TILE.HIGH);
      changed += 1;
    }
  }
  if (changed) game.addLog(`「${card.name}」抬升了 ${changed} 格地面形成高地。`);
});

AbilityHandlers.active.set('grow_forest', (game, creation) => {
  const { card, x, y } = creation;
  const cells = game.tilesWithin(x, y, card.range);
  let changed = 0;
  for (const cell of cells) {
    const terrain = game.getTerrain(cell.x, cell.y);
    if ([TILE.LAND, TILE.SWAMP].includes(terrain)) {
      setTempTerrain(game, creation, cell.x, cell.y, TILE.FOREST);
      changed += 1;
    }
  }
  if (changed) game.addLog(`「${card.name}」种植了 ${changed} 格森林，阻挡灾害扩散。`);
});

AbilityHandlers.active.set('dream_link', (game, creation) => {
  const { card, x, y } = creation;
  const targets = game.units.filter((u) => (game.isCivilian(u) || game.isMessenger(u)) && u.status === 'active' && game.distance(u.x, u.y, x, y) <= card.range + 1);
  if (targets.length >= 2) {
    for (let i = 0; i + 1 < targets.length; i += 2) {
      const a = targets[i];
      const b = targets[i + 1];
      a.dreamLinked = b.id;
      b.dreamLinked = a.id;
      a.guidedTurns = Math.max(a.guidedTurns, 2);
      b.guidedTurns = Math.max(b.guidedTurns, 2);
    }
    game.addLog(`「${card.name}」连接了 ${targets.length} 个单位的梦境，共享视野与方向。`);
  }
});

AbilityHandlers.active.set('time_dilation', (game, creation) => {
  const { card } = creation;
  game.level.maxTurns += 2;
  game.addLog(`「${card.name}」延缓了时间，剩余回合 +2！`, true);
});

AbilityHandlers.active.set('reveal_path', (game, creation) => {
  const { card, x, y } = creation;
  let guided = 0;
  for (const unit of game.units.filter((u) => game.isCivilian(u) || game.isMessenger(u))) {
    if (unit.status === 'active' && game.distance(unit.x, unit.y, x, y) <= card.range + 1) {
      unit.guidedTurns = 2;
      unit.revealedPath = Math.max(unit.revealedPath || 0, 2);
      unit.moveSpeed = Math.max(unit.moveSpeed || 1, 2);
      guided += 1;
    }
  }
  if (guided) game.addLog(`「${card.name}」为 ${guided} 个单位揭示了快速通道。`);
});

AbilityHandlers.active.set('sun_blessing', (game, creation) => {
  const { card, x, y } = creation;
  let changed = 0;
  for (const cell of game.tilesWithin(x, y, card.range + 1)) {
    const terrain = game.getTerrain(cell.x, cell.y);
    if (terrain === TILE.DARK || terrain === TILE.FOG) {
      game.setTerrain(cell.x, cell.y, TILE.LAND);
      changed += 1;
    }
  }
  for (const unit of game.units.filter((u) => game.isCivilian(u) && u.status === 'active')) {
    if (game.distance(unit.x, unit.y, x, y) <= card.range + 1) {
      unit.immuneChaos = 3;
      unit.guidedTurns = Math.max(unit.guidedTurns, 1);
    }
  }
  if (changed) game.addLog(`「${card.name}」大范围驱散黑暗，赋予单位免疫与指引。`);
});

AbilityHandlers.active.set('memory_beacon', (game, creation) => {
  const { card, x, y } = creation;
  if (game.getTerrain(x, y) === TILE.FOG) return;
  const cells = game.tilesWithin(x, y, card.range);
  let changed = 0;
  for (const cell of cells) {
    if (game.getTerrain(cell.x, cell.y) === TILE.DARK) {
      game.setTerrain(cell.x, cell.y, TILE.LAND);
      changed += 1;
    }
  }
  for (const unit of game.units.filter((u) => game.isCivilian(u) && u.status === 'active')) {
    if (game.distance(unit.x, unit.y, x, y) <= card.range + 2) {
      unit.guidedTurns = 2;
    }
  }
  if (changed) game.addLog(`「${card.name}」唤回记忆，驱散 ${changed} 格黑暗。`);
});

AbilityHandlers.active.set('haste', (game, creation) => {
  const { card, x, y } = creation;
  let boosted = 0;
  const speed = Math.min(3, 1 + Math.max(1, Math.min(2, card.range || 1)));
  for (const unit of game.units.filter((u) => game.isCivilian(u) || game.isMessenger(u))) {
    if (unit.status === 'active' && game.distance(unit.x, unit.y, x, y) <= card.range + 1) {
      unit.hasteTurns = Math.max(unit.hasteTurns || 0, 2);
      unit.moveSpeed = Math.max(unit.moveSpeed || 1, speed);
      boosted += 1;
    }
  }
  if (boosted) game.addLog(`${card.name} grants extra action to ${boosted} unit(s).`);
});

AbilityHandlers.active.set('teleport', (game, creation) => {
  const { card, x, y } = creation;
  const targets = game.units
    .filter((unit) => (game.isCivilian(unit) || game.isMessenger(unit)) && unit.status === 'active' && unit.goal)
    .filter((unit) => game.distance(unit.x, unit.y, x, y) <= Math.max(1, card.range))
    .sort((a, b) => game.distance(b.x, b.y, b.goal.x, b.goal.y) - game.distance(a.x, a.y, a.goal.x, a.goal.y));
  const unit = targets[0];
  if (!unit) return;

  unit.x = unit.goal.x;
  unit.y = unit.goal.y;
  if (game.isCivilian(unit)) game.rescueUnit(unit);
  else {
    unit.met = true;
    game.addLog(`${card.name} teleports ${unit.name} to the meeting point.`, true);
  }
});

AbilityHandlers.active.set('shield_units', (game, creation) => {
  const { card, x, y } = creation;
  let shielded = 0;
  for (const unit of game.units.filter((u) => u.status === 'active')) {
    if (game.distance(unit.x, unit.y, x, y) <= card.range + 1) {
      unit.shieldTurns = Math.max(unit.shieldTurns || 0, 2);
      shielded += 1;
    }
  }
  if (shielded) game.addLog(`${card.name} shields ${shielded} unit(s).`);
});

AbilityHandlers.active.set('redirect_hazard', (game, creation) => {
  const { card, x, y } = creation;
  const hazards = [TILE.WATER, TILE.DARK, TILE.FOG, TILE.POISON, TILE.SWAMP];
  let changed = 0;
  for (const cell of game.tilesWithin(x, y, card.range + 1)) {
    if (changed >= 2) break;
    const terrain = game.getTerrain(cell.x, cell.y);
    if (!hazards.includes(terrain)) continue;
    setTempTerrain(game, creation, cell.x, cell.y, terrain === TILE.WATER ? TILE.BRIDGE : TILE.LAND);
    changed += 1;
  }
  if (changed) game.addLog(`${card.name} redirects ${changed} hazard tile(s).`);
});

AbilityHandlers.active.set('attract', (game, creation) => {
  const { card, x, y } = creation;
  const target = card.attractTarget || 'beast';
  if (!creation.arrivedIds) creation.arrivedIds = new Set();
  for (const unit of game.units || []) {
    if (!matchesAttractTarget(game, unit, target)) continue;
    const uid = unit.id ?? unit.name;
    if (uid != null && creation.arrivedIds.has(uid)) continue;
    if (game.distance(unit.x, unit.y, x, y) > card.range + 1) continue;
    unit.attractedTo = { x, y, creationId: creation.id };
    unit.attractTurns = Math.max(unit.attractTurns || 0, 1);
  }
});

// ========== Verification Corruption / Illegal Abilities ==========

AbilityHandlers.immediate.set('consume_light', (game, creation) => {
  const { card, x, y } = creation;
  const range = Math.max(1, (card.range || 1) + 1);
  let darkened = 0;
  for (const cell of game.tilesWithin(x, y, range)) {
    if (darkened >= 6) break;
    const terrain = game.getTerrain(cell.x, cell.y);
    if ([TILE.LAND, TILE.FOG, TILE.FOREST, TILE.BRIDGE, TILE.VILLAGE, TILE.HIGH].includes(terrain)) {
      if (rewriteTerrain(game, cell.x, cell.y, TILE.DARK)) darkened += 1;
    }
  }
  if (!darkened && rewriteTerrain(game, x, y, TILE.DARK)) darkened = 1;

  let extinguished = 0;
  for (const other of game.creations || []) {
    if (other === creation || !other.placed || other.remaining <= 0) continue;
    if (!['illuminate', 'sun_blessing', 'memory_beacon'].includes(other.card?.ability)) continue;
    if (game.distance(other.x, other.y, x, y) > range) continue;
    other.remaining = Math.min(other.remaining, 1);
    other.corruptedBy = card.ability;
    extinguished += 1;
  }

  creation.corruptionEffect = { type: 'consume_light', darkened, extinguished };
  logGame(game, `「${card.name}」吞噬光源，${darkened} 格地形坠入黑暗，熄灭 ${extinguished} 个光源。`, true);
});

AbilityHandlers.active.set('consume_light', (game, creation) => {
  if (creation.corruptionEffect?.activeLogged) return;
  creation.corruptionEffect = { ...(creation.corruptionEffect || {}), activeLogged: true };
  affectNearbyUnits(game, creation.x, creation.y, Math.max(1, creation.card.range || 1) + 1, (unit) => {
    unit.guidedTurns = 0;
    unit.lightConsumedTurns = Math.max(unit.lightConsumedTurns || 0, 2);
  });
});

AbilityHandlers.immediate.set('steam_burst', (game, creation) => {
  const { card, x, y } = creation;
  const range = Math.max(1, (card.range || 1) + 1);
  let fogged = 0;
  for (const cell of game.tilesWithin(x, y, range)) {
    if (fogged >= 7) break;
    const terrain = game.getTerrain(cell.x, cell.y);
    if ([TILE.WATER, TILE.LAND, TILE.SWAMP, TILE.BRIDGE, TILE.VILLAGE].includes(terrain)) {
      if (rewriteTerrain(game, cell.x, cell.y, TILE.FOG)) fogged += 1;
    }
  }
  if (!fogged && rewriteTerrain(game, x, y, TILE.FOG)) fogged = 1;

  const blinded = affectNearbyUnits(game, x, y, range, (unit) => {
    unit.steamBlindTurns = Math.max(unit.steamBlindTurns || 0, 2);
    unit.revealedPath = 0;
  });

  creation.corruptionEffect = { type: 'steam_burst', fogged, blinded };
  logGame(game, `「${card.name}」把水火压成蒸汽，${fogged} 格地形被迷雾覆盖，${blinded} 个单位失去路径感。`, true);
});

AbilityHandlers.active.set('steam_burst', (game, creation) => {
  if (creation.remaining <= 1) return;
  const range = Math.max(1, creation.card.range || 1);
  let refreshed = 0;
  for (const cell of game.tilesWithin(creation.x, creation.y, range)) {
    if (refreshed >= 2) break;
    if (game.getTerrain(cell.x, cell.y) === TILE.LAND && rewriteTerrain(game, cell.x, cell.y, TILE.FOG)) {
      refreshed += 1;
    }
  }
});

AbilityHandlers.immediate.set('creation_burst', (game, creation) => {
  const { card, x, y } = creation;
  const range = Math.max(1, card.range || 1);
  let restored = 0;
  for (const cell of game.tilesWithin(x, y, range)) {
    const terrain = game.getTerrain(cell.x, cell.y);
    if ([TILE.WATER, TILE.SWAMP, TILE.DARK, TILE.FOG, TILE.POISON].includes(terrain)) {
      if (rewriteTerrain(game, cell.x, cell.y, TILE.LAND)) restored += 1;
    }
  }

  let shattered = 0;
  const fractureTiles = [TILE.SWAMP, TILE.POISON, TILE.DARK];
  for (const cell of game.tilesWithin(x, y, range + 1)) {
    if (shattered >= 4) break;
    if (cell.x === x && cell.y === y) continue;
    const terrain = game.getTerrain(cell.x, cell.y);
    if (![TILE.LAND, TILE.FOREST, TILE.BRIDGE, TILE.VILLAGE].includes(terrain)) continue;
    const next = fractureTiles[shattered % fractureTiles.length];
    if (rewriteTerrain(game, cell.x, cell.y, next)) shattered += 1;
  }
  if (!restored && rewriteTerrain(game, x, y, TILE.LAND)) restored = 1;

  creation.corruptionEffect = { type: 'creation_burst', restored, shattered };
  logGame(game, `「${card.name}」同时创造与毁灭：修复 ${restored} 格，震裂 ${shattered} 格。`, true);
});

AbilityHandlers.active.set('creation_burst', (game, creation) => {
  if (creation.corruptionEffect?.aftershock) return;
  creation.corruptionEffect = { ...(creation.corruptionEffect || {}), aftershock: true };
  affectNearbyUnits(game, creation.x, creation.y, Math.max(1, creation.card.range || 1) + 1, (unit) => {
    unit.shieldTurns = Math.max(unit.shieldTurns || 0, 1);
  });
});

AbilityHandlers.immediate.set('memory_loop', (game, creation) => {
  const { card, x, y } = creation;
  const range = Math.max(1, card.range || 1);
  let rewritten = 0;
  for (const cell of game.tilesWithin(x, y, range)) {
    if ([TILE.FOG, TILE.DARK].includes(game.getTerrain(cell.x, cell.y))) {
      if (rewriteTerrain(game, cell.x, cell.y, TILE.LAND)) rewritten += 1;
    }
  }
  const looped = affectNearbyUnits(game, x, y, range + 1, (unit) => {
    unit.guidedTurns = Math.max(unit.guidedTurns || 0, 1);
    unit.memoryLoopTurns = Math.max(unit.memoryLoopTurns || 0, 2);
  });
  game.memoryLoopCount = (game.memoryLoopCount || 0) + 1;
  creation.corruptionEffect = { type: 'memory_loop', rewritten, looped };
  logGame(game, `「${card.name}」重写记忆：${rewritten} 格迷雾被擦除，${looped} 个单位陷入既视感。`, true);
});

AbilityHandlers.active.set('memory_loop', (game, creation) => {
  affectNearbyUnits(game, creation.x, creation.y, Math.max(1, creation.card.range || 1) + 1, (unit) => {
    unit.guidedTurns = Math.max(unit.guidedTurns || 0, 1);
  });
});

AbilityHandlers.immediate.set('cycle_life', (game, creation) => {
  const { card, x, y } = creation;
  const range = Math.max(1, card.range || 1);
  let bloomed = 0;
  let withered = 0;
  for (const cell of game.tilesWithin(x, y, range)) {
    const terrain = game.getTerrain(cell.x, cell.y);
    if (bloomed <= withered && [TILE.LAND, TILE.HIGH, TILE.VILLAGE].includes(terrain)) {
      if (rewriteTerrain(game, cell.x, cell.y, TILE.FOREST)) bloomed += 1;
    } else if ([TILE.FOREST, TILE.BRIDGE, TILE.LAND].includes(terrain)) {
      if (rewriteTerrain(game, cell.x, cell.y, TILE.SWAMP)) withered += 1;
    }
  }
  if (!bloomed && rewriteTerrain(game, x, y, TILE.FOREST)) bloomed = 1;

  let revived = 0;
  let marked = 0;
  affectNearbyUnits(game, x, y, range + 1, (unit) => {
    const key = String(unit.id || unit.name || '').length + unit.x + unit.y;
    if (key % 2 === 0) {
      unit.shieldTurns = Math.max(unit.shieldTurns || 0, 1);
      unit.guidedTurns = Math.max(unit.guidedTurns || 0, 1);
      revived += 1;
    } else {
      unit.witherTurns = Math.max(unit.witherTurns || 0, 2);
      marked += 1;
    }
  });

  creation.corruptionEffect = { type: 'cycle_life', bloomed, withered, revived, marked };
  logGame(game, `「${card.name}」让生长与枯萎同环：${bloomed} 格萌生，${withered} 格化为沼泽，${revived} 个单位被护住，${marked} 个单位被凋零标记。`, true);
});

AbilityHandlers.active.set('cycle_life', (game, creation) => {
  affectNearbyUnits(game, creation.x, creation.y, Math.max(1, creation.card.range || 1) + 1, (unit) => {
    if (unit.witherTurns > 0) unit.witherTurns -= 1;
    else unit.shieldTurns = Math.max(unit.shieldTurns || 0, 1);
  });
});

AbilityHandlers.immediate.set('temporal_rift', (game, creation) => {
  const { card, x, y } = creation;
  const range = Math.max(1, card.range || 1);
  let frozenTiles = 0;
  for (const cell of game.tilesWithin(x, y, range)) {
    if (frozenTiles >= 5) break;
    const terrain = game.getTerrain(cell.x, cell.y);
    if ([TILE.LAND, TILE.FOG, TILE.DARK, TILE.SWAMP, TILE.WATER].includes(terrain)) {
      setTempTerrain(game, creation, cell.x, cell.y, TILE.FIELD);
      frozenTiles += 1;
    }
  }

  const frozenUnits = affectNearbyUnits(game, x, y, range + 1, (unit) => {
    unit.stasisTurns = Math.max(unit.stasisTurns || 0, 1);
    unit.revealedPath = Math.max(unit.revealedPath || 0, 1);
  });
  game.temporalDebt = Math.max(game.temporalDebt || 0, 1);
  if (Number.isFinite(game.level?.maxTurns)) game.level.maxTurns += 1;
  else if (Number.isFinite(game.maxTurns)) game.maxTurns += 1;

  creation.corruptionEffect = { type: 'temporal_rift', frozenTiles, frozenUnits, temporalDebt: game.temporalDebt };
  logGame(game, `「${card.name}」撕开静止裂隙：${frozenTiles} 格时间凝固，${frozenUnits} 个单位被定格，回合上限暂时延展。`, true);
});

AbilityHandlers.active.set('temporal_rift', (game, creation) => {
  if (creation.corruptionEffect?.tickLogged) return;
  creation.corruptionEffect = { ...(creation.corruptionEffect || {}), tickLogged: true };
  affectNearbyUnits(game, creation.x, creation.y, Math.max(1, creation.card.range || 1) + 1, (unit) => {
    if (unit.stasisTurns > 0) unit.stasisTurns -= 1;
    unit.revealedPath = Math.max(unit.revealedPath || 0, 1);
  });
});

AbilityHandlers.immediate.set('paradox_barrier', (game, creation) => {
  const { card, x, y } = creation;
  const range = Math.max(1, card.range || 1);
  let barriers = 0;
  for (const cell of game.tilesWithin(x, y, range)) {
    if (barriers >= 6) break;
    if (game.unitAt?.(cell.x, cell.y)) continue;
    const terrain = game.getTerrain(cell.x, cell.y);
    if ([TILE.LAND, TILE.FOG, TILE.DARK, TILE.SWAMP, TILE.WATER, TILE.BRIDGE].includes(terrain)) {
      setTempTerrain(game, creation, cell.x, cell.y, TILE.FIELD);
      barriers += 1;
    }
  }

  const trapped = affectNearbyUnits(game, x, y, range + 1, (unit) => {
    unit.shieldTurns = Math.max(unit.shieldTurns || 0, 2);
    unit.stunned = true;
  });

  creation.corruptionEffect = { type: 'paradox_barrier', barriers, trapped };
  logGame(game, `「${card.name}」立起矛盾结界：${barriers} 格被屏障封锁，${trapped} 个单位同时被保护与牵制。`, true);
});

AbilityHandlers.active.set('paradox_barrier', (game, creation) => {
  affectNearbyUnits(game, creation.x, creation.y, Math.max(1, creation.card.range || 1) + 1, (unit) => {
    unit.shieldTurns = Math.max(unit.shieldTurns || 0, 1);
  });
});

AbilityHandlers.immediate.set('chaos_guide', (game, creation) => {
  const { card, x, y } = creation;
  const range = Math.max(1, card.range || 1);
  let guideLights = 0;
  for (const cell of game.tilesWithin(x, y, range)) {
    if (guideLights >= 4) break;
    const terrain = game.getTerrain(cell.x, cell.y);
    if ([TILE.LAND, TILE.FOREST, TILE.FOG, TILE.DARK].includes(terrain)) {
      if (rewriteTerrain(game, cell.x, cell.y, guideLights % 2 === 0 ? TILE.FOG : TILE.LAND)) guideLights += 1;
    }
  }

  let guided = 0;
  let misled = 0;
  affectNearbyUnits(game, x, y, range + 2, (unit) => {
    const key = String(unit.id || unit.name || '').length + unit.x + unit.y;
    if (key % 2 === 0) {
      unit.guidedTurns = Math.max(unit.guidedTurns || 0, 2);
      unit.revealedPath = Math.max(unit.revealedPath || 0, 1);
      guided += 1;
    } else {
      unit.chaosGuideTurns = Math.max(unit.chaosGuideTurns || 0, 2);
      unit.guidedTurns = 0;
      unit.revealedPath = 0;
      misled += 1;
    }
  });

  creation.corruptionEffect = { type: 'chaos_guide', guideLights, guided, misled };
  logGame(game, `「${card.name}」点亮迷途光标：${guided} 个单位看见路，${misled} 个单位被假路牵走。`, true);
});

AbilityHandlers.active.set('chaos_guide', (game, creation) => {
  affectNearbyUnits(game, creation.x, creation.y, Math.max(1, creation.card.range || 1) + 2, (unit) => {
    if (unit.chaosGuideTurns > 0) unit.chaosGuideTurns -= 1;
  });
});

// ========== Fused Ability Active Handlers ==========

AbilityHandlers.active.set('nature_awakening', (game, creation) => {
  const { card, x, y } = creation;
  let changed = 0;
  for (const cell of game.tilesWithin(x, y, card.range)) {
    const terrain = game.getTerrain(cell.x, cell.y);
    if ([TILE.LAND, TILE.SWAMP].includes(terrain)) {
      game.setTerrain(cell.x, cell.y, TILE.FOREST);
      changed += 1;
    }
  }
  for (const unit of game.units.filter(u => game.isCivilian(u) && u.status === 'active')) {
    if (game.distance(unit.x, unit.y, x, y) <= card.range + 1) {
      unit.guidedTurns = Math.max(unit.guidedTurns || 0, 1) + 1;
    }
  }
  if (changed) game.addLog(`「${card.name}」自然觉醒让 ${changed} 格土地化为森林。`);
});

AbilityHandlers.active.set('rift_sealing', (game, creation) => {
  game.entropy = Math.max(0, game.entropy - 3);
  let sealed = 0;
  for (const c of game.creations) {
    if (c.placed && c.card.ability === 'memory_beacon') {
      c.remaining = 0;
      sealed++;
    }
  }
  game.addLog(`「${creation.card.name}」封隙减低裂隙3点，${sealed} 个记忆信标熄灭。`);
});

AbilityHandlers.active.set('beast_taming', (game, creation) => {
  const { card, x, y } = creation;
  for (const unit of game.units.filter(u => u.type === 'beast' && u.status === 'active')) {
    if (game.distance(unit.x, unit.y, x, y) <= card.range + 1) {
      unit.tamed = true;
      unit.anger = 0;
      unit.stunnedTurns = 2;
    }
  }
  game.addLog(`「${creation.card.name}」驯兽安抚了附近巨兽。`);
});

AbilityHandlers.active.set('time_weave', (game, creation) => {
  let extended = 0;
  for (const c of game.creations) {
    if (c.placed && c.remaining > 0) {
      c.remaining += 2;
      c.maxTurns += 2;
      extended++;
    }
  }
  game.addLog(`「${creation.card.name}」织时延长了 ${extended} 个造物的持续时间。`);

});

// Apply a handler by ability name
export function applyAbility(game, creation, phase) {
  let ability = creation.card.ability;
  // Fused_ prefix fallback: extract base ability if no specific handler
  if (ability.startsWith('fused_') && !AbilityHandlers[phase].has(ability)) {
    ability = ability.slice(6);
  }
  const handler = AbilityHandlers[phase].get(ability);
  if (handler) {
    handler(game, creation);
  } else {
    console.warn(`[AbilityHandlers] No ${phase} handler for ability: ${creation.card.ability}`);
  }
}

// Check whether a handler exists for the given ability at the given phase
export function hasAbilityHandler(ability, phase) {
  return AbilityHandlers[phase].has(ability);
}
