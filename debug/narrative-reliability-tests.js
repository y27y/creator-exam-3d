import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function readJsonBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return JSON.parse(body || '{}');
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch (_error) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  throw new Error('server did not become healthy');
}

async function withFakeProvider(testBody) {
  const seenPrompts = [];
  const provider = createServer(async (req, res) => {
    if (req.url !== '/chat/completions') {
      res.writeHead(404).end();
      return;
    }
    const body = await readJsonBody(req);
    const systemPrompt = body.messages?.find(message => message.role === 'system')?.content || '';
    seenPrompts.push(systemPrompt);
    const hasContext = systemPrompt.includes('Gate opened by whale bridge')
      && systemPrompt.includes('No invented royal lore')
      && systemPrompt.includes('plain tactical language');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      choices: [{ message: { content: hasContext ? 'context-respected' : 'context-missing' } }]
    }));
  });

  await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve));
  const providerBaseUrl = `http://127.0.0.1:${provider.address().port}`;
  const appPort = await findFreePort();
  const appBaseUrl = `http://127.0.0.1:${appPort}`;
  const app = spawn(process.execPath, ['server.js'], {
    env: {
      ...process.env,
      PORT: String(appPort),
      AI_API_KEY: 'test-key',
      AI_BASE_URL: providerBaseUrl,
      AI_MODEL: 'test-model'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderr = '';
  app.stderr.on('data', chunk => { stderr += String(chunk); });
  try {
    await waitForHealth(appBaseUrl);
    await testBody(appBaseUrl, seenPrompts);
  } finally {
    app.kill();
    await new Promise(resolve => provider.close(resolve));
  }
  assert(!stderr.includes('UnhandledPromiseRejection'), 'server should not emit unhandled promise rejections');
}

await withFakeProvider(async (baseUrl, seenPrompts) => {
  const response = await fetch(`${baseUrl}/api/narrative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'event',
      playerInput: 'Summarize the gate event.',
      context: {
        eventType: 'airspace_gate',
        keyFacts: ['Gate opened by whale bridge', { avoided: 'No invented royal lore' }],
        styleGuide: ['plain tactical language']
      },
      worldState: { currentLevel: 'final-exam', rescued: 2, lost: 0, entropy: 4, entropyLimit: 7 }
    })
  });
  const body = await response.json();
  assert(response.status === 200, 'narrative endpoint should return provider response');
  assert(body.text === 'context-respected', 'provider should see key facts and style guide in the system prompt');
  assert(seenPrompts.length === 1, 'fake provider should receive exactly one narrative prompt');
});

console.log('Narrative reliability tests passed.');
