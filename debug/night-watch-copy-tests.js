import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildNightWatchTowerFallback, sanitizeNightWatchTowerPlan } from '../server/nightWatchTowers.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const context = {
  recentCreations: [
    { name: '停战路标', ability: 'reveal_path' },
    { name: '净雾灯', ability: 'cleanse' }
  ],
  rescuedResidents: ['矿工甲', '矿工乙'],
  entropy: 6
};
const forbidden = ['reveal_path', 'cleanse', 'tower_damage', 'starting_money', 'missileSilo'];

function playerFacingText(plan) {
  return JSON.stringify({
    themeTitle: plan.themeTitle,
    briefing: plan.briefing,
    towers: Object.values(plan.towers || {}).map(tower => ({
      sourceCreation: tower.sourceCreation,
      name: tower.name,
      description: tower.description,
      exDescription: tower.exDescription
    })),
    causes: plan.causes,
    buffChoices: (plan.buffChoices || []).map(choice => ({
      name: choice.name,
      description: choice.description,
      reason: choice.reason
    }))
  });
}

function assertNoInternalTerms(plan, label) {
  const text = playerFacingText(plan);
  for (const term of forbidden) {
    assert(!text.includes(term), `${label} must not expose ${term}`);
  }
}

const fallback = buildNightWatchTowerFallback({ context });
assertNoInternalTerms(fallback, 'fallback plan');
assert(playerFacingText(fallback).includes('显路'), 'fallback copy should translate reveal_path into natural Chinese');

const sanitized = sanitizeNightWatchTowerPlan({
  themeTitle: 'cleanse watch',
  briefing: 'reveal_path will improve tower_damage',
  mapId: 'MAP4',
  towerPool: ['pursuit', 'sun'],
  towers: {
    pursuit: {
      sourceCreation: 'reveal_path',
      name: 'reveal_path well',
      description: 'keep reveal_path and missileSilo',
      exDescription: 'tower_damage with cleanse'
    },
    sun: { description: 'cleanse the fog' }
  },
  causes: [{ source: 'because reveal_path', result: 'tower_damage increased', towerType: 'pursuit' }],
  buffChoices: [{
    id: 'raw-copy',
    name: 'tower_damage',
    description: 'starting_money',
    reason: 'cleanse',
    effect: { type: 'tower_damage', value: 1.1, towerTypes: ['pursuit'] }
  }]
}, { context });
assertNoInternalTerms(sanitized, 'sanitized plan');

const frontend = readFileSync(resolve(root, 'public/modes/tower-defense/nightWatchTowers.js'), 'utf8');
assert(frontend.includes('function replaceInternalTerms'), 'frontend should keep a defensive copy sanitizer');
assert(frontend.includes('data.description = playerText'), 'tower descriptions should be sanitized before rendering');

const bridge = readFileSync(resolve(root, 'public/modes/tower-defense/towerBridge.js'), 'utf8');
assert(bridge.includes('body:not(.in-battle)'), 'selection pages should scroll outside battle');
assert(bridge.includes('html { overflow-y: auto; }'), 'the document must allow selection-page scrolling');
assert(bridge.includes('position: sticky'), 'selection actions should remain reachable');

console.log('night-watch copy and selection layout regression tests passed');
