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
  })
})
