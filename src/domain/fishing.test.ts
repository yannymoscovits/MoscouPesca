import { describe, expect, it } from 'vitest';
import type { Point, Rod, Species, Zone } from '../content/types';
import { cast, press, rulesFor, tick, type CastContext, type FishingState, type TickContext } from './fishing';
import { createRng } from './rng';

const ORIGIN: Point = { x: 100, y: 400 };

function rod(reach: number, force = 1): Rod {
  return { id: `vara-${reach}-${force}`, name: 'Vara', price: 0, force, reach, episode: 1 };
}

function castCtx(r: Rod): CastContext {
  return { origin: ORIGIN, rod: r, bait: 'minhoca' };
}

function tickCtx(seed = 1, over: Partial<TickContext> = {}): TickContext {
  return { rng: createRng(seed), rules: rulesFor('desafio'), zones: [], species: [], ...over };
}

const IDLE: FishingState = { phase: 'Idle' };
const STILL = { holding: false };

function land(s: FishingState, ctx: TickContext): FishingState {
  for (let i = 0; i < 1000 && s.phase === 'Flying'; i++) s = tick(s, 0.05, STILL, ctx);
  return s;
}

function landingPoint(r: Rod, target: Point): Point {
  const s = land(cast(IDLE, target, castCtx(r)), tickCtx());
  if (s.phase !== 'Waiting') throw new Error(`esperava Waiting, veio ${s.phase}`);
  return s.at;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

describe('arremesso', () => {
  it('PESCA-01: toque dentro do alcance leva a isca ao ponto exato', () => {
    const target = { x: 120, y: 370 };
    expect(landingPoint(rod(5), target)).toEqual(target);
  });

  it('PESCA-02: toque fora do alcance para no limite, na mesma direção', () => {
    const r = rod(1);
    const far = { x: ORIGIN.x + 3000, y: ORIGIN.y - 4000 }; // direção (0,6; -0,8)
    const at = landingPoint(r, far);
    const limit = dist(ORIGIN, at);

    expect(limit).toBeLessThan(dist(ORIGIN, far));
    expect((at.x - ORIGIN.x) / limit).toBeCloseTo(0.6, 9);
    expect((at.y - ORIGIN.y) / limit).toBeCloseTo(-0.8, 9);

    // O limite é o alcance: logo antes dele a isca vai ao ponto; logo depois, para no limite.
    const along = (d: number) => ({ x: ORIGIN.x + 0.6 * d, y: ORIGIN.y - 0.8 * d });
    expect(landingPoint(r, along(limit - 1))).toEqual(along(limit - 1));
    expect(dist(ORIGIN, landingPoint(r, along(limit + 1)))).toBeCloseTo(limit, 9);
  });

  it('PESCA-03: press() e cast() durante o voo não mudam o estado', () => {
    const target = { x: 110, y: 380 };
    const ctx = tickCtx();
    const flying = tick(cast(IDLE, target, castCtx(rod(5))), 0.01, STILL, ctx);
    expect(flying.phase).toBe('Flying');

    expect(press(flying, ctx)).toBe(flying);
    expect(cast(flying, { x: 50, y: 300 }, castCtx(rod(5)))).toBe(flying);

    const landed = land(flying, ctx);
    expect(landed.phase).toBe('Waiting');
    if (landed.phase === 'Waiting') expect(landed.at).toEqual(target);
  });

  it('EQUIP-07: cada ponto de Alcance aumenta a distância máxima do arremesso', () => {
    const far = { x: ORIGIN.x, y: ORIGIN.y - 10_000 };
    for (let reach = 1; reach < 10; reach++) {
      const shorter = dist(ORIGIN, landingPoint(rod(reach), far));
      const longer = dist(ORIGIN, landingPoint(rod(reach + 1), far));
      expect(longer).toBeGreaterThan(shorter);
    }
  });
});

function species(id: string, over: Partial<Species> = {}): Species {
  return {
    id,
    name: id,
    sprite: '',
    kg: { min: 1, max: 2 },
    pricePerKg: 10,
    power: 1,
    stamina: 1,
    baits: ['minhoca'],
    rarity: 1,
    description: '',
    rare: false,
    ...over,
  };
}

const TILAPIA = species('tilapia'); // aceita minhoca
const DOURADO = species('dourado', { baits: ['lula'] }); // não aceita minhoca
const POND: Zone = {
  id: 'represa',
  polygon: [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    { x: 200, y: 390 },
    { x: 0, y: 390 },
  ],
  species: ['tilapia', 'dourado'],
};
const SPOT: Point = { x: 100, y: 300 }; // dentro da represa e do alcance
const OUTSIDE: Point = { x: 250, y: 380 }; // dentro do alcance, fora de qualquer zona

const DT = 1 / 32; // passo exato em binário: 3 s, 10 s e 15 s caem em passos inteiros

/** Avança de DT em DT até `stop`; devolve o estado e o tempo decorrido. */
function runUntil(s: FishingState, ctx: TickContext, stop: (s: FishingState) => boolean, maxS = 60) {
  let steps = 0;
  while (!stop(s) && steps < maxS / DT) {
    s = tick(s, DT, STILL, ctx);
    steps++;
  }
  return { s, t: steps * DT };
}

const waitingOver = (s: FishingState) => s.phase !== 'Flying' && s.phase !== 'Waiting';

/** Passa o tempo sem tocar, em passos de 0,1 s. */
function idleFor(s: FishingState, ctx: TickContext, seconds: number): FishingState {
  for (let i = 0; i < Math.round(seconds / 0.1); i++) s = tick(s, 0.1, STILL, ctx);
  return s;
}

function toBite(ctx: TickContext): FishingState {
  const { s } = runUntil(cast(IDLE, SPOT, castCtx(rod(5))), ctx, waitingOver);
  if (s.phase !== 'Bite') throw new Error(`esperava Bite, veio ${s.phase}`);
  return s;
}

const pondCtx = (seed: number, d: 'desafio' | 'tranquilo' = 'desafio') =>
  tickCtx(seed, { rules: rulesFor(d), zones: [POND], species: [TILAPIA, DOURADO] });

describe('espera e mordida', () => {
  it('PESCA-04: em 200 sementes, a mordida vem entre 3 e 10 s depois do arremesso, de peixe que aceita a isca', () => {
    for (const d of ['desafio', 'tranquilo'] as const) {
      for (let seed = 1; seed <= 200; seed++) {
        const { s, t } = runUntil(cast(IDLE, SPOT, castCtx(rod(5))), pondCtx(seed, d), waitingOver);
        expect(s.phase).toBe('Bite');
        expect(t).toBeGreaterThanOrEqual(3);
        expect(t).toBeLessThanOrEqual(10);
        if (s.phase === 'Bite') expect(s.species.id).toBe('tilapia');
      }
    }
  });

  it('PESCA-05: sem peixe que aceite a isca, recolhe aos 15 s com Result_Nothing', () => {
    const noTaker = { ...POND, species: ['dourado'] };
    for (const target of [SPOT, OUTSIDE]) {
      const ctx = tickCtx(3, { zones: [noTaker], species: [TILAPIA, DOURADO] });
      const { s, t } = runUntil(cast(IDLE, target, castCtx(rod(5))), ctx, waitingOver);
      expect(s.phase).toBe('Result_Nothing');
      expect(t).toBe(15);
    }
  });
});

describe('fisgada', () => {
  it.each([
    ['desafio', 2],
    ['tranquilo', 4],
  ] as const)('PESCA-08/PESCA-09 (%s): toque antes de %i s fisga; depois, o peixe escapa', (d, windowS) => {
    const ctx = pondCtx(5, d);
    const bite = toBite(ctx);

    const inTime = idleFor(bite, ctx, windowS - 0.1);
    expect(inTime.phase).toBe('Bite');
    expect(press(inTime, ctx).phase).toBe('Fight');

    const late = idleFor(bite, ctx, windowS + 0.1);
    expect(late.phase).toBe('Result_Escaped');
    expect(press(late, ctx).phase).toBe('Result_Escaped');
  });

  it('TUTO-04/TUTO-05 pelas regras do contexto: mordida em até 5 s e peixe que espera o toque', () => {
    const rules = { ...rulesFor('desafio'), biteS: { min: 0, max: 5 }, hookWindowS: null };
    for (let seed = 1; seed <= 50; seed++) {
      const ctx = tickCtx(seed, { rules, zones: [POND], species: [TILAPIA, DOURADO] });
      const { s, t } = runUntil(cast(IDLE, SPOT, castCtx(rod(5))), ctx, waitingOver);
      expect(s.phase).toBe('Bite');
      expect(t).toBeLessThanOrEqual(5);

      const later = idleFor(s, ctx, 60);
      expect(later.phase).toBe('Bite');
      expect(press(later, ctx).phase).toBe('Fight');
    }
  });
});
