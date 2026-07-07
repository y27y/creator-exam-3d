export const TILE = Object.freeze({
  LAND: 'land',
  WATER: 'water',
  HIGH: 'high',
  VILLAGE: 'village',
  EXIT: 'exit',
  CITY: 'city',
  BORDER: 'border',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  DARK: 'dark',
  FOG: 'fog',
  SACRED: 'sacred',
  SWAMP: 'swamp',
  BRIDGE: 'bridge',
  WALL: 'wall',
  FIELD: 'field',
  POISON: 'poison'
});

export const SYMBOL_TO_TILE = Object.freeze({
  '.': TILE.LAND,
  '~': TILE.WATER,
  'H': TILE.HIGH,
  'V': TILE.VILLAGE,
  'E': TILE.EXIT,
  'C': TILE.CITY,
  'B': TILE.BORDER,
  'F': TILE.FOREST,
  'M': TILE.MOUNTAIN,
  'D': TILE.DARK,
  'G': TILE.FOG,
  'S': TILE.SACRED,
  'W': TILE.SWAMP,
  'P': TILE.POISON
});

export const INSPIRATIONS = [
  '造一群透明的鲸鱼，把洪水驮到天上去',
  '让石头浮在水面上，搭一段临时的桥',
  '种一棵会发光的月亮树，给人指路',
  '造一座只对悲伤生灵开放的花园，让巨兽安静下来',
  '让两个部落的梦，在同一张桌上碰头',
  '立一块碑，能唱出每个人老家的歌',
  '造一台靠月光转的机器，把毒和脏东西洗掉',
  '让风把迷路人的名字，吹到圣树那边去',
  '起一阵大风，把雾吹散'
];

export const LEVELS = [
  {
    id: 'flood-village',
    title: '第 1 关：洪水村庄',
    shortTitle: '洪水村庄',
    story: '暴雨下了几天，河堤没撑住。水正往村里漫，村民得在水位盖过房子前挪到东边高地。你没法直接挪人，只能改这世界。',
    objective: '6 回合内救下至少 4 名居民，其中得有邮差。',
    maxTurns: 7,
    creationCharges: 3,
    miraclePoints: 6,
    entropyLimit: 7,
    requiredRescue: 4,
    map: [
      '~~~~...',
      '~~..~~.',
      '~.V...H',
      '~~V.~~H',
      '~~V~..H',
      '~~~~...',
      '~.~~~.~'
    ],
    units: [
      { type: 'villager', name: '阿粟', x: 2, y: 2, goal: { x: 6, y: 3 } },
      { type: 'villager', name: '小烛', x: 2, y: 3, goal: { x: 6, y: 3 } },
      { type: 'villager', name: '木匠', x: 2, y: 4, goal: { x: 6, y: 3 } },
      { type: 'villager', name: '邮差', x: 1, y: 2, goal: { x: 6, y: 3 } }
    ],
    hazard: { type: 'flood', spreadPerTurn: 4, source: 'left', spreadIntoUnits: true },
    win: 'requiredRescue',
    tips: ['吸水、造桥、挡水、引路，这些造物都管用。', '水上不了高地，但会把路断了。']
  },
  {
    id: 'night-mine',
    title: '第 2 关：永夜矿井',
    shortTitle: '永夜矿井',
    story: '矿井里的光叫黑夜吞了。矿工只记得出口大概在东北边，黑暗每回合都在往外爬。',
    objective: '8 回合内，至少 3 名矿工摸到出口。',
    maxTurns: 8,
    creationCharges: 3,
    miraclePoints: 7,
    entropyLimit: 7,
    requiredRescue: 3,
    map: [
      'E..D..D',
      '..DDD..',
      '.DDD...',
      '..M.M..',
      '..V...D',
      '...V..D',
      '..V..DD'
    ],
    units: [
      { type: 'miner', name: '矿工甲', x: 2, y: 4, goal: { x: 0, y: 0 } },
      { type: 'miner', name: '矿工乙', x: 3, y: 5, goal: { x: 0, y: 0 } },
      { type: 'miner', name: '矿工丙', x: 2, y: 6, goal: { x: 0, y: 0 } },
      { type: 'miner', name: '矿工丁', x: 4, y: 5, goal: { x: 0, y: 0 } }
    ],
    hazard: { type: 'darkness', spreadPerTurn: 2 },
    win: 'requiredRescue',
    tips: ['点灯、引路、净化、改地形，这些造物都能帮上矿工。', '矿工一进黑暗就找不着北。']
  },
  {
    id: 'giant-city',
    title: '第 3 关：巨兽困城',
    shortTitle: '巨兽困城',
    story: '古水巨兽正朝城里挪。杀不得——它背上驮着水，养着整条河。你得想法子拦住它，或者让它安静下来。',
    objective: '撑过 12 回合：城不能叫巨兽踩进，它的怒气不能涨到 5。',
    maxTurns: 12,
    creationCharges: 4,
    miraclePoints: 8,
    entropyLimit: 7,
    map: [
      '...FF..',
      '.M..F..',
      '..M.F..',
      'W.....C',
      '..M.M..',
      '.FF.F..',
      'FF..V..'
    ],
    units: [
      { type: 'beast', name: '古水巨兽', x: 0, y: 3, goal: { x: 6, y: 3 }, anger: 0 }
    ],
    hazard: { type: 'beast' },
    win: 'survive',
    beastAngerLimit: 5,
    tips: ['安抚、拖延、挡路、引开，这些造物都管用。', '把路全堵死，巨兽反而更躁。']
  },
  {
    id: 'wordless-war',
    title: '第 4 关：失语战争',
    shortTitle: '失语战争',
    story: '两个部落都咬定是对方偷了星火。话说不通，误会越结越深，边境的战争值正往上走。',
    objective: '6 回合结束时，战争值压到 5 以下，还得让两名使者在边境碰头。',
    maxTurns: 7,
    creationCharges: 3,
    miraclePoints: 7,
    entropyLimit: 7,
    map: [
      '..FV..B',
      '.MG.FB.',
      '.MGGBG.',
      'V.GBG.V',
      '.GBGG..',
      '.B.VMM.',
      'B.FFM..'
    ],
    units: [
      { type: 'tribeA', name: '东岸使者', x: 0, y: 0, goal: { x: 3, y: 3 } },
      { type: 'tribeB', name: '西岸使者', x: 6, y: 6, goal: { x: 3, y: 3 } }
    ],
    hazard: { type: 'war', warMeter: 1, warLimit: 8 },
    win: 'peace',
    tips: ['安抚、翻译、唤记忆、引路，这几样是关键。', '雾一上来，使者就分不清该往哪走。']
  },
  {
    id: 'memory-plague',
    title: '第 5 关：记忆瘟疫',
    shortTitle: '记忆瘟疫',
    story: '村民开始忘记回家的路。圣树仍记得所有人的名字，但大雾正在抹去道路。',
    objective: '7 回合内让至少 4 名村民抵达圣树。',
    maxTurns: 8,
    creationCharges: 4,
    miraclePoints: 8,
    entropyLimit: 8,
    requiredRescue: 4,
    memoryChaos: true,
    map: [
      '...S...',
      '..GGG..',
      '.G.W.G.',
      '...W...',
      '.G.W.G.',
      '..V.V..',
      '.V...V.'
    ],
    units: [
      { type: 'villager', name: '南枝', x: 2, y: 5, goal: { x: 3, y: 0 }, confused: true },
      { type: 'villager', name: '北声', x: 4, y: 5, goal: { x: 3, y: 0 }, confused: true },
      { type: 'villager', name: '阿眠', x: 1, y: 6, goal: { x: 3, y: 0 }, confused: true },
      { type: 'villager', name: '谷雨', x: 5, y: 6, goal: { x: 3, y: 0 }, confused: true },
      { type: 'villager', name: '织火', x: 3, y: 6, goal: { x: 3, y: 0 }, confused: true }
    ],
    hazard: { type: 'fog', spreadPerTurn: 2 },
    win: 'requiredRescue',
    tips: ['记忆信标、引路、净化、点灯，这几样很要紧。', '迷了路的人，会瞎走。']
  },
  {
    id: 'final-exam',
    title: '终考：第七天之前',
    shortTitle: '创世终考',
    story: '洪水、永夜、失语，一块儿回来了。前五关你证明了自己能造奇迹，这回得证明你能让奇迹变成秩序。',
    objective: '7 回合内：救下 3 名居民，守住城，战争值压到 6 以下。',
    maxTurns: 8,
    creationCharges: 5,
    miraclePoints: 10,
    entropyLimit: 8,
    requiredRescue: 3,
    map: [
      '~~D.M.C',
      '~DDDM..',
      '..GGBDD',
      'F.V.B..',
      'FWV.BF.',
      '..VDB..',
      '~~~DB..'
    ],
    units: [
      { type: 'villager', name: '星砂', x: 2, y: 3, goal: { x: 6, y: 0 } },
      { type: 'villager', name: '青麦', x: 2, y: 4, goal: { x: 6, y: 0 } },
      { type: 'villager', name: '砾歌', x: 2, y: 5, goal: { x: 6, y: 0 } },
      { type: 'beast', name: '裂隙兽', x: 1, y: 4, goal: { x: 6, y: 0 }, anger: 0  },
      { type: 'tribeA', name: '北境使者', x: 0, y: 2, goal: { x: 4, y: 2 } },
      { type: 'tribeB', name: '南境使者', x: 6, y: 4, goal: { x: 4, y: 2 } }
    ],
    hazard: { type: 'mixed', spreadPerTurn: 2, warMeter: 2, warLimit: 9 },
    win: 'final',
    beastAngerLimit: 5,
    tips: ['终考得几样造物一起上，光治一种灾不够。', '裂隙一高，就直接输了。']
  }
];

export function cloneLevel(level) {
  return JSON.parse(JSON.stringify(level));
}
