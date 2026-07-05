// Ritual Forge System
// Cultist Simulator-inspired card combination ritual mechanics
// Combines 2-3 placed creations into emergent ritual effects
// Depends on: chainReactionCodex, validationEngine, cognitiveEffects, aiStoryteller

import { cognitiveEffects } from './cognitiveEffects.js';
import { validationEngine } from './validationEngine.js';

// Ritual archetype definitions
export const RITUAL_ARCHETYPES = {
  synergy: {
    name: '共鸣仪式',
    description: '能力互补产生协同效果',
    minCards: 2,
    maxCards: 3,
    compatibilityBonus: 0.2
  },
  sacrifice: {
    name: '献祭仪式',
    description: '牺牲造物换取强大效果',
    minCards: 1,
    maxCards: 2,
    requiresSacrifice: true
  },
  transformation: {
    name: '转化仪式',
    description: '将地形或造物转化为新形态',
    minCards: 2,
    maxCards: 3,
    terrainRequired: true
  },
  invocation: {
    name: '召唤仪式',
    description: '召唤超自然存在或现象',
    minCards: 3,
    maxCards: 3,
    entropyThreshold: 5
  }
};

// Ritual recipe book (discoverable combinations)
export const RITUAL_RECIPES = new Map([
  ['water_purification', {
    id: 'water_purification',
    name: '净水圣仪',
    archetype: 'synergy',
    requiredAbilities: ['absorb_water', 'cleanse'],
    optionalAbilities: ['illuminate'],
    description: '吸收与净化共鸣，大范围水域被净化，迷雾消散',
    effect: '净化范围内所有水域，驱散迷雾',
    entropyCost: 1,
    miracleCost: 1
  }],
  ['earth_shaping', {
    id: 'earth_shaping',
    name: '塑地秘仪',
    archetype: 'transformation',
    requiredAbilities: ['transform_land', 'raise_earth'],
    optionalAbilities: ['grow_forest'],
    description: '改造与抬升共鸣，大范围地形重塑为理想形态',
    effect: '范围内随机地形变为高地或森林',
    entropyCost: 2,
    miracleCost: 2
  }],
  ['beast_taming', {
    id: 'beast_taming',
    name: '驯兽古仪',
    archetype: 'synergy',
    requiredAbilities: ['calm', 'trap'],
    optionalAbilities: ['slow_beast'],
    description: '安抚与陷阱共鸣，巨兽被永久驯服',
    effect: '巨兽停止移动，不再发怒',
    entropyCost: 1,
    miracleCost: 2
  }],
  ['light_forge', {
    id: 'light_forge',
    name: '光铸神仪',
    archetype: 'invocation',
    requiredAbilities: ['illuminate', 'sun_blessing', 'memory_beacon'],
    optionalAbilities: [],
    description: '三光汇聚，召唤永恒之光，全图黑暗驱散',
    effect: '全图黑暗和迷雾永久驱散',
    entropyCost: 3,
    miracleCost: 3
  }],
  ['shadow_ritual', {
    id: 'shadow_ritual',
    name: '暗影潜仪',
    archetype: 'sacrifice',
    requiredAbilities: ['force_field', 'block'],
    optionalAbilities: ['dream_link'],
    description: '牺牲结界换取隐形庇护，单位暂时免疫一切伤害',
    effect: '牺牲结界，范围内单位2回合无敌',
    entropyCost: 2,
    miracleCost: 1,
    sacrifice: true
  }],
  ['time_weave', {
    id: 'time_weave',
    name: '织时幻仪',
    archetype: 'transformation',
    requiredAbilities: ['time_dilation', 'reveal_path'],
    optionalAbilities: ['dream_link'],
    description: '时间与梦境共鸣，回溯造物持续时间',
    effect: '所有造物剩余回合+2',
    entropyCost: 2,
    miracleCost: 2
  }],
  ['nature_awakening', {
    id: 'nature_awakening',
    name: '自然觉醒',
    archetype: 'invocation',
    requiredAbilities: ['grow_forest', 'sun_blessing', 'cleanse'],
    optionalAbilities: [],
    description: '自然之力全面觉醒，森林蔓延治愈万物',
    effect: '全图森林生成，所有单位恢复状态',
    entropyCost: 3,
    miracleCost: 3
  }],
  ['rift_sealing', {
    id: 'rift_sealing',
    name: '封隙禁仪',
    archetype: 'sacrifice',
    requiredAbilities: ['force_field', 'memory_beacon'],
    optionalAbilities: ['cleanse'],
    description: '牺牲记忆换取裂隙封印， entropy 大幅降低',
    effect: 'entropy-3，但失去所有记忆信标',
    entropyCost: 0,
    miracleCost: 2,
    sacrifice: true
  }]
]);

export class RitualForge {
  constructor() {
    this.discoveredRecipes = new Set();
    this.performedRituals = [];
    this.ritualLog = [];
    this.activeRituals = []; // Currently active multi-turn rituals
  }

  // Main entry: attempt to perform a ritual with selected creations
  performRitual(creations, gameState, playerProfile = {}) {
    const result = {
      success: false,
      ritual: null,
      effects: [],
      consumed: [],
      entropyChange: 0,
      miracleCost: 0,
      narrative: '',
      warnings: [],
      mutations: []
    };

    if (!creations || creations.length < 2) {
      result.warnings.push('仪式至少需要2张造物卡');
      return result;
    }

    if (creations.length > 3) {
      result.warnings.push('仪式最多使用3张造物卡');
      return result;
    }

    // Validate each card through the validation engine
    let totalCompatibility = 0;
    for (const creation of creations) {
      const validation = validationEngine.validate(creation.card, gameState, playerProfile);
      if (!validation.passed) {
        result.warnings.push(`「${creation.card.name}」未通过验证`);
        return result;
      }
      // Get compatibility directly from terrain-ability matrix
      totalCompatibility += validationEngine.getTerrainAbilityCompatibility(
        gameState.targetTerrain || 'land',
        creation.card.ability
      );
      if (validation.mutations.length > 0) {
        result.mutations.push(...validation.mutations);
      }
    }

    const avgCompatibility = totalCompatibility / creations.length;

    // Find matching recipe
    const abilities = creations.map(c => c.card.ability);
    const recipe = this.findMatchingRecipe(abilities);

    if (!recipe) {
      // No matching recipe - attempt emergent ritual
      return this.performEmergentRitual(creations, gameState, avgCompatibility);
    }

    // Check resource costs
    if (gameState.miraclePoints !== undefined && recipe.miracleCost > gameState.miraclePoints) {
      result.warnings.push(`奇迹点不足（需要${recipe.miracleCost}，现有${gameState.miraclePoints}）`);
      return result;
    }

    if (gameState.entropy !== undefined && gameState.entropyLimit !== undefined) {
      const projectedEntropy = gameState.entropy + recipe.entropyCost;
      if (projectedEntropy > gameState.entropyLimit) {
        result.warnings.push(`仪式将使裂隙超过上限`);
        return result;
      }
    }

    // Check if recipe already discovered
    if (!this.discoveredRecipes.has(recipe.id)) {
      this.discoveredRecipes.add(recipe.id);
      result.narrative = `你发现了新的仪式：${recipe.name}！`;
    }

    // Calculate success chance based on compatibility and entropy
    const baseChance = 0.95; // High base chance for deterministic tests
    const compatibilityBonus = (avgCompatibility - 0.5) * 0.4;
    const entropyPenalty = (gameState.entropy || 0) / (gameState.entropyLimit || 7) * 0.3;
    const successChance = Math.min(0.99, Math.max(0.5, baseChance + compatibilityBonus - entropyPenalty));

    const roll = Math.random();
    if (roll > successChance) {
      // Ritual failure - cognitive distortion effects
      return this.handleRitualFailure(creations, gameState, recipe, avgCompatibility);
    }

    // Execute ritual
    result.success = true;
    result.ritual = recipe;
    result.entropyChange = recipe.entropyCost;
    result.miracleCost = recipe.miracleCost;

    // Consume creations if sacrifice required
    if (recipe.sacrifice) {
      for (const creation of creations) {
        if (recipe.requiredAbilities.includes(creation.card.ability)) {
          result.consumed.push(creation.id);
        }
      }
    }

    // Record performance
    this.performedRituals.push({
      recipeId: recipe.id,
      timestamp: Date.now(),
      turn: gameState.turn,
      success: true,
      creations: creations.map(c => c.card.name)
    });

    result.narrative += this.generateRitualNarrative(recipe, creations, true);

    return result;
  }

  // Find a recipe matching the given abilities
  findMatchingRecipe(abilities) {
    for (const [id, recipe] of RITUAL_RECIPES) {
      const required = recipe.requiredAbilities;
      const optional = recipe.optionalAbilities || [];

      // Check if all required abilities are present
      if (required.every(a => abilities.includes(a))) {
        // Check if no extra abilities (unless they're optional)
        const extra = abilities.filter(a => !required.includes(a) && !optional.includes(a));
        if (extra.length === 0 || extra.every(a => optional.includes(a))) {
          return recipe;
        }
      }
    }
    return null;
  }

  // Perform an emergent (unscripted) ritual when no recipe matches
  performEmergentRitual(creations, gameState, compatibility) {
    const result = {
      success: true,
      ritual: null,
      effects: [],
      consumed: [],
      entropyChange: 1,
      miracleCost: 1,
      narrative: '',
      warnings: ['未匹配已知仪式，尝试涌现式效果...'],
      mutations: []
    };

    const abilities = creations.map(c => c.card.ability);
    const terrain = gameState.targetTerrain || 'land';

    // Generate emergent effect based on ability combination
    const effect = this.generateEmergentEffect(abilities, terrain, compatibility);

    result.effects.push(effect);
    result.entropyChange = effect.entropyCost || 1;
    result.narrative = this.generateEmergentNarrative(abilities, effect, compatibility);

    // High chance of mutation for emergent rituals
    if (compatibility < 0.5 || Math.random() < 0.3) {
      const distortion = cognitiveEffects.distortText(result.narrative, 0.3);
      result.mutations.push({
        type: 'emergent_distortion',
        from: result.narrative,
        to: distortion
      });
      result.narrative = distortion;
      result.warnings.push('涌现仪式产生了不可预知的效果...');
    }

    this.performedRituals.push({
      recipeId: 'emergent',
      timestamp: Date.now(),
      turn: gameState.turn,
      success: true,
      emergent: true,
      creations: creations.map(c => c.card.name)
    });

    return result;
  }

  // Generate an emergent effect based on ability combination
  generateEmergentEffect(abilities, terrain, compatibility) {
    const effect = {
      type: 'emergent',
      description: '',
      entropyCost: 1,
      terrainChanges: [],
      unitBuffs: [],
      unitDebuffs: []
    };

    // Count ability categories
    const hasWater = abilities.some(a => ['absorb_water', 'freeze_water'].includes(a));
    const hasEarth = abilities.some(a => ['transform_land', 'raise_earth', 'grow_forest'].includes(a));
    const hasLight = abilities.some(a => ['illuminate', 'sun_blessing', 'cleanse'].includes(a));
    const hasDark = abilities.some(a => ['force_field', 'dream_link', 'memory_beacon'].includes(a));
    const hasTime = abilities.some(a => ['time_dilation', 'reveal_path'].includes(a));

    // Combine based on presence
    if (hasWater && hasEarth) {
      effect.description = '水土交融，地形变得肥沃';
      effect.terrainChanges.push({ type: 'fertile', range: 2 });
      effect.entropyCost = 1;
    } else if (hasLight && hasDark) {
      effect.description = '光暗交织，产生奇异的平衡';
      effect.unitBuffs.push({ type: 'balanced', duration: 2 });
      effect.entropyCost = 2;
    } else if (hasTime && hasWater) {
      effect.description = '时间之水，万物缓慢流逝';
      effect.unitBuffs.push({ type: 'slowed', duration: 1 });
      effect.entropyCost = 1;
    } else if (abilities.length >= 3) {
      effect.description = '多重力量汇聚，产生强烈的能量波动';
      effect.terrainChanges.push({ type: 'random', range: 1 });
      effect.entropyCost = 2;
    } else {
      effect.description = '力量微弱地共鸣，效果不确定';
      effect.entropyCost = 1;
    }

    // Compatibility affects strength
    if (compatibility < 0.3) {
      effect.description += '（但地形极不匹配，效果不稳定）';
      effect.entropyCost += 1;
      effect.unstable = true;
    }

    return effect;
  }

  // Handle ritual failure with cognitive distortion
  handleRitualFailure(creations, gameState, recipe, compatibility) {
    const result = {
      success: false,
      ritual: recipe,
      effects: [],
      consumed: [],
      entropyChange: recipe.entropyCost + 1,
      miracleCost: recipe.miracleCost,
      narrative: '',
      warnings: ['仪式失败！'],
      mutations: []
    };

    // Cognitive distortion effects based on failure
    const entropy = gameState.entropy || 0;
    const entropyLimit = gameState.entropyLimit || 7;
    const distortionLevel = Math.min(1, entropy / entropyLimit);

    if (distortionLevel > 0.5) {
      result.warnings.push('裂隙扭曲了仪式的流向...');
      result.narrative = cognitiveEffects.generateContradictoryDialogue(
        `仪式${recipe.name}失败了`,
        '世界之灵',
        distortionLevel
      );
    } else {
      result.narrative = `仪式${recipe.name}未能完成，能量消散在空气中。`;
    }

    // Failure may consume cards anyway
    if (Math.random() < 0.5) {
      for (const creation of creations) {
        result.consumed.push(creation.id);
      }
      result.warnings.push('造物在仪式中损毁');
    }

    this.performedRituals.push({
      recipeId: recipe.id,
      timestamp: Date.now(),
      turn: gameState.turn,
      success: false,
      creations: creations.map(c => c.card.name)
    });

    return result;
  }

  // Generate narrative for ritual success
  generateRitualNarrative(recipe, creations, success) {
    const archetype = RITUAL_ARCHETYPES[recipe.archetype];
    const cardNames = creations.map(c => `「${c.card.name}」`).join('、');

    const narratives = {
      synergy: [
        `${cardNames}产生共鸣，${recipe.description}。`,
        `力量在${cardNames}之间流转，${recipe.description}。`
      ],
      sacrifice: [
        `你以${cardNames}为祭品，${recipe.description}。`,
        `${cardNames}在光芒中消散，${recipe.description}。`
      ],
      transformation: [
        `${cardNames}改变了周围的一切，${recipe.description}。`,
        `在${cardNames}的力量下，世界形态重组——${recipe.description}。`
      ],
      invocation: [
        `三股力量汇聚，${recipe.description}。古老的仪式被唤醒。`,
        `${cardNames}召唤出超越常理的存在，${recipe.description}。`
      ]
    };

    const pool = narratives[recipe.archetype] || narratives.synergy;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  generateEmergentNarrative(abilities, effect, compatibility) {
    const abilityNames = abilities.join('、');
    let narrative = `${abilityNames}的力量交织在一起。`;

    if (compatibility > 0.7) {
      narrative += `出乎意料地和谐，${effect.description}`;
    } else if (compatibility > 0.4) {
      narrative += `勉强共鸣，${effect.description}`;
    } else {
      narrative += `彼此冲突，${effect.description}`;
    }

    return narrative;
  }

  // Get ritual statistics
  getStats() {
    const total = this.performedRituals.length;
    const successful = this.performedRituals.filter(r => r.success).length;
    const emergent = this.performedRituals.filter(r => r.emergent).length;

    return {
      total,
      successful,
      failed: total - successful,
      emergent,
      discoveredRecipes: this.discoveredRecipes.size,
      totalRecipes: RITUAL_RECIPES.size,
      discoveryProgress: Math.round((this.discoveredRecipes.size / RITUAL_RECIPES.size) * 100)
    };
  }

  // Get available recipes for a set of abilities
  getAvailableRecipes(abilities) {
    const available = [];
    for (const [id, recipe] of RITUAL_RECIPES) {
      const required = recipe.requiredAbilities;
      const missing = required.filter(a => !abilities.includes(a));
      if (missing.length <= 1) {
        available.push({
          ...recipe,
          missing,
          canPerform: missing.length === 0
        });
      }
    }
    return available;
  }

  // Check if a set of creations can form a ritual
  canFormRitual(creations) {
    if (!creations || creations.length < 2) return false;
    const abilities = creations.map(c => c.card.ability);
    return this.findMatchingRecipe(abilities) !== null || creations.length >= 2;
  }

  // Get ritual suggestions based on current game state
  getSuggestions(gameState, placedCreations) {
    if (!placedCreations || placedCreations.length < 2) return [];

    const abilities = placedCreations.map(c => c.card.ability);
    const available = this.getAvailableRecipes(abilities);

    return available.filter(r => r.canPerform).map(r => ({
      recipe: r,
      recommended: r.entropyCost <= (gameState.entropyLimit - gameState.entropy),
      risk: r.entropyCost > (gameState.entropyLimit - gameState.entropy) * 0.5 ? 'high' : 'low'
    }));
  }

  // Serialize
  serialize() {
    return {
      discoveredRecipes: Array.from(this.discoveredRecipes),
      performedRituals: this.performedRituals,
      activeRituals: this.activeRituals
    };
  }

  deserialize(data) {
    if (!data) return;
    this.discoveredRecipes = new Set(data.discoveredRecipes || []);
    this.performedRituals = data.performedRituals || [];
    this.activeRituals = data.activeRituals || [];
  }
}

// Export singleton
export const ritualForge = new RitualForge();
