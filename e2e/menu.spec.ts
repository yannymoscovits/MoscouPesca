import { expect, test, type Page } from '@playwright/test';
import { gameState, openWithProfile, veteran } from './support';

// Menu do jogo (T74): aberto pelo botão "Menu" da pesca, dá acesso às outras telas.
// Conforto: botões de no mínimo 56 × 56 px, todos na metade de baixo (ACES-06, ACES-08).

const fishing = (page: Page) => page.getByRole('region', { name: 'Pescaria' });
const menu = (page: Page) => page.getByRole('region', { name: 'Menu' });

/** Jacuípe liberado, pescando na Ponte da Cetrel, com as aberturas vistas. */
const atPonte = () => ({
  ...veteran(),
  unlockedEpisodes: [1, 2] as (1 | 2)[],
  currentLocation: 'ponte-da-cetrel',
  story: {
    episodes: { 1: { objectiveIndex: 6, progress: 0, won: true }, 2: { objectiveIndex: 0, progress: 0, won: false } },
    scenesSeen: ['ep1-abertura', 'ep1-vitoria', 'ep2-abertura'],
    pendingScene: null,
  },
});

async function openMenu(page: Page) {
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(fishing(page)).toBeVisible();
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(menu(page)).toBeVisible();
}

test('o botão "Menu" da pesca abre o menu; "Voltar a pescar" volta para a pesca no local atual', async ({ page }) => {
  await openWithProfile(page, atPonte());
  await openMenu(page);
  await expect(fishing(page)).toHaveCount(0);
  await expect(menu(page)).toContainText('Ponte da Cetrel');

  await page.getByRole('button', { name: 'Voltar a pescar' }).click();
  await expect(fishing(page)).toBeVisible();
  await expect(menu(page)).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Painel da pescaria' })).toContainText('Ponte da Cetrel');
  expect((await gameState(page)).profile.currentLocation).toBe('ponte-da-cetrel');
});

/** Cada botão do menu e o título da tela que ele abre; null = tela que ainda não existe nesta fase. */
const DESTINATIONS: { button: string; heading: string | null }[] = [
  { button: 'Mapa', heading: null },
  { button: 'Loja', heading: 'Loja do Edvaldo' },
  { button: 'Álbum', heading: null },
  { button: 'Troféus', heading: null }, // sala de troféus: T63
  { button: 'Mensagens', heading: null },
  { button: 'Campeonato', heading: null },
  { button: 'Ajustes', heading: 'Ajustes' },
];

test('cada botão do menu leva à tela certa, e o "Voltar" de lá volta ao menu; telas que ainda não existem ficam desabilitadas', async ({
  page,
}) => {
  await openWithProfile(page, veteran());
  await openMenu(page);

  for (const { button, heading } of DESTINATIONS) {
    const btn = menu(page).getByRole('button', { name: button, exact: true });
    if (heading === null) {
      await expect(btn, button).toBeDisabled();
      continue;
    }
    await btn.click();
    await expect(page.getByRole('heading', { level: 1, name: heading }), button).toBeVisible();
    await expect(menu(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Voltar', exact: true }).click();
    await expect(menu(page), `voltar de ${button}`).toBeVisible();
  }
});

test('ACES-06, ACES-08: os botões do menu têm no mínimo 56 × 56 px e ficam todos na metade de baixo', async ({ page }) => {
  await openWithProfile(page, veteran());
  await openMenu(page);

  const { height } = page.viewportSize()!;
  const buttons = menu(page).getByRole('button');
  expect(await buttons.count()).toBe(1 + DESTINATIONS.length);
  for (const btn of await buttons.all()) {
    const name = (await btn.textContent())!.trim();
    const box = (await btn.boundingBox())!;
    expect(box.width, name).toBeGreaterThanOrEqual(56);
    expect(box.height, name).toBeGreaterThanOrEqual(56);
    expect(box.y, name).toBeGreaterThanOrEqual(height / 2);
    expect(box.y + box.height, name).toBeLessThanOrEqual(height);
  }
});
