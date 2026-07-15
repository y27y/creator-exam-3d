import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { TILE } from '../public/js/levels.js'
import {
  BOARD_THEME_LEVEL_IDS,
  LEVEL_BOARD_THEMES,
  getBoardVisualTheme,
  getTerrainReadabilityStyle,
  getTerrainVisualStyle
} from '../public/js/boardVisualThemes.js'

const LEVEL_IDS = ['flood-village', 'night-mine', 'giant-city', 'wordless-war', 'memory-plague', 'final-exam']
const EXPECTED_DETAILS = {
  'flood-village': ['wet-cyan-gray-ground', 'mud', 'reeds', 'layered-dark-water', 'ripples', 'driftwood'],
  'night-mine': ['graphite-ground', 'ore-veins', 'rails', 'rubble'],
  'giant-city': ['forest-stone-court', 'moss', 'roots', 'trunks', 'crowns'],
  'wordless-war': ['gray-brown-no-mans-land', 'road', 'boundary-posts', 'trench-scars'],
  'memory-plague': ['desaturated-mist', 'mirror-pools', 'memory-shards'],
  'final-exam': ['violet-gray-rift-ground', 'converging-cracks', 'mixed-world-fragments']
}
assert.deepEqual(BOARD_THEME_LEVEL_IDS, LEVEL_IDS, 'all six levels should own a board visual theme')
assert.equal(new Set(LEVEL_IDS.map(id => getBoardVisualTheme(id).motif)).size, 6, 'each level should have a distinct procedural board motif')
assert.equal(new Set(LEVEL_IDS.map(id => getBoardVisualTheme(id).surface)).size, 6, 'each level should have a distinct sand-table surface color')
assert.equal(new Set(LEVEL_IDS.map(id => getBoardVisualTheme(id).textureSeed)).size, 6, 'each board texture should be deterministically unique')

for (const levelId of LEVEL_IDS) {
  const theme = LEVEL_BOARD_THEMES[levelId]
  assert.match(theme.artTexture, /^\/assets\/art\/board-surfaces\/.+-image2\.webp$/, `${levelId} should declare its image-2 board surface`)
  assert.ok(existsSync(new URL(`../public${theme.artTexture}`, import.meta.url)), `${levelId} image-2 board surface should exist`)
  assert.ok(theme.boardLift >= 0.15 && theme.boardLift <= 0.25, `${levelId} should lift authored board midtones without flattening them`)
  assert.ok(theme.grid?.opacity >= 0.4 && theme.grid.opacity <= 0.5, `${levelId} should keep engraved grid seams clearly readable`)
  for (const field of ['groove', 'highlight']) {
    assert.ok(Number.isInteger(theme.grid[field]) && theme.grid[field] >= 0 && theme.grid[field] <= 0xffffff, `${levelId} grid ${field} should be a valid RGB color`)
  }
  assert.deepEqual(theme.details, EXPECTED_DETAILS[levelId], `${levelId} should declare every authored environment detail`)
  for (const field of ['surface', 'side', 'edge', 'detailA', 'detailB']) {
    assert.ok(Number.isInteger(theme[field]) && theme[field] >= 0 && theme[field] <= 0xffffff, `${levelId} ${field} should be a valid RGB color`)
  }
  for (const terrain of Object.values(TILE)) {
    const style = getTerrainVisualStyle(levelId, terrain)
    assert.ok(Number.isInteger(style.color), `${levelId}/${terrain} should resolve a modeled material color`)
    assert.ok(style.form, `${levelId}/${terrain} should retain a recognizable terrain form`)
  }
}

const waterColors = LEVEL_IDS.map(levelId => getTerrainVisualStyle(levelId, TILE.WATER).color)
const landColors = LEVEL_IDS.map(levelId => getTerrainVisualStyle(levelId, TILE.LAND).color)
assert.ok(new Set(waterColors).size >= 4, 'water should adapt to level context instead of staying one bright blue')
assert.ok(new Set(landColors).size >= 5, 'ground should adapt to level context instead of staying one green')
assert.ok(!waterColors.includes(0x1c78d2), 'legacy saturated blue water should no longer drive visible terrain')
assert.ok(!landColors.includes(0x52634c), 'legacy uniform green ground should no longer drive visible terrain')

for (const terrain of [TILE.WATER, TILE.FOG, TILE.DARK, TILE.SWAMP, TILE.POISON]) {
  const readability = getTerrainReadabilityStyle(terrain)
  const minimumOpacity = terrain === TILE.FOG ? 0.15 : terrain === TILE.DARK ? 0.2 : 0.3
  assert.ok(readability?.opacity >= minimumOpacity, `${terrain} should remain readable over detailed board art`)
  assert.ok(readability?.edgeOpacity >= 0.5, `${terrain} should have a visible gameplay boundary`)
}
assert.equal(getTerrainReadabilityStyle(TILE.LAND), null, 'ordinary land should preserve the authored board texture')
assert.equal(getTerrainReadabilityStyle(TILE.FOG).opacity, 1, 'fog should use an opaque gameplay surface')
assert.equal(getTerrainReadabilityStyle(TILE.DARK).opacity, 1, 'darkness should use an opaque gameplay surface')
assert.ok(getTerrainVisualStyle('wordless-war', TILE.BORDER).emissiveIntensity >= 0.3, 'the messenger border should glow above fog and earth')

const gameSource = readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8')
for (const contract of [
  "import { getBoardVisualTheme, getTerrainReadabilityStyle, getTerrainVisualStyle } from './boardVisualThemes.js'",
  'const readability = getTerrainReadabilityStyle(terrain)',
  'const surfaceLocalY = hasRaisedSurface ? height / 2 : -height / 2',
  'trunk.position.set(offset, surfaceLocalY + 0.11',
  'group.position.set(pos.x - 0.34, 0.14, pos.z - 0.28)',
  'group.position.set(pos.x, 0, pos.z)',
  'createBoardSurfaceTexture(theme)',
  'createBoardSurfaceDetails(theme)',
  'this.boardSurfaceGroup.userData.detailTypes = [...(theme.details || [])]',
  'details: [...(this.boardSurfaceGroup?.userData?.detailTypes || [])]',
  'applyBoardVisualTheme(levelId)',
  'loadBoardArtTexture(theme)',
  'installBoardArtTexture(theme, texture)',
  'emissiveMap: texture',
  'this.renderer.toneMappingExposure = preset.exposure',
  'this.updatePlanetaryRings(theme)',
  'this.updateBoardGrid(theme)',
  "this.boardGridGroup.userData.visualStyle = 'engraved-theme-grid-v1'",
  'board-grid-vertical-groove-',
  'board-grid-horizontal-highlight-',
  'planet-ring-asteroid-v1',
  'this.boardSurfaceGroup.userData.artTextureFallback = true',
  "visualStyle: 'sculpted-terrain-v3'",
  'existing.userData.themeId === this.activeBoardThemeId',
  "this.getCachedGeometry('terrain-water-surface-image2'",
  "this.getCachedGeometry('terrain-water-bed-v5'",
  "this.getCachedGeometry('terrain-forest-trunk-v3'",
  "this.getCachedGeometry('terrain-border-road-v3'",
  "this.getCachedGeometry('terrain-border-crossbar-v4'",
  "this.getCachedGeometry('terrain-exit-lintel-v4'",
  "this.getCachedGeometry('terrain-dark-well-v5'",
  'terrain-fog-wisp-v4-',
  'haze.userData.volumeLayers = lobeCount'
]) {
  assert.ok(gameSource.includes(contract), `renderer should include board visual contract: ${contract}`)
}

assert.ok(!gameSource.includes("add('ring', 0x8f73c8, [0, 0.02, 0]"), 'final exam should not put a decorative purple ring in the playable center')
assert.ok(!gameSource.includes("this.getCachedGeometry('terrain-exit-ring-v3'"), 'the mine exit should render as a modeled threshold instead of a floating ring')
assert.ok(gameSource.includes("if (terrain === TILE.FOG) return this.material(style.color, options)"), 'fog terrain material should be opaque')

const terrainVisualStart = gameSource.indexOf('  createTerrainVisual(terrain, height, x, y) {')
const fogVisualStart = gameSource.indexOf('    if (terrain === TILE.FOG) {', terrainVisualStart)
const darkVisualStart = gameSource.indexOf('    if (terrain === TILE.DARK) {', fogVisualStart)
const fogVisualBlock = gameSource.slice(fogVisualStart, darkVisualStart)
assert.ok(!fogVisualBlock.includes('transparent: true'), 'fog wisps should be opaque')

console.log('Board visual theme tests passed (6 image-2 surfaces, procedural fallback, 17 terrain forms).')
