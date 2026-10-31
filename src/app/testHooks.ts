// Ganchos de teste `window.__mf`: só entram no build `vite build --mode e2e` (main.tsx),
// nunca no build de produção. Deixam o Playwright dirigir o jogo sem depender da sorte nem do relógio.

import type { PescaButton } from '../domain/pesca';
import { createRng, type Rng } from '../domain/rng';
import { typicalPlayer } from '../domain/sim/typicalPlayer';
import type { GameController } from './controller';
import type { GameState, GameStore } from './store';

/** Passo do relógio manual: o mesmo dos 30 quadros por segundo do desenho. */
export const STEP_S = 1 / 30;
/** Semente das escolhas do `autoplay` (força, fisgada): fixa, para o jogo sorteado pela `seed` decidir o resto. */
export const AUTOPLAY_SEED = 1;

export interface TestHooks {
  /** Troca o sorteio por um com semente fixa. */
  seed(n: number): void;
  /** 'manual': o GameLoop para de mover o jogo e só `advance` passa o tempo. 'real' volta ao normal. */
  clock(mode: 'manual' | 'real'): void;
  /** Avança o jogo tantos segundos, em passos de 1/30 s. */
  advance(seconds: number): void;
  /** Toque em ARREMESSAR ou PUXAR. */
  button(b: PescaButton): void;
  /** Dedo encostado (true) ou fora (false) de RECOLHER ou SEGURAR. */
  hold(on: boolean): void;
  /**
   * Joga o arremesso como o jogador típico da simulação (SIMB-02: mira, força, isca, fisgada e a
   * briga pela holdPolicy), em passos de 1/30 s, até um resultado ou `maxS` segundos. Devolve a fase.
   */
  autoplay(maxS?: number): string;
  /** Cópia do estado atual. */
  state(): GameState;
  /** Os comandos do jogo (comprar, entrar no torneio, avançar fala…). */
  controller: GameController;
}

declare global {
  interface Window {
    __mf?: TestHooks;
  }
}

export function installTestHooks(target: Window, game: { store: GameStore; controller: GameController; rng: Rng }) {
  const { store, controller, rng } = game;
  const realTick = controller.tick;
  let manual = false;
  controller.tick = (dt) => {
    if (!manual) realTick(dt);
  };

  target.__mf = {
    seed: (n) => void Object.assign(rng, createRng(n)),
    clock: (mode) => void (manual = mode === 'manual'),
    advance(seconds) {
      for (let t = 0; t < seconds - 1e-9; t += STEP_S) realTick(Math.min(STEP_S, seconds - t));
    },
    button: (b) => controller.pressButton(b),
    hold: (on) => (on ? controller.holdStart() : controller.holdEnd()),
    autoplay(maxS = 120) {
      // A mesma ordem da simulação: o jogador decide vendo o passo atual, aperta e o tempo passa.
      const player = typicalPlayer(createRng(AUTOPLAY_SEED), controller.rules());
      for (let t = 0; t < maxS && !store.getState().fishing.phase.startsWith('Result_'); t += STEP_S) {
        const s = store.getState();
        const input = player(s.fishing, STEP_S);
        if (input.holding !== s.holding) (input.holding ? controller.holdStart : controller.holdEnd)();
        if (input.button) controller.pressButton(input.button);
        realTick(STEP_S);
      }
      return store.getState().fishing.phase;
    },
    state: () => JSON.parse(JSON.stringify(store.getState())) as GameState,
    controller,
  };
}
