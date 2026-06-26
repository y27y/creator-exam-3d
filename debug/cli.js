import { DebugGame } from './debugGame.js';
import readline from 'readline';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAVE_DIR = path.join(__dirname, 'saves');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

const game = new DebugGame();
let watchMode = false;
let snapshots = []; // 用于undo

function printHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           创世计划：造物者考核 — 调试控制台                ║
║           无需浏览器，纯命令行运行游戏                      ║
╚════════════════════════════════════════════════════════════╝

【观察命令】
  map, m              - 显示当前地图、单位、造物状态
  info, i             - 显示当前关卡详细信息（目标、灾害、胜利条件）
  path <单位名>        - 显示该单位当前的寻路路径
  units, u            - 显示所有单位详情（JSON格式）
  creations, c        - 显示所有造物详情
  logs [n]            - 显示最近 n 条日志（默认20）
  state, s            - 显示游戏状态（JSON格式）
  data                - 输出完整 JSON 数据

【造物命令】
  create <text>       - 编译造物（不放置，先消耗次数）
  place <id> <x> <y>  - 放置造物到坐标
  cp <text> <x> <y>   - 创建并放置（快捷命令）

【回合命令】
  end, e              - 结束当前回合（watch模式会自动显示变化）
  sim <n>             - 模拟 n 个回合
  watch, w            - 切换 watch 模式（每回合自动显示完整状态）

【存档命令】
  save <name>         - 保存当前状态到存档文件
  load <name>         - 从存档文件读取状态
  undo                - 回退到上一回合开始时的状态

【叙事命令】
  talk, t             - 与当前位置的NPC对话
  talk <npcId>        - 与指定NPC对话
  explore, ex         - 探索当前环境
  remember, mem       - 查看已发现的故事片段
  world, wstate       - 查看世界状态与叙事记忆

【其他命令】
  reset, r            - 重置当前关卡
  level <n>           - 切换到第 n 关（1-6）
  help, h             - 显示此帮助
  quit, q             - 退出

【提示】
  - 使用 watch 模式可以方便地观察每回合变化
  - 使用 undo 可以回退误操作
  - 坐标从1开始，格式: cp 造一座桥 4 4
  - 使用叙事命令体验AI生成的涌现式故事
`);
}

function saveSnapshot() {
  // 保存当前状态用于undo
  const data = game.getAllData();
  snapshots.push(JSON.stringify(data));
  if (snapshots.length > 10) snapshots.shift(); // 最多保留10个
}

function loadSnapshot(index) {
  if (index < 0 || index >= snapshots.length) return false;
  const data = JSON.parse(snapshots[index]);
  // 恢复状态
  game.terrain = data.terrain.map(row => row.map(t => t.type));
  game.units = data.units.map(u => ({ ...u }));
  game.creations = data.creations.map(c => ({
    ...c,
    card: { ...c.card }
  }));
  game.turn = data.state.turn;
  game.rescued = data.state.rescued;
  game.lost = data.state.lost;
  game.entropy = data.state.entropy;
  game.creationCharges = data.state.creationCharges;
  game.miraclePoints = data.state.miraclePoints;
  game.warMeter = data.state.warMeter;
  game.peaceTalks = data.state.peaceTalks || 0;
  game.gameState = data.state.gameState;
  game.logs = data.logs.map(l => ({ ...l }));
  return true;
}

function printInfo() {
  const l = game.level;
  console.log(`\n========== 关卡信息 ==========`);
  console.log(`标题: ${l.title}`);
  console.log(`简称: ${l.shortTitle}`);
  console.log(`目标: ${l.objective}`);
  console.log(`胜利条件: ${l.win}`);
  if (l.requiredRescue) console.log(`需要救援: ${l.requiredRescue} 人`);
  console.log(`最大回合: ${l.maxTurns}`);
  console.log(`造物次数: ${l.creationCharges}`);
  console.log(`奇迹点: ${l.miraclePoints}`);
  console.log(`裂隙上限: ${l.entropyLimit}`);
  if (l.hazard) {
    console.log(`灾害类型: ${l.hazard.type}`);
    if (l.hazard.spreadPerTurn) console.log(`每回合扩散: ${l.hazard.spreadPerTurn} 格`);
    if (l.hazard.warLimit) console.log(`战争上限: ${l.hazard.warLimit}`);
  }
  if (l.memoryChaos) console.log(`⚠️ 记忆瘟疫：村民有45%概率随机移动`);
  if (l.beastAngerLimit) console.log(`巨兽怒气上限: ${l.beastAngerLimit}`);
  console.log(`\n--- 单位初始位置 ---`);
  for (const u of l.units) {
    console.log(`  ${u.name} (${u.type}): [${u.x + 1},${u.y + 1}] → 目标 [${u.goal.x + 1},${u.goal.y + 1}]`);
  }
  console.log('');
}

function printPath(unitName) {
  const unit = game.units.find(u => u.name === unitName && u.status === 'active');
  if (!unit) {
    console.log(`找不到活跃单位: ${unitName}`);
    console.log(`可用单位: ${game.units.filter(u => u.status === 'active').map(u => u.name).join(', ')}`);
    return;
  }

  // 模拟寻路
  const path = [];
  let current = { x: unit.x, y: unit.y };
  path.push({ ...current });

  // 使用BFS预计算路径
  const startKey = `${unit.x},${unit.y}`;
  const goalKey = `${unit.goal.x},${unit.goal.y}`;
  const queue = [{ x: unit.x, y: unit.y }];
  const cameFrom = new Map([[startKey, null]]);

  while (queue.length) {
    const cur = queue.shift();
    const curKey = `${cur.x},${cur.y}`;
    if (curKey === goalKey) break;
    const nbs = game.neighbors(cur.x, cur.y).sort((a, b) =>
      game.distance(a.x, a.y, unit.goal.x, unit.goal.y) - game.distance(b.x, b.y, unit.goal.x, unit.goal.y)
    );
    for (const nb of nbs) {
      const key = `${nb.x},${nb.y}`;
      if (cameFrom.has(key)) continue;
      if (!game.isPassable(nb.x, nb.y, unit)) continue;
      cameFrom.set(key, cur);
      queue.push(nb);
    }
  }

  if (!cameFrom.has(goalKey)) {
    console.log(`${unit.name} 无法找到通往目标的路径！`);
    console.log(`当前位置: [${unit.x + 1},${unit.y + 1}], 目标: [${unit.goal.x + 1},${unit.goal.y + 1}]`);
    // 检查周围可通行格子
    const passable = game.neighbors(unit.x, unit.y).filter(n => game.isPassable(n.x, n.y, unit));
    console.log(`周围可通行: ${passable.map(n => `[${n.x + 1},${n.y + 1}]`).join(', ') || '无'}`);
    return;
  }

  // 重建路径
  const fullPath = [];
  let step = { x: unit.goal.x, y: unit.goal.y };
  while (step) {
    fullPath.unshift(step);
    const prev = cameFrom.get(`${step.x},${step.y}`);
    step = prev;
  }

  const TERRAIN_SYMBOLS = {
    0: '.', 1: '~', 2: 'H', 3: 'V', 4: 'E', 5: 'C',
    6: 'B', 7: 'F', 8: 'M', 9: 'D', 10: 'G', 11: 'S',
    12: 'W', 13: '=', 14: '#', 15: '*', 16: 'P'
  };

  console.log(`\n${unit.name} 的寻路路径 (${fullPath.length - 1} 步):`);
  for (let i = 0; i < fullPath.length; i++) {
    const p = fullPath[i];
    const terrain = game.getTerrain(p.x, p.y);
    const label = {
      '.': '平地', '~': '水域', 'H': '高地', 'V': '村庄', 'E': '出口', 'C': '城市',
      'B': '边境', 'F': '森林', 'M': '山体', 'D': '黑暗', 'G': '迷雾', 'S': '圣树',
      'W': '沼泽', '=': '桥梁', '#': '屏障', '*': '结界', 'P': '污染'
    }[TERRAIN_SYMBOLS[terrain] || '?'] || '未知';
    const marker = i === 0 ? '起点' : i === fullPath.length - 1 ? '目标' : '';
    console.log(`  ${i + 1}. [${p.x + 1},${p.y + 1}] ${label} ${marker}`);
  }
  console.log('');
}

function doSave(name) {
  if (!existsSync(SAVE_DIR)) {
    mkdirSync(SAVE_DIR, { recursive: true });
  }
  const filePath = path.join(SAVE_DIR, `${name}.json`);
  writeFileSync(filePath, JSON.stringify(game.getAllData(), null, 2));
  console.log(`存档已保存: ${filePath}`);
}

function doLoad(name) {
  const filePath = path.join(SAVE_DIR, `${name}.json`);
  if (!existsSync(filePath)) {
    console.log(`存档不存在: ${filePath}`);
    return;
  }
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  // 恢复状态（与loadSnapshot相同逻辑）
  game.terrain = data.terrain.map(row => row.map(t => t.type));
  game.units = data.units.map(u => ({ ...u }));
  game.creations = data.creations.map(c => ({
    ...c,
    card: { ...c.card }
  }));
  game.turn = data.state.turn;
  game.rescued = data.state.rescued;
  game.lost = data.state.lost;
  game.entropy = data.state.entropy;
  game.creationCharges = data.state.creationCharges;
  game.miraclePoints = data.state.miraclePoints;
  game.warMeter = data.state.warMeter;
  game.peaceTalks = data.state.peaceTalks || 0;
  game.gameState = data.state.gameState;
  game.logs = data.logs.map(l => ({ ...l }));
  console.log(`存档已加载: ${name}`);
  game.printMap();
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     创世计划：造物者考核 — 调试控制台                        ║');
  console.log('║     无需浏览器，纯命令行运行游戏                             ║');
  console.log('║     输入 help 查看所有命令                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  printInfo();
  game.printMap();

  while (true) {
    const prompt = game.gameState !== 'playing'
      ? `\n[${game.gameState.toUpperCase()}] > `
      : `\n[回合${game.turn}] > `;
    const input = await question(prompt);
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();

    try {
      switch (cmd) {
        case '':
        case 'map':
        case 'm':
          game.printMap();
          break;

        case 'info':
        case 'i':
          printInfo();
          break;

        case 'path': {
          const name = input.slice(cmd.length).trim();
          if (!name) { console.log('用法: path <单位名>  例如: path 阿粟'); break; }
          printPath(name);
          break;
        }

        case 'state':
        case 's':
          console.log(JSON.stringify(game.getGameState(), null, 2));
          break;

        case 'units':
        case 'u':
          console.log(JSON.stringify(game.getUnits(), null, 2));
          break;

        case 'creations':
        case 'c':
          console.log(JSON.stringify(game.getCreations(), null, 2));
          break;

        case 'create': {
          const text = input.slice(cmd.length).trim();
          if (!text) { console.log('用法: create <造物描述>'); break; }
          const result = game.create(text);
          console.log(result.error ? `错误: ${result.error}` : `成功! 造物ID: ${result.creationId}`);
          console.log(JSON.stringify(result.card, null, 2));
          break;
        }

        case 'place': {
          if (parts.length < 4) { console.log('用法: place <creationId> <x> <y>'); break; }
          const result = game.place(parts[1], parseInt(parts[2]) - 1, parseInt(parts[3]) - 1);
          console.log(result.error ? `错误: ${result.error}` : '放置成功!');
          game.printMap();
          break;
        }

        case 'cp': {
          const match = input.match(/^cp\s+(.+?)\s+(\d+)\s+(\d+)$/);
          if (!match) { console.log('用法: cp <造物描述> <x> <y>  例如: cp 造一座桥 4 4'); break; }
          const text = match[1];
          const x = parseInt(match[2]) - 1;
          const y = parseInt(match[3]) - 1;
          const result = game.createAndPlace(text, x, y);
          console.log(result.error ? `错误: ${result.error}` : '创建并放置成功!');
          game.printMap();
          break;
        }

        case 'end':
        case 'e': {
          if (game.gameState !== 'playing') {
            console.log('本关已结束，使用 reset 重置或 level 切换关卡');
            break;
          }
          saveSnapshot(); // 保存当前状态用于undo
          const prevState = { ...game.getGameState() };
          const result = game.endTurn();
          console.log(`回合结束。状态: ${game.gameState}`);

          // 显示关键变化
          const currState = game.getGameState();
          const changes = [];
          if (currState.rescued > prevState.rescued) changes.push(`✦ 救援了 ${currState.rescued - prevState.rescued} 人`);
          if (currState.lost > prevState.lost) changes.push(`⚠️ 迷失了 ${currState.lost - prevState.lost} 人`);
          if (currState.entropy > prevState.entropy) changes.push(`裂隙 +${currState.entropy - prevState.entropy}`);
          if (currState.warMeter !== prevState.warMeter) changes.push(`战争值 ${prevState.warMeter} → ${currState.warMeter}`);
          if (changes.length) console.log('变化: ' + changes.join(' | '));

          if (watchMode || game.gameState !== 'playing') game.printMap();
          break;
        }

        case 'sim': {
          const n = parseInt(parts[1]) || 1;
          console.log(`模拟 ${n} 个回合...`);
          game.simulate(n);
          console.log(`状态: ${game.gameState}`);
          game.printMap();
          break;
        }

        case 'watch':
        case 'w': {
          watchMode = !watchMode;
          console.log(`Watch模式: ${watchMode ? '开启' : '关闭'}`);
          break;
        }

        case 'logs': {
          const limit = parseInt(parts[1]) || 20;
          game.printLogs(limit);
          break;
        }

        case 'data':
          console.log(JSON.stringify(game.getAllData(), null, 2));
          break;

        case 'save': {
          const name = parts[1] || `save_${Date.now()}`;
          await doSave(name);
          break;
        }

        case 'load': {
          const name = parts[1];
          if (!name) { console.log('用法: load <存档名>'); break; }
          await doLoad(name);
          break;
        }

        case 'undo': {
          if (snapshots.length === 0) {
            console.log('没有可回退的状态');
            break;
          }
          if (loadSnapshot(snapshots.length - 1)) {
            snapshots.pop();
            console.log('已回退到上一状态');
            game.printMap();
          }
          break;
        }

        case 'reset':
        case 'r': {
          snapshots = []; // 清除快照
          game.reset();
          console.log('关卡已重置');
          game.printMap();
          break;
        }

        case 'level': {
          const idx = parseInt(parts[1]) - 1;
          if (idx < 0 || idx > 5) { console.log('关卡编号 1-6'); break; }
          snapshots = [];
          game.levelIndex = idx;
          game.reset();
          console.log(`切换到: ${game.level.title}`);
          printInfo();
          game.printMap();
          break;
        }

        case 'help':
        case 'h':
          printHelp();
          break;

        case 'talk':
        case 't': {
          const npcId = parts[1];
          await handleTalk(npcId);
          break;
        }

        case 'explore':
        case 'ex': {
          await handleExplore();
          break;
        }

        case 'remember':
        case 'mem': {
          handleRemember();
          break;
        }

        case 'world':
        case 'wstate': {
          handleWorldState();
          break;
        }

        case 'quit':
        case 'q':
        case 'exit':
          console.log('再见!');
          rl.close();
          return;

        default:
          console.log('未知命令，输入 help 查看帮助');
      }
    } catch (err) {
      console.log(`错误: ${err.message}`);
      console.log(err.stack);
    }
  }
}

main().catch(console.error);

// ========== 叙事命令处理 ==========

async function handleTalk(npcId) {
  const npcManager = game.npcManager;
  let npc;

  if (npcId) {
    npc = npcManager.getNPC(npcId);
    if (!npc) {
      console.log(`找不到NPC: ${npcId}`);
      console.log(`可用NPC: ${npcManager.getNPCSummary().map(n => `${n.name}(${n.id})`).join(', ')}`);
      return;
    }
  } else {
    // 如果没有指定NPC，显示当前位置的NPC
    const npcs = npcManager.getNPCSummary();
    if (npcs.length === 0) {
      console.log('当前关卡没有可对话的NPC');
      return;
    }
    console.log('\n=== 可对话的角色 ===');
    for (const n of npcs) {
      console.log(`  ${n.name} [${n.location}] | ${n.attitude} | ${n.mood}`);
    }
    const choice = await question('\n选择角色 (输入名称或ID): ');
    npc = npcManager.getNPC(choice) || npcManager.npcs.find(n => n.name === choice);
    if (!npc) {
      console.log('无效选择');
      return;
    }
  }

  console.log(`\n=== 与 ${npc.name} 对话 ===`);
  console.log(`类型: ${npc.type} | 态度: ${npc.attitude} | 情绪: ${npc.mood}`);
  if (npc.lore) console.log(`背景: ${npc.lore}`);

  // 对话循环
  while (true) {
    const playerInput = await question(`\n你: `);
    if (!playerInput.trim() || playerInput.toLowerCase() === 'exit' || playerInput.toLowerCase() === 'q') {
      console.log(`\n${npc.name} 目送你离开...`);
      break;
    }

    // 更新NPC记忆
    npcManager.updateNPCMemory(npc.id, `玩家说: ${playerInput}`);

    // 调用AI叙事引擎
    try {
      const context = npcManager.buildDialogueContext(npc.id, playerInput);
      const narrative = await callNarrativeAPI(context);

      if (narrative) {
        console.log(`\n${npc.name}: ${narrative}`);
        npcManager.updateNPCMemory(npc.id, `我回应: ${narrative}`);

        // 记录到世界状态
        game.addNarrativeMemory('dialogue', {
          npc: npc.name,
          playerInput,
          response: narrative
        }, [npc.id]);
      } else {
        // 本地回退：基于NPC人格生成简单回应
        const fallbackResponse = generateFallbackDialogue(npc, playerInput);
        console.log(`\n${npc.name}: ${fallbackResponse}`);
      }
    } catch (err) {
      console.log(`\n[叙事引擎暂时不可用]`);
      const fallbackResponse = generateFallbackDialogue(npc, playerInput);
      console.log(`\n${npc.name}: ${fallbackResponse}`);
    }
  }
}

async function handleExplore() {
  const npcManager = game.npcManager;
  const location = { x: 0, y: 0 }; // 可以从玩家输入获取具体坐标

  console.log('\n=== 探索环境 ===');

  // 显示当前环境信息
  const terrain = game.getTerrain(location.x, location.y);
  console.log(`当前位置: [${location.x + 1}, ${location.y + 1}]`);
  console.log(`地形: ${terrain}`);
  console.log(`氛围: ${npcManager.getAtmosphere()}`);

  // 检查是否有NPC
  const nearbyNPCs = npcManager.getNPCSummary();
  if (nearbyNPCs.length > 0) {
    console.log('\n附近角色:');
    for (const npc of nearbyNPCs) {
      console.log(`  ${npc.name} [${npc.location}] - ${npc.mood}`);
    }
  }

  // 调用AI生成环境描述
  try {
    const context = npcManager.buildEnvironmentContext(location);
    const narrative = await callNarrativeAPI(context);

    if (narrative) {
      console.log(`\n${narrative}`);
      game.addNarrativeMemory('environment', {
        location: `${location.x + 1},${location.y + 1}`,
        description: narrative
      });
    } else {
      console.log('\n[环境描述生成失败]');
    }
  } catch (err) {
    console.log('\n[叙事引擎暂时不可用]');
  }
}

function handleRemember() {
  console.log('\n=== 已发现的故事片段 ===');
  const lore = game.worldState.discoveredLore;
  if (lore.length === 0) {
    console.log('还没有发现任何故事片段...');
    console.log('提示: 与NPC对话、探索环境或创造独特的造物来发现故事');
    return;
  }

  for (const loreId of lore) {
    const memory = game.worldState.narrativeMemory.find(m => m.type === 'lore' && m.id === loreId);
    if (memory) {
      console.log(`\n[${memory.level || '未知'}] ${loreId}`);
      console.log(`  ${memory.text}`);
    }
  }
}

function handleWorldState() {
  console.log('\n=== 世界状态 ===');
  const ws = game.worldState;
  console.log(`当前关卡: ${ws.currentLevel}`);
  console.log(`已拯救: ${ws.rescued} | 已失去: ${ws.lost}`);
  console.log(`世界裂隙: ${game.entropy}/${ws.entropyLimit}`);
  console.log(`玩家风格: ${ws.playStyle}`);
  console.log(`已创造造物: ${ws.creations.join(', ') || '无'}`);
  console.log(`已发现故事: ${ws.discoveredLore.length} 个`);

  console.log('\n=== 叙事记忆 ===');
  const memories = ws.narrativeMemory.slice(-10);
  if (memories.length === 0) {
    console.log('暂无叙事记忆');
  } else {
    for (const mem of memories) {
      console.log(`\n[${mem.type}] 回合${mem.turn} ${mem.level || ''}`);
      if (typeof mem.content === 'string') {
        console.log(`  ${mem.content}`);
      } else {
        console.log(`  ${JSON.stringify(mem.content)}`);
      }
    }
  }

  console.log('\n=== 角色关系 ===');
  const relationships = Object.entries(ws.characterRelationships);
  if (relationships.length === 0) {
    console.log('暂无角色关系记录');
  } else {
    for (const [npcId, rel] of relationships) {
      const npc = game.npcManager.getNPC(npcId);
      console.log(`  ${npc?.name || npcId}: ${rel.attitude} (${rel.mood})`);
    }
  }
}

// ========== AI叙事API调用 ==========

async function callNarrativeAPI(context) {
  try {
    const response = await fetch('http://localhost:3000/api/narrative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context)
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.text;
  } catch (err) {
    return null;
  }
}

// ========== 本地回退叙事生成 ==========

function generateFallbackDialogue(npc, playerInput) {
  const responses = {
    '老渔夫': [
      '水涨了，鱼都往上游去了...你也该走了。',
      '我年轻时见过更大的洪水，但没见过像你这样的人。',
      '水里有声音，你听到了吗？'
    ],
    '小烛': [
      '你看！你的造物在发光呢！',
      '为什么天空会裂开呀？',
      '我想看看水母，可以吗？'
    ],
    '矿灯幽灵': [
      '...灯...还亮着...吗？',
      '我...等了很久...',
      '黑暗...不可怕...孤独...才可怕...'
    ],
    '驯兽人': [
      '巨兽并非敌人，只是迷失了方向。',
      '自然有它自己的节奏，不要强行改变。',
      '你的造物...很有力量，但力量需要智慧引导。'
    ],
    '边境诗人': [
      '诗写完了，但战争还没有结束。',
      '语言曾是桥梁，现在成了深渊。',
      '也许你的造物能成为新的诗篇...'
    ],
    '守忆人': [
      '我记得...很多人的名字...但...',
      '记忆像沙子，抓得越紧，流得越快。',
      '你...是谁？对不起，我忘了...'
    ],
    '世界之灵': [
      '你每一次创造，都在改变我。',
      '裂隙在扩大，但希望也在生长。',
      '我见过无数造物者，你是最特别的一个。'
    ]
  };

  const npcResponses = responses[npc.name] || ['...', '嗯？', '我不明白你的意思。'];
  return npcResponses[Math.floor(Math.random() * npcResponses.length)];
}
