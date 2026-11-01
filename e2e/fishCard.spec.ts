import { expect, test, type Page } from '@playwright/test';
import { catchFish, chooseSpot, gameState, manualClock, money, openWithProfile, reelUntilStrike, castNow, veteran } from './support';

// Vibração no ataque (pesca-bass ISCA-09) e ficha do peixe (PESCA-15, HUMOR-03, ALBUM-02).
// O "!", o "FISGAR!" e os avisos de quando não vem peixe estão em pescaria.spec.ts.

const fishCard = (page: Page) => page.getByRole('dialog', { name: 'Ficha do peixe' });
const kg = (n: number) => `${n.toFixed(2).replace('.', ',')} kg`;

async function play(page: Page) {
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
}

async function strikeVibrations(page: Page, vibration: boolean) {
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
  await chooseSpot(page);
  expect(await castNow(page)).toBe('Lure');
  const before = await page.evaluate(() => [...(window as any).vibrateCalls]);
  expect(await reelUntilStrike(page)).toBe('Strike');
  const after = await page.evaluate(() => [...(window as any).vibrateCalls]);
  return { before, after };
}

test('ISCA-09: com a vibração ligada, o ataque do peixe vibra o celular por 300 ms', async ({ page }) => {
  const { before, after } = await strikeVibrations(page, true);
  expect(before).toEqual([]);
  expect(after).toEqual([300]);
});

test('ISCA-09: com a vibração desligada, o ataque não vibra', async ({ page }) => {
  const { after } = await strikeVibrations(page, false);
  expect(after).toEqual([]);
});

test('PESCA-15, HUMOR-03: a ficha mostra o desenho, a espécie, o peso com 2 casas e a descrição, sem valor em R$', async ({
  page,
}) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  expect(await catchFish(page)).toBe('Result_Caught');

  const { fishing } = await gameState(page);
  const card = fishCard(page);
  await expect(card).toBeVisible();
  await expect(card.getByRole('img', { name: fishing.species.name })).toBeVisible();
  await expect(card.getByRole('heading', { name: fishing.species.name })).toBeVisible();
  await expect(card).toContainText(kg(fishing.kg));
  await expect(card).not.toContainText('Valor:'); // PESCA-17: peixe não vira dinheiro
  await expect(card).toContainText(fishing.species.description);

  await card.getByRole('button', { name: 'Continuar' }).click();
  await expect(card).toBeHidden();
  expect((await gameState(page)).fishing.phase).toBe('Aim'); // de volta ao arremesso, no mesmo ponto
});

test('Ficha da Piranha Lavínia: mostra "Valor: inestimável" e o saldo não muda', async ({ page }) => {
  await openWithProfile(page, { ...veteran(), baits: { owned: ['minhoca', 'carne'], equipped: 'carne' } });
  await manualClock(page, 5);
  await play(page);
  await chooseSpot(page);
  // Arremessos do jogador típico até vir a Piranha Lavínia, que morde a carne no raso.
  const before = await page.evaluate(() => {
    const mf = (window as any).__mf;
    for (let i = 0; i < 40; i++) {
      const money = mf.state().profile.money;
      if (mf.autoplay(300) === 'Result_Caught' && mf.state().fishing.species.id === 'piranha-lavinia') return money;
      mf.controller.dismissResult();
    }
    return null;
  });
  expect(before).not.toBeNull();

  const s = await gameState(page);
  expect(s.profile.money).toBe(before);
  const card = fishCard(page);
  await expect(card).toContainText('Piranha Lavínia');
  await expect(card).toContainText('Valor: inestimável');
  await expect(card).not.toContainText('R$');
  await expect(page.getByRole('group', { name: 'Painel da pescaria' })).toContainText(money(s.profile.money));
});

test('ALBUM-02: peixe mais pesado que o recorde mostra "Novo recorde!"; mais leve, não', async ({ page }) => {
  const species = ['tilapia', 'traira', 'curimata', 'piau', 'tambaqui', 'tucunare', 'pirarucu-lendario', 'piranha-lavinia'];
  const albumWith = (recordKg: number) => Object.fromEntries(species.map((id) => [id, { recordKg }]));

  await openWithProfile(page, { ...veteran(), album: albumWith(0.01) });
  await manualClock(page);
  await play(page);
  expect(await catchFish(page)).toBe('Result_Caught');
  await expect(fishCard(page)).toContainText('Novo recorde!');

  await openWithProfile(page, { ...veteran(), album: albumWith(999) });
  await manualClock(page);
  await play(page);
  expect(await catchFish(page)).toBe('Result_Caught');
  await expect(fishCard(page)).toBeVisible();
  await expect(fishCard(page)).not.toContainText('Novo recorde!');
});
