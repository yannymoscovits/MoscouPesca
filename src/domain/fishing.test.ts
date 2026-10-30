import { describe, expect, it } from 'vitest';
import type { Point, Rod, Species, Zone } from '../content/types';
import {
  cast,
  press,
  rulesFor,
  tensionBand,
  tick,
  type CastContext,
  type FishingState,
  type TickContext,
} from './fishing';
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

/** Arremessa na represa com a vara e o peixe dados e fisga assim que morde. */
function toFight(d: 'desafio' | 'tranquilo', r: Rod, fish: Species, seed = 1) {
  const ctx = tickCtx(seed, { rules: rulesFor(d), zones: [{ ...POND, species: [fish.id] }], species: [fish] });
  const { s } = runUntil(cast(IDLE, SPOT, castCtx(r)), ctx, waitingOver);
  const fight = press(s, ctx);
  if (fight.phase !== 'Fight') throw new Error(`esperava Fight, veio ${fight.phase}`);
  return { fight, ctx };
}

const HOLD = { holding: true };

function fightFor(s: FishingState, ctx: TickContext, seconds: number, input: { holding: boolean }): FishingState {
  for (let i = 0; i < Math.round(seconds / 0.1); i++) s = tick(s, 0.1, input, ctx);
  return s;
}

function asFight(s: FishingState) {
  if (s.phase !== 'Fight') throw new Error(`esperava Fight, veio ${s.phase}`);
  return s;
}

/** Segura até a tensão chegar a 100 (no máximo 10 s). */
function holdUntilMax(s: FishingState, ctx: TickContext): FishingState {
  for (let i = 0; i < 100 && asFight(s).tension < 100; i++) s = tick(s, 0.1, HOLD, ctx);
  expect(asFight(s).tension).toBe(100);
  return s;
}

const BRUTE = species('pirarucu', { power: 10, stamina: 10 }); // peixe mais forte
const BAMBOO = rod(5, 1); // vara mais fraca

describe('briga', () => {
  it('PESCA-10/PESCA-11: segurar sobe a tensão e recolhe; soltar alivia e o peixe puxa', () => {
    const { fight, ctx } = toFight('desafio', rod(5, 5), species('traira', { power: 5, stamina: 5 }));
    const held = asFight(fightFor(fight, ctx, 0.5, HOLD));
    expect(held.tension).toBeGreaterThan(fight.tension);
    expect(held.distance).toBeLessThan(fight.distance);

    const released = asFight(fightFor(held, ctx, 0.5, STILL));
    expect(released.tension).toBeLessThan(held.tension);
    expect(released.distance).toBeGreaterThan(held.distance);
  });

  it('PESCA-12: faixas da barra: verde abaixo de 70, amarela de 70 a 89, vermelha de 90 a 100', () => {
    for (const t of [0, 35, 69, 69.9]) expect(tensionBand(t)).toBe('verde');
    for (const t of [70, 80, 89, 89.9]) expect(tensionBand(t)).toBe('amarelo');
    for (const t of [90, 95, 100]) expect(tensionBand(t)).toBe('vermelho');
  });

  it('PESCA-13: no Desafio, 100 por 0,9 s não arrebenta; por 1 s seguido, arrebenta', () => {
    const { fight, ctx } = toFight('desafio', BAMBOO, BRUTE);
    const atMax = holdUntilMax(fight, ctx);

    const almost = fightFor(atMax, ctx, 0.9, HOLD);
    expect(almost.phase).toBe('Fight');
    expect(fightFor(almost, ctx, 0.1, HOLD).phase).toBe('Result_Broken');
  });

  it('PESCA-13: o segundo em 100 precisa ser seguido; soltar zera a contagem', () => {
    const { fight, ctx } = toFight('desafio', BAMBOO, BRUTE);
    const first = fightFor(holdUntilMax(fight, ctx), ctx, 0.9, HOLD);
    const relieved = fightFor(first, ctx, 0.1, STILL);
    expect(asFight(relieved).tension).toBeLessThan(100);

    const second = fightFor(holdUntilMax(relieved, ctx), ctx, 0.9, HOLD);
    expect(second.phase).toBe('Fight');
  });

  it('PESCA-14: no Tranquilo, segurando por 60 s, a tensão para em 99 e a linha não arrebenta', () => {
    const { fight, ctx } = toFight('tranquilo', BAMBOO, BRUTE);
    let s: FishingState = fight;
    let highest = 0;
    for (let i = 0; i < 600; i++) {
      s = tick(s, 0.1, HOLD, ctx);
      expect(s.phase).not.toBe('Result_Broken');
      if (s.phase === 'Fight') {
        expect(s.tension).toBeLessThanOrEqual(99);
        highest = Math.max(highest, s.tension);
      }
    }
    expect(highest).toBe(99);
  });

  it('EQUIP-07: cada ponto de Força faz a tensão subir mais devagar', () => {
    const fish = species('tucunare', { power: 2, stamina: 5 });
    const tensionAfterHold = (force: number) => {
      const { fight, ctx } = toFight('desafio', rod(5, force), fish);
      return asFight(fightFor(fight, ctx, 0.5, HOLD)).tension;
    };
    expect(tensionAfterHold(3)).toBeLessThan(tensionAfterHold(1));
    for (let force = 1; force < 10; force++) {
      expect(tensionAfterHold(force + 1)).toBeLessThan(tensionAfterHold(force));
    }
  });

  it('ACES-03: trocar para Tranquilo no meio da briga não salva a linha da briga atual', () => {
    const { fight, ctx } = toFight('desafio', BAMBOO, BRUTE);
    const switched = { ...ctx, rules: rulesFor('tranquilo') };
    const atMax = holdUntilMax(fight, switched);
    expect(fightFor(atMax, switched, 1, HOLD).phase).toBe('Result_Broken');
  });

  it('ACES-03: trocar para Desafio no meio da briga não muda o teto de 99 da briga atual', () => {
    const { fight, ctx } = toFight('tranquilo', BAMBOO, BRUTE);
    const switched = { ...ctx, rules: rulesFor('desafio') };
    let s: FishingState = fight;
    for (let i = 0; i < 600; i++) {
      s = tick(s, 0.1, HOLD, switched);
      expect(s.phase).not.toBe('Result_Broken');
      if (s.phase === 'Fight') expect(s.tension).toBeLessThanOrEqual(99);
    }
  });
});

describe('resultado', () => {
  const fish = species('curimata', { kg: { min: 0.35, max: 4.8 }, pricePerKg: 13, power: 1, stamina: 1 });

  /** Briga inteira segurando, até sair da briga; confere que nenhuma briga fica parada com distância 0. */
  function catchWith(seed: number): FishingState {
    const { fight, ctx } = toFight('tranquilo', rod(5, 10), fish, seed);
    let s: FishingState = fight;
    for (let i = 0; i < 600 && s.phase === 'Fight'; i++) {
      expect(s.distance).toBeGreaterThan(0);
      s = tick(s, 0.1, HOLD, ctx);
    }
    return s;
  }

  it('PESCA-15/PESCA-16/PESCA-17: em 1 000 sementes, a ficha traz espécie, peso sorteado na faixa com 2 casas e valor = peso × preço/kg', () => {
    const weights = new Set<number>();
    for (let seed = 1; seed <= 1000; seed++) {
      const s = catchWith(seed);
      expect(s.phase).toBe('Result_Caught');
      if (s.phase !== 'Result_Caught') continue;

      expect(s.species).toEqual(fish);
      expect(s.kg).toBeGreaterThanOrEqual(0.35);
      expect(s.kg).toBeLessThanOrEqual(4.8);
      expect(Number(s.kg.toFixed(2))).toBe(s.kg);
      expect(s.value).toBe(Math.round(s.kg * 13));
      weights.add(s.kg);
    }
    expect(weights.size).toBeGreaterThan(100); // sorteado, não fixo
  });
});
