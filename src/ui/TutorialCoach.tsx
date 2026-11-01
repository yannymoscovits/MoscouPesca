// Guia do tutorial (design.md, "TutorialCoach"; pesca-bass TUTOB-01): a fala curta da Jane para o passo
// atual da pescaria nova e uma seta apontando onde tocar (TUTO-02): o ponto e "Pescar aqui" no
// pesqueiro, ARREMESSAR, RECOLHER, PUXAR, SEGURAR e a barra de captura. Depois de 10 s sem toque, a
// fala reaparece e a seta pisca (TUTO-07). Nada aqui pega toque: o dedo chega aos pontos e botões por baixo.

import { useServices } from './context';
import { useLayoutEffect, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { useGame } from '../app/store';
import { tutorial as lines, tutorialTips as tips } from '../content';
import { TUTORIAL_STEPS, type TutorialPescaStep } from '../domain/tutorialPesca';
import { characterById, Highlight, Portrait } from './DialogBox';

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
  briga: ['[data-button="segurar"]'],
  done: [],
};

/** Título de cada lição (TUTOB-05). */
const TITLES: Record<TutorialPescaStep, string> = {
  ponto: 'Escolha o ponto',
  direcao: 'Mire',
  forca: 'Escolha a força',
  recolher: 'Recolha a isca',
  atrair: 'Atraia o peixe',
  fisgar: 'Fisgue!',
  briga: 'A briga',
  done: 'Pegou!',
};

export function TutorialCoach() {
  const { controller } = useServices();
  const step = useGame((s) => s.tutorial?.step ?? null);
  const nudge = useGame((s) => s.tutorial?.nudge ?? false);
  const reading = useGame((s) => s.tutorial?.reading ?? false);
  const praising = useGame((s) => (s.tutorial?.praiseS ?? 0) > 0);
  // A cena da história espera a última lição da Jane; as outras lições esperam a cena.
  const blocked = useGame((s) => s.paused || (s.profile.story.pendingScene !== null && s.tutorial?.step !== 'done'));
  const missed = useGame((s) => s.fishing.phase.startsWith('Result_') && s.fishing.phase !== 'Result_Caught');
  const caught = useGame((s) => s.fishing.phase === 'Result_Caught');
  const hidden = step === null || blocked || missed;
  const at = useTarget(hidden || reading ? [] : TARGETS[step]);
  if (hidden) return null;

  // Peixe pego: nada por cima da comemoração e da ficha; a Jane fecha o tutorial depois do "Continuar".
  if (step === 'done') {
    if (!reading || caught) return null;
    return createPortal(
      <div class="overlay lesson" role="dialog" aria-modal="true" aria-labelledby="licao-titulo">
        <div class="lesson__card">
          <Portrait character={characterById('jane')} expression="rindo" />
          <h2 id="licao-titulo" class="lesson__title">
            Tutorial completo!
          </h2>
          <p class="lesson__text">
            <Highlight text={lines.done.text} />
          </p>
          <button type="button" class="btn btn--big lesson__ok" onClick={() => controller.tutorialRead()}>
            Bora pescar ▸
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  // TUTOB-06: o passo deu certo; um respiro antes da próxima lição.
  // A lição e o "Isso!" vão para o fim do <body>: por cima de tudo, até dos cartões do pesqueiro.
  if (reading && praising) {
    return createPortal(
      <div class="coach-praise" role="status">
        <Portrait character={characterById('jane')} expression="rindo" />
        <p>Isso!</p>
      </div>,
      document.body,
    );
  }

  // TUTOB-05: a lição do passo, no meio da tela, com o jogo parado até "Entendi".
  if (reading) {
    const n = TUTORIAL_STEPS.indexOf(step) + 1;
    return createPortal(
      <div class="overlay lesson" role="dialog" aria-modal="true" aria-labelledby="licao-titulo">
        <div class="lesson__card">
          <Portrait character={characterById('jane')} expression="normal" />
          <p class="lesson__count">
            Passo {n} de {TUTORIAL_STEPS.length}
          </p>
          <h2 id="licao-titulo" class="lesson__title">
            {TITLES[step]}
          </h2>
          <p class="lesson__text">
            <Highlight text={lines[step].text} />
          </p>
          <ol class="lesson__tips">
            {tips[step].map((t) => (
              <li key={t}>
                <Highlight text={t} />
              </li>
            ))}
          </ol>
          <button type="button" class="btn btn--big lesson__ok" onClick={() => controller.tutorialRead()}>
            Entendi ▸
          </button>
        </div>
      </div>,
      document.body,
    );
  }


  // Durante a ação a tela fica limpa: a seta no botão certo e um selo pequeno com o passo e o "?".
  return (
    <>
      <div class="coach-chip" data-step={step}>
        <span>
          Passo {TUTORIAL_STEPS.indexOf(step) + 1} de {TUTORIAL_STEPS.length} · {TITLES[step]}
        </span>
        <button type="button" class="coach-chip__help" aria-label="Rever a explicação" onClick={() => controller.tutorialHelp()}>
          ?
        </button>
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

/** Seta branca para baixo, curta e larga (não parece a mira amarela); a ponta fica no alvo. */
function Arrow({ step, at, blink }: { step: TutorialPescaStep; at: { left: number; top: number }; blink: boolean }) {
  return (
    <div
      class={`coach-arrow${blink ? ' piscar' : ''}`}
      style={`left: ${at.left}px; top: ${at.top - 4}px`}
      data-tutorial-arrow
      data-target={step}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" width="48" height="48">
        <path d="M15 2 h18 v18 h13 L24 46 L2 20 h13 z" fill="#ffffff" stroke="var(--outline)" stroke-width="4" stroke-linejoin="round" />
        <path d="M19 6 h4 v16 h-4 z" fill="#b5c6e1" />
      </svg>
    </div>
  );
}
