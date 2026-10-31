import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { episodes } from '../src/content';
import type { Profile } from '../src/content/types';
import { openWithProfile, veteran } from './support';

// Sala de troféus (TROF-01): os 5 troféus dos campeonatos, os conquistados em destaque e os que
// faltam como silhueta com o nome do campeonato. Conforto: ACES-05 a ACES-08.

const room = (page: Page) => page.getByRole('region', { name: 'Troféus' });
const shelf = (page: Page) => room(page).getByRole('list', { name: 'Campeonatos' }).getByRole('listitem');
const GOLD = 'rgb(254, 205, 66)'; // --accent, o dourado do troféu conquistado

/** GuanambiCup vencida: troféu e carta no perfil, Jacuípe liberado. */
const guanambiWon = (): Partial<Profile> => ({
  ...veteran(),
  unlockedEpisodes: [1, 2],
  trophies: ['trofeu-guanambicup'],
  messagesUnlocked: ['carta-guanambicup'],
  story: {
    episodes: { 1: { objectiveIndex: 6, progress: 0, won: true } },
    scenesSeen: ['ep1-abertura', 'ep1-vitoria'],
    pendingScene: null,
  },
});

async function openRoom(page: Page) {
  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Troféus', exact: true }).click();
  await expect(room(page)).toBeVisible();
}

const iconColor = (item: Locator) => item.getByRole('img').evaluate((el) => getComputedStyle(el).color);

test('TROF-01: com a GuanambiCup vencida, 1 troféu em destaque e 4 silhuetas com o nome de cada campeonato', async ({
  page,
}) => {
  await openWithProfile(page, guanambiWon());
  await openRoom(page);

  const names = episodes.map((ep) => ep.tournament.name);
  expect(names).toEqual(['GuanambiCup', 'Copa Jacuípe', 'Copa Itaparica', 'Copa dos Ventos', 'Copa Adilson Moscovits']);
  await expect(shelf(page)).toHaveCount(5);
  for (const [i, name] of names.entries()) await expect(shelf(page).nth(i)).toContainText(name);

  // Em destaque: o troféu da GuanambiCup, dourado.
  const won = shelf(page).filter({ has: page.getByRole('img', { name: /^Troféu da / }) });
  await expect(won).toHaveCount(1);
  await expect(won.getByRole('img', { name: 'Troféu da GuanambiCup' })).toBeVisible();
  await expect(won).toContainText('Conquistado');
  expect(await iconColor(won)).toBe(GOLD);

  // Os outros 4: silhueta, sem o dourado, cada uma com o nome do campeonato que falta.
  const missing = shelf(page).filter({ has: page.getByRole('img', { name: /^Silhueta do troféu da / }) });
  await expect(missing).toHaveCount(4);
  for (const name of names.slice(1)) {
    const item = missing.filter({ hasText: name });
    await expect(item, name).toHaveCount(1);
    await expect(item.getByRole('img', { name: `Silhueta do troféu da ${name}` })).toBeVisible();
    await expect(item).toContainText('Falta vencer');
    expect(await iconColor(item), name).not.toBe(GOLD);
  }
  await expect(room(page)).toContainText('1 de 5');
});

test('ACES-05 a ACES-08 na sala de troféus: botões >= 56 × 56 px na metade de baixo, textos >= 18 px e contraste >= 4,5:1', async ({
  page,
}) => {
  await openWithProfile(page, guanambiWon());
  await openRoom(page);

  const { height } = page.viewportSize()!;
  const buttons = await room(page).getByRole('button').all();
  expect(buttons.length).toBeGreaterThan(0);
  for (const btn of buttons) {
    const name = (await btn.textContent())!.trim();
    const box = (await btn.boundingBox())!;
    expect(box.width, name).toBeGreaterThanOrEqual(56);
    expect(box.height, name).toBeGreaterThanOrEqual(56);
    expect(box.y, name).toBeGreaterThanOrEqual(height / 2);
    expect(box.y + box.height, name).toBeLessThanOrEqual(height);
  }

  // ACES-05: todo texto visível da sala com font-size computado >= 18 px.
  const small = await room(page).evaluate((root) => {
    const found: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement!;
      const text = node.textContent!.trim();
      if (text && el.checkVisibility() && parseFloat(getComputedStyle(el).fontSize) < 18) found.push(text);
    }
    return found;
  });
  expect(small).toEqual([]);

  // ACES-07: contraste >= 4,5:1 em todo texto da sala, medido pelo axe.
  const axe = await new AxeBuilder({ page }).include('[aria-label="Troféus"]').withRules(['color-contrast']).analyze();
  expect(axe.violations.flatMap((r) => r.nodes.map((n) => n.html))).toEqual([]);
  expect(axe.incomplete.flatMap((r) => r.nodes.map((n) => n.html))).toEqual([]);
  const measured = axe.passes.flatMap((r) => r.nodes.map((n) => n.html)).join('\n');
  for (const name of episodes.map((ep) => ep.tournament.name)) expect(measured, `axe mediu: ${name}`).toContain(name);
});
