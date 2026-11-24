// 조립: 위치 -> 격자 -> 저장소 -> 지도/화면.
import { CONFIG } from './config.js';
import { createGameMap } from './map/gl-map.js';
import { cellAt, cellsAround, cellBoundary, cellCenter, cellDistance } from './geo/grid.js';
import { watchLocation } from './geo/location.js';
import { CROPS, plotStatus, formatRemaining } from './game/rules.js';
import { LocalStore } from './store/local-store.js';

const params = new URLSearchParams(location.search);
const debug = params.has('debug'); // GPS 없이 '여기로 이동' 버튼으로 이동
const providerName = params.get('map') || CONFIG.map.provider;
const provider = { ...CONFIG.map.providers[providerName] };
if (params.get('token')) provider.accessToken = params.get('token');

const { resolution, viewRadius, reachRadius } = CONFIG.grid;
const store = new LocalStore({ reachRadius }); // 서버 연동 시 이 줄만 ApiStore 로 교체

const $ = (id) => document.getElementById(id);
let map, player;
let playerCell = null;
let visibleIds = [];
let plots = {};
let selected = null;
let sheetKey = '';

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 2500);
}

const reachable = (id) => cellDistance(playerCell, id) <= reachRadius;

function draw() {
  const now = Date.now();
  map.renderCells(visibleIds.map((id) => {
    const st = plotStatus(plots[id], now);
    return {
      id,
      boundary: cellBoundary(id),
      center: cellCenter(id),
      state: st.state,
      reachable: reachable(id),
      selected: id === selected,
      icon: st.state === 'empty' ? null : st.state === 'ready' ? st.crop.icon : '🌱',
    };
  }));
  $('coins').textContent = `🪙 ${player.coins}`;
  drawSheet(now);
}

function drawSheet(now) {
  const sheet = $('sheet');
  if (!selected) { sheet.hidden = true; sheetKey = ''; return; }
  const st = plotStatus(plots[selected], now);
  const near = reachable(selected);

  // 버튼이 눌리는 도중 DOM 이 바뀌지 않게, 구조가 달라질 때만 다시 만든다.
  const key = [selected, st.state, near, player.coins].join('|');
  if (key !== sheetKey) {
    sheetKey = key;
    let body;
    if (st.state === 'empty') {
      body = near
        ? `<h2>빈 밭</h2><p>무엇을 심을까요?</p><div class="actions">${Object.entries(CROPS).map(([id, c]) =>
            `<button data-plant="${id}" ${player.coins < c.seedCost ? 'disabled' : ''}>${c.icon} ${c.name}
             <small>🪙${c.seedCost} · ${formatRemaining(c.growMs)}</small></button>`).join('')}</div>`
        : '<h2>빈 밭</h2><p>가까이 가야 심을 수 있어요.</p>';
    } else if (st.state === 'growing') {
      body = `<h2>🌱 ${st.crop.name} 자라는 중</h2><div class="bar"><i id="bar"></i></div><p id="remain"></p>`;
    } else {
      body = `<h2>${st.crop.icon} ${st.crop.name} 수확 가능</h2>` + (near
        ? `<div class="actions"><button data-harvest>수확하기 <small>+🪙${st.crop.reward}</small></button></div>`
        : '<p>가까이 가야 수확할 수 있어요.</p>');
    }
    if (debug && !near) body += '<div class="actions"><button data-goto>여기로 이동 (디버그)</button></div>';
    sheet.innerHTML = '<button class="close" data-close>×</button>' + body;
    sheet.hidden = false;
  }
  if (st.state === 'growing') {
    $('bar').style.width = `${Math.round(st.progress * 100)}%`;
    $('remain').textContent = `${formatRemaining(st.remainingMs)} 남음`;
  }
}

async function reload() {
  visibleIds = cellsAround(playerCell, viewRadius);
  plots = await store.getPlots(visibleIds);
  draw();
}

async function setPosition(pos) {
  map.setPlayer(pos);
  const cell = cellAt(pos, resolution);
  if (cell !== playerCell) {
    playerCell = cell;
    await reload();
  }
}

$('sheet').addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  try {
    if ('close' in btn.dataset) {
      selected = null;
    } else if ('goto' in btn.dataset) {
      await setPosition(cellCenter(selected));
    } else if (btn.dataset.plant) {
      ({ player } = await store.plant({ cellId: selected, cropId: btn.dataset.plant, playerCell }));
    } else if ('harvest' in btn.dataset) {
      const res = await store.harvest({ cellId: selected, playerCell });
      player = res.player;
      toast(`수확 완료! +🪙${res.reward}`);
    }
  } catch (err) {
    toast(err.message);
  }
  await reload();
});

async function start() {
  player = await store.getPlayer();
  map = await createGameMap(provider, {
    container: 'map', center: CONFIG.fallbackPosition, zoom: CONFIG.map.zoom,
  });
  map.onCellTap((id) => { selected = id; draw(); });
  map.onMapTap(() => { selected = null; draw(); });

  if (debug) {
    $('mode').textContent = '디버그 모드';
    await setPosition(CONFIG.fallbackPosition);
  } else {
    let got = false;
    watchLocation(
      (pos) => { got = true; setPosition(pos); },
      (msg) => {
        toast(msg + ' 데모 위치로 시작합니다.');
        if (!got) setPosition(CONFIG.fallbackPosition);
      },
    );
  }

  setInterval(() => { if (playerCell) draw(); }, 1000); // 성장 진행 갱신
}

start().catch((err) => toast(err.message));
