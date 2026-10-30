# MoscouFishing v1 Context

**Gathered:** 2026-10-30
**Spec:** `.specs/features/v1-mvp/spec.md`
**Status:** Ready for design (aguardando material da história; ver Assumptions na spec)

---

## Feature Boundary

A v1 entrega 5 episódios, publicados juntos: Barragem do Poço do Magro (GuanambiCup), Jacuípe (Rio Jacuípe e Ponte da Cetrel), Ilha de Itaparica, Parque dos Ventos e Alto-mar da Bahia (Copa Adilson Moscovits). Cada um tem lugar, peixes, equipamentos, história com a família, campeonato e carta, numa progressão de 2 a 3 horas, e a pesca livre continua depois do fim.

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
- Elenco do Episódio 1 (definido pelo usuário): Jane, esposa do Adilson, entrega a vara; Edvaldo, o cunhado, é o dono da loja; os rivais do torneio são Ricardo (boêmio, toca bongô), Bem (sogra da filha, gosta de cerveja) e Kris (vive mandando ele parar de tomar líquido, fala "prendrive" e é chamada de "Passago de Fogo"). Roteiro e apelidos em `docs/historia/episodio-1.md`.
- O torneio da v1 se chama **GuanambiCup** (escolha do usuário).

### 5 episódios (pedido do usuário depois da aprovação das tarefas)

- No mínimo 5 episódios, entregues **juntos** (decisão do usuário, mesmo com a entrega mais demorada).
- Cada episódio leva de 2 a 3 horas até vencer o campeonato; ele gosta de ficar pegando peixe. Depois do fim, a pesca livre segue em todos os lugares.
- Roteiro: 1 Barragem do Poço do Magro (GuanambiCup) · 2 Jacuípe, com dois locais: Rio Jacuípe (doce) e Ponte da Cetrel (salgado) · 3 Ilha de Itaparica · 4 Parque dos Ventos · 5 Alto-mar da Bahia, de barco (Copa Adilson Moscovits).
- Jacuípe entrou no Episódio 2 a pedido do usuário: é um lugar de que o Adilson gosta muito e onde pescava muito. Tem dois locais, o Rio Jacuípe (água doce) e a Ponte da Cetrel (água salgada). O Rio São Francisco saiu, e o final foi para o alto-mar para não repetir a água salgada.
- Peixes do Episódio 1: os típicos da represa de Guanambi (pedido do usuário). Sem lista oficial do Poço do Magro, usamos os comuns dos açudes do sertão baiano, mais a lenda real do pirarucu de ~90 kg pego no sangradouro da Barragem de Ceraíma em 2022, que vira o Pirarucu Lendário. O usuário confirmou: os peixes mais famosos de Guanambi, o básico.
- A represa do Episódio 1 é a **Barragem do Poço do Magro** (correção do usuário; não é Ceraíma).
- A carta rascunhada para o Episódio 2 virou a carta do Episódio 1; as próximas são escritas episódio a episódio.
- Episódio 1: a Jane zoa o Adilson por se achar pegador (pedido do usuário).
- Episódio 3 vai para a Ilha de Itaparica, no lugar do Pantanal: ele pescou muito lá, em Vera Cruz, quase sempre sozinho (pedido do usuário). As irmãs dele, Lu e Geane, invadem a pescaria e sempre chamam ele de "Xô"; aparecem a Louise (sobrinha preferida) e o Lucca (filho dela, que ele adora). Roteiro em `docs/historia/episodio-3.md`.
- Episódio 4 sai da Amazônia e vira lúdico: o Adilson trabalha com energia eólica e presta serviços ao Grupo IK; num parque eólico do Alto Sertão (região de Guanambi), o vento é tão forte que os peixes voam (pedido do usuário). Mesma mecânica de pesca; espécies fantasiosas. Entram o Márcio (funcionário 01 do Adilson, faz-tudo e amigo) e o Sr. Higashi (chefe da Ninha; piada interna de botar um GPS). Rivais: Márcio, Sr. Higashi e Edvaldo. Roteiro em `docs/historia/episodio-4.md`.
- Episódio 5, a grande final: todo mundo junto num barco, torcendo pelo Adilson, acreditando na melhora dele e pedindo que ele não desista (pedido do usuário). O chefão é o Marlim-azul, que ele solta de volta no mar. Entram a Ninha adulta (nerd de TI) e a Ângela, companheira dela. Didi, Denise e Tininho aparecem só como lembrança leve, falada pelos vivos (decisão do usuário). Roteiro em `docs/historia/episodio-5.md`.
- Episódio 2 vira uma viagem no tempo em Jacuípe: o usuário pescava com o pai quando criança. Rivais definidos pelo usuário: Tininho, Denise (chama ele de "JUNIORRRR") e Didi. Os três já faleceram: aparecem só no passado, com carinho e com o humor que tinham; o presente se passa na beira do rio, não na casa do Tininho. A fala do Didi "Vai, Junior. Obedece os médicos e toma o remédio direitinho, que eu tô de olho." entra no final do episódio (decisão do usuário). O pescador local é o Capenga (não Mestre Dinho). Roteiro em `docs/historia/episodio-2.md`.
- Nomes corrigidos pelo usuário: Edvaldo (não Edvan), Ricardo (sem "Tio"), Kris (sem "Tia").
- Regra do usuário: nunca usar "Tio" ou "Tia" antes do nome de personagem (Ricardo, Kris, Lu). Nas falas, a Louise chamar o Adilson de "tio" continua, por ser o jeito de ela falar com ele.
- A Lavínia sempre chama o Adilson de "ADILSINHO" e aparece em todos os episódios para pirraçar ele.

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

- Episódios além do 5º.
- Fotos, áudios e vídeos da família nas mensagens.
- Música e efeitos sonoros retrô.
