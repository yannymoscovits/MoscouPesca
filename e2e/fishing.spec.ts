import { expect, test, type Page } from '@playwright/test';
import { characters } from '../src/content/characters';
import { ep1 } from '../src/content/episodes/ep1';
import { ep2 } from '../src/content/episodes/ep2';
import {
  advance,
  advanceUntil,
  castNothing,
  castNow,
  catchFish,
  chooseSpot,
  gameState,
  hookNow,
  manualClock,
  openWithProfile,
  reelUntilStrike,
  toScreen,
  veteran,
} from './support';
import { expectContrast } from './contrast';

// Tela de pesca e HUD (HIST-04, SAVE-03, CAMP-03, TELA-01). A pescaria em si está em pescaria.spec.ts.

const hud = (page: Page) => page.getByRole('group', { name: 'Painel da pescaria' });
const pauseButton = (page: Page) => page.getByRole('button', { name: 'Pausar' });

async function play(page: Page) {
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
}


test('HIST-04: o objetivo atual do capítulo, com a contagem, e o saldo aparecem na tela de pesca', async ({ page }) => {
  await openWithProfile(page, {
    ...veteran(),
    money: 1234,
    story: { episodes: { 1: { objectiveIndex: 0, progress: 1, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null },
  });
  await play(page);
  await expect(hud(page)).toContainText('Pegar 3 peixes');
  await expect(hud(page)).toContainText('1 de 3');
  await expect(hud(page)).toContainText('R$ 1.234');

  await openWithProfile(page, {
    ...veteran(),
    story: { episodes: { 1: { objectiveIndex: 1, progress: 0, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null },
  });
  await play(page);
  await expect(hud(page)).toContainText('Comprar a Vara de Fibra');
  await expect(hud(page)).not.toContainText('Pegar 3 peixes');
});

/** O botão de pausa está visível e é o que recebe o toque no centro dele (nada o cobre). */
async function expectPauseOnTop(page: Page, phase: string) {
  const s = await gameState(page);
  expect(phase === 'Pesqueiro' ? (s.spot === null ? 'Pesqueiro' : s.spot) : s.fishing.phase).toBe(phase);
  await expect(pauseButton(page), phase).toBeVisible();
  const onTop = await pauseButton(page).evaluate((btn) => {
    const r = btn.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return hit !== null && btn.contains(hit);
  });
  expect(onTop, `pausa coberta em ${phase}`).toBe(true);
}

test('SAVE-03: o botão de pausa fica visível em todos os estados da pesca', async ({ page }) => {
  await openWithProfile(page, veteran('tranquilo'));
  await manualClock(page);
  await play(page);
  const mf = (fn: string, ...args: unknown[]) =>
    page.evaluate(([f, a]) => (window as any).__mf.controller[f as string](...(a as unknown[])), [fn, args] as const);

  await expectPauseOnTop(page, 'Pesqueiro');
  await chooseSpot(page);
  await expectPauseOnTop(page, 'Aim');
  await page.evaluate(() => (window as any).__mf.button('arremessar'));
  await expectPauseOnTop(page, 'Power');
  await page.evaluate(() => (window as any).__mf.button('arremessar'));
  await expectPauseOnTop(page, 'Flying');
  await advance(page, 1);
  await expectPauseOnTop(page, 'Lure');
  expect(await reelUntilStrike(page)).toBe('Strike');
  await expectPauseOnTop(page, 'Strike');
  await page.evaluate(() => (window as any).__mf.button('puxar'));
  await expectPauseOnTop(page, 'Fight');
  expect(await advanceUntil(page, 'Result_Caught', 60)).toBe('Result_Caught'); // a semente 7 traz um piau calmo
  await expectPauseOnTop(page, 'Result_Caught');
  await mf('dismissResult');

  expect(await castNothing(page)).toBe('Result_Nothing'); // ISCA-12
  await expectPauseOnTop(page, 'Result_Nothing');
  await mf('dismissResult');

  await mf('setDifficulty', 'desafio'); // só no Desafio o peixe foge da briga (BRIGA-11)
  expect(await castNow(page)).toBe('Lure');
  expect(await reelUntilStrike(page)).toBe('Strike');
  await page.evaluate(() => (window as any).__mf.button('puxar'));
  await page.evaluate(() => (window as any).__mf.hold(true)); // segurando sempre, a faixa sobe e deixa o peixe
  expect(await advanceUntil(page, 'Result_Escaped', 60)).toBe('Result_Escaped');
  await expectPauseOnTop(page, 'Result_Escaped');
});

test('CAMP-03: no torneio, aparecem quantos dos 8 arremessos restam e a pontuação parcial', async ({ page }) => {
  await openWithProfile(page, {
    ...veteran(),
    story: { episodes: { 1: { objectiveIndex: 6, progress: 0, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null },
    tournament: {
      id: 'guanambicup',
      castsLeft: 5,
      catches: [
        { species: 'tilapia', kg: 1.2 },
        { species: 'traira', kg: 2.5 },
        { species: 'piau', kg: 0.8 },
        { species: 'tilapia', kg: 1 },
      ],
    },
  });
  await manualClock(page);
  await play(page);
  await expect(hud(page)).toContainText('5 de 8 arremessos');
  await expect(hud(page)).toContainText('4,70 kg'); // soma dos 3 mais pesados: 2,5 + 1,2 + 1 (CAMP-04)

  expect(await catchFish(page, { tries: 1 })).toBe('Result_Caught');

  const kgs = (await gameState(page)).profile.tournament.catches.map((c: { kg: number }) => c.kg);
  const best3 = kgs.sort((a: number, b: number) => b - a).slice(0, 3).reduce((a: number, b: number) => a + b, 0);
  await expect(hud(page)).toContainText('4 de 8 arremessos');
  await expect(hud(page)).toContainText(`${best3.toFixed(2).replace('.', ',')} kg`);
});

test('TELA-01: a tela de pesca pede para manter a tela acesa e solta ao sair dela', async ({ page }) => {
  await page.addInitScript(() => {
    const log: string[] = ((window as any).wakeLog = []);
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async (type: string) => {
          log.push(`request:${type}`);
          const sentinel = {
            released: false,
            release: async () => {
              sentinel.released = true;
              log.push('release');
            },
            addEventListener() {},
            removeEventListener() {},
          };
          return sentinel;
        },
      },
    });
  });
  await openWithProfile(page, veteran());
  const wakeLog = () => page.evaluate(() => (window as any).wakeLog as string[]);
  expect(await wakeLog()).toEqual([]); // ainda na tela inicial

  await play(page);
  await expect.poll(wakeLog).toEqual(['request:screen']);

  await page.getByRole('button', { name: 'Menu' }).click(); // sai da pesca para o menu (T74)
  await expect(page.getByRole('region', { name: 'Menu' })).toBeVisible();
  await expect.poll(wakeLog).toEqual(['request:screen', 'release']);
});

// Tela de pesca do mockup (T78, docs/arte/mockups/tela-de-pesca-v2.png): painel de três linhas com ícone,
// o fundo do mar com o véu do local, o píer embaixo e os botões com ícone sobre ele (ACES-05 a ACES-08).

/** Print do Pixel 7 para comparar com o mockup: em docs/arte/mockups com SAVE_SHOTS=1, senão na saída do teste. */
const shotPath = (name: string) => (process.env.SAVE_SHOTS ? `docs/arte/mockups/${name}` : test.info().outputPath(name));

/** Cor média dos pixels da tela num retângulo, com as animações de CSS paradas no começo, em [r, g, b]. */
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

test('T78, HIST-04: o painel mostra saldo e local, vara · isca e o objetivo com "N de M", em três linhas com ícone', async ({
  page,
}) => {
  await openWithProfile(page, {
    ...veteran(),
    money: 1234,
    story: { episodes: { 1: { objectiveIndex: 0, progress: 1, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null },
  });
  await play(page);

  const lines = hud(page).locator('.hud__line');
  await expect(lines).toHaveCount(3);
  await expect(lines.nth(0)).toContainText('R$ 1.234');
  await expect(lines.nth(0)).toContainText('Barragem do Poço do Magro');
  await expect(lines.nth(1)).toHaveText('Vara de Bambu · Minhoca');
  await expect(lines.nth(2)).toHaveText('Objetivo: Pegar 3 peixes · 1 de 3');

  // Uma linha embaixo da outra, cada uma com o seu ícone (moeda, alfinete e alvo: três desenhos diferentes).
  const tops = await lines.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  expect(tops[1]).toBeGreaterThan(tops[0]);
  expect(tops[2]).toBeGreaterThan(tops[1]);
  const icons = await lines.evaluateAll((els) => els.map((el) => el.querySelectorAll('svg').length));
  expect(icons).toEqual([1, 1, 1]);
  const drawings = await hud(page).locator('.hud__line svg').evaluateAll((els) => els.map((el) => el.innerHTML));
  expect(new Set(drawings).size).toBe(3);
});

test('T78, ACES-05 a ACES-08: "Pausar" e "Menu" com ícone na metade de baixo, >= 56 × 56 px; textos >= 18 px e contraste >= 4,5:1', async ({
  page,
}) => {
  await openWithProfile(page, veteran());
  await play(page);
  const { height } = page.viewportSize()!;

  for (const name of ['Pausar', 'Menu']) {
    const btn = page.getByRole('button', { name, exact: true });
    const box = (await btn.boundingBox())!;
    expect(box.width, name).toBeGreaterThanOrEqual(56);
    expect(box.height, name).toBeGreaterThanOrEqual(56);
    expect(box.y, name).toBeGreaterThanOrEqual(height / 2);
    expect(box.y + box.height, name).toBeLessThanOrEqual(height);
    await expect(btn.locator('svg'), `ícone de ${name}`).toBeVisible();
  }

  const texts = await page.evaluate(() => {
    const found: { text: string; size: number }[] = [];
    const walker = document.createTreeWalker(document.querySelector('.hud')!, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement!;
      const text = node.textContent!.trim();
      if (text && el.checkVisibility()) found.push({ text, size: parseFloat(getComputedStyle(el).fontSize) });
    }
    return found;
  });
  expect(texts.map((t) => t.text)).toEqual(
    expect.arrayContaining(['R$ 0', 'Barragem do Poço do Magro', 'Vara de Bambu · Minhoca', 'Pausar', 'Menu']),
  );
  expect(texts.filter((t) => t.size < 18)).toEqual([]);

  await expectContrast(page, '.hud');

  // Print com a primeira fala da Jane, como no mockup.
  await openWithProfile(page, {
    ...veteran(),
    story: { episodes: {}, scenesSeen: [], pendingScene: null },
    charactersIntroduced: ['jane', 'adilson'],
  });
  await play(page);
  await expect(page.getByRole('dialog', { name: 'Conversa' })).toBeVisible();
  await page.screenshot({ path: shotPath('tela-de-pesca-implementada.png'), animations: 'disabled' });
});

test('T78, EPI-04: viajar pelo Mapa troca o fundo da cena (data-background e a cor provisória do local)', async ({ page }) => {
  await openWithProfile(page, {
    ...veteran(),
    unlockedEpisodes: [1, 2],
    charactersIntroduced: characters.map((c) => c.id),
    story: {
      episodes: { 1: { objectiveIndex: 6, progress: 0, won: true } },
      scenesSeen: ['ep1-abertura', 'ep1-vitoria', 'ep2-abertura'],
      pendingScene: null,
    },
  });
  await play(page);
  const stage = page.getByRole('region', { name: 'Pescaria' }).locator('[data-background]');

  /** Cor média da água no meio da cena (longe do painel, do píer e dos botões). */
  const water = async () => {
    const a = toScreen(page, 20, 160);
    const b = toScreen(page, 160, 260);
    return pixels(page, { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y });
  };
  const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  const seen: number[][] = [];
  for (const loc of [ep1.locations[0], ...ep2.locations]) {
    if (seen.length > 0) {
      await page.getByRole('button', { name: 'Menu' }).click();
      await page.getByRole('button', { name: 'Mapa', exact: true }).click();
      await page.getByRole('region', { name: 'Mapa' }).getByRole('button', { name: loc.name }).click();
    }
    await chooseSpot(page, loc.zones[0].id); // a vista de cima do arremesso, sem os pontos por cima
    await expect(stage).toHaveAttribute('data-background', loc.background);
    await expect(hud(page)).toContainText(loc.name);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50)))));
    const color = await water();
    for (const other of seen) expect(distance(color, other), `cor de ${loc.name}`).toBeGreaterThan(15);
    seen.push(color);
  }
});

test('T78, CAMP-03, BRIGA-01: na briga, os arremessos do torneio continuam no painel e a barra de captura não o cobre', async ({
  page,
}) => {
  await openWithProfile(page, {
    ...veteran(),
    story: { episodes: { 1: { objectiveIndex: 6, progress: 0, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null },
    tournament: { id: 'guanambicup', castsLeft: 5, catches: [] },
  });
  await manualClock(page);
  await play(page);
  await expect(hud(page).getByText(/restam 5 de 8 arremessos/)).toBeVisible();

  await chooseSpot(page);
  expect(await hookNow(page)).toBe('Fight');
  const catchBar = page.getByRole('group', { name: 'Barra de captura' });
  await expect(catchBar).toBeVisible();
  await expect(hud(page).getByText(/restam 5 de 8 arremessos/)).toBeVisible();
  const panel = (await hud(page).boundingBox())!;
  const bar = (await catchBar.boundingBox())!;
  expect(bar.y).toBeGreaterThanOrEqual(panel.y + panel.height);
});

