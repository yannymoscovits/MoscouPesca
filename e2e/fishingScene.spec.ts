import { expect, test, type Page } from '@playwright/test';
import { advance, advanceUntil, gameState, manualClock, openWithProfile, toScreen, veteran } from './support';

// Cena da pescaria (T79; spec, "Visual da pescaria"): o Adilson de costas no lugar de pesca, a linha,
// a boia, a sombra do peixe e o "!"; desenho a no máximo 30 quadros por segundo e nada na pausa.

/** Print do Pixel 7: em docs/arte/mockups com SAVE_SHOTS=1, senão na saída do teste. */
const shotPath = (name: string) => (process.env.SAVE_SHOTS ? `docs/arte/mockups/${name}` : test.info().outputPath(name));

async function play(page: Page) {
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
}

/** Espera o laço desenhar a cena de novo. */
const nextFrames = (page: Page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 80)))));

/** Pixels vermelhos da boia na tela, perto de um ponto da cena. */
async function bobberAt(page: Page, x: number, y: number) {
  const p = toScreen(page, x, y);
  const shot = await page.screenshot({ clip: { x: p.x - 12, y: p.y - 16, width: 24, height: 24 } });
  return page.evaluate(async (png) => {
    const img = new Image();
    img.src = `data:image/png;base64,${png}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, img.width, img.height).data;
    let red = 0;
    for (let i = 0; i < px.length; i += 4) if (px[i] > 180 && px[i + 1] < 110 && px[i + 2] < 110) red++;
    return red;
  }, shot.toString('base64'));
}

test('T79: prints do Pixel 7 da pescaria em espera, mordida e briga, com a boia na água', async ({ page }) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);

  const p = toScreen(page, 120, 260);
  await page.mouse.click(p.x, p.y);
  await advance(page, 1.5);
  const { phase, at } = (await gameState(page)).fishing;
  expect(phase).toBe('Waiting');
  await nextFrames(page);
  expect(await bobberAt(page, at.x, at.y), 'boia vermelha na água').toBeGreaterThan(0);
  await page.screenshot({ path: shotPath('pesca-depois-espera.png'), animations: 'disabled' });

  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  await nextFrames(page);
  await page.screenshot({ path: shotPath('pesca-depois-mordida.png'), animations: 'disabled' });

  await page.evaluate(() => (window as any).__mf.press());
  await advance(page, 1);
  expect((await gameState(page)).fishing.phase).toBe('Fight');
  await nextFrames(page);
  await expect(page.getByRole('meter', { name: 'Tensão da linha' })).toBeVisible();
  await page.screenshot({ path: shotPath('pesca-depois-briga.png'), animations: 'disabled' });
});

test('T79, SAVE-01: a cena desenha a no máximo 30 quadros por segundo e, pausada, não desenha nem anima o fundo', async ({
  page,
}) => {
  // Cada quadro da cena começa limpando o canvas: contar os clearRect conta os quadros desenhados.
  await page.addInitScript(() => {
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    (window as any).frames = 0;
    CanvasRenderingContext2D.prototype.clearRect = function (...args: Parameters<typeof clear>) {
      (window as any).frames++;
      return clear.apply(this, args);
    };
  });
  await openWithProfile(page, veteran());
  await play(page);
  const frames = () => page.evaluate(() => (window as any).frames as number);

  const start = await frames();
  await page.waitForTimeout(2000);
  const drawn = (await frames()) - start;
  expect(drawn, 'quadros em 2 s').toBeGreaterThan(20);
  expect(drawn, 'quadros em 2 s').toBeLessThanOrEqual(62);

  await page.getByRole('button', { name: 'Pausar' }).click();
  await expect(page.getByText('Pausado')).toBeVisible();
  await page.waitForTimeout(200);
  const paused = await frames();
  await page.waitForTimeout(1000);
  expect((await frames()) - paused, 'quadros na pausa').toBe(0);
  const states = await page.evaluate(() =>
    document
      .querySelector('.fishing .title-scene')!
      .getAnimations({ subtree: true })
      .map((a) => a.playState),
  );
  expect(states.length).toBeGreaterThan(0);
  expect(new Set(states)).toEqual(new Set(['paused']));

  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForTimeout(500);
  expect(await frames(), 'volta a desenhar').toBeGreaterThan(paused);
});
