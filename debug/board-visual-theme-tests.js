import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TILE } from '../public/js/levels.js'
import {
  BOARD_THEME_LEVEL_IDS,
  LEVEL_BOARD_THEMES,
  getBoardVisualTheme,
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

const gameSource = readFileSync(new URL('../public/js/game.js', import.meta.url), 'utf8')
for (const contract of [
  "import { getBoardVisualTheme, getTerrainVisualStyle } from './boardVisualThemes.js'",
  'createBoardSurfaceTexture(theme)',
  'createBoardSurfaceDetails(theme)',
  'this.boardSurfaceGroup.userData.detailTypes = [...(theme.details || [])]',
  'details: [...(this.boardSurfaceGroup?.userData?.detailTypes || [])]',
  'applyBoardVisualTheme(levelId)',
  "visualStyle: 'sculpted-terrain-v3'",
  'existing.userData.themeId === this.activeBoardThemeId',
  "this.getCachedGeometry('terrain-water-basin-v3'",
  "this.getCachedGeometry('terrain-forest-trunk-v3'",
  "this.getCachedGeometry('terrain-border-road-v3'"
]) {
  assert.ok(gameSource.includes(contract), `renderer should include board visual contract: ${contract}`)
}

console.log('Board visual theme tests passed (6 surfaces, 17 terrain forms).')
