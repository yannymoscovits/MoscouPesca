# Pescaria nova Context

**Gathered:** 2026-10-31
**Spec:** `.specs/features/pesca-bass/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Refazer a jogabilidade da pescaria em quatro telas (pesqueiro, arremesso com mira e força, isca debaixo d'água, briga com pulos), com dois botões grandes na tela, mais o tutorial e a simulação do jogador típico com as regras novas. Ficha do peixe, loja, episódios, campeonatos e medalhas não mudam.

---

## Implementation Decisions

### O que entra (escolha do usuário: os quatro)

- Escolher o ponto num mapa do lugar visto de cima.
- Mirar o arremesso: seta que balança e barra de força.
- Ver a isca debaixo d'água, mexer nela e ver o peixe vir atrás.
- Briga: trocada pela barra de captura no estilo Stardew (ver "Briga").

### Controles

- Botões na tela, "como os botões do Game Boy": ARREMESSAR no arremesso; RECOLHER (segurar) e PUXAR (tocar) na água e na briga.

### Fluxo

- Aprovado como proposto: Pesqueiro → Arremesso → Debaixo d'água → Briga, com os botões de cada tela.

### Briga (trocada em 2026-10-31)

- A briga com barra de tensão e o "PUXA!" do pulo saem. Entra a barra de captura no estilo Stardew Valley: segurar um botão sobe a faixa verde, soltar deixa cair, peixe dentro da faixa enche o medidor.
- Base da física: o código de conceito que o usuário enviou (gravidade, empurrão ao segurar, quique amortecido no fundo, peixe que sorteia destino e desliza, medidor começando em 30). Convertido de quadros para segundos; corrigido o contador de troca do peixe, que estava na faixa.
- `afaur/fishing-sim` foi lido como referência: sem licença, então nenhum código nem imagem é copiado.

### Agent's Discretion

- Números de ritmo (velocidade da seta e da barra, velocidade da isca, raio de interesse, tempo até o ataque, número de pulos) ficam como padrões no Assumptions da spec e podem mudar na calibragem.
- Pontos de cada local = as 3 zonas que cada local já tem, com nome do lugar e alcance mínimo de vara.

### Declined / Undiscussed Gray Areas → Assumptions

- Arte das telas novas, arremessos no campeonato, tamanho dos botões, fisgada perdida e voltar ao jogo: registrados no Assumptions da spec com o padrão escolhido.

---

## Specific References

- "Quero que fique parecida com o American Bass do Game Boy" (usuário). Vale a mecânica do gênero (bass de portátil), sem copiar tela, sprite ou nome.
- "Você sabe como funciona o estilo Stardew Valley? Poderíamos fazer esse estilo!" (usuário), com o repositório https://github.com/afaur/fishing-sim e um código de conceito da física; decidido: só a briga vira Stardew.
- O Adilson joga deitado, com uma mão, em retrato.

---

## Deferred Ideas

- Iscas artificiais com ação própria (rapala, spinner, jig).
- Pilotar o barco pelo lago.
- Clima e hora do dia.
