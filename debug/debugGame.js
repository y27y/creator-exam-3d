import { GameEngine, TERRAIN_LABELS, TERRAIN_SYMBOLS } from '../public/js/gameEngine.js';
import { cloneLevel, LEVELS, SYMBOL_TO_TILE, TILE } from '../public/js/levels.js';
import { localCompile } from '../public/js/aiClient.js';
import { RESONANCE_CODEX, executeChainReaction } from '../public/js/chainReactionCodex.js';
import { legacySystem } from '../public/js/legacySystem.js';
import { NPCManager } from '../public/js/npcManager.js';
import { RitualForge } from '../public/js/ritualForge.js';
import { CognitiveAbyss } from '../public/js/cognitiveAbyss.js';
import { VerificationCorruption } from '../public/js/verificationCorruption.js';
import { OathManager } from '../public/js/oathbinding.js';
import { RiftEchoSystem } from '../public/js/riftEchoes.js';
import { CreatorWorkshop } from '../public/js/creatorWorkshop.js';
import { EnemyIntentSystem } from '../public/js/enemyIntent.js';

class DebugGame extends GameEngine {
  constructor(options = {}) {
    super(options);
    this.npcManager = new NPCManager({ ...(this.level || { id: 'default', title: '默认关卡', map: [], units: [] }), units: this.units || [] });
    this.ritualForge = new RitualForge();
    this.cognitiveAbyss = new CognitiveAbyss();
    this.verificationCorruption = new VerificationCorruption();
    this.oathManager = new OathManager();
    this.riftEchoSystem = new RiftEchoSystem();
    this.creatorWorkshop = new CreatorWorkshop();
    this.enemyIntentSystem = new EnemyIntentSystem();
  }

  reset() {
    super.reset();
    this.npcManager = new NPCManager({ ...(this.level || { id: 'default', title: '默认关卡', map: [], units: [] }), units: this.units || [] });
    this.ritualForge = new RitualForge();
    this.cognitiveAbyss = new CognitiveAbyss();
    this.verificationCorruption = new VerificationCorruption();
    this.oathManager = new OathManager();
    this.riftEchoSystem = new RiftEchoSystem();
    this.creatorWorkshop = new CreatorWorkshop();
    this.enemyIntentSystem = new EnemyIntentSystem();
    // Add legacy NPCs from previous rescues
    if (this.legacyUnits && this.legacyUnits.length > 0) {
      for (const npc of this.legacyUnits) {
        this.npcManager.npcs.push(npc);
      }
    }
  }

  // Override rescueUnit to add NPC reactions
  rescueUnit(unit) {
    super.rescueUnit(unit);
    if (this.npcManager) {
      this.npcManager.reactToGameEvent('onRescue', { rescued: 1, unitName: unit.name });
    }
  }

  // Override winLevel to add NPC reactions
  winLevel(message) {
    if (this.gameState !== 'playing') return;
    super.winLevel(message);
    if (this.npcManager) {
      this.npcManager.reactToGameEvent('onWin', { message });
    }
  }

  // Override failLevel to add NPC reactions
  failLevel(message) {
    if (this.gameState !== 'playing') return;
    super.failLevel(message);
    if (this.npcManager) {
      this.npcManager.reactToGameEvent('onLose', { message });
    }
  }

  // Override moveCivilian to add NPC interactions
  moveCivilian(unit) {
    // Check NPC interactions
    if (!this.isGoalReached(unit) && this.npcManager) {
      const npcsHere = this.npcManager.npcs.filter(n => n.location && n.location.x === unit.x && n.location.y === unit.y);
      for (const npc of npcsHere) {
        if (npc.status !== 'met') {
          npc.status = 'met';
          this.log(`${unit.name} 遇到了 ${npc.name}...`, true);
          const buffType = npc.type === 'child' ? '希望' :
                          npc.type === 'elder' ? '智慧' :
                          npc.type === 'ghost' ? '勇气' : '祝福';
          unit.guidedTurns = Math.max(unit.guidedTurns, 1);
          if (npc.type === 'elder' || npc.type === 'divine') {
            unit.immuneChaos = Math.max(unit.immuneChaos || 0, 1);
          }
          this.log(`${npc.name} 给予 ${unit.name} ${buffType}的${npc.type === 'child' ? '鼓励' : '指引'}！`);
          this.npcManager.updateNPCMemory(npc.id, `${unit.name} 在危难中与我相遇，我给予了指引`);
        }
      }
    }

    return super.moveCivilian(unit);
  }

  // ========== CLI-specific methods ==========

  printMap() {
    console.log(`\n========== ${this.level.shortTitle} | 回合 ${this.turn}/${this.level.maxTurns} ==========`);
    console.log(`奇迹点: ${this.miraclePoints} | 造物次数: ${this.creationCharges} | 裂隙: ${this.entropy}/${this.level.entropyLimit} | 已救援: ${this.rescued}`);
    if (this.isWarLevel()) console.log(`战争值: ${this.warMeter}/${this.level.hazard?.warLimit || 9}`);
    const beast = this.units.find((u) => u.type === 'beast' && u.status === 'active');
    if (beast) console.log(`${beast.name} 怒气: ${beast.anger || 0}/${this.level.beastAngerLimit || 5}`);
    console.log('');

    const BOARD_SIZE = 7;
    const header = '    ' + Array.from({ length: BOARD_SIZE }, (_, i) => i + 1).join(' ');
    console.log(header);
    for (let y = 0; y < BOARD_SIZE; y++) {
      let row = ` ${y + 1}  `;
      for (let x = 0; x < BOARD_SIZE; x++) {
        const unit = this.unitAt(x, y);
        if (unit) {
          const symbol = unit.type === 'beast' ? 'B' : unit.type === 'tribeA' ? 'A' : unit.type === 'tribeB' ? 'a' : 'U';
          row += symbol + ' ';
        } else {
          row += TERRAIN_SYMBOLS[this.getTerrain(x, y)] || '?';
          row += ' ';
        }
      }
      console.log(row);
    }
    console.log('');

    console.log('--- 单位状态 ---');
    for (const unit of this.units) {
      let status = unit.status;
      if (unit.status === 'active') {
        if (unit.type === 'beast') status = `怒气${unit.anger || 0}`;
        else if (this.isMessenger(unit)) status = this.isGoalReached(unit) ? '已会合' : '行动中';
        else status = '行动中';
      }
      console.log(`  ${unit.name} (${unit.type}): [${unit.x + 1},${unit.y + 1}] → [${unit.goal.x + 1},${unit.goal.y + 1}] | ${status}`);
    }

    if (this.creations.some((c) => c.placed)) {
      console.log('--- 场上造物 ---');
      for (const c of this.creations.filter((c) => c.placed)) {
        console.log(`  「${c.card.name}」@[${c.x + 1},${c.y + 1}] 剩余${c.remaining}回合`);
      }
    }
    console.log('');
  }

  printLogs(limit = 20) {
    console.log('--- 最近日志 ---');
    for (const entry of this.logs.slice(0, limit)) {
      const marker = entry.important ? '✦' : ' ';
      console.log(`  [${entry.turn}] ${marker} ${entry.text}`);
    }
    console.log('');
  }
}

export { DebugGame };
