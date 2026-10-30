import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-700.css';
import './ui/theme.css';
import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { bootGame } from './app/controller';
import { episodes } from './content';
import { createRng } from './domain/rng';
import { createBrowser } from './platform/browser';
import { createInstall } from './platform/install';
import { createSaveService } from './platform/save';
import { createUpdateManager } from './pwa/update';
import { App } from './ui/App';

// Antes de tudo: o Chrome dispara beforeinstallprompt logo depois de carregar (INST-02).
const install = createInstall();

// INST-07: a versão nova fica esperando e só entra na abertura ou na tela inicial.
const update = createUpdateManager(registerSW);

const rng = createRng(Date.now() >>> 0);
const browser = createBrowser();
const game = bootGame({ save: createSaveService(localStorage), platform: browser, episodes, rng });

// Ganchos de teste: o Vite troca MODE por uma constante e o build de produção descarta este bloco.
if (import.meta.env.MODE === 'e2e') {
  void import('./app/testHooks').then((m) => m.installTestHooks(window, { ...game, rng }));
}

render(
  <App store={game.store} services={{ controller: game.controller, install, browser, episodes, update }} />,
  document.getElementById('app')!,
);
