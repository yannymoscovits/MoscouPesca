// Máquina de estados de um arremesso, da mira até o resultado (design.md, "Domain: fishing").
// TypeScript puro: o tempo chega por `dt` e o sorteio por `ctx.rng`.

import type { BaitId, Difficulty, Point, Rod, Species, Zone } from '../content/types';
import type { Rng } from './rng';
import {
  FATIGUE_BASE_S,
  FATIGUE_S_PER_STAMINA,
  FIGHT_START_DISTANCE,
  FISH_PULL,
  REEL_SPEED,
  TENSION_GAIN,
  TENSION_RELIEF,
} from './tuning';

/** Distância máxima (px lógicos da cena) = base + por ponto de Alcance. */
export const CAST_BASE = 60;
export const CAST_PER_REACH = 24;
/** Duração do voo da isca, em segundos. */
export const FLIGHT_S = 0.8;

/** Topo da barra de tensão e quanto tempo seguido nele arrebenta a linha (PESCA-12, PESCA-13). */
export const MAX_TENSION = 100;
export const BREAK_AFTER_S = 1;

/** Folga para comparar tempos somados em ponto flutuante. */
const EPS = 1e-9;

/** Limites da pescaria. O tutorial passa regras mais folgadas pelo mesmo caminho. */
export interface FishingRules {
  biteS: { min: number; max: number }; // mordida, em segundos depois do arremesso
  giveUpS: number; // sem mordida até aqui: recolhe a isca
  hookWindowS: number | null; // prazo para fisgar; null = o peixe espera o toque
  maxTension: number; // 100 deixa arrebentar; 99 nunca arrebenta
}

export function rulesFor(d: Difficulty): FishingRules {
  return {
    biteS: { min: 3, max: 10 }, // PESCA-04
    giveUpS: 15, // PESCA-05
    hookWindowS: d === 'desafio' ? 2 : 4, // PESCA-08
    maxTension: d === 'desafio' ? MAX_TENSION : 99, // PESCA-13, PESCA-14
  };
}

export type TensionBand = 'verde' | 'amarelo' | 'vermelho';

/** Cor da barra de tensão (PESCA-12). */
export function tensionBand(tension: number): TensionBand {
  if (tension < 70) return 'verde';
  if (tension < 90) return 'amarelo';
  return 'vermelho';
}

export interface Gear {
  rod: Rod;
  bait: BaitId;
}

export interface CastContext extends Gear {
  origin: Point; // ponta da vara, de onde a isca sai
}

export interface TickContext {
  rng: Rng;
  rules: FishingRules;
  zones: Zone[]; // zonas do local atual
  species: Species[]; // espécies do local atual
}

export type FishingState =
  | { phase: 'Idle' }
  | { phase: 'Flying'; gear: Gear; from: Point; to: Point; sinceCast: number }
  | {
      phase: 'Waiting';
      gear: Gear;
      at: Point;
      sinceCast: number;
      bite: { atS: number; species: Species } | null; // sorteada ao cair na água; null = nenhum peixe aceita a isca
    }
  | { phase: 'Bite'; gear: Gear; at: Point; species: Species; sinceBite: number }
  | {
      phase: 'Fight';
      gear: Gear;
      at: Point;
      species: Species;
      maxTension: number; // da dificuldade do início da briga (ACES-03)
      tension: number; // 0 a maxTension
      distance: number; // 0 = peixe na mão
      atMaxS: number; // tempo seguido com a tensão em 100
      fightS: number;
    }
  | { phase: 'Result_Caught'; species: Species; kg: number; value: number } // dados da ficha (PESCA-15)
  | { phase: 'Result_Broken' }
  | { phase: 'Result_Escaped' }
  | { phase: 'Result_Nothing' };

export function maxCastDistance(reach: number): number {
  return CAST_BASE + CAST_PER_REACH * reach;
}

/** Arremessa até o ponto tocado, limitado ao alcance da vara (PESCA-01, PESCA-02). */
export function cast(s: FishingState, target: Point, ctx: CastContext): FishingState {
  if (s.phase !== 'Idle') return s; // PESCA-03: só arremessa parado
  const dx = target.x - ctx.origin.x;
  const dy = target.y - ctx.origin.y;
  const d = Math.hypot(dx, dy);
  const max = maxCastDistance(ctx.rod.reach);
  const to =
    d <= max ? { x: target.x, y: target.y } : { x: ctx.origin.x + (dx / d) * max, y: ctx.origin.y + (dy / d) * max };
  return { phase: 'Flying', gear: { rod: ctx.rod, bait: ctx.bait }, from: ctx.origin, to, sinceCast: 0 };
}

function insidePolygon(p: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Espécies das zonas onde a isca caiu que aceitam a isca equipada. */
function takers(at: Point, bait: BaitId, ctx: TickContext): Species[] {
  const ids = new Set(ctx.zones.filter((z) => insidePolygon(at, z.polygon)).flatMap((z) => z.species));
  return ctx.species.filter((sp) => ids.has(sp.id) && sp.baits.includes(bait));
}

function land(s: Extract<FishingState, { phase: 'Flying' }>, sinceCast: number, ctx: TickContext): FishingState {
  const candidates = takers(s.to, s.gear.bait, ctx);
  const bite =
    candidates.length === 0
      ? null
      : {
          atS: ctx.rng.range(ctx.rules.biteS.min, ctx.rules.biteS.max),
          species: ctx.rng.pick(candidates.map((sp) => ({ item: sp, weight: sp.rarity }))),
        };
  return { phase: 'Waiting', gear: s.gear, at: s.to, sinceCast, bite };
}

/** Fôlego do peixe, de 1 a 0: cai com o tempo de briga para que toda briga termine. */
function breath(sp: Species, fightS: number): number {
  return Math.max(0, 1 - fightS / (FATIGUE_BASE_S + FATIGUE_S_PER_STAMINA * sp.stamina));
}

/** Peixe na mão: peso sorteado na faixa da espécie, com 2 casas, e valor em R$ inteiros. */
function caught(sp: Species, rng: Rng): FishingState {
  const drawn = Math.round(rng.range(sp.kg.min, sp.kg.max) * 100) / 100; // PESCA-16
  const kg = Math.min(Math.max(drawn, sp.kg.min), sp.kg.max);
  return { phase: 'Result_Caught', species: sp, kg, value: Math.round(kg * sp.pricePerKg) }; // PESCA-17
}

function fight(s: Extract<FishingState, { phase: 'Fight' }>, dt: number, holding: boolean, ctx: TickContext): FishingState {
  const sp = s.species;
  let tension: number;
  let distance: number;
  if (holding) {
    // PESCA-10; EQUIP-07: cada ponto de Força divide o ganho
    tension = s.tension + ((TENSION_GAIN * sp.power) / s.gear.rod.force) * dt;
    distance = s.distance - REEL_SPEED * dt;
  } else {
    // PESCA-11
    tension = s.tension - TENSION_RELIEF * dt;
    distance = s.distance + FISH_PULL * sp.power * breath(sp, s.fightS) * dt;
  }
  tension = Math.min(Math.max(tension, 0), s.maxTension); // PESCA-14: teto 99 no Tranquilo
  if (distance <= 0) return caught(sp, ctx.rng); // PESCA-15

  const atMax = tension >= MAX_TENSION;
  const atMaxS = atMax && s.tension >= MAX_TENSION ? s.atMaxS + dt : 0;
  if (atMax && atMaxS >= BREAK_AFTER_S - EPS) return { phase: 'Result_Broken' }; // PESCA-13

  return { ...s, tension, distance, atMaxS, fightS: s.fightS + dt };
}

export function tick(s: FishingState, dt: number, input: { holding: boolean }, ctx: TickContext): FishingState {
  switch (s.phase) {
    case 'Flying': {
      const sinceCast = s.sinceCast + dt;
      if (sinceCast < FLIGHT_S) return { ...s, sinceCast };
      return land(s, sinceCast, ctx);
    }
    case 'Waiting': {
      const sinceCast = s.sinceCast + dt;
      if (s.bite && sinceCast >= s.bite.atS - EPS) {
        return { phase: 'Bite', gear: s.gear, at: s.at, species: s.bite.species, sinceBite: 0 };
      }
      if (sinceCast >= ctx.rules.giveUpS - EPS) return { phase: 'Result_Nothing' }; // PESCA-05
      return { ...s, sinceCast };
    }
    case 'Bite': {
      const sinceBite = s.sinceBite + dt;
      const hookWindow = ctx.rules.hookWindowS;
      if (hookWindow !== null && sinceBite >= hookWindow - EPS) return { phase: 'Result_Escaped' }; // PESCA-09
      return { ...s, sinceBite };
    }
    case 'Fight':
      return fight(s, dt, input.holding, ctx);
    default:
      return s;
  }
}

/** Toque em qualquer ponto da tela: dentro da janela, fisga (PESCA-08). */
export function press(s: FishingState, ctx: TickContext): FishingState {
  if (s.phase !== 'Bite') return s;
  return {
    phase: 'Fight',
    gear: s.gear,
    at: s.at,
    species: s.species,
    maxTension: ctx.rules.maxTension, // ACES-03: vale a dificuldade de agora até o fim da briga
    tension: 0,
    distance: FIGHT_START_DISTANCE,
    atMaxS: 0,
    fightS: 0,
  };
}
