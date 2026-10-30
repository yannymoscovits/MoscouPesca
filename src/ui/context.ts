// O que as telas recebem do jogo: comandos, plataforma, conteúdo e a navegação entre telas.
// O estado do jogo vem do GameStore (useGame, em app/store.ts).

import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { GameController } from '../app/controller';
import type { EpisodeContent } from '../content/types';
import type { BrowserApi } from '../platform/browser';
import type { InstallApi } from '../platform/install';

export interface Services {
  controller: GameController;
  install: InstallApi;
  browser: BrowserApi;
  episodes: EpisodeContent[];
}

export const ServicesContext = createContext<Services | null>(null);

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices precisa de um ServicesContext.Provider');
  return services;
}

/** Telas do jogo. A tela inicial abre sempre primeiro (INST-01). */
export type ScreenId = 'title' | 'fishing';

export const NavContext = createContext<(to: ScreenId) => void>(() => {});

/** Troca de tela: `const go = useNav(); go('fishing')`. */
export const useNav = () => useContext(NavContext);
