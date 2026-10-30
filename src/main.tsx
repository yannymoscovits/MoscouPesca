import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

render(<h1>MoscouFishing</h1>, document.getElementById('app')!);
