// Loja do Edvaldo (design.md, "UI (Preact)", Shop): o Edvaldo no balcão comenta o item escolhido; a
// grade mostra a arte de cada vara e isca (só as dos episódios liberados e já liberadas pela história,
// EQUIP-09, HIST-11); embaixo, o item escolhido com Força e Alcance (EQUIP-01) ou as espécies que
// atrai (EQUIP-02), e um botão só: Comprar, com quanto falta (EQUIP-04), ou Equipar (EQUIP-05).

import { useEffect, useState } from 'preact/hooks';
import { useGame } from '../app/store';
import type { Bait, Episode, Profile, Rod } from '../content/types';
import { resolveAsset } from '../render/sprites';
import { canBuy } from '../domain/shop';
import { isUnlocked, newInShop, shopItems } from '../domain/world';
import { useBack, useServices } from './context';
import { characterById, joinNames, Portrait } from './DialogBox';
import { formatMoney } from './format';

type Tab = 'varas' | 'iscas';
type Item = Rod | Bait;

const isRod = (item: Item): item is Rod => 'reach' in item;
/** Pixel art da vara ou isca (src/assets/items/<id>.png). */
const art = (id: string) => resolveAsset(`src/assets/items/${id}.png`);

export function Shop() {
  const { controller, episodes } = useServices();
  const back = useBack();
  const profile = useGame((s) => s.profile);
  const [tab, setTab] = useState<Tab>('varas');
  const [chosen, setChosen] = useState<string | null>(null);
  // EQUIP-10: o que era novo ao abrir a loja segue com "Novo!" nesta visita; o "!" do botão Loja some.
  const [fresh] = useState(() => new Set(newInShop(profile, episodes)));
  useEffect(() => {
    if (fresh.size) controller.markShopSeen([...fresh]);
  }, []);

  const { rods, baits } = shopItems(profile, episodes);
  // Da mais fraca (esquerda) para a mais forte (direita): vara por força + alcance, isca pelo preço.
  const items: Item[] = tab === 'varas' ? [...rods].sort((a, b) => a.force + a.reach - (b.force + b.reach) || a.price - b.price) : [...baits].sort((a, b) => a.price - b.price);
  const owns = (i: Item) => (isRod(i) ? profile.rods.owned : profile.baits.owned).includes(i.id);
  const uses = (i: Item) => (isRod(i) ? profile.rods.equipped : profile.baits.equipped) === i.id;
  // Abre no primeiro item que ainda dá para comprar; senão, no que está em uso.
  const item = items.find((i) => i.id === chosen) ?? items.find((i) => !owns(i)) ?? items.find(uses) ?? items[0];
  const owned = owns(item);
  const equipped = uses(item);
  const price = canBuy(profile, item);

  const at = items.indexOf(item);
  /** ◀ vai para a mais fraca, ▶ para a mais forte; nas pontas, para (sem dar a volta). */
  function step(d: number) {
    const k = at + d;
    if (k >= 0 && k < items.length) setChosen(items[k].id);
  }

  function chooseTab(t: Tab) {
    setTab(t);
    setChosen(null);
  }

  return (
    <section class="screen shop" aria-label="Loja">
      <header class="shop__header">
        <h1 class="title-2">Loja do Edvaldo</h1>
        <p class="shop__money" aria-label={`Seu saldo: ${formatMoney(profile.money)}`}>
          <span class="shop__coin" aria-hidden="true" />
          {formatMoney(profile.money)}
        </p>
      </header>

      <div class="shop__clerk">
        <Portrait character={characterById('edvaldo')} expression={owned || price.ok ? 'rindo' : 'normal'} />
        <p class="shop__tip" role="status">
          {tipFor(item, owned, equipped, price)}
        </p>
      </div>

      <div class="segmented shop__tabs" role="group" aria-label="Seção da loja">
        <button type="button" class="btn btn--toggle" aria-pressed={tab === 'varas'} onClick={() => chooseTab('varas')}>
          Varas{rods.some((r) => fresh.has(r.id)) && <span class="new-dot" aria-label="tem novidade">!</span>}
        </button>
        <button type="button" class="btn btn--toggle" aria-pressed={tab === 'iscas'} onClick={() => chooseTab('iscas')}>
          Iscas{baits.some((b) => fresh.has(b.id)) && <span class="new-dot" aria-label="tem novidade">!</span>}
        </button>
      </div>

      {/* Um item por vez, grande; ◀ e ▶ passam para os outros. */}
      <div class="shop__carousel" role="group" aria-label={tab === 'varas' ? 'Varas' : 'Iscas'}>
        <button type="button" class="btn btn--secondary shop__arrow" aria-label="Anterior" disabled={at <= 0} onClick={() => step(-1)}>
          ◀
        </button>
        <div class="shop-card">
          {fresh.has(item.id) && <span class="shop-card__new">Novo!</span>}
          {art(item.id) && <img class="shop-card__art" src={art(item.id)!} alt="" aria-hidden="true" />}
          <span class="shop-card__count" role="status">
            {items.indexOf(item) + 1} de {items.length}
          </span>
        </div>
        <button type="button" class="btn btn--secondary shop__arrow" aria-label="Próximo" disabled={at >= items.length - 1} onClick={() => step(1)}>
          ▶
        </button>
      </div>

      <article class="shop-item" aria-labelledby="loja-item">
        <div class="shop-item__head">
          <h2 id="loja-item" class="shop-item__name">
            {item.name}
          </h2>
          <p class={`shop-item__price${equipped ? ' shop-item__price--using' : owned ? ' shop-item__price--owned' : ''}`}>
            {owned ? (equipped ? 'Em uso' : 'Já é sua') : formatMoney(item.price)}
          </p>
        </div>
        {isRod(item) ? (
          <>
            <StatBar label="Força" value={item.force} />
            <StatBar label="Alcance" value={item.reach} />
          </>
        ) : (
          <p class="shop-item__attracts">Atrai: {joinNames(attracted(profile, item, episodes))}.</p>
        )}
        {!owned && !price.ok && <p class="shop-item__missing">Faltam {formatMoney(price.missing)}</p>}
      </article>

      <div class="shop__actions">
        <button type="button" class="btn btn--secondary" onClick={back}>
          Voltar
        </button>
        {owned ? (
          <button type="button" class="btn btn--big" disabled={equipped} onClick={() => controller.equip(item.id)}>
            {equipped ? 'Em uso' : 'Equipar'}
          </button>
        ) : (
          <button
            type="button"
            class="btn btn--big"
            disabled={!price.ok}
            onClick={() => {
              setChosen(item.id); // fica no item comprado, com o "Equipar" à mão
              controller.buy(item.id);
            }}
          >
            Comprar
          </button>
        )}
      </div>
    </section>
  );
}

/** A fala do Edvaldo sobre o item escolhido. */
function tipFor(item: Item, owned: boolean, equipped: boolean, price: ReturnType<typeof canBuy>): string {
  if (equipped) return 'Essa já tá na sua mão, Moscou. Escolhe outra pra ver.';
  if (owned) return 'Essa é sua! Toca em Equipar pra levar pra água.';
  if (!price.ok) return `Faltam ${formatMoney(price.missing)}. Mais uns peixes e é sua!`;
  if (isRod(item)) return 'Pode levar! Força ajuda na briga; alcance abre pontos mais longe.';
  return 'Pode levar! Cada isca atrai peixes diferentes.';
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
