// Balanceamento da briga (Success Criteria: cada briga dura de 8 a 40 s para quem
// segura e solta conforme a cor da barra). Jogador simulado: segura enquanto vê a barra
// verde ou amarela e solta quando vê vermelha, com um tempo de reação sorteado.
import { describe, expect, it } from 'vitest';
import type { Rod, Species, Zone } from '../content/types';
import { cast, press, rulesFor, tensionBand, tick, type FishingState, type TensionBand, type TickContext } from './fishing';
import { createRng } from './rng';
import { FISH_POWER, FISH_STAMINA } from './tuning';

const DT = 1 / 30; // o jogo desenha a 30 quadros por segundo
const SEEDS = 200;
const REACTION_S = { min: 0.2, max: 0.5 };

const ORIGIN = { x: 100, y: 400 };
const SPOT = { x: 100, y: 300 };

function steps(min: number, max: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => min + ((max - min) * i) / (n - 1));
}

// Peixes que cobrem toda a faixa de força e fôlego das espécies.
const FISH: Species[] = steps(FISH_POWER.min, FISH_POWER.max, 4).flatMap((power) =>
  steps(FISH_STAMINA.min, FISH_STAMINA.max, 4).map((stamina) => ({
    id: `p${power}-s${stamina}`,
    name: 'Peixe',
    sprite: '',
    kg: { min: 1, max: 2 },
    pricePerKg: 10,
    power,
    stamina,
    baits: ['minhoca'],
    rarity: 1,
    description: '',
    rare: false,
  })),
);

const LAKE: Zone = {
  id: 'lago',
  polygon: [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    { x: 200, y: 390 },
    { x: 0, y: 390 },
  ],
  species: FISH.map((f) => f.id),
  depthM: 1,
};

const RODS: Rod[] = steps(1, 10, 10).map((force) => ({
  id: `forca-${force}`,
  name: 'Vara',
  price: 0,
  force,
  reach: 5,
  episode: 1,
}));

interface FightOutcome {
  fish: string;
  seconds: number;
  end: FishingState['phase'];
}

/** Uma pescaria no Desafio: arremessa, fisga na hora e briga como o jogador simulado. */
function simulate(rod: Rod, seed: number): FightOutcome {
  const ctx: TickContext = { rng: createRng(seed), rules: rulesFor('desafio'), zones: [LAKE], species: FISH };
  let s: FishingState = cast({ phase: 'Idle' }, SPOT, { origin: ORIGIN, rod, bait: 'minhoca' });
  while (s.phase === 'Flying' || s.phase === 'Waiting') s = tick(s, DT, { holding: false }, ctx);
  s = press(s, ctx);
  if (s.phase !== 'Fight') throw new Error(`esperava Fight, veio ${s.phase}`);
  const fish = s.species.id;

  const lag = Math.round(ctx.rng.range(REACTION_S.min, REACTION_S.max) / DT);
  const seen: TensionBand[] = [];
  let n = 0;
  while (s.phase === 'Fight' && n < 120 / DT) {
    seen.push(tensionBand(s.tension));
    const perceived = seen.length > lag ? seen[seen.length - 1 - lag] : 'verde';
    s = tick(s, DT, { holding: perceived !== 'vermelho' }, ctx);
    n++;
  }
  return { fish, seconds: n * DT, end: s.phase };
}

describe('balanceamento da briga no Desafio', () => {
  const byRod = RODS.map((rod) => ({
    rod,
    fights: Array.from({ length: SEEDS }, (_, i) => simulate(rod, i + 1)),
  }));

  it('as sementes cobrem todos os peixes da faixa com cada vara', () => {
    for (const { fights } of byRod) {
      expect(new Set(fights.map((f) => f.fish)).size).toBe(FISH.length);
    }
  });

  it('em 200 sementes, com cada vara, 100% das brigas duram entre 8 e 40 s', () => {
    for (const { rod, fights } of byRod) {
      for (const f of fights) {
        expect(f.end, `${rod.id} ${f.fish}`).not.toBe('Fight');
        expect(f.seconds, `${rod.id} ${f.fish}`).toBeGreaterThanOrEqual(8);
        expect(f.seconds, `${rod.id} ${f.fish}`).toBeLessThanOrEqual(40);
      }
    }
  });

  it('o jogador simulado arrebenta a linha em menos de 10% das brigas', () => {
    for (const { rod, fights } of byRod) {
      const broken = fights.filter((f) => f.end === 'Result_Broken').length;
      expect(broken / fights.length, rod.id).toBeLessThan(0.1);
    }
  });
});
