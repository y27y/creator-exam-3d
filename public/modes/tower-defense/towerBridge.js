(function () {
  const CONTEXT_KEY = 'creatorExamNightWatchContext';
  const RESULT_KEY = 'creatorExamNightWatchResult';
  const DEFAULT_TOWERS = ['arrow', 'slow', 'magic', 'cannon', 'matrix', 'electricCore', 'thiefClaw'];

  const TOWER_THEME = {
    arrow: {
      name: '守夜弩塔',
      description: '由撤离路标改造成的守夜弩，稳定、廉价，适合把第一道裂隙潮压回路口。',
      color: '#79d0b0',
      projectileColor: '#d7fff0'
    },
    cannon: {
      name: '断层冲锤',
      description: '以城墙碎片和回声火药铸成的重炮，命中处会震开裂隙残渣。',
      color: '#9d8f68',
      projectileColor: '#f2d78b'
    },
    magic: {
      name: '言灵术塔',
      description: '把造物者曾说过的话刻进塔芯，击中敌人时会削弱它们的裂隙护层。',
      color: '#b79cff',
      projectileColor: '#eadcff'
    },
    slow: {
      name: '霜雾锚',
      description: '冻结敌人的步伐，也固定居民残留的记忆。适合守住漫长弯道。',
      color: '#67e8ff',
      projectileColor: '#d8fbff'
    },
    blast: {
      name: '裂响爆破',
      description: '把不稳定造物封入爆心，爆炸时短暂撕开敌群的推进节奏。',
      color: '#ff8f5a',
      projectileColor: '#ffd3bd'
    },
    gamma: {
      name: '腐化棱镜',
      description: '危险但高效的裂隙折射塔，光束会在敌群之间传染式跳跃。',
      color: '#ff6b7a',
      projectileColor: '#ffd1d8'
    },
    sun: {
      name: '黎明塔',
      description: '把第七天之前的第一缕光提前封存，持续灼烧最顽固的来袭者。',
      color: '#f6d36b',
      projectileColor: '#fff2ae'
    },
    electricCore: {
      name: '奇迹中枢',
      description: '从主考核残留的奇迹点里抽取脉冲，为周围塔群同步节律。',
      color: '#7dd3fc'
    },
    tesla: {
      name: '雷纹桩',
      description: '在地面钉下雷纹，连锁电光会让裂隙生物短暂停摆。',
      color: '#5eead4'
    },
    thiefClaw: {
      name: '拾荒爪',
      description: '居民临时拼出的回收装置，从敌人身上夺回可用材料。',
      color: '#d8c58a'
    },
    musicStand: {
      name: '共鸣台',
      description: '救下的居民轮流敲响铜片，让附近塔的升级更顺滑。',
      color: '#f0a6ca'
    },
    militaryBase: {
      name: '居民哨站',
      description: '被救下的人们守在撤离线上，定期派出临时防守小队。',
      color: '#b8c2d6'
    },
    matrix: {
      name: '秩序矩阵',
      description: '把多件造物的副作用束成网，连线越稳，防线越不容易崩散。',
      color: '#f87171',
      projectileColor: '#fecaca'
    },
    battery: {
      name: '余烬电池',
      description: '储存白天剩下的奇迹余温，每波开始时为防线补给资源。',
      color: '#86efac'
    },
    missileSilo: {
      name: '星轨井',
      description: '沿着夜空裂纹发射巡航星火，延迟命中但控制范围极大。',
      color: '#cbd5e1',
      projectileColor: '#f8fafc'
    },
    pursuit: {
      name: '回声追击',
      description: '追踪导弹会沿着居民记忆里的路线回响，叠满干扰后反推敌人。',
      color: '#dbeafe',
      projectileColor: '#ffffff'
    },
    heavyWeapons: {
      name: '终考重台',
      description: '把终考后剩余的重型材料全数压上防线，昂贵但足够直接。',
      color: '#f8fafc',
      projectileColor: '#fde68a'
    },
    boomerang: {
      name: '回环刃',
      description: '刀刃沿撤离路线往复巡弋，适合清理在道路上拖延的敌群。',
      color: '#a78bfa',
      projectileColor: '#e9d5ff'
    },
    frostPunish: {
      name: '寒誓弩',
      description: '居民在城墙上立下的寒誓，专门惩戒已经被迟缓的强敌。',
      color: '#7dd3fc',
      projectileColor: '#e0f2fe'
    }
  };

  const MAP_THEME = {
    MAP1: { name: '城墙回廊' },
    MAP2: { name: '撤离小径', modifierText: '居民引路：敌人血量 x0.8，移速 x0.8' },
    MAP3: { name: '记忆螺旋' },
    MAP4: { name: '边境折线', modifierText: '旧路狭窄：敌人血量 x0.75，移速 x0.75' },
    MAP5: { name: '双子防线', modifierText: '双线牵制：敌人血量 x0.7，移速 x0.7' },
    MAP6: { name: '裂隙弧道', modifierText: '地势回响：敌人血量 x0.7，移速 x0.7' }
  };

  const creationTowerMap = {
    absorb_water: 'slow',
    create_bridge: 'arrow',
    illuminate: 'sun',
    block: 'matrix',
    calm: 'musicStand',
    guide: 'pursuit',
    cleanse: 'magic',
    slow_beast: 'frostPunish',
    memory_beacon: 'magic',
    force_field: 'electricCore',
    transform_land: 'cannon',
    freeze_water: 'slow',
    reveal_path: 'pursuit',
    sun_blessing: 'sun',
    raise_earth: 'cannon',
    grow_forest: 'thiefClaw',
    dig_channel: 'boomerang',
    trap: 'blast',
    dream_link: 'matrix',
    time_dilation: 'tesla'
  };

  let context = loadContext();
  let aiText = '';
  let latestWaveText = '';
  let activeWaveRequest = '';
  let battleStart = { hp: 3, money: 2000, finalWave: 30 };

  function parseJson(value) {
    try { return JSON.parse(value); } catch (_) { return null; }
  }

  function loadContext() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('context');
    if (fromQuery) {
      const decoded = parseJson(decodeURIComponent(fromQuery));
      if (decoded) return decoded;
    }
    try {
      return parseJson(localStorage.getItem(CONTEXT_KEY) || '') || {};
    } catch (_) {
      return {};
    }
  }

  function residentsCount(value = context.rescuedResidents) {
    if (Array.isArray(value)) return value.length;
    const count = Number(value);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  }

  function creations() {
    return Array.isArray(context.recentCreations) ? context.recentCreations : [];
  }

  function creationName(item) {
    return typeof item === 'string' ? item : item?.name || item?.creationName || '';
  }

  function creationAbility(item) {
    return typeof item === 'object' ? item.ability || item.card?.ability || '' : '';
  }

  function themeTitle() {
    const entropy = Number(context.entropy || 0);
    if (entropy >= 7) return '裂隙高潮';
    if (creations().some(item => /记忆|梦|碑|灯|光/.test(creationName(item)))) return '记忆守夜';
    if (residentsCount() >= 4) return '万人灯火';
    return '长夜守城';
  }

  function fallbackNarrative() {
    const title = context.regionTitle || '终考区域';
    const names = creations().map(creationName).filter(Boolean).slice(0, 3).join('、') || '白天留下的造物';
    return `${title}进入第七天之前的最后一夜。${names}被搬上防线，居民把名字刻在临时城墙背面；裂隙潮还没有抵达，但风里已经有回声。`;
  }

  function worldState(extra = {}) {
    return {
      currentLevel: context.regionId || 'night_watch',
      rescued: residentsCount(),
      lost: Array.isArray(context.lostResidents) ? context.lostResidents.length : Number(context.lostResidents || 0),
      entropy: Number(context.entropy || 0),
      entropyLimit: 8,
      creations: creations().map(creationName).filter(Boolean),
      discoveredLore: context.discoveredLore || [],
      playStyle: context.playerStyle || 'unknown',
      ...extra
    };
  }

  function cleanNarrative(text, max = 220) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  async function requestNightWatchText(eventType, playerInput, extraContext = {}, extraWorldState = {}) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
    try {
      const response = await fetch('/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller?.signal,
        body: JSON.stringify({
          type: 'event',
          playerInput,
          context: {
            eventType,
            characters: Array.isArray(context.rescuedResidents) ? context.rescuedResidents.slice(0, 5) : [],
            location: context.regionTitle || '第七天之前',
            result: '裂隙潮正在反扑，居民与造物被编入防线。',
            ...extraContext
          },
          worldState: worldState(extraWorldState)
        })
      });
      if (!response.ok) return '';
      const data = await response.json();
      return cleanNarrative(data?.text);
    } catch (_) {
      return '';
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function injectStyle() {
    if (document.getElementById('night-watch-style')) return;
    const style = document.createElement('style');
    style.id = 'night-watch-style';
    style.textContent = `
      :root {
        --bg-color: #070918;
        --surface-color: #161923;
        --primary-color: #d8c58a;
        --text-color: #f5f5f7;
        --border-color: rgba(216, 197, 138, .36);
        --shadow-color: rgba(0, 0, 0, .56);
      }
      body {
        background:
          linear-gradient(145deg, #050507 0%, #111827 54%, #08090d 100%);
      }
      .screen, #ui-panel, #selection-info {
        background: linear-gradient(180deg, rgba(26, 29, 42, .96), rgba(14, 16, 24, .98));
        border: 1px solid rgba(216, 197, 138, .22);
      }
      #night-watch-brief {
        width: 100%;
        display: grid;
        gap: 8px;
        padding: 12px 14px;
        border: 1px solid rgba(121, 208, 176, .28);
        background: rgba(10, 16, 24, .72);
        color: var(--text-color);
        line-height: 1.45;
      }
      #night-watch-brief strong { color: var(--primary-color); }
      #night-watch-ai-text, #night-watch-wave { color: #cbd5e1; font-size: 13px; }
      .stats-display { border-left-color: #79d0b0; }
      .tower-card { background: #202635; }
      .tower-card.selected { box-shadow: 0 0 14px rgba(216, 197, 138, .38); }
      #start-wave-btn:not(:disabled), #select-map-btn, #start-game-from-map-btn:not(:disabled), #restart-btn {
        background-image: linear-gradient(180deg, #ead99a, #bda65b);
      }
    `;
    document.head.appendChild(style);
  }

  function ensureBrief() {
    let brief = document.getElementById('night-watch-brief');
    if (brief) return brief;
    brief = document.createElement('div');
    brief.id = 'night-watch-brief';
    brief.innerHTML = `
      <strong>${themeTitle()} · ${context.regionTitle || '第七天之前'}</strong>
      <span id="night-watch-ai-text">${fallbackNarrative()}</span>
      <span id="night-watch-wave">AI 正在整理今晚的防守主题。</span>
    `;
    const selectionSlots = document.getElementById('selection-slots');
    selectionSlots?.parentElement?.insertBefore(brief, selectionSlots);
    return brief;
  }

  function syncChrome() {
    document.title = '长夜守城 - 造物者考核3D';
    document.body.dataset.mode = 'night-watch';
    const selectionTitle = document.querySelector('#selection-screen h1');
    if (selectionTitle) selectionTitle.textContent = '长夜守城';
    const mapTitle = document.querySelector('#map-selection-screen h1');
    if (mapTitle) mapTitle.textContent = '选择防线';
    const info = document.querySelector('#selection-info h4');
    if (info) info.textContent = '守夜塔信息';
    const infoText = document.querySelector('#selection-info p');
    if (infoText) infoText.textContent = '白天创造过的造物会优先映射成今晚的防御塔。';
    const selectMapBtn = document.getElementById('select-map-btn');
    if (selectMapBtn && selectMapBtn.textContent.includes('选择地图')) selectMapBtn.textContent = selectMapBtn.textContent.replace('选择地图', '选择防线');
    const startBtn = document.getElementById('start-game-from-map-btn');
    if (startBtn) startBtn.textContent = '开始守夜';
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.textContent = '返回守夜菜单';
    ensureBrief();
  }

  async function requestAiTheme() {
    try {
      const response = await fetch('/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'event',
          playerInput: '请为塔防守夜生成本次防守主题和第一波前的通讯旁白。不要解释系统规则。',
          context: {
            eventType: 'night_watch_theme',
            characters: Array.isArray(context.rescuedResidents) ? context.rescuedResidents.slice(0, 5) : [],
            location: context.regionTitle || '第七天之前',
            result: '裂隙潮正在反扑，居民与造物被编入防线'
          },
          worldState: {
            currentLevel: context.regionId || 'night_watch',
            rescued: residentsCount(),
            lost: Array.isArray(context.lostResidents) ? context.lostResidents.length : Number(context.lostResidents || 0),
            entropy: Number(context.entropy || 0),
            entropyLimit: 8,
            creations: creations().map(creationName).filter(Boolean),
            discoveredLore: context.discoveredLore || [],
            playStyle: context.playerStyle || '未知'
          }
        })
      });
      if (!response.ok) return;
      const data = await response.json();
      aiText = String(data?.text || '').trim();
      if (aiText) {
        const target = document.getElementById('night-watch-ai-text');
        if (target) target.textContent = aiText;
      }
    } catch (_) {
      aiText = '';
    }
  }

  function applyTowerTheme(towerData, mapData) {
    for (const [key, value] of Object.entries(TOWER_THEME)) {
      if (!towerData[key]) continue;
      Object.assign(towerData[key], value);
    }
    for (const [key, value] of Object.entries(MAP_THEME)) {
      if (!mapData[key]) continue;
      Object.assign(mapData[key], value);
    }
  }

  function defaultSelection() {
    const mapped = creations()
      .map(creationAbility)
      .map(ability => creationTowerMap[ability])
      .filter(Boolean);
    const towerPool = [...new Set([...mapped, ...DEFAULT_TOWERS])].slice(0, 7);
    const entropy = Number(context.entropy || 0);
    const mapId = entropy >= 7 ? 'MAP3' : residentsCount() >= 4 ? 'MAP5' : 'MAP2';
    return { towerPool, mapId };
  }

  function getStartingState() {
    const entropy = Math.max(0, Number(context.entropy || 0));
    const protectedResidents = residentsCount();
    return {
      hp: Math.max(2, Math.min(6, 3 + Math.floor(protectedResidents / 3) - Math.floor(entropy / 6))),
      money: Math.max(1400, 2000 + protectedResidents * 80 - entropy * 55)
    };
  }

  function markBattleStarted(state = {}) {
    battleStart = {
      hp: Number(state.hp || 3),
      money: Number(state.money || 2000),
      finalWave: Number(state.finalWave || 30)
    };
    const target = document.getElementById('night-watch-wave');
    if (target) target.textContent = '第一波裂隙潮正在靠近，AI 已把白天的记忆编入防线。';
  }

  function announceWave(wave, state = {}) {
    {
    const waveNo = Math.max(1, Number(wave || 1));
    const fallbackLines = [
      '居民通讯：北墙有回声，别让它们穿过第一道弯。',
      'AI Storyteller：裂隙正在模仿你白天创造过的形状。',
      '居民通讯：拾荒队带回了材料，守住这一波就能继续加固。',
      'AI Storyteller：长夜进入深段，敌人的影子开始重叠。',
      '居民通讯：第七天还没有来，城墙必须先替我们醒着。'
    ];
    const target = document.getElementById('night-watch-wave');
    const fallback = fallbackLines[(waveNo - 1) % fallbackLines.length];
    latestWaveText = fallback;
    if (target) target.textContent = fallback;

    const requestId = `${waveNo}-${Date.now()}`;
    activeWaveRequest = requestId;
    requestNightWatchText(
      'night_watch_wave',
      `请为长夜守城第${waveNo}波生成一句短通讯。只写一句，必须结合当前血量、资源、塔数量和白天造物，不解释规则。`,
      { wave: waveNo },
      { wave: waveNo, hp: state.hp, money: state.money, towerCount: state.towerCount }
    ).then(text => {
      if (!text || activeWaveRequest !== requestId) return;
      latestWaveText = text;
      const currentTarget = document.getElementById('night-watch-wave');
      if (currentTarget) currentTarget.textContent = text;
    });

    return { wave, state };
    }
    const lines = [
      '居民通讯：北墙有回声，别让它们穿过第一道弯。',
      'AI Storyteller：裂隙正在模仿你白天创造过的形状。',
      '居民通讯：拾荒队带回了材料，守住这一波就能继续加固。',
      'AI Storyteller：长夜进入深段，敌人的影子开始重叠。',
      '居民通讯：第七天还没有来，城墙必须先替我们醒着。'
    ];
    const target = document.getElementById('night-watch-wave');
    if (target) target.textContent = lines[(Math.max(1, Number(wave || 1)) - 1) % lines.length];
    return { wave, state };
  }

  function complete(isVictory, state = {}) {
    if (context.mode !== 'night_watch' && new URLSearchParams(window.location.search).get('from') !== 'creator-exam') {
      return null;
    }
    {
    const survivedWaves = Math.max(0, Number(state.wave || 0));
    const startHp = Math.max(1, Number(battleStart.hp || 3));
    const currentHp = Math.max(0, Number(state.hp || 0));
    const baseDamage = Math.max(0, startHp - currentHp);
    const residents = residentsCount();
    const protectedCount = residents ? Math.max(0, Math.min(residents, Math.round(residents * (currentHp / startHp)))) : 0;
    const result = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      contextId: context.id || null,
      mode: 'night_watch',
      victory: Boolean(isVictory),
      regionId: context.regionId || 'final-exam',
      regionTitle: context.regionTitle || '第七天之前',
      survivedWaves,
      baseDamage,
      residentsProtected: protectedCount,
      residentsInjured: Math.max(0, residents - protectedCount + (isVictory ? 0 : 1)),
      entropyDelta: isVictory ? -Math.min(2, Math.max(1, Math.floor(survivedWaves / 12))) : Math.min(4, 1 + baseDamage),
      unlockedMaterials: isVictory ? ['裂隙琉璃', '守夜余烬'] : ['破损城砖'],
      notableMoment: latestWaveText || aiText || fallbackNarrative(),
      theme: themeTitle(),
      towerCount: Number(state.towerCount || 0),
      completedAt: new Date().toISOString()
    };
    const publish = (payload) => {
      try { localStorage.setItem(RESULT_KEY, JSON.stringify(payload)); } catch (_) {}
      try { window.opener?.postMessage({ type: 'creator_exam_night_watch_result', result: payload }, window.location.origin); } catch (_) {}
    };

    publish(result);
    requestNightWatchText(
      'night_watch_settlement',
      `请为长夜守城结算生成一个关键时刻。结果：${isVictory ? '守住' : '失守'}，波次${survivedWaves}，基地损伤${baseDamage}，保护居民${protectedCount}/${residents}。只写一段，不解释规则。`,
      { victory: Boolean(isVictory), survivedWaves },
      { wave: survivedWaves, hp: currentHp, money: state.money, towerCount: state.towerCount, baseDamage }
    ).then(text => {
      if (!text) return;
      result.notableMoment = text;
      result.aiSettlement = true;
      publish(result);
    });

    return result;
    }

    const survivedWaves = Math.max(0, Number(state.wave || 0));
    const startHp = Math.max(1, Number(battleStart.hp || 3));
    const currentHp = Math.max(0, Number(state.hp || 0));
    const baseDamage = Math.max(0, startHp - currentHp);
    const residents = residentsCount();
    const protectedCount = residents ? Math.max(0, Math.min(residents, Math.round(residents * (currentHp / startHp)))) : 0;
    const result = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      contextId: context.id || null,
      mode: 'night_watch',
      victory: Boolean(isVictory),
      regionId: context.regionId || 'final-exam',
      regionTitle: context.regionTitle || '第七天之前',
      survivedWaves,
      baseDamage,
      residentsProtected: protectedCount,
      residentsInjured: Math.max(0, residents - protectedCount + (isVictory ? 0 : 1)),
      entropyDelta: isVictory ? -Math.min(2, Math.max(1, Math.floor(survivedWaves / 12))) : Math.min(4, 1 + baseDamage),
      unlockedMaterials: isVictory ? ['裂隙琉璃', '守夜余烬'] : ['破损城砖'],
      notableMoment: aiText || fallbackNarrative(),
      theme: themeTitle(),
      towerCount: Number(state.towerCount || 0),
      completedAt: new Date().toISOString()
    };
    try { localStorage.setItem(RESULT_KEY, JSON.stringify(result)); } catch (_) {}
    try { window.opener?.postMessage({ type: 'creator_exam_night_watch_result', result }, window.location.origin); } catch (_) {}
    return result;
  }

  function returnToMain() {
    if (context.mode !== 'night_watch' && new URLSearchParams(window.location.search).get('from') !== 'creator-exam') {
      return false;
    }
    if (!window.opener || window.opener.closed) {
      window.location.href = '../../index.html';
      return true;
    }
    try { window.opener.focus(); } catch (_) {}
    window.location.href = '../../index.html';
    return true;
  }

  window.NightWatchBridge = {
    context,
    applyTowerTheme,
    defaultSelection,
    getStartingState,
    markBattleStarted,
    announceWave,
    complete,
    returnToMain
  };

  injectStyle();
  syncChrome();
  requestAiTheme();
})();
