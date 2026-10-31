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

- **Feature**: `.specs/features/pesca-bass` (a v1-mvp continua depois dela)
- **Phase / Task**: Execute da pescaria nova, T1 a T18 em 3 sub-agentes, depois o Verificador
- **Completed**: v1-mvp Fases 1 a 10 até `3b2208c`, menos a T61 (calibragem), que volta depois da pescaria nova; spec, contexto, desenho e tarefas da pescaria nova aprovados; retratos do elenco inteiro em `arte-previa/` esperando aprovação
- **In-progress** (file:line): lote 1 da pescaria nova (T1 a T7)
- **Next step**: Rodar os lotes 2 e 3 e o Verificador; depois a T61 da v1-mvp com a simulação nova e as Fases 11 a 14.
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: `feat/v1-mvp`
