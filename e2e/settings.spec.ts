import { expect, test } from '@playwright/test';
import { gameState, openGame, openWithProfile, reopen } from './support';

// Escolha da dificuldade e tela Ajustes (ACES-01, ACES-02, ACES-04, TUTO-09).

test('ACES-01: a primeira abertura pergunta "Como você quer pescar hoje?"; a segunda não pergunta', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Jogar' }).click();

  await expect(page.getByRole('heading', { name: 'Como você quer pescar hoje?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tranquilo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Desafio' })).toBeVisible();

  await page.getByRole('button', { name: 'Tranquilo' }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
  expect((await gameState(page)).profile.settings.difficulty).toBe('tranquilo');

  await reopen(page);
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Como você quer pescar hoje?' })).toHaveCount(0);
});

test('ACES-02: trocar a dificuldade em Ajustes vale depois de reabrir o jogo', async ({ page }) => {
  await openWithProfile(page, { settings: { difficulty: 'tranquilo', vibration: true } });
  await page.getByRole('button', { name: 'Ajustes' }).click();

  const tranquilo = page.getByRole('button', { name: 'Tranquilo' });
  const desafio = page.getByRole('button', { name: 'Desafio' });
  await expect(tranquilo).toHaveAttribute('aria-pressed', 'true');
  await expect(desafio).toHaveAttribute('aria-pressed', 'false');

  await desafio.click();
  await expect(desafio).toHaveAttribute('aria-pressed', 'true');
  await expect(tranquilo).toHaveAttribute('aria-pressed', 'false');

  await reopen(page);
  expect((await gameState(page)).profile.settings.difficulty).toBe('desafio');
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await expect(page.getByRole('button', { name: 'Desafio' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Tranquilo' })).toHaveAttribute('aria-pressed', 'false');
});

test('ACES-04: a vibração começa ligada e desligar vale depois de reabrir o jogo', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Ajustes' }).click();

  const vibration = page.getByRole('switch', { name: /Vibração/ });
  await expect(vibration).toBeChecked();

  await vibration.click();
  await expect(vibration).not.toBeChecked();

  await reopen(page);
  expect((await gameState(page)).profile.settings.vibration).toBe(false);
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await expect(page.getByRole('switch', { name: /Vibração/ })).not.toBeChecked();
});

test('TUTO-09: "Rever tutorial" em Ajustes faz o tutorial começar na próxima pescaria', async ({ page }) => {
  await openWithProfile(page, {
    settings: { difficulty: 'tranquilo', vibration: true },
    tutorialDone: true,
    story: { episodes: { 1: { objectiveIndex: 0, progress: 1, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null },
  });
  await page.getByRole('button', { name: 'Ajustes' }).click();

  await page.getByRole('button', { name: 'Rever tutorial' }).click();
  await expect(page.getByText('O tutorial começa na próxima pescaria.')).toBeVisible();

  await page.getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();

  expect((await gameState(page)).profile.tutorialDone).toBe(false);
  // primeiro passo do tutorial da pescaria nova: escolher o ponto (pesca-bass TUTOB-01)
  await expect.poll(async () => (await gameState(page)).tutorial?.step).toBe('ponto');
});
