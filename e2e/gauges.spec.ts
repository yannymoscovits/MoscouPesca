import { expect, test, type Page } from '@playwright/test';
import { ep1 } from '../src/content/episodes/ep1';
import type { Profile } from '../src/content/types';
import { expectContrast } from './contrast';
import { advance, advanceUntil, manualClock, openWithProfile, toScreen, veteran } from './support';

// Medidores da pescaria (T80; spec, "Visual da pescaria"): Tensão numa barra vertical (PESCA-12), Linha
// em metros soltos, Profundidade da zona da isca e a isca atual, nas laterais da cena (ACES-05, ACES-07).

const gauges = (page: Page) => page.getByRole('group', { name: 'Medidores', exact: true });
const gauge = (page: Page, name: string) => gauges(page).getByRole('group', { name, exact: true });
const tensionMeter = (page: Page) => gauges(page).getByRole('meter', { name: 'Tensão', exact: true });
const mf = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (window as any).__mf.controller[f as string](...(a as unknown[])), [fn, args] as const);

/** Com a Vara de Carbono (alcance 8), a isca chega ao raso, ao meio e ao fundo do Poço do Magro. */
const carbono = (): Partial<Profile> => ({
  ...veteran(),
  rods: { owned: ['bambu', 'fibra', 'carbono'], equipped: 'carbono' },
  baits: { owned: ['minhoca', 'milho', 'carne'], equipped: 'minhoca' },
});

async function play(page: Page) {
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
}

async function tapWater(page: Page, x: number, y: number) {
  const p = toScreen(page, x, y);
  await page.mouse.click(p.x, p.y);
}

/** Metros como o medidor mostra ("17,0 m") → número. */
async function meters(page: Page, name: string) {
  const text = (await gauge(page, name).locator('.gauge__value').textContent())!;
  expect(text, name).toMatch(/^\d+(,\d)? m$/);
  return Number(text.replace(' m', '').replace(',', '.'));
}

/** Profundidade da zona do Poço do Magro como o medidor mostra: "1,5 m", "4 m". */
const depthText = (zone: string) =>
  `${String(ep1.locations[0].zones.find((z) => z.id === zone)!.depthM).replace('.', ',')} m`;

/** Faixa da barra pela spec (PESCA-12): verde abaixo de 70, amarela de 70 a 89, vermelha de 90 a 100. */
const bandFor = (value: number) => (value < 70 ? 'verde' : value < 90 ? 'amarelo' : 'vermelho');

test('T80, PESCA-12: na briga, a barra vertical de tensão sobe de 0 a 100 e muda de cor em 69/70 e em 89/90', async ({
  page,
}) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  await tapWater(page, 90, 300);
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  await expect(tensionMeter(page)).toHaveCount(0); // só na briga
  await page.evaluate(() => (window as any).__mf.press()); // fisga e segura

  const meter = tensionMeter(page);
  await expect(meter).toBeVisible();
  await expect(meter).toHaveAttribute('aria-valuemin', '0');
  await expect(meter).toHaveAttribute('aria-valuemax', '100');
  const box = (await meter.boundingBox())!;
  expect(box.height, 'barra vertical').toBeGreaterThan(box.width * 3);

  // Segura em passos curtos e lê a barra depois de cada um: valor, faixa, matiz e altura do preenchimento.
  const samples = await page.evaluate(async () => {
    const game = (window as any).__mf;
    const hue = (rgb: string) => {
      const [r, g, b] = rgb.match(/\d+/g)!.slice(0, 3).map((n) => Number(n) / 255);
      const max = Math.max(r, g, b);
      const d = max - Math.min(r, g, b);
      if (d === 0) return -1;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const out: { value: number; band: string | null; hue: number; filled: number }[] = [];
    while (game.state().fishing.phase === 'Fight' && game.state().fishing.tension < 95) {
      game.advance(0.005);
      await new Promise((r) => setTimeout(r, 0));
      const el = document.querySelector('.gauges [role="meter"]') as HTMLElement;
      const fill = el.querySelector('[data-fill]') as HTMLElement;
      out.push({
        value: Number(el.getAttribute('aria-valuenow')),
        band: el.getAttribute('data-band'),
        hue: hue(getComputedStyle(fill).backgroundColor),
        filled: (fill.getBoundingClientRect().height / el.clientHeight) * 100,
      });
    }
    return out;
  });

  const seen = new Set(samples.map((s) => s.value));
  for (const v of [69, 70, 89, 90]) expect(seen.has(v), `valor ${v} lido na barra vertical`).toBe(true);
  for (const s of samples) {
    expect(s.band, `tensão ${s.value}`).toBe(bandFor(s.value));
    const color =
      s.hue >= 80 && s.hue <= 160
        ? 'verde'
        : s.hue >= 40 && s.hue < 70
          ? 'amarelo'
          : s.hue <= 15 || s.hue >= 345
            ? 'vermelho'
            : `matiz ${s.hue}`;
    expect(color, `cor da barra em ${s.value}`).toBe(bandFor(s.value));
    expect(Math.abs(s.filled - s.value), `altura do preenchimento em ${s.value}`).toBeLessThanOrEqual(2);
  }
});

test('T80: Linha cresce com a distância do arremesso, diminui ao segurar e aumenta ao soltar; Profundidade é a da zona da isca', async ({
  page,
}) => {
  await openWithProfile(page, carbono());
  await manualClock(page);
  await play(page);
  await expect(gauge(page, 'Linha')).toHaveCount(0); // isca fora d'água

  // Raso (y de 250 a 360): perto da margem.
  await tapWater(page, 90, 300);
  await advance(page, 1);
  await expect(gauge(page, 'Profundidade').locator('.gauge__value')).toHaveText(depthText('raso'));
  const near = await meters(page, 'Linha');
  expect(near).toBeGreaterThan(0);
  expect(await advanceUntil(page, 'Result_Escaped')).toBe('Result_Escaped');
  await mf(page, 'dismissResult');

  // Meio (y de 150 a 250): mais longe, mais linha.
  await tapWater(page, 90, 200);
  await advance(page, 1);
  await expect(gauge(page, 'Profundidade').locator('.gauge__value')).toHaveText(depthText('meio'));
  const far = await meters(page, 'Linha');
  expect(far, 'arremesso mais longe solta mais linha').toBeGreaterThan(near);

  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  await page.evaluate(() => (window as any).__mf.press()); // fisga e segura
  const start = await meters(page, 'Linha');
  await advance(page, 1);
  const held = await meters(page, 'Linha');
  expect(held, 'segurando recolhe a linha').toBeLessThan(start);
  await page.evaluate(() => (window as any).__mf.release());
  await advance(page, 1);
  const released = await meters(page, 'Linha');
  expect(released, 'soltando, o peixe puxa linha').toBeGreaterThan(held);
  await expect(gauge(page, 'Profundidade').locator('.gauge__value')).toHaveText(depthText('meio'));

  await page.evaluate(() => (window as any).__mf.press());
  expect(await advanceUntil(page, 'Result_Caught', 60)).toBe('Result_Caught');
  await page.evaluate(() => (window as any).__mf.release());
  await mf(page, 'dismissResult');

  // Fundo (y de 0 a 150).
  await tapWater(page, 90, 130);
  await advance(page, 1);
  await expect(gauge(page, 'Profundidade').locator('.gauge__value')).toHaveText(depthText('fundo'));
});

test('T80: o quadradinho da isca mostra a isca equipada e troca junto com ela', async ({ page }) => {
  await openWithProfile(page, carbono());
  await play(page);
  await expect(gauge(page, 'Isca')).toContainText('Minhoca');
  await mf(page, 'equip', 'milho');
  await expect(gauge(page, 'Isca')).toContainText('Milho');
  await expect(gauge(page, 'Isca')).not.toContainText('Minhoca');
});

test('T80, ACES-05, ACES-07: medidores com textos >= 18 px e contraste >= 4,5:1, sem cobrir o painel, o "FISGAR!" nem os botões', async ({
  page,
}) => {
  await openWithProfile(page, carbono());
  await manualClock(page);
  await play(page);

  type Box = { x: number; y: number; width: number; height: number };
  const overlap = (a: Box, b: Box) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  const panel = page.getByRole('group', { name: 'Painel da pescaria' });
  const pause = page.getByRole('button', { name: 'Pausar', exact: true });
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  const hook = page.getByRole('button', { name: 'FISGAR!' });

  async function expectClear(phase: string, others: { name: string; box: Box }[]) {
    const parts = gauges(page).locator('.gauge, .gauge-tension');
    const boxes = await parts.evaluateAll((els) =>
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

  // Mordida: "FISGAR!" na metade de baixo, Linha, Profundidade e Isca visíveis.
  await tapWater(page, 90, 200);
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  await expect(hook).toBeVisible();
  await expect(gauge(page, 'Linha')).toBeVisible();
  await expect(gauge(page, 'Profundidade')).toBeVisible();
  await expectClear('mordida', [
    { name: 'o painel', box: (await panel.boundingBox())! },
    { name: 'o FISGAR!', box: (await hook.boundingBox())! },
    { name: 'o Pausar', box: (await pause.boundingBox())! },
    { name: 'o Menu', box: (await menu.boundingBox())! },
  ]);
  await expectReadable('mordida');

  // Briga: a barra vertical aparece; o painel cresce com a barra dele.
  await page.evaluate(() => (window as any).__mf.press());
  await advance(page, 0.5);
  await expect(tensionMeter(page)).toBeVisible();
  await expectClear('briga', [
    { name: 'o painel', box: (await panel.boundingBox())! },
    { name: 'o Pausar', box: (await pause.boundingBox())! },
    { name: 'o Menu', box: (await menu.boundingBox())! },
  ]);
  await expectReadable('briga');
});
