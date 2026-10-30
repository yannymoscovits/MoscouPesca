// Máquina de estados de um arremesso, da mira até o resultado (design.md, "Domain: fishing").
// TypeScript puro: o tempo chega por `dt` e o sorteio por `ctx.rng`.

import type { BaitId, Point, Rod } from '../content/types';
import type { Rng } from './rng';

/** Distância máxima (px lógicos da cena) = base + por ponto de Alcance. */
export const CAST_BASE = 60;
export const CAST_PER_REACH = 24;
/** Duração do voo da isca, em segundos. */
export const FLIGHT_S = 0.8;

export interface Gear {
  rod: Rod;
  bait: BaitId;
}

export interface CastContext extends Gear {
  origin: Point; // ponta da vara, de onde a isca sai
}

export interface TickContext {
  rng: Rng;
}

export type FishingState =
  | { phase: 'Idle' }
  | { phase: 'Flying'; gear: Gear; from: Point; to: Point; sinceCast: number }
  | { phase: 'Waiting'; gear: Gear; at: Point; sinceCast: number };

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

export function tick(s: FishingState, dt: number, _input: { holding: boolean }, _ctx: TickContext): FishingState {
  switch (s.phase) {
    case 'Flying': {
      const sinceCast = s.sinceCast + dt;
      if (sinceCast < FLIGHT_S) return { ...s, sinceCast };
      return { phase: 'Waiting', gear: s.gear, at: s.to, sinceCast };
    }
    default:
      return s;
  }
}

/** Toque em qualquer ponto da tela. */
export function press(s: FishingState, _ctx: TickContext): FishingState {
  return s;
}
