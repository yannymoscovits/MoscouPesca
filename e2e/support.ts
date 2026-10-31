// Ajudas dos testes de tela (build de teste, com `window.__mf`).

import { expect, type Page } from '@playwright/test';
import type { Profile } from '../src/content/types';
import { newProfile } from '../src/domain/profile';
import { CURRENT_KEY } from '../src/platform/save';

/** Abre o jogo e espera os ganchos de teste. */
export async function openGame(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => '__mf' in window);
}

/** Abre o jogo com um salvamento pronto: um perfil novo com as mudanças dadas. */
export async function openWithProfile(page: Page, patch: Partial<Profile>) {
  await page.goto('/');
  await page.evaluate(([key, profile]) => localStorage.setItem(key, JSON.stringify(profile)), [
    CURRENT_KEY,
    { ...newProfile(), ...patch },
  ] as const);
  await page.reload();
  await page.waitForFunction(() => '__mf' in window);
}

/** Recarrega a página (o jogo reabre do salvamento) e espera os ganchos de teste. */
export async function reopen(page: Page) {
  await page.reload();
  await page.waitForFunction(() => '__mf' in window);
}

/** Cópia do estado do jogo. */
export const gameState = (page: Page) => page.evaluate(() => (window as any).__mf.state());

/** Episódio 1 já aberto: abertura vista, tutorial feito, dificuldade escolhida. */
export const veteran = (difficulty: 'tranquilo' | 'desafio' = 'tranquilo'): Partial<Profile> => ({
  settings: { difficulty, vibration: true },
  tutorialDone: true,
  story: { episodes: { 1: { objectiveIndex: 0, progress: 0, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null },
});

/** Relógio manual e sorteio fixo: o jogo só anda com `advance`. */
export const manualClock = (page: Page, seed = 7) =>
  page.evaluate((n) => {
    const mf = (window as any).__mf;
    mf.clock('manual');
    mf.seed(n);
  }, seed);

/** Avança o tempo do jogo até a pesca chegar à fase pedida (ou estourar `maxS` segundos). */
export const advanceUntil = (page: Page, phase: string, maxS = 20) =>
  page.evaluate(
    ([want, max]) => {
      const mf = (window as any).__mf;
      for (let t = 0; t < max && mf.state().fishing.phase !== want; t += 0.1) mf.advance(0.1);
      return mf.state().fishing.phase as string;
    },
    [phase, maxS] as const,
  );

/** Avança o tempo do jogo. */
export const advance = (page: Page, seconds: number) =>
  page.evaluate((s) => (window as any).__mf.advance(s), seconds);

/** O pesqueiro (pesca-bass PONTO-01) e o botão da pescaria com o id dado (`data-button`). */
export const spotScreen = (page: Page) => page.getByRole('region', { name: 'Pesqueiro' });
export const fishingButton = (page: Page, id: 'arremessar' | 'recolher' | 'puxar' | 'segurar') =>
  page.locator(`[data-button="${id}"]`);

/** Escolhe o ponto pela tela do pesqueiro: toca nele e em "Pescar aqui" (PONTO-02, PONTO-04). */
export async function chooseSpot(page: Page, spot = 'raso') {
  await spotScreen(page).locator(`[data-spot="${spot}"]`).click();
  await spotScreen(page).locator('[data-action="pescar-aqui"]').click();
  await expect(fishingButton(page, 'arremessar')).toBeVisible();
}

/**
 * Arremessa pelos ganchos: trava a seta, espera a barra chegar à força pedida (0 a 1, ARREM-02) e solta;
 * espera a isca cair na água. Devolve a fase.
 */
export const castNow = (page: Page, power = 1) =>
  page.evaluate((p) => {
    const mf = (window as any).__mf;
    mf.button('arremessar');
    mf.advance((p * mf.controller.rules().sweepS) / 2);
    mf.plantFish(); // um peixe do cardume onde a isca vai cair
    mf.button('arremessar');
    for (let t = 0; t < 2 && mf.state().fishing.phase !== 'Lure'; t += 0.1) mf.advance(0.1);
    return mf.state().fishing.phase as string;
  }, power);

/** Segura RECOLHER pelos ganchos até um peixe atacar a isca (ou a isca chegar ao Adilson). Devolve a fase. */
export const reelUntilStrike = (page: Page, maxS = 40) =>
  page.evaluate((max) => {
    const mf = (window as any).__mf;
    mf.hold(true);
    for (let t = 0; t < max && mf.state().fishing.phase === 'Lure'; t += 0.1) mf.advance(0.1);
    mf.hold(false);
    return mf.state().fishing.phase as string;
  }, maxS);

/** Do ponto até a briga: arremessa, recolhe até o ataque e fisga com PUXAR. Devolve a fase. */
export const hookNow = (page: Page) =>
  page.evaluate(() => {
    const mf = (window as any).__mf;
    if (mf.state().fishing.phase === 'Aim') {
      mf.button('arremessar');
      mf.advance(mf.controller.rules().sweepS / 2);
      mf.plantFish(); // um peixe do cardume onde a isca vai cair
      mf.button('arremessar');
    }
    mf.hold(true);
    for (let t = 0; t < 60 && mf.state().fishing.phase !== 'Strike' && !mf.state().fishing.phase.startsWith('Result_'); t += 0.1) {
      mf.advance(0.1);
    }
    mf.hold(false);
    mf.button('puxar');
    return mf.state().fishing.phase as string;
  });

/** Joga como o jogador típico da simulação até o resultado (`__mf.autoplay`). Devolve a fase. */
export const autoplay = (page: Page, maxS = 120) => page.evaluate((m) => (window as any).__mf.autoplay(m) as string, maxS);

/**
 * No ponto (o raso, se a pesca ainda está no pesqueiro), joga como o jogador típico até pegar um peixe;
 * arremesso que termina sem peixe é fechado e tentado de novo, até `tries` vezes. Devolve a fase.
 */
export const catchFish = (page: Page, opts: { spot?: string; tries?: number } = {}) =>
  page.evaluate(
    ({ spot, tries }) => {
      const mf = (window as any).__mf;
      if (mf.state().spot === null) mf.controller.chooseSpot(spot);
      for (let i = 0; i < tries; i++) {
        if (mf.autoplay(300) === 'Result_Caught') break;
        if (i < tries - 1) mf.controller.dismissResult();
      }
      return mf.state().fishing.phase as string;
    },
    { spot: opts.spot ?? 'raso', tries: opts.tries ?? 5 },
  );

/**
 * Gasta `n` arremessos sem peixe: força mínima e RECOLHER sem nunca fisgar; quem ataca escapa e a isca
 * chega ao Adilson ("Nada dessa vez", ISCA-12). Fecha o resultado anterior antes de cada um. Devolve a fase.
 */
export const castNothing = (page: Page, n = 1, spot = 'raso') =>
  page.evaluate(
    ([count, where]) => {
      const mf = (window as any).__mf;
      for (let i = 0; i < count; i++) {
        if (mf.state().fishing.phase.startsWith('Result_')) mf.controller.dismissResult();
        if (mf.state().spot === null) mf.controller.chooseSpot(where);
        mf.emptyWater(); // nenhum peixe no cardume: a isca não acha nada
        mf.button('arremessar');
        mf.button('arremessar');
        mf.hold(true);
        for (let t = 0; t < 300 && mf.state().fishing.phase !== 'Result_Nothing'; t += 0.5) mf.advance(0.5);
        mf.hold(false);
      }
      return mf.state().fishing.phase as string;
    },
    [n, spot] as const,
  );

/**
 * Ponto da cena lógica (180 × 400) na tela, pela spec ("Tamanho da cena"): escala 2 abaixo de 540 px de
 * largura (3 a partir dela), cena centralizada e ancorada embaixo. Vale para a vista de cima.
 */
export function toScreen(page: Page, x: number, y: number) {
  const { width, height } = page.viewportSize()!;
  const scale = width >= 540 ? 3 : 2;
  return { x: width / 2 + (x - 90) * scale, y: height - (400 - y) * scale };
}

/** R$ como o jogo mostra: inteiro com ponto de milhar. */
export const money = (n: number) => `R$ ${n.toLocaleString('pt-BR')}`;
