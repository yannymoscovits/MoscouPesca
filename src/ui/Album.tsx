// Álbum de peixes (design.md, "UI (Preact)", Album; ALBUM-03): uma página por local dos episódios
// liberados, começando pelo local atual. Espécie pega mostra o desenho, o recorde, as medalhas e a
// contagem rumo à próxima meta (MEDAL-06); a que falta, uma silhueta com "???".

import { useState } from 'preact/hooks';
import { useGame } from '../app/store';
import { goals } from '../content/goals';
import type { EpisodeContent, Location, Profile, Species } from '../content/types';
import { progress, TIERS } from '../domain/medals';
import { isUnlocked } from '../domain/world';
import { useNav, useServices } from './context';
import { FishPicture, MedalIcon } from './FishCard';
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
                <div class="album-cell__art">
                  <FishPicture species={sp} silhouette={!entry} />
                  {entry && <Medals profile={profile} species={sp} />}
                </div>
                <p class="album-cell__name">{entry ? sp.name : '???'}</p>
                {entry && <p class="album-cell__record">Recorde: {formatKg(entry.recordKg)}</p>}
                {entry && <GoalCount profile={profile} species={sp} />}
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

/** MEDAL-06: as três medalhas da espécie; as que faltam ficam vazias. */
function Medals({ profile, species }: { profile: Profile; species: Species }) {
  const { medals } = progress(profile, species.id, goals);
  return (
    <span class="album-cell__medals">
      {TIERS.map((tier) => (
        <MedalIcon key={tier} tier={tier} earned={medals.includes(tier)} />
      ))}
    </span>
  );
}

/** MEDAL-06: "10 de 25" rumo à próxima meta; depois da última, só quantos já pegou. */
function GoalCount({ profile, species }: { profile: Profile; species: Species }) {
  const { count, next } = progress(profile, species.id, goals);
  return <p class="album-cell__goal">{next === null ? `${count} peixes` : `${count} de ${next}`}</p>;
}
