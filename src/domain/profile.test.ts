import { describe, expect, it } from 'vitest';
import { introduceCharacter, newProfile, resetTutorial, setDifficulty, setVibration, START_LOCATION } from './profile';

describe('perfil novo', () => {
  it('ACES-04: começa com Bambu e Minhoca possuídos e equipados, R$ 0, dificuldade não escolhida e vibração ligada', () => {
    const p = newProfile();
    expect(p.version).toBe(1);
    expect(p.rods).toEqual({ owned: ['bambu'], equipped: 'bambu' });
    expect(p.baits).toEqual({ owned: ['minhoca'], equipped: 'minhoca' });
    expect(p.money).toBe(0);
    expect(p.settings).toEqual({ difficulty: null, vibration: true });
    expect(p.tutorialDone).toBe(false);
  });

  it('EPI-02, EPI-07: só o Episódio 1 liberado e o Poço do Magro como local atual', () => {
    const p = newProfile();
    expect(p.unlockedEpisodes).toEqual([1]);
    expect(START_LOCATION).toBe('poco-do-magro');
    expect(p.currentLocation).toBe('poco-do-magro');
  });

  it('jogo novo: sem história, torneio, troféus, cartas nem álbum', () => {
    const p = newProfile();
    expect(p.story).toEqual({ episodes: {}, scenesSeen: [], pendingScene: null });
    expect(p.tournament).toBeNull();
    expect(p.trophies).toEqual([]);
    expect(p.messagesUnlocked).toEqual([]);
    expect(p.charactersIntroduced).toEqual([]);
    expect(p.album).toEqual({});
  });
});

describe('ajustes', () => {
  it('ACES-02: setDifficulty troca entre Tranquilo e Desafio', () => {
    let p = setDifficulty(newProfile(), 'tranquilo');
    expect(p.settings.difficulty).toBe('tranquilo');
    p = setDifficulty(p, 'desafio');
    expect(p.settings.difficulty).toBe('desafio');
    p = setDifficulty(p, 'tranquilo');
    expect(p.settings).toEqual({ difficulty: 'tranquilo', vibration: true });
  });

  it('ACES-04: a vibração liga e desliga sem mexer na dificuldade', () => {
    let p = setDifficulty(newProfile(), 'desafio');
    p = setVibration(p, false);
    expect(p.settings).toEqual({ difficulty: 'desafio', vibration: false });
    p = setVibration(p, true);
    expect(p.settings).toEqual({ difficulty: 'desafio', vibration: true });
  });

  it('TUTO-09: "Rever tutorial" marca tutorialDone: false e mantém o resto do progresso', () => {
    const played = { ...newProfile(), tutorialDone: true, money: 230, trophies: ['trofeu-guanambicup'] };
    const p = resetTutorial(played);
    expect(p.tutorialDone).toBe(false);
    expect(p.money).toBe(230);
    expect(p.trophies).toEqual(['trofeu-guanambicup']);
  });
});

describe('cartões de apresentação', () => {
  it('HUMOR-01: introduceCharacter marca o personagem como apresentado, uma vez só', () => {
    let p = introduceCharacter(newProfile(), 'jane');
    expect(p.charactersIntroduced).toEqual(['jane']);
    p = introduceCharacter(p, 'adilson');
    expect(p.charactersIntroduced).toEqual(['jane', 'adilson']);
    expect(introduceCharacter(p, 'jane')).toBe(p);
  });
});
