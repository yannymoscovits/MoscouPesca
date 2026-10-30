// APIs do navegador que podem faltar (design.md, "Platform"): vibração, tela acesa,
// visibilidade e orientação. Toda chamada tolera a API ausente ou recusada (TELA-02).

interface WakeLockHandle {
  readonly released: boolean;
  release(): Promise<void>;
}

/** O que o módulo usa do navegador; os testes passam versões de mentira. */
export interface BrowserEnv {
  navigator: {
    vibrate?: (ms: number) => boolean;
    wakeLock?: { request(type: 'screen'): Promise<WakeLockHandle> };
  };
  document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  window: { innerWidth: number; innerHeight: number; matchMedia?: (query: string) => { matches: boolean } };
}

export type Visibility = 'hidden' | 'visible';

export interface BrowserApi {
  /** PESCA-07: sem efeito se a API não existe. */
  vibrate(ms: number): void;
  /** TELA-01: Wake Lock, pedido de novo ao voltar visível; sem efeito se faltar (TELA-02). */
  keepScreenOn(on: boolean): Promise<void>;
  /** SAVE-01: devolve a função que cancela a inscrição. */
  onVisibilityChange(cb: (state: Visibility) => void): () => void;
  /** ACES-10 */
  isLandscape(): boolean;
}

const globalEnv = (): BrowserEnv => ({ navigator, document, window });

export function createBrowser(env: BrowserEnv = globalEnv()): BrowserApi {
  const { navigator: nav, document: doc, window: win } = env;
  let wanted = false;
  let lock: WakeLockHandle | null = null;
  let watching = false;

  async function acquire() {
    if (!nav.wakeLock || (lock && !lock.released)) return;
    try {
      const got = await nav.wakeLock.request('screen');
      if (wanted) lock = got;
      else await got.release(); // desligado enquanto o pedido estava pendente
    } catch {
      lock = null; // recusado (bateria fraca, página oculta): segue sem
    }
  }

  const visibility = (): Visibility => (doc.visibilityState === 'hidden' ? 'hidden' : 'visible');

  return {
    vibrate(ms) {
      try {
        nav.vibrate?.(ms);
      } catch {
        // alguns navegadores lançam sem gesto do usuário
      }
    },

    async keepScreenOn(on) {
      wanted = on;
      if (!watching) {
        watching = true;
        // O navegador solta a trava quando a página fica oculta; pede de novo ao voltar.
        doc.addEventListener('visibilitychange', () => {
          if (wanted && visibility() === 'visible') void acquire();
        });
      }
      if (on) return acquire();
      const held = lock;
      lock = null;
      try {
        await held?.release();
      } catch {
        // já solta
      }
    },

    onVisibilityChange(cb) {
      const listener = () => cb(visibility());
      doc.addEventListener('visibilitychange', listener);
      return () => doc.removeEventListener('visibilitychange', listener);
    },

    isLandscape() {
      if (win.matchMedia) return win.matchMedia('(orientation: landscape)').matches;
      return win.innerWidth > win.innerHeight;
    },
  };
}
