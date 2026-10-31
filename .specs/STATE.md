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
- **Phase / Task**: Execute; Fases 1 a 8, T75 e T76 concluídas; próximo: T77 e T78 (diálogo e tela de pesca dos mockups), Fases 9 e 10 e prévias de arte com o usuário
- **Completed**: até `e10e9cc`; 303 testes unitários e 88 e2e passando
- **In-progress** (file:line): none
- **Next step**: Depois que o usuário reabrir o VS Code (para carregar o PixelLab): subir o servidor de desenvolvimento na porta 5173 com `--host`; disparar T77 e T78 num sub-agente e T58, T59, T61 e T63 em outro (worktree isolado para um deles); depois T47 e T48; ao mesmo tempo, prévias do Adilson (chapéu de pescador; 3 versões variando cores do chapéu e do colete).
- **Blockers**: estilo do quadro de diálogo aguardando o usuário (padrão: moldura azul com amarelo e retrato em cima).
- **Uncommitted files**: none
- **Branch**: `feat/v1-mvp`
