import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { Soundscape, SOUND_MANIFEST, MUSIC_PLAYLIST } from '../public/js/soundscape.js'

function sourceBlock(source, startToken, endToken) {
  const start = source.indexOf(startToken)
  assert.notEqual(start, -1, `missing start token: ${startToken}`)
  const end = source.indexOf(endToken, start + startToken.length)
  assert.notEqual(end, -1, `missing end token: ${endToken}`)
  return source.slice(start, end)
}

const played = []
const audioInstances = []
const storageWrites = []
const storage = {
  value: null,
  getItem() { return this.value },
  setItem(key, value) {
    this.value = value
    storageWrites.push([key, value])
  }
}
const soundscape = new Soundscape({
  storage,
  now: (() => {
    let current = 1000
    return () => current += 250
  })(),
  audioFactory: src => {
    const audio = {
      src,
      paused: true,
      ended: false,
      currentTime: 0,
      play() {
        this.paused = false
        played.push({ src: this.src, volume: this.volume, playbackRate: this.playbackRate })
        return Promise.resolve()
      },
      pause() { this.paused = true },
      addEventListener() {}
    }
    audioInstances.push(audio)
    return audio
  }
})

assert.equal(soundscape.play('uiSelect'), false, 'audio must stay silent before a player gesture unlocks it')
soundscape.unlock()
assert.equal(played[0].src, MUSIC_PLAYLIST[0], 'first player gesture should unlock local background music')
assert.equal(soundscape.play('creationCompile'), true, 'known sounds should play after unlock')
const compilePlayback = played.find(entry => entry.src === SOUND_MANIFEST.creationCompile.src)
assert.ok(compilePlayback, 'creation compile cue should play independently from background music')
assert.ok(compilePlayback.volume > 0 && compilePlayback.volume <= 1, 'sound volume should be clamped')

assert.equal(soundscape.toggle(), false, 'toggle should mute enabled sound')
assert.equal(soundscape.currentMusic.paused, true, 'muting should pause background music')
assert.equal(soundscape.play('creationPlace'), false, 'muted soundscape should not play')
assert.deepEqual(storageWrites.at(-1), ['creatorExamSound', 'muted'], 'mute preference should persist')
assert.equal(soundscape.toggle(), true, 'second toggle should restore sound')
assert.equal(soundscape.currentMusic.paused, false, 'unmuting should resume background music')
assert.deepEqual(storageWrites.at(-1), ['creatorExamSound', 'enabled'], 'enabled preference should persist')
assert.equal(soundscape.play('unknown'), false, 'unknown effects should fail safely')

for (const [name, definition] of Object.entries(SOUND_MANIFEST)) {
  assert.match(definition.src, /^\.\/assets\/audio\/kenney\/[a-z-]+\.ogg$/, `${name} should use a bundled OGG`)
  assert.ok(existsSync(new URL(`../public/${definition.src.slice(2)}`, import.meta.url)), `${name} asset should exist locally`)
}
for (const source of MUSIC_PLAYLIST) {
  assert.match(source, /^\.\/assets\/audio\/music\/[A-Za-z_]+\.mp3$/, 'music should use a bundled MP3')
  assert.ok(existsSync(new URL(`../public/${source.slice(2)}`, import.meta.url)), `${source} should exist locally`)
}

const gameSource = readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8')
const htmlSource = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8')
const serverSource = readFileSync(new URL('../server.js', import.meta.url), 'utf8')
const attribution = readFileSync(new URL('../public/assets/ATTRIBUTION.md', import.meta.url), 'utf8')

assert.ok(gameSource.includes("import { Soundscape } from './soundscape.js'"), 'browser game should import the soundscape')
assert.ok(gameSource.includes('this.soundscape = new Soundscape()'), 'browser game should create one soundscape')
for (const cue of ['creationCompile', 'legendDiscovery', 'levelLoss', 'riftPulse']) {
  assert.ok(gameSource.includes(`this.soundscape.play('${cue}'`), `browser game should trigger ${cue}`)
}
const placeCreationBlock = sourceBlock(gameSource, '  placeCreation(x, y) {', '  applyImmediatePlacement(creation) {')
const winLevelBlock = sourceBlock(gameSource, '  winLevel(message) {', '  // Override failLevel for browser-specific effects')
assert.ok(placeCreationBlock.includes("this.soundscape.play('creationPlace'"), 'the real browser placement path should play its landing cue')
assert.ok(winLevelBlock.includes("this.soundscape.play('levelWin'"), 'the real browser victory path should play its win cue')
assert.ok(htmlSource.includes('id="sound-toggle"'), 'More menu should expose a sound toggle')
assert.ok(gameSource.includes('this.soundscape.toggle()'), 'sound setting should be user-controllable')
assert.ok(gameSource.includes('this.updateSoundToggle()'), 'sound toggle UI should stay synchronized')
assert.ok(serverSource.includes("'.ogg': 'audio/ogg'"), 'server should return the OGG MIME type')
assert.ok(serverSource.includes("'.mp3': 'audio/mpeg'"), 'server should return the MP3 MIME type')
for (const definition of Object.values(SOUND_MANIFEST)) {
  assert.ok(attribution.includes(definition.src.split('/').at(-1)), `${definition.src} should appear in the public asset ledger`)
}

console.log('Soundscape reliability tests passed.')
