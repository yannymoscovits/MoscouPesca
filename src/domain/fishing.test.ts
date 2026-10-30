import { describe, expect, it } from 'vitest';
import type { Point, Rod } from '../content/types';
import { cast, press, tick, type CastContext, type FishingState, type TickContext } from './fishing';
import { createRng } from './rng';

const ORIGIN: Point = { x: 100, y: 400 };

function rod(reach: number, force = 1): Rod {
  return { id: `vara-${reach}-${force}`, name: 'Vara', price: 0, force, reach, episode: 1 };
}

function castCtx(r: Rod): CastContext {
  return { origin: ORIGIN, rod: r, bait: 'minhoca' };
}

function tickCtx(seed = 1): TickContext {
  return { rng: createRng(seed) };
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
