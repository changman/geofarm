// 지도 어댑터.
// 게임 코드는 지도 라이브러리를 직접 만지지 않고 GameMap 의 메서드만 쓴다.
// MapLibre GL JS 와 Mapbox GL JS 는 여기서 쓰는 API(Map, Marker, GeoJSON source,
// fill/line layer, queryRenderedFeatures)가 같아서 어댑터 하나로 둘 다 처리한다.
// 두 라이브러리가 갈라지는 부분이 생기면 이 파일만 고치면 된다.

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('지도 라이브러리를 불러오지 못했습니다: ' + src));
    document.head.append(s);
  });
}

function loadCss(href) {
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  document.head.append(l);
}

/**
 * @param provider CONFIG.map.providers 의 항목 하나
 * @returns {Promise<GameMap>}
 */
export async function createGameMap(provider, { container, center, zoom }) {
  if (!globalThis[provider.global]) {
    loadCss(provider.css);
    await loadScript(provider.js);
  }
  const lib = globalThis[provider.global];
  if ('accessToken' in provider) {
    if (!provider.accessToken) throw new Error('Mapbox accessToken 이 비어 있습니다 (src/config.js).');
    lib.accessToken = provider.accessToken;
  }

  const map = new lib.Map({
    container,
    style: provider.style,
    center: [center.lng, center.lat],
    zoom,
  });
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();

  await new Promise((resolve, reject) => {
    map.once('load', resolve);
    map.once('error', (e) => reject(e.error || new Error('지도 로드 실패')));
  });
  return new GameMap(lib, map);
}

const SRC = 'cells';
const FILL = 'cells-fill';

class GameMap {
  #lib; #map; #player = null; #markers = new Map();
  #cellTap = () => {}; #mapTap = () => {};

  constructor(lib, map) {
    this.#lib = lib;
    this.#map = map;

    map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: FILL, type: 'fill', source: SRC,
      paint: {
        'fill-color': ['match', ['get', 'state'], 'growing', '#f2c14e', 'ready', '#e4572e', '#4caf50'],
        'fill-opacity': ['case', ['get', 'reachable'], 0.4, 0.12],
      },
    });
    map.addLayer({
      id: 'cells-line', type: 'line', source: SRC,
      paint: {
        'line-color': ['case', ['get', 'selected'], '#1b5e20', '#ffffff'],
        'line-width': ['case', ['get', 'selected'], 3, 1],
      },
    });

    map.on('click', (e) => {
      const hit = map.queryRenderedFeatures(e.point, { layers: [FILL] })[0];
      if (hit) this.#cellTap(hit.properties.id);
      else this.#mapTap({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
  }

  /** 셀을 탭했을 때 cb(cellId) */
  onCellTap(cb) { this.#cellTap = cb; }
  /** 셀이 없는 곳을 탭했을 때 cb({lat,lng}) */
  onMapTap(cb) { this.#mapTap = cb; }

  /** 플레이어 마커 이동 + 카메라 따라가기 */
  setPlayer({ lat, lng }) {
    if (!this.#player) {
      this.#player = new this.#lib.Marker({ element: emoji('player-marker', '🧑‍🌾') })
        .setLngLat([lng, lat]).addTo(this.#map);
    } else {
      this.#player.setLngLat([lng, lat]);
    }
    this.#map.easeTo({ center: [lng, lat], duration: 500 });
  }

  /**
   * 화면의 셀 전체를 다시 그린다.
   * cells: [{ id, boundary:[[lng,lat],...닫힌 고리], center:{lat,lng},
   *           state:'empty'|'growing'|'ready', reachable, selected, icon|null }]
   */
  renderCells(cells) {
    this.#map.getSource(SRC).setData({
      type: 'FeatureCollection',
      features: cells.map((c) => ({
        type: 'Feature',
        properties: { id: c.id, state: c.state, reachable: c.reachable, selected: c.selected },
        geometry: { type: 'Polygon', coordinates: [c.boundary] },
      })),
    });

    // 작물 아이콘은 HTML 마커로. 바뀐 것만 갱신한다.
    const wanted = new Map(cells.filter((c) => c.icon).map((c) => [c.id, c]));
    for (const [id, m] of this.#markers) {
      const c = wanted.get(id);
      if (!c || c.icon !== m.icon) { m.marker.remove(); this.#markers.delete(id); }
    }
    for (const [id, c] of wanted) {
      if (this.#markers.has(id)) continue;
      const marker = new this.#lib.Marker({ element: emoji('crop-marker', c.icon) })
        .setLngLat([c.center.lng, c.center.lat]).addTo(this.#map);
      this.#markers.set(id, { marker, icon: c.icon });
    }
  }
}

function emoji(className, text) {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  return el;
}
