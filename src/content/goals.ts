// Medalhas e metas (spec, "Medalhas e metas"): limites de bronze, prata e ouro em proporção à faixa de
// peso de cada espécie (MEDAL-01) e metas de 10, 25 e 50 capturas por espécie (MEDAL-04). As metas são
// conquista, sem dinheiro: o saldo só cresce com os objetivos da história (MEDAL-05, HIST-11).

import type { EpisodeId, GoalDef, MedalLimits, Species } from './types';

/** Onde fica cada medalha dentro da faixa de peso: 0 = peso mínimo, 1 = peso máximo. */
export const MEDAL_SHARE: MedalLimits = { bronze: 0.5, prata: 0.75, ouro: 0.9 };

const round2 = (kg: number) => Math.round(kg * 100) / 100;

/** Limites das medalhas de uma faixa de peso, em kg com 2 casas (os pesos sorteados também têm 2). */
export function medalLimits(kg: Species['kg']): MedalLimits {
  const at = (share: number) => round2(kg.min + (kg.max - kg.min) * share);
  return { bronze: at(MEDAL_SHARE.bronze), prata: at(MEDAL_SHARE.prata), ouro: at(MEDAL_SHARE.ouro) };
}

/** As espécies de um episódio com os limites das medalhas de cada uma e o episódio (BRIGA-15). */
export function withMedals<T extends Omit<Species, 'medals'>>(
  species: T[],
  episode: EpisodeId,
): (T & { medals: MedalLimits; episode: EpisodeId })[] {
  return species.map((sp) => ({ ...sp, medals: medalLimits(sp.kg), episode }));
}

export const goals: GoalDef = { counts: [10, 25, 50] };
