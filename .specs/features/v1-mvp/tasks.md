# MoscouFishing v1 Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

Regras da organização que valem para toda tarefa:

- Nunca commitar em `main` ou `master`: todo o trabalho fica na branch `feat/v1-mvp`.
- Antes de cada commit, invocar a skill `commit-bee`; `git add` só com os arquivos da tarefa, nunca `git add -A`.
- `git push`, deploy e qualquer ação fora da máquina precisam de autorização explícita do usuário.

---

**Design**: `.specs/features/v1-mvp/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied (repositório novo; segue a Test Strategy do design aprovado).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/domain`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case listado tem teste | `src/domain/**/*.test.ts` | `npm test` |
| Conteúdo (`src/content`) | unit | Consistência: toda referência resolve (iscas, espécies, zonas, cenas, personagens, mensagens) | `src/content/*.test.ts` | `npm test` |
| Plataforma e app (`src/platform`, `src/app`) | unit | Caminhos principais + falhas (API ausente, cota cheia, dado corrompido), com fakes | `src/platform/**/*.test.ts`, `src/app/**/*.test.ts` | `npm test` |
| Desenho (`src/render`) | unit | Matemática pura (escala, `toLogical`, quadros de animação, fallback sem sprite); a imagem é conferida no e2e | `src/render/*.test.ts` | `npm test` |
| Scripts (`scripts/`) | unit | Caminho de sucesso + caminho de falha | `scripts/*.test.ts` | `npm test` |
| Telas (`src/ui`) | e2e | Cada AC da tela: caminho feliz + edge cases + erros, no perfil Pixel 7 | `e2e/*.spec.ts` | `npm run test:e2e` |
| Config, tipos e arte | none | - (só o gate de build) | - | gate build |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tarefas só com testes unitários | `npm test` |
| Full | Tarefas com e2e | `npm test && npm run test:e2e` |
| Build | Fim de fase e tarefas de config, tipos ou arte | `npm run typecheck && npm run build && npm run check:size && npm test && npm run test:e2e` |

O gate de build **não** roda `check:content`: o marcador `{{PENDENTE}}` é esperado durante o desenvolvimento e só barra o `npm run release` (T54).

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Dependências entre fases aparecem só no campo `Depends on` de cada tarefa.

**Marco jogável:** ao fim da Fase 7, os 5 episódios rodam no celular com formas provisórias no lugar da arte.

### Phase 1: Fundação

```
T1 → T2 → T3
T2 → T4 → T5
```

### Phase 2: Domínio da pesca

```
T6 → T8 → T9 → T10 → T11 → T12
T7 → T8
```

### Phase 3: Domínio do jogo

```
T13, T14, T15, T16, T17 (independentes)
T18 → T19
T18 → T55
```

### Phase 4: Conteúdo do Episódio 1

```
T20 → T21
T22 → T23
T22 → T24
```

### Phase 5: Episódios 2 a 5 e progressão

```
T56 → T61
T57 → T61
T58 → T61
T59 → T61
T60 → T61
```

### Phase 6: Plataforma, app e desenho

```
T25 → T29
T26 → T29
T28 → T29 → T30
T29 → T31
T32 → T33
T28 → T33
```

### Phase 7: Telas da pescaria

```
T34 → T35
T34 → T36 → T37
T36 → T38
T34 → T39 → T40
T36 → T40
```

### Phase 8: Telas do jogo

```
T41, T42, T45, T46, T62, T63 (independentes)
T43 → T44
```

### Phase 9: Fechamento técnico

```
T47 → T48
```

### Phase 10: Arte dos cenários

```
T49 → T64
T49 → T73
T49 → T65
T49 → T66
T49 → T67
```

### Phase 11: Arte dos peixes

```
T50 → T68
T50 → T69
T50 → T70
T50 → T71
```

### Phase 12: Personagens, ícone e publicação

```
T51 → T54
T52 → T72 → T54
T52 → T54
T53 → T54
```

---

## Task Breakdown

### Phase 1 tasks

#### T1: Iniciar o repositório e commitar o planejamento

**What**: Repositório git criado direto na branch `feat/v1-mvp`, com `.gitignore` e um commit contendo `.specs/` e `docs/`.
**Where**: `.gitignore`
**Depends on**: None
**Reuses**: -
**Requirement**: - (infraestrutura)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] `git init -b feat/v1-mvp`; nenhum commit existe em `main` ou `master`
- [x] `.gitignore` ignora `node_modules/`, `dist/`, `Fotos/`, `test-results/`, `playwright-report/`
- [x] Commit com `.specs/` e `docs/`; `Fotos/` fica de fora

**Tests**: none
**Gate**: none (só documentação)
**Commit**: `docs(specs): adiciona spec, design e roteiro da v1`

---

#### T2: Montar o esqueleto do projeto

**What**: Projeto Vite 8 + TypeScript + Preact com Vitest (happy-dom) e Playwright (perfil Pixel 7) configurados e os scripts `dev`, `build`, `preview`, `typecheck`, `test`, `test:e2e`, `check:size`.
**Where**: `package.json`
**Depends on**: T1
**Reuses**: -
**Requirement**: - (infraestrutura)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts` (webServer com `vite preview`), `index.html`, `src/main.tsx` mínimo
- [x] `npm test` passa com `--passWithNoTests`; `npm run test:e2e` passa com `--pass-with-no-tests`
- [x] `npm run typecheck` e `npm run build` passam
- [x] Se alguma major nova (Vite 8, TS 7, Preact 11, Vitest 5) quebrar a integração, fixar a anterior e registrar no commit

**Tests**: none
**Gate**: build
**Commit**: `chore(setup): cria esqueleto vite, preact, vitest e playwright`

---

#### T3: Configurar o PWA

**What**: Manifest, service worker com precache de tudo (`vite-plugin-pwa`, `registerType: 'prompt'`), `noindex` na página e `robots.txt`/`_headers`.
**Where**: `vite.config.ts` (modify)
**Depends on**: T2
**Reuses**: `vite-plugin-pwa`
**Requirement**: INST-05, INST-06, INST-09
**Tools**: MCP: NONE · Skill: `playwright-cli` (depuração), `commit-bee`

**Done when**:

- [x] Manifest com `name` "MoscouFishing", `display: fullscreen`, `orientation: portrait`, ícones provisórios 192/512 e maskable
- [x] `<meta name="robots" content="noindex">`, `public/robots.txt` com `Disallow: /` e `public/_headers` com `X-Robots-Tag: noindex`
- [x] e2e `e2e/pwa.spec.ts`: manifest com os campos acima (INST-05); meta `noindex` presente (INST-09); após o service worker ativar, recarregar com `context.setOffline(true)` abre a página (INST-06)
- [x] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(pwa): configura manifest, service worker e noindex`

---

#### T4: Criar a trava de conteúdo pendente

**What**: Script que procura `{{PENDENTE}}` em `src/content/` e sai com erro listando arquivo e linha de cada marcador.
**Where**: `scripts/check-content.ts`
**Depends on**: T2
**Reuses**: -
**Requirement**: HIST-07
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Script `check:content` no `package.json` (via `tsx`)
- [x] Teste: pasta sem marcador → código de saída 0
- [x] Teste: dois marcadores em arquivos diferentes → código 1 e as duas posições (arquivo:linha) listadas
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(build): barra publicação com conteúdo pendente`

---

#### T5: Criar a trava de tamanho e o comando de publicação

**What**: Script que soma o `dist/` e falha acima de 5 MB, mais o script `release` = `check:content` + `build` + `check:size`.
**Where**: `scripts/check-size.ts`
**Depends on**: T4
**Reuses**: padrão de `scripts/check-content.ts`
**Requirement**: INST-08
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Teste: pasta de 4,9 MB → código 0; pasta de 5,1 MB → código 1 com o total na mensagem
- [x] `npm run release` encadeia as três etapas e para na primeira que falhar
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(build): limita o pacote a 5 MB e cria comando release`

---

### Phase 2 tasks

#### T6: Definir os tipos de conteúdo e de perfil

**What**: Todos os tipos do design: `Species`, `Rod`, `Bait`, `Zone`, `Character`, `Expression`, `DialogLine`, `Scene`, `Objective`, `Chapter`, `TournamentDef`, `Message`, `Profile`, `TournamentRun`, `GameEvent`, `Difficulty`.
**Where**: `src/content/types.ts`
**Depends on**: T2
**Reuses**: Data Models do design
**Requirement**: HIST-06 (estrutura)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Tipos exportados exatamente como no design
- [x] `npm run typecheck` passa

**Tests**: none
**Gate**: build
**Commit**: `feat(content): define tipos de conteúdo e perfil`

---

#### T7: Criar o sorteio com semente

**What**: Gerador pseudoaleatório com semente (mulberry32) com `next()`, `range(min, max)` e `pick(weighted)`.
**Where**: `src/domain/rng.ts`
**Depends on**: T2
**Reuses**: -
**Requirement**: - (base para PESCA-04 e PESCA-16)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Mesma semente → mesma sequência; sementes diferentes → sequências diferentes
- [x] `range` sempre dentro de [min, max] em 10 000 sorteios
- [x] `pick` respeita os pesos (frequência dentro de ±5% em 10 000 sorteios)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): adiciona gerador aleatório com semente`

---

#### T8: Implementar o arremesso

**What**: `cast()` e o trecho de voo de `tick()`: limita ao alcance da vara, voa até o ponto e ignora toques durante o voo.
**Where**: `src/domain/fishing.ts`
**Depends on**: T6, T7
**Reuses**: `rng.ts`
**Requirement**: PESCA-01, PESCA-02, PESCA-03, EQUIP-07 (alcance)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Toque dentro do alcance → isca vai ao ponto exato (PESCA-01)
- [x] Toque fora → isca para no limite, mesma direção (PESCA-02)
- [x] `press()` e `cast()` durante o voo não mudam o estado (PESCA-03)
- [x] Vara com Alcance maior → distância máxima maior (EQUIP-07)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(fishing): implementa arremesso limitado pelo alcance`

---

#### T9: Implementar espera, mordida e fisgada

**What**: Estados `Waiting` e `Bite`: mordida entre 3 e 10 s quando a zona aceita a isca, desistência em 15 s, janela de fisgada de 2 s (Desafio) ou 4 s (Tranquilo), regras vindas de `TickContext.rules`.
**Where**: `src/domain/fishing.ts` (modify)
**Depends on**: T8
**Reuses**: `rng.ts`
**Requirement**: PESCA-04, PESCA-05, PESCA-08, PESCA-09
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Em 200 sementes, toda mordida acontece entre 3 e 10 s em zona compatível (PESCA-04)
- [x] Zona sem espécie compatível → `Result_Nothing` aos 15 s (PESCA-05)
- [x] Toque aos 1,9 s no Desafio fisga; aos 2,1 s o peixe escapa; no Tranquilo o limite é 4 s (PESCA-08, PESCA-09)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(fishing): implementa espera, mordida e fisgada`

---

#### T10: Implementar a briga e a tensão

**What**: Estado `Fight`: segurar recolhe e sobe a tensão, soltar alivia e o peixe puxa; Força da vara reduz o ganho; arrebenta após 1 s em 100 no Desafio; teto 99 no Tranquilo; dificuldade capturada no início da briga.
**Where**: `src/domain/fishing.ts` (modify)
**Depends on**: T9
**Reuses**: `tuning.ts` (constantes iniciais criadas aqui)
**Requirement**: PESCA-10, PESCA-11, PESCA-12 (faixas), PESCA-13, PESCA-14, EQUIP-07 (força), ACES-03
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Segurando: tensão sobe e distância cai; soltando: tensão cai e distância sobe (PESCA-10, PESCA-11)
- [x] `tensionBand(t)`: verde < 70, amarelo 70 a 89, vermelho 90 a 100 (PESCA-12)
- [x] Desafio: 100 por 0,9 s não arrebenta, por 1,0 s arrebenta (PESCA-13)
- [x] Tranquilo: tensão nunca passa de 99 nem arrebenta, segurando por 60 s (PESCA-14)
- [x] Vara de Força 3 sobe a tensão mais devagar que a de Força 1 (EQUIP-07)
- [x] Trocar a dificuldade no meio da briga não muda a briga atual (ACES-03)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(fishing): implementa briga com tensão da linha`

---

#### T11: Implementar o resultado da pescaria

**What**: Ao zerar a distância, `Result_Caught` com espécie, peso sorteado na faixa (2 casas) e valor em R$ (peso × preço/kg).
**Where**: `src/domain/fishing.ts` (modify)
**Depends on**: T10
**Reuses**: `rng.ts`
**Requirement**: PESCA-15 (dados da ficha), PESCA-16, PESCA-17 (valor)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Em 1 000 sementes, todo peso fica dentro da faixa da espécie e tem 2 casas decimais (PESCA-16)
- [x] Valor = arredondamento de peso × preço/kg (PESCA-17)
- [x] Resultado traz espécie, peso e valor (PESCA-15)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(fishing): calcula peso e valor do peixe pego`

---

#### T12: Balancear a pescaria

**What**: Ajustar `tuning.ts` até a simulação de um jogador que segura até o amarelo e solta no vermelho cumprir os critérios de sucesso.
**Where**: `src/domain/tuning.ts`
**Depends on**: T11
**Reuses**: `fishing.ts`, `rng.ts`
**Requirement**: Success Criteria (briga de 8 a 40 s)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] `src/domain/balance.test.ts`: em 200 sementes, com cada vara e no Desafio, 100% das brigas duram entre 8 e 40 s
- [x] O mesmo jogador simulado arrebenta a linha em menos de 10% das brigas no Desafio
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(balance): calibra duração das brigas`

---

### Phase 3 tasks

#### T13: Implementar a loja

**What**: `canBuy`, `buy` e `equip`: compra uma vez só, saldo nunca negativo, item equipado vale no próximo arremesso, isca de uso ilimitado.
**Where**: `src/domain/shop.ts`
**Depends on**: T6
**Reuses**: -
**Requirement**: EQUIP-03, EQUIP-04, EQUIP-05, EQUIP-06, EQUIP-08
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Comprar com saldo → desconta uma vez; comprar de novo o mesmo item → perfil igual (EQUIP-03)
- [x] Saldo menor → `{ ok: false, missing }` com o valor exato que falta (EQUIP-04)
- [x] Equipar item não possuído → perfil igual; possuído → passa a ser o equipado (EQUIP-05)
- [x] Nenhuma sequência de compras deixa o saldo negativo (EQUIP-06)
- [x] Usar uma isca em 100 arremessos não a remove do perfil (EQUIP-08)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(shop): implementa compra e equipamento`

---

#### T14: Implementar o álbum

**What**: `record()`: registra a primeira captura da espécie e atualiza o recorde quando o peso é maior.
**Where**: `src/domain/album.ts`
**Depends on**: T6
**Reuses**: -
**Requirement**: ALBUM-01, ALBUM-02
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Primeira tilápia de 1,20 kg → registrada com 1,20 e `isNewRecord: true` (ALBUM-01)
- [x] Depois, 0,90 kg → recorde continua 1,20 e `isNewRecord: false`; 1,50 kg → recorde 1,50 e `true` (ALBUM-02)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(album): registra espécies e recordes`

---

#### T15: Implementar o torneio

**What**: `start`, `recordCast`, `score`, `standings` e `applyVictory`, iguais para os 5 campeonatos.
**Where**: `src/domain/tournament.ts`
**Depends on**: T11
**Reuses**: tipos de `fishing.ts`
**Requirement**: CAMP-04, CAMP-05, CAMP-06 (desbloqueio), CAMP-07, CAMP-08, CAMP-09, SAVE-06 (arremesso)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Pontuação = soma dos 3 mais pesados (5 peixes de teste com resultado conhecido) (CAMP-04)
- [x] `castsLeft` só cai quando um resultado é registrado; briga interrompida não gasta arremesso (SAVE-06)
- [x] Após o 8º arremesso, `standings` ordena jogador e 3 rivais por pontuação (CAMP-05)
- [x] Primeira vitória: troféu e mensagem desbloqueados (CAMP-06, CAMP-07); segunda vitória: listas sem duplicata (CAMP-08)
- [x] Derrota: `start` de novo zera a rodada sem custo (CAMP-09)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tournament): implementa pontuação e vitória`

---

#### T16: Implementar a história

**What**: `onEvent`, `currentObjective` e `isTournamentUnlocked` por episódio, a partir de `GameEvent`.
**Where**: `src/domain/story.ts`
**Depends on**: T6
**Reuses**: -
**Requirement**: HIST-01, HIST-04, HIST-05, HIST-08, HIST-09, HIST-10, CAMP-01
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] `GameStarted` num perfil novo → cena de abertura (HIST-01)
- [x] Objetivo atual muda em ordem conforme os eventos, e cada conclusão devolve a cena certa (HIST-04, HIST-05)
- [x] Torneio bloqueado até o último objetivo; liberado depois (CAMP-01)
- [x] Vitória no campeonato de um episódio de 1 a 4 → cena de encerramento e aviso "Episódio N liberado!" com o N seguinte (HIST-08)
- [x] Primeira pesca num episódio liberado → cena de abertura dele, uma vez só (HIST-09)
- [x] Vitória na Copa Adilson Moscovits → encerramento final (HIST-10)
- [x] Evento fora de ordem (ex.: compra antes do objetivo de compra) não pula objetivos
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(story): avança objetivos e cenas por eventos`

---

#### T17: Implementar o tutorial

**What**: Passos `cast → wait → hook → reel → release → done`, regras afrouxadas e aviso após 10 s sem toque.
**Where**: `src/domain/tutorial.ts`
**Depends on**: T10
**Reuses**: estados de `fishing.ts`
**Requirement**: TUTO-01, TUTO-03, TUTO-04, TUTO-05, TUTO-06, TUTO-07 (marcação), TUTO-08
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Perfil sem tutorial → `start()` no passo `cast` (TUTO-01)
- [x] Passos avançam na ordem com o estado da pesca (TUTO-03)
- [x] Com `rules()` do tutorial: mordida ≤ 5 s em 200 sementes, peixe não escapa sem toque, tensão máxima 99 (TUTO-04, TUTO-05, TUTO-06)
- [x] 10 s sem toque num passo → `nudge: true` (TUTO-07)
- [x] Peixe pego → `done` e evento `Caught` emitido para o objetivo (TUTO-08)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tutorial): guia a primeira pescaria`

---

#### T18: Implementar o perfil e os ajustes

**What**: `newProfile()` com vara de Bambu, Minhoca, R$ 0 e dificuldade não escolhida, episódio 1 liberado e Poço do Magro como local atual; `setDifficulty`, `setVibration` e `resetTutorial`.
**Where**: `src/domain/profile.ts`
**Depends on**: T6
**Reuses**: -
**Requirement**: ACES-02, ACES-04 (padrão ligado), TUTO-09
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Perfil novo: Bambu e Minhoca possuídos e equipados, `difficulty: null`, `vibration: true`, `unlockedEpisodes: [1]`, `currentLocation` = Poço do Magro (ACES-04)
- [x] `setDifficulty` troca entre Tranquilo e Desafio (ACES-02)
- [x] `resetTutorial` marca `tutorialDone: false` (TUTO-09)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(profile): cria perfil inicial e ajustes`

---

#### T19: Validar e migrar o salvamento

**What**: `parseProfile(raw)` que valida a forma do perfil e `migrate()` com cadeia de versões.
**Where**: `src/domain/saveSchema.ts`
**Depends on**: T18
**Reuses**: `profile.ts`
**Requirement**: SAVE-08 (detecção de ilegível), SAVE-09
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] JSON inválido, campo faltando ou tipo errado → `null`
- [x] Perfil v1 válido → igual na saída
- [x] Migração de teste v0 (fixture) → v1 mantendo saldo, itens, progresso, troféus e mensagens (SAVE-09)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(save): valida e migra o perfil salvo`

---

#### T55: Implementar o mundo dos episódios

**What**: `onChampionshipWon`, `isUnlocked`, `travel` e `shopItems`: libera episódios em ordem, controla para onde o jogador pode ir e o que a loja oferece.
**Where**: `src/domain/world.ts`
**Depends on**: T18
**Reuses**: `profile.ts`
**Requirement**: EPI-02, EPI-03 (regra), EPI-04, EPI-05, EPI-07, EPI-08 (regra), EQUIP-09
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Perfil novo: só o episódio 1 liberado; `isUnlocked(2)` falso (EPI-03)
- [x] `onChampionshipWon(p, 1)` libera o 2 com os seus dois locais; repetir não duplica; vencer o 5 não libera nada (EPI-02, EPI-08)
- [x] `travel` para local liberado muda `currentLocation`; para bloqueado devolve o perfil igual (EPI-04, EPI-07)
- [x] Depois de vencer o 5, `travel` para Poço do Magro continua permitido (EPI-05)
- [x] `shopItems` com os episódios 1 e 2 liberados não retorna itens dos episódios 3 a 5 (EQUIP-09)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(world): libera episódios e viagens no mapa`

---

### Phase 4 tasks

#### T20: Cadastrar o local e as espécies do Episódio 1

**What**: Pacote `ep1` com a Barragem do Poço do Magro (zonas) e as espécies Tilápia, Traíra, Curimatã, Piau, Tambaqui, Tucunaré, Pirarucu Lendário (rara) e Piranha Lavínia, com faixa de peso, preço/kg, força, fôlego, iscas, raridade e descrição engraçada; registro em `src/content/index.ts`.
**Where**: `src/content/episodes/ep1.ts`
**Depends on**: T6
**Reuses**: fichas de `docs/historia/episodio-1.md`
**Requirement**: EPI-06 (Ep. 1), HUMOR-03 (textos), EQUIP-02 (iscas por espécie)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] `satisfies` contra os tipos de conteúdo sem erro
- [x] Teste: ≥ 5 espécies com exatamente 1 rara; toda espécie tem descrição não vazia; força e fôlego dentro de `FISH_POWER` e `FISH_STAMINA` (1 a 10) de `tuning.ts`; toda espécie citada nas zonas existe; Piranha Lavínia só aceita a Isca de Carne
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): cadastra peixes do poço do magro`

---

#### T21: Cadastrar varas e iscas do Episódio 1

**What**: Varas Bambu (custa 0), Fibra e Carbono e iscas Minhoca (custa 0), Milho e Carne no pacote `ep1`, com Força e Alcance de 1 a 10.
**Where**: `src/content/episodes/ep1.ts` (modify)
**Depends on**: T20
**Reuses**: espécies de T20
**Requirement**: EQUIP-01, EQUIP-02
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [x] Teste: Bambu custa 0 e há 2 varas novas, com força e alcance entre 1 e 10 (EQUIP-01)
- [x] Teste: Minhoca custa 0, há pelo menos 1 isca nova, cada isca atrai um conjunto diferente de espécies e toda isca citada pelas espécies existe (EQUIP-02)
- [x] Teste: toda espécie aparece em pelo menos uma zona
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): cadastra varas e iscas do poço do magro`

---

#### T22: Cadastrar os personagens

**What**: Adilson, Jane, Lavínia, Edvaldo, Ricardo, Bem e Kris com nome, apelido do cartão e caminhos dos 4 retratos.
**Where**: `src/content/characters.ts`
**Depends on**: T6
**Reuses**: elenco de `docs/historia/episodio-1.md` (os personagens locais dos episódios 2 a 5 entram nas tarefas de cada episódio)
**Requirement**: HUMOR-01 (dados), HUMOR-02 (dados)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Teste: 7 personagens, IDs únicos, apelido não vazio, 4 expressões cada
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): cadastra elenco da família`

---

#### T23: Cadastrar o roteiro do Episódio 1

**What**: Cenas, falas com expressão, os 7 objetivos e os passos do tutorial do roteiro "Tirando a Ferrugem" no pacote `ep1`, mais o teste das regras de conteúdo para todos os episódios registrados.
**Where**: `src/content/episodes/ep1.ts` (modify)
**Depends on**: T22
**Reuses**: roteiro de `docs/historia/episodio-1.md`, `story.ts`
**Requirement**: HIST-06, PROG-02, PROG-03, HUMOR-07, HUMOR-08
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Teste: toda fala aponta para personagem existente; toda cena citada por objetivo existe; objetivos na ordem do roteiro
- [ ] Teste: as falas dos 6 passos do tutorial existem
- [ ] `src/content/rules.test.ts`, sobre todos os episódios de `src/content/index.ts` (palavras inteiras: "pai" não casa com "paixão"): 6 a 8 objetivos por episódio, um da espécie rara e um do álbum completo (PROG-02, PROG-03); nenhuma fala da Lavínia contém "Adilson" nem "pai", e cada episódio tem uma cena com fala dela contendo "Adilsinho" (HUMOR-07, HUMOR-08)
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): adiciona roteiro do episódio 1`

---

#### T24: Cadastrar a GuanambiCup e a carta

**What**: GuanambiCup (8 arremessos, conta 3, rivais Ricardo, Bem e Kris com placar e provocação) e a carta da família do Episódio 1, transcrita de `docs/historia/cartas.md`, no pacote `ep1`.
**Where**: `src/content/episodes/ep1.ts` (modify)
**Depends on**: T22
**Reuses**: `tournament.ts`, `docs/historia/cartas.md`
**Requirement**: CAMP-02 (dados), HUMOR-04 (dados)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Teste: a carta da GuanambiCup existe, tem remetente e texto, e não contém `{{PENDENTE}}`
- [ ] Teste: 3 rivais que existem em `characters.ts`, cada um com provocação; troféu e mensagem existem
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): adiciona guanambicup e rivais`

---

### Phase 5 tasks

#### T56: Cadastrar o Episódio 2: Jacuípe

**What**: Pacote `ep2` completo: os dois locais (Rio Jacuípe e Ponte da Cetrel) e suas zonas; Rio Jacuípe com Tilápia, Traíra, Tainha, Robalo-peva e Carapeba; Ponte da Cetrel com Robalo-flecha, Pescada-amarela, Vermelho, Baiacu e Camurupim (raro), com descrição engraçada; 2 varas e 1 isca novas; roteiro com abertura, 6 a 8 objetivos, cena da Lavínia pirraçando o Adilsinho, a viagem no tempo de `docs/historia/episodio-2.md` (Ninha criança, Capenga como personagem local) e encerramento; Copa Jacuípe com os rivais Tininho, Denise e Didi e suas provocações; carta da Ninha transcrita de `docs/historia/cartas.md`. Os personagens novos (Ninha, Tininho, Denise, Didi e Capenga) entram em `src/content/characters.ts`. Registrado em `src/content/index.ts`.
**Where**: `src/content/episodes/ep2.ts`
**Depends on**: T23, T24
**Reuses**: estrutura de `episodes/ep1.ts`, roteiro de `docs/historia/episodio-2.md`
**Requirement**: EPI-01, EPI-06, EQUIP-01, EQUIP-02, PROG-02, PROG-03, HUMOR-07, HUMOR-08, EPI-08 (conteúdo)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Os testes de regras e de consistência de conteúdo passam incluindo o `ep2`, inclusive força e fôlego das espécies entre 1 e 10
- [ ] Teste: `index.ts` lista os episódios em ordem, com o 2º sendo Jacuípe (EPI-01)
- [ ] Teste: a carta do `ep2` existe e não contém `{{PENDENTE}}`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): adiciona episódio de jacuípe`

---

#### T57: Cadastrar o Episódio 3: Pantanal

**What**: Pacote `ep3` completo: local e zonas (Pantanal); Pacu, Piraputanga, Piranha-vermelha, Jaú e Pintado (raro), com descrição engraçada; 2 varas e 1 isca novas; roteiro com abertura, 6 a 8 objetivos, cena da Lavínia pirraçando o Adilsinho, um pantaneiro como personagem local e encerramento; Desafio do Pantanal com 3 rivais da família e provocações; carta `{{PENDENTE}}`. Registrado em `src/content/index.ts`.
**Where**: `src/content/episodes/ep3.ts`
**Depends on**: T23, T24
**Reuses**: estrutura de `episodes/ep1.ts`
**Requirement**: EPI-01, EPI-06, EQUIP-01, EQUIP-02, PROG-02, PROG-03, HUMOR-07, HUMOR-08
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Os testes de regras e de consistência de conteúdo passam incluindo o `ep3`, inclusive força e fôlego das espécies entre 1 e 10
- [ ] Teste: `index.ts` lista os episódios em ordem, com o 3º sendo Pantanal (EPI-01)
- [ ] Roteiro de `docs/historia/episodio-3.md` se existir; se não, rascunho no mesmo tom, com as falas que faltam marcadas `{{PENDENTE}}` para a família revisar
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): adiciona episódio do pantanal`

---

#### T58: Cadastrar o Episódio 4: Amazônia

**What**: Pacote `ep4` completo: local e zonas (Amazônia); Aruanã, Pirapitinga, Peixe-cachorro, Tucunaré-açu e Piraíba (rara), com descrição engraçada; 2 varas e 1 isca novas; roteiro com abertura, 6 a 8 objetivos, cena da Lavínia pirraçando o Adilsinho, um guia ribeirinho como personagem local e encerramento; Torneio da Amazônia com 3 rivais da família e provocações; carta `{{PENDENTE}}`. Registrado em `src/content/index.ts`.
**Where**: `src/content/episodes/ep4.ts`
**Depends on**: T23, T24
**Reuses**: estrutura de `episodes/ep1.ts`
**Requirement**: EPI-01, EPI-06, EQUIP-01, EQUIP-02, PROG-02, PROG-03, HUMOR-07, HUMOR-08
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Os testes de regras e de consistência de conteúdo passam incluindo o `ep4`, inclusive força e fôlego das espécies entre 1 e 10
- [ ] Teste: `index.ts` lista os episódios em ordem, com o 4º sendo Amazônia (EPI-01)
- [ ] Roteiro de `docs/historia/episodio-4.md` se existir; se não, rascunho no mesmo tom, com as falas que faltam marcadas `{{PENDENTE}}` para a família revisar
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): adiciona episódio da amazônia`

---

#### T59: Cadastrar o Episódio 5: Alto-mar da Bahia

**What**: Pacote `ep5` completo: local e zonas (Alto-mar da Bahia); Dourado-do-mar, Cavala, Atum, Olho-de-boi e Marlim-azul (raro), com descrição engraçada; 2 varas e 1 isca novas; roteiro com abertura, 6 a 8 objetivos, cena da Lavínia pirraçando o Adilsinho, um mestre de barco como personagem local e encerramento, sendo o encerramento final da história o `chapter.closingScene` do episódio (HIST-10); Copa Adilson Moscovits com 3 rivais da família e provocações; carta `{{PENDENTE}}`. Registrado em `src/content/index.ts`.
**Where**: `src/content/episodes/ep5.ts`
**Depends on**: T23, T24
**Reuses**: estrutura de `episodes/ep1.ts`
**Requirement**: EPI-01, EPI-06, EQUIP-01, EQUIP-02, PROG-02, PROG-03, HUMOR-07, HUMOR-08, HIST-10 (conteúdo)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Os testes de regras e de consistência de conteúdo passam incluindo o `ep5`, inclusive força e fôlego das espécies entre 1 e 10
- [ ] Teste: `index.ts` lista os episódios em ordem, com o 5º sendo Alto-mar da Bahia (EPI-01)
- [ ] Roteiro de `docs/historia/episodio-5.md` se existir; se não, rascunho no mesmo tom, com as falas que faltam marcadas `{{PENDENTE}}` para a família revisar
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): adiciona episódio do alto-mar`

---

#### T60: Criar o jogador típico simulado

**What**: `simulateEpisode()` como no design: arremessa nas zonas da isca equipada, segura até o amarelo e solta no vermelho, compra a melhor vara ao alcance e entra no campeonato assim que libera; devolve minutos, linha do tempo de conquistas e tentativas de campeonato.
**Where**: `src/domain/sim/typicalPlayer.ts`
**Depends on**: T55, T24
**Reuses**: `fishing.ts`, `shop.ts`, `story.ts`, `tournament.ts`, `world.ts`, `rng.ts`
**Requirement**: PROG-01, PROG-04, PROG-05 (instrumento de medição)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Mesma semente → mesmo resultado
- [ ] Episódio de teste com 1 objetivo "pegar 3 peixes" e campeonato trivial: 3 capturas registradas e tempo total igual à soma dos tempos dos arremessos simulados
- [ ] Linha do tempo registra objetivo cumprido, item ao alcance do saldo, espécie nova e recorde, com o minuto de cada um
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sim): simula um jogador típico por episódio`

---

#### T61: Calibrar a progressão dos 5 episódios

**What**: Ajustar preços, objetivos, raridades e pontuação dos rivais nos 5 pacotes até a simulação cumprir a medição de progressão da spec.
**Where**: `src/content/progression.test.ts`
**Depends on**: T56, T57, T58, T59, T60
**Reuses**: `sim/typicalPlayer.ts`
**Requirement**: PROG-01, PROG-04, PROG-05
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Para cada episódio, em 50 sementes, mediana do tempo até a vitória entre 120 e 180 min (PROG-01)
- [ ] Em pelo menos 90% das sementes, nenhum intervalo sem conquista passa de 10 min (PROG-04)
- [ ] Em 50 tentativas, vitória ≥ 60% com a melhor vara do episódio e ≤ 20% com a melhor do episódio anterior (PROG-05)
- [ ] Ajustes só em números de `src/content/episodes/*`, sem mudar o domínio
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(balance): calibra a progressão dos episódios`

---

### Phase 6 tasks

#### T25: Implementar o SaveService

**What**: `save` em 2 slots, `load` com fallback (atual → anterior → novo + cópia do ilegível), falha de cota e `requestPersistence`.
**Where**: `src/platform/save.ts`
**Depends on**: T19
**Reuses**: `saveSchema.ts`
**Requirement**: SAVE-04 (gravação), SAVE-05, SAVE-07, SAVE-08, SAVE-10
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] `save` duas vezes → `current` é o novo e `previous` o antigo
- [ ] `load` com `current` válido → `current`; corrompido → `previous` (SAVE-05, SAVE-07)
- [ ] Ambos corrompidos → perfil novo e `mf.save.corrupt.<timestamp>` com o texto original (SAVE-08)
- [ ] `setItem` lançando cota → `{ ok: false }` sem exceção
- [ ] `requestPersistence` chama `navigator.storage.persist` e tolera a API ausente (SAVE-10)
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(save): salva em dois slots com recuperação`

---

#### T26: Encapsular as APIs do navegador

**What**: `vibrate`, `keepScreenOn` (Wake Lock, readquirido ao voltar), `onVisibilityChange` e `isLandscape`, todos tolerantes a API ausente.
**Where**: `src/platform/browser.ts`
**Depends on**: T2
**Reuses**: -
**Requirement**: PESCA-07 (plataforma), TELA-01 (plataforma), TELA-02, SAVE-01 (evento), ACES-10 (detecção)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Sem `navigator.vibrate` / `navigator.wakeLock` → chamadas não lançam erro (TELA-02)
- [ ] Wake Lock liberado ao ficar oculto é pedido de novo ao voltar visível (TELA-01)
- [ ] `onVisibilityChange` avisa `hidden` e `visible` (SAVE-01)
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(platform): encapsula vibração, tela acesa e visibilidade`

---

#### T27: Implementar a lógica de instalação

**What**: Captura de `beforeinstallprompt`, `canPrompt`, `prompt` e `isStandalone`.
**Where**: `src/platform/install.ts`
**Depends on**: T2
**Reuses**: -
**Requirement**: INST-02, INST-03 (decisão), INST-04 (detecção)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Evento recebido → `canPrompt()` verdadeiro e `prompt()` chama o `prompt` do evento uma vez (INST-02)
- [ ] Sem evento → `canPrompt()` falso, o que leva à instrução do menu (INST-03)
- [ ] `display-mode: standalone` → `isStandalone()` verdadeiro (INST-04)
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): controla o convite de instalação`

---

#### T28: Criar o GameStore

**What**: Estado do jogo com `getState`, `update`, `subscribe` e o hook `useGame`.
**Where**: `src/app/store.ts`
**Depends on**: T18
**Reuses**: `profile.ts`
**Requirement**: - (base de SAVE-04 e das telas)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] `update` notifica todos os inscritos uma vez; cancelar a inscrição para de notificar
- [ ] `useGame` re-renderiza só quando o valor selecionado muda (teste com happy-dom)
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(app): cria estado observável do jogo`

---

#### T29: Criar o GameController

**What**: Único ponto que muda o estado: liga toques, tempo, história, tutorial, torneio, loja, álbum, salvamento e plataforma; expõe `window.__mf` só no modo de teste e2e.
**Where**: `src/app/controller.ts`
**Depends on**: T25, T26, T28
**Reuses**: todo o domínio, `src/content/*`
**Requirement**: SAVE-04 (gatilhos), SAVE-06 (briga interrompida), PESCA-07 (chamada), PESCA-17 (crédito), HIST-05 (cenas), TUTO-08 (encadeamento)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Peixe, compra, objetivo e arremesso de torneio disparam `save` (SAVE-04)
- [ ] Ficha exibida soma `Math.round(kg × preço/kg)` ao saldo uma vez só, e fechar a ficha volta a pesca para `Idle` (PESCA-17)
- [ ] Mordida com vibração ligada chama `vibrate(300)`; desligada, não chama (PESCA-07)
- [ ] Carregar perfil salvo no meio de uma briga → volta para `Idle` sem gastar arremesso de torneio (SAVE-06)
- [ ] Peixe do tutorial conta no objetivo "pegar 3 peixes" (TUTO-08)
- [ ] Abrir a pesca de um episódio envia `GameStarted`; a abertura do episódio aparece uma vez só, e o controlador cuida de `pendingScene` (HIST-01, HIST-09)
- [ ] O efeito de cada evento (compra, álbum) é aplicado no perfil antes de chamar `story.onEvent`
- [ ] `window.__mf` não existe no build de produção
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(app): conecta domínio, salvamento e plataforma`

---

#### T30: Criar o GameLoop

**What**: Laço com `requestAnimationFrame`, `dt` limitado a 100 ms, desenho a 30 qps e parada total na pausa.
**Where**: `src/app/loop.ts`
**Depends on**: T29
**Reuses**: -
**Requirement**: SAVE-01 (congelar)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Com rAF falso, um salto de 5 s gera `tick(0.1)`, não `tick(5)`
- [ ] Pausado → nenhum `tick` nem desenho
- [ ] A 60 Hz, o desenho roda 30 vezes por segundo
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(app): cria laço do jogo econômico`

---

#### T31: Criar o InputController

**What**: Pointer Events viram `pressStart`, `pressEnd` e `tapWater`; só o primeiro dedo vale; sem menu de toque longo.
**Where**: `src/app/input.ts`
**Depends on**: T29
**Reuses**: `FishingRenderer.toLogical` (assinatura)
**Requirement**: ACES-09
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] `pointerdown`/`pointerup` → `pressStart`/`pressEnd`; `pointerup` em `Idle` → `tapWater(x, y)` lógico
- [ ] Segundo dedo é ignorado enquanto o primeiro está na tela (ACES-09)
- [ ] `contextmenu` é cancelado
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(app): traduz toques em comandos do jogo`

---

#### T32: Criar o carregador de sprites

**What**: Carrega folhas de sprite, calcula o quadro da animação pelo tempo e desenha um retângulo colorido quando a imagem falta.
**Where**: `src/render/sprites.ts`
**Depends on**: T2
**Reuses**: -
**Requirement**: - (base do desenho; tratamento "Sprite não carregou" do design)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Quadro certo para tempo e fps dados (ex.: 4 quadros a 8 fps, t = 0,3 s → quadro 2)
- [ ] Imagem que falha ao carregar → `draw` usa o retângulo de fallback sem lançar erro
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(render): carrega e anima sprites com fallback`

---

#### T33: Criar o FishingRenderer

**What**: Desenho da represa, Adilson, isca, linha, peixe, "!" e ondinhas; escala inteira (2×, ou 3× a partir de 540 px) e `toLogical`.
**Where**: `src/render/fishingRenderer.ts`
**Depends on**: T32, T28
**Reuses**: `sprites.ts`
**Requirement**: - (cena; conferida no e2e de T36)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Teste: 412 px → escala 2 e largura lógica 206; 360 px → escala 2 e 180; 600 px → escala 3 e 200
- [ ] Teste: `toLogical` converte cliques nos cantos e no centro com erro de no máximo 1 px lógico
- [ ] `draw` com todos os estados da pesca roda sem erro num canvas do happy-dom (contexto falso)
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(render): desenha a cena da represa`

---

### Phase 7 tasks

#### T34: Criar a casca do app e a tela inicial

**What**: `App` com troca de telas, `theme.css` (tokens de cor com contraste ≥ 4,5:1, Pixelify Sans embutida, texto a 20 px, botões ≥ 56 px na metade de baixo), `TitleScreen` e `InstallHelp`.
**Where**: `src/ui/TitleScreen.tsx`
**Depends on**: T27, T28
**Reuses**: `install.ts`, `store.ts`
**Requirement**: INST-01, INST-02, INST-03, INST-04
**Tools**: MCP: NONE · Skill: `playwright-cli` (depuração), `commit-bee`

**Done when**:

- [ ] e2e: tela inicial com "MoscouFishing", subtítulo, "Colocar na tela" e "Jogar" (INST-01)
- [ ] e2e: com `beforeinstallprompt` simulado, o toque chama o `prompt` (INST-02)
- [ ] e2e: sem o evento, o toque abre a instrução do menu ⋮ e "Adicionar à tela inicial" (INST-03)
- [ ] e2e: emulando `display-mode: standalone`, o botão some (INST-04)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): cria tela inicial com instalação`

---

#### T35: Criar a escolha de dificuldade e os ajustes

**What**: `DifficultyPrompt` na primeira abertura e `Settings` com dificuldade, vibração e "Rever tutorial".
**Where**: `src/ui/Settings.tsx`
**Depends on**: T34
**Reuses**: `profile.ts`
**Requirement**: ACES-01, ACES-02, ACES-04, TUTO-09
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] e2e: primeira abertura pergunta "Como você quer pescar hoje?" com "Tranquilo" e "Desafio"; segunda abertura não pergunta (ACES-01)
- [ ] e2e: trocar a dificuldade em Ajustes persiste após recarregar (ACES-02)
- [ ] e2e: vibração começa ligada e o desligar persiste (ACES-04)
- [ ] e2e: "Rever tutorial" faz o tutorial começar na próxima pescaria (TUTO-09)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): adiciona dificuldade e ajustes`

---

#### T36: Criar a tela de pesca

**What**: `FishingScreen` com o canvas montado e o HUD em HTML: saldo, objetivo atual, botão de pausa, barra de tensão e arremessos restantes no torneio; tela acesa enquanto aberta.
**Where**: `src/ui/FishingScreen.tsx`
**Depends on**: T34
**Reuses**: `fishingRenderer.ts`, `loop.ts`, `input.ts`, `browser.ts`
**Requirement**: HIST-04 (exibição), PESCA-12 (barra), SAVE-03, CAMP-03 (exibição), TELA-01
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] e2e: tocar na água arremessa e a pesca segue até a ficha, dirigida por `window.__mf` com semente fixa
- [ ] e2e: objetivo atual e saldo visíveis (HIST-04)
- [ ] e2e: barra de tensão muda de cor em 69/70 e 89/90 (PESCA-12)
- [ ] e2e: botão de pausa visível em todos os estados da pesca (SAVE-03)
- [ ] e2e: em torneio, "X de 8 arremessos" e pontuação parcial visíveis (CAMP-03)
- [ ] e2e: Wake Lock pedido ao abrir a tela (stub) (TELA-01)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): cria tela de pesca com hud`

---

#### T37: Criar o aviso de mordida e a ficha do peixe

**What**: `BitePrompt` ("!" e "FISGAR!" na metade de baixo) e `FishCard` (desenho, espécie, peso, R$, descrição engraçada, "Novo recorde!").
**Where**: `src/ui/FishCard.tsx`
**Depends on**: T36
**Reuses**: `album.ts`
**Requirement**: PESCA-06, PESCA-07 (e2e), PESCA-15, HUMOR-03, ALBUM-02 (exibição)
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] e2e: na mordida, "!" e "FISGAR!" aparecem e o botão fica inteiro abaixo da metade da tela (PESCA-06)
- [ ] e2e: com `navigator.vibrate` espionado, mordida chama `vibrate(300)` com vibração ligada e não chama desligada (PESCA-07)
- [ ] e2e: ficha mostra espécie, peso com 2 casas, valor em R$ e a descrição da espécie (PESCA-15, HUMOR-03)
- [ ] e2e: peixe acima do recorde mostra "Novo recorde!" (ALBUM-02)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): mostra mordida e ficha do peixe`

---

#### T38: Criar os avisos de pausa, rotação e salvamento

**What**: `PauseOverlay`, `RotateOverlay` e `SaveWarning`.
**Where**: `src/ui/Overlays.tsx`
**Depends on**: T36
**Reuses**: `browser.ts`, `loop.ts`
**Requirement**: SAVE-01, SAVE-02, ACES-10
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] e2e: `visibilitychange` para oculto no meio da briga → tensão e distância não mudam em 3 s (SAVE-01)
- [ ] e2e: ao voltar, "Pausado - toque para continuar"; só retoma após o toque (SAVE-02)
- [ ] e2e: viewport em paisagem fora do modo instalado → pausa e "Vire o celular em pé para jogar" (ACES-10)
- [ ] e2e: `setItem` falhando → "Não consegui salvar" aparece uma vez só na sessão
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): adiciona pausa, rotação e aviso de salvamento`

---

#### T39: Criar os diálogos e os cartões de apresentação

**What**: `DialogBox` (retrato com expressão, nome, texto, avança com toque) e `CharacterIntroCard` (retrato grande, nome e apelido na primeira aparição).
**Where**: `src/ui/DialogBox.tsx`
**Depends on**: T34
**Reuses**: `characters.ts`, `chapter1.ts`
**Requirement**: HIST-01 (exibição), HIST-02, HIST-03, HUMOR-01, HUMOR-02
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] e2e: jogo novo mostra a abertura antes da pesca, com o cartão "JANE: A Que Sempre Teve Razão" primeiro (HIST-01, HUMOR-01)
- [ ] e2e: o cartão só fecha com toque e não aparece de novo na segunda fala da Jane (HUMOR-01)
- [ ] e2e: cada fala mostra nome e retrato; o retrato muda conforme a expressão da fala (HIST-02, HUMOR-02)
- [ ] e2e: a fala só avança com toque; 30 s parado não avança (HIST-03)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): mostra diálogos e cartões de personagem`

---

#### T40: Criar o guia do tutorial

**What**: `TutorialCoach`: fala curta da Jane mais seta apontando onde tocar, piscando após 10 s parado.
**Where**: `src/ui/TutorialCoach.tsx`
**Depends on**: T36, T39
**Reuses**: `tutorial.ts`, `DialogBox.tsx`
**Requirement**: TUTO-02, TUTO-07 (exibição)
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] e2e: em cada passo, uma única instrução visível e uma seta apontando para a área certa (água, botão "FISGAR!", tela) (TUTO-02)
- [ ] e2e: 10 s sem toque → a instrução reaparece e a seta ganha a classe de piscar (TUTO-07)
- [ ] e2e: seguindo as setas, o primeiro peixe é pego e o objetivo mostra 1 de 3
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): guia o tutorial com a jane`

---

### Phase 8 tasks

#### T41: Criar a loja

**What**: Tela `Shop` com varas (barras de Força e Alcance) e iscas, botão "Comprar" e "Equipar".
**Where**: `src/ui/Shop.tsx`
**Depends on**: T34
**Reuses**: `shop.ts`, `world.ts`, `episodes/*`
**Requirement**: EQUIP-01, EQUIP-02, EQUIP-04 (exibição), EQUIP-05 (exibição), EQUIP-09 (exibição)
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] e2e: varas e iscas dos episódios liberados, com barras de 1 a 10; itens de episódio bloqueado não aparecem (EQUIP-01, EQUIP-02, EQUIP-09)
- [ ] e2e: sem saldo, "Comprar" desabilitado e "Faltam R$ X" com o valor certo (EQUIP-04)
- [ ] e2e: dois toques rápidos em "Comprar" descontam uma vez só
- [ ] e2e: equipar a Fibra muda o equipamento mostrado na tela de pesca (EQUIP-05)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): cria a loja do edvaldo`

---

#### T42: Criar o álbum

**What**: Tela `Album` com espécies pegas (recorde) e as que faltam como silhueta "???".
**Where**: `src/ui/Album.tsx`
**Depends on**: T37
**Reuses**: `album.ts`, `species.ts`
**Requirement**: ALBUM-03
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] e2e: depois de pegar uma tilápia, ela aparece com o recorde e as outras 5 como "???" (ALBUM-03)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): cria álbum de peixes`

---

#### T43: Criar as telas do torneio

**What**: `TournamentLobby` (bloqueado ou aberto, regras, rivais), `RivalTaunts` antes do primeiro arremesso e `Standings` com vitória ou "Tentar de novo".
**Where**: `src/ui/Tournament.tsx`
**Depends on**: T36, T39
**Reuses**: `tournament.ts`, `episodes/*`, `DialogBox.tsx`
**Requirement**: CAMP-01 (exibição), CAMP-02, CAMP-05, CAMP-09, HUMOR-04
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] e2e: antes do último objetivo, torneio bloqueado com o objetivo que falta (CAMP-01)
- [ ] e2e: ao entrar no campeonato do Episódio 1, "GuanambiCup", regras e os 3 rivais; no Episódio 5, "Copa Adilson Moscovits" (CAMP-02)
- [ ] e2e: provocações de Ricardo, Bem e Kris antes do primeiro arremesso (HUMOR-04)
- [ ] e2e: após 8 arremessos, classificação com 4 linhas (CAMP-05)
- [ ] e2e: derrota mostra colocação e "Tentar de novo", e o saldo não muda ao repetir (CAMP-09)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): cria telas dos campeonatos`

---

#### T44: Criar a carta e a caixa de mensagens

**What**: `LetterView` em páginas com "Continuar" (sem rolagem), a tela `Messages` para reler e o `EpisodeBanner`.
**Where**: `src/ui/Letter.tsx`
**Depends on**: T43
**Reuses**: `episodes/*`
**Requirement**: CAMP-06 (exibição), CAMP-10, HIST-08 (exibição), HIST-10 (exibição)
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] e2e: primeira vitória abre a carta com remetente e texto; a última página leva ao encerramento e ao "Episódio 2 liberado!" (CAMP-06, HIST-08)
- [ ] e2e: vitória na Copa Adilson Moscovits leva ao encerramento final e a "A pescaria continua: todos os lugares seguem abertos" (HIST-10)
- [ ] e2e: carta longa é dividida em páginas, nenhuma com rolagem vertical
- [ ] e2e: a carta aparece em "Mensagens" e reabre igual depois de recarregar (CAMP-10)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): mostra carta da família e mensagens`

---

#### T45: Aplicar atualizações sem atrapalhar

**What**: `UpdateManager` (aplica a versão nova só ao abrir ou na tela inicial) e `UpdateNotice` ("Novidade no MoscouFishing!" uma vez).
**Where**: `src/pwa/update.ts`
**Depends on**: T34
**Reuses**: `vite-plugin-pwa` (`virtual:pwa-register`)
**Requirement**: INST-07
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] Unit: `shouldApply(screen)` verdadeiro para abertura e tela inicial, falso em pesca e torneio
- [ ] e2e: perfil novo (`seenVersion` vazio) não mostra o aviso de novidade e só grava a versão atual
- [ ] e2e: `seenVersion` antigo no perfil → aviso aparece uma vez; recarregar não mostra de novo (INST-07)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(pwa): aplica atualização em tela segura`

---

#### T46: Criar a celebração exagerada

**What**: `CatchCelebration` (Adilson posando com o peixe e "PEGOU!") e `ImpactFx` (onomatopeia e tremor de até 300 ms).
**Where**: `src/ui/Celebration.tsx`
**Depends on**: T37
**Reuses**: `FishCard.tsx`
**Requirement**: HUMOR-05, HUMOR-06
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] e2e: peixe pego → pose com "PEGOU!" antes da ficha (HUMOR-05)
- [ ] e2e: fisgada mostra "NHAC!", linha arrebentada "PLOFT!", vitória "É CAMPEÃO!"; a classe de tremor some em até 300 ms (HUMOR-06)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): comemora capturas de forma exagerada`

---

#### T62: Criar o mapa dos episódios

**What**: `MapScreen` com os 5 locais: liberados tocáveis, bloqueados com cadeado e o nome do campeonato que libera.
**Where**: `src/ui/MapScreen.tsx`
**Depends on**: T36
**Reuses**: `world.ts`, `episodes/*`
**Requirement**: EPI-03, EPI-04, EPI-07, EPI-08
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] e2e: perfil novo → só Poço do Magro liberada; Rio Jacuípe e Ponte da Cetrel com cadeado e "Vença a GuanambiCup" (EPI-03)
- [ ] e2e: com o Episódio 1 vencido, os dois locais de Jacuípe aparecem liberados; tocar na Ponte da Cetrel abre a pesca com o cenário e os peixes de água salgada (EPI-04, EPI-08)
- [ ] e2e: recarregar o jogo volta ao último local de pesca (EPI-07)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): cria o mapa dos episódios`

---

#### T63: Criar a sala de troféus

**What**: `TrophyRoom` com os 5 troféus: conquistados em destaque e os que faltam em silhueta com o nome do campeonato.
**Where**: `src/ui/TrophyRoom.tsx`
**Depends on**: T34
**Reuses**: `tournament.ts`, `episodes/*`
**Requirement**: TROF-01
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] e2e: com a GuanambiCup vencida, 1 troféu em destaque e 4 silhuetas com o nome de cada campeonato (TROF-01)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `feat(ui): cria a sala de troféus`

---

### Phase 9 tasks

#### T47: Testar a jornada completa

**What**: e2e da jornada inteira da v1, online e offline, corrigindo o que quebrar na integração.
**Where**: `e2e/journey.spec.ts`
**Depends on**: T44, T46, T62, T63
**Reuses**: ganchos `window.__mf`
**Requirement**: INST-06 (todas as funções offline), SAVE-05 (reabrir), EPI-02, EPI-05, Success Criteria
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] e2e: jogo novo → tutorial → objetivos do Episódio 1 → GuanambiCup → vitória → carta → "Episódio 2 liberado!"
- [ ] e2e: com `window.__mf` cumprindo os objetivos, vitória nos campeonatos 2 a 5 em ordem, encerramento final e pesca livre de volta no Poço do Magro (EPI-02, EPI-05, HIST-10)
- [ ] e2e: a mesma jornada roda com `setOffline(true)` depois da primeira carga (INST-06)
- [ ] e2e: recarregar no meio da jornada retoma do mesmo objetivo e saldo (SAVE-05)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `test(e2e): cobre a jornada completa da v1`

---

#### T48: Auditar a acessibilidade

**What**: e2e que percorre todas as telas medindo fonte, área de toque, contraste, posição dos botões e ausência de gestos.
**Where**: `e2e/accessibility.spec.ts`
**Depends on**: T47
**Reuses**: `@axe-core/playwright`
**Requirement**: ACES-05, ACES-06, ACES-07, ACES-08, ACES-09
**Tools**: MCP: NONE · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] Em todas as telas: nenhum texto com `font-size` computado < 18 px (ACES-05)
- [ ] Todo `button` e alvo clicável com caixa ≥ 56 × 56 px (ACES-06)
- [ ] axe sem violações de `color-contrast` (ACES-07)
- [ ] Todo botão de ação com o topo abaixo da metade da altura da tela (ACES-08)
- [ ] Nenhum handler de `dblclick`, gesto ou multitoque registrado; jornada concluída só com toques simples (ACES-09)
- [ ] Gate check passes: `npm test && npm run test:e2e`

**Tests**: e2e
**Gate**: full
**Commit**: `test(a11y): audita fonte, toque e contraste`

---

### Phase 10 tasks

#### T49: Gerar o cenário do Poço do Magro

**What**: Fundo da Barragem do Poço do Magro visto de cima (água, margem, vegetação) em pixel art, no PixelLab, e as ondinhas.
**Where**: `src/assets/scene/poco-do-magro.png`
**Depends on**: T33
**Reuses**: `fishingRenderer.ts`
**Requirement**: - (arte; estilo visual das Assumptions)
**Tools**: MCP: `pixellab` · Skill: `playwright-cli` (print no Pixel 7), `commit-bee`

**Done when**:

- [ ] Cenário desenhado na cena, sem distorção, nas larguras de 360, 412 e 600 px (prints)
- [ ] Zonas de pesca coincidem com áreas visualmente distintas (água funda, vegetação)
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona cenário da barragem do poço do magro`

---

#### T64: Gerar o cenário do Rio Jacuípe

**What**: Fundo do Rio Jacuípe visto de cima (rio de água doce com margem de mangue e coqueiros) em pixel art no PixelLab, no estilo do cenário do Poço do Magro.
**Where**: `src/assets/scene/rio-jacuipe.png`
**Depends on**: T49
**Reuses**: estilo de `scene/poco-do-magro.png`
**Requirement**: - (arte; cenário próprio da EPI-06)
**Tools**: MCP: `pixellab` · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] Cenário aparece ao pescar em Rio Jacuípe (Episódio 2), sem distorção nas larguras de 360, 412 e 600 px (prints)
- [ ] Zonas de pesca do `ep2` coincidem com áreas visualmente distintas
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona cenário do rio jacuípe`

---

#### T73: Gerar o cenário da Ponte da Cetrel

**What**: Fundo do Ponte da Cetrel visto de cima (água salgada sob a ponte, com pilares e pedras) em pixel art no PixelLab, no estilo do cenário do Poço do Magro.
**Where**: `src/assets/scene/ponte-cetrel.png`
**Depends on**: T49
**Reuses**: estilo de `scene/poco-do-magro.png`
**Requirement**: - (arte; cenário próprio da EPI-06)
**Tools**: MCP: `pixellab` · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] Cenário aparece ao pescar em Ponte da Cetrel (Episódio 2), sem distorção nas larguras de 360, 412 e 600 px (prints)
- [ ] Zonas de pesca do `ep2` coincidem com áreas visualmente distintas
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona cenário da ponte da cetrel`

---

#### T65: Gerar o cenário do Pantanal

**What**: Fundo do Pantanal visto de cima (baía com aguapés e vegetação alagada) em pixel art no PixelLab, no estilo do cenário do Poço do Magro.
**Where**: `src/assets/scene/pantanal.png`
**Depends on**: T49
**Reuses**: estilo de `scene/poco-do-magro.png`
**Requirement**: - (arte; cenário próprio da EPI-06)
**Tools**: MCP: `pixellab` · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] Cenário aparece ao pescar em Pantanal (Episódio 3), sem distorção nas larguras de 360, 412 e 600 px (prints)
- [ ] Zonas de pesca do `ep3` coincidem com áreas visualmente distintas
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona cenário do pantanal`

---

#### T66: Gerar o cenário da Amazônia

**What**: Fundo do Amazônia visto de cima (rio de água escura com igapó) em pixel art no PixelLab, no estilo do cenário do Poço do Magro.
**Where**: `src/assets/scene/amazonia.png`
**Depends on**: T49
**Reuses**: estilo de `scene/poco-do-magro.png`
**Requirement**: - (arte; cenário próprio da EPI-06)
**Tools**: MCP: `pixellab` · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] Cenário aparece ao pescar em Amazônia (Episódio 4), sem distorção nas larguras de 360, 412 e 600 px (prints)
- [ ] Zonas de pesca do `ep4` coincidem com áreas visualmente distintas
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona cenário da amazônia`

---

#### T67: Gerar o cenário do Alto-mar da Bahia

**What**: Fundo do Alto-mar da Bahia visto de cima (mar aberto azul-escuro com o barco, visto de cima) em pixel art no PixelLab, no estilo do cenário do Poço do Magro.
**Where**: `src/assets/scene/alto-mar.png`
**Depends on**: T49
**Reuses**: estilo de `scene/poco-do-magro.png`
**Requirement**: - (arte; cenário próprio da EPI-06)
**Tools**: MCP: `pixellab` · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] Cenário aparece ao pescar em Alto-mar da Bahia (Episódio 5), sem distorção nas larguras de 360, 412 e 600 px (prints)
- [ ] Zonas de pesca do `ep5` coincidem com áreas visualmente distintas
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona cenário do alto-mar`

---

### Phase 11 tasks

#### T50: Gerar os peixes do Episódio 1

**What**: Sprites das 8 espécies do Episódio 1 (nadando e na ficha), incluindo o Pirarucu Lendário e a Piranha Lavínia com cara de deboche.
**Where**: `src/assets/fish/ep1/`
**Depends on**: T33
**Reuses**: `sprites.ts`
**Requirement**: - (arte)
**Tools**: MCP: `pixellab` · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] 8 espécies com sprite de cena e de ficha, mesma paleta
- [ ] Prints da ficha de cada espécie conferidos
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona sprites dos peixes`

---

#### T68: Gerar os peixes do Episódio 2

**What**: Sprites de Tilápia de Jacuípe, Traíra, Tainha, Robalo-peva, Carapeba, Robalo-flecha, Pescada-amarela, Vermelho, Baiacu e Camurupim (nadando e na ficha), na paleta do Episódio 1.
**Where**: `src/assets/fish/ep2/`
**Depends on**: T50
**Reuses**: estilo de `fish/ep1/`
**Requirement**: - (arte)
**Tools**: MCP: `pixellab` · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] 10 espécies com sprite de cena e de ficha
- [ ] Prints da ficha de cada espécie conferidos
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona peixes de jacuípe`

---

#### T69: Gerar os peixes do Episódio 3

**What**: Sprites de Pacu, Piraputanga, Piranha-vermelha, Jaú e Pintado (nadando e na ficha), na paleta do Episódio 1.
**Where**: `src/assets/fish/ep3/`
**Depends on**: T50
**Reuses**: estilo de `fish/ep1/`
**Requirement**: - (arte)
**Tools**: MCP: `pixellab` · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] 5 espécies com sprite de cena e de ficha
- [ ] Prints da ficha de cada espécie conferidos
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona peixes do pantanal`

---

#### T70: Gerar os peixes do Episódio 4

**What**: Sprites de Aruanã, Pirapitinga, Peixe-cachorro, Tucunaré-açu e Piraíba (nadando e na ficha), na paleta do Episódio 1.
**Where**: `src/assets/fish/ep4/`
**Depends on**: T50
**Reuses**: estilo de `fish/ep1/`
**Requirement**: - (arte)
**Tools**: MCP: `pixellab` · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] 5 espécies com sprite de cena e de ficha
- [ ] Prints da ficha de cada espécie conferidos
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona peixes da amazônia`

---

#### T71: Gerar os peixes do Episódio 5

**What**: Sprites de Dourado-do-mar, Cavala, Atum, Olho-de-boi e Marlim-azul (nadando e na ficha), na paleta do Episódio 1.
**Where**: `src/assets/fish/ep5/`
**Depends on**: T50
**Reuses**: estilo de `fish/ep1/`
**Requirement**: - (arte)
**Tools**: MCP: `pixellab` · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] 5 espécies com sprite de cena e de ficha
- [ ] Prints da ficha de cada espécie conferidos
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona peixes do alto-mar`

---

### Phase 12 tasks

#### T51: Gerar o Adilson na cena

**What**: Sprites do Adilson na margem: parado, arremessando, recolhendo e posando com o peixe.
**Where**: `src/assets/adilson/`
**Depends on**: T33
**Reuses**: descrição a partir das fotos em `Fotos/`
**Requirement**: - (arte)
**Tools**: MCP: `pixellab` · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] 4 animações carregadas e trocando conforme o estado da pesca
- [ ] Usuário reconhece o Adilson no print
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona sprites do adilson`

---

#### T52: Gerar os retratos da família

**What**: Retratos de 96 × 96 px dos 11 personagens da família (Adilson, Jane, Lavínia, Edvaldo, Ricardo, Bem, Kris, Ninha criança, Tininho, Denise e Didi) nas 4 expressões, a partir das fotos de `Fotos/` e das notas de `docs/arte/personagens.md` (o Edvaldo também de cabelo preto, para o passado).
**Where**: `src/assets/portraits/`
**Depends on**: T39
**Reuses**: `characters.ts`
**Requirement**: - (arte de HUMOR-01 e HUMOR-02)
**Tools**: MCP: `pixellab` · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] 44 retratos, mais o Edvaldo jovem (ou só normal e rindo, se as variações saírem inconsistentes, conforme o risco do design)
- [ ] Fotos não saem da máquina: só as descrições em texto vão para o PixelLab
- [ ] Usuário aprova cada retrato nos prints dos cartões de apresentação
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona retratos da família`

---

#### T72: Gerar os personagens locais

**What**: Retratos de 96 × 96 px, nas 4 expressões, do Capenga, do pantaneiro, do guia ribeirinho e do mestre de barco.
**Where**: `src/assets/portraits/locais/`
**Depends on**: T52
**Reuses**: estilo dos retratos da família
**Requirement**: - (arte de HUMOR-01 e HUMOR-02)
**Tools**: MCP: `pixellab` · Skill: `playwright-cli`, `commit-bee`

**Done when**:

- [ ] 16 retratos no estilo dos da família
- [ ] Prints dos cartões de apresentação conferidos
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona retratos dos personagens locais`

---

#### T53: Gerar o ícone do app

**What**: Ícone do MoscouFishing (Adilson com a vara) em 192, 512 e maskable.
**Where**: `public/icons/`
**Depends on**: T3
**Reuses**: manifest de T3
**Requirement**: INST-05 (ícone)
**Tools**: MCP: `pixellab` · Skill: `commit-bee`

**Done when**:

- [ ] Manifest aponta para os 3 ícones novos e o e2e de T3 continua passando
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `feat(art): adiciona ícone do app`

---

#### T54: Preparar a publicação

**What**: `README.md` com o passo a passo do Cloudflare Pages (repositório privado, comando `npm run release`, pasta `dist`) e conferência final do `release`.
**Where**: `README.md`
**Depends on**: T51, T52, T53, T72, T49, T50, T64, T65, T66, T67, T68, T69, T70, T71, T73
**Reuses**: scripts de T4 e T5
**Requirement**: HIST-07 (aplicado), INST-08 (aplicado)
**Tools**: MCP: NONE · Skill: `commit-bee`

**Done when**:

- [ ] Com marcadores pendentes, `npm run release` falha listando cada um
- [ ] Depois que a família enviar os textos e eles entrarem no conteúdo, `npm run release` passa e o `dist/` fica abaixo de 5 MB
- [ ] Deploy **não** é feito nesta tarefa: precisa de autorização explícita do usuário
- [ ] Gate check passes: build

**Tests**: none
**Gate**: build
**Commit**: `docs(release): documenta publicação no cloudflare pages`

---

## Phase Execution Map

```
Fase 1
T1 → T2 → T3
T2 → T4 → T5

Fase 2
T6 → T8 → T9 → T10 → T11 → T12
T7 → T8

Fase 3
T13, T14, T15, T16, T17 (independentes)
T18 → T19
T18 → T55

Fase 4
T20 → T21
T22 → T23
T22 → T24

Fase 5
T56 → T61
T57 → T61
T58 → T61
T59 → T61
T60 → T61

Fase 6
T25 → T29
T26 → T29
T28 → T29 → T30
T29 → T31
T32 → T33
T28 → T33

Fase 7
T34 → T35
T34 → T36 → T37
T36 → T38
T34 → T39 → T40
T36 → T40

Fase 8
T41, T42, T45, T46, T62, T63 (independentes)
T43 → T44

Fase 9
T47 → T48

Fase 10
T49 → T64
T49 → T73
T49 → T65
T49 → T66
T49 → T67

Fase 11
T50 → T68
T50 → T69
T50 → T70
T50 → T71

Fase 12
T51 → T54
T52 → T72 → T54
T52 → T54
T53 → T54
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order.

**Lotes para sub-agentes (~7 tarefas, fases inteiras):** Fase 1 (5) · Fase 2 (7) · Fase 3 (8) · Fase 4 (5) · Fase 5 (6) · Fase 6 (9) · Fase 7 (7) · Fases 8 e 9 (10) · Fase 10 (6) · Fases 11 e 12 (10) = 10 lotes em sequência.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | `.gitignore` | ✅ Granular |
| T2 | `package.json` | ⚠️ OK (coeso) |
| T3 | `vite.config.ts` (modify) | ⚠️ OK (coeso) |
| T4 | `scripts/check-content.ts` | ✅ Granular |
| T5 | `scripts/check-size.ts` | ✅ Granular |
| T6 | `src/content/types.ts` | ✅ Granular |
| T7 | `src/domain/rng.ts` | ✅ Granular |
| T8 | `src/domain/fishing.ts` | ✅ Granular |
| T9 | `src/domain/fishing.ts` (modify) | ✅ Granular |
| T10 | `src/domain/fishing.ts` (modify) | ✅ Granular |
| T11 | `src/domain/fishing.ts` (modify) | ✅ Granular |
| T12 | `src/domain/tuning.ts` | ✅ Granular |
| T13 | `src/domain/shop.ts` | ✅ Granular |
| T14 | `src/domain/album.ts` | ✅ Granular |
| T15 | `src/domain/tournament.ts` | ✅ Granular |
| T16 | `src/domain/story.ts` | ✅ Granular |
| T17 | `src/domain/tutorial.ts` | ✅ Granular |
| T18 | `src/domain/profile.ts` | ✅ Granular |
| T19 | `src/domain/saveSchema.ts` | ✅ Granular |
| T55 | `src/domain/world.ts` | ✅ Granular |
| T20 | `src/content/episodes/ep1.ts` | ✅ Granular |
| T21 | `src/content/episodes/ep1.ts` (modify) | ✅ Granular |
| T22 | `src/content/characters.ts` | ✅ Granular |
| T23 | `src/content/episodes/ep1.ts` (modify) | ✅ Granular |
| T24 | `src/content/episodes/ep1.ts` (modify) | ✅ Granular |
| T56 | `src/content/episodes/ep2.ts` | ✅ Granular |
| T57 | `src/content/episodes/ep3.ts` | ✅ Granular |
| T58 | `src/content/episodes/ep4.ts` | ✅ Granular |
| T59 | `src/content/episodes/ep5.ts` | ✅ Granular |
| T60 | `src/domain/sim/typicalPlayer.ts` | ✅ Granular |
| T61 | `src/content/progression.test.ts` | ✅ Granular |
| T25 | `src/platform/save.ts` | ✅ Granular |
| T26 | `src/platform/browser.ts` | ✅ Granular |
| T27 | `src/platform/install.ts` | ✅ Granular |
| T28 | `src/app/store.ts` | ✅ Granular |
| T29 | `src/app/controller.ts` | ✅ Granular |
| T30 | `src/app/loop.ts` | ✅ Granular |
| T31 | `src/app/input.ts` | ✅ Granular |
| T32 | `src/render/sprites.ts` | ✅ Granular |
| T33 | `src/render/fishingRenderer.ts` | ✅ Granular |
| T34 | `src/ui/TitleScreen.tsx` | ⚠️ OK (coeso) |
| T35 | `src/ui/Settings.tsx` | ⚠️ OK (coeso) |
| T36 | `src/ui/FishingScreen.tsx` | ✅ Granular |
| T37 | `src/ui/FishCard.tsx` | ⚠️ OK (coeso) |
| T38 | `src/ui/Overlays.tsx` | ⚠️ OK (coeso) |
| T39 | `src/ui/DialogBox.tsx` | ⚠️ OK (coeso) |
| T40 | `src/ui/TutorialCoach.tsx` | ✅ Granular |
| T41 | `src/ui/Shop.tsx` | ✅ Granular |
| T42 | `src/ui/Album.tsx` | ✅ Granular |
| T43 | `src/ui/Tournament.tsx` | ⚠️ OK (coeso) |
| T44 | `src/ui/Letter.tsx` | ✅ Granular |
| T45 | `src/pwa/update.ts` | ✅ Granular |
| T46 | `src/ui/Celebration.tsx` | ✅ Granular |
| T62 | `src/ui/MapScreen.tsx` | ✅ Granular |
| T63 | `src/ui/TrophyRoom.tsx` | ✅ Granular |
| T47 | `e2e/journey.spec.ts` | ✅ Granular |
| T48 | `e2e/accessibility.spec.ts` | ✅ Granular |
| T49 | `src/assets/scene/poco-do-magro.png` | ✅ Granular |
| T64 | `src/assets/scene/rio-jacuipe.png` | ✅ Granular |
| T73 | `src/assets/scene/ponte-cetrel.png` | ✅ Granular |
| T65 | `src/assets/scene/pantanal.png` | ✅ Granular |
| T66 | `src/assets/scene/amazonia.png` | ✅ Granular |
| T67 | `src/assets/scene/alto-mar.png` | ✅ Granular |
| T50 | `src/assets/fish/ep1/` | ✅ Granular |
| T68 | `src/assets/fish/ep2/` | ✅ Granular |
| T69 | `src/assets/fish/ep3/` | ✅ Granular |
| T70 | `src/assets/fish/ep4/` | ✅ Granular |
| T71 | `src/assets/fish/ep5/` | ✅ Granular |
| T51 | `src/assets/adilson/` | ✅ Granular |
| T52 | `src/assets/portraits/` | ✅ Granular |
| T72 | `src/assets/portraits/locais/` | ✅ Granular |
| T53 | `public/icons/` | ✅ Granular |
| T54 | `README.md` | ✅ Granular |

## Diagram-Definition Cross-Check

Só dependências dentro da mesma fase aparecem nos diagramas; as de fases anteriores ficam no campo `Depends on`.

| Task | Depends On (task body) | Diagram Shows (mesma fase) | Status |
| ---- | ---------------------- | -------------------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T2 | T2 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T2 (fase 1) | - | ✅ Match |
| T7 | T2 (fase 1) | - | ✅ Match |
| T8 | T6, T7 | T6 → T8, T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T6 (fase 2) | - | ✅ Match |
| T14 | T6 (fase 2) | - | ✅ Match |
| T15 | T11 (fase 2) | - | ✅ Match |
| T16 | T6 (fase 2) | - | ✅ Match |
| T17 | T10 (fase 2) | - | ✅ Match |
| T18 | T6 (fase 2) | - | ✅ Match |
| T19 | T18 | T18 → T19 | ✅ Match |
| T55 | T18 | T18 → T55 | ✅ Match |
| T20 | T6 (fase 2) | - | ✅ Match |
| T21 | T20 | T20 → T21 | ✅ Match |
| T22 | T6 (fase 2) | - | ✅ Match |
| T23 | T22 | T22 → T23 | ✅ Match |
| T24 | T22 | T22 → T24 | ✅ Match |
| T56 | T23 (fase 4), T24 (fase 4) | - | ✅ Match |
| T57 | T23 (fase 4), T24 (fase 4) | - | ✅ Match |
| T58 | T23 (fase 4), T24 (fase 4) | - | ✅ Match |
| T59 | T23 (fase 4), T24 (fase 4) | - | ✅ Match |
| T60 | T55 (fase 3), T24 (fase 4) | - | ✅ Match |
| T61 | T56, T57, T58, T59, T60 | T56 → T61, T57 → T61, T58 → T61, T59 → T61, T60 → T61 | ✅ Match |
| T25 | T19 (fase 3) | - | ✅ Match |
| T26 | T2 (fase 1) | - | ✅ Match |
| T27 | T2 (fase 1) | - | ✅ Match |
| T28 | T18 (fase 3) | - | ✅ Match |
| T29 | T25, T26, T28 | T25 → T29, T26 → T29, T28 → T29 | ✅ Match |
| T30 | T29 | T29 → T30 | ✅ Match |
| T31 | T29 | T29 → T31 | ✅ Match |
| T32 | T2 (fase 1) | - | ✅ Match |
| T33 | T32, T28 | T28 → T33, T32 → T33 | ✅ Match |
| T34 | T27 (fase 6), T28 (fase 6) | - | ✅ Match |
| T35 | T34 | T34 → T35 | ✅ Match |
| T36 | T34 | T34 → T36 | ✅ Match |
| T37 | T36 | T36 → T37 | ✅ Match |
| T38 | T36 | T36 → T38 | ✅ Match |
| T39 | T34 | T34 → T39 | ✅ Match |
| T40 | T36, T39 | T36 → T40, T39 → T40 | ✅ Match |
| T41 | T34 (fase 7) | - | ✅ Match |
| T42 | T37 (fase 7) | - | ✅ Match |
| T43 | T36 (fase 7), T39 (fase 7) | - | ✅ Match |
| T44 | T43 | T43 → T44 | ✅ Match |
| T45 | T34 (fase 7) | - | ✅ Match |
| T46 | T37 (fase 7) | - | ✅ Match |
| T62 | T36 (fase 7) | - | ✅ Match |
| T63 | T34 (fase 7) | - | ✅ Match |
| T47 | T44 (fase 8), T46 (fase 8), T62 (fase 8), T63 (fase 8) | - | ✅ Match |
| T48 | T47 | T47 → T48 | ✅ Match |
| T49 | T33 (fase 6) | - | ✅ Match |
| T64 | T49 | T49 → T64 | ✅ Match |
| T73 | T49 | T49 → T73 | ✅ Match |
| T65 | T49 | T49 → T65 | ✅ Match |
| T66 | T49 | T49 → T66 | ✅ Match |
| T67 | T49 | T49 → T67 | ✅ Match |
| T50 | T33 (fase 6) | - | ✅ Match |
| T68 | T50 | T50 → T68 | ✅ Match |
| T69 | T50 | T50 → T69 | ✅ Match |
| T70 | T50 | T50 → T70 | ✅ Match |
| T71 | T50 | T50 → T71 | ✅ Match |
| T51 | T33 (fase 6) | - | ✅ Match |
| T52 | T39 (fase 7) | - | ✅ Match |
| T72 | T52 | T52 → T72 | ✅ Match |
| T53 | T3 (fase 1) | - | ✅ Match |
| T54 | T51, T52, T53, T72, T49 (fase 10), T50 (fase 11), T64 (fase 10), T65 (fase 10), T66 (fase 10), T67 (fase 10), T68 (fase 11), T69 (fase 11), T70 (fase 11), T71 (fase 11), T73 (fase 10) | T51 → T54, T52 → T54, T53 → T54, T72 → T54 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Repositório | none | none | ✅ OK |
| T2 | Config | none | none | ✅ OK |
| T3 | Config PWA (comportamento no navegador) | e2e | e2e | ✅ OK |
| T4 | Scripts | unit | unit | ✅ OK |
| T5 | Scripts | unit | unit | ✅ OK |
| T6 | Tipos | none | none | ✅ OK |
| T7 | Domínio | unit | unit | ✅ OK |
| T8 | Domínio | unit | unit | ✅ OK |
| T9 | Domínio | unit | unit | ✅ OK |
| T10 | Domínio | unit | unit | ✅ OK |
| T11 | Domínio | unit | unit | ✅ OK |
| T12 | Domínio | unit | unit | ✅ OK |
| T13 | Domínio | unit | unit | ✅ OK |
| T14 | Domínio | unit | unit | ✅ OK |
| T15 | Domínio | unit | unit | ✅ OK |
| T16 | Domínio | unit | unit | ✅ OK |
| T17 | Domínio | unit | unit | ✅ OK |
| T18 | Domínio | unit | unit | ✅ OK |
| T19 | Domínio | unit | unit | ✅ OK |
| T55 | Domínio | unit | unit | ✅ OK |
| T20 | Conteúdo | unit | unit | ✅ OK |
| T21 | Conteúdo | unit | unit | ✅ OK |
| T22 | Conteúdo | unit | unit | ✅ OK |
| T23 | Conteúdo | unit | unit | ✅ OK |
| T24 | Conteúdo | unit | unit | ✅ OK |
| T56 | Conteúdo | unit | unit | ✅ OK |
| T57 | Conteúdo | unit | unit | ✅ OK |
| T58 | Conteúdo | unit | unit | ✅ OK |
| T59 | Conteúdo | unit | unit | ✅ OK |
| T60 | Domínio | unit | unit | ✅ OK |
| T61 | Conteúdo | unit | unit | ✅ OK |
| T25 | Plataforma | unit | unit | ✅ OK |
| T26 | Plataforma | unit | unit | ✅ OK |
| T27 | Plataforma | unit | unit | ✅ OK |
| T28 | App | unit | unit | ✅ OK |
| T29 | App | unit | unit | ✅ OK |
| T30 | App | unit | unit | ✅ OK |
| T31 | App | unit | unit | ✅ OK |
| T32 | Desenho | unit | unit | ✅ OK |
| T33 | Desenho | unit | unit | ✅ OK |
| T34 | Telas | e2e | e2e | ✅ OK |
| T35 | Telas | e2e | e2e | ✅ OK |
| T36 | Telas | e2e | e2e | ✅ OK |
| T37 | Telas | e2e | e2e | ✅ OK |
| T38 | Telas | e2e | e2e | ✅ OK |
| T39 | Telas | e2e | e2e | ✅ OK |
| T40 | Telas | e2e | e2e | ✅ OK |
| T41 | Telas | e2e | e2e | ✅ OK |
| T42 | Telas | e2e | e2e | ✅ OK |
| T43 | Telas | e2e | e2e | ✅ OK |
| T44 | Telas | e2e | e2e | ✅ OK |
| T45 | Telas (PWA) | e2e | e2e | ✅ OK |
| T46 | Telas | e2e | e2e | ✅ OK |
| T62 | Telas | e2e | e2e | ✅ OK |
| T63 | Telas | e2e | e2e | ✅ OK |
| T47 | Telas (integração) | e2e | e2e | ✅ OK |
| T48 | Telas (integração) | e2e | e2e | ✅ OK |
| T49 | Arte | none | none | ✅ OK |
| T64 | Arte | none | none | ✅ OK |
| T73 | Arte | none | none | ✅ OK |
| T65 | Arte | none | none | ✅ OK |
| T66 | Arte | none | none | ✅ OK |
| T67 | Arte | none | none | ✅ OK |
| T50 | Arte | none | none | ✅ OK |
| T68 | Arte | none | none | ✅ OK |
| T69 | Arte | none | none | ✅ OK |
| T70 | Arte | none | none | ✅ OK |
| T71 | Arte | none | none | ✅ OK |
| T51 | Arte | none | none | ✅ OK |
| T52 | Arte | none | none | ✅ OK |
| T72 | Arte | none | none | ✅ OK |
| T53 | Arte | none | none | ✅ OK |
| T54 | Documentação | none | none | ✅ OK |
