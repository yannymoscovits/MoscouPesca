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
import { formatKg, formatMoney } from './format';
import { fishGuide } from '../domain/manual';
import { joinNames } from './DialogBox';
import type { FightStyle } from '../content/types';

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
  const [open, setOpen] = useState<Species | null>(null); // ALBUM-05: o manual do peixe tocado
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
                <button type="button" class="album-cell__open" aria-label={`Manual: ${entry ? sp.name : 'peixe ainda não pego'}`} onClick={() => setOpen(sp)}>
                  <div class="album-cell__art">
                    <FishPicture species={sp} silhouette={!entry} />
                    {entry && <Medals profile={profile} species={sp} />}
                  </div>
                  <p class="album-cell__name">
                    {entry ? sp.name : '???'} <span class="album-cell__more" aria-hidden="true">▸</span>
                  </p>
                  {/* Recorde e meta numa linha só, para a página caber; o resto está no manual (o toque). */}
                  {entry && (
                    <p class="album-cell__record">
                      {formatKg(entry.recordKg)} · {goalText(profile, sp)}
                    </p>
                  )}
                </button>
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
      {open && <FishManual species={open} caught={!!profile.album[open.id]} episodes={episodes} onClose={() => setOpen(null)} />}
    </section>
  );
}

const STYLES: Record<FightStyle, string> = {
  calmo: 'Calmo: se mexe pouco, perto da faixa',
  saltador: 'Saltador: pula de um lado pro outro da barra',
  afundador: 'Afundador: puxa sempre pra baixo',
};

/** ALBUM-05: o manual do peixe. O peixe que falta aparece em silhueta, mas o manual ensina a pegar. */
function FishManual({ species, caught, episodes, onClose }: { species: Species; caught: boolean; episodes: EpisodeContent[]; onClose: () => void }) {
  const guide = fishGuide(species, episodes);
  return (
    <div class="overlay manual" role="dialog" aria-modal="true" aria-labelledby="manual-nome">
      <article class="panel manual__card">
        <div class="manual__art">
          <FishPicture species={species} silhouette={!caught} />
        </div>
        <h2 id="manual-nome" class="manual__name">
          {species.name}
        </h2>
        {!caught && <p class="manual__missing">Ainda não pego</p>}
        <dl class="manual__facts">
          <dt>Onde achar</dt>
          <dd>
            {[...new Set(guide.spots.map((s) => s.place))].map((place) => (
              <span key={place} class="manual__spot">
                <small>{place}:</small>{' '}
                {guide.spots
                  .filter((s) => s.place === place)
                  .map((s) => (s.minReach > 0 ? `${s.spot} (alcance ${s.minReach}+)` : s.spot))
                  .join(', ')}
              </span>
            ))}
          </dd>
          <dt>Isca</dt>
          <dd>{joinNames(guide.baits.map((b) => b.name)).replace(/ e ([^,]+)$/, ' ou $1')}</dd>
          <dt>Vara</dt>
          <dd>{guide.rod ? (guide.rodRequired ? `Só com a ${guide.rod.name}` : `${guide.rod.name} ou melhor`) : 'A mais forte que tiver'}</dd>
          <dt>Briga</dt>
          <dd>
            <span class="manual__stars" aria-label={`Dificuldade ${guide.difficulty} de 5`}>
              {'★'.repeat(guide.difficulty)}
              <span class="manual__stars-off">{'★'.repeat(5 - guide.difficulty)}</span>
            </span>
            <br />
            {STYLES[guide.style]}
          </dd>
          <dt>Peso</dt>
          <dd>
            {species.kg.min === species.kg.max ? formatKg(species.kg.min) : `de ${formatKg(species.kg.min)} a ${formatKg(species.kg.max)}`}
            {!species.valueLabel && (
              <small>
                {' '}· vale {guide.value.min === guide.value.max ? formatMoney(guide.value.min) : `de ${formatMoney(guide.value.min)} a ${formatMoney(guide.value.max)}`}
              </small>
            )}
          </dd>
        </dl>
      </article>
      <div class="overlay__actions">
        <button type="button" class="btn btn--big" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
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
function goalText(profile: Profile, species: Species): string {
  const { count, next } = progress(profile, species.id, goals);
  return next === null ? `${count} peixes` : `${count} de ${next}`;
}
