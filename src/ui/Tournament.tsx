// Telas do torneio (design.md, "UI (Preact)"): o lobby, bloqueado ou aberto (TournamentLobby: CAMP-01,
// CAMP-02), as provocações dos rivais antes do primeiro arremesso (RivalTaunts: HUMOR-04) e a
// classificação no fim dos 8 arremessos (Standings: CAMP-05, CAMP-09). Os três usam as mesmas
// regras para os 5 campeonatos; só o conteúdo muda.

import { useState } from 'preact/hooks';
import { useGame } from '../app/store';
import { speakersOf } from '../content/characters';
import type { EpisodeContent, TournamentDef, TournamentRun } from '../content/types';
import { currentObjective, isTournamentUnlocked } from '../domain/story';
import { score, type Standing } from '../domain/tournament';
import { useNav, useServices } from './context';
import { CharacterIntroCard, characterById, DialogBox, Portrait } from './DialogBox';
import { currentPlace, formatKg } from './format';
import { LetterView } from './Letter';

/** O campeonato do torneio em andamento, ou o do episódio do local atual. */
function tournamentOf(run: TournamentRun | null, episode: EpisodeContent, episodes: EpisodeContent[]): TournamentDef {
  return (run && episodes.find((ep) => ep.tournament.id === run.id)?.tournament) || episode.tournament;
}

export function TournamentLobby() {
  const { controller, episodes } = useServices();
  const go = useNav();
  const profile = useGame((s) => s.profile);
  const { episode } = currentPlace(profile, episodes);
  const run = profile.tournament;
  const def = tournamentOf(run, episode, episodes);
  const open = isTournamentUnlocked(profile.story, episode);
  const missing = currentObjective(profile.story, episode);
  const won = profile.story.episodes[episode.id]?.won ?? false;

  function enter() {
    controller.enterTournament();
    go('fishing');
  }

  return (
    <section class="screen lobby" aria-label="Campeonato">
      <div class="screen__top lobby__top">
        <h1 class="title-2 lobby__name">{def.name}</h1>
        {run ? (
          <p class="lobby__status">
            Em andamento: restam {run.castsLeft} de {def.casts} arremessos · {formatKg(score(run))}
          </p>
        ) : !open ? (
          <div class="panel lobby__locked">
            <p class="lobby__lock">
              <span aria-hidden="true">🔒 </span>Bloqueado
            </p>
            {missing && <p>Falta: {missing.text}</p>}
          </div>
        ) : (
          <>
            {won && <p class="lobby__status">Você já venceu esta copa. Dá para disputar de novo!</p>}
            <ul class="lobby__rules" aria-label="Regras">
              <li>{def.casts} arremessos, sem pressa.</li>
              <li>Vale a soma dos {def.countBest} peixes mais pesados.</li>
            </ul>
            <ul class="lobby__rivals" aria-label="Rivais">
              {def.rivals.map((r) => {
                const c = characterById(r.character);
                return (
                  <li key={c.id} class="lobby__rival">
                    <Portrait character={c} expression="normal" />
                    <p>
                      <strong>{c.name}</strong>
                      <br />
                      <span class="lobby__epithet">{c.epithet}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      <div class="screen__actions">
        {run ? (
          <button type="button" class="btn btn--big" onClick={() => go('fishing')}>
            Continuar o campeonato
          </button>
        ) : (
          open && (
            <button type="button" class="btn btn--big" onClick={enter}>
              Entrar no campeonato
            </button>
          )
        )}
        <button type="button" class="btn btn--secondary" onClick={() => go('menu')}>
          Voltar
        </button>
      </div>
    </section>
  );
}

/**
 * HUMOR-04: com o torneio recém-começado (nenhum arremesso gasto), cada rival provoca uma vez, na
 * ordem do conteúdo. A caixa cobre a cena: o toque passa a provocação em vez de arremessar.
 * Rival que aparece pela primeira vez ganha antes o cartão de apresentação (HUMOR-01).
 */
export function RivalTaunts() {
  const { controller, episodes } = useServices();
  const run = useGame((s) => s.profile.tournament);
  const introduced = useGame((s) => s.profile.charactersIntroduced);
  const busy = useGame((s) => s.paused || s.profile.story.pendingScene !== null || s.fishing.phase !== 'Idle' || s.tournamentResult !== null);
  // Até onde as provocações deste torneio já foram vistas; um torneio novo (Tentar de novo) recomeça.
  const [seen, setSeen] = useState<{ run: TournamentRun | null; count: number }>({ run: null, count: 0 });
  const def = run && episodes.find((ep) => ep.tournament.id === run.id)?.tournament;
  if (!run || !def || busy || run.castsLeft < def.casts) return null;

  const count = seen.run === run ? seen.count : 0;
  const rival = def.rivals[count];
  if (!rival) return null;
  const newcomer = speakersOf(rival.taunt).find((id) => !introduced.includes(id));
  if (newcomer) return <CharacterIntroCard character={characterById(newcomer)} onClose={() => controller.introduce(newcomer)} />;
  return <DialogBox line={rival.taunt} onNext={() => setSeen({ run, count: count + 1 })} />;
}

const nameIn = (s: Standing) => (s.isPlayer ? 'Você' : characterById(s.character).name);

/**
 * CAMP-05, CAMP-09: classificação final, depois da ficha ou do aviso do 8º arremesso. Na primeira
 * vitória, o "Continuar" abre a carta da família (CAMP-06); a cena de encerramento vem depois dela.
 */
export function Standings() {
  const { controller, episodes } = useServices();
  const result = useGame((s) => s.tournamentResult);
  const profile = useGame((s) => s.profile);
  const showingCast = useGame((s) => s.fishing.phase.startsWith('Result_'));
  // Só a primeira vitória traz o aviso do episódio (HIST-08, HIST-10); a revanche não reabre a carta.
  const firstWin = useGame((s) => s.notice !== null);
  const [reading, setReading] = useState(false);
  if (!result || showingCast) return null;

  const { episode } = currentPlace(profile, episodes);
  if (reading && result.won) {
    const done = () => {
      setReading(false);
      controller.dismissTournamentResult();
    };
    return <LetterView message={episode.letter} onDone={done} inFishing />;
  }
  const place = result.standings.findIndex((s) => s.isPlayer) + 1;
  const taunt = episode.scenes.find((sc) => sc.id === episode.defeatScene)?.lines[0];

  return (
    <div class="overlay overlay--fishing standings" role="dialog" aria-modal="true" aria-label="Classificação">
      <div class="panel standings__panel">
        <h2 class="title-2">{result.won ? `Você venceu a ${episode.tournament.name}!` : `Você ficou em ${place}º lugar`}</h2>
        <ol class="standings__list" aria-label="Classificação">
          {result.standings.map((s, i) => (
            <li key={nameIn(s)} class={s.isPlayer ? 'standings__row standings__row--you' : 'standings__row'}>
              <span class="standings__place">{i + 1}º</span>
              <span class="standings__who">{nameIn(s)}</span>
              <span>{formatKg(s.kg)}</span>
            </li>
          ))}
        </ol>
        {!result.won && taunt && (
          <p class="standings__taunt">
            <strong>{speakersOf(taunt).map((id) => characterById(id).name).join(' e ')}:</strong> {taunt.text}
          </p>
        )}
      </div>
      <div class="overlay__actions">
        {result.won ? (
          <button
            type="button"
            class="btn btn--big"
            onClick={() => (firstWin ? setReading(true) : controller.dismissTournamentResult())}
          >
            Continuar
          </button>
        ) : (
          <>
            <button type="button" class="btn btn--big" onClick={() => controller.retryTournament()}>
              Tentar de novo
            </button>
            <button type="button" class="btn btn--secondary" onClick={() => controller.dismissTournamentResult()}>
              Agora não
            </button>
          </>
        )}
      </div>
    </div>
  );
}
