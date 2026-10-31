import { expect, test, type Page } from '@playwright/test';
import { advance, autoplay, chooseSpot, fishingButton, gameState, manualClock, openGame, openWithProfile } from './support';

// Guia do tutorial da pescaria nova (pesca-bass TUTOB-01): uma instrução da Jane por vez, que acompanha
// o passo da pesca e reaparece depois de 10 s sem toque (TUTO-07).

const coach = (page: Page) => page.getByRole('status', { name: 'Dica da Jane' });
const step = (page: Page) => page.locator('.coach');

/** Uma instrução só na tela, a do passo pedido. */
async function expectStep(page: Page, name: string) {
  await expect(coach(page)).toHaveCount(1);
  await expect(step(page)).toHaveAttribute('data-step', name);
}

/** Primeira pescaria com a abertura já vista e a Jane e o Adilson já apresentados. */
const firstFishing = {
  settings: { difficulty: 'tranquilo' as const, vibration: true },
  charactersIntroduced: ['jane', 'adilson'],
  story: { episodes: {}, scenesSeen: ['ep1-abertura'], pendingScene: null },
};

test('TUTOB-01: a instrução acompanha o ponto, a direção, a força e a isca na água', async ({ page }) => {
  await openWithProfile(page, firstFishing);
  await manualClock(page);
  await page.getByRole('button', { name: 'Jogar' }).click();

  await expectStep(page, 'ponto');
  await chooseSpot(page);
  await expectStep(page, 'direcao');
  await fishingButton(page, 'arremessar').click();
  await expectStep(page, 'forca');
  await fishingButton(page, 'arremessar').click();
  await expectStep(page, 'recolher');
  await advance(page, 1);
  const { fishing } = await gameState(page);
  expect(fishing.phase).toBe('Lure');
  // Com um peixe seguindo a isca, o passo já é o de atrair com PUXAR.
  const following = fishing.water.fish.some((f: { mode: string }) => f.mode === 'seguindo');
  await expectStep(page, following ? 'atrair' : 'recolher');
});

test('TUTO-07: 10 s sem toque num passo, a instrução reaparece', async ({ page }) => {
  await openWithProfile(page, firstFishing);
  await manualClock(page);
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expectStep(page, 'ponto');

  await advance(page, 9.8);
  await expect(coach(page)).not.toHaveAttribute('data-nudge', 'true');
  await advance(page, 0.3);
  await expect(coach(page)).toHaveAttribute('data-nudge', 'true');

  // Um toque zera a espera; no passo seguinte, a contagem recomeça do zero.
  await chooseSpot(page);
  await expectStep(page, 'direcao');
  await expect(coach(page)).not.toHaveAttribute('data-nudge', 'true');
  await advance(page, 10.1);
  await expect(coach(page)).toHaveAttribute('data-nudge', 'true');
});

test('jogo novo: seguindo as instruções da Jane, o primeiro peixe é pego e o objetivo mostra 1 de 3', async ({ page }) => {
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

  await expectStep(page, 'ponto');
  await chooseSpot(page);
  expect(await autoplay(page)).toBe('Result_Caught');

  await expectStep(page, 'done');
  await page.getByRole('dialog', { name: 'Ficha do peixe' }).getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('group', { name: 'Painel da pescaria' })).toContainText('Pegar 3 peixes · 1 de 3');
  await expect(coach(page)).toHaveCount(0); // TUTO-08: o tutorial acabou
  const s = await gameState(page);
  expect(s.profile.tutorialDone).toBe(true);
  expect(s.tutorial).toBeNull();
});
