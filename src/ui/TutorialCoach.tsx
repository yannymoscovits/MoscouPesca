// Guia do tutorial (design.md, "TutorialCoach"; pesca-bass TUTOB-01): a fala curta da Jane para o passo
// atual da pescaria nova e uma seta apontando onde tocar (TUTO-02): o ponto e "Pescar aqui" no
// pesqueiro, ARREMESSAR, RECOLHER, PUXAR, SEGURAR e a barra de captura. Depois de 10 s sem toque, a
// fala reaparece e a seta pisca (TUTO-07). Nada aqui pega toque: o dedo chega aos pontos e botões por baixo.

import { useLayoutEffect, useState } from 'preact/hooks';
import { useGame } from '../app/store';
import { tutorial as lines } from '../content';
import type { TutorialPescaStep } from '../domain/tutorialPesca';
import { characterById, Portrait } from './DialogBox';

/**
 * Para onde a seta aponta em cada passo: o primeiro destes elementos que estiver na tela. No pesqueiro,
 * "Pescar aqui" com o ponto já tocado; antes disso, o primeiro ponto sem cadeado.
 */
const TARGETS: Record<TutorialPescaStep, string[]> = {
  ponto: ['[data-action="pescar-aqui"]:not([disabled])', '.spots__spot:not(.spots__spot--locked)'],
  direcao: ['[data-button="arremessar"]'],
  forca: ['[data-button="arremessar"]'],
  recolher: ['[data-button="recolher"]', '[data-button="arremessar"]'], // com a isca no ar, a fileira dos botões
  atrair: ['[data-button="puxar"]'],
  fisgar: ['[data-button="puxar"]'],
  subir: ['[data-button="segurar"]'], // segurar
  descer: ['[data-button="segurar"]'], // soltar
  manter: ['.catch-bar__track'],
  done: [],
};

export function TutorialCoach() {
  const step = useGame((s) => s.tutorial?.step ?? null);
  const nudge = useGame((s) => s.tutorial?.nudge ?? false);
  const blocked = useGame((s) => s.paused || s.profile.story.pendingScene !== null);
  const missed = useGame((s) => s.fishing.phase.startsWith('Result_') && s.fishing.phase !== 'Result_Caught');
  const at = useTarget(step === null || blocked || missed ? [] : TARGETS[step]);
  if (step === null || blocked || missed) return null;

  return (
    <>
      {/* A troca de chave remonta a dica: ela "reaparece" a cada passo e no aviso dos 10 s. */}
      <div key={`${step}-${nudge}`} class="coach" data-step={step}>
        <Portrait character={characterById('jane')} expression={step === 'done' ? 'rindo' : 'normal'} />
        <p class="coach__text" role="status" aria-label="Dica da Jane" data-nudge={nudge ? 'true' : 'false'}>
          {lines[step].text}
        </p>
      </div>
      {at && <Arrow step={step} at={at} blink={nudge} />}
    </>
  );
}

/** O meio da borda de cima do primeiro alvo na tela, acompanhado a cada quadro; null sem alvo. */
function useTarget(selectors: string[]): { left: number; top: number } | null {
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const key = selectors.join('|');
  useLayoutEffect(() => {
    let frame = 0;
    let last: string | null = null; // o primeiro quadro sempre grava, até sem alvo
    const follow = () => {
      const el = selectors.map((s) => document.querySelector<HTMLElement>(s)).find((e) => e && e.offsetParent !== null);
      const r = el?.getBoundingClientRect();
      const next = r ? { left: Math.round(r.left + r.width / 2), top: Math.round(r.top) } : null;
      const id = next ? `${next.left},${next.top}` : '';
      if (id !== last) {
        last = id;
        setAt(next);
      }
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [key]);
  return at;
}

/** Seta para baixo; a ponta fica no alvo. */
function Arrow({ step, at, blink }: { step: TutorialPescaStep; at: { left: number; top: number }; blink: boolean }) {
  return (
    <div
      class={`coach-arrow${blink ? ' piscar' : ''}`}
      style={`left: ${at.left}px; top: ${at.top - 4}px`}
      data-tutorial-arrow
      data-target={step}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 64" width="48" height="64">
        <path d="M16 2 h16 v30 h14 L24 62 L2 32 h14 z" fill="var(--accent)" stroke="var(--outline)" stroke-width="4" stroke-linejoin="round" />
      </svg>
    </div>
  );
}
