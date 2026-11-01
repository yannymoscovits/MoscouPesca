import { describe, expect, it, vi } from 'vitest';
import { episodes } from '../content';
import { ep1 } from '../content/episodes/ep1';
import { ep5 } from '../content/episodes/ep5';
import type { Profile } from '../content/types';
import type { PescaState } from '../domain/pesca';
import { newProfile } from '../domain/profile';
import { createRng, type Rng } from '../domain/rng';
import { sightOf, typicalPlayer } from '../domain/sim/typicalPlayer';
import { goalId } from '../domain/medals';
import { createSaveService, CURRENT_KEY, type SaveOutcome, type SaveService } from '../platform/save';
import { bootGame, createController } from './controller';
import { createStore, initialState } from './store';

/**
 * Sorteio previsível: todo sorteio no começo da faixa (peixes juntos, ataque em 2 s, peixe calmo parado
 * na briga) e, entre as espécies do ponto, a pedida (ou a primeira).
 * `share` (0 a 1) leva só o peso do peixe pedido para dentro da faixa dele: 1 dá o peso máximo.
 */
function scriptedRng(speciesId?: string, share = 0): Rng {
  const kg = episodes.flatMap((ep) => ep.species).find((sp) => sp.id === speciesId)?.kg;
  return {
    next: () => 0,
    range: (min, max) => (kg && min === kg.min && max === kg.max ? min + (max - min) * share : min),
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

function setup(profile: Profile, opts: { species?: string; saveOk?: boolean; share?: number } = {}) {
  const store = createStore(initialState(profile));
  const saved: Profile[] = [];
  const save = {
    save: vi.fn((p: Profile): SaveOutcome => {
      saved.push(p);
      return opts.saveOk === false ? { ok: false } : { ok: true };
    }),
  };
  const platform = { vibrate: vi.fn() };
  const controller = createController({ store, save, platform, episodes, rng: scriptedRng(opts.species, opts.share) });
  const state = () => store.getState();
  const lastSaved = () => saved[saved.length - 1];

  function tickUntil(phase: PescaState['phase'], maxS = 120) {
    for (let t = 0; t < maxS && state().fishing.phase !== phase; t += DT) controller.tick(DT);
    expect(state().fishing.phase).toBe(phase);
  }

  /** O ponto, se a pesca ainda está no pesqueiro. */
  function at(spot: string) {
    if (state().spot === null) controller.chooseSpot(spot);
    expect(state().spot).toBe(spot);
  }

  /** Mira numa sombra do cardume como o jogador típico e espera a isca na água, com peixe por perto. */
  function castNow() {
    const player = typicalPlayer(createRng(1), controller.rules());
    for (let t = 0; t < 60 && state().fishing.phase !== 'Lure'; t += DT) {
      const input = player(state().fishing, DT, sightOf(state()));
      if (input.button) controller.pressButton(input.button);
      controller.tick(DT);
    }
    expect(state().fishing.phase).toBe('Lure');
  }

  /** O jogador típico da simulação (SIMB-02) joga o arremesso inteiro até o resultado. */
  function playCast(maxS = 300) {
    const player = typicalPlayer(createRng(1), controller.rules());
    for (let t = 0; t < maxS && !state().fishing.phase.startsWith('Result_'); t += DT) {
      const s = state();
      const input = player(s.fishing, DT, sightOf(s));
      if (input.holding !== s.holding) (input.holding ? controller.holdStart : controller.holdEnd)();
      if (input.button) controller.pressButton(input.button);
      controller.tick(DT);
    }
  }

  /** No ponto (o raso, se nenhum for dado), joga o arremesso e pega o peixe. */
  function catchFish(spot = 'raso') {
    at(spot);
    playCast();
    expect(state().fishing.phase).toBe('Result_Caught');
    return state().fishing as Extract<PescaState, { phase: 'Result_Caught' }>;
  }

  /** Arremessa e recolhe sem nunca fisgar: quem ataca escapa e a isca chega ao Adilson (ISCA-11, ISCA-12). */
  function castNothing(spot = 'raso') {
    at(spot);
    castNow();
    controller.holdStart();
    tickUntil('Result_Nothing', 300);
    controller.holdEnd();
  }

  return { store, save, saved, lastSaved, platform, controller, state, tickUntil, at, castNow, playCast, catchFish, castNothing };
}

const DT = 0.1;

/** Armazenamento de mentira com só o que o SaveService usa. */
function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('pesca', () => {
  it('PESCA-17: o peixe pego não mexe no saldo', () => {
    const g = setup(played({ money: 10 }), { species: 'tilapia' });

    g.catchFish();
    expect(g.state().profile.money).toBe(10);

    for (let i = 0; i < 20; i++) g.controller.tick(0.1); // a ficha continua aberta
    expect(g.state().profile.money).toBe(10);
  });

  it('PESCA-17: fechar a ficha volta a mirar no mesmo ponto, com o saldo igual', () => {
    const g = setup(played({ money: 10 }), { species: 'tilapia' });
    g.catchFish();

    g.controller.dismissResult();

    expect(g.state().fishing).toEqual({ phase: 'Aim', sinceS: 0 });
    expect(g.state().spot).toBe('raso');
    expect(g.state().profile.money).toBe(10);
  });

  it('ISCA-12: resultado sem peixe também volta ao arremesso ao fechar, pronto para arremessar', () => {
    const g = setup(played());
    g.castNothing();

    g.controller.dismissResult();
    g.controller.pressButton('arremessar');

    expect(g.state().fishing.phase).toBe('Power');
  });

  it('ISCA-09: ataque com a vibração ligada chama vibrate(300) uma vez', () => {
    const g = setup(played());
    g.at('raso');
    g.castNow();
    g.controller.holdStart();
    g.tickUntil('Strike');
    for (let i = 0; i < 5; i++) g.controller.tick(0.1);

    expect(g.platform.vibrate).toHaveBeenCalledTimes(1);
    expect(g.platform.vibrate).toHaveBeenCalledWith(300);
  });

  it('ISCA-09: ataque com a vibração desligada não vibra', () => {
    const g = setup(played({ settings: { difficulty: 'tranquilo', vibration: false } }));
    g.at('raso');
    g.castNow();
    g.controller.holdStart();
    g.tickUntil('Strike');

    expect(g.platform.vibrate).not.toHaveBeenCalled();
  });
});

describe('pesqueiro e botões', () => {
  it('Lavínia registrada não reaparece ao trocar de ponto ou carregar o perfil', () => {
    const profile = played({
      rods: { owned: ['bambu', 'fibra'], equipped: 'fibra' },
      album: { 'piranha-lavinia': { recordKg: 0.8 } },
    });
    for (const g of [setup(profile, { species: 'piranha-lavinia' }), setup(profile, { species: 'piranha-lavinia' })]) {
      for (const spot of ['raso', 'meio']) {
        g.controller.chooseSpot(spot);
        expect(g.state().school!.fish.some(f => f.species.id === 'piranha-lavinia')).toBe(false);
        g.controller.tick(60);
        expect(g.state().school!.fish.some(f => f.species.id === 'piranha-lavinia')).toBe(false);
        g.controller.leaveSpot();
      }
    }
  });
  it('HIST-13: o lendário sai do cardume já montado quando é pego e quando a copa começa', () => {
    const objective = ep1.chapter.objectives.findIndex((o) => o.id === 'pegar-pirarucu');
    const hunting = played({
      rods: { owned: ['bambu', 'fibra', 'carbono'], equipped: 'carbono' },
      baits: { owned: ['minhoca', 'carne'], equipped: 'carne' },
      story: { ...played().story, episodes: { 1: { objectiveIndex: objective, progress: 0, won: false } } },
    });
    const hasLegend = (g: ReturnType<typeof setup>) => g.state().school!.fish.some((f) => f.species.id === 'pirarucu-lendario');

    const caught = setup(hunting);
    caught.controller.chooseSpot('fundo');
    expect(hasLegend(caught)).toBe(true);
    caught.store.update((s) => ({ ...s, profile: { ...s.profile, album: { 'pirarucu-lendario': { recordKg: 90 } } } }));
    caught.controller.tick(60);
    expect(hasLegend(caught)).toBe(false);

    const cup = setup(hunting);
    cup.controller.chooseSpot('fundo');
    cup.store.update((s) => ({ ...s, profile: { ...s.profile, tournament: { id: ep1.tournament.id, castsLeft: 5, catches: [] } } }));
    cup.controller.tick(60);
    expect(hasLegend(cup)).toBe(false);
  });

  it('PONTO-03: ponto com cadeado (Fundão pede alcance 5, a Vara de Bambu tem 2) não abre o arremesso', () => {
    const g = setup(played());
    g.controller.chooseSpot('fundo');
    expect(g.state().spot).toBeNull();

    g.controller.chooseSpot('raso');
    expect(g.state().spot).toBe('raso');
    expect(g.state().fishing).toEqual({ phase: 'Aim', sinceS: 0 });
  });

  it('PONTO-05: "Trocar de ponto" volta ao pesqueiro na mira e na força; com a isca no ar, não', () => {
    const g = setup(played());
    g.at('raso');
    g.controller.leaveSpot();
    expect(g.state().spot).toBeNull();

    g.at('raso');
    g.controller.pressButton('arremessar');
    g.controller.leaveSpot();
    expect(g.state().spot).toBeNull();

    g.at('raso');
    g.controller.pressButton('arremessar');
    g.controller.pressButton('arremessar');
    g.controller.leaveSpot();
    expect(g.state().spot).toBe('raso');
    expect(g.state().fishing.phase).toBe('Flying');
  });

  it('BOTAO-03, ARREM-04: botão sem efeito não muda o estado (no pesqueiro e com a isca no ar)', () => {
    const g = setup(played());
    let before = g.state();
    g.controller.pressButton('arremessar');
    g.controller.pressButton('puxar');
    expect(g.state()).toBe(before);

    g.at('raso');
    g.controller.pressButton('arremessar');
    g.controller.pressButton('arremessar');
    before = g.state();
    g.controller.pressButton('arremessar');
    g.controller.pressButton('puxar');
    expect(g.state()).toBe(before);
  });

  it('BRIGA-11, ISCA-12, BRIGA-10: no torneio, cada resultado gasta 1 arremesso (nada, peixe fugido e peixe)', () => {
    const g = setup(tournamentReady({ settings: { difficulty: 'desafio', vibration: true } }), { species: 'tilapia' });
    g.controller.enterTournament();

    g.castNothing();
    expect(g.state().profile.tournament?.castsLeft).toBe(7);
    g.controller.dismissResult();

    // Segurando SEGURAR, a faixa sobe e deixa no fundo o peixe calmo: o medidor zera no Desafio.
    g.castNow();
    g.controller.holdStart();
    g.tickUntil('Strike');
    g.controller.holdEnd();
    g.controller.pressButton('puxar');
    g.controller.holdStart();
    g.tickUntil('Result_Escaped');
    g.controller.holdEnd();

    expect(g.state().profile.tournament?.castsLeft).toBe(6);
    expect(g.state().profile.tournament?.catches).toEqual([]);
    g.controller.dismissResult();

    const fish = g.catchFish();
    expect(g.state().profile.tournament?.castsLeft).toBe(5);
    expect(g.state().profile.tournament?.catches).toEqual([{ species: 'tilapia', kg: fish.kg }]);
  });
});

describe('ACES-03: dificuldade trocada no meio da briga', () => {
  /** Arremessa, recolhe até o ataque e fisga; a briga começa com a dificuldade de agora. */
  function hook(g: ReturnType<typeof setup>) {
    g.at('raso');
    g.castNow();
    g.controller.holdStart();
    g.tickUntil('Strike');
    g.controller.holdEnd();
    g.controller.pressButton('puxar');
    expect(g.state().fishing.phase).toBe('Fight');
  }

  // Segurando SEGURAR o tempo todo, a faixa sobe e deixa no fundo o peixe calmo do sorteio previsível.
  it('trocar para o Tranquilo não salva a briga do Desafio; a briga seguinte já é do Tranquilo', () => {
    const g = setup(played({ settings: { difficulty: 'desafio', vibration: true } }), { species: 'tilapia' });
    hook(g);
    g.controller.setDifficulty('tranquilo');
    g.controller.holdStart();
    g.tickUntil('Result_Escaped', 30); // o medidor zera, como no Desafio
    g.controller.holdEnd();
    g.controller.dismissResult();

    hook(g);
    g.controller.holdStart();
    for (let i = 0; i < 300; i++) g.controller.tick(DT);
    const fishing = g.state().fishing as Extract<PescaState, { phase: 'Fight' }>;
    expect(fishing.phase).toBe('Fight'); // no Tranquilo o medidor para em 10%
    expect(fishing.bar.meter).toBeCloseTo(0.1, 9);
  });

  it('trocar para o Desafio não tira o piso de 10% da briga do Tranquilo', () => {
    const g = setup(played(), { species: 'tilapia' });
    hook(g);
    g.controller.setDifficulty('desafio');
    g.controller.holdStart();
    for (let i = 0; i < 300; i++) g.controller.tick(DT);
    const fishing = g.state().fishing as Extract<PescaState, { phase: 'Fight' }>;
    expect(fishing.phase).toBe('Fight');
    expect(fishing.bar.meter).toBeCloseTo(0.1, 9);
  });
});

describe('medalhas e metas', () => {
  const tilapia = ep1.species.find((sp) => sp.id === 'tilapia')!;
  /** Fração da faixa de peso da tilápia que cai entre dois limites de medalha. */
  const shareOf = (kg: number) => (kg - tilapia.kg.min) / (tilapia.kg.max - tilapia.kg.min);

  it('MEDAL-02: captura que alcança o bronze deixa a medalha no perfil salvo e na ficha', () => {
    const bronzeOnly = shareOf((tilapia.medals.bronze + tilapia.medals.prata) / 2);
    const g = setup(played(), { species: 'tilapia', share: bronzeOnly });

    const card = g.catchFish();
    expect(card.kg).toBeGreaterThanOrEqual(tilapia.medals.bronze);
    expect(card.kg).toBeLessThan(tilapia.medals.prata);
    expect(g.state().profile.medals.tilapia).toEqual(['bronze']);
    expect(g.state().awards?.medals).toEqual(['bronze']);
    expect(g.lastSaved().medals.tilapia).toEqual(['bronze']);
  });

  it('MEDAL-02, MEDAL-03: peixe no peso máximo dá as três; o seguinte, igual, não dá nenhuma de novo', () => {
    const g = setup(played(), { species: 'tilapia', share: 1 });

    g.catchFish();
    expect(g.state().awards?.medals).toEqual(['bronze', 'prata', 'ouro']);
    g.controller.dismissResult();
    expect(g.state().awards).toBeNull(); // a ficha fechou

    g.catchFish();
    expect(g.state().awards?.medals).toEqual([]);
    expect(g.state().profile.medals.tilapia).toEqual(['bronze', 'prata', 'ouro']);
  });

  it('MEDAL-04, MEDAL-05: a 10ª tilápia cumpre a meta de 10 uma vez só e gera o aviso, sem dinheiro', () => {
    const g = setup(played({ money: 100, catchCounts: { tilapia: 9 } }), { species: 'tilapia' });

    g.catchFish();
    expect(g.state().profile.catchCounts.tilapia).toBe(10);
    expect(g.state().profile.goalsDone).toEqual([goalId('tilapia', 10)]);
    expect(g.state().awards).toMatchObject({ goals: [10] });
    expect(g.state().profile.money).toBe(100);
    expect(g.lastSaved().goalsDone).toEqual([goalId('tilapia', 10)]);

    g.controller.dismissResult();
    g.catchFish(); // 11ª: nenhuma meta nova
    expect(g.state().awards).toMatchObject({ goals: [] });
    expect(g.state().profile.money).toBe(100);
    expect(g.state().profile.goalsDone).toEqual([goalId('tilapia', 10)]);
  });

  it('MEDAL-05: a meta de uma espécie do Episódio 2 conta igual', () => {
    const p = played({
      unlockedEpisodes: [1, 2],
      currentLocation: 'rio-jacuipe',
      rods: { owned: ['bambu', 'fibra'], equipped: 'fibra' }, // a beira do rio pede alcance 3
      catchCounts: { 'tilapia-jacuipe': 9 },
      story: { episodes: {}, scenesSeen: [ep1.chapter.openingScene, 'ep2-abertura'], pendingScene: null },
    });
    const g = setup(p, { species: 'tilapia-jacuipe' });
    g.catchFish('beira'); // a beira do rio
    expect(g.state().awards).toMatchObject({ goals: [10] });
  });

  it('MEDAL-07: medalhas, contagens e metas sobrevivem a salvar e recarregar', () => {
    const storage = memoryStorage();
    const boot = () =>
      bootGame({
        save: createSaveService(storage),
        platform: { vibrate: vi.fn(), onVisibilityChange: () => () => {} },
        episodes,
        rng: scriptedRng('tilapia', 1),
        persist: async () => true,
      });
    createSaveService(storage).save(played({ catchCounts: { tilapia: 9 } }));

    const first = boot();
    first.controller.chooseSpot('raso');
    const player = typicalPlayer(createRng(1), first.controller.rules());
    for (let t = 0; t < 300 && first.store.getState().fishing.phase !== 'Result_Caught'; t += DT) {
      const s = first.store.getState();
      const input = player(s.fishing, DT, sightOf(s));
      if (input.holding !== s.holding) (input.holding ? first.controller.holdStart : first.controller.holdEnd)();
      if (input.button) first.controller.pressButton(input.button);
      first.controller.tick(DT);
    }
    const before = first.store.getState().profile;
    expect(before.goalsDone).toEqual([goalId('tilapia', 10)]);

    const again = boot().store.getState().profile;
    expect(again.medals).toEqual({ tilapia: ['bronze', 'prata', 'ouro'] });
    expect(again.catchCounts).toEqual({ tilapia: 10 });
    expect(again.goalsDone).toEqual([goalId('tilapia', 10)]);
    expect(again.money).toBe(before.money);
  });

  it('MEDAL-07: perfil salvo antes das medalhas (sem os três campos) abre do salvamento, com eles vazios', () => {
    const storage = memoryStorage();
    const { medals: _m, catchCounts: _c, goalsDone: _g, ...old } = played({ money: 777 });
    storage.setItem(CURRENT_KEY, JSON.stringify(old));

    const { profile, source } = createSaveService(storage).load();
    expect(source).toBe('current');
    expect(profile.money).toBe(777);
    expect(profile.medals).toEqual({});
    expect(profile.catchCounts).toEqual({});
    expect(profile.goalsDone).toEqual([]);
  });
});

describe('SAVE-04: salva depois de cada peixe, compra, objetivo e arremesso de torneio', () => {
  it('peixe → salva o álbum com o peixe', () => {
    const g = setup(played({ money: 10 }), { species: 'tilapia' });
    const card = g.catchFish();

    expect(g.lastSaved().money).toBe(10);
    expect(g.lastSaved().album.tilapia).toEqual({ recordKg: card.kg });
  });

  it('compra → salva o item comprado e o saldo descontado', () => {
    const g = setup(played({ money: 100 }));
    g.controller.buy('milho');

    expect(g.lastSaved().baits.owned).toContain('milho');
    expect(g.lastSaved().money).toBe(100 - 30);
  });

  it('objetivo → salva o objetivo seguinte, a cena dele e o que ele pagou (HIST-11)', () => {
    const g = setup(played({ money: 10, story: { episodes: { 1: { objectiveIndex: 0, progress: 2, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null } }));
    g.catchFish();

    const paid = ep1.rods.find((r) => r.id === 'fibra')!.price; // o objetivo libera a Vara de Fibra e paga o preço dela
    expect(g.lastSaved().story.episodes[1]).toEqual({ objectiveIndex: 1, progress: 0, won: false });
    expect(g.lastSaved().story.pendingScene).toBe('ep1-loja');
    expect(g.lastSaved().money).toBe(10 + paid);
    expect(g.state().notice).toBe(`A família mandou R$ ${paid.toLocaleString('pt-BR')} para a loja!`);
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
  it('reabre no pesqueiro, sem arremesso e sem gastar o arremesso do torneio', () => {
    const storage = memoryStorage();
    const platform = { vibrate: vi.fn(), onVisibilityChange: () => () => {} };
    const boot = () =>
      bootGame({ save: createSaveService(storage), platform, episodes, rng: scriptedRng('tilapia'), persist: async () => true });
    createSaveService(storage).save(tournamentReady());

    const first = boot();
    first.controller.enterTournament();
    first.controller.chooseSpot('raso');
    first.controller.pressButton('arremessar');
    first.controller.pressButton('arremessar');
    first.controller.holdStart();
    for (let t = 0; t < 30 && first.store.getState().fishing.phase !== 'Strike'; t += 0.1) first.controller.tick(0.1);
    first.controller.holdEnd();
    first.controller.pressButton('puxar');
    first.controller.tick(0.5);
    expect(first.store.getState().fishing.phase).toBe('Fight');

    const reopened = boot(); // o Android matou o app na briga

    expect(reopened.store.getState().spot).toBeNull();
    expect(reopened.store.getState().fishing).toEqual({ phase: 'Aim', sinceS: 0 });
    expect(reopened.store.getState().profile.tournament).toEqual({ id: 'guanambicup', castsLeft: 8, catches: [] });
  });
});

describe('TUTO-08: peixe do tutorial', () => {
  it('encerra o tutorial e conta no objetivo "pegar 3 peixes"', () => {
    const g = setup({ ...newProfile(), settings: { difficulty: 'desafio', vibration: true } }, { species: 'tilapia' });
    g.controller.openFishing();
    while (g.state().profile.story.pendingScene) g.controller.advanceDialog();
    expect(g.state().tutorial?.step).toBe('ponto');

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

    g.controller.chooseSpot('raso'); // a cena vem antes da pesca
    expect(g.state().spot).toBeNull();
    expect(g.state().fishing).toEqual({ phase: 'Aim', sinceS: 0 });

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
    expect(g.state().profile.story.pendingScene).toBe('ep1-piranha');
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

  it('recupera objetivo do álbum já cumprido depois da cena anterior e salva o avanço', () => {
    const p = played();
    const g = setup({ ...p,
      album: Object.fromEntries(ep1.species.map(sp => [sp.id, { recordKg: sp.kg.min }])),
      story: { ...p.story, episodes: { 1: { objectiveIndex: 5, progress: 0, won: false } }, pendingScene: 'ep1-pegou-lenda' },
    });
    g.controller.openFishing();
    expect(g.state().profile.story.pendingScene).toBe('ep1-pegou-lenda');
    const previous = ep1.scenes.find(scene => scene.id === 'ep1-pegou-lenda')!;
    for (const _line of previous.lines) g.controller.advanceDialog();
    expect(g.state().profile.story.pendingScene).toBe('ep1-album');
    expect(g.state().profile.story.episodes[1]?.objectiveIndex).toBe(6);
    expect(g.lastSaved().story.episodes[1]?.objectiveIndex).toBe(6);
  });
});

describe('torneio', () => {
  it.each([8, 1])('captura com %i arremesso(s) restantes não gera dinheiro nem conta para as metas', castsLeft => {
    const g = setup(tournamentReady({
      money: 100, catchCounts: { tilapia: 9 },
      tournament: { id: 'guanambicup', castsLeft, catches: [] },
    }), { species: 'tilapia', share: 1 });
    const caught = g.catchFish();
    expect(g.state().profile.money).toBe(100);
    expect(g.lastSaved().money).toBe(100);
    expect(g.state().profile.catchCounts.tilapia).toBe(9);
    expect(g.state().profile.goalsDone).not.toContain(goalId('tilapia', 10));
    expect(g.state().awards).toMatchObject({ goals: [] });
    expect(g.state().profile.album.tilapia?.recordKg).toBe(caught.kg);
    expect(g.state().profile.medals.tilapia).toEqual(['bronze', 'prata', 'ouro']);
    expect(g.state().catchIsTournament).toBe(true);
    if (castsLeft === 1) expect(g.state().profile.tournament).toBeNull();
    else expect(g.state().profile.tournament?.catches[0].kg).toBe(caught.kg);
  });
  it('vitória: troféu, carta, Episódio 2 liberado, cena de encerramento e aviso', () => {
    const g = setup(
      tournamentReady({
        rods: { owned: ['bambu', 'carbono'], equipped: 'carbono' },
        baits: { owned: ['minhoca', 'milho'], equipped: 'milho' },
      }),
      { species: 'tambaqui', share: 1 },
    );
    g.controller.enterTournament();

    for (let i = 0; i < 8; i++) {
      g.controller.leaveSpot(); // volta ao pesqueiro e escolhe de novo: cardume cheio a cada arremesso
      g.catchFish('fundo'); // fundo da represa
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
    controller.chooseSpot('raso');
    controller.pressButton('arremessar');
    controller.pressButton('arremessar');
    controller.tick(0.1);
    const flying = store.getState().fishing;
    expect(flying.phase).toBe('Flying');

    pl.hide();
    controller.tick(0.1);

    expect(store.getState().paused).toBe(true);
    expect(store.getState().fishing).toBe(flying);
  });
});

// O Episódio 5 entrou no conteúdo em T59: o teste usa o episódio real em vez do Episódio 5 de teste.
describe('HIST-10: vitória na Copa Adilson Moscovits (Episódio 5)', () => {
  it('primeira vitória: encerramento final, aviso "A pescaria continua: todos os lugares seguem abertos" e carta', () => {
    const best = Math.max(...ep5.tournament.rivals.map((r) => r.kg));
    const profile: Profile = {
      ...played(),
      unlockedEpisodes: [1, 2, 3, 4, 5],
      currentLocation: ep5.locations[0].id,
      story: {
        episodes: { 5: { objectiveIndex: ep5.chapter.objectives.length, progress: 0, won: false } },
        scenesSeen: [ep5.chapter.openingScene],
        pendingScene: null,
      },
      tournament: { id: ep5.tournament.id, castsLeft: 1, catches: [{ species: ep5.species[0].id, kg: best + 1 }] },
    };
    const store = createStore(initialState(profile));
    const controller = createController({
      store,
      save: { save: () => ({ ok: true }) },
      platform: { vibrate: () => {} },
      episodes,
      rng: scriptedRng(),
    });

    // O último arremesso volta sem peixe: recolhe sem fisgar até a isca chegar ao Adilson.
    controller.chooseSpot(ep5.locations[0].zones[0].id);
    controller.pressButton('arremessar');
    controller.pressButton('arremessar');
    controller.holdStart();
    for (let t = 0; t < 300 && store.getState().fishing.phase !== 'Result_Nothing'; t += 0.1) controller.tick(0.1);
    expect(store.getState().fishing.phase).toBe('Result_Nothing');


    const s = store.getState();
    expect(s.tournamentResult?.won).toBe(true);
    expect(s.profile.story.pendingScene).toBe('ep5-final');
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

describe('SAVE-13: novo jogo', () => {
  it('apaga o progresso e salva o perfil novo, guardando dificuldade, vibração e a novidade vista', () => {
    const g = setup(
      played({
        money: 640,
        settings: { difficulty: 'desafio', vibration: false },
        seenVersion: '1.4.0',
        rods: { owned: ['bambu', 'fibra'], equipped: 'fibra' },
        album: { tilapia: { recordKg: 1.2 } },
        trophies: ['trofeu-guanambicup'],
        story: { episodes: { 1: { objectiveIndex: 3, progress: 0, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null },
      }),
      { species: 'tilapia' },
    );
    g.catchFish(); // com o pesqueiro escolhido e a ficha aberta

    g.controller.newGame();

    const fresh = { ...newProfile(), settings: { difficulty: 'desafio' as const, vibration: false }, seenVersion: '1.4.0' };
    expect(g.state().profile).toEqual(fresh);
    expect(g.lastSaved()).toEqual(fresh);
    expect(g.state().spot).toBeNull();
    expect(g.state().fishing.phase).toBe('Aim');
    expect(g.state().awards).toBeNull();
  });
});
