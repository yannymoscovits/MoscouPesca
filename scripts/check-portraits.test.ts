import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { characters } from '../src/content/characters';

describe('avatares integrados', () => {
  it('todo personagem tem retrato normal para todas as telas e expressões', () => {
    for (const character of characters) {
      expect(existsSync(character.portraits.normal), character.id).toBe(true);
    }
  });
});
