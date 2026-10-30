// Aviso de mordida (BitePrompt, PESCA-06) e o fim do arremesso: a ficha do peixe (FishCard, PESCA-15,
// HUMOR-03, ALBUM-02), depois da comemoração (HUMOR-05), ou o aviso de quando não vem peixe
// (PESCA-05, PESCA-09, PESCA-13).

import { useState } from 'preact/hooks';
import { useGame } from '../app/store';
import type { Species } from '../content/types';
import type { FishingState } from '../domain/fishing';
import { colorOf } from '../render/fishingRenderer';
import { resolveAsset } from '../render/sprites';
import { CatchCelebration } from './Celebration';
import { useServices } from './context';
import { formatKg, formatMoney } from './format';

/**
 * PESCA-06: "!" grande e o botão "FISGAR!" na metade de baixo. Fica dentro da área dos toques da
 * cena: apertar o botão chega ao InputController como qualquer toque, fisga (PESCA-08) e, com o
 * dedo segurando, já começa a recolher a linha (PESCA-10).
 */
export function BitePrompt() {
  const biting = useGame((s) => s.fishing.phase === 'Bite');
  if (!biting) return null;
  return (
    <div class="bite">
      <p class="bite__alert" aria-live="assertive">
        !
      </p>
      <button type="button" class="btn bite__hook">
        FISGAR!
      </button>
    </div>
  );
}

const MISSES = {
  Result_Nothing: 'Nada por aqui… tente outro ponto', // PESCA-05
  Result_Escaped: 'Escapou! Tente de novo', // PESCA-09
  Result_Broken: 'A linha arrebentou!', // PESCA-13
} as const;

/** O resultado do arremesso até o toque em "Continuar", que volta para o arremesso. */
export function ResultOverlay() {
  const { controller } = useServices();
  const fishing = useGame((s) => s.fishing);
  const newRecord = useGame((s) => s.newRecord);
  // HUMOR-05: cada peixe pego é comemorado antes da ficha.
  const [celebrated, setCelebrated] = useState<FishingState | null>(null);
  const next = (
    <div class="overlay__actions">
      <button type="button" class="btn btn--big" onClick={() => controller.dismissResult()}>
        Continuar
      </button>
    </div>
  );

  if (fishing.phase === 'Result_Caught') {
    const { species, kg, value } = fishing;
    if (celebrated !== fishing) return <CatchCelebration species={species} onDone={() => setCelebrated(fishing)} />;
    return (
      <div class="overlay overlay--fishing" role="dialog" aria-modal="true" aria-label="Ficha do peixe">
        <FishCard species={species} kg={kg} value={value} newRecord={newRecord} />
        {next}
      </div>
    );
  }

  if (fishing.phase in MISSES) {
    return (
      <div class="overlay overlay--fishing" role="dialog" aria-modal="true" aria-label="Resultado do arremesso">
        <p class="panel miss">{MISSES[fishing.phase as keyof typeof MISSES]}</p>
        {next}
      </div>
    );
  }
  return null;
}

export function FishCard({ species, kg, value, newRecord }: { species: Species; kg: number; value: number; newRecord: boolean }) {
  return (
    <article class="panel fish-card">
      {newRecord && <p class="fish-card__record">Novo recorde!</p>}
      <FishPicture species={species} />
      <h2 class="title-2">{species.name}</h2>
      <p class="fish-card__facts">
        <span>Peso: {formatKg(kg)}</span>
        {/* spec, "Ficha da Piranha Lavínia": o rótulo substitui o R$ na ficha */}
        <span>Valor: {species.valueLabel ?? formatMoney(value)}</span>
      </p>
      <p class="fish-card__description">{species.description}</p>
    </article>
  );
}

/**
 * Desenho do peixe; enquanto a arte não chega, um peixe de CSS na cor da espécie (a mesma da cena).
 * `silhouette`: espécie ainda não pega no álbum (ALBUM-03), toda escura e sem o nome.
 */
export function FishPicture({ species, silhouette = false }: { species: Species; silhouette?: boolean }) {
  const url = resolveAsset(species.sprite);
  const label = silhouette ? 'Peixe desconhecido' : species.name;
  const dark = silhouette ? ' fish-picture--silhouette' : '';
  if (url) {
    // A folha tem 4 quadros lado a lado, como no FishingRenderer: a ficha mostra o primeiro.
    return <div class={`fish-picture fish-picture--art${dark}`} role="img" aria-label={label} style={`background-image: url(${url})`} />;
  }
  return (
    <div class={`fish-picture${dark}`} role="img" aria-label={label} style={`--fish: ${silhouette ? 'var(--outline)' : colorOf(species.id)}`}>
      <span class="fish-picture__body" />
    </div>
  );
}
