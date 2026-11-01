import { describe, expect, it } from 'vitest';
import { episodes } from './index';
import { speakersOf } from './characters';
import { newProfile } from '../domain/profile';
import { onEvent } from '../domain/story';
import type { GameEvent } from './types';

describe('aparição narrativa da Piranha Lavínia', () => {
  for (const ep of episodes.filter(ep => ep.id > 1)) {
    it(`capítulo ${ep.id}: uma cena com a piranha, sem recaptura nem repetição`, () => {
      const cameos = ep.scenes.filter(scene => scene.laviniaCameo);
      expect(cameos).toHaveLength(1);
      const scene = cameos[0];
      expect(scene.lines.some(line => speakersOf(line).includes('lavinia') && line.text.includes('Adilsinho'))).toBe(true);
      expect(ep.species.some(sp => sp.id === 'piranha-lavinia')).toBe(false);
      const objectiveIndex = ep.chapter.objectives.findIndex(o => o.sceneOnDone === scene.id);
      const profile = newProfile();
      profile.album = { 'piranha-lavinia': { recordKg: 0.8 } };
      profile.story.episodes[ep.id] = { objectiveIndex: Math.max(0, objectiveIndex), progress: 0, won: false };
      if (scene.id !== ep.chapter.openingScene) profile.story.scenesSeen = [ep.chapter.openingScene];
      const event: GameEvent = scene.id === ep.chapter.openingScene
        ? { type: 'GameStarted' }
        : { type: 'Caught', species: ({ 2: 'robalo-peva', 4: 'pacu-planador', 5: 'cavala' } as Record<number, string>)[ep.id], kg: 1 };
      const first = onEvent(profile, event, ep);
      expect(first.sceneToShow).toBe(scene.id);
      const restored = JSON.parse(JSON.stringify({ ...profile, story: first.progress }));
      expect(onEvent(restored, event, ep).sceneToShow).not.toBe(scene.id);
      expect(onEvent(restored, { type: 'GameStarted' }, ep).sceneToShow).not.toBe(scene.id);
      expect(restored.album).toEqual(profile.album);
    });
  }
});
