// A água de um arremesso: a isca, os peixes, o interesse, a recusa e o ataque (design.md da
// pesca-bass, "lure"). Metros e segundos: `xM` é a distância até o Adilson e `depthM` a
// profundidade (0 = superfície). Um `dt` maior que WATER_MAX_STEP_S vira passos menores iguais.

import type { BaitId, Species, Zone, RodId } from '../content/types';
import type { Rng } from './rng';
import {
  ATTACK_MIN_S,
  ATTACK_S,
  FISH_BOTTOM_GAP_M,
  FISH_CRUISE_MPS,
  FISH_FLEE_MPS,
  FISH_FLEE_S,
  FISH_FOLLOW_GAP_M,
  FISH_FOLLOW_MPS,
  FISH_MIN_X_M,
  FISH_RANGE_M,
  FISH_SPREAD_M,
  FISH_SWIM_DEPTH_M,
  INTEREST_RADIUS_M,
  LURE_REEL_MPS,
  SCHOOL_SIZE,
  TWITCH_FORWARD_M,
  TWITCH_HURRY_S,
  LURE_RISE_SHARE_PER_S,
  LURE_SINK_SHARE_PER_S,
  TWITCH_UP_SHARE,
  IGNORE_LOOK_S,
  IGNORE_RETRY_S,
  INTEREST_PER_TRY,
  VIEW_DEEP_SHARE,
  VIEW_LINEAR_DEPTH_M,
  WATER_MAX_STEP_S,
  INTEREST_BASE,
  INTEREST_MAX,
  INTEREST_PER_RARITY,
} from './tuning';

/** 'ignorou': aceita a isca, mas não se interessou desta vez (ou falta a vara dele); segue nadando, quieto. */
export type FishMode = 'nadando' | 'seguindo' | 'recusou' | 'ignorou' | 'fugindo';

export interface FishAgent {
  id: number;
  schoolId?: number; // o peixe do cardume que ele é; sem cardume (tutorial), nenhum
  species: Species;
  size?: number; // BRIGA-19: tamanho dentro da espécie (0 a 1); sem ele, o peso é sorteado na fisgada
  xM: number; // distância até o Adilson
  homeXM?: number; // centro do nado livre; peixes do cardume não acompanham a isca à distância
  depthM: number;
  dir: 1 | -1; // 1 = nadando para longe do Adilson
  mode: FishMode;
  attackInS: number | null; // só no modo 'seguindo'; 0 depois do ataque
  ignored?: 'interesse' | 'vara'; // PONTO-07: por que ele só olhou (desconfiou, ou falta a vara dele)
  lookS?: number; // segundos olhando a isca de perto antes de ir embora
  retryS?: number; // segundos até voltar a reparar na isca
  tries?: number; // PONTO-07: quantas vezes ele já desconfiou neste arremesso
  fleeS?: number; // ISCA-16: quanto ainda falta da fuga (recusou ou fugiu); depois volta a nadar à toa
  refusedBait?: boolean; // ISCA-16: já recusou esta isca neste arremesso; não volta para recusar de novo
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

/** ISCA-06: o peixe come essa isca? */
const eats = (sp: Species, bait: BaitId) => sp.baits.includes(bait);
/** PONTO-09: come a isca e, se pede uma vara (o lendário), ela está na mão. */
const accepts = (sp: Species, bait: BaitId, rod?: RodId) => eats(sp, bait) && (!sp.requiresRod || sp.requiresRod === rod);
/** PONTO-07: a chance de se interessar pela isca que ele aceita, pela raridade. */
const interestOf = (sp: Species) => Math.min(INTEREST_MAX, INTEREST_BASE + INTEREST_PER_RARITY * sp.rarity);
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
    case 'ignorou': {
      // PONTO-07: primeiro chega perto e olha a isca; depois segue o nado à toa e, passado o tempo,
      // volta a reparar nela (modo 'nadando').
      const lookS = Math.max(0, (f.lookS ?? 0) - h);
      const retryS = (f.retryS ?? 0) - h;
      if (retryS <= 0) return { ...f, mode: 'nadando', ignored: undefined, lookS: undefined, retryS: undefined }; // as tentativas (tries) ficam
      if ((f.lookS ?? 0) > 0) {
        const dx = lure.xM + FISH_FOLLOW_GAP_M * 1.5 - f.xM;
        const dy = lure.depthM - f.depthM;
        const d = Math.hypot(dx, dy);
        const k = d > 0 ? Math.min(d, FISH_FOLLOW_MPS * 0.6 * h) / d : 0;
        return { ...f, lookS, retryS, xM: f.xM + dx * k, depthM: f.depthM + dy * k, dir: lure.xM < f.xM ? -1 : 1 };
      }
      // Fica rondando a isca, atrás dela até no fundo (a isca afunda além de onde ele nada), para voltar a
      // reparar nela: o centro do nado e a profundidade acompanham a isca.
      const turn = f.dir * (f.xM - lure.xM) > FISH_RANGE_M * 0.5;
      const dir = turn ? (-f.dir as 1 | -1) : f.dir;
      const dy = lure.depthM - f.depthM;
      const depthM = f.depthM + Math.sign(dy) * Math.min(Math.abs(dy), FISH_FOLLOW_MPS * 0.6 * h);
      return { ...f, lookS, retryS, dir, homeXM: lure.xM, depthM, xM: f.xM + dir * FISH_CRUISE_MPS * h };
    }
    case 'nadando': {
      const range = f.tries ? FISH_RANGE_M * 0.4 : FISH_RANGE_M; // quem já olhou a isca ronda mais perto
      const turn = f.dir * (f.xM - (f.homeXM ?? lure.xM)) > range || (f.dir < 0 && f.xM <= FISH_MIN_X_M);
      const dir = turn ? (-f.dir as 1 | -1) : f.dir;
      // PONTO-07: quem já olhou a isca continua por perto dela, até no fundo, para voltar a reparar nela.
      const dy = f.tries ? lure.depthM - f.depthM : 0;
      const depthM = f.depthM + Math.sign(dy) * Math.min(Math.abs(dy), FISH_FOLLOW_MPS * 0.6 * h);
      return { ...f, dir, depthM, xM: f.xM + dir * FISH_CRUISE_MPS * h };
    }
    case 'seguindo': {
      const dx = lure.xM + FISH_FOLLOW_GAP_M - f.xM;
      const dy = lure.depthM - f.depthM;
      const d = Math.hypot(dx, dy);
      const k = d > 0 ? Math.min(d, FISH_FOLLOW_MPS * h) / d : 0;
      return { ...f, xM: f.xM + dx * k, depthM: f.depthM + dy * k, dir: lure.xM < f.xM ? -1 : 1 };
    }
    default: {
      // ISCA-16: recusou ou fugiu: dispara para longe por um tempo e volta a nadar à toa, em volta do meio
      // do caminho entre onde parou e a isca. Sem isso, todos acabavam encostados nas bordas da água.
      const fleeS = (f.fleeS ?? FISH_FLEE_S) - h;
      const xM = Math.max(FISH_MIN_X_M, f.xM + f.dir * FISH_FLEE_MPS * h);
      if (fleeS > 0) return { ...f, fleeS, xM };
      return {
        ...f,
        mode: 'nadando',
        fleeS: undefined,
        xM,
        homeXM: (xM + lure.xM) / 2,
        dir: -f.dir as 1 | -1,
        refusedBait: f.refusedBait || f.mode === 'recusou',
      };
    }
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
  rod?: RodId,
): { water: Water; strike: FishAgent | null } {
  // ISCA-02, ISCA-04, ISCA-15
  // ISCA-13: subir e afundar na mesma fração da água da tela em todo ponto (raso ou fundo).
  const view = visibleDepthM(w.bottomM);
  const lure = reeling
    ? { xM: Math.max(w.lure.xM - LURE_REEL_MPS * h, 0), depthM: Math.max(w.lure.depthM - LURE_RISE_SHARE_PER_S * view * h, 0) }
    : { xM: w.lure.xM, depthM: Math.min(w.lure.depthM + LURE_SINK_SHARE_PER_S * view * h, w.bottomM) };

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

  // ISCA-05, ISCA-06: a até 2 m, segue quem aceita a isca e recusa quem não aceita. PONTO-07: quem
  // aceita ainda pode desconfiar e ir embora; o peixe raro desconfia mais (no tutorial, segue sempre).
  fish = fish.map((f) => {
    // PONTO-12: quem já olhou a isca volta a pensar nela onde ela estiver (no fundo de 200 m a isca
    // afunda mais rápido do que o peixe nada atrás dela).
    if (f.mode !== 'nadando' || f.refusedBait) return f;
    if (!f.tries && Math.hypot(f.xM - lure.xM, f.depthM - lure.depthM) > INTEREST_RADIUS_M) return f;
    // ISCA-06: só quem não come essa isca recusa ("não gostou"). PONTO-07: quem come, mas não se
    // interessou desta vez (ou pede outra vara), só não bica: continua nadando, sem balão.
    if (!eats(f.species, bait)) return { ...f, mode: 'recusou', dir: awayFrom(f, lure) };
    const chance = interestOf(f.species) + INTEREST_PER_TRY * (f.tries ?? 0); // insistir funciona
    const interested = accepts(f.species, bait, rod) && (w.followInS !== null || rng.next() < chance);
    if (interested) return follow(f, lure, rng);
    const reason = accepts(f.species, bait, rod) ? 'interesse' : 'vara';
    return { ...f, mode: 'ignorou', ignored: reason, lookS: IGNORE_LOOK_S, retryS: IGNORE_RETRY_S, homeXM: lure.xM, tries: (f.tries ?? 0) + 1 };
  });

  // TUTOB-02: vencido o prazo sem ninguém seguindo, o peixe mais perto que aceita a isca segue.
  let followInS = w.followInS === null ? null : w.followInS - h;
  if (followInS !== null && fish.some((f) => f.mode === 'seguindo')) followInS = null;
  if (followInS !== null && followInS <= EPS) {
    const taker = fish
      .filter((f) => f.mode === 'nadando' && accepts(f.species, bait, rod))
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
  rod?: RodId, // PONTO-09: a vara equipada, para o lendário que pede a dele
): { water: Water; strike: FishAgent | null } {
  if (dt <= 0) return { water: w, strike: null };
  const n = Math.ceil(dt / WATER_MAX_STEP_S - EPS);
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const r = substep(w, h, reeling, bait, rng, dt - (i + 1) * h, rod);
    if (r.strike) return r;
    w = r.water;
  }
  return { water: w, strike: null };
}

/** ISCA-13: quantos metros de água cabem na altura da tela neste ponto (até 10 m, esticados; abaixo, comprimidos). */
function visibleDepthM(bottomM: number): number {
  return Math.min(bottomM, VIEW_LINEAR_DEPTH_M) / (bottomM > VIEW_LINEAR_DEPTH_M ? 1 - VIEW_DEEP_SHARE : 1);
}

/** ISCA-13: quanto o tranco sobe a isca neste ponto: a mesma fração da água na tela em todo cenário. */
export function twitchUpM(bottomM: number): number {
  return TWITCH_UP_SHARE * visibleDepthM(bottomM);
}

/** ISCA-03, ISCA-07: tranco na isca e ataque 1 s mais cedo para quem segue (no mínimo 0,5 s). */
export function twitch(w: Water): Water {
  return {
    ...w,
    lure: { xM: Math.max(w.lure.xM - TWITCH_FORWARD_M, 0), depthM: Math.max(w.lure.depthM - twitchUpM(w.bottomM), 0) },
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
