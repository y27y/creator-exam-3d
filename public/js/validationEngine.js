// Semantic Validation Engine
// Three-layer validation: Syntax, Semantic, Narrative
// Inspired by PANGeA (AIIDE 2024) and "Mic Check" (AIIDE 2025)
// Validates LLM-generated creations against game state consistency

import { cognitiveEffects } from './cognitiveEffects.js';
import { ABILITY_SET, FUSED_ABILITIES, isKnownAbility } from './abilities.js';

const VALID_ABILITIES = new Set([...ABILITY_SET, ...FUSED_ABILITIES]);

function isValidAbility(ability) {
  return isKnownAbility(ability);
}

// Terrain-ability compatibility matrix
const TERRAIN_ABILITY_COMPATIBILITY = {
  water: {
    absorb_water: 1.0,
    create_bridge: 1.0,
    freeze_water: 1.0,
    illuminate: 0.5,
    transform_land: 0.3,
    grow_forest: 0.1,
    raise_earth: 0.1,
    force_field: 0.5,
    block: 0.3
  },
  land: {
    transform_land: 1.0,
    grow_forest: 1.0,
    raise_earth: 1.0,
    trap: 1.0,
    block: 1.0,
    force_field: 0.8,
    illuminate: 0.8,
    create_bridge: 0.3,
    absorb_water: 0.2
  },
  swamp: {
    transform_land: 1.0,
    grow_forest: 0.8,
    absorb_water: 0.7,
    freeze_water: 0.5,
    create_bridge: 0.5,
    illuminate: 0.3
  },
  dark: {
    illuminate: 1.0,
    memory_beacon: 1.0,
    force_field: 0.8,
    transform_land: 0.5,
    grow_forest: 0.3,
    create_bridge: 0.2
  },
  high: {
    raise_earth: 1.0,
    transform_land: 0.8,
    force_field: 0.7,
    illuminate: 0.6,
    block: 0.5,
    grow_forest: 0.4
  }
};

// Default compatibility for unspecified terrain-ability pairs
const DEFAULT_COMPATIBILITY = 0.5;

export class ValidationEngine {
  constructor() {
    this.validationLog = [];
    this.mutationCount = 0;
  }

  // Main validation entry point
  validate(card, gameState, playerProfile = {}) {
    const result = {
      original: { ...card },
      validated: null,
      passed: true,
      mutations: [],
      warnings: [],
      narrativeConsistency: 1.0
    };

    // Layer 1: Syntax validation
    const syntaxResult = this.validateSyntax(card);
    if (!syntaxResult.valid) {
      result.passed = false;
      result.warnings.push(...syntaxResult.errors);
      return result;
    }

    // Layer 2: Semantic validation (game state consistency)
    const semanticResult = this.validateSemantic(card, gameState);
    result.warnings.push(...semanticResult.warnings);

    // Layer 3: Narrative validation (player behavior consistency)
    const narrativeResult = this.validateNarrative(card, playerProfile);
    result.narrativeConsistency = narrativeResult.consistency;
    result.warnings.push(...narrativeResult.warnings);

    // Apply mutations if needed
    if (semanticResult.needsMutation || narrativeResult.needsMutation) {
      result.validated = this.mutateCard(card, gameState, semanticResult, narrativeResult);
      result.mutations = this.detectMutations(card, result.validated);
      this.mutationCount++;
    } else {
      result.validated = card;
    }

    this.validationLog.push({
      timestamp: Date.now(),
      cardName: card.name,
      passed: result.passed,
      mutationCount: result.mutations.length
    });

    return result;
  }

  // Layer 1: Syntax validation
  validateSyntax(card) {
    const errors = [];

    if (!card || typeof card !== 'object') {
      errors.push('卡牌必须是对象');
      return { valid: false, errors };
    }

    const requiredFields = ['name', 'ability', 'range', 'duration', 'cost', 'stabilityCost'];
    for (const field of requiredFields) {
      if (card[field] === undefined || card[field] === null) {
        errors.push(`缺少必需字段: ${field}`);
      }
    }

    if (!isValidAbility(card.ability)) {
      errors.push(`未知能力: ${card.ability}，必须是标准能力或融合能力`);
    }

    if (!card.name || card.name.length === 0) {
      errors.push('造物名称不能为空');
    }

    if (typeof card.range !== 'number' || card.range < 0 || card.range > 3) {
      errors.push('range必须在0-3之间');
    }

    if (typeof card.duration !== 'number' || card.duration < 1 || card.duration > 5) {
      errors.push('duration必须在1-5之间');
    }

    if (typeof card.cost !== 'number' || card.cost < 1 || card.cost > 3) {
      errors.push('cost必须在1-3之间');
    }

    if (typeof card.stabilityCost !== 'number' || card.stabilityCost < 0 || card.stabilityCost > 2) {
      errors.push('stabilityCost必须在0-2之间');
    }

    return { valid: errors.length === 0, errors };
  }

  // Layer 2: Semantic validation (terrain-ability compatibility, resource feasibility)
  validateSemantic(card, gameState) {
    const warnings = [];
    let needsMutation = false;

    if (!gameState) {
      return { warnings, needsMutation, compatibility: 1.0 };
    }

    // Check terrain-ability compatibility
    const targetTerrain = gameState.targetTerrain || 'land';
    const compatibility = this.getTerrainAbilityCompatibility(targetTerrain, card.ability);

    if (compatibility < 0.3) {
      warnings.push(`${card.ability}在${targetTerrain}地形上极不匹配，可能产生变异效果`);
      needsMutation = true;
    } else if (compatibility < 0.6) {
      warnings.push(`${card.ability}在${targetTerrain}地形上效果减弱`);
    }

    // Check resource feasibility
    if (gameState.miraclePoints !== undefined && card.cost > gameState.miraclePoints) {
      warnings.push(`造物消耗(${card.cost})超过可用奇迹点(${gameState.miraclePoints})`);
      needsMutation = true;
    }

    if (gameState.creationCharges !== undefined && gameState.creationCharges <= 0) {
      warnings.push('造物次数已耗尽');
      needsMutation = true;
    }

    // Check entropy safety
    if (gameState.entropy !== undefined && gameState.entropyLimit !== undefined) {
      const projectedEntropy = gameState.entropy + (card.stabilityCost || 0);
      if (projectedEntropy >= gameState.entropyLimit) {
        warnings.push(`造物将使裂隙达到上限(${projectedEntropy}/${gameState.entropyLimit})`);
      }
    }

    // Check chain reaction pre-compatibility
    if (gameState.nearbyCreations) {
      const resonancePotential = this.checkResonancePotential(card, gameState.nearbyCreations);
      if (resonancePotential.length > 0) {
        warnings.push(`可能与附近造物产生共鸣: ${resonancePotential.join(', ')}`);
      }
    }

    return { warnings, needsMutation, compatibility };
  }

  // Layer 3: Narrative validation (player behavior consistency)
  validateNarrative(card, playerProfile) {
    const warnings = [];
    let needsMutation = false;
    let consistency = 1.0;

    if (!playerProfile || Object.keys(playerProfile).length === 0) {
      return { warnings, needsMutation, consistency };
    }

    const playStyle = playerProfile.playStyle || 'balanced';
    const ability = card.ability;

    // Define style-ability alignment
    const styleAbilities = {
      creative: ['transform_land', 'dream_link', 'time_dilation', 'grow_forest'],
      strategic: ['guide', 'reveal_path', 'trap'],
      aggressive: ['block', 'slow_beast', 'trap', 'force_field'],
      careful: ['force_field', 'calm', 'memory_beacon', 'cleanse'],
      balanced: [] // All abilities aligned
    };

    const aligned = styleAbilities[playStyle] || [];
    if (aligned.length > 0 && !aligned.includes(ability)) {
      consistency -= 0.3;
      warnings.push(`该造物(${ability})与你的${playStyle}风格不太一致`);

      // If player has been very consistent, flag as potential narrative break
      const totalCreations = playerProfile.totalCreations || 0;
      const favoriteAbilities = playerProfile.favoriteAbilities || {};
      const totalFavorites = Object.values(favoriteAbilities).reduce((a, b) => a + b, 0);

      if (totalCreations > 10 && totalFavorites > 0) {
        const consistencyRatio = (favoriteAbilities[ability] || 0) / totalFavorites;
        if (consistencyRatio < 0.05) {
          warnings.push(`你很少使用这类能力——这是风格转变还是一时冲动？`);
          needsMutation = true;
        }
      }
    }

    // Check risk tolerance alignment
    const riskTolerance = playerProfile.riskTolerance || 0.5;
    const riskyAbilities = ['time_dilation', 'sun_blessing', 'transform_land'];
    const safeAbilities = ['guide', 'reveal_path', 'calm', 'block'];

    if (riskTolerance < 0.3 && riskyAbilities.includes(ability)) {
      consistency -= 0.2;
      warnings.push('该造物风险较高，不符合你谨慎的风格');
    } else if (riskTolerance > 0.7 && safeAbilities.includes(ability)) {
      consistency -= 0.1;
      warnings.push('该造物过于保守，不符合你大胆的风格');
    }

    return { warnings, needsMutation, consistency: Math.max(0, consistency) };
  }

  // Get terrain-ability compatibility score
  getTerrainAbilityCompatibility(terrain, ability) {
    const terrainMap = TERRAIN_ABILITY_COMPATIBILITY[terrain];
    if (!terrainMap) return DEFAULT_COMPATIBILITY;
    return terrainMap[ability] !== undefined ? terrainMap[ability] : DEFAULT_COMPATIBILITY;
  }

  // Check potential chain reactions with nearby creations
  checkResonancePotential(card, nearbyCreations) {
    const potential = [];
    const resonancePairs = {
      'illuminate': ['absorb_water', 'freeze_water'],
      'absorb_water': ['illuminate', 'freeze_water'],
      'freeze_water': ['illuminate', 'absorb_water'],
      'grow_forest': ['sun_blessing', 'cleanse'],
      'sun_blessing': ['grow_forest', 'illuminate'],
      'calm': ['memory_beacon', 'dream_link'],
      'force_field': ['block', 'raise_earth']
    };

    const myResonances = resonancePairs[card.ability] || [];
    for (const nearby of nearbyCreations) {
      if (myResonances.includes(nearby.ability)) {
        potential.push(`${nearby.name}(${nearby.ability})`);
      }
    }

    return potential;
  }

  // Mutate card to fit game state and narrative consistency
  mutateCard(card, gameState, semanticResult, narrativeResult) {
    const mutated = { ...card };
    const targetTerrain = gameState?.targetTerrain || 'land';

    // Terrain-based mutation
    const compatibility = this.getTerrainAbilityCompatibility(targetTerrain, card.ability);

    if (compatibility < 0.3) {
      // Severe mismatch: transform into a related but compatible ability
      mutated.ability = this.findCompatibleAbility(targetTerrain, card.ability);
      mutated.name = `变异${mutated.name}`;
      mutated.description = `由于地形不匹配，造物发生了变异：${mutated.description}`;
      mutated.side_effect = `变异效果不稳定，持续时间减半。`;
      mutated.duration = Math.max(1, Math.floor(mutated.duration / 2));
      mutated.tags = [...(mutated.tags || []), '变异'];
    } else if (compatibility < 0.6) {
      // Moderate mismatch: weaken but keep ability
      mutated.duration = Math.max(1, mutated.duration - 1);
      mutated.description = `在${targetTerrain}地形上效果减弱：${mutated.description}`;
      mutated.tags = [...(mutated.tags || []), '弱化'];
    }

    // Resource mutation
    if (gameState?.miraclePoints !== undefined && mutated.cost > gameState.miraclePoints) {
      mutated.cost = gameState.miraclePoints;
      mutated.name = `残缺${mutated.name}`;
      mutated.description = `奇迹点不足，造物只能以残缺形态显现：${mutated.description}`;
      mutated.range = Math.max(0, mutated.range - 1);
      mutated.tags = [...(mutated.tags || []), '残缺'];
    }

    // Narrative mutation (cognitive distortion)
    if (narrativeResult.consistency < 0.7) {
      mutated.description = cognitiveEffects.distortText(mutated.description, 0.3);
      mutated.side_effect = `风格突变导致造物不稳定：${mutated.side_effect}`;
      mutated.tags = [...(mutated.tags || []), '风格突变'];
    }

    return mutated;
  }

  // Find a compatible ability for the given terrain
  findCompatibleAbility(terrain, originalAbility) {
    const terrainMap = TERRAIN_ABILITY_COMPATIBILITY[terrain];
    if (!terrainMap) return originalAbility;

    // Find the most compatible ability
    let best = { ability: originalAbility, score: terrainMap[originalAbility] || 0 };
    for (const [ability, score] of Object.entries(terrainMap)) {
      if (score > best.score) {
        best = { ability, score };
      }
    }

    return best.ability;
  }

  // Detect mutations between original and mutated card
  detectMutations(original, mutated) {
    if (!mutated || original === mutated) return [];

    const mutations = [];
    const fields = ['ability', 'name', 'duration', 'cost', 'range', 'description'];

    for (const field of fields) {
      if (original[field] !== mutated[field]) {
        mutations.push({
          field,
          from: original[field],
          to: mutated[field]
        });
      }
    }

    return mutations;
  }

  // Get validation statistics
  getStats() {
    const total = this.validationLog.length;
    if (total === 0) return { total: 0, mutationRate: 0, passRate: 1 };

    const passed = this.validationLog.filter(v => v.passed).length;
    const withMutations = this.validationLog.filter(v => v.mutationCount > 0).length;

    return {
      total,
      passRate: passed / total,
      mutationRate: withMutations / total,
      totalMutations: this.mutationCount
    };
  }

  // Clear validation log
  clear() {
    this.validationLog = [];
    this.mutationCount = 0;
  }

  // Serialize
  serialize() {
    return {
      validationLog: this.validationLog,
      mutationCount: this.mutationCount
    };
  }

  deserialize(data) {
    if (!data) return;
    this.validationLog = data.validationLog || [];
    this.mutationCount = data.mutationCount || 0;
  }
}

// Export singleton
export const validationEngine = new ValidationEngine();
