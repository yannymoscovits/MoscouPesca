import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { newProfile } from '../domain/profile';
import { GameStoreContext, createStore, initialState, useGame } from './store';

describe('GameStore', () => {
  it('update aplica a mudança e avisa cada inscrito uma vez', () => {
    const store = createStore(initialState(newProfile()));
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);

    store.update((s) => ({ ...s, profile: { ...s.profile, money: 50 } }));

    expect(store.getState().profile.money).toBe(50);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('cancelar a inscrição para de avisar', () => {
    const store = createStore(initialState(newProfile()));
    const a = vi.fn();
    const off = store.subscribe(a);

    off();
    store.update((s) => ({ ...s, paused: true }));

    expect(a).not.toHaveBeenCalled();
  });
});

describe('useGame', () => {
  it('re-renderiza só quando o valor selecionado muda', () => {
    const store = createStore(initialState(newProfile()));
    let renders = 0;
    function Money() {
      renders++;
      return h('span', null, `R$ ${useGame((s) => s.profile.money)}`);
    }
    const root = document.createElement('div');

    act(() => render(h(GameStoreContext.Provider, { value: store }, h(Money, null)), root));
    expect(root.textContent).toBe('R$ 0');
    expect(renders).toBe(1);

    act(() => store.update((s) => ({ ...s, paused: true }))); // muda outra parte do estado
    expect(renders).toBe(1);

    act(() => store.update((s) => ({ ...s, profile: { ...s.profile, money: 50 } })));
    expect(root.textContent).toBe('R$ 50');
    expect(renders).toBe(2);

    act(() => render(null, root));
  });
});
