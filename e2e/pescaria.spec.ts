import { expect, test, type Page } from '@playwright/test';
import {
  advance,
  advanceUntil,
  autoplay,
  castNothing,
  castNow,
  chooseSpot,
  fishingButton,
  gameState,
  hookNow,
  manualClock,
  money,
  openWithProfile,
  reelUntilStrike,
  spotScreen,
  veteran,
} from './support';

// Pescaria nova ligada no jogo (pesca-bass T15): pesqueiro → arremesso → isca → ataque → briga → ficha,
// os avisos de quando não vem peixe, os botões grandes embaixo, "Trocar de ponto" e a pausa.

const hud = (page: Page) => page.getByRole('group', { name: 'Painel da pescaria' });
const result = (page: Page) => page.getByRole('dialog', { name: 'Resultado do arremesso' });
const catchMeter = (page: Page) => page.getByRole('meter', { name: 'Medidor de captura' });

async function play(page: Page) {
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
}

test('caminho feliz: pesqueiro → Pescar aqui → ARREMESSAR × 2 → isca na água → RECOLHER e PUXAR até o ataque → FISGAR → briga → ficha e saldo', async ({
  page,
}) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);

  // PONTO-01, PONTO-04: o pesqueiro abre primeiro; "Pescar aqui" no raso abre o arremesso.
  await expect(spotScreen(page)).toBeVisible();
  await chooseSpot(page, 'raso');
  await expect(spotScreen(page)).toHaveCount(0);
  expect((await gameState(page)).spot).toBe('raso');

  // ARREM-02, ARREM-03: o primeiro ARREMESSAR trava a seta; o segundo, depois de a barra encher, arremessa.
  await fishingButton(page, 'arremessar').click();
  expect((await gameState(page)).fishing.phase).toBe('Power');
  await expect(page.getByRole('meter', { name: 'Força do arremesso' })).toBeVisible();
  await advance(page, 2); // meio ciclo de 4 s no Tranquilo: força cheia
  await page.evaluate(() => (window as any).__mf.plantFish()); // um peixe do cardume onde a isca cai
  await fishingButton(page, 'arremessar').click();
  const flying = (await gameState(page)).fishing;
  expect(flying.phase).toBe('Flying');
  expect(flying.distanceM).toBeCloseTo(10.8, 1); // Vara de Bambu com força cheia
  await expect(fishingButton(page, 'arremessar')).toBeDisabled(); // ARREM-04

  // A isca cai na água com os peixes do cardume perto dela: pelo menos o plantado, no máximo os 6.
  expect(await advanceUntil(page, 'Lure', 2)).toBe('Lure');
  const water = (await gameState(page)).fishing.water;
  expect(water.fish.length).toBeGreaterThanOrEqual(1);
  expect(water.fish.length).toBeLessThanOrEqual(6);
  await expect(fishingButton(page, 'recolher')).toBeEnabled();
  await expect(fishingButton(page, 'puxar')).toBeEnabled();

  // ISCA-02, ISCA-03: segura RECOLHER; com um peixe seguindo, solta e toca PUXAR, até o ataque.
  const recolher = (await fishingButton(page, 'recolher').boundingBox())!;
  let holding = false;
  for (let i = 0; i < 400; i++) {
    const s = (await gameState(page)).fishing;
    if (s.phase !== 'Lure') break;
    const following = s.water.fish.some((f: { mode: string }) => f.mode === 'seguindo');
    if (following && i % 10 === 0) {
      if (holding) await page.mouse.up();
      holding = false;
      await fishingButton(page, 'puxar').click();
    } else if (!following && !holding) {
      await page.mouse.move(recolher.x + recolher.width / 2, recolher.y + recolher.height / 2);
      await page.mouse.down();
      holding = true;
    }
    await advance(page, 0.1);
  }
  if (holding) await page.mouse.up();
  expect((await gameState(page)).fishing.phase).toBe('Strike');

  // ISCA-08, ISCA-10: no ataque, PUXAR vira "FISGAR!" e pisca; tocar fisga e começa a briga.
  const hook = fishingButton(page, 'puxar');
  await expect(hook).toHaveText('FISGAR!');
  await expect(hook).toHaveClass(/pesca-btn--alert/);
  await hook.click();
  expect((await gameState(page)).fishing.phase).toBe('Fight');
  await expect(page.getByRole('group', { name: 'Barra de captura' })).toBeVisible();
  await expect(catchMeter(page)).toHaveAttribute('aria-valuenow', '30'); // BRIGA-01
  await expect(fishingButton(page, 'segurar')).toBeVisible();

  // BRIGA-10: a briga pelo jogador típico até o medidor encher; a ficha da v1 e o saldo.
  expect(await autoplay(page)).toBe('Result_Caught');
  const s = await gameState(page);
  expect(s.profile.money).toBe(0); // PESCA-17: o peixe não vira dinheiro
  await expect(page.getByRole('dialog', { name: 'Ficha do peixe' })).toContainText(s.fishing.species.name);
  await expect(hud(page)).toContainText(money(0));
});

test('ISCA-11: o ataque sem PUXAR mostra "Escapou!", o peixe foge e a isca continua na água', async ({ page }) => {
  await openWithProfile(page, veteran('desafio'));
  await manualClock(page);
  await play(page);
  await chooseSpot(page);
  expect(await castNow(page)).toBe('Lure');
  expect(await reelUntilStrike(page)).toBe('Strike');
  const strike = (await gameState(page)).fishing;

  await advance(page, 2); // a janela de 2 s do Desafio passa sem PUXAR
  const after = (await gameState(page)).fishing;
  expect(after.phase).toBe('Lure');
  expect(after.water.lure.xM).toBe(strike.water.lure.xM); // a isca fica onde estava, na água
  expect(after.water.lure.depthM).toBeCloseTo(strike.water.lure.depthM, 1);
  expect(after.water.fish.find((f: { id: number }) => f.id === strike.fishId).mode).toBe('fugindo');
  await expect(page.getByRole('status').filter({ hasText: 'Escapou!' })).toBeVisible();
  await expect(fishingButton(page, 'recolher')).toBeEnabled();
});

test('ISCA-12: a isca no Adilson sem peixe volta automaticamente ao arremesso com uma dica', async ({ page }) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  await chooseSpot(page);

  expect(await castNothing(page)).toBe('Result_Nothing');
  await expect(page.getByRole('status').filter({ hasText: 'Arremesse perto dos peixes' })).toBeVisible();
  await expect.poll(async () => (await gameState(page)).fishing.phase).toBe('Aim');
  expect((await gameState(page)).fishing).toEqual({ phase: 'Aim', sinceS: 0 });
  await expect(fishingButton(page, 'arremessar')).toBeEnabled();
});

test('BRIGA-11: no Desafio, sem segurar SEGURAR, "O peixe fugiu!" e volta ao arremesso', async ({ page }) => {
  await openWithProfile(page, veteran('desafio'));
  await manualClock(page);
  await play(page);
  await chooseSpot(page);
  expect(await hookNow(page)).toBe('Fight');

  expect(await advanceUntil(page, 'Result_Escaped', 60)).toBe('Result_Escaped');
  await expect(result(page)).toContainText('O peixe fugiu!');
  await result(page).getByRole('button', { name: 'Continuar' }).click();
  expect((await gameState(page)).fishing).toEqual({ phase: 'Aim', sinceS: 0 });
});

test('BRIGA-12: no Tranquilo, sem segurar SEGURAR, o medidor para em 10% e o peixe não foge', async ({ page }) => {
  await openWithProfile(page, veteran('tranquilo'));
  await manualClock(page, 2); // a semente 2 fisga uma traíra, saltadora: ela pula para fora da faixa parada
  await play(page);
  await chooseSpot(page);
  expect(await hookNow(page)).toBe('Fight');

  const meters = await page.evaluate(() => {
    const mf = (window as any).__mf;
    const out: number[] = [];
    for (let t = 0; t < 60 && mf.state().fishing.phase === 'Fight'; t += 0.1) {
      mf.advance(0.1);
      if (mf.state().fishing.phase === 'Fight') out.push(mf.state().fishing.bar.meter);
    }
    return out;
  });
  expect(meters.filter((m) => m < 0.1 - 1e-9)).toEqual([]);
  expect(meters.filter((m) => Math.abs(m - 0.1) < 1e-9).length, 'segundos parado em 10%').toBeGreaterThan(10);
  expect((await gameState(page)).fishing.phase).toBe('Fight');
});


test('BOTAO-01, BOTAO-02, BOTAO-05: os botões ficam no quarto de baixo; RECOLHER e PUXAR com >= 40% da largura e 72 px; ARREMESSAR e SEGURAR na largura dos dois', async ({
  page,
}) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  await chooseSpot(page);
  const { width, height } = page.viewportSize()!;
  const box = async (id: 'arremessar' | 'recolher' | 'puxar' | 'segurar') => (await fishingButton(page, id).boundingBox())!;
  const inBottomQuarter = (b: { y: number; height: number }, name: string) => {
    expect(b.y, name).toBeGreaterThanOrEqual(height * 0.75);
    expect(b.y + b.height, name).toBeLessThanOrEqual(height);
  };

  const cast = await box('arremessar');
  inBottomQuarter(cast, 'ARREMESSAR');

  expect(await castNow(page)).toBe('Lure');
  const reel = await box('recolher');
  const pull = await box('puxar');
  for (const [name, b] of [['RECOLHER', reel], ['PUXAR', pull]] as const) {
    expect(b.width, name).toBeGreaterThanOrEqual(width * 0.4);
    expect(b.height, name).toBeGreaterThanOrEqual(72);
    inBottomQuarter(b, name);
  }
  expect(reel.x + reel.width).toBeLessThanOrEqual(pull.x); // RECOLHER à esquerda, PUXAR à direita
  // BOTAO-02: ARREMESSAR ocupa a largura dos dois, no mesmo lugar.
  expect(cast.x).toBeCloseTo(reel.x, 0);
  expect(cast.x + cast.width).toBeCloseTo(pull.x + pull.width, 0);
  expect(cast.y).toBeCloseTo(reel.y, 0);

  // ACES-09: o dedo encostado não vira rolagem nem zoom.
  for (const id of ['recolher', 'puxar'] as const) {
    expect(await fishingButton(page, id).evaluate((el) => getComputedStyle(el).touchAction), id).toBe('none');
  }

  // BOTAO-05: SEGURAR na largura dos dois, no mesmo lugar.
  expect(await reelUntilStrike(page)).toBe('Strike');
  await fishingButton(page, 'puxar').click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).not.toHaveClass(/tremor/); // o "NHAC!" sacode a tela
  const hold = await box('segurar');
  expect(hold.x).toBeCloseTo(reel.x, 0);
  expect(hold.x + hold.width).toBeCloseTo(pull.x + pull.width, 0);
  inBottomQuarter(hold, 'SEGURAR');
});

test('PONTO-05: "Trocar de ponto" volta ao pesqueiro; com a isca no ar ele some', async ({ page }) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  await chooseSpot(page);
  const leave = page.getByRole('button', { name: 'Trocar de ponto' });
  await expect(leave).toBeVisible();

  await leave.click();
  await expect(spotScreen(page)).toBeVisible();
  expect((await gameState(page)).spot).toBeNull();

  await chooseSpot(page);
  await fishingButton(page, 'arremessar').click();
  await fishingButton(page, 'arremessar').click();
  await expect(leave).toHaveCount(0);
});

test('PAUSA-01: pausado, a isca, a faixa, o medidor e a janela de fisgada ficam parados até voltar', async ({ page }) => {
  await openWithProfile(page, veteran());
  await manualClock(page);
  await play(page);
  await chooseSpot(page);
  expect(await castNow(page)).toBe('Lure');
  const pause = page.getByRole('button', { name: 'Menu da pescaria' });
  const resume = page.getByText('Pescaria pausada');

  // Isca na água com o relógio de verdade e RECOLHER seguro: pausar congela a isca e os peixes.
  await page.evaluate(() => {
    const mf = (window as any).__mf;
    mf.hold(true);
    mf.clock('real');
  });
  await expect.poll(async () => (await gameState(page)).fishing.water.lure.xM).toBeLessThan(10.5);
  await pause.click();
  const lure = (await gameState(page)).fishing.water;
  await page.waitForTimeout(1000);
  expect((await gameState(page)).fishing.water).toEqual(lure);
  await resume.click();

  // Briga: a faixa, o peixe e o medidor param na pausa e voltam a andar depois.
  await page.evaluate(() => (window as any).__mf.clock('manual'));
  expect(await hookNow(page)).toBe('Fight');
  await page.evaluate(() => (window as any).__mf.clock('real'));
  await expect.poll(async () => (await gameState(page)).fishing.bar?.fishY).not.toBe(undefined);
  await pause.click();
  const bar = (await gameState(page)).fishing.bar;
  await page.waitForTimeout(1000);
  expect((await gameState(page)).fishing.bar).toEqual(bar);
  await resume.click();
  await expect.poll(async () => (await gameState(page)).fishing.bar?.meter ?? -1).not.toBe(bar.meter);
});
