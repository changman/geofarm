import test from 'node:test';
import assert from 'node:assert/strict';
import * as h3 from 'h3-js';
globalThis.h3 = h3;

const { cellAt, cellsAround, cellBoundary, cellDistance } = await import('../src/geo/grid.js');
const { plotStatus, CROPS, START_COINS, formatRemaining } = await import('../src/game/rules.js');
const { LocalStore } = await import('../src/store/local-store.js');

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const here = cellAt({ lat: 37.5665, lng: 126.978 }, 11);

test('격자: 주변 37칸, 닫힌 경계', () => {
  assert.equal(cellsAround(here, 3).length, 37);
  const b = cellBoundary(here);
  assert.deepEqual(b[0], b.at(-1));
  assert.ok(Math.abs(b[0][0] - 126.978) < 0.01, '[lng,lat] 순서');
});

test('성장: 시간 차이로 계산', () => {
  const plot = { cropId: 'carrot', plantedAt: 0 };
  assert.equal(plotStatus(undefined, 0).state, 'empty');
  const mid = plotStatus(plot, 4 * 60_000);
  assert.equal(mid.state, 'growing');
  assert.equal(mid.progress, 0.4);
  assert.equal(plotStatus(plot, 10 * 60_000).state, 'ready');
  assert.equal(formatRemaining(200_000), '3분 20초');
});

test('저장소: 심기 -> 대기 -> 수확', async () => {
  let t = 1000;
  const store = new LocalStore({ reachRadius: 1, storage: memory(), now: () => t });
  const { player } = await store.plant({ cellId: here, cropId: 'lettuce', playerCell: here });
  assert.equal(player.coins, START_COINS - CROPS.lettuce.seedCost);
  await assert.rejects(store.plant({ cellId: here, cropId: 'lettuce', playerCell: here }), /이미/);
  await assert.rejects(store.harvest({ cellId: here, playerCell: here }), /아직/);
  t += CROPS.lettuce.growMs;
  const res = await store.harvest({ cellId: here, playerCell: here });
  assert.equal(res.player.coins, START_COINS - CROPS.lettuce.seedCost + CROPS.lettuce.reward);
  assert.deepEqual(await store.getPlots([here]), {});
});

test('저장소: 거리와 코인 검증', async () => {
  const store = new LocalStore({ reachRadius: 1, storage: memory(), now: () => 0 });
  const far = cellsAround(here, 3).find((c) => cellDistance(here, c) === 3);
  await assert.rejects(store.plant({ cellId: far, cropId: 'lettuce', playerCell: here }), /멀어요/);
  const near = cellsAround(here, 1);
  await store.plant({ cellId: near[1], cropId: 'pumpkin', playerCell: here }); // 30 -> 10
  await assert.rejects(store.plant({ cellId: near[2], cropId: 'pumpkin', playerCell: here }), /코인/);
});
