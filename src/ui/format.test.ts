import { describe, expect, it } from 'vitest';
import { episodes } from '../content';
import { ep1 } from '../content/episodes/ep1';
import { ep2 } from '../content/episodes/ep2';
import type { Profile } from '../content/types';
import { newProfile } from '../domain/profile';
import { hasProgress, savedProgress } from './format';

describe('jogo salvo na tela inicial', () => {
  it('SAVE-11: perfil novo não tem progresso; com o tutorial feito ou uma cena vista, tem', () => {
    const p = newProfile();
    expect(hasProgress(p)).toBe(false);
    expect(hasProgress({ ...p, tutorialDone: true })).toBe(true);
    expect(hasProgress({ ...p, story: { ...p.story, scenesSeen: ['ep1-abertura'] } })).toBe(true);
  });

  it('SAVE-11: mostra o capítulo do local atual e o objetivo atual dele', () => {
    const p = newProfile();
    const story = { episodes: { 1: { objectiveIndex: 1, progress: 0, won: false } }, scenesSeen: ['ep1-abertura'], pendingScene: null };
    expect(savedProgress({ ...p, story }, episodes)).toEqual({
      chapter: `Capítulo 1: ${ep1.chapter.title}`,
      objective: ep1.chapter.objectives[1].text,
    });
  });

  it('SAVE-11: objetivos cumpridos mostram o campeonato; campeonato vencido, a pescaria livre', () => {
    const done = ep2.chapter.objectives.length;
    const at = (won: boolean): Profile => ({
      ...newProfile(),
      unlockedEpisodes: [1, 2],
      currentLocation: ep2.locations[0].id,
      story: { episodes: { 2: { objectiveIndex: done, progress: 0, won } }, scenesSeen: [], pendingScene: null },
    });
    expect(savedProgress(at(false), episodes)).toEqual({ chapter: `Capítulo 2: ${ep2.chapter.title}`, objective: `Campeonato: ${ep2.tournament.name}` });
    expect(savedProgress(at(true), episodes).objective).toBe('Pescaria livre');
  });
});
