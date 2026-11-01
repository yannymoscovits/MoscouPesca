import { expect, test, type Page } from '@playwright/test';
import { characters } from '../src/content/characters';
import { ep1 } from '../src/content/episodes/ep1';
import { ep2 } from '../src/content/episodes/ep2';
import type { Profile } from '../src/content/types';
import { catchFish, gameState, manualClock, openWithProfile, reopen, veteran } from './support';

// Mapa dos episódios (EPI-03, EPI-04, EPI-07, EPI-08) e a cena pendente que não se perde na viagem.

const map = (page: Page) => page.getByRole('region', { name: 'Mapa' });
const episodeItems = (page: Page) => map(page).getByRole('list', { name: 'Episódios' }).getByRole('listitem');
const hud = (page: Page) => page.getByRole('group', { name: 'Painel da pescaria' });
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Conversa' });
const [rio, ponte] = ep2.locations;

/** Episódio 1 vencido: Jacuípe liberado, aberturas vistas, elenco apresentado. */
const ep1Won = (over: Partial<Profile> = {}): Partial<Profile> => ({
  ...veteran(),
  unlockedEpisodes: [1, 2],
  charactersIntroduced: characters.map((c) => c.id),
  story: {
    episodes: { 1: { objectiveIndex: 6, progress: 0, won: true } },
    scenesSeen: ['ep1-abertura', 'ep1-vitoria', 'ep2-abertura'],
    pendingScene: null,
  },
  ...over,
});

async function openMap(page: Page) {
  await page.getByRole('button', { name: 'Menu da pescaria', exact: true }).click();
  await page.getByRole('button', { name: 'Mapa', exact: true }).click();
  await expect(map(page)).toBeVisible();
}

test('EPI-03: perfil novo → só o Poço do Magro liberado; Rio Jacuípe e Ponte da Cetrel com cadeado e "Vença a GuanambiCup"', async ({
  page,
}) => {
  await openWithProfile(page, veteran());
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await openMap(page);

  const poco = ep1.locations[0].name;
  await expect(map(page).getByRole('button', { name: poco })).toBeEnabled();
  for (const loc of [rio, ponte]) await expect(map(page).getByRole('button', { name: loc.name })).toHaveCount(0);

  const jacuipe = episodeItems(page).filter({ hasText: rio.name });
  await expect(jacuipe).toHaveCount(1);
  await expect(jacuipe).toContainText(ponte.name); // os dois locais do Episódio 2 (EPI-08)
  await expect(jacuipe).toContainText('Bloqueado');
  await expect(jacuipe).toContainText('Vença a GuanambiCup');
  await expect(episodeItems(page).filter({ hasText: poco })).not.toContainText('Bloqueado');
  // Cada episódio bloqueado diz qual campeonato o libera: o do episódio anterior.
  await expect(episodeItems(page).filter({ hasText: 'Vera Cruz' })).toContainText('Vença a Copa Jacuípe');
});

test('EPI-04, EPI-08: com o Episódio 1 vencido, os dois locais de Jacuípe estão liberados; a Ponte da Cetrel abre a pesca com o cenário e os peixes de água salgada', async ({
  page,
}) => {
  await openWithProfile(page, ep1Won({ baits: { owned: ['minhoca', 'camarao'], equipped: 'camarao' } }));
  await manualClock(page);
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await openMap(page);

  for (const loc of [rio, ponte]) await expect(map(page).getByRole('button', { name: loc.name })).toBeEnabled();
  await expect(episodeItems(page).filter({ hasText: rio.name })).not.toContainText('Bloqueado');

  await map(page).getByRole('button', { name: ponte.name }).click();
  const fishing = page.getByRole('region', { name: 'Pescaria' });
  await expect(fishing).toBeVisible();
  await expect(hud(page)).toContainText(ponte.name);
  await expect(fishing.locator('[data-background]')).toHaveAttribute('data-background', ponte.background);
  expect((await gameState(page)).profile.currentLocation).toBe(ponte.id);

  // O peixe que vem é um dos da Ponte, e não do Rio Jacuípe.
  expect(await catchFish(page, { spot: ponte.zones[0].id })).toBe('Result_Caught');
  const caught = (await gameState(page)).fishing.species.id as string;

  const here = new Set(ponte.zones.flatMap((z) => z.species));
  const river = new Set(rio.zones.flatMap((z) => z.species));
  expect(here.has(caught)).toBe(true);
  expect(river.has(caught)).toBe(false);
});

test('EPI-07: reabrir o jogo volta ao último local de pesca', async ({ page }) => {
  await openWithProfile(page, ep1Won());
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await openMap(page);
  await map(page).getByRole('button', { name: ponte.name }).click();
  await expect(hud(page)).toContainText(ponte.name);

  await reopen(page);
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await expect(hud(page)).toContainText(ponte.name);
  expect((await gameState(page)).profile.currentLocation).toBe(ponte.id);
});

test('viajar pelo Mapa com a cena "ep1-vitoria" pendente não descarta a cena; a abertura de Jacuípe vem depois dela', async ({
  page,
}) => {
  await openWithProfile(
    page,
    ep1Won({
      story: {
        episodes: { 1: { objectiveIndex: 6, progress: 0, won: true } },
        scenesSeen: ['ep1-abertura', 'ep1-vitoria'],
        pendingScene: 'ep1-vitoria',
      },
    }),
  );
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  const vitoria = ep1.scenes.find((s) => s.id === 'ep1-vitoria')!.lines;
  await expect(dialog(page)).toContainText(vitoria[0].text);

  await openMap(page); // o Menu fica à mão durante a cena
  await map(page).getByRole('button', { name: rio.name }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
  expect((await gameState(page)).profile.story.pendingScene).toBe('ep1-vitoria');

  for (const line of vitoria) {
    await expect(dialog(page)).toContainText(line.text);
    await dialog(page).click();
  }
  // HIST-09: primeira pescaria em Jacuípe → a abertura do Episódio 2, depois da cena guardada.
  const abertura = ep2.scenes.find((s) => s.id === ep2.chapter.openingScene)!.lines;
  await expect(dialog(page)).toContainText(abertura[0].text);
  expect((await gameState(page)).profile.story.pendingScene).toBe('ep2-abertura');
});

test('ACES-06, ACES-08: os botões do Mapa têm no mínimo 56 × 56 px e ficam todos na metade de baixo', async ({ page }) => {
  await openWithProfile(page, ep1Won({ unlockedEpisodes: [1, 2, 3] }));
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await openMap(page);
  const { height } = page.viewportSize()!;
  const buttons = await map(page).getByRole('button').all();
  expect(buttons.length).toBe(5); // Poço do Magro, Rio Jacuípe, Ponte da Cetrel, Vera Cruz e Voltar
  for (const btn of buttons) {
    const name = (await btn.textContent())!.trim();
    const box = (await btn.boundingBox())!;
    expect(box.width, name).toBeGreaterThanOrEqual(56);
    expect(box.height, name).toBeGreaterThanOrEqual(56);
    expect(box.y, name).toBeGreaterThanOrEqual(height / 2);
    expect(box.y + box.height, name).toBeLessThanOrEqual(height);
  }
});
