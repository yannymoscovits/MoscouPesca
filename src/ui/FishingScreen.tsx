// Tela de pesca (design.md, "UI (Preact)"; pesca-bass, "Telas"): sem ponto escolhido, o pesqueiro
// (SpotScreen); com ponto, o canvas da cena escolhe a vista pela fase: de cima na mira, na força e no
// voo (castRenderer, com o respingo depois da queda) e de lado com a isca na água e na briga
// (underwaterRenderer). Por cima, em HTML: o painel com saldo e objetivo (HIST-04), os medidores, a
// barra de força e "Trocar de ponto" (CastHud), a barra de captura (CatchBar), os botões da pescaria
// (FishingButtons), o aviso "Escapou!" (ISCA-11), a pausa sempre à mão (SAVE-03), os arremessos do
// torneio (CAMP-03) e a tela acesa enquanto ela está aberta (TELA-01).

import { useContext, useLayoutEffect, useRef } from 'preact/hooks';
import { createLoop } from '../app/loop';
import { GameStoreContext, useGame, type GameStore } from '../app/store';
import type { ComponentChildren } from 'preact';
import type { EpisodeContent, Profile } from '../content/types';
import { aimAngleDeg, castDistanceM, powerAt } from '../domain/castAim';
import { rulesFor } from '../domain/pesca';
import { spotsFor } from '../domain/spots';
import { fishAt } from '../domain/school';
import { currentObjective } from '../domain/story';
import { score } from '../domain/tournament';
import { CAST_FLIGHT_S, SCHOOL_NOTICE_RADIUS_M } from '../domain/tuning';
import { createCastRenderer, SPLASH_S, type CastView } from '../render/castRenderer';
import { createUnderwaterRenderer } from '../render/underwaterRenderer';
import { useNav, useServices } from './context';
import { CastHud } from './CastHud';
import { CatchBar } from './CatchBar';
import { ImpactFx } from './Celebration';
import { DialogLayer } from './DialogBox';
import { ResultOverlay } from './FishCard';
import { FishingButtons } from './FishingButtons';
import { FishingGauges } from './FishingGauges';
import { EpisodeBanner } from './Letter';
import { currentPlace, formatKg, formatMoney } from './format';
import { PauseOverlay } from './Overlays';
import { SpotScreen } from './SpotScreen';
import { Pixels, TitleScene } from './TitleArt';
import { RivalTaunts, Standings } from './Tournament';
import { TutorialCoach } from './TutorialCoach';

/** Quanto o aviso "Escapou!" fica na tela depois da fisgada perdida (ISCA-11). */
export const NOTICE_S = 1.5;

export function FishingScreen() {
  const store = useContext(GameStoreContext) as GameStore;
  const { controller, browser, episodes } = useServices();
  const screen = useRef<HTMLElement>(null);
  // O cenário do local atual (EPI-04, EPI-08), o mesmo que os renderizadores desenham.
  const background = useGame((s) => currentPlace(s.profile, episodes).location.background);
  const paused = useGame((s) => s.paused);
  const atSpot = useGame((s) => s.spot !== null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const cast = createCastRenderer();
    const under = createUnderwaterRenderer();
    const size = () => ({ width: window.innerWidth, height: window.innerHeight });
    // ARREM-05: a pesca passa à água quando a isca cai; a vista de cima fica mais SPLASH_S com o respingo.
    let landed: { angleDeg: number; distanceM: number; atT: number | null } | null = null;

    const draw = (t: number) => {
      const s = store.getState();
      if (s.spot === null) return; // o pesqueiro tem o desenho dele
      const { location } = currentPlace(s.profile, episodes);
      const f = s.fishing;
      if (f.phase === 'Flying') landed = { angleDeg: f.angleDeg, distanceM: f.distanceM, atT: null };
      else if (f.phase !== 'Lure') landed = null;
      if (landed && f.phase === 'Lure') {
        landed.atT ??= t;
        if (t - landed.atT >= SPLASH_S) landed = null;
      }

      if (f.phase === 'Lure' || f.phase === 'Strike' || f.phase === 'Fight') {
        if (!landed) {
          under.draw({ place: location.id, pesca: f }, t);
          return;
        }
      }
      const sweepS = rulesFor(s.profile.settings.difficulty ?? 'tranquilo').sweepS;
      // A escala do arremesso segue a vara equipada; o ponto escolhido fica marcado na água, com
      // o cardume dele em sombras, cada peixe onde ele está de verdade (domain/school.ts).
      const allRods = episodes.flatMap((ep) => ep.rods);
      const rod = allRods.find((r) => r.id === s.profile.rods.equipped) ?? allRods[0];
      const zone = location.zones.find((z) => z.id === s.spot) ?? null;
      const school = s.school;
      const view: CastView = {
        background: location.background,
        place: location.id,
        spots: [],
        aim: null,
        flight: null,
        maxM: castDistanceM(1, rod.reach),
        zone,
        school: school?.fish.map((sf) => ({
          id: sf.id,
          ...fishAt(sf, school.tS),
          sprite: sf.species.sprite,
          kgMax: sf.species.kg.max,
        })),
        noticeM: SCHOOL_NOTICE_RADIUS_M,
      };
      if (f.phase === 'Aim') view.aim = { angleDeg: aimAngleDeg(f.sinceS, sweepS), locked: false };
      // Na força, o X mostra onde a isca cairia com a força de agora (a barra ↔ a distância).
      if (f.phase === 'Power') view.aim = { angleDeg: f.angleDeg, locked: true, previewM: castDistanceM(powerAt(f.sinceS, sweepS), rod.reach) };
      if (f.phase === 'Flying') view.flight = { angleDeg: f.angleDeg, distanceM: f.distanceM, sinceS: f.sinceS };
      if (landed?.atT != null) view.flight = { angleDeg: landed.angleDeg, distanceM: landed.distanceM, sinceS: CAST_FLIGHT_S + t - landed.atT };
      cast.draw(view, t);
    };
    cast.mount(canvas.current!, size());
    under.mount(canvas.current!, size());

    // `controller.tick` é lido a cada quadro: o relógio manual dos testes troca essa função.
    const loop = createLoop({ tick: (dt) => controller.tick(dt), draw, isPaused: () => store.getState().paused });
    // A pausa para o laço (SAVE-01); ao retomar, ele volta a rodar. Só na volta da pausa: chamar
    // `start` a cada mudança, de dentro do próprio quadro, agendava um quadro a mais a cada tick.
    let wasPaused = store.getState().paused;
    const unsubscribe = store.subscribe(() => {
      const now = store.getState().paused;
      if (wasPaused && !now) loop.start();
      wasPaused = now;
    });
    const onResize = () => {
      cast.resize(size());
      under.resize(size());
      draw(performance.now() / 1000); // redimensionar apaga o canvas, mesmo pausado
    };
    window.addEventListener('resize', onResize);

    // Os botões dos pontos ficam abaixo do painel e da dica da Jane (--spots-top).
    const top = screen.current!.querySelector<HTMLElement>('.hud__top');
    const markTop = () => screen.current?.style.setProperty('--spots-top', `${top?.getBoundingClientRect().bottom ?? 0}px`);
    const watcher = typeof ResizeObserver === 'undefined' || !top ? null : new ResizeObserver(markTop);
    watcher?.observe(top!);
    markTop();

    controller.openFishing();
    void browser.keepScreenOn(true); // TELA-01
    loop.start();
    return () => {
      window.removeEventListener('resize', onResize);
      watcher?.disconnect();
      unsubscribe();
      loop.stop();
      cast.destroy();
      under.destroy();
      void browser.keepScreenOn(false);
    };
  }, [store, controller, browser, episodes]);

  return (
    <section class="fishing" aria-label="Pescaria" ref={screen} data-paused={paused ? 'true' : undefined}>
      {/* O fundo do mar da tela inicial; pausado, as animações dele param junto com o desenho. */}
      <TitleScene />
      {!atSpot && <Spots paused={paused} />}
      <div class="stage" data-background={background} hidden={!atSpot}>
        <canvas ref={canvas} aria-hidden="true" />
      </div>
      {atSpot && <PescaControls />}
      <Hud atSpot={atSpot} />
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

/** PONTO-01 a PONTO-04: o pesqueiro do local atual, com os pontos da vara equipada. */
function Spots({ paused }: { paused: boolean }) {
  const { controller, episodes } = useServices();
  const profile = useGame((s) => s.profile);
  const { episode, location } = currentPlace(profile, episodes);
  const allRods = episodes.flatMap((ep) => ep.rods);
  const rod = allRods.find((r) => r.id === profile.rods.equipped) ?? allRods[0];
  return (
    <SpotScreen
      place={location.id}
      background={location.background}
      spots={spotsFor(location, rod, episode.species, profile.album)}
      chooseSpot={(id) => controller.chooseSpot(id)}
      paused={paused}
    />
  );
}

/** O que fica por cima da cena no ponto: força, captura, aviso e os botões (por último: acima da cena). */
function PescaControls() {
  const { controller } = useServices();
  const fishing = useGame((s) => s.fishing);
  const sweepS = useGame((s) => rulesFor(s.profile.settings.difficulty ?? 'tranquilo').sweepS);
  // A classificação do torneio, a carta e o aviso do episódio ficam por cima: os botões esperam por eles.
  const covered = useGame((s) => s.tournamentResult !== null || s.notice !== null);
  const escaped = fishing.phase === 'Lure' && fishing.notice !== null && fishing.notice.sinceS < NOTICE_S;
  if (covered) return null;
  return (
    <>
      <CastHud pesca={fishing} sweepS={sweepS} leaveSpot={() => controller.leaveSpot()} />
      {fishing.phase === 'Fight' && <CatchBar bar={fishing.bar} />}
      {escaped && (
        <p class="pesca-notice" role="status">
          {fishing.notice!.text}
        </p>
      )}
      <FishingButtons
        phase={fishing.phase}
        onButton={(b) => controller.pressButton(b)}
        onHoldStart={() => controller.holdStart()}
        onHoldEnd={() => controller.holdEnd()}
      />
    </>
  );
}

function Hud({ atSpot }: { atSpot: boolean }) {
  const { controller, episodes } = useServices();
  const go = useNav();
  const profile = useGame((s) => s.profile);
  const { episode, location } = currentPlace(profile, episodes);
  const run = profile.tournament;
  const tournament = run && episodes.find((ep) => ep.tournament.id === run.id)?.tournament;

  return (
    <div class="hud">
      <div class="hud__top">
        {/* Mockup do pesqueiro: a moeda numa pílula e o local numa placa de madeira, em cima; vara,
            isca e objetivo num cartão embaixo, com um peixinho por peixe pedido. */}
        <div class="hud__panel" role="group" aria-label="Painel da pescaria">
          <p class="hud__line hud__line--top">
            <span class="hud__item hud__coin">
              <HudIcon rows={COIN} />
              <span class="hud__money">{formatMoney(profile.money)}</span>
            </span>
            <span class="hud__place plaque">{location.name}</span>
          </p>
          <div class="hud__info">
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
              {!run && <ObjectivePips profile={profile} episode={episode} />}
            </p>
          </div>
        </div>
        <TutorialCoach />
      </div>
      {/* No pesqueiro, os medidores cobririam os pontos; a vara e a isca já estão no painel. */}
      {atSpot ? <FishingGauges /> : <div />}
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

/**
 * Os peixinhos do objetivo (mockup do pesqueiro): um por peixe pedido, cheios até o progresso.
 * Só com contagem de 2 a 6; desenhados no CSS, sem texto (a contagem já está escrita ao lado).
 */
function ObjectivePips({ profile, episode }: { profile: Profile; episode: EpisodeContent }) {
  const objective = currentObjective(profile.story, episode);
  const count = objective?.count ?? 1;
  if (!objective || count < 2 || count > 6) return null;
  const done = Math.min(count, profile.story.episodes[episode.id]?.progress ?? 0);
  return (
    <span class="hud__pips" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} class="hud__pip" data-filled={i < done ? 'true' : 'false'} />
      ))}
    </span>
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
