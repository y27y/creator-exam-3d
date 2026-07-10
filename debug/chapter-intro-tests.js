import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { LEVEL_CHAPTER_INTROS } from '../public/js/chapterIntros.js'

const intro = LEVEL_CHAPTER_INTROS['flood-village']
assert.ok(intro, 'first-level chapter intro should exist')
assert.equal(Object.keys(LEVEL_CHAPTER_INTROS).length, 1, 'prototype should stay scoped to level one')
assert.equal(intro.act, '第一幕')
assert.equal(intro.frames.length, 3, 'first-level sample should use three authored stills')

for (const [index, frame] of intro.frames.entries()) {
  assert.match(frame.art, /^\/assets\/art\/chapters\/level-01\/shot-0[1-3]-[a-z-]+\.webp$/)
  assert.ok(frame.title.length <= 12, `frame ${index + 1} title should remain cinematic and brief`)
  assert.ok(frame.text.length <= 34, `frame ${index + 1} copy should remain optional and sparse`)
  assert.ok(existsSync(new URL(`../public${frame.art}`, import.meta.url)), `${frame.art} should exist locally`)
}

const gameSource = readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8')
const htmlSource = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8')
const cssSource = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8')

for (const contract of [
  "import { LEVEL_CHAPTER_INTROS } from './chapterIntros.js'",
  'this.showOpeningSequence()',
  'showLevelChapterIntro(levelId, { force = false, returnFocus = null } = {})',
  'preloadChapterIntro(levelId)',
  'renderChapterIntroFrame()',
  'handleCinematicPrimary()',
  'creatorExamChapterSeen:${levelId}:v1',
  "openingParams.get('chapter') === '1'"
]) {
  assert.ok(gameSource.includes(contract), `game should include chapter contract: ${contract}`)
}

for (const id of ['cinematic-art', 'cinematic-progress', 'test-chapter-intro-btn']) {
  assert.ok(htmlSource.includes(`id="${id}"`), `chapter UI should expose #${id}`)
}
assert.match(htmlSource, /id="cinematic-progress"[^>]*role="status"[^>]*aria-live="polite"/, 'chapter progress should be announced by screen readers')
assert.ok(gameSource.includes('returnFocus?.isConnected'), 'manual replay should restore focus to its trigger')

assert.ok(cssSource.includes('.cinematic[data-cinematic^="chapter-"]'), 'chapter stills should have their own cinematic treatment')
assert.ok(cssSource.includes('@keyframes chapter-still-enter'), 'chapter stills should use a restrained image entrance')
assert.ok(cssSource.includes('@media (prefers-reduced-motion: reduce)'), 'chapter motion should respect reduced-motion settings')

console.log('Chapter intro tests passed.')
