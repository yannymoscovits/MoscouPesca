import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Tela inicial e instalação (INST-01 a INST-04), no build de teste.

test('INST-01: a tela inicial mostra "MoscouFishing", o subtítulo, "Colocar na tela" e "Jogar"', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'MoscouFishing' })).toBeVisible();
  await expect(page.getByText('Para Adilson Moscovits')).toBeVisible();
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
  const subtitle = page.getByText('Para Adilson Moscovits', { exact: true });
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
    expect.arrayContaining(['Moscou', 'Fishing', 'Um peixinho de cada vez', 'Para Adilson Moscovits', ...BUTTONS]),
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
  const overScene = ['Moscou', 'Fishing', 'Um peixinho de cada vez', 'Para Adilson Moscovits'];
  for (const html of nodes(axe.incomplete)) {
    expect(overScene.some((text) => html.includes(text)), `sem medida: ${html}`).toBe(true);
  }
  const targets: [string, Locator][] = [
    ['Moscou', page.getByText('Moscou', { exact: true })],
    ['Fishing', page.getByRole('heading', { level: 1, name: 'MoscouFishing' })], // o h1 tem a cor de "Fishing"
    ['Um peixinho de cada vez', page.getByText('Um peixinho de cada vez', { exact: true })],
    ['Para Adilson Moscovits', page.getByText('Para Adilson Moscovits', { exact: true })],
  ];
  for (const [text, target] of targets) {
    expect(await worstContrast(page, target), `contraste de "${text}"`).toBeGreaterThanOrEqual(4.5);
  }
});

// Profundidade do fundo do mar (T76): camadas longe, meio e perto, cardumes, neve marinha e bolhas.

const DEPTHS = ['far', 'mid', 'near'] as const;

/** Animações de dentro do fundo do mar: qual elemento (índice), se é animação CSS e as propriedades animadas. */
const sceneAnimations = (page: Page) =>
  page.evaluate(() => {
    const scene = document.querySelector('.title-scene')!;
    const targets: Element[] = [];
    return document.getAnimations().flatMap((a) => {
      const effect = a.effect as KeyframeEffect | null;
      const el = effect?.target;
      if (!el || !scene.contains(el)) return [];
      if (!targets.includes(el)) targets.push(el);
      const props = [...new Set(effect!.getKeyframes().flatMap((k) => Object.keys(k)))].filter(
        (p) => !['offset', 'computedOffset', 'easing', 'composite'].includes(p),
      );
      return [{ target: targets.indexOf(el), css: a instanceof CSSAnimation, props }];
    });
  });

/**
 * Posição de `probe` (ou do próprio elemento) ao longo de uma volta da animação de transform do elemento:
 * `range` é o quanto ela varia, `net` o quanto andou do começo ao fim (positivo = para baixo/direita).
 */
const travel = (layer: Locator, axis: 'x' | 'y', probe?: string) =>
  layer.evaluate(
    (el, [ax, sel]) => {
      const anim = el
        .getAnimations()
        .find((a) => (a.effect as KeyframeEffect).getKeyframes().some((k) => 'transform' in k))!;
      const ms = Number(anim.effect!.getTiming().duration);
      const target = sel ? el.querySelector(sel)! : el;
      anim.pause();
      const at: number[] = [];
      for (let i = 0; i < 20; i++) {
        anim.currentTime = (ms * i) / 20;
        const box = target.getBoundingClientRect();
        at.push(ax === 'x' ? box.x : box.y);
      }
      return { range: Math.max(...at) - Math.min(...at), net: at[at.length - 1] - at[0], seconds: ms / 1000 };
    },
    [axis, probe] as const,
  );

test('T76: o fundo tem camadas longe, meio e perto que crescem em escala, opacidade e velocidade; cardumes e partículas se mexem', async ({
  page,
}) => {
  await page.goto('/');
  const scene = page.locator('.title-scene');
  const layers = DEPTHS.map((d) => scene.locator(`[data-depth="${d}"]`));
  for (const layer of layers) await expect(layer).toHaveCount(1);

  // Opacidade: longe é a mais apagada, perto a mais forte.
  const opacity = await Promise.all(layers.map((l) => l.evaluate((el) => Number(getComputedStyle(el).opacity))));
  expect(opacity[0], 'longe < meio').toBeLessThan(opacity[1]);
  expect(opacity[1], 'meio < perto').toBeLessThan(opacity[2]);

  // Escala: cada camada tem um cardume, e o peixe dele é maior quanto mais perto.
  const fish = await Promise.all(
    layers.map(async (l) => (await l.locator('.title-scene__school > g').first().boundingBox())!.height),
  );
  expect(fish[0], 'peixe de longe < do meio').toBeLessThan(fish[1]);
  expect(fish[1], 'peixe do meio < de perto').toBeLessThan(fish[2]);

  // Velocidade (parallax): o cardume de perto anda mais rápido que o do meio, e este mais que o de longe.
  const speed: number[] = [];
  for (const layer of layers) {
    const { range, seconds } = await travel(layer, 'x', '.title-scene__school');
    speed.push(range / seconds);
  }
  expect(speed[0], 'cardume de longe se mexe').toBeGreaterThan(0);
  expect(speed[0], 'longe < meio').toBeLessThan(speed[1]);
  expect(speed[1], 'meio < perto').toBeLessThan(speed[2]);

  // Neve marinha caindo em duas velocidades; bolhas subindo do fundo.
  const snow = scene.locator('.title-scene__snow svg');
  await expect(snow).toHaveCount(2);
  const [slow, fast] = [await travel(snow.nth(0), 'y'), await travel(snow.nth(1), 'y')];
  expect(slow.net, 'neve lenta cai').toBeGreaterThan(0);
  expect(fast.net / fast.seconds, 'neve rápida cai mais rápido').toBeGreaterThan(slow.net / slow.seconds);
  const bubbles = await travel(scene.locator('.title-scene__bubbles'), 'y');
  expect(bubbles.net, 'bolhas sobem').toBeLessThan(0);
});

test('T76: o fundo só anima transform e opacity, em CSS, em no máximo 6 camadas e sem quadros em JavaScript', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    (window as any).frames = 0;
    window.requestAnimationFrame = (cb) => {
      (window as any).frames++;
      return raf(cb);
    };
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'MoscouFishing' })).toBeVisible();

  const animations = await sceneAnimations(page);
  expect(animations.length).toBeGreaterThan(0);
  expect(new Set(animations.map((a) => a.target)).size, 'camadas animadas').toBeLessThanOrEqual(6);
  for (const a of animations) {
    expect(a.css, 'animação de CSS').toBe(true);
    expect(['transform', 'opacity']).toEqual(expect.arrayContaining(a.props));
  }

  // Com a tela inicial parada, nenhum requestAnimationFrame: o navegador anima sozinho.
  await page.waitForTimeout(500);
  const frames = await page.evaluate(() => (window as any).frames);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => (window as any).frames), 'quadros em JavaScript').toBe(frames);
});

test('T76: com prefers-reduced-motion: reduce, nenhuma animação do fundo roda e a cena fica parada', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'MoscouFishing' })).toBeVisible();

  for (const d of DEPTHS) await expect(page.locator(`.title-scene [data-depth="${d}"]`)).toBeVisible();
  expect(await sceneAnimations(page)).toEqual([]);
});

test('T76 e ACES-07: em nenhum momento da animação o fundo tira o contraste de 4,5:1 do texto', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'MoscouFishing' })).toBeVisible();

  const targets: [string, Locator][] = [
    ['Moscou', page.getByText('Moscou', { exact: true })],
    ['Fishing', page.getByRole('heading', { level: 1, name: 'MoscouFishing' })],
    ['Um peixinho de cada vez', page.getByText('Um peixinho de cada vez', { exact: true })],
    ['Para Adilson Moscovits', page.getByText('Para Adilson Moscovits', { exact: true })],
  ];
  // Momentos espalhados ao longo das voltas das animações (luz, camadas, neve e bolhas em pontos diferentes).
  for (const s of [0, 2, 4.5, 6.5, 9, 13, 18, 27, 40, 55, 75]) {
    await page.evaluate((ms) => {
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = ms;
      }
    }, s * 1000);
    for (const [text, target] of targets) {
      expect(await worstContrast(page, target, 'allow'), `contraste de "${text}" em ${s} s`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

/**
 * Menor contraste entre a cor do texto e os pixels do fundo atrás dele: o texto some na hora da foto
 * e cada pixel da caixa dele é comparado com a cor do texto (fórmula de luminância da WCAG).
 * Com `animations: 'allow'`, a foto pega o fundo no ponto em que as animações estão.
 */
async function worstContrast(page: Page, target: Locator, animations: 'disabled' | 'allow' = 'disabled') {
  const color = await target.evaluate((el) => getComputedStyle(el).color);
  const box = (await target.boundingBox())!;
  const hide = await page.addStyleTag({
    content: '.screen__top, .screen__top * { color: transparent !important; text-shadow: none !important; }',
  });
  const shot = await page.screenshot({ clip: box, animations });
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

// T81: o peixe da tela inicial é a arte aprovada pelo usuário (src/assets/ui/peixe-fofo.png, 128 × 112).

/** Print do Pixel 7: em docs/arte/mockups com SAVE_SHOTS=1, senão na saída do teste. */
const shotPath = (name: string) => (process.env.SAVE_SHOTS ? `docs/arte/mockups/${name}` : test.info().outputPath(name));

test('T81: o peixe da tela inicial é o peixinho fofo, em escala inteira e pixelado, nadando e com bolhas', async ({ page }) => {
  await page.goto('/');
  const fish = page.locator('.logo-fish');
  const art = fish.locator('img');
  await expect(art).toBeVisible();
  await expect.poll(() => art.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);

  const img = await art.evaluate((el: HTMLImageElement) => ({
    src: el.currentSrc,
    natural: [el.naturalWidth, el.naturalHeight],
    shown: [el.offsetWidth, el.offsetHeight], // tamanho no layout, sem a inclinação da animação
    rendering: getComputedStyle(el).imageRendering,
  }));
  expect(img.src).toContain('peixe-fofo');
  expect(img.natural).toEqual([128, 112]);
  const scale = img.shown[0] / img.natural[0];
  expect(Number.isInteger(scale) && scale >= 1, `escala ${scale}`).toBe(true);
  expect(img.shown[1]).toBe(img.natural[1] * scale);
  expect(img.rendering).toBe('pixelated');

  // A mesma animação de nadar do peixe antigo, com as bolhas subindo ao lado dele.
  expect(await fish.evaluate((el) => getComputedStyle(el).animationName)).toBe('nadar');
  await expect(fish.locator('.logo-fish__bubbles')).toBeVisible();

  // O peixe continua em cima do título.
  const title = (await page.getByRole('heading', { level: 1, name: 'MoscouFishing' }).boundingBox())!;
  const fishBox = (await fish.boundingBox())!;
  expect(fishBox.y + fishBox.height).toBeLessThanOrEqual(title.y + 1);

  await page.screenshot({ path: shotPath('tela-inicial-implementada.png'), animations: 'disabled' });
});
