// Celebração exagerada (design.md, "UI (Preact)"): o Adilson posando com o peixe e "PEGOU!" antes da
// ficha (CatchCelebration: HUMOR-05) e a onomatopeia com a cena tremendo na fisgada, no peixe que
// fugiu e na vitória do torneio (ImpactFx: HUMOR-06). Sem arte ainda: retrato e peixe provisórios.

import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { GameStoreContext, type GameState, type GameStore } from '../app/store';
import type { Species } from '../content/types';
import { characterById, Portrait } from './DialogBox';
import { FishPicture } from './FishCard';

/** Quanto a pose fica na tela antes da ficha, se ninguém tocar. */
export const CELEBRATION_MS = 1600;
/** HUMOR-06: o tremor dura no máximo 300 ms; 250 deixa folga para o relógio do navegador. */
export const SHAKE_MS = 250;
/** Quanto a onomatopeia fica na tela. */
const WORD_MS = 1000;

/** HUMOR-05: a pose com o peixe; some sozinha ou com um toque. */
export function CatchCelebration({ species, onDone }: { species: Species; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const timer = setTimeout(() => done.current(), CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div class="overlay overlay--fishing celebration" role="dialog" aria-modal="true" aria-label="Comemoração" onClick={onDone}>
      <div class="celebration__burst">
        <p class="celebration__word">PEGOU!</p>
        <div class="celebration__pose">
          <Portrait character={characterById('adilson')} expression="rindo" big />
          <div class="celebration__fish">
            <FishPicture species={species} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Vitória do torneio na tela: a classificação aparece depois da ficha do último arremesso. */
const victoryOnScreen = (s: GameState) => s.tournamentResult?.won === true && !s.fishing.phase.startsWith('Result_');

/**
 * HUMOR-06: "NHAC!" na fisgada, "PLOFT!" no peixe que fugiu da briga (na pescaria nova a linha não
 * arrebenta) e "É CAMPEÃO!" na vitória do torneio, com a classe `tremor` (transform por CSS) no
 * contêiner da cena por SHAKE_MS.
 */
export function ImpactFx({ scene }: { scene: { current: HTMLElement | null } }) {
  const store = useContext(GameStoreContext) as GameStore;
  const [word, setWord] = useState<{ text: string; id: number } | null>(null);

  useEffect(() => {
    let prev = store.getState();
    let victory = victoryOnScreen(prev);
    let shakeTimer: ReturnType<typeof setTimeout> | undefined;
    let wordTimer: ReturnType<typeof setTimeout> | undefined;

    function impact(text: string) {
      setWord({ text, id: performance.now() });
      clearTimeout(wordTimer);
      wordTimer = setTimeout(() => setWord(null), WORD_MS);
      const el = scene.current;
      if (!el) return;
      el.classList.remove('tremor');
      void el.offsetWidth; // reinicia a animação se o tremor anterior ainda não acabou
      el.classList.add('tremor');
      clearTimeout(shakeTimer);
      shakeTimer = setTimeout(() => el.classList.remove('tremor'), SHAKE_MS);
    }

    const unsubscribe = store.subscribe(() => {
      const s = store.getState();
      const before = prev.fishing.phase;
      const now = s.fishing.phase;
      if (before === 'Strike' && now === 'Fight') impact('NHAC!');
      if (before !== 'Result_Caught' && now === 'Result_Caught') setWord(null); // a pose do "PEGOU!" ocupa a tela
      if (before === 'Fight' && now === 'Result_Escaped') impact('PLOFT!');

      const won = victoryOnScreen(s);
      if (won && !victory) impact('É CAMPEÃO!');
      victory = won;
      prev = s;
    });
    return () => {
      unsubscribe();
      clearTimeout(shakeTimer);
      clearTimeout(wordTimer);
      scene.current?.classList.remove('tremor');
    };
  }, [store, scene]);

  if (!word) return null;
  return (
    <p key={word.id} class="impact" role="status" aria-live="assertive">
      {word.text}
    </p>
  );
}
