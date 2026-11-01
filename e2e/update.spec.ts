import { expect, test, type Page } from '@playwright/test';
import { newProfile } from '../src/domain/profile';
import { CURRENT_KEY } from '../src/platform/save';
import { gameState, openGame, openWithProfile, reopen, veteran } from './support';

// INST-07: depois de uma versão nova, "Novidade no MoscouFishing!" aparece uma única vez.
// Perfil novo não tem novidade para ver: só grava a versão.

const news = (page: Page) => page.getByRole('dialog', { name: 'Novidade' });
const saved = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY);

test('perfil novo (seenVersion vazio): não mostra a novidade e só grava a versão atual', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await openGame(page);
  await expect(page.getByRole('heading', { name: 'MoscouFishing' })).toBeVisible();
  await expect(news(page)).toHaveCount(0);

  const version = (await gameState(page)).profile.seenVersion;
  expect(version).not.toBe('');
  // Só a versão muda no perfil novo, e ela fica salva no celular.
  expect(await saved(page)).toEqual({ ...newProfile(), seenVersion: version });

  // A versão gravada é a deste build: reabrir não mostra novidade nem muda a versão.
  await reopen(page);
  await expect(page.getByRole('heading', { name: 'MoscouFishing' })).toBeVisible();
  await expect(news(page)).toHaveCount(0);
  expect((await gameState(page)).profile.seenVersion).toBe(version);
});

test('INST-07: com a versão antiga no perfil, a novidade aparece uma vez; reabrir não mostra de novo', async ({ page }) => {
  // A versão atual do build: a que um perfil novo grava.
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await openGame(page);
  const current = (await gameState(page)).profile.seenVersion;

  await openWithProfile(page, { ...veteran(), money: 321, seenVersion: '0.0.1+antiga' });
  await expect(news(page)).toBeVisible();
  await expect(news(page)).toContainText('Novidade no MoscouFishing!');
  const p = (await gameState(page)).profile;
  expect(p.seenVersion).toBe(current);
  expect(p.money).toBe(321); // a atualização não mexe no resto do perfil
  expect((await saved(page)).seenVersion).toBe(current);

  // Uma única vez: reabrir, mesmo sem ter tocado em OK, não mostra de novo.
  await reopen(page);
  await expect(page.getByRole('heading', { name: 'MoscouFishing' })).toBeVisible();
  await expect(news(page)).toHaveCount(0);

  // E o OK fecha o aviso.
  await openWithProfile(page, { ...veteran(), seenVersion: '0.0.1+antiga' });
  await news(page).getByRole('button', { name: 'OK' }).click();
  await expect(news(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^(Jogar|Continuar)$/ })).toBeVisible();
});
