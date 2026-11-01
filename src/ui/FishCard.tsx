// O fim do arremesso: a ficha do peixe (FishCard, PESCA-15, HUMOR-03, ALBUM-02), depois da
// comemoração (HUMOR-05), ou o aviso de quando não vem peixe (pesca-bass ISCA-12, BRIGA-11).

import { useEffect, useState } from 'preact/hooks';
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
  Result_Nothing: 'Vamos tentar mais perto do cardume!', // ISCA-12: a isca chegou ao Adilson sem peixe
  Result_Escaped: 'O peixe fugiu!', // BRIGA-11: o medidor zerou no Desafio
} as const;

/** O resultado do arremesso até o toque em "Continuar", que volta para o arremesso. */
export function ResultOverlay() {
  const { controller } = useServices();
  const fishing = useGame((s) => s.fishing);
  const paused = useGame((s) => s.paused);
  useEffect(() => {
    if (fishing.phase !== 'Result_Nothing' || paused) return;
    const timer = window.setTimeout(() => controller.dismissResult(), 1000);
    return () => window.clearTimeout(timer);
  }, [fishing.phase, paused, controller]);
  const newRecord = useGame((s) => s.newRecord);
  const awards = useGame((s) => s.awards);
  const competitive = useGame(s => s.catchIsTournament);
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
        <FishCard species={species} kg={kg} value={value} newRecord={newRecord} awards={awards} competitive={competitive} />
        {next}
      </div>
    );
  }

  // A isca voltou sem peixe: sem recado na tela, o arremesso volta sozinho em 1 s.
  if (fishing.phase === 'Result_Nothing') return null;
  if (fishing.phase in MISSES) {
    return (
      <div class="overlay overlay--fishing" role="dialog" aria-modal="true" aria-label="Resultado do arremesso">
        <p class="panel miss">
          {fishing.phase === 'Result_Escaped' && fishing.released
            ? 'Você soltou o peixe. Bora pro próximo!'
            : fishing.phase === 'Result_Escaped' && fishing.snapped
              ? 'A linha arrebentou! Quando o peixe mergulhar, solta o SEGURAR.'
              : MISSES[fishing.phase as keyof typeof MISSES]}
        </p>
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
  competitive = false,
}: {
  species: Species;
  kg: number;
  value: number;
  newRecord: boolean;
  awards?: GameState['awards'];
  competitive?: boolean;
}) {
  return (
    <article class="panel fish-card">
      {newRecord && <p class="fish-card__record">Novo recorde!</p>}
      <FishPicture species={species} />
      <h2 class="title-2">{species.name}</h2>
      <p class="fish-card__facts">
        <span>Peso: {formatKg(kg)}</span>
        <FishSize species={species} kg={kg} />
        {/* spec, "Ficha da Piranha Lavínia": o rótulo substitui o R$ na ficha */}
        <span>{competitive ? 'Campeonato: vale só o peso' : `Valor: ${species.valueLabel ?? formatMoney(value)}`}</span>
      </p>
      {/* PESCA-17: a carteira já tem o que falta para o próximo item; o resto do valor não entra */}
      {!competitive && awards && awards.credited < value && (
        <p class="fish-card__wallet" role="status">
          {awards.walletFull
            ? `${awards.credited > 0 ? `Entraram ${formatMoney(awards.credited)}. ` : ''}Carteira cheia! Ela guarda até ${formatMoney(200)}.`
            : `${awards.credited > 0 ? `Entraram ${formatMoney(awards.credited)}: a` : 'A'} carteira já tem o que você precisa. Passa na loja!`}
        </p>
      )}
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
      {/* MEDAL-05: a meta cumprida */}
      {awards && awards.goals.length > 0 && (
        <div class="fish-card__goal" role="status">
          <p class="fish-card__goal-title">Meta cumprida!</p>
          <p>{awards.goals.join(' e ')} peixes desta espécie</p>
        </div>
      )}
      <p class="fish-card__description">{species.description}</p>
    </article>
  );
}

/** BRIGA-19: o tamanho do peixe pego dentro da espécie, com o nome e 5 quadradinhos. */
function FishSize({ species, kg }: { species: Species; kg: number }) {
  if (species.kg.max <= species.kg.min) return null; // espécie de peso único (a Lavínia)
  const share = (kg - species.kg.min) / (species.kg.max - species.kg.min);
  const label = share < 0.25 ? 'Pequeno' : share < 0.6 ? 'Médio' : share < 0.85 ? 'Grande' : 'Gigante!';
  const filled = Math.max(1, Math.ceil(share * 5));
  return (
    <span class="fish-size" aria-label={`Tamanho: ${label}`}>
      Tamanho: {label}
      <span class="fish-size__bar" aria-hidden="true">
        {Array.from({ length: 5 }, (_, n) => (
          <span key={n} class="fish-size__cell" data-filled={n < filled ? 'true' : 'false'} />
        ))}
      </span>
    </span>
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
  const portrait = resolveAsset(`src/assets/fish-portraits/${species.id}.png`);
  const url = portrait ?? resolveAsset(species.sprite);
  const label = silhouette ? 'Peixe desconhecido' : species.name;
  const dark = silhouette ? ' fish-picture--silhouette' : '';
  if (url) {
    // A folha tem 4 quadros lado a lado, como no FishingRenderer: a ficha mostra o primeiro.
    return <div class={`fish-picture fish-picture--art${portrait ? ' fish-picture--portrait' : ''}${dark}`} role="img" aria-label={label} style={`background-image: url(${url})`} />;
  }
  return (
    <div class={`fish-picture${dark}`} role="img" aria-label={label} style={`--fish: ${silhouette ? 'var(--outline)' : colorOf(species.id)}`}>
      <span class="fish-picture__body" />
    </div>
  );
}
