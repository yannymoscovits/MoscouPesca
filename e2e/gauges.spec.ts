import { expect, test, type Page } from '@playwright/test';
import type { Profile } from '../src/content/types';
import { expectContrast } from './contrast';
import { advance, castNow, chooseSpot, fishingButton, manualClock, openWithProfile, reelUntilStrike, veteran } from './support';

// Medidores da pescaria (T80; pesca-bass ISCA-13): a Linha solta e a Profundidade da isca em metros, e a
// isca atual, na lateral da cena (ACES-05, ACES-07). A barra de captura da briga está em pescaria.spec.ts.

const gauges = (page: Page) => page.getByRole('group', { name: 'Medidores', exact: true });
const gauge = (page: Page, name: string) => gauges(page).getByRole('group', { name, exact: true });
const mf = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (window as any).__mf.controller[f as string](...(a as unknown[])), [fn, args] as const);

/** Com a Vara de Carbono (alcance 8), o arremesso de força cheia vai a (60 + 24 × 8) × 0,1 = 25,2 m. */
const carbono = (): Partial<Profile> => ({
  ...veteran(),
  rods: { owned: ['bambu', 'fibra', 'carbono'], equipped: 'carbono' },
  baits: { owned: ['minhoca', 'milho', 'carne'], equipped: 'minhoca' },
});

async function play(page: Page) {
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
}

const value = (page: Page, name: string) => gauge(page, name).locator('.gauge__value');

test('ISCA-13: com a isca na água, a Linha solta e a Profundidade da isca em metros, que mudam ao recolher e ao afundar', async ({
  page,
}) => {
  await openWithProfile(page, carbono());
  await manualClock(page);
  await play(page);
  await chooseSpot(page);
  await expect(gauge(page, 'Linha')).toHaveCount(0); // isca ainda na mão

  expect(await castNow(page, 1)).toBe('Lure');
  await expect(value(page, 'Linha')).toHaveText('25,2 m'); // ARREM-03: força cheia, alcance máximo
  await expect(value(page, 'Profundidade')).toHaveText('0,0 m'); // a isca cai na superfície

  // ISCA-02: meio segundo de RECOLHER traz a isca 0,5 m.
  await page.evaluate(() => (window as any).__mf.hold(true));
  await advance(page, 0.5);
  await page.evaluate(() => (window as any).__mf.hold(false));
  await expect(value(page, 'Linha')).toHaveText('24,7 m');

  // ISCA-04: parada, ela afunda 0,9 m por segundo.
  await advance(page, 1);
  await expect(value(page, 'Profundidade')).toHaveText('0,9 m');
  await expect(value(page, 'Linha')).toHaveText('24,7 m');
});

test('T80: o quadradinho da isca mostra a isca equipada e troca junto com ela', async ({ page }) => {
  await openWithProfile(page, carbono());
  await play(page);
  await chooseSpot(page);
  await expect(gauge(page, 'Isca')).toContainText('Minhoca');
  await mf(page, 'equip', 'milho');
  await expect(gauge(page, 'Isca')).toContainText('Milho');
  await expect(gauge(page, 'Isca')).not.toContainText('Minhoca');
});

test('T80, ACES-05, ACES-07: medidores com textos >= 18 px e contraste >= 4,5:1, sem cobrir o painel, os botões nem a barra de captura', async ({
  page,
}) => {
  await openWithProfile(page, carbono());
  await manualClock(page);
  await play(page);
  await chooseSpot(page);

  type Box = { x: number; y: number; width: number; height: number };
  const overlap = (a: Box, b: Box) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  const panel = page.getByRole('group', { name: 'Painel da pescaria' });
  const pause = page.getByRole('button', { name: 'Menu da pescaria', exact: true });
  const menu = page.getByRole('button', { name: 'Recolher painel', exact: false });

  async function expectClear(phase: string, others: { name: string; box: Box }[]) {
    const boxes = await gauges(page)
      .locator('.gauge')
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }),
      );
    expect(boxes.length, phase).toBeGreaterThan(0);
    for (const b of boxes) for (const o of others) expect(overlap(b, o.box), `${phase}: medidor cobre ${o.name}`).toBe(false);
  }

  async function expectReadable(phase: string) {
    const texts = await page.evaluate(() => {
      const found: { text: string; size: number }[] = [];
      const walker = document.createTreeWalker(document.querySelector('.gauges')!, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement!;
        const text = node.textContent!.trim();
        if (text && el.checkVisibility()) found.push({ text, size: parseFloat(getComputedStyle(el).fontSize) });
      }
      return found;
    });
    expect(texts.length, phase).toBeGreaterThan(0);
    expect(texts.filter((t) => t.size < 18), phase).toEqual([]);
    await expectContrast(page, '.gauges');
  }

  // Ataque: "FISGAR!" e RECOLHER embaixo; Linha, Profundidade e Isca visíveis.
  expect(await castNow(page)).toBe('Lure');
  expect(await reelUntilStrike(page)).toBe('Strike');
  await expect(gauge(page, 'Linha')).toBeVisible();
  await expect(gauge(page, 'Profundidade')).toBeVisible();
  await expectClear('ataque', [
    { name: 'o painel', box: (await panel.boundingBox())! },
    { name: 'o FISGAR!', box: (await fishingButton(page, 'puxar').boundingBox())! },
    { name: 'o RECOLHER', box: (await fishingButton(page, 'recolher').boundingBox())! },
    { name: 'o Pausar', box: (await pause.boundingBox())! },
    { name: 'o Menu', box: (await menu.boundingBox())! },
  ]);
  await expectReadable('ataque');

  // Briga: a barra de captura aparece à direita; os medidores não a cobrem.
  await fishingButton(page, 'puxar').click();
  const catchBar = page.getByRole('group', { name: 'Barra de captura' });
  await expect(catchBar).toBeVisible();
  await expectClear('briga', [
    { name: 'o painel', box: (await panel.boundingBox())! },
    { name: 'a barra de captura', box: (await catchBar.boundingBox())! },
    { name: 'o SEGURAR', box: (await fishingButton(page, 'segurar').boundingBox())! },
    { name: 'o Pausar', box: (await pause.boundingBox())! },
    { name: 'o Menu', box: (await menu.boundingBox())! },
  ]);
  await expectReadable('briga');
});
