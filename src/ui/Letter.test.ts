// Carta em páginas (CAMP-11, a divisão da carta): o texto corre como numa carta de verdade, sem
// deixar a saudação sozinha numa página nem duas ou três palavras soltas no pé da página.
import { describe, expect, it } from 'vitest';
import { MIN_WORDS_AT_PAGE_END, paginate } from './Letter';

/** Página com espaço para `room` letras (cada parágrafo gasta uma "linha" extra de 10). */
const fitsIn = (room: number) => (page: string[]) => page.reduce((n, p) => n + p.length + 10, 0) <= room;
const words = (pages: string[][]) => pages.flat().join(' ').split(' ');

describe('paginate', () => {
  const letter = [
    'Adilson,',
    'O primeiro troféu da GuanambiCup! A Jane já arrumou um lugar na estante, mas avisou: se chegarem mais, os enfeites dela não saem de lá.',
    'O Edvaldo mandou dizer que o desconto na loja continua o mesmo: nenhum.',
  ];

  it('a saudação não fica sozinha: o parágrafo seguinte começa na mesma página', () => {
    const pages = paginate(letter, fitsIn(120));
    expect(pages[0][0]).toBe('Adilson,');
    expect(pages[0].length).toBeGreaterThan(1);
  });

  it('o texto inteiro aparece, na ordem, sem palavra perdida nem repetida', () => {
    for (const room of [60, 90, 120, 200, 400]) {
      expect(words(paginate(letter, fitsIn(room))), `página de ${room}`).toEqual(letter.join(' ').split(' '));
    }
  });

  it('toda página respeita o espaço, a não ser a palavra única que não cabe nem sozinha', () => {
    for (const room of [60, 90, 120, 200]) {
      for (const page of paginate(letter, fitsIn(room))) {
        if (page.length === 1 && !page[0].includes(' ')) continue;
        expect(fitsIn(room)(page), `página de ${room}: ${page.join(' | ')}`).toBe(true);
      }
    }
  });

  it('não deixa pedaço com menos de 4 palavras no pé da página', () => {
    for (const room of [60, 90, 120, 200]) {
      const pages = paginate(letter, fitsIn(room));
      for (const page of pages.slice(0, -1)) {
        const last = page[page.length - 1];
        const whole = letter.includes(last);
        if (page.length > 1 && !whole) expect(last.split(' ').length).toBeGreaterThanOrEqual(MIN_WORDS_AT_PAGE_END);
      }
    }
  });

  it('a continuação de um parágrafo cortado também tem pelo menos 4 palavras no alto da página', () => {
    for (const room of [60, 90, 120, 200]) {
      const pages = paginate(letter, fitsIn(room));
      pages.forEach((page, i) => {
        const prev = pages[i - 1];
        const continues = prev && !letter.includes(prev[prev.length - 1]) && !letter.includes(page[0]);
        if (continues && page[0].split(' ').length > 0 && fitsIn(room)([page[0]])) {
          expect(page[0].split(' ').length, `página de ${room}: "${page[0]}"`).toBeGreaterThanOrEqual(MIN_WORDS_AT_PAGE_END);
        }
      });
    }
  });

  it('com espaço de sobra, a carta inteira cabe numa página só', () => {
    expect(paginate(letter, fitsIn(1000))).toEqual([letter]);
  });
});
