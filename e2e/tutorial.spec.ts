import { expect, test, type Page } from '@playwright/test';
import { tutorial } from '../src/content/episodes/ep1';
import type { TutorialPescaStep } from '../src/domain/tutorialPesca';
import { advance, autoplay, chooseSpot, fishingButton, gameState, manualClock, openGame, openWithProfile } from './support';

// Tutorial da pescaria nova (pesca-bass TUTOB-01 a TUTOB-04): uma fala da Jane por vez e uma seta onde
// tocar (TUTO-02), que pisca depois de 10 s sem toque (TUTO-07); um peixe segue a isca em até 3 s, a
// fisgada espera o toque e a briga tem o peixe calmo e o medidor que não desce de 10%.

const coach = (page: Page) => page.getByRole('status', { name: 'Dica da Jane' });
const arrow = (page: Page) => page.locator('[data-tutorial-arrow]');
const step = async (page: Page) => (await gameState(page)).tutorial?.step as TutorialPescaStep | undefined;

/** Ponta da seta: o meio da borda de baixo (a seta aponta para baixo). */
async function arrowTip(page: Page) {
  const box = (await arrow(page).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height };
}

/** Uma fala só na tela, a do passo pedido, e uma seta para o alvo dele (o passo final não tem seta). */
async function expectStep(page: Page, name: TutorialPescaStep) {
  await expect(coach(page)).toHaveCount(1);
  await expect(coach(page)).toHaveText(tutorial[name].text);
  if (name === 'done') return expect(arrow(page)).toHaveCount(0);
  await expect(arrow(page)).toHaveCount(1);
  await expect(arrow(page)).toHaveAttribute('data-target', name);
}

/**
 * A ponta da seta está sobre a borda de cima do elemento, dentro da largura dele. Espera o alvo parar:
 * o papel do ponto e os botões entram na tela com animação, e a seta os acompanha quadro a quadro.
 */
async function expectArrowOn(page: Page, target: ReturnType<Page['locator']>) {
  await expect
    .poll(async () => {
      const tip = await arrowTip(page);
      const box = (await target.boundingBox())!;
      const inside = tip.x > box.x && tip.x < box.x + box.width;
      return inside && Math.abs(tip.y - box.y) <= 8;
    })
    .toBe(true);
}

/** Toca onde a seta aponta: um pouco abaixo da ponta, já dentro do alvo. */
async function tapArrow(page: Page) {
  const tip = await arrowTip(page);
  await page.mouse.click(tip.x, tip.y + 14);
}

async function holdArrow(page: Page) {
  const tip = await arrowTip(page);
  await page.mouse.move(tip.x, tip.y + 14);
  await page.mouse.down();
}

/** Avança o tempo de 0,1 em 0,1 s até o tutorial chegar ao passo pedido; devolve os segundos. */
async function advanceUntilStep(page: Page, want: TutorialPescaStep, maxS: number) {
  return page.evaluate(
    ([w, max]) => {
      const mf = (window as any).__mf;
      let t = 0;
      for (; t < max && mf.state().tutorial?.step !== w; t += 0.1) mf.advance(0.1);
      return t;
    },
    [want, maxS] as const,
  );
}

/** Primeira pescaria com a abertura já vista e a Jane e o Adilson já apresentados. */
const firstFishing = (difficulty: 'tranquilo' | 'desafio' = 'tranquilo') => ({
  settings: { difficulty, vibration: true },
  charactersIntroduced: ['jane', 'adilson'],
  story: { episodes: {}, scenesSeen: ['ep1-abertura'], pendingScene: null },
});

test('TUTOB-01, TUTO-02: jogo novo, seguindo só as falas e as setas da Jane pelos 9 passos, o primeiro peixe é pego e o objetivo mostra 1 de 3', async ({
  page,
}) => {
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

  // 1. Escolher o ponto: a seta aponta o ponto liberado e, com ele tocado, "Pescar aqui".
  await expectStep(page, 'ponto');
  await expectArrowOn(page, page.locator('[data-spot="raso"]'));
  await tapArrow(page);
  const fishHere = page.locator('[data-action="pescar-aqui"]');
  await expect(fishHere).toBeVisible();
  await expectArrowOn(page, fishHere);
  await tapArrow(page);
  expect((await gameState(page)).spot).toBe('raso');

  // 2 e 3. Travar a direção e a força em ARREMESSAR.
  await expectStep(page, 'direcao');
  await expectArrowOn(page, fishingButton(page, 'arremessar'));
  await tapArrow(page);
  await expectStep(page, 'forca');
  await expectArrowOn(page, fishingButton(page, 'arremessar'));
  await advance(page, 2); // barra cheia
  await tapArrow(page);
  expect((await gameState(page)).fishing.phase).toBe('Flying');

  // 4. Segurar RECOLHER: com a isca ainda no ar, a fala já pede isso.
  await expectStep(page, 'recolher');
  await advance(page, 0.8); // a isca cai na água
  expect((await gameState(page)).fishing.phase).toBe('Lure');
  // TUTOB-02: em até 3 s na água, um peixe segue a isca e o passo vira "atrair" (às vezes já na queda).
  if ((await step(page)) === 'recolher') {
    await expectArrowOn(page, fishingButton(page, 'recolher'));
    await holdArrow(page);
    expect(await advanceUntilStep(page, 'atrair', 5)).toBeLessThanOrEqual(3.05);
    await page.mouse.up();
  }

  // 5. Tocar PUXAR para atrair, até o ataque.
  await expectStep(page, 'atrair');
  await expectArrowOn(page, fishingButton(page, 'puxar'));
  for (let i = 0; i < 10 && (await step(page)) === 'atrair'; i++) {
    await tapArrow(page);
    await advanceUntilStep(page, 'fisgar', 1);
  }

  // 6. FISGAR! TUTOB-03: a fisgada espera o toque, mesmo passada a janela do Tranquilo (4 s).
  await expectStep(page, 'fisgar');
  await advance(page, 6);
  expect((await gameState(page)).fishing.phase).toBe('Strike');
  await expectArrowOn(page, fishingButton(page, 'puxar'));
  await tapArrow(page);
  expect((await gameState(page)).fishing.phase).toBe('Fight');

  // 7 e 8. Segurar SEGURAR para subir a faixa; soltar para ela descer.
  await expectStep(page, 'subir');
  await expectArrowOn(page, fishingButton(page, 'segurar'));
  await holdArrow(page);
  await advanceUntilStep(page, 'descer', 5);
  await expectStep(page, 'descer');
  await expectArrowOn(page, fishingButton(page, 'segurar'));
  await page.mouse.up();
  await advanceUntilStep(page, 'manter', 5);

  // 9. Manter o peixe na faixa até o medidor encher: a seta aponta a barra de captura.
  await expectStep(page, 'manter');
  await expectArrowOn(page, page.locator('.catch-bar__track'));
  expect(await autoplay(page)).toBe('Result_Caught');

  await expectStep(page, 'done');
  await page.getByRole('dialog', { name: 'Ficha do peixe' }).getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('group', { name: 'Painel da pescaria' })).toContainText('Pegar 3 peixes · 1 de 3');
  await expect(coach(page)).toHaveCount(0); // TUTO-08: o tutorial acabou
  const s = await gameState(page);
  expect(s.profile.tutorialDone).toBe(true);
  expect(s.tutorial).toBeNull();
});

test('TUTOB-03, TUTOB-04: no tutorial, mesmo no Desafio, a fisgada espera o toque e a briga tem o peixe calmo, a faixa do Tranquilo e o medidor que não desce de 10%', async ({
  page,
}) => {
  await openWithProfile(page, firstFishing('desafio'));
  await manualClock(page);
  await page.getByRole('button', { name: 'Jogar' }).click();
  await chooseSpot(page);
  const strike = await page.evaluate(() => {
    const mf = (window as any).__mf;
    mf.button('arremessar');
    mf.button('arremessar');
    mf.hold(true);
    for (let t = 0; t < 30 && mf.state().fishing.phase !== 'Strike'; t += 0.1) mf.advance(0.1);
    mf.hold(false);
    mf.advance(5); // a janela do Desafio é de 2 s
    return mf.state().fishing.phase;
  });
  expect(strike).toBe('Strike');

  // Sem tocar em nada por 30 s: no Desafio o medidor zeraria; no tutorial ele para em 10%.
  const fight = await page.evaluate(() => {
    const mf = (window as any).__mf;
    mf.button('puxar');
    const { style, zoneH } = mf.state().fishing.bar;
    let min = 1;
    for (let t = 0; t < 30 && mf.state().fishing.phase === 'Fight'; t += 0.1) {
      mf.advance(0.1);
      if (mf.state().fishing.phase === 'Fight') min = Math.min(min, mf.state().fishing.bar.meter);
    }
    return { style, zoneH, min, phase: mf.state().fishing.phase };
  });
  expect(fight.style).toBe('calmo');
  expect(fight.zoneH).toBeCloseTo((0.18 + 0.015 * 1) * 1.4, 9); // Vara de Bambu, Força 1, faixa × 1,4
  expect(fight.min).toBeGreaterThanOrEqual(0.1 - 1e-9);
  expect(fight.phase).not.toBe('Result_Escaped');
});

test('TUTO-07: 10 s sem toque num passo, a fala reaparece e a seta pisca', async ({ page }) => {
  await openWithProfile(page, firstFishing());
  await manualClock(page);
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expectStep(page, 'ponto');

  await advance(page, 9.8);
  await expect(arrow(page)).not.toHaveClass(/\bpiscar\b/);
  await expect(coach(page)).not.toHaveAttribute('data-nudge', 'true');
  await advance(page, 0.3);
  await expect(arrow(page)).toHaveClass(/\bpiscar\b/);
  await expect(coach(page)).toHaveAttribute('data-nudge', 'true');
  await expect(coach(page)).toHaveText(tutorial.ponto.text);

  // Um toque zera a espera; no passo seguinte, a contagem recomeça do zero.
  await chooseSpot(page);
  await expectStep(page, 'direcao');
  await expect(arrow(page)).not.toHaveClass(/\bpiscar\b/);
  await advance(page, 10.1);
  await expect(arrow(page)).toHaveClass(/\bpiscar\b/);
  await expect(coach(page)).toHaveAttribute('data-nudge', 'true');
});
