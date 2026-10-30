// Escolha da dificuldade na primeira abertura (ACES-01) e a tela Ajustes (ACES-02, ACES-04, TUTO-09).

import { useState } from 'preact/hooks';
import { useGame } from '../app/store';
import type { Difficulty } from '../content/types';
import { useBack, useNav, useServices } from './context';

const DIFFICULTIES: { id: Difficulty; name: string; hint: string }[] = [
  { id: 'tranquilo', name: 'Tranquilo', hint: 'Mais tempo para fisgar, e a linha nunca arrebenta.' },
  { id: 'desafio', name: 'Desafio', hint: 'Fisgada ligeira, e a linha pode arrebentar.' },
];

/** ACES-01: aparece no "Jogar" enquanto a dificuldade nunca foi escolhida. */
export function DifficultyPrompt() {
  const { controller } = useServices();
  const go = useNav();

  function choose(d: Difficulty) {
    controller.setDifficulty(d);
    go('fishing');
  }

  return (
    <section class="screen" aria-labelledby="dificuldade-titulo">
      <div class="screen__top">
        <h1 id="dificuldade-titulo" class="title-2">
          Como você quer pescar hoje?
        </h1>
        <p class="subtitle">Dá para trocar depois, em Ajustes.</p>
      </div>
      <div class="screen__actions">
        {DIFFICULTIES.map((d) => (
          <button key={d.id} type="button" class="btn btn--choice" onClick={() => choose(d.id)}>
            <span class="choice__name">{d.name}</span>
            <span class="choice__hint">{d.hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Settings() {
  const { controller } = useServices();
  const back = useBack();
  const difficulty = useGame((s) => s.profile.settings.difficulty);
  const vibration = useGame((s) => s.profile.settings.vibration);
  const [tutorialAgain, setTutorialAgain] = useState(false);

  return (
    <section class="screen" aria-labelledby="ajustes-titulo">
      <div class="screen__top">
        <h1 id="ajustes-titulo" class="title">
          Ajustes
        </h1>
        {tutorialAgain && <p role="status">O tutorial começa na próxima pescaria.</p>}
      </div>
      <div class="screen__actions">
        <div class="setting" role="group" aria-labelledby="ajustes-dificuldade">
          <span id="ajustes-dificuldade" class="setting__label">
            Dificuldade
          </span>
          <div class="segmented">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                class="btn btn--toggle"
                aria-pressed={difficulty === d.id}
                onClick={() => controller.setDifficulty(d.id)}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          class="btn btn--toggle btn--switch"
          aria-checked={vibration}
          onClick={() => controller.setVibration(!vibration)}
        >
          Vibração: {vibration ? 'ligada' : 'desligada'}
        </button>
        <button
          type="button"
          class="btn btn--secondary"
          onClick={() => {
            controller.resetTutorial();
            setTutorialAgain(true);
          }}
        >
          Rever tutorial
        </button>
        <button type="button" class="btn" onClick={back}>
          Voltar
        </button>
      </div>
    </section>
  );
}
