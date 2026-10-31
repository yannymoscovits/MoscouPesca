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

/** O peixe do logo sem as bolhas (as 25 primeiras colunas), para ícones pequenos como a aba do diálogo. */
export function FishIcon({ class: className }: { class?: string }) {
  return (
    <svg class={className} viewBox={`0 0 25 ${FISH.length}`} shape-rendering="crispEdges" aria-hidden="true">
      <Pixels rows={FISH} colors={FISH_COLORS} />
    </svg>
  );
}

// ---------- Fundo do mar ----------

// Cena de 103 × 229 pixels grossos (4 px CSS num celular de 412 px), cortada para cobrir a tela.
// Profundidade (T76): gradiente da superfície clara até um azul quase preto, raios de luz que somem
// com a profundidade, três camadas (longe, meio e perto) com pixels cada vez maiores e mais fortes,
// um cardume em cada uma, neve marinha, bolhas subindo do fundo e vinheta escura nas bordas.
// Cada camada é um SVG do tamanho da tela; o movimento fica no CSS (theme.css, "Tela inicial").
const W = 103;
const H = 229;

/** Número entre 0 e 1 com cara de sorteio, mas sempre o mesmo para o mesmo `i`. */
const noise = (i: number) => {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

/** Ondulação para bordas de pedra: soma de dois senos. */
const wave = (i: number, a: number, b: number) => Math.round(a * Math.sin(i / 8 + 1) + b * Math.sin(i / 3.1));

/** Serra de rochas: colunas de 2 de largura, de `x0` a `x1`, do alto `top(x)` até `bottom`. */
function ridge(x0: number, x1: number, bottom: number, top: (x: number) => number): Rect[] {
  const rects: Rect[] = [];
  for (let x = x0; x < x1; x += 2) {
    const y = Math.round(top(x));
    rects.push([x, y, 2, bottom - y]);
  }
  return rects;
}

/** Alga que balança de um lado para o outro, de `bottom` (par) até `top`, com folhinhas. */
function seaweed(x: number, bottom: number, top: number, phase: number, thick = 2): Rect[] {
  const strand: Rect[] = [];
  for (let y = bottom - 2; y >= top; y -= 2) {
    const sway = Math.round(1.5 * Math.sin(y / 6 + phase));
    strand.push([x + sway, y, thick, 2]);
    if (thick > 1 && y % 8 === 0) strand.push([y % 16 === 0 ? x + sway + thick : x + sway - thick + 1, y, thick - 1, 1]);
  }
  return strand;
}

const even = (n: number) => 2 * Math.round(n / 2);

/** Só a beirada de cima de cada coluna: o contorno das rochas contra a água. */
const rims = (rects: Rect[]): Rect[] => rects.map(([x, y, w]) => [x, y, w, 1]);

const Rects = ({ rects, fill, opacity }: { rects: Rect[]; fill: string; opacity?: number }) => (
  <g fill={fill} opacity={opacity}>
    {rects.map(([x, y, w, h], i) => (
      <rect key={i} x={x} y={y} width={w} height={h} />
    ))}
  </g>
);

/** Um cardume: o mesmo peixe em vários lugares. */
function School({ fish, sprite, colors }: { fish: [number, number][]; sprite: string[]; colors: Record<string, string> }) {
  return (
    <g class="title-scene__school">
      {fish.map(([x, y]) => (
        <g key={`${x},${y}`} transform={`translate(${x} ${y})`}>
          <Pixels rows={sprite} colors={colors} />
        </g>
      ))}
    </g>
  );
}

/** Camada do tamanho da tela. `scale` é o tamanho do pixel dela comparado ao da cena: menor longe, maior perto. */
function Layer({
  name,
  depth,
  scale = 1,
  children,
}: {
  name: string;
  depth?: 'far' | 'mid' | 'near';
  scale?: number;
  children: ComponentChildren;
}) {
  return (
    <svg
      class={`title-scene__${name}`}
      data-depth={depth}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      shape-rendering="crispEdges"
    >
      <g transform={`scale(${scale})`}>{children}</g>
    </svg>
  );
}

// Superfície: ondinhas claras e o brilho do sol no meio.
const SURFACE: Rect[] = [
  [2, 2, 8, 1], [12, 1, 10, 1], [25, 3, 6, 1], [33, 1, 9, 2], [60, 1, 12, 2], [75, 3, 7, 1], [85, 1, 12, 1],
  [6, 6, 6, 1], [20, 7, 9, 1], [38, 5, 7, 1], [58, 6, 10, 1], [70, 8, 6, 1], [88, 6, 9, 1], [30, 10, 5, 1],
  [64, 11, 7, 1], [46, 9, 4, 1],
];
const SURFACE_LIGHT: Rect[] = [[42, 0, 18, 2], [46, 2, 10, 1], [47, 4, 6, 1]];

const SCHOOL_FISH = ['..kkk..', '.kkkkk.k', 'kkkkkkkk', '.kkkkk.k', '..kkk..'];
// Peixe de perto: maior, com o dorso claro e o olho aceso.
const NEAR_FISH = ['...kkkk...', '.kkhhhhk.k', 'kekkkkkkkk', 'kkkkkkkkkk', '.kkkkkkk.k', '...kkkk...'];

// Longe: pixel de meia escala (206 × 458), morros e algas azulados, raios de luz e cardume pequeno.
const FAR_W = W * 2;
const FAR_H = H * 2;
const FAR_RAYS = [
  '58,0 64,0 0,150 -16,150',
  '70,0 78,0 28,185 12,185',
  '86,0 94,0 66,200 50,200',
  '98,0 106,0 104,195 90,195',
  '112,0 120,0 140,190 124,190',
  '124,0 134,0 178,180 162,180',
  '138,0 146,0 222,160 206,160',
];
const farTop = (x: number) => {
  const d = Math.abs(x - FAR_W / 2) / (FAR_W / 2);
  return FAR_H - (160 + 24 * Math.sin(x / 21 + 2) + 12 * Math.sin(x / 8.5) + 4 * Math.sin(x / 3.3) + 46 * d * d);
};
const FAR_HILLS = ridge(-14, FAR_W + 14, FAR_H, farTop);
const FAR_WEED = [10, 34, 60, 142, 168, 194].flatMap((x, i) =>
  seaweed(x, even(farTop(x)) + 6, farTop(x) - 18 - 9 * (i % 3), i),
);
const FAR_SCHOOL: [number, number][] = [[158, 52], [172, 47], [165, 60], [183, 56], [176, 67]];

// Meio: pixel de 3/4 (138 × 306), rochas e algas mais escuras, cardume médio à esquerda do peixe.
const MID_W = W / 0.75;
const MID_H = H / 0.75;
const midTop = (x: number) => {
  const d = Math.abs(x - MID_W / 2) / (MID_W / 2);
  return MID_H - (48 + 12 * Math.sin(x / 7 + 1) + 5 * Math.sin(x / 2.7) + 75 * d ** 2.5);
};
const MID_ROCKS = ridge(-12, MID_W + 12, even(MID_H) + 2, midTop);
const MID_WEED = ([[4, 150, 0], [11, 172, 2], [20, 166, 4], [114, 170, 1], [123, 160, 3], [131, 146, 5]] as const).flatMap(
  ([x, top, phase]) => seaweed(x, even(MID_H) + 2, top, phase),
);
const MID_SCHOOL: [number, number][] = [[8, 44], [20, 40], [14, 52], [27, 49]];

// Perto: pixel de 5/4 (82 × 183), algas grandes e paredes de pedra quase pretas nas bordas e no fundo.
const NEAR_W = W / 1.25;
const NEAR_H = H / 1.25;
const nearTop = (x: number) => {
  const d = Math.abs(x - NEAR_W / 2) / (NEAR_W / 2);
  return NEAR_H - (15 + 4 * Math.sin(x / 5 + 2) + 2 * Math.sin(x / 2.3) + 34 * d ** 3);
};
const NEAR_BOTTOM = even(NEAR_H) + 2;
const NEAR_ROCKS = ridge(-10, NEAR_W + 10, NEAR_BOTTOM, nearTop);
const NEAR_WALLS: Rect[] = [];
for (let y = 100; y < NEAR_BOTTOM; y += 3) {
  const grow = Math.round((y - 100) / 30);
  const left = Math.max(1, 1 + grow + wave(y, 1.5, 1));
  const right = Math.max(1, 1 + grow + wave(y + 11, 1.5, 1));
  NEAR_WALLS.push([-10, y, 10 + left, 3], [NEAR_W - right, y, right + 10, 3]);
}
const NEAR_WEED_AT = [[0, 96, 0], [5, 120, 2], [30, 160, 4], [52, 164, 5], [74, 124, 1], [79, 92, 3]] as const;
const NEAR_WEED = NEAR_WEED_AT.flatMap(([x, top, phase]) => seaweed(x, NEAR_BOTTOM, top, phase, 3));
const NEAR_WEED_LIGHT = NEAR_WEED_AT.flatMap(([x, top, phase]) => seaweed(x, NEAR_BOTTOM, top, phase, 1));
const NEAR_SCHOOL: [number, number][] = [[14, 86], [27, 82], [22, 95]];

// Neve marinha: ladrilho mais alto que a cena (cobre celulares compridos), repetido logo acima para cair sem emenda.
const TILE = 250;

function Snow({ speed, scale, count, fill, opacity, seed }: {
  speed: 'slow' | 'fast';
  scale: number;
  count: number;
  fill: string;
  opacity: number;
  seed: number;
}) {
  const w = W / scale;
  const h = TILE / scale;
  const dots: Rect[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(noise(seed * 1000 + i) * w);
    const y = Math.floor(noise(seed * 1000 + i + 500) * h);
    dots.push([x, y, 1, 1], [x, y - h, 1, 1]);
  }
  return (
    <div class={`title-scene__snow title-scene__snow--${speed}`}>
      <svg viewBox={`0 0 ${W} ${TILE}`} shape-rendering="crispEdges">
        <g transform={`scale(${scale})`}>
          <Rects rects={dots} fill={fill} opacity={opacity} />
        </g>
      </svg>
    </div>
  );
}

// Bolhas: saem do fundo pelas beiradas e embaixo dos botões (faixa de 103 × 60 colada no pé da tela).
const BUBBLE_BIG = ['.Lb.', 'LbbB', 'bbbB', '.BB.'];
const BUBBLE_SMALL = ['Lb', 'bB'];
const BUBBLES: [number, number, string[]][] = [
  [3, 44, BUBBLE_BIG], [4, 36, BUBBLE_SMALL], [2, 30, BUBBLE_SMALL],
  [95, 40, BUBBLE_BIG], [96, 50, BUBBLE_SMALL], [97, 33, BUBBLE_SMALL],
  [70, 54, BUBBLE_SMALL], [72, 47, BUBBLE_SMALL],
];

export function TitleScene() {
  return (
    <div class="title-scene" aria-hidden="true">
      <Layer name="base">
        <defs>
          <linearGradient id="mar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#1667b0" />
            <stop offset="0.07" stop-color="#0b4f91" />
            <stop offset="0.14" stop-color="#05397a" />
            <stop offset="0.32" stop-color="#022a5a" />
            <stop offset="0.5" stop-color="#01224b" />
            <stop offset="0.66" stop-color="#011a3d" />
            <stop offset="0.82" stop-color="#00122e" />
            <stop offset="1" stop-color="#00091c" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#mar)" />
        <Rects rects={SURFACE} fill="#3d8fe0" opacity={0.45} />
        <Rects rects={SURFACE_LIGHT} fill="#8fd0ff" opacity={0.5} />
      </Layer>

      <Layer name="far" depth="far" scale={0.5}>
        <defs>
          <linearGradient id="raio" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#9ad4ff" stop-opacity="0.6" />
            <stop offset="0.3" stop-color="#9ad4ff" stop-opacity="0.25" />
            <stop offset="0.55" stop-color="#9ad4ff" stop-opacity="0.08" />
            <stop offset="0.8" stop-color="#9ad4ff" stop-opacity="0.02" />
            <stop offset="1" stop-color="#9ad4ff" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g fill="url(#raio)">
          {FAR_RAYS.map((points) => (
            <polygon key={points} points={points} />
          ))}
        </g>
        <Rects rects={FAR_WEED} fill="#0e5192" />
        <Rects rects={FAR_HILLS} fill="#0b4580" />
        <School fish={FAR_SCHOOL} sprite={SCHOOL_FISH} colors={{ k: '#06305e' }} />
      </Layer>

      <Snow speed="slow" scale={0.5} count={46} fill="#8cbbe8" opacity={0.3} seed={1} />

      <Layer name="mid" depth="mid" scale={0.75}>
        <Rects rects={MID_WEED} fill="#073260" />
        <Rects rects={MID_ROCKS} fill="#021a3a" />
        <Rects rects={rims(MID_ROCKS)} fill="#0a3366" />
        <School fish={MID_SCHOOL} sprite={SCHOOL_FISH} colors={{ k: '#011837' }} />
      </Layer>

      <Snow speed="fast" scale={0.75} count={26} fill="#a6d0f5" opacity={0.4} seed={2} />

      <Layer name="near" depth="near" scale={1.25}>
        <Rects rects={NEAR_WALLS} fill="#000a1c" />
        <Rects rects={NEAR_WEED} fill="#000a1c" />
        <Rects rects={NEAR_WEED_LIGHT} fill="#0b3363" />
        <Rects rects={NEAR_ROCKS} fill="#000a1c" />
        <Rects rects={rims(NEAR_ROCKS)} fill="#082a52" />
        <School fish={NEAR_SCHOOL} sprite={NEAR_FISH} colors={{ k: '#000a1c', h: '#0e3466', e: '#8cbbe8' }} />
      </Layer>

      <Layer name="vignette">
        <defs>
          <radialGradient id="vinheta" cx="0.5" cy="0.38" r="0.72">
            <stop offset="0.55" stop-color="#000510" stop-opacity="0" />
            <stop offset="0.8" stop-color="#000510" stop-opacity="0.28" />
            <stop offset="1" stop-color="#000510" stop-opacity="0.6" />
          </radialGradient>
          <linearGradient id="fundo-escuro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.72" stop-color="#000510" stop-opacity="0" />
            <stop offset="1" stop-color="#000510" stop-opacity="0.45" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#vinheta)" />
        <rect width={W} height={H} fill="url(#fundo-escuro)" />
      </Layer>

      <svg class="title-scene__bubbles" viewBox={`0 0 ${W} 60`} shape-rendering="crispEdges">
        {BUBBLES.map(([x, y, sprite]) => (
          <g key={`${x},${y}`} transform={`translate(${x} ${y})`}>
            <Pixels rows={sprite} colors={FISH_COLORS} />
          </g>
        ))}
      </svg>
    </div>
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
