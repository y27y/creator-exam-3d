import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const wikiUrl = new URL('../public/wiki.html', import.meta.url)
assert.ok(existsSync(wikiUrl), 'public/wiki.html should exist')

const wiki = readFileSync(wikiUrl, 'utf8')
const index = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8')

assert.ok(index.includes('id="wiki-link"'), 'game topbar should expose a wiki link')
assert.ok(index.includes('href="./wiki.html"'), 'wiki link should point to the standalone wiki page')
assert.ok(index.includes('target="_blank"'), 'wiki should open separately from the running game')
assert.ok(styles.includes('.wiki-link'), 'wiki link should be styled in the game UI')

for (const id of [
  'first-run',
  'quick-reference',
  'worked-example',
  'screen',
  'loop',
  'rules-glossary',
  'board-rules',
  'resources',
  'intent',
  'creation',
  'ai-driven',
  'placement',
  'recipes',
  'tactical-room',
  'mechanic-cases',
  'panels',
  'levels',
  'level-plans',
  'review',
  'modes',
  'night-watch',
  'airspace',
  'save',
  'mistakes'
]) {
  assert.ok(wiki.includes(`id="${id}"`), `wiki should include #${id}`)
}

for (const mechanism of [
  '敌方意图预览',
  '连锁反应',
  '仪式熔炉',
  '言灵誓约',
  '裂隙回响',
  '认知深渊',
  '验证腐化',
  '造物者工坊'
]) {
  assert.ok(wiki.includes(mechanism), `wiki should explain ${mechanism}`)
}

for (const level of [
  '第 1 关：洪水村庄',
  '第 2 关：永夜矿井',
  '第 3 关：巨兽困城',
  '第 4 关：失语战争',
  '第 5 关：记忆瘟疫',
  '终考：第七天之前'
]) {
  assert.ok(wiki.includes(level), `wiki should cover ${level}`)
}

for (const concretePhrase of [
  '第 1 关三回合实战例',
  '棋盘与地形规则',
  '放置优先级',
  '常用造物模板',
  '8 个高级机制实战用例',
  '逐关打法',
  '日志与失败复盘',
  '灾害「扩散」波及 (4,4)',
  '每回合 AI 干涉预算为 2',
  '自然语言造物',
  'AI 驱动怎么参与游戏',
  '这个游戏里的 AI 不是只写旁白',
  'API 接上以后有什么变化',
  '怎么把 AI 用好',
  '在邮差前方造一座三回合浮桥',
  '造一盏会沿铁轨传光的矿灯',
  '终考最常见的赢法',
  '造物未找到有效目标',
  '长夜守城',
  '第七天裂隙空域',
  '存档',
  '居民对话'
]) {
  assert.ok(wiki.includes(concretePhrase), `wiki should include concrete tutorial phrase: ${concretePhrase}`)
}

for (const endgamePhrase of [
  '局面速查：先按症状找答案',
  '规则与术语：卡牌到底什么时候生效',
  '长夜守城：从选塔到第 30 波',
  '从守夜计划提供的器械中选择 1–7 种',
  '第七天裂隙空域：6 段首领航线',
  'WASD',
  '造物脉冲',
  'Space',
  '连续击败 6 段首领后写入世界'
]) {
  assert.ok(wiki.includes(endgamePhrase), `wiki should cover endgame guidance: ${endgamePhrase}`)
}

console.log('Wiki integration tests passed.')
