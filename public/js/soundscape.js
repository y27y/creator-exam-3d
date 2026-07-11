export const SOUND_MANIFEST = Object.freeze({
  uiSelect: { src: './assets/audio/kenney/ui-select.ogg', volume: 0.16 },
  creationCompile: { src: './assets/audio/kenney/creation-compile.ogg', volume: 0.34 },
  creationPlace: { src: './assets/audio/kenney/creation-place.ogg', volume: 0.4 },
  legendDiscovery: { src: './assets/audio/kenney/legend-discovery.ogg', volume: 0.42 },
  levelWin: { src: './assets/audio/kenney/level-win.ogg', volume: 0.45 },
  levelLoss: { src: './assets/audio/kenney/level-loss.ogg', volume: 0.42 },
  riftPulse: { src: './assets/audio/kenney/rift-pulse.ogg', volume: 0.22 }
})

export const MUSIC_PLAYLIST = Object.freeze([
  './assets/audio/music/Beyond_the_Tavern_Hearth.mp3',
  './assets/audio/music/Beneath_The_Nomad’s_Canopy.mp3',
  './assets/audio/music/Crown_of_the_Frozen_Pass.mp3',
  './assets/audio/music/The_Copper_Fleet_Departs.mp3',
  './assets/audio/music/Where_the_Lanterns_Fade.mp3',
  './assets/audio/music/Where_Galaxies_Stop_to_Rest.mp3'
])

const SOUND_STORAGE_KEY = 'creatorExamSound'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)))
}

export class Soundscape {
  constructor({ audioFactory, storage, now } = {}) {
    this.audioFactory = audioFactory || (src => new globalThis.Audio(src))
    this.storage = storage === undefined ? globalThis.localStorage : storage
    this.now = now || (() => Date.now())
    this.enabled = this.readEnabledPreference()
    this.unlocked = false
    this.lastPlayedAt = new Map()
    this.unlockTarget = null
    this.unlockHandler = null
    this.musicTracks = new Map()
    this.musicTrackIndex = 0
    this.currentMusic = null
    this.musicVolume = 0.28
  }

  readEnabledPreference() {
    try {
      return this.storage?.getItem(SOUND_STORAGE_KEY) !== 'muted'
    } catch (_error) {
      return true
    }
  }

  bindUnlock(target = globalThis.window) {
    if (!target?.addEventListener || this.unlockHandler) return false
    this.unlockTarget = target
    this.unlockHandler = () => this.unlock()
    target.addEventListener('pointerdown', this.unlockHandler, true)
    target.addEventListener('keydown', this.unlockHandler, true)
    return true
  }

  unlock() {
    this.unlocked = true
    if (this.unlockTarget && this.unlockHandler) {
      this.unlockTarget.removeEventListener('pointerdown', this.unlockHandler, true)
      this.unlockTarget.removeEventListener('keydown', this.unlockHandler, true)
    }
    this.unlockTarget = null
    this.unlockHandler = null
    this.resumeMusic()
    return true
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled)
    try {
      this.storage?.setItem(SOUND_STORAGE_KEY, this.enabled ? 'enabled' : 'muted')
    } catch (_error) {
      // Storage can be unavailable in private or embedded browsing contexts.
    }
    if (!this.enabled) this.pauseMusic()
    else this.resumeMusic()
    return this.enabled
  }

  toggle() {
    return this.setEnabled(!this.enabled)
  }

  setMusicTrack(index, { restart = false } = {}) {
    if (!MUSIC_PLAYLIST.length) return false
    const nextIndex = clamp(index, 0, MUSIC_PLAYLIST.length - 1)
    const changed = nextIndex !== this.musicTrackIndex
    this.musicTrackIndex = nextIndex
    if (!this.enabled || !this.unlocked) return changed
    return this.startMusicTrack(nextIndex, { restart: restart || changed })
  }

  play(name, { volume, playbackRate = 1, cooldownMs = 80 } = {}) {
    const definition = SOUND_MANIFEST[name]
    if (!definition || !this.enabled || !this.unlocked) return false

    const playedAt = this.now()
    if (playedAt - (this.lastPlayedAt.get(name) || 0) < cooldownMs) return false

    try {
      const audio = this.audioFactory(definition.src)
      audio.preload = 'auto'
      audio.volume = clamp(volume ?? definition.volume, 0, 1)
      audio.playbackRate = clamp(playbackRate, 0.5, 2)
      const pending = audio.play()
      pending?.catch?.(() => {})
      this.lastPlayedAt.set(name, playedAt)
      return true
    } catch (_error) {
      return false
    }
  }

  getMusicTrack(index) {
    if (!MUSIC_PLAYLIST[index]) return null
    if (this.musicTracks.has(index)) return this.musicTracks.get(index)
    const audio = this.audioFactory(MUSIC_PLAYLIST[index])
    audio.preload = 'auto'
    audio.loop = false
    audio.volume = this.musicVolume
    audio.addEventListener?.('ended', () => {
      if (this.currentMusic !== audio) return
      this.musicTrackIndex = (index + 1) % MUSIC_PLAYLIST.length
      this.startMusicTrack(this.musicTrackIndex)
    })
    this.musicTracks.set(index, audio)
    return audio
  }

  pauseMusic() {
    if (!this.currentMusic) return false
    this.currentMusic.pause()
    return true
  }

  resumeMusic() {
    if (!this.enabled || !this.unlocked || !MUSIC_PLAYLIST.length) return false
    if (this.currentMusic && !this.currentMusic.paused) return true
    return this.startMusicTrack(this.musicTrackIndex, { restart: false })
  }

  ensureMusicPlaying() {
    if (!this.enabled || !this.unlocked) return false
    if (this.currentMusic && !this.currentMusic.paused) return true
    return this.resumeMusic()
  }

  startMusicTrack(index, { restart = true } = {}) {
    const next = this.getMusicTrack(index)
    if (!next || !this.enabled || !this.unlocked) return false
    const previous = this.currentMusic
    this.musicTrackIndex = index
    this.currentMusic = next
    if (previous && previous !== next) previous.pause()
    if (restart || next.ended || next.currentTime <= 0) {
      try { next.currentTime = 0 } catch (_error) {}
    }
    next.volume = this.musicVolume
    const pending = next.play()
    pending?.catch?.(() => {})
    return true
  }
}
