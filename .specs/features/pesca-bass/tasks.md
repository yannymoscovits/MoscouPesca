# Pescaria nova Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/pesca-bass/design.md`
**Status**: Approved (2026-10-31)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied (mesma matriz da v1 em `.specs/features/v1-mvp/tasks.md`, mais os componentes de tela testados com happy-dom antes da troca; `vitest.config.ts` já usa `environment: 'happy-dom'`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/domain`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case listado tem teste | `src/domain/**/*.test.ts` | `npm test` |
| Conteúdo (`src/content`) | unit | Consistência: todo ponto tem nome e alcance; todo `fightStyle` é válido | `src/content/*.test.ts` | `npm test` |
| App (`src/app`) | unit | Comandos novos + caminhos de erro (botão sem efeito, ponto bloqueado) | `src/app/**/*.test.ts` | `npm test` |
| Desenho (`src/render`) | unit | Matemática pura (câmera, `toScene`, `landingPoint`, `spotAnchor`); a imagem é conferida no e2e | `src/render/*.test.ts` | `npm test` |
| Componentes de tela novos, antes da troca (`src/ui`) | unit | Render com props + eventos de ponteiro, cada AC do componente | `src/ui/*.test.tsx` | `npm test` |
| Telas ligadas (`src/ui` + app) | e2e | Fluxo inteiro (caminho feliz) + falhas (fisgada perdida, peixe fugiu, nada dessa vez, ponto bloqueado) + pausa, no perfil Pixel 7 | `e2e/*.spec.ts` | `npm run test:e2e` |
| Capturas de tela e documentos | none | - (só o gate de build) | - | gate build |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tarefas só com testes unitários | `npm test` |
| Full | Tarefas com e2e | `npm test && npm run test:e2e` |
| Build | Fim de fase e tarefas de documentos | `npm run typecheck && npm run build && npm run check:size && npm test && npm run test:e2e` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Domínio novo

Arquivos novos ao lado da pescaria antiga; nada muda no jogo ainda.

```
T1 → T3
T1 → T5
T2 → T6
T3 → T6
T4 → T6
T6 → T7
```

### Phase 2: Simulação e desenho

```
T8, T9, T10 (independentes)
```

### Phase 3: Componentes de tela

```
T11, T12, T13, T14 (independentes)
```

### Phase 4: Troca e limpeza

```
T15 → T16
T16 → T17
T17 → T18
```

---

## Task Breakdown

### T1: Dar nome e alcance aos pontos e jeito aos peixes

**What**: `Zone` ganha `name` e `minReach`; `Species` ganha `fightStyle?` (`calmo`, `saltador`, `afundador`); os 6 locais recebem nomes de ponto e alcances (raso 0, meio 3, fundo 5) e algumas espécies recebem jeito (traíra e robalo-flecha saltadores; tambaqui, pirarucu e garoupa afundadores; Marlim-azul saltador).
**Where**: `src/content/types.ts` (e os dados em `src/content/episodes/ep1.ts` a `ep5.ts`)
**Depends on**: None
**Reuses**: formato atual de `Zone` e `Species`
**Requirement**: PONTO-01, PONTO-03, BRIGA-06
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Teste de conteúdo: todo ponto tem nome não vazio e `minReach` entre 0 e 10; todo `fightStyle` é um dos 3 valores
- [x] Gate check passes: `npm test`
- [x] Contagem de testes só sobe (base: 422 unitários)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): nomeia os pontos e o jeito dos peixes`

---

### T2: Criar a mira e a força do arremesso

**What**: `aimAngleDeg`, `powerAt` e `castDistanceM`, com as constantes em `tuning.ts`.
**Where**: `src/domain/castAim.ts`
**Depends on**: None
**Reuses**: `maxCastDistance` de `src/domain/fishing.ts`
**Requirement**: ARREM-01, ARREM-02, ARREM-03, ARREM-06, ARREM-07
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Seta vai de -45° a 45° e volta em 2 s (Desafio) e 4 s (Tranquilo); força faz 0 → 1 → 0 no mesmo período
- [x] Força 0 dá 30% do alcance máximo; força 1 dá 100%; Bambu com força 1 chega a 10,8 m
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): cria a mira e a força do arremesso`

---

### T3: Criar a barra de captura

**What**: `startBar`, `stepBar`, `barOutcome`, `fishInside` e `fightStyleOf`, com a física da spec em segundos e subpassos de no máximo 1/30 s.
**Where**: `src/domain/catchBar.ts`
**Depends on**: T1
**Reuses**: `rng.ts`; números em `tuning.ts`
**Requirement**: BRIGA-01, BRIGA-02, BRIGA-03, BRIGA-04, BRIGA-05, BRIGA-06, BRIGA-07, BRIGA-08, BRIGA-09, BRIGA-10, BRIGA-11, BRIGA-12, BRIGA-14
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Começo: faixa no fundo, medidor em 30%, faixa com 18% + 1,5% × Força (× 1,4 no Tranquilo)
- [x] Segurando, a faixa sobe a 2,8 − 1,4 barra/s² até 1,2 barra/s; solta, cai a 1,4 barra/s²; no fundo quica com 60%; no topo para; solta no topo cai do repouso
- [x] Peixe troca de destino a cada 0,5 a 1,5 s (× 1,5 no Tranquilo) e fica dentro da barra; `saltador` sorteia destinos mais longe que `calmo`; `afundador` fica na metade de baixo; força maior chega mais rápido
- [x] Medidor: enche (15% − 0,7% × fôlego)/s com o peixe dentro; esvazia 12%/s (6%/s no Tranquilo) fora; no Tranquilo nunca desce de 10%; 100% = `pegou`, 0% = `fugiu`
- [x] Mesma semente, mesmo resultado; `dt` de 0,1 s dá o mesmo que 3 passos de 1/30 s
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): cria a barra de captura`

---

### T4: Criar a isca e os peixes debaixo d'água

**What**: `spawnWater`, `stepWater`, `twitch` e `scare`: isca recolhendo, dando tranco e afundando; peixes nadando, seguindo, recusando, atacando e fugindo.
**Where**: `src/domain/lure.ts`
**Depends on**: None
**Reuses**: `rng.ts` (`pick` com raridade), `Zone.depthM`, `Species.baits`
**Requirement**: ISCA-01, ISCA-02, ISCA-03, ISCA-04, ISCA-05, ISCA-06, ISCA-07, ISCA-11, ISCA-14, ISCA-15, PONTO-06, TUTOB-02
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Nascem de 3 a 6 peixes, só de espécies do ponto, com a raridade de cada uma; isca na distância do arremesso e na superfície
- [x] Recolhendo: isca anda 1 m/s para o Adilson e sobe 0,2 m/s; tranco: 0,6 m e 0,4 m; parada: afunda 0,3 m/s e para no fundo
- [x] A 2 m: espécie que aceita a isca segue; a que não aceita recusa e foge
- [x] Quem segue ataca entre 2 e 5 s; cada tranco adianta 1 s, mínimo 0,5 s; dois ataques no mesmo passo: só o primeiro vale, o outro foge
- [x] Com `followWithinS = 3`, um peixe que aceita a isca começa a seguir em até 3 s
- [x] `scare` faz o peixe fugir e mantém a isca
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): cria a isca e os peixes na água`

---

### T5: Montar os pontos do pesqueiro

**What**: `spotsFor` com nome, cadeado, alcance pedido e espécies (nome ou "???") de cada ponto do local.
**Where**: `src/domain/spots.ts`
**Depends on**: T1
**Reuses**: `src/domain/album.ts`
**Requirement**: PONTO-01, PONTO-02, PONTO-03
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Poço do Magro com Bambu (alcance 2): 3 pontos, o meio e o fundo com cadeado e "Precisa de vara com alcance N"
- [x] Espécie já pescada aparece pelo nome; não pescada, "???"
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): monta os pontos do pesqueiro`

---

### T6: Criar a máquina de estados da pescaria nova

**What**: `startPesca`, `rulesFor`, `press` e `tick` com as fases `Aim`, `Power`, `Flying`, `Lure`, `Strike`, `Fight` e os resultados; `caught` movido de `fishing.ts` (o original continua até a limpeza).
**Where**: `src/domain/pesca.ts`
**Depends on**: T2, T3, T4
**Reuses**: `castAim`, `lure`, `catchBar`, `caught`
**Requirement**: ARREM-02, ARREM-03, ARREM-04, ARREM-05, ISCA-08, ISCA-10, ISCA-11, ISCA-12, BRIGA-10, BRIGA-11
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] ARREMESSAR em `Aim` trava o ângulo; em `Power` arremessa com a distância de `castDistanceM`; em `Flying` nada muda
- [x] Depois do voo, `Lure` com a água do ponto; ataque leva a `Strike`; PUXAR na janela (2 s / 4 s / sem prazo no tutorial) leva a `Fight`; janela vencida volta a `Lure` com aviso "Escapou!" e o peixe fugindo
- [x] Isca no Adilson sem peixe: `Result_Nothing`; medidor cheio: `Result_Caught` com peso e valor da v1; medidor vazio no Desafio: `Result_Escaped`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): cria a máquina da pescaria nova`

---

### T7: Criar o tutorial da pescaria nova

**What**: passos da Jane na ordem da spec e regras do tutorial (seguir em até 3 s, fisgada sem prazo, briga com peixe calmo e regras do Tranquilo); "repetir instrução" após 10 s como na v1.
**Where**: `src/domain/tutorialPesca.ts`
**Depends on**: T6
**Reuses**: formato de `src/domain/tutorial.ts`
**Requirement**: TUTOB-01, TUTOB-02, TUTOB-03, TUTOB-04
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Os 9 passos avançam na ordem com os estados de `pesca.ts` e a escolha do ponto
- [x] `rules()` do tutorial: `followWithinS` 3, `hookWindowS` null, barra com regras do Tranquilo e estilo `calmo`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): cria o tutorial da pescaria nova`

---

### T8: Jogar a simulação com a pescaria nova

**What**: `typicalPlayer` passa a jogar cada arremesso com `pesca.ts` e a política da spec; exporta `holdPolicy`.
**Where**: `src/domain/sim/typicalPlayer.ts`
**Depends on**: None
**Reuses**: estrutura atual de `simulateEpisode` (planos, loja, linha do tempo)
**Requirement**: SIMB-01, SIMB-02
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Mesma semente, mesma linha do tempo; outra semente, outra
- [x] Política: melhor ponto liberado, força com erro de até 20%, recolhe direto, tranco quando um peixe segue, fisgada certa em 90%, briga com `holdPolicy` e 0,3 s de atraso
- [x] Testes existentes da simulação continuam passando (linha do tempo, medalhas e metas)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sim): joga com a pescaria nova`

---

### T9: Desenhar a vista de cima do arremesso e do pesqueiro

**What**: `createCastRenderer` com pesqueiro (pontos marcados), seta da mira, voo e respingo; o Adilson com uma vara só; `landingPoint` e `spotAnchor`.
**Where**: `src/render/castRenderer.ts`
**Depends on**: None
**Reuses**: `fishingRenderer.ts` (água, vara, linha, respingo, layout), `scenery.ts`, `adilson.ts`, `stands.ts`
**Requirement**: ARREM-01, ARREM-05, PONTO-01
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] `landingPoint(0°, d)` fica reto à frente da ponta da vara; -45° à esquerda; distância a 10 px por metro
- [x] `spotAnchor` é o centro do polígono do ponto, dentro da cena
- [x] Desenhar sem sprites (fallback) não lança erro
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(render): desenha a vista do arremesso`

---

### T10: Desenhar a vista debaixo d'água

**What**: `createUnderwaterRenderer` com superfície, fundo na paleta do local, plantas, peixes, isca, linha, "!", "não gostou" e o peixe se debatendo na briga; `camera` e `toScene`.
**Where**: `src/render/underwaterRenderer.ts`
**Depends on**: None
**Reuses**: paleta de `scenery.ts`, `sprites.ts`
**Requirement**: ISCA-01, BRIGA-13
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] A câmera segue a isca e mostra superfície e fundo acima do quarto de baixo da tela
- [x] `toScene` leva metros a px lógicos e volta (ida e volta igual)
- [x] Desenhar sem sprites não lança erro
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(render): desenha a vista debaixo d'água`

---

### T11: Criar os botões da pescaria

**What**: `FishingButtons` com ARREMESSAR, RECOLHER + PUXAR ou SEGURAR conforme a fase; apagados sem efeito; reage ao encostar; um dedo só; PUXAR pisca "FISGAR!" no ataque.
**Where**: `src/ui/FishingButtons.tsx`
**Depends on**: None
**Reuses**: `.btn` de `src/ui/theme.css`
**Requirement**: BOTAO-01, BOTAO-02, BOTAO-03, BOTAO-04, BOTAO-05, ISCA-08
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Por fase: `Aim`/`Power` mostram ARREMESSAR; `Lure`/`Strike` mostram RECOLHER e PUXAR; `Fight` mostra SEGURAR; `Flying` apaga tudo
- [x] `pointerdown` chama o comando na hora; soltar e cancelar encerram o segurar; segundo dedo ignorado
- [x] Em `Strike`, PUXAR mostra "FISGAR!" e a classe que pisca
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ui): cria os botões da pescaria`

---

### T12: Criar a tela do pesqueiro

**What**: `SpotScreen` com o fundo do `castRenderer`, um botão por ponto, painel com espécies e cadeado e o botão "Pescar aqui".
**Where**: `src/ui/SpotScreen.tsx`
**Depends on**: None
**Reuses**: `spotsFor` (T5), `castRenderer` (T9)
**Requirement**: PONTO-01, PONTO-02, PONTO-03, PONTO-04
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Mostra os 3 pontos com nome; tocar destaca e lista espécies com nome ou "???"
- [x] Ponto bloqueado: cadeado, frase do alcance e "Pescar aqui" desabilitado
- [x] "Pescar aqui" chama `chooseSpot` com o ponto
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ui): cria a tela do pesqueiro`

---

### T13: Criar a barra de força e o trocar de ponto

**What**: `CastHud` com a barra de força (vazia em `Aim`, mexendo em `Power`) e o botão "Trocar de ponto".
**Where**: `src/ui/CastHud.tsx`
**Depends on**: None
**Reuses**: `powerAt` (T2), `.btn`
**Requirement**: ARREM-02, PONTO-05
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] A barra mostra `powerAt` em % na fase `Power`
- [x] "Trocar de ponto" chama `leaveSpot` e só aparece em `Aim` e `Power`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ui): cria a barra de força`

---

### T14: Criar a barra de captura na tela

**What**: `CatchBar` com a barra vertical, a faixa verde e o peixe posicionados em % da altura, e o medidor ao lado, em arte própria (sem moldura de bambu).
**Where**: `src/ui/CatchBar.tsx`
**Depends on**: None
**Reuses**: tipos de `catchBar.ts` (T3)
**Requirement**: BRIGA-01, BRIGA-13
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Faixa com `bottom` e `height` em % de `zoneY` e `zoneH`; peixe em % de `fishY`; medidor em % de `meter`
- [x] A faixa muda de cor quando o peixe está dentro
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ui): cria a barra de captura`

---

### T15: Ligar a pescaria nova no jogo

**What**: `GameState.fishing` vira `PescaState` e ganha `spot`; o controlador ganha `chooseSpot`, `leaveSpot`, `pressButton`, `holdStart`, `holdEnd` (sai `tapWater`), vibra no ataque e volta a `Aim` depois da ficha; `FishingScreen` escolhe pesqueiro, vista de cima ou de lado pela fase e mostra os avisos; as telas que liam fases da v1 passam a ler as novas; o controlador usa `tutorialPesca` (com textos provisórios no `TutorialCoach`); ganchos de teste `button`, `hold` e `autoplay`; ajudas do e2e reescritas e os testes de tela que dirigiam a pesca antiga migrados.
**Where**: `src/app/controller.ts` (e `store.ts`, `testHooks.ts`, `src/ui/FishingScreen.tsx`, telas que leem a fase, `e2e/support.ts`, specs e2e afetadas)
**Depends on**: None
**Reuses**: T6, T7, T9 a T14
**Requirement**: PONTO-04, PONTO-05, ARREM-01, ARREM-04, ARREM-05, ISCA-08, ISCA-09, ISCA-11, ISCA-12, ISCA-13, BRIGA-10, BRIGA-11, BRIGA-13, BOTAO-01, BOTAO-02, BOTAO-05, PAUSA-01
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [x] Unit do controlador: ponto bloqueado não abre; botão sem efeito não muda o estado; vibração no ataque com a opção ligada; resultado do torneio conta 1 arremesso por resultado
- [x] e2e (`e2e/pescaria.spec.ts`): pesqueiro → Pescar aqui → ARREMESSAR × 2 → isca na água → RECOLHER/PUXAR até o ataque → FISGAR → briga com `autoplay` → ficha e saldo
- [x] e2e: fisgada perdida mostra "Escapou!" e mantém a isca; isca no Adilson mostra "Nada dessa vez"; no Desafio sem segurar, "O peixe fugiu!"; no Tranquilo sem segurar, o medidor para em 10%
- [x] e2e: botões no quarto de baixo, cada um com pelo menos 40% da largura e 72 px de altura; "Trocar de ponto" volta ao pesqueiro; pausar congela isca, faixa e medidor
- [x] Testes de tela da v1 que usavam toque na cena ou fases antigas migrados para as ajudas novas; os que testavam PESCA-01 a 14 trocados pelos da spec nova
- [x] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(app): liga a pescaria nova`

---

### T16: Ensinar a pescaria nova no tutorial

**What**: falas da Jane e setas do `TutorialCoach` para os 9 passos (ponto, seta, força, RECOLHER, PUXAR, FISGAR, SEGURAR, soltar, manter na faixa).
**Where**: `src/ui/TutorialCoach.tsx`
**Depends on**: T15
**Reuses**: `tutorialPesca` (T7), estilo atual do balão e da seta
**Requirement**: TUTOB-01, TUTOB-02, TUTOB-03, TUTOB-04
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [x] e2e (`e2e/tutorial.spec.ts` reescrito): jogo novo, seguir só as falas e setas até pegar o primeiro peixe, passando pelos 9 passos na ordem; o objetivo mostra 1 de 3
- [x] e2e: no tutorial, um peixe segue a isca em até 3 s; a fisgada espera o toque; o medidor não desce de 10%
- [x] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): ensina a pescaria nova`

---

### T17: Apagar a pescaria antiga

**What**: remove `fishing.ts`, `tutorial.ts`, o toque na cena de `input.ts`, o `BitePrompt`, a barra de tensão e o que sobrou de `fishingRenderer.ts` sem uso, com os testes deles; marca PESCA-01 a 14, TUTO-03 a 06 e a primeira metade da EQUIP-07 como substituídos na spec da v1.
**Where**: `src/domain/fishing.ts` (e os demais arquivos sem uso)
**Depends on**: T16
**Reuses**: -
**Requirement**: - (limpeza da troca; rastreabilidade da v1)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Nenhum import da pescaria antiga sobra (`tsc` limpo)
- [x] Rastreabilidade da v1: PESCA-01 a 14 e TUTO-03 a 06 com status "Superseded by pesca-bass"
- [x] Gate check passes: `npm run typecheck && npm run build && npm run check:size && npm test && npm run test:e2e`

**Tests**: unit
**Gate**: build
**Commit**: `refactor(domain): apaga a pescaria antiga`

---

### T18: Atualizar as capturas da pescaria

**What**: capturas do pesqueiro, do arremesso, da isca na água e da briga em `docs/arte/mockups/` (`pesqueiro-implementado.png`, `arremesso-implementado.png`, `isca-implementada.png`, `briga-implementada.png`).
**Where**: `docs/arte/mockups/`
**Depends on**: T17
**Reuses**: script de captura usado na Fase 10 (Playwright no build de teste)
**Requirement**: - (documentação para a aprovação do usuário)
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [x] 4 capturas no Pixel 7, uma por tela
- [x] Gate check passes: `npm run typecheck && npm run build && npm run check:size && npm test && npm run test:e2e`

**Tests**: none
**Gate**: build
**Commit**: `docs(arte): mostra a pescaria nova`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4
```

Lotes para sub-agentes (~7 tarefas, fases inteiras): lote 1 = Fase 1 (T1 a T7); lote 2 = Fases 2 e 3 (T8 a T14); lote 3 = Fase 4 (T15 a T18). Depois do lote 3, o Verifier roda sozinho.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | Tipos + dados de conteúdo (2 campos, 6 locais) | ⚠️ Vários arquivos de dados, um conceito |
| T2 a T7 | 1 módulo de domínio cada | ✅ Granular |
| T8 | 1 módulo (simulação) | ✅ Granular |
| T9, T10 | 1 desenho cada | ✅ Granular |
| T11 a T14 | 1 componente cada | ✅ Granular |
| T15 | Troca do estado da pesca em todo o app | ⚠️ Vários arquivos: troca única de tipo que o compilador exige de uma vez (design, Risks) |
| T16 | 1 componente + spec do tutorial | ✅ Granular |
| T17 | Remoção do código antigo | ⚠️ Vários arquivos, só remoção |
| T18 | Capturas | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | None | - | ✅ Match |
| T3 | T1 | T1 → T3 | ✅ Match |
| T4 | None | - | ✅ Match |
| T5 | T1 | T1 → T5 | ✅ Match |
| T6 | T2, T3, T4 | T2 → T6, T3 → T6, T4 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | None (Fase 1 antes) | independente | ✅ Match |
| T9 | None (Fase 1 antes) | independente | ✅ Match |
| T10 | None (Fase 1 antes) | independente | ✅ Match |
| T11 a T14 | None (Fases 1 e 2 antes) | independentes | ✅ Match |
| T15 | None (Fases 1 a 3 antes) | - | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Conteúdo | unit | unit | ✅ OK |
| T2 a T7 | Domínio | unit | unit | ✅ OK |
| T8 | Domínio (simulação) | unit | unit | ✅ OK |
| T9, T10 | Desenho | unit | unit | ✅ OK |
| T11 a T14 | Componentes de tela antes da troca | unit | unit | ✅ OK |
| T15 | App + telas ligadas | unit + e2e | e2e (com unit do controlador) | ✅ OK |
| T16 | Tela ligada | e2e | e2e | ✅ OK |
| T17 | Remoção (domínio, app, desenho) | unit | unit (gate build com e2e) | ✅ OK |
| T18 | Capturas | none | none | ✅ OK |
