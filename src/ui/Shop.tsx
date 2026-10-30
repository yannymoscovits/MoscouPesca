// Loja do Edvaldo (design.md, "UI (Preact)", Shop): varas com barras de Força e Alcance (EQUIP-01),
// iscas com as espécies que atraem (EQUIP-02), só dos episódios liberados (EQUIP-09), "Comprar" com
// quanto falta (EQUIP-04) e "Equipar" (EQUIP-05). Um item por vez: assim todos os botões cabem na
// metade de baixo da tela, sem rolagem (ACES-08, ACES-09).

import { useState } from 'preact/hooks';
import { useGame } from '../app/store';
import type { Bait, Episode, Profile, Rod } from '../content/types';
import { canBuy } from '../domain/shop';
import { isUnlocked, shopItems } from '../domain/world';
import { useNav, useServices } from './context';
import { joinNames } from './DialogBox';
import { formatMoney } from './format';

type Tab = 'varas' | 'iscas';

const isRod = (item: Rod | Bait): item is Rod => 'reach' in item;

export function Shop() {
  const { controller, episodes } = useServices();
  const go = useNav();
  const profile = useGame((s) => s.profile);
  const [tab, setTab] = useState<Tab>('varas');
  const [index, setIndex] = useState(0);

  const { rods, baits } = shopItems(profile, episodes);
  const items: (Rod | Bait)[] = tab === 'varas' ? rods : baits;
  const at = Math.min(index, items.length - 1);
  const item = items[at];
  const owned = isRod(item) ? profile.rods.owned.includes(item.id) : profile.baits.owned.includes(item.id);
  const equipped = isRod(item) ? profile.rods.equipped === item.id : profile.baits.equipped === item.id;
  const price = canBuy(profile, item);

  function chooseTab(t: Tab) {
    setTab(t);
    setIndex(0);
  }

  return (
    <section class="screen shop" aria-label="Loja">
      <div class="screen__top shop__top">
        <h1 class="title-2">Loja do Edvaldo</h1>
        <p class="shop__money">Seu saldo: {formatMoney(profile.money)}</p>
        <article class="panel shop-item" aria-labelledby="loja-item">
          <h2 id="loja-item" class="title-2">
            {item.name}
          </h2>
          {isRod(item) ? (
            <>
              <StatBar label="Força" value={item.force} />
              <StatBar label="Alcance" value={item.reach} />
            </>
          ) : (
            <p>Atrai: {joinNames(attracted(profile, item, episodes))}.</p>
          )}
          <p class="shop-item__price">{owned ? 'Já é sua' : `Preço: ${formatMoney(item.price)}`}</p>
          {!owned && !price.ok && <p class="shop-item__missing">Faltam {formatMoney(price.missing)}</p>}
        </article>
      </div>
      <div class="screen__actions">
        <div class="segmented" role="group" aria-label="Seção da loja">
          <button type="button" class="btn btn--toggle" aria-pressed={tab === 'varas'} onClick={() => chooseTab('varas')}>
            Varas
          </button>
          <button type="button" class="btn btn--toggle" aria-pressed={tab === 'iscas'} onClick={() => chooseTab('iscas')}>
            Iscas
          </button>
        </div>
        <div class="pager">
          <button type="button" class="btn btn--secondary" onClick={() => setIndex((at - 1 + items.length) % items.length)}>
            <span aria-hidden="true">◀ </span>Anterior
          </button>
          <p class="pager__count" role="status">
            {at + 1} de {items.length}
          </p>
          <button type="button" class="btn btn--secondary" onClick={() => setIndex((at + 1) % items.length)}>
            Próximo<span aria-hidden="true"> ▶</span>
          </button>
        </div>
        {owned ? (
          <button type="button" class="btn btn--big" disabled={equipped} onClick={() => controller.equip(item.id)}>
            {equipped ? 'Equipada' : 'Equipar'}
          </button>
        ) : (
          <button type="button" class="btn btn--big" disabled={!price.ok} onClick={() => controller.buy(item.id)}>
            Comprar
          </button>
        )}
        <button type="button" class="btn btn--secondary" onClick={() => go('menu')}>
          Voltar
        </button>
      </div>
    </section>
  );
}

/** Barra de 1 a 10 em quadradinhos (EQUIP-01). */
function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div class="stat">
      <span class="stat__label">{label}</span>
      <div class="stat__bar" role="meter" aria-label={label} aria-valuemin={1} aria-valuemax={10} aria-valuenow={value}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} class="stat__cell" data-filled={i < value ? 'true' : 'false'} />
        ))}
      </div>
      <span class="stat__value" aria-hidden="true">
        {value}
      </span>
    </div>
  );
}

/** Nomes das espécies dos episódios liberados que mordem a isca, sem repetir nome (EQUIP-02). */
function attracted(p: Profile, bait: Bait, episodes: Episode[]) {
  const names = episodes
    .filter((ep) => isUnlocked(p, ep.id))
    .flatMap((ep) => ep.species)
    .filter((s) => s.baits.includes(bait.id))
    .map((s) => s.name);
  return [...new Set(names)];
}
