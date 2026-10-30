import { expect, test, type Page } from '@playwright/test';
import { advanceUntil, gameState, manualClock, money, openWithProfile, toScreen, veteran } from './support';

// Aviso de mordida e ficha do peixe (PESCA-06, PESCA-07, PESCA-15, HUMOR-03, ALBUM-02),
// e os avisos de quando não vem peixe (PESCA-05, PESCA-09, PESCA-13).

const fishCard = (page: Page) => page.getByRole('dialog', { name: 'Ficha do peixe' });
const kg = (n: number) => `${n.toFixed(2).replace('.', ',')} kg`;

async function play(page: Page) {
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
}

async function castAt(page: Page, x: number, y: number) {
  const p = toScreen(page, x, y);
  await page.mouse.click(p.x, p.y);
}

/** Arremessa, fisga e segura até o peixe chegar (no Tranquilo, segurar sempre traz o peixe). */
async function catchFish(page: Page) {
  await castAt(page, 90, 300);
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  await page.evaluate(() => (window as any).__mf.press());
  expect(await advanceUntil(page, 'Result_Caught', 40)).toBe('Result_Caught');
  await page.evaluate(() => (window as any).__mf.release());
}

test('PESCA-06: na mordida aparecem o "!" e o botão "FISGAR!", inteiro na metade de baixo da tela', async ({ page }) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  await expect(page.getByRole('button', { name: 'FISGAR!' })).toHaveCount(0);

  await castAt(page, 90, 300);
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');

  await expect(page.getByText('!', { exact: true })).toBeVisible();
  const hook = page.getByRole('button', { name: 'FISGAR!' });
  await expect(hook).toBeVisible();
  const { width, height } = page.viewportSize()!;
  const box = (await hook.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(height / 2);
  expect(box.y + box.height).toBeLessThanOrEqual(height);
  // "ocupando a metade de baixo": pelo menos metade da altura dela e quase toda a largura
  expect(box.height).toBeGreaterThanOrEqual(height / 4);
  expect(box.width).toBeGreaterThanOrEqual(width * 0.8);

  await hook.click(); // PESCA-08: o toque fisga
  expect((await gameState(page)).fishing.phase).toBe('Fight');
  await expect(hook).toHaveCount(0);
});

async function biteVibrations(page: Page, vibration: boolean) {
  await page.addInitScript(() => {
    const calls: unknown[] = ((window as any).vibrateCalls = []);
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: unknown) => {
        calls.push(pattern);
        return true;
      },
    });
  });
  await openWithProfile(page, { ...veteran(), settings: { difficulty: 'tranquilo', vibration } });
  await manualClock(page);
  await play(page);
  await castAt(page, 90, 300);
  const before = await page.evaluate(() => [...(window as any).vibrateCalls]);
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  const after = await page.evaluate(() => [...(window as any).vibrateCalls]);
  return { before, after };
}

test('PESCA-07: com a vibração ligada, a mordida vibra o celular por 300 ms', async ({ page }) => {
  const { before, after } = await biteVibrations(page, true);
  expect(before).toEqual([]);
  expect(after).toEqual([300]);
});

test('PESCA-07: com a vibração desligada, a mordida não vibra', async ({ page }) => {
  const { after } = await biteVibrations(page, false);
  expect(after).toEqual([]);
});

test('PESCA-15, HUMOR-03: a ficha mostra o desenho, a espécie, o peso com 2 casas, o valor em R$ e a descrição', async ({
  page,
}) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  await catchFish(page);

  const { fishing } = await gameState(page);
  const card = fishCard(page);
  await expect(card).toBeVisible();
  await expect(card.getByRole('img', { name: fishing.species.name })).toBeVisible();
  await expect(card.getByRole('heading', { name: fishing.species.name })).toBeVisible();
  await expect(card).toContainText(kg(fishing.kg));
  await expect(card).toContainText(`Valor: ${money(fishing.value)}`);
  await expect(card).toContainText(fishing.species.description);

  await card.getByRole('button', { name: 'Continuar' }).click();
  await expect(card).toBeHidden();
  expect((await gameState(page)).fishing.phase).toBe('Idle');
});

test('Ficha da Piranha Lavínia: mostra "Valor: inestimável" e o saldo recebe o valor normal', async ({ page }) => {
  await openWithProfile(page, { ...veteran(), baits: { owned: ['minhoca', 'carne'], equipped: 'carne' } });
  await manualClock(page, 5);
  await play(page);
  await castAt(page, 90, 300);
  await page.evaluate(() => (window as any).__mf.advance(1));
  expect((await gameState(page)).fishing.bite.species.id).toBe('piranha-lavinia');
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  await page.evaluate(() => (window as any).__mf.press());
  expect(await advanceUntil(page, 'Result_Caught', 40)).toBe('Result_Caught');

  const s = await gameState(page);
  expect(s.fishing.value).toBeGreaterThan(0);
  expect(s.profile.money).toBe(s.fishing.value);
  const card = fishCard(page);
  await expect(card).toContainText('Piranha Lavínia');
  await expect(card).toContainText('Valor: inestimável');
  await expect(card).not.toContainText('R$');
  await expect(page.getByRole('group', { name: 'Painel da pescaria' })).toContainText(money(s.fishing.value));
});

test('ALBUM-02: peixe mais pesado que o recorde mostra "Novo recorde!"; mais leve, não', async ({ page }) => {
  const species = ['tilapia', 'traira', 'curimata', 'piau', 'tambaqui', 'tucunare', 'pirarucu-lendario', 'piranha-lavinia'];
  const albumWith = (recordKg: number) => Object.fromEntries(species.map((id) => [id, { recordKg }]));

  await openWithProfile(page, { ...veteran(), album: albumWith(0.01) });
  await manualClock(page);
  await play(page);
  await catchFish(page);
  await expect(fishCard(page)).toContainText('Novo recorde!');

  await openWithProfile(page, { ...veteran(), album: albumWith(999) });
  await manualClock(page);
  await play(page);
  await catchFish(page);
  await expect(fishCard(page)).toBeVisible();
  await expect(fishCard(page)).not.toContainText('Novo recorde!');
});

test('PESCA-05, PESCA-09, PESCA-13: sem peixe, peixe que escapa e linha arrebentada mostram o aviso e voltam ao arremesso', async ({
  page,
}) => {
  await openWithProfile(page, veteran('desafio'));
  await manualClock(page);
  await play(page);
  const result = page.getByRole('dialog', { name: 'Resultado do arremesso' });

  await castAt(page, 90, 365); // beirada, fora das zonas com peixe
  expect(await advanceUntil(page, 'Result_Nothing')).toBe('Result_Nothing');
  await expect(result).toContainText('Nada por aqui… tente outro ponto');
  await result.getByRole('button', { name: 'Continuar' }).click();
  expect((await gameState(page)).fishing.phase).toBe('Idle');

  await castAt(page, 90, 300);
  expect(await advanceUntil(page, 'Result_Escaped')).toBe('Result_Escaped'); // não fisgou a tempo
  await expect(result).toContainText('Escapou! Tente de novo');
  await result.getByRole('button', { name: 'Continuar' }).click();
  expect((await gameState(page)).fishing.phase).toBe('Idle');

  await castAt(page, 90, 300);
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  await page.evaluate(() => (window as any).__mf.press()); // segura sem soltar no vermelho
  expect(await advanceUntil(page, 'Result_Broken', 40)).toBe('Result_Broken');
  await expect(result).toContainText('A linha arrebentou!');
  await result.getByRole('button', { name: 'Continuar' }).click();
  await expect(result).toBeHidden();
  expect((await gameState(page)).fishing.phase).toBe('Idle');
});
