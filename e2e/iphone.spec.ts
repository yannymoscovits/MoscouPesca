import { expect, test } from '@playwright/test';

test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1' });

test('iPhone: abertura sem sobreposição e instruções para instalar no Safari', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto('/');
  const install = page.getByRole('button', { name: 'Como instalar', exact: true });
  await expect(install).toBeVisible();
  const dedication = await page.locator('.dedication').boundingBox();
  const first = await install.boundingBox();
  const play = await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).boundingBox();
  expect(dedication!.y + dedication!.height).toBeLessThan(first!.y);
  expect(play!.y + play!.height).toBeLessThanOrEqual(640);
  await page.screenshot({ path: 'test-results/iphone-abertura.png' });
  await install.click();
  const help = page.getByRole('dialog', { name: 'Como instalar o jogo' });
  await expect(help.getByRole('button', { name: 'iPhone / iPad', exact: true })).toBeVisible();
  await expect(help.getByRole('button', { name: 'Android', exact: true })).toBeVisible();
  await expect(help).toContainText('Compartilhar');
  await expect(help).toContainText('Adicionar à Tela de Início');
  await expect(help).toContainText('Chrome ou WhatsApp');
  await help.getByRole('button', { name: 'Android', exact: true }).click();
  await expect(help).toContainText('Chrome, lá no alto');
  await help.getByRole('button', { name: 'iPhone / iPad', exact: true }).click();
  await expect(help).toContainText('Compartilhar');
  await page.screenshot({ path: 'test-results/iphone-instalar.png' });
  await help.getByRole('button', { name: 'Entendi', exact: true }).click();
  await expect(help).toHaveCount(0);
});

test('iPhone instalado não oferece instalação novamente', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^(Jogar|Continuar)$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Como instalar', exact: true })).toHaveCount(0);
});
