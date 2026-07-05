import { DebugGame } from './debugGame.js';

// 批量测试脚本 - 自动运行关卡并生成报告

const TEST_SCENARIOS = {
  // 第1关：测试不造任何东西能否通关
  1: [
    { name: '无造物-直接通关', actions: [] },
    { name: '造桥辅助', actions: [{ type: 'cp', text: '造一座桥', x: 4, y: 4 }] },
    { name: '吸水+桥', actions: [
      { type: 'cp', text: '造一座桥', x: 4, y: 4 },
      { type: 'cp', text: '吸水蘑菇', x: 3, y: 3 }
    ]}
  ],
  // 第2关：永夜矿井
  2: [
    { name: '无造物-直接通关', actions: [] },
    { name: '照明', actions: [{ type: 'cp', text: '发光的月亮树', x: 3, y: 3 }] },
    { name: '照明+引导', actions: [
      { type: 'cp', text: '发光的月亮树', x: 3, y: 3 },
      { type: 'cp', text: '指路风铃', x: 3, y: 4 }
    ]}
  ],
  // 第3关：巨兽困城
  3: [
    { name: '无造物-直接通关', actions: [] },
    { name: '迟缓巨兽', actions: [{ type: 'cp', text: '催眠笛', x: 3, y: 3 }] },
    { name: '屏障阻挡', actions: [{ type: 'cp', text: '石头城墙', x: 3, y: 3 }] }
  ],
  // 第4关：失语战争
  4: [
    { name: '无造物-直接通关', actions: [] },
    { name: '安抚', actions: [{ type: 'cp', text: '和平花园', x: 4, y: 3 }] },
    { name: '记忆信标', actions: [{ type: 'cp', text: '记忆碑', x: 4, y: 3 }] }
  ],
  // 第5关：记忆瘟疫
  5: [
    { name: '无造物-直接通关', actions: [] },
    { name: '记忆信标', actions: [{ type: 'cp', text: '家乡歌塔', x: 3, y: 3 }] },
    { name: '引导+照明', actions: [
      { type: 'cp', text: '指路风铃', x: 3, y: 3 },
      { type: 'cp', text: '发光灯塔', x: 3, y: 4 }
    ]}
  ],
  // 第6关：终考
  6: [
    { name: '无造物-直接通关', actions: [] },
    { name: '组合造物', actions: [
      { type: 'cp', text: '吸水蘑菇', x: 3, y: 3 },
      { type: 'cp', text: '发光月亮树', x: 3, y: 4 },
      { type: 'cp', text: '和平花园', x: 4, y: 3 }
    ]}
  ]
};

function runScenario(levelIndex, scenario) {
  const game = new DebugGame();
  game.levelIndex = levelIndex - 1;
  game.reset();

  const logs = [];
  logs.push(`\n========== 第 ${levelIndex} 关: ${game.level.shortTitle} ==========`);
  logs.push(`测试场景: ${scenario.name}`);
  logs.push(`目标: ${game.level.objective}`);
  logs.push(`初始状态: 回合 ${game.turn}/${game.level.maxTurns}, 造物次数 ${game.creationCharges}, 奇迹点 ${game.miraclePoints}`);

  // 执行造物
  for (const action of scenario.actions) {
    if (action.type === 'cp') {
      const result = game.createAndPlace(action.text, action.x - 1, action.y - 1);
      if (result.error) {
        logs.push(`  造物失败: ${result.error}`);
      } else {
        logs.push(`  造物: 「${action.text}」@(${action.x},${action.y})`);
      }
    }
  }

  // 模拟所有回合
  let turnCount = 0;
  while (game.gameState === 'playing' && turnCount < game.level.maxTurns) {
    const prevTurn = game.turn;
    game.endTurn();
    turnCount++;

    // 记录关键事件
    if (game.gameState !== 'playing') break;
  }

  // 记录结果
  logs.push(`\n结果: ${game.gameState.toUpperCase()}`);
  logs.push(`  完成回合: ${game.turn}/${game.level.maxTurns}`);
  logs.push(`  已救援: ${game.rescued}${game.level.requiredRescue ? '/' + game.level.requiredRescue : ''}`);
  logs.push(`  迷失: ${game.lost}`);
  logs.push(`  裂隙: ${game.entropy}/${game.level.entropyLimit}`);
  if (game.isWarLevel()) logs.push(`  战争值: ${game.warMeter}/${game.level.hazard?.warLimit || 9}`);
  const beast = game.units.find(u => u.type === 'beast' && u.status === 'active');
  if (beast) logs.push(`  ${beast.name}怒气: ${beast.anger || 0}/${game.level.beastAngerLimit || 5}`);

  // 记录单位状态
  logs.push('  单位状态:');
  for (const unit of game.units) {
    let status = unit.status;
    if (unit.status === 'active') {
      if (unit.type === 'beast') status = `怒气${unit.anger || 0}`;
      else if (game.isMessenger(unit)) status = unit.met ? '已会合' : '行动中';
      else status = '行动中';
    }
    logs.push(`    ${unit.name}: ${status} @(${unit.x + 1},${unit.y + 1})`);
  }

  // 记录问题
  const issues = [];
  if (scenario.name === '无造物-直接通关' && game.gameState === 'won') {
    issues.push('  ⚠️ 严重: 不造任何东西就能通关，关卡太简单');
  }
  if (scenario.name !== '无造物-直接通关' && game.gameState === 'lost') {
    issues.push('  ⚠️ 使用造物仍失败，可能太难');
  }
  if (game.lost > 0) {
    issues.push(`  ⚠️ 有 ${game.lost} 个单位迷失`);
  }
  if (game.entropy > game.level.entropyLimit * 0.7) {
    issues.push(`  ⚠️ 裂隙接近上限 (${game.entropy}/${game.level.entropyLimit})`);
  }

  if (issues.length > 0) {
    logs.push('  发现的问题:');
    logs.push(...issues);
  } else {
    logs.push('  ✅ 无明显问题');
  }

  return { logs, gameState: game.gameState, rescued: game.rescued, lost: game.lost };
}

function runAllTests() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     创世计划：造物者考核 — 自动测试报告           ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`测试时间: ${new Date().toLocaleString()}`);
  console.log('');

  const allResults = [];

  for (let level = 1; level <= 6; level++) {
    const scenarios = TEST_SCENARIOS[level];
    if (!scenarios) continue;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍 第 ${level} 关测试`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    for (const scenario of scenarios) {
      const result = runScenario(level, scenario);
      allResults.push({ level, ...result });
      console.log(result.logs.join('\n'));
    }
  }

  // 汇总报告
  console.log('\n\n╔══════════════════════════════════════════════════╗');
  console.log('║              测试汇总报告                        ║');
  console.log('╚══════════════════════════════════════════════════╝');

  let totalIssues = 0;
  for (const result of allResults) {
    const hasIssue = result.logs.some(l => l.includes('⚠️'));
    if (hasIssue) totalIssues++;
    const status = result.gameState === 'won' ? '✅ 通过' : '❌ 失败';
    console.log(`第${result.level}关 ${status} | 救援:${result.rescued} | 迷失:${result.lost} ${hasIssue ? '| ⚠️ 有问题' : ''}`);
  }

  console.log(`\n总计: ${allResults.length} 个测试场景, ${totalIssues} 个发现问题`);

  // 输出关键问题清单
  console.log('\n========== 关键问题清单 ==========');
  const criticalIssues = [];

  for (const result of allResults) {
    const issueLines = result.logs.filter(l => l.includes('⚠️'));
    for (const line of issueLines) {
      criticalIssues.push(`第${result.level}关: ${line.trim()}`);
    }
  }

  if (criticalIssues.length > 0) {
    for (const issue of criticalIssues) {
      console.log(issue);
    }
  } else {
    console.log('未发现严重问题');
  }
}

// 运行测试
runAllTests();
