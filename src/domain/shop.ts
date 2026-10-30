// Loja: comprar e equipar varas e iscas sem nunca deixar o saldo negativo (design.md, "Domain: shop").
// A isca não tem estoque: comprada uma vez, vale para sempre (EQUIP-08).

import type { Bait, ItemId, Profile, Rod } from '../content/types';

export type Item = Rod | Bait;

const isRod = (item: Item): item is Rod => 'reach' in item;

function owns(p: Profile, id: ItemId): boolean {
  return p.rods.owned.includes(id) || p.baits.owned.includes(id);
}

/** EQUIP-04: quanto falta quando o saldo não paga o item. */
export function canBuy(p: Profile, item: Item): { ok: true } | { ok: false; missing: number } {
  return p.money >= item.price ? { ok: true } : { ok: false, missing: item.price - p.money };
}

/** EQUIP-03, EQUIP-06: o mesmo perfil volta se o item já é possuído ou se falta saldo. */
export function buy(p: Profile, item: Item): Profile {
  if (owns(p, item.id) || !canBuy(p, item).ok) return p;
  const money = p.money - item.price;
  if (isRod(item)) return { ...p, money, rods: { ...p.rods, owned: [...p.rods.owned, item.id] } };
  return { ...p, money, baits: { ...p.baits, owned: [...p.baits.owned, item.id] } };
}

/** EQUIP-05: só equipa o que já é possuído; vale a partir do próximo arremesso. */
export function equip(p: Profile, itemId: ItemId): Profile {
  if (p.rods.owned.includes(itemId)) return { ...p, rods: { ...p.rods, equipped: itemId } };
  if (p.baits.owned.includes(itemId)) return { ...p, baits: { ...p.baits, equipped: itemId } };
  return p;
}
