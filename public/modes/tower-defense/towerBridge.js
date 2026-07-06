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
  let towerPlan = window.NightWatchTowers?.localPlan?.(context) || null;
  let towerDataRef = null;
  let mapDataRef = null;
  let selectedBuffIndex = 0;
  let aiText = '';
  let latestWaveText = '';
  let activeWaveRequest = '';
  let enemyWhisperInFlight = false;
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

  function normalizeCreationNameValue(name, ability = '') {
    if (ability === 'consume_light') return '噬光黑核';
    return String(name || '').replace(/噬光之灯/g, '噬光黑核');
  }

  function creationName(item) {
    if (typeof item === 'string') return normalizeCreationNameValue(item);
    return normalizeCreationNameValue(item?.name || item?.creationName || item?.card?.name, creationAbility(item));
  }

  function creationAbility(item) {
    return typeof item === 'object' ? item.ability || item.card?.ability || '' : '';
  }

  function themeTitle() {
    if (towerPlan?.themeTitle) return towerPlan.themeTitle;
    const entropy = Number(context.entropy || 0);
    if (entropy >= 7) return '裂隙高潮';
    if (creations().some(item => /记忆|梦|碑|灯|光/.test(creationName(item)))) return '记忆守夜';
    if (residentsCount() >= 4) return '万人灯火';
    return '长夜守城';
  }

  function fallbackNarrative() {
    if (towerPlan?.briefing) return towerPlan.briefing;
    const names = creations().map(creationName).filter(Boolean).slice(0, 3).join('、') || '白天留下的造物';
    return `第六关结束后，所有幸存区域被临时并入同一条防线。${names}被搬上城墙，居民把名字刻在临时墙背面；第七关还没有开始，但裂隙潮已经在夜里排队。`;
  }

  function buffChoices() {
    return Array.isArray(towerPlan?.buffChoices) ? towerPlan.buffChoices.slice(0, 3) : [];
  }

  function selectedBuffChoice() {
    const choices = buffChoices();
    if (selectedBuffIndex >= choices.length) selectedBuffIndex = 0;
    return choices[selectedBuffIndex] || choices[0] || null;
  }

  function effectText(choice = {}) {
    const effect = choice.effect || {};
    if (effect.type === 'starting_money') return `开局金币 +${Math.round(effect.value || 0)}`;
    if (effect.type === 'starting_hp') return `基地生命 +${Math.round(effect.value || 0)}`;
    if (effect.type === 'tower_damage') return `相关塔伤害 +${Math.round(((effect.value || 1) - 1) * 100)}%`;
    if (effect.type === 'tower_range') return `相关塔射程 +${Number(effect.value || 0).toFixed(1)}`;
    if (effect.type === 'tower_discount') return `相关塔费用 -${Math.round((1 - (effect.value || 1)) * 100)}%`;
    if (effect.type === 'wave_income') return `每${Math.round(effect.every || 5)}波补给 +${Math.round(effect.value || 0)}`;
    return '守夜加成';
  }

  function renderCausalBriefing() {
    const causesRoot = document.getElementById('night-watch-causes');
    if (causesRoot) {
      causesRoot.replaceChildren();
      const causes = Array.isArray(towerPlan?.causes) ? towerPlan.causes.slice(0, 6) : [];
      for (const cause of causes) {
        const card = document.createElement('div');
        card.className = 'night-watch-cause-card';
        const source = document.createElement('span');
        source.textContent = cause.source || '因为白天留下了造物记录';
        const result = document.createElement('strong');
        result.textContent = cause.result || '所以守夜队得到对应塔材';
        card.append(source, result);
        causesRoot.append(card);
      }
    }

    const choicesRoot = document.getElementById('night-watch-buff-choices');
    if (!choicesRoot) return;
    choicesRoot.replaceChildren();
    const choices = buffChoices();
    if (selectedBuffIndex >= choices.length) selectedBuffIndex = 0;
    choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `night-watch-buff-card${index === selectedBuffIndex ? ' selected' : ''}`;
      button.dataset.index = String(index);
      const title = document.createElement('strong');
      title.textContent = choice.name || '守夜加成';
      const desc = document.createElement('span');
      desc.textContent = choice.description || '为这次守夜提供一次可选加成。';
      const reason = document.createElement('small');
      reason.textContent = `${effectText(choice)}｜${choice.reason || '来自此前造物与经历。'}`;
      button.append(title, desc, reason);
      button.addEventListener('click', () => selectBuffChoice(index));
      choicesRoot.append(button);
    });
  }

  function selectBuffChoice(index) {
    const choices = buffChoices();
    selectedBuffIndex = Math.max(0, Math.min(choices.length - 1, Number(index) || 0));
    if (towerDataRef && mapDataRef && window.NightWatchTowers?.applyPlan) {
      window.NightWatchTowers.applyPlan(towerDataRef, mapDataRef, towerPlan, selectedBuffChoice());
    }
    renderCausalBriefing();
    window.refreshNightWatchTowerPlan?.(towerPlan);
    try { window.dispatchEvent(new CustomEvent('night-watch-buff-choice', { detail: selectedBuffChoice() })); } catch (_) {}
    return selectedBuffChoice();
  }

  function watchStage(wave = 1) {
    const waveNo = Math.max(1, Number(wave || 1));
    const day = Math.min(6, Math.max(1, Math.ceil(waveNo / 5)));
    const innerWave = ((waveNo - 1) % 5) + 1;
    return { day, innerWave, label: `第 ${day} 夜 · 第 ${innerWave}/5 波` };
  }

  function cutsceneSlides() {
    const names = creations().map(creationName).filter(Boolean).slice(0, 2);
    const creationText = names.length ? names.join('、') : '白天留下的造物';
    const rescued = residentsCount();
    return [
      {
        kicker: '第六关之后',
        title: '第七关之前的长夜',
        body: `主线的六场考核已经把世界撕开。${creationText}没有消失，它们像临时写下的答案，停在所有区域合并后的裂隙边缘。`
      },
      {
        kicker: '六段守夜',
        title: '30 波被切成 6 个夜段',
        body: `这里不是第一关到第六关的重复插播。30 波裂隙潮会被分成六段，每 5 波推进一夜；被救下的 ${rescued} 名居民会在这六夜里守住第七关的入口。`
      },
      {
        kicker: '守夜配置',
        title: '把白天的答案搬上防线',
        body: `接下来是第六关到第七关之间的过场玩法。选择要带上城墙的守夜器械，防线由系统抽取；裂隙来袭者会在战场上回应你的塔和造物。`
      }
    ];
  }

  function showNightWatchCinematic() {
    if (document.getElementById('night-watch-cinematic')) return;
    const slides = cutsceneSlides();
    let index = 0;
    const overlay = document.createElement('section');
    overlay.id = 'night-watch-cinematic';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', '长夜守城过场');
    overlay.innerHTML = `
      <div class="night-watch-cg">
        <div class="night-watch-cg-frame">
          <div class="night-watch-cg-kicker"></div>
          <h2></h2>
          <p></p>
          <div class="night-watch-cg-visual" aria-hidden="true"></div>
        </div>
        <div class="night-watch-cg-footer">
          <div class="night-watch-cg-dots"></div>
          <div class="night-watch-cg-actions">
            <button type="button" data-cg-skip>跳过</button>
            <button class="primary" type="button" data-cg-next>继续</button>
          </div>
        </div>
      </div>
    `;
    const render = () => {
      const slide = slides[index];
      overlay.querySelector('.night-watch-cg-kicker').textContent = slide.kicker;
      overlay.querySelector('h2').textContent = slide.title;
      overlay.querySelector('p').textContent = slide.body;
      overlay.querySelector('[data-cg-next]').textContent = index === slides.length - 1 ? '进入守夜配置' : '继续';
      overlay.querySelector('.night-watch-cg-dots').innerHTML = slides
        .map((_, i) => `<span class="night-watch-cg-dot${i === index ? ' active' : ''}"></span>`)
        .join('');
    };
    const close = () => overlay.remove();
    overlay.querySelector('[data-cg-skip]').addEventListener('click', close);
    overlay.querySelector('[data-cg-next]').addEventListener('click', () => {
      if (index >= slides.length - 1) close();
      else {
        index += 1;
        render();
      }
    });
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
      if (event.key === 'Enter' || event.key === ' ') overlay.querySelector('[data-cg-next]').click();
    });
    render();
    document.body.appendChild(overlay);
    overlay.querySelector('[data-cg-next]')?.focus();
  }

  function worldState(extra = {}) {
    return {
      currentLevel: context.regionId || 'night_watch',
      rescued: residentsCount(),
      lost: Array.isArray(context.lostResidents) ? context.lostResidents.length : Number(context.lostResidents || 0),
      entropy: Number(context.entropy || 0),
      entropyLimit: 8,
      creations: creations().map(creationName).filter(Boolean),
      creationCards: creations().slice(-18),
      experiences: Array.isArray(context.experiences) ? context.experiences.slice(-12) : [],
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
      #selection-screen {
        width: min(760px, calc(100vw - 32px));
        max-width: 760px;
        max-height: calc(100vh - 32px);
        gap: 10px;
        padding: 18px;
        overflow: hidden;
      }
      #selection-screen h1 { font-size: 1.65rem; }
      #selection-top-actions { gap: 8px; }
      #open-leaderboard-btn, #open-wiki-btn, #open-settings-btn {
        min-block-size: 30px;
        padding: 4px 11px;
        font-size: .78em;
      }
      #selection-slots {
        min-height: 74px;
        padding: 8px;
        gap: 7px;
      }
      .slot {
        width: 58px;
        height: 58px;
      }
      .slot .tower-card canvas {
        width: 34px;
        height: 34px;
      }
      #selection-main { gap: 12px; }
      #tower-pool {
        grid-template-columns: repeat(auto-fill, minmax(74px, 1fr));
        max-height: min(330px, calc(100vh - 360px));
        gap: 7px;
        padding: 8px;
      }
      .tower-card {
        min-height: 74px;
        padding: 4px;
        background: #202635;
      }
      .tower-card canvas {
        width: 38px;
        height: 38px;
      }
      .tower-card .name { font-size: .78em; margin-top: 3px; }
      .tower-card .cost { font-size: .72em; }
      #selection-info {
        width: 220px;
        padding: 14px;
        font-size: .92em;
      }
      #selection-buttons-container { margin-top: 6px; gap: 10px; }
      .selection-btn { padding: 9px 18px; font-size: .96em; }
      #night-watch-brief {
        width: 100%;
        display: grid;
        gap: 8px;
        padding: 10px 12px;
        border: 1px solid rgba(121, 208, 176, .28);
        background: rgba(10, 16, 24, .72);
        color: var(--text-color);
        line-height: 1.45;
        box-sizing: border-box;
      }
      #night-watch-brief strong { color: var(--primary-color); }
      #night-watch-ai-text, #night-watch-wave { color: #cbd5e1; font-size: 12px; }
      #night-watch-causes {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 6px;
      }
      .night-watch-cause-card {
        display: grid;
        gap: 3px;
        padding: 7px 8px;
        border: 1px solid rgba(121, 208, 176, .18);
        background: rgba(121, 208, 176, .07);
        font-size: 11px;
        color: #b9c6d3;
      }
      .night-watch-cause-card strong {
        color: #e8dba7;
        font-size: 12px;
      }
      #night-watch-buff-choices {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 7px;
      }
      .night-watch-buff-card {
        display: grid;
        gap: 4px;
        min-height: 76px;
        padding: 8px;
        border: 1px solid rgba(216, 197, 138, .24);
        background: rgba(20, 24, 37, .78);
        color: #d8dee9;
        text-align: left;
        cursor: pointer;
        font: inherit;
      }
      .night-watch-buff-card strong {
        color: #f4de91;
        font-size: 12px;
      }
      .night-watch-buff-card span, .night-watch-buff-card small {
        font-size: 11px;
        line-height: 1.35;
      }
      .night-watch-buff-card small { color: #9fb0c0; }
      .night-watch-buff-card.selected {
        border-color: #79d0b0;
        box-shadow: 0 0 12px rgba(121, 208, 176, .22);
      }
      .stats-display { border-left-color: #79d0b0; }
      .tower-card.selected { box-shadow: 0 0 14px rgba(216, 197, 138, .38); }
      #start-wave-btn:not(:disabled), #select-map-btn, #start-game-from-map-btn:not(:disabled), #restart-btn {
        background-image: linear-gradient(180deg, #ead99a, #bda65b);
      }
      #night-watch-cinematic {
        position: fixed;
        inset: 0;
        z-index: 220;
        display: grid;
        place-items: center;
        padding: 28px;
        background:
          radial-gradient(circle at 50% 30%, rgba(216, 197, 138, .12), transparent 34%),
          linear-gradient(145deg, rgba(3, 5, 12, .96), rgba(10, 15, 28, .98));
      }
      .night-watch-cg {
        width: min(760px, calc(100vw - 42px));
        min-height: 380px;
        display: grid;
        grid-template-rows: auto 1fr auto;
        border: 1px solid rgba(216, 197, 138, .34);
        background: linear-gradient(180deg, rgba(20, 24, 37, .94), rgba(8, 11, 18, .98));
        box-shadow: 0 24px 70px rgba(0, 0, 0, .58);
      }
      .night-watch-cg-frame {
        position: relative;
        min-height: 250px;
        padding: 34px 38px;
        overflow: hidden;
      }
      .night-watch-cg-frame::before {
        content: "";
        position: absolute;
        inset: 18px;
        border: 1px solid rgba(121, 208, 176, .18);
        pointer-events: none;
      }
      .night-watch-cg-kicker {
        color: #79d0b0;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0;
      }
      .night-watch-cg h2 {
        margin: 16px 0 12px;
        color: var(--primary-color);
        font-size: 2rem;
        letter-spacing: 0;
      }
      .night-watch-cg p {
        max-width: 60ch;
        margin: 0;
        color: #d8dee9;
        font-size: 15px;
        line-height: 1.75;
      }
      .night-watch-cg-visual {
        position: absolute;
        right: 38px;
        bottom: 34px;
        width: 180px;
        height: 95px;
        opacity: .72;
        background:
          linear-gradient(90deg, transparent 0 14%, rgba(216, 197, 138, .55) 14% 17%, transparent 17% 31%, rgba(121, 208, 176, .42) 31% 35%, transparent 35%),
          linear-gradient(180deg, transparent 0 48%, rgba(216, 197, 138, .36) 48% 52%, transparent 52%);
      }
      .night-watch-cg-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 20px;
        border-top: 1px solid rgba(216, 197, 138, .22);
      }
      .night-watch-cg-dots { display: flex; gap: 7px; }
      .night-watch-cg-dot {
        width: 28px;
        height: 3px;
        background: rgba(216, 197, 138, .25);
      }
      .night-watch-cg-dot.active { background: var(--primary-color); }
      .night-watch-cg-actions { display: flex; gap: 10px; }
      .night-watch-cg button {
        border: 1px solid rgba(216, 197, 138, .55);
        background: transparent;
        color: var(--text-color);
        padding: 8px 14px;
        font: inherit;
        cursor: pointer;
      }
      .night-watch-cg button.primary {
        background: linear-gradient(180deg, #ead99a, #bda65b);
        color: #090b12;
        font-weight: 800;
      }
      @media (max-width: 820px), (max-height: 680px) {
        #selection-screen {
          width: min(700px, calc(100vw - 22px));
          padding: 12px;
        }
        #selection-screen h1 { font-size: 1.35rem; }
        #selection-info { width: 190px; padding: 10px; }
        #tower-pool { max-height: min(280px, calc(100vh - 310px)); }
        #night-watch-buff-choices { grid-template-columns: 1fr; }
        .night-watch-cg { min-height: 330px; }
        .night-watch-cg-frame { padding: 28px; }
        .night-watch-cg h2 { font-size: 1.55rem; }
        .night-watch-cg p { font-size: 13px; }
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
      <strong>${themeTitle()} · 第七关之前 · 六夜守城</strong>
      <span id="night-watch-ai-text">${fallbackNarrative()}</span>
      <div id="night-watch-causes" aria-label="守夜因果简报"></div>
      <div id="night-watch-buff-choices" aria-label="守夜誓约选择"></div>
      <span id="night-watch-wave">AI 正在整理六夜防守主题。</span>
    `;
    const selectionSlots = document.getElementById('selection-slots');
    selectionSlots?.parentElement?.insertBefore(brief, selectionSlots);
    renderCausalBriefing();
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
    document.getElementById('open-announcement-btn')?.remove();
    const testBtn = document.getElementById('start-game-test-btn');
    if (testBtn) testBtn.style.display = 'none';
    const leaderboardBtn = document.getElementById('open-leaderboard-btn');
    if (leaderboardBtn) leaderboardBtn.textContent = '🏆 守夜档案';
    const wikiBtn = document.getElementById('open-wiki-btn');
    if (wikiBtn) wikiBtn.textContent = '📖 战术图鉴';
    const selectMapBtn = document.getElementById('select-map-btn');
    if (selectMapBtn) selectMapBtn.textContent = '开始守夜';
    const startBtn = document.getElementById('start-game-from-map-btn');
    if (startBtn) startBtn.textContent = '开始守夜';
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.textContent = '返回守夜菜单';
    ensureBrief();
    showNightWatchCinematic();
  }

  async function requestAiTheme() {
    try {
      const response = await fetch('/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'event',
          playerInput: '请为第六关到第七关之间的塔防守夜生成防守主题和第一波前的通讯旁白。30波会分成6个夜段。不要解释系统规则。',
          context: {
            eventType: 'night_watch_theme',
            characters: Array.isArray(context.rescuedResidents) ? context.rescuedResidents.slice(0, 5) : [],
            location: '第六关之后，第七关之前',
            result: '裂隙潮正在反扑，居民与造物被编入防线'
          },
          worldState: {
            currentLevel: context.regionId || 'night_watch',
            rescued: residentsCount(),
            lost: Array.isArray(context.lostResidents) ? context.lostResidents.length : Number(context.lostResidents || 0),
            entropy: Number(context.entropy || 0),
            entropyLimit: 8,
            creations: creations().map(creationName).filter(Boolean),
            creationCards: creations().slice(-18),
            experiences: Array.isArray(context.experiences) ? context.experiences.slice(-12) : [],
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

  function publishTowerPlan() {
    const target = document.getElementById('night-watch-ai-text');
    if (target && towerPlan?.briefing && !aiText) target.textContent = towerPlan.briefing;
    renderCausalBriefing();
    try { window.dispatchEvent(new CustomEvent('night-watch-tower-plan', { detail: towerPlan })); } catch (_) {}
    window.refreshNightWatchTowerPlan?.(towerPlan);
  }

  async function requestDynamicTowerPlan() {
    if (!window.NightWatchTowers?.requestTowerPlan) {
      publishTowerPlan();
      return towerPlan;
    }
    const plan = await window.NightWatchTowers.requestTowerPlan(context);
    if (!plan) return towerPlan;
    towerPlan = plan;
    if (selectedBuffIndex >= buffChoices().length) selectedBuffIndex = 0;
    if (towerDataRef && mapDataRef) {
      window.NightWatchTowers.applyPlan(towerDataRef, mapDataRef, towerPlan, selectedBuffChoice());
    }
    publishTowerPlan();
    return towerPlan;
  }

  function applyTowerTheme(towerData, mapData) {
    towerDataRef = towerData;
    mapDataRef = mapData;
    if (window.NightWatchTowers?.applyPlan) {
      towerPlan = window.NightWatchTowers.applyPlan(towerData, mapData, towerPlan, selectedBuffChoice());
      return towerPlan;
    }
    for (const [key, value] of Object.entries(TOWER_THEME)) {
      if (!towerData[key]) continue;
      delete towerData[key].limit;
      Object.assign(towerData[key], value);
    }
    for (const value of Object.values(towerData)) {
      if (value && typeof value === 'object') delete value.limit;
    }
    for (const [key, value] of Object.entries(MAP_THEME)) {
      if (!mapData[key]) continue;
      Object.assign(mapData[key], value);
    }
  }

  function defaultSelection() {
    if (window.NightWatchTowers?.defaultSelection) {
      return window.NightWatchTowers.defaultSelection(context, towerPlan, towerDataRef || {});
    }
    const mapped = creations()
      .map(creationAbility)
      .map(ability => Array.isArray(creationTowerMap[ability]) ? creationTowerMap[ability][0] : creationTowerMap[ability])
      .filter(Boolean);
    const towerPool = [...new Set([...mapped, ...DEFAULT_TOWERS])].slice(0, 7);
    const entropy = Number(context.entropy || 0);
    const mapId = entropy >= 7 ? 'MAP3' : residentsCount() >= 4 ? 'MAP5' : 'MAP2';
    return { towerPool, mapId };
  }

  function getStartingState() {
    const entropy = Math.max(0, Number(context.entropy || 0));
    const protectedResidents = residentsCount();
    const effect = selectedBuffChoice()?.effect || {};
    const moneyBonus = effect.type === 'starting_money' ? Math.round(Number(effect.value || 0)) : 0;
    const hpBonus = effect.type === 'starting_hp' ? Math.round(Number(effect.value || 0)) : 0;
    return {
      hp: Math.max(2, Math.min(7, 3 + Math.floor(protectedResidents / 3) - Math.floor(entropy / 6) + hpBonus)),
      money: Math.max(1400, 2000 + protectedResidents * 80 - entropy * 55 + moneyBonus)
    };
  }

  function applyWaveBuff(wave, state = {}) {
    const choice = selectedBuffChoice();
    const effect = choice?.effect || {};
    if (effect.type !== 'wave_income') return null;
    const every = Math.max(3, Math.round(Number(effect.every || 5)));
    const waveNo = Math.max(1, Number(wave || 1));
    if (waveNo % every !== 0) return null;
    const moneyDelta = Math.round(Number(effect.value || 0));
    return {
      moneyDelta,
      text: `${choice.name || '守夜补给'}：第${waveNo}波补给 +${moneyDelta}`,
      state
    };
  }

  function markBattleStarted(state = {}) {
    battleStart = {
      hp: Number(state.hp || 3),
      money: Number(state.money || 2000),
      finalWave: Number(state.finalWave || 30)
    };
    const target = document.getElementById('night-watch-wave');
    if (target) target.textContent = '第 1 夜开始，裂隙潮正在靠近，AI 已把六关记忆编入防线。';
  }

  function announceWave(wave, state = {}) {
    {
    const waveNo = Math.max(1, Number(wave || 1));
    const stage = watchStage(waveNo);
    const fallbackLines = [
      `${stage.label}：北墙有回声，别让它们穿过第一道弯。`,
      `${stage.label}：裂隙正在模仿前六关里创造过的形状。`,
      `${stage.label}：拾荒队带回了材料，守住这一波就能继续加固。`,
      `${stage.label}：长夜进入深段，敌人的影子开始重叠。`,
      `${stage.label}：第七关还没有开始，城墙必须先替我们醒着。`
    ];
    const target = document.getElementById('night-watch-wave');
    const fallback = fallbackLines[(waveNo - 1) % fallbackLines.length];
    latestWaveText = fallback;
    if (target) target.textContent = fallback;

    const requestId = `${waveNo}-${Date.now()}`;
    activeWaveRequest = requestId;
    requestNightWatchText(
      'night_watch_wave',
      `请为长夜守城${stage.label}生成一句短通讯。30波代表第六关到第七关之间的六段守夜，每5波推进一夜。只写一句，必须结合当前血量、资源、塔数量和白天造物，不解释规则。`,
      { wave: waveNo, day: stage.day, innerWave: stage.innerWave },
      { wave: waveNo, day: stage.day, hp: state.hp, money: state.money, towerCount: state.towerCount }
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

  async function enemyWhisper(enemyType, towerName, wave, fallback = '') {
    if (enemyWhisperInFlight) return '';
    enemyWhisperInFlight = true;
    const stage = watchStage(wave);
    const text = await requestNightWatchText(
      'night_watch_enemy_whisper',
      `请写一句裂隙来袭者在${stage.label}靠近${towerName}时的短句。敌人类型：${enemyType}。这发生在第六关到第七关之间。只写一句，18字以内，不解释规则。`,
      { enemyType, towerName, wave, day: stage.day },
      { enemyType, towerName, wave, day: stage.day }
    );
    enemyWhisperInFlight = false;
    return text || fallback;
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
      regionTitle: '第七关之前',
      survivedWaves,
      baseDamage,
      residentsProtected: protectedCount,
      residentsInjured: Math.max(0, residents - protectedCount + (isVictory ? 0 : 1)),
      entropyDelta: isVictory ? -Math.min(2, Math.max(1, Math.floor(survivedWaves / 12))) : Math.min(4, 1 + baseDamage),
      unlockedMaterials: isVictory ? ['裂隙琉璃', '守夜余烬'] : ['破损城砖'],
      notableMoment: latestWaveText || aiText || fallbackNarrative(),
      theme: themeTitle(),
      towerCount: Number(state.towerCount || 0),
      towerPlan: towerPlan ? {
        source: towerPlan.source || 'unknown',
        briefing: towerPlan.briefing || '',
        towerPool: Array.isArray(towerPlan.towerPool) ? towerPlan.towerPool.slice(0, 7) : []
      } : null,
      selectedBuff: selectedBuffChoice() ? {
        id: selectedBuffChoice().id,
        name: selectedBuffChoice().name,
        effect: selectedBuffChoice().effect
      } : null,
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
      regionTitle: '第七关之前',
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
    applyWaveBuff,
    enemyWhisper,
    complete,
    returnToMain,
    getTowerPlan: () => towerPlan,
    getBuffChoices: buffChoices,
    getSelectedBuffChoice: selectedBuffChoice,
    selectBuffChoice,
    requestDynamicTowerPlan
  };

  injectStyle();
  syncChrome();
  publishTowerPlan();
  requestDynamicTowerPlan();
  requestAiTheme();
})();
