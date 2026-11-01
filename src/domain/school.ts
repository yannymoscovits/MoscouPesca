// Cardume de um ponto (pedido do usuário, 2026-10-31): poucos peixes, em lugares que o jogador vê de
// cima como sombras. A água inteira continua povoada durante o recolhimento, mesmo quando a isca
// cai longe de um peixe. O peixe pego sai do cardume e outro chega com o tempo.
// Metros vistos de cima: `x` para o lado (negativo à esquerda do Adilson) e `y` para a frente.
// O vaivém de cada peixe é uma função do tempo do cardume, sem sorteio a cada passo.

import type { Species, Zone } from '../content/types';
import { maxCastDistance } from './castAim';
import type { FishAgent, Water } from './lure';
import type { PescaState } from './pesca';
import { createRng, type Rng } from './rng';
import {
  FISH_BOTTOM_GAP_M,
  FISH_MIN_X_M,
  FISH_SWIM_DEPTH_M,
  M_PER_PX,
  SCHOOL_BANDS,
  SCHOOL_HALF_ARC_DEG,
  SCHOOL_MAX,
  SCHOOL_NOTICE_RADIUS_M,
  SCHOOL_REFILL_S,
  SCHOOL_SWAY_M,
  SCHOOL_SWAY_RAD_S,
} from './tuning';

export interface SchoolFish {
  id: number;
  species: Species;
  homeX: number; // centro do vaivém
  homeY: number;
  heading: number; // direção do vaivém, em radianos
  swayM: number; // meia distância do vaivém
  rateRadS: number;
  phase: number;
  depthM: number; // profundidade em que ele nada, para a vista debaixo d'água
  size: number; // BRIGA-19: 0 = o mais leve da espécie, 1 = o mais pesado; a sombra e o peso vêm dele
}

export interface School {
  spotId: string;
  fish: SchoolFish[];
  nextId: number;
  tS: number; // tempo do cardume, que move o vaivém
  refillInS: number; // até o próximo peixe chegar (conta só com o cardume abaixo do máximo)
  seed: number; // de onde sai o sorteio de cada peixe novo
  reachM: number; // alcance da vara quando o cardume se formou
  returning?: Species[]; // espécies pescadas que voltam na próxima reposição
  laviniaCaught?: boolean; // captura única da história, sem reposição
}

/** Alcance máximo da vara em metros. */
export const reachMOf = (reach: number) => maxCastDistance(reach) * M_PER_PX;

/** Semente fixa por ponto: o mesmo ponto começa sempre com o mesmo cardume. */
export function schoolSeed(spotId: string): number {
  let h = 2166136261;
  for (let i = 0; i < spotId.length; i++) h = Math.imul(h ^ spotId.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Peixe novo na faixa de distância e no lado que o `id` dá: os ids seguidos passam por perto, meio e
 * longe, alternando esquerda e direita, para o cardume nunca se juntar num canto só.
 */
function newFish(id: number, spot: Zone, species: Species[], reachM: number, rng: Rng): SchoolFish {
  const pool = species.filter((sp) => spot.species.includes(sp.id)).map((sp) => ({ item: sp, weight: sp.rarity }));
  const band = SCHOOL_BANDS[(id - 1) % SCHOOL_BANDS.length];
  const side = Math.floor((id - 1) / SCHOOL_BANDS.length) % 2 === 0 ? -1 : 1;
  const angle = (side * rng.range(2, SCHOOL_HALF_ARC_DEG) * Math.PI) / 180;
  const dist = rng.range(band.min, band.max) * reachM;
  const deepest = Math.min(spot.depthM - FISH_BOTTOM_GAP_M, FISH_SWIM_DEPTH_M.max);
  return {
    id,
    species: rng.pick(pool),
    homeX: dist * Math.sin(angle),
    homeY: dist * Math.cos(angle),
    heading: rng.range(0, Math.PI * 2),
    swayM: rng.range(SCHOOL_SWAY_M.min, SCHOOL_SWAY_M.max),
    rateRadS: rng.range(SCHOOL_SWAY_RAD_S.min, SCHOOL_SWAY_RAD_S.max),
    phase: rng.range(0, Math.PI * 2),
    depthM: rng.range(Math.min(FISH_SWIM_DEPTH_M.min, deepest), deepest),
    size: rng.next(),
  };
}

/**
 * O cardume cheio de um ponto, espalhado no cone da mira dentro do alcance da vara. O jogo passa o
 * próprio sorteio (cada visita ao ponto, um cardume); sem ele, o mesmo ponto dá sempre o mesmo.
 */
export function startSchool(spot: Zone, species: Species[], reachM: number, rng: Rng = createRng(schoolSeed(spot.id))): School {
  const seed = Math.floor(rng.next() * 2 ** 31); // de onde saem os peixes que chegam depois
  const fish = Array.from({ length: SCHOOL_MAX }, (_, i) => newFish(i + 1, spot, species, reachM, rng));
  // PONTO-07: toda espécie do ponto aparece no cardume; o difícil é ela se interessar pela isca.
  for (const sp of missingIn(fish, spot, species)) {
    const k = fish.findIndex((f, i) => fish.some((g, j) => j !== i && g.species.id === f.species.id)); // um repetido cede o lugar
    if (k < 0) break;
    fish[k] = { ...fish[k], species: sp };
  }
  return { spotId: spot.id, fish, nextId: SCHOOL_MAX + 1, tS: 0, refillInS: SCHOOL_REFILL_S, seed, reachM };
}

/** PONTO-07: espécies do ponto que estão fora do cardume, da mais rara para a mais comum. */
function missingIn(fish: SchoolFish[], spot: Zone, species: Species[]): Species[] {
  return species
    .filter((sp) => spot.species.includes(sp.id) && !fish.some((f) => f.species.id === sp.id))
    .sort((a, b) => a.rarity - b.rarity);
}

/** Onde o peixe está agora, visto de cima, e se nada para a direita. */
export function fishAt(f: SchoolFish, tS: number): { xM: number; yM: number; faceRight: boolean } {
  const k = Math.sin(f.rateRadS * tS + f.phase);
  const going = Math.cos(f.rateRadS * tS + f.phase); // sinal da velocidade no vaivém
  return {
    xM: f.homeX + Math.cos(f.heading) * f.swayM * k,
    yM: Math.max(f.homeY + Math.sin(f.heading) * f.swayM * k, FISH_MIN_X_M),
    faceRight: Math.cos(f.heading) * going >= 0,
  };
}

/** Onde a isca cai, vista de cima. */
export function landingAt(angleDeg: number, distanceM: number): { xM: number; yM: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { xM: distanceM * Math.sin(a), yM: distanceM * Math.cos(a) };
}

/** Os peixes do cardume a até `radiusM` de onde a isca cai. */
export function fishNear(school: School, angleDeg: number, distanceM: number, radiusM = SCHOOL_NOTICE_RADIUS_M): SchoolFish[] {
  const at = landingAt(angleDeg, distanceM);
  return school.fish.filter((f) => {
    const p = fishAt(f, school.tS);
    return Math.hypot(p.xM - at.xM, p.yM - at.yM) <= radiusM;
  });
}

/** A vista lateral de toda a água: os peixes mantêm suas distâncias, sem filtrar pela queda da isca. */
export function schoolWater(school: School, angleDeg: number, distanceM: number, spot: Zone, rng: Rng): Water {
  const a = (angleDeg * Math.PI) / 180;
  const fish: FishAgent[] = school.fish.map((f, i) => {
    const p = fishAt(f, school.tS);
    const xM = Math.max(p.xM * Math.sin(a) + p.yM * Math.cos(a), FISH_MIN_X_M);
    return {
      id: i + 1,
      schoolId: f.id,
      species: f.species,
      size: f.species.kg.max > f.species.kg.min ? f.size : 1, // peso único: o tamanho cheio
      xM,
      homeXM: xM,
      depthM: Math.min(f.depthM, spot.depthM),
      dir: rng.next() < 0.5 ? -1 : 1,
      mode: 'nadando',
      attackInS: null,
    };
  });
  return { spot, bottomM: spot.depthM, lure: { xM: distanceM, depthM: 0 }, fish, nextId: fish.length + 1, followInS: null };
}

/** Passa o tempo do cardume; abaixo do máximo, um peixe novo chega a cada SCHOOL_REFILL_S. */
export function stepSchool(school: School, dt: number, spot: Zone, species: Species[]): School {
  if (dt <= 0) return school;
  let s = { ...school, tS: school.tS + dt };
  if (s.fish.length >= SCHOOL_MAX) return { ...s, refillInS: SCHOOL_REFILL_S };
  s = { ...s, refillInS: s.refillInS - dt };
  while (s.refillInS <= 0 && s.fish.length < SCHOOL_MAX) {
    const eligible = s.laviniaCaught ? species.filter(sp => sp.id !== 'piranha-lavinia') : species;
    const drawn = newFish(s.nextId, spot, eligible, s.reachM, createRng(s.seed + s.nextId * 7919));
    const returning = (s.returning ?? []).filter(sp => sp.id !== 'piranha-lavinia');
    const missing = missingIn(s.fish, spot, eligible); // PONTO-07: quem falta no cardume chega primeiro
    const born = returning.length ? { ...drawn, species: returning[0] } : missing.length ? { ...drawn, species: missing[0] } : drawn;
    s = { ...s, fish: [...s.fish, born], returning: returning.slice(1), nextId: s.nextId + 1, refillInS: s.refillInS + SCHOOL_REFILL_S };
  }
  return s;
}

/** O peixe pego sai; a espécie volta na reposição, sem desaparecer por um novo sorteio. */
export function afterCast(school: School, prev: PescaState, next: PescaState): School {
  if (next.phase !== 'Result_Caught' || prev.phase !== 'Fight') return school;
  const hooked = prev.water.fish.find((f) => f.id === prev.fishId);
  if (hooked?.schoolId === undefined) return school;
  const unique = hooked.species.id === 'piranha-lavinia';
  return {
    ...school,
    fish: school.fish.filter((f) => unique ? f.species.id !== hooked.species.id : f.id !== hooked.schoolId),
    returning: unique ? (school.returning ?? []).filter(sp => sp.id !== hooked.species.id) : [...(school.returning ?? []), hooked.species],
    laviniaCaught: school.laviniaCaught || unique,
  };
}

/**
 * HIST-13: no cardume só fica quem pode aparecer agora. O lendário pego, o que saiu do objetivo e
 * qualquer lendário na copa saem na hora, mesmo com o cardume já montado (e não voltam na reposição).
 */
export function onlyInPlay(school: School, species: Species[]): School {
  const ok = (sp: Species) => species.some((s) => s.id === sp.id);
  if (school.fish.every((f) => ok(f.species)) && (school.returning ?? []).every(ok)) return school;
  return { ...school, fish: school.fish.filter((f) => ok(f.species)), returning: school.returning?.filter(ok) };
}

/**
 * PONTO-06: o objetivo pede um peixe que vive neste ponto (o Pirarucu, a Lavínia, o Xaréu...): se o
 * cardume está sem ele, o segundo peixe vira essa espécie. Raro continua raro no resto do jogo, mas
 * quem está atrás dele sempre encontra a sombra.
 */
export function withWanted(school: School, wanted: Species | null): School {
  if (!wanted || school.fish.length === 0 || school.fish.some((f) => f.species.id === wanted.id)) return school;
  const k = Math.min(1, school.fish.length - 1);
  return { ...school, fish: school.fish.map((f, i) => (i === k ? { ...f, species: wanted } : f)) };
}
