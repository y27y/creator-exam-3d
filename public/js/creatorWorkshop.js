// Creator's Workshop System
// Between-level crafting space inspired by Slay the Spire's card forge + Minecraft crafting
// Players dismantle, modify, and fuse past creations to prepare for next level

import { validationEngine } from './validationEngine.js';
import { cognitiveEffects } from './cognitiveEffects.js';
import { FUSION_TABLE } from './abilities.js';

// Material types extracted from creations
export const MATERIAL_TYPES = {
  wood: { name: '灵木', source: ['grow_forest', 'create_bridge'], rarity: 'common' },
  stone: { name: '岩心', source: ['raise_earth', 'transform_land'], rarity: 'common' },
  water: { name: '源水', source: ['absorb_water', 'freeze_water'], rarity: 'common' },
  light: { name: '光尘', source: ['illuminate', 'sun_blessing'], rarity: 'uncommon' },
  shadow: { name: '影纱', source: ['force_field', 'dream_link'], rarity: 'uncommon' },
  time: { name: '时砂', source: ['time_dilation', 'reveal_path'], rarity: 'rare' },
  memory: { name: '忆晶', source: ['memory_beacon', 'cleanse'], rarity: 'rare' },
  chaos: { name: '混沌碎片', source: ['illegal', 'paradox'], rarity: 'epic' }
};

// Workshop operations
export const WORKSHOP_OPERATIONS = {
  dismantle: {
    name: '拆解',
    description: '将造物还原为基础材料',
    materialYield: 1, // Base materials returned
    cost: 0
  },
  modify: {
    name: '改造',
    description: '消耗材料改变造物的属性',
    materialCost: 1,
    maxModifications: 3
  },
  fuse: {
    name: '融合',
    description: '将两个造物融合为一个新造物',
    materialCost: 2,
    requiresTwoCards: true
  },
  infuse: {
    name: '注入',
    description: '将传承单位的特质注入造物',
    materialCost: 3,
    requiresLegacyUnit: true
  }
};

// Possible modifications
export const MODIFICATIONS = {
  range_boost: {
    name: '范围扩展',
    description: '范围+1',
    effect: { property: 'range', delta: 1 },
    compatible: ['illuminate', 'force_field', 'calm', 'cleanse']
  },
  duration_extend: {
    name: '持久化',
    description: '持续时间+2',
    effect: { property: 'duration', delta: 2 },
    compatible: ['create_bridge', 'grow_forest', 'memory_beacon']
  },
  cost_reduce: {
    name: '精简',
    description: '消耗-1',
    effect: { property: 'cost', delta: -1 },
    compatible: ['all']
  },
  stability_boost: {
    name: '稳固',
    description: '稳定性+1',
    effect: { property: 'stabilityCost', delta: -1 },
    compatible: ['all']
  },
  power_surge: {
    name: '过载',
    description: '效果翻倍但稳定性-1',
    effect: { property: 'powerMultiplier', delta: 1.0 },
    sideEffect: { property: 'stabilityCost', delta: 1 },
    compatible: ['illuminate', 'absorb_water', 'transform_land']
  },
  echo_bind: {
    name: '回响绑定',
    description: '造物被裂隙回响强化',
    effect: { property: 'echoBound', value: true },
    compatible: ['all']
  }
};

export class WorkshopCreation {
  constructor(data) {
    this.id = data.id || `workshop-${Date.now()}-${Math.random()}`;
    this.baseCard = data.baseCard || null; // Original card
    this.modifications = data.modifications || [];
    this.materialsInvested = data.materialsInvested || [];
    this.legacyInfused = data.legacyInfused || null;
    this.stability = data.stability || 100; // 0-100
    this.quality = data.quality || 'normal'; // normal, refined, masterwork, corrupted
    this.createdAt = data.createdAt || Date.now();
  }

  // Apply a modification
  applyModification(modType, materials) {
    const mod = MODIFICATIONS[modType];
    if (!mod) return { success: false, error: '未知的改造类型' };

    // Check compatibility
    if (mod.compatible[0] !== 'all' && !mod.compatible.includes(this.baseCard?.ability)) {
      return { success: false, error: '该改造与造物能力不兼容' };
    }

    // Check modification limit
    if (this.modifications.length >= WORKSHOP_OPERATIONS.modify.maxModifications) {
      return { success: false, error: '改造次数已达上限' };
    }

    // Apply effect
    const card = { ...this.baseCard };
    if (mod.effect.property !== 'echoBound') {
      card[mod.effect.property] = (card[mod.effect.property] || 0) + mod.effect.delta;
    } else {
      card.echoBound = true;
    }

    // Apply side effect
    if (mod.sideEffect) {
      card[mod.sideEffect.property] = (card[mod.sideEffect.property] || 0) + mod.sideEffect.delta;
    }

    this.baseCard = card;
    this.modifications.push({
      type: modType,
      name: mod.name,
      timestamp: Date.now()
    });

    // Update quality
    if (this.modifications.length >= 2) this.quality = 'refined';
    if (this.modifications.length >= 3) this.quality = 'masterwork';

    // Reduce stability based on modification count
    this.stability = Math.max(0, this.stability - 10 * this.modifications.length);

    return {
      success: true,
      card: this.baseCard,
      modifications: this.modifications,
      stability: this.stability
    };
  }

  // Get final card for use in game
  getFinalCard() {
    return {
      ...this.baseCard,
      workshopId: this.id,
      modifications: this.modifications.map(m => m.name),
      quality: this.quality,
      stability: this.stability,
      legacyInfused: this.legacyInfused,
      isWorkshopCreation: true
    };
  }

  serialize() {
    return {
      id: this.id,
      baseCard: this.baseCard,
      modifications: this.modifications,
      materialsInvested: this.materialsInvested,
      legacyInfused: this.legacyInfused,
      stability: this.stability,
      quality: this.quality,
      createdAt: this.createdAt
    };
  }

  static deserialize(data) {
    return new WorkshopCreation(data);
  }
}

export class CreatorWorkshop {
  constructor() {
    this.inventory = []; // Stored creations
    this.materials = new Map(); // materialType -> count
    this.workshopCreations = []; // Modified/fused creations
    this.dismantleHistory = [];
    this.fuseHistory = [];
    this.legacyUnits = []; // Available legacy units for infusion
    this.unlockedOperations = new Set(['dismantle', 'modify']);
    this.totalCrafts = 0;
  }

  // Add a creation to inventory
  addCreation(card) {
    this.inventory.push({
      id: `inv-${Date.now()}-${Math.random()}`,
      card,
      addedAt: Date.now()
    });
  }

  // Dismantle a creation into materials
  dismantle(inventoryId) {
    const index = this.inventory.findIndex(item => item.id === inventoryId);
    if (index < 0) return { success: false, error: '造物不在库存中' };

    const item = this.inventory[index];
    const card = item.card;

    // Determine materials based on ability
    const materials = this.extractMaterials(card);

    // Add materials
    for (const mat of materials) {
      this.materials.set(mat.type, (this.materials.get(mat.type) || 0) + mat.count);
    }

    // Remove from inventory
    this.inventory.splice(index, 1);

    this.dismantleHistory.push({
      cardName: card.name,
      materials,
      timestamp: Date.now()
    });

    return {
      success: true,
      materials,
      remainingInventory: this.inventory.length
    };
  }

  // Extract materials from a card based on its ability
  extractMaterials(card) {
    const materials = [];
    const ability = card.ability || card.card?.ability;

    for (const [type, data] of Object.entries(MATERIAL_TYPES)) {
      if (data.source.includes(ability)) {
        materials.push({
          type,
          name: data.name,
          count: data.rarity === 'common' ? 2 : data.rarity === 'uncommon' ? 1 : 1,
          rarity: data.rarity
        });
      }
    }

    // Default material if no match
    if (materials.length === 0) {
      materials.push({ type: 'wood', name: '灵木', count: 1, rarity: 'common' });
    }

    return materials;
  }

  // Modify a creation
  modify(inventoryId, modType) {
    const item = this.inventory.find(i => i.id === inventoryId);
    if (!item) return { success: false, error: '造物不在库存中' };

    const operation = WORKSHOP_OPERATIONS.modify;

    // Check materials
    const hasMaterials = this.hasMaterials(operation.materialCost);
    if (!hasMaterials) {
      return { success: false, error: '材料不足' };
    }

    // Consume materials
    this.consumeMaterials(operation.materialCost);

    // Create workshop creation
    const workshopItem = new WorkshopCreation({
      baseCard: item.card
    });

    const result = workshopItem.applyModification(modType, operation.materialCost);
    if (!result.success) {
      // Refund materials
      this.materials.set('wood', (this.materials.get('wood') || 0) + operation.materialCost);
      return result;
    }

    this.workshopCreations.push(workshopItem);
    this.totalCrafts++;

    return {
      success: true,
      workshopItem,
      finalCard: workshopItem.getFinalCard(),
      remainingMaterials: this.getMaterialsSummary()
    };
  }

  // Fuse two creations into one
  fuse(inventoryIdA, inventoryIdB) {
    const itemA = this.inventory.find(i => i.id === inventoryIdA);
    const itemB = this.inventory.find(i => i.id === inventoryIdB);

    if (!itemA || !itemB) return { success: false, error: '造物不在库存中' };
    if (inventoryIdA === inventoryIdB) return { success: false, error: '不能融合同一个造物' };

    const operation = WORKSHOP_OPERATIONS.fuse;

    // Check materials
    if (!this.hasMaterials(operation.materialCost)) {
      return { success: false, error: '材料不足' };
    }

    // Consume materials
    this.consumeMaterials(operation.materialCost);

    // Determine fused ability
    const fusedAbility = this.determineFusedAbility(
      itemA.card.ability || itemA.card.card?.ability,
      itemB.card.ability || itemB.card.card?.ability
    );

    // Create fused card
    const fusedCard = {
      name: `${itemA.card.name}·${itemB.card.name}`,
      ability: fusedAbility,
      range: Math.max(itemA.card.range || 1, itemB.card.range || 1),
      duration: Math.max(itemA.card.duration || 1, itemB.card.duration || 1),
      cost: Math.ceil(((itemA.card.cost || 1) + (itemB.card.cost || 1)) / 2),
      stabilityCost: Math.max(itemA.card.stabilityCost || 0, itemB.card.stabilityCost || 0) + 1,
      description: `由「${itemA.card.name}」和「${itemB.card.name}」融合而成`,
      side_effect: '融合造物可能产生不可预知的效果',
      tags: ['fused', 'workshop'],
      isFused: true
    };

    // Validate through engine
    const validation = validationEngine.validate(fusedCard, {});

    const workshopItem = new WorkshopCreation({
      baseCard: fusedCard
    });

    // Remove source items
    this.inventory = this.inventory.filter(
      i => i.id !== inventoryIdA && i.id !== inventoryIdB
    );

    this.workshopCreations.push(workshopItem);
    this.fuseHistory.push({
      parents: [itemA.card.name, itemB.card.name],
      result: fusedCard.name,
      ability: fusedAbility,
      timestamp: Date.now()
    });
    this.totalCrafts++;

    return {
      success: true,
      workshopItem,
      finalCard: workshopItem.getFinalCard(),
      validation,
      remainingMaterials: this.getMaterialsSummary()
    };
  }

  // Determine fused ability from two abilities
  determineFusedAbility(abilityA, abilityB) {
    // Fusion table from abilities.js
    const key = `${abilityA}+${abilityB}`;
    if (FUSION_TABLE[key]) {
      return FUSION_TABLE[key];
    }

    // Default: return the first ability with "fused_" prefix
    return `fused_${abilityA}`;
  }

  // Infuse a legacy unit's trait into a creation
  infuse(inventoryId, legacyUnitId) {
    const item = this.inventory.find(i => i.id === inventoryId);
    if (!item) return { success: false, error: '造物不在库存中' };

    const legacyUnit = this.legacyUnits.find(u => u.id === legacyUnitId);
    if (!legacyUnit) return { success: false, error: '传承单位不可用' };

    const operation = WORKSHOP_OPERATIONS.infuse;

    if (!this.hasMaterials(operation.materialCost)) {
      return { success: false, error: '材料不足' };
    }

    this.consumeMaterials(operation.materialCost);

    const workshopItem = new WorkshopCreation({
      baseCard: item.card,
      legacyInfused: legacyUnitId
    });

    // Apply legacy trait as modification
    const traitEffect = legacyUnit.traits?.[0];
    if (traitEffect) {
      workshopItem.modifications.push({
        type: 'legacy_infusion',
        name: `传承注入：${traitEffect}`,
        timestamp: Date.now()
      });
    }

    this.workshopCreations.push(workshopItem);
    this.totalCrafts++;

    return {
      success: true,
      workshopItem,
      finalCard: workshopItem.getFinalCard(),
      legacyUnit: legacyUnit.name
    };
  }

  // Check if has enough materials
  hasMaterials(count) {
    const total = Array.from(this.materials.values()).reduce((sum, c) => sum + c, 0);
    return total >= count;
  }

  // Consume materials (uses any available)
  consumeMaterials(count) {
    let remaining = count;
    for (const [type, amount] of this.materials) {
      if (remaining <= 0) break;
      const consume = Math.min(amount, remaining);
      this.materials.set(type, amount - consume);
      remaining -= consume;
    }
  }

  // Get materials summary
  getMaterialsSummary() {
    const summary = {};
    for (const [type, count] of this.materials) {
      if (count > 0) {
        summary[type] = {
          name: MATERIAL_TYPES[type]?.name || type,
          count,
          rarity: MATERIAL_TYPES[type]?.rarity || 'common'
        };
      }
    }
    return summary;
  }

  // Get available modifications for a card
  getAvailableModifications(card) {
    const ability = card.ability || card.card?.ability;
    const available = [];

    for (const [type, mod] of Object.entries(MODIFICATIONS)) {
      if (mod.compatible[0] === 'all' || mod.compatible.includes(ability)) {
        available.push({ type, ...mod });
      }
    }

    return available;
  }

  // Get workshop statistics
  getStats() {
    return {
      inventorySize: this.inventory.length,
      workshopCreations: this.workshopCreations.length,
      totalCrafts: this.totalCrafts,
      dismantleCount: this.dismantleHistory.length,
      fuseCount: this.fuseHistory.length,
      materials: this.getMaterialsSummary(),
      unlockedOperations: Array.from(this.unlockedOperations)
    };
  }

  // Generate CLI visualization
  visualizeWorkshop() {
    const lines = [];
    const stats = this.getStats();

    lines.push('=== 造物者工坊 ===');
    lines.push(`库存: ${stats.inventorySize} | 工坊造物: ${stats.workshopCreations.length} | 总锻造: ${stats.totalCrafts}`);
    lines.push('');

    const materials = this.getMaterialsSummary();
    const matEntries = Object.entries(materials);
    if (matEntries.length > 0) {
      lines.push('--- 材料 ---');
      for (const [type, data] of matEntries) {
        const symbol = data.rarity === 'epic' ? '✦' : data.rarity === 'rare' ? '★' : data.rarity === 'uncommon' ? '◆' : '·';
        lines.push(`  ${symbol} ${data.name}: ${data.count}`);
      }
      lines.push('');
    }

    if (this.inventory.length > 0) {
      lines.push('--- 库存造物 ---');
      for (const item of this.inventory) {
        const card = item.card;
        lines.push(`  · ${card.name} (${card.ability || card.card?.ability})`);
      }
      lines.push('');
    }

    if (this.workshopCreations.length > 0) {
      lines.push('--- 工坊造物 ---');
      for (const wc of this.workshopCreations.slice(-3)) {
        const qualitySymbol = wc.quality === 'masterwork' ? '✦' : wc.quality === 'refined' ? '★' : '·';
        lines.push(`  ${qualitySymbol} ${wc.baseCard.name} [${wc.quality}] 稳定性:${wc.stability}%`);
        if (wc.modifications.length > 0) {
          lines.push(`     改造: ${wc.modifications.map(m => m.name).join(', ')}`);
        }
      }
    }

    return lines.join('\n');
  }

  // Unlock new operations (progression)
  unlockOperation(operation) {
    if (WORKSHOP_OPERATIONS[operation]) {
      this.unlockedOperations.add(operation);
      return { success: true, unlocked: operation };
    }
    return { success: false, error: '未知的操作类型' };
  }

  // Set available legacy units
  setLegacyUnits(units) {
    this.legacyUnits = units || [];
  }

  // Serialize
  serialize() {
    return {
      inventory: this.inventory,
      materials: Array.from(this.materials.entries()),
      workshopCreations: this.workshopCreations.map(wc => wc.serialize()),
      dismantleHistory: this.dismantleHistory,
      fuseHistory: this.fuseHistory,
      legacyUnits: this.legacyUnits,
      unlockedOperations: Array.from(this.unlockedOperations),
      totalCrafts: this.totalCrafts
    };
  }

  deserialize(data) {
    if (!data) return;
    this.inventory = data.inventory || [];
    this.materials = new Map(data.materials || []);
    this.workshopCreations = (data.workshopCreations || []).map(wc => WorkshopCreation.deserialize(wc));
    this.dismantleHistory = data.dismantleHistory || [];
    this.fuseHistory = data.fuseHistory || [];
    this.legacyUnits = data.legacyUnits || [];
    this.unlockedOperations = new Set(data.unlockedOperations || ['dismantle', 'modify']);
    this.totalCrafts = data.totalCrafts || 0;
  }
}

// Export singleton
export const creatorWorkshop = new CreatorWorkshop();
