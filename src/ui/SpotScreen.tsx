// Pesqueiro (pesca-bass PONTO-01 a PONTO-04), no mockup do usuário: um cartão por ponto, da largura
// da tela, com a cena do ponto dentro (o cenário do local, mais escuro quanto mais fundo; a beira no
// ponto mais raso), o nome numa placa e, no ponto bloqueado, o cadeado e o alcance pedido. O mais
// longe fica em cima e o mais perto embaixo, junto do píer onde o Adilson está sentado (castRenderer,
// atrás de tudo). Tocar num cartão acende o cartão e abre, embaixo, as espécies que vivem ali (nome
// ou "???") e "Pescar aqui". Não sabe do jogo: recebe os pontos (spotsFor) e chama `chooseSpot`.

import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { LocationId } from '../content/types';
import type { SpotView } from '../domain/spots';
import { createLoop, type GameLoop } from '../app/loop';
import { sceneScale } from '../render/fishingRenderer';
import { drawBackdrop, drawMarginDetails, sceneryOf } from '../render/scenery';
import { drawStand, SHORE_TOP } from '../render/stands';
import { Pixels } from './TitleArt';

export interface SpotScreenProps {
  place: LocationId; // Location.id: o cenário do desenho
  background: string; // Location.background
  spots: SpotView[]; // spotsFor(local, vara, espécies, álbum)
  chooseSpot: (spotId: string) => void; // "Pescar aqui" num ponto liberado (PONTO-04)
  paused?: boolean; // SAVE-01: pausado, o desenho para
}

/** A cena dentro do cartão de um ponto: a beira aparece no mais raso, e a água escurece com a fundura. */
export interface CardScene {
  shore: boolean; // o píer (ou o lugar de pesca) na beirada de baixo
  dark: number; // 0 a 0,5: o véu escuro da água
}

/** Cena de cada ponto, pela profundidade dele entre os pontos do local (`depths`, em metros). */
export function cardScene(depthM: number, depths: number[]): CardScene {
  const min = Math.min(...depths);
  const max = Math.max(...depths);
  const k = max > min ? (depthM - min) / (max - min) : 0;
  return { shore: depthM === min, dark: Math.round(k * 0.45 * 100) / 100 };
}

/** Número entre 0 e 1 com cara de sorteio, sempre o mesmo para o mesmo `i`. */
const hash = (i: number) => {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

/** Pinta a cena de um cartão no canvas dele, em px lógicos (`scale` px CSS por pixel). */
function drawCard(el: HTMLCanvasElement, place: LocationId, scene: CardScene, name: string, locked: boolean, scale: number, t: number) {
  const w = Math.ceil(el.clientWidth / scale);
  const h = Math.ceil(el.clientHeight / scale);
  if (w <= 0 || h <= 0) return;
  if (el.width !== w || el.height !== h) {
    el.width = w;
    el.height = h;
  }
  const c = el.getContext('2d');
  if (!c) return;
  c.imageSmoothingEnabled = false;
  const s = sceneryOf(place);
  const ground = scene.shore ? h - 8 : h + 2;
  const horizon = Math.round(h * 0.42);
  // Sem clearRect: o céu e a água cobrem o cartão inteiro (e o teste dos 30 quadros conta clearRect).
  drawBackdrop(c, place, { w, h, horizon, ground }, t);
  c.fillStyle = s.tint;
  c.fillRect(0, 0, w, h);
  if (scene.dark > 0) {
    c.fillStyle = `rgba(0, 10, 30, ${scene.dark})`;
    c.fillRect(0, horizon + 2, w, h - horizon);
  }
  // Brilhos na água, piscando devagar.
  c.fillStyle = s.water.light;
  for (let i = 0; i < 10; i++) {
    if ((t * 0.7 + hash(i + 5)) % 1 > 0.4) continue;
    c.fillRect(Math.floor(hash(i) * w), Math.floor(horizon + 4 + hash(i + 20) * (ground - horizon - 8)), 2, 1);
  }
  const rocks = /pedr/i.test(name);
  const bridge = /ponte/i.test(name);
  const mangrove = /rio jacu/i.test(name); // Rio Jacuípe: rio calmo, mangue nas margens e coqueiros ao fundo
  const fizz = /sonrisal/i.test(name); // Rio Sonrisal: a água borbulha como o nome
  if (mangrove) drawMangrove(c, w, h, horizon, t);
  if (fizz) drawFizz(c, w, h, horizon, t);
  if (scene.shore && !rocks && !bridge && !mangrove) {
    drawStand(c, s.stand, { viewW: w, viewH: h, ox: 0, oy: ground - SHORE_TOP });
    drawMarginDetails(c, place, { w, h, ground }, t);
  }
  if (bridge) {
    // PONTO-08: a Ponte da Cetrel, uma ponte de concreto atravessando o cartão sobre a água salgada.
    const deck = Math.round(h * 0.5);
    for (const fx of [0.12, 0.38, 0.62, 0.88]) {
      const x = Math.round(fx * w) - 4;
      c.fillStyle = '#3f4855'; c.fillRect(x, deck + 4, 8, h - deck);
      c.fillStyle = '#6b7685'; c.fillRect(x + 1, deck + 4, 2, h - deck);
      c.fillStyle = s.water.light; c.fillRect(x - 3, Math.round(h * 0.8 + Math.sin(t * 2 + fx * 9)), 14, 1); // marola no pilar
    }
    c.fillStyle = '#262d36'; c.fillRect(0, deck + 2, w, 4);
    c.fillStyle = '#8b96a3'; c.fillRect(0, deck, w, 2);
    c.fillStyle = '#c9cfd6';
    c.fillRect(0, deck - 5, w, 1);
    for (let x = 2; x < w; x += 6) c.fillRect(x, deck - 5, 1, 5);
    for (const fx of [0.25, 0.75]) {
      const x = Math.round(fx * w);
      c.fillStyle = '#3d4652'; c.fillRect(x, deck - 14, 1, 9);
      c.fillStyle = '#ffe27a'; c.fillRect(x - 1, deck - 15, 3, 2);
    }
  } else if (rocks) {
    // Blocos irregulares de granito, emergindo da água nas duas laterais da placa.
    for (let i = 0; i < 9; i++) {
      const x = Math.round((i < 5 ? 0.03 + i * 0.075 : 0.72 + (i - 5) * 0.075) * w);
      const y = Math.round(h * (0.69 + hash(i + 50) * 0.22));
      const rw = 10 + Math.round(hash(i + 70) * 10);
      const rh = 7 + Math.round(hash(i + 80) * 9);
      c.fillStyle = '#102d44'; c.fillRect(x - 3, y + rh, rw + 6, 2);
      c.fillStyle = '#465466'; c.fillRect(x, y, rw, rh);
      c.fillRect(x + 2, y - 3, rw - 5, 3);
      c.fillStyle = '#8995a1'; c.fillRect(x + 2, y, rw - 5, 2);
      c.fillStyle = '#626e7b'; c.fillRect(x + 1, y + 2, Math.max(2, rw - 7), rh - 4);
      c.fillStyle = s.water.light; c.fillRect(x - 3, y + rh + 2, rw + 5, 1);
    }
  } else if (/fund|mar aberto|baía|corrente|canal|meio/i.test(name)) {
    // Água aberta: faixas de corrente e sombras profundas, sem margem nem píer.
    for (let i = 0; i < 7; i++) {
      const y = Math.round(h * 0.6 + i * h * 0.055);
      const x = Math.round((hash(i + 90) * w + t * 2) % w);
      c.fillStyle = i % 2 ? '#173b60' : '#245479';
      c.fillRect(x, y, 12 + i * 3, 1);
    }
    c.fillStyle = '#09283f';
    for (const x of [w * 0.13, w * 0.8]) {
      c.fillRect(Math.round(x), Math.round(h * 0.83), 9, 3);
      c.fillRect(Math.round(x) + 9, Math.round(h * 0.83) - 1, 2, 5);
    }
  }
  if (locked) {
    c.fillStyle = 'rgba(0, 8, 24, 0.5)';
    c.fillRect(0, 0, w, h);
  }
}

/** Rio Jacuípe: coqueiros na linha do horizonte, raízes de mangue nas duas margens e a água parada, escura. */
function drawMangrove(c: CanvasRenderingContext2D, w: number, h: number, horizon: number, t: number) {
  // Coqueiros: tronco curvo e as folhas em leque, balançando de leve.
  for (const [fx, lean] of [[0.08, 1], [0.2, -1], [0.82, -1], [0.93, 1]] as const) {
    const x = Math.round(fx * w);
    const sway = Math.round(Math.sin(t * 1.2 + fx * 7));
    c.fillStyle = '#6b4a2b';
    for (let k = 0; k < 14; k++) c.fillRect(x + Math.round((lean * k * k) / 40), horizon - k, 2, 1);
    const top = { x: x + Math.round((lean * 169) / 40) + sway, y: horizon - 14 };
    c.fillStyle = '#2f7d3a';
    for (const [dx, dy] of [[-6, 1], [-4, -2], [0, -3], [4, -2], [6, 1], [-3, 2], [3, 2]]) c.fillRect(top.x + dx, top.y + dy, 3, 1);
    c.fillStyle = '#7a5a2a';
    c.fillRect(top.x, top.y + 1, 2, 2); // cocos
  }
  // Raízes do mangue: arcos marrons entrando na água nas laterais.
  c.fillStyle = '#4a3423';
  for (let i = 0; i < 8; i++) {
    const left = i < 4;
    const x = Math.round(left ? 2 + i * 7 : w - 30 + (i - 4) * 7);
    const y = Math.round(h * 0.7 + hash(i + 120) * 6);
    for (let k = 0; k < 6; k++) c.fillRect(x + (left ? k : -k), y + Math.round((k * k) / 6), 1, 1);
    c.fillRect(x - 1, y - 6, 2, 6); // tronquinho acima da água
  }
  c.fillStyle = '#245a2e';
  c.fillRect(0, Math.round(h * 0.6), 30, 6);
  c.fillRect(w - 32, Math.round(h * 0.6), 32, 6); // copas baixas do mangue
}

/** Rio Sonrisal: bolhinhas subindo e espuma na água, como um comprimido efervescente. */
function drawFizz(c: CanvasRenderingContext2D, w: number, h: number, horizon: number, t: number) {
  c.fillStyle = '#e8f4ff';
  for (let i = 0; i < 26; i++) {
    const x = Math.round(hash(i + 140) * w);
    const span = h - horizon - 6;
    const y = Math.round(h - 4 - (((t * (0.25 + hash(i + 160) * 0.35)) + hash(i + 180)) % 1) * span);
    const big = hash(i + 200) > 0.7;
    c.fillRect(x, y, big ? 2 : 1, big ? 2 : 1);
  }
  // Espuma na superfície, mexendo.
  c.fillStyle = '#d6ecff';
  for (let i = 0; i < 9; i++) {
    const x = Math.round((hash(i + 220) * w + t * 5) % w);
    c.fillRect(x, horizon + 3 + (i % 3) * 3, 6 + (i % 4) * 2, 1);
  }
}

/** Cadeado em pixel (10 × 12): a alça cinza e o corpo dourado com o furo. */
const LOCK = [
  '..kkkkkk..',
  '.kwwkkwwk.',
  '.kwk..kwk.',
  '.kwk..kwk.',
  'kkkkkkkkkk',
  'kyyyyyyyok',
  'kyhyykyyok',
  'kyyykkyyok',
  'kyyyykyyok',
  'kyyyyyyyok',
  'kooooooook',
  'kkkkkkkkkk',
];
const LOCK_COLORS = { k: '#000c22', w: '#c9ccd1', y: '#ffd23f', h: '#fff1a8', o: '#d9921f' };

function LockIcon() {
  return (
    <svg class="spot-card__lock-icon" viewBox="0 0 10 12" shape-rendering="crispEdges" role="img" aria-label="bloqueado">
      <Pixels rows={LOCK} colors={LOCK_COLORS} />
    </svg>
  );
}

export function SpotScreen({ place, background, spots, chooseSpot, paused = false }: SpotScreenProps) {
  const cards = useRef(new Map<string, HTMLCanvasElement>());
  const loop = useRef<GameLoop | null>(null);
  const stopped = useRef(paused);
  stopped.current = paused;
  const [selected, setSelected] = useState<string | null>(null);
  // O desenho lê a vista mais recente a cada quadro.
  const view = useRef({ place, background, spots });
  view.current = { place, background, spots };

  useLayoutEffect(() => {
    const drawing = createLoop({
      tick: () => {},
      draw: (t) => {
        const v = view.current;
        const scale = sceneScale(window.innerWidth);
        const depths = v.spots.map((s) => s.zone.depthM);
        for (const s of v.spots) {
          const el = cards.current.get(s.id);
          if (el) drawCard(el, v.place, cardScene(s.zone.depthM, depths), s.name, s.locked, scale, t);
        }
      },
      isPaused: () => stopped.current,
    });
    loop.current = drawing;
    drawing.start();
    return () => {
      drawing.stop();
    };
  }, []);

  // Ao sair da pausa, o desenho volta a rodar.
  useEffect(() => {
    if (!paused) loop.current?.start();
  }, [paused]);

  const chosen = spots.find((s) => s.id === selected) ?? null;

  return (
    <section class="spots" aria-label="Pesqueiro">
      <div class="spots__cards">
        {spots.map((s) => (
          <button
            key={s.id}
            type="button"
            class={`spots__spot spot-card${s.locked ? ' spots__spot--locked' : ''}`}
            data-spot={s.id}
            aria-pressed={s.id === selected}
            onClick={() => setSelected(s.id)}
          >
            <canvas
              class="spot-card__scene"
              aria-hidden="true"
              ref={(el) => {
                if (el) cards.current.set(s.id, el);
                else cards.current.delete(s.id);
              }}
            />
            <span class="spot-card__sign">
              {s.locked && <LockIcon />}
              <span class="spot-card__name">{s.name}</span>
            </span>
            {s.lockText && <span class="spot-card__lock">{s.lockText}</span>}
          </button>
        ))}
      </div>
      {chosen && (
        <div class="spots__sheet" role="region" aria-label={`Ponto ${chosen.name}`}>
          <h2 class="title-2 spots__name">{chosen.name}</h2>
          <p class="spots__progress">{chosen.species.filter(sp => sp.caught).length} de {chosen.species.length} espécies pescadas</p>
          <ul class="spots__species" aria-label="Peixes deste ponto">
            {chosen.species.map((sp) => (
              <li key={sp.id} class={`spot-species${sp.caught ? ' spot-species--caught' : ''}`}>
                <span class="spot-species__name">{sp.caught && <span aria-hidden="true">✓ </span>}{sp.name}</span>
                <span class="spot-species__status">{sp.caught ? sp.id === 'piranha-lavinia' ? 'História concluída · captura única' : 'Pescado' : sp.name === '???' ? 'A descobrir' : 'Ainda não pescado'}</span>
              </li>
            ))}
          </ul>
          {chosen.lockText && (
            <p class="spots__lock">
              <LockIcon /> {chosen.lockText}
            </p>
          )}
          <div class="spots__actions">
            <button type="button" class="btn btn--secondary" onClick={() => setSelected(null)}>
              Outro ponto
            </button>
            <button
              type="button"
              class="btn btn--big"
              data-action="pescar-aqui"
              disabled={chosen.locked}
              onClick={() => !chosen.locked && chooseSpot(chosen.id)}
            >
              Pescar aqui
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
