import { expect, test } from '@playwright/test';
import { characters } from '../src/content/characters';
import { ep1 } from '../src/content/episodes/ep1';
import { catchFish, gameState, manualClock, money, openWithProfile, veteran } from './support';

// HIST-11: o peixe não vira dinheiro; o objetivo cumprido manda o dinheiro da loja.

test('HIST-11: o 3º peixe cumpre "Pegar 3 peixes"; depois da cena, o aviso da família e o saldo para a Vara de Fibra', async ({
  page,
}) => {
  const objective = ep1.chapter.objectives[0];
  const paid = ep1.rods.find((r) => r.id === 'fibra')!.price;
  await openWithProfile(page, {
    ...veteran(),
    money: 10,
    charactersIntroduced: characters.map((c) => c.id),
    story: { episodes: { 1: { objectiveIndex: 0, progress: 2, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null },
  });
  await manualClock(page);
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  expect(await catchFish(page)).toBe('Result_Caught');
  expect((await gameState(page)).profile.money).toBe(10 + paid);

  const card = page.getByRole('dialog', { name: 'Ficha do peixe', exact: true });
  await expect(card).not.toContainText('R$'); // o peixe em si não vale dinheiro
  await card.getByRole('button', { name: 'Continuar' }).click();

  const dialog = page.getByRole('dialog', { name: 'Conversa', exact: true });
  const banner = page.getByRole('dialog', { name: 'Aviso', exact: true });
  for (const line of ep1.scenes.find((s) => s.id === objective.sceneOnDone)!.lines) {
    await expect(banner).toHaveCount(0); // o aviso vem depois da cena
    await expect(dialog).toContainText(line.text);
    await dialog.click();
  }
  await expect(banner).toContainText(`A família mandou ${money(paid)} para a loja!`);
  await page.screenshot({ path: 'test-results/familia-manda-dinheiro.png' });
  await banner.getByRole('button', { name: 'Continuar' }).click();
  await expect(banner).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Painel da pescaria' })).toContainText(money(10 + paid));
});
