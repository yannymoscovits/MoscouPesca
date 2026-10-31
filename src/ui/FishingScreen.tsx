// Tela de pesca (design.md, "UI (Preact)"; mockup docs/arte/mockups/tela-de-pesca-v2.png): o fundo do
// mar da tela inicial, o canvas da cena por cima e o HUD em HTML. Saldo e objetivo (HIST-04), barra de
// tensão (PESCA-12), medidores da pescaria (T80), pausa sempre à mão (SAVE-03), arremessos e pontos do
// torneio (CAMP-03) e a tela acesa enquanto ela está aberta (TELA-01).

import { useContext, useLayoutEffect, useRef } from 'preact/hooks';
import { attachInput } from '../app/input';
import { createLoop } from '../app/loop';
import { GameStoreContext, useGame, type GameStore } from '../app/store';
import type { ComponentChildren } from 'preact';
import type { EpisodeContent, Profile } from '../content/types';
import { tensionBand } from '../domain/fishing';
import { currentObjective } from '../domain/story';
import { score } from '../domain/tournament';
import { createFishingRenderer } from '../render/fishingRenderer';
import { useNav, useServices } from './context';
import { ImpactFx } from './Celebration';
import { DialogLayer } from './DialogBox';
import { BitePrompt, ResultOverlay } from './FishCard';
import { FishingGauges } from './FishingGauges';
import { EpisodeBanner } from './Letter';
import { currentPlace, formatKg, formatMoney } from './format';
import { PauseOverlay } from './Overlays';
import { Pixels, TitleScene } from './TitleArt';
import { RivalTaunts, Standings } from './Tournament';
import { TutorialCoach } from './TutorialCoach';

export function FishingScreen() {
  const store = useContext(GameStoreContext) as GameStore;
  const { controller, browser, episodes } = useServices();
  const screen = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  // O cenário do local atual (EPI-04, EPI-08), o mesmo que o renderizador desenha.
  const background = useGame((s) => currentPlace(s.profile, episodes).location.background);
  const paused = useGame((s) => s.paused);
  const canvas = useRef<HTMLCanvasElement>(null);

  // Layout effect: a cena já aceita toques no mesmo quadro em que aparece.
  useLayoutEffect(() => {
    const renderer = createFishingRenderer();
    const size = () => ({ width: window.innerWidth, height: window.innerHeight });
    const view = () => {
      const s = store.getState();
      const { location } = currentPlace(s.profile, episodes);
      return { fishing: s.fishing, background: location.background, place: location.id };
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
    <section class="fishing" aria-label="Pescaria" ref={screen} data-paused={paused ? 'true' : undefined}>
      {/* O fundo do mar da tela inicial; pausado, as animações dele param junto com o desenho. */}
      <TitleScene />
      <div class="stage" ref={stage} data-background={background}>
        <canvas ref={canvas} aria-hidden="true" />
        <BitePrompt />
      </div>
      <Hud />
      <ResultOverlay />
      <Standings />
      <ImpactFx scene={screen} />
      <DialogLayer />
      <EpisodeBanner />
      <RivalTaunts />
      <PauseOverlay />
    </section>
  );
}

function Hud() {
  const { controller, episodes } = useServices();
  const go = useNav();
  const profile = useGame((s) => s.profile);
  const { episode, location } = currentPlace(profile, episodes);
  const run = profile.tournament;
  const tournament = run && episodes.find((ep) => ep.tournament.id === run.id)?.tournament;

  return (
    <div class="hud">
      <div class="hud__top">
        <div class="hud__panel" role="group" aria-label="Painel da pescaria">
          <p class="hud__line">
            <span class="hud__item">
              <HudIcon rows={COIN} />
              <span class="hud__money">{formatMoney(profile.money)}</span>
            </span>
            <span class="hud__place">{location.name}</span>
          </p>
          <p class="hud__line hud__gear">
            <HudIcon rows={PIN} />
            <span>{gear(profile, episodes)}</span>
          </p>
          <p class="hud__line">
            <HudIcon rows={TARGET} />
            {run ? (
              <span>
                {tournament?.name}: restam {run.castsLeft} de {tournament?.casts ?? 8} arremessos · {formatKg(score(run))}
              </span>
            ) : (
              <span>{objectiveText(profile, episode)}</span>
            )}
          </p>
          <TensionBar />
        </div>
        <TutorialCoach />
      </div>
      <FishingGauges />
      <div class="hud__actions">
        <button type="button" class="btn btn--secondary hud__btn" onClick={() => controller.pause()}>
          <ButtonIcon>
            <rect x="2" y="1" width="3" height="10" />
            <rect x="7" y="1" width="3" height="10" />
          </ButtonIcon>
          <span>Pausar</span>
        </button>
        <button type="button" class="btn btn--secondary hud__btn" onClick={() => go('menu')}>
          <ButtonIcon>
            <rect x="1" y="1" width="10" height="2" />
            <rect x="1" y="5" width="10" height="2" />
            <rect x="1" y="9" width="10" height="2" />
          </ButtonIcon>
          <span>Menu</span>
        </button>
      </div>
    </div>
  );
}

// Ícones do painel, em pixel (10 × 10): moeda, alfinete do local e alvo do objetivo.
const ICON_COLORS = {
  k: '#000c22',
  y: '#ffd23f',
  h: '#fff1a8',
  o: '#e09a1f',
  R: '#e8453c',
  w: '#ffffff',
};
const COIN = ['..kkkkkk..', '.kyyyyyyk.', 'kyhhyyyyok', 'kyhyyyyyok', 'kyhyyyyyok', 'kyyyyyyyok', 'kyyyyyyyok', 'kyyyyyyook', '.kyoooook.', '..kkkkkk..'];
const PIN = ['..kkkkkk..', '.kRRRRRRk.', 'kRRRwwRRRk', 'kRRwwwwRRk', 'kRRwwwwRRk', 'kRRRwwRRRk', '.kRRRRRRk.', '..kRRRRk..', '...kRRk...', '....kk....'];
const TARGET = ['..kkkkkk..', '.kRRRRRRk.', 'kRRwwwwRRk', 'kRwwRRwwRk', 'kRwRRRRwRk', 'kRwRRRRwRk', 'kRwwRRwwRk', 'kRRwwwwRRk', '.kRRRRRRk.', '..kkkkkk..'];

function HudIcon({ rows }: { rows: string[] }) {
  return (
    <svg class="hud__icon" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">
      <Pixels rows={rows} colors={ICON_COLORS} />
    </svg>
  );
}

/** Ícone dos botões do píer (12 × 12, na cor do texto): barras da pausa e o menu de três traços. */
function ButtonIcon({ children }: { children: ComponentChildren }) {
  return (
    <svg class="hud__btn-icon" viewBox="0 0 12 12" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">
      {children}
    </svg>
  );
}

/** Vara e isca equipadas (EQUIP-05): "Vara de Fibra · Minhoca". */
function gear(profile: Profile, episodes: EpisodeContent[]): string {
  const name = (id: string, items: { id: string; name: string }[]) => items.find((i) => i.id === id)?.name ?? id;
  const rod = name(profile.rods.equipped, episodes.flatMap((ep) => ep.rods));
  const bait = name(profile.baits.equipped, episodes.flatMap((ep) => ep.baits));
  return `${rod} · ${bait}`;
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
