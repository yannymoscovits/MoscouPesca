// Único ponto que muda o estado do jogo (design.md, "GameController"): liga toques, tempo,
// história, tutorial, torneio, loja, álbum, salvamento e plataforma às funções do domínio.

import type {
  CharacterId,
  Difficulty,
  Episode,
  EpisodeContent,
  GameEvent,
  ItemId,
  LocationId,
  Point,
  Profile,
} from '../content/types';
import { record } from '../domain/album';
import { cast, press, rulesFor, tick as fishingTick, type FishingState, type TickContext } from '../domain/fishing';
import * as profiles from '../domain/profile';
import type { Rng } from '../domain/rng';
import { buy as shopBuy, equip as shopEquip } from '../domain/shop';
import { isTournamentUnlocked, onEvent } from '../domain/story';
import { applyVictory, recordCast, standings, start as startTournament } from '../domain/tournament';
import * as tutorials from '../domain/tutorial';
import { episodeAt, onChampionshipWon, shopItems, travel as worldTravel } from '../domain/world';
import type { BrowserApi } from '../platform/browser';
import { requestPersistence, type SaveService } from '../platform/save';
import { createStore, initialState, type GameState, type GameStore } from './store';

/** Ponta da vara na cena lógica de 180 × 400 px (spec, "Tamanho da cena"): de onde a isca sai. */
export const ROD_TIP: Point = { x: 90, y: 370 };
/** PESCA-07 */
export const BITE_VIBRATION_MS = 300;

export interface GameController {
  /** Abre a pesca no local atual: envia GameStarted (abertura do episódio) e começa o tutorial se faltar. */
  openFishing(): void;
  /** Toque na água, em px lógicos da cena: arremessa (PESCA-01, PESCA-02). */
  tapWater(x: number, y: number): void;
  /** Dedo na tela: fisga na mordida (PESCA-08) e recolhe na briga (PESCA-10). */
  pressStart(): void;
  /** Dedo fora da tela (PESCA-11). */
  pressEnd(): void;
  /** Chamado pelo GameLoop, com dt em segundos. */
  tick(dt: number): void;
  /** Fecha a ficha ou o aviso do resultado e volta para `Idle`. */
  dismissResult(): void;
  pause(): void;
  resume(): void;
  /** Próxima fala da cena pendente; depois da última, fecha a cena (HIST-03). */
  advanceDialog(): void;
  /** HUMOR-01: o cartão de apresentação do personagem foi visto; não aparece de novo. */
  introduce(id: CharacterId): void;
  dismissNotice(): void;
  dismissSaveWarning(): void;
  buy(itemId: ItemId): void;
  equip(itemId: ItemId): void;
  enterTournament(): void;
  retryTournament(): void;
  dismissTournamentResult(): void;
  setDifficulty(d: Difficulty): void;
  setVibration(on: boolean): void;
  /** TUTO-09: o tutorial começa de novo na próxima pescaria. */
  resetTutorial(): void;
  travel(location: LocationId): void;
}

export interface ControllerDeps {
  store: GameStore;
  save: Pick<SaveService, 'save'>;
  platform: Pick<BrowserApi, 'vibrate'>;
  episodes: EpisodeContent[];
  rng: Rng;
}

const isResult = (f: FishingState) => f.phase.startsWith('Result_');

export function createController({ store, save, platform, episodes, rng }: ControllerDeps): GameController {
  const allRods = episodes.flatMap((ep) => ep.rods);
  const allScenes = episodes.flatMap((ep) => ep.scenes);
  let warnedSave = false; // "Não consegui salvar" aparece uma vez por sessão
  let touched = false; // toque desde o último tick (TUTO-07)

  const get = store.getState;
  const episodeOf = (p: Profile) => episodeAt(p.currentLocation, episodes) ?? episodes[0];

  /** Grava o estado; com `persist`, salva o perfil (SAVE-04). */
  function commit(next: GameState, persist = false) {
    if (persist && !save.save(next.profile).ok && !warnedSave) {
      warnedSave = true;
      next = { ...next, saveWarning: true };
    }
    store.update(() => next);
  }

  /** Aplica um evento na história; o perfil já tem o efeito do evento (compra, álbum). */
  function story(s: GameState, e: GameEvent, ep: Episode = episodeOf(s.profile)): GameState {
    const out = onEvent(s.profile, e, ep);
    if (out.progress === s.profile.story && !out.notice) return s;
    const scene = out.sceneToShow;
    return {
      ...s,
      profile: { ...s.profile, story: scene ? { ...out.progress, pendingScene: scene } : out.progress },
      dialogLine: scene ? 0 : s.dialogLine,
      notice: out.notice ?? s.notice,
    };
  }

  function tickContext(s: GameState): TickContext {
    const ep = episodeOf(s.profile);
    const location = ep.locations.find((l) => l.id === s.profile.currentLocation) ?? ep.locations[0];
    const difficulty = s.profile.settings.difficulty ?? 'tranquilo';
    const rules = s.tutorial ? tutorials.rules(s.tutorial, difficulty) : rulesFor(difficulty);
    return { rng, rules, zones: location.zones, species: ep.species };
  }

  /** Fim do 8º arremesso: classificação e, na vitória, troféu, carta, cena e próximo episódio. */
  function finishTournament(s: GameState): GameState {
    const run = s.profile.tournament!;
    const ep = episodes.find((e) => e.tournament.id === run.id) ?? episodeOf(s.profile);
    const table = standings(run, ep.tournament);
    const won = table[0].isPlayer;
    let next: GameState = { ...s, profile: { ...s.profile, tournament: null }, tournamentResult: { standings: table, won } };
    if (!won) return next;
    next = { ...next, profile: applyVictory(next.profile, ep.tournament) };
    next = story(next, { type: 'TournamentWon', id: ep.tournament.id }, ep);
    return { ...next, profile: onChampionshipWon(next.profile, ep.id) };
  }

  /** O arremesso acabou: ficha credita o peixe (PESCA-17), álbum, tutorial, torneio e história. */
  function onResult(s: GameState, result: FishingState): GameState {
    let next = s;
    if (s.tutorial?.step === 'done' && !s.profile.tutorialDone) {
      next = { ...next, profile: { ...next.profile, tutorialDone: true } }; // TUTO-08
    }
    if (next.profile.tournament) {
      next = { ...next, profile: { ...next.profile, tournament: recordCast(next.profile.tournament, result) } };
    }
    if (result.phase === 'Result_Caught') {
      const { album, isNewRecord } = record(next.profile.album, result.species.id, result.kg);
      next = { ...next, newRecord: isNewRecord, profile: { ...next.profile, money: next.profile.money + result.value, album } };
      next = story(next, { type: 'Caught', species: result.species.id, kg: result.kg });
    }
    if (next.profile.tournament?.castsLeft === 0) next = finishTournament(next);
    return next;
  }

  /** Troca o estado da pesca, avançando o tutorial e tratando mordida e resultado. */
  function setFishing(s: GameState, fishing: FishingState, tutorial = s.tutorial): void {
    const prev = s.fishing;
    let next: GameState = { ...s, fishing, tutorial: tutorial && tutorials.onFishing(tutorial, fishing) };
    if (fishing.phase === 'Bite' && prev.phase !== 'Bite' && s.profile.settings.vibration) {
      platform.vibrate(BITE_VIBRATION_MS); // PESCA-07
    }
    const ended = isResult(fishing) && !isResult(prev);
    if (ended) next = onResult(next, fishing);
    commit(next, ended);
  }

  /** A cena da história vem antes da pesca, e a pausa congela tudo (SAVE-01). */
  const blocked = (s: GameState) => s.paused || s.profile.story.pendingScene !== null;

  function changeProfile(fn: (p: Profile) => Profile) {
    const s = get();
    const profile = fn(s.profile);
    if (profile !== s.profile) commit({ ...s, profile }, true);
  }

  function enterTournament() {
    const s = get();
    const ep = episodeOf(s.profile);
    if (s.profile.tournament || !isTournamentUnlocked(s.profile.story, ep)) return;
    commit({ ...s, tournamentResult: null, profile: { ...s.profile, tournament: startTournament(ep.tournament) } }, true);
  }

  return {
    openFishing() {
      const s = get();
      let next = story(s, { type: 'GameStarted' }); // HIST-01, HIST-09
      const tutorial = s.profile.tutorialDone ? null : (s.tutorial ?? tutorials.start()); // TUTO-01
      next = { ...next, tutorial };
      commit(next, next.profile !== s.profile);
    },

    tapWater(x, y) {
      touched = true;
      const s = get();
      if (blocked(s) || s.fishing.phase !== 'Idle') return; // PESCA-03
      const p = s.profile;
      const rod = allRods.find((r) => r.id === p.rods.equipped) ?? allRods[0];
      setFishing(s, cast(s.fishing, { x, y }, { origin: ROD_TIP, rod, bait: p.baits.equipped }));
    },

    pressStart() {
      touched = true;
      const s = get();
      if (blocked(s)) return;
      const held = { ...s, holding: true };
      if (s.fishing.phase === 'Bite') setFishing(held, press(s.fishing, tickContext(s)));
      else store.update(() => held);
    },

    pressEnd() {
      if (get().holding) store.update((s) => ({ ...s, holding: false }));
    },

    tick(dt) {
      const s = get();
      if (blocked(s)) return;
      const wasTouched = touched || s.holding;
      touched = false;
      const fishing = fishingTick(s.fishing, dt, { holding: s.holding }, tickContext(s));
      const tutorial = s.tutorial && tutorials.tick(tutorials.onFishing(s.tutorial, fishing), dt, wasTouched);
      if (fishing === s.fishing && tutorial === s.tutorial) return;
      setFishing(s, fishing, tutorial);
    },

    dismissResult() {
      const s = get();
      if (!isResult(s.fishing)) return;
      const tutorial = s.tutorial?.step === 'done' ? null : s.tutorial;
      store.update(() => ({ ...s, fishing: { phase: 'Idle' }, newRecord: false, tutorial }));
    },

    pause() {
      store.update((s) => ({ ...s, paused: true, holding: false }));
    },

    resume() {
      store.update((s) => ({ ...s, paused: false }));
    },

    advanceDialog() {
      const s = get();
      const id = s.profile.story.pendingScene;
      if (id === null) return;
      const lines = allScenes.find((sc) => sc.id === id)?.lines.length ?? 0;
      if (s.dialogLine + 1 < lines) {
        store.update(() => ({ ...s, dialogLine: s.dialogLine + 1 }));
        return;
      }
      commit({ ...s, dialogLine: 0, profile: { ...s.profile, story: { ...s.profile.story, pendingScene: null } } }, true);
    },

    introduce: (id) => changeProfile((p) => profiles.introduceCharacter(p, id)),

    dismissNotice() {
      store.update((s) => ({ ...s, notice: null }));
    },

    dismissSaveWarning() {
      store.update((s) => ({ ...s, saveWarning: false }));
    },

    buy(itemId) {
      const s = get();
      const { rods, baits } = shopItems(s.profile, episodes); // EQUIP-09
      const item = [...rods, ...baits].find((i) => i.id === itemId);
      if (!item) return;
      const profile = shopBuy(s.profile, item); // EQUIP-03, EQUIP-06
      if (profile === s.profile) return;
      commit(story({ ...s, profile }, { type: 'Bought', item: itemId }), true);
    },

    equip: (itemId) => changeProfile((p) => shopEquip(p, itemId)),

    enterTournament,

    retryTournament: enterTournament, // CAMP-09: tentativas ilimitadas, sem custo

    dismissTournamentResult() {
      store.update((s) => ({ ...s, tournamentResult: null }));
    },

    setDifficulty: (d) => changeProfile((p) => profiles.setDifficulty(p, d)),

    setVibration: (on) => changeProfile((p) => profiles.setVibration(p, on)),

    resetTutorial() {
      changeProfile(profiles.resetTutorial);
      store.update((s) => ({ ...s, tutorial: null }));
    },

    travel(location) {
      const s = get();
      const profile = worldTravel(s.profile, location, episodes); // EPI-04, EPI-07
      if (profile === s.profile) return;
      commit({ ...s, profile, fishing: { phase: 'Idle' }, holding: false }, true);
    },
  };
}

export interface BootDeps {
  save: SaveService;
  platform: Pick<BrowserApi, 'vibrate' | 'onVisibilityChange'>;
  episodes: EpisodeContent[];
  rng: Rng;
  persist?: () => Promise<boolean>;
}

/** Abre o jogo: carrega o salvamento (SAVE-05 a SAVE-08), pede armazenamento persistente e pausa ao ocultar. */
export function bootGame({ save, platform, episodes, rng, persist = requestPersistence }: BootDeps) {
  const { profile, source } = save.load();
  const store = createStore(initialState(profile)); // a pesca volta para Idle (SAVE-06)
  const controller = createController({ store, save, platform, episodes, rng });
  if (source === 'new') void persist(); // SAVE-10
  platform.onVisibilityChange((v) => {
    if (v === 'hidden') controller.pause(); // SAVE-01
  });
  return { store, controller };
}
