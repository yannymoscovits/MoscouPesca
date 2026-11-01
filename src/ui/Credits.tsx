// HIST-17: os créditos sobem devagar depois do fim do jogo, antes do aviso final. "Pular" encerra a
// qualquer momento; no fim, "Continuar". Sem movimento para quem pede menos movimento: a lista fica
// parada e rola com o dedo.

import { characters } from '../content/characters';
import { credits, type CreditsSection } from '../content/credits';
import { resolveAsset } from '../render/sprites';
import { useServices } from './context';

/** Segundos por linha de crédito: devagar, para dar tempo de ler. */
const SECONDS_PER_LINE = 1.4;

function Section({ title, names }: CreditsSection) {
  return (
    <div class="credits__section">
      <p class="credits__heading">{title}</p>
      {names.map((n) => (
        <p key={n} class="credits__name">
          {n}
        </p>
      ))}
    </div>
  );
}

export function Credits({ onDone }: { onDone: () => void }) {
  const { episodes } = useServices();
  const cast = characters.map((c) => `${c.name} · ${c.epithet}`);
  const places = episodes.flatMap((ep) => ep.locations.map((l) => l.name));
  const sections: CreditsSection[] = [
    ...credits.makers,
    { title: 'Elenco', names: cast },
    { title: 'Lugares', names: places },
    ...credits.after,
  ];
  const lines = 6 + sections.reduce((n, s) => n + 1 + s.names.length, 0) + credits.closing.length;
  const portrait = resolveAsset('src/assets/portraits/adilson-rindo.png');

  return (
    <div class="overlay credits" role="dialog" aria-modal="true" aria-label="Créditos">
      <div class="credits__window">
        <div class="credits__roll" style={`--roll-s: ${Math.round(lines * SECONDS_PER_LINE)}s`}>
          <p class="credits__title">MoscouFishing</p>
          {portrait && <img class="credits__portrait" src={portrait} alt="" />}
          {credits.dedication.map((d, i) => (
            <p key={d} class={i === 1 ? 'credits__star' : 'credits__name'}>
              {d}
            </p>
          ))}
          {sections.map((s) => (
            <Section key={s.title} {...s} />
          ))}
          {credits.closing.map((c) => (
            <p key={c} class="credits__closing">
              {c}
            </p>
          ))}
        </div>
      </div>
      <div class="overlay__actions credits__actions">
        <button type="button" class="btn btn--big" onClick={onDone}>
          Continuar
        </button>
      </div>
    </div>
  );
}
