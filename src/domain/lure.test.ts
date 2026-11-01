import { describe, expect, it } from 'vitest';
import type { BaitId, Species, Zone } from '../content/types';
import { scare, spawnWater, stepWater, twitch, type FishAgent, type Water } from './lure';
import { createRng } from './rng';

function species(id: string, baits: BaitId[], rarity = 1): Species {
  return {
    id,
    name: id,
    sprite: '',
    kg: { min: 1, max: 2 },
    power: 3,
    stamina: 3,
    baits,
    rarity,
    description: '',
    rare: false,
    medals: { bronze: 1.2, prata: 1.5, ouro: 1.8 },
  };
}

const TILAPIA = species('tilapia', ['minhoca', 'milho'], 9);
const CURIMATA = species('curimata', ['milho'], 1);
const DOURADO = species('dourado', ['minhoca'], 50); // vive em outro ponto
const RASO: Zone = { id: 'raso', polygon: [], species: ['tilapia', 'curimata'], depthM: 1.5, name: 'Beira', minReach: 0 };
const ALL = [TILAPIA, CURIMATA, DOURADO];
const DT = 1 / 60;

const fishAt = (over: Partial<FishAgent>): FishAgent => ({
  id: 1,
  species: TILAPIA,
  xM: 5,
  depthM: 1,
  dir: 1,
  mode: 'nadando',
  attackInS: null,
  ...over,
});

/** Água feita à mão: isca em (xM, depthM) no raso de 1,5 m. */
const water = (fish: FishAgent[], lure = { xM: 5, depthM: 1 }): Water => ({
  spot: RASO,
  bottomM: 1.5,
  lure,
  fish,
  nextId: fish.length + 1,
  followInS: null,
});

const step = (w: Water, seconds: number, reeling: boolean, bait: BaitId = 'minhoca', seed = 1) => {
  const rng = createRng(seed);
  for (let i = 0; i < Math.round(seconds / DT); i++) w = stepWater(w, DT, reeling, bait, rng).water;
  return w;
};

const distance = (f: FishAgent, w: Water) => Math.hypot(f.xM - w.lure.xM, f.depthM - w.lure.depthM);

describe('spawnWater: os peixes e a isca quando ela cai na água', () => {
  it('ISCA-01: nascem de 3 a 6 peixes', () => {
    const counts = Array.from({ length: 200 }, (_, seed) => spawnWater(RASO, ALL, 6, createRng(seed), null, 'minhoca').fish.length);
    expect(Math.min(...counts)).toBe(3);
    expect(Math.max(...counts)).toBe(6);
    for (const n of counts) expect(Number.isInteger(n)).toBe(true);
  });

  it('PONTO-06: os peixes saem só das espécies do ponto, com a raridade de cada uma', () => {
    const drawn = Array.from({ length: 400 }, (_, seed) => spawnWater(RASO, ALL, 6, createRng(seed), null, 'minhoca'))
      .flatMap((w) => w.fish.map((f) => f.species.id));
    expect(new Set(drawn)).toEqual(new Set(['tilapia', 'curimata']));
    const tilapiaShare = drawn.filter((id) => id === 'tilapia').length / drawn.length;
    expect(tilapiaShare).toBeGreaterThan(0.85); // raridade 9 contra 1: 90%
    expect(tilapiaShare).toBeLessThan(0.95);
  });

  it('ISCA-01: a isca começa na distância do arremesso e na superfície; o fundo é a profundidade do ponto', () => {
    const w = spawnWater(RASO, ALL, 7.5, createRng(1), null, 'minhoca');
    expect(w.lure).toEqual({ xM: 7.5, depthM: 0 });
    expect(w.bottomM).toBe(1.5);
    for (const f of w.fish) {
      expect(f.mode).toBe('nadando');
      expect(f.depthM).toBeGreaterThan(0);
      expect(f.depthM).toBeLessThan(1.5);
    }
  });
});

describe('stepWater: a isca', () => {
  it('ISCA-02: segurando RECOLHER, a isca vem para o Adilson a 1 m/s, subindo 0,2 m/s', () => {
    const w = step(water([], { xM: 10, depthM: 1 }), 1, true);
    expect(w.lure.xM).toBeCloseTo(9, 9);
    expect(w.lure.depthM).toBeCloseTo(0.8, 9);
  });

  it('ISCA-02: a isca não sobe além da superfície nem passa do Adilson', () => {
    const w = step(water([], { xM: 0.5, depthM: 0.1 }), 1, true);
    expect(w.lure).toEqual({ xM: 0, depthM: 0 });
  });

  it('ISCA-04: parada, a isca afunda 0,9 m/s', () => {
    const w = step(water([], { xM: 10, depthM: 0 }), 1, false);
    expect(w.lure.depthM).toBeCloseTo(0.9, 9);
    expect(w.lure.xM).toBe(10);
  });

  it('ISCA-04, ISCA-15: a isca para no fundo do ponto e fica lá até RECOLHER ou PUXAR', () => {
    const atBottom = step(water([], { xM: 10, depthM: 0 }), 10, false);
    expect(atBottom.lure).toEqual({ xM: 10, depthM: 1.5 });
    expect(step(atBottom, 5, false).lure).toEqual({ xM: 10, depthM: 1.5 });
    expect(step(atBottom, 1, true).lure.depthM).toBeCloseTo(1.3, 9);
    expect(twitch(atBottom).lure.depthM).toBeCloseTo(1.1, 9);
  });
});

describe('twitch: o tranco do PUXAR', () => {
  it('ISCA-03: dá um tranco de 0,6 m para frente e 0,4 m para cima', () => {
    expect(twitch(water([], { xM: 10, depthM: 1 })).lure).toEqual({ xM: 9.4, depthM: 0.6 });
  });

  it('ISCA-03: perto da superfície, o tranco para nela', () => {
    expect(twitch(water([], { xM: 10, depthM: 0.2 })).lure.depthM).toBe(0);
  });

  it('ISCA-07: cada PUXAR adianta o ataque de quem segue em 1 s, até o mínimo de 0,5 s', () => {
    const w = water([
      fishAt({ id: 1, mode: 'seguindo', attackInS: 3.2 }),
      fishAt({ id: 2, mode: 'seguindo', attackInS: 1.3 }),
      fishAt({ id: 3, mode: 'seguindo', attackInS: 0.4 }),
      fishAt({ id: 4, mode: 'nadando', attackInS: null }),
    ]);
    expect(twitch(w).fish.map((f) => f.attackInS)).toEqual([2.2, 0.5, 0.4, null].map((v) => (v === null ? null : expect.closeTo(v, 9))));
  });
});

describe('stepWater: os peixes e a isca', () => {
  it('ISCA-05: a até 2 m da isca, o peixe que aceita a isca vira e segue', () => {
    const near = stepWater(water([fishAt({ xM: 6.9, depthM: 1, dir: 1 })]), 0.001, false, 'minhoca', createRng(1)).water;
    expect(near.fish[0].mode).toBe('seguindo');
    expect(near.fish[0].dir).toBe(-1); // virou para a isca
    const far = stepWater(water([fishAt({ xM: 7.1, depthM: 1, dir: -1 })]), 0.001, false, 'minhoca', createRng(1)).water;
    expect(far.fish[0].mode).toBe('nadando');
  });

  it('ISCA-05: quem segue acompanha a isca enquanto ela é recolhida', () => {
    const w = step(water([fishAt({ xM: 6, depthM: 1, dir: 1 })], { xM: 5, depthM: 1 }), 1.5, true);
    expect(w.fish[0].mode).toBe('seguindo');
    expect(distance(w.fish[0], w)).toBeLessThan(1);
  });

  it('ISCA-06: a até 2 m, o peixe que não aceita a isca recusa ("não gostou") e nada para longe', () => {
    const w = stepWater(water([fishAt({ species: CURIMATA, xM: 6.5, depthM: 1 })]), DT, false, 'minhoca', createRng(1)).water;
    expect(w.fish[0].mode).toBe('recusou');
    expect(w.fish[0].attackInS).toBeNull();
    const later = step(w, 1, false);
    expect(later.fish[0].mode).toBe('recusou');
    expect(distance(later.fish[0], later)).toBeGreaterThan(distance(w.fish[0], w) + 1);
  });

  it('ISCA-07: quem segue ataca entre 2 e 5 s depois de começar a seguir', () => {
    const timers = Array.from({ length: 40 }, (_, seed) => {
      const w = stepWater(water([fishAt({ xM: 6, depthM: 1 })]), DT, false, 'minhoca', createRng(seed)).water;
      return w.fish[0].attackInS as number;
    });
    expect(Math.min(...timers)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...timers)).toBeLessThanOrEqual(5);
    expect(Math.min(...timers)).toBeLessThan(2.5);
    expect(Math.max(...timers)).toBeGreaterThan(4.5);

    const rng = createRng(3);
    let w = stepWater(water([fishAt({ xM: 6, depthM: 1 })]), DT, false, 'minhoca', rng).water;
    const timer = w.fish[0].attackInS as number;
    let elapsed = 0;
    let strike: FishAgent | null = null;
    while (!strike && elapsed < 10) {
      const r = stepWater(w, DT, false, 'minhoca', rng);
      w = r.water;
      strike = r.strike;
      elapsed += DT;
    }
    expect(strike?.id).toBe(1);
    expect(elapsed).toBeGreaterThanOrEqual(timer - 1e-9);
    expect(elapsed).toBeLessThan(timer + DT + 1e-9);
  });

  it('ISCA-14: dois ataques no mesmo passo: só o primeiro vale e o outro foge', () => {
    const w = water([
      fishAt({ id: 1, mode: 'seguindo', attackInS: 0.08, xM: 5.4 }),
      fishAt({ id: 2, mode: 'seguindo', attackInS: 0.05, xM: 5.5 }),
      fishAt({ id: 3, mode: 'seguindo', attackInS: 3, xM: 5.6 }),
    ]);
    const r = stepWater(w, 0.1, false, 'minhoca', createRng(1));
    expect(r.strike?.id).toBe(2);
    expect(r.water.fish.map((f) => f.mode)).toEqual(['fugindo', 'seguindo', 'seguindo']);

    const tie = water([
      fishAt({ id: 1, mode: 'seguindo', attackInS: 0.01, xM: 5.4 }),
      fishAt({ id: 2, mode: 'seguindo', attackInS: 0.01, xM: 5.5 }),
    ]);
    const t = stepWater(tie, DT, false, 'minhoca', createRng(1));
    expect(t.strike?.id).toBe(1);
    expect(t.water.fish.map((f) => f.mode)).toEqual(['seguindo', 'fugindo']);
  });

  it('TUTOB-02: com followWithinS = 3, um peixe que aceita a isca começa a seguir em até 3 s', () => {
    const RARE_TAKER = species('rara', ['minhoca'], 1);
    const REFUSER = species('recusa', ['milho'], 30);
    const spot: Zone = { ...RASO, species: ['rara', 'recusa'], depthM: 9 };
    const followedWithin3s = (seed: number, followWithinS: number | null) => {
      const rng = createRng(seed);
      let w = spawnWater(spot, [RARE_TAKER, REFUSER], 6, rng, followWithinS, 'minhoca');
      for (let i = 0; i < Math.round(3 / DT); i++) {
        w = stepWater(w, DT, false, 'minhoca', rng).water;
        if (w.fish.some((f) => f.mode === 'seguindo' && f.species.baits.includes('minhoca'))) return true;
      }
      return false;
    };
    const seeds = Array.from({ length: 30 }, (_, i) => i + 1);
    for (const seed of seeds) expect(followedWithin3s(seed, 3), `semente ${seed}`).toBe(true);
    expect(seeds.some((seed) => !followedWithin3s(seed, null))).toBe(true);
  });
});

describe('scare: a fisgada perdida', () => {
  it('ISCA-11: o peixe foge e a isca continua na água, no mesmo lugar', () => {
    const w = water([fishAt({ id: 1, mode: 'seguindo', attackInS: 0, xM: 5.4 }), fishAt({ id: 2, xM: 9 })], { xM: 5, depthM: 1 });
    const s = scare(w, 1);
    expect(s.fish[0]).toMatchObject({ id: 1, mode: 'fugindo', attackInS: null });
    expect(s.fish[1]).toEqual(w.fish[1]);
    expect(s.lure).toEqual(w.lure);
    const later = step(s, 1, false);
    expect(distance(later.fish[0], later)).toBeGreaterThan(2);
  });
});
