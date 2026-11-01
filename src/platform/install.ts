// Convite de instalação do PWA (design.md, "Platform"): guarda o beforeinstallprompt do Chrome
// para o botão "Colocar na tela" e diz se o jogo já roda instalado (INST-02 a INST-04).

/** O evento do Chrome; não faz parte da lib DOM do TypeScript. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

type InstallWindow = Pick<EventTarget, 'addEventListener'> & {
  matchMedia?: (query: string) => { matches: boolean };
  navigator?: { userAgent: string; standalone?: boolean };
};

export function isAppleMobile(nav: Pick<Navigator, 'userAgent' | 'maxTouchPoints'> = navigator): boolean {
  return /iPhone|iPad|iPod/i.test(nav.userAgent) || (/Macintosh/i.test(nav.userAgent) && nav.maxTouchPoints > 1);
}

export interface InstallApi {
  /** INST-02: o navegador ofereceu instalação; falso leva à instrução do menu ⋮ (INST-03). */
  canPrompt(): boolean;
  /** INST-02: abre o diálogo de instalação do Android. */
  prompt(): Promise<void>;
  /** INST-04: o jogo roda instalado, fora do navegador. */
  isStandalone(): boolean;
}

/** Crie cedo (antes da primeira tela): o Chrome dispara o evento logo depois de carregar. */
export function createInstall(win: InstallWindow = window): InstallApi {
  let deferred: BeforeInstallPromptEvent | null = null;

  win.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // sem a barrinha automática: o convite sai do botão "Colocar na tela"
    deferred = e as BeforeInstallPromptEvent;
  });

  return {
    canPrompt: () => deferred !== null,

    async prompt() {
      const e = deferred;
      deferred = null; // o Chrome só aceita um prompt() por evento
      try {
        await e?.prompt();
      } catch {
        // o navegador não abriu o diálogo: segue sem instalar
      }
    },

    isStandalone() {
      // O manifest pede display "fullscreen"; instalado, o Chrome casa essa media query, não a "standalone".
      const mode = (m: string) => win.matchMedia?.(`(display-mode: ${m})`).matches ?? false;
      return win.navigator?.standalone === true || mode('standalone') || mode('fullscreen');
    },
  };
}
