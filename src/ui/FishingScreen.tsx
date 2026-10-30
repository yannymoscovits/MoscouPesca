// Tela de pesca (design.md, "UI (Preact)"): o canvas da cena com o HUD em HTML por cima.
// Saldo e objetivo (HIST-04), barra de tensão (PESCA-12), pausa sempre à mão (SAVE-03),
// arremessos e pontos do torneio (CAMP-03) e a tela acesa enquanto ela está aberta (TELA-01).

import { useContext, useLayoutEffect, useRef } from 'preact/hooks';
import { attachInput } from '../app/input';
import { createLoop } from '../app/loop';
import { GameStoreContext, useGame, type GameStore } from '../app/store';
import type { EpisodeContent, Profile } from '../content/types';
import { tensionBand } from '../domain/fishing';
import { currentObjective } from '../domain/story';
import { score } from '../domain/tournament';
import { createFishingRenderer } from '../render/fishingRenderer';
import { useNav, useServices } from './context';
import { DialogLayer } from './DialogBox';
import { BitePrompt, ResultOverlay } from './FishCard';
import { currentPlace, formatKg, formatMoney } from './format';
import { PauseOverlay } from './Overlays';
import { TutorialCoach } from './TutorialCoach';

export function FishingScreen() {
  const store = useContext(GameStoreContext) as GameStore;
  const { controller, browser, episodes } = useServices();
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  // Layout effect: a cena já aceita toques no mesmo quadro em que aparece.
  useLayoutEffect(() => {
    const renderer = createFishingRenderer();
    const size = () => ({ width: window.innerWidth, height: window.innerHeight });
    const view = () => {
      const s = store.getState();
      return { fishing: s.fishing, background: currentPlace(s.profile, episodes).location.background };
    };
    const draw = (t: number) => renderer.draw(view(), t);
    renderer.mount(canvas.current!, size());

    // `controller.tick` é lido a cada quadro: o relógio manual dos testes troca essa função.
    const loop = createLoop({ tick: (dt) => controller.tick(dt), draw, isPaused: () => store.getState().paused });
    const detach = attachInput(stage.current!, { controller, getState: store.getState, toLogical: renderer.toLogical });
    // A pausa para o laço (SAVE-01); ao retomar, ele volta a rodar.
    const unsubscribe = store.subscribe(() => {
      if (!store.getState().paused) loop.start();
    });
    const onResize = () => {
      renderer.resize(size());
      draw(performance.now() / 1000); // redimensionar apaga o canvas, mesmo pausado
    };
    window.addEventListener('resize', onResize);

    controller.openFishing();
    void browser.keepScreenOn(true); // TELA-01
    loop.start();
    return () => {
      window.removeEventListener('resize', onResize);
      unsubscribe();
      detach();
      loop.stop();
      void browser.keepScreenOn(false);
    };
  }, [store, controller, browser, episodes]);

  return (
    <section class="fishing" aria-label="Pescaria">
      <div class="stage" ref={stage}>
        <canvas ref={canvas} aria-hidden="true" />
        <BitePrompt />
      </div>
      <Hud />
      <ResultOverlay />
      <DialogLayer />
      <PauseOverlay />
    </section>
  );
}

function Hud() {
  const { controller, episodes } = useServices();
  const go = useNav();
  const profile = useGame((s) => s.profile);
  const { episode } = currentPlace(profile, episodes);
  const run = profile.tournament;
  const tournament = run && episodes.find((ep) => ep.tournament.id === run.id)?.tournament;

  return (
    <div class="hud">
      <div class="hud__top">
        <div class="hud__panel" role="group" aria-label="Painel da pescaria">
          <p class="hud__money">{formatMoney(profile.money)}</p>
          {run ? (
            <p>
              {tournament?.name}: restam {run.castsLeft} de {tournament?.casts ?? 8} arremessos · {formatKg(score(run))}
            </p>
          ) : (
            <p>{objectiveText(profile, episode)}</p>
          )}
          <TensionBar />
        </div>
        <TutorialCoach />
      </div>
      <div class="hud__actions">
        <button type="button" class="btn btn--secondary" onClick={() => controller.pause()}>
          Pausar
        </button>
        <button type="button" class="btn btn--secondary" onClick={() => go('title')}>
          Menu
        </button>
      </div>
    </div>
  );
}

/** HIST-04: o objetivo atual, com a contagem quando ele pede mais de um ("1 de 3"). */
function objectiveText(profile: Profile, episode: EpisodeContent): string {
  const objective = currentObjective(profile.story, episode);
  const st = profile.story.episodes[episode.id];
  if (!objective) {
    return st?.won ? 'Pescaria livre: todos os lugares abertos' : `Objetivo: vencer a ${episode.tournament.name}`;
  }
  const count = objective.count ?? 1;
  return `Objetivo: ${objective.text}${count > 1 ? ` · ${st?.progress ?? 0} de ${count}` : ''}`;
}

/** PESCA-12: de 0 a 100; verde abaixo de 70, amarela de 70 a 89, vermelha de 90 a 100. */
function TensionBar() {
  const tension = useGame((s) => (s.fishing.phase === 'Fight' ? s.fishing.tension : null));
  if (tension === null) return null;
  return (
    <div class="tension">
      <span class="tension__label">Tensão</span>
      <div
        class="tension__bar"
        role="meter"
        aria-label="Tensão da linha"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(tension)}
        data-band={tensionBand(tension)}
      >
        <div class="tension__fill" data-fill style={{ width: `${tension}%` }} />
      </div>
    </div>
  );
}
