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
      description: '把第七日之前的第一缕光提前封存，持续灼烧最顽固的来袭者。',
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

  function isTutorialMode() {
    return context.tutorialMode?.active === true;
  }

  const TUTORIAL_TOWER_TARGETS = Object.freeze([
    Object.freeze({ x: 9, y: 5 }),
    Object.freeze({ x: 14, y: 7 }),
    Object.freeze({ x: 19, y: 9 })
  ]);

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
    return `地面终考结束后，所有幸存区域被临时并入同一条防线。${names}被搬上城墙，居民把名字刻在临时墙背面；必须熬过长夜六更，才能进入第七日。`;
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
    return { day, innerWave, label: `长夜第 ${day}/6 更 · 第 ${innerWave}/5 波` };
  }

  function cutsceneSlides() {
    const mappedCreations = creations().slice(0, 2);
    const names = mappedCreations.map(creationName).filter(Boolean);
    const creationText = names.length ? names.join('、') : '白天留下的造物';
    const rescued = residentsCount();
    const lostValue = Array.isArray(context.lostResidents) ? context.lostResidents.length : Number(context.lostResidents || 0);
    const lost = Number.isFinite(lostValue) ? Math.max(0, lostValue) : 0;
    const entropyValue = Number(context.entropy || 0);
    const entropy = Number.isFinite(entropyValue) ? Math.max(0, entropyValue) : 0;
    const plannedTowers = Array.isArray(towerPlan?.towerPool) ? towerPlan.towerPool : DEFAULT_TOWERS;
    const creationTowerLinks = mappedCreations.map((creation, index) => {
      const towerType = plannedTowers[index] || creationTowerMap[creationAbility(creation)] || DEFAULT_TOWERS[index];
      const towerName = towerPlan?.towers?.[towerType]?.name || TOWER_THEME[towerType]?.name || towerType || '通用守夜塔';
      return `「${creationName(creation) || '未命名造物'}」转译为「${towerName}」`;
    });
    const causalText = creationTowerLinks.length
      ? creationTowerLinks.join('；')
      : '未记录到具体造物，守夜队启用「守夜弩塔」作为通用防线原型';
    const entropyText = entropy >= 7 ? '裂隙已接近临界' : entropy >= 4 ? '裂隙仍在持续增压' : '裂隙尚未越过警戒线';
    return [
      {
        kicker: '地面终考 · 收束',
        title: '六片区域在暮色中合围',
        body: `地面终考已经结束，${creationText}没有随棋盘收起。它们和幸存区域一起汇到城墙脚下；当前熵值 ${entropy}，${entropyText}。`,
        artPosition: '0% 50%'
      },
      {
        kicker: '地面终考 → 长夜六更',
        title: '造物被转译成守夜塔',
        body: `${causalText}。塔的名称、偏向与可选加成都来自真实造物记录，不是另一场游戏临时发放的装备。`,
        artPosition: '34% 50%'
      },
      {
        kicker: '长夜六更 · 人员编组',
        title: `${rescued} 名居民接过城墙灯火`,
        body: `30 波裂隙潮分为六更，每更 5 波。${rescued} 名获救居民会参与补给与守城${lost ? `；另有 ${lost} 个失落名字只能以回声留在防线中` : ''}。`,
        artPosition: '64% 50%'
      },
      {
        kicker: '长夜六更 → 第七日',
        title: '守住黎明，才能进入第七日',
        body: `当前熵值 ${entropy} 将决定来袭压力；六更后的基地损伤、受护居民与残余熵值会继续写入第七日，而不是在守夜结束时清零。`,
        artPosition: '100% 50%'
      }
    ];
  }

  function showNightWatchCinematic() {
    if (document.getElementById('night-watch-cinematic')) return;
    const slides = cutsceneSlides();
    let index = 0;
    const previouslyFocused = document.activeElement;
    const overlay = document.createElement('section');
    overlay.id = 'night-watch-cinematic';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
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
      overlay.querySelector('.night-watch-cg-visual').style.setProperty('--night-watch-cg-position', slide.artPosition);
      overlay.dataset.cgSlide = String(index + 1);
      overlay.setAttribute('aria-label', `长夜守城过场，第 ${index + 1} 页，共 ${slides.length} 页`);
      overlay.querySelector('[data-cg-next]').textContent = index === slides.length - 1 ? '进入守夜配置' : '继续';
      overlay.querySelector('.night-watch-cg-dots').innerHTML = slides
        .map((_, i) => `<span class="night-watch-cg-dot${i === index ? ' active' : ''}"></span>`)
        .join('');
    };
    const close = () => {
      overlay.remove();
      if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
    overlay.querySelector('[data-cg-skip]').addEventListener('click', close);
    overlay.querySelector('[data-cg-next]').addEventListener('click', () => {
      if (index >= slides.length - 1) close();
      else {
        index += 1;
        render();
      }
    });
    overlay.addEventListener('keydown', event => {
      const first = overlay.querySelector('[data-cg-skip]');
      const last = overlay.querySelector('[data-cg-next]');
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        last.click();
      }
      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        index -= 1;
        render();
      }
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
            location: context.regionTitle || '长夜六更',
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
        --bg-color: #070a11;
        --surface-color: #151923;
        --primary-color: #d2b86b;
        --text-color: #f0e4c1;
        --border-color: rgba(210, 184, 107, .36);
        --shadow-color: rgba(0, 0, 0, .56);
        --night-interactive: #59c7a6;
        --night-rift: #8f73c8;
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
      #open-leaderboard-btn, #open-wiki-btn, #open-settings-btn, #open-exit-btn {
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
        min-height: min(380px, calc(100dvh - 56px));
        max-height: calc(100dvh - 56px);
        display: grid;
        grid-template-rows: minmax(0, 1fr) auto;
        border: 1px solid rgba(216, 197, 138, .34);
        background: linear-gradient(180deg, rgba(20, 24, 37, .94), rgba(8, 11, 18, .98));
        box-shadow: 0 24px 70px rgba(0, 0, 0, .58);
        clip-path: polygon(0 10px, 10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%);
      }
      .night-watch-cg-frame {
        position: relative;
        min-height: 0;
        padding: 34px 38px;
        overflow-y: auto;
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
        min-height: min(58vh, 620px);
        background-color: #0b0f18;
        background-image:
          linear-gradient(90deg, rgba(7,10,17,.82), rgba(7,10,17,.2) 58%, rgba(7,10,17,.62)),
          url('../../assets/art/cg-night-watch.webp'),
          radial-gradient(circle at 76% 36%, rgba(143,115,200,.46), transparent 34%),
          linear-gradient(145deg, #151923, #070a11 64%);
        background-position: center, var(--night-watch-cg-position, 50% 50%), center, center;
        background-size: cover;
        transition: background-position 520ms ease;
      }
      canvas[data-night-watch-art-type] {
        background:
          radial-gradient(circle at 50% 38%, rgba(89, 199, 166, .14), transparent 58%),
          #0b1118;
        border: 1px solid rgba(89, 199, 166, .18);
        clip-path: polygon(0 7px, 7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%);
      }
      canvas[data-night-watch-art-ready="true"] {
        filter: drop-shadow(0 4px 7px rgba(0, 0, 0, .42));
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
      #night-watch-tutorial-guide {
        position: fixed;
        z-index: 90;
        right: 14px;
        top: 14px;
        width: min(290px, calc(100vw - 28px));
        padding: 10px;
        color: #f0e4c1;
        border: 1px solid rgba(216, 197, 138, .46);
        background: linear-gradient(155deg, rgba(22, 29, 38, .97), rgba(8, 11, 17, .97));
        box-shadow: 0 18px 50px rgba(0, 0, 0, .52);
        font-size: 12px;
        line-height: 1.55;
      }
      #night-watch-tutorial-guide.collapsed {
        width: 48px;
        padding: 0;
        border: 0;
        background: transparent;
        box-shadow: none;
      }
      .night-watch-tutorial-toggle {
        float: right;
        width: 42px;
        min-height: 42px;
        margin: 0 0 6px 8px;
        border: 1px solid rgba(216, 197, 138, .58);
        background: rgba(20, 27, 35, .98);
        color: #f4d779;
        font: inherit;
        font-weight: 900;
        cursor: pointer;
      }
      #night-watch-tutorial-guide.collapsed .night-watch-tutorial-toggle { float: none; margin: 0; }
      #night-watch-tutorial-guide.collapsed .night-watch-tutorial-body { display: none; }
      #night-watch-tutorial-guide strong { display: block; color: #f4d779; font-size: 15px; }
      #night-watch-tutorial-guide ol { margin: 8px 0; padding-left: 20px; }
      #night-watch-tutorial-guide li + li { margin-top: 5px; }
      #night-watch-tutorial-guide small { color: #aebdbe; }
      body.in-battle #night-watch-tutorial-guide { top: auto; bottom: 14px; }
      #night-watch-tutorial-targets {
        position: absolute;
        inset: 0;
        z-index: 4;
        display: none;
        pointer-events: none;
      }
      body.in-battle #night-watch-tutorial-targets { display: block; }
      .night-watch-tutorial-target {
        position: absolute;
        width: 48px;
        height: 48px;
        transform: translate(-50%, -50%);
        display: grid;
        place-items: center;
        border: 3px solid #f4d779;
        border-radius: 50%;
        color: #17120a;
        background: rgba(244, 215, 121, .78);
        box-shadow: 0 0 0 8px rgba(244, 215, 121, .14), 0 0 24px rgba(244, 215, 121, .85);
        font-size: 18px;
        font-weight: 900;
        animation: night-watch-tutorial-pulse 1.1s ease-in-out infinite;
        transition: opacity .2s ease, transform .2s ease;
      }
      .night-watch-tutorial-target::before {
        content: '▼';
        position: absolute;
        left: 50%;
        bottom: calc(100% + 4px);
        transform: translateX(-50%);
        color: #f4d779;
        filter: drop-shadow(0 2px 3px rgba(0, 0, 0, .8));
      }
      .night-watch-tutorial-target.placed { opacity: 0; transform: translate(-50%, -50%) scale(.5); }
      @keyframes night-watch-tutorial-pulse {
        0%, 100% { box-shadow: 0 0 0 5px rgba(244, 215, 121, .1), 0 0 16px rgba(244, 215, 121, .62); }
        50% { box-shadow: 0 0 0 11px rgba(244, 215, 121, .18), 0 0 30px rgba(244, 215, 121, .95); }
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
        .night-watch-cg { min-height: min(330px, calc(100dvh - 56px)); }
        .night-watch-cg-frame { padding: 28px; }
        .night-watch-cg h2 { font-size: 1.55rem; }
        .night-watch-cg p { font-size: 13px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .night-watch-cg-visual { transition: none; }
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
      <strong>${themeTitle()} · 地面终考之后 · 长夜六更</strong>
      <span id="night-watch-ai-text">${fallbackNarrative()}</span>
      <div id="night-watch-causes" aria-label="守夜因果简报"></div>
      <div id="night-watch-buff-choices" aria-label="守夜誓约选择"></div>
      <span id="night-watch-wave">通讯正在整理长夜六更的防守主题。</span>
    `;
    const selectionSlots = document.getElementById('selection-slots');
    selectionSlots?.parentElement?.insertBefore(brief, selectionSlots);
    renderCausalBriefing();
    return brief;
  }

  function ensureTutorialGuide() {
    if (!isTutorialMode()) return null;
    const bailout = document.getElementById('highlight-protocol-btn');
    if (bailout) {
      bailout.hidden = false;
      bailout.setAttribute('aria-hidden', 'false');
      bailout.tabIndex = 0;
    }
    let guide = document.getElementById('night-watch-tutorial-guide');
    if (guide) return guide;
    const selection = defaultSelection();
    const pool = selection.towerPool || [];
    const towerName = index => towerPlan?.towers?.[pool[index]]?.name || TOWER_THEME[pool[index]]?.name || pool[index] || `第 ${index + 1} 种守夜塔`;
    ensureTutorialTargets();
    guide = document.createElement('aside');
    guide.id = 'night-watch-tutorial-guide';
    guide.setAttribute('aria-live', 'polite');
    guide.innerHTML = `
      <button class="night-watch-tutorial-toggle" type="button" aria-expanded="true" aria-label="收起守夜教学">教</button>
      <div class="night-watch-tutorial-body">
        <strong>守夜教学</strong>
        <ol>
          <li>选第一项誓约，开始守夜。</li>
          <li>依次选择“${towerName(0)}”“${towerName(1)}”“${towerName(2)}”，点击地图上的 1、2、3。</li>
          <li>先升级 1 号塔，守到第 30 波。</li>
        </ol>
        <small>实在过不了，就点“教学保底 · 全塔裁决”。这是救急外挂，不计入正常流程。</small>
      </div>
    `;
    const toggle = guide.querySelector('.night-watch-tutorial-toggle');
    toggle?.addEventListener('click', () => {
      const collapsed = guide.classList.toggle('collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.setAttribute('aria-label', collapsed ? '展开守夜教学' : '收起守夜教学');
    });
    document.body.appendChild(guide);
    return guide;
  }

  function ensureTutorialTargets() {
    if (!isTutorialMode()) return null;
    const container = document.getElementById('canvas-container');
    if (!container) return null;
    let overlay = document.getElementById('night-watch-tutorial-targets');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'night-watch-tutorial-targets';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = TUTORIAL_TOWER_TARGETS.map((target, index) => `
      <span class="night-watch-tutorial-target" data-tutorial-x="${target.x}" data-tutorial-y="${target.y}"
        style="left:${((target.x + .5) / 25) * 100}%;top:${((target.y + .5) / 18) * 100}%">${index + 1}</span>
    `).join('');
    container.appendChild(overlay);
    return overlay;
  }

  function markTutorialPlacement(x, y) {
    if (!isTutorialMode()) return false;
    const marker = document.querySelector(`.night-watch-tutorial-target[data-tutorial-x="${x}"][data-tutorial-y="${y}"]`);
    if (!marker) return false;
    marker.classList.add('placed');
    return true;
  }

  function syncChrome() {
    document.title = '长夜守城 - 造物者考核3D';
    document.body.dataset.mode = 'night-watch';
    document.documentElement.dataset.nightWatchReady = 'true';
    const selectionTitle = document.querySelector('#selection-screen h1');
    if (selectionTitle) selectionTitle.textContent = '长夜守城';
    const mapTitle = document.querySelector('#map-selection-screen h1');
    if (mapTitle) mapTitle.textContent = '选择防线';
    const info = document.querySelector('#selection-info h4');
    if (info) info.textContent = '守夜塔信息';
    const infoText = document.querySelector('#selection-info p');
    if (infoText) infoText.textContent = '地面终考中创造过的造物会优先映射成今晚的防御塔。';
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
    ensureTutorialGuide();
    showNightWatchCinematic();
  }

  async function requestAiTheme() {
    try {
      const response = await fetch('/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'event',
          playerInput: '请为地面终考之后、进入第七日前的长夜六更生成防守主题和第一波前通讯。30波分成六更，每更5波。不要解释系统规则。',
          context: {
            eventType: 'night_watch_theme',
            characters: Array.isArray(context.rescuedResidents) ? context.rescuedResidents.slice(0, 5) : [],
            location: '地面终考之后，长夜六更',
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
      applyTutorialTowerAssist(towerDataRef);
    }
    publishTowerPlan();
    return towerPlan;
  }

  function applyTowerTheme(towerData, mapData) {
    towerDataRef = towerData;
    mapDataRef = mapData;
    if (window.NightWatchTowers?.applyPlan) {
      towerPlan = window.NightWatchTowers.applyPlan(towerData, mapData, towerPlan, selectedBuffChoice());
      applyTutorialTowerAssist(towerData);
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
    applyTutorialTowerAssist(towerData);
  }

  function applyTutorialTowerAssist(towerData = {}) {
    if (!isTutorialMode()) return;
    for (const data of Object.values(towerData)) {
      if (!Array.isArray(data?.levels)) continue;
      for (const level of data.levels) {
        if (Number.isFinite(level.damage)) level.damage = Math.max(1, level.damage * 2.4);
        if (Number.isFinite(level.range)) level.range += 2;
        if (Number.isFinite(level.cost)) level.cost = Math.max(50, Math.round(level.cost * 0.55));
      }
    }
  }

  function defaultSelection() {
    if (window.NightWatchTowers?.defaultSelection) {
      const selection = window.NightWatchTowers.defaultSelection(context, towerPlan, towerDataRef || {});
      return isTutorialMode() ? { ...selection, mapId: 'MAP5' } : selection;
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
    if (isTutorialMode()) return { hp: 12, money: 9000 };
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
    if (target) target.textContent = '长夜第 1/6 更开始，裂隙潮正在靠近，地面终考记录已编入防线。';
  }

  function announceWave(wave, state = {}) {
    {
    const waveNo = Math.max(1, Number(wave || 1));
    const stage = watchStage(waveNo);
    const fallbackLines = [
      `${stage.label}：北墙有回声，别让它们穿过第一道弯。`,
      `${stage.label}：裂隙正在模仿地面终考里创造过的形状。`,
      `${stage.label}：拾荒队带回了材料，守住这一波就能继续加固。`,
      `${stage.label}：长夜进入深段，敌人的影子开始重叠。`,
      `${stage.label}：第七日还没有开始，城墙必须先替我们醒着。`
    ];
    const target = document.getElementById('night-watch-wave');
    const fallback = fallbackLines[(waveNo - 1) % fallbackLines.length];
    latestWaveText = fallback;
    if (target) target.textContent = fallback;

    const requestId = `${waveNo}-${Date.now()}`;
    activeWaveRequest = requestId;
    requestNightWatchText(
      'night_watch_wave',
      `请为${stage.label}生成一句短通讯。30波代表地面终考之后的长夜六更，每更5波。只写一句，必须结合当前血量、资源、塔数量和地面造物，不解释规则。`,
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
      '守夜通讯：裂隙正在模仿你白天创造过的形状。',
      '居民通讯：拾荒队带回了材料，守住这一波就能继续加固。',
      '守夜通讯：长夜进入深段，敌人的影子开始重叠。',
      '居民通讯：第七日还没有来，城墙必须先替我们醒着。'
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
      `请写一句裂隙来袭者在${stage.label}靠近${towerName}时的短句。敌人类型：${enemyType}。这发生在地面终考之后、进入第七日前。只写一句，18字以内，不解释规则。`,
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
      regionTitle: '长夜六更',
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
      regionTitle: '长夜六更',
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
    isTutorialMode,
    markTutorialPlacement,
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
