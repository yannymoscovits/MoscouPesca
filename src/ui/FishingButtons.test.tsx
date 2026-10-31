// Botões da pescaria (pesca-bass T11; BOTAO-01 a BOTAO-05, ISCA-08): quais aparecem em cada fase, o
// toque no encostar, o segurar até soltar e o dedo só. Tamanho e lugar na tela ficam no e2e da troca.
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PescaState } from '../domain/pesca';
import { FishingButtons } from './FishingButtons';

type Phase = PescaState['phase'];

const roots: HTMLElement[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) act(() => render(null, root));
});

function setup(phase: Phase) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  roots.push(root);
  const props = { onButton: vi.fn(), onHoldStart: vi.fn(), onHoldEnd: vi.fn() };
  const show = (p: Phase) => act(() => render(<FishingButtons phase={p} {...props} />, root));
  show(phase);
  const buttons = () => [...root.querySelectorAll('button')];
  const button = (id: string) => root.querySelector<HTMLButtonElement>(`[data-button="${id}"]`)!;
  const pointer = (target: EventTarget, type: string, pointerId: number) =>
    act(() => {
      target.dispatchEvent(new PointerEvent(type, { pointerId, bubbles: true, cancelable: true }));
    });
  return { root, ...props, show, buttons, button, pointer };
}

const view = (b: HTMLButtonElement) => ({
  id: b.dataset.button,
  text: b.textContent,
  enabled: !b.disabled,
  wide: b.classList.contains('pesca-btn--wide'),
});

describe('botões de cada fase', () => {
  it.each<Phase>(['Aim', 'Power'])('BOTAO-02: em %s, só ARREMESSAR, na largura dos dois', (phase) => {
    expect(setup(phase).buttons().map(view)).toEqual([{ id: 'arremessar', text: 'ARREMESSAR', enabled: true, wide: true }]);
  });

  it('BOTAO-01: com a isca na água, RECOLHER à esquerda e PUXAR à direita, cada um em metade da fileira', () => {
    expect(setup('Lure').buttons().map(view)).toEqual([
      { id: 'recolher', text: 'RECOLHER', enabled: true, wide: false },
      { id: 'puxar', text: 'PUXAR', enabled: true, wide: false },
    ]);
  });

  it('ISCA-08: no ataque, PUXAR vira "FISGAR!" e pisca; RECOLHER fica apagado', () => {
    const { buttons, button } = setup('Strike');
    expect(buttons().map(view)).toEqual([
      { id: 'recolher', text: 'RECOLHER', enabled: false, wide: false },
      { id: 'puxar', text: 'FISGAR!', enabled: true, wide: false },
    ]);
    expect(button('puxar').classList.contains('pesca-btn--alert')).toBe(true);
  });

  it('ISCA-08: fora do ataque, PUXAR não pisca', () => {
    expect(setup('Lure').button('puxar').classList.contains('pesca-btn--alert')).toBe(false);
  });

  it('BOTAO-05: na briga, só SEGURAR, na largura dos dois', () => {
    expect(setup('Fight').buttons().map(view)).toEqual([{ id: 'segurar', text: 'SEGURAR', enabled: true, wide: true }]);
  });

  it('BOTAO-03, ARREM-04: com a isca em voo, tudo apagado', () => {
    const { buttons } = setup('Flying');
    expect(buttons().length).toBeGreaterThan(0);
    expect(buttons().every((b) => b.disabled)).toBe(true);
  });

  it.each<Phase>(['Result_Caught', 'Result_Escaped', 'Result_Nothing'])('no fim do arremesso (%s), nenhum botão', (phase) => {
    expect(setup(phase).buttons()).toEqual([]);
  });
});

describe('toques', () => {
  it('BOTAO-04: ARREMESSAR responde quando o dedo encosta, sem esperar soltar', () => {
    const { button, pointer, onButton } = setup('Aim');
    pointer(button('arremessar'), 'pointerdown', 1);
    expect(onButton).toHaveBeenCalledTimes(1);
    expect(onButton).toHaveBeenCalledWith('arremessar');
  });

  it('BOTAO-04: PUXAR dá o tranco no encostar; no ataque, fisga no encostar', () => {
    const { button, pointer, onButton, show } = setup('Lure');
    pointer(button('puxar'), 'pointerdown', 1);
    pointer(button('puxar'), 'pointerup', 1);
    show('Strike');
    pointer(button('puxar'), 'pointerdown', 2);
    expect(onButton.mock.calls).toEqual([['puxar'], ['puxar']]);
  });

  it('BOTAO-04: RECOLHER segura enquanto o dedo fica encostado e para ao soltar', () => {
    const { button, pointer, onHoldStart, onHoldEnd, onButton } = setup('Lure');
    pointer(button('recolher'), 'pointerdown', 1);
    expect(onHoldStart).toHaveBeenCalledTimes(1);
    expect(onHoldEnd).not.toHaveBeenCalled();
    pointer(button('recolher'), 'pointerup', 1);
    expect(onHoldEnd).toHaveBeenCalledTimes(1);
    expect(onButton).not.toHaveBeenCalled();
  });

  it('BOTAO-04: SEGURAR segura até o toque ser cancelado', () => {
    const { button, pointer, onHoldStart, onHoldEnd } = setup('Fight');
    pointer(button('segurar'), 'pointerdown', 1);
    expect(onHoldStart).toHaveBeenCalledTimes(1);
    pointer(window, 'pointercancel', 1);
    expect(onHoldEnd).toHaveBeenCalledTimes(1);
  });

  it('ACES-09: com um dedo segurando RECOLHER, o segundo dedo em PUXAR é ignorado', () => {
    const { button, pointer, onButton, onHoldStart, onHoldEnd } = setup('Lure');
    pointer(button('recolher'), 'pointerdown', 1);
    pointer(button('puxar'), 'pointerdown', 2);
    pointer(button('puxar'), 'pointerup', 2);
    expect(onButton).not.toHaveBeenCalled();
    expect(onHoldEnd).not.toHaveBeenCalled(); // o segundo dedo soltando não solta o RECOLHER
    pointer(button('recolher'), 'pointerup', 1);
    expect(onHoldStart).toHaveBeenCalledTimes(1);
    expect(onHoldEnd).toHaveBeenCalledTimes(1);
  });

  it.each<[Phase, string]>([
    ['Flying', 'arremessar'],
    ['Strike', 'recolher'],
  ])('BOTAO-03: em %s, tocar no botão apagado (%s) não faz nada', (phase, id) => {
    const { button, pointer, onButton, onHoldStart } = setup(phase);
    pointer(button(id), 'pointerdown', 1);
    expect(onButton).not.toHaveBeenCalled();
    expect(onHoldStart).not.toHaveBeenCalled();
  });

  it('o dedo que fisgou solta depois que PUXAR some, e SEGURAR já responde ao próximo toque', () => {
    const { button, pointer, onButton, onHoldStart, show } = setup('Strike');
    pointer(button('puxar'), 'pointerdown', 1);
    show('Fight'); // o botão some com o dedo em cima
    pointer(window, 'pointerup', 1);
    pointer(button('segurar'), 'pointerdown', 2);
    expect(onButton).toHaveBeenCalledWith('puxar');
    expect(onHoldStart).toHaveBeenCalledTimes(1);
  });

  it('BOTAO-04: a tela fechando com o dedo segurando encerra o segurar', () => {
    const { root, button, pointer, onHoldEnd } = setup('Fight');
    pointer(button('segurar'), 'pointerdown', 1);
    act(() => render(null, root));
    expect(onHoldEnd).toHaveBeenCalledTimes(1);
  });
});
