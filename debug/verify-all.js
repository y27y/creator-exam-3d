import { spawn } from 'node:child_process';

const suites = [
  { label: 'syntax-check', command: 'node', args: ['debug/syntax-check.js'] },
  { label: 'test-suite', command: 'node', args: ['debug/test-suite.js'] },
  { label: 'current-code-reality', command: 'node', args: ['debug/current-code-reality-tests.js'] },
  { label: 'ai-reliability', command: 'node', args: ['debug/ai-reliability-tests.js'] },
  { label: 'compile-reliability', command: 'node', args: ['debug/compile-reliability-tests.js'] },
  { label: 'creation-placement-reliability', command: 'node', args: ['debug/creation-placement-reliability-tests.js'] },
  { label: 'turn-reliability', command: 'node', args: ['debug/turn-reliability-tests.js'] },
  { label: 'advanced-mechanisms-reliability', command: 'node', args: ['debug/advanced-mechanisms-reliability-tests.js'] },
  { label: 'browser-demo-smoke', command: 'node', args: ['debug/browser-demo-smoke.js'] },
  { label: 'wiki-integration', command: 'node', args: ['debug/wiki-integration-tests.js'] },
  { label: 'copy-tone', command: 'node', args: ['debug/copy-tone-tests.js'] },
  { label: 'browser-modes-smoke', command: 'node', args: ['debug/browser-modes-smoke.js'] },
  { label: 'npc-dialogue-reliability', command: 'node', args: ['debug/npc-dialogue-reliability-tests.js'] },
  { label: 'npc-visual-profile', command: 'node', args: ['debug/npc-visual-profile-tests.js'] },
  { label: 'npc-portrait-ui', command: 'node', args: ['debug/npc-portrait-ui-tests.js'] },
  { label: 'narrative-reliability', command: 'node', args: ['debug/narrative-reliability-tests.js'] },
  { label: 'chapter-intro', command: 'node', args: ['debug/chapter-intro-tests.js'] },
  { label: 'level-presentation', command: 'node', args: ['debug/level-presentation-tests.js'] },
  { label: 'board-visual-theme', command: 'node', args: ['debug/board-visual-theme-tests.js'] },
  { label: 'soundscape-reliability', command: 'node', args: ['debug/soundscape-reliability-tests.js'] },
  { label: 'art-assets', command: 'node', args: ['debug/art-assets-tests.js'] },
  { label: 'server-api', command: 'node', args: ['debug/server-api-tests.js'] },
];

async function runSuite(suite) {
  return new Promise((resolve) => {
    const child = spawn(suite.command, suite.args, {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });

    child.on('close', (code) => {
      const passed = code === 0;
      resolve({
        label: suite.label,
        passed,
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });

    child.on('error', (err) => {
      resolve({
        label: suite.label,
        passed: false,
        code: null,
        error: err.message,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

async function main() {
  const results = [];
  for (const suite of suites) {
    console.log(`Running ${suite.label}...`);
    const result = await runSuite(suite);
    results.push(result);
    console.log(`  ${result.passed ? 'PASS' : 'FAIL'} (${result.code})`);
    if (!result.passed && result.stdout) {
      console.log(`  stdout: ${result.stdout.slice(0, 200)}`);
    }
    if (!result.passed && result.stderr) {
      console.log(`  stderr: ${result.stderr.slice(0, 200)}`);
    }
  }

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.length - passedCount;
  console.log(`\nVerification summary: ${passedCount} passed, ${failedCount} failed`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Verification runner error:', err);
  process.exit(1);
});
