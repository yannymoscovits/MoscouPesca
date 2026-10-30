import { expect, test, type Page } from '@playwright/test';
import { episodes } from '../src/content';
import { characters } from '../src/content/characters';
import { ep1 } from '../src/content/episodes/ep1';
import type { EpisodeContent, EpisodeId, Profile } from '../src/content/types';
import { gameState, manualClock, money, openWithProfile, toScreen, veteran } from './support';

// Telas do torneio: lobby bloqueado ou aberto (CAMP-01, CAMP-02), provocações dos rivais antes do
// primeiro arremesso (HUMOR-04) e classificação com vitória ou "Tentar de novo" (CAMP-05, CAMP-09).

const lobby = (page: Page) => page.getByRole('region', { name: 'Campeonato' });
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Conversa' });
const standings = (page: Page) => page.getByRole('dialog', { name: 'Classificação' });
const rows = (page: Page) => standings(page).getByRole('list', { name: 'Classificação' }).getByRole('listitem');
const nameOf = (id: string) => characters.find((c) => c.id === id)!.name;
const kg = (n: number) => `${n.toFixed(2).replace('.', ',')} kg`;

/** Pronto para o campeonato do episódio: objetivos cumpridos, aberturas vistas, elenco apresentado. */
function readyFor(ep: EpisodeContent, over: Partial<Profile> = {}): Partial<Profile> {
  const before = episodes.filter((e) => e.id <= ep.id);
  return {
    ...veteran(),
    unlockedEpisodes: before.map((e) => e.id) as EpisodeId[],
    currentLocation: ep.locations[0].id,
    charactersIntroduced: characters.map((c) => c.id),
    story: {
      episodes: Object.fromEntries(
        before.map((e) => [e.id, { objectiveIndex: e.chapter.objectives.length, progress: 0, won: e.id < ep.id }]),
      ),
      scenesSeen: before.flatMap((e) => (e.id < ep.id ? [e.chapter.openingScene, e.chapter.closingScene] : [e.chapter.openingScene])),
      pendingScene: null,
    },
    ...over,
  };
}

async function openLobby(page: Page) {
  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Campeonato', exact: true }).click();
  await expect(lobby(page)).toBeVisible();
}

async function enter(page: Page) {
  await openLobby(page);
  await lobby(page).getByRole('button', { name: 'Entrar no campeonato' }).click();
  await expect(page.getByRole('region', { name: 'Pescaria' })).toBeVisible();
}

/** Toca nas provocações até elas acabarem. */
async function skipTaunts(page: Page) {
  for (let i = 0; i < 3; i++) await dialog(page).click();
  await expect(dialog(page)).toHaveCount(0);
}

/** Gasta arremessos sem peixe (beirada fora das zonas): cada um acaba em 15 s com "Nada por aqui". */
const castNothing = (page: Page, n: number) =>
  page.evaluate((count) => {
    const mf = (window as any).__mf;
    for (let i = 0; i < count; i++) {
      if (mf.state().fishing.phase !== 'Idle') mf.controller.dismissResult();
      mf.tap(90, 365);
      for (let t = 0; t < 20 && mf.state().fishing.phase !== 'Result_Nothing'; t += 0.5) mf.advance(0.5);
    }
    return mf.state().fishing.phase as string;
  }, n);

test('CAMP-01: antes do último objetivo, o campeonato aparece bloqueado com o objetivo que falta', async ({ page }) => {
  await openWithProfile(page, veteran()); // primeiro objetivo do Episódio 1
  await openLobby(page);
  await expect(lobby(page)).toContainText('GuanambiCup');
  await expect(lobby(page)).toContainText('Bloqueado');
  await expect(lobby(page)).toContainText(ep1.chapter.objectives[0].text);
  await expect(lobby(page).getByRole('button', { name: 'Entrar no campeonato' })).toHaveCount(0);

  const last = ep1.chapter.objectives.length - 1; // falta só o último
  await openWithProfile(page, {
    ...veteran(),
    story: { episodes: { 1: { objectiveIndex: last, progress: 0, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null },
  });
  await openLobby(page);
  await expect(lobby(page)).toContainText('Bloqueado');
  await expect(lobby(page)).toContainText(ep1.chapter.objectives[last].text);
  await expect(lobby(page).getByRole('button', { name: 'Entrar no campeonato' })).toHaveCount(0);
});

// CAMP-02 roda para todo episódio cadastrado. Spec-precision gap: a Copa Adilson Moscovits (Episódio 5)
// entra no conteúdo na Fase 9; até lá, este teste cobre a GuanambiCup e as copas dos episódios 2 e 3.
for (const ep of episodes) {
  test(`CAMP-02: ao entrar no campeonato do Episódio ${ep.id}, aparecem "${ep.tournament.name}", as regras e os 3 rivais`, async ({
    page,
  }) => {
    await openWithProfile(page, readyFor(ep));
    await openLobby(page);
    await expect(lobby(page).getByRole('heading', { level: 1 })).toHaveText(ep.tournament.name);
    await expect(lobby(page)).not.toContainText('Bloqueado');
    // Regras do torneio (spec, "Formato do torneio"): 8 arremessos; vale a soma dos 3 peixes mais pesados.
    const rules = lobby(page).getByRole('list', { name: 'Regras' });
    await expect(rules).toContainText('8 arremessos');
    await expect(rules).toContainText('3 peixes mais pesados');
    const rivals = lobby(page).getByRole('list', { name: 'Rivais' }).getByRole('listitem');
    await expect(rivals).toHaveCount(3);
    for (const [i, r] of ep.tournament.rivals.entries()) await expect(rivals.nth(i)).toContainText(nameOf(r.character));
    if (ep.id === 1) expect(ep.tournament.name).toBe('GuanambiCup');
    if (ep.id === 5) expect(ep.tournament.name).toBe('Copa Adilson Moscovits');
  });
}

test('HUMOR-04: as provocações de Ricardo, Bem e Kris aparecem antes do primeiro arremesso', async ({ page }) => {
  await openWithProfile(page, readyFor(ep1));
  await manualClock(page);
  await enter(page);

  for (const rival of ep1.tournament.rivals) {
    await expect(dialog(page)).toContainText(nameOf(rival.character));
    await expect(dialog(page)).toContainText(rival.taunt.text);
    // Um toque na água enquanto o rival fala não arremessa: só passa para a provocação seguinte.
    const water = toScreen(page, 90, 300);
    await page.mouse.click(water.x, water.y);
    const s = await gameState(page);
    expect(s.fishing.phase).toBe('Idle');
    expect(s.profile.tournament.castsLeft).toBe(8);
  }
  await expect(dialog(page)).toHaveCount(0);

  const water = toScreen(page, 90, 300); // acabaram as provocações: agora o toque arremessa
  await page.mouse.click(water.x, water.y);
  expect((await gameState(page)).fishing.phase).toBe('Flying');
});

test('HUMOR-01: rival que aparece pela primeira vez nas provocações ganha o cartão de apresentação', async ({ page }) => {
  await openWithProfile(page, readyFor(ep1, { charactersIntroduced: ['jane', 'adilson', 'lavinia', 'edvaldo'] }));
  await enter(page);
  const card = page.getByRole('dialog', { name: /^Apresentação/ });
  await expect(card).toContainText('RICARDO');
  await expect(card).toContainText('O Rei do Bongô');
  await card.click();
  await expect(dialog(page)).toContainText(ep1.tournament.rivals[0].taunt.text);
});

test('CAMP-05: depois dos 8 arremessos, a classificação final mostra o jogador e os 3 rivais', async ({ page }) => {
  await openWithProfile(page, readyFor(ep1));
  await manualClock(page);
  await enter(page);
  await skipTaunts(page);

  expect(await castNothing(page, 8)).toBe('Result_Nothing');
  await expect(standings(page)).toHaveCount(0); // o aviso do 8º arremesso vem antes
  await page.getByRole('dialog', { name: 'Resultado do arremesso' }).getByRole('button', { name: 'Continuar' }).click();

  await expect(standings(page)).toBeVisible();
  await expect(rows(page)).toHaveCount(4);
  // Do maior para o menor (CAMP-04: soma dos 3 mais pesados; sem peixe, 0 kg).
  const expected = [
    ...ep1.tournament.rivals.map((r) => ({ name: nameOf(r.character), kg: r.kg })),
    { name: 'Você', kg: 0 },
  ].sort((a, b) => b.kg - a.kg);
  for (const [i, row] of expected.entries()) {
    await expect(rows(page).nth(i)).toContainText(`${i + 1}º`);
    await expect(rows(page).nth(i)).toContainText(row.name);
    await expect(rows(page).nth(i)).toContainText(kg(row.kg));
  }
});

test('CAMP-09: a derrota mostra a colocação e "Tentar de novo"; repetir não custa nada e traz as provocações de novo', async ({
  page,
}) => {
  await openWithProfile(page, readyFor(ep1, { money: 500 }));
  await manualClock(page);
  await enter(page);
  await skipTaunts(page);
  await castNothing(page, 8);
  await page.getByRole('dialog', { name: 'Resultado do arremesso' }).getByRole('button', { name: 'Continuar' }).click();

  await expect(standings(page)).toContainText('Você ficou em 4º lugar');
  await expect(standings(page)).toContainText(ep1.scenes.find((s) => s.id === ep1.defeatScene)!.lines[0].text);
  const retry = standings(page).getByRole('button', { name: 'Tentar de novo' });
  await expect(retry).toBeVisible();
  const box = (await retry.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(page.viewportSize()!.height / 2); // ACES-08

  await retry.click();
  await expect(standings(page)).toHaveCount(0);
  const s = await gameState(page);
  expect(s.profile.money).toBe(500);
  expect(s.profile.tournament).toEqual({ id: 'guanambicup', castsLeft: 8, catches: [] });
  await expect(page.getByRole('group', { name: 'Painel da pescaria' })).toContainText(money(500));
  await expect(dialog(page)).toContainText(ep1.tournament.rivals[0].taunt.text);

  // E de novo: sem limite de tentativas.
  await skipTaunts(page);
  await castNothing(page, 8);
  await page.getByRole('dialog', { name: 'Resultado do arremesso' }).getByRole('button', { name: 'Continuar' }).click();
  await standings(page).getByRole('button', { name: 'Tentar de novo' }).click();
  expect((await gameState(page)).profile.money).toBe(500);
  expect((await gameState(page)).profile.tournament.castsLeft).toBe(8);
});

test('CAMP-05: na vitória, a classificação põe o jogador em 1º e a cena de encerramento espera por ela', async ({ page }) => {
  await openWithProfile(
    page,
    readyFor(ep1, {
      tournament: {
        id: 'guanambicup',
        castsLeft: 1,
        catches: [
          { species: 'tambaqui', kg: 9 },
          { species: 'tucunare', kg: 6 },
          { species: 'tambaqui', kg: 5 },
        ],
      },
    }),
  );
  await manualClock(page);
  await page.getByRole('button', { name: 'Jogar' }).click();
  await castNothing(page, 1);
  await page.getByRole('dialog', { name: 'Resultado do arremesso' }).getByRole('button', { name: 'Continuar' }).click();

  await expect(rows(page).first()).toContainText('1º');
  await expect(rows(page).first()).toContainText('Você');
  await expect(rows(page).first()).toContainText(kg(20));
  await expect(standings(page)).toContainText('Você venceu a GuanambiCup!');
  await expect(dialog(page)).toHaveCount(0); // a cena da vitória espera a classificação fechar

  await standings(page).getByRole('button', { name: 'Continuar' }).click();
  await expect(standings(page)).toHaveCount(0);
  // Primeira vitória: antes da cena, a carta da família (T44, CAMP-06).
  const letter = page.getByRole('dialog', { name: 'Carta da GuanambiCup' });
  await expect(letter).toBeVisible();
  while (await letter.count()) await letter.getByRole('button', { name: 'Continuar' }).click();
  await expect(dialog(page)).toContainText(ep1.scenes.find((s) => s.id === ep1.chapter.closingScene)!.lines[0].text);
});

test('ACES-06, ACES-08: os botões do lobby têm no mínimo 56 × 56 px e ficam todos na metade de baixo', async ({ page }) => {
  await openWithProfile(page, readyFor(ep1));
  await openLobby(page);
  const { height } = page.viewportSize()!;
  for (const btn of await lobby(page).getByRole('button').all()) {
    const name = (await btn.textContent())!.trim();
    const box = (await btn.boundingBox())!;
    expect(box.width, name).toBeGreaterThanOrEqual(56);
    expect(box.height, name).toBeGreaterThanOrEqual(56);
    expect(box.y, name).toBeGreaterThanOrEqual(height / 2);
    expect(box.y + box.height, name).toBeLessThanOrEqual(height);
  }
});
