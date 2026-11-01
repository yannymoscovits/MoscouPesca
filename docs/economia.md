# Economia da pescaria e dos campeonatos

Regra confirmada em 31/10/2026: capturas de campeonato não geram dinheiro. Valem para a classificação, o álbum, os recordes e as medalhas. Só as capturas da pescaria livre contam para metas de quantidade remuneradas. A regra inclui o último arremesso e as revanches. O saldo já salvo é preservado.

A ficha da copa mostra que vale somente o peso, sem exibir um preço de venda. O simulador usa a mesma regra do jogo.

## Como o dinheiro funciona hoje

- Na pescaria livre, cada peixe vale pelo trabalho da briga (força, fôlego e peso), não pelo quilo.
- A carteira tem teto: o preço do que a história já liberou e ainda não foi comprado, mais o próximo item do capítulo. Sem nada para comprar, ela para em R$ 200 ("Carteira cheia!"). No último capítulo não tem teto.
- Os itens só aparecem na loja quando a história libera (objetivos com `unlocks`).
- Na copa, o peixe vale só pelo peso, para a classificação; não entra dinheiro.

## Auditoria

Preços por capítulo e quanto vale, no peso médio, o peixe mais valioso e o mais comum (sem os lendários).

| Capítulo | Varas | Iscas | Peixe mais valioso | Peixe mais comum |
| --- | ---: | ---: | ---: | ---: |
| 1 | 100 + 250 | 30 + 50 | Tucunaré R$ 68 | Tilápia R$ 15 |
| 2 | 500 + 900 | 170 | Robalo-flecha R$ 156 | Tilápia R$ 29 |
| 3 | 900 + 1250 | 250 | Xaréu R$ 360 | Guaricema R$ 79 |
| 4 | 1100 + 1600 | 330 | Pacu-planador R$ 426 | Peixe-voador R$ 291 |
| 5 | 3750 + 8750 | 1670 | Atum R$ 763 | Cavala R$ 509 |

Reproduzir a tabela: `npx tsx scripts/audit-economy.ts`.
