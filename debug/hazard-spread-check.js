// 灾害扩散检查脚本
// 遍历所有地图实例（内置关卡 + 模拟区域），验证灾害扩散机制是否被正确触发，
// 确保手动调整过的灾害数据不会被扩散逻辑覆盖或重置，而是作为有效源继续参与扩散计算。
// 输出检查结果，标记出任何未能正常扩散的地图或灾害节点及原因。

import { DebugGame } from './debugGame.js';
import { LEVELS, SYMBOL_TO_TILE, TILE } from '../public/js/levels.js';
import { RegionManager } from '../public/js/regionManager.js';
import { RuleValidator } from '../public/js/ruleValidator.js';

const BOARD_SIZE = 7;

// 灾害类型 -> 源地形 映射
const HAZARD_SOURCE_TERRAIN = {
  flood: TILE.WATER,
  darkness: TILE.DARK,
  fog: TILE.FOG,
  poison: TILE.POISON
};

const TERRAIN_LABEL = {
  [TILE.WATER]: '洪水',
  [TILE.DARK]: '黑暗',
  [TILE.FOG]: '迷雾',
  [TILE.POISON]: '污染'
};

// 计算地图上指定地形数量
function countTerrain(game, terrainType) {
  let count = 0;
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (game.getTerrain(x, y) === terrainType) count += 1;
    }
  }
  return count;
}

// 统计某源地形可扩散到的唯一目标格数量（与 spreadTerrain 内部逻辑对齐）
function countReachableTargets(game, sourceTerrain) {
  const seen = new Set();
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (game.getTerrain(x, y) !== sourceTerrain) continue;
      for (const nb of game.neighbors(x, y)) {
        const terrain = game.getTerrain(nb.x, nb.y);
        if (game.canHazardEnter(nb.x, nb.y, sourceTerrain, terrain)) {
          seen.add(`${nb.x},${nb.y}`);
        }
      }
    }
  }
  return seen.size;
}

// 期望扩散数：尊重 0（手动暂停），undefined/null 才回退到默认 2
function expectedSpreadAmount(hazard) {
  if (!hazard) return 0;
  if (hazard.spreadPerTurn === 0) return 0;
  const amount = hazard.spreadPerTurn ?? 2;
  return amount;
}

// 创建一个干净的 DebugGame 实例并禁用随机事件以保证确定性
function makeGame(levelIndex) {
  const game = new DebugGame();
  game.levelIndex = levelIndex;
  game.reset();
  // 禁用随机事件，避免污染扩散计数
  game.triggerRandomEvent = () => null;
  return game;
}

// 通过 loadRegion 加载自定义区域
function makeRegionGame(regionData) {
  const game = new DebugGame();
  game.loadRegion(regionData);
  game.triggerRandomEvent = () => null;
  return game;
}

// ========== 检查项 1：内置关卡灾害扩散触发验证 ==========

function checkLevelSpread(levelIndex) {
  const level = LEVELS[levelIndex];
  const game = makeGame(levelIndex);
  const hazard = game.level.hazard;
  const type = hazard?.type;
  const report = {
    map: `内置关卡 [${level.id}] ${level.shortTitle}`,
    hazardType: type || '无',
    spreadPerTurn: hazard?.spreadPerTurn,
    status: 'PASS',
    reason: '',
    details: {}
  };

  if (!type) {
    report.reason = '该关卡无灾害定义，跳过扩散检查';
    return report;
  }

  if (type === 'beast') {
    // 巨兽灾害不通过地形扩散，仅校验 hook 触发
    let hookFired = false;
    const originalHook = game.hooks.onHazardSpread;
    game.hooks.onHazardSpread = () => { hookFired = true; };
    game.spreadHazards();
    game.hooks.onHazardSpread = originalHook;
    report.details.hookFired = hookFired;
    if (!hookFired) {
      report.status = 'FAIL';
      report.reason = 'beast 灾害 onHazardSpread 钩子未触发';
    } else {
      report.reason = 'beast 灾害为非地形扩散类型，hook 正常触发';
    }
    return report;
  }

  if (type === 'war') {
    // 战争灾害：校验 warMeter 在 advanceWar 后发生变化
    const before = game.warMeter;
    game.spreadHazards();
    const after = game.warMeter;
    report.details.warMeterBefore = before;
    report.details.warMeterAfter = after;
    // 战争值应被 advanceWar 处理（可能 +1、-1、-2），只要流程执行即视为通过
    if (after === before && !game.units.some(u => game.isMessenger(u) && game.isGoalReached(u))) {
      // 没有使者会合也没有和平造物时，战争值应 +1
      report.status = 'FAIL';
      report.reason = `war 灾害 advanceWar 未生效，战争值停留于 ${after}`;
    } else {
      report.reason = `war 灾害 advanceWar 正常执行，战争值 ${before} -> ${after}`;
    }
    return report;
  }

  // 地形扩散型灾害：flood / darkness / fog / poison / mixed
  if (type === 'mixed') {
    return checkMixedSpread(game, report);
  }

  const sourceTerrain = HAZARD_SOURCE_TERRAIN[type];
  if (!sourceTerrain) {
    report.status = 'FAIL';
    report.reason = `未知的灾害类型 "${type}"，spreadHazards 未为其实现扩散分支`;
    return report;
  }

  return checkTerrainSpread(game, sourceTerrain, type, report);
}

// 地形扩散检查（单源类型）
function checkTerrainSpread(game, sourceTerrain, type, report) {
  const hazard = game.level.hazard;
  const before = countTerrain(game, sourceTerrain);
  const reachable = countReachableTargets(game, sourceTerrain);
  const expectedAmount = expectedSpreadAmount(hazard);
  const expectedSpread = Math.min(expectedAmount, reachable);

  // 记录所有源格位置，验证扩散后源格不被重置
  const sourceCellsBefore = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (game.getTerrain(x, y) === sourceTerrain) sourceCellsBefore.push({ x, y });
    }
  }

  game.spreadHazards();

  const after = countTerrain(game, sourceTerrain);
  const actualSpread = after - before;

  // 验证原有源格未被覆盖/重置
  let sourcesReset = 0;
  for (const cell of sourceCellsBefore) {
    if (game.getTerrain(cell.x, cell.y) !== sourceTerrain) sourcesReset += 1;
  }

  report.details = {
    sourceTerrain: TERRAIN_LABEL[sourceTerrain] || sourceTerrain,
    sourceCount: before,
    reachableTargets: reachable,
    expectedSpread,
    actualSpread,
    sourcesReset
  };

  if (sourcesReset > 0) {
    report.status = 'FAIL';
    report.reason = `扩散逻辑覆盖了 ${sourcesReset} 个原有灾害源格（手动/初始灾害数据被重置）`;
    return report;
  }

  if (actualSpread !== expectedSpread) {
    report.status = 'FAIL';
    if (actualSpread < expectedSpread) {
      report.reason = `扩散不足：期望 ${expectedSpread} 格，实际 ${actualSpread} 格（可扩散目标 ${reachable} 格）`;
    } else {
      report.reason = `扩散过量：期望 ${expectedSpread} 格，实际 ${actualSpread} 格`;
    }
    return report;
  }

  report.reason = `${TERRAIN_LABEL[sourceTerrain] || sourceTerrain} 扩散正常：源 ${before} 格，扩散 ${actualSpread} 格`;
  return report;
}

// mixed 类型扩散检查
function checkMixedSpread(game, report) {
  const hazard = game.level.hazard;
  const expectedAmount = expectedSpreadAmount(hazard);
  const subResults = [];
  let allPass = true;
  let reasonParts = [];

  // 先快照所有子灾型的源格数、可扩散目标与源格位置
  const snapshots = [];
  for (const [typeName, sourceTerrain] of Object.entries(HAZARD_SOURCE_TERRAIN)) {
    const before = countTerrain(game, sourceTerrain);
    const reachable = countReachableTargets(game, sourceTerrain);
    const expectedSpread = Math.min(expectedAmount, reachable);
    const sourceCellsBefore = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (game.getTerrain(x, y) === sourceTerrain) sourceCellsBefore.push({ x, y });
      }
    }
    snapshots.push({ typeName, sourceTerrain, before, reachable, expectedSpread, sourceCellsBefore });
  }

  // 仅触发一次扩散，避免多次调用污染结果
  game.spreadHazards();

  // 统一测量扩散后的结果
  for (const snap of snapshots) {
    const after = countTerrain(game, snap.sourceTerrain);
    const actualSpread = after - snap.before;
    let sourcesReset = 0;
    for (const cell of snap.sourceCellsBefore) {
      if (game.getTerrain(cell.x, cell.y) !== snap.sourceTerrain) sourcesReset += 1;
    }
    const sub = { type: snap.typeName, sourceCount: snap.before, reachable: snap.reachable, expectedSpread: snap.expectedSpread, actualSpread, sourcesReset };
    subResults.push(sub);

    if (sourcesReset > 0) {
      allPass = false;
      reasonParts.push(`${snap.typeName} 有 ${sourcesReset} 个源格被重置`);
    } else if (actualSpread !== snap.expectedSpread) {
      allPass = false;
      reasonParts.push(`${snap.typeName} 扩散异常(期望${snap.expectedSpread}/实际${actualSpread})`);
    } else {
      reasonParts.push(`${snap.typeName}+${actualSpread}`);
    }
  }

  // mixed 还应推进战争值
  report.details = { subResults, warMeter: game.warMeter };
  report.status = allPass ? 'PASS' : 'FAIL';
  report.reason = reasonParts.join('；');
  return report;
}

// ========== 检查项 2：手动调整的灾害源是否参与扩散 ==========

function checkManualSourceParticipation() {
  const reports = [];

  // 场景 A：在 flood 关卡手动添加额外水域源，验证它参与扩散
  {
    const game = makeGame(0); // 洪水村庄
    const hazard = game.level.hazard;
    const sourceTerrain = TILE.WATER;
    // 在远离初始水域的角落手动放置一个水域源
    game.setTerrain(6, 6, TILE.WATER);
    const before = countTerrain(game, sourceTerrain);
    const reachable = countReachableTargets(game, sourceTerrain);
    const expectedAmount = expectedSpreadAmount(hazard);
    const expectedSpread = Math.min(expectedAmount, reachable);

    game.spreadHazards();
    const after = countTerrain(game, sourceTerrain);
    const actualSpread = after - before;

    // 手动放置的 (6,6) 水域应保留
    const manualKept = game.getTerrain(6, 6) === TILE.WATER;
    const report = {
      map: '手动源参与检查 - 场景A：洪水关卡角落手动新增水域',
      hazardType: 'flood',
      status: 'PASS',
      reason: '',
      details: { before, reachable, expectedSpread, actualSpread, manualKept }
    };
    if (!manualKept) {
      report.status = 'FAIL';
      report.reason = '手动新增的灾害源格被扩散逻辑重置/覆盖';
    } else if (actualSpread !== expectedSpread) {
      report.status = 'FAIL';
      report.reason = `手动源未正确参与扩散：期望 ${expectedSpread}，实际 ${actualSpread}`;
    } else {
      report.reason = `手动新增水域作为有效源参与扩散，扩散 ${actualSpread} 格`;
    }
    reports.push(report);
  }

  // 场景 B：在 darkness 关卡手动添加黑暗源
  {
    const game = makeGame(1); // 永夜矿井
    const hazard = game.level.hazard;
    const sourceTerrain = TILE.DARK;
    game.setTerrain(0, 6, TILE.DARK);
    const before = countTerrain(game, sourceTerrain);
    const reachable = countReachableTargets(game, sourceTerrain);
    const expectedAmount = expectedSpreadAmount(hazard);
    const expectedSpread = Math.min(expectedAmount, reachable);

    game.spreadHazards();
    const after = countTerrain(game, sourceTerrain);
    const actualSpread = after - before;
    const manualKept = game.getTerrain(0, 6) === TILE.DARK;

    const report = {
      map: '手动源参与检查 - 场景B：永夜矿井角落手动新增黑暗',
      hazardType: 'darkness',
      status: 'PASS',
      reason: '',
      details: { before, reachable, expectedSpread, actualSpread, manualKept }
    };
    if (!manualKept) {
      report.status = 'FAIL';
      report.reason = '手动新增的黑暗源格被扩散逻辑重置/覆盖';
    } else if (actualSpread !== expectedSpread) {
      report.status = 'FAIL';
      report.reason = `手动源未正确参与扩散：期望 ${expectedSpread}，实际 ${actualSpread}`;
    } else {
      report.reason = `手动新增黑暗作为有效源参与扩散，扩散 ${actualSpread} 格`;
    }
    reports.push(report);
  }

  return reports;
}

// ========== 检查项 3：spreadPerTurn=0 手动暂停应被尊重 ==========

function checkSpreadPerTurnZero() {
  const reports = [];

  // flood 关卡手动设置 spreadPerTurn=0
  {
    const game = makeGame(0);
    game.level.hazard = { ...game.level.hazard, spreadPerTurn: 0 };
    const sourceTerrain = TILE.WATER;
    const before = countTerrain(game, sourceTerrain);

    game.spreadHazards();
    const after = countTerrain(game, sourceTerrain);
    const actualSpread = after - before;

    const report = {
      map: '手动暂停检查 - flood spreadPerTurn=0',
      hazardType: 'flood',
      spreadPerTurn: 0,
      status: 'PASS',
      reason: '',
      details: { before, after, actualSpread }
    };
    if (actualSpread !== 0) {
      report.status = 'FAIL';
      report.reason = `spreadPerTurn=0 被忽略，仍扩散了 ${actualSpread} 格（|| 运算符把 0 当成假值回退到默认值）`;
    } else {
      report.reason = 'spreadPerTurn=0 被正确尊重，灾害暂停扩散';
    }
    reports.push(report);
  }

  // darkness 关卡手动设置 spreadPerTurn=0
  {
    const game = makeGame(1);
    game.level.hazard = { ...game.level.hazard, spreadPerTurn: 0 };
    const sourceTerrain = TILE.DARK;
    const before = countTerrain(game, sourceTerrain);

    game.spreadHazards();
    const after = countTerrain(game, sourceTerrain);
    const actualSpread = after - before;

    const report = {
      map: '手动暂停检查 - darkness spreadPerTurn=0',
      hazardType: 'darkness',
      spreadPerTurn: 0,
      status: 'PASS',
      reason: '',
      details: { before, after, actualSpread }
    };
    if (actualSpread !== 0) {
      report.status = 'FAIL';
      report.reason = `spreadPerTurn=0 被忽略，仍扩散了 ${actualSpread} 格`;
    } else {
      report.reason = 'spreadPerTurn=0 被正确尊重，灾害暂停扩散';
    }
    reports.push(report);
  }

  return reports;
}

// ========== 检查项 4：mixed 类型应尊重 spreadPerTurn ==========

function checkMixedSpreadPerTurn() {
  const reports = [];

  {
    const game = makeGame(5); // 终考 mixed
    const hazard = game.level.hazard;
    const configuredAmount = hazard.spreadPerTurn ?? 2;

    const watersBefore = countTerrain(game, TILE.WATER);
    game.spreadHazards();
    const watersAfter = countTerrain(game, TILE.WATER);
    const watersReachable = countReachableTargets(game, TILE.WATER);
    const expectedWater = Math.min(configuredAmount, watersReachable);
    const actualWater = watersAfter - watersBefore;

    const report = {
      map: 'mixed spreadPerTurn 检查 - 终考',
      hazardType: 'mixed',
      spreadPerTurn: configuredAmount,
      status: 'PASS',
      reason: '',
      details: { watersBefore, watersReachable, expectedWater, actualWater }
    };
    // mixed 当前实现硬编码为 1，若配置值 != 1 则应不匹配
    if (actualWater !== expectedWater) {
      report.status = 'FAIL';
      report.reason = `mixed 类型忽略 spreadPerTurn=${configuredAmount}，水域期望扩散 ${expectedWater}，实际 ${actualWater}（实现硬编码为 1）`;
    } else {
      report.reason = `mixed 类型正确尊重 spreadPerTurn=${configuredAmount}`;
    }
    reports.push(report);
  }

  return reports;
}

// ========== 检查项 5：poison 灾害类型扩散支持 ==========

function checkPoisonSpreadSupport() {
  const reports = [];

  // 构造一个 poison 灾害的自定义区域
  const poisonRegion = {
    id: 'check-poison-region',
    title: '污染检查区域',
    map: [
      '.......',
      '..P....',
      '.......',
      '...V...',
      '.......',
      '.......',
      '......E'
    ],
    units: [
      { type: 'villager', name: '检查村民', x: 3, y: 3, goal: { x: 6, y: 6 } }
    ],
    hazard: { type: 'poison', spreadPerTurn: 2 },
    win: 'requiredRescue',
    requiredRescue: 1,
    maxTurns: 8
  };

  let game;
  try {
    game = makeRegionGame(poisonRegion);
  } catch (err) {
    reports.push({
      map: 'poison 灾害扩散支持检查',
      hazardType: 'poison',
      status: 'FAIL',
      reason: `无法加载 poison 区域：${err.message}`,
      details: {}
    });
    return reports;
  }

  const sourceTerrain = TILE.POISON;
  const before = countTerrain(game, sourceTerrain);
  const reachable = countReachableTargets(game, sourceTerrain);
  const expectedAmount = expectedSpreadAmount(game.level.hazard);
  const expectedSpread = Math.min(expectedAmount, reachable);

  game.spreadHazards();
  const after = countTerrain(game, sourceTerrain);
  const actualSpread = after - before;

  const report = {
    map: 'poison 灾害扩散支持检查',
    hazardType: 'poison',
    spreadPerTurn: 2,
    status: 'PASS',
    reason: '',
    details: { before, reachable, expectedSpread, actualSpread }
  };
  if (actualSpread !== expectedSpread) {
    report.status = 'FAIL';
    report.reason = `poison 灾害未正确扩散：期望 ${expectedSpread} 格，实际 ${actualSpread} 格（spreadHazards 缺少 poison 分支或 canHazardEnter 未放行 POISON）`;
  } else {
    report.reason = `poison 灾害正常扩散 ${actualSpread} 格`;
  }
  reports.push(report);

  return reports;
}

// ========== 检查项 6：动态生成的区域灾害扩散 ==========

async function checkGeneratedRegions() {
  const reports = [];

  const scenarios = [
    {
      name: '生成区域 - flood spreadPerTurn=1',
      region: {
        id: 'gen-flood-1',
        title: '生成洪水区',
        map: ['.......', '..W....', '..W....', '.......', '...M...', '.......', '.......'],
        units: [{ type: 'villager', name: '幸存者', x: 0, y: 0, goal: { x: 6, y: 6 } }],
        hazard: { type: 'flood', spreadPerTurn: 1 },
        win: 'requiredRescue',
        requiredRescue: 1,
        maxTurns: 8
      }
    },
    {
      name: '生成区域 - fog spreadPerTurn=2',
      region: {
        id: 'gen-fog-2',
        title: '生成迷雾区',
        map: ['.......', '..G....', '.......', '...V...', '.......', '.......', '......E'],
        units: [{ type: 'villager', name: '迷途者', x: 3, y: 3, goal: { x: 6, y: 6 } }],
        hazard: { type: 'fog', spreadPerTurn: 2 },
        win: 'requiredRescue',
        requiredRescue: 1,
        maxTurns: 8
      }
    }
  ];

  for (const scenario of scenarios) {
    const manager = new RegionManager({
      validator: new RuleValidator(),
      candidateProvider: async () => scenario.region
    });
    const region = await manager.generateNextRegion({ sourceRegionId: 'check' });
    const game = makeRegionGame(region);
    const type = game.level.hazard?.type;
    const sourceTerrain = HAZARD_SOURCE_TERRAIN[type];

    if (!sourceTerrain) {
      reports.push({
        map: scenario.name,
        hazardType: type,
        status: 'FAIL',
        reason: `动态区域灾害类型 ${type} 无源地形映射`,
        details: {}
      });
      continue;
    }

    const before = countTerrain(game, sourceTerrain);
    const reachable = countReachableTargets(game, sourceTerrain);
    const expectedAmount = expectedSpreadAmount(game.level.hazard);
    const expectedSpread = Math.min(expectedAmount, reachable);

    game.spreadHazards();
    const after = countTerrain(game, sourceTerrain);
    const actualSpread = after - before;

    const report = {
      map: scenario.name,
      hazardType: type,
      spreadPerTurn: game.level.hazard.spreadPerTurn,
      status: 'PASS',
      reason: '',
      details: { before, reachable, expectedSpread, actualSpread }
    };
    if (actualSpread !== expectedSpread) {
      report.status = 'FAIL';
      report.reason = `动态区域扩散异常：期望 ${expectedSpread}，实际 ${actualSpread}`;
    } else {
      report.reason = `动态区域扩散正常，扩散 ${actualSpread} 格`;
    }
    reports.push(report);
  }

  return reports;
}

// ========== 检查项 7：endTurn 集成触发验证 ==========

function checkEndTurnIntegration() {
  const reports = [];

  for (let i = 0; i < LEVELS.length; i++) {
    const level = LEVELS[i];
    const type = level.hazard?.type;
    if (!type || type === 'beast') continue; // 跳过无灾害与巨兽关卡

    const game = makeGame(i);
    let hookFired = false;
    game.hooks.onHazardSpread = () => { hookFired = true; };

    const sourceTerrain = HAZARD_SOURCE_TERRAIN[type] || (type === 'mixed' ? TILE.WATER : null);
    if (!sourceTerrain && type !== 'war' && type !== 'mixed') continue;

    const terrainTypes = type === 'mixed'
      ? [TILE.WATER, TILE.DARK, TILE.FOG]
      : [sourceTerrain];

    const beforeCounts = terrainTypes.map(t => countTerrain(game, t));
    const warBefore = game.warMeter;

    game.endTurn();

    const afterCounts = terrainTypes.map(t => countTerrain(game, t));
    const warAfter = game.warMeter;
    const terrainChanged = beforeCounts.some((b, idx) => afterCounts[idx] !== b);
    const warChanged = (type === 'war' || type === 'mixed') && warAfter !== warBefore;

    const report = {
      map: `endTurn 集成触发 - [${level.id}]`,
      hazardType: type,
      status: 'PASS',
      reason: '',
      details: { hookFired, terrainChanged, warChanged, beforeCounts, afterCounts }
    };

    const triggered = hookFired && (terrainChanged || warChanged || (type === 'mixed'));
    if (!triggered) {
      report.status = 'FAIL';
      report.reason = `endTurn 未正确触发灾害扩散（hook=${hookFired}, 地形变化=${terrainChanged}, 战争变化=${warChanged}）`;
    } else {
      report.reason = `endTurn 正确触发灾害扩散机制`;
    }
    reports.push(report);
  }

  return reports;
}

// ========== 报告输出 ==========

function printSection(title) {
  console.log('');
  console.log('━'.repeat(60));
  console.log(`▌ ${title}`);
  console.log('━'.repeat(60));
}

function printReport(report) {
  const mark = report.status === 'PASS' ? '✅' : '❌';
  console.log(`${mark} [${report.hazardType || '-'}] ${report.map}`);
  if (report.spreadPerTurn !== undefined) {
    console.log(`   spreadPerTurn = ${report.spreadPerTurn}`);
  }
  console.log(`   ${report.reason}`);
  if (report.details && Object.keys(report.details).length) {
    const d = report.details;
    if (d.sourceCount !== undefined) {
      console.log(`   源格=${d.sourceCount} 可扩散目标=${d.reachableTargets} 期望扩散=${d.expectedSpread} 实际扩散=${d.actualSpread} 源被重置=${d.sourcesReset}`);
    } else if (d.before !== undefined && d.actualSpread !== undefined) {
      console.log(`   ${JSON.stringify(d)}`);
    } else if (d.subResults) {
      for (const s of d.subResults) {
        console.log(`   - ${s.type}: 源${s.sourceCount} 期望${s.expectedSpread} 实际${s.actualSpread} 重置${s.sourcesReset}`);
      }
    }
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        灾害扩散逻辑检查报告                                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`检查时间: ${new Date().toLocaleString()}`);

  const allReports = [];

  // 检查项 1：内置关卡
  printSection('检查项 1：内置关卡灾害扩散触发验证');
  for (let i = 0; i < LEVELS.length; i++) {
    const r = checkLevelSpread(i);
    allReports.push(r);
    printReport(r);
  }

  // 检查项 2：手动源参与
  printSection('检查项 2：手动调整的灾害源是否参与扩散');
  const manualReports = checkManualSourceParticipation();
  for (const r of manualReports) { allReports.push(r); printReport(r); }

  // 检查项 3：spreadPerTurn=0
  printSection('检查项 3：spreadPerTurn=0 手动暂停应被尊重');
  const zeroReports = checkSpreadPerTurnZero();
  for (const r of zeroReports) { allReports.push(r); printReport(r); }

  // 检查项 4：mixed spreadPerTurn
  printSection('检查项 4：mixed 类型应尊重 spreadPerTurn');
  const mixedReports = checkMixedSpreadPerTurn();
  for (const r of mixedReports) { allReports.push(r); printReport(r); }

  // 检查项 5：poison 支持
  printSection('检查项 5：poison 灾害类型扩散支持');
  const poisonReports = checkPoisonSpreadSupport();
  for (const r of poisonReports) { allReports.push(r); printReport(r); }

  // 检查项 6：动态区域
  printSection('检查项 6：动态生成区域灾害扩散');
  const genReports = await checkGeneratedRegions();
  for (const r of genReports) { allReports.push(r); printReport(r); }

  // 检查项 7：endTurn 集成
  printSection('检查项 7：endTurn 集成触发验证');
  const integrationReports = checkEndTurnIntegration();
  for (const r of integrationReports) { allReports.push(r); printReport(r); }

  // 汇总
  printSection('汇总');
  const passed = allReports.filter(r => r.status === 'PASS').length;
  const failed = allReports.filter(r => r.status === 'FAIL').length;
  console.log(`总计检查 ${allReports.length} 项：✅ 通过 ${passed}，❌ 失败 ${failed}`);

  if (failed > 0) {
    console.log('');
    console.log('未能正常扩散的地图/节点及原因：');
    for (const r of allReports.filter(r => r.status === 'FAIL')) {
      console.log(`  ❌ [${r.hazardType}] ${r.map}`);
      console.log(`     原因：${r.reason}`);
    }
  }

  // 以非零退出码标记存在失败，便于自动化
  if (failed > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error('检查脚本执行出错:', err);
  process.exitCode = 1;
});
