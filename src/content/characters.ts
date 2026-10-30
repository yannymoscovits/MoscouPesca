// Elenco compartilhado pelos episódios: nome, apelido do cartão de apresentação (HUMOR-01)
// e um retrato por expressão (HUMOR-02). Fonte: docs/historia/episodio-1.md.
// Os retratos ainda não existem; sem eles, a interface desenha formas coloridas.

import type { Character, CharacterId, Expression } from './types';

const portraits = (id: CharacterId): Record<Expression, string> => ({
  normal: `src/assets/portraits/${id}-normal.png`,
  rindo: `src/assets/portraits/${id}-rindo.png`,
  bravo: `src/assets/portraits/${id}-bravo.png`,
  chocado: `src/assets/portraits/${id}-chocado.png`,
});

export const characters = [
  { id: 'adilson', name: 'Adilson Moscovits', epithet: 'O Pegador… de Peixe', portraits: portraits('adilson') },
  { id: 'jane', name: 'Jane', epithet: 'A Que Sempre Teve Razão', portraits: portraits('jane') },
  { id: 'lavinia', name: 'Lavínia', epithet: 'A Piranha Mais Temida da Represa', portraits: portraits('lavinia') },
  { id: 'edvaldo', name: 'Edvaldo', epithet: 'O Cunhado que Nunca Dá Desconto', portraits: portraits('edvaldo') },
  { id: 'ricardo', name: 'Ricardo', epithet: 'O Rei do Bongô', portraits: portraits('ricardo') },
  { id: 'bem', name: 'Bem', epithet: 'A Rainha da Cerveja Gelada', portraits: portraits('bem') },
  { id: 'kris', name: 'Kris', epithet: 'O Passago de Fogo', portraits: portraits('kris') },
] satisfies Character[];
