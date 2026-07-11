import assert from 'node:assert/strict';
import { buildTimelineArchive } from '../public/js/timelineArchive.js';
import { EndingDirector } from '../public/js/endingDirector.js';
import { TIMELINE_ENDING_ASSETS } from '../public/js/timelineEndingManifest.js';

function snapshot(overrides = {}) {
  return {
    legacyBranch: 'perfect',
    finalState: 'cleansed',
    levels: [
      { levelId: 'flood-village', result: 'won', rescued: 3, lost: 0, turns: 6 },
      { levelId: 'night-mine', result: 'won', rescued: 2, lost: 0, turns: 5 },
      { levelId: 'giant-city', result: 'won', rescued: 2, lost: 0, turns: 7 },
      { levelId: 'wordless-war', result: 'won', rescued: 2, lost: 0, turns: 6 },
      { levelId: 'memory-plague', result: 'won', rescued: 2, lost: 0, turns: 6 },
      { levelId: 'final-exam', result: 'won', rescued: 3, lost: 0, turns: 8 }
    ],
    creations: [{ id: 'c1', name: '透明鲸鱼' }],
    rescuedResidents: [{ id: 'star-sand', name: '星砂' }],
    lostResidents: [],
    nightWatchResult: { victory: true, survivedWaves: 6, residentsProtected: 12, selectedBuff: { name: '余烬誓约' } },
    airCombatResult: { outcome: 'victory', clearedLayers: 6 },
    ...overrides
  };
}

assert.equal(TIMELINE_ENDING_ASSETS.length, 30, 'timeline ending should own exactly 30 CG slots');
assert.equal(new Set(TIMELINE_ENDING_ASSETS).size, 30, 'timeline ending CG paths should be unique');

const first = buildTimelineArchive(snapshot());
const repeated = buildTimelineArchive(snapshot());
assert.equal(first.timelineId, repeated.timelineId, 'same history should produce a stable timeline id');
assert.equal(first.timelineClass, 'first_stable');
assert.equal(first.echoes.length, 6, 'one grounded echo should be selected for each campaign level');
assert.ok(first.echoes.every(echo => echo.art && echo.text), 'every echo should have art and grounded copy');
assert.deepEqual(first.anchors.map(anchor => anchor.kind), ['resident', 'creation', 'oath'], 'real history should supply resident, creation, and oath anchors');

const failed = buildTimelineArchive(snapshot({
  finalState: 'rift_open',
  airCombatResult: { outcome: 'defeat', clearedLayers: 2 },
  rescuedResidents: [],
  creations: [],
  nightWatchResult: { victory: false, survivedWaves: 3, residentsProtected: 4 }
}));
assert.equal(failed.timelineClass, 'observer_legacy');
assert.ok(failed.anchors.some(anchor => anchor.kind === 'memory'), 'sparse histories should retain a safe memory anchor');

const values = new Map();
const storage = {
  getItem: key => values.get(key) || null,
  setItem: (key, value) => values.set(key, value)
};
const renders = [];
let completed = null;
const director = new EndingDirector({
  archive: first,
  storage,
  onRender: (frame, state) => renders.push({ frame, state }),
  onComplete: archive => { completed = archive; }
});
director.start({ resume: false });
assert.equal(renders.at(-1).frame.phase, 'false-ending');
director.skipToAnchor();
assert.equal(renders.at(-1).frame.phase, 'anchor-choice');
assert.equal(director.advance(), false, 'anchor frame must block until the player makes a choice');
assert.equal(director.chooseAnchor(first.anchors[0].id), true);
assert.equal(director.advance(), true);
assert.equal(renders.at(-1).frame.phase, 'broadcast');
while (director.index < director.frames.length - 1) director.advance();
director.advance();
assert.equal(completed.completed, true);
assert.equal(completed.selectedAnchor.title, '星砂');

const resumed = new EndingDirector({ archive: first, storage });
assert.equal(resumed.restore(), true);
assert.equal(resumed.archive.selectedAnchor.title, '星砂', 'selected anchor should survive refresh recovery');

console.log('Timeline ending tests passed.');
