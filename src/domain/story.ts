// História: cenas e objetivos de cada episódio, avançados por eventos do jogo (design.md, "Domain: story").

import type { Episode, EpisodeId, GameEvent, Objective, Profile, SceneId } from '../content/types';

export type StoryProgress = Profile['story'];
type EpisodeStory = NonNullable<StoryProgress['episodes'][EpisodeId]>;

export interface StoryOutcome {
  progress: StoryProgress;
  sceneToShow?: SceneId;
  notice?: string; // aviso depois da cena (HIST-08, HIST-10)
}

/** Episódio da Copa Adilson Moscovits; vencer ele encerra a história (HIST-10). */
export const LAST_EPISODE: EpisodeId = 5;

const FRESH: EpisodeStory = { objectiveIndex: 0, progress: 0, won: false };

function episodeStory(p: StoryProgress, ep: Episode): EpisodeStory {
  return p.episodes[ep.id] ?? FRESH;
}

function withEpisode(p: StoryProgress, ep: Episode, st: EpisodeStory): StoryProgress {
  return { ...p, episodes: { ...p.episodes, [ep.id]: st } };
}

function show(p: StoryProgress, scene: SceneId): StoryProgress {
  return { ...p, scenesSeen: [...p.scenesSeen, scene] };
}

/** HIST-05: passa ao objetivo seguinte e mostra a cena; os itens que ele libera aparecem na loja (HIST-11). */
function complete(p: StoryProgress, ep: Episode, st: EpisodeStory, objective: Objective): StoryOutcome {
  const next = { ...st, objectiveIndex: st.objectiveIndex + 1, progress: 0 };
  return { progress: show(withEpisode(p, ep, next), objective.sceneOnDone), sceneToShow: objective.sceneOnDone };
}

/** HIST-04: objetivo atual do episódio; null quando todos foram cumpridos. */
export function currentObjective(p: StoryProgress, ep: Episode): Objective | null {
  return ep.chapter.objectives[episodeStory(p, ep).objectiveIndex] ?? null;
}

/** CAMP-01: o campeonato só libera depois do último objetivo. */
export function isTournamentUnlocked(p: StoryProgress, ep: Episode): boolean {
  return episodeStory(p, ep).objectiveIndex >= ep.chapter.objectives.length;
}

/**
 * Avança a história do episódio `ep` com um evento.
 * `GameStarted` é enviado quando a pesca de um episódio abre: mostra a abertura na primeira vez (HIST-01, HIST-09).
 * Um evento cumpre no máximo o objetivo atual, então eventos fora de ordem não pulam objetivos.
 */
// SPEC_DEVIATION: recebe o Profile inteiro em vez de StoryProgress.
// Reason: Objective.done(e, p) precisa do perfil (ex.: álbum completo); o retorno continua sendo só a história.
export function onEvent(profile: Profile, e: GameEvent, ep: Episode): StoryOutcome {
  const story = profile.story;
  const st = episodeStory(story, ep);

  if (e.type === 'GameStarted') {
    const scene = ep.chapter.openingScene;
    if (!story.scenesSeen.includes(scene)) return { progress: show(withEpisode(story, ep, st), scene), sceneToShow: scene };
    const objective = currentObjective(story, ep);
    if (!objective?.satisfied?.(profile)) return { progress: story };
    return complete(story, ep, st, objective);
  }

  if (e.type === 'TournamentWon') {
    if (e.id !== ep.tournament.id || st.won) return { progress: story }; // HIST-08: só a primeira vitória
    const scene = ep.chapter.closingScene;
    const notice =
      ep.id < LAST_EPISODE ? `Episódio ${ep.id + 1} liberado!` : 'A pescaria continua: todos os lugares seguem abertos';
    return { progress: show(withEpisode(story, ep, { ...st, won: true }), scene), sceneToShow: scene, notice };
  }

  const objective = currentObjective(story, ep);
  if (!objective || !objective.done(e, profile)) return { progress: story };
  const progress = st.progress + 1;
  if (progress < (objective.count ?? 1)) return { progress: withEpisode(story, ep, { ...st, progress }) };
  return complete(story, ep, st, objective);
}
