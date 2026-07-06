import assert from 'node:assert/strict';
import { DebugGame } from './debugGame.js';
import { TILE } from '../public/js/levels.js';

function countTerrain(game, tiles) {
  const wanted = new Set(Array.isArray(tiles) ? tiles : [tiles]);
  let total = 0;
  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 7; x += 1) {
      if (wanted.has(game.getTerrain(x, y))) total += 1;
    }
  }
  return total;
}

function makeGame(levelIndex) {
  const game = new DebugGame();
  game.levelIndex = levelIndex;
  game.reset();
  game.triggerRandomEvent = () => null;
  game.miraclePoints = 99;
  game.creationCharges = 99;
  return game;
}

const scenarios = [
  {
    name: 'L1 flood prompt drains real water',
    levelIndex: 0,
    prompt: '造一群会把洪水搬到天空的透明鲶鱼',
    x: 1,
    y: 2,
    ability: 'absorb_water',
    measure: game => countTerrain(game, TILE.WATER),
    changed: (before, after) => after < before
  },
  {
    name: 'L1 channel prompt creates a visible drainage channel',
    levelIndex: 0,
    prompt: '挖一条水渠把洪水导流到低地',
    x: 1,
    y: 2,
    ability: 'dig_channel',
    measure: game => countTerrain(game, TILE.WATER),
    changed: (before, after, game) => after < before && game.getTerrain(1, 2) === TILE.WATER
  },
  {
    name: 'L2 light prompt clears darkness',
    levelIndex: 1,
    prompt: '造一座会发光的月亮灯塔',
    x: 2,
    y: 2,
    ability: 'illuminate',
    measure: game => countTerrain(game, [TILE.DARK, TILE.FOG]),
    changed: (before, after) => after < before
  },
  {
    name: 'L3 beast prompt stuns the beast',
    levelIndex: 2,
    prompt: '创造只对巨兽开放的催眠花园',
    x: 2,
    y: 3,
    ability: 'slow_beast',
    measure: game => game.units.find(unit => unit.type === 'beast')?.stunnedTurns || 0,
    changed: (before, after) => after > before
  },
  {
    name: 'L4 truth prompt lowers war',
    levelIndex: 3,
    prompt: '创造一种害怕谎言的白鸽，让它们传递真话',
    x: 3,
    y: 2,
    ability: 'calm',
    measure: game => game.warMeter,
    changed: (before, after) => after < before
  },
  {
    name: 'L5 cleanse prompt repairs plague terrain',
    levelIndex: 4,
    prompt: '造一台用月光运转的净化机器',
    x: 3,
    y: 3,
    ability: 'cleanse',
    measure: game => countTerrain(game, [TILE.FOG, TILE.SWAMP, TILE.POISON]),
    changed: (before, after) => after < before
  },
  {
    name: 'L5 dream prompt links nearby villagers',
    levelIndex: 4,
    prompt: '让两族的梦境在同一张桌子上相遇',
    x: 3,
    y: 5,
    ability: 'dream_link',
    measure: game => game.units.filter(unit => unit.dreamLinked).length,
    changed: (before, after) => after > before
  },
  {
    name: 'L6 redirect prompt changes mixed hazards',
    levelIndex: 5,
    prompt: '把洪水和迷雾改道，不要让它们吞路',
    x: 3,
    y: 3,
    ability: 'redirect_hazard',
    measure: game => countTerrain(game, [TILE.WATER, TILE.DARK, TILE.FOG, TILE.SWAMP, TILE.POISON]),
    changed: (before, after) => after < before
  },
  {
    name: 'L6 shield prompt protects units',
    levelIndex: 5,
    prompt: '给附近的人撑起一面能挡灾害的护盾',
    x: 3,
    y: 4,
    ability: 'shield_units',
    measure: game => game.units.filter(unit => (unit.shieldTurns || 0) > 0).length,
    changed: (before, after) => after > before
  },
  {
    name: 'L6 haste prompt grants extra movement state',
    levelIndex: 5,
    prompt: '给附近村民增加行动力，让他们多走一步',
    x: 3,
    y: 4,
    ability: 'haste',
    measure: game => game.units.filter(unit => (unit.hasteTurns || 0) > 0 || (unit.moveSpeed || 1) > 1).length,
    changed: (before, after) => after > before
  },
  {
    name: 'L6 teleport prompt rescues a real unit',
    levelIndex: 5,
    prompt: '打开传送星门，把附近的人送到目标点',
    x: 3,
    y: 4,
    ability: 'teleport',
    measure: game => game.rescued,
    changed: (before, after) => after > before
  }
];

for (const scenario of scenarios) {
  const game = makeGame(scenario.levelIndex);
  const before = scenario.measure(game);
  const result = game.createAndPlace(scenario.prompt, scenario.x, scenario.y);
  assert.equal(result.success, true, `${scenario.name}: creation should place successfully`);

  const creation = game.creations.find(item => item.placed);
  assert.ok(creation, `${scenario.name}: creation should be present on the board`);
  assert.equal(creation.card.ability, scenario.ability, `${scenario.name}: prompt should compile to ${scenario.ability}`);

  const afterPlace = scenario.measure(game);
  let after = afterPlace;
  if (!scenario.changed(before, afterPlace, game) && game.gameState === 'playing') {
    game.endTurn();
    after = scenario.measure(game);
  }

  assert.ok(
    scenario.changed(before, after, game),
    `${scenario.name}: placed ${scenario.ability} should produce a real board or unit-state change`
  );
}

console.log('Creation placement reliability tests passed.');
