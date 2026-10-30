// Números e lugares como as telas mostram.

import type { EpisodeContent, Location, Profile } from '../content/types';
import { episodeAt } from '../domain/world';

/** R$ inteiro, com ponto de milhar: "R$ 1.234". */
export const formatMoney = (value: number) => `R$ ${value.toLocaleString('pt-BR')}`;

/** Peso com 2 casas e vírgula: "4,70 kg" (PESCA-15). */
export const formatKg = (kg: number) =>
  `${kg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;

/** Episódio e local onde o jogador está pescando (EPI-07). */
export function currentPlace(p: Profile, episodes: EpisodeContent[]): { episode: EpisodeContent; location: Location } {
  const episode = (episodeAt(p.currentLocation, episodes) as EpisodeContent | undefined) ?? episodes[0];
  const location = episode.locations.find((l) => l.id === p.currentLocation) ?? episode.locations[0];
  return { episode, location };
}
