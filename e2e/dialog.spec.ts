import AxeBuilder from '@axe-core/playwright';
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

// Quadro de diálogo dos mockups (T77): caixa azul-marinho com borda amarela, aba com o nome, retrato em
// cima à esquerda e triângulo piscando (spec, "Visual do quadro de diálogo"; ACES-05 a ACES-08).

const box = (page: Page) => dialog(page).locator('.dialog-box');
const tab = (page: Page) => dialog(page).locator('.dialog-box__tab');
const nextArrow = (page: Page) => dialog(page).locator('[data-continue]');

/** Abertura do Episódio 1 com a Jane e o Adilson já apresentados: só falas, sem cartões. */
async function openingDialog(page: Page) {
  await openWithProfile(page, {
    ...veteran(),
    story: { episodes: {}, scenesSeen: [], pendingScene: null },
    charactersIntroduced: ['jane', 'adilson'],
  });
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(dialog(page)).toContainText(opening[0].text);
}

/** Cor computada em [r, g, b]. */
const rgb = (css: string) => css.match(/\d+/g)!.slice(0, 3).map(Number);

/** Print do Pixel 7 para comparar com o mockup: em docs/arte/mockups com SAVE_SHOTS=1, senão na saída do teste. */
const shotPath = (name: string) => (process.env.SAVE_SHOTS ? `docs/arte/mockups/${name}` : test.info().outputPath(name));

test('T77: a aba mostra o nome de quem fala, o retrato fica em cima à esquerda com a expressão e o triângulo pisca', async ({
  page,
}) => {
  await openingDialog(page);
  const names = Object.fromEntries(characters.map((c) => [c.id, c.name]));

  for (const line of opening.slice(0, 3)) {
    await expect(dialog(page)).toContainText(line.text);
    await expect(tab(page)).toHaveText(names[line.speaker as string]);
    await expect(dialog(page).getByRole('img')).toHaveAttribute('data-expression', line.expression ?? 'normal');
    if (line === opening[0]) await page.screenshot({ path: shotPath('dialogo-implementado.png') });
    await dialog(page).click();
  }

  // Caixa azul-marinho (escura, puxada para o azul) com texto claro.
  const [r, g, b] = rgb(await box(page).evaluate((el) => getComputedStyle(el).backgroundColor));
  expect(Math.max(r, g, b), 'caixa escura').toBeLessThan(110);
  expect(b, 'caixa azul').toBeGreaterThan(Math.max(r, g));
  const ink = rgb(await dialog(page).getByText(opening[3].text).evaluate((el) => getComputedStyle(el).color));
  expect(Math.min(...ink), 'texto claro').toBeGreaterThan(200);

  // Retrato em cima, à esquerda, saltando para fora da caixa; a aba à direita dele, sobre a borda de cima.
  const frame = (await box(page).boundingBox())!;
  const portrait = (await dialog(page).getByRole('img').boundingBox())!;
  const name = (await tab(page).boundingBox())!;
  expect(portrait.y, 'retrato sai por cima da caixa').toBeLessThan(frame.y);
  expect(portrait.x - frame.x, 'retrato à esquerda').toBeLessThan(frame.width / 4);
  expect(name.x, 'aba à direita do retrato').toBeGreaterThanOrEqual(portrait.x + portrait.width);
  expect(name.y, 'aba sobre a borda de cima').toBeLessThan(frame.y);
  expect(name.y + name.height, 'aba sobre a borda de cima').toBeGreaterThan(frame.y);
  // A aba é amarela e traz o peixinho.
  const [tr, tg, tb] = rgb(await tab(page).evaluate((el) => getComputedStyle(el).backgroundColor));
  expect(Math.min(tr, tg), 'aba amarela').toBeGreaterThan(180);
  expect(tb, 'aba amarela').toBeLessThan(120);
  await expect(tab(page).locator('svg')).toBeVisible();

  // Triângulo no canto de baixo, sobre a borda, piscando (a opacidade apaga e volta).
  await expect(nextArrow(page)).toBeVisible();
  const arrow = (await nextArrow(page).boundingBox())!;
  expect(arrow.x + arrow.width, 'no canto da direita').toBeGreaterThan(frame.x + frame.width * 0.8);
  expect(arrow.y, 'sobre a borda de baixo').toBeLessThan(frame.y + frame.height);
  expect(arrow.y + arrow.height, 'sobre a borda de baixo').toBeGreaterThan(frame.y + frame.height);
  const opacities = await nextArrow(page).evaluate((el) =>
    el.getAnimations().flatMap((a) => (a.effect as KeyframeEffect).getKeyframes().map((k) => Number(k.opacity ?? 1))),
  );
  expect(Math.min(...opacities), 'triângulo apaga').toBe(0);
  expect(Math.max(...opacities), 'triângulo acende').toBe(1);
  await expect(dialog(page)).toContainText('Toque para continuar');
});

test('T77: fala conjunta mostra os dois nomes na aba; narração fica sem aba', async ({ page }) => {
  await openWithProfile(page, inJacuipe('ep2-vitoria', ['ep2-abertura', 'ep2-vitoria']));
  await page.getByRole('button', { name: 'Jogar' }).click();
  for (let i = 0; i < 3; i++) await dialog(page).click();
  await expect(dialog(page)).toContainText('Amamos você meu filho, segura firme!');
  await expect(tab(page)).toHaveText('Didi e Denise');

  await openWithProfile(page, inJacuipe(null));
  await page.getByRole('button', { name: 'Jogar' }).click();
  for (let i = 0; i < 4; i++) await dialog(page).click();
  await expect(dialog(page)).toContainText('Jacuípe, muitos anos atrás.');
  await expect(tab(page)).toHaveCount(0);
  await expect(nextArrow(page)).toBeVisible();
});

/** Todo texto visível dentro de `scope`, com o tamanho da fonte computado. */
const textSizes = (page: Page, scope: string) =>
  page.evaluate((sel) => {
    const found: { text: string; size: number }[] = [];
    const walker = document.createTreeWalker(document.querySelector(sel)!, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement!;
      const text = node.textContent!.trim();
      if (text && el.checkVisibility()) found.push({ text, size: parseFloat(getComputedStyle(el).fontSize) });
    }
    return found;
  }, scope);

/** Contraste medido pelo axe dentro do diálogo: nada abaixo de 4,5:1 e nada sem medida. */
async function expectContrast(page: Page) {
  const axe = await new AxeBuilder({ page }).include('[role="dialog"]').withRules(['color-contrast']).analyze();
  const nodes = (results: typeof axe.violations) => results.flatMap((r) => r.nodes.map((n) => n.html));
  expect(nodes(axe.violations)).toEqual([]);
  expect(nodes(axe.incomplete)).toEqual([]);
  expect(nodes(axe.passes).length).toBeGreaterThan(0);
}

test('T77, ACES-05, ACES-07: no quadro e no cartão, textos >= 18 px e contraste >= 4,5:1', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.getByRole('button', { name: 'Tranquilo' }).click();

  // Cartão de apresentação da Jane.
  await expect(introCard(page)).toBeVisible();
  const card = await textSizes(page, '[role="dialog"]');
  expect(card.map((t) => t.text)).toEqual(expect.arrayContaining(['JANE', 'A Que Sempre Teve Razão', 'Toque para continuar']));
  expect(card.filter((t) => t.size < 18)).toEqual([]);
  await expectContrast(page);

  // Primeira fala.
  await introCard(page).click();
  await expect(dialog(page)).toContainText(opening[0].text);
  const line = await textSizes(page, '[role="dialog"]');
  expect(line.map((t) => t.text)).toEqual(expect.arrayContaining(['Jane', opening[0].text, 'Toque para continuar']));
  expect(line.filter((t) => t.size < 18)).toEqual([]);
  await expectContrast(page);
});

test('T77, HIST-03: o quadro inteiro é tocável: cantos, aba, retrato e triângulo avançam a fala', async ({ page }) => {
  await openingDialog(page);

  const frame = (await box(page).boundingBox())!;
  type Box = { x: number; y: number; width: number; height: number };
  const center = (b: Box) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
  const spots = [
    async () => ({ x: frame.x + 8, y: frame.y + 8 }), // canto de cima à esquerda
    async () => ({ x: frame.x + frame.width - 8, y: frame.y + 8 }), // canto de cima à direita
    async () => ({ x: frame.x + 8, y: frame.y + frame.height - 8 }), // canto de baixo à esquerda
    async () => center((await tab(page).boundingBox())!),
    async () => center((await dialog(page).getByRole('img').boundingBox())!),
  ];
  for (let i = 0; i < spots.length; i++) {
    expect((await gameState(page)).dialogLine).toBe(i);
    const p = await spots[i]();
    await page.mouse.click(p.x, p.y);
    await expect(dialog(page)).toContainText(opening[i + 1].text);
  }
  // Na última fala, o triângulo também avança: a cena fecha.
  const arrow = center((await nextArrow(page).boundingBox())!);
  await page.mouse.click(arrow.x, arrow.y);
  await expect(dialog(page)).toHaveCount(0);
});
