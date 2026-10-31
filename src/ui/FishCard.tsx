// O fim do arremesso: a ficha do peixe (FishCard, PESCA-15, HUMOR-03, ALBUM-02), depois da
// comemoração (HUMOR-05), ou o aviso de quando não vem peixe (pesca-bass ISCA-12, BRIGA-11).

import { useState } from 'preact/hooks';
import { useGame, type GameState } from '../app/store';
import type { MedalTier, Species } from '../content/types';
import type { PescaState } from '../domain/pesca';
import { colorOf } from '../render/fishingRenderer';
import { resolveAsset } from '../render/sprites';
import { CatchCelebration } from './Celebration';
import { useServices } from './context';
import { formatKg, formatMoney } from './format';
import { Pixels } from './TitleArt';

const MISSES = {
  Result_Nothing: 'Nada dessa vez', // ISCA-12: a isca chegou ao Adilson sem peixe
  Result_Escaped: 'O peixe fugiu!', // BRIGA-11: o medidor zerou no Desafio
} as const;

/** O resultado do arremesso até o toque em "Continuar", que volta para o arremesso. */
export function ResultOverlay() {
  const { controller } = useServices();
  const fishing = useGame((s) => s.fishing);
  const newRecord = useGame((s) => s.newRecord);
  const awards = useGame((s) => s.awards);
  // HUMOR-05: cada peixe pego é comemorado antes da ficha.
  const [celebrated, setCelebrated] = useState<PescaState | null>(null);

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
        <FishCard species={species} kg={kg} value={value} newRecord={newRecord} awards={awards} />
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

export function FishCard({
  species,
  kg,
  value,
  newRecord,
  awards = null,
}: {
  species: Species;
  kg: number;
  value: number;
  newRecord: boolean;
  awards?: GameState['awards'];
}) {
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
      {/* MEDAL-02: cada medalha nova, com o ícone dela */}
      {awards && awards.medals.length > 0 && (
        <ul class="fish-card__medals" aria-label="Medalhas novas">
          {awards.medals.map((tier) => (
            <li key={tier}>
              <MedalIcon tier={tier} />
              <span>Medalha de {tier}!</span>
            </li>
          ))}
        </ul>
      )}
      {/* MEDAL-05: a meta cumprida e a recompensa que entrou no saldo */}
      {awards && awards.goals.length > 0 && (
        <div class="fish-card__goal" role="status">
          <p class="fish-card__goal-title">Meta cumprida!</p>
          <p>
            {awards.goals.join(' e ')} peixes: + {formatMoney(awards.reward)}
          </p>
        </div>
      )}
      <p class="fish-card__description">{species.description}</p>
    </article>
  );
}

// Medalha em pixels (10 × 10): fita vermelha e azul e o disco na cor da medalha.
const MEDAL = [
  '.rr....bb.',
  '..rr..bb..',
  '...rrbb...',
  '...kkkk...',
  '..kllmmk..',
  '.klmmmmdk.',
  '.kmmmmmdk.',
  '.kmmmmddk.',
  '..kmmddk..',
  '...kkkk...',
];
const TIER_COLORS: Record<MedalTier, { l: string; m: string; d: string }> = {
  bronze: { l: '#efb27a', m: '#cd7f32', d: '#8a4f1d' },
  prata: { l: '#ffffff', m: '#c3cad3', d: '#7d8794' },
  ouro: { l: '#fff1a8', m: '#ffd23f', d: '#c98f0a' },
};
const RIBBON = { k: '#0a1830', r: '#e8453c', b: '#1266ba' };
/** Lugar da medalha que falta: só o contorno, apagado. */
const EMPTY_MEDAL = { k: '#7d8794', l: '#e6e1d3', m: '#e6e1d3', d: '#e6e1d3', r: '#c9c3b3', b: '#c9c3b3' };

/** Ícone da medalha; `earned` falso desenha o lugar vazio, sem nome para o leitor de tela. */
export function MedalIcon({ tier, earned = true }: { tier: MedalTier; earned?: boolean }) {
  const colors = earned ? { ...TIER_COLORS[tier], ...RIBBON } : EMPTY_MEDAL;
  return (
    <svg
      class="medal-icon"
      viewBox="0 0 10 10"
      shape-rendering="crispEdges"
      role={earned ? 'img' : undefined}
      aria-label={earned ? `Medalha de ${tier}` : undefined}
      aria-hidden={earned ? undefined : 'true'}
    >
      <Pixels rows={MEDAL} colors={colors} />
    </svg>
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
