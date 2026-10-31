// Medidores da pescaria (T80; pesca-bass ISCA-13): com a isca na água, a Linha solta e a Profundidade
// da isca, em metros, e sempre um quadradinho com a isca equipada. Ficam na lateral esquerda, entre o
// painel e o meio da tela (theme.css, ".hud"): a direita fica para a barra de captura da briga, e a
// metade de baixo para os botões.

import { useGame } from '../app/store';
import type { Lure } from '../domain/lure';
import type { PescaState } from '../domain/pesca';
import { useServices } from './context';

/** Metros com vírgula e no máximo `digits` casas: "1,5 m", "200 m". */
const formatMeters = (m: number, digits: number) =>
  `${m.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} m`;

/** A isca na água (ISCA-13): na isca, no ataque e na briga, quando ela está na boca do peixe. */
const lureOf = (f: PescaState): Lure | null =>
  f.phase === 'Lure' || f.phase === 'Strike' || f.phase === 'Fight' ? f.water.lure : null;

export function FishingGauges() {
  const { episodes } = useServices();
  const lure = useGame((s) => lureOf(s.fishing));
  const baitId = useGame((s) => s.profile.baits.equipped);
  const bait = episodes.flatMap((ep) => ep.baits).find((b) => b.id === baitId);

  return (
    <div class="gauges" role="group" aria-label="Medidores">
      <div class="gauges__side">
        {/* A linha vai da beira até a isca: a distância na água e a profundidade. */}
        {lure && <Gauge name="Linha" value={formatMeters(Math.hypot(lure.xM, lure.depthM), 1)} />}
        {lure && <Gauge name="Profundidade" value={formatMeters(lure.depthM, 1)} />}
        <div class="gauge gauge--bait" role="group" aria-label="Isca">
          <span class="gauge__label">Isca</span>
          <span class="gauge__bait">
            <BaitIcon />
            <span class="gauge__value">{bait?.name ?? baitId}</span>
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

/** Minhoca no anzol, em pixels (8 × 8). */
function BaitIcon() {
  return (
    <svg class="gauge__icon" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">
      <path fill="#c9ccd1" d="M5 0h1v5H5zM4 5h1v2H4zM1 6h1v1H1zM2 7h2v1H2z" />
      <path fill="#f08aa0" d="M1 1h3v1H1zM0 2h1v2H0zM1 4h2v1H1zM3 3h1v1H3z" />
    </svg>
  );
}
