// Ganchos de teste `window.__mf`: só entram no build `vite build --mode e2e` (main.tsx),
// nunca no build de produção. Deixam o Playwright dirigir o jogo sem depender da sorte nem do relógio.

import { createRng, type Rng } from '../domain/rng';
import type { GameController } from './controller';
import type { GameState, GameStore } from './store';

/** Passo do relógio manual: o mesmo dos 30 quadros por segundo do desenho. */
const STEP_S = 1 / 30;

export interface TestHooks {
  /** Troca o sorteio por um com semente fixa. */
  seed(n: number): void;
  /** 'manual': o GameLoop para de mover o jogo e só `advance` passa o tempo. 'real' volta ao normal. */
  clock(mode: 'manual' | 'real'): void;
  /** Avança o jogo tantos segundos, em passos de 1/30 s. */
  advance(seconds: number): void;
  /** Toque na água em px lógicos da cena (180 × 400). */
  tap(x: number, y: number): void;
  /** Dedo na tela e fora dela. */
  press(): void;
  release(): void;
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
    tap: (x, y) => controller.tapWater(x, y),
    press: () => controller.pressStart(),
    release: () => controller.pressEnd(),
    state: () => JSON.parse(JSON.stringify(store.getState())) as GameState,
    controller,
  };
}
