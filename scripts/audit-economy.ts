import { episodes } from '../src/content';
import { fishValue } from '../src/domain/value';

// Por capítulo: preços das varas e iscas e quanto vale o peixe mais valioso e o mais comum, no peso
// médio. Na copa o peixe não vale dinheiro; na pescaria livre, a carteira tem teto (world.walletCap).
const mid = (kg: { min: number; max: number }) => (kg.min + kg.max) / 2;
console.log('| Capítulo | Varas | Iscas | Peixe mais valioso | Peixe mais comum |');
console.log('| --- | ---: | ---: | ---: | ---: |');
for (const ep of episodes) {
  const rods = ep.rods.filter((rod) => rod.price > 0).map((rod) => rod.price);
  const baits = ep.baits.filter((bait) => bait.price > 0).map((bait) => bait.price);
  const values = ep.species.filter((sp) => !sp.rare).map((sp) => ({ sp, value: fishValue(sp, mid(sp.kg)) }));
  const best = values.reduce((a, b) => (b.value > a.value ? b : a));
  const common = values.reduce((a, b) => (b.sp.rarity > a.sp.rarity ? b : a));
  console.log(`| ${ep.id} | ${rods.join(' + ')} | ${baits.join(' + ') || '-'} | ${best.sp.name} R$ ${best.value} | ${common.sp.name} R$ ${common.value} |`);
}
