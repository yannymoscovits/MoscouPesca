// HIST-17: os créditos que sobem depois do fim do jogo (a carta e a cena final do Episódio 5).
// O elenco e os lugares vêm do próprio conteúdo; o resto é texto da família, pode trocar à vontade.

export interface CreditsSection {
  title: string;
  names: string[];
}

export const credits = {
  dedication: ['Um presente para', 'Adilson Moscovits', 'O Pegador… de Peixe'],
  makers: [{ title: 'Ideia, roteiro e programação', names: ['Ninha'] }] as CreditsSection[],
  // Depois do elenco e dos lugares.
  after: [
    { title: 'Com saudade', names: ['Didi', 'Denise', 'Tininho'] },
    { title: 'Feito com amor pela família', names: ['Toda a família, torcendo por você.'] },
  ] as CreditsSection[],
  closing: ['Volta logo pra pescar com a gente.', 'Fim.'],
};
