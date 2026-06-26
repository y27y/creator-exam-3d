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
  game.setTerrain(x, y, tile);
  creation.restores.push({ x, y, tile: game.getTerrain(x, y) });
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

AbilityHandlers.immediate.set('dig_channel', (game, creation) => {
  const { card, x, y } = creation;
  let changed = 0;
  for (const cell of game.tilesWithin(x, y, card.range)) {
    if (game.getTerrain(cell.x, cell.y) === TILE.LAND) {
      setTempTerrain(game, creation, cell.x, cell.y, TILE.WATER);
      changed += 1;
    }
  }
  if (!changed) setTempTerrain(game, creation, x, y, TILE.WATER);
});

AbilityHandlers.immediate.set('trap', (game, creation) => {
  setTempTerrain(game, creation, creation.x, creation.y, TILE.WALL);
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
      unit.immuneChaos = true;
      unit.guidedTurns = Math.max(unit.guidedTurns, 2);
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
    if (terrain === TILE.DARK || terrain === TILE.FOG) {
      game.setTerrain(cell.x, cell.y, TILE.LAND);
      changed += 1;
    }
  }
  if (changed) game.addLog(`「${card.name}」照亮了 ${changed} 格黑暗或迷雾。`);
});

AbilityHandlers.active.set('cleanse', (game, creation) => {
  const { card, x, y } = creation;
  const cells = game.tilesWithin(x, y, card.range);
  let changed = 0;
  for (const cell of cells) {
    if ([TILE.DARK, TILE.FOG, TILE.SWAMP, TILE.POISON].includes(game.getTerrain(cell.x, cell.y))) {
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
      unit.stunned = true;
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
      unit.stunned = true;
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

AbilityHandlers.active.set('dig_channel', (game, creation) => {
  const { card, x, y } = creation;
  const cells = game.tilesWithin(x, y, card.range);
  let changed = 0;
  for (const cell of cells) {
    if (game.getTerrain(cell.x, cell.y) === TILE.LAND) {
      setTempTerrain(game, creation, cell.x, cell.y, TILE.WATER);
      changed += 1;
    }
  }
  if (changed) game.addLog(`「${card.name}」挖掘了 ${changed} 格水渠，引导洪水流向。`);
});

AbilityHandlers.active.set('trap', (game, creation) => {
  const { card, x, y } = creation;
  for (const unit of game.units.filter((u) => u.type === 'beast' && u.status === 'active')) {
    if (game.distance(unit.x, unit.y, x, y) <= card.range + 1) {
      unit.stunned = true;
      unit.anger = Math.max(0, (unit.anger || 0) - 1);
      game.addLog(`「${card.name}」困住了 ${unit.name}，使其迟缓并降低怒气。`);
    }
  }
});

AbilityHandlers.active.set('dream_link', (game, creation) => {
  const { card, x, y } = creation;
  const civilians = game.units.filter((u) => game.isCivilian(u) && u.status === 'active');
  if (civilians.length >= 2) {
    for (let i = 0; i < civilians.length; i++) {
      const unit = civilians[i];
      if (game.distance(unit.x, unit.y, x, y) <= card.range + 1) {
        unit.guidedTurns = 3;
        unit.immuneChaos = true;
      }
    }
    game.addLog(`「${card.name}」连接了迷失者的梦境，使他们找到方向并免疫混乱。`);
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
      unit.moveSpeed = (unit.moveSpeed || 1) + 1;
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
      unit.immuneChaos = true;
      unit.guidedTurns = Math.max(unit.guidedTurns, 2);
    }
  }
  if (changed) game.addLog(`「${card.name}」大范围驱散黑暗，赋予单位免疫与指引。`);
});

AbilityHandlers.active.set('memory_beacon', (game, creation) => {
  const { card, x, y } = creation;
  const cells = game.tilesWithin(x, y, card.range);
  let changed = 0;
  for (const cell of cells) {
    if (game.getTerrain(cell.x, cell.y) === TILE.FOG || game.getTerrain(cell.x, cell.y) === TILE.DARK) {
      game.setTerrain(cell.x, cell.y, TILE.LAND);
      changed += 1;
    }
  }
  for (const unit of game.units.filter((u) => game.isCivilian(u) && u.status === 'active')) {
    if (game.distance(unit.x, unit.y, x, y) <= card.range + 2) {
      unit.guidedTurns = 2;
    }
  }
  if (changed) game.addLog(`「${card.name}」唤回记忆，驱散 ${changed} 格迷雾。`);
});

// Apply a handler by ability name
export function applyAbility(game, creation, phase) {
  const handler = AbilityHandlers[phase].get(creation.card.ability);
  if (handler) {
    handler(game, creation);
  }
}
