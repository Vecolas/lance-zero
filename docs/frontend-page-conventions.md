# Convenções de páginas

1. Toda rota de produto tem um H1 único, objetivo explícito e uma ação primária.
2. O shell fornece landmarks, skip link, tema e navegação; a página não recria
   header global.
3. Conteúdo longo cresce. `overflow: hidden`, `nowrap`, `line-clamp` e alturas
   máximas precisam ser locais, justificados e nunca esconder instruções,
   feedback, erro ou status.
4. Mobile empilha board → ação → explicação → movelist; desktop usa duas colunas
   quando isso melhora a leitura.
5. Cards de Hoje são links inteiros e continuam clicáveis depois de concluídos.
   Completion nunca é apresentado como mastery.
6. Toda superfície com dados explicita loading, empty, error e completed.
7. Status é textual e não depende exclusivamente de cor; controles têm foco
   visível e pelo menos 40px de área de toque.
8. Dados externos e engine são secundários e falíveis. A tela pedagógica deve
   continuar utilizável sem explorer/tablebase/engine.
