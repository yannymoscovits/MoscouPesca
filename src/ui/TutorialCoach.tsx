// Guia do tutorial (design.md, "TutorialCoach"): a fala curta da Jane para o passo atual da pescaria
// nova (pesca-bass TUTOB-01). Depois de 10 s sem toque, a fala reaparece (TUTO-07).
// Nada aqui pega toque: o dedo chega aos pontos e aos botões por baixo.

import { useGame } from '../app/store';
import type { TutorialPescaStep } from '../domain/tutorialPesca';
import { characterById, Portrait } from './DialogBox';

// Textos provisórios, um por passo, até as falas da Jane (T16).
const TEXTS: Record<TutorialPescaStep, string> = {
  ponto: 'Escolha um ponto e toque em "Pescar aqui".',
  direcao: 'Toque em ARREMESSAR para travar a direção.',
  forca: 'Toque em ARREMESSAR de novo para escolher a força.',
  recolher: 'Segure RECOLHER para trazer a isca.',
  atrair: 'Um peixe está seguindo! Toque em PUXAR para atrair.',
  fisgar: 'Ele atacou! Aperte FISGAR!',
  subir: 'Segure SEGURAR para subir a faixa verde.',
  descer: 'Solte para a faixa descer.',
  manter: 'Mantenha o peixe dentro da faixa até o medidor encher.',
  done: 'Pegou!',
};

export function TutorialCoach() {
  const step = useGame((s) => s.tutorial?.step ?? null);
  const nudge = useGame((s) => s.tutorial?.nudge ?? false);
  const blocked = useGame((s) => s.paused || s.profile.story.pendingScene !== null);
  const missed = useGame((s) => s.fishing.phase.startsWith('Result_') && s.fishing.phase !== 'Result_Caught');
  if (step === null || blocked || missed) return null;

  return (
    // A troca de chave remonta a dica: ela "reaparece" a cada passo e no aviso dos 10 s.
    <div key={`${step}-${nudge}`} class="coach" data-step={step}>
      <Portrait character={characterById('jane')} expression={step === 'done' ? 'rindo' : 'normal'} />
      <p class="coach__text" role="status" aria-label="Dica da Jane" data-nudge={nudge ? 'true' : 'false'}>
        {TEXTS[step]}
      </p>
    </div>
  );
}
