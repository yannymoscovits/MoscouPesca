import { defineConfig, devices } from '@playwright/test';

// Dois builds servidos lado a lado:
// - produção (dist/): o que vai para o ar; os testes de PWA e o que prova que não há ganchos de teste;
// - e2e (dist-e2e/, `--mode e2e`): o mesmo jogo com `window.__mf` para dirigir as telas.
// Portas trocáveis por variável de ambiente, para rodar duas cópias do projeto ao mesmo tempo.
const PROD_PORT = Number(process.env.PW_PORT_PROD ?? 4173);
const E2E_PORT = Number(process.env.PW_PORT_E2E ?? 4174);
const PROD_SPECS = /(pwa|prod)\.spec\.ts$/;

export default defineConfig({
  testDir: 'e2e',
  projects: [
    {
      name: 'pixel7',
      testIgnore: PROD_SPECS,
      use: { ...devices['Pixel 7'], baseURL: `http://localhost:${E2E_PORT}` },
    },
    {
      name: 'pixel7-prod',
      testMatch: PROD_SPECS,
      use: { ...devices['Pixel 7'], baseURL: `http://localhost:${PROD_PORT}` },
    },
  ],
  webServer: [
    {
      command: `npm run build && npm run preview -- --port ${PROD_PORT} --strictPort`,
      url: `http://localhost:${PROD_PORT}`,
      reuseExistingServer: false,
    },
    {
      command: `npx vite build --mode e2e --outDir dist-e2e && npx vite preview --outDir dist-e2e --port ${E2E_PORT} --strictPort`,
      url: `http://localhost:${E2E_PORT}`,
      reuseExistingServer: false,
    },
  ],
});
