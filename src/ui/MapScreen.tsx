// Mapa dos episódios (design.md, "UI (Preact)", MapScreen): todos os episódios cadastrados, em ordem.
// Episódio bloqueado aparece com cadeado e o nome do campeonato que o libera (EPI-03); cada local
// liberado é um cartão que abre a pesca lá (EPI-04), com o nome do episódio, o troféu da copa já
// vencida e o "Você está aqui" no local atual. Depois de zerar, são os 5 cartões, sem repetir nome.

import { useGame } from '../app/store';
import { isUnlocked } from '../domain/world';
import { useNav, useServices } from './context';

export function MapScreen() {
  const { controller, episodes } = useServices();
  const go = useNav();
  const profile = useGame((s) => s.profile);

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
            if (!isUnlocked(profile, ep.id)) {
              // O campeonato que libera um episódio é o do episódio anterior (EPI-02).
              const key = episodes.find((e) => e.id === ep.id - 1)?.tournament.name;
              return (
                <li key={ep.id} class="map__episode map__episode--locked">
                  <span class="map__number" role="img" aria-label={`Episódio ${ep.id}, bloqueado`}>
                    🔒
                  </span>
                  <span class="map__text">
                    <span class="map__title">Episódio {ep.id}</span>
                    <span class="map__lock">Bloqueado · Vença a {key}</span>
                  </span>
                </li>
              );
            }
            const won = profile.story.episodes[ep.id]?.won ?? false;
            return ep.locations.map((loc) => {
              const here = loc.id === profile.currentLocation;
              return (
                <li key={loc.id}>
                  <button
                    type="button"
                    class={`map__episode map__place${here ? ' map__place--here' : ''}`}
                    aria-current={here ? 'location' : undefined}
                    onClick={() => travel(loc.id)}
                  >
                    <span class="map__number" aria-hidden="true">
                      {ep.id}
                    </span>
                    <span class="map__text">
                      <span class="map__title">{loc.name}</span>
                      <span class="map__chapter">
                        {ep.chapter.title}
                        {won && <span aria-label=", copa vencida"> · 🏆</span>}
                      </span>
                      {here && <span class="map__here">Você está aqui</span>}
                    </span>
                  </button>
                </li>
              );
            });
          })}
        </ol>
      </div>
      <div class="screen__actions map__actions">
        <button type="button" class="btn btn--secondary" onClick={() => go('menu')}>
          Voltar
        </button>
      </div>
    </section>
  );
}
