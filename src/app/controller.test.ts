import { describe, expect, it, vi } from 'vitest';
import { episodes } from '../content';
import { ep1 } from '../content/episodes/ep1';
import { ep3 } from '../content/episodes/ep3';
import type { EpisodeContent, Profile } from '../content/types';
import type { FishingState } from '../domain/fishing';
import { newProfile } from '../domain/profile';
import type { Rng } from '../domain/rng';
import { createSaveService, type SaveOutcome, type SaveService } from '../platform/save';
import { bootGame, createController } from './controller';
import { createStore, initialState } from './store';

/**
 * Sorteio previsível: mordida no início da janela, peso no mínimo da faixa e,
 * entre as espécies que podem morder, a pedida (ou a primeira).
 */
function scriptedRng(speciesId?: string): Rng {
  return {
    next: () => 0,
    range: (min) => min,
    pick: (weighted) => (weighted.find((w) => (w.item as { id?: string }).id === speciesId) ?? weighted[0]).item,
  };
}

/** Perfil que já viu a abertura e passou do tutorial, no Tranquilo. */
function played(over: Partial<Profile> = {}): Profile {
  const p = newProfile();
  return {
    ...p,
    settings: { difficulty: 'tranquilo', vibration: true },
    tutorialDone: true,
    story: { ...p.story, scenesSeen: [ep1.chapter.openingScene] },
    ...over,
  };
}

/** Pronto para o campeonato do Episódio 1: todos os objetivos cumpridos. */
function tournamentReady(over: Partial<Profile> = {}): Profile {
  const p = played(over);
  return {
    ...p,
    story: { ...p.story, episodes: { 1: { objectiveIndex: ep1.chapter.objectives.length, progress: 0, won: false } } },
  };
}

function setup(profile: Profile, opts: { species?: string; saveOk?: boolean } = {}) {
  const store = createStore(initialState(profile));
  const saved: Profile[] = [];
  const save = {
    save: vi.fn((p: Profile): SaveOutcome => {
      saved.push(p);
      return opts.saveOk === false ? { ok: false } : { ok: true };
    }),
  };
  const platform = { vibrate: vi.fn() };
  const controller = createController({ store, save, platform, episodes, rng: scriptedRng(opts.species) });
  const state = () => store.getState();
  const lastSaved = () => saved[saved.length - 1];

  function tickUntil(phase: FishingState['phase'], maxS = 60) {
    for (let t = 0; t < maxS && state().fishing.phase !== phase; t += 0.1) controller.tick(0.1);
    expect(state().fishing.phase).toBe(phase);
  }

  /** Toca na água, espera a mordida, fisga e segura até pegar. */
  function catchFish(at = { x: 90, y: 300 }) {
    controller.tapWater(at.x, at.y);
    tickUntil('Bite');
    controller.pressStart();
    tickUntil('Result_Caught');
    controller.pressEnd();
    return state().fishing as Extract<FishingState, { phase: 'Result_Caught' }>;
  }

  /** Arremessa fora de qualquer zona: nada morde e a isca volta em 15 s. */
  function castNothing() {
    controller.tapWater(90, 365);
    tickUntil('Result_Nothing');
  }

  return { store, save, saved, lastSaved, platform, controller, state, tickUntil, catchFish, castNothing };
}

/** Armazenamento de mentira com só o que o SaveService usa. */
function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('pesca', () => {
  it('PESCA-17: a ficha exibida soma Math.round(kg × preço/kg) ao saldo uma vez só', () => {
    const g = setup(played({ money: 10 }), { species: 'tilapia' });

    const card = g.catchFish();
    const credited = 10 + Math.round(card.kg * card.species.pricePerKg);
    expect(g.state().profile.money).toBe(credited);

    for (let i = 0; i < 20; i++) g.controller.tick(0.1); // a ficha continua aberta
    expect(g.state().profile.money).toBe(credited);
  });

  it('PESCA-17: fechar a ficha volta a pesca para Idle sem creditar de novo', () => {
    const g = setup(played({ money: 10 }), { species: 'tilapia' });
    g.catchFish();
    const money = g.state().profile.money;

    g.controller.dismissResult();

    expect(g.state().fishing).toEqual({ phase: 'Idle' });
    expect(g.state().profile.money).toBe(money);
  });

  it('PESCA-09: resultado sem peixe também volta para Idle ao fechar, pronto para arremessar', () => {
    const g = setup(played());
    g.castNothing();

    g.controller.dismissResult();
    g.controller.tapWater(90, 300);

    expect(g.state().fishing.phase).toBe('Flying');
  });

  it('PESCA-07: mordida com a vibração ligada chama vibrate(300) uma vez', () => {
    const g = setup(played());
    g.controller.tapWater(90, 300);
    g.tickUntil('Bite');
    for (let i = 0; i < 5; i++) g.controller.tick(0.1);

    expect(g.platform.vibrate).toHaveBeenCalledTimes(1);
    expect(g.platform.vibrate).toHaveBeenCalledWith(300);
  });

  it('PESCA-07: mordida com a vibração desligada não vibra', () => {
    const g = setup(played({ settings: { difficulty: 'tranquilo', vibration: false } }));
    g.controller.tapWater(90, 300);
    g.tickUntil('Bite');

    expect(g.platform.vibrate).not.toHaveBeenCalled();
  });
});

describe('SAVE-04: salva depois de cada peixe, compra, objetivo e arremesso de torneio', () => {
  it('peixe → salva o saldo e o álbum com o peixe', () => {
    const g = setup(played({ money: 10 }), { species: 'tilapia' });
    const card = g.catchFish();

    expect(g.lastSaved().money).toBe(10 + Math.round(card.kg * card.species.pricePerKg));
    expect(g.lastSaved().album.tilapia).toEqual({ recordKg: card.kg });
  });

  it('compra → salva o item comprado e o saldo descontado', () => {
    const g = setup(played({ money: 100 }));
    g.controller.buy('milho');

    expect(g.lastSaved().baits.owned).toContain('milho');
    expect(g.lastSaved().money).toBe(100 - 30);
  });

  it('objetivo → salva o objetivo seguinte e a cena dele', () => {
    const g = setup(played({ story: { episodes: { 1: { objectiveIndex: 0, progress: 2, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null } }));
    g.catchFish();

    expect(g.lastSaved().story.episodes[1]).toEqual({ objectiveIndex: 1, progress: 0, won: false });
    expect(g.lastSaved().story.pendingScene).toBe('ep1-piranha');
  });

  it('arremesso de torneio → salva o arremesso gasto', () => {
    const g = setup(tournamentReady());
    g.controller.enterTournament();
    expect(g.lastSaved().tournament).toEqual({ id: 'guanambicup', castsLeft: 8, catches: [] });

    g.castNothing();

    expect(g.lastSaved().tournament?.castsLeft).toBe(7);
  });

  it('falha ao salvar → aviso "Não consegui salvar" uma vez só na sessão; o jogo segue', () => {
    const g = setup(played({ money: 100 }), { saveOk: false });

    g.controller.buy('milho');
    expect(g.state().saveWarning).toBe(true);
    expect(g.state().profile.baits.owned).toContain('milho');

    g.controller.dismissSaveWarning();
    g.controller.buy('carne');
    expect(g.state().saveWarning).toBe(false);
  });
});

describe('SAVE-06: jogo fechado no meio de uma briga', () => {
  it('reabre em Idle e sem gastar o arremesso do torneio', () => {
    const storage = memoryStorage();
    const platform = { vibrate: vi.fn(), onVisibilityChange: () => () => {} };
    const boot = () =>
      bootGame({ save: createSaveService(storage), platform, episodes, rng: scriptedRng('tilapia'), persist: async () => true });
    createSaveService(storage).save(tournamentReady());

    const first = boot();
    first.controller.enterTournament();
    first.controller.tapWater(90, 300);
    for (let t = 0; t < 10 && first.store.getState().fishing.phase !== 'Bite'; t += 0.1) first.controller.tick(0.1);
    first.controller.pressStart();
    first.controller.tick(0.5);
    expect(first.store.getState().fishing.phase).toBe('Fight');

    const reopened = boot(); // o Android matou o app na briga

    expect(reopened.store.getState().fishing).toEqual({ phase: 'Idle' });
    expect(reopened.store.getState().profile.tournament).toEqual({ id: 'guanambicup', castsLeft: 8, catches: [] });
  });
});

describe('TUTO-08: peixe do tutorial', () => {
  it('encerra o tutorial e conta no objetivo "pegar 3 peixes"', () => {
    const g = setup({ ...newProfile(), settings: { difficulty: 'desafio', vibration: true } }, { species: 'tilapia' });
    g.controller.openFishing();
    while (g.state().profile.story.pendingScene) g.controller.advanceDialog();
    expect(g.state().tutorial?.step).toBe('cast');

    g.catchFish();

    expect(g.state().tutorial?.step).toBe('done');
    expect(g.state().profile.tutorialDone).toBe(true);
    expect(g.state().profile.story.episodes[1]).toEqual({ objectiveIndex: 0, progress: 1, won: false });
    expect(g.lastSaved().tutorialDone).toBe(true);
  });
});

describe('história', () => {
  it('HIST-01: abrir a pesca pela primeira vez mostra a abertura antes de pescar, uma vez só', () => {
    const g = setup({ ...newProfile(), settings: { difficulty: 'tranquilo', vibration: true } });

    g.controller.openFishing();
    expect(g.state().profile.story.pendingScene).toBe('ep1-abertura');
    expect(g.state().dialogLine).toBe(0);

    g.controller.tapWater(90, 300); // a cena vem antes da pesca
    expect(g.state().fishing.phase).toBe('Idle');

    const lines = ep1.scenes.find((s) => s.id === 'ep1-abertura')!.lines.length;
    for (let i = 1; i < lines; i++) {
      g.controller.advanceDialog();
      expect(g.state().dialogLine).toBe(i);
    }
    g.controller.advanceDialog();
    expect(g.state().profile.story.pendingScene).toBeNull();
    expect(g.lastSaved().story.pendingScene).toBeNull();

    g.controller.openFishing();
    expect(g.state().profile.story.pendingScene).toBeNull();
  });

  it('HUMOR-01: apresentar um personagem guarda o cartão como visto e salva', () => {
    const g = setup(played());

    g.controller.introduce('jane');
    expect(g.state().profile.charactersIntroduced).toEqual(['jane']);
    expect(g.lastSaved().charactersIntroduced).toEqual(['jane']);

    g.controller.introduce('jane');
    expect(g.state().profile.charactersIntroduced).toEqual(['jane']);
  });

  it('HIST-09: primeira pescaria no local de um episódio liberado mostra a abertura dele', () => {
    const g = setup(played({ unlockedEpisodes: [1, 2] }));

    g.controller.travel('rio-jacuipe');
    g.controller.openFishing();

    expect(g.state().profile.story.pendingScene).toBe('ep2-abertura');
    expect(g.lastSaved().currentLocation).toBe('rio-jacuipe');
  });

  it('HIST-05: a compra já vale no perfil quando a história confere o objetivo', () => {
    const p = played({ money: 150 });
    const g = setup({ ...p, story: { ...p.story, episodes: { 1: { objectiveIndex: 1, progress: 0, won: false } } } });

    g.controller.buy('fibra');

    expect(g.state().profile.story.episodes[1]?.objectiveIndex).toBe(2);
    expect(g.state().profile.story.pendingScene).toBe('ep1-loja');
  });

  it('HIST-05: o peixe já está no álbum quando a história confere o álbum completo', () => {
    const p = played();
    const album = Object.fromEntries(ep1.species.filter((s) => s.id !== 'tilapia').map((s) => [s.id, { recordKg: 1 }]));
    const g = setup(
      { ...p, album, story: { ...p.story, episodes: { 1: { objectiveIndex: 5, progress: 0, won: false } } } },
      { species: 'tilapia' },
    );

    g.catchFish();

    expect(g.state().profile.story.episodes[1]?.objectiveIndex).toBe(6);
    expect(g.state().profile.story.pendingScene).toBe('ep1-album');
  });
});

describe('torneio', () => {
  it('vitória: troféu, carta, Episódio 2 liberado, cena de encerramento e aviso', () => {
    const g = setup(
      tournamentReady({
        rods: { owned: ['bambu', 'carbono'], equipped: 'carbono' },
        baits: { owned: ['minhoca', 'carne'], equipped: 'carne' },
      }),
      { species: 'pirarucu-lendario' },
    );
    g.controller.enterTournament();

    for (let i = 0; i < 8; i++) {
      g.catchFish({ x: 90, y: 140 }); // fundo da represa
      g.controller.dismissResult();
    }

    const s = g.state();
    expect(s.tournamentResult?.won).toBe(true);
    expect(s.tournamentResult?.standings[0].isPlayer).toBe(true);
    expect(s.profile.trophies).toEqual(['trofeu-guanambicup']);
    expect(s.profile.messagesUnlocked).toEqual(['carta-guanambicup']);
    expect(s.profile.unlockedEpisodes).toEqual([1, 2]);
    expect(s.profile.tournament).toBeNull();
    expect(s.profile.story.pendingScene).toBe('ep1-vitoria');
    expect(s.notice).toBe('Episódio 2 liberado!');
    expect(g.lastSaved()).toEqual(s.profile);
  });

  it('CAMP-09: derrota mostra a classificação; tentar de novo começa outro torneio sem mexer no saldo', () => {
    const g = setup(tournamentReady({ money: 77 }));
    g.controller.enterTournament();

    for (let i = 0; i < 8; i++) {
      g.castNothing();
      g.controller.dismissResult();
    }

    expect(g.state().tournamentResult?.won).toBe(false);
    expect(g.state().tournamentResult?.standings).toHaveLength(4);
    expect(g.state().profile.trophies).toEqual([]);

    g.controller.retryTournament();

    expect(g.state().tournamentResult).toBeNull();
    expect(g.state().profile.tournament).toEqual({ id: 'guanambicup', castsLeft: 8, catches: [] });
    expect(g.state().profile.money).toBe(77);
  });
});

describe('abertura do jogo', () => {
  const platform = () => {
    let onVis: (v: 'hidden' | 'visible') => void = () => {};
    return {
      vibrate: vi.fn(),
      onVisibilityChange: (cb: typeof onVis) => {
        onVis = cb;
        return () => {};
      },
      hide: () => onVis('hidden'),
    };
  };

  it('SAVE-10: primeira abertura pede armazenamento persistente', () => {
    const persist = vi.fn(async () => true);
    bootGame({ save: createSaveService(memoryStorage()), platform: platform(), episodes, rng: scriptedRng(), persist });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('SAVE-10: com jogo salvo, não pede de novo', () => {
    const storage = memoryStorage();
    createSaveService(storage).save(played());
    const persist = vi.fn(async () => true);
    bootGame({ save: createSaveService(storage), platform: platform(), episodes, rng: scriptedRng(), persist });
    expect(persist).not.toHaveBeenCalled();
  });

  it('SAVE-01: página oculta pausa na hora e congela a pesca', () => {
    const storage = memoryStorage();
    createSaveService(storage).save(played());
    const pl = platform();
    const { store, controller } = bootGame({
      save: createSaveService(storage) as SaveService,
      platform: pl,
      episodes,
      rng: scriptedRng(),
      persist: async () => true,
    });
    controller.tapWater(90, 300);
    controller.tick(0.1);
    const flying = store.getState().fishing;

    pl.hide();
    controller.tick(0.1);

    expect(store.getState().paused).toBe(true);
    expect(store.getState().fishing).toBe(flying);
  });
});

// SPEC_DEVIATION: o Episódio 5 só entra no conteúdo na Fase 9 (T59).
// Reason: até lá, um Episódio 5 de teste prova o caminho do GameController na vitória da final (HIST-10).
describe('HIST-10: vitória na Copa Adilson Moscovits (Episódio 5 de teste)', () => {
  const ep5: EpisodeContent = {
    ...ep3,
    id: 5,
    locations: ep3.locations.map((l) => ({ ...l, id: 'alto-mar-teste' })),
    chapter: { ...ep3.chapter, openingScene: 'ep5-abertura', closingScene: 'ep5-encerramento' },
    scenes: [
      { id: 'ep5-abertura', lines: [{ speaker: 'jane', text: 'Abertura de teste.' }] },
      { id: 'ep5-encerramento', lines: [{ speaker: 'jane', text: 'Encerramento de teste.' }] },
    ],
    tournament: {
      ...ep3.tournament,
      id: 'copa-adilson-moscovits',
      name: 'Copa Adilson Moscovits',
      trophy: 'trofeu-copa-adilson-moscovits',
      message: 'carta-copa-adilson-moscovits',
    },
    letter: { ...ep3.letter, id: 'carta-copa-adilson-moscovits' },
  };

  it('primeira vitória: encerramento final, aviso "A pescaria continua: todos os lugares seguem abertos" e carta', () => {
    const best = Math.max(...ep5.tournament.rivals.map((r) => r.kg));
    const profile: Profile = {
      ...played(),
      unlockedEpisodes: [1, 2, 3, 4, 5],
      currentLocation: 'alto-mar-teste',
      story: {
        episodes: { 5: { objectiveIndex: ep5.chapter.objectives.length, progress: 0, won: false } },
        scenesSeen: ['ep5-abertura'],
        pendingScene: null,
      },
      tournament: { id: ep5.tournament.id, castsLeft: 1, catches: [{ species: ep5.species[0].id, kg: best + 1 }] },
    };
    const store = createStore(initialState(profile));
    const controller = createController({
      store,
      save: { save: () => ({ ok: true }) },
      platform: { vibrate: () => {} },
      episodes: [...episodes, ep5],
      rng: scriptedRng(),
    });

    controller.tapWater(90, 365); // fora das zonas: o último arremesso volta sem peixe
    for (let t = 0; t < 20 && store.getState().fishing.phase !== 'Result_Nothing'; t += 0.1) controller.tick(0.1);

    const s = store.getState();
    expect(s.tournamentResult?.won).toBe(true);
    expect(s.profile.story.pendingScene).toBe('ep5-encerramento');
    expect(s.notice).toBe('A pescaria continua: todos os lugares seguem abertos');
    expect(s.profile.messagesUnlocked).toEqual(['carta-copa-adilson-moscovits']);
    expect(s.profile.unlockedEpisodes).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('viagem com cena pendente (T62)', () => {
  /** Episódio 1 vencido, Jacuípe liberado e a cena da vitória ainda por ver. */
  const afterVictory = (over: Partial<Profile> = {}) =>
    played({
      unlockedEpisodes: [1, 2],
      story: {
        episodes: { 1: { objectiveIndex: ep1.chapter.objectives.length, progress: 0, won: true } },
        scenesSeen: ['ep1-abertura', 'ep1-vitoria'],
        pendingScene: 'ep1-vitoria',
      },
      ...over,
    });

  it('viajar e abrir a pesca não descarta a cena pendente; a abertura do novo episódio vem depois dela', () => {
    const g = setup(afterVictory());
    g.controller.travel('rio-jacuipe');
    g.controller.openFishing();
    expect(g.state().profile.story.pendingScene).toBe('ep1-vitoria');

    const lines = ep1.scenes.find((s) => s.id === 'ep1-vitoria')!.lines.length;
    for (let i = 0; i < lines; i++) g.controller.advanceDialog();

    expect(g.state().profile.story.pendingScene).toBe('ep2-abertura'); // HIST-09
    expect(g.state().profile.story.scenesSeen).toEqual(['ep1-abertura', 'ep1-vitoria', 'ep2-abertura']);
    expect(g.lastSaved().story.pendingScene).toBe('ep2-abertura');
  });

  it('com o aviso "Episódio 2 liberado!" ainda na tela, a abertura espera o aviso fechar', () => {
    const g = setup(afterVictory());
    g.store.update((s) => ({ ...s, notice: 'Episódio 2 liberado!' }));
    g.controller.travel('rio-jacuipe');
    g.controller.openFishing();
    const lines = ep1.scenes.find((s) => s.id === 'ep1-vitoria')!.lines.length;
    for (let i = 0; i < lines; i++) g.controller.advanceDialog();
    expect(g.state().profile.story.pendingScene).toBeNull();
    expect(g.state().notice).toBe('Episódio 2 liberado!');

    g.controller.dismissNotice();
    expect(g.state().notice).toBeNull();
    expect(g.state().profile.story.pendingScene).toBe('ep2-abertura');
  });

  it('no mesmo episódio, fechar a cena não traz abertura nenhuma', () => {
    const g = setup(afterVictory());
    g.controller.openFishing();
    const lines = ep1.scenes.find((s) => s.id === 'ep1-vitoria')!.lines.length;
    for (let i = 0; i < lines; i++) g.controller.advanceDialog();
    expect(g.state().profile.story.pendingScene).toBeNull();
  });
});
