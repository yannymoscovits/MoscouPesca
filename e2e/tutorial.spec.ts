import { expect, test, type Page } from '@playwright/test';
import { tutorial } from '../src/content/episodes/ep1';
import { advance, advanceUntil, gameState, manualClock, openGame, openWithProfile, toScreen } from './support';

// Guia do tutorial: uma instrução da Jane por vez, com uma seta onde tocar (TUTO-02),
// que pisca depois de 10 s sem toque (TUTO-07).

const coach = (page: Page) => page.getByRole('status', { name: 'Dica da Jane' });
const arrow = (page: Page) => page.locator('[data-tutorial-arrow]');

/** Ponta da seta: o meio da borda de baixo (a seta aponta para baixo). */
async function arrowTip(page: Page) {
  const box = (await arrow(page).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height };
}

/** Uma instrução e uma seta na tela, com o texto do passo e o alvo pedido. */
async function expectStep(page: Page, text: string, target: string) {
  await expect(coach(page)).toHaveCount(1);
  await expect(coach(page)).toHaveText(text);
  await expect(arrow(page)).toHaveCount(1);
  await expect(arrow(page)).toHaveAttribute('data-target', target);
}

/** Primeira pescaria com a abertura já vista e a Jane e o Adilson já apresentados. */
const firstFishing = {
  settings: { difficulty: 'tranquilo' as const, vibration: true },
  charactersIntroduced: ['jane', 'adilson'],
  story: { episodes: {}, scenesSeen: ['ep1-abertura'], pendingScene: null },
};

test('TUTO-02: em cada passo, uma instrução só e uma seta apontando para a água, o "FISGAR!" ou a tela', async ({ page }) => {
  await openWithProfile(page, firstFishing);
  await manualClock(page);
  await page.getByRole('button', { name: 'Jogar' }).click();

  // Arremessar: a seta aponta para a água, acima da margem e abaixo do painel.
  await expectStep(page, tutorial.cast.text, 'agua');
  const tip = await arrowTip(page);
  const panel = (await page.getByRole('group', { name: 'Painel da pescaria' }).boundingBox())!;
  expect(tip.y).toBeGreaterThan(panel.y + panel.height);
  expect(tip.y).toBeLessThan(toScreen(page, 90, 372).y); // a margem começa em 372 na cena
  await page.mouse.click(tip.x, tip.y + 4); // tocar onde a seta aponta arremessa
  expect((await gameState(page)).fishing.phase).toBe('Flying');

  // Esperar: a seta acompanha a isca na água.
  await advance(page, 1);
  await expectStep(page, tutorial.wait.text, 'agua');
  const { at } = (await gameState(page)).fishing;
  const bait = toScreen(page, at.x, at.y);
  const waitTip = await arrowTip(page);
  expect(Math.abs(waitTip.x - bait.x)).toBeLessThan(12);
  expect(bait.y - waitTip.y).toBeGreaterThanOrEqual(0);
  expect(bait.y - waitTip.y).toBeLessThan(24);

  // Fisgar: a seta aponta para o botão "FISGAR!", por cima dele.
  expect(await advanceUntil(page, 'Bite', 6)).toBe('Bite'); // TUTO-04: mordida em até 5 s
  await expectStep(page, tutorial.hook.text, 'fisgar');
  const hook = (await page.getByRole('button', { name: 'FISGAR!' }).boundingBox())!;
  const hookTip = await arrowTip(page);
  expect(hookTip.x).toBeGreaterThan(hook.x);
  expect(hookTip.x).toBeLessThan(hook.x + hook.width);
  expect(hookTip.y).toBeLessThanOrEqual(hook.y + 1);
  expect(hook.y - hookTip.y).toBeLessThan(24);

  // Segurar e soltar: a seta aponta para a tela.
  await page.mouse.move(hook.x + hook.width / 2, hook.y + hook.height / 2);
  await page.mouse.down();
  await expectStep(page, tutorial.reel.text, 'tela');
  await page.evaluate(() => {
    const mf = (window as any).__mf;
    for (let i = 0; i < 300 && mf.state().fishing.tension < 90; i++) mf.advance(0.05);
  });
  await expectStep(page, tutorial.release.text, 'tela');
  await page.mouse.up();
});

test('TUTO-07: 10 s sem toque num passo, a instrução reaparece e a seta pisca', async ({ page }) => {
  await openWithProfile(page, firstFishing);
  await manualClock(page);
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expectStep(page, tutorial.cast.text, 'agua');

  await advance(page, 9.8);
  await expect(arrow(page)).not.toHaveClass(/\bpiscar\b/);
  await expect(coach(page)).not.toHaveAttribute('data-nudge', 'true');

  await advance(page, 0.3);
  await expect(arrow(page)).toHaveClass(/\bpiscar\b/);
  await expect(coach(page)).toHaveAttribute('data-nudge', 'true');
  await expect(coach(page)).toHaveText(tutorial.cast.text);

  // Um toque zera a espera; no passo seguinte, a contagem recomeça do zero.
  const p = toScreen(page, 90, 300);
  await page.mouse.click(p.x, p.y);
  expect(await advanceUntil(page, 'Bite', 6)).toBe('Bite');
  await expect(arrow(page)).not.toHaveClass(/\bpiscar\b/);
  await advance(page, 10.1);
  await expectStep(page, tutorial.hook.text, 'fisgar'); // o peixe do tutorial espera o toque (TUTO-05)
  await expect(arrow(page)).toHaveClass(/\bpiscar\b/);
  await expect(coach(page)).toHaveAttribute('data-nudge', 'true');
});

test('jogo novo: seguindo só as setas e as falas da Jane, o primeiro peixe é pego e o objetivo mostra 1 de 3', async ({
  page,
}) => {
  await openGame(page);
  await manualClock(page);
  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.getByRole('button', { name: 'Tranquilo' }).click();

  // Abertura: cartões e falas, um toque de cada vez; a dica do tutorial espera a cena acabar.
  const scene = page.getByRole('dialog', { name: /^Conversa$|^Apresentação/ });
  for (let i = 0; i < 20 && (await scene.count()) > 0; i++) {
    await expect(coach(page)).toHaveCount(0);
    await scene.click();
  }
  await expect(scene).toHaveCount(0);

  // Arremessa onde a seta aponta.
  await expectStep(page, tutorial.cast.text, 'agua');
  const water = await arrowTip(page);
  await page.mouse.click(water.x, water.y + 4);
  expect(await advanceUntil(page, 'Bite', 6)).toBe('Bite');

  // Fisga no botão para onde a seta aponta e segura.
  await expectStep(page, tutorial.hook.text, 'fisgar');
  const hookTip = await arrowTip(page);
  await page.mouse.move(hookTip.x, hookTip.y + 40);
  await page.mouse.down();
  await expectStep(page, tutorial.reel.text, 'tela');
  await page.evaluate(() => {
    const mf = (window as any).__mf;
    for (let i = 0; i < 300 && mf.state().fishing.tension < 90; i++) mf.advance(0.05);
  });

  // Ficou vermelho: solta, deixa o peixe cansar e volta a segurar até ele chegar.
  await expectStep(page, tutorial.release.text, 'tela');
  await page.mouse.up();
  await advance(page, 1);
  const screenTip = await arrowTip(page);
  await page.mouse.move(screenTip.x, screenTip.y + 20);
  await page.mouse.down();
  expect(await advanceUntil(page, 'Result_Caught', 40)).toBe('Result_Caught');
  await page.mouse.up();

  await expect(coach(page)).toHaveText(tutorial.done.text);
  await page.getByRole('dialog', { name: 'Ficha do peixe' }).getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('group', { name: 'Painel da pescaria' })).toContainText('Pegar 3 peixes · 1 de 3');
  await expect(coach(page)).toHaveCount(0); // TUTO-08: o tutorial acabou
  const s = await gameState(page);
  expect(s.profile.tutorialDone).toBe(true);
  expect(s.tutorial).toBeNull();
});
