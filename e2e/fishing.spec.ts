import { expect, test, type Page } from '@playwright/test';
import { characters } from '../src/content/characters';
import { ep1 } from '../src/content/episodes/ep1';
import { ep2 } from '../src/content/episodes/ep2';
import {
  advance,
  advanceUntil,
  gameState,
  manualClock,
  money,
  openWithProfile,
  toScreen,
  veteran,
} from './support';
import { expectContrast } from './contrast';

// Tela de pesca e HUD (HIST-04, PESCA-12, SAVE-03, CAMP-03, TELA-01).

const hud = (page: Page) => page.getByRole('group', { name: 'Painel da pescaria' });
const pauseButton = (page: Page) => page.getByRole('button', { name: 'Pausar' });

async function play(page: Page) {
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
}

/** Toque na água num ponto da cena lógica. */
async function tapWater(page: Page, x: number, y: number) {
  const p = toScreen(page, x, y);
  await page.mouse.click(p.x, p.y);
}

test('tocar na água arremessa até o ponto tocado e a pesca segue até a ficha, com o saldo atualizado', async ({ page }) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  await expect(hud(page)).toContainText('R$ 0');

  await tapWater(page, 90, 300);
  const cast = (await gameState(page)).fishing;
  expect(cast.phase).toBe('Flying');
  expect(cast.to.x).toBeCloseTo(90, 0);
  expect(cast.to.y).toBeCloseTo(300, 0);

  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  const p = toScreen(page, 90, 300);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down(); // fisga (PESCA-08) e segura para recolher (PESCA-10)
  expect((await gameState(page)).fishing.phase).toBe('Fight');
  expect(await advanceUntil(page, 'Result_Caught', 40)).toBe('Result_Caught');
  await page.mouse.up();

  const s = await gameState(page);
  expect(s.profile.money).toBe(s.fishing.value); // PESCA-17
  await expect(hud(page)).toContainText(money(s.fishing.value));
});

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

/** Faixa da barra pela spec (PESCA-12): verde abaixo de 70, amarela de 70 a 89, vermelha de 90 a 100. */
const bandFor = (value: number) => (value < 70 ? 'verde' : value < 90 ? 'amarelo' : 'vermelho');

test('PESCA-12: a barra de tensão vai de 0 a 100 e muda de cor em 69/70 e em 89/90', async ({ page }) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  await tapWater(page, 90, 300);
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  await page.evaluate(() => (window as any).__mf.press()); // fisga e segura

  const meter = page.getByRole('meter', { name: 'Tensão da linha' });
  await expect(meter).toBeVisible();
  await expect(meter).toHaveAttribute('aria-valuemin', '0');
  await expect(meter).toHaveAttribute('aria-valuemax', '100');

  // Segura em passos curtos e lê a barra depois de cada um: valor, faixa e matiz da cor.
  const samples = await page.evaluate(async () => {
    const mf = (window as any).__mf;
    const hue = (rgb: string) => {
      const [r, g, b] = rgb.match(/\d+/g)!.slice(0, 3).map((n) => Number(n) / 255);
      const max = Math.max(r, g, b);
      const d = max - Math.min(r, g, b);
      if (d === 0) return -1;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const out: { value: number; band: string | null; hue: number }[] = [];
    while (mf.state().fishing.phase === 'Fight' && mf.state().fishing.tension < 95) {
      mf.advance(0.005);
      await new Promise((r) => setTimeout(r, 0));
      const el = document.querySelector('[role="meter"]')!;
      const fill = el.querySelector('[data-fill]')!;
      out.push({
        value: Number(el.getAttribute('aria-valuenow')),
        band: el.getAttribute('data-band'),
        hue: hue(getComputedStyle(fill).backgroundColor),
      });
    }
    return out;
  });

  const seen = new Set(samples.map((s) => s.value));
  for (const v of [69, 70, 89, 90]) expect(seen.has(v), `valor ${v} lido na barra`).toBe(true);
  for (const s of samples) {
    expect(s.band, `tensão ${s.value}`).toBe(bandFor(s.value));
    const color = s.hue >= 80 && s.hue <= 160 ? 'verde' : s.hue >= 40 && s.hue < 70 ? 'amarelo' : s.hue <= 15 || s.hue >= 345 ? 'vermelho' : `matiz ${s.hue}`;
    expect(color, `cor da barra em ${s.value}`).toBe(bandFor(s.value));
  }
});

/** O botão de pausa está visível e é o que recebe o toque no centro dele (nada o cobre). */
async function expectPauseOnTop(page: Page, phase: string) {
  expect((await gameState(page)).fishing.phase).toBe(phase);
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

  await expectPauseOnTop(page, 'Idle');
  await tapWater(page, 90, 300);
  await expectPauseOnTop(page, 'Flying');
  await advance(page, 1);
  await expectPauseOnTop(page, 'Waiting');
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  await expectPauseOnTop(page, 'Bite');
  expect(await advanceUntil(page, 'Result_Escaped')).toBe('Result_Escaped'); // não fisgou (PESCA-09)
  await expectPauseOnTop(page, 'Result_Escaped');
  await mf('dismissResult');

  await tapWater(page, 90, 365); // beirada sem peixe (PESCA-05)
  expect(await advanceUntil(page, 'Result_Nothing')).toBe('Result_Nothing');
  await expectPauseOnTop(page, 'Result_Nothing');
  await mf('dismissResult');

  await tapWater(page, 90, 300);
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  await page.evaluate(() => (window as any).__mf.press());
  await expectPauseOnTop(page, 'Fight');
  expect(await advanceUntil(page, 'Result_Caught', 40)).toBe('Result_Caught');
  await expectPauseOnTop(page, 'Result_Caught');
  await page.evaluate(() => (window as any).__mf.release());
  await mf('dismissResult');

  await mf('setDifficulty', 'desafio'); // só no Desafio a linha arrebenta (PESCA-13)
  await tapWater(page, 90, 300);
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  await page.evaluate(() => (window as any).__mf.press());
  expect(await advanceUntil(page, 'Result_Broken', 40)).toBe('Result_Broken');
  await expectPauseOnTop(page, 'Result_Broken');
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

  await tapWater(page, 90, 300);
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  await page.evaluate(() => (window as any).__mf.press());
  expect(await advanceUntil(page, 'Result_Caught', 40)).toBe('Result_Caught');

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
    await expect(stage).toHaveAttribute('data-background', loc.background);
    await expect(hud(page)).toContainText(loc.name);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50)))));
    const color = await water();
    for (const other of seen) expect(distance(color, other), `cor de ${loc.name}`).toBeGreaterThan(15);
    seen.push(color);
  }
});

test('T78, PESCA-12, CAMP-03: os arremessos do torneio e a barra de tensão continuam visíveis no painel', async ({ page }) => {
  await openWithProfile(page, {
    ...veteran(),
    story: { episodes: { 1: { objectiveIndex: 6, progress: 0, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null },
    tournament: { id: 'guanambicup', castsLeft: 5, catches: [] },
  });
  await manualClock(page);
  await play(page);
  await expect(hud(page).getByText(/restam 5 de 8 arremessos/)).toBeVisible();

  await tapWater(page, 90, 300);
  expect(await advanceUntil(page, 'Bite')).toBe('Bite');
  await page.evaluate(() => (window as any).__mf.press());
  const meter = hud(page).getByRole('meter', { name: 'Tensão da linha' });
  await expect(meter).toBeVisible();
  const panel = (await hud(page).boundingBox())!;
  const bar = (await meter.boundingBox())!;
  expect(bar.y + bar.height).toBeLessThanOrEqual(panel.y + panel.height);
});
