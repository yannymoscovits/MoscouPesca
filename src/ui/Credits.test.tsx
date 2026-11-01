// Créditos do fim do jogo (HIST-17): sobem antes do aviso final; "Continuar" leva ao aviso. Nos
// avisos de episódio liberado, não há créditos.
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameController } from '../app/controller';
import { createStore, GameStoreContext, initialState } from '../app/store';
import { episodes } from '../content';
import { newProfile } from '../domain/profile';
import { ServicesContext, type Services } from './context';
import { EpisodeBanner } from './Letter';

const roots: HTMLElement[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) act(() => render(null, root));
});

function setup(notice: string) {
  const store = createStore({ ...initialState(newProfile()), notice });
  const controller = { travel: vi.fn(), dismissNotice: vi.fn() } as unknown as GameController;
  const services = { controller, episodes } as unknown as Services;
  const root = document.createElement('div');
  document.body.appendChild(root);
  roots.push(root);
  act(() =>
    render(
      <GameStoreContext.Provider value={store}>
        <ServicesContext.Provider value={services}>
          <EpisodeBanner />
        </ServicesContext.Provider>
      </GameStoreContext.Provider>,
      root,
    ),
  );
  const button = () => root.querySelector<HTMLButtonElement>('.overlay__actions button')!;
  return { root, controller, button };
}

describe('HIST-17: créditos', () => {
  it('no fim do jogo os créditos vêm antes do aviso final, com a dedicatória e o elenco', () => {
    const { root, controller, button } = setup('A pescaria continua: todos os lugares seguem abertos');
    const roll = root.querySelector('[aria-label="Créditos"]');
    expect(roll).not.toBeNull();
    expect(roll!.textContent).toContain('Adilson Moscovits');
    expect(roll!.textContent).toContain('Jane · A Que Sempre Teve Razão');
    expect(roll!.textContent).toContain('Alto-mar da Bahia');

    act(() => button().click());
    expect(root.querySelector('[aria-label="Créditos"]')).toBeNull();
    expect(root.textContent).toContain('A pescaria continua');
    expect(controller.dismissNotice).not.toHaveBeenCalled();
  });

  it('o aviso de episódio liberado não tem créditos', () => {
    const { root } = setup('Episódio 2 liberado!');
    expect(root.querySelector('[aria-label="Créditos"]')).toBeNull();
    expect(root.textContent).toContain('Episódio 2 liberado!');
  });
});
