# MoscouFishing v1 Specification

**Status**: Approved (2026-10-30) · ampliação para 5 episódios em revisão (2026-10-30)

> Jogo de pesca para celular, presente para Adilson Moscovits.
> Critérios de aceite em EARS. As palavras-chave ficam em inglês (WHEN, IF, THEN, WHILE, WHERE, SHALL) para a validação automática; o resto em português.

## Problem Statement

Adilson Moscovits está internado na UTI aguardando um implante cardíaco e sempre gostou dos jogos de pesca de Game Boy. A família quer dar a ele um jogo de pesca próprio, com a história dele, campeonatos com o nome dele e mensagens da família, que ele consiga abrir e jogar deitado, com uma mão, num celular Android. Ele gosta de passar horas pescando. Por isso a v1 traz 5 episódios, cada um com lugar, peixes, equipamentos, história, campeonato e carta da família próprios, numa progressão longa (2 a 3 horas por episódio) e com pesca livre sem fim depois. A família decidiu entregar os 5 episódios juntos.

## Goals

- [ ] Adilson instala o jogo a partir de um link do WhatsApp em menos de 1 minuto (com ajuda de um familiar na primeira vez).
- [ ] Cada um dos 5 episódios leva de 2 a 3 horas de jogo até vencer o campeonato (10 a 15 horas no total), em sessões curtas, e a pesca livre continua depois do fim.
- [ ] O jogo inteiro é jogável com um dedo, em retrato, sem exigir reação em menos de 2 segundos.
- [ ] Depois da primeira abertura, o jogo funciona inteiro em modo avião.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Episódios além do 5º | Podem vir como atualização depois da entrega |
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
| Local do Episódio 1 | Barragem do Poço do Magro, em Guanambi (BA), cidade onde o Adilson mora | Corrigido pelo usuário (não é Poço do Magro) | y |
| Entrega | Os 5 episódios publicados juntos | Decisão do usuário | y |
| Roteiro dos episódios | 1 Barragem do Poço do Magro (GuanambiCup) · 2 Jacuípe, com dois locais: Rio Jacuípe (doce) e Ponte da Cetrel (salgado) · 3 Ilha de Itaparica, em Vera Cruz · 4 Parque dos Ventos, nas eólicas do Alto Sertão (episódio lúdico, com peixes voadores) · 5 Alto-mar da Bahia, de barco (Copa Adilson Moscovits) | Definido pelo usuário: Jacuípe e a Ilha de Itaparica são lugares onde ele pescou muito; o final vai para o alto-mar para não repetir a água salgada da Ponte da Cetrel | y |
| Nomes dos campeonatos 2 a 4 | Copa Jacuípe, Copa Itaparica, Copa dos Ventos | Propostos pelo agente | n |
| Duração | 2 a 3 horas por episódio até vencer o campeonato, medidas pela simulação de um jogador típico | Decisão do usuário: ele gosta de ficar pescando | y |
| Medição da progressão | 50 sementes por episódio. PROG-01: mediana do tempo até a vitória entre 120 e 180 min. PROG-04: em pelo menos 90% das sementes, nenhum intervalo sem conquista passa de 10 min. PROG-05: taxa de vitória em 50 tentativas de campeonato | Torna os critérios de progressão testáveis sem depender de uma semente da sorte | n |
| Elenco do Episódio 2 | Viagem no tempo em Jacuípe: o Adilson pesca com a Ninha (como ele chama a filha que pediu o jogo), criança; a Lavínia aparece só como a piranha que viajou no tempo. Rivais: Tininho (dono da casa de Jacuípe, super pai), Denise (mãe do Adilson, delegada, farrista, chama ele de "JUNIORRRR") e Didi (pai do Adilson, médico, dava injeção, Bahia em Salvador e Corinthians em São Paulo). Tininho, Denise e Didi já faleceram: aparecem só no passado. Personagem local: Capenga | Definido pelo usuário; a viagem no tempo foi a forma proposta de colocar o usuário criança na história | y |
| Elenco do Episódio 3 | Ele pescava sozinho em Vera Cruz; as irmãs dele invadem a pescaria: Lu (fuma, bebe e trabalha demais; mãe de Marcus, Louise e Julia) e Geane (canceriana, dramática, acredita em E.T.). Louise, a sobrinha preferida dele, e o filho dela, Lucca, que ele adora. Rivais: Lu, Geane e Louise. Sem personagem local | Definido pelo usuário | y |
| Episódio 4 | O Adilson trabalha com energia eólica e presta serviços ao Grupo IK; num parque eólico do Alto Sertão, o vento é tão forte que os peixes voam. Com ele, o Márcio (funcionário 01, faz-tudo e muito amigo dele). Aparece o Sr. Higashi (chefe da Ninha), com a piada de botar GPS em tudo. Rivais: Márcio, Sr. Higashi e Edvaldo | Pedido do usuário: algo lúdico com peixe voador, ligado ao trabalho dele | y |
| Elenco do Episódio 5 | A grande final reúne todo mundo dos episódios anteriores num barco (Márcio de capitão). Todos torcem pelo Adilson, acreditam na melhora dele e pedem que ele não desista. Entram a Ninha adulta (nerd de TI) e a Ângela, companheira dela. Didi, Denise e Tininho aparecem só como lembrança leve, na fala de quem está no barco. Rivais: Jane, Lavínia e Ninha (adulta). Chefão: o Marlim-azul, que o Adilson solta de volta no mar. Sem personagem local novo | Pedido do usuário: uma final com todo mundo, acreditando na melhora dele | y |
| Varas e iscas | Bambu no início e 2 varas novas por episódio (11 no total), Força e Alcance de 1 a 10; 1 isca nova por episódio | Equipamento evolui junto com os 5 episódios | n |
| Espécies do Episódio 1 | Tilápia, Traíra, Curimatã, Piau, Tambaqui, Tucunaré, Pirarucu Lendário (raro; lenda inspirada no pirarucu de ~90 kg pego no sangradouro da vizinha Barragem de Ceraíma em 2022) e Piranha Lavínia (especial) | Usuário: usar os peixes mais famosos de Guanambi, o básico | y |
| Espécies dos episódios 2 a 5 | Ep. 2, Rio Jacuípe: Tilápia, Traíra, Tainha, Robalo-peva, Carapeba; Ponte da Cetrel: Robalo-flecha, Pescada-amarela, Vermelho, Baiacu, Camurupim (raro) · Ep. 3, Vera Cruz: Xaréu, Guaricema, Agulhinha, Cioba, Budião, Garoupa (raro) · Ep. 4, Parque dos Ventos (espécies fantasiosas): Peixe-voador, Lambari-rajada, Tilápia-hélice, Traíra-pipa, Pacu-planador, Dourado-dos-Ventos (raro) · Ep. 5, alto-mar: Dourado-do-mar, Cavala, Atum, Olho-de-boi, Marlim-azul (raro) | Peixes mais conhecidos de cada lugar, seguindo o critério do usuário para Guanambi; no Rio Jacuípe, guia de pesca cita robalo-peva, traíra e tainha | n |
| Tom da história | Bem-humorado e debochado, do jeito da família | Pedido do usuário: a família é debochada | y |
| Lavínia (irmã do usuário) | Entra como "Lavínia, a Piranha": peixe especial da represa e personagem nas falas; sempre chama o Adilson de "Adilsinho" e aparece em todos os episódios para pirraçar ele | Pedido da própria Lavínia e do usuário | y |
| Elenco do Episódio 1 | Jane (esposa) entrega a vara; Edvaldo (cunhado) é o dono da loja; rivais do torneio: Ricardo (boêmio, toca bongô), Bem (sogra da filha, gosta de cerveja) e Kris ("Passago de Fogo", vive mandando ele parar de tomar líquido e fala "prendrive") | Definido pelo usuário | y |
| Quem conduz o tutorial | Jane | Ela entrega a vara na abertura; mantém o tutorial dentro da história | n |
| Piadas da Jane com o Adilson | A Jane zoa o Adilson por se achar "pegador" ("pegador de peixe, só de peixe") ao longo do Episódio 1 | Pedido do usuário: ele se acha pegador | y |
| Referência de humor | Pegada cômica no estilo Dave the Diver: cartões de apresentação, expressões exageradas, fichas engraçadas | Pedido do usuário; só o tom, sem as mecânicas | y |
| Apelidos cômicos nos cartões | Propostos pelo agente em `docs/historia/episodio-1.md` | O usuário troca o que quiser | n |
| Retratos da família | O usuário manda fotos em `Fotos/` (fora do git); o agente descreve cada pessoa em texto, junto com as notas do usuário em `docs/arte/personagens.md`, e o PixelLab gera a partir da descrição. As fotos não vão para o PixelLab nem para o repositório | Preferência do usuário por fotos; privacidade da família | y |
| Personagens da família e textos da história | Ficam num arquivo de conteúdo com o marcador `{{PENDENTE}}` até o usuário enviar | Permite programar em paralelo; o build de publicação barra marcador pendente (HIST-07) | n |
| Cartas dos campeonatos | Uma carta por campeonato (5), escritas episódio a episódio com o usuário; as 5 estão prontas e aprovadas em `docs/historia/cartas.md` | Pedido do usuário: "vamos por episódios" | y |
| Nome do campeonato do Episódio 1 | "GuanambiCup" | Escolhido pelo usuário. O nome do Adilson continua no subtítulo do jogo e na grande final "Copa Adilson Moscovits", a final do Episódio 5 | y |
| Moeda | "R$" fictício | Familiar para ele; não é dinheiro real | n |
| Mira do arremesso | Tocar no ponto da água; a isca vai até lá, limitada pelo alcance da vara | Um toque, sem barra de força que exige timing | n |
| Formato do torneio | 8 arremessos, sem cronômetro; vale a soma dos 3 peixes mais pesados | Sem pressão de tempo; dá para pausar quando a enfermagem chegar | n |
| Empate no campeonato | O Adilson fica à frente do rival com a mesma pontuação | Decidido na implementação (T15); a spec não definia | n |
| Inscrição no campeonato | Não é objetivo: o campeonato libera sozinho depois do último objetivo (CAMP-01) | Não existe evento de inscrição; o Episódio 1 ficou com 6 objetivos, dentro de PROG-02 | y |
| Ficha da Piranha Lavínia | Mostra "Valor: inestimável" no lugar do valor em R$ (o saldo recebe o valor normal) | Piada do roteiro; exceção visual a PESCA-15 | y |
| Tamanho da cena | Cena lógica de 180 × 400 px com a ponta da vara em (90, 370); telas mais largas centralizam a cena e completam as laterais com o cenário; a cena fica ancorada embaixo, e em telas mais baixas que 400 × escala a parte de cima (água mais distante) é cortada, ficando visível todo ponto de arremesso em telas a partir de 660 px de altura | As zonas e o alcance das varas são medidos nessa cena (T20) | y |
| Rivais dos campeonatos | 3 rivais por campeonato, com pontuação fixa calibrada pela PROG-05 | Desafio real que ele consegue vencer; tentativas ilimitadas | n |
| Dificuldade | Perguntada na primeira abertura (Tranquilo ou Desafio) e mudável em Ajustes | A disposição dele pode variar de um dia para o outro | n |
| Iscas | Compradas uma vez, uso ilimitado | Evita ficar sem isca e ter que controlar estoque | n |
| Estilo visual | 2D em pixel art colorida e detalhada, vista de cima, com personagens expressivos de cabeça grande e retratos grandes nos diálogos; na linha visual de Dave the Diver, mas toda a arte é original (nenhum asset ou personagem do jogo) | Escolhido pelo usuário em vez de 3D (Three.js) e ajustado para o clima de Dave the Diver; a arte do jogo é protegida por direitos autorais e não pode ser usada | y |
| Origem da arte | Gerada com o PixelLab MCP (conta paga do usuário), num estilo único para personagens, família, peixes e cenário | Escolhido pelo usuário; permite retratos próprios da família | y |
| Peixe pego no torneio rende R$ | Sim, igual à pesca livre | Uma regra só, mais fácil de entender | n |
| Janelas de tempo | Fisgada: 2 s no Desafio e 4 s no Tranquilo. Linha arrebenta após 1 s em tensão 100 (só no Desafio) | Generosas para quem joga deitado, ainda com algum desafio | n |
| Interpretações da pesca (implementação, T8 a T12) | Mordida (3 a 10 s) e desistência (15 s) contam do arremesso, incluindo o voo; a janela de fisgada começa quando o "!" aparece; faixas de tensão: verde < 70, amarelo de 70 até antes de 90, vermelho ≥ 90; o 1 s em 100 zera ao soltar o dedo; se pegar e arrebentar no mesmo instante, vale a captura; valor em R$ inteiro (arredondado) | Pontos que a spec não fixava; nenhuma muda o comportamento descrito | y |
| Ritmo da briga (calibrado em T12) | Brigas de 10 a 30 s; no Desafio, quem segue as cores da barra não arrebenta a linha; no Tranquilo, basta segurar o dedo e o peixe vem em 10 s | Jogo tranquilo para quem está no leito; dá para endurecer depois, só mudando `tuning.ts` | n |

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
1. The jogo SHALL oferecer a Vara de Bambu, já possuída no início, e mais 2 varas novas por episódio, cada uma com Força e Alcance de 1 a 10 mostrados em barras. `EQUIP-01`
2. The jogo SHALL oferecer a Minhoca, já possuída no início, e pelo menos 1 isca nova por episódio, e cada isca atrai um conjunto diferente de espécies. `EQUIP-02`
3. WHEN o jogador compra um item com saldo suficiente THEN o jogo SHALL descontar o preço uma única vez e marcar o item como possuído. `EQUIP-03`
4. IF o saldo é menor que o preço do item THEN o jogo SHALL desabilitar o botão "Comprar" e mostrar quanto falta. `EQUIP-04`
5. WHEN o jogador equipa uma vara ou isca possuída THEN o jogo SHALL usá-la a partir do próximo arremesso. `EQUIP-05`
6. The jogo SHALL manter o saldo sempre maior ou igual a zero. `EQUIP-06`
7. The jogo SHALL fazer cada ponto de Força reduzir o ganho de tensão na briga e cada ponto de Alcance aumentar a distância máxima de arremesso. `EQUIP-07`
8. The jogo SHALL manter as iscas compradas com uso ilimitado. `EQUIP-08`
9. WHILE um episódio está bloqueado the jogo SHALL esconder da loja as varas e iscas dele. `EQUIP-09`

**Independent Test**: Com saldo dado, comprar a Vara de Fibra, equipá-la, conferir que o arremesso vai mais longe e que a tensão sobe mais devagar que com a de Bambu.

---

### P1: História dos 5 episódios ⭐ MVP

**User Story**: Como Adilson, quero viver uma história em que eu sou o protagonista e minha família aparece, para me sentir dentro do jogo.

**Why P1**: História com o nome dele foi um pedido explícito, e é o que transforma um jogo de pesca num presente.

**Acceptance Criteria**:
1. WHEN o jogo começa pela primeira vez THEN o jogo SHALL mostrar a cena de abertura do Episódio 1 antes da primeira pescaria. `HIST-01`
2. The jogo SHALL mostrar cada fala numa caixa de texto com o retrato e o nome do personagem. `HIST-02`
3. WHEN o jogador toca na caixa de texto THEN o jogo SHALL avançar para a fala seguinte, sem avanço automático. `HIST-03`
4. The jogo SHALL mostrar o objetivo atual do capítulo na tela de pesca. `HIST-04`
5. WHEN o jogador cumpre um objetivo THEN o jogo SHALL mostrar a cena correspondente e o objetivo seguinte. `HIST-05`
6. The jogo SHALL ler falas, personagens e objetivos de um arquivo de conteúdo separado do código. `HIST-06`
7. IF algum texto do arquivo de conteúdo contém o marcador `{{PENDENTE}}` THEN o build de publicação SHALL falhar e listar cada marcador encontrado. `HIST-07`
8. WHEN o jogador vence pela primeira vez o campeonato de um episódio de 1 a 4 THEN o jogo SHALL mostrar a cena de encerramento do episódio e o aviso "Episódio N liberado!", com N = episódio seguinte. `HIST-08`
9. WHEN o jogador pesca pela primeira vez no local de um episódio liberado THEN o jogo SHALL mostrar antes a cena de abertura daquele episódio. `HIST-09`
10. WHEN o jogador vence a Copa Adilson Moscovits pela primeira vez THEN o jogo SHALL mostrar o encerramento final da história e o aviso "A pescaria continua: todos os lugares seguem abertos". `HIST-10`

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
5. The jogo SHALL fazer a Lavínia chamar o Adilson sempre de "Adilsinho", em todas as falas dela. `HUMOR-07`
6. The jogo SHALL incluir em cada episódio pelo menos uma cena em que a Lavínia aparece para pirraçar o Adilson. `HUMOR-08`
7. The jogo SHALL fazer a Lu e a Geane, irmãs do Adilson, chamarem ele sempre de "Xô", em todas as falas delas. `HUMOR-09`

**Independent Test**: Num jogo novo, conferir o cartão da Jane na abertura, as expressões mudando entre as falas, a descrição na ficha do primeiro peixe e as provocações dos 3 rivais no torneio.

---

### P1: Campeonatos, da GuanambiCup à Copa Adilson Moscovits ⭐ MVP

**User Story**: Como Adilson, quero disputar 5 campeonatos, da GuanambiCup da minha cidade à Copa com o meu nome, e ao vencer cada um ler uma carta da minha família.

**Why P1**: Campeonatos com o nome dele e da cidade dele, e cartas da família, foram pedidos explícitos.

**Acceptance Criteria**:
1. WHILE o último objetivo de um episódio não foi cumprido the jogo SHALL mostrar o campeonato do episódio como bloqueado, com o objetivo que falta. `CAMP-01`
2. WHEN o jogador entra num campeonato THEN o jogo SHALL mostrar o nome do campeonato do episódio (no Episódio 1, "GuanambiCup"; no 5, "Copa Adilson Moscovits"), as regras e os 3 rivais. `CAMP-02`
3. WHILE o torneio está em andamento the jogo SHALL mostrar quantos dos 8 arremessos restam e a pontuação parcial. `CAMP-03`
4. The jogo SHALL calcular a pontuação do torneio como a soma dos pesos dos 3 peixes mais pesados pegos nele. `CAMP-04`
5. WHEN o 8º arremesso do torneio termina THEN o jogo SHALL mostrar a classificação final com o jogador e os 3 rivais. `CAMP-05`
6. WHEN o jogador termina um campeonato em 1º lugar pela primeira vez THEN o jogo SHALL mostrar a carta da família daquele campeonato, com o remetente e o texto. `CAMP-06`
7. WHEN o jogador termina um campeonato em 1º lugar pela primeira vez THEN o jogo SHALL adicionar o troféu daquele campeonato ao perfil. `CAMP-07`
8. IF o jogador vence de novo um campeonato que já tinha vencido THEN o jogo SHALL manter um único troféu e uma única carta daquele campeonato. `CAMP-08`
9. IF o jogador não termina em 1º lugar THEN o jogo SHALL mostrar a colocação e o botão "Tentar de novo", sem custo e sem limite de tentativas. `CAMP-09`
10. The jogo SHALL deixar toda mensagem desbloqueada disponível para reler na tela "Mensagens" do menu. `CAMP-10`

**Independent Test**: Com os objetivos do Episódio 1 concluídos: jogar os 8 arremessos, ver a classificação; ao vencer, ler a carta, ver o troféu no perfil e reabrir a carta pelo menu.

---

### P1: Mapa e 5 episódios ⭐ MVP

**User Story**: Como Adilson, quero viajar por 5 lugares de pesca do Brasil, liberando um de cada vez, e voltar a qualquer um deles quando quiser.

**Why P1**: O usuário pediu no mínimo 5 episódios, entregues juntos.

**Acceptance Criteria**:
1. The jogo SHALL ter 5 episódios, nesta ordem: 1 Barragem do Poço do Magro (GuanambiCup), 2 Jacuípe (Rio Jacuípe e Ponte da Cetrel), 3 Ilha de Itaparica (Vera Cruz), 4 Parque dos Ventos e 5 Alto-mar da Bahia (Copa Adilson Moscovits). `EPI-01`
2. WHEN o jogador vence pela primeira vez o campeonato de um episódio de 1 a 4 THEN o jogo SHALL liberar o episódio seguinte e o local dele no Mapa. `EPI-02`
3. WHILE um episódio está bloqueado the jogo SHALL mostrar o local dele no Mapa com cadeado e o nome do campeonato que o libera. `EPI-03`
4. WHEN o jogador toca num local liberado no Mapa THEN o jogo SHALL abrir a pesca naquele local. `EPI-04`
5. The jogo SHALL permitir pescar em qualquer local liberado a qualquer momento, rendendo R$, álbum e recordes, inclusive depois de vencer a Copa Adilson Moscovits. `EPI-05`
6. The jogo SHALL dar a cada episódio pelo menos um local com cenário próprio, pelo menos 5 espécies próprias com 1 rara, um campeonato com 3 rivais e uma carta da família. `EPI-06`
7. WHEN o jogo é reaberto THEN o jogo SHALL voltar ao último local em que o jogador estava pescando. `EPI-07`
8. WHERE um episódio tem dois locais the jogo SHALL mostrar os dois no Mapa, liberados juntos, cada um com cenário e espécies próprios. `EPI-08`

**Independent Test**: Num perfil com o Episódio 1 vencido: o Mapa mostra o Rio Jacuípe e a Ponte da Cetrel liberados e os episódios 3 a 5 com cadeado; tocar em cada local abre a pesca no lugar certo, com os peixes de lá.

---

### P1: Progressão longa ⭐ MVP

**User Story**: Como Adilson, quero ter sempre um próximo peixe, vara ou objetivo para buscar, para passar horas pescando sem acabar rápido.

**Why P1**: Ele gosta de ficar pegando peixe; o usuário pediu progressão mais demorada.

**Acceptance Criteria**:
1. The jogo SHALL exigir de 2 a 3 horas de jogo para cumprir os objetivos e vencer o campeonato de cada episódio, segundo a simulação de um jogador típico. `PROG-01`
2. The jogo SHALL ter entre 6 e 8 objetivos por episódio antes do campeonato. `PROG-02`
3. The jogo SHALL incluir em cada episódio um objetivo de pegar a espécie rara do local e um de registrar no álbum todas as espécies do local. `PROG-03`
4. The jogo SHALL dar ao jogador típico simulado uma conquista (objetivo cumprido, item ao alcance do saldo, espécie nova ou recorde) pelo menos a cada 10 minutos de jogo. `PROG-04`
5. The jogo SHALL calibrar o campeonato de cada episódio para que o jogador típico simulado vença com a melhor vara daquele episódio em pelo menos 60% das tentativas e com a melhor vara do episódio anterior em no máximo 20%. `PROG-05`

**Independent Test**: Rodar a simulação de progressão: para cada episódio, o tempo até a vitória fica entre 2 e 3 horas, sem intervalo maior que 10 minutos entre conquistas.

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

### P2: Sala de troféus

**User Story**: Como Adilson, quero ver todos os troféus que conquistei e os que ainda faltam.

**Why P2**: Com 5 campeonatos, a coleção de troféus vira motivo para continuar, mas o jogo funciona sem ela.

**Acceptance Criteria**:
1. The jogo SHALL mostrar na Sala de Troféus os 5 troféus dos campeonatos, os conquistados em destaque e os que faltam como silhueta com o nome do campeonato. `TROF-01`

**Independent Test**: Num perfil com a GuanambiCup vencida, a sala mostra esse troféu em destaque e outros 4 como silhueta.

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
| State-transition integrity | PESCA-03, PESCA-08, PESCA-09, ACES-03, CAMP-01, SAVE-01, TUTO-03, EPI-02, EPI-03, EQUIP-09 |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| INST-01 | P1: Instalar e abrir | - | Pending |
| INST-02 | P1: Instalar e abrir | T27, T34 | Implementing |
| INST-03 | P1: Instalar e abrir | T27, T34 | Implementing |
| INST-04 | P1: Instalar e abrir | T27, T34 | Implementing |
| INST-05 | P1: Instalar e abrir | T3 | Implementing |
| INST-06 | P1: Instalar e abrir | T3, T47 | Implementing |
| INST-07 | P1: Instalar e abrir | - | Pending |
| INST-08 | P1: Instalar e abrir | T5 | Implementing |
| INST-09 | P1: Instalar e abrir | T3 | Implementing |
| PESCA-01 | P1: Pescar com um dedo | T8 | Implementing |
| PESCA-02 | P1: Pescar com um dedo | T8 | Implementing |
| PESCA-03 | P1: Pescar com um dedo | T8 | Implementing |
| PESCA-04 | P1: Pescar com um dedo | T9 | Implementing |
| PESCA-05 | P1: Pescar com um dedo | T9 | Implementing |
| PESCA-06 | P1: Pescar com um dedo | - | Pending |
| PESCA-07 | P1: Pescar com um dedo | T26, T29, T37 | Implementing |
| PESCA-08 | P1: Pescar com um dedo | T9 | Implementing |
| PESCA-09 | P1: Pescar com um dedo | T9 | Implementing |
| PESCA-10 | P1: Pescar com um dedo | T10 | Implementing |
| PESCA-11 | P1: Pescar com um dedo | T10 | Implementing |
| PESCA-12 | P1: Pescar com um dedo | T10, T36 | Implementing |
| PESCA-13 | P1: Pescar com um dedo | T10 | Implementing |
| PESCA-14 | P1: Pescar com um dedo | T10 | Implementing |
| PESCA-15 | P1: Pescar com um dedo | T11, T37 | Implementing |
| PESCA-16 | P1: Pescar com um dedo | T11 | Implementing |
| PESCA-17 | P1: Pescar com um dedo | T11, T29 | Implementing |
| TUTO-01 | P1: Tutorial da primeira pescaria | T17 | Implementing |
| TUTO-02 | P1: Tutorial da primeira pescaria | - | Pending |
| TUTO-03 | P1: Tutorial da primeira pescaria | T17 | Implementing |
| TUTO-04 | P1: Tutorial da primeira pescaria | T17 | Implementing |
| TUTO-05 | P1: Tutorial da primeira pescaria | T17 | Implementing |
| TUTO-06 | P1: Tutorial da primeira pescaria | T17 | Implementing |
| TUTO-07 | P1: Tutorial da primeira pescaria | T17, T40 | Implementing |
| TUTO-08 | P1: Tutorial da primeira pescaria | T17, T29 | Implementing |
| TUTO-09 | P1: Tutorial da primeira pescaria | T18, T35 | Implementing |
| EQUIP-01 | P1: Varas, iscas e loja | T21, T41 | Implementing |
| EQUIP-02 | P1: Varas, iscas e loja | T20, T21, T41 | Implementing |
| EQUIP-03 | P1: Varas, iscas e loja | T13 | Implementing |
| EQUIP-04 | P1: Varas, iscas e loja | T13, T41 | Implementing |
| EQUIP-05 | P1: Varas, iscas e loja | T13, T41 | Implementing |
| EQUIP-06 | P1: Varas, iscas e loja | T13 | Implementing |
| EQUIP-07 | P1: Varas, iscas e loja | T8, T10 | Implementing |
| EQUIP-08 | P1: Varas, iscas e loja | T13 | Implementing |
| EQUIP-09 | P1: Varas, iscas e loja | T55, T41 | Implementing |
| HIST-01 | P1: História dos 5 episódios | T16, T39 | Implementing |
| HIST-02 | P1: História dos 5 episódios | - | Pending |
| HIST-03 | P1: História dos 5 episódios | - | Pending |
| HIST-04 | P1: História dos 5 episódios | T16, T36 | Implementing |
| HIST-05 | P1: História dos 5 episódios | T16 | Implementing |
| HIST-06 | P1: História dos 5 episódios | T23 | Implementing |
| HIST-07 | P1: História dos 5 episódios | T4 | Implementing |
| HIST-08 | P1: História dos 5 episódios | T16, T44 | Implementing |
| HIST-09 | P1: História dos 5 episódios | T16 | Implementing |
| HIST-10 | P1: História dos 5 episódios | T16, T44 | Implementing |
| HUMOR-01 | P1: Pegada cômica nos personagens | T22, T39 | Implementing |
| HUMOR-02 | P1: Pegada cômica nos personagens | T22, T39 | Implementing |
| HUMOR-03 | P1: Pegada cômica nos personagens | T20, T37 | Implementing |
| HUMOR-04 | P1: Pegada cômica nos personagens | T24, T43 | Implementing |
| HUMOR-07 | P1: Pegada cômica nos personagens | T23 | Implementing |
| HUMOR-08 | P1: Pegada cômica nos personagens | T23 | Implementing |
| HUMOR-09 | P1: Pegada cômica nos personagens | T57 | Implementing |
| CAMP-01 | P1: Campeonatos | T16, T43 | Implementing |
| CAMP-02 | P1: Campeonatos | T24, T43 | Implementing |
| CAMP-03 | P1: Campeonatos | - | Pending |
| CAMP-04 | P1: Campeonatos | T15 | Implementing |
| CAMP-05 | P1: Campeonatos | T15, T43 | Implementing |
| CAMP-06 | P1: Campeonatos | T15, T44 | Implementing |
| CAMP-07 | P1: Campeonatos | T15 | Implementing |
| CAMP-08 | P1: Campeonatos | T15 | Implementing |
| CAMP-09 | P1: Campeonatos | T15, T43 | Implementing |
| CAMP-10 | P1: Campeonatos | - | Pending |
| EPI-01 | P1: Mapa e 5 episódios | T56 a T59 | Implementing |
| EPI-02 | P1: Mapa e 5 episódios | T55 | Implementing |
| EPI-03 | P1: Mapa e 5 episódios | T55, T62 | Implementing |
| EPI-04 | P1: Mapa e 5 episódios | T55, T62 | Implementing |
| EPI-05 | P1: Mapa e 5 episódios | T55 | Implementing |
| EPI-06 | P1: Mapa e 5 episódios | T20, T56 a T59 | Implementing |
| EPI-07 | P1: Mapa e 5 episódios | T55, T62 | Implementing |
| EPI-08 | P1: Mapa e 5 episódios | T55, T62 | Implementing |
| PROG-01 | P1: Progressão longa | - | Pending |
| PROG-02 | P1: Progressão longa | T23, T56 a T59 | Implementing |
| PROG-03 | P1: Progressão longa | T23, T56 a T59 | Implementing |
| PROG-04 | P1: Progressão longa | - | Pending |
| PROG-05 | P1: Progressão longa | - | Pending |
| SAVE-01 | P1: Pausa e progresso salvo | T26, T38 | Implementing |
| SAVE-02 | P1: Pausa e progresso salvo | - | Pending |
| SAVE-03 | P1: Pausa e progresso salvo | - | Pending |
| SAVE-04 | P1: Pausa e progresso salvo | T25, T29 | Implementing |
| SAVE-05 | P1: Pausa e progresso salvo | T25, T47 | Implementing |
| SAVE-06 | P1: Pausa e progresso salvo | T15, T29 | Implementing |
| SAVE-07 | P1: Pausa e progresso salvo | T25 | Implementing |
| SAVE-08 | P1: Pausa e progresso salvo | T19, T25 | Implementing |
| SAVE-09 | P1: Pausa e progresso salvo | T19 | Implementing |
| SAVE-10 | P1: Pausa e progresso salvo | T25 | Implementing |
| ACES-01 | P1: Conforto e acessibilidade | - | Pending |
| ACES-02 | P1: Conforto e acessibilidade | T18, T35 | Implementing |
| ACES-03 | P1: Conforto e acessibilidade | T10 | Implementing |
| ACES-04 | P1: Conforto e acessibilidade | T18, T35 | Implementing |
| ACES-05 | P1: Conforto e acessibilidade | - | Pending |
| ACES-06 | P1: Conforto e acessibilidade | - | Pending |
| ACES-07 | P1: Conforto e acessibilidade | - | Pending |
| ACES-08 | P1: Conforto e acessibilidade | - | Pending |
| ACES-09 | P1: Conforto e acessibilidade | T31, T48 | Implementing |
| ACES-10 | P1: Conforto e acessibilidade | T26, T38 | Implementing |
| ALBUM-01 | P2: Álbum de peixes | T14 | Implementing |
| ALBUM-02 | P2: Álbum de peixes | T14, T37 | Implementing |
| ALBUM-03 | P2: Álbum de peixes | - | Pending |
| TELA-01 | P2: Tela acesa durante a pesca | T26, T36 | Implementing |
| TELA-02 | P2: Tela acesa durante a pesca | T26 | Implementing |
| HUMOR-05 | P2: Celebração exagerada | - | Pending |
| HUMOR-06 | P2: Celebração exagerada | - | Pending |
| TROF-01 | P2: Sala de troféus | - | Pending |

**ID format:** `[CATEGORIA]-[NÚMERO]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 113 total, todos mapeados no tasks.md; 90 em implementação

---

## Success Criteria

- [ ] Instalação testada no Android do usuário: do link ao ícone na tela em menos de 1 minuto.
- [ ] Jogo completo testado em modo avião depois da primeira abertura.
- [ ] A simulação de um jogador típico conclui cada episódio em 2 a 3 horas, sem passar 10 minutos sem conquista (PROG-01, PROG-04).
- [ ] Um jogador que nunca viu o jogo conclui o tutorial e pega os 3 primeiros peixes em até 10 minutos.
- [ ] Cada briga dura entre 8 e 40 segundos para quem segura e solta conforme a cor da barra.
- [ ] Nenhum marcador `{{PENDENTE}}` na versão publicada.
- [ ] O Adilson joga e se diverte.
