// Medalhas e metas (spec, "Medalhas e metas"): limites de bronze, prata e ouro em proporção à faixa de
// peso de cada espécie (MEDAL-01) e metas de 10, 25 e 50 capturas por espécie, com recompensa em R$
// crescendo por episódio (MEDAL-04, MEDAL-05). Números iniciais; T61 calibra.

import type { EpisodeId, GoalDef, MedalLimits, Species } from './types';

/** Onde fica cada medalha dentro da faixa de peso: 0 = peso mínimo, 1 = peso máximo. */
export const MEDAL_SHARE: MedalLimits = { bronze: 0.5, prata: 0.75, ouro: 0.9 };

const round2 = (kg: number) => Math.round(kg * 100) / 100;

/** Limites das medalhas de uma faixa de peso, em kg com 2 casas (os pesos sorteados também têm 2). */
export function medalLimits(kg: Species['kg']): MedalLimits {
  const at = (share: number) => round2(kg.min + (kg.max - kg.min) * share);
  return { bronze: at(MEDAL_SHARE.bronze), prata: at(MEDAL_SHARE.prata), ouro: at(MEDAL_SHARE.ouro) };
}

/** As espécies de um episódio com os limites das medalhas de cada uma. */
export function withMedals<T extends Omit<Species, 'medals'>>(species: T[]): (T & { medals: MedalLimits })[] {
  return species.map((sp) => ({ ...sp, medals: medalLimits(sp.kg) }));
}

/** R$ por captura da meta, por episódio: a meta de 25 do Ep. 1 paga 25 × 2 = R$ 50. */
const REWARD_PER_CATCH: Record<EpisodeId, number> = { 1: 2, 2: 6, 3: 15, 4: 40, 5: 120 };

export const goals: GoalDef = {
  counts: [10, 25, 50],
  reward: (episode, count) => REWARD_PER_CATCH[episode] * count,
};
