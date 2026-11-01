import { expect, test } from '@playwright/test';
import { openWithProfile, veteran } from './support';

test('Edvaldo tem retrato na cena da vara de carbono e nas outras expressões', async ({ page }) => {
  const profile = veteran();
  await openWithProfile(page, {
    ...profile, charactersIntroduced: ['edvaldo', 'adilson', 'lavinia'],
    story: { ...profile.story!, pendingScene: 'ep1-lenda' },
  });
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Conversa', exact: true });
  const portrait = dialog.locator('[data-character="edvaldo"]');
  await expect(dialog).toContainText('Carbono!');
  await expect(portrait).toHaveClass(/portrait--art/);
  await expect(portrait).toHaveCSS('background-image', /edvaldo-normal/);
  await expect(portrait).toHaveCSS('background-color', 'rgb(36, 73, 107)');
  expect((await portrait.boundingBox())!.width).toBeGreaterThanOrEqual(150);
  await expect(portrait.locator('.portrait__initials')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/edvaldo-na-cena.png' });
  await dialog.click();
  await dialog.click();
  await expect(portrait).toHaveAttribute('data-expression', 'rindo');
  await expect(portrait).toHaveClass(/portrait--art/);
});
