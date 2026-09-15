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

0. **Ensinar antes de cobrar.** O app nunca pede como conhecimento adquirido algo
   que ele não ensinou. Única exceção: o diagnóstico, que se declara como tal.
   Está no código como estágio por habilidade, não como intenção — ver ADR-0011.
1. **Plano do dia primeiro.** A home de quem já usa é "Treino de hoje", não um
   menu — e é uma LISTA de atividades independentes, feita em qualquer ordem,
   sem botão global de "começar". O que você conclui fica marcado.
2. **O usuário pensa antes da engine.** A revisão de partida começa com a engine escondida.
3. **Erro vira treino futuro.** Um erro relevante gera card de revisão e sobe a prioridade da habilidade.
4. **Habilidades, não só puzzles.** Toda tentativa atualiza um modelo de habilidades.
   E **concluir não é dominar**: terminar uma atividade nunca depende de acertar.
5. **Recuperação antes de explicação.** No modo misto, o tema não é revelado antes da resposta.
6. **Revisão espaçada.** FSRS para posições, erros, finais, conceitos e nós de repertório.
7. **A ajuda desaparece.** Exemplos resolvidos e dicas nas primeiras exposições; depois, nada.
8. **Sem falsa precisão.** WDL do Stockfish nunca é apresentado como chance humana de vitória.
9. **Local-first.** Treino, PGNs e análise funcionam sem conta.
10. **Núcleo gratuito.** Nenhum serviço pago é obrigatório.

## Superfícies

| Rota                     | Nome PT-BR     | Fase | Papel                                                   |
| ------------------------ | -------------- | ---- | ------------------------------------------------------- |
| `/`                      | Landing        | 0    | Explica o ciclo e leva ao primeiro treino               |
| `/onboarding`            | Diagnóstico    | 10   | 12–20 posições, estimativa inicial, primeira semana     |
| `/dashboard`             | Treino de hoje | 5    | Home local; atividades independentes, qualquer ordem, ✓ |
| `/train`                 | Treinar        | 5    | Hub: Aprender, Praticar, Revisar, Currículo, Partidas   |
| `/train/revisao`         | Revisar        | 5    | A fila de revisão espaçada, com endereço próprio        |
| `/train/pratica/[skill]` | Praticar       | 5    | Prática da habilidade, no degrau em que ela está        |
| `/lessons/[skill]`       | Lição          | 10   | As nove etapas, com a ajuda desvanecendo                |
| `/puzzles`               | Puzzles        | 3    | Táticas com dicas graduais                              |
| `/calculate`             | Cálculo        | 4    | Xeques, capturas, ameaças; candidatos; visualização     |
| `/games`                 | Partidas       | 6    | Importação, revisão humana, depois engine               |
| `/openings`              | Aberturas      | 9    | Princípios + repertório enxuto + explorer               |
| `/endgames`              | Finais         | 8    | Currículo básico + tablebase                            |
| `/lessons`               | Biblioteca     | 10   | 30–40 microlições                                       |
| `/progress`              | Progresso      | 5    | Forças, prioridades, retenção                           |
| `/settings`              | Ajustes        | 4    | Backup, orçamento de engine, preferências               |
| `/licenses`              | Licenças       | 0    | Obrigações de licença e fontes de dados                 |

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

**Fases 0 a 10 concluídas. A Fase 11 está em andamento, com os portões de
qualidade, acessibilidade e segurança ativos; o shell PWA e as rotas públicas
funcionam offline, mas o beta ainda é pendente.**

O ciclo central já fecha de ponta a ponta e tem teste e2e provando:

> errar um puzzle → virar card de revisão → reaparecer em `/train` na hora certa

O que funciona hoje:

- `/dashboard` monta o treino do dia como uma LISTA de atividades independentes,
  cada uma com o motivo de estar ali, feita em qualquer ordem, com ✓ persistente
  e sem botão global de "começar";
- `/lessons/[skill]` ensina em nove etapas com a ajuda desvanecendo, e é isso que
  o plano oferece a quem nunca viu o conceito — em vez de perguntar o melhor lance;
- `/puzzles` treina táticas sem revelar o tema antes da resposta, com dicas
  graduais e a explicação só depois;
- `/train` é um hub (Aprender, Praticar, Revisar, Currículo, Partidas): abrir a
  aba não dispara mais um exercício;
- `/train/revisao` roda as revisões espaçadas com FSRS e move o modelo de habilidades;
- `/train/pratica/[skill]` só cobra sem apoio o que já foi ensinado; quando não
  foi, manda aprender e diz por quê;
- `/games` importa partidas por PGN, Lichess ou Chess.com, sem duplicar, e
  `/games/[id]` executa os dois passes da revisão: primeiro o usuário marca onde
  acha que a partida mudou e escreve o porquê; depois a engine confirma ou corrige
  essa leitura e transforma erros relevantes em treino futuro;
- `/calculate` treina a rotina de xeques e capturas, com conferência exata;
- `/progress` mostra o resumo real dos últimos sete dias, forças, prioridades e retenção — e
  admite quando não há o que medir;
- `/settings` exporta e importa backup JSON;
- modo claro e escuro em todas as telas.

O núcleo das Fases 0 a 10 está disponível em tela e no domínio. A próxima frente
é a qualidade de lançamento da Fase 11: medição de performance e fechamento dos
últimos portões de produção.

### Dívidas registradas

- **o catálogo de lições cobre 12 das 22 habilidades.** Como a prática sai do
  catálogo — que é conteúdo verificado pelo portão —, as outras 10 ainda não têm
  prática: elas caem num estado vazio que diz a verdade, em vez de oferecer um
  exercício não conferido;
- o diagnóstico "Já conheço" agora testa posições distribuídas e permite pular a
  repetição da aula básica; as posições não reconhecidas continuam disponíveis
  para aprender;
- o feedback do treino usa a explicação da edge quando ela existe e trata bons
  desvios como jogáveis, sem transformar saída de repertório em blunder;
- a revisão FSRS de abertura só nasce para nodes ensinados, e erros em partida
  real só criam reforço para nodes já aprendidos;
- o conjunto de puzzles é um punhado gerado e verificado por nós, não o dump do Lichess;
- o contrato do Opening Explorer real permanece limitado pela autorização do serviço;
- páginas dinâmicas de partidas entram no cache quando visitadas; elas não são
  pré-cacheadas porque dependem do identificador e dos dados locais do aluno.
