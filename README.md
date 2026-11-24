# GeoFarm — 위치기반 농사 게임 MVP (HTML5)

내 위치 주변이 육각형 밭으로 나뉘고, 가까운 밭에 씨앗을 심고 시간이 지나면 돌아와 수확한다.
빌드 도구 없음. 정적 파일만으로 동작한다.

## 실행

```
npx serve .          # 또는 python3 -m http.server
```

- PC 테스트: `http://localhost:3000/?debug` — GPS 없이 밭을 탭해서 "여기로 이동"으로 돌아다닌다.
- 폰 테스트: 위치 API는 HTTPS에서만 동작한다. Vercel/Netlify/GitHub Pages 등에 폴더째 올리면 된다.
- 로직 테스트: `npm install && npm test`

## 구조

```
index.html, style.css
src/
  config.js            설정 (지도 제공자, 격자 크기)
  main.js              조립: 위치 -> 격자 -> 저장소 -> 화면
  map/gl-map.js        지도 어댑터 (MapLibre / Mapbox 공용)
  geo/grid.js          H3 격자 (좌표 <-> 셀 ID)
  geo/location.js      GPS 구독
  game/rules.js        작물 데이터, 성장 계산 (순수 함수)
  store/local-store.js 저장소 (지금은 localStorage, 나중에 서버)
```

## Mapbox GL JS 로 전환

`src/config.js` 에서 두 줄만 바꾼다.

```js
provider: 'mapbox',
...
accessToken: 'pk.xxxx',
```

개발 중에는 URL로도 된다: `?map=mapbox&token=pk.xxxx`

게임 코드는 `GameMap` 의 메서드 4개만 쓴다: `setPlayer`, `renderCells`, `onCellTap`, `onMapTap`.
지도 라이브러리 호출은 전부 `src/map/gl-map.js` 안에 있으니, 제공자별 차이가 생기면 이 파일만 고친다.

참고: MapLibre 는 5.x 로 고정했다. 6.x 는 ESM 전용 배포라 `<script>` 로 불러올 수 없다.

## 서버 붙이기

`LocalStore` 와 같은 메서드 4개(`getPlayer`, `getPlots`, `plant`, `harvest`)를 fetch 로 구현한
`ApiStore` 를 만들고 `main.js` 의 `new LocalStore(...)` 한 줄을 바꾼다.
`game/rules.js` 는 서버에서 그대로 재사용해 같은 규칙으로 검증한다.
서버에서 추가로 할 일: 이동 속도 검증(GPS 조작 방지), 서버 시각 사용.

## 밸런스 조정

- 작물/시간/가격: `src/game/rules.js` 의 `CROPS`
- 밭 크기: `CONFIG.grid.resolution` (11 = 한 변 약 25m, 12 = 약 9m)
- 보이는 범위 / 손 닿는 범위: `viewRadius` / `reachRadius`
