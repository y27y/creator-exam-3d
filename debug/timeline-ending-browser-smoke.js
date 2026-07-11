import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'file:///C:/Users/liu_j/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs';

const port = 4178;
const screenshotDir = path.join(tmpdir(), 'creator-exam-timeline-ending-smoke');
mkdirSync(screenshotDir, { recursive: true });
const server = spawn(process.execPath, ['server.js'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore',
  windowsHide: true
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch (_error) {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('timeline ending smoke server did not start');
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(`http://127.0.0.1:${port}/?debug=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__creatorExam3D));
  await page.evaluate(() => {
    const game = window.__creatorExam3D;
    document.getElementById('tutorial-choice').hidden = true;
    game.lastNightWatchResult = {
      victory: true,
      survivedWaves: 6,
      residentsProtected: 12,
      selectedBuff: { name: '余烬誓约' }
    };
    game.lastAirCombatResult = {
      id: 'timeline-browser-smoke',
      outcome: 'victory',
      clearedLayers: 6,
      legacyBranch: 'perfect',
      finalState: 'cleansed'
    };
    game.recordGameEvent({
      type: 'airspace_resolved',
      levelId: 'final-exam',
      regionId: 'final-exam',
      turn: 8,
      payload: game.lastAirCombatResult,
      importance: 1,
      tags: ['airspace', 'victory', 'cleansed']
    });
    game.startTimelineEnding(game.lastAirCombatResult, { replay: true, startIndex: 0 });
  });
  await page.locator('#cinematic').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#cinematic-art').evaluate(element => getComputedStyle(element).animationName), 'none', 'reduced-motion users should not receive timeline pan animation');
  await page.screenshot({ path: path.join(screenshotDir, 'opening.png'), fullPage: true });
  await page.click('#cinematic-skip');
  await page.locator('[data-timeline-anchor]').first().focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.cinematic-choice.selected').count(), 1, 'one anchor should be visibly selected');
  assert.equal(await page.locator('#cinematic-primary').isEnabled(), true, 'anchor selection should unlock continuation');
  await page.screenshot({ path: path.join(screenshotDir, 'anchor.png'), fullPage: true });
  await page.evaluate(() => {
    const director = window.__creatorExam3D.activeEndingDirector;
    director.index = director.frames.length - 1;
    director.render();
  });
  await page.screenshot({ path: path.join(screenshotDir, 'final.png'), fullPage: true });
  assert.match(await page.locator('#cinematic-title').textContent(), /第七日之后/);
  assert.match(await page.locator('#cinematic-text').textContent(), /世界可以被拯救/);
  await page.click('#cinematic-primary');
  await page.locator('#cinematic').waitFor({ state: 'hidden' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__creatorExam3D));
  await page.evaluate(() => {
    document.getElementById('tutorial-choice').hidden = true;
    document.getElementById('cinematic').hidden = true;
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    document.getElementById('tutorial-choice').hidden = true;
    window.__creatorExam3D.closeCinematic();
  });
  assert.equal(await page.evaluate(() => window.__creatorExam3D.lastAirCombatResult?.timelineArchive?.completed), true, 'completed archive should hydrate from the saved world event after reload');
  assert.equal(await page.locator('#timeline-ending-replay').getAttribute('hidden'), null, 'world journal should enable ending replay after reload');
  await page.click('#drawer-world-btn');
  assert.equal(await page.locator('#timeline-ending-replay').isVisible(), true, 'ending replay should be visible when the world journal opens');
  console.log('Timeline ending browser smoke passed.');
} finally {
  await browser?.close();
  server.kill();
}
