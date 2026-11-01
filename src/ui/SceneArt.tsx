// HIST-16: quadro animado em cima da caixa de diálogo, enquanto a fala que pede o quadro está na tela.
// Cada animação é uma tira horizontal de quadros (src/assets/cenas/<tira>.png) que o CSS percorre em
// passos. A ondulação da viagem no tempo é um filtro SVG de deslocamento animado por quadro.

import { useEffect, useRef } from 'preact/hooks';
import type { SceneArtId } from '../content/types';
import { resolveAsset } from '../render/sprites';

interface ArtDef {
  strip: string; // arquivo em src/assets/cenas/
  frames: number;
  fps: number;
  once?: boolean; // toca uma vez e fica no último quadro
  photo?: boolean; // a foto da caixa de pesca sobe por cima
  flash?: boolean; // o flash do celular da Jane
  ripple?: 'vai' | 'volta'; // a tela ondula: vai para o passado ou volta ao presente
}

const ARTS: Record<SceneArtId, ArtDef> = {
  'vara-de-bambu': { strip: 'vara-de-bambu', frames: 16, fps: 6 },
  'lenda-pirarucu': { strip: 'lenda-pirarucu', frames: 16, fps: 4 },
  'foto-pirarucu': { strip: 'foto-pirarucu', frames: 16, fps: 6, flash: true },
  trofeu: { strip: 'trofeu', frames: 16, fps: 6 },
  foto: { strip: 'foto', frames: 16, fps: 5, photo: true },
  beira: { strip: 'beira', frames: 16, fps: 6 },
  'mare-do-tempo': { strip: 'beira', frames: 16, fps: 6, ripple: 'vai' },
  dormindo: { strip: 'dormindo', frames: 16, fps: 4, ripple: 'volta' },
  acordando: { strip: 'acordando', frames: 11, fps: 5, once: true },
  ferry: { strip: 'ferry', frames: 16, fps: 6 },
  paz: { strip: 'paz', frames: 16, fps: 4 },
  'xareu-lucca': { strip: 'xareu-lucca', frames: 16, fps: 6 },
  'disco-voador': { strip: 'disco-voador', frames: 16, fps: 6 },
  'peixes-voadores': { strip: 'peixes-voadores', frames: 16, fps: 6 },
  'piranha-pipa': { strip: 'piranha-pipa', frames: 16, fps: 6 },
  'torre-7': { strip: 'torre-7', frames: 16, fps: 6 },
  'dourado-lenda': { strip: 'dourado-lenda', frames: 16, fps: 6 },
  barco: { strip: 'barco', frames: 16, fps: 5 },
  'sombra-marlim': { strip: 'sombra-marlim', frames: 16, fps: 4 },
  'marlim-solto': { strip: 'marlim-solto', frames: 10, fps: 3, once: true },
  'por-do-sol': { strip: 'por-do-sol', frames: 16, fps: 4 },
};

const RIPPLE_S = 2.6;
const RIPPLE_MAX = 14; // deslocamento máximo, em pixels da tela

/** Anima o filtro de ondulação: cresce até o fim (vai) ou some desde o começo (volta). */
function useRipple(kind: ArtDef['ripple'], map: { current: SVGFEDisplacementMapElement | null }, noise: { current: SVGFETurbulenceElement | null }) {
  useEffect(() => {
    if (!kind || !map.current || !noise.current) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      map.current.setAttribute('scale', '0');
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1000 / RIPPLE_S);
      const amount = kind === 'vai' ? t : 1 - t;
      map.current?.setAttribute('scale', String(RIPPLE_MAX * amount));
      const f = 0.02 + 0.01 * Math.sin(now / 260);
      noise.current?.setAttribute('baseFrequency', `${f.toFixed(4)} ${(f * 3).toFixed(4)}`);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kind]);
}

export function SceneArt({ art }: { art: SceneArtId }) {
  const def = ARTS[art];
  const map = useRef<SVGFEDisplacementMapElement>(null);
  const noise = useRef<SVGFETurbulenceElement>(null);
  useRipple(def.ripple, map, noise);
  const url = resolveAsset(`src/assets/cenas/${def.strip}.png`);
  if (!url) return null;
  const photo = def.photo ? resolveAsset('src/assets/cenas/foto-ninha.png') : null;
  const filterId = `scene-art-ondula-${art}`;
  return (
    <figure class={`scene-art${def.ripple ? ` scene-art--${def.ripple}` : ''}${def.flash ? ' scene-art--flash' : ''}`} data-art={art} aria-hidden="true">
      {def.ripple && (
        <svg class="scene-art__defs" width="0" height="0">
          <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence ref={noise} type="fractalNoise" baseFrequency="0.02 0.06" numOctaves={1} seed={3} />
            <feDisplacementMap ref={map} in="SourceGraphic" scale={def.ripple === 'volta' ? RIPPLE_MAX : 0} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      )}
      <div
        class={`scene-art__film${def.once ? ' scene-art__film--once' : ''}`}
        style={`background-image: url(${url}); --frames: ${def.frames}; --dur: ${def.frames / def.fps}s;${def.ripple ? ` filter: url(#${filterId});` : ''}`}
      />
      {photo && <img class="scene-art__photo" src={photo} alt="" />}
    </figure>
  );
}
