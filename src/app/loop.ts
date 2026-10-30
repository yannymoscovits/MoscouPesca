// Laço do jogo (design.md, "GameLoop"): chama `tick(dt)` a cada quadro e o desenho a até
// 30 quadros por segundo, para poupar bateria. Pausado, para de vez (SAVE-01).

/** Maior passo de tempo: voltar de uma pausa ou de um engasgo não pula a briga. */
export const MAX_DT_S = 0.1;
export const DRAW_FPS = 30;
const DRAW_INTERVAL_MS = 1000 / DRAW_FPS;
/** Folga para quadros que chegam um pouco antes da hora (60 Hz não é exato). */
const DRAW_SLACK_MS = 1;

export interface LoopDeps {
  tick(dt: number): void;
  draw(t: number): void; // t em segundos, para as animações
  isPaused(): boolean;
  raf?: (cb: FrameRequestCallback) => number;
  caf?: (handle: number) => void;
}

export interface GameLoop {
  /** Começa ou retoma; chamar de novo com o laço rodando não faz nada. */
  start(): void;
  stop(): void;
}

export function createLoop({
  tick,
  draw,
  isPaused,
  raf = (cb) => requestAnimationFrame(cb),
  caf = (h) => cancelAnimationFrame(h),
}: LoopDeps): GameLoop {
  let handle: number | null = null;
  let last: number | null = null;
  let lastDraw: number | null = null;

  function frame(ms: number) {
    handle = null;
    if (isPaused()) {
      last = null; // parada total; `start` retoma sem contar o tempo parado
      return;
    }
    if (last !== null) tick(Math.min((ms - last) / 1000, MAX_DT_S));
    last = ms;
    if (lastDraw === null || ms - lastDraw >= DRAW_INTERVAL_MS - DRAW_SLACK_MS) {
      draw(ms / 1000);
      lastDraw = ms;
    }
    handle = raf(frame);
  }

  return {
    start() {
      if (handle !== null) return;
      last = null;
      lastDraw = null;
      handle = raf(frame);
    },
    stop() {
      if (handle !== null) caf(handle);
      handle = null;
      last = null;
    },
  };
}
