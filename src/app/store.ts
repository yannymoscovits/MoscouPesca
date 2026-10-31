// Estado do jogo e quem precisa saber quando ele muda (design.md, "GameStore").
// Só o GameController chama `update`; as telas leem com `useGame` e o desenho com `getState`.

import type { School } from '../domain/school';
import { createContext } from 'preact';
import { useContext, useEffect, useReducer, useRef } from 'preact/hooks';
import type { MedalTier, Profile } from '../content/types';
import { startPesca, type PescaState } from '../domain/pesca';
import type { Standing } from '../domain/tournament';
import type { TutorialPescaState } from '../domain/tutorialPesca';

export interface GameState {
  /** O que é salvo. A cena em exibição é `profile.story.pendingScene`. */
  profile: Profile;
  /** Arremesso atual. Não é salvo: reabrir o jogo volta ao pesqueiro, sem arremesso (SAVE-06). */
  fishing: PescaState;
  /** Ponto escolhido no pesqueiro (Zone.id do local atual); null mostra o pesqueiro. Não é salvo. */
  spot: string | null;
  /** Cardume do ponto escolhido: as sombras na mira e os peixes que a isca pode achar. Não é salvo. */
  school: School | null;
  /** Dedo segurando RECOLHER (na água) ou SEGURAR (na briga). */
  holding: boolean;
  /** Tutorial em andamento; null fora dele. */
  tutorial: TutorialPescaState | null;
  /** SAVE-01, SAVE-02: nada anda até o toque de "continuar". */
  paused: boolean;
  /** Fala atual da cena pendente (HIST-03). */
  dialogLine: number;
  /** A ficha em exibição é recorde da espécie (ALBUM-02). */
  newRecord: boolean;
  /** Medalhas novas, metas cumpridas (contagens) e a recompensa delas na ficha em exibição (MEDAL-02, MEDAL-05). */
  awards: { medals: MedalTier[]; goals: number[]; reward: number } | null;
  /** "Episódio N liberado!" ou o aviso final, depois da cena (HIST-08, HIST-10). */
  notice: string | null;
  /** Classificação do torneio que acabou de terminar (CAMP-05, CAMP-09). */
  tournamentResult: { standings: Standing[]; won: boolean } | null;
  /** "Não consegui salvar": liga na primeira falha da sessão. */
  saveWarning: boolean;
}

export function initialState(profile: Profile): GameState {
  return {
    profile,
    fishing: startPesca(),
    spot: null,
    school: null,
    holding: false,
    tutorial: null,
    paused: false,
    dialogLine: 0,
    newRecord: false,
    awards: null,
    notice: null,
    tournamentResult: null,
    saveWarning: false,
  };
}

// SPEC_DEVIATION: o design faz `update` agendar o salvamento.
// Reason: só o GameController sabe quais mudanças são eventos salváveis (SAVE-04); ele chama o SaveService.
export interface GameStore {
  getState(): GameState;
  update(fn: (s: GameState) => GameState): void;
  subscribe(listener: () => void): () => void;
}

export function createStore(initial: GameState): GameStore {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    update(fn) {
      state = fn(state);
      for (const l of [...listeners]) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const GameStoreContext = createContext<GameStore | null>(null);

/**
 * Lê uma parte do estado e re-renderiza só quando ela muda (comparação por `Object.is`).
 * O seletor deve devolver um valor simples ou uma referência que já existe no estado.
 */
export function useGame<T>(selector: (s: GameState) => T): T {
  const store = useContext(GameStoreContext);
  if (!store) throw new Error('useGame precisa de um GameStoreContext.Provider');
  const selected = selector(store.getState());
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const latest = useRef({ selector, selected });
  latest.current = { selector, selected };

  useEffect(() => {
    const check = () => {
      const { selector: sel, selected: last } = latest.current;
      if (!Object.is(sel(store.getState()), last)) rerender(undefined);
    };
    check(); // o estado pode ter mudado entre o render e a inscrição
    return store.subscribe(check);
  }, [store]);

  return selected;
}
