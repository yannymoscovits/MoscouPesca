import { expect, test } from '@playwright/test';
import { ep1 } from '../src/content/episodes/ep1';
import { gameState, openGame, openWithProfile, reopen, veteran } from './support';

// SAVE-11 a SAVE-13: "Continuar" de onde parou e "Novo jogo", que pergunta antes de apagar.

const title = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'MoscouFishing' });
const confirmDialog = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Começar um jogo novo?' });

test('SAVE-11: sem jogo salvo, a tela inicial mostra "Jogar" e nenhum "Novo jogo"', async ({ page }) => {
  await openGame(page);
  await expect(page.getByRole('button', { name: 'Jogar', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo jogo' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Continuar/ })).toHaveCount(0);
});

test('SAVE-11 a SAVE-13: "Continuar" mostra onde parou; "Novo jogo" pergunta, Cancelar mantém e confirmar começa do zero', async ({
  page,
}) => {
  await openWithProfile(page, {
    ...veteran('desafio'),
    money: 400,
    rods: { owned: ['bambu', 'fibra'], equipped: 'fibra' },
    story: { episodes: { 1: { objectiveIndex: 2, progress: 0, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null },
  });
  const objective = ep1.chapter.objectives[2].text;
  const play = page.getByRole('button', { name: 'Continuar', exact: true });
  await expect(play).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jogar', exact: true })).toHaveCount(0);
  await expect(page.locator('#onde-parou')).toContainText(`Capítulo 1: ${ep1.chapter.title}`);
  await expect(page.locator('#onde-parou')).toContainText(objective);
  await page.screenshot({ path: 'test-results/tela-inicial-continuar.png' });

  // SAVE-12: Cancelar não apaga nada.
  await page.getByRole('button', { name: 'Novo jogo' }).click();
  await expect(confirmDialog(page)).toContainText(objective);
  await page.screenshot({ path: 'test-results/novo-jogo-confirmar.png' });
  await confirmDialog(page).getByRole('button', { name: 'Cancelar' }).click();
  await expect(confirmDialog(page)).toHaveCount(0);
  expect((await gameState(page)).profile.money).toBe(400);

  // SAVE-13: confirmar apaga, guarda a dificuldade e começa pela abertura do Episódio 1.
  await page.getByRole('button', { name: 'Novo jogo' }).click();
  await confirmDialog(page).getByRole('button', { name: 'Apagar e começar' }).click();
  await expect(page.getByRole('dialog', { name: 'Apresentação: Jane' })).toBeVisible(); // a abertura apresenta a família de novo
  const s = await gameState(page);
  expect(s.profile.story.pendingScene).toBe(ep1.chapter.openingScene);
  expect(s.profile.money).toBe(0);
  expect(s.profile.rods.owned).toEqual(['bambu']);
  expect(s.profile.tutorialDone).toBe(false);
  expect(s.profile.settings.difficulty).toBe('desafio');

  // Salvo: reabrindo, o jogo novo continua.
  await reopen(page);
  expect((await gameState(page)).profile.money).toBe(0);
  await expect(title(page)).toBeVisible();
});
