import { expect, test } from '@playwright/test';

// Roda contra o build de teste (`vite build --mode e2e`), o único com `window.__mf`.

test('ganchos de teste: window.__mf dirige o jogo com semente, tempo, toques e estado', async ({ page }) => {
  /** Abre a pesca, passa a abertura, fixa a semente, arremessa e espera a isca cair na água. */
  const castWithSeed = () =>
    page.evaluate(() => {
      const mf = (window as any).__mf;
      mf.clock('manual');
      mf.controller.setDifficulty('tranquilo');
      mf.controller.openFishing();
      while (mf.state().profile.story.pendingScene) mf.controller.advanceDialog();
      mf.seed(42);
      mf.tap(90, 300);
      const afterTap = mf.state().fishing.phase;
      mf.advance(1);
      return { afterTap, fishing: mf.state().fishing };
    });

  await page.goto('/');
  await page.waitForFunction(() => '__mf' in window);
  const first = await castWithSeed();

  expect(first.afterTap).toBe('Flying');
  expect(first.fishing.phase).toBe('Waiting');
  expect(first.fishing.bite).not.toBeNull();

  // A mesma semente sorteia a mesma mordida (espécie e hora).
  await page.reload();
  await page.waitForFunction(() => '__mf' in window);
  const second = await castWithSeed();
  expect(second.fishing.bite).toEqual(first.fishing.bite);

  // Tempo e toque levam da mordida à briga.
  const phases = await page.evaluate(() => {
    const mf = (window as any).__mf;
    mf.advance(10);
    const bite = mf.state().fishing.phase;
    mf.press();
    mf.advance(0.5);
    return { bite, fight: mf.state().fishing.phase, holding: mf.state().holding };
  });
  expect(phases).toEqual({ bite: 'Bite', fight: 'Fight', holding: true });
});
