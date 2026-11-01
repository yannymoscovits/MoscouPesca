// Quanto o peixe vale e quão difícil ele é (PESCA-17, ALBUM-05): o valor acompanha a dificuldade da
// briga, para o peixe mais trabalhoso sempre render mais. Peso grande para a espécie rende um pouco mais.

import type { EpisodeId, FightStyle, Species } from '../content/types';
import { fightStyleOf } from './catchBar';

/** Quanto o jeito pesa na briga, medido no simulador: o saltador é o mais difícil de segurar na faixa. */
const STYLE_WEIGHT: Record<FightStyle, number> = { calmo: 0.9, afundador: 1, saltador: 1.6 };
/** R$ por ponto de dificuldade em cada episódio: a primeira vara do capítulo sai em uns 6 peixes comuns. */
const VALUE_PER_POINT: Record<EpisodeId, number> = { 1: 6.5, 2: 13, 3: 25, 4: 28, 5: 53 };

/** Dificuldade da briga: média de força e fôlego vezes o peso do jeito (de ~1,4 a ~16). */
export function fishScore(sp: Species): number {
  return ((sp.power + sp.stamina) / 2) * STYLE_WEIGHT[fightStyleOf(sp)];
}

/** Estrelas do manual, de 1 a 5; o lendário (raro do local) tem sempre 5. */
export function fishStars(sp: Species): number {
  return sp.rare ? 5 : Math.min(5, Math.max(1, Math.round(fishScore(sp) / 2.4)));
}

/** Valor em R$ do peixe pescado: dificuldade x episódio, de 80% (o mais leve) a 120% (o mais pesado); lendário x2. */
export function fishValue(sp: Species, kg: number): number {
  const size = sp.kg.max > sp.kg.min ? (kg - sp.kg.min) / (sp.kg.max - sp.kg.min) : 0.5;
  return Math.round(VALUE_PER_POINT[sp.episode ?? 1] * fishScore(sp) * (0.8 + 0.4 * size) * (sp.rare ? 2 : 1));
}
