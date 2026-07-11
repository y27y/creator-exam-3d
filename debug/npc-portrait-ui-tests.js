import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { LEVELS } from '../public/js/levels.js'
import { NPC_PORTRAIT_NAMES, getNpcPortraitAsset } from '../public/js/npcPortraitAssets.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function sourceBlock(source, startToken, endToken) {
  const start = source.indexOf(startToken)
  assert(start !== -1, `missing start token: ${startToken}`)
  const end = source.indexOf(endToken, start + startToken.length)
  assert(end !== -1, `missing end token: ${endToken}`)
  return source.slice(start, end)
}

const talkableUnits = LEVELS
  .flatMap(level => level.units)
  .filter(unit => ['villager', 'miner', 'tribeA', 'tribeB'].includes(unit.type))

assert(talkableUnits.length === 20, 'the authored campaign should expose 20 talkable NPCs')
assert(NPC_PORTRAIT_NAMES.length === talkableUnits.length, 'every talkable NPC should have one portrait mapping')
assert(new Set(NPC_PORTRAIT_NAMES).size === NPC_PORTRAIT_NAMES.length, 'portrait mappings should not contain duplicate names')

for (const unit of talkableUnits) {
  const asset = getNpcPortraitAsset(unit)
  assert(asset?.endsWith('.webp'), `${unit.name} should resolve to a WebP portrait`)
  const diskUrl = new URL(`../public${asset}`, import.meta.url)
  const diskPath = fileURLToPath(diskUrl)
  assert(existsSync(diskPath), `${unit.name} portrait should exist at ${asset}`)
  assert(statSync(diskPath).size > 100_000, `${unit.name} portrait should be a production asset rather than a placeholder`)
}

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8')
const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8')
const game = readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8')
const storyRule = sourceBlock(css, '.story {', '}')
const pointerBlock = sourceBlock(game, '  onPointerDown(event) {', '  placeCreation(x, y) {')
const statusStripBlock = sourceBlock(game, '  renderNpcStatusStrip() {', '  renderNpcDialoguePanel() {')
const interactionBlock = sourceBlock(game, '  handleUnitInteraction(unit) {', '  renderLegendPanel() {')

assert(html.includes('id="npc-status-strip"'), 'the game shell should expose a top-center NPC status strip')
assert(html.includes('<img id="npc-dialogue-portrait"'), 'the dialogue layer should render an image-2 cutout asset')
assert(html.includes('id="mission-goals" class="mission-goals" hidden'), 'duplicate mission chips should remain hidden')
assert(!storyRule.includes('line-clamp'), 'the mission story should not be line-clamped')
assert(storyRule.includes('white-space: normal'), 'the mission story should wrap in full')
assert(css.includes('.npc-status-avatar.status-lost img'), 'lost NPC portraits should have a dedicated gray-state selector')
assert(css.includes('filter: grayscale(1)'), 'lost NPC portraits should visibly become grayscale')
assert(css.includes('.npc-status-avatar img,') && css.includes('border-radius: 50%'), 'top-center NPC portraits should be circular avatars')
assert(css.includes('.npc-dialogue-bubble') && css.includes('margin: 0 -14px 230px 0'), 'the lightweight dialogue bubble should sit above the creation dock')
assert(css.includes('.world-signal {') && css.includes('bottom: auto'), 'world notices should anchor near the right rail instead of the lower-right corner')
assert(!css.includes('#game-root[data-dialogue-open="true"] #creation-dock'), 'opening dialogue must not hide or disable the creation dock')
assert(pointerBlock.includes('intersectObjects(Array.from(this.unitMeshPool.values()), true)'), 'canvas clicks should raycast through NPC mesh children')
assert(pointerBlock.includes('this.handleUnitInteraction(unit)'), 'canvas NPC clicks should open the NPC interaction')
assert(statusStripBlock.includes('getNpcPortraitAsset(unit)'), 'top avatars should use generated portrait assets')
assert(statusStripBlock.includes("status === 'lost'") && statusStripBlock.includes('status-${escapeHtml(status)}'), 'top avatars should expose the lost state')
assert(interactionBlock.includes('this.closeDrawer()'), 'direct NPC dialogue should not stay nested in the people drawer')
assert(!interactionBlock.includes("this.openDrawer('people'"), 'direct NPC dialogue should not open the full people drawer')
assert(game.includes('messages.slice(-3)'), 'the lightweight dialogue bubble should keep only recent chat lines visible')

console.log('NPC portrait UI tests passed.')
