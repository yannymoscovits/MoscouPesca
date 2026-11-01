import { describe, expect, it } from 'vitest';
import type { Episode, EpisodeId, Profile } from '../content/types';
import { newProfile } from './profile';
import { isUnlocked, onChampionshipWon, shopItems, travel } from './world';

const LOCATIONS: Record<EpisodeId, string[]> = {
  1: ['poco-do-magro'],
  2: ['rio-jacuipe', 'ponte-da-cetrel'],
  3: ['pantanal'],
  4: ['amazonia'],
  5: ['alto-mar'],
};

function episode(id: EpisodeId): Episode {
  return {
    id,
    locations: LOCATIONS[id].map((loc) => ({ id: loc, name: loc, background: '', zones: [] })),
    species: [],
    rods: [
      { id: `vara-${id}a`, name: 'Vara A', price: 100 * id, force: id, reach: id, episode: id },
      { id: `vara-${id}b`, name: 'Vara B', price: 150 * id, force: id + 1, reach: id + 1, episode: id },
    ],
    baits: [{ id: `isca-${id}`, name: 'Isca', price: 50 * id, episode: id }],
    chapter: { title: '', openingScene: `ep${id}-abertura`, objectives: [], closingScene: `ep${id}-fim` },
    tournament: { id: `copa-${id}`, name: '', casts: 5, countBest: 3, rivals: [], trophy: `t${id}`, message: `m${id}` },
    letter: { id: `m${id}`, from: '', text: '' },
  };
}

const ALL: Episode[] = ([1, 2, 3, 4, 5] as EpisodeId[]).map(episode);

function winUpTo(last: EpisodeId): Profile {
  let p = newProfile();
  for (let ep = 1; ep <= last; ep++) p = onChampionshipWon(p, ep as EpisodeId);
  return p;
}

describe('episódios liberados', () => {
  it('EPI-03: perfil novo tem só o Episódio 1 liberado', () => {
    const p = newProfile();
    expect(isUnlocked(p, 1)).toBe(true);
    for (const ep of [2, 3, 4, 5] as EpisodeId[]) expect(isUnlocked(p, ep)).toBe(false);
  });

  it('EPI-02: vencer o campeonato do 1 libera só o 2', () => {
    const p = onChampionshipWon(newProfile(), 1);
    expect(p.unlockedEpisodes).toEqual([1, 2]);
    expect(isUnlocked(p, 2)).toBe(true);
    expect(isUnlocked(p, 3)).toBe(false);
  });

  it('EPI-08: o Episódio 2 libera os seus dois locais juntos', () => {
    const p = onChampionshipWon(newProfile(), 1);
    expect(travel(p, 'rio-jacuipe', ALL).currentLocation).toBe('rio-jacuipe');
    expect(travel(p, 'ponte-da-cetrel', ALL).currentLocation).toBe('ponte-da-cetrel');
  });

  it('EPI-02: vencer de novo o mesmo campeonato não duplica o episódio liberado', () => {
    const once = onChampionshipWon(newProfile(), 1);
    expect(onChampionshipWon(once, 1).unlockedEpisodes).toEqual([1, 2]);
  });

  it('EPI-02: os episódios liberam em ordem, um por campeonato', () => {
    expect(winUpTo(3).unlockedEpisodes).toEqual([1, 2, 3, 4]);
    expect(winUpTo(4).unlockedEpisodes).toEqual([1, 2, 3, 4, 5]);
  });

  it('EPI-02: vencer o 5 não libera mais nada', () => {
    expect(winUpTo(5).unlockedEpisodes).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('viagem', () => {
  it('EPI-04, EPI-07: viajar para local liberado muda e guarda o local atual', () => {
    const p = travel(winUpTo(2), 'pantanal', ALL);
    expect(p.currentLocation).toBe('pantanal');
  });

  it('EPI-03: viajar para local bloqueado devolve o perfil igual', () => {
    const p = onChampionshipWon(newProfile(), 1);
    expect(travel(p, 'pantanal', ALL)).toEqual(p);
    expect(travel(p, 'alto-mar', ALL)).toEqual(p);
  });

  it('EPI-04: local que não existe devolve o perfil igual', () => {
    const p = newProfile();
    expect(travel(p, 'lagoa-inventada', ALL)).toEqual(p);
  });

  it('EPI-05: depois de vencer o 5, ainda dá para voltar ao Poço do Magro e a qualquer local', () => {
    const p = travel(winUpTo(5), 'alto-mar', ALL);
    expect(travel(p, 'poco-do-magro', ALL).currentLocation).toBe('poco-do-magro');
    for (const loc of Object.values(LOCATIONS).flat()) expect(travel(p, loc, ALL).currentLocation).toBe(loc);
  });
});

describe('loja por episódio', () => {
  it('EQUIP-09: com os episódios 1 e 2 liberados, a loja não mostra itens dos episódios 3 a 5', () => {
    const items = shopItems(onChampionshipWon(newProfile(), 1), ALL);
    expect(items.rods.map((r) => r.id)).toEqual(['vara-1a', 'vara-1b', 'vara-2a', 'vara-2b']);
    expect(items.baits.map((b) => b.id)).toEqual(['isca-1', 'isca-2']);
  });

  it('EQUIP-09: perfil novo vê só os itens do Episódio 1', () => {
    const items = shopItems(newProfile(), ALL);
    expect(items.rods.every((r) => r.episode === 1)).toBe(true);
    expect(items.baits.every((b) => b.episode === 1)).toBe(true);
    expect(items.rods).toHaveLength(2);
    expect(items.baits).toHaveLength(1);
  });
});
