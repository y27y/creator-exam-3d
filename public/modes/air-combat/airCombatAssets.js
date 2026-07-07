(function () {
  const manifest = {
    player: {
      balanced: 'assets/images/ships/player-balanced.png',
      attacker: 'assets/images/ships/player-attacker.png',
      defender: 'assets/images/ships/player-defender.png',
      scout: 'assets/images/ships/player-scout.png'
    },
    wingman: {
      balanced: 'assets/images/ships/player-wingman-balanced.png',
      attacker: 'assets/images/ships/player-wingman-attacker.png',
      defender: 'assets/images/ships/player-wingman-defender.png',
      scout: 'assets/images/ships/player-wingman-scout.png'
    },
    enemy: {
      small: 'assets/images/enemies/enemy-small.png',
      medium: 'assets/images/enemies/enemy-medium.png',
      large: 'assets/images/enemies/enemy-large.png',
      gunner: 'assets/images/enemies/enemy-gunner.png',
      splitter: 'assets/images/enemies/enemy-splitter.png',
      sniper: 'assets/images/enemies/enemy-sniper.png',
      detonator: 'assets/images/enemies/enemy-detonator.png',
      phantom: 'assets/images/enemies/enemy-phantom.png',
      carrier: 'assets/images/enemies/enemy-carrier.png',
      shieldCarrier: 'assets/images/enemies/enemy-shield-carrier.png',
      jammer: 'assets/images/enemies/enemy-jammer.png',
      support: 'assets/images/enemies/enemy-support.png',
      kamikaze: 'assets/images/enemies/enemy-kamikaze.png',
      beacon: 'assets/images/enemies/enemy-beacon.png',
      mineLayer: 'assets/images/enemies/enemy-mine-layer.png',
      phaseWing: 'assets/images/enemies/enemy-phase-wing.png',
      mirrorDrone: 'assets/images/enemies/enemy-mirror-drone.png',
      tether: 'assets/images/enemies/enemy-tether.png',
      warden: 'assets/images/enemies/enemy-warden.png',
      harvester: 'assets/images/enemies/enemy-harvester.png'
    },
    boss: {
      0: 'assets/images/bosses/boss-01-guard.png',
      1: 'assets/images/bosses/boss-02-rotorblade.png',
      2: 'assets/images/bosses/boss-03-bomber.png',
      3: 'assets/images/bosses/boss-04-twin-core-fortress.png',
      4: 'assets/images/bosses/boss-05-sky-fortress.png',
      5: 'assets/images/bosses/boss-06-abyss-king.png',
      6: 'assets/images/bosses/boss-07-void-devourer.png',
      7: 'assets/images/bosses/boss-08-prism-judge.png',
      8: 'assets/images/bosses/boss-09-iron-carrier.png',
      9: 'assets/images/bosses/boss-10-tide-core.png',
      10: 'assets/images/bosses/boss-11-unstable-prototype.png'
    },
    effect: {
      beaconCrosshair: 'assets/images/effects/effect-beacon-crosshair.png',
      floatingMine: 'assets/images/effects/effect-floating-mine.png',
      gravityRing: 'assets/images/effects/effect-gravity-ring.png',
      phaseGhost: 'assets/images/effects/effect-phase-ghost.png',
      prismBurstShard: 'assets/images/effects/effect-prism-burst-shard.png',
      tetherBeamNode: 'assets/images/effects/effect-tether-beam-node.png',
      wingPowerup: 'assets/images/effects/effect-wing-powerup.png'
    },
    background: {
      1: {
        base: 'assets/images/backgrounds/world-01-base.png',
        mid: 'assets/images/backgrounds/world-01-mid.png',
        fg: 'assets/images/backgrounds/world-01-fg.png'
      },
      2: {
        base: 'assets/images/backgrounds/world-02-base.png',
        mid: 'assets/images/backgrounds/world-02-mid.png',
        fg: 'assets/images/backgrounds/world-02-fg.png'
      },
      3: {
        base: 'assets/images/backgrounds/world-03-base.png',
        mid: 'assets/images/backgrounds/world-03-mid.png',
        fg: 'assets/images/backgrounds/world-03-fg.png'
      },
      4: {
        base: 'assets/images/backgrounds/world-04-base.png',
        mid: 'assets/images/backgrounds/world-04-mid.png',
        fg: 'assets/images/backgrounds/world-04-fg.png'
      },
      5: {
        base: 'assets/images/backgrounds/world-05-base.png',
        mid: 'assets/images/backgrounds/world-05-mid.png',
        fg: 'assets/images/backgrounds/world-05-fg.png'
      },
      6: {
        base: 'assets/images/backgrounds/world-06-base.png',
        mid: 'assets/images/backgrounds/world-06-mid.png',
        fg: 'assets/images/backgrounds/world-06-fg.png'
      },
      7: {
        base: 'assets/images/backgrounds/world-07-base.png',
        mid: 'assets/images/backgrounds/world-07-mid.png',
        fg: 'assets/images/backgrounds/world-07-fg.png'
      },
      8: {
        base: 'assets/images/backgrounds/world-08-base.png',
        mid: 'assets/images/backgrounds/world-08-mid.png',
        fg: 'assets/images/backgrounds/world-08-fg.png'
      }
    }
  };

  const cache = new Map();
  const boundsCache = new WeakMap();

  function collectSources(value, out = []) {
    if (!value) return out;
    if (typeof value === 'string') out.push(value);
    else if (typeof value === 'object') Object.values(value).forEach(item => collectSources(item, out));
    return out;
  }

  function load() {
    if (typeof Image === 'undefined') return;
    for (const src of collectSources(manifest)) {
      if (!src || cache.has(src)) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      cache.set(src, img);
    }
  }

  function ready(src) {
    const img = src ? cache.get(src) : null;
    return img?.complete && img.naturalWidth > 0 ? img : null;
  }

  function imageBounds(img) {
    if (!img) return null;
    if (boundsCache.has(img)) return boundsCache.get(img);
    const full = { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
    if (typeof document === 'undefined') return full;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const bctx = canvas.getContext('2d', { willReadFrequently: true });
      bctx.drawImage(img, 0, 0);
      const data = bctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (data[(y * canvas.width + x) * 4 + 3] <= 16) continue;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
      if (maxX < 0) return full;
      const pad = Math.ceil(Math.max(maxX - minX + 1, maxY - minY + 1) * 0.08);
      const box = {
        x: Math.max(0, minX - pad),
        y: Math.max(0, minY - pad),
        w: Math.min(canvas.width, maxX + pad + 1) - Math.max(0, minX - pad),
        h: Math.min(canvas.height, maxY + pad + 1) - Math.max(0, minY - pad)
      };
      boundsCache.set(img, box);
      return box;
    } catch (_error) {
      boundsCache.set(img, full);
      return full;
    }
  }

  function draw(ctx, img, x, y, size, rotation = 0, alpha = 1) {
    if (!img) return false;
    const box = imageBounds(img) || { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
    const scale = size / Math.max(box.w, box.h);
    const w = box.w * scale;
    const h = box.h * scale;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    ctx.drawImage(img, box.x, box.y, box.w, box.h, -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  }

  function drawScrolling(ctx, img, scroll, alpha = 1) {
    if (!img) return false;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const x = (width - w) / 2;
    let y0 = -(scroll % h);
    if (y0 > 0) y0 -= h;
    ctx.save();
    ctx.globalAlpha *= alpha;
    for (let y = y0; y < height; y += h) ctx.drawImage(img, x, y, w, h);
    ctx.restore();
    return true;
  }

  window.AirCombatAssets = {
    manifest,
    load,
    ready,
    draw,
    drawScrolling,
    player: key => ready(manifest.player[key]),
    wingman: key => ready(manifest.wingman[key]),
    enemy: type => ready(manifest.enemy[type]),
    boss: index => ready(manifest.boss[index]),
    effect: key => ready(manifest.effect[key]),
    background: (world, layer) => ready(manifest.background[world]?.[layer]),
    sources: () => collectSources(manifest, [])
  };
})();
