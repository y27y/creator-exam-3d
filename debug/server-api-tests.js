import { spawn } from 'node:child_process';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_error) {
    throw new Error(`Expected JSON from ${url}, got ${text.slice(0, 120)}`);
  }
  return { response, json };
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const { response } = await fetchJson(`${baseUrl}/health`);
      if (response.ok) return;
    } catch (_error) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  throw new Error('server did not become healthy');
}

async function withServer(testBody) {
  const port = 3201;
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn('node', ['server.js'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port), AI_API_KEY: '', AI_BUDGET_MAX_CALLS: '2' }
  });

  let stderr = '';
  let stdout = '';
  child.stderr.on('data', chunk => {
    stderr += String(chunk);
  });
  child.stdout.on('data', chunk => {
    stdout += String(chunk);
  });

  try {
    await waitForServer(baseUrl);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testBody(baseUrl);
  } finally {
    child.kill();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  assert(!stderr.includes('UnhandledPromiseRejection'), 'server must not emit unhandled promise rejections');
}

await withServer(async (baseUrl) => {
  const health = await fetchJson(`${baseUrl}/health`);
  assert(health.response.status === 200, '/health should return 200');
  assert(health.json.ok === true, '/health should include ok true');
  assert(health.json.aiConfigured === false, '/health should report no API key in this test');
  assert(health.json.aiBudget.remainingCalls === 2, '/health should include AI budget stats');

  const generated = await fetchJson(`${baseUrl}/api/generate-region`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceRegionId: 'flood-village',
      hooks: [{ id: 'hook-a', type: 'resident_migration', residentId: 'resident-xiaozhu' }],
      worldSummary: { selectedChoiceTitle: 'Follow Xiaozhu to high ground' }
    })
  });
  assert(generated.response.status === 200, '/api/generate-region should fall back with 200 when AI is not configured');
  assert(generated.json.region.id, 'generated region should include id');
  assert(Array.isArray(generated.json.region.map), 'generated region should include map');
  assert(generated.json.region.units.some(unit => unit.residentId === 'resident-xiaozhu'), 'fallback region should preserve resident hook');
  assert(generated.json.source === 'fallback_no_key' || generated.json.fallback === true, 'fallback source should be explicit');

  const dialogue = await fetchJson(`${baseUrl}/api/resident-dialogue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      residentId: 'resident-xiaozhu',
      residentName: 'Xiaozhu',
      playerText: 'Do you remember the flood village?',
      memoryText: 'Xiaozhu was rescued in flood-village'
    })
  });
  assert(dialogue.response.status === 200, '/api/resident-dialogue should fall back with 200 when AI is not configured');
  assert(dialogue.json.dialogue.text.includes('Xiaozhu'), 'dialogue should include resident name');
  assert(dialogue.json.dialogue.intent.type === 'speak', 'fallback resident dialogue should use speak intent');

  const card = await fetchJson(`${baseUrl}/api/compile-creation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'a bridge made of remembered rain', context: {} })
  });
  assert(card.response.status === 200, '/api/compile-creation should return local fallback with 200 when AI is not configured');
  assert(card.json.ability, 'fallback card should include ability');
  assert(card.json.source === 'fallback', 'fallback card source should be explicit');

  const hasteCard = await fetchJson(`${baseUrl}/api/compile-creation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'add two move actions to nearby NPCs', context: {} })
  });
  assert(hasteCard.response.status === 200, 'haste fallback should return 200');
  assert(hasteCard.json.ability === 'haste', 'two move actions should compile to haste');
  assert(hasteCard.json.range === 2, 'two move actions should use haste tier 2');
  assert(hasteCard.json.description.includes('3'), 'two move actions should describe the real movement limit');

  const narrative = await fetchJson(`${baseUrl}/api/narrative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'event', playerInput: 'The refuge survives another night.' })
  });
  assert(narrative.response.status === 200, '/api/narrative should return local fallback with 200 when AI is not configured');
  assert(narrative.json.fallback === true, 'fallback narrative should be explicit');

  const nightWatchTowers = await fetchJson(`${baseUrl}/api/night-watch-towers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: {
        entropy: 6,
        rescuedResidents: ['Xiaozhu', 'Ari'],
        recentCreations: [
          { name: 'remembered rain bridge', ability: 'create_bridge', type: 'miracle' },
          { name: 'moonlit flood whale', ability: 'absorb_water', type: 'beast' }
        ],
        experiences: ['Xiaozhu was rescued in flood-village']
      }
    })
  });
  assert(nightWatchTowers.response.status === 200, '/api/night-watch-towers should return local fallback with 200 when AI is not configured');
  assert(Array.isArray(nightWatchTowers.json.towerPool) && nightWatchTowers.json.towerPool.length > 0, 'night watch tower plan should include a tower pool');
  assert(nightWatchTowers.json.towers[nightWatchTowers.json.towerPool[0]], 'night watch tower plan should include tower patches');
  assert(!Object.values(nightWatchTowers.json.towers).some(tower => Object.prototype.hasOwnProperty.call(tower, 'limit')), 'night watch tower patches should not restore normal placement limits');
  assert(Array.isArray(nightWatchTowers.json.causes) && nightWatchTowers.json.causes.length > 0, 'night watch tower plan should explain prior-flow causes');
  assert(Array.isArray(nightWatchTowers.json.buffChoices) && nightWatchTowers.json.buffChoices.length === 3, 'night watch tower plan should include three buff choices');
  assert(nightWatchTowers.json.buffChoices.every(choice => choice.effect && choice.effect.type), 'night watch buff choices should include whitelisted effects');
});

console.log('Server API tests passed');
