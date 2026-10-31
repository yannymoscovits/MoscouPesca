// Sala de troféus (design.md, "UI (Preact)", TrophyRoom; TROF-01): um troféu por campeonato, na ordem
// dos episódios. O conquistado aparece em destaque, dourado; o que falta, como silhueta com o nome do
// campeonato. Só o "Voltar" fica embaixo (ACES-08).

import { useGame } from '../app/store';
import { useNav, useServices } from './context';

/** Taça em pixel, na cor do texto (`currentColor`): dourada em destaque, escura na silhueta. */
function TrophyIcon({ label }: { label: string }) {
  return (
    <svg class="trophy__icon" viewBox="0 0 16 16" role="img" aria-label={label} shape-rendering="crispEdges">
      <g fill="currentColor">
        <rect x="3" y="1" width="10" height="1" />
        <rect x="4" y="2" width="8" height="5" />
        <rect x="5" y="7" width="6" height="1" />
        <rect x="6" y="8" width="4" height="1" />
        <rect x="1" y="2" width="3" height="1" />
        <rect x="1" y="3" width="1" height="2" />
        <rect x="1" y="5" width="3" height="1" />
        <rect x="12" y="2" width="3" height="1" />
        <rect x="14" y="3" width="1" height="2" />
        <rect x="12" y="5" width="3" height="1" />
        <rect x="7" y="9" width="2" height="2" />
        <rect x="5" y="11" width="6" height="1" />
        <rect x="4" y="12" width="8" height="2" />
      </g>
    </svg>
  );
}

export function TrophyRoom() {
  const { episodes } = useServices();
  const go = useNav();
  const trophies = useGame((s) => s.profile.trophies);
  const won = episodes.filter((ep) => trophies.includes(ep.tournament.trophy)).length;

  return (
    <section class="screen trophies" aria-label="Troféus">
      <div class="screen__top trophies__top">
        <h1 class="title-2">Troféus</h1>
        <p class="trophies__count">
          {won} de {episodes.length}
        </p>
        <ul class="trophies__shelf" aria-label="Campeonatos">
          {episodes.map((ep) => {
            const { name, trophy } = ep.tournament;
            const has = trophies.includes(trophy);
            return (
              <li key={trophy} class={`trophy ${has ? 'trophy--won' : 'trophy--missing'}`}>
                <TrophyIcon label={has ? `Troféu da ${name}` : `Silhueta do troféu da ${name}`} />
                <div>
                  <p class="trophy__name">{name}</p>
                  <p class="trophy__status">{has ? 'Conquistado' : 'Falta vencer'}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div class="screen__actions trophies__actions">
        <button type="button" class="btn" onClick={() => go('menu')}>
          Voltar
        </button>
      </div>
    </section>
  );
}
