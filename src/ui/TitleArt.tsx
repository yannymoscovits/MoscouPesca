// Desenhos da tela inicial, em SVG e sem arquivos de imagem (mockup e logo do usuário em docs/arte/mockups):
// o fundo do mar em pixel art, o peixe amarelo do logo e os ícones dos botões.

import type { ComponentChildren, VNode } from 'preact';

type Rect = [x: number, y: number, w: number, h: number];

/** Grade de pixels: cada letra é uma cor da paleta e '.' é vazio. Pixels vizinhos da mesma cor viram um só retângulo. */
function Pixels({ rows, colors }: { rows: string[]; colors: Record<string, string> }) {
  const rects: VNode[] = [];
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; ) {
      let end = x + 1;
      while (row[end] === row[x]) end++;
      if (row[x] !== '.') rects.push(<rect key={`${x},${y}`} x={x} y={y} width={end - x} height={1} fill={colors[row[x]]} />);
      x = end;
    }
  }
  return <>{rects}</>;
}

// ---------- Peixe do logo ----------

const FISH = [
  '..............................LL..',
  '.............................LbbB.',
  '...........kkkkkk............bbbB.',
  '.........kkhhhhyykk...........BB..',
  '........khhwwwwhyyykk.............',
  'kkk....khhhyyyywwwyyyk.....L......',
  'khhk..khhyyyyyyyyyyyyyk...Lbb.....',
  'khyyk.kyyyyyyyyyyykkkkyk...B......',
  '.kyyykkyyyyyyyyyyykkwkyyk.........',
  '.kyyyyyyyyyyyyyyyykkkkyyk...bb....',
  '..kyyyyyyyyyyyyyyykkkkyyk...bB....',
  '..kOOOyyyyyyyyyyyyyyyyyyk.........',
  '.kooOOkOOOyyyyyyyyyyyyyk...b......',
  '.koook.kooOOOOOOyyyyOOOk..........',
  'kook...kkoooooooooooookk..........',
  'kkk.....kkoooooooooookk...........',
  '.........kkkkkkkkkkkk.............',
];

const FISH_COLORS = {
  k: '#0a1226', // contorno e olho
  y: '#ffd23f',
  h: '#ffe680', // brilho no alto do corpo
  w: '#fffbe8',
  O: '#fbb92f', // sombra da barriga e do rabo
  o: '#f29a1f',
  b: '#3aa8f5', // bolhas
  L: '#a6e1ff',
  B: '#1f7fd6',
};

export function LogoFish() {
  return (
    <svg class="logo-fish" viewBox={`0 0 ${FISH[0].length} ${FISH.length}`} shape-rendering="crispEdges" aria-hidden="true">
      <Pixels rows={FISH} colors={FISH_COLORS} />
    </svg>
  );
}

// ---------- Fundo do mar ----------

// Cena de 103 × 229 pixels grossos (4 px CSS num celular de 412 px), cortada para cobrir a tela.
const W = 103;
const H = 229;

const SCHOOL_FISH = ['..kkk..', '.kkkkk.k', 'kkkkkkkk', '.kkkkk.k', '..kkk..'];
const SCHOOLS: [number, number][] = [
  [82, 30], [92, 27], [86, 36], [95, 34], // cardume do alto, à direita
  [5, 46], [14, 43], [10, 51], // à esquerda, na altura do peixe
  [24, 108], [33, 112], [28, 117], // no meio, acima dos botões
];

const SURFACE: Rect[] = [
  [2, 2, 8, 1], [12, 1, 10, 1], [25, 3, 6, 1], [33, 1, 9, 2], [60, 1, 12, 2], [75, 3, 7, 1], [85, 1, 12, 1],
  [6, 6, 6, 1], [20, 7, 9, 1], [38, 5, 7, 1], [58, 6, 10, 1], [70, 8, 6, 1], [88, 6, 9, 1], [30, 10, 5, 1],
  [64, 11, 7, 1], [46, 9, 4, 1],
];
const SURFACE_LIGHT: Rect[] = [[42, 0, 18, 2], [46, 2, 10, 1], [47, 4, 6, 1]];

const RAYS = ['42,0 47,0 30,140 18,140', '50,0 54,0 50,150 40,150', '57,0 61,0 72,140 62,140', '63,0 68,0 92,128 82,128', '35,0 39,0 6,118 0,118'];

// Nenhuma bolha na faixa do título, do slogan e do subtítulo (de 40 a 85), para não tirar contraste do texto.
const BUBBLES: Rect[] = [
  [20, 18, 1, 1], [78, 15, 1, 1], [86, 21, 1, 1], [52, 13, 1, 1], [70, 24, 1, 1], [3, 90, 1, 1], [98, 88, 1, 1],
  [10, 96, 1, 1], [92, 100, 1, 1], [45, 104, 1, 1], [62, 121, 1, 1], [15, 132, 1, 1], [88, 141, 1, 1],
  [30, 176, 1, 1], [73, 180, 1, 1],
];

/** Coluna serrilhada de altura variável: rochas do fundo e paredes laterais. */
const wave = (i: number, a: number, b: number) => Math.round(a * Math.sin(i / 8 + 1) + b * Math.sin(i / 3.1));

const ROCKS_BACK: Rect[] = [];
const ROCKS: Rect[] = [];
for (let x = 0; x < W; x += 2) {
  const valley = Math.abs(x - W / 2) < 22 ? 7 : 0; // vale no meio, onde a luz chega ao fundo
  const h = 24 + wave(x, 6, 3) - valley;
  ROCKS.push([x, H - h, 2, h]);
  ROCKS_BACK.push([x, H - h - 9 - wave(x + 5, 2, 3), 2, h + 12]);
}

const WALLS: Rect[] = [];
for (let y = 60; y < H; y += 3) {
  const grow = Math.round((y - 60) / 30);
  WALLS.push([0, y, Math.max(1, 3 + grow + wave(y, 2, 1)), 3]);
  const right = Math.max(1, 3 + grow + wave(y + 11, 2, 1));
  WALLS.push([W - right, y, right, 3]);
}

/** Alga que balança de um lado para o outro, de baixo até `top`, com folhinhas. */
function seaweed(x: number, top: number, phase: number): Rect[] {
  const strand: Rect[] = [];
  for (let y = H - 2; y >= top; y -= 2) {
    const sway = Math.round(1.5 * Math.sin(y / 6 + phase));
    strand.push([x + sway, y, 2, 2]);
    if (y % 8 === 0) strand.push([x + sway + (y % 16 === 0 ? 2 : -1), y, 1, 1]);
  }
  return strand;
}
const SEAWEED: Rect[] = [
  ...seaweed(4, 120, 0), ...seaweed(10, 150, 2), ...seaweed(16, 178, 4),
  ...seaweed(86, 172, 1), ...seaweed(92, 140, 3), ...seaweed(97, 112, 5),
];

const Rects = ({ rects, fill, opacity }: { rects: Rect[]; fill: string; opacity?: number }) => (
  <g fill={fill} opacity={opacity}>
    {rects.map(([x, y, w, h], i) => (
      <rect key={i} x={x} y={y} width={w} height={h} />
    ))}
  </g>
);

export function TitleScene() {
  return (
    <svg class="title-scene" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" aria-hidden="true">
      <defs>
        <linearGradient id="mar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0b4f91" />
          <stop offset="0.14" stop-color="#05397a" />
          <stop offset="0.32" stop-color="#022a5a" />
          <stop offset="0.5" stop-color="#01224b" />
          <stop offset="0.82" stop-color="#001a3c" />
          <stop offset="1" stop-color="#00112a" />
        </linearGradient>
        <radialGradient id="brilho-do-fundo" cx="0.5" cy="0.9" r="0.35">
          <stop offset="0" stop-color="#0b4b8c" stop-opacity="0.8" />
          <stop offset="1" stop-color="#0b4b8c" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="raio" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7cc4ff" stop-opacity="0.16" />
          <stop offset="1" stop-color="#7cc4ff" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#mar)" />
      <rect width={W} height={H} fill="url(#brilho-do-fundo)" />
      <g fill="url(#raio)">
        {RAYS.map((points) => (
          <polygon key={points} points={points} />
        ))}
      </g>
      <Rects rects={SURFACE} fill="#3d8fe0" opacity={0.45} />
      <Rects rects={SURFACE_LIGHT} fill="#8fd0ff" opacity={0.5} />
      <Rects rects={BUBBLES} fill="#40b4fc" opacity={0.8} />
      {SCHOOLS.map(([x, y]) => (
        <g key={`${x},${y}`} transform={`translate(${x} ${y})`} opacity="0.85">
          <Pixels rows={SCHOOL_FISH} colors={{ k: '#001836' }} />
        </g>
      ))}
      <Rects rects={ROCKS_BACK} fill="#022a55" />
      <Rects rects={SEAWEED} fill="#0c447c" />
      <Rects rects={WALLS} fill="#001633" />
      <Rects rects={ROCKS} fill="#001633" />
    </svg>
  );
}

// ---------- Ícones dos botões (24 × 24) ----------

const Icon = ({ children }: { children: ComponentChildren }) => (
  <svg class="title-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

export const MonitorIcon = () => (
  <Icon>
    <rect x="2" y="3" width="20" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2.5" />
    <path d="M12 16v4M7 21h10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
  </Icon>
);

/** Engrenagem: um anel grosso e oito dentes feitos com traço tracejado. */
export const GearIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="4" />
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3.5" stroke-dasharray="3.53 3.53" />
  </Icon>
);

export const PlayIcon = () => (
  <Icon>
    <path d="M6 3.5v17a1 1 0 0 0 1.5.86l14-8.5a1 1 0 0 0 0-1.72l-14-8.5A1 1 0 0 0 6 3.5z" fill="currentColor" />
  </Icon>
);

export const Chevron = () => (
  <svg class="title-btn__chevron" viewBox="0 0 12 20" aria-hidden="true">
    <path d="M3 3l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);
