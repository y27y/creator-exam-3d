import assert from 'node:assert/strict';
import { AIMemorySystem } from '../public/js/aiMemory.js';

function perfectHistory() {
  const memory = new AIMemorySystem();
  memory.playerProfile.totalRescued = 12;
  memory.playerProfile.totalLost = 0;
  memory.playerProfile.totalCreations = 15;
  memory.playerProfile.empathyScore = 0.8;
  memory.levelHistory = Array.from({ length: 6 }, (_, index) => ({
    levelId: `level-${index + 1}`,
    result: 'won',
    rescued: 2,
    lost: 0,
    entropy: 1
  }));
  return memory;
}

const nightVictory = { victory: true, survivedWaves: 6, residentsProtected: 12 };

{
  const ending = perfectHistory().generateEpicEnding({
    nightWatchResult: nightVictory,
    airCombatResult: { outcome: 'victory', clearedLayers: 6 }
  });
  assert.equal(ending.legacyBranch, 'perfect');
  assert.equal(ending.finalState, 'cleansed');
  assert.equal(ending.title, '完美结局·第七日净空');
  assert.match(ending.text, /裂隙完成净化/);
}

{
  const ending = perfectHistory().generateEpicEnding({
    nightWatchResult: nightVictory,
    airCombatResult: { outcome: 'defeat', clearedLayers: 2 }
  });
  assert.equal(ending.legacyBranch, 'perfect');
  assert.equal(ending.finalState, 'rift_open');
  assert.equal(ending.title, '完美结局·无损者的坠落');
  assert.match(ending.text, /裂隙仍然开放/);
  assert.doesNotMatch(ending.text, /裂隙合上了|裂隙完成净化/);
}

{
  const memory = perfectHistory();
  memory.playerProfile.totalLost = 3;
  memory.levelHistory[0].lost = 1;
  memory.levelHistory[1].lost = 1;
  memory.levelHistory[0].result = 'lost';
  memory.levelHistory[1].result = 'lost';
  const ending = memory.generateEpicEnding({
    nightWatchResult: nightVictory,
    airCombatResult: { outcome: 'victory', clearedLayers: 6 }
  });
  assert.equal(ending.legacyBranch, 'sacrifice');
  assert.equal(ending.finalState, 'cleansed');
  assert.match(ending.title, /^牺牲结局/);
}

{
  const ending = perfectHistory().generateEpicEnding({
    nightWatchResult: { victory: false, survivedWaves: 4, residentsProtected: 7 },
    airCombatResult: { outcome: 'defeat', clearedLayers: 4 }
  });
  assert.equal(ending.finalState, 'partial_seal');
  assert.match(ending.summary, /暂时封住/);
  assert.doesNotMatch(ending.text, /裂隙合上了|裂隙完成净化/);
}

console.log('Ending outcome tests passed.');
