import { describe, expect, it, vi } from 'vitest';
import { createBrowser, type BrowserEnv } from './browser';

/** Documento de mentira: só a visibilidade e os eventos. */
class FakeDocument extends EventTarget {
  visibilityState: DocumentVisibilityState = 'visible';
  set(state: DocumentVisibilityState) {
    this.visibilityState = state;
    this.dispatchEvent(new Event('visibilitychange'));
  }
}

/** Wake Lock de mentira: o navegador solta a trava quando a página fica oculta. */
function fakeWakeLock() {
  const sentinels: { released: boolean; release: () => Promise<void> }[] = [];
  const request = vi.fn(async (_type: 'screen') => {
    const s = {
      released: false,
      release: vi.fn(async () => {
        s.released = true;
      }),
    };
    sentinels.push(s);
    return s;
  });
  return { request, sentinels };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function env(over: Partial<BrowserEnv> = {}): BrowserEnv & { document: FakeDocument } {
  return {
    navigator: {},
    document: new FakeDocument(),
    window: { innerWidth: 412, innerHeight: 839 },
    ...over,
  } as BrowserEnv & { document: FakeDocument };
}

describe('vibrate', () => {
  it('PESCA-07: repassa a duração para navigator.vibrate', () => {
    const vibrate = vi.fn(() => true);
    createBrowser(env({ navigator: { vibrate } })).vibrate(300);
    expect(vibrate).toHaveBeenCalledWith(300);
  });

  it('TELA-02: sem navigator.vibrate, não lança erro', () => {
    expect(() => createBrowser(env()).vibrate(300)).not.toThrow();
  });
});

describe('keepScreenOn', () => {
  it('TELA-01: pede a trava de tela e pede de novo ao voltar visível depois que o navegador soltou', async () => {
    const wl = fakeWakeLock();
    const e = env({ navigator: { wakeLock: wl } });
    const browser = createBrowser(e);

    await browser.keepScreenOn(true);
    expect(wl.request).toHaveBeenCalledTimes(1);
    expect(wl.request).toHaveBeenCalledWith('screen');

    wl.sentinels[0].released = true; // o navegador solta a trava ao ocultar
    e.document.set('hidden');
    e.document.set('visible');
    await flush();

    expect(wl.request).toHaveBeenCalledTimes(2);
  });

  it('TELA-01: desligar solta a trava e não pede de novo ao voltar visível', async () => {
    const wl = fakeWakeLock();
    const e = env({ navigator: { wakeLock: wl } });
    const browser = createBrowser(e);

    await browser.keepScreenOn(true);
    await browser.keepScreenOn(false);
    expect(wl.sentinels[0].released).toBe(true);

    e.document.set('hidden');
    e.document.set('visible');
    await flush();
    expect(wl.request).toHaveBeenCalledTimes(1);
  });

  it('TELA-02: sem navigator.wakeLock, não lança erro', async () => {
    await expect(createBrowser(env()).keepScreenOn(true)).resolves.toBeUndefined();
  });

  it('TELA-02: navegador recusando a trava, não lança erro', async () => {
    const request = vi.fn(() => Promise.reject(new DOMException('negado', 'NotAllowedError')));
    await expect(createBrowser(env({ navigator: { wakeLock: { request } } })).keepScreenOn(true)).resolves.toBeUndefined();
  });
});

describe('onVisibilityChange', () => {
  it('SAVE-01: avisa hidden e visible; cancelar a inscrição para de avisar', () => {
    const e = env();
    const seen: string[] = [];
    const off = createBrowser(e).onVisibilityChange((state) => seen.push(state));

    e.document.set('hidden');
    e.document.set('visible');
    off();
    e.document.set('hidden');

    expect(seen).toEqual(['hidden', 'visible']);
  });
});

describe('isLandscape', () => {
  it('ACES-10: usa a media query de orientação', () => {
    const matchMedia = (q: string) => ({ matches: q === '(orientation: landscape)' });
    expect(createBrowser(env({ window: { innerWidth: 412, innerHeight: 839, matchMedia } })).isLandscape()).toBe(true);
    const portrait = () => ({ matches: false });
    expect(createBrowser(env({ window: { innerWidth: 839, innerHeight: 412, matchMedia: portrait } })).isLandscape()).toBe(
      false,
    );
  });

  it('ACES-10: sem matchMedia, compara largura e altura', () => {
    expect(createBrowser(env({ window: { innerWidth: 839, innerHeight: 412 } })).isLandscape()).toBe(true);
    expect(createBrowser(env({ window: { innerWidth: 412, innerHeight: 839 } })).isLandscape()).toBe(false);
  });
});
