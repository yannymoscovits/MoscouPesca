import { describe, expect, it } from 'vitest';
import { ep1 } from '../content/episodes/ep1';
import type { Difficulty, Species } from '../content/types';
import { startBar } from './catchBar';
import type { FishAgent, Water } from './lure';
import { press, rulesFor, startPesca, tick, type PescaContext, type PescaRules, type PescaState } from './pesca';
import { createRng } from './rng';

const POCO = ep1.locations[0];
const RASO = POCO.zones[0];
const BAMBU = ep1.rods.find((r) => r.id === 'bambu')!;
const TILAPIA = ep1.species.find((sp) => sp.id === 'tilapia')!;
const GEAR = { rod: BAMBU, bait: 'minhoca' };
const STILL = { holding: false };
const HOLD = { holding: true };

function ctx(d: Difficulty = 'desafio', seed = 1, rules: PescaRules = rulesFor(d)): PescaContext {
  return { ...GEAR, rng: createRng(seed), rules, spot: RASO, species: ep1.species };
}

/** Repete `tick` em passos de 1/60 s. */
function run(s: PescaState, seconds: number, input: { holding: boolean }, c: PescaContext): PescaState {
  for (let i = 0; i < Math.round(seconds * 60); i++) s = tick(s, 1 / 60, input, c);
  return s;
}

const fishAt = (over: Partial<FishAgent>): FishAgent => ({
  id: 1,
  species: TILAPIA,
  xM: 5.4,
  depthM: 1,
  dir: -1,
  mode: 'nadando',
  attackInS: null,
  ...over,
});

const water = (fish: FishAgent[], lure = { xM: 5, depthM: 1 }): Water => ({
  spot: RASO,
  bottomM: RASO.depthM,
  lure,
  fish,
  nextId: fish.length + 1,
  followInS: null,
});

const lureState = (w: Water): PescaState => ({ phase: 'Lure', gear: GEAR, water: w, notice: null });
const strikeState = (sinceS = 0): Extract<PescaState, { phase: 'Strike' }> => ({
  phase: 'Strike',
  gear: GEAR,
  water: water([fishAt({ mode: 'seguindo', attackInS: 0 })]),
  fishId: 1,
  sinceS,
});

describe('rulesFor', () => {
  it('ARREM-06, ISCA-10, BRIGA-12: seta e força em 2 s e fisgada em 2 s no Desafio; 4 s e 4 s no Tranquilo', () => {
    expect(rulesFor('desafio')).toMatchObject({ sweepS: 2, hookWindowS: 2, followWithinS: null });
    expect(rulesFor('tranquilo')).toMatchObject({ sweepS: 4, hookWindowS: 4, followWithinS: null });
    expect(rulesFor('desafio').bar).toMatchObject({ meterFloor: 0, drainPerS: 0.12 });
    expect(rulesFor('tranquilo').bar).toMatchObject({ meterFloor: 0.1, drainPerS: 0.06 });
  });
});

describe('arremesso', () => {
  it('a pescaria começa na mira', () => {
    expect(startPesca()).toEqual({ phase: 'Aim', sinceS: 0 });
  });

  it('ARREM-02: ARREMESSAR com a seta balançando trava a direção e começa a barra de força', () => {
    const c = ctx('desafio');
    expect(press(startPesca(), 'arremessar', c)).toEqual({ phase: 'Power', angleDeg: -45, sinceS: 0 });
    expect(press(run(startPesca(), 1, STILL, c), 'arremessar', c)).toMatchObject({ phase: 'Power', angleDeg: expect.closeTo(45, 6) });
    const tranquilo = ctx('tranquilo');
    expect(press(run(startPesca(), 1, STILL, tranquilo), 'arremessar', tranquilo)).toMatchObject({ angleDeg: expect.closeTo(0, 6) });
  });

  it('ARREM-03: ARREMESSAR com a força em movimento arremessa na direção travada, a (30% + 70% × força) do alcance', () => {
    const c = ctx('desafio');
    const power: PescaState = { phase: 'Power', angleDeg: -45, sinceS: 0 };
    expect(press(run(power, 1, STILL, c), 'arremessar', c)).toEqual({
      phase: 'Flying',
      gear: GEAR,
      angleDeg: -45,
      distanceM: expect.closeTo(10.8, 6), // força cheia: todo o alcance do Bambu
      sinceS: 0,
    });
    expect(press(power, 'arremessar', c)).toMatchObject({ distanceM: expect.closeTo(0.3 * 10.8, 6) }); // ARREM-07
  });

  it('ARREM-04: com a isca em voo, os botões não fazem nada', () => {
    const c = ctx();
    const flying = press(press(startPesca(), 'arremessar', c), 'arremessar', c);
    expect(flying.phase).toBe('Flying');
    expect(press(flying, 'arremessar', c)).toBe(flying);
    expect(press(flying, 'puxar', c)).toBe(flying);
  });

  it('BOTAO-03: PUXAR na mira e ARREMESSAR com a isca na água não fazem nada', () => {
    const c = ctx();
    const aim = startPesca();
    const power: PescaState = { phase: 'Power', angleDeg: 0, sinceS: 0.3 };
    const lure = lureState(water([]));
    expect(press(aim, 'puxar', c)).toBe(aim);
    expect(press(power, 'puxar', c)).toBe(power);
    expect(press(lure, 'arremessar', c)).toBe(lure);
    expect(press(strikeState(), 'arremessar', c)).toEqual(strikeState());
  });

  it('ARREM-05, ISCA-01, PONTO-06: depois do voo, a isca está na água do ponto, na distância do arremesso', () => {
    const c = ctx('desafio', 4);
    const flying: PescaState = { phase: 'Flying', gear: GEAR, angleDeg: 10, distanceM: 7, sinceS: 0 };
    expect(run(flying, 0.7, STILL, c).phase).toBe('Flying');
    const landed = run(flying, 0.85, STILL, c);
    if (landed.phase !== 'Lure') throw new Error(`esperava Lure, veio ${landed.phase}`);
    expect(landed.water.spot).toBe(RASO);
    expect(landed.water.lure.xM).toBe(7);
    expect(landed.water.lure.depthM).toBeLessThan(0.1); // caiu na superfície e começou a afundar
    expect(landed.water.fish.length).toBeGreaterThanOrEqual(3);
    expect(landed.water.fish.length).toBeLessThanOrEqual(6);
    for (const f of landed.water.fish) expect(RASO.species).toContain(f.species.id);
    expect(landed.notice).toBeNull();
  });
});

describe('isca na água', () => {
  it('TUTOB-02: com followWithinS nas regras, um peixe que aceita a isca segue em até 3 s depois de cair na água', () => {
    // Isca de Carne no fundo: só o Pirarucu (raridade 1, contra 10 da Tilápia) aceita.
    const spot = { ...RASO, species: ['tilapia', 'pirarucu-lendario'], depthM: 9 };
    const gear = { rod: BAMBU, bait: 'carne' };
    const followed = (seed: number, followWithinS: number | null) => {
      const c: PescaContext = { ...ctx('tranquilo', seed, { ...rulesFor('tranquilo'), followWithinS }), ...gear, spot };
      let s = tick({ phase: 'Flying', gear, angleDeg: 0, distanceM: 6, sinceS: 0.8 }, 0, STILL, c);
      for (let i = 0; i < 180; i++) {
        s = tick(s, 1 / 60, STILL, c);
        if ((s.phase === 'Lure' || s.phase === 'Strike') && s.water.fish.some((f) => f.mode === 'seguindo' && f.species.baits.includes('carne'))) return true;
      }
      return false;
    };
    const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
    for (const seed of seeds) expect(followed(seed, 3), `semente ${seed}`).toBe(true);
    expect(seeds.some((seed) => !followed(seed, null))).toBe(true);
  });

  it('ISCA-02: segurar RECOLHER traz a isca', () => {
    const s = run(lureState(water([], { xM: 8, depthM: 1 })), 1, HOLD, ctx());
    if (s.phase !== 'Lure') throw new Error(s.phase);
    expect(s.water.lure.xM).toBeCloseTo(7, 9);
  });

  it('ISCA-03: PUXAR com a isca na água dá o tranco', () => {
    const s = press(lureState(water([], { xM: 8, depthM: 1 })), 'puxar', ctx());
    if (s.phase !== 'Lure') throw new Error(s.phase);
    expect(s.water.lure).toEqual({ xM: 7.4, depthM: expect.closeTo(0.6, 9) });
  });

  it('ISCA-08: o ataque de um peixe leva à fisgada', () => {
    const s = tick(lureState(water([fishAt({ mode: 'seguindo', attackInS: 0.01 })])), 1 / 30, STILL, ctx());
    expect(s).toMatchObject({ phase: 'Strike', fishId: 1, sinceS: 0 });
  });

  it('ISCA-12: a isca chega ao Adilson sem peixe fisgado: "Nada dessa vez"', () => {
    expect(run(lureState(water([], { xM: 0.5, depthM: 0 })), 1, HOLD, ctx()).phase).toBe('Result_Nothing');
  });
});

describe('fisgada', () => {
  it('ISCA-10: PUXAR dentro da janela fisga o peixe e começa a briga', () => {
    const s = press(run(strikeState(), 1.9, STILL, ctx('desafio')), 'puxar', ctx('desafio'));
    if (s.phase !== 'Fight') throw new Error(s.phase);
    expect(s.fishId).toBe(1);
    expect(s.bar.species).toBe(TILAPIA);
    expect(s.bar.meter).toBeCloseTo(0.3); // BRIGA-01
    expect(s.bar.zoneY).toBe(0);
  });

  it.each([
    ['desafio', 2],
    ['tranquilo', 4],
  ] as const)('ISCA-11: no %s a janela de %i s vence sem PUXAR: "Escapou!", o peixe foge e a isca fica', (d, windowS) => {
    const c = ctx(d);
    expect(run(strikeState(), windowS - 0.1, STILL, c).phase).toBe('Strike');
    const s = run(strikeState(), windowS, STILL, c);
    if (s.phase !== 'Lure') throw new Error(s.phase);
    expect(s.notice).toEqual({ text: 'Escapou!', sinceS: 0 });
    expect(s.water.fish[0].mode).toBe('fugindo');
    expect(s.water.lure).toEqual(strikeState().water.lure);
  });

  it('ISCA-11: o aviso "Escapou!" conta o tempo enquanto a isca segue na água', () => {
    const c = ctx('desafio');
    const escaped = run(strikeState(), 2, STILL, c);
    const later = run(escaped, 0.5, STILL, c);
    expect(later).toMatchObject({ phase: 'Lure', notice: { text: 'Escapou!', sinceS: expect.closeTo(0.5, 6) } });
  });

  it('sem prazo de fisgada (tutorial), o peixe espera o PUXAR', () => {
    const c = ctx('tranquilo', 1, { ...rulesFor('tranquilo'), hookWindowS: null });
    expect(run(strikeState(), 60, STILL, c).phase).toBe('Strike');
  });
});

describe('briga', () => {
  const fight = (d: Difficulty, over: { meter: number; fishY: number }, sp: Species = TILAPIA): PescaState => {
    const bar = { ...startBar(sp, BAMBU, rulesFor(d).bar, createRng(1)), ...over, fishTarget: over.fishY, retargetInS: 10 };
    return { phase: 'Fight', gear: GEAR, water: water([fishAt({ mode: 'seguindo', attackInS: 0, species: sp })]), fishId: 1, bar };
  };

  it('BRIGA-10: medidor cheio mostra a ficha do peixe da v1: peso sorteado na faixa, com 2 casas', () => {
    const s = run(fight('desafio', { meter: 0.99, fishY: 0.1 }), 0.5, STILL, ctx('desafio', 5));
    if (s.phase !== 'Result_Caught') throw new Error(s.phase);
    expect(s.species).toBe(TILAPIA);
    expect(s.kg).toBeGreaterThanOrEqual(TILAPIA.kg.min);
    expect(s.kg).toBeLessThanOrEqual(TILAPIA.kg.max);
    expect(Math.round(s.kg * 100) / 100).toBe(s.kg);
  });

  it('BRIGA-02: segurar SEGURAR sobe a faixa', () => {
    const s = run(fight('desafio', { meter: 0.5, fishY: 0.1 }), 0.5, HOLD, ctx());
    if (s.phase !== 'Fight') throw new Error(s.phase);
    expect(s.bar.zoneY).toBeCloseTo(0.175, 6);
  });

  it('BRIGA-11: medidor vazio no Desafio solta o peixe', () => {
    expect(run(fight('desafio', { meter: 0.05, fishY: 0.9 }), 1, STILL, ctx('desafio')).phase).toBe('Result_Escaped');
  });

  it('BRIGA-12: no Tranquilo o medidor para em 10% e o peixe não foge', () => {
    const s = run(fight('tranquilo', { meter: 0.15, fishY: 0.9 }), 9, STILL, ctx('tranquilo'));
    expect(s.phase).toBe('Fight');
    if (s.phase === 'Fight') expect(s.bar.meter).toBeCloseTo(0.1, 9);
  });

  it('resultados não mudam com botões nem com o tempo', () => {
    const c = ctx();
    const done: PescaState = { phase: 'Result_Nothing' };
    expect(press(done, 'arremessar', c)).toBe(done);
    expect(tick(done, 1, HOLD, c)).toBe(done);
  });
});
