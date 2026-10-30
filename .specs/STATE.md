# STATE

## Decisions

### AD-001
- **Decision**: O MoscouFishing é um PWA estático, sem servidor; todo o estado do jogador fica no celular (localStorage).
- **Reason**: Precisa chegar ao Adilson em dias, por um link, funcionando offline na UTI; sem conta nem login.
- **Trade-off**: Sem backup na nuvem, sem ranking online e sem ver o progresso dele de outro aparelho.
- **Scope**: Todas as features (capítulos, campeonatos, mensagens).
- **Date**: 2026-10-30
- **Status**: active

### AD-002
- **Decision**: Três camadas: domínio em TypeScript puro (sem DOM, com RNG e tempo injetados), interface em Preact/HTML e desenho em Canvas 2D só na cena da água.
- **Reason**: Escolha do usuário; texto nítido e acessibilidade testável no DOM, domínio determinístico e testável com Vitest, pacote pequeno.
- **Trade-off**: Sem motor de jogo pronto; animação de sprites e desenho da cena são código próprio.
- **Scope**: Todas as features; novas mecânicas entram no domínio, novas telas na UI.
- **Date**: 2026-10-30
- **Status**: active

### AD-003
- **Decision**: Conteúdo (história, personagens, espécies, equipamentos, torneios, mensagens) fica em arquivos TypeScript tipados em `src/content/`, e o build de publicação falha se houver o marcador `{{PENDENTE}}`.
- **Reason**: Separa história de código, permite programar antes de o texto da família chegar e impede publicar com texto faltando.
- **Trade-off**: Editar texto exige mexer num arquivo `.ts` e publicar uma versão nova.
- **Scope**: Todos os capítulos e campeonatos.
- **Date**: 2026-10-30
- **Status**: active

### AD-004
- **Decision**: Cada episódio é um pacote de conteúdo em `src/content/episodes/epN.ts` (local, zonas, espécies, varas, iscas, roteiro, campeonato e carta), sobre o mesmo domínio; o progresso por episódio fica no perfil.
- **Reason**: O jogo tem 5 episódios entregues juntos e pode ganhar outros depois; episódio novo deve ser só conteúdo novo.
- **Trade-off**: Mecânica exclusiva de um episódio exige mudar o domínio para todos.
- **Scope**: Todos os episódios, campeonatos e cartas.
- **Date**: 2026-10-30
- **Status**: active

## Handoff

- **Feature**: `.specs/features/v1-mvp`
- **Phase / Task**: Execute, Fase 8 (lote 8: T74, T41 a T46 e T62, telas do jogo, com sub-agente)
- **Completed**: Fases 1 a 7 (até `b8ac69b`); jogo jogável nos episódios 1 a 3 sem arte; 291 testes unitários e 40 e2e passando
- **In-progress** (file:line): lote 8 rodando em sub-agente
- **Next step**: Quando o lote 8 terminar, disparar as Fases 9 e 10 (episódios 4 e 5, calibragem, sala de troféus, jornada completa e acessibilidade).
- **Blockers**: PixelLab MCP só aparece depois de reabrir o VS Code (fases de arte).
- **Uncommitted files**: spec (visual da tela inicial) e `docs/arte/mockups/tela-inicial.png`. Pendente no `tasks.md` depois do lote 8: T75 já registrada e rodando em worktree isolado, em paralelo à Fase 8 (juntar depois que as duas terminarem); aprovação do usuário com prévias antes de gerar arte em T51, T52 e T72 (3 versões do retrato normal; página de prévia em `arte-previa/`, fora do git)
- **Branch**: `feat/v1-mvp`
