import { describe, expect, it } from 'vitest';
import { episodes } from './index';
import { newProfile } from '../domain/profile';
import { isTournamentUnlocked, onEvent } from '../domain/story';

describe('reconciliação do álbum já completo', () => {
  for (const ep of episodes) {
    it(`capítulo ${ep.id}: reconhece o álbum salvo sem exigir outra captura`, () => {
      const profile = newProfile();
      const index = ep.chapter.objectives.findIndex(o => o.id === 'album-completo');
      profile.story = { episodes: { [ep.id]: { objectiveIndex: index, progress: 0, won: false } }, scenesSeen: [ep.chapter.openingScene], pendingScene: null };
      profile.album = Object.fromEntries(ep.species.map(sp => [sp.id, { recordKg: sp.kg.min }]));
      const incomplete = { ...profile, album: Object.fromEntries(Object.entries(profile.album).slice(1)) };
      expect(onEvent(incomplete, { type: 'GameStarted' }, ep).progress).toBe(incomplete.story);
      const next = onEvent(profile, { type: 'GameStarted' }, ep);
      expect(next.sceneToShow).toBe(ep.chapter.objectives[index].sceneOnDone);
      expect(isTournamentUnlocked(next.progress, ep)).toBe(true);
      const restored = JSON.parse(JSON.stringify({ ...profile, story: next.progress }));
      expect(onEvent(restored, { type: 'GameStarted' }, ep).sceneToShow).toBeUndefined();
    });
  }
});
