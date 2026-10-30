import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { bootGame } from './app/controller';
import { episodes } from './content';
import { createRng } from './domain/rng';
import { createBrowser } from './platform/browser';
import { createSaveService } from './platform/save';

registerSW({ immediate: true });

const rng = createRng(Date.now() >>> 0);
const game = bootGame({ save: createSaveService(localStorage), platform: createBrowser(), episodes, rng });

// Ganchos de teste: o Vite troca MODE por uma constante e o build de produção descarta este bloco.
if (import.meta.env.MODE === 'e2e') {
  void import('./app/testHooks').then((m) => m.installTestHooks(window, { ...game, rng }));
}

render(<h1>MoscouFishing</h1>, document.getElementById('app')!);
