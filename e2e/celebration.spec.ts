import { expect, test, type Page } from '@playwright/test';
import { characters } from '../src/content/characters';
import { advanceUntil, gameState, manualClock, openWithProfile, toScreen, veteran } from './support';

// Celebração exagerada: pose com "PEGOU!" antes da ficha (HUMOR-05) e onomatopeia com tremor de no
// máximo 300 ms na fisgada, na linha arrebentada e na vitória do torneio (HUMOR-06).

const SHAKE_MAX_MS = 300;
const celebration = (page: Page) => page.getByRole('dialog', { name: 'Comemoração' });
const fishCard = (page: Page) => page.getByRole('dialog', { name: 'Ficha do peixe' });

async function play(page: Page) {
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
}

async function castAndBite(page: Page) {
  const p = toScreen(page, 90, 300);
  await page.mouse.click(p.x, p.y);
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
}

/** Anota quando a classe de tremor entra e sai do contêiner da cena. */
const watchShake = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector('section[aria-label="Pescaria"]')!;
    const log: { on: boolean; t: number }[] = [];
    (window as any).shakeLog = log;
    let on = el.classList.contains('tremor');
    new MutationObserver(() => {
      const now = el.classList.contains('tremor');
      if (now !== on) log.push({ on: (on = now), t: performance.now() });
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
  });

/** A cena tremeu uma vez e parou em até 300 ms. */
async function expectShortShake(page: Page) {
  const log = () => page.evaluate(() => (window as any).shakeLog as { on: boolean; t: number }[]);
  await expect.poll(async () => (await log()).length, { timeout: 2000 }).toBe(2);
  const [start, end] = await log();
  expect(start.on).toBe(true);
  expect(end.on).toBe(false);
  expect(end.t - start.t).toBeLessThanOrEqual(SHAKE_MAX_MS);
}

test('HUMOR-05: peixe pego → o Adilson posa com o peixe e "PEGOU!" antes da ficha', async ({ page }) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  await castAndBite(page);
  await page.evaluate(() => (window as any).__mf.press());
  expect(await advanceUntil(page, 'Result_Caught', 40)).toBe('Result_Caught');
  await page.evaluate(() => (window as any).__mf.release());
  const species = (await gameState(page)).fishing.species.name as string;

  await expect(celebration(page)).toBeVisible();
  await expect(celebration(page)).toContainText('PEGOU!');
  const adilson = characters.find((c) => c.id === 'adilson')!.name;
  await expect(celebration(page).getByRole('img', { name: new RegExp(`^${adilson}`) })).toBeVisible();
  await expect(celebration(page).getByRole('img', { name: species })).toBeVisible();
  await expect(fishCard(page)).toHaveCount(0); // a ficha vem depois

  await expect(fishCard(page)).toBeVisible();
  await expect(celebration(page)).toHaveCount(0);
  await expect(fishCard(page)).toContainText(species);
});

test('HUMOR-06: a fisgada mostra "NHAC!" e a cena treme por no máximo 300 ms', async ({ page }) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  await castAndBite(page);
  await watchShake(page);

  await page.evaluate(() => (window as any).__mf.press()); // fisga
  expect((await gameState(page)).fishing.phase).toBe('Fight');
  await expect(page.getByText('NHAC!')).toBeVisible();
  await expectShortShake(page);
});

test('HUMOR-06: a linha arrebentada mostra "PLOFT!" e a cena treme por no máximo 300 ms', async ({ page }) => {
  await openWithProfile(page, veteran('desafio')); // só no Desafio a linha arrebenta
  await manualClock(page);
  await play(page);
  await castAndBite(page);
  await page.evaluate(() => (window as any).__mf.press());
  // O tremor da fisgada ("NHAC!") acaba antes de observar o da linha arrebentada.
  await expect(page.getByRole('region', { name: 'Pescaria' })).not.toHaveClass(/tremor/);
  await watchShake(page);

  expect(await advanceUntil(page, 'Result_Broken', 40)).toBe('Result_Broken');
  await expect(page.getByText('PLOFT!')).toBeVisible();
  await expectShortShake(page);
});

test('HUMOR-06: a vitória no torneio mostra "É CAMPEÃO!" e a cena treme por no máximo 300 ms', async ({ page }) => {
  await openWithProfile(page, {
    ...veteran(),
    charactersIntroduced: characters.map((c) => c.id),
    story: { episodes: { 1: { objectiveIndex: 6, progress: 0, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null },
    tournament: {
      id: 'guanambicup',
      castsLeft: 1,
      catches: [
        { species: 'tambaqui', kg: 9 },
        { species: 'tambaqui', kg: 8 },
        { species: 'tucunare', kg: 6 },
      ],
    },
  });
  await manualClock(page);
  await play(page);
  await page.evaluate(() => {
    const mf = (window as any).__mf;
    mf.tap(90, 365); // último arremesso, sem peixe
    for (let t = 0; t < 20 && mf.state().fishing.phase !== 'Result_Nothing'; t += 0.5) mf.advance(0.5);
  });
  await watchShake(page);
  await page.getByRole('dialog', { name: 'Resultado do arremesso' }).getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('dialog', { name: 'Classificação' })).toContainText('Você venceu');
  await expect(page.getByText('É CAMPEÃO!')).toBeVisible();
  await expectShortShake(page);
});
