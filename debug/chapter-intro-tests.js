import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { LEVEL_CHAPTER_INTROS } from '../public/js/chapterIntros.js'

const levelIds = ['flood-village', 'night-mine', 'giant-city', 'wordless-war', 'memory-plague', 'final-exam']
assert.deepEqual(Object.keys(LEVEL_CHAPTER_INTROS), levelIds, 'all six authored levels should have chapter openings')

for (const [levelIndex, levelId] of levelIds.entries()) {
  const intro = LEVEL_CHAPTER_INTROS[levelId]
  assert.ok(intro, `${levelId} chapter intro should exist`)
  assert.equal(intro.frames.length, 3, `${levelId} should use three authored stills`)
  for (const [frameIndex, frame] of intro.frames.entries()) {
    assert.match(frame.art, new RegExp(`^/assets/art/chapters/level-0${levelIndex + 1}/shot-0${frameIndex + 1}-[a-z-]+\\.webp$`))
    assert.ok(frame.title.length <= 12, `${levelId} frame ${frameIndex + 1} title should remain cinematic and brief`)
    assert.ok(frame.text.length <= 34, `${levelId} frame ${frameIndex + 1} copy should remain optional and sparse`)
    assert.ok(existsSync(new URL(`../public${frame.art}`, import.meta.url)), `${frame.art} should exist locally`)
  }
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
  'finishChapterIntroWithTransition()',
  'handleCinematicPrimary()',
  'creatorExamChapterSeen:${levelId}:v1',
  "openingParams.get('chapter')",
  'this.showLevelChapterIntro(this.level.id)',
  "this.showLevelChapterIntro(this.level.id, { force: true, returnFocus: chapterIntroButton })"
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
assert.ok(cssSource.includes('@keyframes chapter-scroll-close'), 'final still should close like a painted scroll')
assert.ok(cssSource.includes('.cinematic.chapter-transition'), 'chapter exit should reveal the realtime board')
assert.ok(cssSource.includes('@media (prefers-reduced-motion: reduce)'), 'chapter motion should respect reduced-motion settings')

console.log('Chapter intro tests passed.')
