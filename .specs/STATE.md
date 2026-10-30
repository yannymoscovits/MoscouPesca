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
- **Phase / Task**: Execute, Fase 6 (lote 6: T25 a T33, plataforma, app e desenho, com sub-agente)
- **Completed**: Fases 1 a 5 (até `313a298`); 205 testes unitários e 3 e2e passando; episódios 1 a 3 no conteúdo; roteiros 1 a 4; cartas 1 e 2 prontas, 3 em rascunho
- **In-progress** (file:line): lote 6 rodando em sub-agente
- **Next step**: Quando o lote 6 terminar, disparar a Fase 7 (telas da pescaria).
- **Blockers**: PixelLab MCP só aparece depois de reabrir o VS Code (fases de arte); roteiro do episódio 5 e cartas 4 e 5 pendentes; carta 3 aguardando a versão final do usuário; fala opcional do Didi aguardando o usuário; descrições de Márcio e Sr. Higashi.
- **Uncommitted files**: none
- **Branch**: `feat/v1-mvp`
