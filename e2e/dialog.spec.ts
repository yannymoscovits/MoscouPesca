import { expect, test, type Page } from '@playwright/test';
import { characters } from '../src/content/characters';
import { ep1 } from '../src/content/episodes/ep1';
import { gameState, openGame, openWithProfile, veteran } from './support';

// Diálogos e cartões de apresentação (HIST-01, HIST-02, HIST-03, HUMOR-01, HUMOR-02),
// com narração e fala conjunta dos roteiros.

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Conversa' });
const introCard = (page: Page) => page.getByRole('dialog', { name: /^Apresentação/ });
const opening = ep1.scenes.find((s) => s.id === 'ep1-abertura')!.lines;
const everyone = characters.map((c) => c.id);

/** Retratos na caixa de diálogo: personagem e expressão de cada um, da esquerda para a direita. */
const portraits = (page: Page) =>
  dialog(page)
    .getByRole('img')
    .evaluateAll((els) =>
      els.map((el) => ({ character: el.getAttribute('data-character'), expression: el.getAttribute('data-expression') })),
    );

test('HIST-01, HUMOR-01: o jogo novo abre com o cartão "JANE: A Que Sempre Teve Razão" antes da primeira fala e da pesca', async ({
  page,
}) => {
  await page.clock.install();
  await openGame(page);
  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.getByRole('button', { name: 'Tranquilo' }).click();

  const card = introCard(page);
  await expect(card).toBeVisible();
  await expect(card).toContainText('JANE');
  await expect(card).toContainText('A Que Sempre Teve Razão');
  await expect(card.getByRole('img')).toHaveAttribute('data-character', 'jane');
  await expect(dialog(page)).toHaveCount(0); // o cartão vem antes da primeira fala
  const s = await gameState(page);
  expect(s.profile.story.pendingScene).toBe('ep1-abertura'); // a abertura vem antes da pesca
  expect(s.fishing.phase).toBe('Idle');

  // O cartão só fecha com toque: o tempo passando não fecha.
  await page.clock.fastForward('00:30');
  await expect(card).toBeVisible();

  await card.click();
  await expect(card).toHaveCount(0);
  await expect(dialog(page)).toContainText(opening[0].text);

  // A primeira fala do Adilson traz o cartão dele; a segunda fala da Jane não traz o dela de novo.
  await dialog(page).click();
  await expect(introCard(page)).toContainText('ADILSON MOSCOVITS');
  await expect(introCard(page)).toContainText('O Pegador… de Peixe');
  await introCard(page).click();
  await expect(dialog(page)).toContainText(opening[1].text);
  await dialog(page).click();
  await expect(dialog(page)).toContainText(opening[2].text);
  await expect(introCard(page)).toHaveCount(0);
  expect((await gameState(page)).profile.charactersIntroduced).toEqual(['jane', 'adilson']);

  // Visto uma vez, o cartão não volta depois de reabrir o jogo.
  await page.reload();
  await page.waitForFunction(() => '__mf' in window);
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(dialog(page)).toContainText(opening[0].text); // a cena recomeça da primeira fala
  await expect(introCard(page)).toHaveCount(0);
});

test('HIST-02, HUMOR-02: cada fala mostra o nome e o retrato do personagem com a expressão da fala', async ({ page }) => {
  await openWithProfile(page, {
    ...veteran(),
    story: { episodes: {}, scenesSeen: [], pendingScene: null },
    charactersIntroduced: ['jane', 'adilson'],
  });
  await page.getByRole('button', { name: 'Jogar' }).click();

  const names = Object.fromEntries(characters.map((c) => [c.id, c.name]));
  const seen = new Set<string>();
  for (const line of opening) {
    await expect(dialog(page)).toContainText(line.text);
    await expect(dialog(page)).toContainText(names[line.speaker as string]);
    expect(await portraits(page)).toEqual([{ character: line.speaker, expression: line.expression ?? 'normal' }]);
    seen.add(`${line.speaker}:${line.expression}`);
    await dialog(page).click();
  }
  // A Jane aparece normal, brava e rindo: o retrato acompanha a expressão de cada fala.
  expect([...seen].filter((k) => k.startsWith('jane:')).sort()).toEqual(['jane:bravo', 'jane:normal', 'jane:rindo']);

  await expect(dialog(page)).toHaveCount(0); // depois da última fala, a cena fecha
  expect((await gameState(page)).profile.story.pendingScene).toBeNull();
});

test('HIST-03: a fala só avança com toque; 30 s parado não avança', async ({ page }) => {
  await page.clock.install();
  await openWithProfile(page, {
    ...veteran(),
    story: { episodes: {}, scenesSeen: [], pendingScene: null },
    charactersIntroduced: ['jane', 'adilson'],
  });
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(dialog(page)).toContainText(opening[0].text);

  await page.clock.fastForward('00:30');
  await page.evaluate(() => (window as any).__mf.advance(30));
  await expect(dialog(page)).toContainText(opening[0].text);
  expect((await gameState(page)).dialogLine).toBe(0);

  await dialog(page).click();
  await expect(dialog(page)).toContainText(opening[1].text);
});

/** Jacuípe liberado, todo o elenco já apresentado (sem cartões no caminho). */
const inJacuipe = (pendingScene: string | null, seen: string[] = []) => ({
  ...veteran(),
  unlockedEpisodes: [1, 2] as (1 | 2)[],
  currentLocation: 'rio-jacuipe',
  charactersIntroduced: everyone,
  story: {
    episodes: { 1: { objectiveIndex: 6, progress: 0, won: true } },
    scenesSeen: ['ep1-abertura', 'ep1-vitoria', ...seen],
    pendingScene,
  },
});

test('narração: sem retrato e em itálico ("Jacuípe, muitos anos atrás.")', async ({ page }) => {
  await openWithProfile(page, inJacuipe(null));
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(dialog(page)).toContainText('Jacuípe… quanto tempo, hein?'); // abertura do Episódio 2

  for (let i = 0; i < 4; i++) await dialog(page).click();
  const text = dialog(page).getByText('Jacuípe, muitos anos atrás.');
  await expect(text).toBeVisible();
  await expect(dialog(page).getByRole('img')).toHaveCount(0);
  expect(await text.evaluate((el) => getComputedStyle(el).fontStyle)).toBe('italic');
  for (const name of characters.map((c) => c.name)) await expect(dialog(page)).not.toContainText(name);

  await dialog(page).click(); // de volta às falas com retrato
  await expect(dialog(page)).toContainText('Tininho');
  expect(await portraits(page)).toEqual([{ character: 'tininho', expression: 'rindo' }]);
});

test('fala conjunta: retratos do Didi e da Denise lado a lado em "Amamos você meu filho, segura firme!"', async ({
  page,
}) => {
  await openWithProfile(page, inJacuipe('ep2-vitoria', ['ep2-abertura', 'ep2-vitoria']));
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(dialog(page)).toContainText('Esse é o meu filho!');

  for (let i = 0; i < 3; i++) await dialog(page).click();
  await expect(dialog(page)).toContainText('Amamos você meu filho, segura firme!');
  await expect(dialog(page)).toContainText('Didi e Denise');
  expect(await portraits(page)).toEqual([
    { character: 'didi', expression: 'normal' },
    { character: 'denise', expression: 'normal' },
  ]);
  const [a, b] = await dialog(page)
    .getByRole('img')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
  expect(Math.abs(a.top - b.top)).toBeLessThan(1); // mesma linha
  expect(b.left).toBeGreaterThanOrEqual(a.right); // lado a lado, sem sobrepor
});
