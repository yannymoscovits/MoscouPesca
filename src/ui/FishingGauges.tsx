// Medidores da pescaria (T80; spec, "Visual da pescaria"): nas laterais da cena, a Tensão numa barra
// vertical com as cores da PESCA-12, a Linha solta em metros, a Profundidade da zona onde a isca está e
// um quadradinho com a isca equipada. Ficam entre o painel e o meio da tela (theme.css, ".hud"): não
// cobrem o painel, o "FISGAR!" da metade de baixo nem os botões.

import { ROD_TIP } from '../app/controller';
import { useGame } from '../app/store';
import { tensionBand, zoneAt, type FishingState } from '../domain/fishing';
import { FIGHT_START_DISTANCE } from '../domain/tuning';
import { useServices } from './context';
import { currentPlace } from './format';

/**
 * Metros por px lógico da cena de 180 × 400 px. A spec não fixa a escala: 0,1 m por px dá de 10 m
 * (Vara de Bambu) a 30 m (alcance 10) de linha, perto de uma pescaria de verdade.
 */
const METERS_PER_PX = 0.1;

/** Metros com vírgula e no máximo `digits` casas: "1,5 m", "200 m". */
const formatMeters = (m: number, digits: number) =>
  `${m.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} m`;

/** Isca na água: onde caiu; na briga, a linha encurta e alonga com a distância do peixe. */
function lureInWater(f: FishingState) {
  if (f.phase !== 'Waiting' && f.phase !== 'Bite' && f.phase !== 'Fight') return null;
  const castPx = Math.hypot(f.at.x - ROD_TIP.x, f.at.y - ROD_TIP.y);
  const k = f.phase === 'Fight' ? f.distance / FIGHT_START_DISTANCE : 1;
  return { at: f.at, lineM: castPx * k * METERS_PER_PX };
}

export function FishingGauges() {
  const { episodes } = useServices();
  const fishing = useGame((s) => s.fishing);
  const profile = useGame((s) => s.profile);
  const { location } = currentPlace(profile, episodes);
  const lure = lureInWater(fishing);
  const zone = lure ? zoneAt(lure.at, location.zones) : undefined;
  const bait = episodes.flatMap((ep) => ep.baits).find((b) => b.id === profile.baits.equipped);

  return (
    <div class="gauges" role="group" aria-label="Medidores">
      <div class="gauges__side">{fishing.phase === 'Fight' && <TensionGauge tension={fishing.tension} />}</div>
      <div class="gauges__side gauges__side--right">
        {lure && <Gauge name="Linha" value={formatMeters(lure.lineM, 1)} />}
        {zone && <Gauge name="Profundidade" value={formatMeters(zone.depthM, zone.depthM % 1 === 0 ? 0 : 1)} />}
        <div class="gauge gauge--bait" role="group" aria-label="Isca">
          <span class="gauge__label">Isca</span>
          <span class="gauge__bait">
            <BaitIcon />
            <span class="gauge__value">{bait?.name ?? profile.baits.equipped}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Gauge({ name, value }: { name: string; value: string }) {
  return (
    <div class="gauge" role="group" aria-label={name}>
      <span class="gauge__label">{name}</span>
      <span class="gauge__value">{value}</span>
    </div>
  );
}

/** PESCA-12: de 0 a 100, enchendo de baixo para cima; verde abaixo de 70, amarela de 70 a 89, vermelha de 90 a 100. */
function TensionGauge({ tension }: { tension: number }) {
  return (
    <div class="gauge-tension">
      <span class="gauge__label">Tensão</span>
      <div
        class="gauge-tension__bar"
        role="meter"
        aria-label="Tensão"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(tension)}
        data-band={tensionBand(tension)}
      >
        <div class="gauge-tension__fill" data-fill style={{ height: `${tension}%` }} />
      </div>
    </div>
  );
}

/** Minhoca no anzol, em pixels (8 × 8). */
function BaitIcon() {
  return (
    <svg class="gauge__icon" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">
      <path fill="#c9ccd1" d="M5 0h1v5H5zM4 5h1v2H4zM1 6h1v1H1zM2 7h2v1H2z" />
      <path fill="#f08aa0" d="M1 1h3v1H1zM0 2h1v2H0zM1 4h2v1H1zM3 3h1v1H3z" />
    </svg>
  );
}
