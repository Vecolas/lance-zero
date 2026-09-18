# Architecture Decision Records

Registro leve de decisões arquiteturais, no formato de Michael Nygard.

Um ADR é criado quando uma decisão é cara de reverter: escolha de biblioteca com
implicação de licença, fronteira de camada, formato de dado persistido,
dependência externa. Correções e refatorações comuns não precisam de ADR.

Estados: `proposto`, `aceito`, `substituído por ADR-XXXX`, `descontinuado`.

| ADR                                                                  | Título                                                                                            | Estado                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [0001](./0001-usar-adrs.md)                                          | Usar ADRs para decisões arquiteturais                                                             | aceito                                                 |
| [0002](./0002-stack-inicial.md)                                      | Stack inicial: Next.js, TypeScript, pnpm, CSS Modules                                             | aceito                                                 |
| [0003](./0003-local-first.md)                                        | MVP local-first, sem backend obrigatório                                                          | aceito, autenticação alterada pelo ADR-0008 e ADR-0009 |
| [0004](./0004-engine-em-web-worker.md)                               | Stockfish em Web Worker atrás de EngineProvider                                                   | aceito                                                 |
| [0005](./0005-isolamento-gpl.md)                                     | Isolar artefatos GPL e não usar Chessground                                                       | aceito                                                 |
| [0006](./0006-camadas-e-repositorios.md)                             | Domínio puro, persistência e serviços atrás de interfaces                                         | aceito                                                 |
| [0007](./0007-identidade-visual.md)                                  | Adotar o guia de identidade visual, com modo claro e escuro                                       | aceito                                                 |
| [0008](./0008-contas-clerk-supabase-rls.md)                          | Contas com Clerk + Supabase e autorização no banco por RLS                                        | autenticação substituída pelo ADR-0009                 |
| [0009](./0009-supabase-auth-sem-clerk.md)                            | Supabase Auth no lugar do Clerk, e sincronização como documento único                             | aceito                                                 |
| [0010](./0010-tema-com-dois-estados.md)                              | Botão de tema com dois estados; "seguir o sistema" continua no armazenamento                      | aceito, altera o ADR-0007                              |
| [0011](./0011-estagio-de-aprendizado-antes-da-cobranca.md)           | Estágio de aprendizado por habilidade, antes de qualquer cobrança                                 | aceito, altera o planner                               |
| [0012](./0012-roadmap-aponta-para-o-conteudo-exato.md)               | Roadmap aponta para o conteúdo exato; nunca para a biblioteca genérica                            | aceito, substitui a ponte por nome                     |
| [0013](./0013-internacionalizacao-pt-en.md)                          | Internacionalização PT-BR/EN com segmento `[lang]` e sem biblioteca de i18n                       | aceito                                                 |
| [0014](./0014-biblioteca-mostra-a-posicao-e-guarda-o-checkpoint.md)  | Biblioteca com prévia da posição, lição com endereço e tabuleiro dominante, checkpoint persistido | aceito, schema do IndexedDB na V6                      |
| [0015](./0015-revisar-e-a-casa-da-revisao-espacada.md)               | A aba "Treinar" vira "Revisar", a casa da revisão espaçada                                        | aceito, aposenta uma rota de produto                   |
| [0016](./0016-uma-etapa-por-vez-e-conteudo-sempre-aberto.md)         | Uma etapa por vez na jornada, Mapa do estudo e conteúdo sempre aberto                             | aceito, remove o modelo de etapa bloqueada             |
| [0017](./0017-a-variacao-se-ensina-e-se-enfrenta.md)                 | A variação é ensinada na posição do desvio e jogada pelo bot no treino                            | aceito, ampliado pelos ADR-0018 e ADR-0019             |
| [0018](./0018-quem-desvia-decide-a-etapa.md)                         | Quem desvia decide a etapa, e o explorador sai da jornada de estudo                               | a partição foi substituída pelo ADR-0022               |
| [0019](./0019-responder-e-jogar.md)                                  | Responder é jogar: a posição anda, o computador responde, e o texto fica ao lado                  | aceito, amplia o ADR-0017                              |
| [0020](./0020-a-etapa-so-cobra-o-que-a-tela-oferece.md)              | Uma etapa só cobra o que a tela oferece                                                           | aceito, muda o contrato entre domínio e tela           |
| [0021](./0021-o-treino-de-final-termina-e-o-conteudo-e-conferido.md) | O treino de final termina, e o conteúdo é conferido contra a tablebase                            | aceito, altera o modelo de conteúdo de finais          |
| [0022](./0022-o-ramo-e-a-unidade-pedagogica.md)                      | O ramo é a unidade pedagógica, e a jornada de abertura tem oito etapas                            | aceito, substitui em parte o ADR-0018                  |
| [0023](./0023-a-linha-principal-se-completa.md)                      | A linha principal se completa, e a ajuda decresce ao longo dela                                   | aceito, muda a etapa 3 de leitura para prática         |
| [0024](./0024-o-plano-tem-posicao-e-decisao.md)                      | O plano tem posição própria, e uma decisão quando o conteúdo permite                              | aceito, muda a etapa 5 e o modelo de plano             |
| [0025](./0025-a-cobertura-e-uma-matriz-ramo-por-papel.md)            | A cobertura do treino é uma matriz ramo × papel, e só o core bloqueia                             | aceito, fecha um ponto cego do ADR-0022                |
| [0026](./0026-a-pratica-guiada-treina-o-que-o-treino-cobra.md)       | A prática guiada treina a principal e os ramos core, com a taxonomia de erro                      | aceito, alinha a etapa 7 com a etapa 8                 |
| [0027](./0027-a-rodada-tem-tipo-e-a-abertura-tem-fronteira.md)       | A rodada de treino tem tipo (contexto ou ramo), e o fim da linha entrega o plano                  | aceito, muda a etapa 8 e o modelo de rodada            |
| [0028](./0028-a-revisao-de-abertura-e-por-ramo.md)                   | A revisão de abertura agrupa por ramo e reconstrói o caminho até a posição                        | aceito, refina o planner-v2 sem substituí-lo           |
| [0029](./0029-das-suas-partidas.md)                                  | "Das suas partidas": desvios reais na página da abertura, sem inventar ramo                       | aceito, reusa a evidência já importada                 |
