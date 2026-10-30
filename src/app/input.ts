// Toques viram comandos do jogo (design.md, "InputController"): tocar, segurar e soltar; nunca gestos.
// Só o primeiro dedo vale (ACES-09).

import type { Point } from '../content/types';
import type { GameController } from './controller';
import type { GameState } from './store';

export interface InputDeps {
  controller: Pick<GameController, 'pressStart' | 'pressEnd' | 'tapWater'>;
  getState: () => Pick<GameState, 'fishing'>;
  /** Tela → cena lógica (FishingRenderer.toLogical). */
  toLogical: (clientX: number, clientY: number) => Point;
}

/** Liga os toques do elemento da cena; devolve a função que desliga. */
export function attachInput(el: HTMLElement, { controller, getState, toLogical }: InputDeps): () => void {
  let active: number | null = null; // o dedo que vale

  const down = (e: PointerEvent) => {
    if (active !== null) return; // segundo dedo
    active = e.pointerId;
    try {
      el.setPointerCapture?.(e.pointerId); // o soltar chega mesmo fora da cena
    } catch {
      // ponteiro que já saiu: segue sem captura
    }
    controller.pressStart();
  };

  const up = (e: PointerEvent) => {
    if (e.pointerId !== active) return;
    active = null;
    controller.pressEnd();
    if (getState().fishing.phase !== 'Idle') return;
    const p = toLogical(e.clientX, e.clientY);
    controller.tapWater(p.x, p.y);
  };

  const cancel = (e: PointerEvent) => {
    if (e.pointerId !== active) return;
    active = null;
    controller.pressEnd();
  };

  const noMenu = (e: Event) => e.preventDefault();

  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('contextmenu', noMenu);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', cancel);
    el.removeEventListener('contextmenu', noMenu);
  };
}
