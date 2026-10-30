# MoscouFishing v1 Specification

**Status**: Approved (2026-10-30)

> Jogo de pesca para celular, presente para Adilson Moscovits.
> Critérios de aceite em EARS. As palavras-chave ficam em inglês (WHEN, IF, THEN, WHILE, WHERE, SHALL) para a validação automática; o resto em português.

## Problem Statement

Adilson Moscovits está internado na UTI aguardando um implante cardíaco e sempre gostou dos jogos de pesca de Game Boy. A família quer dar a ele um jogo de pesca próprio, com a história dele, campeonatos com o nome dele e mensagens da família, que ele consiga abrir e jogar deitado, com uma mão, num celular Android. O jogo precisa chegar às mãos dele em poucos dias. Por isso a v1 entrega o ciclo completo (pescar, equipar, história, campeonato, mensagem) em um único local, e o resto chega por atualização no mesmo link.

## Goals

- [ ] Adilson instala o jogo a partir de um link do WhatsApp em menos de 1 minuto (com ajuda de um familiar na primeira vez).
- [ ] O ciclo completo da v1 (Capítulo 1, vitória na GuanambiCup e leitura da mensagem) cabe em 20 a 40 minutos de jogo, divididos em sessões curtas.
- [ ] O jogo inteiro é jogável com um dedo, em retrato, sem exigir reação em menos de 2 segundos.
- [ ] Depois da primeira abertura, o jogo funciona inteiro em modo avião.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Capítulo 2 em diante, novos locais e espécies | Chegam como atualizações, cada uma com spec própria |
| Copa Adilson Moscovits (grande final) | Depende dos capítulos seguintes |
| Sala de troféus como tela própria | A v1 tem um troféu só, exibido no perfil |
| Publicação na Play Store ou APK | Revisão e testes obrigatórios levam semanas; o link resolve no mesmo dia (decidido com o usuário) |
| Ajustes específicos para iPhone | Ele usa Android; o jogo abre no iPhone, mas não é testado lá |
| Modo paisagem e otimização para computador | Ele joga deitado, com uma mão, em retrato |
| Gráficos 3D (Three.js) | O usuário escolheu 2D em pixel art: mais fiel ao Game Boy, mais leve na bateria e mais rápido de entregar |
| Mecânicas de Dave the Diver (mergulho, restaurante) | O usuário quer só a pegada cômica, não as mecânicas |
| Conta, login, salvamento na nuvem, ranking online | Exigem servidor; a v1 roda 100% no celular |
| Fotos, áudios e vídeos da família | A v1 tem mensagens de texto; mídia entra numa atualização |
| Música e efeitos sonoros | O som ficaria desligado na UTI; entra numa atualização |
| Anúncios, compras reais, coleta de dados | É um presente; nenhum dado sai do celular dele |
| Botão de apagar o progresso | Risco de ele perder tudo sem querer |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Nome do jogo | MoscouFishing | Escolhido pelo usuário | y |
| Subtítulo da tela inicial | "A Jornada de Adilson Moscovits" | Põe o nome dele logo na abertura | n |
| Distribuição | PWA instalável, aberta por link enviado no WhatsApp | Decidido com o usuário; sem loja, no ar no mesmo dia | y |
| Hospedagem | Site estático gratuito (Cloudflare Pages ou Vercel) a partir de repositório privado, com `noindex` | Mensagens da família não ficam públicas e o link não aparece em busca | y |
| Celular alvo | Android com Chrome | Celular dele, informado pelo usuário | y |
| Idioma | Só português do Brasil | Público único | y |
| Local do Capítulo 1 | Barragem de Ceraíma, em Guanambi (BA), cidade onde o Adilson mora; alternativa: Barragem do Poço do Magro | Guanambi confirmado pelo usuário; falta confirmar qual represa ele frequenta. O conteúdo é dado e troca sem mexer no código | n |
| Espécies da v1 | Lambari, Tilápia, Traíra, Carpa, Tucunaré (raro) e a Piranha Lavínia (especial) | Peixes comuns de represa brasileira; ajustar se ele tiver favoritos | n |
| Tom da história | Bem-humorado e debochado, do jeito da família | Pedido do usuário: a família é debochada | y |
| Lavínia (irmã do usuário) | Entra como "Lavínia, a Piranha": peixe especial da represa e personagem nas falas | Pedido da própria Lavínia | y |
| Elenco do Capítulo 1 | Jane (esposa) entrega a vara; Edvan (cunhado) é o dono da loja; rivais do torneio: Tio Ricardo (boêmio, toca bongô), Bem (sogra da filha, gosta de cerveja) e Tia Kris ("Passago de Fogo", vive mandando ele parar de tomar líquido e fala "prendrive") | Definido pelo usuário | y |
| Quem conduz o tutorial | Jane | Ela entrega a vara na abertura; mantém o tutorial dentro da história | n |
| Referência de humor | Pegada cômica no estilo Dave the Diver: cartões de apresentação, expressões exageradas, fichas engraçadas | Pedido do usuário; só o tom, sem as mecânicas | y |
| Apelidos cômicos nos cartões | Propostos pelo agente em `docs/historia/capitulo-1.md` | O usuário troca o que quiser | n |
| Retratos da família | O usuário manda fotos em `Fotos/` (fora do git); o agente descreve cada pessoa em texto e o PixelLab gera a partir da descrição. As fotos não vão para o PixelLab nem para o repositório | Preferência do usuário por fotos; privacidade da família | y |
| Personagens da família e textos da história | Ficam num arquivo de conteúdo com o marcador `{{PENDENTE}}` até o usuário enviar | Permite programar em paralelo; o build de publicação barra marcador pendente (HIST-07) | n |
| Mensagem da GuanambiCup | Escrita pela família e enviada pelo usuário antes da publicação | Sem ela o campeonato perde o sentido; se não chegar a tempo, o usuário escreve | n |
| Nome do torneio da v1 | "GuanambiCup" | Escolhido pelo usuário. O nome do Adilson continua no subtítulo do jogo e na grande final "Copa Adilson Moscovits", prevista para os próximos capítulos | y |
| Moeda | "R$" fictício | Familiar para ele; não é dinheiro real | n |
| Mira do arremesso | Tocar no ponto da água; a isca vai até lá, limitada pelo alcance da vara | Um toque, sem barra de força que exige timing | n |
| Formato do torneio | 8 arremessos, sem cronômetro; vale a soma dos 3 peixes mais pesados | Sem pressão de tempo; dá para pausar quando a enfermagem chegar | n |
| Rivais do torneio | 3 rivais com pontuação fixa, calibrada para ser vencível com a Vara de Fibra | Desafio real que ele consegue vencer; tentativas ilimitadas | n |
| Dificuldade | Perguntada na primeira abertura (Tranquilo ou Desafio) e mudável em Ajustes | A disposição dele pode variar de um dia para o outro | n |
| Iscas | Compradas uma vez, uso ilimitado | Evita ficar sem isca e ter que controlar estoque | n |
| Estilo visual | 2D em pixel art colorida e detalhada, vista de cima, com personagens expressivos de cabeça grande e retratos grandes nos diálogos; na linha visual de Dave the Diver, mas toda a arte é original (nenhum asset ou personagem do jogo) | Escolhido pelo usuário em vez de 3D (Three.js) e ajustado para o clima de Dave the Diver; a arte do jogo é protegida por direitos autorais e não pode ser usada | y |
| Origem da arte | Gerada com o PixelLab MCP (conta paga do usuário), num estilo único para personagens, família, peixes e cenário | Escolhido pelo usuário; permite retratos próprios da família | y |
| Peixe pego no torneio rende R$ | Sim, igual à pesca livre | Uma regra só, mais fácil de entender | n |
| Janelas de tempo | Fisgada: 2 s no Desafio e 4 s no Tranquilo. Linha arrebenta após 1 s em tensão 100 (só no Desafio) | Generosas para quem joga deitado, ainda com algum desafio | n |

**Open questions:** none - all resolved or logged above. As linhas "n" são padrões aguardando o material do usuário; mudá-las muda conteúdo e números, não os requisitos.

---

## User Stories

### P1: Instalar e abrir pelo link ⭐ MVP

**User Story**: Como Adilson, quero abrir o jogo por um link e deixá-lo como ícone no celular, para jogar sem depender de loja nem de internet.

**Why P1**: Se ele não consegue abrir o jogo, nada mais importa.

**Acceptance Criteria**:
1. WHEN o link é aberto no Chrome do Android THEN o jogo SHALL exibir a tela inicial com "MoscouFishing", o subtítulo e os botões "Colocar na tela" e "Jogar". `INST-01`
2. WHEN o jogador toca em "Colocar na tela" e o navegador oferece instalação THEN o jogo SHALL abrir o diálogo de instalação do Android. `INST-02`
3. IF o navegador não oferece instalação THEN o jogo SHALL mostrar uma instrução ilustrada apontando o menu ⋮ e a opção "Adicionar à tela inicial". `INST-03`
4. WHILE o jogo roda instalado (modo standalone) the jogo SHALL esconder o botão "Colocar na tela". `INST-04`
5. WHEN o jogo é aberto pelo ícone THEN o jogo SHALL abrir em tela cheia e em retrato, sem barra do navegador. `INST-05`
6. WHEN o jogo é aberto sem internet depois de uma primeira abertura completa THEN o jogo SHALL carregar e permitir usar todas as funções da v1. `INST-06`
7. WHEN uma versão nova foi baixada em segundo plano THEN o jogo SHALL aplicá-la na abertura seguinte e mostrar o aviso "Novidade no MoscouFishing!" uma única vez. `INST-07`
8. The jogo SHALL baixar no máximo 5 MB de arquivos na primeira abertura. `INST-08`
9. The jogo SHALL marcar suas páginas com `noindex` para não aparecer em buscadores. `INST-09`

**Independent Test**: No Android do usuário: abrir o link, instalar, ativar o modo avião, abrir pelo ícone e pescar um peixe.

---

### P1: Pescar com um dedo ⭐ MVP

**User Story**: Como Adilson, quero arremessar, fisgar e brigar com o peixe usando só um dedo, para jogar deitado com uma mão.

**Why P1**: É o coração do jogo.

**Acceptance Criteria**:
1. WHEN o jogador toca num ponto da água dentro do alcance da vara THEN o jogo SHALL arremessar a isca até esse ponto. `PESCA-01`
2. IF o jogador toca num ponto além do alcance da vara THEN o jogo SHALL arremessar até o limite do alcance, na mesma direção. `PESCA-02`
3. WHILE a isca está em voo the jogo SHALL ignorar novos toques. `PESCA-03`
4. WHILE a isca está na água numa área com peixes que aceitam a isca equipada the jogo SHALL gerar uma mordida entre 3 e 10 segundos depois do arremesso. `PESCA-04`
5. IF passam 15 segundos sem mordida THEN o jogo SHALL mostrar "Nada por aqui… tente outro ponto" e recolher a isca. `PESCA-05`
6. WHEN um peixe morde THEN o jogo SHALL mostrar um "!" grande e o botão "FISGAR!" ocupando a metade de baixo da tela. `PESCA-06`
7. WHERE a vibração está ligada the jogo SHALL vibrar o celular por 300 ms quando um peixe morde. `PESCA-07`
8. WHEN o jogador toca em qualquer ponto da tela dentro da janela de fisgada (2 s no Desafio, 4 s no Tranquilo) THEN o jogo SHALL fisgar o peixe e iniciar a briga. `PESCA-08`
9. IF a janela de fisgada termina sem toque THEN o jogo SHALL mostrar "Escapou! Tente de novo" e voltar para o arremesso. `PESCA-09`
10. WHILE o jogador mantém o dedo na tela durante a briga the jogo SHALL recolher linha e aumentar a tensão. `PESCA-10`
11. WHILE o jogador está sem o dedo na tela durante a briga the jogo SHALL reduzir a tensão e deixar o peixe puxar linha. `PESCA-11`
12. The jogo SHALL mostrar a tensão numa barra de 0 a 100: verde abaixo de 70, amarela de 70 a 89 e vermelha de 90 a 100. `PESCA-12`
13. IF a tensão fica em 100 por 1 segundo seguido no modo Desafio THEN o jogo SHALL arrebentar a linha e mostrar "A linha arrebentou!". `PESCA-13`
14. WHILE o modo Tranquilo está ativo the jogo SHALL limitar a tensão a 99, sem arrebentar a linha. `PESCA-14`
15. WHEN a distância do peixe chega a 0 THEN o jogo SHALL mostrar a ficha do peixe com desenho, espécie, peso em kg com 2 casas decimais e valor em R$. `PESCA-15`
16. The jogo SHALL sortear o peso de cada peixe dentro da faixa de peso da espécie. `PESCA-16`
17. WHEN a ficha do peixe é exibida THEN o jogo SHALL somar o valor do peixe ao saldo do jogador. `PESCA-17`

**Independent Test**: Numa represa com vara e isca iniciais: tocar na água, esperar a mordida, fisgar, segurar e soltar conforme a cor da barra até ver a ficha do peixe e o saldo aumentar.

---

### P1: Tutorial da primeira pescaria ⭐ MVP

**User Story**: Como Adilson, quero ser guiado passo a passo na primeira pescaria, para aprender os controles sem ler manual.

**Why P1**: Pedido explícito do usuário; ele vai jogar sozinho no leito, sem ninguém do lado para explicar.

**Acceptance Criteria**:
1. WHEN o jogador chega à represa pela primeira vez THEN o jogo SHALL iniciar o tutorial conduzido pela Jane antes do objetivo "pegar 3 peixes". `TUTO-01`
2. WHILE o tutorial está ativo the jogo SHALL mostrar uma instrução por vez, com uma seta apontando onde tocar. `TUTO-02`
3. WHEN o jogador completa um passo do tutorial THEN o jogo SHALL mostrar o passo seguinte, na ordem: arremessar, esperar a mordida, fisgar, segurar para recolher, soltar quando a barra ficar vermelha. `TUTO-03`
4. WHILE o tutorial está ativo the jogo SHALL gerar a mordida em até 5 segundos após o arremesso. `TUTO-04`
5. WHILE o tutorial está ativo the jogo SHALL manter o peixe mordendo até o jogador tocar, sem deixá-lo escapar. `TUTO-05`
6. WHILE o tutorial está ativo the jogo SHALL limitar a tensão a 99, sem arrebentar a linha. `TUTO-06`
7. IF o jogador fica 10 segundos sem tocar durante um passo THEN o jogo SHALL repetir a instrução e fazer a seta piscar. `TUTO-07`
8. WHEN o peixe do tutorial é pego THEN o jogo SHALL encerrar o tutorial e contar esse peixe no objetivo "pegar 3 peixes". `TUTO-08`
9. The jogo SHALL oferecer "Rever tutorial" na tela "Ajustes". `TUTO-09`

**Independent Test**: Num jogo novo, seguir só as setas e falas da Jane até pegar o primeiro peixe; conferir que o objetivo mostra 1 de 3.

---

### P1: Varas, iscas e loja ⭐ MVP

**User Story**: Como Adilson, quero escolher e comprar varas e iscas, para melhorar meu equipamento e pegar peixes maiores.

**Why P1**: Escolher a vara foi um pedido explícito, e a loja dá motivo para continuar pescando.

**Acceptance Criteria**:
1. The jogo SHALL oferecer 3 varas: Bambu (já possuída no início), Fibra e Carbono, cada uma com Força e Alcance de 1 a 5 mostrados em barras. `EQUIP-01`
2. The jogo SHALL oferecer pelo menos 3 iscas, começando com a Minhoca já possuída, e cada isca atrai um conjunto diferente de espécies. `EQUIP-02`
3. WHEN o jogador compra um item com saldo suficiente THEN o jogo SHALL descontar o preço uma única vez e marcar o item como possuído. `EQUIP-03`
4. IF o saldo é menor que o preço do item THEN o jogo SHALL desabilitar o botão "Comprar" e mostrar quanto falta. `EQUIP-04`
5. WHEN o jogador equipa uma vara ou isca possuída THEN o jogo SHALL usá-la a partir do próximo arremesso. `EQUIP-05`
6. The jogo SHALL manter o saldo sempre maior ou igual a zero. `EQUIP-06`
7. The jogo SHALL fazer cada ponto de Força reduzir o ganho de tensão na briga e cada ponto de Alcance aumentar a distância máxima de arremesso. `EQUIP-07`
8. The jogo SHALL manter as iscas compradas com uso ilimitado. `EQUIP-08`

**Independent Test**: Com saldo dado, comprar a Vara de Fibra, equipá-la, conferir que o arremesso vai mais longe e que a tensão sobe mais devagar que com a de Bambu.

---

### P1: História - Capítulo 1 ⭐ MVP

**User Story**: Como Adilson, quero viver uma história em que eu sou o protagonista e minha família aparece, para me sentir dentro do jogo.

**Why P1**: História com o nome dele foi um pedido explícito, e é o que transforma um jogo de pesca num presente.

**Acceptance Criteria**:
1. WHEN o jogo começa pela primeira vez THEN o jogo SHALL mostrar a cena de abertura do Capítulo 1 antes da primeira pescaria. `HIST-01`
2. The jogo SHALL mostrar cada fala numa caixa de texto com o retrato e o nome do personagem. `HIST-02`
3. WHEN o jogador toca na caixa de texto THEN o jogo SHALL avançar para a fala seguinte, sem avanço automático. `HIST-03`
4. The jogo SHALL mostrar o objetivo atual do capítulo na tela de pesca. `HIST-04`
5. WHEN o jogador cumpre um objetivo THEN o jogo SHALL mostrar a cena correspondente e o objetivo seguinte. `HIST-05`
6. The jogo SHALL ler falas, personagens e objetivos de um arquivo de conteúdo separado do código. `HIST-06`
7. IF algum texto do arquivo de conteúdo contém o marcador `{{PENDENTE}}` THEN o build de publicação SHALL falhar e listar cada marcador encontrado. `HIST-07`
8. WHEN o jogador vence a GuanambiCup THEN o jogo SHALL mostrar a cena de encerramento do Capítulo 1 e o aviso "Capítulo 2 em breve". `HIST-08`

**Independent Test**: Num jogo novo: ver a abertura, avançar as falas tocando, cumprir os objetivos em ordem até o torneio ser liberado.

---

### P1: Pegada cômica nos personagens ⭐ MVP

**User Story**: Como Adilson, quero ver minha família retratada de um jeito engraçado e exagerado, no estilo de Dave the Diver, para dar risada enquanto jogo.

**Why P1**: É o tom que o usuário pediu, e é o que faz a família se reconhecer no jogo.

**Acceptance Criteria**:
1. WHEN um personagem aparece pela primeira vez THEN o jogo SHALL mostrar um cartão de apresentação com retrato grande, nome e apelido cômico até o jogador tocar. `HUMOR-01`
2. The jogo SHALL mostrar em cada fala o retrato do personagem com a expressão definida no conteúdo: normal, rindo, bravo ou chocado. `HUMOR-02`
3. The jogo SHALL mostrar na ficha de cada espécie uma descrição bem-humorada definida no conteúdo. `HUMOR-03`
4. WHEN o torneio começa THEN o jogo SHALL mostrar uma provocação de cada rival antes do primeiro arremesso. `HUMOR-04`

**Independent Test**: Num jogo novo, conferir o cartão da Jane na abertura, as expressões mudando entre as falas, a descrição na ficha do primeiro peixe e as provocações dos 3 rivais no torneio.

---

### P1: GuanambiCup ⭐ MVP

**User Story**: Como Adilson, quero disputar um campeonato com o meu nome e, ao vencer, ler uma mensagem da minha família.

**Why P1**: Campeonato com o nome dele e mensagens da família foram pedidos explícitos.

**Acceptance Criteria**:
1. WHILE o último objetivo do Capítulo 1 não foi cumprido the jogo SHALL mostrar o torneio como bloqueado, com o objetivo que falta. `CAMP-01`
2. WHEN o jogador entra no torneio THEN o jogo SHALL mostrar o nome "GuanambiCup", as regras e os 3 rivais. `CAMP-02`
3. WHILE o torneio está em andamento the jogo SHALL mostrar quantos dos 8 arremessos restam e a pontuação parcial. `CAMP-03`
4. The jogo SHALL calcular a pontuação do torneio como a soma dos pesos dos 3 peixes mais pesados pegos nele. `CAMP-04`
5. WHEN o 8º arremesso do torneio termina THEN o jogo SHALL mostrar a classificação final com o jogador e os 3 rivais. `CAMP-05`
6. WHEN o jogador termina em 1º lugar pela primeira vez THEN o jogo SHALL mostrar a carta da família com o remetente e o texto da mensagem do torneio. `CAMP-06`
7. WHEN o jogador termina em 1º lugar pela primeira vez THEN o jogo SHALL adicionar o troféu do torneio ao perfil. `CAMP-07`
8. IF o jogador vence o torneio de novo THEN o jogo SHALL manter um único troféu e uma única carta. `CAMP-08`
9. IF o jogador não termina em 1º lugar THEN o jogo SHALL mostrar a colocação e o botão "Tentar de novo", sem custo e sem limite de tentativas. `CAMP-09`
10. The jogo SHALL deixar toda mensagem desbloqueada disponível para reler na tela "Mensagens" do menu. `CAMP-10`

**Independent Test**: Com o Capítulo 1 concluído: jogar os 8 arremessos, ver a classificação; ao vencer, ler a carta, ver o troféu no perfil e reabrir a carta pelo menu.

---

### P1: Pausa e progresso salvo ⭐ MVP

**User Story**: Como Adilson, quero parar a qualquer momento e voltar de onde parei, porque na UTI sou interrompido o tempo todo.

**Why P1**: Interrupções são certas (exames, medicação, visitas); perder progresso seria frustrante.

**Acceptance Criteria**:
1. WHEN o jogo vai para segundo plano ou a tela desliga THEN o jogo SHALL pausar na hora, congelando mordida, tensão e briga. `SAVE-01`
2. WHEN o jogador volta ao jogo pausado THEN o jogo SHALL mostrar "Pausado - toque para continuar" e só retomar após um toque. `SAVE-02`
3. The jogo SHALL mostrar um botão de pausa sempre visível na tela de pesca. `SAVE-03`
4. The jogo SHALL salvar no próprio celular saldo, itens, progresso da história, troféus, mensagens e andamento do torneio após cada peixe, compra, objetivo e arremesso de torneio. `SAVE-04`
5. WHEN o jogo é reaberto THEN o jogo SHALL restaurar o último estado salvo. `SAVE-05`
6. IF o jogo é fechado no meio de uma briga THEN o jogo SHALL reabrir na tela de pesca com a isca recolhida e, no torneio, sem gastar aquele arremesso. `SAVE-06`
7. IF o salvamento atual não pode ser lido THEN o jogo SHALL restaurar o salvamento anterior. `SAVE-07`
8. IF nenhum salvamento pode ser lido THEN o jogo SHALL começar um jogo novo e guardar uma cópia do dado ilegível. `SAVE-08`
9. WHEN uma versão nova do jogo abre um salvamento de versão anterior THEN o jogo SHALL convertê-lo mantendo saldo, itens, progresso, troféus e mensagens. `SAVE-09`
10. WHEN o jogo é aberto pela primeira vez THEN o jogo SHALL pedir ao navegador armazenamento persistente. `SAVE-10`

**Independent Test**: Pegar um peixe, fechar o app pelo gerenciador do Android, reabrir e conferir saldo e progresso; repetir fechando no meio de uma briga de torneio.

---

### P1: Conforto e acessibilidade ⭐ MVP

**User Story**: Como Adilson, deitado num leito, quero ler tudo sem esforço e escolher o quanto o jogo exige de mim.

**Why P1**: Ele joga com uma mão, deitado, possivelmente cansado; sem isso o jogo não serve para ele.

**Acceptance Criteria**:
1. WHEN o jogo é aberto pela primeira vez THEN o jogo SHALL perguntar "Como você quer pescar hoje?" com as opções "Tranquilo" e "Desafio". `ACES-01`
2. The jogo SHALL permitir trocar a dificuldade na tela "Ajustes". `ACES-02`
3. WHILE uma briga está em andamento the jogo SHALL aplicar uma troca de dificuldade só a partir da briga seguinte. `ACES-03`
4. The jogo SHALL permitir ligar e desligar a vibração na tela "Ajustes", começando ligada. `ACES-04`
5. The jogo SHALL usar fonte de no mínimo 18 px CSS em todos os textos. `ACES-05`
6. The jogo SHALL dar a todo botão uma área de toque de no mínimo 56 × 56 px CSS. `ACES-06`
7. The jogo SHALL manter contraste de no mínimo 4,5:1 entre texto e fundo. `ACES-07`
8. The jogo SHALL colocar todos os botões de ação na metade de baixo da tela. `ACES-08`
9. The jogo SHALL funcionar sem toque duplo, pinça, arrastar ou dois dedos. `ACES-09`
10. IF o celular está em paisagem fora do modo instalado THEN o jogo SHALL pausar e mostrar "Vire o celular em pé para jogar". `ACES-10`

**Independent Test**: Jogar uma sessão inteira só com o polegar da mão direita, celular em pé, e medir fontes e botões pelas ferramentas do navegador.

---

### P2: Álbum de peixes

**User Story**: Como Adilson, quero ver os peixes que já peguei e meus recordes.

**Why P2**: Dá vontade de pegar todas as espécies, mas o jogo funciona sem ele.

**Acceptance Criteria**:
1. WHEN o jogador pega uma espécie pela primeira vez THEN o jogo SHALL registrá-la no álbum com o peso. `ALBUM-01`
2. WHEN o jogador pega um peixe mais pesado que o recorde da espécie THEN o jogo SHALL atualizar o recorde e mostrar "Novo recorde!" na ficha. `ALBUM-02`
3. The jogo SHALL mostrar no álbum as espécies ainda não pegas como silhueta com o nome "???". `ALBUM-03`

**Independent Test**: Pegar duas tilápias de pesos diferentes e conferir no álbum o recorde e a silhueta das espécies que faltam.

---

### P2: Tela acesa durante a pesca

**User Story**: Como Adilson, quero que a tela não apague enquanto espero o peixe morder.

**Why P2**: A espera pela mordida pode passar do tempo de bloqueio do celular, mas a pausa automática (SAVE-01) já evita perda.

**Acceptance Criteria**:
1. WHILE a tela de pesca está aberta the jogo SHALL manter a tela do celular acesa. `TELA-01`
2. IF o navegador não permite manter a tela acesa THEN o jogo SHALL funcionar normalmente sem essa função. `TELA-02`

**Independent Test**: Com bloqueio de tela em 30 s, deixar a isca na água por 1 minuto e conferir que a tela continua acesa.

---

### P2: Celebração exagerada

**User Story**: Como Adilson, quero que cada peixe pego e cada vitória sejam comemorados de um jeito exagerado, para sentir o gosto da conquista.

**Why P2**: Reforça a pegada cômica, mas o jogo funciona sem ela.

**Acceptance Criteria**:
1. WHEN um peixe é pego THEN o jogo SHALL mostrar o Adilson posando com o peixe e a palavra "PEGOU!" antes da ficha. `HUMOR-05`
2. WHEN acontece fisgada, linha arrebentada ou vitória no torneio THEN o jogo SHALL mostrar uma onomatopeia ("NHAC!", "PLOFT!", "É CAMPEÃO!") e tremer a cena por no máximo 300 ms. `HUMOR-06`

**Independent Test**: Pegar um peixe e ver a pose com "PEGOU!"; arrebentar a linha no Desafio e ver "PLOFT!" com o tremor.

---

## Edge Cases

- IF o jogador toca em "Comprar" duas vezes seguidas THEN o jogo SHALL cobrar uma vez só (coberto por EQUIP-03).
- IF o armazenamento do celular está cheio THEN o jogo SHALL continuar jogável e mostrar "Não consegui salvar" uma vez por sessão.
- IF a isca cai numa área sem peixe que aceite a isca equipada THEN o jogo SHALL recolher a isca após 15 s (coberto por PESCA-05).
- IF o jogador sai do jogo durante o diálogo da história THEN o jogo SHALL reabrir na mesma cena, a partir da primeira fala.
- IF o site estiver fora do ar THEN o jogo já instalado SHALL continuar funcionando pelo cache (coberto por INST-06).

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | PESCA-02, PESCA-03, PESCA-12, EQUIP-04, EQUIP-06 |
| Failure / partial-failure states | SAVE-06, SAVE-07, SAVE-08, edge case de armazenamento cheio |
| Idempotency / retry / duplicate handling | EQUIP-03, CAMP-08, INST-07 (aviso uma única vez) |
| Auth boundaries & rate limits | N/A because o jogo é de um jogador só, sem servidor nem conta |
| Concurrency / ordering | N/A because há um jogador num celular; se o jogo for aberto em duas abas, vale o último salvamento, risco aceito |
| Data lifecycle / expiry | SAVE-09, SAVE-10; não há expiração nem apagamento na v1 |
| Observability | N/A because nenhum dado sai do celular (decisão de privacidade); problemas são vistos em teste no Android do usuário |
| External-dependency failure | INST-06, TELA-02, INST-03 |
| State-transition integrity | PESCA-03, PESCA-08, PESCA-09, ACES-03, CAMP-01, SAVE-01, TUTO-03 |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| INST-01 | P1: Instalar e abrir | - | Pending |
| INST-02 | P1: Instalar e abrir | - | Pending |
| INST-03 | P1: Instalar e abrir | - | Pending |
| INST-04 | P1: Instalar e abrir | - | Pending |
| INST-05 | P1: Instalar e abrir | - | Pending |
| INST-06 | P1: Instalar e abrir | - | Pending |
| INST-07 | P1: Instalar e abrir | - | Pending |
| INST-08 | P1: Instalar e abrir | - | Pending |
| INST-09 | P1: Instalar e abrir | - | Pending |
| PESCA-01 | P1: Pescar com um dedo | - | Pending |
| PESCA-02 | P1: Pescar com um dedo | - | Pending |
| PESCA-03 | P1: Pescar com um dedo | - | Pending |
| PESCA-04 | P1: Pescar com um dedo | - | Pending |
| PESCA-05 | P1: Pescar com um dedo | - | Pending |
| PESCA-06 | P1: Pescar com um dedo | - | Pending |
| PESCA-07 | P1: Pescar com um dedo | - | Pending |
| PESCA-08 | P1: Pescar com um dedo | - | Pending |
| PESCA-09 | P1: Pescar com um dedo | - | Pending |
| PESCA-10 | P1: Pescar com um dedo | - | Pending |
| PESCA-11 | P1: Pescar com um dedo | - | Pending |
| PESCA-12 | P1: Pescar com um dedo | - | Pending |
| PESCA-13 | P1: Pescar com um dedo | - | Pending |
| PESCA-14 | P1: Pescar com um dedo | - | Pending |
| PESCA-15 | P1: Pescar com um dedo | - | Pending |
| PESCA-16 | P1: Pescar com um dedo | - | Pending |
| PESCA-17 | P1: Pescar com um dedo | - | Pending |
| TUTO-01 | P1: Tutorial da primeira pescaria | - | Pending |
| TUTO-02 | P1: Tutorial da primeira pescaria | - | Pending |
| TUTO-03 | P1: Tutorial da primeira pescaria | - | Pending |
| TUTO-04 | P1: Tutorial da primeira pescaria | - | Pending |
| TUTO-05 | P1: Tutorial da primeira pescaria | - | Pending |
| TUTO-06 | P1: Tutorial da primeira pescaria | - | Pending |
| TUTO-07 | P1: Tutorial da primeira pescaria | - | Pending |
| TUTO-08 | P1: Tutorial da primeira pescaria | - | Pending |
| TUTO-09 | P1: Tutorial da primeira pescaria | - | Pending |
| EQUIP-01 | P1: Varas, iscas e loja | - | Pending |
| EQUIP-02 | P1: Varas, iscas e loja | - | Pending |
| EQUIP-03 | P1: Varas, iscas e loja | - | Pending |
| EQUIP-04 | P1: Varas, iscas e loja | - | Pending |
| EQUIP-05 | P1: Varas, iscas e loja | - | Pending |
| EQUIP-06 | P1: Varas, iscas e loja | - | Pending |
| EQUIP-07 | P1: Varas, iscas e loja | - | Pending |
| EQUIP-08 | P1: Varas, iscas e loja | - | Pending |
| HIST-01 | P1: História - Capítulo 1 | - | Pending |
| HIST-02 | P1: História - Capítulo 1 | - | Pending |
| HIST-03 | P1: História - Capítulo 1 | - | Pending |
| HIST-04 | P1: História - Capítulo 1 | - | Pending |
| HIST-05 | P1: História - Capítulo 1 | - | Pending |
| HIST-06 | P1: História - Capítulo 1 | - | Pending |
| HIST-07 | P1: História - Capítulo 1 | - | Pending |
| HIST-08 | P1: História - Capítulo 1 | - | Pending |
| HUMOR-01 | P1: Pegada cômica nos personagens | - | Pending |
| HUMOR-02 | P1: Pegada cômica nos personagens | - | Pending |
| HUMOR-03 | P1: Pegada cômica nos personagens | - | Pending |
| HUMOR-04 | P1: Pegada cômica nos personagens | - | Pending |
| CAMP-01 | P1: GuanambiCup | - | Pending |
| CAMP-02 | P1: GuanambiCup | - | Pending |
| CAMP-03 | P1: GuanambiCup | - | Pending |
| CAMP-04 | P1: GuanambiCup | - | Pending |
| CAMP-05 | P1: GuanambiCup | - | Pending |
| CAMP-06 | P1: GuanambiCup | - | Pending |
| CAMP-07 | P1: GuanambiCup | - | Pending |
| CAMP-08 | P1: GuanambiCup | - | Pending |
| CAMP-09 | P1: GuanambiCup | - | Pending |
| CAMP-10 | P1: GuanambiCup | - | Pending |
| SAVE-01 | P1: Pausa e progresso salvo | - | Pending |
| SAVE-02 | P1: Pausa e progresso salvo | - | Pending |
| SAVE-03 | P1: Pausa e progresso salvo | - | Pending |
| SAVE-04 | P1: Pausa e progresso salvo | - | Pending |
| SAVE-05 | P1: Pausa e progresso salvo | - | Pending |
| SAVE-06 | P1: Pausa e progresso salvo | - | Pending |
| SAVE-07 | P1: Pausa e progresso salvo | - | Pending |
| SAVE-08 | P1: Pausa e progresso salvo | - | Pending |
| SAVE-09 | P1: Pausa e progresso salvo | - | Pending |
| SAVE-10 | P1: Pausa e progresso salvo | - | Pending |
| ACES-01 | P1: Conforto e acessibilidade | - | Pending |
| ACES-02 | P1: Conforto e acessibilidade | - | Pending |
| ACES-03 | P1: Conforto e acessibilidade | - | Pending |
| ACES-04 | P1: Conforto e acessibilidade | - | Pending |
| ACES-05 | P1: Conforto e acessibilidade | - | Pending |
| ACES-06 | P1: Conforto e acessibilidade | - | Pending |
| ACES-07 | P1: Conforto e acessibilidade | - | Pending |
| ACES-08 | P1: Conforto e acessibilidade | - | Pending |
| ACES-09 | P1: Conforto e acessibilidade | - | Pending |
| ACES-10 | P1: Conforto e acessibilidade | - | Pending |
| ALBUM-01 | P2: Álbum de peixes | - | Pending |
| ALBUM-02 | P2: Álbum de peixes | - | Pending |
| ALBUM-03 | P2: Álbum de peixes | - | Pending |
| TELA-01 | P2: Tela acesa durante a pesca | - | Pending |
| TELA-02 | P2: Tela acesa durante a pesca | - | Pending |
| HUMOR-05 | P2: Celebração exagerada | - | Pending |
| HUMOR-06 | P2: Celebração exagerada | - | Pending |

**ID format:** `[CATEGORIA]-[NÚMERO]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 93 total, 0 mapped to tasks, 93 unmapped (tasks ainda não criadas)

---

## Success Criteria

- [ ] Instalação testada no Android do usuário: do link ao ícone na tela em menos de 1 minuto.
- [ ] Jogo completo testado em modo avião depois da primeira abertura.
- [ ] Um jogador que nunca viu o jogo conclui o Capítulo 1 e vence o torneio em 20 a 40 minutos.
- [ ] Cada briga dura entre 8 e 40 segundos para quem segura e solta conforme a cor da barra.
- [ ] Nenhum marcador `{{PENDENTE}}` na versão publicada.
- [ ] O Adilson joga e se diverte.
