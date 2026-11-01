// Cardume de cada ponto: poucos peixes em lugares vistos de cima, que só entram na água quando a isca
// cai perto deles; o pego sai, e outro chega a cada 20 s até o cardume voltar a 6.
import { describe, expect, it } from 'vitest';
import { ep1 } from '../content/episodes/ep1';
import { startBar } from './catchBar';
import { rulesFor, startPesca, tick, type PescaContext, type PescaState } from './pesca';
import { createRng } from './rng';
import { stepWater } from './lure';
import {
  afterCast,
  fishAt,
  fishNear,
  landingAt,
  reachMOf,
  schoolWater,
  startSchool,
  stepSchool,
  type School,
} from './school';

const POCO = ep1.locations[0];
const RASO = POCO.zones[0];
const BAMBU = ep1.rods.find((r) => r.id === 'bambu')!;
const REACH_M = reachMOf(BAMBU.reach); // 10,8 m
const GEAR = { rod: BAMBU, bait: 'minhoca' };

const school = () => startSchool(RASO, ep1.species, REACH_M);

/** Ângulo (graus) e distância (m) para a isca cair em cima de um ponto visto de cima. */
function aimAt(xM: number, yM: number) {
  return { angleDeg: (Math.atan2(xM, yM) * 180) / Math.PI, distanceM: Math.hypot(xM, yM) };
}

/** Um lugar a mais de 3 m de todos os peixes do cardume, dentro do cone da mira. */
function emptySpot(s: School) {
  for (let d = 3.3; d <= REACH_M; d += 0.25) {
    for (let a = -45; a <= 45; a += 1) {
      if (fishNear(s, a, d).length === 0) return { angleDeg: a, distanceM: d };
    }
  }
  throw new Error('cardume cobre a água toda');
}

describe('startSchool', () => {
  it('reencontrar Lavínia não depende do sorteio ao voltar aos pontos dela', () => {
    for (let seed = 0; seed < 20; seed++) {
      for (const spot of POCO.zones) {
        const s = startSchool(spot, ep1.species, REACH_M, createRng(seed));
        expect(s.fish.some(f => f.species.id === 'piranha-lavinia')).toBe(spot.species.includes('piranha-lavinia'));
      }
    }
  });

  it('forma 6 peixes do ponto, no cone da mira, entre 35% e 95% do alcance da vara', () => {
    const s = school();
    expect(s.fish).toHaveLength(6);
    for (const f of s.fish) {
      expect(RASO.species).toContain(f.species.id);
      const angle = (Math.atan2(f.homeX, f.homeY) * 180) / Math.PI;
      expect(Math.abs(angle)).toBeLessThanOrEqual(38 + 1e-9);
      const dist = Math.hypot(f.homeX, f.homeY);
      expect(dist).toBeGreaterThanOrEqual(0.35 * REACH_M - 1e-9);
      expect(dist).toBeLessThanOrEqual(0.95 * REACH_M + 1e-9);
    }
  });

  it('espalha: 2 peixes perto, 2 no meio e 2 longe, e 3 de cada lado', () => {
    const s = school();
    const share = (f: (typeof s.fish)[number]) => Math.hypot(f.homeX, f.homeY) / REACH_M;
    expect(s.fish.filter((f) => share(f) < 0.55)).toHaveLength(2);
    expect(s.fish.filter((f) => share(f) >= 0.55 && share(f) < 0.75)).toHaveLength(2);
    expect(s.fish.filter((f) => share(f) >= 0.75)).toHaveLength(2);
    expect(s.fish.filter((f) => f.homeX < 0)).toHaveLength(3);
    expect(s.fish.filter((f) => f.homeX > 0)).toHaveLength(3);
  });

  it('o mesmo ponto começa sempre com o mesmo cardume', () => {
    expect(school()).toEqual(school());
  });
});

describe('fishAt', () => {
  it('o peixe vai e volta em torno do lugar dele, sem passar da meia distância do vaivém', () => {
    const f = school().fish[0];
    const seen = new Set<string>();
    for (let t = 0; t < 30; t += 0.5) {
      const p = fishAt(f, t);
      expect(Math.hypot(p.xM - f.homeX, p.yM - f.homeY)).toBeLessThanOrEqual(f.swayM + 1e-9);
      seen.add(`${p.xM.toFixed(2)},${p.yM.toFixed(2)}`);
    }
    expect(seen.size).toBeGreaterThan(10); // ele se mexe
  });
});

describe('fishNear e schoolWater', () => {
  it('recolher encontra um peixe perto do pescador mesmo com a queda longe dele', () => {
    const s = school();
    const near = { ...s.fish[0], species: ep1.species.find(f => f.baits.includes('minhoca'))!, homeX: 0, homeY: 3, depthM: 0.3, swayM: 0 };
    const water = schoolWater({ ...s, fish: [near] }, 0, 10, RASO, createRng(1));
    expect(water.fish[0].mode).toBe('nadando');
    expect(water.lure.xM - water.fish[0].xM).toBe(7);
    let current = water;
    let encountered = false;
    for (let t = 0; t < 9; t += 0.1) {
      const next = stepWater(current, 0.1, true, 'minhoca', createRng(2));
      current = next.water;
      if (current.fish[0].mode === 'seguindo' || next.strike) { encountered = true; break; }
    }
    expect(encountered).toBe(true);
    expect(current.lure.xM).toBeLessThan(8);
  });

  it('qualquer direção e distância conserva o cardume inteiro', () => {
    const s = school();
    for (const angle of [-45, 0, 45]) for (const distance of [1, 5, REACH_M]) {
      expect(schoolWater(s, angle, distance, RASO, createRng(1)).fish).toHaveLength(s.fish.length);
    }
  });

  it('isca em cima de um peixe: ele entra na água, ligado ao cardume', () => {
    const s = school();
    const f = s.fish[2];
    const p = fishAt(f, s.tS);
    const { angleDeg, distanceM } = aimAt(p.xM, p.yM);
    expect(fishNear(s, angleDeg, distanceM).map((g) => g.id)).toContain(f.id);

    const w = schoolWater(s, angleDeg, distanceM, RASO, createRng(1));
    const agent = w.fish.find((g) => g.schoolId === f.id)!;
    expect(agent.species).toBe(f.species);
    expect(agent.xM).toBeCloseTo(distanceM, 6); // o peixe está bem onde a isca caiu
    expect(agent.mode).toBe('nadando');
    expect(w.lure).toEqual({ xM: distanceM, depthM: 0 });
  });

  it('isca longe das sombras mantém peixes perto e longe na água', () => {
    const s = school();
    const { angleDeg, distanceM } = emptySpot(s);
    const water = schoolWater(s, angleDeg, distanceM, RASO, createRng(1));
    expect(water.fish.map(f => f.schoolId)).toEqual(s.fish.map(f => f.id));
    expect(new Set(water.fish.map(f => Math.round(f.xM))).size).toBeGreaterThan(1);
  });
});

describe('a pescaria com cardume', () => {
  const ctx = (s: School, rules = rulesFor('desafio')): PescaContext => ({
    ...GEAR,
    rng: createRng(1),
    rules,
    spot: RASO,
    species: ep1.species,
    school: s,
  });
  const flying = (angleDeg: number, distanceM: number): PescaState => ({
    phase: 'Flying',
    gear: GEAR,
    angleDeg,
    distanceM,
    sinceS: 0.79,
  });

  it('a isca cai longe das sombras: começa o recolhimento com a água povoada', () => {
    const s = school();
    const { angleDeg, distanceM } = emptySpot(s);
    const next = tick(flying(angleDeg, distanceM), 0.02, { holding: false }, ctx(s));
    expect(next.phase).toBe('Lure');
    if (next.phase === 'Lure') expect(next.water.fish).toHaveLength(s.fish.length);
  });

  it('a isca cai em cima de um peixe: a água começa com ele', () => {
    const s = school();
    const p = fishAt(s.fish[0], s.tS);
    const { angleDeg, distanceM } = aimAt(p.xM, p.yM);
    const next = tick(flying(angleDeg, distanceM), 0.02, { holding: false }, ctx(s));
    expect(next.phase).toBe('Lure');
    if (next.phase === 'Lure') expect(next.water.fish.map((f) => f.schoolId)).toContain(s.fish[0].id);
  });

  it('no tutorial o cardume não vale: os peixes nascem em volta da isca, para um seguir a tempo', () => {
    const s = school();
    const { angleDeg, distanceM } = emptySpot(s);
    const tutorial = { ...rulesFor('tranquilo'), followWithinS: 3 };
    const next = tick(flying(angleDeg, distanceM), 0.02, { holding: false }, ctx(s, tutorial));
    expect(next.phase).toBe('Lure');
    if (next.phase === 'Lure') expect(next.water.fish.length).toBeGreaterThanOrEqual(3);
  });
});

describe('afterCast e stepSchool', () => {
  it('Lavínia só pode ser capturada uma vez, sem voltar na reposição', () => {
    const lavinia = ep1.species.find(f => f.id === 'piranha-lavinia')!;
    const initial = school();
    let current = { ...initial, fish: initial.fish.map((f, i) => i === 0 ? { ...f, species: lavinia } : f) };
      const target = current.fish.find(f => f.species.id === lavinia.id)!;
      expect(target).toBeDefined();
      current = afterCast(current, fight(current, target.id), { phase: 'Result_Caught', species: lavinia, kg: 0.8, value: 0 });
      expect(current.fish.some(f => f.id === target.id)).toBe(false);
      current = stepSchool(current, 200, RASO, ep1.species);
      expect(current.fish).toHaveLength(6);
      expect(current.fish.some(f => f.species.id === lavinia.id)).toBe(false);
      expect(current.returning?.some(f => f.id === lavinia.id)).toBe(false);
  });

  /** A briga com o peixe `schoolId` do cardume na linha. */
  function fight(s: School, schoolId: number): Extract<PescaState, { phase: 'Fight' }> {
    const f = s.fish.find((g) => g.id === schoolId)!;
    const water = {
      spot: RASO,
      bottomM: RASO.depthM,
      lure: { xM: 5, depthM: 1 },
      fish: [{ id: 1, schoolId, species: f.species, xM: 5, depthM: 1, dir: 1 as const, mode: 'seguindo' as const, attackInS: 0 }],
      nextId: 2,
      followInS: null,
    };
    return { phase: 'Fight', gear: GEAR, water, fishId: 1, bar: startBar(f.species, BAMBU, rulesFor('desafio').bar, createRng(1)) };
  }

  it('o peixe pego sai do cardume; o que fugiu fica', () => {
    const s = school();
    const target = s.fish[1].id;
    const caught: PescaState = { phase: 'Result_Caught', species: s.fish[1].species, kg: 1, value: 0 };
    expect(afterCast(s, fight(s, target), caught).fish.map((f) => f.id)).not.toContain(target);
    expect(afterCast(s, fight(s, target), caught).fish).toHaveLength(5);
    expect(afterCast(s, fight(s, target), { phase: 'Result_Escaped' })).toBe(s);
    expect(afterCast(s, startPesca(), { phase: 'Result_Nothing' })).toBe(s);
  });

  it('cardume cheio não cresce; com um a menos, outro peixe chega aos 20 s, não antes', () => {
    const full = school();
    expect(stepSchool(full, 60, RASO, ep1.species).fish).toHaveLength(6);

    const five = { ...full, fish: full.fish.slice(1) };
    expect(stepSchool(five, 19.9, RASO, ep1.species).fish).toHaveLength(5);
    const refilled = stepSchool(stepSchool(five, 19.9, RASO, ep1.species), 0.2, RASO, ep1.species);
    expect(refilled.fish).toHaveLength(6);
    expect(refilled.fish[5].id).toBe(7); // peixe novo, id novo
    expect(RASO.species).toContain(refilled.fish[5].species.id);
  });

  it('com dois a menos, chega um a cada 20 s até voltar a 6', () => {
    const four = { ...school(), fish: school().fish.slice(2) };
    expect(stepSchool(four, 20.1, RASO, ep1.species).fish).toHaveLength(5);
    expect(stepSchool(four, 40.1, RASO, ep1.species).fish).toHaveLength(6);
    expect(stepSchool(four, 200, RASO, ep1.species).fish).toHaveLength(6);
  });

  it('o tempo do cardume anda, e com ele o vaivém', () => {
    const s = school();
    const later = stepSchool(s, 3, RASO, ep1.species);
    expect(later.tS).toBe(3);
    expect(fishAt(later.fish[0], later.tS)).not.toEqual(fishAt(s.fish[0], s.tS));
  });
});

describe('landingAt', () => {
  it('reto para a frente, a isca cai em x = 0; a 45°, metade de cada lado', () => {
    expect(landingAt(0, 8)).toEqual({ xM: 0, yM: 8 });
    const diag = landingAt(45, 8);
    expect(diag.xM).toBeCloseTo(diag.yM, 9);
  });
});
