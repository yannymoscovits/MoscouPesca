import { describe, expect, it } from 'vitest';
import { characters } from './characters';

// Elenco do Episódio 1 (spec, Assumptions; docs/historia/episodio-1.md).
const EP1_CAST = ['adilson', 'jane', 'lavinia', 'edvaldo', 'ricardo', 'bem', 'kris'];
const EXPRESSIONS = ['bravo', 'chocado', 'normal', 'rindo'];

describe('personagens', () => {
  it('os 7 personagens do Episódio 1 existem, com IDs únicos', () => {
    const ids = characters.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(EP1_CAST));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('HUMOR-01: todo personagem tem nome e apelido do cartão não vazios', () => {
    for (const c of characters) {
      expect(c.name.trim(), c.id).not.toBe('');
      expect(c.epithet.trim(), c.id).not.toBe('');
    }
    expect(characters.find((c) => c.id === 'jane')).toMatchObject({ name: 'Jane', epithet: 'A Que Sempre Teve Razão' });
  });

  it('HUMOR-02: todo personagem tem um retrato para cada uma das 4 expressões', () => {
    for (const c of characters) {
      expect(Object.keys(c.portraits).sort(), c.id).toEqual(EXPRESSIONS);
      for (const path of Object.values(c.portraits)) expect(path.trim(), c.id).not.toBe('');
      expect(new Set(Object.values(c.portraits)).size, c.id).toBe(4);
    }
  });
});
