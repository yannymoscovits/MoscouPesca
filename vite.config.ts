import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  // GitHub Pages serve o jogo em /<repositório>/ (scripts/deploy-pages.ts); no resto, na raiz.
  base: process.env.BASE_PATH ?? '/',
  // INST-07: cada build é uma versão nova; a novidade aparece uma vez depois de atualizar.
  define: { __APP_VERSION__: JSON.stringify(`${pkg.version}+${new Date().toISOString()}`) },
  plugins: [
    preact(),
    VitePWA({
      // 'prompt': uma versão nova nunca recarrega a página no meio de uma briga.
      registerType: 'prompt',
      manifest: {
        name: 'MoscouFishing',
        short_name: 'MoscouFishing',
        lang: 'pt-BR',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        orientation: 'portrait',
        background_color: '#1b5e8c',
        theme_color: '#1b5e8c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // MUS-01: as músicas também, para tocar sem internet.
        globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2,webmanifest,mid}'],
      },
    }),
  ],
});
