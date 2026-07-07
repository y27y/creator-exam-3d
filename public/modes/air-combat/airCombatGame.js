(function () {
  const bridge = window.AirCombatBridge;
  const assets = window.AirCombatAssets || null;
  assets?.load();
  const canvas = document.getElementById('airspace-canvas');
  const ctx = canvas.getContext('2d');
  const hudStage = document.getElementById('hud-stage');
  const hudAffix = document.getElementById('hud-affix');
  const hudWeapon = document.getElementById('hud-weapon');
  const hudScore = document.getElementById('hud-score');
  const hud = document.getElementById('airspace-hud');
  const hudToggles = Array.from(document.querySelectorAll('.hud-toggle'));
  const hudPanels = Array.from(document.querySelectorAll('.hud-panel'));
  const comm = document.getElementById('airspace-comm');
  const menu = document.getElementById('airspace-menu');
  const menuKicker = menu.querySelector('.menu-kicker');
  const menuTitle = menu.querySelector('h1');
  const brief = document.getElementById('airspace-brief');
  const choices = document.getElementById('airspace-choices');
  const loadout = document.getElementById('airspace-loadout');
  const resultPanel = document.getElementById('airspace-result');
  const resultTitle = document.getElementById('result-title');
  const resultBody = document.getElementById('result-body');
  const clearanceCard = document.getElementById('airspace-clearance-card');
  const clearanceKicker = document.getElementById('clearance-kicker');
  const clearanceTitle = document.getElementById('clearance-title');
  const clearanceBody = document.getElementById('clearance-body');
  const skillBtn = document.getElementById('airspace-skill');
  const startBtn = document.getElementById('airspace-start');
  const W = canvas.width;
  const H = canvas.height;
  const DEG = Math.PI / 180;
  let hudCloseTimer = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function dist2(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function hit(a, b) {
    const r = a.r + b.r;
    return dist2(a, b) <= r * r;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function shipKeyForLoadout(_difficulty, weapon, resonance = {}) {
    if (weapon?.kind === 'shield' || (resonance.damageTakenMult || 1) < 1) return 'defender';
    if (weapon?.kind === 'wing' || (resonance.sidePairs || 0) > 0 || (resonance.missileVolleyBonus || 0) > 0) return 'scout';
    if (weapon?.kind === 'cannon' || (resonance.bossHunterDamageMult || 0) > 0 || (resonance.executionerDamageMult || 0) > 0) return 'attacker';
    return 'balanced';
  }

  const bossImageCache = new Map();
  function bossImage(src) {
    if (!src || typeof Image === 'undefined') return null;
    if (!bossImageCache.has(src)) {
      const img = new Image();
      img.src = src;
      bossImageCache.set(src, img);
    }
    const img = bossImageCache.get(src);
    return img?.complete && img.naturalWidth > 0 ? img : null;
  }

  function bossImageFor(def, affix) {
    const index = affix?.skywardBossIndex ?? def?.skywardBossIndex;
    return (assets ? assets.boss(index) : null) || bossImage(affix?.image);
  }

  function backgroundWorldForRoute(route, entropy = 0) {
    const text = route.map(boss => [boss.id, boss.title, boss.memory, boss.affix?.key, boss.affix?.name].filter(Boolean).join(' ')).join(' ');
    if (/tide|gravity|flood|water|寮曟疆|娼|閲嶅姏|姘?/.test(text)) return 8;
    if (/iron|carrier|warden|guard|resident|oath|閾佸箷|绌烘瘝|鎶ゅ崼|灞呮皯/.test(text)) return 7;
    if (/prism|light|fog|beacon|妫遍暅|鎶樺皠|杩烽浘|鑸爣/.test(text)) return 6;
    return clamp(1 + Math.floor((Number(entropy) || 0) % 8), 1, 8);
  }

  const SKYWARD_BOSS_PROTOTYPES = {
    0: { movement: 'sweep', moveSpeed: 1.1, moveRange: 170, phases: [
      { cd: 1.3, attacks: [{ type: 'fanDown', count: 5, spread: 55, speed: 250 }] },
      { cd: 0.9, attacks: [{ type: 'aimed', count: 3, spread: 16, speed: 280 }] },
      { cd: 1.05, attacks: [{ type: 'ring', count: 18, speed: 225 }, { type: 'fanDown', count: 6, spread: 60, speed: 250 }] }
    ] },
    1: { movement: 'figure8', moveSpeed: 1, moveRange: 150, phases: [
      { cd: 0.16, attacks: [{ type: 'spiral', arms: 2, step: 19, speed: 170 }] },
      { cd: 0.85, attacks: [{ type: 'aimed', count: 5, spread: 22, speed: 260 }] },
      { cd: 0.14, attacks: [{ type: 'spiral', arms: 3, step: 26, speed: 190 }] }
    ] },
    2: { movement: 'dart', dartEvery: 2.2, phases: [
      { cd: 1.6, attacks: [{ type: 'wall', spacing: 46, gap: 100, speed: 180 }] },
      { cd: 0.8, attacks: [{ type: 'aimed', count: 5, spread: 26, speed: 270 }] },
      { cd: 1.4, attacks: [{ type: 'wall', spacing: 40, gap: 90, speed: 200 }, { type: 'ring', count: 12, speed: 210 }] }
    ] },
    3: { movement: 'sweep', moveSpeed: 1.5, moveRange: 190, phases: [
      { cd: 1, attacks: [{ type: 'ring', count: 16, speed: 220 }, { type: 'aimed', count: 3, spread: 14, speed: 280 }] },
      { cd: 0.15, attacks: [{ type: 'spiral', arms: 3, step: 23, speed: 200 }] },
      { cd: 1.2, attacks: [{ type: 'ring', count: 20, speed: 230 }, { type: 'wall', spacing: 44, gap: 80, speed: 190 }] }
    ] },
    4: { movement: 'figure8', moveSpeed: 1.2, moveRange: 170, phases: [
      { cd: 0.9, attacks: [{ type: 'fanDown', count: 7, spread: 70, speed: 250 }, { type: 'aimed', count: 3, spread: 12, speed: 290 }] },
      { cd: 0.14, attacks: [{ type: 'spiral', arms: 4, step: 21, speed: 200 }] },
      { cd: 1, attacks: [{ type: 'ring', count: 22, speed: 230 }, { type: 'wall', spacing: 38, gap: 80, speed: 200 }, { type: 'laser', warn: 0.6, dur: 0.9, width: 50, cd: 4.8, aimed: true }] }
    ] },
    5: { movement: 'figure8', moveSpeed: 1.3, moveRange: 180, phases: [
      { cd: 0.85, attacks: [{ type: 'fanDown', count: 8, spread: 80, speed: 260 }, { type: 'aimed', count: 3, spread: 12, speed: 300 }] },
      { cd: 0.13, attacks: [{ type: 'spiral', arms: 4, step: 20, speed: 210 }, { type: 'laser', warn: 0.55, dur: 0.9, width: 54, cd: 3.8, aimed: true }] },
      { cd: 0.95, attacks: [{ type: 'ring', count: 24, speed: 240 }, { type: 'wall', spacing: 36, gap: 76, speed: 210 }, { type: 'laser', warn: 0.5, dur: 1, width: 60, cd: 3.2, aimed: true }] }
    ] },
    6: { movement: 'figure8', moveSpeed: 1.4, moveRange: 190, phases: [
      { cd: 0.8, attacks: [{ type: 'fanDown', count: 9, spread: 85, speed: 270 }, { type: 'aimed', count: 4, spread: 14, speed: 300 }] },
      { cd: 0.12, attacks: [{ type: 'spiral', arms: 5, step: 18, speed: 220 }, { type: 'laser', warn: 0.5, dur: 0.9, width: 56, cd: 3.5, aimed: true }] },
      { cd: 0.85, attacks: [{ type: 'ring', count: 26, speed: 250 }, { type: 'wall', spacing: 34, gap: 72, speed: 220 }, { type: 'laser', warn: 0.45, dur: 1, width: 64, cd: 2.8, aimed: true }] }
    ] },
    7: { movement: 'sweep', moveSpeed: 1.35, moveRange: 190, phases: [
      { cd: 1.05, attacks: [{ type: 'laser', warn: 0.6, dur: 0.75, width: 46, cd: 4.2, aimed: true }, { type: 'fanDown', count: 5, spread: 62, speed: 265 }] },
      { cd: 1, attacks: [{ type: 'prismBurst', warn: 0.55, dur: 0.7, width: 48, cd: 4, count: 6, speed: 205 }, { type: 'wall', spacing: 48, gap: 100, speed: 195 }] },
      { cd: 0.92, attacks: [{ type: 'dualLaser', warn: 0.55, dur: 0.85, width: 42, cd: 3.5, offset: 82 }, { type: 'spiral', arms: 2, step: 18, speed: 200 }] }
    ] },
    8: { movement: 'figure8', moveSpeed: 1, moveRange: 135, phases: [
      { cd: 1.25, attacks: [{ type: 'escort', enemy: 'medium', adds: 2, maxAdds: 4 }, { type: 'fanDown', count: 6, spread: 64, speed: 255 }] },
      { cd: 1.05, attacks: [{ type: 'escort', enemy: 'warden', adds: 1, maxAdds: 4 }, { type: 'wall', spacing: 42, gap: 92, speed: 205 }] },
      { cd: 0.95, attacks: [{ type: 'escort', enemy: 'gunner', elite: 'berserker', adds: 2, maxAdds: 5 }, { type: 'ring', count: 22, speed: 235 }, { type: 'aimed', count: 3, spread: 16, speed: 300 }] }
    ] },
    9: { movement: 'dart', dartEvery: 2, phases: [
      { cd: 1.2, attacks: [{ type: 'gravity', warn: 0.8, dur: 2, radius: 410, strength: 85 }, { type: 'ring', count: 16, speed: 190 }] },
      { cd: 1.05, attacks: [{ type: 'gravity', warn: 0.65, dur: 1.8, radius: 430, strength: 100 }, { type: 'wall', spacing: 40, gap: 86, speed: 205 }] },
      { cd: 0.95, attacks: [{ type: 'gravity', warn: 0.55, dur: 1.6, radius: 450, strength: -115 }, { type: 'laser', warn: 0.5, dur: 0.85, width: 52, cd: 3.2, aimed: true }, { type: 'spiral', arms: 3, step: 19, speed: 205 }] }
    ] },
    10: { movement: 'figure8', moveSpeed: 1.25, moveRange: 170, phases: [
      { cd: 0.95, attacks: [{ type: 'fanDown', count: 8, spread: 82, speed: 265 }, { type: 'escort', enemy: 'beacon', adds: 1, maxAdds: 3 }] },
      { cd: 0.85, attacks: [{ type: 'prismBurst', warn: 0.55, dur: 0.65, width: 48, cd: 3.8, count: 6, speed: 215 }, { type: 'spiral', arms: 3, step: 21, speed: 210 }] },
      { cd: 0.85, attacks: [{ type: 'gravity', warn: 0.55, dur: 1.4, radius: 420, strength: 95 }, { type: 'wall', spacing: 36, gap: 78, speed: 220 }, { type: 'ring', count: 24, speed: 245 }] }
    ] }
  };


  function screenPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches?.[0] || event.changedTouches?.[0] || event;
    return {
      x: (touch.clientX - rect.left) / rect.width * W,
      y: (touch.clientY - rect.top) / rect.height * H
    };
  }

  function setHudPanel(target) {
    if (hudCloseTimer) {
      window.clearTimeout(hudCloseTimer);
      hudCloseTimer = 0;
    }
    hudPanels.forEach(panel => {
      panel.classList.toggle('is-open', panel.dataset.hudPanel === target);
    });
    hudToggles.forEach(button => {
      const active = button.dataset.hudTarget === target;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-expanded', active ? 'true' : 'false');
    });
  }

  function showHudPanel(target, seconds = 5) {
    setHudPanel(target);
    if (target && seconds > 0) hudCloseTimer = window.setTimeout(() => setHudPanel(''), seconds * 1000);
  }

  function toggleHudPanel(target) {
    const current = hudPanels.find(panel => panel.dataset.hudPanel === target && panel.classList.contains('is-open'));
    const next = current ? '' : target;
    showHudPanel(next, 5.2);
  }

  function finishNarrativeFragment(text) {
    const clean = String(text || '').replace(/[，,；;：:、-]+$/g, '').trim();
    if (!clean || /[。！？.!?]$/.test(clean)) return clean;
    return `${clean}。`;
  }

  function compactNarrative(text, max = 88) {
    const clean = String(text || '')
      .replace(/\s+/g, ' ')
      .replace(/(?:\.\.\.|…|……)+$/g, '')
      .replace(/[，,；;：:、-]+$/g, '')
      .trim();
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max);
    const end = Math.max(
      cut.lastIndexOf('。'),
      cut.lastIndexOf('！'),
      cut.lastIndexOf('？'),
      cut.lastIndexOf('；'),
      cut.lastIndexOf('，'),
      cut.lastIndexOf('、'),
      cut.lastIndexOf('.'),
      cut.lastIndexOf('!'),
      cut.lastIndexOf('?'),
      cut.lastIndexOf(';'),
      cut.lastIndexOf(',')
    );
    return finishNarrativeFragment(cut.slice(0, end > max * 0.45 ? end + 1 : max));
  }

  class Player {
    constructor(difficulty, weapon, resonance) {
      this.x = W / 2;
      this.y = H - 96;
      this.targetX = this.x;
      this.targetY = this.y;
      this.r = 15;
      this.baseMaxHp = 110;
      this.maxHp = difficulty.playerHp;
      this.hp = this.maxHp;
      this.shield = difficulty.startingShield || 0;
      this.lastStandShield = difficulty.lastStandShield || 0;
      this.lastStandReady = this.lastStandShield > 0;
      this.fire = 0;
      this.skillCd = 0;
      this.wings = difficulty.allyWings;
      this.weapon = weapon;
      this.resonance = resonance || {};
      this.shipKey = shipKeyForLoadout(difficulty, weapon, resonance);
    }

    update(dt) {
      this.x += (this.targetX - this.x) * 0.24;
      this.y += (this.targetY - this.y) * 0.24;
      const pull = game.gravityPullAt(this.x, this.y);
      this.x += pull.x * dt;
      this.y += pull.y * dt;
      this.x = clamp(this.x, this.r + 8, W - this.r - 8);
      this.y = clamp(this.y, 120, H - this.r - 18);
      this.fire -= dt;
      this.skillCd = Math.max(0, this.skillCd - dt);
      if (this.fire <= 0) {
        const base = this.weapon.kind === 'cannon' ? 0.18 : 0.1;
        this.fire = base * (this.resonance.fireIntervalMult || 1) * game.jamFactor(this.x, this.y);
        game.firePlayer();
      }
    }

    takeDamage(amount) {
      game.noHitT = 0;
      let rest = Math.max(1, amount * (this.resonance.damageTakenMult || 1));
      if (this.shield > 0) {
        const blocked = Math.min(this.shield, rest);
        this.shield -= blocked;
        rest -= blocked;
        game.burst(this.x, this.y, '#8bd3ff', 8);
      }
      if (rest > 0) {
        const beforeHp = this.hp;
        this.hp -= rest;
        const hpLoss = Math.max(0, Math.min(beforeHp, beforeHp - this.hp));
        game.damageTaken += hpLoss;
        game.triggerPainConverter(this, hpLoss);
        game.shake = Math.max(game.shake, 8);
        if (this.hp <= 0 && this.lastStandReady) {
          this.hp = 1;
          this.lastStandReady = false;
          this.shield += this.lastStandShield;
          game.lastStandTriggered = true;
          game.say('守夜黑匣子替空域载体保留了最后 1 点生命。', 2.6, { eventType: 'airspace_last_stand' });
        }
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const color = this.weapon.color || '#72d6bd';
      ctx.fillStyle = '#f6d36b';
      ctx.beginPath();
      ctx.moveTo(-5, 12);
      ctx.lineTo(5, 12);
      ctx.lineTo(0, 28 + Math.sin(game.time * 20) * 4);
      ctx.closePath();
      ctx.fill();
      const textured = assets?.draw(ctx, assets.player(this.shipKey), 0, -2, 66);
      if (!textured) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(-17, 16);
        ctx.lineTo(0, 8);
        ctx.lineTo(17, 16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#eef3ec';
        ctx.beginPath();
        ctx.ellipse(0, -6, 4, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (this.shield > 0) {
        ctx.strokeStyle = 'rgba(139,211,255,.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.r + 14 + Math.sin(game.time * 5) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      for (let i = 0; i < this.wings; i += 1) {
        const x = this.x + (i - (this.wings - 1) / 2) * 36;
        if (assets?.draw(ctx, assets.wingman(this.shipKey), x, this.y + 8, 32)) continue;
        ctx.fillStyle = 'rgba(238,243,236,.82)';
        ctx.beginPath();
        ctx.moveTo(x, this.y + 2);
        ctx.lineTo(x - 9, this.y + 20);
        ctx.lineTo(x + 9, this.y + 20);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  class Enemy {
    constructor(type, stage) {
      const data = {
        small: { hp: 2, r: 13, speed: 130, score: 80, color: '#f87171', fire: 0 },
        medium: { hp: 7, r: 21, speed: 95, score: 180, color: '#d8c58a', fire: 1.7, move: 'sine' },
        large: { hp: 15, r: 31, speed: 72, score: 520, color: '#f06595', fire: 2.2, shots: 3, move: 'orbit' },
        gunner: { hp: 11, r: 24, speed: 82, score: 260, color: '#8bd3ff', fire: 1.2, shots: 2, move: 'sine' },
        splitter: { hp: 8, r: 22, speed: 100, score: 220, color: '#72d6bd', fire: 0, move: 'zigzag' },
        detonator: { hp: 6, r: 23, speed: 112, score: 450, color: '#fab005', fire: 0, ringCount: 14, ringSpeed: 210, ringDamage: 9, move: 'zigzag' },
        phantom: { hp: 7, r: 18, speed: 150, score: 300, color: '#22d3ee', fire: 1.0, shots: 2, move: 'sine' },
        sniper: { hp: 7, r: 20, speed: 72, score: 340, color: '#e64980', fire: 1.8, warn: 0.55, bulletSpeed: 520, damage: 13, shots: 1 },
        shieldCarrier: { hp: 18, r: 30, speed: 66, score: 640, color: '#74c0fc', fire: 1.9, shots: 3, shield: 18, move: 'sine' },
        jammer: { hp: 10, r: 24, speed: 76, score: 300, color: '#75d7e6', fire: 1.6, shots: 2, jamRadius: 210, weaponSlow: 1.28, move: 'sine' },
        support: { hp: 12, r: 24, speed: 68, score: 320, color: '#72d6bd', fire: 0, repairRadius: 130, repairAmount: 2, repairInterval: 2.4, move: 'sine' },
        carrier: { hp: 22, r: 32, speed: 65, score: 900, color: '#9775fa', fire: 0, spawns: 'medium', spawnCount: 2, move: 'sine' },
        kamikaze: { hp: 5, r: 21, speed: 155, score: 520, color: '#ff6b6b', fire: 0, move: 'rearChase', fromBottom: true, crashDamage: 45 },
        beacon: { hp: 6, r: 21, speed: 95, score: 520, color: '#ffd43b', fire: 0, bulletSpeed: 300, damage: 8, markInterval: 2.8, markDelay: 0.75, markShots: 3, move: 'sine' },
        mineLayer: { hp: 13, r: 27, speed: 68, score: 760, color: '#ff922b', fire: 0, damage: 9, mineInterval: 2.2, mineRadius: 18, triggerRadius: 70, ringCount: 8, ringSpeed: 170, move: 'sine' },
        phaseWing: { hp: 8, r: 22, speed: 120, score: 680, color: '#be4bdb', fire: 0, bulletSpeed: 275, damage: 8, blinkInterval: 2.4, blinkDelay: 0.55, blinkRange: 170, shots: 5 },
        mirrorDrone: { hp: 7, r: 20, speed: 105, score: 650, color: '#74c0fc', fire: 0, bulletSpeed: 230, damage: 7, reflectCd: 0.9, move: 'sine' },
        tether: { hp: 14, r: 26, speed: 62, score: 820, color: '#20c997', fire: 0, pullRadius: 260, pullStrength: 95, move: 'sine' },
        warden: { hp: 18, r: 30, speed: 58, score: 920, color: '#91a7ff', fire: 0, guardRadius: 155, guardShield: 8, maxTargets: 4, move: 'sine' },
        harvester: { hp: 10, r: 23, speed: 155, score: 720, color: '#fcc419', fire: 0, stealRadius: 210, escapeSpeed: 230 }
      }[type] || { hp: 2, r: 13, speed: 130, score: 80, color: '#f87171', fire: 0 };
      this.type = type;
      this.x = 32 + Math.random() * (W - 64);
      this.y = data.fromBottom ? H + data.r + Math.random() * 60 : -data.r - Math.random() * 80;
      this.baseX = this.x;
      this.t = Math.random() * 4;
      this.move = data.move || 'straight';
      this.vx = 0;
      this.vy = data.fromBottom ? -data.speed : data.speed;
      this.entered = false;
      this.phase = 'in';
      this.hp = data.hp + stage;
      this.maxHp = this.hp;
      this.r = data.r;
      this.speed = data.speed;
      this.score = data.score;
      this.color = data.color;
      this.fire = data.fire ? data.fire + Math.random() : 999;
      this.crashDamage = data.crashDamage || 18;
      this.jamRadius = data.jamRadius || 0;
      this.weaponSlow = data.weaponSlow || 1;
      this.warn = data.warn || 0;
      this.bulletSpeed = data.bulletSpeed || 240;
      this.bulletDamage = data.damage || 8;
      this.shots = data.shots || 1;
      this.ringCount = data.ringCount || 0;
      this.ringSpeed = data.ringSpeed || 0;
      this.ringDamage = data.ringDamage || 0;
      this.fireMult = 1;
      this.sniperWarn = 0;
      this.sniperAim = 0;
      this.repairRadius = data.repairRadius || 0;
      this.repairAmount = data.repairAmount || 0;
      this.repairTimer = data.repairInterval ? data.repairInterval * (0.55 + Math.random() * 0.4) : 0;
      this.regenTimer = 0;
      this.regenEvery = 0;
      this.regenPct = 0;
      this.spawns = data.spawns || '';
      this.spawnCount = data.spawnCount || 0;
      this.carrierSpawn = 0;
      this.eliteShieldMax = data.shield || 0;
      this.eliteShield = this.eliteShieldMax;
      this.guardShield = 0;
      this.guardedBy = null;
      this.beaconTimer = data.markInterval ? data.markInterval * (0.55 + Math.random() * 0.35) : 0;
      this.beaconWarn = 0;
      this.beaconX = 0;
      this.mineTimer = data.mineInterval ? data.mineInterval * (0.55 + Math.random() * 0.35) : 0;
      this.phaseTimer = data.blinkInterval ? data.blinkInterval * (0.55 + Math.random() * 0.35) : 0;
      this.phaseWarn = 0;
      this.phaseTargetX = 0;
      this.reflectCd = 0;
      this.wardenPulse = 0;
      this.stolenKind = '';
      this.escapeTimer = 0;
      this.cfg = data;
      this.dead = false;
    }

    update(dt) {
      this.t += dt;
      this.applyMove(dt);
      if (this.carrierSpawn > 0) this.carrierSpawn -= dt;
      if (this.reflectCd > 0) this.reflectCd -= dt;
      this.updateBeacon(dt);
      this.updateMineLayer(dt);
      this.updatePhaseWing(dt);
      this.updateWarden(dt);
      this.fire -= dt;
      if (this.sniperWarn > 0 && game.player) {
        this.sniperWarn -= dt;
        if (this.sniperWarn <= 0) {
          this.fire = 1.8 * this.fireMult;
          game.fireFan(this.x, this.y, this.sniperAim, 0, this.shots, this.bulletSpeed, this.bulletDamage);
        }
      } else if (this.fire <= 0 && game.player) {
        if (this.type === 'sniper') {
          this.sniperAim = Math.atan2(game.player.y - this.y, game.player.x - this.x);
          this.sniperWarn = this.warn;
        } else {
          this.fire = (this.type === 'phantom' ? 1.0 : 1.45) * this.fireMult;
          game.fireEnemyAt(this.x, this.y, 240 + game.segmentIndex * 12, 8);
        }
      }
      if (this.repairAmount > 0 && this.y > 0 && this.y < H * 0.75) {
        this.repairTimer -= dt;
        if (this.repairTimer <= 0) {
          this.repairTimer = 2.4;
          game.repairNearbyEnemies(this);
        }
      }
      if (this.elite === 'regenerator' && this.y > 0 && this.y < H * 0.76) {
        this.regenTimer -= dt;
        if (this.regenTimer <= 0) {
          this.regenTimer = this.regenEvery || 2.6;
          if (this.hp < this.maxHp) {
            const before = this.hp;
            this.hp = Math.min(this.maxHp, this.hp + Math.max(1, Math.round(this.maxHp * (this.regenPct || 0.08))));
            if (this.hp > before) game.burst(this.x, this.y, '#69db7c', 5);
          }
        }
      }
      if (this.y >= -this.r && this.y <= H + this.r) this.entered = true;
      if (this.entered && (this.y > H + this.r || this.y < -this.r - 80 || this.x < -70 || this.x > W + 70)) this.dead = true;
    }

    applyMove(dt) {
      if (this.type === 'harvester') {
        if (this.escapeTimer > 0) {
          this.escapeTimer -= dt;
          this.y -= (this.cfg.escapeSpeed || 220) * dt;
          return;
        }
        const powerup = game.nearestPowerup(this.x, this.y, this.cfg.stealRadius || 180);
        if (powerup) {
          const dx = powerup.x - this.x;
          const dy = powerup.y - this.y;
          const d = Math.hypot(dx, dy);
          if (d < this.r + powerup.r + 4) game.stealPowerupFor(this, powerup);
          else if (d > 1) {
            const sp = this.speed * 1.25;
            this.x = clamp(this.x + dx / d * sp * dt, this.r, W - this.r);
            this.y += dy / d * sp * dt;
          }
          return;
        }
      }
      if (this.move === 'rearChase') {
        const p = game.player || { x: this.x, y: 0 };
        const warn = 2;
        const tracking = this.t < 4.5;
        const phaseMul = this.t < warn ? 0.7 : this.t < warn + 2.5 ? 1.8 : 1.1;
        const sp = this.speed * phaseMul;
        const a = Math.atan2(p.y - this.y, p.x - this.x);
        if (!this.vx && !this.vy) {
          this.vx = 0;
          this.vy = -sp;
        }
        if (tracking) {
          const turn = clamp(4 * dt, 0, 1);
          this.vx += (Math.cos(a) * sp - this.vx) * turn;
          this.vy += (Math.sin(a) * sp - this.vy) * turn;
        } else {
          const d = Math.hypot(this.vx, this.vy) || 1;
          this.vx = this.vx / d * sp;
          this.vy = this.vy / d * sp;
        }
        this.x = clamp(this.x + this.vx * dt, -this.r, W + this.r);
        this.y += this.vy * dt;
      } else if (this.move === 'sine') {
        this.y += this.speed * dt;
        this.x = clamp(this.baseX + Math.sin(this.t * (this.type === 'phantom' ? 4 : 2.4)) * (this.type === 'phantom' ? 70 : 48), this.r, W - this.r);
      } else if (this.move === 'zigzag') {
        this.y += this.speed * dt;
        const ph = (this.t % 1.35) / 1.35;
        const tri = ph < 0.5 ? ph * 2 : 2 - ph * 2;
        this.x = clamp(this.baseX + (tri * 2 - 1) * 76, this.r, W - this.r);
      } else if (this.move === 'orbit') {
        this.y += this.speed * 0.56 * dt;
        this.x = clamp(this.baseX + Math.cos(this.t * 2.2) * 60, this.r, W - this.r);
        this.y += Math.sin(this.t * 2.2) * 24 * dt;
      } else {
        this.y += this.speed * dt;
      }
    }

    updateBeacon(dt) {
      if (this.type !== 'beacon' || this.y <= 0 || this.y >= H * 0.74 || !game.player) return;
      if (this.beaconWarn > 0) {
        this.beaconWarn -= dt;
        if (this.beaconWarn <= 0) {
          const n = this.cfg.markShots || 3;
          for (let i = 0; i < n; i += 1) game.enemyBullets.push({ x: this.beaconX, y: -18 - i * 24, vx: 0, vy: this.cfg.bulletSpeed || 300, r: 5, damage: this.cfg.damage || 8, color: this.color, dead: false });
          this.beaconTimer = this.cfg.markInterval || 2.8;
        }
        return;
      }
      this.beaconTimer -= dt;
      if (this.beaconTimer <= 0) {
        this.beaconX = clamp(game.player.x, 24, W - 24);
        this.beaconWarn = this.cfg.markDelay || 0.75;
      }
    }

    updateMineLayer(dt) {
      if (this.type !== 'mineLayer' || this.y <= 0 || this.y >= H * 0.74) return;
      this.mineTimer -= dt;
      if (this.mineTimer > 0) return;
      this.mineTimer = this.cfg.mineInterval || 2.2;
      game.enemyBullets.push({
        x: this.x,
        y: this.y + this.r * 0.45,
        vx: 0,
        vy: 58,
        r: this.cfg.mineRadius || 18,
        damage: this.cfg.damage || 9,
        color: this.color,
        kind: 'mine',
        triggerRadius: this.cfg.triggerRadius || 70,
        ringCount: this.cfg.ringCount || 8,
        ringSpeed: this.cfg.ringSpeed || 170,
        dead: false
      });
    }

    updatePhaseWing(dt) {
      if (this.type !== 'phaseWing' || this.y <= 0 || this.y >= H * 0.74 || !game.player) return;
      if (this.phaseWarn > 0) {
        this.phaseWarn -= dt;
        if (this.phaseWarn <= 0) {
          this.x = this.baseX = this.phaseTargetX;
          game.fireFan(this.x, this.y + this.r, Math.PI / 2, 46 * DEG, this.cfg.shots || 5, this.cfg.bulletSpeed || 275, this.cfg.damage || 8);
          this.phaseTimer = this.cfg.blinkInterval || 2.4;
        }
        return;
      }
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        const side = game.player.x < W / 2 ? 1 : -1;
        this.phaseTargetX = clamp(game.player.x + side * (this.cfg.blinkRange || 170), this.r + 18, W - this.r - 18);
        this.phaseWarn = this.cfg.blinkDelay || 0.55;
      }
    }

    updateWarden(dt) {
      if (this.type !== 'warden' || this.y <= 0 || this.y >= H * 0.78) return;
      this.wardenPulse -= dt;
      if (this.wardenPulse > 0) return;
      this.wardenPulse = 0.35;
      const radius = this.cfg.guardRadius || 155;
      const max = this.cfg.maxTargets || 4;
      let guarded = 0;
      for (const enemy of game.enemies) {
        if (guarded >= max || enemy.dead || enemy === this || enemy.isBoss || enemy.guardShield > 0) continue;
        if (dist2(enemy, this) > radius * radius) continue;
        enemy.guardShield = this.cfg.guardShield || 8;
        enemy.guardedBy = this;
        guarded += 1;
      }
    }

    reflectShot() {
      if (this.type !== 'mirrorDrone' || this.reflectCd > 0 || this.dead) return;
      this.reflectCd = this.cfg.reflectCd || 0.9;
      const dir = Math.random() < 0.5 ? -1 : 1;
      game.enemyBullets.push({ x: this.x, y: this.y, vx: dir * (this.cfg.bulletSpeed || 230), vy: 35, r: 5, damage: this.cfg.damage || 7, color: this.color, dead: false });
      this.carrierSpawn = Math.max(this.carrierSpawn, 0.4);
    }

    damage(amount, source = '') {
      if (this.guardShield > 0) {
        const used = Math.min(this.guardShield, amount);
        this.guardShield -= used;
        amount -= used;
        if (this.guardShield > 0) return false;
      }
      if (this.eliteShield > 0) {
        const used = Math.min(this.eliteShield, amount);
        this.eliteShield -= used;
        amount -= used;
        if (this.eliteShield > 0) return false;
      }
      this.hp -= amount;
      if (this.hp <= 0) {
        this.dead = true;
        return true;
      }
      if (source === 'bullet') this.reflectShot();
      return false;
    }

    drawRoleAura(ctx) {
      if (this.guardShield > 0) {
        ctx.strokeStyle = 'rgba(145,167,255,.72)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.r + 8 + Math.sin(this.t * 8) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (this.eliteShield > 0 && this.type === 'shieldCarrier') {
        ctx.strokeStyle = 'rgba(116,192,252,.72)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.r + 10 + Math.sin(this.t * 8) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (this.type === 'beacon' && this.beaconWarn > 0) {
        ctx.save();
        ctx.globalAlpha = 0.2 + 0.28 * Math.sin(this.t * 28) ** 2;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.beaconX - this.x - 8, -this.y, 16, H);
        ctx.strokeStyle = '#ffd43b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.beaconX - this.x - 16, (game.player?.y || H * 0.75) - this.y);
        ctx.lineTo(this.beaconX - this.x + 16, (game.player?.y || H * 0.75) - this.y);
        ctx.stroke();
        ctx.restore();
      }
      if (this.type === 'phaseWing' && this.phaseWarn > 0) {
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.t * 28) ** 2;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(this.phaseTargetX - this.x, 0, this.r + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.phaseTargetX - this.x, 0);
        ctx.lineTo(this.phaseTargetX - this.x, H - this.y);
        ctx.stroke();
        ctx.restore();
      }
      if (this.type === 'tether') {
        ctx.save();
        ctx.globalAlpha = 0.14 + 0.12 * Math.sin(this.t * 6) ** 2;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(this.cfg.pullRadius || 0, 135), 0, Math.PI * 2);
        ctx.stroke();
        if (game.player) {
          ctx.globalAlpha = 0.2;
          ctx.setLineDash([5, 6]);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(game.player.x - this.x, game.player.y - this.y);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (this.type === 'warden') {
        ctx.save();
        ctx.globalAlpha = 0.14 + 0.08 * Math.sin(this.t * 6) ** 2;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.cfg.guardRadius || 140, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (this.type === 'kamikaze') {
        ctx.save();
        ctx.globalAlpha = 0.26 + Math.sin(this.t * 14) * 0.12;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.r + 7, 0, Math.PI * 2);
        ctx.stroke();
        if (game.player) {
          ctx.globalAlpha = 0.18;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(game.player.x - this.x, game.player.y - this.y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      this.drawRoleAura(ctx);
      if (this.type === 'sniper' && this.sniperWarn > 0) {
        ctx.save();
        ctx.globalAlpha = 0.24 + 0.28 * Math.sin(this.t * 30) ** 2;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(this.sniperAim) * 900, Math.sin(this.sniperAim) * 900);
        ctx.stroke();
        ctx.restore();
      }
      if (this.type === 'jammer' || this.elite === 'jammer' || this.type === 'support' || this.elite === 'regenerator') {
        const rr = this.type === 'jammer' || this.elite === 'jammer' ? 70 : 58;
        ctx.strokeStyle = this.type === 'jammer' || this.elite === 'jammer' ? 'rgba(117,215,230,.36)' : this.elite === 'regenerator' ? 'rgba(105,219,124,.36)' : 'rgba(114,214,189,.32)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, rr + Math.sin(game.time * 5) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (assets?.draw(ctx, assets.enemy(this.type), 0, 0, this.r * 2.85, 0, this.phaseWarn > 0 ? 0.62 : 1)) {
        if (this.carrierSpawn > 0 || this.reflectCd > 0) {
          ctx.strokeStyle = 'rgba(151,117,250,.72)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, this.r + 8 + Math.sin(game.time * 12) * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        return;
      }
      ctx.fillStyle = this.color;
      ctx.beginPath();
      if (this.type === 'gunner') {
        ctx.moveTo(-this.r, -this.r * 0.4);
        ctx.lineTo(this.r, -this.r * 0.4);
        ctx.lineTo(this.r * 0.5, this.r);
        ctx.lineTo(-this.r * 0.5, this.r);
      } else if (this.type === 'phantom') {
        ctx.moveTo(0, this.r);
        ctx.lineTo(-this.r, -this.r);
        ctx.lineTo(0, -this.r * 0.35);
        ctx.lineTo(this.r, -this.r);
      } else if (this.type === 'sniper') {
        ctx.moveTo(0, -this.r);
        ctx.lineTo(-this.r * 0.75, this.r * 0.8);
        ctx.lineTo(0, this.r * 0.25);
        ctx.lineTo(this.r * 0.75, this.r * 0.8);
      } else if (this.type === 'detonator') {
        ctx.arc(0, 0, this.r * 0.78, 0, Math.PI * 2);
        ctx.moveTo(-this.r, 0);
        ctx.lineTo(this.r, 0);
        ctx.moveTo(0, -this.r);
        ctx.lineTo(0, this.r);
      } else if (this.type === 'jammer') {
        ctx.moveTo(0, -this.r);
        ctx.lineTo(-this.r * 0.86, 0);
        ctx.lineTo(0, this.r);
        ctx.lineTo(this.r * 0.86, 0);
      } else if (this.type === 'support') {
        ctx.arc(0, 0, this.r * 0.8, 0, Math.PI * 2);
      } else if (this.type === 'carrier') {
        ctx.ellipse(0, 0, this.r * 0.9, this.r * 0.65, 0, 0, Math.PI * 2);
        ctx.moveTo(-this.r * 0.55, 0);
        ctx.lineTo(-this.r * 0.92, this.r * 0.58);
        ctx.lineTo(-this.r * 0.35, this.r * 0.38);
        ctx.moveTo(this.r * 0.55, 0);
        ctx.lineTo(this.r * 0.92, this.r * 0.58);
        ctx.lineTo(this.r * 0.35, this.r * 0.38);
      } else {
        ctx.moveTo(0, this.r);
        ctx.lineTo(-this.r, -this.r * 0.75);
        ctx.lineTo(this.r, -this.r * 0.75);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.34)';
      if (this.type === 'support') {
        ctx.fillStyle = '#eef3ec';
        ctx.fillRect(-3, -this.r * 0.45, 6, this.r * 0.9);
        ctx.fillRect(-this.r * 0.45, -3, this.r * 0.9, 6);
      } else if (this.type === 'detonator') {
        ctx.strokeStyle = '#0c1114';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-this.r * 0.52, 0);
        ctx.lineTo(this.r * 0.52, 0);
        ctx.moveTo(0, -this.r * 0.52);
        ctx.lineTo(0, this.r * 0.52);
        ctx.stroke();
      } else {
        ctx.fillRect(-this.r * 0.5, -2, this.r, 4);
      }
      if (this.carrierSpawn > 0) {
        ctx.strokeStyle = 'rgba(151,117,250,.72)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.r + 8 + Math.sin(game.time * 12) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  class Boss {
    constructor(def) {
      this.def = def;
      this.affix = def.affix || null;
      this.skywardBossIndex = this.affix?.skywardBossIndex ?? def.skywardBossIndex ?? def.stage - 1;
      this.prototype = SKYWARD_BOSS_PROTOTYPES[this.skywardBossIndex] || null;
      this.x = W / 2;
      this.y = -def.hp / 20;
      this.r = 54 + def.stage * 2;
      this.maxHp = Math.round(def.hp * (1 + (this.affix?.hpMult || 0)));
      this.hp = this.maxHp;
      this.fire = 1.4;
      this.fireMult = this.affix?.fireMult || 1;
      this.bulletRateMult = this.affix?.bulletRateMult || 1;
      this.isBoss = true;
      this.affixTimer = this.affix?.every || 0;
      this.t = 0;
      this.phase = 1;
      this.dead = false;
      this.spiral = 0;
      this.wallGapStep = 0;
      this.wallGapSeed = Math.random() * Math.PI * 2;
      this._weakTimer = 0;
      this._hitFlash = 0;
      this._targetX = this.x;
      this._moveT = 0;
      this._laserCd = 0;
      this._gravityCd = 0;
    }

    update(dt) {
      this.t += dt;
      this._moveT += dt;
      if (this._hitFlash > 0) this._hitFlash = Math.max(0, this._hitFlash - dt);
      if (this._laserCd > 0) this._laserCd = Math.max(0, this._laserCd - dt);
      if (this._gravityCd > 0) this._gravityCd = Math.max(0, this._gravityCd - dt);
      if (this.y < 128) this.y += 75 * dt;
      else this.move(dt);
      const nextPhase = this.hp / this.maxHp > 0.62 ? 1 : this.hp / this.maxHp > 0.28 ? 2 : 3;
      if (nextPhase !== this.phase) {
        this.phase = nextPhase;
        game.say(bridge.lineFor('boss-phase', this.def), 3.2, {
          eventType: 'airspace_boss_phase',
          boss: this.def,
          context: { phase: this.phase }
        });
      }
      this.updateAffix(dt);
      this.fire -= dt;
      if (this.fire <= 0) {
        const phase = this.phaseSpec();
        this.fire = Math.max(0.12, (phase?.cd || (1.35 - this.phase * 0.18)) * this.fireMult / (game.difficulty.bulletRate * this.bulletRateMult));
        this.attack();
      }
    }

    phaseSpec() {
      return this.prototype?.phases?.[this.phase - 1] || null;
    }

    move(_dt) {
      const proto = this.prototype || {};
      const cx = W / 2;
      if (proto.movement === 'figure8') {
        const speed = proto.moveSpeed || 1;
        this.x = cx + Math.sin(this.t * speed) * (proto.moveRange || 150);
        this.y = 128 + Math.sin(this.t * speed * 2) * 26;
      } else if (proto.movement === 'dart') {
        if (this._moveT > (proto.dartEvery || 2.2)) {
          this._moveT = 0;
          const m = this.r + 42;
          this._targetX = m + Math.random() * (W - 2 * m);
        }
        this.x += (this._targetX - this.x) * 0.08;
      } else {
        const speed = proto.moveSpeed || (0.85 + this.def.stage * 0.04);
        const range = proto.moveRange || (120 + this.def.stage * 8);
        this.x = cx + Math.sin(this.t * speed) * range;
      }
    }

    updateAffix(dt) {
      if (this._weakTimer > 0) this._weakTimer = Math.max(0, this._weakTimer - dt);
      if (!this.affix?.attack) return;
      this.affixTimer -= dt;
      if (this.affixTimer > 0) return;
      this.affixTimer = this.affix.every || 5.6;
      if (this.affix.attack === 'prism') game.firePrismLane(this, this.affix);
      else if (this.affix.attack === 'prismBurst') game.firePrismBurst(this, this.affix);
      else if (this.affix.attack === 'ionStorm') game.fireIonStormLane(this, this.affix);
      else if (this.affix.attack === 'ring') game.fireBarrageRing(this, this.affix);
      else if (this.affix.attack === 'escort') game.fireBossEscort(this, this.affix);
      else if (this.affix.attack === 'weak') game.openBossWeakPoint(this, this.affix);
      else if (this.affix.attack === 'repair') game.repairBoss(this, this.affix);
      else if (this.affix.attack === 'gravity') game.fireGravityPulse(this, this.affix);
    }

    attack() {
      const phase = this.phaseSpec();
      if (phase?.attacks?.length) {
        for (const attack of phase.attacks) this.runSkywardAttack(attack);
        return;
      }
      const count = 5 + this.phase * 2 + Math.floor(this.def.stage / 2);
      if (this.def.pattern === 'fan') game.fireFan(this.x, this.y + this.r * 0.5, Math.PI / 2, 65 * DEG, count, 230, 8);
      else if (this.def.pattern === 'aimed') game.fireEnemyAt(this.x, this.y, 300, 10, count, 12 * DEG);
      else if (this.def.pattern === 'wall') {
        this.wallGapStep += 1;
        game.fireWall(this.x, this.y, 210 + this.phase * 16, this);
      }
      else if (this.def.pattern === 'spiral') this.fireSpiral(count, 205);
      else if (this.def.pattern === 'ring') game.fireRing(this.x, this.y, 14 + this.phase * 4, 205 + this.phase * 15, 9);
      else {
        pick([
          () => game.fireFan(this.x, this.y + this.r * 0.5, Math.PI / 2, 75 * DEG, count, 245, 9),
          () => game.fireWall(this.x, this.y, 230),
          () => this.fireSpiral(count, 220)
        ])();
      }
    }

    runSkywardAttack(attack) {
      const damage = 8 + this.phase;
      if (attack.type === 'fanDown') {
        game.fireFan(this.x, this.y + this.r * 0.5, Math.PI / 2, (attack.spread || 60) * DEG, attack.count || 5, attack.speed || 240, damage);
      } else if (attack.type === 'aimed') {
        game.fireEnemyAt(this.x, this.y, attack.speed || 280, damage, attack.count || 3, (attack.spread || 16) * DEG);
      } else if (attack.type === 'ring') {
        game.fireRing(this.x, this.y, attack.count || 16, attack.speed || 220, damage);
      } else if (attack.type === 'spiral') {
        this.fireSpiralArms(attack.arms || 2, attack.step || 20, attack.speed || 190, damage);
      } else if (attack.type === 'wall') {
        this.wallGapStep += 1;
        game.fireWall(this.x, this.y, attack.speed || 200, this, attack);
      } else if (attack.type === 'laser') {
        if (this._laserCd > 0) return;
        game.fireBossLaser(attack.aimed ? this.playerX() : this.x, attack, damage, this.affix?.color || this.def.color);
        this._laserCd = attack.cd || 3;
      } else if (attack.type === 'dualLaser') {
        if (this._laserCd > 0) return;
        const x = attack.aimed ? this.playerX() : this.x;
        const offset = attack.offset || 80;
        game.fireBossLaser(clamp(x - offset, 32, W - 32), attack, damage, this.affix?.color || this.def.color);
        game.fireBossLaser(clamp(x + offset, 32, W - 32), attack, damage, this.affix?.color || this.def.color);
        this._laserCd = attack.cd || 3.4;
      } else if (attack.type === 'prismBurst') {
        if (this._laserCd > 0) return;
        game.firePrismBurst(this, { ...this.affix, ...attack, color: this.affix?.color || '#cc5de8' });
        this._laserCd = attack.cd || 3.8;
      } else if (attack.type === 'gravity') {
        if (this._gravityCd > 0) return;
        game.fireGravityPulse(this, { ...this.affix, ...attack, color: this.affix?.color || '#4dabf7' });
        this._gravityCd = attack.cd || 4.4;
      } else if (attack.type === 'escort') {
        game.fireBossEscort(this, { ...this.affix, ...attack, color: this.affix?.color || this.def.color });
      }
    }

    playerX() {
      return clamp(game.player?.x || this.x, 36, W - 36);
    }

    fireSpiral(count, speed) {
      this.spiral += 22 * DEG;
      for (let i = 0; i < count; i += 1) {
        const a = this.spiral + i * Math.PI * 2 / count;
        game.enemyBullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5, damage: 8, dead: false });
      }
    }

    fireSpiralArms(arms, step, speed, damage) {
      this.spiral += step * DEG;
      for (let i = 0; i < arms; i += 1) {
        const a = this.spiral + i * Math.PI * 2 / arms;
        game.enemyBullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5, damage, dead: false });
      }
    }

    damage(amount) {
      const guard = this.affix?.guardDR && game.bossGuardCount(this) > 0 ? this.affix.guardDR : 0;
      this.hp -= amount * (1 - guard);
      this._hitFlash = 0.09;
      if (this.hp <= 0) {
        this.dead = true;
        return true;
      }
      return false;
    }

    draw(ctx) {
      const r = this.r;
      const hitFlash = clamp(this._hitFlash / 0.09, 0, 1);
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.phase === 3) {
        ctx.fillStyle = 'rgba(248,113,113,.18)';
        ctx.beginPath();
        ctx.arc(0, 0, r + 16 + Math.sin(game.time * 6) * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (this.affix) {
        ctx.strokeStyle = this.affix.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r + 18 + Math.sin(game.time * 5) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (this._weakTimer > 0) {
        ctx.strokeStyle = '#ffd43b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, -6, 24 + Math.sin(game.time * 12) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      const img = bossImageFor(this.def, this.affix);
      if (img) {
        const size = r * 2.45;
        ctx.globalAlpha = 0.96;
        if (!assets?.draw(ctx, img, 0, 0, size)) ctx.drawImage(img, -size / 2, -size * 0.58, size, size);
        ctx.globalAlpha = 1;
        if (hitFlash > 0) {
          ctx.strokeStyle = `rgba(255, 212, 59, ${0.25 + hitFlash * 0.55})`;
          ctx.lineWidth = 2 + hitFlash * 3;
          ctx.shadowColor = '#ffd43b';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(0, 0, r * (1.18 + (1 - hitFlash) * 0.18), 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        if (this._weakTimer > 0) {
          ctx.strokeStyle = '#ffd43b';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, -6, 24 + Math.sin(game.time * 12) * 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = 'rgba(0,0,0,.5)';
        ctx.fillRect(74, 76, W - 148, 8);
        ctx.fillStyle = this.def.color;
        ctx.fillRect(74, 76, (W - 148) * clamp(this.hp / this.maxHp, 0, 1), 8);
        return;
      }
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 4, 0, 0, r);
      grad.addColorStop(0, '#eef3ec');
      grad.addColorStop(0.35, this.def.color);
      grad.addColorStop(1, '#151a1d');
      ctx.fillStyle = hitFlash > 0 ? '#fff' : grad;
      ctx.beginPath();
      if (this.def.pattern === 'spiral') {
        for (let i = 0; i < 8; i += 1) {
          const a = -Math.PI / 2 + i * Math.PI / 4;
          const rr = i % 2 ? r * 0.55 : r;
          i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
      } else if (this.def.pattern === 'wall') {
        for (let i = 0; i < 6; i += 1) {
          const a = Math.PI / 6 + i * Math.PI / 3;
          i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
      } else {
        ctx.moveTo(0, r);
        ctx.lineTo(-r, -r * 0.55);
        ctx.lineTo(-r * 0.42, -r);
        ctx.lineTo(r * 0.42, -r);
        ctx.lineTo(r, -r * 0.55);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hitFlash > 0 ? '#fff' : '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, -6, 10 + Math.sin(game.time * 4) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(74, 76, W - 148, 8);
      ctx.fillStyle = this.def.color;
      ctx.fillRect(74, 76, (W - 148) * clamp(this.hp / this.maxHp, 0, 1), 8);
    }
  }

  const game = {
    state: 'menu',
    route: bridge.route(),
    difficulty: bridge.difficulty(),
    weapon: bridge.weaponLoadout(),
    resonance: bridge.routeResonance(),
    briefingIndex: 0,
    player: null,
    enemies: [],
    playerBullets: [],
    enemyBullets: [],
    lasers: [],
    gravityPulses: [],
    powerups: [],
    particles: [],
    boss: null,
    segmentIndex: -1,
    segmentTime: 0,
    spawnTimer: 0,
    bossDefeated: [],
    clearedLayers: 0,
    cleanClears: 0,
    segmentStartDamage: 0,
    damageTaken: 0,
    creationOverload: 0,
    painConverted: 0,
    pointDefenseCleared: 0,
    livingArmorKills: 0,
    livingArmorHpGained: 0,
    lastStandTriggered: false,
    jammedTime: 0,
    resultId: '',
    noHitT: 0,
    fieldRepairT: 0,
    repairLoopT: 0,
    repairLoopTriggers: 0,
    score: 0,
    time: 0,
    stars: Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 60 + Math.random() * 150, r: Math.random() < 0.8 ? 1 : 2 })),
    shake: 0,
    nearLineCd: 0,
    commRequestId: 0,
    backgroundWorld: 1,

    syncUiState() {
      const playing = this.state === 'playing';
      hud?.classList.toggle('hidden', !playing);
      comm?.classList.toggle('hidden', !playing);
      skillBtn?.classList.toggle('hidden', !playing);
      if (!playing) {
        setHudPanel('');
        if (comm) comm.textContent = '';
      }
    },

    renderSelectedLoadout() {
      if (!loadout) return;
      const weapon = bridge.weaponLoadout();
      const resonance = bridge.routeResonance();
      const route = bridge.route();
      const communicator = bridge.communicator();
      const rows = [
        `${weapon.name} 来自「${weapon.sourceCreation}」`,
        weapon.focusText ? `空域标记：${weapon.focusText}` : '',
        weapon.reason ? `选择依据：${weapon.reason}` : '',
        weapon.description,
        `共鸣：${resonance.name} · ${resonance.effect}`,
        `通讯：${communicator.name} · ${communicator.role}`,
        `航线：6 段 Boss 清算 · 词缀 ${route.map(boss => boss.affix.name).join(' / ')}`
      ].filter(Boolean);
      loadout.replaceChildren(...rows.map((text, index) => {
        const div = document.createElement('div');
        if (index === 0) {
          const strong = document.createElement('strong');
          strong.textContent = text;
          div.append(strong);
        } else {
          div.textContent = text;
        }
        return div;
      }));
    },

    renderWeaponChoices() {
      if (!choices || typeof bridge.weaponOptions !== 'function') return;
      const options = bridge.weaponOptions();
      const selected = bridge.weaponLoadout();
      choices.replaceChildren();
      for (let i = 0; i < options.length; i += 1) {
        const option = options[i];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `airspace-choice${option.ability === selected.ability ? ' selected' : ''}`;
        button.dataset.index = String(i);
        const title = document.createElement('strong');
        title.textContent = option.name;
        const source = document.createElement('span');
        source.textContent = `${option.focusText || '空域选项'} · 来自：${option.sourceCreation}`;
        const reason = document.createElement('small');
        reason.textContent = option.reason || option.description;
        button.append(title, source, reason);
        button.addEventListener('click', () => {
          bridge.selectWeaponOption(i);
          this.weapon = bridge.weaponLoadout();
          this.resonance = bridge.routeResonance();
          this.difficulty = bridge.difficulty();
          this.route = bridge.route();
          this.renderBriefingStep();
        });
        choices.append(button);
      }
    },

    start() {
      this.state = 'playing';
      this.route = bridge.route();
      this.difficulty = bridge.difficulty();
      this.weapon = bridge.weaponLoadout();
      this.resonance = bridge.routeResonance();
      this.player = new Player(this.difficulty, this.weapon, this.resonance);
      this.enemies = [];
      this.playerBullets = [];
      this.enemyBullets = [];
      this.lasers = [];
      this.gravityPulses = [];
      this.powerups = [];
      this.particles = [];
      this.boss = null;
      this.segmentIndex = -1;
      this.segmentTime = 0;
      this.spawnTimer = 0.7;
      this.bossDefeated = [];
      this.clearedLayers = 0;
      this.cleanClears = 0;
      this.segmentStartDamage = 0;
      this.damageTaken = 0;
      this.creationOverload = 0;
      this.painConverted = 0;
      this.pointDefenseCleared = 0;
      this.livingArmorKills = 0;
      this.livingArmorHpGained = 0;
      this.lastStandTriggered = false;
      this.jammedTime = 0;
      this.bossContactCd = 0;
      this.resultId = '';
      this.noHitT = 0;
      this.fieldRepairT = 0;
      this.repairLoopT = 0;
      this.repairLoopTriggers = 0;
      this.score = 0;
      this.time = 0;
      this.backgroundWorld = backgroundWorldForRoute(this.route, this.segmentIndex);
      menu.classList.add('hidden');
      resultPanel.classList.add('hidden');
      this.syncUiState();
      this.hideClearanceCard();
      this.nextSegment();
    },

    renderBriefingStep() {
      const slides = typeof bridge.briefingSlides === 'function' ? bridge.briefingSlides() : [];
      const slide = slides[this.briefingIndex] || slides[0] || null;
      const final = this.briefingIndex >= Math.max(0, slides.length - 1);
      if (slide) {
        if (menuKicker) menuKicker.textContent = slide.kicker;
        if (menuTitle) menuTitle.textContent = slide.title;
        if (brief) brief.textContent = slide.text;
      }
      choices?.classList.toggle('hidden', !final);
      loadout?.classList.toggle('hidden', !final);
      if (final) {
        this.renderWeaponChoices();
        this.renderSelectedLoadout();
      }
      if (startBtn) startBtn.textContent = final ? '进入空域' : '继续';
      this.syncUiState();
    },

    advanceBriefing() {
      const slides = typeof bridge.briefingSlides === 'function' ? bridge.briefingSlides() : [];
      if (this.briefingIndex >= slides.length - 1) return false;
      this.briefingIndex += 1;
      this.renderBriefingStep();
      return true;
    },

    nextSegment() {
      this.segmentIndex += 1;
      if (this.segmentIndex >= this.route.length) {
        this.finish('victory');
        return;
      }
      this.hideClearanceCard();
      this.segmentTime = 0;
      this.spawnTimer = 0.8;
      this.boss = null;
      this.segmentStartDamage = this.damageTaken;
      this.lasers.length = 0;
      const boss = this.route[this.segmentIndex];
      this.backgroundWorld = backgroundWorldForRoute([boss], this.segmentIndex);
      this.say(`${boss.title}正在靠近。${boss.memory}`, 3.6, {
        eventType: 'airspace_segment',
        boss,
        context: { stage: boss.stage }
      });
      this.updateHud();
      showHudPanel('stage', 5);
    },

    currentAffix() {
      return this.route[this.segmentIndex]?.affix || null;
    },

    spawnEnemy() {
      const stage = this.segmentIndex + 1;
      const pool = stage < 2 ? ['small', 'small', 'medium']
        : stage < 3 ? ['small', 'medium', 'large', 'gunner', 'splitter', 'beacon']
          : stage < 5 ? ['medium', 'large', 'gunner', 'splitter', 'sniper', 'detonator', 'phantom', 'shieldCarrier', 'mirrorDrone']
            : ['medium', 'gunner', 'sniper', 'detonator', 'phantom', 'carrier', 'jammer', 'support', 'beacon', 'mineLayer', 'phaseWing', 'tether', 'warden', 'harvester', 'kamikaze'];
      const affix = this.currentAffix();
      const biased = affix?.enemyBias && Math.random() < (affix.spawnBias || 0) ? affix.enemyBias : pool;
      const enemy = new Enemy(pick(biased), stage);
      if (affix?.elite === 'berserker') this.applyBerserkerElite(enemy, affix);
      else if (affix?.elite === 'regenerator') this.applyRegeneratorElite(enemy, affix);
      else if (affix?.elite === 'jammer') this.applyJammerElite(enemy, affix);
      this.enemies.push(enemy);
    },

    applyBerserkerElite(enemy, affix) {
      if (!enemy || !affix) return enemy;
      enemy.elite = 'berserker';
      enemy.color = affix.color || enemy.color;
      enemy.speed *= affix.eliteSpeedMult || 1.18;
      enemy.fireMult = Math.min(enemy.fireMult || 1, affix.eliteFireMult || 0.78);
      enemy.fire *= enemy.fireMult;
      enemy.score = Math.round(enemy.score * (affix.eliteScoreMult || 1.5));
      enemy.hp = Math.max(1, Math.round(enemy.hp * (affix.eliteHpMult || 0.92)));
      enemy.maxHp = enemy.hp;
      return enemy;
    },

    applyRegeneratorElite(enemy, affix) {
      if (!enemy || !affix) return enemy;
      enemy.elite = 'regenerator';
      enemy.color = affix.color || enemy.color;
      enemy.score = Math.round(enemy.score * (affix.eliteScoreMult || 1.42));
      enemy.hp = Math.max(1, Math.round(enemy.hp * (affix.eliteHpMult || 1.06)));
      enemy.maxHp = enemy.hp;
      enemy.regenEvery = affix.regenEvery || 2.6;
      enemy.regenPct = affix.regenPct || 0.08;
      enemy.regenTimer = enemy.regenEvery;
      return enemy;
    },

    applyJammerElite(enemy, affix) {
      if (!enemy || !affix) return enemy;
      enemy.elite = 'jammer';
      enemy.color = affix.color || enemy.color;
      enemy.score = Math.round(enemy.score * (affix.eliteScoreMult || 1.36));
      enemy.hp = Math.max(1, Math.round(enemy.hp * (affix.eliteHpMult || 1.03)));
      enemy.maxHp = enemy.hp;
      enemy.jamRadius = Math.max(enemy.jamRadius || 0, affix.eliteJamRadius || 180);
      enemy.weaponSlow = Math.max(enemy.weaponSlow || 1, affix.eliteWeaponSlow || 1.18);
      return enemy;
    },

    spawnBoss() {
      const def = this.route[this.segmentIndex];
      this.boss = new Boss(def);
      this.say(bridge.lineFor('boss', def), 3.8, {
        eventType: 'airspace_boss',
        boss: def,
        context: { stage: def.stage, pattern: def.pattern }
      });
      this.updateHud();
      showHudPanel('stage', 5);
    },

    firePlayer() {
      if (!this.player) return;
      const p = this.player;
      const color = this.weapon.color || '#72d6bd';
      const damage = (this.weapon.kind === 'cannon' ? 4 : 2) + (this.resonance.damageBonus || 0) + this.armorCaliberDamage();
      const speed = this.weapon.kind === 'cannon' ? -760 : -900;
      const spread = this.weapon.kind === 'beam' ? [-5, 0, 5] : this.weapon.kind === 'cannon' ? [0] : [-11, 11];
      for (const ox of spread) this.playerBullets.push({ x: p.x + ox, y: p.y - 18, vx: ox * 1.5, vy: speed, r: this.weapon.kind === 'cannon' ? 6 : 4, damage, color, main: true, dead: false });
      for (let i = 0; i < Math.min(this.resonance.missileVolleyBonus || 0, 1); i += 1) {
        this.playerBullets.push({ x: p.x, y: p.y - 30, vx: 0, vy: -650, r: 5, damage: Math.max(2, Math.round(damage * 0.8)), color: '#ff922b', missileVolley: true, dead: false });
      }
      for (let i = 1; i <= Math.min(this.resonance.sidePairs || 0, 2); i += 1) {
        const offset = 20 * i;
        const sideDamage = Math.max(1, Math.round(damage * 0.55));
        this.playerBullets.push({ x: p.x - offset, y: p.y - 8, vx: -145 - i * 28, vy: speed, r: 3, damage: sideDamage, color: '#ffd43b', dead: false });
        this.playerBullets.push({ x: p.x + offset, y: p.y - 8, vx: 145 + i * 28, vy: speed, r: 3, damage: sideDamage, color: '#ffd43b', dead: false });
      }
      if (this.weapon.kind === 'beam') {
        const pairs = Math.min(this.resonance.splitPairs || 0, 3);
        for (let i = 1; i <= pairs; i += 1) {
          const offset = 34 * i;
          const splitDamage = Math.max(1, Math.round(damage * 0.45));
          this.playerBullets.push({ x: p.x - offset, y: p.y - 16, vx: -18, vy: speed, r: 3, damage: splitDamage, color: '#be4bdb', dead: false });
          this.playerBullets.push({ x: p.x + offset, y: p.y - 16, vx: 18, vy: speed, r: 3, damage: splitDamage, color: '#be4bdb', dead: false });
        }
      }
      for (let i = 0; i < p.wings; i += 1) {
        const ox = (i - (p.wings - 1) / 2) * 36;
        this.playerBullets.push({ x: p.x + ox, y: p.y, vx: 0, vy: -820, r: 3, damage: 1, color: '#eef3ec', dead: false });
      }
    },

    fireEnemyAt(x, y, speed, damage, count = 1, spread = 0) {
      if (!this.player) return;
      const base = Math.atan2(this.player.y - y, this.player.x - x);
      this.fireFan(x, y, base, spread, count, speed, damage);
    },

    fireFan(x, y, base, spread, count, speed, damage) {
      for (let i = 0; i < count; i += 1) {
        const a = count === 1 ? base : base - spread / 2 + spread * (i / (count - 1));
        this.enemyBullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5, damage, dead: false });
      }
    },

    fireRing(x, y, count, speed, damage) {
      for (let i = 0; i < count; i += 1) {
        const a = i * Math.PI * 2 / count;
        this.enemyBullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5, damage, dead: false });
      }
    },

    explodeMine(mine) {
      if (!mine || mine.dead) return;
      mine.dead = true;
      this.fireRing(mine.x, mine.y, mine.ringCount || 8, mine.ringSpeed || 170, mine.damage || 9);
      this.burst(mine.x, mine.y, mine.color || '#ff922b', 12);
    },

    fireBarrageRing(boss, affix) {
      this.fireRing(
        boss.x,
        boss.y,
        affix.count || 14,
        affix.speed || 230,
        9 * (affix.damageMult || 1)
      );
      this.burst(boss.x, boss.y, affix.color || '#ff922b', 10);
      this.say('环幕词缀展开整圈弹幕，先横移找空隙再反击。', 1.8);
    },

    movingWallGap(boss = null) {
      const step = Number(boss?.wallGapStep) || 0;
      const seed = Number(boss?.wallGapSeed) || 0;
      const phase = boss?.phase || 1;
      const wallGapLanes = [-0.78, -0.42, 0, 0.42, 0.78, 0.42, 0, -0.42];
      const lane = wallGapLanes[Math.abs(Math.round(step)) % wallGapLanes.length];
      const sweep = lane * (W / 2 - 116);
      const drift = Math.sin(seed + step * 0.7) * (18 + phase * 5);
      const playerBias = this.player ? (this.player.x - W / 2) * 0.12 : 0;
      return clamp(W / 2 + sweep + drift + playerBias, 78, W - 78);
    },

    fireWall(x, y, speed, boss = null, options = {}) {
      const gap = boss ? this.movingWallGap(boss) : this.player?.x || W / 2;
      const laneOffset = boss ? (Math.round(boss.wallGapStep || 0) % 2) * 19 : 0;
      const spacing = options.spacing || 38;
      const gapSize = options.gap || 58;
      for (let bx = 26 + laneOffset; bx < W - 26; bx += spacing) {
        if (Math.abs(bx - gap) < gapSize) continue;
        this.enemyBullets.push({ x: bx, y: y + 20, vx: 0, vy: speed, r: 5, damage: 9, dead: false });
      }
    },

    fireBossLaser(x, attack, damage, color) {
      this.lasers.push({
        x: clamp(x, 28, W - 28),
        warn: attack.warn || 0.6,
        dur: attack.dur || 0.8,
        width: attack.width || 46,
        damage,
        color: color || '#cc5de8',
        t: 0,
        phase: 'warn',
        hit: false,
        dead: false
      });
    },

    firePrismLane(boss, affix) {
      const x = clamp(this.player?.x || boss.x, 44, W - 44);
      for (let i = -3; i <= 3; i += 1) {
        this.enemyBullets.push({ x: x + i * 9, y: boss.y + boss.r * 0.35, vx: i * 12, vy: 310, r: 4, damage: 10, color: affix.color, dead: false });
      }
      this.burst(x, boss.y + boss.r, affix.color, 10);
      this.say('棱镜词缀折出竖直裂线，立刻离开当前航道。', 1.8);
    },

    firePrismBurst(boss, affix) {
      const x = clamp(this.player?.x || boss.x, 44, W - 44);
      this.lasers.push({
        x,
        warn: affix.warn || 0.58,
        dur: affix.dur || 0.52,
        width: affix.width || 38,
        damage: 8 * (affix.damageMult || 1),
        color: affix.color || '#d8c58a',
        burst: { boss, affix },
        t: 0,
        phase: 'warn',
        hit: false,
        dead: false
      });
      this.burst(x, boss.y + boss.r, affix.color, 10);
      this.say('棱爆预警亮起，光束结束后会折出侧向慢弹。', 1.8);
    },

    fireIonStormLane(boss, affix) {
      const baseX = this.player?.x || boss.x;
      const x = clamp(baseX + (Math.random() - 0.5) * (affix.jitter || 160), 36, W - 36);
      this.lasers.push({
        x,
        warn: affix.warn || 0.72,
        dur: affix.dur || 0.5,
        width: affix.width || 34,
        damage: affix.damage || 7,
        color: affix.color || '#cc5de8',
        t: 0,
        phase: 'warn',
        hit: false,
        dead: false
      });
      this.burst(x, boss.y + boss.r, affix.color, 8);
      this.say('离子风暴预警亮起，横移脱离紫色镭射航道。', 1.8);
    },

    finishPrismBurst(laser) {
      const burst = laser.burst;
      if (!burst?.boss || !burst.affix) return;
      const boss = burst.boss;
      const affix = burst.affix;
      const count = affix.count || 6;
      for (let i = 0; i < count; i += 1) {
        const side = i % 2 ? 1 : -1;
        const row = Math.floor(i / 2);
        this.enemyBullets.push({
          x: boss.x + side * boss.r * 0.65,
          y: boss.y + boss.r + row * 18,
          vx: side * (affix.speed || 210),
          vy: 70 + row * 20,
          r: 5,
          damage: 7 * (affix.damageMult || 1),
          color: affix.color || '#d8c58a',
          dead: false
        });
      }
      this.burst(boss.x, boss.y + boss.r, affix.color, 12);
    },

    fireGravityPulse(boss, affix) {
      this.gravityPulses.push({
        x: boss.x,
        y: boss.y + boss.r * 0.3,
        warn: affix.warn || 0.82,
        dur: affix.dur || 2.1,
        radius: affix.radius || 230,
        strength: affix.strength || 92,
        color: affix.color || '#4dabf7',
        t: 0,
        phase: 'warn',
        dead: false
      });
      this.say('引潮圆环正在成形，预警结束后会轻拉机体惯性。', 1.8);
    },

    bossGuardCount(boss) {
      return this.enemies.filter(enemy => !enemy.dead && enemy.guardBoss === boss).length;
    },

    fireBossEscort(boss, affix) {
      const activeAdds = this.enemies.filter(enemy => !enemy.dead).length;
      if (activeAdds >= (affix.maxAdds || 4)) return;
      const count = Math.max(1, Math.min(affix.adds || 1, (affix.maxAdds || 4) - activeAdds));
      for (let i = 0; i < count; i += 1) {
        const side = i % 2 ? 1 : -1;
        const escort = new Enemy(affix.enemy || 'gunner', boss.def.stage + 1);
        escort.x = clamp(boss.x + side * (boss.r + escort.r + 28 + Math.floor(i / 2) * 28), escort.r + 12, W - escort.r - 12);
        escort.baseX = escort.x;
        escort.y = Math.max(28, boss.y + boss.r * 0.3 + Math.floor(i / 2) * 24);
        escort.hp += 4;
        escort.maxHp = escort.hp;
        escort.score += 140;
        if (affix.key === 'ironCarrier' || boss.skywardBossIndex === 8) escort.guardBoss = boss;
        if (affix.elite === 'jammer') this.applyJammerElite(escort, affix);
        else if (affix.elite === 'berserker') this.applyBerserkerElite(escort, affix);
        this.enemies.push(escort);
        this.burst(escort.x, escort.y, affix.color || escort.color, 10);
      }
      const line = affix.key === 'phantomEscort'
        ? '幻影护航投放高速残影僚机，先截断侧翼追击。'
        : affix.elite === 'jammer'
          ? '电子战词缀投放扰频精英机，先脱离干扰圈再反击。'
          : affix.key === 'ironCarrier'
            ? '铁幕护卫正在替 Boss 承压，清空护卫会打开甲板弱点。'
            : '护卫词缀投放重炮僚机，先清掉侧翼高威胁目标。';
      this.say(line, 1.8);
    },

    openBossWeakPoint(boss, affix) {
      if (!boss || !affix) return false;
      boss._weakTimer = (affix.dur || 2.5) + (Number(this.resonance.weakScannerDuration) || 0);
      this.burst(boss.x, boss.y, affix.color || '#ffd43b', 16);
      const bonus = (Number(affix.weakDamageMult) || 0) + (Number(this.resonance.weakScannerDamageMult) || 0);
      this.say(`露核词缀打开裂隙核心，弱点窗口 +${Math.round(bonus * 100)}% Boss 伤害。`, 1.8);
      return true;
    },

    repairBoss(boss, affix) {
      if (!boss || boss.hp >= boss.maxHp) return false;
      const heal = Math.min(boss.maxHp - boss.hp, Math.max(1, Math.round(boss.maxHp * (affix.healPct || 0.03))));
      boss.hp += heal;
      this.burst(boss.x, boss.y, affix.color || '#38d9a9', 16);
      this.say(`${boss.def.title}启动维修词缀，裂隙外壳回复 ${heal} 点。`, 1.8);
      return true;
    },

    triggerPainConverter(player, hpLoss) {
      const perHp = Number(this.resonance.painConverterCooldownPerHp) || 0;
      if (!player || hpLoss <= 0 || perHp <= 0 || player.skillCd <= 0) return 0;
      const maxRefund = Number(this.resonance.painConverterMaxCooldown) || 3;
      const refund = Math.min(maxRefund, Math.round(hpLoss * perHp * 10) / 10);
      const before = player.skillCd;
      player.skillCd = Math.max(0, player.skillCd - refund);
      const applied = before - player.skillCd;
      if (applied <= 0) return 0;
      this.painConverted += applied;
      this.burst(player.x, player.y, '#f06595', 8);
      return applied;
    },

    useSkill() {
      const p = this.player;
      if (!p || p.skillCd > 0 || this.state !== 'playing') return;
      p.skillCd = 8 * (this.resonance.skillCooldownMult || 1);
      this.creationOverload += 1;
      this.say(bridge.lineFor('weapon'), 3.2, {
        eventType: 'airspace_weapon',
        context: { creationOverload: this.creationOverload }
      });
      this.enemyBullets.forEach(b => {
        if (this.weapon.kind === 'beam' ? Math.abs(b.x - p.x) < 72 : dist2(b, p) < 190 * 190) b.dead = true;
      });
      if (this.weapon.kind === 'shield') {
        p.shield += 42;
        p.hp = Math.min(p.maxHp, p.hp + 10);
      } else if (this.weapon.kind === 'wing') {
        p.wings = Math.min(4, p.wings + 1);
      } else {
        for (const e of this.enemies) {
          if (!e.dead && Math.abs(e.x - p.x) < 120) {
            if (e.damage(this.playerDamage(12 + (this.resonance.damageBonus || 0), e))) this.killEnemy(e);
          }
        }
        if (this.boss && Math.abs(this.boss.x - p.x) < 130 && this.boss.damage(this.playerDamage(38 + (this.resonance.damageBonus || 0) * 4, this.boss))) this.defeatBoss();
      }
      this.burst(p.x, p.y, this.weapon.color, 28);
    },

    killEnemy(enemy) {
      enemy.dead = true;
      this.score += Math.round(enemy.score * (this.resonance.scoreMult || 1));
      this.burst(enemy.x, enemy.y, enemy.color, 14);
      if (enemy.type === 'detonator') this.fireRing(enemy.x, enemy.y, enemy.ringCount || 14, enemy.ringSpeed || 210, enemy.ringDamage || 9);
      this.pointDefenseCleared += this.triggerPointDefense(enemy);
      this.triggerLivingArmorGrowth();
      if (enemy.guardBoss && !enemy.guardBoss.dead && this.bossGuardCount(enemy.guardBoss) === 0) {
        const affix = enemy.guardBoss.affix || {};
        this.openBossWeakPoint(enemy.guardBoss, {
          ...affix,
          dur: affix.guardWeakDur || 2.4,
          weakDamageMult: affix.guardWeakDamageMult || 0.28
        });
      }
      if (enemy.type === 'carrier') this.spawnCarrierChildren(enemy);
      if (enemy.type === 'splitter') {
        for (let i = 0; i < 2; i += 1) {
          const child = new Enemy('small', this.segmentIndex + 1);
          child.x = clamp(enemy.x + (i ? 24 : -24), 20, W - 20);
          child.y = enemy.y;
          this.enemies.push(child);
        }
      }
      if (enemy.stolenKind) {
        this.powerups.push({ x: enemy.x, y: enemy.y, r: 12, kind: enemy.stolenKind, dead: false });
        this.say('收割机掉回了被夺走的补给。', 1.6);
      }
      if (Math.random() < 0.08) this.powerups.push({ x: enemy.x, y: enemy.y, r: 12, kind: pick(['heal', 'shield', 'power']), dead: false });
    },

    spawnCarrierChildren(enemy) {
      const count = Math.max(1, Math.min(3, enemy.spawnCount || 2));
      for (let i = 0; i < count; i += 1) {
        const child = new Enemy(enemy.spawns || 'medium', this.segmentIndex + 1);
        child.x = clamp(enemy.x + (i - (count - 1) / 2) * 30, 24, W - 24);
        child.baseX = child.x;
        child.y = enemy.y;
        child.carrierSpawn = 1;
        this.enemies.push(child);
      }
    },

    clearEnemyBulletsNear(x, y, range, color) {
      if (!range || range <= 0) return 0;
      let cleared = 0;
      for (const bullet of this.enemyBullets) {
        if (bullet.dead) continue;
        const dx = bullet.x - x;
        const dy = bullet.y - y;
        if (dx * dx + dy * dy > range * range) continue;
        bullet.dead = true;
        cleared += 1;
        if (cleared <= 5) this.burst(bullet.x, bullet.y, color, 3);
      }
      if (cleared > 0) this.burst(x, y, color, 10);
      return cleared;
    },

    triggerPointDefense(enemy) {
      const range = Number(this.resonance.pointDefenseRange) || 0;
      if (!enemy || range <= 0) return 0;
      return this.clearEnemyBulletsNear(enemy.x, enemy.y, range, '#74c0fc');
    },

    triggerLivingArmorGrowth() {
      const every = Number(this.resonance.livingArmorEvery) || 0;
      const hp = Number(this.resonance.livingArmorHp) || 0;
      const maxHp = Number(this.resonance.livingArmorMaxHp) || 0;
      if (!this.player || every <= 0 || hp <= 0 || maxHp <= 0) return 0;
      this.livingArmorKills += 1;
      if (this.livingArmorKills % every !== 0) return 0;
      const gain = Math.min(hp, maxHp - this.livingArmorHpGained);
      if (gain <= 0) return 0;
      this.livingArmorHpGained += gain;
      this.player.maxHp += gain;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + gain);
      this.burst(this.player.x, this.player.y, '#2f9e44', 10);
      return gain;
    },

    repairNearbyEnemies(source) {
      let repaired = 0;
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy === source || enemy.hp >= enemy.maxHp) continue;
        if (dist2(source, enemy) > source.repairRadius * source.repairRadius) continue;
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + source.repairAmount);
        repaired += 1;
        this.burst(enemy.x, enemy.y, source.color, 4);
      }
      return repaired;
    },

    nearestPowerup(x, y, range) {
      let best = null;
      let bestD = range * range;
      for (const powerup of this.powerups) {
        if (powerup.dead) continue;
        const d = dist2({ x, y }, powerup);
        if (d >= bestD) continue;
        bestD = d;
        best = powerup;
      }
      return best;
    },

    stealPowerupFor(enemy, powerup) {
      if (!enemy || !powerup || powerup.dead) return false;
      powerup.dead = true;
      enemy.stolenKind = powerup.kind || 'power';
      enemy.escapeTimer = 2.2;
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + 3);
      enemy.score += 180;
      this.burst(powerup.x, powerup.y, enemy.color || '#fcc419', 10);
      this.say('收割机夺走了补给，先击落它可以把节奏抢回来。', 1.8);
      return true;
    },

    jamFactor(x, y) {
      let factor = 1;
      if (this.boss?.affix?.jamRadius && dist2({ x, y }, this.boss) <= this.boss.affix.jamRadius * this.boss.affix.jamRadius) {
        factor = Math.max(factor, this.boss.affix.weaponSlow || 1);
      }
      for (const enemy of this.enemies) {
        if (enemy.dead || (enemy.type !== 'jammer' && enemy.elite !== 'jammer')) continue;
        if (dist2({ x, y }, enemy) <= enemy.jamRadius * enemy.jamRadius) factor = Math.max(factor, enemy.weaponSlow);
      }
      const resist = clamp(Number(this.resonance.signalFilterJamResist) || 0, 0, 0.65);
      return 1 + (factor - 1) * Math.max(0.35, 1 - resist);
    },

    armorCaliberDamage() {
      const configured = Number(this.resonance.armorCaliberDamage) || 0;
      if (configured > 0) return configured;
      const extraHp = Math.max(0, (this.player?.maxHp || 0) - (this.player?.baseMaxHp || 110));
      const perDamage = this.resonance.armorCaliberHpPerDamage || 15;
      const maxDamage = this.resonance.armorCaliberMaxDamage || 4;
      return Math.min(maxDamage, Math.floor(extraHp / perDamage));
    },

    armorPierces(bullet, target) {
      const minHp = this.resonance.armorPierceMinHp || 12;
      return bullet.main && (this.resonance.armorPierceMult || 0) > 0 && target?.maxHp >= minHp;
    },

    playerBulletDamage(bullet, target) {
      const damage = this.armorPierces(bullet, target) ? bullet.damage * (1 + this.resonance.armorPierceMult) : bullet.damage;
      return this.playerDamage(damage, target);
    },

    playerDamage(amount, target = null) {
      const vital = Number(this.resonance.vitalReactorDamageMult) || 0;
      const hunter = target?.isBoss ? Number(this.resonance.bossHunterDamageMult) || 0 : 0;
      const threshold = Number(this.resonance.executionerThreshold) || 0;
      const executioner = target?.maxHp && target.hp / target.maxHp <= threshold
        ? Number(this.resonance.executionerDamageMult) || 0
        : 0;
      const shield = (this.player?.shield || 0) > 0 ? Number(this.resonance.shieldAmplifierDamageMult) || 0 : 0;
      const weak = target?.isBoss && target._weakTimer > 0
        ? (Number(target.affix?.weakDamageMult) || 0) + (Number(this.resonance.weakScannerDamageMult) || 0)
        : 0;
      return amount * (1 + vital + hunter + executioner + shield + weak);
    },

    resolveCollisions() {
      for (const b of this.playerBullets) {
        if (b.dead) continue;
        for (const e of this.enemies) {
          if (!e.dead && hit(b, e)) {
            b.dead = true;
            if (this.armorPierces(b, e)) this.burst(b.x, b.y, '#ff922b', 6);
            if (e.damage(this.playerBulletDamage(b, e), 'bullet')) this.killEnemy(e);
            else this.burst(b.x, b.y, '#eef3ec', 3);
            break;
          }
        }
        if (!b.dead && this.boss && hit(b, this.boss)) {
          b.dead = true;
          if (this.armorPierces(b, this.boss)) this.burst(b.x, b.y, '#ff922b', 6);
          if (this.boss.damage(this.playerBulletDamage(b, this.boss))) this.defeatBoss();
          else this.burst(b.x, b.y, '#eef3ec', 3);
        }
      }

      for (const b of this.enemyBullets) {
        if (!b.dead && this.player && hit(b, this.player)) {
          b.dead = true;
          this.player.takeDamage(b.damage);
          this.burst(b.x, b.y, '#f87171', 6);
        }
      }

      for (const e of this.enemies) {
        if (!e.dead && this.player && hit(e, this.player)) {
          e.dead = true;
          this.player.takeDamage(e.crashDamage || 18);
          if (e.type === 'kamikaze') this.fireRing(e.x, e.y, 10, 185, 8);
          this.burst(e.x, e.y, e.color, 12);
        }
      }

      if (this.boss && this.player && this.bossContactCd <= 0 && hit(this.boss, this.player)) {
        this.bossContactCd = 0.75;
        this.player.takeDamage(28 + this.boss.def.stage * 2);
        this.player.targetY = Math.min(H - this.player.r - 18, this.player.y + 72);
        this.player.targetX = clamp(this.player.x + (this.player.x < this.boss.x ? -42 : 42), this.player.r + 8, W - this.player.r - 8);
        this.shake = Math.max(this.shake, 10);
        this.burst(this.player.x, this.player.y, this.boss.color, 14);
      }

      for (const p of this.powerups) {
        if (!p.dead && this.player && hit(p, this.player)) {
          p.dead = true;
          if (p.kind === 'heal') this.player.hp = Math.min(this.player.maxHp, this.player.hp + 16);
          else if (p.kind === 'shield') this.player.shield += 28;
          else this.score += 300;
          this.burst(p.x, p.y, '#d8c58a', 8);
        }
      }
    },

    defeatBoss() {
      const boss = this.boss.def;
      const title = boss.affix ? `${boss.affix.name}·${boss.title}` : boss.title;
      this.score += Math.round((boss.hp + boss.stage * 700) * (boss.affix?.scoreMult || 1) * (this.resonance.scoreMult || 1));
      const reward = this.clearanceReward(this.damageTaken <= this.segmentStartDamage);
      this.bossDefeated.push(title);
      this.clearedLayers += 1;
      const clearanceText = bridge.lineFor('boss-defeated', boss);
      this.showClearanceCard(title, `${clearanceText}${reward.text}`, this.clearedLayers);
      this.say(clearanceText, 3.8, {
        eventType: 'airspace_boss_defeated',
        boss,
        context: { clearedLayers: this.clearedLayers }
      }, aiText => {
        this.updateClearanceCard(aiText);
      });
      this.burst(this.boss.x, this.boss.y, boss.color, 40);
      this.boss = null;
      this.enemies.length = 0;
      this.enemyBullets.length = 0;
      this.lasers.length = 0;
      setTimeout(() => {
        if (this.state === 'playing') this.nextSegment();
      }, 2200);
    },

    clearanceReward(clean) {
      const gain = Math.round((clean ? 960 : 640) * (this.resonance.scoreMult || 1));
      this.score += gain;
      if (clean && this.player) {
        this.cleanClears += 1;
        this.player.shield += 18;
        this.burst(this.player.x, this.player.y, '#74c0fc', 12);
        return { gain, shield: 18, text: ` 完美清算奖励 +${gain}，护盾+18。` };
      }
      return { gain, shield: 0, text: ` 清算奖励 +${gain}。` };
    },

    showClearanceCard(title, text, clearedLayers) {
      if (!clearanceCard) return;
      if (clearanceKicker) clearanceKicker.textContent = `第${clearedLayers}段清算`;
      if (clearanceTitle) clearanceTitle.textContent = title;
      if (clearanceBody) clearanceBody.textContent = text;
      clearanceCard.classList.remove('hidden');
    },

    updateClearanceCard(text) {
      if (!clearanceCard || clearanceCard.classList.contains('hidden') || !text) return;
      if (clearanceBody) clearanceBody.textContent = text;
    },

    hideClearanceCard() {
      clearanceCard?.classList.add('hidden');
    },

    reviewTags(victory) {
      const tags = [this.resonance.name];
      if (this.damageTaken >= 100) tags.push('承伤偏高');
      else if (this.clearedLayers >= 2) tags.push('走位稳定');
      if ((Number(this.resonance.flowHpBonus) || 0) >= 20) tags.push(`机体构筑 +${this.resonance.flowHpBonus}HP`);
      if (this.jammedTime / Math.max(1, this.time) >= 0.18) tags.push('干扰压力高');
      if (this.clearedLayers >= this.route.length) tags.push('Boss处理完整');
      else if (this.clearedLayers >= 3) tags.push('中段清算有效');
      if (this.creationOverload >= 3) tags.push('频繁脉冲');
      if (this.painConverted >= 2) tags.push('痛觉转译');
      if (this.pointDefenseCleared >= 4) tags.push('近防协议');
      if (this.livingArmorHpGained > 0) tags.push(`活性装甲 +${this.livingArmorHpGained}HP`);
      if (this.repairLoopTriggers > 0) tags.push(`维修循环x${this.repairLoopTriggers}`);
      if (this.lastStandTriggered) tags.push('黑匣子保险');
      if (this.cleanClears >= 2) tags.push('完美清算');
      if (this.route.some(boss => boss.affix?.attack === 'prism')) tags.push('棱镜航线');
      if (this.route.some(boss => boss.affix?.attack === 'prismBurst')) tags.push('棱爆折射');
      if (this.route.some(boss => boss.affix?.attack === 'ionStorm')) tags.push('离子风暴');
      if (this.route.some(boss => boss.affix?.attack === 'gravity')) tags.push('引潮重力');
      if (this.route.some(boss => boss.affix?.key === 'ironCarrier')) tags.push('铁幕护卫');
      if (this.route.some(boss => boss.affix?.attack === 'weak')) tags.push('露核窗口');
      if (this.route.some(boss => boss.affix?.key === 'phantomEscort')) tags.push('幻影护航');
      if (this.route.some(boss => boss.affix?.attack === 'escort')) tags.push('护卫僚机');
      if (this.route.some(boss => boss.affix?.attack === 'ring')) tags.push('环幕弹幕');
      if (!victory && this.bossDefeated.length === 0) tags.push('首段压力高');
      return [...new Set(tags)].slice(0, 4);
    },

    renderResultBody(result, victory) {
      const jamText = result.jammedTime > 0 ? `，干扰 ${result.jammedTime}s` : '';
      resultBody.textContent = `${result.notableMoment} 分数 ${result.score}，清算 ${result.clearedLayers}/6 段${jamText}。复盘：${this.reviewTags(victory).join(' · ')}。`;
    },

    finish(outcome) {
      this.state = 'result';
      this.syncUiState();
      const victory = outcome === 'victory';
      const result = bridge.publishResult({
        outcome: victory ? 'victory' : 'defeat',
        score: this.score,
        clearedLayers: this.clearedLayers,
        bossDefeated: this.bossDefeated,
        cleanClears: this.cleanClears,
        damageTaken: this.damageTaken,
        creationOverload: this.creationOverload,
        painConverted: Math.round(this.painConverted * 10) / 10,
        pointDefenseCleared: this.pointDefenseCleared,
        livingArmorHpGained: this.livingArmorHpGained,
        jammedTime: Math.round(this.jammedTime),
        rescuedEchoes: victory ? this.difficulty.allyWings + this.clearedLayers : this.clearedLayers,
        endingModifier: victory ? 'airspace_cleansed' : 'airspace_scarred',
        affixes: this.route.map(boss => `${boss.affix.name}·${boss.title}`)
      });
      this.resultId = result.id;
      resultTitle.textContent = victory ? '裂隙空域已清算' : '空域载体坠落';
      this.renderResultBody(result, victory);
      resultPanel.classList.remove('hidden');
      this.say(victory ? bridge.lineFor('victory') : bridge.lineFor('defeat'), 4, {
        eventType: victory ? 'airspace_victory' : 'airspace_defeat',
        context: { result }
      }, aiText => {
        if (this.state !== 'result' || this.resultId !== result.id) return;
        const updated = bridge.publishResult({ ...result, notableMoment: aiText });
        this.renderResultBody(updated, victory);
      });
    },

    burst(x, y, color, count) {
      for (let i = 0; i < count; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const s = 45 + Math.random() * 190;
        this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.35, max: 0.7, color });
      }
    },

    say(text, seconds = 2.5, narrative = null, onNarrative = null) {
      const requestId = ++this.commRequestId;
      comm.textContent = compactNarrative(text);
      comm.dataset.until = String(this.time + seconds);
      if (!narrative || typeof bridge.requestAirCombatText !== 'function') return;
      bridge.requestAirCombatText(narrative.eventType, text, {
        segment: this.segmentIndex + 1,
        score: Math.round(this.score),
        playerHp: Math.round(this.player?.hp || 0),
        weapon: this.weapon?.name,
        boss: narrative.boss ? {
          id: narrative.boss.id,
          title: narrative.boss.title,
          stage: narrative.boss.stage,
          memory: narrative.boss.memory
        } : null,
        ...narrative.context
      }).then(aiText => {
        if (!aiText || this.commRequestId !== requestId) return;
        comm.textContent = compactNarrative(aiText);
        comm.dataset.until = String(this.time + seconds + 1.2);
        if (typeof onNarrative === 'function') onNarrative(aiText);
      });
    },

    updateHud() {
      const boss = this.route[this.segmentIndex] || this.route[this.route.length - 1];
      hudStage.textContent = boss ? `${boss.stage}/6 ${boss.affix.name}·${boss.title}` : '第七天裂隙空域';
      if (hudAffix) {
        const active = this.boss?.def === boss ? this.boss : null;
        const cd = active?.affix?.attack ? ` · ${Math.max(0, active.affixTimer || 0).toFixed(1)}s` : '';
        const weak = active?._weakTimer > 0 ? ` · 弱点${active._weakTimer.toFixed(1)}s` : '';
        hudAffix.textContent = boss?.affix ? `${boss.affix.line}${weak}${cd}` : '';
      }
      const weaponTags = this.weaponHudTags();
      hudWeapon.textContent = `${this.weapon.name} · ${this.resonance.name}${weaponTags.length ? ` · ${weaponTags.join(' · ')}` : ''}`;
      hudScore.textContent = String(Math.round(this.score));
      skillBtn.disabled = !this.player || this.player.skillCd > 0 || this.state !== 'playing';
      skillBtn.textContent = this.player && this.player.skillCd > 0 ? `${Math.ceil(this.player.skillCd)}s` : '造物脉冲';
    },

    weaponHudTags() {
      const tags = [];
      const add = (condition, label) => {
        if (condition && !tags.includes(label) && tags.length < 3) tags.push(label);
      };
      add(this.player?.shield > 0 && Number(this.resonance.shieldAmplifierDamageMult) > 0, `护盾增伤+${Math.round(this.resonance.shieldAmplifierDamageMult * 100)}%`);
      add((this.resonance.missileVolleyBonus || 0) > 0, '齐射+1');
      add(Number(this.resonance.executionerDamageMult) > 0, `处决+${Math.round(this.resonance.executionerDamageMult * 100)}%`);
      add(Number(this.resonance.weakScannerDamageMult) > 0, `弱点+${Math.round(this.resonance.weakScannerDamageMult * 100)}%`);
      add((this.resonance.pointDefenseRange || 0) > 0, '近防');
      add(Number(this.resonance.repairLoopEvery) > 0, `维修${Math.max(0, Math.ceil(this.resonance.repairLoopEvery - this.repairLoopT))}s`);
      add(Number(this.resonance.livingArmorMaxHp) > 0, `活甲${this.livingArmorHpGained}/${this.resonance.livingArmorMaxHp}`);
      add(Number(this.resonance.signalFilterJamResist) > 0, `抗扰${Math.round(this.resonance.signalFilterJamResist * 100)}%`);
      add(this.player?.lastStandShield, `黑匣${this.player?.lastStandReady ? '就绪' : '已触发'}`);
      add(this.difficulty.fieldRepair, '纳米修复');
      const jam = this.player ? this.jamFactor(this.player.x, this.player.y) : 1;
      add(jam > 1, `干扰x${jam.toFixed(2)}`);
      return tags;
    },

    lastStandStatus() {
      if (!this.player?.lastStandShield) return '';
      return ` · 黑匣子${this.player.lastStandReady ? '就绪' : '已触发'}`;
    },

    fieldRepairStatus() {
      if (!this.difficulty.fieldRepair) return '';
      if (!this.player || this.player.hp >= this.player.maxHp) return ' · 纳米修复';
      const wait = Math.max(0, Math.ceil(this.difficulty.fieldRepair.delay - this.noHitT));
      return ` · 纳米修复${wait > 0 ? wait + 's' : '中'}`;
    },

    armorCaliberStatus() {
      const damage = this.armorCaliberDamage();
      return damage > 0 ? ` · 装甲口径+${damage}` : '';
    },

    vitalReactorStatus() {
      const mult = Number(this.resonance.vitalReactorDamageMult) || 0;
      return mult > 0 ? ` · 生命炉心+${Math.round(mult * 100)}%` : '';
    },

    shieldAmplifierStatus() {
      const mult = Number(this.resonance.shieldAmplifierDamageMult) || 0;
      if (mult <= 0) return '';
      return this.player?.shield > 0 ? ` · 护盾放大器+${Math.round(mult * 100)}%` : ' · 护盾放大器待充能';
    },

    bossHunterStatus() {
      const mult = Number(this.resonance.bossHunterDamageMult) || 0;
      return mult > 0 ? ` · 猎首协议+${Math.round(mult * 100)}%` : '';
    },

    executionerStatus() {
      const mult = Number(this.resonance.executionerDamageMult) || 0;
      return mult > 0 ? ` · 处决算法+${Math.round(mult * 100)}%` : '';
    },

    weakScannerStatus() {
      const mult = Number(this.resonance.weakScannerDamageMult) || 0;
      return mult > 0 ? ` · 弱点标定+${Math.round(mult * 100)}%` : '';
    },

    missileVolleyStatus() {
      return (this.resonance.missileVolleyBonus || 0) > 0 ? ' · 导弹齐射+1' : '';
    },

    painConverterStatus() {
      return (this.resonance.painConverterCooldownPerHp || 0) > 0 ? ' · 痛觉转换' : '';
    },

    pointDefenseStatus() {
      return (this.resonance.pointDefenseRange || 0) > 0 ? ' · 近防协议' : '';
    },

    livingArmorStatus() {
      const maxHp = Number(this.resonance.livingArmorMaxHp) || 0;
      return maxHp > 0 ? ` · 活性装甲+${this.livingArmorHpGained}/${maxHp}HP` : '';
    },

    repairLoopStatus() {
      const every = Number(this.resonance.repairLoopEvery) || 0;
      if (every <= 0) return '';
      const wait = Math.max(0, Math.ceil(every - this.repairLoopT));
      return ` · 维修循环${wait > 0 ? wait + 's' : '就绪'}`;
    },

    signalFilterStatus() {
      const resist = Number(this.resonance.signalFilterJamResist) || 0;
      return resist > 0 ? ` · 抗干扰滤波-${Math.round(resist * 100)}%` : '';
    },

    jamStatus() {
      if (!this.player) return '';
      const jam = this.jamFactor(this.player.x, this.player.y);
      return jam > 1 ? ` · 干扰×${jam.toFixed(2)}` : '';
    },

    updateJammerPressure(dt) {
      if (this.player && this.jamFactor(this.player.x, this.player.y) > 1) this.jammedTime += dt;
    },

    update(dt) {
      this.time += dt;
      for (const star of this.stars) {
        star.y += star.s * dt;
        if (star.y > H) {
          star.y = 0;
          star.x = Math.random() * W;
        }
      }
      for (const p of this.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life -= dt;
      }
      this.particles = this.particles.filter(p => p.life > 0);
      if (this.state !== 'playing') return;

      this.segmentTime += dt;
      this.nearLineCd = Math.max(0, this.nearLineCd - dt);
      this.bossContactCd = Math.max(0, (this.bossContactCd || 0) - dt);
      this.updateFieldRepair(dt);
      this.updateRepairLoop(dt);
      this.updateJammerPressure(dt);
      this.updateGravityPulses(dt);
      this.player.update(dt);
      if (!this.boss && this.segmentTime > 8.5) this.spawnBoss();
      this.spawnTimer -= dt;
      if (!this.boss && this.spawnTimer <= 0) {
        this.spawnTimer = Math.max(0.42, (1.2 - this.segmentIndex * 0.08) / this.difficulty.enemyRate);
        this.spawnEnemy();
      }
      this.boss?.update(dt);
      for (const e of this.enemies) e.update(dt);
      for (const b of this.playerBullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y < -20 || b.x < -20 || b.x > W + 20) b.dead = true;
      }
      for (const b of this.enemyBullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.kind === 'mine' && this.player && dist2(b, this.player) <= (b.triggerRadius || 60) * (b.triggerRadius || 60)) this.explodeMine(b);
        if (b.y > H + 24 || b.y < -24 || b.x < -24 || b.x > W + 24) b.dead = true;
      }
      for (const p of this.powerups) {
        p.y += 95 * dt;
        if (p.y > H + 20) p.dead = true;
      }
      this.updateLasers(dt);
      if (this.nearLineCd <= 0 && this.enemies.some(e => !e.dead && this.player && dist2(e, this.player) < 110 * 110)) {
        this.nearLineCd = 12;
        this.say(bridge.lineFor('near'), 2.6, { eventType: 'airspace_near' });
      }
      this.resolveCollisions();
      this.enemies = this.enemies.filter(e => !e.dead);
      this.playerBullets = this.playerBullets.filter(b => !b.dead);
      this.enemyBullets = this.enemyBullets.filter(b => !b.dead);
      this.lasers = this.lasers.filter(l => !l.dead);
      this.gravityPulses = this.gravityPulses.filter(pulse => !pulse.dead);
      this.powerups = this.powerups.filter(p => !p.dead);
      if (this.player.hp <= 0) this.finish('defeat');
      if (Number(comm.dataset.until || 0) < this.time) comm.textContent = '';
      this.shake = Math.max(0, this.shake - dt * 24);
      this.updateHud();
    },

    updateLasers(dt) {
      for (const laser of this.lasers) {
        laser.t += dt;
        if (laser.phase === 'warn') {
          if (laser.t >= laser.warn) {
            laser.phase = 'fire';
            laser.t = 0;
          }
          continue;
        }
        if (!laser.hit && this.player && Math.abs(this.player.x - laser.x) <= laser.width / 2 + this.player.r) {
          laser.hit = true;
          this.player.takeDamage(laser.damage);
        }
        if (laser.t >= laser.dur) {
          if (laser.burst && !laser.burstDone) {
            laser.burstDone = true;
            this.finishPrismBurst(laser);
          }
          laser.dead = true;
        }
      }
    },

    updateGravityPulses(dt) {
      for (const pulse of this.gravityPulses) {
        pulse.t += dt;
        if (pulse.phase === 'warn' && pulse.t >= pulse.warn) {
          pulse.phase = 'active';
          pulse.t = 0;
        } else if (pulse.phase === 'active' && pulse.t >= pulse.dur) {
          pulse.dead = true;
        }
      }
    },

    gravityPullAt(x, y) {
      let vx = 0;
      let vy = 0;
      for (const pulse of this.gravityPulses) {
        if (pulse.dead || pulse.phase !== 'active') continue;
        const dx = pulse.x - x;
        const dy = pulse.y - y;
        const d = Math.hypot(dx, dy);
        if (d <= 1 || d >= pulse.radius) continue;
        const k = (1 - d / pulse.radius) * pulse.strength;
        vx += dx / d * k;
        vy += dy / d * k * 0.45;
      }
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy.type !== 'tether') continue;
        const radius = enemy.cfg.pullRadius || 0;
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const d = Math.hypot(dx, dy);
        if (d <= 1 || d >= radius) continue;
        const k = (1 - d / radius) * (enemy.cfg.pullStrength || 80);
        vx += dx / d * k;
        vy += dy / d * k * 0.3;
      }
      return { x: vx, y: vy };
    },

    updateFieldRepair(dt) {
      const repair = this.difficulty.fieldRepair;
      if (!repair || !this.player) return;
      this.noHitT += dt;
      if (this.noHitT < repair.delay || this.player.hp <= 0 || this.player.hp >= this.player.maxHp) {
        this.fieldRepairT = 0;
        return;
      }
      this.fieldRepairT -= dt;
      if (this.fieldRepairT > 0) return;
      this.fieldRepairT = repair.tick || 1;
      const before = this.player.hp;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.max(1, Math.round(this.player.maxHp * repair.healPct)));
      if (this.player.hp > before) this.burst(this.player.x, this.player.y, '#69db7c', 6);
    },

    updateRepairLoop(dt) {
      const every = Number(this.resonance.repairLoopEvery) || 0;
      if (!this.player || every <= 0 || this.player.hp <= 0) return;
      this.repairLoopT += dt;
      if (this.repairLoopT < every) return;
      this.repairLoopT = 0;
      this.repairLoopTriggers += 1;
      const healPct = Number(this.resonance.repairLoopHealPct) || 0;
      const shield = Number(this.resonance.repairLoopShield) || 0;
      const maxShield = Number(this.resonance.repairLoopMaxShield) || 0;
      if (this.player.hp < this.player.maxHp && healPct > 0) {
        const before = this.player.hp;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.max(1, Math.round(this.player.maxHp * healPct)));
        if (this.player.hp > before) this.burst(this.player.x, this.player.y, '#38d9a9', 10);
        return;
      }
      if (shield > 0) {
        this.player.shield = maxShield > 0
          ? Math.min(maxShield, this.player.shield + shield)
          : this.player.shield + shield;
        this.burst(this.player.x, this.player.y, '#8bd3ff', 8);
      }
    },

    drawSkywardBackground() {
      const world = this.backgroundWorld || 1;
      const base = assets?.background(world, 'base');
      const mid = assets?.background(world, 'mid');
      const fg = assets?.background(world, 'fg');
      if (!base || !mid || !fg) return false;
      assets.drawScrolling(ctx, base, this.time * 24, 1);
      assets.drawScrolling(ctx, mid, this.time * 58, 0.7);
      assets.drawScrolling(ctx, fg, this.time * 118, 0.46);
      ctx.fillStyle = 'rgba(4, 8, 11, .22)';
      ctx.fillRect(0, 0, W, H);
      return true;
    },

    drawFallbackBackground() {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#11191d');
      bg.addColorStop(0.52, '#172126');
      bg.addColorStop(1, '#090d10');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(238,243,236,.34)';
      for (const star of this.stars) ctx.fillRect(star.x, star.y, star.r, star.r * 3);
      ctx.strokeStyle = 'rgba(216,197,138,.12)';
      ctx.lineWidth = 1;
      for (let y = (this.time * 90) % 80; y < H; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y - 20);
        ctx.stroke();
      }
    },

    draw() {
      ctx.save();
      if (this.shake > 0) ctx.translate((Math.random() * 2 - 1) * this.shake, (Math.random() * 2 - 1) * this.shake);
      if (!this.drawSkywardBackground()) this.drawFallbackBackground();
      for (const p of this.powerups) this.drawPowerup(p);
      this.drawLasers();
      this.drawGravityPulses();
      for (const b of this.playerBullets) this.drawPlayerBullet(b);
      for (const b of this.enemyBullets) this.drawEnemyBullet(b);
      for (const e of this.enemies) e.draw(ctx);
      this.boss?.draw(ctx);
      this.player?.draw(ctx);
      for (const p of this.particles) {
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;
      this.drawMeters();
      ctx.restore();
    },

    drawPlayerBullet(b) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - b.r / 2, b.y - 10, b.r, 16);
    },

    drawEnemyBullet(b) {
      if (b.kind === 'mine') {
        if (assets?.draw(ctx, assets.effect('floatingMine'), b.x, b.y, b.r * 2.4, game.time * 1.4)) {
          ctx.strokeStyle = `rgba(255, 146, 43, ${0.22 + 0.16 * Math.sin(game.time * 8) ** 2})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.triggerRadius || 60, 0, Math.PI * 2);
          ctx.stroke();
          return;
        }
        ctx.strokeStyle = 'rgba(255, 146, 43, .38)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.triggerRadius || 60, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = b.color || '#f87171';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x - 1, b.y - 1, b.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    },

    drawPowerup(p) {
      ctx.fillStyle = p.kind === 'heal' ? '#72d6bd' : p.kind === 'shield' ? '#8bd3ff' : '#d8c58a';
      ctx.beginPath();
      ctx.roundRect(p.x - 11, p.y - 11, 22, 22, 5);
      ctx.fill();
      ctx.fillStyle = '#0c1114';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.kind === 'heal' ? '+' : p.kind === 'shield' ? 'S' : '*', p.x, p.y + 1);
      ctx.textAlign = 'left';
    },

    drawLasers() {
      for (const laser of this.lasers) {
        const half = laser.width / 2;
        if (laser.phase === 'warn') {
          const alpha = 0.14 + 0.18 * Math.abs(Math.sin(laser.t * 18));
          ctx.fillStyle = `rgba(204, 93, 232, ${alpha})`;
          ctx.fillRect(laser.x - half, 0, laser.width, H);
          ctx.strokeStyle = 'rgba(238, 243, 236, .62)';
          ctx.lineWidth = 1;
        } else {
          ctx.fillStyle = 'rgba(204, 93, 232, .46)';
          ctx.fillRect(laser.x - half, 0, laser.width, H);
          ctx.strokeStyle = laser.color;
          ctx.lineWidth = 3;
        }
        ctx.beginPath();
        ctx.moveTo(laser.x - half, 0);
        ctx.lineTo(laser.x - half, H);
        ctx.moveTo(laser.x + half, 0);
        ctx.lineTo(laser.x + half, H);
        ctx.stroke();
      }
    },

    drawGravityPulses() {
      for (const pulse of this.gravityPulses) {
        const active = pulse.phase === 'active';
        const t = active ? clamp(pulse.t / pulse.dur, 0, 1) : clamp(pulse.t / pulse.warn, 0, 1);
        const radius = pulse.radius * (active ? 0.86 + t * 0.1 : 0.24 + t * 0.76);
        ctx.save();
        ctx.globalAlpha = active ? 0.34 + 0.16 * Math.sin(pulse.t * 12) ** 2 : 0.16 + 0.18 * t;
        ctx.strokeStyle = pulse.color || '#4dabf7';
        ctx.lineWidth = active ? 3 : 2;
        ctx.setLineDash(active ? [] : [8, 8]);
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    },

    drawMeters() {
      if (!this.player) return;
      const hpRatio = clamp(this.player.hp / this.player.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(16, H - 32, 180, 8);
      ctx.fillStyle = hpRatio > 0.34 ? '#72d6bd' : '#f87171';
      ctx.fillRect(16, H - 32, 180 * hpRatio, 8);
      if (this.player.shield > 0) {
        ctx.fillStyle = '#8bd3ff';
        ctx.fillRect(16, H - 20, Math.min(180, this.player.shield * 2), 5);
      }
    }
  };

  function pointerMove(event) {
    if (game.state !== 'playing' || !game.player) return;
    const p = screenPoint(event);
    game.player.targetX = p.x;
    game.player.targetY = p.y;
    event.preventDefault();
  }

  canvas.addEventListener('pointerdown', event => {
    setHudPanel('');
    pointerMove(event);
  });
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('touchstart', pointerMove, { passive: false });
  canvas.addEventListener('touchmove', pointerMove, { passive: false });
  window.addEventListener('keydown', event => {
    if (!game.player) return;
    const step = 42;
    if (event.key === 'ArrowLeft' || event.key === 'a') game.player.targetX -= step;
    if (event.key === 'ArrowRight' || event.key === 'd') game.player.targetX += step;
    if (event.key === 'ArrowUp' || event.key === 'w') game.player.targetY -= step;
    if (event.key === 'ArrowDown' || event.key === 's') game.player.targetY += step;
    if (event.key === ' ' || event.key === 'Shift') game.useSkill();
  });
  startBtn.addEventListener('click', () => {
    if (!game.advanceBriefing()) game.start();
  });
  document.getElementById('airspace-return').addEventListener('click', () => bridge.returnToMain());
  document.getElementById('result-return').addEventListener('click', () => bridge.returnToMain());
  skillBtn.addEventListener('click', () => game.useSkill());
  hudToggles.forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      toggleHudPanel(button.dataset.hudTarget || '');
    });
  });

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.draw();
    requestAnimationFrame(loop);
  }

  window.airCombatGame = game;
  window.CREATOR_EXAM_AIR_COMBAT_READY = true;
  document.documentElement.dataset.airCombatReady = 'true';
  if (document.body) document.body.dataset.airCombatReady = 'true';
  game.renderBriefingStep();
  game.updateHud();
  game.say(bridge.lineFor('intro'), 3, { eventType: 'airspace_intro' });
  requestAnimationFrame(loop);
})();
