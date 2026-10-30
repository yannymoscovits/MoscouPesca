// Mundo: quais episódios estão liberados, para onde o jogador pode ir e o que a loja oferece
// (design.md, "Domain: world"). Liberar um episódio libera todos os locais dele (EPI-08).

import type { Bait, Episode, EpisodeId, LocationId, Profile, Rod } from '../content/types';
import { LAST_EPISODE } from './story';

export function isUnlocked(p: Profile, ep: EpisodeId): boolean {
  return p.unlockedEpisodes.includes(ep);
}

/** EPI-02: vencer o campeonato de um episódio de 1 a 4 libera o seguinte, uma vez só. */
export function onChampionshipWon(p: Profile, ep: EpisodeId): Profile {
  if (ep >= LAST_EPISODE) return p;
  const next = (ep + 1) as EpisodeId;
  if (isUnlocked(p, next)) return p;
  return { ...p, unlockedEpisodes: [...p.unlockedEpisodes, next].sort((a, b) => a - b) };
}

/** Episódio dono do local, ou undefined se o local não existe. */
export function episodeAt(location: LocationId, all: Episode[]): Episode | undefined {
  return all.find((ep) => ep.locations.some((l) => l.id === location));
}

// SPEC_DEVIATION: recebe também a lista de episódios.
// Reason: o perfil só guarda IDs; sem o conteúdo não dá para saber de que episódio é o local.
/** EPI-04, EPI-07: só viaja para local de episódio liberado e guarda o local atual. */
export function travel(p: Profile, location: LocationId, all: Episode[]): Profile {
  const ep = episodeAt(location, all);
  if (!ep || !isUnlocked(p, ep.id)) return p;
  return { ...p, currentLocation: location };
}

/** EQUIP-09: só as varas e iscas dos episódios liberados. */
export function shopItems(p: Profile, all: Episode[]): { rods: Rod[]; baits: Bait[] } {
  const open = all.filter((ep) => isUnlocked(p, ep.id));
  return { rods: open.flatMap((ep) => ep.rods), baits: open.flatMap((ep) => ep.baits) };
}
