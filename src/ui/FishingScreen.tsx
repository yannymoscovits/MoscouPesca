// Tela de pesca (design.md, "UI (Preact)"; pesca-bass, "Telas"): sem ponto escolhido, o pesqueiro
// (SpotScreen); com ponto, o canvas da cena escolhe a vista pela fase: de cima na mira, na força e no
// voo (castRenderer, com o respingo depois da queda) e de lado com a isca na água e na briga
// (underwaterRenderer). Por cima, em HTML: o painel com saldo e objetivo (HIST-04), os medidores, a
// barra de força e "Trocar de ponto" (CastHud), a barra de captura (CatchBar), os botões da pescaria
// (FishingButtons), o aviso "Escapou!" (ISCA-11), a pausa sempre à mão (SAVE-03), os arremessos do
// torneio (CAMP-03) e a tela acesa enquanto ela está aberta (TELA-01).

import { newInShop } from '../domain/world';
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { createLoop } from '../app/loop';
import { GameStoreContext, useGame, type GameState, type GameStore } from '../app/store';
import type { EpisodeContent, Profile } from '../content/types';
import { aimAngleDeg, castDistanceM, powerAt } from '../domain/castAim';
import { rulesFor } from '../domain/pesca';
import { rules as tutorialRules } from '../domain/tutorialPesca';
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

/** Ciclo da seta e da barra de força como a pesca usa: o do tutorial (mais lento) ou o da dificuldade. */
function sweepOf(s: GameState): number {
  const d = s.profile.settings.difficulty ?? 'tranquilo';
  return (s.tutorial ? tutorialRules(s.tutorial, d) : rulesFor(d)).sweepS;
}

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
      const sweepS = sweepOf(s); // a mesma velocidade da regra: no tutorial, mais devagar (TUTOB-07)
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
          size: sf.species.kg.max > sf.species.kg.min ? sf.size : 1,
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
      markTop();
    };
    window.addEventListener('resize', onResize);

    // Os botões dos pontos ficam abaixo do painel e da dica da Jane (--spots-top).
    const top = screen.current!.querySelector<HTMLElement>('.hud__top');
    const actions = screen.current!.querySelector<HTMLElement>('.hud__actions');
    const markTop = () => {
      const origin = screen.current?.getBoundingClientRect().top ?? 0;
      const bottom = Math.max(top?.getBoundingClientRect().bottom ?? 0, actions?.getBoundingClientRect().bottom ?? 0);
      screen.current?.style.setProperty('--spots-top', `${Math.max(0, bottom - origin)}px`);
    };
    const watcher = typeof ResizeObserver === 'undefined' || !top ? null : new ResizeObserver(markTop);
    watcher?.observe(top!);
    if (actions) watcher?.observe(actions);
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
      spots={spotsFor(
        location,
        rod,
        episode.species,
        profile.album,
        profile.baits.owned,
        (id) => episodes.flatMap((ep) => ep.baits).find((b) => b.id === id)?.name ?? id,
        profile.rods.owned,
        (id) => episodes.flatMap((ep) => ep.rods).find((r) => r.id === id)?.name ?? id,
      )}
      chooseSpot={(id) => controller.chooseSpot(id)}
      paused={paused}
    />
  );
}

/** O que fica por cima da cena no ponto: força, captura, aviso e os botões (por último: acima da cena). */
function PescaControls() {
  const { controller } = useServices();
  const fishing = useGame((s) => s.fishing);
  const sweepS = useGame(sweepOf);
  const tutorialOn = useGame((s) => s.tutorial !== null);
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
      {(fishing.phase === 'Fight' || fishing.phase === 'Strike') && !tutorialOn && <ReleaseButton onRelease={() => controller.releaseFish()} />}
    </>
  );
}

/** BRIGA-17: desistir do peixe. O primeiro toque pergunta; o segundo, em até 3 s, solta. */
function ReleaseButton({ onRelease }: { onRelease: () => void }) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const t = setTimeout(() => setAsking(false), 3000);
    return () => clearTimeout(t);
  }, [asking]);
  return (
    <button
      type="button"
      class={`btn btn--secondary release-btn${asking ? ' release-btn--ask' : ''}`}
      onClick={() => (asking ? onRelease() : setAsking(true))}
    >
      {asking ? 'Toque de novo pra soltar' : 'Soltar o peixe'}
    </button>
  );
}

function Hud({ atSpot }: { atSpot: boolean }) {
  const { episodes } = useServices();
  const go = useNav();
  const [details, setDetails] = useState(false);
  const profile = useGame((s) => s.profile);
  const phase = useGame((s) => s.fishing.phase);
  const { episode, location } = currentPlace(profile, episodes);
  const run = profile.tournament;
  const hasNew = !run && newInShop(profile, episodes).length > 0; // EQUIP-10: "!" no botão Loja
  // EQUIP-11: com a isca no ar ou na água (ou o peixe fisgado), a loja fecha: termine o arremesso antes.
  const lineOut = ['Flying', 'Lure', 'Strike', 'Fight'].includes(phase);
  const tournament = run && episodes.find((ep) => ep.tournament.id === run.id)?.tournament;
  const buying = currentObjective(profile.story, episode)?.id.startsWith('comprar-') && !run;
  const objective = run
    ? `${tournament?.name}: ${run.castsLeft} arremessos · ${formatKg(score(run))}`
    : objectiveText(profile, episode).replace(/^Objetivo: /, '');

  return (
    <div class="hud hud--simple">
      <div class="hud__top">
        <div class="hud__toolbar">
          <span class="hud__item hud__coin" aria-label={`Saldo: ${formatMoney(profile.money)}`}>
            <HudIcon rows={COIN} /><span class="hud__money">{formatMoney(profile.money)}</span>
          </span>
          <button type="button" class="btn hud__shop" disabled={lineOut} onClick={() => go('shop')} title={lineOut ? 'Recolha a linha para ir à loja' : undefined}>
            Loja <small>Varas e iscas</small>
            {hasNew && <span class="new-dot" aria-label="item novo na loja">!</span>}
          </button>
          <button type="button" class="btn btn--secondary hud__menu" aria-label="Menu da pescaria" onClick={() => go('menu')}>
            <span aria-hidden="true">⚙</span> Menu
          </button>
        </div>
        <div class="hud__summary" role="group" aria-label="Painel da pescaria">
          <div class="hud__location-row">
            <span class="hud__location">{location.name}</span>
            <button type="button" class="hud__details" aria-expanded={details} onClick={() => setDetails(!details)}>
              {details ? 'Fechar detalhes' : 'Equipamento'}
            </button>
          </div>
          {buying ? (
            <button type="button" class="hud__objective hud__objective--shop" disabled={lineOut} onClick={() => go('shop')}>
              <span>{objective}</span><strong>Ir à loja →</strong>
            </button>
          ) : <p class="hud__objective">{objective}</p>}
          {details && <p class="hud__equipment">{gear(profile, episodes)}</p>}
        </div>
        <TutorialCoach />
      </div>
      {atSpot && details && ['Lure', 'Strike', 'Fight'].includes(phase) ? <FishingGauges /> : <div />}
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

function HudIcon({ rows }: { rows: string[] }) {
  return (
    <svg class="hud__icon" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">
      <Pixels rows={rows} colors={ICON_COLORS} />
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
  if (objective.id === 'album-completo') {
    const registered = episode.species.filter(sp => profile.album[sp.id] !== undefined).length;
    return `Objetivo: ${objective.text} · ${registered} de ${episode.species.length}`;
  }
  return `Objetivo: ${objective.text}${count > 1 ? ` · ${st?.progress ?? 0} de ${count}` : ''}`;
}
