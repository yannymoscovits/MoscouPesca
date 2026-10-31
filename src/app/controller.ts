// Único ponto que muda o estado do jogo (design.md, "GameController"): liga botões, tempo,
// história, tutorial, torneio, loja, álbum, salvamento e plataforma às funções do domínio.
// A pescaria é a da pesca-bass: pesqueiro, arremesso, isca debaixo d'água e barra de captura.

import type {
  CharacterId,
  Difficulty,
  Episode,
  EpisodeContent,
  GameEvent,
  ItemId,
  LocationId,
  Profile,
} from '../content/types';
import { goals } from '../content/goals';
import { record } from '../domain/album';
import { goalId, onCatch } from '../domain/medals';
import {
  press as pescaPress,
  rulesFor,
  startPesca,
  tick as pescaTick,
  type PescaButton,
  type PescaContext,
  type PescaRules,
  type PescaState,
} from '../domain/pesca';
import * as profiles from '../domain/profile';
import type { Rng } from '../domain/rng';
import { buy as shopBuy, equip as shopEquip } from '../domain/shop';
import { spotsFor } from '../domain/spots';
import { isTournamentUnlocked, onEvent } from '../domain/story';
import { applyVictory, recordCast, standings, start as startTournament } from '../domain/tournament';
import * as tutorials from '../domain/tutorialPesca';
import { episodeAt, onChampionshipWon, shopItems, travel as worldTravel } from '../domain/world';
import type { BrowserApi } from '../platform/browser';
import { requestPersistence, type SaveService } from '../platform/save';
import { createStore, initialState, type GameState, type GameStore } from './store';

/** ISCA-09: vibração no ataque do peixe. */
export const STRIKE_VIBRATION_MS = 300;

export interface GameController {
  /** Abre a pesca no local atual: envia GameStarted (abertura do episódio) e começa o tutorial se faltar. */
  openFishing(): void;
  /** PONTO-04: "Pescar aqui" abre o arremesso no ponto do local atual; ponto com cadeado não abre (PONTO-03). */
  chooseSpot(spotId: string): void;
  /** PONTO-05: "Trocar de ponto" volta ao pesqueiro; só antes de a isca sair da mão. */
  leaveSpot(): void;
  /** ARREMESSAR ou PUXAR, no encostar do dedo (BOTAO-04); sem efeito na fase, nada muda (BOTAO-03). */
  pressButton(b: PescaButton): void;
  /** Dedo encostou em RECOLHER (na água) ou SEGURAR (na briga). */
  holdStart(): void;
  /** Dedo saiu de RECOLHER ou SEGURAR. */
  holdEnd(): void;
  /** Regras da pescaria agora: as da dificuldade ou as folgadas do tutorial. */
  rules(): PescaRules;
  /** Chamado pelo GameLoop, com dt em segundos. */
  tick(dt: number): void;
  /** Fecha a ficha ou o aviso do resultado e volta a mirar no mesmo ponto. */
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
  /** INST-07: guarda a versão do jogo já vista, para a novidade aparecer uma vez só. */
  markVersionSeen(version: string): void;
}

export interface ControllerDeps {
  store: GameStore;
  save: Pick<SaveService, 'save'>;
  platform: Pick<BrowserApi, 'vibrate'>;
  episodes: EpisodeContent[];
  rng: Rng;
}

/** Como um arremesso termina: peixe pego, peixe fugido ou nada dessa vez. */
type PescaResult = Extract<PescaState, { phase: `Result_${string}` }>;
const isResult = (f: PescaState): f is PescaResult => f.phase.startsWith('Result_');

export function createController({ store, save, platform, episodes, rng }: ControllerDeps): GameController {
  const allRods = episodes.flatMap((ep) => ep.rods);
  const rodOf = (p: Profile) => allRods.find((r) => r.id === p.rods.equipped) ?? allRods[0];
  /** Episódio dono da espécie: a recompensa das metas cresce por episódio (MEDAL-05). */
  const episodeOfSpecies = (id: string) => episodes.find((ep) => ep.species.some((sp) => sp.id === id)) ?? episodes[0];
  const allScenes = episodes.flatMap((ep) => ep.scenes);
  let warnedSave = false; // "Não consegui salvar" aparece uma vez por sessão
  let touched = false; // toque desde o último tick (TUTO-07)
  let fightRules: PescaRules | null = null; // ACES-03: as regras do começo da briga em andamento

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

  function place(s: GameState) {
    const ep = episodeOf(s.profile);
    return { ep, location: ep.locations.find((l) => l.id === s.profile.currentLocation) ?? ep.locations[0] };
  }

  /** TUTOB-02 a TUTOB-04 no tutorial; fora dele, as regras da dificuldade. */
  function rulesOf(s: GameState): PescaRules {
    const difficulty = s.profile.settings.difficulty ?? 'tranquilo';
    return s.tutorial ? tutorials.rules(s.tutorial, difficulty) : rulesFor(difficulty);
  }

  /** ACES-03: trocar a dificuldade no meio da briga só vale a partir da briga seguinte. */
  const rulesNow = (s: GameState) => (s.fishing.phase === 'Fight' && fightRules ? fightRules : rulesOf(s));

  /** O arremesso no ponto escolhido; sem ponto (no pesqueiro), não há arremesso. */
  function pescaContext(s: GameState): PescaContext | null {
    const { ep, location } = place(s);
    const spot = location.zones.find((z) => z.id === s.spot);
    if (!spot) return null;
    return { rod: rodOf(s.profile), bait: s.profile.baits.equipped, rng, rules: rulesNow(s), spot, species: ep.species };
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
  function onResult(s: GameState, result: PescaResult): GameState {
    let next = s;
    if (s.tutorial?.step === 'done' && !s.profile.tutorialDone) {
      next = { ...next, profile: { ...next.profile, tutorialDone: true } }; // TUTO-08
    }
    if (next.profile.tournament) {
      // Cada resultado (peixe, peixe fugido ou nada) gasta 1 dos arremessos do torneio.
      next = { ...next, profile: { ...next.profile, tournament: recordCast(next.profile.tournament, result) } };
    }
    if (result.phase === 'Result_Caught') {
      const { species, kg } = result;
      const { album, isNewRecord } = record(next.profile.album, species.id, kg);
      const paid = { ...next.profile, money: next.profile.money + result.value, album };
      // MEDAL-02 a MEDAL-05: medalhas, contagem e metas, com a recompensa já no saldo.
      const won = onCatch(paid, species, kg, goals, episodeOfSpecies(species.id).id);
      const counts = goals.counts.filter((c) => won.goalsDone.includes(goalId(species.id, c)));
      next = { ...next, newRecord: isNewRecord, awards: { medals: won.medals, goals: counts, reward: won.reward }, profile: won.profile };
      next = story(next, { type: 'Caught', species: species.id, kg });
    }
    if (next.profile.tournament?.castsLeft === 0) next = finishTournament(next);
    return next;
  }

  /** Troca o estado da pesca, avançando o tutorial e tratando ataque e resultado. */
  function setFishing(s: GameState, fishing: PescaState, tutorial = s.tutorial): void {
    const prev = s.fishing;
    if (fishing.phase !== 'Fight') fightRules = null;
    else if (prev.phase !== 'Fight') fightRules = rulesOf(s);
    let next: GameState = { ...s, fishing, tutorial: tutorial && tutorials.onPesca(tutorial, fishing, s.spot !== null) };
    if (fishing.phase === 'Strike' && prev.phase !== 'Strike' && s.profile.settings.vibration) {
      platform.vibrate(STRIKE_VIBRATION_MS); // ISCA-09
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

  /**
   * HIST-09: a abertura do episódio do local atual, na primeira pescaria nele. Nunca por cima de uma
   * cena ou de um aviso que ainda não foram vistos: a abertura vem depois deles.
   */
  function opening(s: GameState): GameState {
    if (s.profile.story.pendingScene !== null || s.notice !== null) return s;
    return story(s, { type: 'GameStarted' });
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
      // HIST-01, HIST-09. Uma cena pendente (ex.: viajar pelo Mapa no meio de "ep1-vitoria") não é trocada.
      let next = opening(s);
      const tutorial = s.profile.tutorialDone ? null : (s.tutorial ?? tutorials.start()); // TUTO-01
      next = { ...next, tutorial };
      commit(next, next.profile !== s.profile);
    },

    chooseSpot(spotId) {
      touched = true;
      const s = get();
      if (blocked(s) || s.spot !== null) return;
      const { ep, location } = place(s);
      const view = spotsFor(location, rodOf(s.profile), ep.species, s.profile.album).find((v) => v.id === spotId);
      if (!view || view.locked) return; // PONTO-03
      const fishing = startPesca();
      commit({ ...s, spot: spotId, fishing, holding: false, tutorial: s.tutorial && tutorials.onPesca(s.tutorial, fishing, true) });
    },

    leaveSpot() {
      touched = true;
      const s = get();
      if (blocked(s) || s.spot === null || (s.fishing.phase !== 'Aim' && s.fishing.phase !== 'Power')) return;
      const fishing = startPesca();
      commit({ ...s, spot: null, fishing, holding: false, tutorial: s.tutorial && tutorials.onPesca(s.tutorial, fishing, false) });
    },

    pressButton(b) {
      touched = true;
      const s = get();
      const ctx = pescaContext(s);
      if (blocked(s) || !ctx) return;
      const fishing = pescaPress(s.fishing, b, ctx);
      if (fishing !== s.fishing) setFishing(s, fishing); // BOTAO-03: sem efeito, nada muda
    },

    holdStart() {
      touched = true;
      const s = get();
      if (!blocked(s) && !s.holding) store.update(() => ({ ...s, holding: true }));
    },

    holdEnd() {
      if (get().holding) store.update((s) => ({ ...s, holding: false }));
    },

    rules: () => rulesNow(get()),

    tick(dt) {
      const s = get();
      if (blocked(s)) return; // PAUSA-01: pausado, peixes, isca, faixa, medidor e janelas param
      const wasTouched = touched || s.holding;
      touched = false;
      const ctx = pescaContext(s);
      const fishing = ctx ? pescaTick(s.fishing, dt, { holding: s.holding }, ctx) : s.fishing;
      const tutorial = s.tutorial && tutorials.tick(tutorials.onPesca(s.tutorial, fishing, s.spot !== null), dt, wasTouched);
      if (fishing === s.fishing && tutorial === s.tutorial) return;
      setFishing(s, fishing, tutorial);
    },

    dismissResult() {
      const s = get();
      if (!isResult(s.fishing)) return;
      const tutorial = s.tutorial?.step === 'done' ? null : s.tutorial;
      store.update(() => ({ ...s, fishing: startPesca(), holding: false, newRecord: false, awards: null, tutorial }));
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
      const done = { ...s, dialogLine: 0, profile: { ...s.profile, story: { ...s.profile.story, pendingScene: null } } };
      commit(opening(done), true); // a abertura que esperava esta cena (HIST-09)
    },

    introduce: (id) => changeProfile((p) => profiles.introduceCharacter(p, id)),

    dismissNotice() {
      const s = get();
      const next = opening({ ...s, notice: null }); // a abertura que esperava o aviso (HIST-09)
      commit(next, next.profile !== s.profile);
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
      commit({ ...s, profile, fishing: startPesca(), spot: null, holding: false }, true);
    },

    markVersionSeen: (version) => changeProfile((p) => (p.seenVersion === version ? p : { ...p, seenVersion: version })),
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
  const store = createStore(initialState(profile)); // volta ao pesqueiro, sem arremesso (SAVE-06)
  const controller = createController({ store, save, platform, episodes, rng });
  if (source === 'new') void persist(); // SAVE-10
  platform.onVisibilityChange((v) => {
    if (v === 'hidden') controller.pause(); // SAVE-01
  });
  return { store, controller };
}
