const BASE_TERRAIN_STYLES = Object.freeze({
  land: { color: 0x4e5448, secondary: 0x353b34, accent: 0x8d9277, roughness: 0.96, form: 'ground' },
  water: { color: 0x365b67, secondary: 0x203b45, accent: 0x91aeb0, roughness: 0.26, metalness: 0.08, form: 'water' },
  high: { color: 0x867552, secondary: 0x584b37, accent: 0xc4ac73, roughness: 0.9, form: 'terrace' },
  village: { color: 0x775741, secondary: 0x49382f, accent: 0xb88a5e, roughness: 0.94, form: 'settlement' },
  exit: { color: 0x6f8f8c, secondary: 0x344f50, accent: 0xb7d5c3, roughness: 0.6, emissive: 0x1c3f3b, emissiveIntensity: 0.14, form: 'threshold' },
  city: { color: 0x777b78, secondary: 0x4b504e, accent: 0xaaa794, roughness: 0.88, form: 'city' },
  border: { color: 0x665e5b, secondary: 0x403b3b, accent: 0x9b846f, roughness: 0.92, form: 'border' },
  forest: { color: 0x3e5947, secondary: 0x293b31, accent: 0x748764, roughness: 0.98, form: 'forest' },
  mountain: { color: 0x5f6261, secondary: 0x373b3c, accent: 0x8a887e, roughness: 0.97, form: 'rock' },
  dark: { color: 0x151820, secondary: 0x090b10, accent: 0x4d5262, roughness: 1, form: 'dark' },
  fog: { color: 0x777b80, secondary: 0x494d54, accent: 0xb0b2ad, roughness: 1, opacity: 0.66, form: 'fog' },
  sacred: { color: 0x507865, secondary: 0x314b40, accent: 0xa7c491, roughness: 0.82, emissive: 0x183f32, emissiveIntensity: 0.16, form: 'sacred' },
  swamp: { color: 0x525943, secondary: 0x30362c, accent: 0x87916b, roughness: 0.74, form: 'wetland' },
  bridge: { color: 0x81684a, secondary: 0x4f4032, accent: 0xb89a68, roughness: 0.9, form: 'bridge' },
  wall: { color: 0x686c6b, secondary: 0x3e4342, accent: 0x94948a, roughness: 0.95, form: 'wall' },
  field: { color: 0x627d73, secondary: 0x3a5049, accent: 0xa7c3a4, roughness: 0.88, form: 'field' },
  poison: { color: 0x67704b, secondary: 0x343b2b, accent: 0xa8b56c, roughness: 0.72, emissive: 0x243219, emissiveIntensity: 0.12, form: 'poison' }
})

export const LEVEL_BOARD_THEMES = Object.freeze({
  'flood-village': Object.freeze({
    id: 'flood-village', motif: 'floodplain', textureSeed: 1103,
    details: Object.freeze(['wet-cyan-gray-ground', 'mud', 'reeds', 'layered-dark-water', 'ripples', 'driftwood']),
    surface: 0x253436, side: 0x10262a, edge: 0x55777a, detailA: 0x3e5e62, detailB: 0x7d6b50,
    terrain: Object.freeze({
      land: { color: 0x4f5548, secondary: 0x303a34, accent: 0x7f8870 },
      water: { color: 0x345966, secondary: 0x1c3944, accent: 0x8eadad },
      high: { color: 0x8c7950, secondary: 0x5b4a35, accent: 0xc2aa72 },
      village: { color: 0x74513c, secondary: 0x432f29, accent: 0xb37b52 },
      forest: { color: 0x405548, secondary: 0x2b3932, accent: 0x72806a }
    })
  }),
  'night-mine': Object.freeze({
    id: 'night-mine', motif: 'quarry', textureSeed: 2207,
    details: Object.freeze(['graphite-ground', 'ore-veins', 'rails', 'rubble']),
    surface: 0x25282a, side: 0x0d1012, edge: 0x64645d, detailA: 0x3f4548, detailB: 0x9c885d,
    terrain: Object.freeze({
      land: { color: 0x3c3e3d, secondary: 0x242727, accent: 0x666862 },
      dark: { color: 0x101217, secondary: 0x06080b, accent: 0x454751 },
      mountain: { color: 0x555858, secondary: 0x303435, accent: 0x85847b },
      village: { color: 0x665343, secondary: 0x3a3029, accent: 0xb18a52 },
      exit: { color: 0x737d78, secondary: 0x353d3b, accent: 0xd4cda6, emissive: 0x3b3d2a, emissiveIntensity: 0.24 }
    })
  }),
  'giant-city': Object.freeze({
    id: 'giant-city', motif: 'forest-stone', textureSeed: 3301,
    details: Object.freeze(['forest-stone-court', 'moss', 'roots', 'trunks', 'crowns']),
    surface: 0x303c35, side: 0x13251e, edge: 0x657c69, detailA: 0x4b5e50, detailB: 0x7b7057,
    terrain: Object.freeze({
      land: { color: 0x53604d, secondary: 0x344039, accent: 0x818b70 },
      forest: { color: 0x314d3b, secondary: 0x20342a, accent: 0x68805e },
      water: { color: 0x496569, secondary: 0x2c474b, accent: 0x849fa0 },
      mountain: { color: 0x65675f, secondary: 0x3b413d, accent: 0x918f7f },
      wall: { color: 0x73766c, secondary: 0x464a45, accent: 0xa39f8b },
      city: { color: 0x7f7c6d, secondary: 0x4f4c43, accent: 0xb7aa83 }
    })
  }),
  'wordless-war': Object.freeze({
    id: 'wordless-war', motif: 'no-mans-land', textureSeed: 4409,
    details: Object.freeze(['gray-brown-no-mans-land', 'road', 'boundary-posts', 'trench-scars']),
    surface: 0x383438, side: 0x19151c, edge: 0x796d79, detailA: 0x5a5158, detailB: 0x876b5b,
    terrain: Object.freeze({
      land: { color: 0x55504e, secondary: 0x373232, accent: 0x827872 },
      border: { color: 0x6a5c5d, secondary: 0x433a3d, accent: 0xa48671 },
      fog: { color: 0x858188, secondary: 0x55525a, accent: 0xb8b3b2, opacity: 0.62 },
      forest: { color: 0x465246, secondary: 0x2e3930, accent: 0x707a67 },
      mountain: { color: 0x686363, secondary: 0x3e3b3d, accent: 0x918885 },
      village: { color: 0x73544b, secondary: 0x463735, accent: 0xa6745e }
    })
  }),
  'memory-plague': Object.freeze({
    id: 'memory-plague', motif: 'memory-mist', textureSeed: 5513,
    details: Object.freeze(['desaturated-mist', 'mirror-pools', 'memory-shards']),
    surface: 0x283a3a, side: 0x101f22, edge: 0x6e7e78, detailA: 0x526d68, detailB: 0x756686,
    terrain: Object.freeze({
      land: { color: 0x465952, secondary: 0x2c3d39, accent: 0x768d80 },
      fog: { color: 0x7e8886, secondary: 0x505d5d, accent: 0xb9c0b5, opacity: 0.58 },
      swamp: { color: 0x4e6057, secondary: 0x2f423c, accent: 0x829488 },
      village: { color: 0x665b67, secondary: 0x403943, accent: 0x9c879c },
      sacred: { color: 0x557d6d, secondary: 0x344f45, accent: 0xb4cf9c, emissive: 0x20513e, emissiveIntensity: 0.22 }
    })
  }),
  'final-exam': Object.freeze({
    id: 'final-exam', motif: 'rift-convergence', textureSeed: 6607,
    details: Object.freeze(['violet-gray-rift-ground', 'converging-cracks', 'mixed-world-fragments']),
    surface: 0x282631, side: 0x0d0d14, edge: 0x746982, detailA: 0x514962, detailB: 0x76624f,
    terrain: Object.freeze({
      land: { color: 0x44434a, secondary: 0x2b2b32, accent: 0x6e6d70 },
      water: { color: 0x405664, secondary: 0x253744, accent: 0x78939c },
      dark: { color: 0x171720, secondary: 0x08090e, accent: 0x4a4657 },
      fog: { color: 0x716d7b, secondary: 0x494653, accent: 0xa6a0aa, opacity: 0.58 },
      border: { color: 0x685566, secondary: 0x433745, accent: 0x987784 },
      forest: { color: 0x3c5144, secondary: 0x26362e, accent: 0x667761 },
      mountain: { color: 0x5c5d62, secondary: 0x37383f, accent: 0x858287 },
      city: { color: 0x75716d, secondary: 0x494542, accent: 0xaaa08d },
      village: { color: 0x6f5145, secondary: 0x45342f, accent: 0xa9795e }
    })
  })
})

export const BOARD_THEME_LEVEL_IDS = Object.freeze(Object.keys(LEVEL_BOARD_THEMES))

export function getBoardVisualTheme(levelId) {
  return LEVEL_BOARD_THEMES[levelId] || LEVEL_BOARD_THEMES['final-exam']
}

export function getTerrainVisualStyle(levelId, terrain) {
  const theme = getBoardVisualTheme(levelId)
  const base = BASE_TERRAIN_STYLES[terrain] || BASE_TERRAIN_STYLES.land
  return { ...base, ...(theme.terrain[terrain] || {}) }
}
