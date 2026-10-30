// Máquina de estados de um arremesso, da mira até o resultado (design.md, "Domain: fishing").
// TypeScript puro: o tempo chega por `dt` e o sorteio por `ctx.rng`.

import type { BaitId, Difficulty, Point, Rod, Species, Zone } from '../content/types';
import type { Rng } from './rng';

/** Distância máxima (px lógicos da cena) = base + por ponto de Alcance. */
export const CAST_BASE = 60;
export const CAST_PER_REACH = 24;
/** Duração do voo da isca, em segundos. */
export const FLIGHT_S = 0.8;

/** Folga para comparar tempos somados em ponto flutuante. */
const EPS = 1e-9;

/** Limites de tempo da pescaria. O tutorial passa regras mais folgadas pelo mesmo caminho. */
export interface FishingRules {
  biteS: { min: number; max: number }; // mordida, em segundos depois do arremesso
  giveUpS: number; // sem mordida até aqui: recolhe a isca
  hookWindowS: number | null; // prazo para fisgar; null = o peixe espera o toque
}

export function rulesFor(d: Difficulty): FishingRules {
  return {
    biteS: { min: 3, max: 10 }, // PESCA-04
    giveUpS: 15, // PESCA-05
    hookWindowS: d === 'desafio' ? 2 : 4, // PESCA-08
  };
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
  | { phase: 'Fight'; gear: Gear; at: Point; species: Species }
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

export function tick(s: FishingState, dt: number, _input: { holding: boolean }, ctx: TickContext): FishingState {
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
    default:
      return s;
  }
}

/** Toque em qualquer ponto da tela: dentro da janela, fisga (PESCA-08). */
export function press(s: FishingState, _ctx: TickContext): FishingState {
  if (s.phase !== 'Bite') return s;
  return { phase: 'Fight', gear: s.gear, at: s.at, species: s.species };
}
