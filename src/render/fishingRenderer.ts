// O que as vistas da pescaria dividem (spec, "Tamanho da cena"; pesca-bass, castRenderer e
// underwaterRenderer): a cena lógica de 180 × 400 px, a escala inteira e o layout na tela, as cores da
// linha, da vara, do respingo e do "!", e a cor provisória de cada espécie.

/** Cena lógica (spec, "Tamanho da cena"); zonas e alcance usam estas coordenadas. */
export const SCENE_W = 180;
export const SCENE_H = 400;
/** A partir desta largura CSS, a escala passa de 2× para 3×. */
export const WIDE_SCREEN_PX = 540;

/** Cores dos elementos da pescaria. */
export const PALETTE = {
  line: '#f4f4f4',
  outline: '#14110f',
  rod: '#c9a25a',
  rodDark: '#3a2a14',
  splash: '#ffffff',
  alert: '#ffd23f',
};

export function sceneScale(cssWidth: number): 2 | 3 {
  return cssWidth >= WIDE_SCREEN_PX ? 3 : 2;
}

/** Vista em px lógicos: a tela inteira na escala inteira, com a cena 180 × 400 dentro dela. */
export interface Layout {
  scale: number;
  viewW: number;
  viewH: number;
  offsetX: number; // canto esquerdo da cena na vista
  offsetY: number; // canto de cima da cena na vista; negativo corta o fundo em telas baixas
}

// Telas mais largas que a cena: cena centralizada e laterais com o cenário (spec, "Tamanho da cena").
// Na vertical, a cena encosta embaixo: a margem e o Adilson ficam sempre à vista.
export function computeLayout(cssWidth: number, cssHeight: number): Layout {
  const scale = sceneScale(cssWidth);
  const viewW = Math.max(SCENE_W, Math.ceil(cssWidth / scale));
  const viewH = Math.max(1, Math.ceil(cssHeight / scale));
  return { scale, viewW, viewH, offsetX: Math.floor((viewW - SCENE_W) / 2), offsetY: viewH - SCENE_H };
}

/** Cor estável por nome, para o retângulo de cada espécie enquanto o sprite não chega. */
export function colorOf(key: string): string {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 65%, 55%)`;
}

/**
 * Caixa do peixe na cena, pela espécie: o tamanho importa — o jogador precisa ver qual é o grande.
 * Três faixas pelo kg máximo: gigante 72 × 32, pequeno 24 × 12 e médio 36 × 16.
 * A arte aprovada cabe inteira nessa área, preservando a proporção.
 */
/** BRIGA-19: o peixe pequeno da espécie aparece com 80% da caixa e o grande com 125%. */
export const sizeScale = (size: number | undefined) => (size === undefined ? 1 : 0.8 + 0.45 * size);

export function fishBox(species: { kg: { max: number } }): { w: number; h: number } {
  if (species.kg.max >= 20) return { w: 72, h: 32 };
  if (species.kg.max <= 1) return { w: 24, h: 12 };
  return { w: 36, h: 16 };
}
