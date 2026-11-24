// 설정은 여기 한 곳에서만 바꾼다.
// 지도 제공자 전환: map.provider 를 'mapbox' 로 바꾸고 accessToken 을 넣으면 끝.
// (개발 중에는 URL 로도 가능: ?map=mapbox&token=pk.xxx)
export const CONFIG = {
  map: {
    provider: 'maplibre', // 'maplibre' | 'mapbox'
    zoom: 17.5,
    providers: {
      maplibre: {
        global: 'maplibregl',
        js: 'https://unpkg.com/maplibre-gl@5.24.1/dist/maplibre-gl.js',
        css: 'https://unpkg.com/maplibre-gl@5.24.1/dist/maplibre-gl.css',
        style: 'https://tiles.openfreemap.org/styles/liberty', // 무료, 키 불필요
      },
      mapbox: {
        global: 'mapboxgl',
        js: 'https://api.mapbox.com/mapbox-gl-js/v3.35.2/mapbox-gl.js',
        css: 'https://api.mapbox.com/mapbox-gl-js/v3.35.2/mapbox-gl.css',
        style: 'mapbox://styles/mapbox/streets-v12',
        accessToken: '', // pk.로 시작하는 공개 토큰
      },
    },
  },
  grid: {
    resolution: 11, // H3 해상도. 11 = 한 변 약 25m 육각형
    viewRadius: 3,  // 내 셀에서 3칸까지 화면에 표시 (37칸)
    reachRadius: 1, // 내 셀에서 1칸까지 심기/수확 가능 (7칸)
  },
  // 위치 권한이 없거나 ?debug 일 때 시작 위치 (서울시청)
  fallbackPosition: { lat: 37.5665, lng: 126.978 },
};
