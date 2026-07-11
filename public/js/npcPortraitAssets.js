const NPC_PORTRAIT_ASSETS = Object.freeze({
  '阿粟': '/assets/art/npc-portraits/level-01/a-su-v2.webp',
  '小烛': '/assets/art/npc-portraits/level-01/xiao-zhu-v2.webp',
  '木匠': '/assets/art/npc-portraits/level-01/carpenter-v2.webp',
  '邮差': '/assets/art/npc-portraits/level-01/courier-v2.webp',
  '矿工甲': '/assets/art/npc-portraits/level-02/miner-jia-v3.webp',
  '矿工乙': '/assets/art/npc-portraits/level-02/miner-yi-v3.webp',
  '矿工丙': '/assets/art/npc-portraits/level-02/miner-bing-v3.webp',
  '矿工丁': '/assets/art/npc-portraits/level-02/miner-ding-v3.webp',
  '东岸使者': '/assets/art/npc-portraits/messengers/east-bank-envoy.webp',
  '西岸使者': '/assets/art/npc-portraits/messengers/west-bank-envoy.webp',
  '北境使者': '/assets/art/npc-portraits/messengers/north-border-envoy.webp',
  '南境使者': '/assets/art/npc-portraits/messengers/south-border-envoy.webp',
  '南枝': '/assets/art/npc-portraits/level-05/nan-zhi.webp',
  '北声': '/assets/art/npc-portraits/level-05/bei-sheng.webp',
  '阿眠': '/assets/art/npc-portraits/level-05/a-mian.webp',
  '谷雨': '/assets/art/npc-portraits/level-05/gu-yu.webp',
  '织火': '/assets/art/npc-portraits/level-05/zhi-huo.webp',
  '星砂': '/assets/art/npc-portraits/level-06/xing-sha.webp',
  '青麦': '/assets/art/npc-portraits/level-06/qing-mai.webp',
  '砾歌': '/assets/art/npc-portraits/level-06/li-ge.webp'
})

export function getNpcPortraitAsset(unit = {}) {
  return NPC_PORTRAIT_ASSETS[unit.name] || null
}

export function hasNpcPortraitAsset(unit = {}) {
  return Boolean(getNpcPortraitAsset(unit))
}

export const NPC_PORTRAIT_NAMES = Object.freeze(Object.keys(NPC_PORTRAIT_ASSETS))
