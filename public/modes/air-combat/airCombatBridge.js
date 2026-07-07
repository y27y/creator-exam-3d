(function () {
  const CONTEXT_KEY = 'creatorExamAirCombatContext';
  const RESULT_KEY = 'creatorExamAirCombatResult';

  const BOSS_ROUTE = [
    {
      id: 'flood-echo',
      skywardBossIndex: 9,
      title: '洪水残响',
      memory: '第一天留下的水声还在天顶翻涌。',
      color: '#72d6bd',
      hp: 360,
      pattern: 'fan',
      lines: [
        '你曾把洪水举向天空，现在天空把它还给你。',
        '潮线不是水，是所有来不及撤离的脚步声。'
      ]
    },
    {
      id: 'fog-beacon',
      skywardBossIndex: 7,
      title: '迷雾航标',
      memory: '雾里所有被点亮的路标正在互相质问。',
      color: '#d8c58a',
      hp: 420,
      pattern: 'wall',
      lines: [
        '你给过他们方向，也给了迷雾模仿方向的机会。',
        '航标亮起时，别相信第一条路。'
      ]
    },
    {
      id: 'war-echo',
      skywardBossIndex: 2,
      title: '战争回声',
      memory: '两族战争被压缩成一枚会瞄准的弹。',
      color: '#f87171',
      hp: 500,
      pattern: 'aimed',
      lines: [
        '和平不是停火，是有人愿意替下一发子弹转向。',
        '所有没有说完的争辩，都变成了弹道。'
      ]
    },
    {
      id: 'beast-shadow',
      skywardBossIndex: 6,
      title: '巨兽阴影',
      memory: '巨兽的脚印漂浮在云层背面。',
      color: '#b8c2d6',
      hp: 580,
      pattern: 'spiral',
      lines: [
        '你驯服过影子，但影子仍记得牙齿。',
        '别让它靠近居民回声。'
      ]
    },
    {
      id: 'resident-oath',
      skywardBossIndex: 8,
      title: '居民誓约',
      memory: '被救下的人把名字刻进了机翼内侧。',
      color: '#f0a6ca',
      hp: 650,
      pattern: 'ring',
      lines: [
        '他们不是载荷，他们是你仍能转弯的理由。',
        '每个名字都在替你挡一次坠落。'
      ]
    },
    {
      id: 'final-order',
      skywardBossIndex: 10,
      title: '终考秩序',
      memory: '第六关的答案正在检查自己是否成立。',
      color: '#8bd3ff',
      hp: 760,
      pattern: 'mixed',
      lines: [
        '秩序从来不是静止，它只是崩塌前还愿意排队。',
        '第七天不收草稿，只收你真正守住的世界。'
      ]
    }
  ];

  const BOSS_AFFIXES = {
    armored: {
      key: 'armored',
      name: '装甲',
      color: '#8bd3ff',
      hpMult: 0.14,
      scoreMult: 1.1,
      line: '裂隙把旧失败铸成外壳，先剥掉它的耐心。'
    },
    rapid: {
      key: 'rapid',
      name: '急袭',
      color: '#f87171',
      fireMult: 0.82,
      scoreMult: 1.12,
      line: '它不再等待回合，只追问你反应还够不够快。'
    },
    berserker: {
      key: 'berserker',
      name: '狂暴',
      color: '#ff6b6b',
      elite: 'berserker',
      enemyBias: ['gunner', 'phantom', 'sniper'],
      spawnBias: 0.56,
      eliteHpMult: 0.92,
      eliteSpeedMult: 1.18,
      eliteFireMult: 0.78,
      eliteScoreMult: 1.5,
      line: '失控残影把敌机推入狂暴精英态，速度和开火节奏都会抬高。'
    },
    regenerator: {
      key: 'regenerator',
      name: '再生',
      color: '#69db7c',
      elite: 'regenerator',
      enemyBias: ['medium', 'gunner', 'detonator'],
      spawnBias: 0.46,
      eliteHpMult: 1.06,
      eliteScoreMult: 1.42,
      regenEvery: 2.6,
      regenPct: 0.08,
      line: '再生精英会周期缝合机体，别把低血目标留在空域里恢复。'
    },
    barrage: {
      key: 'barrage',
      name: '环幕',
      color: '#ff922b',
      attack: 'ring',
      every: 6.2,
      count: 14,
      speed: 230,
      damageMult: 0.78,
      scoreMult: 1.16,
      line: '环幕词缀会周期吐出整圈弹幕，贴脸输出前先给自己留一条退路。'
    },
    carrierWing: {
      key: 'carrierWing',
      name: '母舰残群',
      color: '#9775fa',
      enemyBias: ['carrier'],
      spawnBias: 0.4,
      scoreMult: 1.15,
      line: '母舰残群会在坠毁时裂出僚机，清场前别急着贴近残骸。'
    },
    prism: {
      key: 'prism',
      skywardBossIndex: 7,
      name: '棱镜',
      color: '#d8c58a',
      image: 'assets/images/bosses/boss-08-prism-judge.png',
      attack: 'prism',
      every: 5.6,
      warn: 0.55,
      scoreMult: 1.14,
      line: '光被折成竖直裂缝，别停在同一条航线里。'
    },
    prismBurst: {
      key: 'prismBurst',
      skywardBossIndex: 7,
      name: '棱爆',
      color: '#d8c58a',
      image: 'assets/images/bosses/boss-08-prism-judge.png',
      attack: 'prismBurst',
      every: 6.4,
      warn: 0.58,
      dur: 0.52,
      width: 38,
      count: 6,
      speed: 210,
      damageMult: 0.72,
      scoreMult: 1.18,
      line: '棱镜审判者回响会在光束结束时折出侧弹，别沿原路回头。'
    },
    ionStorm: {
      key: 'ionStorm',
      name: '离子风暴',
      color: '#cc5de8',
      attack: 'ionStorm',
      every: 4.2,
      warn: 0.72,
      dur: 0.5,
      width: 34,
      damage: 7,
      jitter: 190,
      scoreMult: 1.16,
      line: '离子风暴把航道切成周期镭射，预警亮起就横移脱离。'
    },
    phantom: {
      key: 'phantom',
      name: '亡名',
      color: '#f0a6ca',
      enemyBias: ['phantom'],
      spawnBias: 0.65,
      bulletRateMult: 1.06,
      line: '失去的名字靠近机翼，试图把航线改写成返航。'
    },
    breach: {
      key: 'breach',
      name: '破城',
      color: '#ff9f6e',
      hpMult: 0.08,
      enemyBias: ['jammer', 'support'],
      spawnBias: 0.48,
      line: '长夜没守住的缺口，正在空中重新开裂。'
    },
    jammer: {
      key: 'jammer',
      name: '扰频',
      color: '#15aabf',
      jamRadius: 300,
      weaponSlow: 1.25,
      scoreMult: 1.13,
      line: 'Boss 正在扩散扰频圈，贴得太近会拖慢造物武器。'
    },
    jammerCloud: {
      key: 'jammerCloud',
      name: '扰频云层',
      color: '#15aabf',
      enemyBias: ['jammer'],
      spawnBias: 0.42,
      scoreMult: 1.08,
      line: '扰频云层正在聚集干扰机，先切开云层再贴近 Boss。'
    },
    jammerElite: {
      key: 'jammerElite',
      name: '精英扰频',
      color: '#15aabf',
      elite: 'jammer',
      enemyBias: ['medium', 'gunner', 'sniper'],
      spawnBias: 0.44,
      eliteHpMult: 1.03,
      eliteScoreMult: 1.36,
      eliteJamRadius: 180,
      eliteWeaponSlow: 1.18,
      line: '精英扰频会让普通敌机也带上干扰圈，贴近时造物武器会变慢。'
    },
    sniperLockdown: {
      key: 'sniperLockdown',
      name: '狙击封锁',
      color: '#e64980',
      enemyBias: ['sniper'],
      spawnBias: 0.46,
      scoreMult: 1.12,
      line: '狙击封锁让预警线提前咬住航道，别在红线里犹豫。'
    },
    minefield: {
      key: 'minefield',
      name: '爆雷空域',
      color: '#fab005',
      enemyBias: ['detonator'],
      spawnBias: 0.44,
      bulletRateMult: 1.08,
      scoreMult: 1.16,
      line: '爆雷空域把导弹残骸改成自毁敌机，击杀后也要立刻转向。'
    },
    shieldWall: {
      key: 'shieldWall',
      name: '盾幕',
      color: '#74c0fc',
      enemyBias: ['shieldCarrier', 'warden'],
      spawnBias: 0.44,
      hpMult: 0.08,
      scoreMult: 1.12,
      line: '护盾运输机和监押机会把残影连成盾幕，先拆护盾再贴近 Boss。'
    },
    beaconTrace: {
      key: 'beaconTrace',
      name: '信标追迹',
      color: '#ffd43b',
      enemyBias: ['beacon', 'mirrorDrone'],
      spawnBias: 0.46,
      scoreMult: 1.11,
      line: '被点亮的旧路线会变成信标纵击，看到竖向预警就换航道。'
    },
    rearGuard: {
      key: 'rearGuard',
      name: '尾袭',
      color: '#ff6b6b',
      enemyBias: ['kamikaze', 'phaseWing'],
      spawnBias: 0.42,
      scoreMult: 1.13,
      line: '后追自爆机会从载体背后追上来，不要只盯着屏幕上缘。'
    },
    mineLayerRun: {
      key: 'mineLayerRun',
      name: '浮雷',
      color: '#ff922b',
      enemyBias: ['mineLayer', 'detonator'],
      spawnBias: 0.44,
      scoreMult: 1.13,
      line: '布雷机会把安全线切碎，补给和火力都要绕开浮雷触发圈。'
    },
    tetherNet: {
      key: 'tetherNet',
      name: '牵引网',
      color: '#20c997',
      enemyBias: ['tether', 'phaseWing'],
      spawnBias: 0.4,
      scoreMult: 1.12,
      line: '牵引机会轻拉载体航线，越贴近中心越难脱离。'
    },
    harvestRush: {
      key: 'harvestRush',
      name: '收割',
      color: '#fcc419',
      enemyBias: ['harvester', 'beacon'],
      spawnBias: 0.38,
      scoreMult: 1.14,
      line: '收割机会抢走补给并逃逸，别让它把前序奖励带走。'
    },
    support: {
      key: 'support',
      name: '修复',
      color: '#72d6bd',
      enemyBias: ['support'],
      spawnBias: 0.42,
      hpMult: 0.06,
      line: '裂隙残机开始互相缝补，拖久了就会变硬。'
    },
    escort: {
      key: 'escort',
      name: '护卫',
      color: '#51cf66',
      attack: 'escort',
      every: 7.5,
      enemy: 'gunner',
      maxAdds: 4,
      scoreMult: 1.14,
      line: 'Boss 正在投放重炮僚机，先处理护卫再回到主体。'
    },
    ewar: {
      key: 'ewar',
      name: '电子战',
      color: '#15aabf',
      attack: 'escort',
      every: 8.2,
      enemy: 'jammer',
      elite: 'jammer',
      maxAdds: 3,
      scoreMult: 1.18,
      line: '电子战词缀会周期投放扰频精英机，先拉开干扰圈再输出 Boss。'
    },
    ironCarrier: {
      key: 'ironCarrier',
      skywardBossIndex: 8,
      name: '铁幕',
      color: '#91a7ff',
      image: 'assets/images/bosses/boss-09-iron-carrier.png',
      attack: 'escort',
      every: 7.8,
      enemy: 'gunner',
      maxAdds: 3,
      guardDR: 0.28,
      guardWeakDur: 2.4,
      guardWeakDamageMult: 0.28,
      scoreMult: 1.19,
      line: '铁幕空母回响会让护卫替 Boss 承压，清掉护卫后甲板弱点短暂打开。'
    },
    phantomEscort: {
      key: 'phantomEscort',
      name: '幻影护航',
      color: '#22d3ee',
      attack: 'escort',
      every: 7,
      enemy: 'phantom',
      maxAdds: 4,
      scoreMult: 1.16,
      line: '幻影护航会周期投放高速残影僚机，别让它们把航线拖成返航。'
    },
    exposedCore: {
      key: 'exposedCore',
      name: '露核',
      color: '#ffd43b',
      attack: 'weak',
      every: 7.2,
      dur: 2.6,
      weakDamageMult: 0.35,
      scoreMult: 1.12,
      line: '裂隙核心会周期暴露，照亮它时把所有火力压进弱点窗口。'
    },
    repair: {
      key: 'repair',
      name: '维修',
      color: '#38d9a9',
      attack: 'repair',
      every: 6.8,
      healPct: 0.035,
      scoreMult: 1.17,
      line: '维修词缀会周期缝合 Boss 外壳，别把输出窗口拖成持久战。'
    },
    tideCore: {
      key: 'tideCore',
      skywardBossIndex: 9,
      name: '引潮',
      color: '#4dabf7',
      image: 'assets/images/bosses/boss-10-tide-core.png',
      attack: 'gravity',
      every: 7.1,
      warn: 0.82,
      dur: 2.1,
      radius: 230,
      strength: 92,
      scoreMult: 1.18,
      line: '引潮核心回响会先给圆形预警，再轻拉机体横向惯性。'
    }
  };

  const ROUTE_FILLER_AFFIX_KEYS = [
    'armored',
    'rapid',
    'support',
    'barrage',
    'minefield',
    'beaconTrace',
    'shieldWall',
    'tetherNet',
    'carrierWing'
  ];

  const WEAPON_MAP = {
    absorb_water: {
      name: '鲸潮护盾',
      description: '吸收部分弹幕并在造物脉冲中转化为护盾。',
      color: '#72d6bd',
      kind: 'shield'
    },
    illuminate: {
      name: '月树光束',
      description: '直线穿透弹，造物脉冲会清出一条光路。',
      color: '#d8c58a',
      kind: 'beam'
    },
    memory_beacon: {
      name: '记忆星矛',
      description: '高频双发弹，击败 Boss 后留下居民通讯。',
      color: '#b8c2d6',
      kind: 'spear'
    },
    dream_link: {
      name: '梦桥僚机',
      description: '复制移动轨迹的回声火力，造物脉冲短暂增援。',
      color: '#f0a6ca',
      kind: 'wing'
    },
    force_field: {
      name: '誓约护盾',
      description: '较稳的护盾载体，适合熵值较高的空域。',
      color: '#8bd3ff',
      kind: 'shield'
    },
    block: {
      name: '秩序重炮',
      description: '低频重弹，造物脉冲震碎近身敌弹。',
      color: '#f87171',
      kind: 'cannon'
    }
  };

  const RESONANCE_BY_KIND = {
    beam: {
      key: 'beam',
      name: '光路共鸣',
      effect: '主炮穿线更稳，分束棱镜展开一对低伤害副束。',
      color: '#d8c58a',
      damageBonus: 1,
      fireIntervalMult: 0.9,
      skillCooldownMult: 0.86,
      scoreMult: 1.04,
      splitPairs: 1
    },
    shield: {
      key: 'shield',
      name: '守夜共鸣',
      effect: '初始护盾提高，钛合装甲削减部分承伤。',
      color: '#8bd3ff',
      startingShield: 28,
      hpBonus: 10,
      damageTakenMult: 0.92,
      skillCooldownMult: 0.94
    },
    spear: {
      key: 'spear',
      name: '记忆共鸣',
      effect: '双发弹伤害提高，Boss 击破后回声结算更清晰。',
      color: '#b8c2d6',
      damageBonus: 1,
      scoreMult: 1.08
    },
    wing: {
      key: 'wing',
      name: '梦桥共鸣',
      effect: '额外僚机协同，近身残影更容易被清掉。',
      color: '#f0a6ca',
      allyWingsBonus: 1,
      fireIntervalMult: 0.96
    },
    cannon: {
      key: 'cannon',
      name: '秩序共鸣',
      effect: '钨芯重弹伤害提高、射速略慢，破甲弹芯对高生命目标增伤，并展开一对侧翼炮塔斜向清场。',
      color: '#f87171',
      damageBonus: 2,
      fireIntervalMult: 1.12,
      scoreMult: 1.06,
      armorPierceMult: 0.35,
      armorPierceMinHp: 12,
      sidePairs: 1
    }
  };

  function parseJson(value) {
    try { return JSON.parse(value); } catch (_error) { return null; }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function loadContext() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('context');
    if (fromQuery) {
      const decoded = parseJson(decodeURIComponent(fromQuery));
      if (decoded) return decoded;
    }
    try {
      return parseJson(localStorage.getItem(CONTEXT_KEY) || '') || {};
    } catch (_error) {
      return {};
    }
  }

  const context = loadContext();

  function residentsCount(value = context.rescuedResidents) {
    if (Array.isArray(value)) return value.length;
    const count = Number(value);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  }

  function lostCount(value = context.lostResidents) {
    if (Array.isArray(value)) return value.length;
    const count = Number(value);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  }

  function creations() {
    return Array.isArray(context.recentCreations) ? context.recentCreations : [];
  }

  function normalizeCreationNameValue(name, ability = '') {
    if (ability === 'consume_light') return '噬光黑核';
    return String(name || '未命名造物').replace(/噬光之灯/g, '噬光黑核');
  }

  function creationName(item) {
    if (typeof item === 'string') return normalizeCreationNameValue(item);
    return normalizeCreationNameValue(item?.name || item?.creationName || item?.card?.name, creationAbility(item));
  }

  function creationAbility(item) {
    return item && typeof item === 'object' ? item.ability || item.card?.ability || '' : '';
  }

  function creationDescription(item) {
    return item && typeof item === 'object' ? item.description || item.card?.description || '' : '';
  }

  function creationTags(item) {
    const tags = item && typeof item === 'object' ? item.tags || item.card?.tags || [] : [];
    return Array.isArray(tags) ? tags.filter(Boolean).slice(0, 5) : [];
  }

  function creationSummary(item) {
    return {
      name: creationName(item),
      ability: creationAbility(item),
      description: creationDescription(item),
      tags: creationTags(item)
    };
  }

  function endingPressure() {
    const value = Number(context.endingPressure);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : Math.max(0, Math.min(1, Number(context.entropy || 0) / 9));
  }

  function loreName(item) {
    if (typeof item === 'string') return item;
    return item?.title || item?.name || item?.summary || item?.id || '';
  }

  function discoveredLore() {
    return Array.isArray(context.discoveredLore) ? context.discoveredLore.map(loreName).filter(Boolean).slice(-3) : [];
  }

  function loreSignal() {
    const lore = discoveredLore();
    return lore.length ? `传说「${lore[lore.length - 1]}」正在成为航线锚点。` : '';
  }

  function playerStyleText() {
    if (typeof context.playerStyle === 'string') return context.playerStyle;
    try { return JSON.stringify(context.playerStyle || ''); } catch (_error) { return String(context.playerStyle || ''); }
  }

  function aggressiveStyle() {
    return /aggressive|attack|risk|decisive|进攻|激进|强攻|冒险|果断/.test(playerStyleText().toLowerCase());
  }

  function residentName(item) {
    if (typeof item === 'string') return item;
    return item?.name || item?.unitName || item?.residentName || item?.id || '';
  }

  function residentNames(value) {
    return Array.isArray(value) ? value.map(residentName).filter(Boolean) : [];
  }

  function communicator() {
    const rescued = residentNames(context.rescuedResidents);
    if (rescued.length) return { kind: 'rescued', name: rescued[0], role: '居民通讯员', line: `${rescued[0]}把地面坐标接入空域通讯。` };
    const lost = residentNames(context.lostResidents);
    if (lost.length) return { kind: 'lost', name: lost[0], role: '失踪幻听', line: `${lost[0]}的幻听从裂隙噪声里反复靠近。` };
    return { kind: 'echo', name: '无名回声', role: '裂隙回声', line: '没有居民接入，只剩裂隙回声替你报数。' };
  }

  function primaryCreation() {
    return creations().find(item => WEAPON_MAP[creationAbility(item)]) || creations()[0] || null;
  }

  let selectedWeaponIndex = 0;

  function weaponOption(baseAbility, creation, reason, focusText = '造物压缩') {
    const ability = baseAbility || creationAbility(creation);
    const fallback = {
      name: '裂隙光矛',
      description: '由白天残留的创造力压缩成的稳定直射武器。',
      color: '#72d6bd',
      kind: 'spear'
    };
    const weapon = WEAPON_MAP[ability] || fallback;
    return {
      ...weapon,
      sourceCreation: creationName(creation || '白天留下的造物'),
      sourceDescription: creationDescription(creation),
      sourceTags: creationTags(creation),
      ability: ability || 'unknown',
      focusText,
      reason
    };
  }

  function contextualWeaponOption(ability, sourceCreation, reason, focusText = '路线续构') {
    const weapon = WEAPON_MAP[ability];
    return {
      ...weapon,
      sourceCreation,
      sourceDescription: reason,
      sourceTags: [],
      ability,
      focusText,
      reason
    };
  }

  function isSustainWeaponOption(option) {
    return option?.kind === 'shield';
  }

  function sustainWeaponOption() {
    if (context.towerDefenseResult?.victory || residentsCount() > 0) {
      return contextualWeaponOption('force_field', '守夜生命线', '因为空域检测到此前有人被守住或救下，给出更稳的护盾续航方案。', '生命续航');
    }
    return contextualWeaponOption('absorb_water', '空域续航兜底', '因为当前三选一缺少护盾载体，空域补入一套保命续航方案。', '生命续航');
  }

  function weaponOptions() {
    const options = [];
    const seen = new Set();
    const add = option => {
      if (!option || seen.has(option.ability)) return;
      seen.add(option.ability);
      options.push(option);
    };
    for (const creation of creations().slice(-5).reverse()) {
      const ability = creationAbility(creation);
      if (!WEAPON_MAP[ability]) continue;
      add(weaponOption(ability, creation, `因为你之前创造了「${creationName(creation)}」，它被压缩成这套空域武器。`));
    }
    const firstCreation = primaryCreation();
    if (!options.length) {
      add(weaponOption('unknown', firstCreation, `因为「${creationName(firstCreation || '未命名造物')}」没有稳定武器型，裂隙先把它补全成通用光矛。`));
    }
    if (aggressiveStyle() || endingPressure() >= 0.66) {
      add(contextualWeaponOption('block', '进攻路线记录', '因为此前流程偏进攻或结局压力较高，空域给出秩序重炮方案。'));
    }
    if (context.towerDefenseResult?.victory || residentsCount() >= 2) {
      add(contextualWeaponOption('force_field', '守夜与居民回声', '因为你守住过地面秩序或救下居民，空域给出誓约护盾方案。'));
    }
    if (discoveredLore().length || lostCount() > 0) {
      add(contextualWeaponOption('memory_beacon', '传说与失落回声', '因为你发现过传说或留下失落居民回声，空域给出记忆星矢方案。'));
    }
    if (discoveredLore().length || Number(context.entropy || 0) >= 5) {
      add(contextualWeaponOption('illuminate', '高熵航线校准', '因为裂隙熵值或传说锚点已经显形，空域给出月树光束方案。'));
    }
    if (options.length < 3) add(contextualWeaponOption('dream_link', '残留梦境轨迹', '因为前序流程仍有未闭合的行动轨迹，空域给出梦桥僚机方案。', '备选航线'));
    if (options.length < 3) add(contextualWeaponOption('absorb_water', '灾害清算记录', '因为早期灾害仍在高空回响，空域给出鲤潮护盾方案。', '备选航线'));
    if (!options.some(isSustainWeaponOption)) {
      const sustain = sustainWeaponOption();
      if (sustain && !seen.has(sustain.ability)) {
        if (options.length >= 3) options[options.length - 1] = sustain;
        else add(sustain);
      }
    }
    return options.slice(0, 3);
  }

  function selectWeaponOption(index) {
    const options = weaponOptions();
    selectedWeaponIndex = Math.max(0, Math.min(options.length - 1, Number(index) || 0));
    return weaponLoadout();
  }

  function weaponLoadout() {
    const options = weaponOptions();
    return options[selectedWeaponIndex] || options[0] || weaponOption('unknown', primaryCreation(), '裂隙使用默认光矛维持空域载体。');
  }

  function routeResonance() {
    const weapon = weaponLoadout();
    const base = RESONANCE_BY_KIND[weapon.kind] || {
      key: 'default',
      name: '裂隙共鸣',
      effect: '白天残留的创造力维持基础火力。',
      color: weapon.color || '#72d6bd'
    };
    const defense = context.towerDefenseResult || {};
    const resonance = {
      damageBonus: 0,
      fireIntervalMult: 1,
      skillCooldownMult: 1,
      startingShield: 0,
      hpBonus: 0,
      allyWingsBonus: 0,
      scoreMult: 1,
      damageTakenMult: 1,
      lastStandShield: 0,
      armorPierceMult: 0,
      armorPierceMinHp: 12,
      armorCaliberDamage: 0,
      armorCaliberHpPerDamage: 15,
      armorCaliberMaxDamage: 4,
      vitalReactorDamageMult: 0,
      vitalReactorHpPerDamageMult: 20,
      vitalReactorMaxDamageMult: 0.2,
      bossHunterDamageMult: 0,
      bossHunterMaxDamageMult: 0.4,
      executionerThreshold: 0.4,
      executionerDamageMult: 0,
      executionerMaxDamageMult: 0.3,
      shieldAmplifierDamageMult: 0,
      shieldAmplifierMaxDamageMult: 0.18,
      missileVolleyBonus: 0,
      missileVolleyMaxBonus: 1,
      painConverterCooldownPerHp: 0,
      painConverterMaxCooldown: 0,
      pointDefenseRange: 0,
      repairLoopEvery: 0,
      repairLoopHealPct: 0,
      repairLoopShield: 0,
      repairLoopMaxShield: 0,
      signalFilterJamResist: 0,
      weakScannerDamageMult: 0,
      weakScannerDuration: 0,
      flowHpBonus: 0,
      livingArmorEvery: 0,
      livingArmorHp: 0,
      livingArmorMaxHp: 0,
      sourceCreation: weapon.sourceCreation,
      ...base,
      towerDefenseRelief: !!defense.victory
    };
    if (defense.victory) {
      resonance.startingShield = (Number(resonance.startingShield) || 0) + 16;
      resonance.hpBonus = (Number(resonance.hpBonus) || 0) + 8;
      if (residentsCount() > 0) {
        resonance.lastStandShield = Math.max(Number(resonance.lastStandShield) || 0, 34);
        resonance.effect = `${resonance.effect} 守夜黑匣子可抵消一次致命坠落。`;
      }
    }
    if ((Number(resonance.startingShield) || 0) > 0 || weapon.kind === 'shield') {
      resonance.shieldAmplifierDamageMult = resonance.shieldAmplifierMaxDamageMult;
      resonance.effect = `${resonance.effect} 护盾放大器会在护盾存在时提供全武器增伤 ${Math.round(resonance.shieldAmplifierDamageMult * 100)}%。`;
    }
    if (weapon.kind === 'shield') {
      resonance.repairLoopEvery = 14;
      resonance.repairLoopHealPct = 0.06;
      resonance.repairLoopShield = 8;
      resonance.repairLoopMaxShield = 36;
      resonance.effect = `${resonance.effect} 维修循环每 14 秒修复 6% 最大生命，满血时转为临时护盾。`;
    }
    const flowHpBonus = Math.max(0,
      residentsCount() * 4
      - lostCount() * 6
      + (defense.victory ? 12 : 0)
      + (Number(resonance.hpBonus) || 0)
    );
    resonance.flowHpBonus = flowHpBonus;
    if (flowHpBonus >= 20) {
      resonance.effect = `${resonance.effect} 机体构筑记录前置流程 +${flowHpBonus}HP。`;
    }
    resonance.armorCaliberDamage = Math.min(
      resonance.armorCaliberMaxDamage,
      Math.floor(flowHpBonus / resonance.armorCaliberHpPerDamage)
    );
    if (resonance.armorCaliberDamage > 0) {
      resonance.effect = `${resonance.effect} 装甲口径把前置流程的额外机体强度校准为主炮 +${resonance.armorCaliberDamage}。`;
    }
    resonance.vitalReactorDamageMult = Math.min(
      resonance.vitalReactorMaxDamageMult,
      Math.floor(flowHpBonus / resonance.vitalReactorHpPerDamageMult) * 0.04
    );
    if (resonance.vitalReactorDamageMult > 0) {
      resonance.effect = `${resonance.effect} 生命炉心把额外机体强度转成全武器增伤 ${Math.round(resonance.vitalReactorDamageMult * 100)}%。`;
    }
    resonance.bossHunterDamageMult = Math.min(
      resonance.bossHunterMaxDamageMult,
      discoveredLore().length * 0.08 + (endingPressure() >= 0.84 ? 0.12 : 0)
    );
    if (resonance.bossHunterDamageMult > 0) {
      resonance.effect = `${resonance.effect} 猎首协议把传说锚点校准为 Boss 增伤 ${Math.round(resonance.bossHunterDamageMult * 100)}%。`;
    }
    if (aggressiveStyle()) {
      resonance.executionerDamageMult = resonance.executionerMaxDamageMult;
      resonance.effect = `${resonance.effect} 处决算法把此前的进攻风格校准为低血目标增伤 ${Math.round(resonance.executionerDamageMult * 100)}%。`;
    }
    if (weapon.kind === 'cannon') {
      resonance.missileVolleyBonus = resonance.missileVolleyMaxBonus;
      resonance.effect = `${resonance.effect} 导弹齐射把秩序重炮展开为额外一发压制弹。`;
    }
    const painPressure = lostCount() + Math.max(0, Math.floor((endingPressure() - 0.76) * 10));
    if (painPressure > 0) {
      resonance.painConverterCooldownPerHp = Math.min(0.16, 0.08 + painPressure * 0.02);
      resonance.painConverterMaxCooldown = Math.min(4.2, 2.6 + painPressure * 0.4);
      resonance.effect = `${resonance.effect} 痛觉转换会把承伤回写为造物脉冲冷却。`;
    }
    if (residentsCount() >= 2 || weapon.kind === 'spear') {
      resonance.pointDefenseRange = Math.min(190, 126 + residentsCount() * 12 + (weapon.kind === 'spear' ? 24 : 0));
      resonance.effect = `${resonance.effect} 近防协议会在击杀点清除附近敌弹。`;
    }
    if (weapon.kind === 'shield' || (defense.victory && residentsCount() >= 2)) {
      resonance.livingArmorEvery = 12;
      resonance.livingArmorHp = 3;
      resonance.livingArmorMaxHp = 30;
      resonance.effect = `${resonance.effect} 活性装甲会每 12 次清敌成长 +3HP，上限 +30HP。`;
    }
    if (weapon.kind === 'beam' || weapon.kind === 'spear' || discoveredLore().length > 0) {
      resonance.weakScannerDamageMult = 0.25;
      resonance.weakScannerDuration = 0.4;
      resonance.effect = `${resonance.effect} 弱点标定会延长露核窗口 0.4 秒，并提高弱点伤害 25%。`;
    }
    const abilityText = creations().map(creationAbility).join(' ');
    const antiJamSeed = /illuminate|memory_beacon|dream_link|guide/.test(abilityText) || weapon.kind === 'spear' || weapon.kind === 'wing';
    if (antiJamSeed || defense.victory) {
      resonance.signalFilterJamResist = Math.min(0.28, 0.14 + (antiJamSeed ? 0.06 : 0) + (defense.victory ? 0.04 : 0) + Math.min(0.04, residentsCount() * 0.01));
      resonance.effect = `${resonance.effect} 抗干扰滤波会削弱扰频减速 ${Math.round(resonance.signalFilterJamResist * 100)}%。`;
    }
    return resonance;
  }

  function skywardBossSignals() {
    const loreText = discoveredLore()
      .map(item => [item.title, item.text, item.summary, item.description].filter(Boolean).join(' '))
      .join(' ');
    const creationText = creations()
      .map(creation => [creationName(creation), creationDescription(creation), creationAbility(creation), ...(creationTags(creation) || [])].filter(Boolean).join(' '))
      .join(' ');
    const defense = context.towerDefenseResult || {};
    const text = [
      context.skywardRaidUpdate,
      context.airCombatUpdate,
      context.aiBrief,
      context.narrativeBrief,
      defense.name,
      defense.summary,
      defense.brief,
      loreText,
      creationText
    ].filter(Boolean).join(' ');
    const signals = [];
    const add = (key, name, reason) => {
      if (!signals.some(signal => signal.key === key)) signals.push({ key, name, reason });
    };
    if (/棱镜|审判者|prism|折射/i.test(text)) add('prismBurst', '棱镜审判者', 'Skyward 最新 Boss 设计里的折射光束被 AI 简报识别为空域棱爆词缀。');
    if (/铁幕|空母|护卫编队|甲板|carrier|deck/i.test(text)) add('ironCarrier', '铁幕空母', 'Skyward 最新 Boss 设计里的护卫编队被 AI 简报识别为空域铁幕词缀。');
    if (/引潮|潮汐|重力|gravity|tide/i.test(text)) add('tideCore', '引潮核心', 'Skyward 最新 Boss 设计里的重力潮汐被 AI 简报识别为空域引潮词缀。');
    return signals;
  }

  function contextualAffixKeys() {
    const entropy = Number(context.entropy || 0);
    const pressure = endingPressure();
    const defense = context.towerDefenseResult || null;
    const abilityText = creations().map(creationAbility).join(' ');
    const lightRoute = /illuminate|force_field|memory_beacon|guide/.test(abilityText);
    const keys = [];
    for (const signal of skywardBossSignals()) keys.push(signal.key);
    if (entropy >= 8 || lightRoute) keys.push('ionStorm');
    if (entropy >= 7) keys.push('prism');
    else if (entropy >= 4) keys.push('rapid');
    if ((lightRoute && (pressure >= 0.66 || discoveredLore().length > 0)) || (aggressiveStyle() && pressure >= 0.66)) keys.push('exposedCore');
    if (pressure >= 0.82) keys.push('armored');
    if (pressure >= 0.72 && /block|memory_beacon|force_field/.test(abilityText)) keys.push('sniperLockdown');
    if (lostCount() > 0) keys.push('phantom');
    if (lostCount() > 0 && pressure >= 0.62) keys.push('phantomEscort');
    if (lostCount() > 0 && entropy >= 4) keys.push('berserker');
    if (residentsCount() >= 4 || /block|force_field/.test(abilityText)) keys.push('escort');
    if (defense && defense.victory === false) keys.push('breach', 'jammer');
    if (defense && defense.victory === false && /memory_beacon|dream_link|guide/.test(abilityText)) keys.push('ewar');
    if (defense?.victory && pressure >= 0.75) keys.push('repair');
    if (entropy >= 5 || pressure >= 0.68) keys.push('barrage');
    if (entropy >= 6 || pressure >= 0.7 || /absorb_water|block|force_field/.test(abilityText)) keys.push('minefield');
    if (defense?.victory && (pressure >= 0.66 || residentsCount() >= 2)) keys.push('regenerator');
    if (entropy >= 6 || residentsCount() >= 3 || lostCount() >= 2) keys.push('carrierWing');
    if (entropy >= 6 || /absorb_water|force_field|dream_link/.test(abilityText)) keys.push('tetherNet');
    if (pressure >= 0.7 && /block|force_field|memory_beacon/.test(abilityText)) keys.push('shieldWall');
    if (/illuminate|memory_beacon|dream_link|guide/.test(abilityText)) keys.push('beaconTrace');
    if (entropy >= 6 || pressure >= 0.74) keys.push('mineLayerRun');
    if (aggressiveStyle() || entropy >= 5) keys.push('rearGuard');
    if (defense?.victory && pressure >= 0.62) keys.push('harvestRush');
    if (/memory_beacon|dream_link|guide/.test(abilityText)) keys.push('jammerElite');
    if (entropy >= 6 || /memory_beacon|dream_link|guide/.test(abilityText)) keys.push('jammerCloud');
    if (/illuminate|memory_beacon|dream_link|guide/.test(abilityText)) keys.push('support');
    if (!keys.length) keys.push('armored');
    if (keys.length === 1) keys.push(residentsCount() >= 3 ? 'support' : 'rapid');
    const unique = [...new Set(keys)];
    for (const key of ROUTE_FILLER_AFFIX_KEYS) {
      if (unique.length >= BOSS_ROUTE.length) break;
      if (!unique.includes(key)) unique.push(key);
    }
    return unique;
  }

  function affixForStage(index) {
    const keys = contextualAffixKeys();
    return BOSS_AFFIXES[keys[index % keys.length]] || BOSS_AFFIXES.armored;
  }

  function route() {
    const entropy = Number(context.entropy || 0);
    const pressure = Math.max(0, Math.min(3, Math.max(Math.floor(entropy / 3), Math.floor(endingPressure() * 3))));
    const lore = loreSignal();
    return BOSS_ROUTE.map((boss, index) => ({
      ...boss,
      memory: lore && index === BOSS_ROUTE.length - 1 ? `${boss.memory}${lore}` : boss.memory,
      affix: affixForStage(index),
      hp: boss.hp + pressure * 55 + index * 20,
      stage: index + 1
    }));
  }

  function fallbackBrief() {
    const names = creations().map(creationName).filter(Boolean).slice(0, 2).join('、') || '白天留下的造物';
    const rescued = residentsCount();
    const comm = communicator();
    const lore = loreSignal();
    const skyward = skywardBossSignals().map(signal => signal.name).join('、');
    return `第六关和长夜之后，${names}被压缩为空域载体。${rescued}名居民的回声在通讯里等待第七天清算；${comm.line}${skyward ? ` Skyward更新回响：${skyward}。` : ''}${lore ? ` ${lore}` : ''}`;
  }

  function briefingSlides() {
    const weapon = weaponLoadout();
    const resonance = routeResonance();
    return [
      { kicker: '第六关之后', title: '第七天抵达', text: fallbackBrief() },
      { kicker: '造物压缩', title: weapon.name, text: `「${weapon.sourceCreation}」被压缩为空域武器。${weapon.description}` },
      { kicker: '清算航线', title: resonance.name, text: `6 段 Boss 航线已锁定：${route().map(boss => `${boss.affix.name}·${boss.title}`).join(' / ')}。最终压力 ${Math.round(endingPressure() * 100)}%。${loreSignal()}` }
    ];
  }

  function difficulty() {
    const entropy = Number(context.entropy || 0);
    const defense = context.towerDefenseResult || {};
    const defenseRelief = defense.victory ? 0.85 : 1.12;
    const resonance = routeResonance();
    return {
      enemyRate: Math.max(0.72, Math.min(1.35, (0.9 + entropy * 0.035) * defenseRelief)),
      bulletRate: Math.max(0.8, Math.min(1.45, 0.95 + entropy * 0.04 + lostCount() * 0.04)),
      playerHp: Math.max(70, 110 + residentsCount() * 4 - lostCount() * 6 + (defense.victory ? 12 : -8) + (resonance.hpBonus || 0)),
      allyWings: Math.min(4, Math.floor(residentsCount() / 2) + (resonance.allyWingsBonus || 0)),
      startingShield: Math.max(0, resonance.startingShield || 0),
      lastStandShield: Math.max(0, resonance.lastStandShield || 0),
      fieldRepair: defense.victory && residentsCount() >= 4
        ? { name: '纳米修复', healPct: 0.02, delay: 4, tick: 1 }
        : null
    };
  }

  function stripTrailingEllipsis(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .replace(/(?:\.\.\.|…|……)+$/g, '')
      .replace(/[，,；;：:、-]+$/g, '')
      .trim();
  }

  function softenRepeatedLead(text, word, replacements) {
    let count = 0;
    return String(text || '').replace(new RegExp(word, 'g'), () => {
      count += 1;
      if (count <= 2) return word;
      return replacements[(count - 3) % replacements.length];
    });
  }

  function polishNarrative(text) {
    let clean = stripTrailingEllipsis(text);
    clean = softenRepeatedLead(clean, '那些', ['这些', '余下的', '前面留下的']);
    clean = softenRepeatedLead(clean, '未曾', ['还没', '没有']);
    return stripTrailingEllipsis(clean);
  }

  function cleanNarrative(text, max = 170) {
    const clean = polishNarrative(text);
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max);
    const end = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；'), cut.lastIndexOf('，'), cut.lastIndexOf(' '));
    return polishNarrative(cut.slice(0, end > max * 0.6 ? end + 1 : max).replace(/[，,；;。！？.!?]+$/g, ''));
  }

  function airspaceStyleGuide(eventType) {
    if (!String(eventType || '').startsWith('airspace_')) return '';
    return '空战通讯要短促、具体、偏战术，40-90字；优先点名当前武器、来源造物、Boss航线或前序结果；避免连续排比，避免反复使用“那些/未曾/裂隙/清算”，不要用省略号收尾。';
  }

  function airspaceKeyFacts(weapon, extraContext = {}) {
    return [
      `武器「${weapon.name}」来自「${weapon.sourceCreation}」`,
      weapon.focusText ? `武器定位：${weapon.focusText}` : '',
      extraContext.boss?.title ? `当前Boss：${extraContext.boss.title}` : '',
      extraContext.route ? `航线：${extraContext.route}` : '',
      skywardBossSignals().length ? `Skyward更新回响：${skywardBossSignals().map(signal => `${signal.name}→${BOSS_AFFIXES[signal.key]?.name || signal.key}`).join('、')}` : '',
      residentsCount() ? `已救下${residentsCount()}名居民` : '没有居民通讯员接入',
      lostCount() ? `失去${lostCount()}名居民` : '',
      creations().length ? `前序造物：${creations().map(creationName).filter(Boolean).slice(-3).join('、')}` : ''
    ].filter(Boolean);
  }

  function worldState(extra = {}) {
    const comm = communicator();
    const creationNames = creations().map(creationName).filter(Boolean).slice(-5);
    return {
      currentLevel: context.regionId || 'final-exam',
      currentLevelTitle: context.regionTitle || '第七天裂隙空域',
      entropy: Number(context.entropy || 0),
      endingPressure: endingPressure(),
      rescued: residentsCount(),
      lost: lostCount(),
      rescuedResidents: residentNames(context.rescuedResidents).slice(0, 5),
      lostResidents: residentNames(context.lostResidents).slice(0, 5),
      creations: creationNames,
      recentCreations: creations().map(creationSummary).filter(item => item.name).slice(-5),
      discoveredLore: discoveredLore(),
      towerDefenseResult: context.towerDefenseResult || null,
      playStyle: context.playerStyle || '未知',
      playerStyle: context.playerStyle || '未知',
      routeResonance: routeResonance().name,
      skywardBossSignals: skywardBossSignals().map(signal => signal.name),
      skywardBossSignalReasons: skywardBossSignals().map(signal => signal.reason),
      airspaceAffixes: route().map(boss => `${boss.affix.name}·${boss.title}`),
      communicator: `${comm.name}（${comm.role}）`,
      ...extra
    };
  }

  async function requestAirCombatText(eventType, fallbackText, extraContext = {}) {
    if (typeof fetch !== 'function') return '';
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 6500) : null;
    const weapon = weaponLoadout();
    try {
      const response = await fetch('/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller?.signal,
        body: JSON.stringify({
          type: 'event',
          playerInput: fallbackText,
          context: {
            eventType,
            characters: [
              ...residentNames(context.rescuedResidents).slice(0, 3),
              ...residentNames(context.lostResidents).slice(0, 2)
            ],
            communicator: communicator(),
            location: context.regionTitle || '第七天裂隙空域',
            result: '第七天裂隙空域正在把地面考核记忆清算成 Boss 航线。',
            weapon: weapon.name,
            weaponSource: weapon.sourceCreation,
            weaponSourceDescription: weapon.sourceDescription,
            weaponSourceTags: weapon.sourceTags,
            styleGuide: airspaceStyleGuide(eventType),
            keyFacts: airspaceKeyFacts(weapon, extraContext),
            ...extraContext
          },
          worldState: worldState(extraContext.worldState || {})
        })
      });
      if (!response.ok) return '';
      const data = await response.json();
      const max = eventType === 'airspace_brief' ? 340 : 130;
      return cleanNarrative(data?.text || data?.narrative || '', max);
    } catch (_error) {
      return '';
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function lineFor(event, boss = null) {
    const weapon = weaponLoadout();
    const comm = communicator();
    if (event === 'weapon') return `${comm.name}确认${weapon.name}副作用：${weapon.description}`;
    if (event === 'near') return comm.kind === 'rescued'
      ? `${comm.name}提醒：裂隙残影贴近机翼，立刻拉开。`
      : `${comm.name}在噪声里重复：残影贴近机翼，别回头。`;
    if (event === 'victory') return `${comm.name}记录：第七天没有被消灭，它只是终于愿意让世界继续。`;
    if (event === 'defeat') return `${comm.name}失去信号：空域载体坠回裂隙，世界还需要下一次清算。`;
    if (event === 'boss-defeated' && boss) return `${comm.name}记录${boss.title}被清算，${boss.memory}`;
    if (event === 'boss' && boss?.affix) return `${boss.affix.name}·${boss.title}进入航线。${boss.affix.line}`;
    if (event === 'boss-phase' && boss?.affix) return `${boss.title}换相，${boss.affix.line}`;
    if (boss) return boss.lines[Math.min(boss.lines.length - 1, Math.floor(Math.random() * boss.lines.length))];
    return fallbackBrief();
  }

  function syncChrome() {
    document.title = '第七天裂隙空域 - 造物者考核3D';
    const brief = document.getElementById('airspace-brief');
    const loadout = document.getElementById('airspace-loadout');
    const weapon = weaponLoadout();
    const resonance = routeResonance();
    const fallback = fallbackBrief();
    if (brief) {
      brief.textContent = fallback;
      requestAirCombatText('airspace_brief', fallback, {
        route: route().map(boss => `${boss.stage}.${boss.affix.name}·${boss.title}`).join(' / '),
        weapon: weapon.name,
        resonance: resonance.name
      }).then(text => {
        if (text && brief.textContent === fallback) brief.textContent = text;
      });
    }
    if (loadout) {
      loadout.innerHTML = `
        <div><strong>${escapeHtml(weapon.name)}</strong> 来自「${escapeHtml(weapon.sourceCreation)}」</div>
        ${weapon.reason ? `<div>选择依据：${escapeHtml(weapon.reason)}</div>` : ''}
        <div>${escapeHtml(weapon.description)}</div>
        ${weapon.sourceDescription ? `<div>造物原意：${escapeHtml(weapon.sourceDescription)}</div>` : ''}
        <div>共鸣：<strong>${escapeHtml(resonance.name)}</strong> · ${escapeHtml(resonance.effect)}</div>
        <div>通讯：<strong>${escapeHtml(communicator().name)}</strong> · ${escapeHtml(communicator().role)}</div>
        ${loreSignal() ? `<div>传说：${escapeHtml(loreSignal())}</div>` : ''}
        <div>航线：6 段 Boss 清算 · 熵值 ${Number(context.entropy || 0)} · 词缀 ${escapeHtml(route().map(boss => boss.affix.name).join(' / '))}</div>
      `;
    }
  }

  function publishResult(result) {
    const payload = {
      id: result.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      mode: 'rift_airspace',
      day: 7,
      regionId: context.regionId || 'final-exam',
      outcome: result.outcome || 'defeat',
      score: Math.max(0, Math.round(result.score || 0)),
      clearedLayers: result.clearedLayers || 0,
      bossDefeated: result.bossDefeated || [],
      cleanClears: Math.max(0, Math.round(result.cleanClears || 0)),
      damageTaken: Math.max(0, Math.round(result.damageTaken || 0)),
      creationOverload: result.creationOverload || 0,
      painConverted: Math.max(0, Math.round((result.painConverted || 0) * 10) / 10),
      pointDefenseCleared: Math.max(0, Math.round(result.pointDefenseCleared || 0)),
      livingArmorHpGained: Math.max(0, Math.round(result.livingArmorHpGained || 0)),
      jammedTime: Math.max(0, Math.round(result.jammedTime || 0)),
      rescuedEchoes: result.rescuedEchoes || 0,
      endingModifier: result.endingModifier || (result.outcome === 'victory' ? 'airspace_cleansed' : 'airspace_scarred'),
      weapon: weaponLoadout(),
      resonance: routeResonance(),
      communicator: communicator(),
      affixes: result.affixes || route().map(boss => `${boss.affix.name}·${boss.title}`),
      notableMoment: result.notableMoment || lineFor(result.outcome === 'victory' ? 'victory' : 'defeat')
    };
    try { localStorage.setItem(RESULT_KEY, JSON.stringify(payload)); } catch (_error) {}
    try {
      if (window.opener && window.opener !== window) {
        window.opener.postMessage({ type: 'creator_exam_air_combat_result', result: payload }, window.location.origin);
      }
    } catch (_error) {}
    return payload;
  }

  function returnToMain() {
    try {
      if (window.opener && window.opener !== window) {
        window.opener.focus();
        window.close();
        return;
      }
    } catch (_error) {}
    window.location.href = '../../index.html';
  }

  window.AirCombatBridge = {
    context,
    route,
    difficulty,
    weaponOptions,
    selectWeaponOption,
    weaponLoadout,
    routeResonance,
    communicator,
    discoveredLore,
    loreSignal,
    skywardBossSignals,
    contextualAffixKeys,
    briefingSlides,
    lineFor,
    requestAirCombatText,
    syncChrome,
    publishResult,
    returnToMain,
    keys: { context: CONTEXT_KEY, result: RESULT_KEY }
  };

  syncChrome();
})();
