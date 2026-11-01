import { expect, test } from '@playwright/test';
import { episodes } from '../src/content';
import { openWithProfile, veteran } from './support';

for (const episode of episodes) {
  test(`capítulo ${episode.id}: todos os rivais têm avatar de personagem`, async ({ page }) => {
    await openWithProfile(page, {
      ...veteran(), currentLocation: episode.locations[0].id,
      unlockedEpisodes: episodes.filter(ep => ep.id <= episode.id).map(ep => ep.id),
      story: {
        episodes: { [episode.id]: { objectiveIndex: episode.chapter.objectives.length, progress: 0, won: false } },
        scenesSeen: [episode.chapter.openingScene], pendingScene: null,
      },
    });
    await page.getByRole('button', { name: /^(Jogar|Continuar)$/ }).click();
    await page.getByRole('button', { name: 'Menu da pescaria', exact: true }).click();
    await page.getByRole('button', { name: 'Campeonato', exact: true }).click();
    const avatars = page.locator('.lobby__rivals .portrait--art');
    await expect(avatars).toHaveCount(episode.tournament.rivals.length);
    await expect(page.locator('.lobby__rivals .portrait__initials')).toHaveCount(0);
    for (const avatar of await avatars.all()) {
      await expect(avatar).toBeVisible();
      await expect(avatar).not.toHaveCSS('background-image', 'none');
    }
    if (episode.id === 1) await page.screenshot({ path: 'test-results/guanambicup-avatares.png' });
  });
}
