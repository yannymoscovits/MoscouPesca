// Números e lugares como as telas mostram.

import type { EpisodeContent, Location, Profile } from '../content/types';
import { currentObjective } from '../domain/story';
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

/** SAVE-11: o jogo salvo já tem progresso: o tutorial foi feito ou alguma cena já passou. */
export const hasProgress = (p: Profile) => p.tutorialDone || p.story.scenesSeen.length > 0;

/** SAVE-11: o capítulo do local atual e o que falta nele, para o "Continuar" da tela inicial. */
export function savedProgress(p: Profile, episodes: EpisodeContent[]): { chapter: string; objective: string } {
  const { episode } = currentPlace(p, episodes);
  const won = p.story.episodes[episode.id]?.won ?? false;
  const objective = currentObjective(p.story, episode)?.text ?? (won ? 'Pescaria livre' : `Campeonato: ${episode.tournament.name}`);
  return { chapter: `Capítulo ${episode.id}: ${episode.chapter.title}`, objective };
}
