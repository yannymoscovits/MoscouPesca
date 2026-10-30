// Elenco compartilhado pelos episódios: nome, apelido do cartão de apresentação (HUMOR-01)
// e um retrato por expressão (HUMOR-02). Fonte: docs/historia/episodio-1.md e os episódios seguintes.
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
  // Episódio 2 (docs/historia/episodio-2.md). Tininho, Denise e Didi já faleceram: aparecem só no passado.
  { id: 'ninha', name: 'Ninha', epithet: 'Parceria Oficial de Pescaria do Pai', portraits: portraits('ninha') },
  { id: 'tininho', name: 'Tininho', epithet: 'O Anfitrião que Pensa em Tudo', portraits: portraits('tininho') },
  { id: 'denise', name: 'Denise', epithet: 'A Delegada da Farra', portraits: portraits('denise') },
  { id: 'didi', name: 'Didi', epithet: 'O Doutor da Família', portraits: portraits('didi') },
  { id: 'capenga', name: 'Capenga', epithet: 'O Homem que Conversa com a Maré', portraits: portraits('capenga') },
  // O Edvaldo do passado, de cabelo preto. O roteiro não dá apelido para ele: este vem do título da cena 3.
  { id: 'edvaldo-jovem', name: 'Edvaldo', epithet: 'O Cunhado de Cabelo Preto', portraits: portraits('edvaldo-jovem') },
] satisfies Character[];
