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

## Handoff

- **Feature**: `.specs/features/v1-mvp`
- **Phase / Task**: Tasks (54 tarefas em 9 fases, aguardando aprovação do usuário)
- **Completed**: spec e design aprovados; tasks.md validado (0 erros); roteiro do Capítulo 1 e carta do Capítulo 2 em `docs/historia/`; fotos em `Fotos/` (fora do git)
- **In-progress** (file:line): none
- **Next step**: Com as tarefas aprovadas, ler `references/implement.md` e começar pela T1 (lotes de sub-agentes se o usuário aceitar).
- **Blockers**: PixelLab MCP só aparece depois de reabrir o VS Code (necessário só na Fase 9); falta foto do Tio Ricardo; carta da GuanambiCup pendente.
- **Uncommitted files**: `.specs/` inteiro (repositório git ainda não criado)
- **Branch**: nenhuma (git ainda não iniciado; primeira branch será `feat/v1-mvp`)
