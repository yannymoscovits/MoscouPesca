import { expect, test, type Page } from '@playwright/test';
import { advanceUntil, gameState, manualClock, openWithProfile, toScreen, veteran } from './support';

// Pausa, celular deitado e aviso de salvamento (SAVE-01, SAVE-02, ACES-10, edge case do armazenamento cheio).

const PAUSED = 'Pausado - toque para continuar';
const ROTATE = 'Vire o celular em pé para jogar';

async function play(page: Page) {
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
}

/** O navegador avisa que a página ficou oculta (tela desligada, outro app) ou voltou. */
const setVisibility = (page: Page, state: 'hidden' | 'visible') =>
  page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => s });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => s === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);

const fight = async (page: Page) => {
  const { fishing } = await gameState(page);
  return { phase: fishing.phase, tension: fishing.tension, distance: fishing.distance };
};

test('SAVE-01, SAVE-02: oculto no meio da briga, nada muda em 3 s; ao voltar, "Pausado" espera o toque', async ({ page }) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  const p = toScreen(page, 90, 300);
  await page.mouse.click(p.x, p.y);
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  await page.evaluate(() => {
    const mf = (window as any).__mf;
    mf.press(); // fisga e segura
    mf.advance(0.5);
    mf.clock('real'); // daqui em diante, o laço do jogo move a briga
  });

  // Com o relógio de verdade, a briga anda sozinha.
  const moving = await fight(page);
  await expect.poll(async () => (await fight(page)).distance).not.toBe(moving.distance);

  await setVisibility(page, 'hidden');
  const frozen = await fight(page);
  expect(frozen.phase).toBe('Fight');
  await page.waitForTimeout(3000);
  expect(await fight(page)).toEqual(frozen); // SAVE-01: tensão e distância congeladas

  await setVisibility(page, 'visible');
  await expect(page.getByText(PAUSED)).toBeVisible();
  await page.waitForTimeout(1000);
  expect(await fight(page)).toEqual(frozen); // SAVE-02: sem o toque, continua parado

  await page.getByText(PAUSED).click();
  await expect(page.getByText(PAUSED)).toBeHidden();
  expect((await gameState(page)).paused).toBe(false);
  await expect.poll(async () => (await fight(page)).distance).not.toBe(frozen.distance); // retomou
});

test('SAVE-02: o botão de pausa mostra "Pausado - toque para continuar" e o toque retoma', async ({ page }) => {
  await openWithProfile(page, veteran());
  await play(page);

  await page.getByRole('button', { name: 'Pausar' }).click();
  await expect(page.getByText(PAUSED)).toBeVisible();
  expect((await gameState(page)).paused).toBe(true);

  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText(PAUSED)).toBeHidden();
  expect((await gameState(page)).paused).toBe(false);
});

test('ACES-10: em paisagem fora do modo instalado, o jogo pausa e pede para virar o celular', async ({ page }) => {
  await openWithProfile(page, veteran());
  await play(page);
  const { width, height } = page.viewportSize()!;

  await page.setViewportSize({ width: height, height: width });
  await expect(page.getByText(ROTATE)).toBeVisible();
  expect((await gameState(page)).paused).toBe(true);

  await page.setViewportSize({ width, height });
  await expect(page.getByText(ROTATE)).toBeHidden();
  await expect(page.getByText(PAUSED)).toBeVisible(); // volta pausado, esperando o toque (SAVE-02)
  await page.getByText(PAUSED).click();
  expect((await gameState(page)).paused).toBe(false);
});

test('ACES-10: instalado (modo standalone), virar o celular não pausa nem mostra o aviso', async ({ page }) => {
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (query: string) =>
      query.includes('display-mode: standalone')
        ? ({ matches: true, media: query, onchange: null, addEventListener() {}, removeEventListener() {} } as any)
        : real(query);
  });
  await openWithProfile(page, veteran());
  await play(page);
  const { width, height } = page.viewportSize()!;

  await page.setViewportSize({ width: height, height: width });
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
  await expect(page.getByText(ROTATE)).toHaveCount(0);
  expect((await gameState(page)).paused).toBe(false);
});

test('armazenamento cheio: "Não consegui salvar" aparece uma vez só na sessão e o jogo continua', async ({ page }) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('O armazenamento está cheio', 'QuotaExceededError');
    };
  });
  const warning = page.getByRole('alert').filter({ hasText: 'Não consegui salvar' });
  await expect(warning).toHaveCount(0);

  await page.evaluate(() => (window as any).__mf.controller.setDifficulty('desafio')); // evento que salva
  await expect(warning).toBeVisible();
  await warning.getByRole('button', { name: 'OK' }).click();
  await expect(warning).toHaveCount(0);

  await page.evaluate(() => (window as any).__mf.controller.setVibration(false)); // falha de novo
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50))));
  expect((await gameState(page)).saveWarning).toBe(false);
  await expect(warning).toHaveCount(0);

  const p = toScreen(page, 90, 300);
  await page.mouse.click(p.x, p.y);
  expect((await gameState(page)).fishing.phase).toBe('Flying'); // segue jogável
});
