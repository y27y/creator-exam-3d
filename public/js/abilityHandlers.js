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
  creation.restores.push({ x, y, tile: prev });
}

// ========== Immediate Handlers ==========

AbilityHandlers.immediate.set('create_bridge', (game, creation) => {
  const { card, x, y } = creation;
  const cells = game.tilesWithin(x, y, Math.max(1, card.range));
  let changed = 0;
  for (const cell of cells) {
    if (changed >= 4) break;
    if ([TILE.WATER, TILE.SWAMP, TILE.FOG, TILE.DARK, TILE.POISON].includes(game.getTerrain(cell.x, cell.y))) {
      setTempTerrain(game, creation, cell.x, cell.y, TILE.BRIDGE);
      changed += 1;
    }
  }
  if (!changed) setTempTerrain(game, creation, x, y, TILE.BRIDGE);
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

// Apply a handler by ability name
export function applyAbility(game, creation, phase) {
  const handler = AbilityHandlers[phase].get(creation.card.ability);
  if (handler) {
    handler(game, creation);
  }
}

// Check whether a handler exists for the given ability at the given phase
export function hasAbilityHandler(ability, phase) {
  return AbilityHandlers[phase].has(ability);
}
