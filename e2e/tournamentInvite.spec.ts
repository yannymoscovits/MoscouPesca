import { expect, test } from '@playwright/test';
import { episodes } from '../src/content';
import { characters } from '../src/content/characters';
import { gameState, openWithProfile, veteran } from './support';

for (const episode of episodes) {
  test(`capítulo ${episode.id}: terminar convite abre a inscrição da copa`, async ({ page }) => {
    const sceneId = episode.chapter.objectives[episode.chapter.objectives.length - 1].sceneOnDone;
    const scene = episode.scenes.find(scene => scene.id === sceneId)!;
    await openWithProfile(page, {
      ...veteran(),
      currentLocation: episode.locations[0].id,
      unlockedEpisodes: episodes.filter(ep => ep.id <= episode.id).map(ep => ep.id),
      charactersIntroduced: characters.map(character => character.id),
      story: {
        episodes: { [episode.id]: { objectiveIndex: episode.chapter.objectives.length, progress: 0, won: false } },
        scenesSeen: [episode.chapter.openingScene, sceneId], pendingScene: sceneId,
      },
    });
    await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Conversa', exact: true });
    for (const line of scene.lines) {
      await expect(dialog).toContainText(line.text);
      await expect(page.getByRole('region', { name: 'Campeonato', exact: true })).toHaveCount(0);
      await dialog.click();
    }
    await expect(page.getByRole('region', { name: 'Campeonato', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: episode.tournament.name, exact: true })).toBeVisible();
    expect((await gameState(page)).profile.story.pendingScene).toBeNull();
    expect((await gameState(page)).profile.tournament).toBeNull();
    await page.reload();
    await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Pescaria', exact: true })).toBeVisible();
  });
}
