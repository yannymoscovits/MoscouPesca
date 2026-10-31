// Pesqueiro (pesca-bass PONTO-01 a PONTO-04): o local visto de cima (castRenderer) com um botão por
// ponto, no centro dele. Tocar num ponto destaca o ponto e abre, embaixo, as espécies que vivem ali
// (nome ou "???"), o cadeado com o alcance pedido e "Pescar aqui". Não sabe do jogo: recebe os pontos
// (spotsFor) e chama `chooseSpot`.

import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { LocationId, Point } from '../content/types';
import type { SpotView } from '../domain/spots';
import { createLoop, type GameLoop } from '../app/loop';
import { createCastRenderer, spotAnchor } from '../render/castRenderer';
import { computeLayout, SCENE_H, type Layout } from '../render/fishingRenderer';

export interface SpotScreenProps {
  place: LocationId; // Location.id: o cenário do desenho
  background: string; // Location.background
  spots: SpotView[]; // spotsFor(local, vara, espécies, álbum)
  chooseSpot: (spotId: string) => void; // "Pescar aqui" num ponto liberado (PONTO-04)
  paused?: boolean; // SAVE-01: pausado, o desenho para
}

/** Largura máxima do botão de um ponto, em fração da tela: o nome quebra em duas linhas se precisar. */
export const SPOT_BUTTON_SHARE = 0.4;
const GUTTER_PX = 16;

/**
 * Centro do botão do ponto, em px CSS: `left` a partir da esquerda e `bottom` a partir do pé da tela,
 * onde a cena fica ancorada. Na horizontal, o botão não sai da tela.
 */
export function spotButtonPos(anchor: Point, layout: Layout, cssWidth: number): { left: number; bottom: number } {
  const half = (cssWidth * SPOT_BUTTON_SHARE) / 2;
  const x = (layout.offsetX + anchor.x) * layout.scale;
  return {
    left: Math.min(Math.max(x, GUTTER_PX + half), cssWidth - GUTTER_PX - half),
    bottom: (SCENE_H - anchor.y) * layout.scale,
  };
}

const screenSize = () => ({ width: window.innerWidth, height: window.innerHeight });

export function SpotScreen({ place, background, spots, chooseSpot, paused = false }: SpotScreenProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const loop = useRef<GameLoop | null>(null);
  const stopped = useRef(paused);
  stopped.current = paused;
  const [selected, setSelected] = useState<string | null>(null);
  const [size, setSize] = useState(screenSize);
  // O desenho lê a vista mais recente a cada quadro.
  const view = useRef({ place, background, spots, selected });
  view.current = { place, background, spots, selected };

  useLayoutEffect(() => {
    const renderer = createCastRenderer();
    renderer.mount(canvas.current!, screenSize());
    const drawing = createLoop({
      tick: () => {},
      draw: (t) => {
        const v = view.current;
        renderer.draw(
          {
            background: v.background,
            place: v.place,
            spots: v.spots.map((s) => ({ zone: s.zone, locked: s.locked, selected: s.id === v.selected })),
            aim: null,
            flight: null,
          },
          t,
        );
      },
      isPaused: () => stopped.current,
    });
    loop.current = drawing;
    const onResize = () => {
      renderer.resize(screenSize());
      setSize(screenSize());
    };
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

  const layout = computeLayout(size.width, size.height);
  const chosen = spots.find((s) => s.id === selected) ?? null;

  return (
    <section class="spots" aria-label="Pesqueiro">
      <div class="stage">
        <canvas ref={canvas} aria-hidden="true" />
      </div>
      {spots.map((s) => {
        const pos = spotButtonPos(spotAnchor(s.zone), layout, size.width);
        return (
          <button
            key={s.id}
            type="button"
            class={`btn spots__spot${s.locked ? ' spots__spot--locked' : ''}`}
            data-spot={s.id}
            aria-pressed={s.id === selected}
            // Entre a fileira de baixo e o painel de cima (--spots-top, posto pela tela de pesca).
            style={{
              left: `${pos.left}px`,
              bottom: `clamp(calc(var(--hud-row) + 40px), ${pos.bottom}px, calc(100% - var(--spots-top, 0px) - 40px))`,
            }}

            onClick={() => setSelected(s.id)}
          >
            {s.locked && (
              <span class="spots__lock-icon" role="img" aria-label="bloqueado">
                🔒
              </span>
            )}
            {s.name}
          </button>
        );
      })}
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
              <span role="img" aria-label="bloqueado">
                🔒
              </span>{' '}
              {chosen.lockText}
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
