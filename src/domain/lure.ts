// A água de um arremesso: a isca, os peixes, o interesse, a recusa e o ataque (design.md da
// pesca-bass, "lure"). Metros e segundos: `xM` é a distância até o Adilson e `depthM` a
// profundidade (0 = superfície). Um `dt` maior que WATER_MAX_STEP_S vira passos menores iguais.

import type { BaitId, Species, Zone } from '../content/types';
import type { Rng } from './rng';
import {
  ATTACK_MIN_S,
  ATTACK_S,
  FISH_BOTTOM_GAP_M,
  FISH_CRUISE_MPS,
  FISH_FLEE_MPS,
  FISH_FOLLOW_GAP_M,
  FISH_FOLLOW_MPS,
  FISH_MIN_X_M,
  FISH_RANGE_M,
  FISH_SPREAD_M,
  FISH_SWIM_DEPTH_M,
  INTEREST_RADIUS_M,
  LURE_REEL_MPS,
  LURE_RISE_MPS,
  LURE_SINK_MPS,
  SCHOOL_SIZE,
  TWITCH_FORWARD_M,
  TWITCH_HURRY_S,
  TWITCH_UP_M,
  WATER_MAX_STEP_S,
} from './tuning';

export type FishMode = 'nadando' | 'seguindo' | 'recusou' | 'fugindo';

export interface FishAgent {
  id: number;
  species: Species;
  xM: number; // distância até o Adilson
  depthM: number;
  dir: 1 | -1; // 1 = nadando para longe do Adilson
  mode: FishMode;
  attackInS: number | null; // só no modo 'seguindo'; 0 depois do ataque
}

export interface Lure {
  xM: number;
  depthM: number;
}

export interface Water {
  spot: Zone;
  bottomM: number;
  lure: Lure;
  fish: FishAgent[];
  nextId: number;
  // SPEC_DEVIATION: `followInS` não existe no design.
  // Reason: TUTOB-02 pede um peixe seguindo em até 3 s; a água conta esse prazo (null = sem prazo).
  followInS: number | null;
}

/** Folga para comparar tempos somados em ponto flutuante. */
const EPS = 1e-9;

const accepts = (sp: Species, bait: BaitId) => sp.baits.includes(bait);
const awayFrom = (f: FishAgent, lure: Lure): 1 | -1 => (f.xM >= lure.xM ? 1 : -1);
/** Segue a isca e ainda não atacou. */
const isCounting = (f: FishAgent) => f.mode === 'seguindo' && f.attackInS !== null && f.attackInS > 0;

// SPEC_DEVIATION: recebe também a isca equipada.
// Reason: no tutorial (TUTOB-02) pelo menos um peixe precisa aceitar a isca para poder seguir.
/** ISCA-01, PONTO-06: de 3 a 6 peixes do ponto, pela raridade; a isca na distância do arremesso, na superfície. */
export function spawnWater(
  spot: Zone,
  species: Species[],
  distanceM: number,
  rng: Rng,
  followWithinS: number | null,
  bait: BaitId,
): Water {
  const pool = species.filter((sp) => spot.species.includes(sp.id)).map((sp) => ({ item: sp, weight: sp.rarity }));
  const count = SCHOOL_SIZE.min + Math.floor(rng.next() * (SCHOOL_SIZE.max - SCHOOL_SIZE.min + 1));
  const deepest = Math.min(spot.depthM - FISH_BOTTOM_GAP_M, FISH_SWIM_DEPTH_M.max);
  const shallowest = Math.min(FISH_SWIM_DEPTH_M.min, deepest);
  const fish: FishAgent[] = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    species: rng.pick(pool),
    xM: rng.range(Math.max(FISH_MIN_X_M, distanceM - FISH_SPREAD_M), distanceM + FISH_SPREAD_M),
    depthM: rng.range(shallowest, deepest),
    dir: rng.next() < 0.5 ? -1 : 1,
    mode: 'nadando',
    attackInS: null,
  }));
  if (followWithinS !== null && !fish.some((f) => accepts(f.species, bait))) {
    const takers = pool.filter((w) => accepts(w.item, bait));
    if (takers.length > 0) fish[0] = { ...fish[0], species: rng.pick(takers) };
  }
  return { spot, bottomM: spot.depthM, lure: { xM: distanceM, depthM: 0 }, fish, nextId: count + 1, followInS: followWithinS };
}

function follow(f: FishAgent, lure: Lure, rng: Rng): FishAgent {
  return { ...f, mode: 'seguindo', dir: lure.xM < f.xM ? -1 : 1, attackInS: rng.range(ATTACK_S.min, ATTACK_S.max) };
}

/** Nado de um passo: à toa perto da isca, atrás dela ou para longe dela. */
function swim(f: FishAgent, h: number, lure: Lure): FishAgent {
  switch (f.mode) {
    case 'nadando': {
      const turn = f.dir * (f.xM - lure.xM) > FISH_RANGE_M || (f.dir < 0 && f.xM <= FISH_MIN_X_M);
      const dir = turn ? (-f.dir as 1 | -1) : f.dir;
      return { ...f, dir, xM: f.xM + dir * FISH_CRUISE_MPS * h };
    }
    case 'seguindo': {
      const dx = lure.xM + FISH_FOLLOW_GAP_M - f.xM;
      const dy = lure.depthM - f.depthM;
      const d = Math.hypot(dx, dy);
      const k = d > 0 ? Math.min(d, FISH_FOLLOW_MPS * h) / d : 0;
      return { ...f, xM: f.xM + dx * k, depthM: f.depthM + dy * k, dir: lure.xM < f.xM ? -1 : 1 };
    }
    default:
      return { ...f, xM: f.xM + f.dir * FISH_FLEE_MPS * h };
  }
}

/** Um passo de no máximo WATER_MAX_STEP_S; `restS` é o que falta do `dt` depois dele. */
function substep(
  w: Water,
  h: number,
  reeling: boolean,
  bait: BaitId,
  rng: Rng,
  restS: number,
): { water: Water; strike: FishAgent | null } {
  // ISCA-02, ISCA-04, ISCA-15
  const lure = reeling
    ? { xM: Math.max(w.lure.xM - LURE_REEL_MPS * h, 0), depthM: Math.max(w.lure.depthM - LURE_RISE_MPS * h, 0) }
    : { xM: w.lure.xM, depthM: Math.min(w.lure.depthM + LURE_SINK_MPS * h, w.bottomM) };

  // ISCA-07: o relógio de quem segue; ISCA-14: no mesmo `dt`, só o primeiro ataque vale.
  const counting = new Set(w.fish.filter(isCounting).map((f) => f.id));
  let fish = w.fish.map((f) => {
    const moved = swim(f, h, lure);
    return counting.has(f.id) ? { ...moved, attackInS: (f.attackInS as number) - h } : moved;
  });
  const attacking = (f: FishAgent, withinS: number) => counting.has(f.id) && (f.attackInS as number) <= withinS + EPS;
  const now = fish.filter((f) => attacking(f, 0));
  if (now.length > 0) {
    const first = now.reduce((a, b) => ((b.attackInS as number) < (a.attackInS as number) ? b : a));
    fish = fish.map((f) => {
      if (f.id === first.id) return { ...f, xM: lure.xM, depthM: lure.depthM, attackInS: 0 };
      if (attacking(f, restS)) return { ...f, mode: 'fugindo', attackInS: null, dir: awayFrom(f, lure) };
      return f;
    });
    const water = { ...w, lure, fish };
    return { water, strike: fish.find((f) => f.id === first.id)! };
  }

  // ISCA-05, ISCA-06: a até 2 m, segue quem aceita a isca e recusa quem não aceita.
  fish = fish.map((f) => {
    if (f.mode !== 'nadando' || Math.hypot(f.xM - lure.xM, f.depthM - lure.depthM) > INTEREST_RADIUS_M) return f;
    return accepts(f.species, bait) ? follow(f, lure, rng) : { ...f, mode: 'recusou', dir: awayFrom(f, lure) };
  });

  // TUTOB-02: vencido o prazo sem ninguém seguindo, o peixe mais perto que aceita a isca segue.
  let followInS = w.followInS === null ? null : w.followInS - h;
  if (followInS !== null && fish.some((f) => f.mode === 'seguindo')) followInS = null;
  if (followInS !== null && followInS <= EPS) {
    const taker = fish
      .filter((f) => f.mode === 'nadando' && accepts(f.species, bait))
      .reduce<FishAgent | null>((a, b) => (a && Math.abs(a.xM - lure.xM) <= Math.abs(b.xM - lure.xM) ? a : b), null);
    if (taker) {
      fish = fish.map((f) => (f.id === taker.id ? follow(f, lure, rng) : f));
      followInS = null;
    }
  }
  return { water: { ...w, lure, fish, followInS }, strike: null };
}

/** Avança a água `dt` segundos; para no passo em que um peixe ataca (ISCA-07, ISCA-14). */
export function stepWater(
  w: Water,
  dt: number,
  reeling: boolean,
  bait: BaitId,
  rng: Rng,
): { water: Water; strike: FishAgent | null } {
  if (dt <= 0) return { water: w, strike: null };
  const n = Math.ceil(dt / WATER_MAX_STEP_S - EPS);
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const r = substep(w, h, reeling, bait, rng, dt - (i + 1) * h);
    if (r.strike) return r;
    w = r.water;
  }
  return { water: w, strike: null };
}

/** ISCA-03, ISCA-07: tranco na isca e ataque 1 s mais cedo para quem segue (no mínimo 0,5 s). */
export function twitch(w: Water): Water {
  return {
    ...w,
    lure: { xM: Math.max(w.lure.xM - TWITCH_FORWARD_M, 0), depthM: Math.max(w.lure.depthM - TWITCH_UP_M, 0) },
    fish: w.fish.map((f) =>
      isCounting(f)
        ? { ...f, attackInS: Math.min(f.attackInS as number, Math.max((f.attackInS as number) - TWITCH_HURRY_S, ATTACK_MIN_S)) }
        : f,
    ),
  };
}

/** ISCA-11: fisgada perdida; o peixe foge e a isca fica onde está. */
export function scare(w: Water, fishId: number): Water {
  return {
    ...w,
    fish: w.fish.map((f) => (f.id === fishId ? { ...f, mode: 'fugindo', attackInS: null, dir: awayFrom(f, w.lure) } : f)),
  };
}
