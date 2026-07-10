// Particle Effects System for 3D Game
// Adds visual flair to ability activations and game events

import * as THREE from 'three';
import { getAbilityVisualFamily } from './abilities.js';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.particleMaterials = new Map();
    this.maxParticles = 1000;
  }

  // Create particle material with caching
  getParticleMaterial(color, options = {}) {
    const key = `${color}-${JSON.stringify(options)}`;
    if (!this.particleMaterials.has(key)) {
      this.particleMaterials.set(key, new THREE.PointsMaterial({
        color,
        size: options.size || 0.15,
        transparent: true,
        opacity: options.opacity || 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
      }));
    }
    return this.particleMaterials.get(key).clone();
  }

  // Spawn particles for ability activation
  spawnAbilityParticles(x, y, z, ability, range = 1) {
    const color = this.getAbilityColor(ability);
    const particleCount = 30 + range * 15;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const family = getAbilityVisualFamily(ability);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * range * 1.5;
      const height = Math.random() * 2;

      positions[i * 3] = x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = y + height;
      positions[i * 3 + 2] = z + Math.sin(angle) * radius;

      const radialX = Math.cos(angle) * (0.012 + Math.random() * 0.012);
      const radialZ = Math.sin(angle) * (0.012 + Math.random() * 0.012);
      if (family === 'water') {
        velocities[i * 3] = radialX;
        velocities[i * 3 + 1] = 0.006;
        velocities[i * 3 + 2] = radialZ;
      } else if (family === 'light') {
        velocities[i * 3] = radialX * 0.25;
        velocities[i * 3 + 1] = 0.035 + Math.random() * 0.02;
        velocities[i * 3 + 2] = radialZ * 0.25;
      } else if (family === 'terrain') {
        velocities[i * 3] = radialX * 0.45;
        velocities[i * 3 + 1] = 0.003;
        velocities[i * 3 + 2] = radialZ * 0.45;
      } else if (family === 'defense') {
        velocities[i * 3] = -Math.sin(angle) * 0.018;
        velocities[i * 3 + 1] = 0.008;
        velocities[i * 3 + 2] = Math.cos(angle) * 0.018;
      } else if (family === 'mind') {
        velocities[i * 3] = -Math.sin(angle) * 0.015;
        velocities[i * 3 + 1] = 0.018;
        velocities[i * 3 + 2] = Math.cos(angle) * 0.015;
      } else {
        velocities[i * 3] = -radialX;
        velocities[i * 3 + 1] = 0.024;
        velocities[i * 3 + 2] = -radialZ;
      }

      lifetimes[i] = 1.0 + Math.random() * 0.5;
      sizes[i] = 0.05 + Math.random() * 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = this.getParticleMaterial(color, { size: 0.12, opacity: 0.7 });
    const points = new THREE.Points(geometry, material);

    this.scene.add(points);
    this.particles.push({
      mesh: points,
      type: 'ability',
      ability,
      age: 0,
      maxAge: 2.0
    });

    // Add a burst ring effect
    this.spawnBurstRing(x, y, z, color, range);
  }

  // Spawn burst ring effect
  spawnBurstRing(x, y, z, color, range) {
    const ringGeometry = new THREE.RingGeometry(0.1, 0.3, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(x, y + 0.1, z);
    ring.rotation.x = -Math.PI / 2;

    this.scene.add(ring);
    this.particles.push({
      mesh: ring,
      type: 'ring',
      age: 0,
      maxAge: 1.5,
      expandRate: range * 0.5
    });
  }

  // Spawn resonance effect for chain reactions
  spawnResonanceEffect(x, y, z, color) {
    // Dual-color spiral particles
    const particleCount = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);

    const baseColor = new THREE.Color(color);
    const secondaryColor = new THREE.Color(0xffffff);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 4;
      const radius = 0.2 + (i / particleCount) * 2;
      const height = Math.sin(angle * 2) * 0.5 + 1;

      positions[i * 3] = x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = y + height;
      positions[i * 3 + 2] = z + Math.sin(angle) * radius;

      const mixRatio = (i % 2 === 0) ? 1 : 0;
      const c = mixRatio === 1 ? baseColor : secondaryColor;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      lifetimes[i] = 1.5 + Math.random() * 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.particles.push({
      mesh: points,
      type: 'resonance',
      age: 0,
      maxAge: 2.5,
      centerX: x,
      centerY: y,
      centerZ: z
    });

    // Add connecting beam between resonating creations
    this.spawnFloatingText(x, y + 2, z, '共鸣!', 0xfff5a0);
  }

  // Spawn floating text effect
  spawnFloatingText(x, y, z, text, color = 0xffffff) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;

    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 48px Microsoft YaHei, sans-serif';
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y + 1, z);
    sprite.scale.set(2, 0.5, 1);

    this.scene.add(sprite);
    this.particles.push({
      mesh: sprite,
      type: 'text',
      age: 0,
      maxAge: 2.0,
      velocity: 0.02
    });
  }

  // Spawn terrain transformation effect
  spawnTerrainTransform(x, y, z, fromTerrain, toTerrain) {
    const color = this.getTerrainColor(toTerrain);
    const particleCount = 20;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = x + (Math.random() - 0.5) * 1.5;
      positions[i * 3 + 1] = y + Math.random() * 0.5;
      positions[i * 3 + 2] = z + (Math.random() - 0.5) * 1.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = this.getParticleMaterial(color, { size: 0.08, opacity: 0.9 });
    const points = new THREE.Points(geometry, material);

    this.scene.add(points);
    this.particles.push({
      mesh: points,
      type: 'terrain',
      age: 0,
      maxAge: 1.5
    });
  }

  // Spawn rescue effect
  spawnRescueEffect(x, y, z) {
    // Green ascending particles
    this.spawnAbilityParticles(x, y, z, 'sun_blessing', 1);
    this.spawnFloatingText(x, y + 1.5, z, '已救援!', 0x9dffb3);

    // Star burst
    const starGeometry = new THREE.OctahedronGeometry(0.2, 0);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0x9dffb3,
      transparent: true,
      opacity: 1
    });

    for (let i = 0; i < 6; i++) {
      const star = new THREE.Mesh(starGeometry, starMaterial.clone());
      const angle = (i / 6) * Math.PI * 2;
      star.position.set(
        x + Math.cos(angle) * 0.5,
        y + 0.5,
        z + Math.sin(angle) * 0.5
      );
      this.scene.add(star);
      this.particles.push({
        mesh: star,
        type: 'star',
        age: 0,
        maxAge: 1.5,
        velocity: {
          x: Math.cos(angle) * 0.02,
          y: 0.03,
          z: Math.sin(angle) * 0.02
        }
      });
    }
  }

  // Spawn damage/loss effect
  spawnLossEffect(x, y, z) {
    this.spawnFloatingText(x, y + 1, z, '迷失...', 0xff7a9a);

    const particleCount = 15;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = x + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = y + Math.random() * 0.5;
      positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = this.getParticleMaterial(0xff7a9a, { size: 0.1, opacity: 0.6 });
    const points = new THREE.Points(geometry, material);

    this.scene.add(points);
    this.particles.push({
      mesh: points,
      type: 'loss',
      age: 0,
      maxAge: 2.0
    });
  }

  // Update all particles
  update(deltaTime) {
    const toRemove = [];

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      particle.age += deltaTime;

      if (particle.age >= particle.maxAge) {
        toRemove.push(i);
        continue;
      }

      const progress = particle.age / particle.maxAge;
      const remaining = 1 - progress;

      switch (particle.type) {
        case 'ability': {
          const positions = particle.mesh.geometry.attributes.position.array;
          const velocities = particle.mesh.geometry.attributes.velocity.array;

          for (let j = 0; j < positions.length / 3; j++) {
            positions[j * 3] += velocities[j * 3];
            positions[j * 3 + 1] += velocities[j * 3 + 1];
            positions[j * 3 + 2] += velocities[j * 3 + 2];
          }

          particle.mesh.geometry.attributes.position.needsUpdate = true;
          particle.mesh.material.opacity = remaining * 0.7;
          break;
        }

        case 'ring': {
          const scale = 1 + progress * particle.expandRate * 3;
          particle.mesh.scale.set(scale, scale, 1);
          particle.mesh.material.opacity = remaining * 0.6;
          break;
        }

        case 'text': {
          particle.mesh.position.y += particle.velocity * deltaTime;
          particle.mesh.material.opacity = remaining;
          break;
        }

        case 'star': {
          particle.mesh.position.x += particle.velocity.x;
          particle.mesh.position.y += particle.velocity.y;
          particle.mesh.position.z += particle.velocity.z;
          particle.mesh.material.opacity = remaining;
          particle.mesh.rotation.y += deltaTime * 2;
          break;
        }

        case 'terrain':
        case 'loss': {
          particle.mesh.material.opacity = remaining * 0.9;
          break;
        }

        case 'resonance': {
          const positions = particle.mesh.geometry.attributes.position.array;
          const time = particle.age * 2;

          for (let j = 0; j < positions.length / 3; j++) {
            const angle = (j / (positions.length / 3)) * Math.PI * 4 + time;
            const radius = 0.2 + (j / (positions.length / 3)) * 2 + Math.sin(time * 2) * 0.3;
            positions[j * 3] = particle.centerX + Math.cos(angle) * radius;
            positions[j * 3 + 1] = particle.centerY + Math.sin(time + j * 0.1) * 0.5 + 1;
            positions[j * 3 + 2] = particle.centerZ + Math.sin(angle) * radius;
          }

          particle.mesh.geometry.attributes.position.needsUpdate = true;
          particle.mesh.material.opacity = remaining * 0.9;
          break;
        }
      }
    }

    // Remove expired particles
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const index = toRemove[i];
      const particle = this.particles[index];
      this.scene.remove(particle.mesh);

      // Dispose geometries and materials properly
      if (particle.mesh.geometry) {
        particle.mesh.geometry.dispose();
      }
      if (particle.mesh.material) {
        if (particle.mesh.material.map) {
          particle.mesh.material.map.dispose();
        }
        particle.mesh.material.dispose();
      }

      this.particles.splice(index, 1);
    }

    // Enforce max particle limit
    if (this.particles.length > this.maxParticles) {
      const excess = this.particles.length - this.maxParticles;
      for (let i = 0; i < excess; i++) {
        const particle = this.particles[i];
        this.scene.remove(particle.mesh);
        if (particle.mesh.geometry) particle.mesh.geometry.dispose();
        if (particle.mesh.material) {
          if (particle.mesh.material.map) particle.mesh.material.map.dispose();
          particle.mesh.material.dispose();
        }
      }
      this.particles.splice(0, excess);
    }
  }

  // Get color for ability
  getAbilityColor(ability) {
    const colors = {
      absorb_water: 0x54c7ff,
      create_bridge: 0xffc46b,
      illuminate: 0xfff39a,
      gale: 0xb8ecff,
      block: 0xaeb7c8,
      calm: 0xd4a6ff,
      guide: 0x80f0a5,
      cleanse: 0xb4ffdd,
      slow_beast: 0xff91a8,
      memory_beacon: 0x8cb5ff,
      force_field: 0x64f3ff,
      transform_land: 0xb4e66e,
      freeze_water: 0xa8e6ff,
      reveal_path: 0xffdb82,
      sun_blessing: 0xfff5a0,
      raise_earth: 0xd4a574,
      grow_forest: 0x6bd48a,
      dig_channel: 0x3aa7d8,
      trap: 0xffa070,
      dream_link: 0xc8a8ff,
      time_dilation: 0xffe6a8,
      haste: 0x7dff9a,
      teleport: 0x9f8cff,
      shield_units: 0x8de8ff,
      redirect_hazard: 0x6bd6c8,
      consume_light: 0xffd166,
      steam_burst: 0x9ec8d8,
      creation_burst: 0xff6b6b,
      memory_loop: 0xa7f3d0,
      cycle_life: 0x8bdc65,
      temporal_rift: 0xb8a7ff,
      paradox_barrier: 0x7de7ff,
      chaos_guide: 0xffe07a
    };
    return colors[ability] || 0xffffff;
  }

  // Get color for terrain
  getTerrainColor(terrain) {
    const colors = {
      land: 0x52634c,
      water: 0x1c78d2,
      high: 0x9b8a5a,
      village: 0x9d6f45,
      exit: 0x4ed6ff,
      city: 0xbeb9d8,
      border: 0x775d8f,
      forest: 0x2d7a52,
      mountain: 0x6b6d77,
      dark: 0x101426,
      fog: 0x98a2bc,
      sacred: 0x45d19a,
      swamp: 0x55622e,
      bridge: 0xcda969,
      wall: 0x5d6473,
      field: 0x67e8ff,
      poison: 0x7ed957
    };
    return colors[terrain] || 0xffffff;
  }

  // Clear all particles
  clear() {
    for (const particle of this.particles) {
      this.scene.remove(particle.mesh);
      if (particle.mesh.geometry) {
        particle.mesh.geometry.dispose();
      }
      if (particle.mesh.material) particle.mesh.material.dispose();
    }
    this.particles = [];
  }
}

// Screen effects
export class ScreenEffects {
  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 100;
      overflow: hidden;
    `;
    document.body.appendChild(this.container);
  }

  // Flash screen effect
  flash(color = 'white', duration = 300) {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: absolute;
      inset: 0;
      background: ${color};
      opacity: 0.3;
      transition: opacity ${duration}ms ease-out;
    `;
    this.container.appendChild(flash);

    requestAnimationFrame(() => {
      flash.style.opacity = '0';
    });

    setTimeout(() => {
      flash.remove();
    }, duration);
  }

  // Shake screen effect
  shake(intensity = 5, duration = 300) {
    const startTime = Date.now();
    const gameRoot = document.getElementById('game-root');
    if (!gameRoot) return;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        gameRoot.style.transform = '';
        return;
      }

      const progress = elapsed / duration;
      const decay = 1 - progress;
      const x = (Math.random() - 0.5) * intensity * decay;
      const y = (Math.random() - 0.5) * intensity * decay;
      gameRoot.style.transform = `translate(${x}px, ${y}px)`;

      requestAnimationFrame(animate);
    };

    animate();
  }

  // Vignette effect for danger
  vignette(color = 'rgba(255, 0, 0, 0.3)', duration = 1000) {
    const vignette = document.createElement('div');
    vignette.style.cssText = `
      position: absolute;
      inset: 0;
      background: radial-gradient(circle, transparent 50%, ${color} 100%);
      opacity: 0;
      transition: opacity ${duration}ms ease-in-out;
    `;
    this.container.appendChild(vignette);

    requestAnimationFrame(() => {
      vignette.style.opacity = '1';
    });

    return {
      remove: () => {
        vignette.style.opacity = '0';
        setTimeout(() => vignette.remove(), duration);
      }
    };
  }

  // Floating combat text
  showFloatingText(x, y, text, color = '#fff') {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      color: ${color};
      font-size: 18px;
      font-weight: bold;
      pointer-events: none;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
      animation: floatUp 1.5s ease-out forwards;
    `;
    this.container.appendChild(el);

    setTimeout(() => el.remove(), 1500);
  }

  // Clear all screen overlays (vignette, floating text, lingering flash)
  clear() {
    while (this.container.firstChild) {
      this.container.firstChild.remove();
    }
  }
}

// Add CSS animation for floating text
const style = document.createElement('style');
style.textContent = `
  @keyframes floatUp {
    0% { transform: translateY(0) scale(1); opacity: 1; }
    100% { transform: translateY(-50px) scale(1.2); opacity: 0; }
  }
`;
document.head.appendChild(style);
