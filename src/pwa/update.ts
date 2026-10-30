// UpdateManager (design.md, "UpdateManager"; INST-07): o vite-plugin-pwa roda em `registerType: 'prompt'`,
// então a versão nova fica esperando. Ela só é aplicada na abertura do jogo ou na tela inicial, nunca
// durante a pesca ou o torneio. Depois do recarregamento, a versão vista no perfil diz se a novidade
// aparece: uma vez só.

import type { ScreenId } from '../ui/context';

/** 'open': o jogo acabou de abrir e nenhuma tela foi mostrada ainda. */
export type UpdateScreen = ScreenId | 'open';

declare const __APP_VERSION__: string;

/** Versão deste build (vite.config.ts): a do package.json mais a hora do build. */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

/** Telas em que recarregar a página não atrapalha nada. */
export function shouldApply(screen: UpdateScreen): boolean {
  return screen === 'open' || screen === 'title';
}

/**
 * A versão vista no perfil contra a deste build. Perfil novo (vazio) só grava a versão: quem acabou
 * de instalar não tem novidade para ver.
 */
export function versionNotice(seen: string, current: string): { show: boolean; store: boolean } {
  if (seen === current) return { show: false, store: false };
  return { show: seen !== '', store: true };
}

/** O `registerSW` de `virtual:pwa-register`, só com o que o jogo usa. */
export type RegisterSW = (options: { immediate?: boolean; onNeedRefresh?: () => void }) => (reloadPage?: boolean) => Promise<void>;

export interface UpdateManager {
  /** A tela mudou; se ela for segura e houver versão nova esperando, aplica. */
  setScreen(screen: ScreenId): void;
}

export function createUpdateManager(register: RegisterSW): UpdateManager {
  let screen: UpdateScreen = 'open';
  let waiting = false;
  let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;
  const apply = () => {
    if (!waiting || !updateSW || !shouldApply(screen)) return;
    waiting = false;
    void updateSW(true); // ativa a versão nova e recarrega a página
  };
  updateSW = register({
    immediate: true,
    onNeedRefresh() {
      waiting = true;
      apply();
    },
  });
  apply();
  return {
    setScreen(next) {
      screen = next;
      apply();
    },
  };
}
