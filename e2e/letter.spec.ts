import { expect, test, type Page } from '@playwright/test';
import { episodes } from '../src/content';
import { characters } from '../src/content/characters';
import { ep1 } from '../src/content/episodes/ep1';
import type { EpisodeContent, EpisodeId, Message, Profile } from '../src/content/types';
import { castNothing, gameState, manualClock, openWithProfile, reopen, veteran } from './support';

// Carta da família em páginas (CAMP-06), o encerramento e o aviso do episódio (HIST-08, HIST-10)
// e a caixa de mensagens para reler (CAMP-10).

const letter = (page: Page) => page.getByRole('dialog', { name: /^Carta/ });
const letterText = (page: Page) => letter(page).getByTestId('letter-text');
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Conversa' });
const banner = (page: Page) => page.getByRole('dialog', { name: 'Aviso' });
const messages = (page: Page) => page.getByRole('region', { name: 'Mensagens' });
const flat = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Pronto para o campeonato do episódio, com o último arremesso por fazer e peixe para vencer. */
function aboutToWin(ep: EpisodeContent): Partial<Profile> {
  const before = episodes.filter((e) => e.id <= ep.id);
  const best = Math.max(...ep.tournament.rivals.map((r) => r.kg));
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
    messagesUnlocked: before.filter((e) => e.id < ep.id).map((e) => e.letter.id),
    tournament: { id: ep.tournament.id, castsLeft: 1, catches: [1, 2, 3].map(() => ({ species: ep.species[0].id, kg: best })) },
  };
}

/** O último arremesso (sem peixe), o aviso dele e a classificação da vitória. */
async function winLastCast(page: Page, spot = 'raso') {
  await manualClock(page);
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  expect(await castNothing(page, 1, spot)).toBe('Result_Nothing');
  await page.getByRole('dialog', { name: 'Resultado do arremesso' }).getByRole('button', { name: 'Continuar' }).click();

  await page.getByRole('dialog', { name: 'Classificação' }).getByRole('button', { name: 'Continuar' }).click();
}

/**
 * Lê a carta aberta página por página até o fim, conferindo que nenhuma página precisa de rolagem
 * e que o "Continuar" fica na metade de baixo. Devolve o texto das páginas e quantas eram.
 */
async function readLetter(page: Page) {
  const { height } = page.viewportSize()!;
  const texts: string[] = [];
  for (let i = 0; i < 30; i++) {
    const counter = (await letter(page).getByText(/^Página \d+ de \d+$/).textContent())!;
    const [, at, total] = counter.match(/Página (\d+) de (\d+)/)!.map(Number);
    expect(at).toBe(i + 1);
    const fit = await letterText(page).evaluate((el) => ({
      scroll: el.scrollHeight,
      client: el.clientHeight,
      overflow: getComputedStyle(el).overflowY,
    }));
    expect(fit.scroll, `página ${at}: sem rolagem`).toBeLessThanOrEqual(fit.client + 1);
    expect(['auto', 'scroll']).not.toContain(fit.overflow);
    texts.push((await letterText(page).innerText()).trim());

    const next = letter(page).getByRole('button', { name: 'Continuar' });
    const box = (await next.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(height / 2); // ACES-08
    await next.click();
    if (at === total) return { text: texts.join(' '), pages: total };
  }
  throw new Error('a carta não acabou');
}

test('CAMP-06, HIST-08: a primeira vitória abre a carta com remetente e texto; a última página leva ao encerramento e ao "Episódio 2 liberado!"', async ({
  page,
}) => {
  await openWithProfile(page, aboutToWin(ep1));
  await winLastCast(page);

  await expect(letter(page)).toBeVisible();
  await expect(letter(page)).toContainText(`De: ${ep1.letter.from}`);
  await expect(dialog(page)).toHaveCount(0); // a cena espera a carta
  const read = await readLetter(page);
  expect(flat(read.text)).toBe(flat(ep1.letter.text));
  await expect(letter(page)).toHaveCount(0);

  const closing = ep1.scenes.find((s) => s.id === ep1.chapter.closingScene)!.lines;
  for (const line of closing) {
    await expect(banner(page)).toHaveCount(0); // o aviso vem depois do encerramento
    await expect(dialog(page)).toContainText(line.text);
    await dialog(page).click();
  }
  await expect(banner(page)).toContainText('Episódio 2 liberado!');
  await banner(page).getByRole('button', { name: 'Continuar' }).click();
  await expect(banner(page)).toHaveCount(0);
  expect((await gameState(page)).notice).toBeNull();
});

// HIST-08 e HIST-10 em todo episódio cadastrado: do 1 ao 4, "Episódio N liberado!" com N = episódio
// seguinte; no 5 (Copa Adilson Moscovits), o aviso final. Spec-precision gap: o Episódio 5 entra no
// conteúdo na Fase 9; até lá, o aviso final é coberto pelo teste do GameController com um Episódio 5
// de teste, e este teste passa a cobri-lo quando o episódio for cadastrado.
for (const ep of episodes) {
  const notice = ep.id < 5 ? `Episódio ${ep.id + 1} liberado!` : 'A pescaria continua: todos os lugares seguem abertos';
  test(`HIST-08, HIST-10: vencer o campeonato do Episódio ${ep.id} mostra a carta, o encerramento e "${notice}"`, async ({
    page,
  }) => {
    await openWithProfile(page, aboutToWin(ep));
    await winLastCast(page, ep.locations[0].zones[0].id);
    await expect(letter(page)).toContainText(`De: ${ep.letter.from}`);
    expect(flat((await readLetter(page)).text)).toBe(flat(ep.letter.text));
    const closing = ep.scenes.find((s) => s.id === ep.chapter.closingScene)!.lines;
    for (const line of closing) {
      await expect(dialog(page)).toContainText(line.text);
      await dialog(page).click();
    }
    await expect(banner(page)).toContainText(notice);
  });
}

test('CAMP-08: vencer de novo um campeonato já vencido não abre a carta outra vez', async ({ page }) => {
  const won = aboutToWin(ep1);
  await openWithProfile(page, {
    ...won,
    unlockedEpisodes: [1, 2],
    story: { ...won.story!, episodes: { 1: { objectiveIndex: 6, progress: 0, won: true } }, scenesSeen: ['ep1-abertura', 'ep1-vitoria'] },
    messagesUnlocked: ['carta-guanambicup'],
    trophies: ['trofeu-guanambicup'],
  });
  await winLastCast(page);
  await expect(letter(page)).toHaveCount(0);
  await expect(banner(page)).toHaveCount(0);
  expect((await gameState(page)).profile.messagesUnlocked).toEqual(['carta-guanambicup']);
});

async function openMessages(page: Page) {
  await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
  await page.getByRole('button', { name: 'Menu da pescaria', exact: true }).click();
  await page.getByRole('button', { name: 'Mensagens', exact: true }).click();
  await expect(messages(page)).toBeVisible();
}

const unlockedAll = (): Partial<Profile> => ({
  ...veteran(),
  messagesUnlocked: episodes.map((e) => e.letter.id),
});

test('carta longa: dividida em páginas com "Continuar", nenhuma com rolagem vertical', async ({ page }) => {
  await openWithProfile(page, unlockedAll());
  await openMessages(page);
  for (const ep of episodes) {
    await messages(page).getByRole('button', { name: ep.tournament.name }).click();
    await expect(letter(page)).toContainText(`De: ${ep.letter.from}`);
    const read = await readLetter(page);
    expect(flat(read.text), ep.tournament.name).toBe(flat(ep.letter.text));
    if (ep.id === 1) expect(read.pages, 'a carta da GuanambiCup é longa').toBeGreaterThan(1);
    await expect(messages(page)).toBeVisible(); // a última página volta para as mensagens
  }
});

test('CAMP-10: a carta desbloqueada aparece em "Mensagens" e reabre igual depois de recarregar', async ({ page }) => {
  await openWithProfile(page, { ...veteran(), messagesUnlocked: ['carta-guanambicup'] });
  await openMessages(page);
  const buttons = messages(page).getByRole('button', { name: /Cup|Copa/ });
  await expect(buttons).toHaveCount(1);
  await buttons.click();
  const first = await readLetter(page);

  await reopen(page);
  await openMessages(page);
  await messages(page).getByRole('button', { name: 'GuanambiCup' }).click();
  await expect(letter(page)).toContainText(`De: ${(ep1.letter as Message).from}`);
  const again = await readLetter(page);
  expect(again).toEqual(first);
  expect(flat(again.text)).toBe(flat(ep1.letter.text));
});

test('CAMP-10: sem campeonato vencido, "Mensagens" diz que ainda não há carta', async ({ page }) => {
  await openWithProfile(page, veteran());
  await openMessages(page);
  await expect(messages(page)).toContainText('Nenhuma carta ainda');
  await expect(messages(page).getByRole('button', { name: /Cup|Copa/ })).toHaveCount(0);
});

test('ACES-06, ACES-08: os botões de "Mensagens" têm no mínimo 56 × 56 px e ficam todos na metade de baixo', async ({
  page,
}) => {
  await openWithProfile(page, unlockedAll());
  await openMessages(page);
  const { height } = page.viewportSize()!;
  for (const btn of await messages(page).getByRole('button').all()) {
    const name = (await btn.textContent())!.trim();
    const box = (await btn.boundingBox())!;
    expect(box.width, name).toBeGreaterThanOrEqual(56);
    expect(box.height, name).toBeGreaterThanOrEqual(56);
    expect(box.y, name).toBeGreaterThanOrEqual(height / 2);
    expect(box.y + box.height, name).toBeLessThanOrEqual(height);
  }
});
