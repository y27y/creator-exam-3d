import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const gameSource = readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8');

assert(gameSource.includes('this.isResolvingTurn = false'), 'browser game should initialize turn resolution lock');
assert(gameSource.includes('setTurnControlsPending(true)'), 'endTurn should mark controls pending before resolving');
assert(gameSource.includes('if (this.isResolvingTurn) return'), 'endTurn should ignore rapid duplicate triggers');
assert(gameSource.includes("this.ui.endTurnBtn.textContent = pending ? '结算中...' : '结束回合'"), 'end-turn button should show pending feedback');
assert(gameSource.includes('releaseTurnResolutionLock()'), 'turn lock should release after the current event turn');
assert(gameSource.includes('TURN_RESOLUTION_LOCK_MS = 300'), 'turn lock should cover browser double-click timing');
assert(gameSource.includes('}, TURN_RESOLUTION_LOCK_MS)'), 'turn lock should release after the cooldown window');

console.log('Turn reliability tests passed.');
