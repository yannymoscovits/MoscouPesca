import { describe, expect, it, vi } from 'vitest';
import { createUpdateManager, shouldApply, versionNotice } from './update';

// INST-07: a versão nova só entra na abertura ou na tela inicial, e a novidade aparece uma vez.

describe('shouldApply', () => {
  it('verdadeiro na abertura do jogo e na tela inicial', () => {
    expect(shouldApply('open')).toBe(true);
    expect(shouldApply('title')).toBe(true);
  });

  it('falso na pesca e no torneio', () => {
    expect(shouldApply('fishing')).toBe(false);
    expect(shouldApply('tournament')).toBe(false);
  });
});

describe('versionNotice', () => {
  it('perfil novo (seenVersion vazio): não mostra a novidade e grava a versão', () => {
    expect(versionNotice('', '1.0.0')).toEqual({ show: false, store: true });
  });

  it('seenVersion antigo: mostra a novidade e grava a versão nova', () => {
    expect(versionNotice('0.9.0', '1.0.0')).toEqual({ show: true, store: true });
  });

  it('mesma versão: não mostra nem grava', () => {
    expect(versionNotice('1.0.0', '1.0.0')).toEqual({ show: false, store: false });
  });
});

describe('createUpdateManager', () => {
  function fakeRegister() {
    const updateSW = vi.fn(async (_reload?: boolean) => {});
    let needRefresh = () => {};
    const register = vi.fn((opts: { immediate?: boolean; onNeedRefresh?: () => void }) => {
      needRefresh = opts.onNeedRefresh ?? (() => {});
      return updateSW;
    });
    return { register, updateSW, newVersionReady: () => needRefresh() };
  }

  it('registra o service worker logo na abertura', () => {
    const f = fakeRegister();
    createUpdateManager(f.register);
    expect(f.register).toHaveBeenCalledWith(expect.objectContaining({ immediate: true }));
  });

  it('versão nova pronta na abertura: aplica na hora, recarregando a página', () => {
    const f = fakeRegister();
    createUpdateManager(f.register);
    f.newVersionReady();
    expect(f.updateSW).toHaveBeenCalledWith(true);
  });

  it('versão nova pronta durante a pesca ou o torneio: espera a volta à tela inicial', () => {
    const f = fakeRegister();
    const manager = createUpdateManager(f.register);
    manager.setScreen('fishing');
    f.newVersionReady();
    manager.setScreen('tournament');
    manager.setScreen('fishing');
    expect(f.updateSW).not.toHaveBeenCalled();

    manager.setScreen('title');
    expect(f.updateSW).toHaveBeenCalledTimes(1);
    expect(f.updateSW).toHaveBeenCalledWith(true);
  });
});
