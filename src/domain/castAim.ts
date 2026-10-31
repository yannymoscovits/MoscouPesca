// Seta da mira, barra de força e distância do arremesso (design.md da pesca-bass, "castAim").
// As duas ondas dependem só do tempo desde o começo da fase; o período (sweepS) vem das regras.

import { maxCastDistance } from './fishing';
import { AIM_HALF_ARC_DEG, CAST_MIN_SHARE, M_PER_PX } from './tuning';

/** Onda triangular 0 → 1 → 0, uma ida e volta a cada `periodS`. */
function triangle(sinceS: number, periodS: number): number {
  const phase = (sinceS / periodS) % 1;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

/** Seta de -45° (esquerda) a 45° (direita) e de volta em `sweepS` (ARREM-01, ARREM-06). */
export function aimAngleDeg(sinceS: number, sweepS: number): number {
  return AIM_HALF_ARC_DEG * (2 * triangle(sinceS, sweepS) - 1);
}

/** Força de 0 a 1 e de volta em `sweepS` (ARREM-02, ARREM-06). */
export function powerAt(sinceS: number, sweepS: number): number {
  return triangle(sinceS, sweepS);
}

/** Distância em metros: (30% + 70% × força) do alcance máximo da vara (ARREM-03, ARREM-07). */
export function castDistanceM(power: number, reach: number): number {
  return (CAST_MIN_SHARE + (1 - CAST_MIN_SHARE) * power) * maxCastDistance(reach) * M_PER_PX;
}
