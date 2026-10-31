// Máquina de estados de um arremesso da pescaria nova, da mira ao resultado (design.md da
// pesca-bass, "pesca"). TypeScript puro: o tempo chega por `dt` e o sorteio por `ctx.rng`.

import type { BaitId, Difficulty, Rod, Species, Zone } from '../content/types';
import { aimAngleDeg, castDistanceM, powerAt } from './castAim';
import { barOutcome, barRulesFor, startBar, stepBar, type BarRules, type CatchBar } from './catchBar';
import { scare, spawnWater, stepWater, twitch, type Water } from './lure';
import type { Rng } from './rng';
import { AIM_SWEEP_S, CAST_FLIGHT_S, HOOK_WINDOW_S } from './tuning';

/** Folga para comparar tempos somados em ponto flutuante. */
const EPS = 1e-9;

/** Limites da pescaria. O tutorial passa regras mais folgadas pelo mesmo caminho. */
export interface PescaRules {
  sweepS: number; // ida e volta da seta e ciclo da força
  hookWindowS: number | null; // prazo para fisgar; null = o peixe espera o PUXAR
  followWithinS: number | null; // prazo para um peixe seguir a isca; null = sem prazo
  bar: BarRules;
}

export interface Gear {
  rod: Rod;
  bait: BaitId;
}

export interface PescaContext extends Gear {
  rng: Rng;
  rules: PescaRules;
  spot: Zone; // ponto escolhido no pesqueiro
  species: Species[]; // espécies do local
}

export type PescaButton = 'arremessar' | 'puxar';

export type PescaState =
  | { phase: 'Aim'; sinceS: number }
  | { phase: 'Power'; angleDeg: number; sinceS: number }
  | { phase: 'Flying'; gear: Gear; angleDeg: number; distanceM: number; sinceS: number }
  | { phase: 'Lure'; gear: Gear; water: Water; notice: { text: string; sinceS: number } | null }
  | { phase: 'Strike'; gear: Gear; water: Water; fishId: number; sinceS: number }
  | { phase: 'Fight'; gear: Gear; water: Water; fishId: number; bar: CatchBar }
  | { phase: 'Result_Caught'; species: Species; kg: number; value: number } // dados da ficha (PESCA-15)
  | { phase: 'Result_Escaped' } // BRIGA-11
  | { phase: 'Result_Nothing' }; // ISCA-12

export function startPesca(): PescaState {
  return { phase: 'Aim', sinceS: 0 };
}

export function rulesFor(d: Difficulty): PescaRules {
  return { sweepS: AIM_SWEEP_S[d], hookWindowS: HOOK_WINDOW_S[d], followWithinS: null, bar: barRulesFor(d) };
}

/** Peixe na mão: peso sorteado na faixa da espécie, com 2 casas, e valor em R$ inteiros. */
export function caught(sp: Species, rng: Rng): Extract<PescaState, { phase: 'Result_Caught' }> {
  const drawn = Math.round(rng.range(sp.kg.min, sp.kg.max) * 100) / 100; // PESCA-16
  const kg = Math.min(Math.max(drawn, sp.kg.min), sp.kg.max);
  return { phase: 'Result_Caught', species: sp, kg, value: Math.round(kg * sp.pricePerKg) }; // PESCA-17
}

/** ARREMESSAR trava a seta e depois arremessa; PUXAR dá o tranco ou fisga. Fora disso, nada muda (BOTAO-03). */
export function press(s: PescaState, b: PescaButton, ctx: PescaContext): PescaState {
  const { rules } = ctx;
  if (b === 'arremessar') {
    if (s.phase === 'Aim') return { phase: 'Power', angleDeg: aimAngleDeg(s.sinceS, rules.sweepS), sinceS: 0 }; // ARREM-02
    if (s.phase === 'Power') {
      const distanceM = castDistanceM(powerAt(s.sinceS, rules.sweepS), ctx.rod.reach); // ARREM-03
      return { phase: 'Flying', gear: { rod: ctx.rod, bait: ctx.bait }, angleDeg: s.angleDeg, distanceM, sinceS: 0 };
    }
    return s;
  }
  if (s.phase === 'Lure') return { ...s, water: twitch(s.water) }; // ISCA-03
  if (s.phase === 'Strike') {
    const fish = s.water.fish.find((f) => f.id === s.fishId)!;
    const bar = startBar(fish.species, s.gear.rod, rules.bar, ctx.rng); // ISCA-10, BRIGA-01
    return { phase: 'Fight', gear: s.gear, water: s.water, fishId: s.fishId, bar };
  }
  return s;
}

export function tick(s: PescaState, dt: number, input: { holding: boolean }, ctx: PescaContext): PescaState {
  const { rules, rng } = ctx;
  switch (s.phase) {
    case 'Aim':
    case 'Power':
      return { ...s, sinceS: s.sinceS + dt };
    case 'Flying': {
      const sinceS = s.sinceS + dt;
      if (sinceS < CAST_FLIGHT_S - EPS) return { ...s, sinceS };
      // ARREM-05: caiu na água; a vista debaixo d'água começa com os peixes do ponto
      const water = spawnWater(ctx.spot, ctx.species, s.distanceM, rng, rules.followWithinS, s.gear.bait);
      return { phase: 'Lure', gear: s.gear, water, notice: null };
    }
    case 'Lure': {
      const { water, strike } = stepWater(s.water, dt, input.holding, s.gear.bait, rng); // segurar = RECOLHER
      if (strike) return { phase: 'Strike', gear: s.gear, water, fishId: strike.id, sinceS: 0 }; // ISCA-08
      if (water.lure.xM <= 0) return { phase: 'Result_Nothing' }; // ISCA-12
      const notice = s.notice && { ...s.notice, sinceS: s.notice.sinceS + dt };
      return { ...s, water, notice };
    }
    case 'Strike': {
      const sinceS = s.sinceS + dt;
      if (rules.hookWindowS !== null && sinceS >= rules.hookWindowS - EPS) {
        // ISCA-11: o peixe foge e a isca continua na água
        return { phase: 'Lure', gear: s.gear, water: scare(s.water, s.fishId), notice: { text: 'Escapou!', sinceS: 0 } };
      }
      return { ...s, sinceS };
    }
    case 'Fight': {
      const bar = stepBar(s.bar, dt, input.holding, rules.bar, rng); // segurar = SEGURAR
      const outcome = barOutcome(bar, rules.bar);
      if (outcome === 'pegou') return caught(bar.species, rng); // BRIGA-10
      if (outcome === 'fugiu') return { phase: 'Result_Escaped' }; // BRIGA-11
      return { ...s, bar };
    }
    default:
      return s;
  }
}
