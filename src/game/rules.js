// 게임 규칙. 순수 함수와 데이터만 둔다 (지도/저장소/DOM 을 모른다).
// 서버를 붙일 때 이 파일을 서버에서도 그대로 써서 같은 규칙으로 검증한다.

export const START_COINS = 30;

export const CROPS = {
  lettuce: { name: '상추', icon: '🥬', growMs: 60_000, seedCost: 5, reward: 8 },
  carrot: { name: '당근', icon: '🥕', growMs: 10 * 60_000, seedCost: 10, reward: 25 },
  pumpkin: { name: '호박', icon: '🎃', growMs: 60 * 60_000, seedCost: 20, reward: 80 },
};

/**
 * 밭 상태 계산. 저장하는 값은 "언제 뭘 심었나" 뿐이고 성장은 시간 차이로 계산한다.
 * 예: 당근(10분)을 12:00 에 심었고 지금 12:04 -> { state:'growing', progress:0.4, remainingMs:360000 }
 * @param plot { cropId, plantedAt, ownerId } | undefined
 */
export function plotStatus(plot, now) {
  if (!plot) return { state: 'empty' };
  const crop = CROPS[plot.cropId];
  const elapsed = now - plot.plantedAt;
  if (elapsed >= crop.growMs) return { state: 'ready', crop, progress: 1, remainingMs: 0 };
  return { state: 'growing', crop, progress: elapsed / crop.growMs, remainingMs: crop.growMs - elapsed };
}

export function formatRemaining(ms) {
  const s = Math.ceil(ms / 1000);
  if (s >= 3600) return `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분`;
  if (s >= 60) return `${Math.floor(s / 60)}분 ${s % 60}초`;
  return `${s}초`;
}
