import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Tela inicial e instalação (INST-01 a INST-04), no build de teste.

test('INST-01: a tela inicial mostra "MoscouFishing", o subtítulo, "Colocar na tela" e "Jogar"', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'MoscouFishing' })).toBeVisible();
  await expect(page.getByText('A Jornada de Adilson Moscovits')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Colocar na tela' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jogar' })).toBeVisible();
});

test('INST-02: com o convite do navegador, "Colocar na tela" abre o diálogo de instalação', async ({ page }) => {
  await page.goto('/');
  // O Chrome dispara beforeinstallprompt quando o site pode ser instalado; o prompt() abre o diálogo do Android.
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt(): Promise<void> };
    e.prompt = async () => {
      (window as any).promptCalls = ((window as any).promptCalls ?? 0) + 1;
    };
    window.dispatchEvent(e);
  });

  await page.getByRole('button', { name: 'Colocar na tela' }).click();

  await expect.poll(() => page.evaluate(() => (window as any).promptCalls)).toBe(1);
  await expect(page.getByText('Adicionar à tela inicial')).toHaveCount(0); // sem a instrução do menu
});

test('INST-03: sem o convite, "Colocar na tela" mostra a instrução do menu ⋮ e "Adicionar à tela inicial"', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Colocar na tela' }).click();

  const help = page.getByRole('dialog', { name: 'Colocar o jogo na tela' });
  await expect(help).toBeVisible();
  await expect(help).toContainText('⋮');
  await expect(help).toContainText('Adicionar à tela inicial');

  await help.getByRole('button', { name: 'Entendi' }).click();
  await expect(help).toBeHidden();
  await expect(page.getByRole('button', { name: 'Jogar' })).toBeVisible();
});

test('INST-04: rodando instalado (display-mode standalone), o botão "Colocar na tela" some', async ({ page }) => {
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (query: string) =>
      query.includes('display-mode: standalone')
        ? ({ matches: true, media: query, onchange: null, addEventListener() {}, removeEventListener() {} } as any)
        : real(query);
  });
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'MoscouFishing' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jogar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Colocar na tela' })).toHaveCount(0);
});

// Visual da tela inicial (spec, "Visual da tela inicial e do tema": mockup e logo do usuário).

const BUTTONS = ['Colocar na tela', 'Ajustes', 'Jogar'];

/** Cor de fundo computada, em [r, g, b]. */
const background = (l: Locator) =>
  l.evaluate((el) => getComputedStyle(el).backgroundColor.match(/\d+/g)!.slice(0, 3).map(Number));

test('Tela inicial do mockup: título, slogan e subtítulo em cima; botões azul, marinho e amarelo maior, nessa ordem', async ({
  page,
}) => {
  await page.goto('/');

  const title = page.getByRole('heading', { level: 1, name: 'MoscouFishing' });
  const tagline = page.getByText('Um peixinho de cada vez', { exact: true });
  const subtitle = page.getByText('A Jornada de Adilson Moscovits', { exact: true });
  await expect(title).toBeVisible();
  await expect(tagline).toBeVisible();
  await expect(subtitle).toBeVisible();

  // De cima para baixo: título → slogan → subtítulo → botões.
  const titleBox = (await title.boundingBox())!;
  const taglineBox = (await tagline.boundingBox())!;
  const subtitleBox = (await subtitle.boundingBox())!;
  expect(taglineBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height);
  expect(subtitleBox.y).toBeGreaterThanOrEqual(taglineBox.y + taglineBox.height);

  const buttons = page.getByRole('button');
  await expect(buttons).toHaveText(BUTTONS);
  const [install, settings, play] = await buttons.all();
  const boxes = await Promise.all([install, settings, play].map(async (b) => (await b.boundingBox())!));
  expect(boxes[0].y).toBeGreaterThanOrEqual(subtitleBox.y + subtitleBox.height);
  expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].y + boxes[0].height);
  expect(boxes[2].y).toBeGreaterThanOrEqual(boxes[1].y + boxes[1].height);
  // "Jogar" é o maior.
  expect(boxes[2].height).toBeGreaterThan(boxes[0].height);
  expect(boxes[2].height).toBeGreaterThan(boxes[1].height);

  // "Colocar na tela" azul, "Ajustes" azul-marinho (escuro), "Jogar" amarelo.
  const [ir, ig, ib] = await background(install);
  expect(ib, 'Colocar na tela: azul').toBeGreaterThan(150);
  expect(ib - Math.max(ir, ig), 'Colocar na tela: azul').toBeGreaterThan(60);
  const [sr, sg, sb] = await background(settings);
  expect(Math.max(sr, sg, sb), 'Ajustes: escuro').toBeLessThan(130);
  expect(sb, 'Ajustes: puxado para o azul').toBeGreaterThan(Math.max(sr, sg));
  const [pr, pg, pb] = await background(play);
  expect(Math.min(pr, pg), 'Jogar: amarelo').toBeGreaterThan(180);
  expect(pb, 'Jogar: amarelo').toBeLessThan(120);
});

test('ACES-02: "Ajustes" na tela inicial abre a tela de ajustes', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Ajustes' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeVisible();
  await expect(page.getByRole('switch', { name: /Vibração/ })).toBeVisible();
});

test('ACES-05 a ACES-08 na tela inicial: botões >= 56 × 56 px na metade de baixo, textos >= 18 px e contraste >= 4,5:1', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'MoscouFishing' })).toBeVisible();

  // ACES-06 e ACES-08
  const { height } = page.viewportSize()!;
  const buttons = page.getByRole('button');
  expect(await buttons.count()).toBe(BUTTONS.length);
  for (const btn of await buttons.all()) {
    const name = (await btn.textContent())!.trim();
    const box = (await btn.boundingBox())!;
    expect(box.width, name).toBeGreaterThanOrEqual(56);
    expect(box.height, name).toBeGreaterThanOrEqual(56);
    expect(box.y, name).toBeGreaterThanOrEqual(height / 2);
    expect(box.y + box.height, name).toBeLessThanOrEqual(height);
  }

  // ACES-05: todo texto visível com font-size computado >= 18 px.
  const texts = await page.evaluate(() => {
    const found: { text: string; size: number }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement!;
      const text = node.textContent!.trim();
      if (text && el.checkVisibility()) found.push({ text, size: parseFloat(getComputedStyle(el).fontSize) });
    }
    return found;
  });
  expect(texts.map((t) => t.text)).toEqual(
    expect.arrayContaining(['Moscou', 'Fishing', 'Um peixinho de cada vez', 'A Jornada de Adilson Moscovits', ...BUTTONS]),
  );
  expect(texts.filter((t) => t.size < 18)).toEqual([]);

  // ACES-07: contraste >= 4,5:1. O axe mede os botões, de fundo liso, e não acha violação.
  const axe = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  const nodes = (results: typeof axe.violations) => results.flatMap((r) => r.nodes.map((n) => n.html));
  expect(nodes(axe.violations)).toEqual([]);
  for (const text of BUTTONS) {
    expect(nodes(axe.passes).some((html) => html.includes(text)), `axe mediu: ${text}`).toBe(true);
  }
  // Sobre o fundo do mar desenhado o axe não sabe medir ("incomplete"): esses textos, e só eles, são medidos
  // contra os pixels do fundo que fica atrás deles.
  const overScene = ['Moscou', 'Fishing', 'Um peixinho de cada vez', 'A Jornada de Adilson Moscovits'];
  for (const html of nodes(axe.incomplete)) {
    expect(overScene.some((text) => html.includes(text)), `sem medida: ${html}`).toBe(true);
  }
  const targets: [string, Locator][] = [
    ['Moscou', page.getByText('Moscou', { exact: true })],
    ['Fishing', page.getByRole('heading', { level: 1, name: 'MoscouFishing' })], // o h1 tem a cor de "Fishing"
    ['Um peixinho de cada vez', page.getByText('Um peixinho de cada vez', { exact: true })],
    ['A Jornada de Adilson Moscovits', page.getByText('A Jornada de Adilson Moscovits', { exact: true })],
  ];
  for (const [text, target] of targets) {
    expect(await worstContrast(page, target), `contraste de "${text}"`).toBeGreaterThanOrEqual(4.5);
  }
});

/**
 * Menor contraste entre a cor do texto e os pixels do fundo atrás dele: o texto some na hora da foto
 * e cada pixel da caixa dele é comparado com a cor do texto (fórmula de luminância da WCAG).
 */
async function worstContrast(page: Page, target: Locator) {
  const color = await target.evaluate((el) => getComputedStyle(el).color);
  const box = (await target.boundingBox())!;
  const hide = await page.addStyleTag({
    content: '.screen__top, .screen__top * { color: transparent !important; text-shadow: none !important; }',
  });
  const shot = await page.screenshot({ clip: box, animations: 'disabled' });
  await hide.evaluate((el) => (el as HTMLStyleElement).remove());

  return page.evaluate(
    async ([png, fg]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, img.width, img.height).data;
      const channel = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const lum = (r: number, g: number, b: number) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      const [r, g, b] = fg.match(/\d+/g)!.map(Number);
      const text = lum(r, g, b);
      let worst = Infinity;
      for (let i = 0; i < px.length; i += 4) {
        const back = lum(px[i], px[i + 1], px[i + 2]);
        worst = Math.min(worst, (Math.max(text, back) + 0.05) / (Math.min(text, back) + 0.05));
      }
      return worst;
    },
    [shot.toString('base64'), color] as const,
  );
}
