import { expect, test, type Page } from '@playwright/test';
import { ep1 } from '../src/content/episodes/ep1';
import { openWithProfile, veteran } from './support';

// Álbum de peixes (ALBUM-03): espécies pegas com o recorde; as que faltam como silhueta "???".

const album = (page: Page) => page.getByRole('region', { name: 'Álbum' });
const entries = (page: Page) => album(page).getByRole('list', { name: 'Espécies' }).getByRole('listitem');

async function openAlbum(page: Page) {
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await page.getByRole('button', { name: 'Menu da pescaria', exact: true }).click();
  await page.getByRole('button', { name: 'Álbum', exact: true }).click();
  await expect(album(page)).toBeVisible();
}

test('ALBUM-03: depois de pegar uma tilápia, ela aparece com o recorde e as outras espécies do local como silhueta "???"', async ({
  page,
}) => {
  await openWithProfile(page, { ...veteran(), album: { tilapia: { recordKg: 1.23 } } });
  await openAlbum(page);
  await expect(album(page)).toContainText('Barragem do Poço do Magro');

  // Spec-precision gap: o Done-when diz "as outras 5"; o Episódio 1 tem hoje 8 espécies, então faltam 7.
  const others = ep1.species.length - 1;
  await expect(entries(page)).toHaveCount(ep1.species.length);

  const tilapia = entries(page).filter({ hasText: 'Tilápia' });
  await expect(tilapia).toHaveCount(1);
  await expect(tilapia).toContainText('1,23 kg');
  await expect(tilapia.getByRole('img', { name: 'Tilápia' })).toBeVisible();

  const missing = entries(page).filter({ hasText: '???' });
  await expect(missing).toHaveCount(others);
  await expect(missing.getByRole('img', { name: 'Peixe desconhecido' })).toHaveCount(others);
  // As que faltam não entregam o nome, nem na tela nem para o leitor de tela.
  for (const sp of ep1.species.filter((s) => s.id !== 'tilapia')) {
    await expect(album(page)).not.toContainText(sp.name);
    await expect(album(page).getByRole('img', { name: sp.name })).toHaveCount(0);
  }
});

test('ACES-06, ACES-08: os botões do álbum têm no mínimo 56 × 56 px e ficam todos na metade de baixo', async ({ page }) => {
  await openWithProfile(page, veteran());
  await openAlbum(page);
  const { height } = page.viewportSize()!;
  const buttons = await album(page).getByRole('button').all();
  expect(buttons.length).toBeGreaterThan(0);
  for (const btn of buttons) {
    const name = (await btn.textContent())!.trim();
    const box = (await btn.boundingBox())!;
    expect(box.width, name).toBeGreaterThanOrEqual(56);
    expect(box.height, name).toBeGreaterThanOrEqual(56);
    expect(box.y, name).toBeGreaterThanOrEqual(height / 2);
    expect(box.y + box.height, name).toBeLessThanOrEqual(height);
  }
});
