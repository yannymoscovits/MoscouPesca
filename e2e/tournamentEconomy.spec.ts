import { expect, test } from '@playwright/test';
import { catchFish, gameState, manualClock, openWithProfile, veteran } from './support';

for (const castsLeft of [7, 1]) {
  test(`campeonato com ${castsLeft} arremessos: saldo não aumenta e ficha explica pontuação`, async ({ page }) => {
    const profile = veteran();
    await openWithProfile(page, {
      ...profile, money: 100,
      tournament: { id: 'guanambicup', castsLeft, catches: [] },
      story: { ...profile.story!, episodes: { 1: { objectiveIndex: 6, progress: 0, won: false } } },
    });
    await manualClock(page);
    await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
    expect(await catchFish(page)).toBe('Result_Caught');
    const card = page.getByRole('dialog', { name: 'Ficha do peixe', exact: true });
    await expect(card).toContainText('Campeonato: vale só o peso');
    await expect(card).not.toContainText('Valor:');
    expect((await gameState(page)).profile.money).toBe(100);
    await page.screenshot({ path: `test-results/campeonato-sem-dinheiro-${castsLeft}.png` });
  });
}
