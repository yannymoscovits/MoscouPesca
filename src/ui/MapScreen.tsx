// Mapa dos episódios (design.md, "UI (Preact)", MapScreen): todos os episódios cadastrados, em ordem.
// Episódio bloqueado aparece com cadeado e o nome do campeonato que o libera (EPI-03); os locais
// liberados viram botões que abrem a pesca lá (EPI-04), e o Episódio 2 mostra os seus dois (EPI-08).

import { useGame } from '../app/store';
import { isUnlocked } from '../domain/world';
import { useNav, useServices } from './context';
import { joinNames } from './DialogBox';

export function MapScreen() {
  const { controller, episodes } = useServices();
  const go = useNav();
  const profile = useGame((s) => s.profile);
  const open = episodes.filter((ep) => isUnlocked(profile, ep.id));

  function travel(location: string) {
    controller.travel(location); // EPI-04, EPI-07
    go('fishing');
  }

  return (
    <section class="screen map" aria-label="Mapa">
      <div class="screen__top map__top">
        <h1 class="title-2">Mapa</h1>
        <ol class="map__episodes" aria-label="Episódios">
          {episodes.map((ep) => {
            const locked = !isUnlocked(profile, ep.id);
            // O campeonato que libera um episódio é o do episódio anterior (EPI-02).
            const key = episodes.find((e) => e.id === ep.id - 1)?.tournament.name;
            return (
              <li key={ep.id} class={`map__episode${locked ? ' map__episode--locked' : ''}`}>
                <span class="map__number" role="img" aria-label={`Episódio ${ep.id}${locked ? ', bloqueado' : ''}`}>
                  {locked ? '🔒' : ep.id}
                </span>
                {/* Uma linha por episódio liberado, para os 5 caberem com os botões embaixo. */}
                <div>
                  <p class="map__title">{joinNames(ep.locations.map((l) => l.name))}</p>
                  {locked && <p class="map__lock">Bloqueado · Vença a {key}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div class="screen__actions map__actions">
        <div class="map__grid">
          {open.flatMap((ep) =>
            ep.locations.map((loc) => {
              const here = loc.id === profile.currentLocation;
              return (
                <button
                  key={loc.id}
                  type="button"
                  class={`btn ${here ? '' : 'btn--secondary'}`}
                  aria-current={here ? 'location' : undefined}
                  onClick={() => travel(loc.id)}
                >
                  {loc.name}
                </button>
              );
            }),
          )}
        </div>
        <button type="button" class="btn btn--secondary" onClick={() => go('menu')}>
          Voltar
        </button>
      </div>
    </section>
  );
}
