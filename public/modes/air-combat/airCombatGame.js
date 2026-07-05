(function () {
  const bridge = window.AirCombatBridge;
  const canvas = document.getElementById('airspace-canvas');
  const ctx = canvas.getContext('2d');
  const hudStage = document.getElementById('hud-stage');
  const hudAffix = document.getElementById('hud-affix');
  const hudWeapon = document.getElementById('hud-weapon');
  const hudScore = document.getElementById('hud-score');
  const comm = document.getElementById('airspace-comm');
  const menu = document.getElementById('airspace-menu');
  const resultPanel = document.getElementById('airspace-result');
  const resultTitle = document.getElementById('result-title');
  const resultBody = document.getElementById('result-body');
  const skillBtn = document.getElementById('airspace-skill');
  const W = canvas.width;
  const H = canvas.height;
  const DEG = Math.PI / 180;

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

  function screenPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches?.[0] || event.changedTouches?.[0] || event;
    return {
      x: (touch.clientX - rect.left) / rect.width * W,
      y: (touch.clientY - rect.top) / rect.height * H
    };
  }

  class Player {
    constructor(difficulty, weapon, resonance) {
      this.x = W / 2;
      this.y = H - 96;
      this.targetX = this.x;
      this.targetY = this.y;
      this.r = 15;
      this.maxHp = difficulty.playerHp;
      this.hp = this.maxHp;
      this.shield = difficulty.startingShield || 0;
      this.fire = 0;
      this.skillCd = 0;
      this.wings = difficulty.allyWings;
      this.weapon = weapon;
      this.resonance = resonance || {};
    }

    update(dt) {
      this.x += (this.targetX - this.x) * 0.24;
      this.y += (this.targetY - this.y) * 0.24;
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
      let rest = amount;
      if (this.shield > 0) {
        const blocked = Math.min(this.shield, rest);
        this.shield -= blocked;
        rest -= blocked;
        game.burst(this.x, this.y, '#8bd3ff', 8);
      }
      if (rest > 0) {
        this.hp -= rest;
        game.damageTaken += rest;
        game.shake = Math.max(game.shake, 8);
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
        medium: { hp: 7, r: 21, speed: 95, score: 180, color: '#d8c58a', fire: 1.7 },
        gunner: { hp: 11, r: 24, speed: 82, score: 260, color: '#8bd3ff', fire: 1.2 },
        splitter: { hp: 8, r: 22, speed: 100, score: 220, color: '#72d6bd', fire: 0 },
        phantom: { hp: 6, r: 18, speed: 150, score: 260, color: '#f0a6ca', fire: 1.0 },
        jammer: { hp: 10, r: 24, speed: 76, score: 300, color: '#75d7e6', fire: 1.6, jamRadius: 210, weaponSlow: 1.28 },
        support: { hp: 12, r: 24, speed: 68, score: 320, color: '#72d6bd', fire: 0, repairRadius: 130, repairAmount: 2, repairInterval: 2.4 }
      }[type];
      this.type = type;
      this.x = 32 + Math.random() * (W - 64);
      this.y = -data.r - Math.random() * 80;
      this.baseX = this.x;
      this.t = Math.random() * 4;
      this.hp = data.hp + stage;
      this.maxHp = this.hp;
      this.r = data.r;
      this.speed = data.speed;
      this.score = data.score;
      this.color = data.color;
      this.fire = data.fire ? data.fire + Math.random() : 999;
      this.jamRadius = data.jamRadius || 0;
      this.weaponSlow = data.weaponSlow || 1;
      this.repairRadius = data.repairRadius || 0;
      this.repairAmount = data.repairAmount || 0;
      this.repairTimer = data.repairInterval ? data.repairInterval * (0.55 + Math.random() * 0.4) : 0;
      this.dead = false;
    }

    update(dt) {
      this.t += dt;
      this.y += this.speed * dt;
      if (this.type === 'phantom') this.x = this.baseX + Math.sin(this.t * 4) * 70;
      else if (this.type === 'gunner') this.x = this.baseX + Math.sin(this.t * 2.2) * 44;
      else if (this.type === 'splitter') this.x = this.baseX + Math.sin(this.t * 3) * 30;
      else if (this.type === 'jammer') this.x = this.baseX + Math.sin(this.t * 2.8) * 52;
      else if (this.type === 'support') this.x = this.baseX + Math.sin(this.t * 1.8) * 34;
      this.fire -= dt;
      if (this.fire <= 0 && game.player) {
        this.fire = this.type === 'phantom' ? 1.0 : 1.45;
        game.fireEnemyAt(this.x, this.y, 240 + game.segmentIndex * 12, 8);
      }
      if (this.repairAmount > 0 && this.y > 0 && this.y < H * 0.75) {
        this.repairTimer -= dt;
        if (this.repairTimer <= 0) {
          this.repairTimer = 2.4;
          game.repairNearbyEnemies(this);
        }
      }
      if (this.y > H + this.r) this.dead = true;
    }

    damage(amount) {
      this.hp -= amount;
      if (this.hp <= 0) {
        this.dead = true;
        return true;
      }
      return false;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.type === 'jammer' || this.type === 'support') {
        const rr = this.type === 'jammer' ? 70 : 58;
        ctx.strokeStyle = this.type === 'jammer' ? 'rgba(117,215,230,.36)' : 'rgba(114,214,189,.32)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, rr + Math.sin(game.time * 5) * 3, 0, Math.PI * 2);
        ctx.stroke();
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
      } else if (this.type === 'jammer') {
        ctx.moveTo(0, -this.r);
        ctx.lineTo(-this.r * 0.86, 0);
        ctx.lineTo(0, this.r);
        ctx.lineTo(this.r * 0.86, 0);
      } else if (this.type === 'support') {
        ctx.arc(0, 0, this.r * 0.8, 0, Math.PI * 2);
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
      } else {
        ctx.fillRect(-this.r * 0.5, -2, this.r, 4);
      }
      ctx.restore();
    }
  }

  class Boss {
    constructor(def) {
      this.def = def;
      this.affix = def.affix || null;
      this.x = W / 2;
      this.y = -def.hp / 20;
      this.r = 54 + def.stage * 2;
      this.maxHp = Math.round(def.hp * (1 + (this.affix?.hpMult || 0)));
      this.hp = this.maxHp;
      this.fire = 1.4;
      this.fireMult = this.affix?.fireMult || 1;
      this.affixTimer = this.affix?.every || 0;
      this.t = 0;
      this.phase = 1;
      this.dead = false;
      this.spiral = 0;
    }

    update(dt) {
      this.t += dt;
      if (this.y < 128) this.y += 75 * dt;
      this.x = W / 2 + Math.sin(this.t * (0.85 + this.def.stage * 0.04)) * (120 + this.def.stage * 8);
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
        this.fire = Math.max(0.42, 1.35 - this.phase * 0.18) * this.fireMult / game.difficulty.bulletRate;
        this.attack();
      }
    }

    updateAffix(dt) {
      if (this.affix?.attack !== 'prism') return;
      this.affixTimer -= dt;
      if (this.affixTimer > 0) return;
      this.affixTimer = this.affix.every || 5.6;
      game.firePrismLane(this, this.affix);
    }

    attack() {
      const count = 5 + this.phase * 2 + Math.floor(this.def.stage / 2);
      if (this.def.pattern === 'fan') game.fireFan(this.x, this.y + this.r * 0.5, Math.PI / 2, 65 * DEG, count, 230, 8);
      else if (this.def.pattern === 'aimed') game.fireEnemyAt(this.x, this.y, 300, 10, count, 12 * DEG);
      else if (this.def.pattern === 'wall') game.fireWall(this.x, this.y, 210 + this.phase * 16);
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

    fireSpiral(count, speed) {
      this.spiral += 22 * DEG;
      for (let i = 0; i < count; i += 1) {
        const a = this.spiral + i * Math.PI * 2 / count;
        game.enemyBullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5, damage: 8, dead: false });
      }
    }

    damage(amount) {
      this.hp -= amount;
      if (this.hp <= 0) {
        this.dead = true;
        return true;
      }
      return false;
    }

    draw(ctx) {
      const r = this.r;
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
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 4, 0, 0, r);
      grad.addColorStop(0, '#eef3ec');
      grad.addColorStop(0.35, this.def.color);
      grad.addColorStop(1, '#151a1d');
      ctx.fillStyle = grad;
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
      ctx.fillStyle = '#f8fafc';
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
    player: null,
    enemies: [],
    playerBullets: [],
    enemyBullets: [],
    powerups: [],
    particles: [],
    boss: null,
    segmentIndex: -1,
    segmentTime: 0,
    spawnTimer: 0,
    bossDefeated: [],
    clearedLayers: 0,
    damageTaken: 0,
    creationOverload: 0,
    score: 0,
    time: 0,
    stars: Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 60 + Math.random() * 150, r: Math.random() < 0.8 ? 1 : 2 })),
    shake: 0,
    nearLineCd: 0,
    commRequestId: 0,

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
      this.powerups = [];
      this.particles = [];
      this.boss = null;
      this.segmentIndex = -1;
      this.segmentTime = 0;
      this.spawnTimer = 0.7;
      this.bossDefeated = [];
      this.clearedLayers = 0;
      this.damageTaken = 0;
      this.creationOverload = 0;
      this.score = 0;
      menu.classList.add('hidden');
      resultPanel.classList.add('hidden');
      this.nextSegment();
    },

    nextSegment() {
      this.segmentIndex += 1;
      if (this.segmentIndex >= this.route.length) {
        this.finish('victory');
        return;
      }
      this.segmentTime = 0;
      this.spawnTimer = 0.8;
      this.boss = null;
      const boss = this.route[this.segmentIndex];
      this.say(`${boss.title}正在靠近。${boss.memory}`, 3.6, {
        eventType: 'airspace_segment',
        boss,
        context: { stage: boss.stage }
      });
      this.updateHud();
    },

    currentAffix() {
      return this.route[this.segmentIndex]?.affix || null;
    },

    spawnEnemy() {
      const stage = this.segmentIndex + 1;
      const pool = stage < 2 ? ['small', 'small', 'medium']
        : stage < 4 ? ['small', 'medium', 'gunner', 'splitter']
          : ['medium', 'gunner', 'splitter', 'phantom', 'phantom'];
      const affix = this.currentAffix();
      const biased = affix?.enemyBias && Math.random() < (affix.spawnBias || 0) ? affix.enemyBias : pool;
      this.enemies.push(new Enemy(pick(biased), stage));
    },

    spawnBoss() {
      const def = this.route[this.segmentIndex];
      this.boss = new Boss(def);
      this.say(bridge.lineFor('boss', def), 3.8, {
        eventType: 'airspace_boss',
        boss: def,
        context: { stage: def.stage, pattern: def.pattern }
      });
    },

    firePlayer() {
      if (!this.player) return;
      const p = this.player;
      const color = this.weapon.color || '#72d6bd';
      const damage = (this.weapon.kind === 'cannon' ? 4 : 2) + (this.resonance.damageBonus || 0);
      const speed = this.weapon.kind === 'cannon' ? -760 : -900;
      const spread = this.weapon.kind === 'beam' ? [-5, 0, 5] : this.weapon.kind === 'cannon' ? [0] : [-11, 11];
      for (const ox of spread) this.playerBullets.push({ x: p.x + ox, y: p.y - 18, vx: ox * 1.5, vy: speed, r: this.weapon.kind === 'cannon' ? 6 : 4, damage, color, dead: false });
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

    fireWall(x, y, speed) {
      const gap = this.player?.x || W / 2;
      for (let bx = 26; bx < W - 26; bx += 38) {
        if (Math.abs(bx - gap) < 58) continue;
        this.enemyBullets.push({ x: bx, y: y + 20, vx: 0, vy: speed, r: 5, damage: 9, dead: false });
      }
    },

    firePrismLane(boss, affix) {
      const x = clamp(this.player?.x || boss.x, 44, W - 44);
      for (let i = -3; i <= 3; i += 1) {
        this.enemyBullets.push({ x: x + i * 9, y: boss.y + boss.r * 0.35, vx: i * 12, vy: 310, r: 4, damage: 10, color: affix.color, dead: false });
      }
      this.burst(x, boss.y + boss.r, affix.color, 10);
      this.say('棱镜词缀折出竖直裂线，立刻离开当前航道。', 1.8);
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
            if (e.damage(12 + (this.resonance.damageBonus || 0))) this.killEnemy(e);
          }
        }
        if (this.boss && Math.abs(this.boss.x - p.x) < 130 && this.boss.damage(38 + (this.resonance.damageBonus || 0) * 4)) this.defeatBoss();
      }
      this.burst(p.x, p.y, this.weapon.color, 28);
    },

    killEnemy(enemy) {
      enemy.dead = true;
      this.score += Math.round(enemy.score * (this.resonance.scoreMult || 1));
      this.burst(enemy.x, enemy.y, enemy.color, 14);
      if (enemy.type === 'splitter') {
        for (let i = 0; i < 2; i += 1) {
          const child = new Enemy('small', this.segmentIndex + 1);
          child.x = clamp(enemy.x + (i ? 24 : -24), 20, W - 20);
          child.y = enemy.y;
          this.enemies.push(child);
        }
      }
      if (Math.random() < 0.08) this.powerups.push({ x: enemy.x, y: enemy.y, r: 12, kind: pick(['heal', 'shield', 'power']), dead: false });
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

    jamFactor(x, y) {
      let factor = 1;
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy.type !== 'jammer') continue;
        if (dist2({ x, y }, enemy) <= enemy.jamRadius * enemy.jamRadius) factor = Math.max(factor, enemy.weaponSlow);
      }
      return factor;
    },

    resolveCollisions() {
      for (const b of this.playerBullets) {
        if (b.dead) continue;
        for (const e of this.enemies) {
          if (!e.dead && hit(b, e)) {
            b.dead = true;
            if (e.damage(b.damage)) this.killEnemy(e);
            else this.burst(b.x, b.y, '#eef3ec', 3);
            break;
          }
        }
        if (!b.dead && this.boss && hit(b, this.boss)) {
          b.dead = true;
          if (this.boss.damage(b.damage)) this.defeatBoss();
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
          this.player.takeDamage(18);
          this.burst(e.x, e.y, e.color, 12);
        }
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
      this.bossDefeated.push(title);
      this.clearedLayers += 1;
      this.say(bridge.lineFor('boss-defeated', boss), 3.8, {
        eventType: 'airspace_boss_defeated',
        boss,
        context: { clearedLayers: this.clearedLayers }
      });
      this.burst(this.boss.x, this.boss.y, boss.color, 40);
      this.boss = null;
      this.enemies.length = 0;
      this.enemyBullets.length = 0;
      setTimeout(() => {
        if (this.state === 'playing') this.nextSegment();
      }, 1100);
    },

    reviewTags(victory) {
      const tags = [this.resonance.name];
      if (this.damageTaken >= 100) tags.push('承伤偏高');
      else if (this.clearedLayers >= 2) tags.push('走位稳定');
      if (this.clearedLayers >= this.route.length) tags.push('Boss处理完整');
      else if (this.clearedLayers >= 3) tags.push('中段清算有效');
      if (this.creationOverload >= 3) tags.push('频繁脉冲');
      if (this.route.some(boss => boss.affix?.attack === 'prism')) tags.push('棱镜航线');
      if (!victory && this.bossDefeated.length === 0) tags.push('首段压力高');
      return [...new Set(tags)].slice(0, 4);
    },

    finish(outcome) {
      this.state = 'result';
      const victory = outcome === 'victory';
      const result = bridge.publishResult({
        outcome: victory ? 'victory' : 'defeat',
        score: this.score,
        clearedLayers: this.clearedLayers,
        bossDefeated: this.bossDefeated,
        damageTaken: this.damageTaken,
        creationOverload: this.creationOverload,
        rescuedEchoes: victory ? this.difficulty.allyWings + this.clearedLayers : this.clearedLayers,
        endingModifier: victory ? 'airspace_cleansed' : 'airspace_scarred',
        affixes: this.route.map(boss => `${boss.affix.name}·${boss.title}`)
      });
      resultTitle.textContent = victory ? '裂隙空域已清算' : '空域载体坠落';
      resultBody.textContent = `${result.notableMoment} 分数 ${result.score}，清算 ${result.clearedLayers}/6 段。复盘：${this.reviewTags(victory).join(' · ')}。`;
      resultPanel.classList.remove('hidden');
      this.say(victory ? bridge.lineFor('victory') : bridge.lineFor('defeat'), 4, {
        eventType: victory ? 'airspace_victory' : 'airspace_defeat',
        context: { result }
      });
    },

    burst(x, y, color, count) {
      for (let i = 0; i < count; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const s = 45 + Math.random() * 190;
        this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.35, max: 0.7, color });
      }
    },

    say(text, seconds = 2.5, narrative = null) {
      const requestId = ++this.commRequestId;
      comm.textContent = text;
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
        if (!aiText || this.commRequestId !== requestId || comm.textContent !== text) return;
        comm.textContent = aiText;
        comm.dataset.until = String(this.time + seconds + 1.2);
      });
    },

    updateHud() {
      const boss = this.route[this.segmentIndex] || this.route[this.route.length - 1];
      hudStage.textContent = boss ? `${boss.stage}/6 ${boss.affix.name}·${boss.title}` : '第七天裂隙空域';
      if (hudAffix) {
        const active = this.boss?.def === boss ? this.boss : null;
        const cd = active?.affix?.attack ? ` · ${Math.max(0, active.affixTimer || 0).toFixed(1)}s` : '';
        hudAffix.textContent = boss?.affix ? `${boss.affix.line}${cd}` : '';
      }
      hudWeapon.textContent = `${this.weapon.name} · ${this.resonance.name}`;
      hudScore.textContent = String(Math.round(this.score));
      skillBtn.disabled = !this.player || this.player.skillCd > 0 || this.state !== 'playing';
      skillBtn.textContent = this.player && this.player.skillCd > 0 ? `${Math.ceil(this.player.skillCd)}s` : '造物脉冲';
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
        if (b.y > H + 24 || b.y < -24 || b.x < -24 || b.x > W + 24) b.dead = true;
      }
      for (const p of this.powerups) {
        p.y += 95 * dt;
        if (p.y > H + 20) p.dead = true;
      }
      if (this.nearLineCd <= 0 && this.enemies.some(e => !e.dead && this.player && dist2(e, this.player) < 110 * 110)) {
        this.nearLineCd = 12;
        this.say(bridge.lineFor('near'), 2.6, { eventType: 'airspace_near' });
      }
      this.resolveCollisions();
      this.enemies = this.enemies.filter(e => !e.dead);
      this.playerBullets = this.playerBullets.filter(b => !b.dead);
      this.enemyBullets = this.enemyBullets.filter(b => !b.dead);
      this.powerups = this.powerups.filter(p => !p.dead);
      if (this.player.hp <= 0) this.finish('defeat');
      if (Number(comm.dataset.until || 0) < this.time) comm.textContent = '';
      this.shake = Math.max(0, this.shake - dt * 24);
      this.updateHud();
    },

    draw() {
      ctx.save();
      if (this.shake > 0) ctx.translate((Math.random() * 2 - 1) * this.shake, (Math.random() * 2 - 1) * this.shake);
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
      for (const p of this.powerups) this.drawPowerup(p);
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

  canvas.addEventListener('pointerdown', pointerMove);
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
  document.getElementById('airspace-start').addEventListener('click', () => game.start());
  document.getElementById('airspace-return').addEventListener('click', () => bridge.returnToMain());
  document.getElementById('result-return').addEventListener('click', () => bridge.returnToMain());
  skillBtn.addEventListener('click', () => game.useSkill());

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
  game.updateHud();
  game.say(bridge.lineFor('intro'), 3, { eventType: 'airspace_intro' });
  requestAnimationFrame(loop);
})();
