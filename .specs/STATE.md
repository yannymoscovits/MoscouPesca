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
- **Phase / Task**: Execute, Fase 10 (T80, T81, T82 a T86, T61 e T87 por último) com sub-agente
- **Completed**: Fases 1 a 9 (até `b838c50`: visual novo, episódios 4 e 5, sala de troféus); gate verde com 394 unitários e 104 e2e; arte aprovada em `arte-previa/`: Adilson (4 expressões e corpo), Jane (4 expressões), Lavínia (capuz azul, cabelo liso; expressões em andamento), peixinho fofo
- **In-progress** (file:line): lote da Fase 10
- **Next step**: Terminar as expressões da Lavínia antes de o sub-agente chegar na T87; depois seguir a arte do elenco do Episódio 1 (Ricardo, Bem, Kris, Edvaldo) com prévia e aprovação.
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: `feat/v1-mvp`
