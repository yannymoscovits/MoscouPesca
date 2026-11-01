import { expect, test } from '@playwright/test';
import { openWithProfile, veteran } from './support';

test('piranha aparece com provocação no capítulo 3 e não repete ao reabrir', async ({ page }) => {
  await page.setViewportSize({ width: 308, height: 680 });
  await openWithProfile(page, {
    ...veteran(), unlockedEpisodes: [1, 2, 3], currentLocation: 'vera-cruz',
    charactersIntroduced: ['adilson', 'lavinia'],
    album: { 'piranha-lavinia': { recordKg: 0.8 } },
  });
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Conversa', exact: true });
  await dialog.click();
  await expect(dialog.getByRole('img', { name: 'Piranha Lavínia', exact: true })).toBeVisible();
  await expect(dialog).toContainText('Cheguei faz duas horas.');
  await page.screenshot({ path: 'test-results/lavinia-capitulo-3.png' });
  for (let i = 0; i < 3; i++) await dialog.click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await expect(dialog).toHaveCount(0);
});
