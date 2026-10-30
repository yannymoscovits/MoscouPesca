import { expect, test, type Page } from '@playwright/test';
import { ep1 } from '../src/content/episodes/ep1';
import { ep2 } from '../src/content/episodes/ep2';
import type { Bait, Rod } from '../src/content/types';
import { gameState, money, openWithProfile, veteran } from './support';

// Loja do Edvaldo (EQUIP-01, EQUIP-02, EQUIP-04, EQUIP-05, EQUIP-09 na tela; EQUIP-03 nos dois toques).

const shop = (page: Page) => page.getByRole('region', { name: 'Loja' });
const item = (page: Page) => shop(page).getByRole('article');
const hud = (page: Page) => page.getByRole('group', { name: 'Painel da pescaria' });

async function openShop(page: Page) {
  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Loja', exact: true }).click();
  await expect(shop(page)).toBeVisible();
}

/** Mostra o item pedido na aba dele, passando com "Próximo". */
async function showItem(page: Page, tab: 'Varas' | 'Iscas', name: string) {
  await shop(page).getByRole('button', { name: tab }).click();
  for (let i = 0; i < 20; i++) {
    if ((await item(page).getByRole('heading').textContent()) === name) return;
    await shop(page).getByRole('button', { name: 'Próximo' }).click();
  }
  throw new Error(`${name} não aparece na loja`);
}

/** Barra de 1 a 10: valor, limites e quantos quadradinhos estão cheios. */
async function bar(page: Page, label: 'Força' | 'Alcance') {
  const meter = item(page).getByRole('meter', { name: label });
  return {
    now: Number(await meter.getAttribute('aria-valuenow')),
    min: Number(await meter.getAttribute('aria-valuemin')),
    max: Number(await meter.getAttribute('aria-valuemax')),
    filled: await meter.locator('[data-filled="true"]').count(),
    cells: await meter.locator('[data-filled]').count(),
  };
}

/** Passa por todos os itens da aba e devolve os nomes, na ordem. */
async function walk(page: Page, tab: 'Varas' | 'Iscas', onEach?: (name: string) => Promise<void>) {
  await shop(page).getByRole('button', { name: tab }).click();
  const total = Number((await shop(page).getByRole('status').textContent())!.match(/de (\d+)/)![1]);
  const names: string[] = [];
  for (let i = 0; i < total; i++) {
    const name = (await item(page).getByRole('heading').textContent())!;
    names.push(name);
    await onEach?.(name);
    if (i < total - 1) await shop(page).getByRole('button', { name: 'Próximo' }).click();
  }
  return names;
}

const names = (items: (Rod | Bait)[]) => items.map((i) => i.name);

test('EQUIP-01, EQUIP-02, EQUIP-09: varas com barras de Força e Alcance de 1 a 10 e iscas, só dos episódios liberados', async ({
  page,
}) => {
  await openWithProfile(page, veteran());
  await openShop(page);

  const rods = await walk(page, 'Varas', async (name) => {
    const rod = ep1.rods.find((r) => r.name === name)!;
    expect(await bar(page, 'Força'), name).toEqual({ now: rod.force, min: 1, max: 10, filled: rod.force, cells: 10 });
    expect(await bar(page, 'Alcance'), name).toEqual({ now: rod.reach, min: 1, max: 10, filled: rod.reach, cells: 10 });
  });
  expect(rods).toEqual(names(ep1.rods)); // a Vara de Bambu e as 2 novas do Episódio 1
  expect(await walk(page, 'Iscas')).toEqual(names(ep1.baits)); // Minhoca e as novas do Episódio 1
  for (const hidden of names([...ep2.rods, ...ep2.baits])) await expect(shop(page)).not.toContainText(hidden);

  // Com o Episódio 2 liberado, as varas e a isca dele aparecem.
  await openWithProfile(page, { ...veteran(), unlockedEpisodes: [1, 2] });
  await openShop(page);
  expect(await walk(page, 'Varas')).toEqual(names([...ep1.rods, ...ep2.rods]));
  expect(await walk(page, 'Iscas')).toEqual(names([...ep1.baits, ...ep2.baits]));
});

test('EQUIP-02: cada isca mostra as espécies que ela atrai', async ({ page }) => {
  await openWithProfile(page, veteran());
  await openShop(page);
  await walk(page, 'Iscas', async (name) => {
    const bait = ep1.baits.find((b) => b.name === name)!;
    const attracted = ep1.species.filter((s) => s.baits.includes(bait.id)).map((s) => s.name);
    const text = (await item(page).getByText(/^Atrai:/).textContent())!;
    expect(text.replace(/^Atrai:\s*/, '').replace(/\.$/, '').split(/, | e /), name).toEqual(attracted);
  });
});

test('EQUIP-04: sem saldo, "Comprar" fica desabilitado e mostra quanto falta', async ({ page }) => {
  await openWithProfile(page, { ...veteran(), money: 0 });
  await openShop(page);
  await showItem(page, 'Varas', 'Vara de Fibra');
  await expect(shop(page).getByRole('button', { name: 'Comprar' })).toBeDisabled();
  await expect(item(page)).toContainText(`Faltam ${money(150)}`);

  await openWithProfile(page, { ...veteran(), money: 100 });
  await openShop(page);
  await showItem(page, 'Varas', 'Vara de Fibra');
  await expect(shop(page).getByRole('button', { name: 'Comprar' })).toBeDisabled();
  await expect(item(page)).toContainText(`Faltam ${money(50)}`);
  await showItem(page, 'Iscas', 'Milho'); // R$ 30: o saldo paga
  await expect(shop(page).getByRole('button', { name: 'Comprar' })).toBeEnabled();
  await expect(item(page)).not.toContainText('Faltam');
});

test('EQUIP-03: dois toques rápidos em "Comprar" descontam uma vez só', async ({ page }) => {
  await openWithProfile(page, { ...veteran(), money: 200 });
  await openShop(page);
  await showItem(page, 'Varas', 'Vara de Fibra');

  // Os dois toques chegam antes de a tela se redesenhar.
  await shop(page)
    .getByRole('button', { name: 'Comprar' })
    .evaluate((btn: HTMLButtonElement) => {
      btn.click();
      btn.click();
    });

  await expect(shop(page)).toContainText(money(50));
  const p = (await gameState(page)).profile;
  expect(p.money).toBe(50);
  expect(p.rods.owned.filter((id: string) => id === 'fibra')).toEqual(['fibra']);
});

test('EQUIP-05: equipar a Vara de Fibra e o Milho muda o equipamento mostrado na tela de pesca', async ({ page }) => {
  await openWithProfile(page, {
    ...veteran(),
    rods: { owned: ['bambu', 'fibra'], equipped: 'bambu' },
    baits: { owned: ['minhoca', 'milho'], equipped: 'minhoca' },
  });
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(hud(page)).toContainText('Vara de Bambu');
  await expect(hud(page)).toContainText('Minhoca');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Loja', exact: true }).click();

  await showItem(page, 'Varas', 'Vara de Fibra');
  await expect(item(page)).toContainText('Já é sua');
  await shop(page).getByRole('button', { name: 'Equipar' }).click();
  await expect(shop(page).getByRole('button', { name: 'Equipada' })).toBeDisabled();
  await showItem(page, 'Iscas', 'Milho');
  await shop(page).getByRole('button', { name: 'Equipar' }).click();
  await expect(shop(page).getByRole('button', { name: 'Equipada' })).toBeDisabled();

  await shop(page).getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: 'Voltar a pescar' }).click();
  await expect(hud(page)).toContainText('Vara de Fibra');
  await expect(hud(page)).toContainText('Milho');
  await expect(hud(page)).not.toContainText('Vara de Bambu');
  await expect(hud(page)).not.toContainText('Minhoca');
  const p = (await gameState(page)).profile;
  expect([p.rods.equipped, p.baits.equipped]).toEqual(['fibra', 'milho']);
});

test('ACES-06, ACES-08: os botões da loja têm no mínimo 56 × 56 px e ficam todos na metade de baixo', async ({ page }) => {
  await openWithProfile(page, { ...veteran(), money: 0 });
  await openShop(page);
  const { height } = page.viewportSize()!;
  for (const btn of await shop(page).getByRole('button').all()) {
    const name = (await btn.textContent())!.trim();
    const box = (await btn.boundingBox())!;
    expect(box.width, name).toBeGreaterThanOrEqual(56);
    expect(box.height, name).toBeGreaterThanOrEqual(56);
    expect(box.y, name).toBeGreaterThanOrEqual(height / 2);
    expect(box.y + box.height, name).toBeLessThanOrEqual(height);
  }
});
