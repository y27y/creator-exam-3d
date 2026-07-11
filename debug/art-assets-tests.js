import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const artUrl = new URL('../public/assets/art/', import.meta.url);
const artPath = fileURLToPath(artUrl);
const required = new Map([
  ['cg-prologue.webp', { width: 1920, height: 1080, maxBytes: 2621440 }],
  ['cg-night-watch.webp', { width: 2520, height: 1080, maxBytes: 3145728 }],
  ['cg-airspace-bridge.webp', { width: 1920, height: 1080, maxBytes: 2097152 }],
  ['cg-ending.webp', { width: 1920, height: 1080, maxBytes: 2621440 }],
  ['backgrounds/level-01-flood-village.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['backgrounds/level-02-night-mine.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['backgrounds/level-03-giant-city.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['backgrounds/level-04-wordless-war.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['backgrounds/level-05-memory-plague.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['backgrounds/level-06-final-exam.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-01/shot-01-rain-arrives.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-01/shot-02-river-breaches.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-01/shot-03-last-lanterns.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-02/shot-01-lamps-descend.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-02/shot-02-lights-fail.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-02/shot-03-northern-glow.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-03/shot-01-footprint-beyond.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-03/shot-02-channels-dry.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-03/shot-03-shadow-at-wall.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-04/shot-01-forgotten-table.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-04/shot-02-road-in-fog.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-04/shot-03-two-lanterns.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-05/shot-01-names-fade.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-05/shot-02-paths-repeat.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-05/shot-03-tree-remains.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-06/shot-01-worlds-return.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-06/shot-02-rift-demands.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['chapters/level-06/shot-03-before-seventh-day.webp', { width: 1920, height: 1080, maxBytes: 524288 }],
  ['textures/paper002-ui-grain.webp', { width: 512, height: 512, maxBytes: 32768 }]
]);

function uint24(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function webpSize(buffer) {
  assert.equal(buffer.subarray(0, 4).toString(), 'RIFF');
  assert.equal(buffer.subarray(8, 12).toString(), 'WEBP');
  const chunk = buffer.subarray(12, 16).toString();
  if (chunk === 'VP8X') {
    return { width: uint24(buffer, 24) + 1, height: uint24(buffer, 27) + 1 };
  }
  if (chunk === 'VP8 ') {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff
    };
  }
  if (chunk === 'VP8L') {
    const b1 = buffer[21];
    const b2 = buffer[22];
    const b3 = buffer[23];
    const b4 = buffer[24];
    return {
      width: 1 + (b1 | ((b2 & 0x3f) << 8)),
      height: 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10))
    };
  }
  throw new Error(`Unsupported WebP chunk ${chunk}`);
}

function listFiles(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const relative = path.posix.join(prefix, entry.name);
    return entry.isDirectory()
      ? listFiles(path.join(dir, entry.name), relative)
      : [relative];
  });
}

assert.ok(existsSync(artPath), 'public/assets/art must exist');
const attribution = readFileSync(new URL('../public/assets/art/ATTRIBUTION.md', import.meta.url), 'utf8');
for (const [relative, expected] of required) {
  const filePath = path.join(artPath, ...relative.split('/'));
  assert.ok(existsSync(filePath), `missing art asset ${relative}`);
  const data = readFileSync(filePath);
  const size = webpSize(data);
  assert.deepEqual(size, { width: expected.width, height: expected.height }, `${relative} dimensions`);
  assert.ok(data.length <= expected.maxBytes, `${relative} exceeds its byte ceiling`);
  assert.ok(attribution.includes(relative), `${relative} must appear in ATTRIBUTION.md`);
}

const assetFiles = listFiles(artPath).filter(file => !file.endsWith('.md'));
const totalBytes = assetFiles.reduce((sum, relative) => sum + statSync(path.join(artPath, ...relative.split('/'))).size, 0);
assert.ok(totalBytes <= 10 * 1024 * 1024, `art assets exceed 10 MiB: ${totalBytes}`);

const serverSource = readFileSync(new URL('../server.js', import.meta.url), 'utf8');
assert.ok(serverSource.includes("'.webp': 'image/webp'"), 'server MIME table must include WebP');
assert.ok(attribution.includes('CC0 1.0'), 'attribution must record the public asset license');
assert.ok(attribution.includes('11AE4A4057C81FAADC0F8BBE8E1C230BC939DCC3DF9222CEC83BD107B1D7C8C4'), 'Paper002 hash must be pinned');
assert.equal((attribution.match(/Model: OpenAI image-2/g) || []).length, 29, 'art ledger should record the twenty-eight fixed image-2 scenes plus the NPC portrait set');
assert.ok(attribution.includes('npc-portraits/README.md'), 'art ledger should link the NPC portrait prompt and hash ledger');

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const architecture = readFileSync(new URL('../docs/systems/architecture.md', import.meta.url), 'utf8');
assert.ok(readme.includes('?debug=1'), 'README should document the hidden examiner sandbox');
assert.ok(readme.includes('public/assets/art'), 'README should document local art assets');
assert.ok(architecture.includes('environmentGroup'), 'architecture should document the decorative environment boundary');
assert.ok(architecture.includes('prepareStages(current, next)'), 'architecture should document staged air assets');

console.log(`Art asset tests passed (${assetFiles.length} files, ${totalBytes} bytes).`);
