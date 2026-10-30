// Guia do tutorial (design.md, "TutorialCoach"): a fala curta da Jane para o passo atual e uma seta
// apontando onde tocar (TUTO-02). Depois de 10 s sem toque, a fala reaparece e a seta pisca (TUTO-07).
// Nada aqui pega toque: o dedo chega à cena e ao botão "FISGAR!" por baixo.

import { useGame } from '../app/store';
import { tutorial as lines } from '../content';
import type { Point } from '../content/types';
import type { TutorialStep } from '../domain/tutorial';
import { computeLayout } from '../render/fishingRenderer';
import { characterById, Portrait } from './DialogBox';

type Target = 'agua' | 'fisgar' | 'tela';

const TARGETS: Record<TutorialStep, Target | null> = {
  cast: 'agua',
  wait: 'agua',
  hook: 'fisgar',
  reel: 'tela',
  release: 'tela',
  done: null,
};

/** Onde a seta manda arremessar: água rasa, ao alcance da Vara de Bambu (cena de 180 × 400). */
const CAST_SPOT: Point = { x: 90, y: 300 };

/** Ponto da cena lógica na tela: a cena fica ancorada embaixo do canvas, que encosta no fim da tela. */
function onScreen(p: Point): { left: number; top: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const l = computeLayout(w, h);
  return { left: (l.offsetX + p.x) * l.scale, top: h - l.viewH * l.scale + (l.offsetY + p.y) * l.scale };
}

export function TutorialCoach() {
  const step = useGame((s) => s.tutorial?.step ?? null);
  const nudge = useGame((s) => s.tutorial?.nudge ?? false);
  const blocked = useGame((s) => s.paused || s.profile.story.pendingScene !== null);
  const missed = useGame((s) => s.fishing.phase.startsWith('Result_') && s.fishing.phase !== 'Result_Caught');
  // A isca na água (ou a caminho dela): a mesma referência a cada quadro, enquanto ela não muda.
  const bait = useGame((s) => (s.fishing.phase === 'Waiting' ? s.fishing.at : s.fishing.phase === 'Flying' ? s.fishing.to : null));
  if (step === null || blocked || missed) return null;

  const target = TARGETS[step];
  return (
    <>
      {/* A troca de chave remonta a dica: ela "reaparece" a cada passo e no aviso dos 10 s. */}
      <div key={`${step}-${nudge}`} class="coach">
        <Portrait character={characterById('jane')} expression={step === 'done' ? 'rindo' : 'normal'} />
        <p class="coach__text" role="status" aria-label="Dica da Jane" data-nudge={nudge ? 'true' : 'false'}>
          {lines[step].text}
        </p>
      </div>
      {target && <Arrow target={target} at={target === 'agua' ? onScreen(bait ?? CAST_SPOT) : null} blink={nudge} />}
    </>
  );
}

/** Seta para baixo; a ponta fica no ponto apontado. */
function Arrow({ target, at, blink }: { target: Target; at: { left: number; top: number } | null; blink: boolean }) {
  const style = at ? `left: ${at.left}px; top: ${at.top - 8}px` : undefined;
  return (
    <div
      class={`coach-arrow coach-arrow--${target}${blink ? ' piscar' : ''}`}
      style={style}
      data-tutorial-arrow
      data-target={target}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 64" width="48" height="64">
        <path d="M16 2 h16 v30 h14 L24 62 L2 32 h14 z" fill="var(--accent)" stroke="var(--outline)" stroke-width="4" stroke-linejoin="round" />
      </svg>
    </div>
  );
}
