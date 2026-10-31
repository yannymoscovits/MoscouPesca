// Pesqueiro (pesca-bass T12; PONTO-01 a PONTO-04): os pontos com nome, o ponto tocado com as espécies,
// o cadeado com o alcance pedido e "Pescar aqui". O desenho da cena tem os testes do castRenderer.
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ep1 } from '../content/episodes/ep1';
import { spotsFor } from '../domain/spots';
import { computeLayout } from '../render/fishingRenderer';
import { SpotScreen, spotButtonPos, SPOT_BUTTON_SHARE } from './SpotScreen';

const loc = ep1.locations[0]; // Poço do Magro: Beira do píer (0), Pedral (3), Fundão (5)
const bambu = ep1.rods.find((r) => r.id === 'bambu')!;
const album = { tilapia: { recordKg: 1.2 } }; // só a tilápia já foi pescada

const roots: HTMLElement[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) act(() => render(null, root));
});

function setup() {
  const root = document.createElement('div');
  document.body.appendChild(root);
  roots.push(root);
  const chooseSpot = vi.fn();
  const spots = spotsFor(loc, bambu, ep1.species, album);
  act(() => render(<SpotScreen place={loc.id} background={loc.background} spots={spots} chooseSpot={chooseSpot} />, root));
  const spot = (id: string) => root.querySelector<HTMLButtonElement>(`[data-spot="${id}"]`)!;
  const tap = (el: HTMLElement) => act(() => el.click());
  const fishHere = () => root.querySelector<HTMLButtonElement>('[data-action="pescar-aqui"]');
  const species = () => [...root.querySelectorAll('.spots__species li')].map((li) => li.textContent);
  return { root, chooseSpot, spot, tap, fishHere, species };
}

const locked = (b: HTMLElement) => b.querySelector('[role="img"][aria-label="bloqueado"]') !== null;

describe('SpotScreen', () => {
  it('PONTO-01: mostra os 3 pontos do local, cada um com o nome', () => {
    const { root } = setup();
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-spot]')];
    expect(buttons.map((b) => b.dataset.spot)).toEqual(['raso', 'meio', 'fundo']);
    expect(buttons.map((b) => b.textContent?.replace('🔒', '').trim())).toEqual(['Beira do píer', 'Pedral', 'Fundão']);
  });

  it('sem ponto tocado, nada destacado e nenhum "Pescar aqui"', () => {
    const { root, fishHere } = setup();
    expect(root.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    expect(fishHere()).toBeNull();
  });

  it('PONTO-02: tocar num ponto destaca só ele e lista as espécies dele, com nome ou "???"', () => {
    const { root, spot, tap, species } = setup();
    tap(spot('raso'));
    expect(spot('raso').getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
    // Beira do píer: tilápia, piau, traíra, curimatã e Piranha Lavínia; só a tilápia está no álbum.
    expect(species()).toEqual(['Tilápia', '???', '???', '???', '???']);

    tap(spot('fundo'));
    expect(spot('raso').getAttribute('aria-pressed')).toBe('false');
    expect(spot('fundo').getAttribute('aria-pressed')).toBe('true');
    expect(species()).toEqual(['???', '???', '???', '???', '???']);
  });

  it('PONTO-03: ponto bloqueado tem cadeado, a frase do alcance e "Pescar aqui" desabilitado', () => {
    const { root, spot, tap, fishHere, chooseSpot } = setup();
    expect(locked(spot('raso'))).toBe(false);
    expect(locked(spot('meio'))).toBe(true);
    expect(locked(spot('fundo'))).toBe(true);

    tap(spot('meio'));
    expect(root.querySelector('.spots__lock')?.textContent).toContain('Precisa de vara com alcance 3');
    expect(fishHere()!.disabled).toBe(true);
    tap(fishHere()!);
    expect(chooseSpot).not.toHaveBeenCalled();

    tap(spot('fundo'));
    expect(root.querySelector('.spots__lock')?.textContent).toContain('Precisa de vara com alcance 5');
  });

  it('PONTO-04: "Pescar aqui" num ponto liberado chama chooseSpot com o ponto', () => {
    const { spot, tap, fishHere, chooseSpot, root } = setup();
    tap(spot('raso'));
    expect(root.querySelector('.spots__lock')).toBeNull();
    expect(fishHere()!.disabled).toBe(false);
    tap(fishHere()!);
    expect(chooseSpot).toHaveBeenCalledTimes(1);
    expect(chooseSpot).toHaveBeenCalledWith('raso');
  });

  it('PONTO-02: "Outro ponto" fecha o ponto tocado e tira o destaque', () => {
    const { root, spot, tap, fishHere } = setup();
    tap(spot('raso'));
    tap([...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Outro ponto')!);
    expect(fishHere()).toBeNull();
    expect(root.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
  });
});

describe('spotButtonPos', () => {
  it('PONTO-01: o botão fica no centro do ponto, na cena ancorada no pé da tela', () => {
    const l = computeLayout(412, 839); // Pixel 7: escala 2, cena 13 px lógicos para dentro
    expect(spotButtonPos({ x: 90, y: 305 }, l, 412)).toEqual({ left: (l.offsetX + 90) * 2, bottom: (400 - 305) * 2 });
  });

  it('perto da borda, o botão de até 40% da tela não sai dela', () => {
    const l = computeLayout(360, 780);
    const half = (360 * SPOT_BUTTON_SHARE) / 2;
    expect(spotButtonPos({ x: 22.5, y: 245 }, l, 360).left).toBe(16 + half); // Beirada do mangue, Rio Jacuípe
    expect(spotButtonPos({ x: 178, y: 245 }, l, 360).left).toBe(360 - 16 - half);
  });
});
