import { expect, test, type Page } from '@playwright/test';
import { castNow, chooseSpot, fishingButton, gameState, hookNow, manualClock, openWithProfile, veteran } from './support';

// Cena da pescaria (T79, refeita na pesca-bass): a vista de cima na mira, a vista debaixo d'água com a
// isca e os peixes e a briga; desenho a no máximo 30 quadros por segundo e nada na pausa.

/** Print do Pixel 7: em docs/arte/mockups com SAVE_SHOTS=1, senão na saída do teste. */
const shotPath = (name: string) => (process.env.SAVE_SHOTS ? `docs/arte/mockups/${name}` : test.info().outputPath(name));

async function play(page: Page) {
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
}

/** Espera o laço desenhar a cena de novo. */
const nextFrames = (page: Page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 80)))));

/**
 * Onde fica a isca que acabou de cair, na tela: a câmera a deixa a 40% da largura, e na superfície, que
 * fica a 30% dos três quartos de cima da vista (underwaterRenderer). Vista em px lógicos de escala 2
 * (abaixo de 540 px de largura), com o canvas ancorado embaixo.
 */
function landedLure(page: Page) {
  const { width, height } = page.viewportSize()!;
  const viewW = Math.ceil(width / 2);
  const viewH = Math.ceil(height / 2);
  return { x: Math.round(viewW * 0.4) * 2, y: height - viewH * 2 + viewH * 0.75 * 0.3 * 2 };
}

/** Pixels vermelhos da isca na tela, em volta de um ponto da tela. */
async function lureAt(page: Page, p: { x: number; y: number }) {
  const shot = await page.screenshot({ clip: { x: p.x - 12, y: p.y - 12, width: 24, height: 24 } });
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

test('T79, ISCA-01: prints do Pixel 7 da mira, da isca na água e da briga, com a isca vermelha onde ela está', async ({ page }) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  await chooseSpot(page);
  await nextFrames(page);
  await page.screenshot({ path: shotPath('pesca-depois-mira.png'), animations: 'disabled' });

  expect(await castNow(page)).toBe('Lure'); // relógio parado: a isca fica na superfície, onde caiu
  await page.waitForTimeout(700); // o respingo na vista de cima acaba (ARREM-05)
  await nextFrames(page);
  expect((await gameState(page)).fishing.water.lure.depthM).toBe(0);
  expect(await lureAt(page, landedLure(page)), 'isca vermelha na água').toBeGreaterThan(0);

  await page.screenshot({ path: shotPath('pesca-depois-isca.png'), animations: 'disabled' });

  expect(await hookNow(page)).toBe('Fight');
  await nextFrames(page);
  await expect(page.getByRole('group', { name: 'Barra de captura' })).toBeVisible();
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

  // O mesmo na cena do ponto escolhido (vista de cima), com a seta balançando.
  await chooseSpot(page);
  await expect(fishingButton(page, 'arremessar')).toBeVisible();
  const atSpot = await frames();
  await page.waitForTimeout(1000);
  const spotDrawn = (await frames()) - atSpot;
  expect(spotDrawn, 'quadros em 1 s no ponto').toBeGreaterThan(10);
  expect(spotDrawn, 'quadros em 1 s no ponto').toBeLessThanOrEqual(31);
  await page.getByRole('button', { name: 'Pausar' }).click();
  await page.waitForTimeout(200);
  const pausedAtSpot = await frames();
  await page.waitForTimeout(1000);
  expect((await frames()) - pausedAtSpot, 'quadros na pausa, no ponto').toBe(0);
});

