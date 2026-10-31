// Barra de captura da briga (pesca-bass BRIGA-01, BRIGA-13), em arte própria: a barra vertical com a
// faixa verde e o peixe, e o medidor ao lado. Tudo em % da altura, lido do CatchBar do domínio (0 é o
// fundo e 1 o topo); a faixa fica mais clara com o peixe dentro dela. Não sabe do jogo: só desenha.

import type { CatchBar as Bar } from '../domain/catchBar';
import { fishInside } from '../domain/catchBar';
import { colorOf } from '../render/fishingRenderer';
import { Pixels } from './TitleArt';

/** Peixinho de 10 × 7 pixels virado para a direita; `b` é o corpo na cor da espécie. */
const FISH = ['k...kkkk..', 'kk.kbbbbk.', 'kbkbbbbwbk', 'kbbbbbbbbk', 'kbkbbbbbbk', 'kk.kbbbbk.', 'k...kkkk..'];

const pct = (v: number) => `${v * 100}%`;

export function CatchBar({ bar }: { bar: Bar }) {
  const inside = fishInside(bar);
  return (
    <div class="catch-bar" role="group" aria-label="Barra de captura">
      <div class="catch-bar__track">
        <div
          class={`catch-bar__zone${inside ? ' catch-bar__zone--inside' : ''}`}
          data-inside={inside ? 'true' : 'false'}
          style={{ bottom: pct(bar.zoneY), height: pct(bar.zoneH) }}
        />
        <svg
          class="catch-bar__fish"
          viewBox="0 0 10 7"
          shape-rendering="crispEdges"
          aria-hidden="true"
          style={{ bottom: pct(bar.fishY) }}
        >
          <Pixels rows={FISH} colors={{ k: '#000c22', b: colorOf(bar.species.id), w: '#ffffff' }} />
        </svg>
      </div>
      <div
        class="catch-bar__meter"
        role="meter"
        aria-label="Medidor de captura"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(bar.meter * 100)}
      >
        <div class="catch-bar__meter-fill" style={{ height: pct(bar.meter) }} />
      </div>
    </div>
  );
}
