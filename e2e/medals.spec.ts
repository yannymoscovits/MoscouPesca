import { expect, test, type Page } from '@playwright/test';
import { ep1 } from '../src/content/episodes/ep1';
import { goals } from '../src/content/goals';
import type { MedalTier, Profile } from '../src/content/types';
import { AUTOPLAY_SEED, STEP_S } from '../src/app/testHooks';
import { pressBar } from '../src/domain/catchBar';
import { reachMOf, startSchool, stepSchool } from '../src/domain/school';
import { press, rulesFor, startPesca, tick, type PescaContext, type PescaState } from '../src/domain/pesca';
import { createRng } from '../src/domain/rng';
import { typicalPlayer } from '../src/domain/sim/typicalPlayer';
import { expectContrast } from './contrast';
import { chooseSpot, gameState, manualClock, money, openWithProfile, veteran } from './support';

// Medalhas e metas nas telas (MEDAL-02, MEDAL-05, MEDAL-06; ACES-05 a ACES-08): a ficha do peixe mostra a
// medalha nova e "Meta cumprida!" com a recompensa; o álbum, as medalhas e a contagem rumo à próxima meta.

const fishCard = (page: Page) => page.getByRole('dialog', { name: 'Ficha do peixe' });
const album = (page: Page) => page.getByRole('region', { name: 'Álbum' });
const TILAPIA = ep1.species.find((sp) => sp.id === 'tilapia')!;
const SPOT = ep1.locations[0].zones.find((z) => z.id === 'raso')!; // a Beira do píer, onde a tilápia morde a minhoca

/**
 * Peixe que o jogo dá com a semente `seed` num arremesso do `__mf.autoplay` no raso, com a Vara de Bambu e
 * a Minhoca, no Tranquilo: o mesmo jogador típico, os mesmos passos de 1/30 s e as mesmas funções do
 * domínio que o jogo usa, para escolher sementes por faixa de peso.
 */
function catchWith(seed: number): { species: string; kg: number } | null {
  const rules = rulesFor('tranquilo');
  const rng = createRng(seed);
  // Espelho do `catchSeeded`: com a semente trocada, ele volta ao pesqueiro e escolhe o raso, e o
  // cardume nasce desse sorteio.
  let school = startSchool(SPOT, ep1.species, reachMOf(ep1.rods[0].reach), rng);
  const ctx: PescaContext = { rod: ep1.rods[0], bait: 'minhoca', rng, rules, spot: SPOT, species: ep1.species };
  const player = typicalPlayer(createRng(AUTOPLAY_SEED), rules);
  let s: PescaState = startPesca();
  let holding = false;
  for (let t = 0; t < 300 && !s.phase.startsWith('Result_'); t += STEP_S) {
    const input = player(s, STEP_S, { school, reachM: school.reachM, bait: 'minhoca' });
    if (input.button) s = press(s, input.button, ctx);
    // Espelho do controller: encostar o dedo em SEGURAR dá o tranco na faixa (BRIGA-02).
    if (s.phase === 'Fight' && input.holding && !holding) s = { ...s, bar: pressBar(s.bar) };
    holding = input.holding;
    school = stepSchool(school, STEP_S, SPOT, ep1.species); // o cardume nada antes do arremesso andar
    s = tick(s, STEP_S, { holding: input.holding }, { ...ctx, school });
  }
  return s.phase === 'Result_Caught' ? { species: s.species.id, kg: s.kg } : null;
}

/** Primeira semente que dá uma tilápia com peso em [from, to). */
function seedFor(from: number, to: number): { seed: number; kg: number } {
  for (let seed = 1; seed < 5000; seed++) {
    const r = catchWith(seed);
    if (r?.species === 'tilapia' && r.kg >= from && r.kg < to) return { seed, kg: r.kg };
  }
  throw new Error(`nenhuma semente dá tilápia entre ${from} e ${to} kg`);
}

/** Abre a pesca e escolhe o raso: a mira parada no começo, como `catchWith` começa. */
async function play(page: Page) {
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
  await chooseSpot(page);
}

/** Com a semente dada, joga o arremesso pelo `autoplay` até pegar; espera a ficha (depois do "PEGOU!"). */
async function catchSeeded(page: Page, seed: number) {
  expect((await gameState(page)).fishing).toEqual({ phase: 'Aim', sinceS: 0 });
  const phase = await page.evaluate((n) => {
    const mf = (window as any).__mf;
    mf.seed(n);
    mf.controller.leaveSpot(); // volta ao pesqueiro e escolhe de novo: cardume novo, desse sorteio
    mf.controller.chooseSpot('raso');
    return mf.autoplay(300);
  }, seed);
  expect(phase).toBe('Result_Caught');
  await expect(fishCard(page)).toBeVisible();
}


const medalText = (tier: MedalTier) => `Medalha de ${tier}!`;

/** Episódio 1 no objetivo "Comprar a Vara de Fibra": pegar peixe não abre cena da história. */
const fishingFree = (): Partial<Profile> => ({
  ...veteran(),
  story: { episodes: { 1: { objectiveIndex: 1, progress: 0, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null },
});

test('MEDAL-02: tilápias de pesos crescentes mostram na ficha a medalha de bronze, depois a de prata e depois a de ouro', async ({
  page,
}) => {
  const { bronze, prata, ouro } = TILAPIA.medals;
  const steps: [MedalTier, { seed: number; kg: number }][] = [
    ['bronze', seedFor(bronze, prata)],
    ['prata', seedFor(prata, ouro)],
    ['ouro', seedFor(ouro, TILAPIA.kg.max + 0.01)],
  ];
  await openWithProfile(page, fishingFree());
  await manualClock(page);
  await play(page);

  const earned: MedalTier[] = [];
  for (const [tier, { seed, kg }] of steps) {
    await catchSeeded(page, seed);
    const s = await gameState(page);
    expect(s.fishing.species.id).toBe('tilapia');
    expect(s.fishing.kg).toBe(kg);

    earned.push(tier);
    const card = fishCard(page);
    await expect(card).toContainText(medalText(tier));
    await expect(card.getByRole('img', { name: `Medalha de ${tier}` })).toBeVisible();
    for (const other of ['bronze', 'prata', 'ouro'] as const) {
      if (other !== tier) await expect(card, `só a medalha nova: ${tier}`).not.toContainText(medalText(other));
    }
    expect(s.profile.medals.tilapia).toEqual(earned);
    await card.getByRole('button', { name: 'Continuar' }).click();
  }

  // MEDAL-03: outra tilápia de ouro não mostra medalha nenhuma.
  await catchSeeded(page, steps[2][1].seed);
  await expect(fishCard(page)).not.toContainText('Medalha de');
});

test('MEDAL-05: a 10ª tilápia mostra "Meta cumprida!" com a recompensa, e o saldo sobe pelo peixe mais a recompensa', async ({
  page,
}) => {
  const reward = goals.reward(1, 10);
  await openWithProfile(page, { ...fishingFree(), money: 50, catchCounts: { tilapia: 9 } });
  await manualClock(page);
  await play(page);

  await catchSeeded(page, seedFor(TILAPIA.kg.min, TILAPIA.medals.bronze).seed);
  const s = await gameState(page);
  const card = fishCard(page);
  await expect(card).toContainText('Meta cumprida!');
  await expect(card).toContainText(`+ ${money(reward)}`);
  expect(s.profile.money).toBe(50 + s.fishing.value + reward);
  await card.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('group', { name: 'Painel da pescaria' })).toContainText(money(50 + s.fishing.value + reward));

  // A 11ª não cumpre meta nenhuma.
  await catchSeeded(page, seedFor(TILAPIA.kg.min, TILAPIA.medals.bronze).seed);
  await expect(fishCard(page)).not.toContainText('Meta cumprida!');
});

/** Tilápia com bronze e prata, 10 pegas e a meta de 10 cumprida; as outras espécies sem nada. */
const tenTilapias = (): Partial<Profile> => ({
  ...veteran(),
  album: { tilapia: { recordKg: 1.5 } },
  medals: { tilapia: ['bronze', 'prata'] },
  catchCounts: { tilapia: 10 },
  goalsDone: ['tilapia:10'],
});

async function openAlbum(page: Page) {
  await play(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Álbum', exact: true }).click();
  await expect(album(page)).toBeVisible();
}

test('MEDAL-06: o álbum mostra as medalhas da tilápia e "10 de 25" rumo à próxima meta', async ({ page }) => {
  await openWithProfile(page, tenTilapias());
  await openAlbum(page);

  const tilapia = album(page).getByRole('listitem').filter({ hasText: 'Tilápia' });
  await expect(tilapia.getByRole('img', { name: 'Medalha de bronze' })).toBeVisible();
  await expect(tilapia.getByRole('img', { name: 'Medalha de prata' })).toBeVisible();
  await expect(tilapia.getByRole('img', { name: 'Medalha de ouro' })).toHaveCount(0);
  await expect(tilapia).toContainText('10 de 25');

  // Espécie ainda não pega: nem medalha nem contagem.
  const missing = album(page).getByRole('listitem').filter({ hasText: '???' }).first();
  await expect(missing.getByRole('img', { name: /Medalha/ })).toHaveCount(0);
  await expect(missing).not.toContainText(' de ');
});

/** Textos visíveis dentro de `scope` com o tamanho da fonte. */
const textSizes = (page: Page, scope: string) =>
  page.evaluate((sel) => {
    const found: { text: string; size: number }[] = [];
    const walker = document.createTreeWalker(document.querySelector(sel)!, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement!;
      const text = node.textContent!.trim();
      if (text && el.checkVisibility()) found.push({ text, size: parseFloat(getComputedStyle(el).fontSize) });
    }
    return found;
  }, scope);

async function expectButtonsBelowHalf(page: Page, scope: ReturnType<Page['locator']>) {
  const { height } = page.viewportSize()!;
  const buttons = await scope.getByRole('button').all();
  expect(buttons.length).toBeGreaterThan(0);
  for (const btn of buttons) {
    const name = (await btn.textContent())!.trim();
    const box = (await btn.boundingBox())!;
    expect(box.width, name).toBeGreaterThanOrEqual(56);
    expect(box.height, name).toBeGreaterThanOrEqual(56);
    expect(box.y, name).toBeGreaterThanOrEqual(height / 2);
    expect(box.y + box.height, name).toBeLessThanOrEqual(height);
  }
}

test('ACES-05 a ACES-08: ficha com medalhas e meta, e álbum com medalhas: textos >= 18 px, botões >= 56 × 56 px na metade de baixo e contraste >= 4,5:1', async ({
  page,
}) => {
  // Ficha com as três medalhas de uma vez e a meta de 10.
  await openWithProfile(page, { ...fishingFree(), catchCounts: { tilapia: 9 } });
  await manualClock(page);
  await play(page);
  await catchSeeded(page, seedFor(TILAPIA.medals.ouro, TILAPIA.kg.max + 0.01).seed);
  const card = fishCard(page);
  for (const tier of ['bronze', 'prata', 'ouro'] as const) await expect(card).toContainText(medalText(tier));
  await expect(card).toContainText('Meta cumprida!');

  const cardTexts = await textSizes(page, '[aria-label="Ficha do peixe"]');
  expect(cardTexts.map((t) => t.text)).toEqual(expect.arrayContaining(['Meta cumprida!', 'Continuar']));
  expect(cardTexts.filter((t) => t.size < 18)).toEqual([]);
  await expectButtonsBelowHalf(page, card);
  // A ficha inteira cabe na tela, com a pausa à mão.
  const box = (await card.locator('.fish-card').boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  await expectContrast(page, '[aria-label="Ficha do peixe"]');

  // Álbum com medalhas e contagem.
  await openWithProfile(page, tenTilapias());
  await openAlbum(page);
  const albumTexts = await textSizes(page, '[aria-label="Álbum"]');
  expect(albumTexts.map((t) => t.text)).toEqual(expect.arrayContaining(['10 de 25']));
  expect(albumTexts.filter((t) => t.size < 18)).toEqual([]);
  await expectButtonsBelowHalf(page, album(page));
  await expectContrast(page, '[aria-label="Álbum"]');
});
