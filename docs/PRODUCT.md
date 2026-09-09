# PRODUCT — LanceZero

> Documento de comportamento do produto. Para a pesquisa completa, currículo,
> referências e justificativas, ver [`RESEARCH.md`](./RESEARCH.md).

## Promessa

**Treine o que perde suas partidas.**

O LanceZero não é uma caixa de ferramentas de xadrez. É um ciclo fechado de aprendizado:

```
diagnosticar → explicar → prática guiada → recuperação independente
   → revisão espaçada → aplicação em partida real → revisão da partida
   → plano de treino atualizado
```

Público inicial: **800–1600**, com onboarding e currículo padrão calibrados para **~1100**.

O núcleo do produto funciona **sem API de IA paga e sem API de xadrez paga**.

## Identidade visual

A fonte de verdade é `identidade-visual/LanceZero_Guia_Identidade_Visual.md`
(ver ADR-0007). Modo claro e escuro são requisito, não enfeite: a preferência
tem três estados — sistema (padrão), claro e escuro.

## Princípios inegociáveis

1. **Plano do dia primeiro.** A home de quem já usa é "Treino de hoje", não um menu.
2. **O usuário pensa antes da engine.** A revisão de partida começa com a engine escondida.
3. **Erro vira treino futuro.** Um erro relevante gera card de revisão e sobe a prioridade da habilidade.
4. **Habilidades, não só puzzles.** Toda tentativa atualiza um modelo de habilidades.
5. **Recuperação antes de explicação.** No modo misto, o tema não é revelado antes da resposta.
6. **Revisão espaçada.** FSRS para posições, erros, finais, conceitos e nós de repertório.
7. **A ajuda desaparece.** Exemplos resolvidos e dicas nas primeiras exposições; depois, nada.
8. **Sem falsa precisão.** WDL do Stockfish nunca é apresentado como chance humana de vitória.
9. **Local-first.** Treino, PGNs e análise funcionam sem conta.
10. **Núcleo gratuito.** Nenhum serviço pago é obrigatório.

## Superfícies

| Rota          | Nome PT-BR     | Fase | Papel                                                   |
| ------------- | -------------- | ---- | ------------------------------------------------------- |
| `/`           | Landing        | 0    | Explica o ciclo e leva ao primeiro treino               |
| `/onboarding` | Diagnóstico    | 10   | 12–20 posições, estimativa inicial, primeira semana     |
| `/dashboard`  | Treino de hoje | 5    | Home autenticada/local; sessão pronta com justificativa |
| `/train`      | Treinar        | 5    | Execução da sessão, um exercício por vez                |
| `/puzzles`    | Puzzles        | 3    | Táticas com dicas graduais                              |
| `/calculate`  | Cálculo        | 4    | Xeques, capturas, ameaças; candidatos; visualização     |
| `/games`      | Partidas       | 6    | Importação, revisão humana, depois engine               |
| `/openings`   | Aberturas      | 9    | Princípios + repertório enxuto + explorer               |
| `/endgames`   | Finais         | 8    | Currículo básico + tablebase                            |
| `/lessons`    | Biblioteca     | 10   | 30–40 microlições                                       |
| `/progress`   | Progresso      | 5    | Forças, prioridades, retenção                           |
| `/settings`   | Ajustes        | 4    | Backup, orçamento de engine, preferências               |
| `/licenses`   | Licenças       | 0    | Obrigações de licença e fontes de dados                 |

Mobile: bottom navigation com Hoje, Treinar, Partidas e "Mais".

## Alocação inicial do plano diário (~1100)

Táticas 35% · cálculo 20% · análise das próprias partidas 20% · finais 15% · aberturas 10%.

São heurísticas de produto, não constantes científicas. O planner abandona esses
pesos conforme dados reais aparecem.

Ordem de prioridade do plano:

1. revisões vencidas;
2. fraqueza recente vinda de partida real;
3. habilidade fraca e de alto valor;
4. cálculo;
5. currículo rotativo.

## Roadmap

Ver [`ROADMAP.md`](./ROADMAP.md). Uma fase por vez, sem começar a próxima sem instrução explícita.

## Estado atual

**Fases 0, 1 e 2 concluídas. Fases 4 e 5 com o domínio pronto e a UI pendente.**

O que já funciona:

- shell navegável com modo claro e escuro (sistema, claro ou escuro), tokens do
  guia de identidade visual e verificação automática de contraste WCAG AA;
- tabuleiro em `/games`: carrega PGN ou FEN, navega lance a lance por botão,
  teclado ou lista textual, gira, e aceita apenas lances legais;
- engine Stockfish 18 em Web Worker atrás de `EngineProvider`, com fila
  serializada, descarte de resposta obsoleta, cancelamento e restart por timeout
  — ainda sem tela que a use;
- persistência em IndexedDB atrás de `TrainingRepository`, agendamento FSRS e
  backup JSON — ainda sem tela que os use;
- modelo de habilidades e `buildDailyPlan` determinístico — ainda sem dashboard.

O que **não** existe ainda: puzzles, importação de partidas, análise de erro,
finais, aberturas, diagnóstico e as telas de treino.

Dívida registrada: o teste de contrato da engine roda contra um worker falso; a
versão com o Stockfish real precisa rodar em Playwright.
