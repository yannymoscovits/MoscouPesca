import { expect, test } from '@playwright/test';

// Roda contra o build de teste (`vite build --mode e2e`), o único com `window.__mf`.

test('ganchos de teste: window.__mf dirige o jogo com semente, tempo, botões, autoplay e estado', async ({ page }) => {
  /** Abre a pesca, passa a abertura, escolhe o raso, fixa a semente, arremessa e espera a isca cair na água. */
  const castWithSeed = () =>
    page.evaluate(() => {
      const mf = (window as any).__mf;
      mf.clock('manual');
      mf.controller.setDifficulty('tranquilo');
      mf.controller.openFishing();
      while (mf.state().profile.story.pendingScene) mf.controller.advanceDialog();
      mf.controller.chooseSpot('raso');
      mf.seed(42);
      mf.button('arremessar');
      const afterButton = mf.state().fishing.phase;
      mf.advance(2);
      mf.button('arremessar');
      mf.advance(1);
      return { afterButton, fishing: mf.state().fishing };
    });

  await page.goto('/');
  await page.waitForFunction(() => '__mf' in window);
  const first = await castWithSeed();

  expect(first.afterButton).toBe('Power');
  expect(first.fishing.phase).toBe('Lure');
  expect(first.fishing.water.fish.length).toBeGreaterThanOrEqual(3);

  // A mesma semente sorteia a mesma água (peixes, espécies e lugares).
  await page.reload();
  await page.waitForFunction(() => '__mf' in window);
  const second = await castWithSeed();
  expect(second.fishing.water).toEqual(first.fishing.water);

  // Segurar e o tempo levam ao ataque; PUXAR fisga; segurar de novo é o SEGURAR da briga.
  const phases = await page.evaluate(() => {
    const mf = (window as any).__mf;
    mf.hold(true);
    for (let t = 0; t < 30 && mf.state().fishing.phase === 'Lure'; t += 0.1) mf.advance(0.1);
    const strike = mf.state().fishing.phase;
    mf.hold(false);
    mf.button('puxar');
    mf.hold(true);
    mf.advance(0.5);
    return { strike, fight: mf.state().fishing.phase, holding: mf.state().holding };
  });
  expect(phases).toEqual({ strike: 'Strike', fight: 'Fight', holding: true });

  // O autoplay joga até o fim do arremesso.
  const end = await page.evaluate(() => (window as any).__mf.autoplay());
  expect(end).toMatch(/^Result_/);
});
