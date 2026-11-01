import { describe, expect, it, vi } from 'vitest';
import { createInstall, isAppleMobile } from './install';

/** Janela de mentira: eventos e a media query de display-mode. */
function fakeWindow(displayMode: 'browser' | 'standalone' | 'fullscreen' = 'browser') {
  const win = new EventTarget() as EventTarget & { matchMedia?: (q: string) => { matches: boolean } };
  win.matchMedia = (q) => ({ matches: q === `(display-mode: ${displayMode})` });
  return win;
}

/** O beforeinstallprompt do Chrome: prompt() abre o diálogo de instalação do Android. */
function installEvent() {
  const e = new Event('beforeinstallprompt', { cancelable: true });
  return Object.assign(e, { prompt: vi.fn(async () => {}) });
}

describe('convite de instalação', () => {
  it('INST-02: com o evento recebido, canPrompt() é verdadeiro e prompt() abre o diálogo uma vez só', async () => {
    const win = fakeWindow();
    const install = createInstall(win);
    const e = installEvent();
    win.dispatchEvent(e);

    expect(install.canPrompt()).toBe(true);
    await install.prompt();
    await install.prompt();

    expect(e.prompt).toHaveBeenCalledTimes(1);
    expect(install.canPrompt()).toBe(false); // o evento só vale uma vez
  });

  it('INST-03: sem o evento, canPrompt() é falso e prompt() não lança', async () => {
    const install = createInstall(fakeWindow());

    expect(install.canPrompt()).toBe(false);
    await expect(install.prompt()).resolves.toBeUndefined();
  });
});

describe('isStandalone', () => {
  it('reconhece o modo instalado pelo indicador do iOS', () => {
    const win = Object.assign(fakeWindow(), { navigator: { userAgent: 'iPhone', standalone: true } });
    expect(createInstall(win).isStandalone()).toBe(true);
  });
  it('INST-04: display-mode standalone → verdadeiro', () => {
    expect(createInstall(fakeWindow('standalone')).isStandalone()).toBe(true);
  });

  it('INST-04: display-mode fullscreen (o do manifest) → verdadeiro', () => {
    expect(createInstall(fakeWindow('fullscreen')).isStandalone()).toBe(true);
  });

  it('INST-04: no navegador → falso', () => {
    expect(createInstall(fakeWindow('browser')).isStandalone()).toBe(false);
  });
});

describe('dispositivo Apple móvel', () => {
  it('detecta iPhone no Safari ou Chrome e iPad em modo de computador', () => {
    expect(isAppleMobile({ userAgent: 'iPhone CriOS Safari', maxTouchPoints: 5 })).toBe(true);
    expect(isAppleMobile({ userAgent: 'Macintosh Safari', maxTouchPoints: 5 })).toBe(true);
    expect(isAppleMobile({ userAgent: 'Macintosh Safari', maxTouchPoints: 0 })).toBe(false);
    expect(isAppleMobile({ userAgent: 'Android Chrome', maxTouchPoints: 5 })).toBe(false);
  });
});
