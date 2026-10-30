import { describe, expect, it } from 'vitest';
import type { Episode, EpisodeId, GameEvent, Objective, Profile } from '../content/types';
import { currentObjective, isTournamentUnlocked, onEvent } from './story';

const caught = (species: string, kg = 1): GameEvent => ({ type: 'Caught', species, kg });

const EP1_OBJECTIVES: Objective[] = [
  { id: 'pegar-3', text: 'Pegar 3 peixes', done: (e) => e.type === 'Caught', count: 3, sceneOnDone: 'cena-piranha' },
  {
    id: 'comprar-fibra',
    text: 'Comprar a Vara de Fibra',
    done: (e) => e.type === 'Bought' && e.item === 'fibra',
    sceneOnDone: 'cena-loja',
  },
  {
    id: 'album',
    text: 'Registrar tilápia e piranha no álbum',
    done: (e, p) => e.type === 'Caught' && p.album.tilapia !== undefined && p.album.lavinia !== undefined,
    sceneOnDone: 'cena-album',
  },
];

function episode(id: EpisodeId, objectives: Objective[] = EP1_OBJECTIVES): Episode {
  return {
    id,
    locations: [{ id: `local-${id}`, name: `Local ${id}`, background: '', zones: [] }],
    species: [],
    rods: [],
    baits: [],
    chapter: { title: `Capítulo ${id}`, openingScene: `ep${id}-abertura`, objectives, closingScene: `ep${id}-encerramento` },
    tournament: {
      id: `copa-${id}`,
      name: `Copa ${id}`,
      casts: 8,
      countBest: 3,
      rivals: [],
      trophy: `trofeu-${id}`,
      message: `carta-${id}`,
    },
    letter: { id: `carta-${id}`, from: 'Família', text: 'Parabéns' },
  };
}

const EP1 = episode(1);

function newProfile(): Profile {
  return {
    version: 1,
    money: 0,
    rods: { owned: ['bambu'], equipped: 'bambu' },
    baits: { owned: ['minhoca'], equipped: 'minhoca' },
    settings: { difficulty: null, vibration: true },
    story: { episodes: {}, scenesSeen: [], pendingScene: null },
    unlockedEpisodes: [1],
    currentLocation: 'poco-do-magro',
    tutorialDone: false,
    charactersIntroduced: [],
    tournament: null,
    trophies: [],
    messagesUnlocked: [],
    album: {},
    seenVersion: '',
  };
}

/** Aplica o evento à história do perfil, como o controller fará. */
function apply(p: Profile, e: GameEvent, ep: Episode = EP1) {
  const out = onEvent(p, e, ep);
  return { p: { ...p, story: out.progress }, out };
}

/** Perfil com todos os objetivos do episódio cumpridos. */
function allObjectivesDone(ep: Episode, base = newProfile()): Profile {
  return {
    ...base,
    story: {
      ...base.story,
      episodes: { ...base.story.episodes, [ep.id]: { objectiveIndex: ep.chapter.objectives.length, progress: 0, won: false } },
    },
  };
}

describe('cenas de abertura', () => {
  it('HIST-01: GameStarted num perfil novo mostra a abertura do Episódio 1', () => {
    expect(onEvent(newProfile(), { type: 'GameStarted' }, EP1).sceneToShow).toBe('ep1-abertura');
  });

  it('HIST-01: a abertura aparece só na primeira vez', () => {
    const { p } = apply(newProfile(), { type: 'GameStarted' });
    expect(onEvent(p, { type: 'GameStarted' }, EP1).sceneToShow).toBeUndefined();
  });

  it('HIST-09: primeira pesca num episódio liberado mostra a abertura dele, uma vez só', () => {
    const ep2 = episode(2);
    let p: Profile = { ...newProfile(), unlockedEpisodes: [1, 2] };
    p = apply(p, { type: 'GameStarted' }).p; // abertura do 1 já vista

    const first = apply(p, { type: 'GameStarted' }, ep2);
    expect(first.out.sceneToShow).toBe('ep2-abertura');
    expect(onEvent(first.p, { type: 'GameStarted' }, ep2).sceneToShow).toBeUndefined();
  });
});

describe('objetivos', () => {
  it('HIST-04, HIST-05: o objetivo atual muda em ordem e cada conclusão devolve a cena dele', () => {
    let p = newProfile();
    expect(currentObjective(p.story, EP1)?.id).toBe('pegar-3');

    let step = apply(p, caught('tilapia'));
    expect(step.out.sceneToShow).toBeUndefined();
    expect(step.p.story.episodes[1]?.progress).toBe(1); // "1 de 3"
    step = apply(step.p, caught('traira'));
    expect(currentObjective(step.p.story, EP1)?.id).toBe('pegar-3');
    expect(step.p.story.episodes[1]?.progress).toBe(2);

    step = apply(step.p, caught('lambari'));
    expect(step.out.sceneToShow).toBe('cena-piranha');
    expect(currentObjective(step.p.story, EP1)?.id).toBe('comprar-fibra');
    expect(step.p.story.episodes[1]?.progress).toBe(0);

    step = apply(step.p, { type: 'Bought', item: 'fibra' });
    expect(step.out.sceneToShow).toBe('cena-loja');
    expect(currentObjective(step.p.story, EP1)?.id).toBe('album');

    p = { ...step.p, album: { tilapia: { recordKg: 1 }, lavinia: { recordKg: 0.8 } } };
    step = apply(p, caught('lavinia', 0.8));
    expect(step.out.sceneToShow).toBe('cena-album');
    expect(currentObjective(step.p.story, EP1)).toBeNull();
  });

  it('HIST-05: o objetivo é avaliado com o perfil do jogador (álbum incompleto não cumpre)', () => {
    const base = newProfile();
    const p: Profile = {
      ...base,
      story: { ...base.story, episodes: { 1: { objectiveIndex: 2, progress: 0, won: false } } }, // objetivo "album"
      album: { tilapia: { recordKg: 1 } },
    };
    const out = onEvent(p, caught('tilapia'), EP1);
    expect(out.sceneToShow).toBeUndefined();
    expect(currentObjective(out.progress, EP1)?.id).toBe('album');
  });

  it('evento fora de ordem (compra antes do objetivo de compra) não pula objetivos', () => {
    const { p, out } = apply(newProfile(), { type: 'Bought', item: 'fibra' });
    expect(out.sceneToShow).toBeUndefined();
    expect(currentObjective(p.story, EP1)?.id).toBe('pegar-3');
    expect(p.story.episodes[1]?.progress ?? 0).toBe(0);
  });

  it('um evento cumpre no máximo o objetivo atual', () => {
    const twoCatches: Objective[] = [
      { id: 'a', text: 'Pegar 1 peixe', done: (e) => e.type === 'Caught', sceneOnDone: 'cena-a' },
      { id: 'b', text: 'Pegar mais 1', done: (e) => e.type === 'Caught', sceneOnDone: 'cena-b' },
    ];
    const ep = episode(1, twoCatches);
    const { p, out } = apply(newProfile(), caught('tilapia'), ep);
    expect(out.sceneToShow).toBe('cena-a');
    expect(currentObjective(p.story, ep)?.id).toBe('b');
  });
});

describe('campeonato', () => {
  it('CAMP-01: o torneio fica bloqueado até o último objetivo e liberado depois', () => {
    let p = newProfile();
    expect(isTournamentUnlocked(p.story, EP1)).toBe(false);
    for (const e of [caught('a'), caught('b'), caught('c'), { type: 'Bought', item: 'fibra' } as GameEvent]) {
      p = apply(p, e).p;
      expect(isTournamentUnlocked(p.story, EP1)).toBe(false);
    }
    p = { ...p, album: { tilapia: { recordKg: 1 }, lavinia: { recordKg: 0.8 } } };
    p = apply(p, caught('lavinia')).p;
    expect(isTournamentUnlocked(p.story, EP1)).toBe(true);
  });

  it('HIST-08: vencer o campeonato de um episódio de 1 a 4 mostra o encerramento e "Episódio N liberado!" com o N seguinte', () => {
    for (const id of [1, 2, 3, 4] as EpisodeId[]) {
      const ep = episode(id);
      const out = onEvent(allObjectivesDone(ep), { type: 'TournamentWon', id: `copa-${id}` }, ep);
      expect(out.sceneToShow).toBe(`ep${id}-encerramento`);
      expect(out.notice).toBe(`Episódio ${id + 1} liberado!`);
      expect(out.progress.episodes[id]?.won).toBe(true);
    }
  });

  it('HIST-08: vencer de novo não repete o encerramento nem o aviso', () => {
    const { p } = apply(allObjectivesDone(EP1), { type: 'TournamentWon', id: 'copa-1' });
    const again = onEvent(p, { type: 'TournamentWon', id: 'copa-1' }, EP1);
    expect(again.sceneToShow).toBeUndefined();
    expect(again.notice).toBeUndefined();
  });

  it('HIST-08: a vitória só conta para o campeonato do próprio episódio', () => {
    const out = onEvent(allObjectivesDone(EP1), { type: 'TournamentWon', id: 'copa-2' }, EP1);
    expect(out.sceneToShow).toBeUndefined();
    expect(out.progress.episodes[1]?.won).toBe(false);
  });

  it('HIST-10: vencer a Copa Adilson Moscovits mostra o encerramento final e "A pescaria continua: todos os lugares seguem abertos"', () => {
    const ep5 = episode(5);
    const out = onEvent(allObjectivesDone(ep5), { type: 'TournamentWon', id: 'copa-5' }, ep5);
    expect(out.sceneToShow).toBe('ep5-encerramento');
    expect(out.notice).toBe('A pescaria continua: todos os lugares seguem abertos');
  });
});
