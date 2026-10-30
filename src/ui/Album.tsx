// Álbum de peixes (design.md, "UI (Preact)", Album; ALBUM-03): uma página por local dos episódios
// liberados, começando pelo local atual. Espécie pega mostra o desenho e o recorde; a que falta,
// uma silhueta com "???".

import { useState } from 'preact/hooks';
import { useGame } from '../app/store';
import type { EpisodeContent, Location, Species } from '../content/types';
import { isUnlocked } from '../domain/world';
import { useNav, useServices } from './context';
import { FishPicture } from './FishCard';
import { formatKg } from './format';

/** Espécies que vivem nas zonas do local, na ordem do episódio. */
function speciesAt(location: Location, episode: EpisodeContent): Species[] {
  const ids = new Set(location.zones.flatMap((z) => z.species));
  return episode.species.filter((s) => ids.has(s.id));
}

export function Album() {
  const { episodes } = useServices();
  const go = useNav();
  const profile = useGame((s) => s.profile);
  const pages = episodes
    .filter((ep) => isUnlocked(profile, ep.id))
    .flatMap((episode) => episode.locations.map((location) => ({ episode, location })));
  const [index, setIndex] = useState(() => Math.max(0, pages.findIndex((p) => p.location.id === profile.currentLocation)));
  const { episode, location } = pages[index];
  const species = speciesAt(location, episode);
  const caught = species.filter((s) => profile.album[s.id]).length;

  return (
    <section class="screen album" aria-label="Álbum">
      <div class="screen__top album__top">
        <h1 class="title-2">Álbum</h1>
        <p class="album__place">
          {location.name} · {caught} de {species.length}
        </p>
        <ul class="album__grid" aria-label="Espécies">
          {species.map((sp) => {
            const entry = profile.album[sp.id];
            return (
              <li key={sp.id} class={`album-cell${entry ? '' : ' album-cell--missing'}`}>
                <FishPicture species={sp} silhouette={!entry} />
                <p class="album-cell__name">{entry ? sp.name : '???'}</p>
                {entry && <p class="album-cell__record">Recorde: {formatKg(entry.recordKg)}</p>}
              </li>
            );
          })}
        </ul>
      </div>
      <div class="screen__actions album__actions">
        {pages.length > 1 && (
          <div class="pager">
            <button type="button" class="btn btn--secondary" onClick={() => setIndex((index - 1 + pages.length) % pages.length)}>
              <span aria-hidden="true">◀ </span>Anterior
            </button>
            <p class="pager__count" role="status">
              {index + 1} de {pages.length}
            </p>
            <button type="button" class="btn btn--secondary" onClick={() => setIndex((index + 1) % pages.length)}>
              Próximo<span aria-hidden="true"> ▶</span>
            </button>
          </div>
        )}
        <button type="button" class="btn" onClick={() => go('menu')}>
          Voltar
        </button>
      </div>
    </section>
  );
}
