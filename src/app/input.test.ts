import { describe, expect, it, vi } from 'vitest';
import type { FishingState } from '../domain/fishing';
import { attachInput } from './input';

function setup(phase: FishingState['phase'] = 'Idle') {
  const el = document.createElement('div');
  const controller = { pressStart: vi.fn(), pressEnd: vi.fn(), tapWater: vi.fn() };
  const state = { fishing: { phase } as FishingState };
  // Conversão de mentira: px da tela ÷ 2, como na escala 2× sem margem.
  const toLogical = vi.fn((x: number, y: number) => ({ x: x / 2, y: y / 2 }));
  const detach = attachInput(el, { controller, getState: () => state, toLogical });
  const pointer = (type: string, pointerId: number, clientX = 0, clientY = 0) =>
    el.dispatchEvent(new PointerEvent(type, { pointerId, clientX, clientY, bubbles: true, cancelable: true }));
  return { el, controller, state, toLogical, detach, pointer };
}

describe('InputController', () => {
  it('pointerdown vira pressStart e pointerup vira pressEnd', () => {
    const { controller, pointer } = setup('Fight');

    pointer('pointerdown', 1);
    expect(controller.pressStart).toHaveBeenCalledTimes(1);
    pointer('pointerup', 1);
    expect(controller.pressEnd).toHaveBeenCalledTimes(1);
    expect(controller.tapWater).not.toHaveBeenCalled(); // na briga, soltar não arremessa
  });

  it('pointerup em Idle vira tapWater no ponto lógico da cena', () => {
    const { controller, pointer } = setup('Idle');

    pointer('pointerdown', 1, 180, 600);
    pointer('pointerup', 1, 180, 600);

    expect(controller.tapWater).toHaveBeenCalledTimes(1);
    expect(controller.tapWater).toHaveBeenCalledWith(90, 300);
  });

  it('ACES-09: o segundo dedo é ignorado enquanto o primeiro está na tela', () => {
    const { controller, pointer } = setup('Fight');

    pointer('pointerdown', 1);
    pointer('pointerdown', 2);
    pointer('pointerup', 2);
    expect(controller.pressStart).toHaveBeenCalledTimes(1);
    expect(controller.pressEnd).not.toHaveBeenCalled();

    pointer('pointerup', 1);
    expect(controller.pressEnd).toHaveBeenCalledTimes(1);
  });

  it('ACES-09: depois que o primeiro dedo sai, o próximo toque vale', () => {
    const { controller, pointer } = setup('Fight');

    pointer('pointerdown', 1);
    pointer('pointerup', 1);
    pointer('pointerdown', 2);

    expect(controller.pressStart).toHaveBeenCalledTimes(2);
  });

  it('PESCA-11: dedo cancelado pelo sistema conta como dedo fora da tela, sem arremessar', () => {
    const { controller, pointer } = setup('Idle');

    pointer('pointerdown', 1);
    pointer('pointercancel', 1);

    expect(controller.pressEnd).toHaveBeenCalledTimes(1);
    expect(controller.tapWater).not.toHaveBeenCalled();
  });

  it('ACES-09: o menu do toque longo é cancelado', () => {
    const { el } = setup();
    const e = new Event('contextmenu', { cancelable: true });

    el.dispatchEvent(e);

    expect(e.defaultPrevented).toBe(true);
  });

  it('ACES-09: a área de toque não rola nem dá zoom', () => {
    expect(setup().el.style.touchAction).toBe('none');
  });
});
