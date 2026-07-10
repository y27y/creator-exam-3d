function freezeFrames(frames) {
  return Object.freeze(frames.map(frame => Object.freeze({ ...frame })))
}

export const LEVEL_CHAPTER_INTROS = Object.freeze({
  'flood-village': Object.freeze({
    act: '第一幕',
    chapter: '第 1 关 · 被淹没的村庄',
    frames: freezeFrames([
      {
        art: '/assets/art/chapters/level-01/shot-01-rain-arrives.webp',
        title: '三日之雨',
        text: '第三天，河水还没有越过木桥。'
      },
      {
        art: '/assets/art/chapters/level-01/shot-02-river-breaches.webp',
        title: '路沉入水下',
        text: '第一座桥断了。北岸的人失去了退路。'
      },
      {
        art: '/assets/art/chapters/level-01/shot-03-last-lanterns.webp',
        title: '最后的灯火',
        text: '让他们抵达高处。你的答案必须落在棋盘上。'
      }
    ])
  }),
  'night-mine': Object.freeze({
    act: '第二幕',
    chapter: '第 2 关 · 永夜矿井',
    frames: freezeFrames([
      {
        art: '/assets/art/chapters/level-02/shot-01-lamps-descend.webp',
        title: '灯一盏盏熄灭',
        text: '永夜里，矿灯曾是唯一的路。'
      },
      {
        art: '/assets/art/chapters/level-02/shot-02-lights-fail.webp',
        title: '归路断在黑暗里',
        text: '灯火依次消失，北方也失去了回声。'
      },
      {
        art: '/assets/art/chapters/level-02/shot-03-northern-glow.webp',
        title: '还有一处微光',
        text: '带他们穿过矿坑，抵达北方出口。'
      }
    ])
  }),
  'giant-city': Object.freeze({
    act: '第三幕',
    chapter: '第 3 关 · 巨兽困城',
    frames: freezeFrames([
      {
        art: '/assets/art/chapters/level-03/shot-01-footprint-beyond.webp',
        title: '城墙之外',
        text: '第一枚足迹，出现在古城墙外。'
      },
      {
        art: '/assets/art/chapters/level-03/shot-02-channels-dry.webp',
        title: '水渠已经干涸',
        text: '巨兽尚未现身，城市先失去了水。'
      },
      {
        art: '/assets/art/chapters/level-03/shot-03-shadow-at-wall.webp',
        title: '巨影正在靠近',
        text: '守住城市，也别让恐惧决定答案。'
      }
    ])
  }),
  'wordless-war': Object.freeze({
    act: '第四幕',
    chapter: '第 4 关 · 失语战争',
    frames: freezeFrames([
      {
        art: '/assets/art/chapters/level-04/shot-01-forgotten-table.webp',
        title: '无人记得起因',
        text: '两座营地仍在对峙，却没人记得为何。'
      },
      {
        art: '/assets/art/chapters/level-04/shot-02-road-in-fog.webp',
        title: '雾吞掉了道路',
        text: '谈判桌和边境路一起消失在雾里。'
      },
      {
        art: '/assets/art/chapters/level-04/shot-03-two-lanterns.webp',
        title: '让口信抵达',
        text: '让两个使者见面，战争才可能停下。'
      }
    ])
  }),
  'memory-plague': Object.freeze({
    act: '第五幕',
    chapter: '第 5 关 · 记忆瘟疫',
    frames: freezeFrames([
      {
        art: '/assets/art/chapters/level-05/shot-01-names-fade.webp',
        title: '名字开始消失',
        text: '房屋还在，人们却认不出回家的路。'
      },
      {
        art: '/assets/art/chapters/level-05/shot-02-paths-repeat.webp',
        title: '昨日不断重演',
        text: '道路和屋顶，在雾里重复错误的位置。'
      },
      {
        art: '/assets/art/chapters/level-05/shot-03-tree-remains.webp',
        title: '记住那棵树',
        text: '把他们引向唯一没有被遗忘的地方。'
      }
    ])
  }),
  'final-exam': Object.freeze({
    act: '终幕',
    chapter: '终考 · 第七天之前',
    frames: freezeFrames([
      {
        art: '/assets/art/chapters/level-06/shot-01-worlds-return.webp',
        title: '所有灾难归来',
        text: '洪水、永夜、巨影与战争再次重叠。'
      },
      {
        art: '/assets/art/chapters/level-06/shot-02-rift-demands.webp',
        title: '裂隙要求答案',
        text: '每一次造物的代价，都回到了这里。'
      },
      {
        art: '/assets/art/chapters/level-06/shot-03-before-seventh-day.webp',
        title: '第七天之前',
        text: '世界仍在等待最后一个能落地的答案。'
      }
    ])
  })
})
