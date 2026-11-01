import { expect, test } from '@playwright/test';
import { castNow, chooseSpot, gameState, manualClock, openWithProfile, veteran } from './support';

for (const tournament of [false, true]) {
  test(`${tournament ? 'campeonato' : 'pescaria livre'} usa o peixe aprovado inteiro na água`, async ({ page }) => {
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.drawImage;
      (window as any).__wholeFishDraws = 0;
      CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: any[]) {
        const img = args[0];
        if (img instanceof HTMLImageElement && img.naturalWidth === 96 && img.naturalHeight === 64 && args[3] === 96) {
          (window as any).__wholeFishDraws++;
        }
        return (original as any).apply(this, args);
      } as typeof original;
    });
    await openWithProfile(page, {
      ...veteran(),
      tournament: tournament ? { id: 'guanambicup', castsLeft: 7, catches: [] } : null,
    });
    await manualClock(page);
    await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
    await chooseSpot(page);
    await castNow(page);
    const state = await gameState(page);
    expect(state.fishing.phase).toBe('Lure');
    for (const fish of state.fishing.water.fish) expect(fish.species.sprite).toContain('/fish-portraits/');
    await expect.poll(() => page.evaluate(() => (window as any).__wholeFishDraws)).toBeGreaterThan(0);
    await page.screenshot({ path: `test-results/peixes-novos-${tournament ? 'campeonato' : 'livre'}.png` });
  });
}
