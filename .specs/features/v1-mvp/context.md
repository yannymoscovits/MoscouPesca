# MoscouFishing v1 Context

**Gathered:** 2026-10-30
**Spec:** `.specs/features/v1-mvp/spec.md`
**Status:** Ready for design (aguardando material da história; ver Assumptions na spec)

---

## Feature Boundary

A v1 entrega, num único local de pesca, o ciclo completo: instalar pelo link, pescar com um dedo, comprar e escolher varas e iscas, viver o Capítulo 1 da história com a família e vencer a GuanambiCup para ler a primeira mensagem da família. Capítulos, locais e campeonatos seguintes chegam como atualizações.

---

## Implementation Decisions

### Para quem e como ele joga

- Jogador: Adilson Moscovits, internado na UTI, celular Android.
- Joga deitado, com uma mão: tela em pé (retrato), tudo com um dedo, sem exigir reflexo rápido.

### Entrega

- Primeira versão jogável em poucos dias; o resto cresce por atualização no mesmo link, sem reinstalar.
- Distribuição por link no WhatsApp. A tela inicial tem um botão grande "Colocar na tela" que dispara a instalação do Android; se o navegador não oferecer, o jogo mostra a instrução do menu ⋮.
- Depois de instalado: abre em tela cheia, funciona offline, atualiza sozinho e salva o progresso no celular.
- Instalação feita de preferência por um familiar numa visita.
- Antes de mandar para ele, testar no Android do usuário, inclusive em modo avião.
- Sem Play Store e sem APK.
- Hospedagem gratuita a partir de repositório privado, com `noindex`.

### Nome

- O jogo se chama **MoscouFishing** (escolha do usuário).

### Visual e arte

- 2D em pixel art colorida e detalhada, vista de cima, tela em pé, com personagens expressivos de cabeça grande, na linha visual de Dave the Diver. A arte daquele jogo não é usada (direitos autorais); tudo é original, gerado no PixelLab. O 3D com Three.js foi analisado e descartado: gasta mais bateria, atrasa a v1 e foge do visual de Game Boy.
- Arte gerada com o PixelLab MCP (conta paga do usuário): Adilson, família, peixes e cenário num estilo único.
- MCPs analisados e descartados: Phaser Game Agent (publica no phaser.io, sem hospedagem própria documentada), Godot MCP (exportação web pesada para o celular), Three.js DevTools (só serve para 3D). Testes no "celular" usam o Playwright já disponível.

### Família no jogo

- Familiares viram personagens da história.
- Cada campeonato vencido libera uma mensagem escrita pela família, que pode ser relida depois.
- Tom: bem-humorado e debochado, do jeito da família.
- Lavínia (irmã do usuário) pediu para ser a Piranha: "Lavínia, a Piranha" é um peixe especial da represa e personagem nas falas.
- Fluxo do conteúdo: criamos as histórias juntos primeiro; depois o usuário manda os nomes e as mensagens.
- Elenco do Capítulo 1 (definido pelo usuário): Jane, esposa do Adilson, entrega a vara; Edvan, o cunhado, é o dono da loja; os rivais do torneio são Tio Ricardo (boêmio, toca bongô), Bem (sogra da filha, gosta de cerveja) e Tia Kris (vive mandando ele parar de tomar líquido, fala "prendrive" e é chamada de "Passago de Fogo"). Roteiro e apelidos em `docs/historia/capitulo-1.md`.
- O torneio da v1 se chama **GuanambiCup** (escolha do usuário).

### Tutorial e humor (pedidos do usuário depois da aprovação da spec)

- "Pegar 3 peixes" precisa de tutorial: conduzido pela Jane, um passo por vez, com seta, sem como falhar (TUTO-*).
- Pegada cômica no estilo Dave the Diver, só o tom, sem mergulho nem restaurante: cartões de apresentação com apelido, retratos com expressões exageradas, fichas de peixe engraçadas, provocações dos rivais (HUMOR-01 a HUMOR-04, P1) e celebração exagerada com "PEGOU!" e onomatopeias (HUMOR-05 e HUMOR-06, P2).

### Agent's Discretion

- Mira do arremesso, formato do torneio, calibragem dos rivais, janelas de tempo e preços: o agente propôs padrões (registrados como Assumptions na spec) e o usuário pode trocar.
- Escolhas técnicas (engine, arte, estrutura de dados, testes) ficam para o Design.

### Declined / Undiscussed Gray Areas → Assumptions

- Conteúdo pessoal da história (lugares, peixes favoritos, causos, apelido, nomes da família, mensagens) ainda não foi enviado. Fica com marcador `{{PENDENTE}}` e o build de publicação barra (HIST-07). Registrado nas Assumptions da spec.

---

## Specific References

- Jogos de pesca de Game Boy no estilo de Rapala Pro Fishing: visão do lago, arremesso, briga controlando a tensão da linha, loja de equipamento, torneios. O MoscouFishing é um jogo original no gênero, sem marcas reais.
- Dave the Diver: só a pegada engraçada (cartões de personagem, reações exageradas, humor nas falas). Nada de mecânica, arte ou personagem do jogo.

---

## Deferred Ideas

- Capítulos 2 em diante: Pantanal, Araguaia, Amazônia, mar.
- Copa Adilson Moscovits (grande final).
- Sala de troféus.
- Fotos, áudios e vídeos da família nas mensagens.
- Música e efeitos sonoros retrô.
