import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { episodes } from '../src/content';

test('todas as espécies dos cinco capítulos usam a arte aprovada no jogo inteiro', () => {
  for (const species of episodes.flatMap(ep => ep.species)) {
    expect(species.sprite, species.id).toBe(`src/assets/fish-portraits/${species.id}.png`);
    expect(existsSync(species.sprite), species.id).toBe(true);
  }
});
