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
import { createCastRenderer } from '../render/castRenderer';
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

const screenSize = () => ({ width: window.innerWidth, height: window.innerHeight });

/** Número entre 0 e 1 com cara de sorteio, sempre o mesmo para o mesmo `i`. */
const hash = (i: number) => {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

/** Pinta a cena de um cartão no canvas dele, em px lógicos (`scale` px CSS por pixel). */
function drawCard(el: HTMLCanvasElement, place: LocationId, scene: CardScene, locked: boolean, scale: number, t: number) {
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
  if (scene.shore) {
    drawStand(c, s.stand, { viewW: w, viewH: h, ox: 0, oy: ground - SHORE_TOP });
    drawMarginDetails(c, place, { w, h, ground }, t);
  }
  if (locked) {
    c.fillStyle = 'rgba(0, 8, 24, 0.5)';
    c.fillRect(0, 0, w, h);
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
  const canvas = useRef<HTMLCanvasElement>(null);
  const cards = useRef(new Map<string, HTMLCanvasElement>());
  const loop = useRef<GameLoop | null>(null);
  const stopped = useRef(paused);
  stopped.current = paused;
  const [selected, setSelected] = useState<string | null>(null);
  // O desenho lê a vista mais recente a cada quadro.
  const view = useRef({ place, background, spots });
  view.current = { place, background, spots };

  useLayoutEffect(() => {
    const renderer = createCastRenderer();
    renderer.mount(canvas.current!, screenSize());
    const drawing = createLoop({
      tick: () => {},
      draw: (t) => {
        const v = view.current;
        // Atrás dos cartões, o píer com o Adilson sentado e os lampiões, sem marcas na água.
        renderer.draw({ background: v.background, place: v.place, spots: [], mode: 'pesqueiro', aim: null, flight: null }, t);
        const scale = sceneScale(window.innerWidth);
        const depths = v.spots.map((s) => s.zone.depthM);
        for (const s of v.spots) {
          const el = cards.current.get(s.id);
          if (el) drawCard(el, v.place, cardScene(s.zone.depthM, depths), s.locked, scale, t);
        }
      },
      isPaused: () => stopped.current,
    });
    loop.current = drawing;
    const onResize = () => renderer.resize(screenSize());
    window.addEventListener('resize', onResize);
    drawing.start();
    return () => {
      window.removeEventListener('resize', onResize);
      drawing.stop();
      renderer.destroy();
    };
  }, []);

  // Ao sair da pausa, o desenho volta a rodar.
  useEffect(() => {
    if (!paused) loop.current?.start();
  }, [paused]);

  const chosen = spots.find((s) => s.id === selected) ?? null;

  return (
    <section class="spots" aria-label="Pesqueiro">
      <div class="stage">
        <canvas ref={canvas} aria-hidden="true" />
      </div>
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
          <ul class="spots__species" aria-label="Peixes deste ponto">
            {chosen.species.map((sp) => (
              <li key={sp.id}>{sp.name}</li>
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
