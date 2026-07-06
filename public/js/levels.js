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
  '创造一群会把洪水搬到天空的透明鲸鱼',
  '让石头在水面上浮起来，形成临时桥',
  '造一棵会发光并指路的月亮树',
  '创造只对悲伤生物开放的花园来安抚巨兽',
  '让两族的梦境在同一张桌子上相遇',
  '立一块能唱出每个人家乡歌的记忆碑',
  '造一台用月光运转的净化机器',
  '让影子替村民走过危险的沼泽',
  '创造一种害怕谎言的白鸟，让它们传递真话',
  '让风把迷路者的名字吹向圣树'
];

export const LEVELS = [
  {
    id: 'flood-village',
    title: '第 1 关：洪水村庄',
    shortTitle: '洪水村庄',
    story: '暴雨撕开了河堤，村民必须在水位吞没村庄前抵达右侧高地。你的造物不能直接移动村民，只能改变世界。',
    objective: '6 回合内至少救下 4 名居民（含邮差）。',
    maxTurns: 7,
    creationCharges: 3,
    miraclePoints: 6,
    entropyLimit: 7,
    requiredRescue: 4,
    map: [
      '~~~....',
      '~~..~~~',
      '~..V..H',
      '~~~V~~H',
      '~~.V..H',
      '~~~....',
      '~~~~...'
    ],
    units: [
      { type: 'villager', name: '阿粟', x: 3, y: 2, goal: { x: 6, y: 2 } },
      { type: 'villager', name: '小烛', x: 3, y: 3, goal: { x: 6, y: 3 } },
      { type: 'villager', name: '木匠', x: 3, y: 4, goal: { x: 6, y: 4 } },
      { type: 'villager', name: '邮差', x: 4, y: 3, goal: { x: 6, y: 3 } }
    ],
    hazard: { type: 'flood', spreadPerTurn: 2, source: 'left' },
    win: 'requiredRescue',
    tips: ['吸水、造桥、屏障和引导类造物都有效。', '洪水不会吞没高地，但会切断道路。']
  },
  {
    id: 'night-mine',
    title: '第 2 关：永夜矿井',
    shortTitle: '永夜矿井',
    story: '矿井里的光被永夜吃掉。矿工们只知道出口大概在东北方，黑暗每回合都会扩大。',
    objective: '8 回合内让至少 3 名矿工抵达出口。',
    maxTurns: 8,
    creationCharges: 3,
    miraclePoints: 7,
    entropyLimit: 7,
    requiredRescue: 3,
    map: [
      'E..D...',
      '..DDD..',
      '.DD....',
      '..M.M..',
      '..V....',
      '...V...',
      '..V....'
    ],
    units: [
      { type: 'miner', name: '矿工甲', x: 2, y: 4, goal: { x: 0, y: 0 } },
      { type: 'miner', name: '矿工乙', x: 3, y: 5, goal: { x: 0, y: 0 } },
      { type: 'miner', name: '矿工丙', x: 2, y: 6, goal: { x: 0, y: 0 } },
      { type: 'miner', name: '矿工丁', x: 4, y: 5, goal: { x: 0, y: 0 } }
    ],
    hazard: { type: 'darkness', spreadPerTurn: 2 },
    win: 'requiredRescue',
    tips: ['照明、引导、净化和改变地形类造物都能帮助矿工。', '矿工进入黑暗后会迷失。']
  },
  {
    id: 'giant-city',
    title: '第 3 关：巨兽困城',
    shortTitle: '巨兽困城',
    story: '古水巨兽正向城市移动。不能杀死它，因为巨兽背上的水源维系着整条河。你需要牵制或安抚它。',
    objective: '撑过 12 回合，城市不能被巨兽抵达，巨兽怒气不能达到 5。',
    maxTurns: 12,
    creationCharges: 3,
    miraclePoints: 6,
    entropyLimit: 7,
    map: [
      '.......',
      '..F.F..',
      '.......',
      'W.....C',
      '..F.F..',
      '.......',
      '.......'
    ],
    units: [
      { type: 'beast', name: '古水巨兽', x: 0, y: 3, goal: { x: 6, y: 3 }, anger: 0 }
    ],
    hazard: { type: 'beast' },
    win: 'survive',
    beastAngerLimit: 5,
    tips: ['安抚、迟缓、屏障、引导类造物都有效。', '完全堵死巨兽会让怒气上升。']
  },
  {
    id: 'wordless-war',
    title: '第 4 关：失语战争',
    shortTitle: '失语战争',
    story: '两个部落都认为对方偷走了星火。语言断裂让误会越来越深，边境上的战争值正在上升。',
    objective: '6 回合结束时战争值低于 5，并让两名使者在边境会合。',
    maxTurns: 6,
    creationCharges: 4,
    miraclePoints: 7,
    entropyLimit: 7,
    map: [
      '..F.BF.',
      '...B...',
      '..GBG..',
      '...B...',
      '..F.BF.',
      '.......',
      '.......'
    ],
    units: [
      { type: 'tribeA', name: '东岸使者', x: 0, y: 2, goal: { x: 3, y: 2 } },
      { type: 'tribeB', name: '西岸使者', x: 6, y: 2, goal: { x: 3, y: 2 } }
    ],
    hazard: { type: 'war', warMeter: 1, warLimit: 8 },
    win: 'peace',
    tips: ['安抚、翻译、记忆、引导类造物是核心。', '雾会阻碍使者判断路线。']
  },
  {
    id: 'memory-plague',
    title: '第 5 关：记忆瘟疫',
    shortTitle: '记忆瘟疫',
    story: '村民开始忘记回家的路。圣树仍记得所有人的名字，但雾和沼泽正在抹去道路。',
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
    tips: ['记忆信标、引导、净化、照明类造物很关键。', '迷失者有概率随机移动。']
  },
  {
    id: 'final-exam',
    title: '终考：第七天之前',
    shortTitle: '创世终考',
    story: '洪水、永夜和失语同时回到世界。前五关证明你能制造奇迹，现在你要证明你能让奇迹形成秩序。',
    objective: '7 回合内救下 3 名居民、守住城市，并让战争值低于 6。',
    maxTurns: 8,
    creationCharges: 5,
    miraclePoints: 10,
    entropyLimit: 8,
    requiredRescue: 3,
    map: [
      '~~..D.C',
      '~..DD..',
      '..G.B..',
      '..V.B..',
      '.WV.BF.',
      '~.V....',
      '~~~....'
    ],
    units: [
      { type: 'villager', name: '星砂', x: 2, y: 3, goal: { x: 6, y: 0 } },
      { type: 'villager', name: '青麦', x: 2, y: 4, goal: { x: 6, y: 0 } },
      { type: 'villager', name: '砾歌', x: 2, y: 5, goal: { x: 6, y: 0 } },
      { type: 'beast', name: '裂隙兽', x: 0, y: 4, goal: { x: 6, y: 0 }, anger: 1 },
      { type: 'tribeA', name: '北境使者', x: 1, y: 2, goal: { x: 4, y: 2 } },
      { type: 'tribeB', name: '南境使者', x: 6, y: 4, goal: { x: 4, y: 2 } }
    ],
    hazard: { type: 'mixed', spreadPerTurn: 2, warMeter: 2, warLimit: 9 },
    win: 'final',
    beastAngerLimit: 5,
    tips: ['终考需要组合多种造物，不要只解决一种灾害。', '裂隙过高会直接失败。']
  }
];

export function cloneLevel(level) {
  return JSON.parse(JSON.stringify(level));
}
