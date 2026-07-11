(function () {
  const FAMILY_SOURCES = Object.freeze({
    assault: '../../assets/art/towers/tower-assault.webp',
    control: '../../assets/art/towers/tower-control.webp',
    support: '../../assets/art/towers/tower-support.webp'
  });

  const FAMILY_TYPES = Object.freeze({
    assault: [
      'arrow', 'cannon', 'blast', 'gamma', 'sun', 'gatlingGun', 'destroyer',
      'missileSilo', 'annihilator', 'pursuit', 'heavyWeapons', 'boomerang'
    ],
    control: ['magic', 'slow', 'tesla', 'matrix', 'gravityBeacon', 'spotlight', 'frostPunish'],
    support: ['electricCore', 'thiefClaw', 'musicStand', 'militaryBase', 'battery', 'shrineOfMerit']
  });

  const TYPE_FAMILY = new Map();
  for (const [family, types] of Object.entries(FAMILY_TYPES)) {
    for (const type of types) TYPE_FAMILY.set(type, family);
  }

  const cache = new Map();

  function familyFor(type) {
    return TYPE_FAMILY.get(String(type || '')) || 'control';
  }

  function emit(name, detail) {
    if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch (_) {}
  }

  function ensureImage(family) {
    if (cache.has(family)) return cache.get(family);
    const entry = { family, image: null, status: 'idle' };
    cache.set(family, entry);
    if (typeof Image === 'undefined' || !FAMILY_SOURCES[family]) return entry;

    const image = new Image();
    entry.image = image;
    entry.status = 'loading';
    image.decoding = 'async';
    image.addEventListener('load', () => {
      entry.status = image.naturalWidth > 0 ? 'ready' : 'error';
      emit('night-watch-art-ready', { family, source: FAMILY_SOURCES[family] });
    }, { once: true });
    image.addEventListener('error', () => {
      entry.status = 'error';
      emit('night-watch-art-error', { family, source: FAMILY_SOURCES[family] });
    }, { once: true });
    image.src = FAMILY_SOURCES[family];
    return entry;
  }

  function isReady(type) {
    const family = familyFor(type);
    const entry = ensureImage(family);
    return entry.status === 'ready' && entry.image?.complete && entry.image.naturalWidth > 0;
  }

  function drawTowerPortrait(context, type, options = {}) {
    if (!context || !isReady(type)) return false;
    const entry = cache.get(familyFor(type));
    const image = entry?.image;
    if (!image) return false;

    const x = Number(options.x || 0);
    const y = Number(options.y || 0);
    const width = Math.max(1, Number(options.width || context.canvas?.width || image.naturalWidth));
    const height = Math.max(1, Number(options.height || context.canvas?.height || image.naturalHeight));
    const inset = Math.max(0, Math.min(0.18, Number(options.inset ?? 0.02)));
    const size = Math.min(width, height) * (1 - inset * 2);
    const drawX = x + (width - size) / 2;
    const drawY = y + (height - size) / 2;

    context.save();
    context.globalAlpha *= Math.max(0, Math.min(1, Number(options.alpha ?? 1)));
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, drawX, drawY, size, size);
    context.restore();
    return true;
  }

  function preload() {
    Object.keys(FAMILY_SOURCES).forEach(ensureImage);
  }

  window.NightWatchArt = {
    sources: FAMILY_SOURCES,
    families: FAMILY_TYPES,
    familyFor,
    isReady,
    drawTowerPortrait,
    preload
  };

  preload();
})();
