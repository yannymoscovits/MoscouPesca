// Mundo: quais episódios estão liberados, para onde o jogador pode ir e o que a loja oferece
// (design.md, "Domain: world"). Liberar um episódio libera todos os locais dele (EPI-08).

import { WALLET_SPARE } from './tuning';
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

/**
 * HIST-11: item que algum objetivo libera só aparece na loja depois desse objetivo; o dinheiro dele
 * chega junto. Item que nenhum objetivo libera (Bambu e Minhoca) está sempre na loja.
 */
export function isReleased(p: Profile, all: Episode[], id: string): boolean {
  for (const ep of all) {
    const k = ep.chapter.objectives.findIndex((o) => o.unlocks?.includes(id));
    if (k >= 0) return (p.story.episodes[ep.id]?.objectiveIndex ?? 0) > k;
  }
  return true;
}

/** EQUIP-09: só as varas e iscas dos episódios liberados, e só as que a história já liberou (HIST-11). */
export function shopItems(p: Profile, all: Episode[]): { rods: Rod[]; baits: Bait[] } {
  const open = all.filter((ep) => isUnlocked(p, ep.id));
  const released = (i: { id: string }) => isReleased(p, all, i.id);
  return { rods: open.flatMap((ep) => ep.rods).filter(released), baits: open.flatMap((ep) => ep.baits).filter(released) };
}

/**
 * PESCA-17, HIST-11: o máximo que a carteira guarda. É o preço dos itens que a loja já vende e o jogador
 * ainda não tem, mais o do próximo item que a história do episódio atual vai liberar. Sem nada mais para
 * comprar no capítulo, R$ 200. Passando disso, o peixe não soma: ninguém chega rico ao capítulo seguinte.
 */
export function walletCap(p: Profile, all: Episode[], current: Episode): number {
  const owned = (id: string) => p.rods.owned.includes(id) || p.baits.owned.includes(id);
  const { rods, baits } = shopItems(p, all);
  const inShop = [...rods, ...baits].filter((i) => !owned(i.id)).reduce((sum, i) => sum + i.price, 0);
  /** O que o próximo objetivo com item vai liberar no episódio `ep`, a partir do objetivo `from`. */
  const comingIn = (ep: Episode, from: number) => {
    const next = ep.chapter.objectives.slice(from).find((o) => o.unlocks?.length);
    const items = [...ep.rods, ...ep.baits];
    return (next?.unlocks ?? []).filter((id) => !owned(id)).reduce((sum, id) => sum + (items.find((i) => i.id === id)?.price ?? 0), 0);
  };
  const coming = comingIn(current, p.story.episodes[current.id]?.objectiveIndex ?? 0);
  if (inShop + coming > 0) return inShop + coming;
  // Nada mais para comprar no capítulo (ex.: depois do Pirarucu): a carteira guarda até R$ 200.
  // No último capítulo, com tudo comprado, ela fica livre.
  return all.some((ep) => ep.id === current.id + 1) ? WALLET_SPARE : Infinity;
}

/** PESCA-17: a carteira encheu sem nada para comprar no capítulo: o recado é "Carteira cheia!". */
export function nothingToBuy(p: Profile, all: Episode[], current: Episode): boolean {
  const { rods, baits } = shopItems(p, all);
  const allOwned = [...rods, ...baits].every((i) => p.rods.owned.includes(i.id) || p.baits.owned.includes(i.id));
  return allOwned && walletCap(p, all, current) === WALLET_SPARE;
}

/** Quanto do valor do peixe entra na carteira, sem passar do limite (e sem tirar de quem já passou). */
export function credit(p: Profile, value: number, cap: number): number {
  return Math.max(0, Math.min(value, cap - p.money));
}

/** EQUIP-10: itens à venda que o jogador ainda não viu na loja (nem tem): o "!" no botão Loja e o "Novo!" no cartão. */
export function newInShop(p: Profile, all: Episode[]): string[] {
  const seen = new Set([...(p.shopSeen ?? []), ...p.rods.owned, ...p.baits.owned]);
  const { rods, baits } = shopItems(p, all);
  return [...rods, ...baits].map((i) => i.id).filter((id) => !seen.has(id));
}
