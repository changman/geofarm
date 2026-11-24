// 저장소 = 나중에 서버가 될 자리.
// 지금은 localStorage 에 저장하지만, 메서드가 전부 async 라서
// 같은 4개 메서드를 fetch 로 구현한 ApiStore 로 바꿔 끼우면 게임 코드는 그대로다.
//
//   getPlayer()                         -> { id, coins }
//   getPlots(cellIds)                   -> { [cellId]: { cropId, plantedAt, ownerId } }
//   plant({ cellId, cropId, playerCell })  -> { player, plot }
//   harvest({ cellId, playerCell })        -> { player, reward }
//
// 규칙 위반이면 Error(사용자에게 보여줄 메시지)를 던진다. 검증은 화면이 아니라 여기서 한다.
import { CROPS, START_COINS, plotStatus } from '../game/rules.js';
import { cellDistance } from '../geo/grid.js';

const KEY = 'geofarm.v1';

export class LocalStore {
  #storage; #now; #reach;

  constructor({ reachRadius, storage = globalThis.localStorage, now = () => Date.now() }) {
    this.#storage = storage;
    this.#now = now;
    this.#reach = reachRadius;
  }

  #load() {
    const raw = this.#storage.getItem(KEY);
    if (raw) return JSON.parse(raw);
    return { player: { id: 'p_' + Math.random().toString(36).slice(2, 10), coins: START_COINS }, plots: {} };
  }

  #save(db) { this.#storage.setItem(KEY, JSON.stringify(db)); }

  #checkReach(playerCell, cellId) {
    if (cellDistance(playerCell, cellId) > this.#reach) throw new Error('너무 멀어요. 가까이 가야 합니다.');
  }

  async getPlayer() {
    const db = this.#load();
    this.#save(db);
    return { ...db.player };
  }

  async getPlots(cellIds) {
    const db = this.#load();
    const out = {};
    for (const id of cellIds) if (db.plots[id]) out[id] = { ...db.plots[id] };
    return out;
  }

  async plant({ cellId, cropId, playerCell }) {
    const db = this.#load();
    const crop = CROPS[cropId];
    if (!crop) throw new Error('없는 작물입니다.');
    this.#checkReach(playerCell, cellId);
    if (db.plots[cellId]) throw new Error('이미 작물이 심어진 밭입니다.');
    if (db.player.coins < crop.seedCost) throw new Error('코인이 부족합니다.');

    db.player.coins -= crop.seedCost;
    db.plots[cellId] = { cropId, plantedAt: this.#now(), ownerId: db.player.id };
    this.#save(db);
    return { player: { ...db.player }, plot: { ...db.plots[cellId] } };
  }

  async harvest({ cellId, playerCell }) {
    const db = this.#load();
    const plot = db.plots[cellId];
    if (!plot) throw new Error('수확할 작물이 없습니다.');
    this.#checkReach(playerCell, cellId);
    if (plot.ownerId !== db.player.id) throw new Error('다른 사람의 밭입니다.');
    const status = plotStatus(plot, this.#now());
    if (status.state !== 'ready') throw new Error('아직 다 자라지 않았습니다.');

    db.player.coins += status.crop.reward;
    delete db.plots[cellId];
    this.#save(db);
    return { player: { ...db.player }, reward: status.crop.reward };
  }
}
