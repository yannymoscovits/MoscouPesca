import { expect, test, type Page } from '@playwright/test';
import { characters } from '../src/content/characters';
import { ep1 } from '../src/content/episodes/ep1';
import { expectContrast } from './contrast';
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
  expect(s.spot).toBeNull(); // nem o ponto foi escolhido
  expect(s.fishing).toEqual({ phase: 'Aim', sinceS: 0 });

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

// Quadro de diálogo do mockup (T77, docs/arte/mockups/tela-de-pesca-v2.png): caixa creme com borda amarela,
// retrato de moldura amarela em cima à esquerda, o nome acima do texto e o triângulo piscando
// (spec, "Visual do quadro de diálogo"; ACES-05 a ACES-08).

const box = (page: Page) => dialog(page).locator('.dialog-box');
const speaker = (page: Page) => dialog(page).locator('.dialog-box__name');
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

/** Cor média dos pixels da tela num retângulo, em [r, g, b]. */
async function pixels(page: Page, clip: { x: number; y: number; width: number; height: number }) {
  const shot = await page.screenshot({ clip, animations: 'disabled' });
  return page.evaluate(async (png) => {
    const img = new Image();
    img.src = `data:image/png;base64,${png}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, img.width, img.height).data;
    const sum = [0, 0, 0];
    for (let i = 0; i < px.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += px[i + c];
    return sum.map((v) => Math.round(v / (px.length / 4)));
  }, shot.toString('base64'));
}

const isYellow = ([r, g, b]: number[]) => r > 200 && g > 160 && b < 120;

/** Print do Pixel 7 para comparar com o mockup: em docs/arte/mockups com SAVE_SHOTS=1, senão na saída do teste. */
const shotPath = (name: string) => (process.env.SAVE_SHOTS ? `docs/arte/mockups/${name}` : test.info().outputPath(name));

test('T77: o nome de quem fala fica acima do texto, o retrato em cima à esquerda com a expressão e o triângulo pisca', async ({
  page,
}) => {
  await openingDialog(page);
  const names = Object.fromEntries(characters.map((c) => [c.id, c.name]));

  for (const line of opening.slice(0, 3)) {
    await expect(dialog(page)).toContainText(line.text);
    await expect(speaker(page)).toHaveText(names[line.speaker as string]);
    await expect(dialog(page).getByRole('img')).toHaveAttribute('data-expression', line.expression ?? 'normal');
    if (line === opening[0]) await page.screenshot({ path: shotPath('dialogo-implementado.png') });
    await dialog(page).click();
  }

  // Caixa creme com texto escuro; nome marrom-alaranjado; "Toque para continuar ▸" azul.
  const text = dialog(page).getByText(opening[3].text);
  const [r, g, b] = rgb(await box(page).evaluate((el) => getComputedStyle(el).backgroundColor));
  expect(Math.min(r, g, b), 'caixa clara').toBeGreaterThan(220);
  expect(r, 'caixa creme, puxada para o amarelo').toBeGreaterThan(b);
  const ink = rgb(await text.evaluate((el) => getComputedStyle(el).color));
  expect(Math.max(...ink), 'texto escuro').toBeLessThan(80);
  const [nr, ng, nb] = rgb(await speaker(page).evaluate((el) => getComputedStyle(el).color));
  expect(nr, 'nome marrom-alaranjado').toBeGreaterThan(ng);
  expect(ng, 'nome marrom-alaranjado').toBeGreaterThan(nb);
  const hint = dialog(page).getByText('Toque para continuar ▸');
  const [hr, hg, hb] = rgb(await hint.evaluate((el) => getComputedStyle(el).color));
  expect(hb, 'dica azul').toBeGreaterThan(Math.max(hr, hg) + 40);

  // Retrato em cima, à esquerda, saltando para fora da caixa; o nome embaixo dele e acima do texto.
  const frame = (await box(page).boundingBox())!;
  const portrait = (await dialog(page).getByRole('img').boundingBox())!;
  const name = (await speaker(page).boundingBox())!;
  const body = (await text.boundingBox())!;
  expect(portrait.y, 'retrato sai por cima da caixa').toBeLessThan(frame.y);
  expect(portrait.y + portrait.height, 'retrato entra na caixa').toBeGreaterThan(frame.y);
  expect(portrait.x - frame.x, 'retrato à esquerda').toBeLessThan(frame.width / 4);
  expect(name.y, 'nome embaixo do retrato').toBeGreaterThanOrEqual(portrait.y + portrait.height - 1);
  expect(body.y, 'texto embaixo do nome').toBeGreaterThanOrEqual(name.y + name.height - 1);

  // Borda amarela grossa na caixa e na moldura do retrato (pixels da tela, no meio de cada borda).
  const mid = frame.y + frame.height / 2;
  expect(isYellow(await pixels(page, { x: frame.x + 4, y: mid, width: 6, height: 8 })), 'borda da caixa').toBe(true);
  const px = portrait.x + portrait.width / 2;
  expect(isYellow(await pixels(page, { x: px, y: portrait.y + 4, width: 8, height: 4 })), 'moldura do retrato').toBe(true);

  // Triângulo no canto de baixo, embaixo da borda, piscando (a opacidade apaga e volta).
  await expect(nextArrow(page)).toBeVisible();
  const arrow = (await nextArrow(page).boundingBox())!;
  expect(arrow.x + arrow.width, 'no canto da direita').toBeGreaterThan(frame.x + frame.width * 0.8);
  expect(arrow.y, 'sobre a borda de baixo').toBeLessThan(frame.y + frame.height);
  expect(arrow.y + arrow.height, 'sai por baixo da borda').toBeGreaterThan(frame.y + frame.height);
  const opacities = await nextArrow(page).evaluate((el) =>
    el.getAnimations().flatMap((a) => (a.effect as KeyframeEffect).getKeyframes().map((k) => Number(k.opacity ?? 1))),
  );
  expect(Math.min(...opacities), 'triângulo apaga').toBe(0);
  expect(Math.max(...opacities), 'triângulo acende').toBe(1);
});

test('T77: fala conjunta mostra os dois nomes; narração fica sem nome', async ({ page }) => {
  await openWithProfile(page, inJacuipe('ep2-vitoria', ['ep2-abertura', 'ep2-vitoria']));
  await page.getByRole('button', { name: 'Jogar' }).click();
  for (let i = 0; i < 3; i++) await dialog(page).click();
  await expect(dialog(page)).toContainText('Amamos você meu filho, segura firme!');
  await expect(speaker(page)).toHaveText('Didi e Denise');

  await openWithProfile(page, inJacuipe(null));
  await page.getByRole('button', { name: 'Jogar' }).click();
  for (let i = 0; i < 4; i++) await dialog(page).click();
  await expect(dialog(page)).toContainText('Jacuípe, muitos anos atrás.');
  await expect(speaker(page)).toHaveCount(0);
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

test('T77, ACES-05, ACES-07: no quadro e no cartão, textos >= 18 px e contraste >= 4,5:1', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.getByRole('button', { name: 'Tranquilo' }).click();

  // Cartão de apresentação da Jane.
  await expect(introCard(page)).toBeVisible();
  const card = await textSizes(page, '[role="dialog"]');
  expect(card.map((t) => t.text)).toEqual(expect.arrayContaining(['JANE', 'A Que Sempre Teve Razão', 'Toque para continuar ▸']));
  expect(card.filter((t) => t.size < 18)).toEqual([]);
  await expectContrast(page, '[role="dialog"]');

  // Primeira fala.
  await introCard(page).click();
  await expect(dialog(page)).toContainText(opening[0].text);
  const line = await textSizes(page, '[role="dialog"]');
  expect(line.map((t) => t.text)).toEqual(expect.arrayContaining(['Jane', opening[0].text, 'Toque para continuar ▸']));
  expect(line.filter((t) => t.size < 18)).toEqual([]);
  await expectContrast(page, '[role="dialog"]');
});

test('T77, HIST-03: o quadro inteiro é tocável: cantos, nome, retrato e triângulo avançam a fala', async ({ page }) => {
  await openingDialog(page);

  const frame = (await box(page).boundingBox())!;
  type Box = { x: number; y: number; width: number; height: number };
  const center = (b: Box) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
  const spots = [
    async () => ({ x: frame.x + 8, y: frame.y + 8 }), // canto de cima à esquerda
    async () => ({ x: frame.x + frame.width - 8, y: frame.y + 8 }), // canto de cima à direita
    async () => ({ x: frame.x + 8, y: frame.y + frame.height - 8 }), // canto de baixo à esquerda
    async () => center((await speaker(page).boundingBox())!),
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
