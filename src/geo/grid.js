// H3 격자 래퍼. 좌표 -> 셀 ID 변환은 전부 여기를 거친다.
// 예: (37.5665, 126.9780), 해상도 11 -> '8b30e1d8c...' 같은 15자리 문자열. 이 문자열이 밭 1칸의 키.
// 브라우저에서는 index.html 의 <script> 가 전역 h3 를 만들고, 테스트에서는 globalThis.h3 를 주입한다.
const h3 = () => globalThis.h3;

export const cellAt = ({ lat, lng }, resolution) => h3().latLngToCell(lat, lng, resolution);

export const cellsAround = (cellId, k) => h3().gridDisk(cellId, k);

/** 닫힌 고리 [[lng,lat], ...] (GeoJSON 순서) */
export const cellBoundary = (cellId) => h3().cellToBoundary(cellId, true);

export function cellCenter(cellId) {
  const [lat, lng] = h3().cellToLatLng(cellId);
  return { lat, lng };
}

/** 두 셀 사이 칸 수. 계산 불가(너무 멀거나 오각형 경계)면 Infinity */
export function cellDistance(a, b) {
  try { return h3().gridDistance(a, b); } catch { return Infinity; }
}
