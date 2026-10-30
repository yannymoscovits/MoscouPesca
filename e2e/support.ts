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
