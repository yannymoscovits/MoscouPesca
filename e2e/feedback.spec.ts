import { expect, test } from '@playwright/test';
import { castNow, chooseSpot, manualClock, openWithProfile, veteran } from './support';

test('pontos distinguem peixes pescados dos ainda não registrados', async ({ page }) => {
  await page.setViewportSize({ width: 308, height: 680 });
  await openWithProfile(page, {
    ...veteran(), rods: { owned: ['bambu', 'fibra'], equipped: 'fibra' },
    album: { tilapia: { recordKg: 1 }, traira: { recordKg: 2 }, tucunare: { recordKg: 2 } },
  });
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await page.locator('[data-spot="meio"]').click();
  await expect(page.locator('.spots__progress')).toHaveText('3 de 5 espécies pescadas');
  await expect(page.locator('.spot-species--caught')).toHaveCount(3);
  await expect(page.locator('.spot-species').filter({ hasText: 'Piranha Lavínia' })).toContainText('Ainda não pescado');
  await expect(page.locator('.spot-species').filter({ hasText: '???' })).toContainText('A descobrir');
  const bounds = await page.locator('.spots__sheet').boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(680);
  await page.screenshot({ path: 'test-results/peixes-pescados-check.png' });
});

test('equipamento é opcional e não sobrepõe os pontos', async ({ page }) => {
  await page.setViewportSize({ width: 308, height: 680 });
  await openWithProfile(page, veteran());
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Equipamento', exact: true }).click();
    await expect.poll(() => page.evaluate(() => {
      const controls = document.querySelector('.hud__top')!.getBoundingClientRect();
      const cards = [...document.querySelectorAll('[data-spot]')].map(el => el.getBoundingClientRect().top);
      return Math.min(...cards) - controls.bottom;
    })).toBeGreaterThanOrEqual(8);
    await expect(page.locator('.spots > .stage')).toHaveCount(0);
    await page.getByRole('button', { name: 'Fechar detalhes' }).click();
    await expect(page.getByRole('group', { name: 'Painel da pescaria', exact: true })).toBeVisible();
  }
  await page.screenshot({ path: 'test-results/selecao-painel-recolhido.png' });
});

test('escolha mostra só os pontos, com pedras visíveis no Pedral', async ({ page }) => {
  await openWithProfile(page, {
    ...veteran(),
    rods: { owned: ['bambu', 'fibra'], equipped: 'fibra' },
  });
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await expect(page.locator('.spots > .stage')).toHaveCount(0);
  const rocks = page.locator('[data-spot="meio"] canvas');
  await expect.poll(() => rocks.evaluate((canvas: HTMLCanvasElement) => {
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] === 137 && pixels[i + 1] === 149 && pixels[i + 2] === 161) count++;
    }
    return count;
  })).toBeGreaterThan(10);
  await page.screenshot({ path: 'test-results/escolha-pontos-distintos.png' });
  await page.locator('[data-spot="meio"]').click();
  await page.locator('[data-action="pescar-aqui"]').click();
  await expect(page.locator('[data-button="arremessar"]')).toBeVisible();
});

test('medidores mostram a isca inteira em tela pequena', async ({ page }) => {
  await page.setViewportSize({ width: 308, height: 680 });
  await openWithProfile(page, {
    ...veteran(),
    rods: { owned: ['bambu', 'fibra'], equipped: 'fibra' },
    baits: { owned: ['minhoca', 'carne'], equipped: 'carne' },
  });
  await manualClock(page);
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await chooseSpot(page);
  await castNow(page);
  await page.getByRole('button', { name: 'Equipamento', exact: true }).click();
  const metrics = await page.locator('.gauges').evaluate((container) => {
    const bounds = container.getBoundingClientRect();
    const bait = container.querySelector('.gauge--bait')!.getBoundingClientRect();
    const text = container.querySelector('.gauge--bait .gauge__value')!.getBoundingClientRect();
    const actions = document.querySelector('.pesca-buttons')!.getBoundingClientRect();
    return { bottom: bounds.bottom, baitBottom: bait.bottom, textBottom: text.bottom, actionsTop: actions.top };
  });
  expect(metrics.baitBottom).toBeLessThanOrEqual(metrics.bottom);
  expect(metrics.textBottom).toBeLessThanOrEqual(metrics.bottom);
  expect(metrics.baitBottom).toBeLessThan(metrics.actionsTop);
  await page.screenshot({ path: 'test-results/medidores-tela-pequena.png' });
});

test('tela limpa, menu identificado e acesso à loja', async ({ page }) => {
  await openWithProfile(page, veteran());
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await chooseSpot(page);
  await expect(page.locator('.hud__equipment')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Medidores', exact: true })).toHaveCount(0);
  await expect(page.locator('[data-button="arremessar"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/pescaria-recolhida.png' });
  await page.getByRole('button', { name: 'Equipamento', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Painel da pescaria', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Menu da pescaria', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Menu', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Pausado', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Loja', exact: true }).click();
  await expect(page.locator('.app-scenery svg').first()).toBeVisible();
  await page.getByText('Edvaldo explica a loja', { exact: true }).click();
  await expect(page.locator('.shop__help')).toContainText('Beira do píer');
  await page.screenshot({ path: 'test-results/loja-cenario.png' });
});

test('objetivo de compra abre loja diretamente e voltar retorna à pescaria', async ({ page }) => {
  await page.setViewportSize({ width: 308, height: 680 });
  const profile = veteran();
  await openWithProfile(page, {
    ...profile, money: 197,
    rods: { owned: ['bambu', 'fibra'], equipped: 'fibra' },
    baits: { owned: ['minhoca', 'carne'], equipped: 'carne' },
    story: { ...profile.story!, episodes: { 1: { objectiveIndex: 3, progress: 0, won: false } } },
  });
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await chooseSpot(page);
  await expect(page.getByRole('button', { name: 'Loja Varas e iscas', exact: true })).toBeVisible();
  expect(await page.locator('.hud__shop').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(page.locator('.hud__objective--shop')).toContainText('Vara de Carbono');
  await page.screenshot({ path: 'test-results/pescaria-interface-simples.png' });
  await page.getByRole('button', { name: /Ir à loja/ }).click();
  await expect(page.getByRole('heading', { name: 'Loja do Edvaldo' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Pescaria', exact: true })).toBeVisible();
});
