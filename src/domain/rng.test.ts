import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

function sequence(seed: number, n: number): number[] {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => rng.next());
}

describe('rng', () => {
  it('mesma semente gera a mesma sequência; sementes diferentes, sequências diferentes', () => {
    expect(sequence(42, 100)).toEqual(sequence(42, 100));
    expect(sequence(42, 100)).not.toEqual(sequence(43, 100));
  });

  it('range fica sempre dentro de [min, max] em 10 000 sorteios', () => {
    const rng = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = rng.range(3, 10);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('pick respeita os pesos: frequência dentro de ±5% em 10 000 sorteios', () => {
    const rng = createRng(2024);
    const weighted = [
      { item: 'a', weight: 1 },
      { item: 'b', weight: 3 },
      { item: 'c', weight: 6 },
    ];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    const draws = 10_000;
    for (let i = 0; i < draws; i++) counts[rng.pick(weighted)]++;

    expect(Math.abs(counts.a / draws - 0.1)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(counts.b / draws - 0.3)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(counts.c / draws - 0.6)).toBeLessThanOrEqual(0.05);
  });
});
