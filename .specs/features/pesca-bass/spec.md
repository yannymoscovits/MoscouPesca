# Pescaria nova (bass de portátil com briga no estilo Stardew) Specification

**Status**: Approved (2026-10-31) · briga trocada pela barra de captura no estilo Stardew (2026-10-31)

> Refaz a jogabilidade da pescaria do MoscouFishing (`.specs/features/v1-mvp`). Substitui as histórias "Pescar com um dedo" (PESCA-01 a PESCA-14), os passos do tutorial (TUTO-03 a TUTO-06) e a regra de Força da vara sobre a tensão (EQUIP-07, primeira metade) da v1. A ficha do peixe (PESCA-15 a PESCA-17), a loja, os episódios, os campeonatos e as medalhas continuam como estão.
> Critérios em EARS, com as palavras-chave em inglês para a validação automática.

## Problem Statement

O usuário achou a pescaria atual horrível: o Adilson toca na água, espera e toca de novo, numa tela quase vazia. A pescaria nova junta duas referências que o usuário escolheu: dos jogos de pesca de bass dos portáteis, que o Adilson jogava, vêm escolher o ponto, mirar o arremesso com força e ver a isca debaixo d'água atraindo o peixe; do Stardew Valley vem a briga, em que o jogador segura um botão para manter o peixe dentro de uma faixa até o medidor encher. Tudo com arte própria, jogável deitado, com uma mão.

## Goals

- [ ] Cada arremesso tem decisão do jogador do começo ao fim: ponto, direção, força, ritmo da isca, fisgada e briga.
- [ ] O Adilson vê o peixe chegar na isca antes de fisgar, em todo arremesso que tem peixe.
- [ ] A pescaria inteira funciona com botões na metade de baixo da tela; a briga usa um botão só (segurar e soltar).
- [ ] No modo Tranquilo nenhum peixe fisgado escapa.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Iscas artificiais com ação própria (rapala, spinner, jig) | As iscas da v1 continuam; ação diferente por isca fica para depois |
| Pilotar barco pelo lago | Ponto escolhido num mapa resolve; dirigir pede mais controles |
| Baú de tesouro durante a briga | Não pedido; seria uma recompensa nova a calibrar |
| Clima, hora do dia e estações | Não pedido; mudaria a calibragem de todos os episódios |
| Trocar os botões de lado (canhoto) | Não pedido; os botões ficam alcançáveis pelo polegar |
| Som | Fora da v1 (decisão anterior: som desligado na UTI) |
| Copiar código, telas, sprites ou nomes de jogos existentes | Só a mecânica; código e arte próprios. O repositório `afaur/fishing-sim` foi lido como referência e não tem licença, então nada dele é copiado |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Referências | Bass de portátil (o usuário citou "American Bass" do Game Boy) para ponto, arremesso e isca; Stardew Valley para a briga | Escolha do usuário; vale a mecânica, sem tela, sprite ou código copiado | y |
| Quatro telas | 1 Pesqueiro (lugar visto de cima com os pontos), 2 Arremesso (água vista de cima, de trás do Adilson), 3 Debaixo d'água (vista de lado, com a isca e os peixes), 4 Briga (barra de captura vertical ao lado da vista debaixo d'água) | Escolha do usuário | y |
| Controles | ARREMESSAR na tela de arremesso; RECOLHER (segurar) e PUXAR (tocar) na água; na briga, um botão só, SEGURAR, na largura dos dois | Escolha do usuário ("como os botões do Game Boy"); a briga do Stardew é de um botão | y |
| Física da briga | Baseada no código de conceito enviado pelo usuário, convertida de quadros para segundos: a faixa verde cai com gravidade de 1,4 barra/s², sobe com 2,8 barra/s² enquanto o botão está seguro, velocidade máxima de 1,2 barra/s, para no teto e quica no fundo devolvendo 60% da velocidade; o peixe sorteia um destino a cada 0,5 a 1,5 s e desliza até ele (aproximação exponencial de 6/s); o medidor começa em 30% | Pedido do usuário; em segundos o jogo anda igual em celular rápido ou lento; o empurrão do conceito (-3,5 por quadro contra 0,15 de gravidade) jogava a faixa no teto na hora | n |
| "Peixe dentro da faixa" | O centro do peixe está entre o topo e a base da faixa | Igual ao código de conceito | y |
| Altura da faixa | 18% da barra + 1,5% por ponto de Força da vara (Bambu, Força 1: 19,5%; Força 10: 33%); × 1,4 no Tranquilo | Vara melhor facilita a briga, como a Força fazia na tensão | n |
| Medidor | Enche 15%/s com o peixe dentro e esvazia 12%/s com o peixe fora; o fôlego da espécie (1 a 10) reduz o enchimento em 0,7%/s por ponto; no Tranquilo esvazia 6%/s e nunca desce de 10% | Brigas de uns 6 a 20 s; no Tranquilo o peixe nunca escapa (mesma promessa do Tranquilo da v1) | n |
| Jeito de cada peixe | A força da espécie (1 a 10) acelera o peixe e encurta o tempo entre destinos; o campo opcional `fightStyle` dá o jeito: `calmo` (destinos perto), `saltador` (destinos longe), `afundador` (destinos na metade de baixo); sem campo, vale `calmo` até força 4 e `saltador` a partir de 5 | Traíra dá saltos, tambaqui é lento e pesado, o Marlim é o chefão; usa os números que as espécies já têm | n |
| Tranquilo na briga | Peixe 40% mais lento e 50% mais tempo entre destinos | Mais fácil para quem joga deitado | n |
| Pontos de cada local | Os pontos do pesqueiro são as zonas que cada local já tem (raso, meio e fundo; 3 por local), cada um com nome próprio do lugar (ex.: "Beira do píer", "Pedral", "Fundão") e um alcance mínimo de vara | Mantém as espécies por zona e a progressão por vara da v1 | n |
| Alcance mínimo dos pontos | Raso: qualquer vara; meio: alcance 3; fundo: alcance 5 (os números finais saem da calibragem) | Hoje a vara curta não chega ao fundo; a regra continua, agora por ponto | n |
| Seta da mira | Balança num arco de 90° à frente do Adilson; ida e volta em 2 s no Desafio e em 4 s no Tranquilo | Ritmo de Game Boy, mais lento no Tranquilo | n |
| Barra de força | Enche e esvazia (0 → 100 → 0) em 2 s no Desafio e em 4 s no Tranquilo; distância = (30% + 70% × força) × alcance máximo da vara | Arremesso fraco ainda cai na água; força cheia usa todo o alcance | n |
| Escala debaixo d'água | Distância e profundidade em metros; 0,1 m por px lógico do alcance da v1 (Bambu chega a 10,8 m); a isca começa na distância do arremesso e na superfície; o fundo é a profundidade da zona (`depthM`) | Os medidores Linha e Profundidade da v1 continuam valendo | n |
| Movimento da isca | RECOLHER: 1 m/s em direção ao Adilson, subindo 0,2 m/s; PUXAR: tranco de 0,6 m para frente e 0,4 m para cima; parada, afunda 0,3 m/s até o fundo | Valores iniciais; ajustáveis em `tuning.ts` sem mudar requisito | n |
| Peixes na água | De 3 a 6 peixes por arremesso, sorteados entre as espécies do ponto com a raridade de cada uma; cada peixe nada numa profundidade sorteada | Sempre tem movimento na tela; raros continuam raros | n |
| Interesse do peixe | Peixe a até 2 m da isca, de espécie que aceita a isca equipada, vira e segue a isca; peixe de espécie que não aceita olha, mostra "não gostou" e vai embora | Ensina a escolher isca sem texto longo | n |
| Ataque | O peixe que segue a isca ataca entre 2 e 5 s depois de começar a seguir (sorteado); cada PUXAR durante a perseguição adianta o ataque em 1 s, até o mínimo de 0,5 s | Recompensa trabalhar a isca, sem punir quem só recolhe | n |
| Fisgada | Janela de 2 s no Desafio e 4 s no Tranquilo, como na v1 | Generosa para quem joga deitado | y |
| Fisgada perdida | O peixe foge, a isca continua na água e outros peixes ainda podem vir | Menos frustrante que perder o arremesso inteiro | n |
| Arremessos no campeonato | Cada arremesso termina num resultado (peixe pego, peixe fugiu na briga ou nada) e conta como 1 dos 8 do torneio | A regra de 8 arremessos da v1 continua | n |
| Tamanho e lugar dos botões | RECOLHER à esquerda e PUXAR à direita, cada um com pelo menos 40% da largura e 72 px de altura, no quarto de baixo da tela; ARREMESSAR e SEGURAR ocupam a largura dos dois | Polegar alcança com o celular numa mão; atende ACES-06 (mínimo 56 × 56) | n |
| Arte das telas novas | Pesqueiro, vista debaixo d'água e barra de captura desenhados em código na paleta de cada local (como a cena atual), sem imitar a moldura de bambu do Stardew; peixes com silhueta e cor de cada espécie até a arte dos peixes chegar (fase de arte da v1) | Restam 3 gerações do PixelLab; a arte dos peixes já é uma tarefa da v1 | n |
| Voltar ao jogo | Reabrir o jogo volta ao pesqueiro do último local (EPI-07), sem guardar o arremesso em andamento | Sem estado novo para salvar; um arremesso dura menos de 1 minuto | n |
| Calibragem (T61 da v1) | Refeita depois da pescaria nova, com a simulação do jogador típico usando as novas regras | Os tempos por arremesso mudam; a decisão entre as opções da T61 fica para depois disso | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Escolher o ponto ⭐ MVP

**User Story**: Como Adilson, quero ver o lugar de cima e escolher onde pescar, para ir atrás do peixe que eu quero.

**Why P1**: Dá a primeira decisão de cada pescaria e mantém a progressão por vara.

**Acceptance Criteria**:
1. WHEN o jogador começa a pescar num local THEN o jogo SHALL mostrar o pesqueiro: o local visto de cima, com os pontos daquele local marcados e nomeados. `PONTO-01`
2. WHEN o jogador toca num ponto THEN o jogo SHALL destacar o ponto e mostrar, para cada espécie que vive ali, o nome se já foi pescada ou "???" se ainda não foi. `PONTO-02`
3. IF a vara equipada tem alcance menor que o mínimo do ponto THEN o jogo SHALL mostrar o ponto com cadeado e a frase "Precisa de vara com alcance N", sem permitir pescar nele. `PONTO-03`
4. WHEN o jogador toca em "Pescar aqui" com um ponto liberado destacado THEN o jogo SHALL abrir a tela de arremesso nesse ponto. `PONTO-04`
5. WHILE o jogador está na tela de arremesso the jogo SHALL mostrar o botão "Trocar de ponto", que volta ao pesqueiro. `PONTO-05`
6. The jogo SHALL sortear os peixes de cada arremesso só entre as espécies do ponto escolhido. `PONTO-06`

**Independent Test**: No Poço do Magro com a Vara de Bambu: o pesqueiro mostra 3 pontos, o mais fundo com cadeado; escolher o raso abre o arremesso.

---

### P1: Mirar e arremessar com força ⭐ MVP

**User Story**: Como Adilson, quero mirar e acertar a força do arremesso, para jogar a isca onde eu quero.

**Why P1**: É o momento de habilidade do arremesso que os jogos de bass têm.

**Acceptance Criteria**:
1. WHEN a tela de arremesso abre THEN o jogo SHALL mostrar a água vista de cima, o Adilson de costas embaixo e uma seta que balança num arco de 90° à frente dele. `ARREM-01`
2. WHEN o jogador aperta ARREMESSAR com a seta balançando THEN o jogo SHALL travar a direção e começar a encher e esvaziar a barra de força. `ARREM-02`
3. WHEN o jogador aperta ARREMESSAR com a barra de força em movimento THEN o jogo SHALL arremessar a isca na direção travada, a uma distância de (30% + 70% × força) do alcance máximo da vara. `ARREM-03`
4. WHILE a isca está em voo the jogo SHALL ignorar os botões. `ARREM-04`
5. WHEN a isca cai na água THEN o jogo SHALL mostrar o respingo e passar para a tela debaixo d'água. `ARREM-05`
6. WHERE o modo Tranquilo está ativo the jogo SHALL completar cada ida e volta da seta e cada ciclo da barra em 4 s, e no modo Desafio em 2 s. `ARREM-06`

**Independent Test**: Travar a seta à esquerda e a força no máximo: a isca cai à esquerda, no alcance máximo da vara.

---

### P1: Trabalhar a isca debaixo d'água ⭐ MVP

**User Story**: Como Adilson, quero ver a isca e os peixes debaixo d'água e mexer a isca para atrair o peixe, para sentir que fui eu que peguei.

**Why P1**: É o coração dos jogos de bass e o que falta na pescaria atual.

**Acceptance Criteria**:
1. WHEN a isca cai na água THEN o jogo SHALL mostrar o ponto visto de lado, com superfície, fundo, a isca e de 3 a 6 peixes nadando. `ISCA-01`
2. WHILE o jogador segura RECOLHER the jogo SHALL trazer a isca em direção ao Adilson a 1 m/s, subindo 0,2 m/s. `ISCA-02`
3. WHEN o jogador toca em PUXAR com a isca na água e sem peixe fisgado THEN o jogo SHALL dar um tranco na isca de 0,6 m para frente e 0,4 m para cima. `ISCA-03`
4. WHILE a isca está parada the jogo SHALL deixá-la afundar a 0,3 m/s até o fundo do ponto. `ISCA-04`
5. WHEN a isca passa a até 2 m de um peixe de espécie que aceita a isca equipada THEN o jogo SHALL fazer esse peixe virar e seguir a isca. `ISCA-05`
6. WHEN a isca passa a até 2 m de um peixe de espécie que não aceita a isca equipada THEN o jogo SHALL mostrar o balão "não gostou" sobre o peixe e fazê-lo nadar para longe. `ISCA-06`
7. WHILE um peixe segue a isca the jogo SHALL fazê-lo atacar entre 2 e 5 s depois de começar a seguir, adiantando o ataque em 1 s a cada PUXAR, até o mínimo de 0,5 s. `ISCA-07`
8. WHEN um peixe ataca a isca THEN o jogo SHALL mostrar um "!" grande sobre ele e o botão PUXAR piscando com o texto "FISGAR!". `ISCA-08`
9. WHERE a vibração está ligada the jogo SHALL vibrar o celular por 300 ms quando um peixe ataca. `ISCA-09`
10. WHEN o jogador aperta PUXAR dentro da janela de fisgada (2 s no Desafio, 4 s no Tranquilo) THEN o jogo SHALL fisgar o peixe e começar a briga. `ISCA-10`
11. IF a janela de fisgada termina sem PUXAR THEN o jogo SHALL mostrar "Escapou!", fazer o peixe fugir e manter a isca na água. `ISCA-11`
12. WHEN a isca chega ao Adilson sem peixe fisgado THEN o jogo SHALL mostrar "Nada dessa vez" e voltar à tela de arremesso. `ISCA-12`
13. WHILE a isca está na água the jogo SHALL mostrar a linha solta em metros e a profundidade da isca em metros. `ISCA-13`

**Independent Test**: Com minhoca no raso do Poço do Magro: recolher até um peixe seguir a isca, tocar PUXAR até ele atacar, apertar PUXAR no "FISGAR!" e ver a briga começar.

---

### P1: Brigar com o peixe na barra de captura ⭐ MVP

**User Story**: Como Adilson, quero brigar com o peixe segurando um botão para manter ele dentro da faixa, para a captura ter emoção sem precisar de reflexo rápido.

**Why P1**: Fecha cada arremesso; escolha do usuário (briga no estilo Stardew Valley).

**Acceptance Criteria**:
1. WHEN um peixe é fisgado THEN o jogo SHALL mostrar a barra de captura vertical com o peixe dentro, a faixa verde no fundo da barra e, ao lado, o medidor de captura em 30%. `BRIGA-01`
2. WHILE o jogador segura SEGURAR the jogo SHALL acelerar a faixa verde para cima a 2,8 barra/s² contra a gravidade de 1,4 barra/s², até a velocidade máxima de 1,2 barra/s. `BRIGA-02`
3. WHILE o jogador não segura SEGURAR the jogo SHALL fazer a faixa verde cair com a gravidade de 1,4 barra/s². `BRIGA-03`
4. WHEN a faixa verde bate no fundo da barra THEN o jogo SHALL fazê-la quicar com 60% da velocidade, para cima. `BRIGA-04`
5. WHEN a faixa verde bate no topo da barra THEN o jogo SHALL pará-la no topo, com velocidade zero. `BRIGA-05`
6. The jogo SHALL fazer o peixe sortear um novo destino na barra a cada 0,5 a 1,5 s e deslizar até ele, mais rápido quanto maior a força da espécie, conforme o jeito da espécie (calmo, saltador ou afundador). `BRIGA-06`
7. The jogo SHALL dar à faixa verde a altura de 18% da barra mais 1,5% por ponto de Força da vara equipada. `BRIGA-07`
8. WHILE o centro do peixe está dentro da faixa verde the jogo SHALL encher o medidor a (15% − 0,7% × fôlego da espécie) por segundo. `BRIGA-08`
9. WHILE o centro do peixe está fora da faixa verde the jogo SHALL esvaziar o medidor a 12% por segundo no Desafio e 6% por segundo no Tranquilo. `BRIGA-09`
10. WHEN o medidor chega a 100% THEN o jogo SHALL mostrar a ficha do peixe da v1 (PESCA-15 a PESCA-17). `BRIGA-10`
11. IF o medidor chega a 0% no modo Desafio THEN o jogo SHALL soltar o peixe, mostrar "O peixe fugiu!" e voltar à tela de arremesso. `BRIGA-11`
12. WHILE o modo Tranquilo está ativo the jogo SHALL manter o medidor em no mínimo 10%, deixar a faixa 40% mais alta, o peixe 40% mais lento e o intervalo entre destinos 50% maior. `BRIGA-12`
13. WHILE a briga acontece the jogo SHALL mostrar o peixe fisgado se debatendo na vista debaixo d'água, com a linha esticada até a vara. `BRIGA-13`

**Independent Test**: No Desafio, fisgar um tambaqui, segurar e soltar SEGURAR para manter o peixe na faixa até o medidor encher e ver a ficha; numa segunda briga, não tocar em nada e ver "O peixe fugiu!"; no Tranquilo, não tocar em nada e ver o medidor parar em 10%.

---

### P1: Botões grandes na tela ⭐ MVP

**User Story**: Como Adilson, quero botões grandes embaixo, como no Game Boy, para pescar deitado com o polegar.

**Why P1**: Escolha do usuário para o controle com uma mão.

**Acceptance Criteria**:
1. WHILE a isca está na água the jogo SHALL mostrar RECOLHER à esquerda e PUXAR à direita, cada um com pelo menos 40% da largura da tela e 72 px de altura, no quarto de baixo da tela. `BOTAO-01`
2. WHILE a tela de arremesso está aberta the jogo SHALL mostrar o botão ARREMESSAR ocupando a largura dos dois, no mesmo lugar. `BOTAO-02`
3. WHILE a briga acontece the jogo SHALL mostrar o botão SEGURAR ocupando a largura dos dois, no mesmo lugar. `BOTAO-05`
4. WHILE um botão não tem efeito no momento the jogo SHALL mostrá-lo apagado e ignorar toques nele. `BOTAO-03`
5. The jogo SHALL responder ao botão no momento em que o dedo encosta (RECOLHER e SEGURAR enquanto o dedo fica encostado), sem esperar o dedo sair. `BOTAO-04`

**Independent Test**: Num celular de 360 × 780 px, medir os botões no arremesso, na água e na briga; na isca parada, PUXAR funciona; em voo, os botões ficam apagados.

---

### P1: Tutorial da pescaria nova ⭐ MVP

**User Story**: Como Adilson, quero que a Jane me ensine a pescaria nova passo a passo, para aprender sem manual.

**Why P1**: A pescaria nova tem mais passos; sem tutorial ele não descobre os botões.

**Acceptance Criteria**:
1. WHEN o tutorial da v1 começa (TUTO-01) THEN o jogo SHALL mostrar os passos nesta ordem: escolher o ponto, travar a direção, travar a força, segurar RECOLHER, tocar PUXAR para atrair, apertar PUXAR no "FISGAR!", segurar SEGURAR para subir a faixa, soltar para a faixa descer, manter o peixe na faixa até o medidor encher. `TUTOB-01`
2. WHILE o tutorial está ativo the jogo SHALL fazer um peixe de espécie que aceita a isca começar a seguir a isca em até 3 s depois que ela cai na água. `TUTOB-02`
3. WHILE o tutorial está ativo the jogo SHALL manter aberta a janela de fisgada até o jogador apertar PUXAR. `TUTOB-03`
4. WHILE o tutorial está ativo the jogo SHALL usar na briga o peixe com jeito calmo e as regras do Tranquilo da barra de captura (BRIGA-12). `TUTOB-04`

**Independent Test**: Num jogo novo, seguir só as falas e setas da Jane até pegar o primeiro peixe, passando por todos os passos na ordem.

---

### P1: Simulação com as regras novas ⭐ MVP

**User Story**: Como família, quero que a simulação do jogador típico use a pescaria nova, para recalibrar os 2 a 3 horas por episódio.

**Why P1**: A progressão longa (PROG da v1) é medida pela simulação; com regras novas, a medição antiga não vale.

**Acceptance Criteria**:
1. The simulação SHALL jogar cada arremesso com as regras desta spec (ponto, mira, força, isca, ataque, fisgada e barra de captura), dando o mesmo resultado para a mesma semente. `SIMB-01`
2. The simulação SHALL usar um jogador típico que escolhe o melhor ponto liberado, erra a força em até 20%, recolhe direto, toca PUXAR quando um peixe segue a isca, acerta a fisgada em 90% das vezes e, na briga, segura SEGURAR quando o peixe está acima do centro da faixa e solta quando está abaixo, reagindo com 0,3 s de atraso. `SIMB-02`

**Independent Test**: Rodar a simulação com a mesma semente duas vezes e obter a mesma linha do tempo; com 50 sementes, sair um relatório de tempo por episódio.

---

## Edge Cases

- IF o jogador pausa com a isca na água ou na briga THEN o jogo SHALL congelar peixes, isca, faixa, medidor e janelas até voltar. `PAUSA-01`
- IF dois peixes atacam ao mesmo tempo THEN o jogo SHALL considerar só o primeiro e fazer o outro fugir. `ISCA-14`
- WHEN a isca chega ao fundo THEN o jogo SHALL mantê-la no fundo até RECOLHER ou PUXAR. `ISCA-15`
- IF a isca cai na água com o arremesso mais fraco (força 0) THEN o jogo SHALL colocá-la a 30% do alcance máximo da vara. `ARREM-07`
- IF o jogador solta SEGURAR com a faixa no topo THEN o jogo SHALL deixar a faixa cair a partir do repouso. `BRIGA-14`

---

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --------- | -------- |
| Input validation & bounds | ARREM-03, ARREM-07, ISCA-04, ISCA-15, BRIGA-04, BRIGA-05, BRIGA-12, BOTAO-03 |
| Failure / partial-failure states | ISCA-11, ISCA-12, BRIGA-11 |
| Idempotency / retry / duplicate handling | ISCA-14 (dois ataques); ARREM-04 (botão em voo) |
| Auth boundaries & rate limits | N/A because o jogo não tem conta nem servidor |
| Concurrency / ordering | ISCA-14 |
| Data lifecycle / expiry | N/A because nada novo é salvo; o arremesso em andamento não é guardado (ver Assumptions) |
| Observability | N/A because o jogo roda offline no celular, sem coleta de dados (decisão da v1) |
| External-dependency failure | N/A because a pescaria não depende de rede |
| State-transition integrity | ARREM-02 a ARREM-05, ISCA-08 a ISCA-12, BRIGA-01, BRIGA-10, BRIGA-11, PAUSA-01 |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PONTO-01 | P1: Escolher o ponto | T1, T5 | Implementing |
| PONTO-02 | P1: Escolher o ponto | T5 | Implementing |
| PONTO-03 | P1: Escolher o ponto | T1, T5 | Implementing |
| PONTO-04 | P1: Escolher o ponto | - | Pending |
| PONTO-05 | P1: Escolher o ponto | - | Pending |
| PONTO-06 | P1: Escolher o ponto | T4 | Implementing |
| ARREM-01 | P1: Mirar e arremessar com força | T2 | Implementing |
| ARREM-02 | P1: Mirar e arremessar com força | T2, T6 | Implementing |
| ARREM-03 | P1: Mirar e arremessar com força | T2, T6 | Implementing |
| ARREM-04 | P1: Mirar e arremessar com força | T6 | Implementing |
| ARREM-05 | P1: Mirar e arremessar com força | T6 | Implementing |
| ARREM-06 | P1: Mirar e arremessar com força | T2 | Implementing |
| ARREM-07 | Edge Cases | T2 | Implementing |
| ISCA-01 | P1: Trabalhar a isca debaixo d'água | T4 | Implementing |
| ISCA-02 | P1: Trabalhar a isca debaixo d'água | T4 | Implementing |
| ISCA-03 | P1: Trabalhar a isca debaixo d'água | T4 | Implementing |
| ISCA-04 | P1: Trabalhar a isca debaixo d'água | T4 | Implementing |
| ISCA-05 | P1: Trabalhar a isca debaixo d'água | T4 | Implementing |
| ISCA-06 | P1: Trabalhar a isca debaixo d'água | T4 | Implementing |
| ISCA-07 | P1: Trabalhar a isca debaixo d'água | T4 | Implementing |
| ISCA-08 | P1: Trabalhar a isca debaixo d'água | T6 | Implementing |
| ISCA-09 | P1: Trabalhar a isca debaixo d'água | - | Pending |
| ISCA-10 | P1: Trabalhar a isca debaixo d'água | T6 | Implementing |
| ISCA-11 | P1: Trabalhar a isca debaixo d'água | T4, T6 | Implementing |
| ISCA-12 | P1: Trabalhar a isca debaixo d'água | T6 | Implementing |
| ISCA-13 | P1: Trabalhar a isca debaixo d'água | - | Pending |
| ISCA-14 | Edge Cases | T4 | Implementing |
| ISCA-15 | Edge Cases | T4 | Implementing |
| BRIGA-01 | P1: Brigar com o peixe na barra de captura | T3 | Implementing |
| BRIGA-02 | P1: Brigar com o peixe na barra de captura | T3 | Implementing |
| BRIGA-03 | P1: Brigar com o peixe na barra de captura | T3 | Implementing |
| BRIGA-04 | P1: Brigar com o peixe na barra de captura | T3 | Implementing |
| BRIGA-05 | P1: Brigar com o peixe na barra de captura | T3 | Implementing |
| BRIGA-06 | P1: Brigar com o peixe na barra de captura | T1, T3 | Implementing |
| BRIGA-07 | P1: Brigar com o peixe na barra de captura | T3 | Implementing |
| BRIGA-08 | P1: Brigar com o peixe na barra de captura | T3 | Implementing |
| BRIGA-09 | P1: Brigar com o peixe na barra de captura | T3 | Implementing |
| BRIGA-10 | P1: Brigar com o peixe na barra de captura | T3, T6 | Implementing |
| BRIGA-11 | P1: Brigar com o peixe na barra de captura | T3, T6 | Implementing |
| BRIGA-12 | P1: Brigar com o peixe na barra de captura | T3 | Implementing |
| BRIGA-13 | P1: Brigar com o peixe na barra de captura | - | Pending |
| BRIGA-14 | Edge Cases | T3 | Implementing |
| BOTAO-01 | P1: Botões grandes na tela | - | Pending |
| BOTAO-02 | P1: Botões grandes na tela | - | Pending |
| BOTAO-03 | P1: Botões grandes na tela | - | Pending |
| BOTAO-04 | P1: Botões grandes na tela | - | Pending |
| BOTAO-05 | P1: Botões grandes na tela | - | Pending |
| TUTOB-01 | P1: Tutorial da pescaria nova | - | Pending |
| TUTOB-02 | P1: Tutorial da pescaria nova | T4 | Implementing |
| TUTOB-03 | P1: Tutorial da pescaria nova | - | Pending |
| TUTOB-04 | P1: Tutorial da pescaria nova | - | Pending |
| SIMB-01 | P1: Simulação com as regras novas | - | Pending |
| SIMB-02 | P1: Simulação com as regras novas | - | Pending |
| PAUSA-01 | Edge Cases | - | Pending |

**Coverage:** 54 total, todos mapeados no tasks.md; 38 em implementação

---

## Success Criteria

- [ ] O usuário joga um episódio na pescaria nova e aprova a sensação.
- [ ] Num arremesso com peixe, o jogador vê o peixe seguir a isca antes de fisgar em 100% dos casos.
- [ ] No Tranquilo, nenhum peixe fisgado escapa; no Desafio, quem segue o peixe com a faixa pega peixes de força até 6 em pelo menos 80% das brigas (simulação).
