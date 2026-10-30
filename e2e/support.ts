// Ajudas dos testes de tela (build de teste, com `window.__mf`).

import type { Page } from '@playwright/test';
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

/**
 * Ponto da cena lógica (180 × 400, ponta da vara em 90, 370) na tela, pela spec ("Tamanho da cena"):
 * escala 2 abaixo de 540 px de largura (3 a partir dela), cena centralizada e ancorada embaixo.
 */
export function toScreen(page: Page, x: number, y: number) {
  const { width, height } = page.viewportSize()!;
  const scale = width >= 540 ? 3 : 2;
  return { x: width / 2 + (x - 90) * scale, y: height - (400 - y) * scale };
}

/** R$ como o jogo mostra: inteiro com ponto de milhar. */
export const money = (n: number) => `R$ ${n.toLocaleString('pt-BR')}`;
