import { TIMELINE_ENDING_ART } from './timelineEndingManifest.js';

const CLASS_COPY = Object.freeze({
  first_stable: '当前记录是第一条被确认的稳定时间线。',
  scarred_survival: '当前记录越过了第七日，但仍携带长夜留下的伤口。',
  narrow_gate: '当前记录守住了一道窄门，答案必须交给后来的人。',
  observer_legacy: '当前记录没有存续，但最后的航线数据已经被另一条时间线接收。'
});

export class EndingDirector {
  constructor({ archive, onRender, onComplete, storage = globalThis.localStorage, storageKey = 'creatorExamTimelineEnding:v1' }) {
    this.archive = structuredClone(archive);
    this.onRender = onRender;
    this.onComplete = onComplete;
    this.storage = storage;
    this.storageKey = storageKey;
    this.frames = this.buildFrames();
    this.index = 0;
  }

  buildFrames() {
    const archive = this.archive;
    return [
      { act: 1, phase: 'false-ending', kicker: '终局记录', title: '结局已经生成', text: CLASS_COPY[archive.timelineClass], art: TIMELINE_ENDING_ART.falseEnding },
      { act: 1, phase: 'anomaly', kicker: '记录异常', title: '记录尚未结束', text: '终局画面中出现了不属于当前世界的声音。正在校验相邻因果记录。', art: TIMELINE_ENDING_ART.recordAnomaly },
      { act: 2, phase: 'pullback', kicker: '观察尺度 01', title: '城市成为地图上的一点', text: '镜头退出了你刚刚拯救的城市。', art: TIMELINE_ENDING_ART.cityPullback },
      { act: 2, phase: 'pullback', kicker: '观察尺度 02', title: '地图成为世界的碎片', text: '所有走过的区域同时出现在裂隙边缘。', art: TIMELINE_ENDING_ART.mapPullback },
      { act: 2, phase: 'pullback', kicker: '观察尺度 03', title: '世界成为一条记录', text: '当前世界并不孤独。', art: TIMELINE_ENDING_ART.worldShard },
      { act: 2, phase: 'archive', kicker: archive.timelineId, title: '时间线档案已经打开', text: `已观察 ${archive.observedTimelines.toLocaleString('zh-CN')} 条记录；${archive.reachedSeventhDay.toLocaleString('zh-CN')} 条抵达第七日。`, art: TIMELINE_ENDING_ART.timelineSea },
      ...archive.echoes.map(echo => ({ act: 3, phase: 'echo', kicker: '失败回声', title: echo.title, text: echo.text, art: echo.art })),
      { act: 4, phase: 'truth', kicker: '造物真相 01', title: '描述即是坐标', text: '当你描述一件不存在的东西，裂隙会寻找一个它确实存在的世界。', art: TIMELINE_ENDING_ART.truthLanguage },
      { act: 4, phase: 'truth', kicker: '造物真相 02', title: '造物即是借用', text: '你没有从虚无中创造。你让两个世界短暂重叠。', art: TIMELINE_ENDING_ART.truthCreation },
      { act: 4, phase: 'truth', kicker: '造物真相 03', title: '熵值即是渗入', text: '每一次过载，都是其他时间线试图覆盖当前世界。', art: TIMELINE_ENDING_ART.truthEntropy },
      { act: 4, phase: 'truth', kicker: '造物真相 04', title: '空域即是因果之外', text: '第七日的航线不在天空，而在所有失败答案的交界处。', art: TIMELINE_ENDING_ART.truthAirspace },
      { act: 5, phase: 'anchor-choice', kicker: '最终选择', title: '为这条时间线选择锚点', text: '选择一样必须被其他世界记住的东西。', art: archive.anchors[0]?.art || TIMELINE_ENDING_ART.anchors.memory, choices: archive.anchors },
      { act: 5, phase: 'broadcast', kicker: '答案开始传播', title: '第一条相邻记录接收了锚点', text: '裂隙第一次没有传来灾难，而是传出了一种方法。', art: TIMELINE_ENDING_ART.broadcastFirst },
      { act: 5, phase: 'broadcast', kicker: '答案开始传播', title: '更多世界正在重新计算', text: '灰暗的时间线没有被自动拯救，但它们第一次拥有了抵达第七日的可能。', art: TIMELINE_ENDING_ART.broadcastMany },
      { act: 5, phase: 'complete', kicker: archive.timelineId, title: '第七日之后', text: '你没有拯救所有世界。你证明了，世界可以被拯救。', art: TIMELINE_ENDING_ART.beyondSeventhDay }
    ];
  }

  start({ resume = true } = {}) {
    if (resume) this.restore();
    this.render();
    return true;
  }

  current() {
    return this.frames[this.index] || null;
  }

  advance() {
    const frame = this.current();
    if (!frame) return false;
    if (frame.phase === 'anchor-choice' && !this.archive.selectedAnchor) return false;
    if (this.index >= this.frames.length - 1) {
      this.archive.completed = true;
      this.persist();
      this.onComplete?.(structuredClone(this.archive));
      return true;
    }
    this.index += 1;
    this.persist();
    this.render();
    return true;
  }

  chooseAnchor(anchorId) {
    const anchor = this.archive.anchors.find(candidate => candidate.id === anchorId);
    if (!anchor) return false;
    this.archive.selectedAnchor = structuredClone(anchor);
    this.persist();
    this.render();
    return true;
  }

  skipToAnchor() {
    this.index = Math.max(0, this.frames.findIndex(frame => frame.phase === 'anchor-choice'));
    this.persist();
    this.render();
  }

  render() {
    this.onRender?.(this.current(), {
      index: this.index,
      total: this.frames.length,
      archive: structuredClone(this.archive)
    });
  }

  persist() {
    try {
      this.storage?.setItem?.(this.storageKey, JSON.stringify({
        timelineId: this.archive.timelineId,
        index: this.index,
        selectedAnchor: this.archive.selectedAnchor,
        completed: this.archive.completed
      }));
    } catch (_error) {}
  }

  restore() {
    try {
      const saved = JSON.parse(this.storage?.getItem?.(this.storageKey) || 'null');
      if (!saved || saved.timelineId !== this.archive.timelineId) return false;
      this.index = Math.max(0, Math.min(this.frames.length - 1, Number(saved.index || 0)));
      if (saved.selectedAnchor?.id && this.archive.anchors.some(anchor => anchor.id === saved.selectedAnchor.id)) {
        this.archive.selectedAnchor = saved.selectedAnchor;
      }
      this.archive.completed = saved.completed === true;
      return true;
    } catch (_error) {
      return false;
    }
  }
}
