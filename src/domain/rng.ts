// Sorteio determinístico (mulberry32): a mesma semente sempre repete a mesma partida.

export interface Weighted<T> {
  item: T;
  weight: number;
}

export interface Rng {
  /** Número em [0, 1). */
  next(): number;
  /** Número em [min, max). */
  range(min: number, max: number): number;
  /** Um item, com chance proporcional ao peso. */
  pick<T>(weighted: readonly Weighted<T>[]): T;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;

  function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    range: (min, max) => min + next() * (max - min),
    pick(weighted) {
      const total = weighted.reduce((sum, w) => sum + w.weight, 0);
      let r = next() * total;
      for (const w of weighted) {
        r -= w.weight;
        if (r < 0) return w.item;
      }
      return weighted[weighted.length - 1].item;
    },
  };
}
