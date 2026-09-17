# ADR-0017 — Uma etapa só cobra o que a tela oferece

- **Estado:** aceito
- **Data:** 2026-09-17
- **Relacionado:** ADR-0011 (estágio antes da cobrança), ADR-0016 (uma etapa por vez)

## Contexto

Abrir qualquer final em `/finais/<slug>` e clicar uma vez em "Continuar" deixava
o aluno preso na **etapa 2 de 10**. O botão nascia desabilitado, a tela escrevia
_"Faltam 1 de 1 exercícios para seguir."_ — e não havia nada para responder.

`src/domain/endgames/jornada.ts` declarava quatro etapas com
`regra: { tipo: 'itens', total: N }`. A tela renderizava exercício em **uma**
delas:

| etapa            | `total` | a tela oferecia                               |
| ---------------- | ------- | --------------------------------------------- |
| `reconhecer`     | 1       | dois parágrafos e um tabuleiro estático       |
| `variacoes`      | 1       | uma grade de tabuleiros `interactive={false}` |
| `dois-lados`     | 1 ou 2  | um parágrafo                                  |
| `pratica-guiada` | 1       | o único `registrarItem` do arquivo            |

`etapaCumprida` lê `itensRespondidos[stage.id]`, que ninguém escrevia para as
três primeiras. `StudyJourneyShell` desabilitava o botão e `concluirEtapa`
recusava avançar por dentro — duas travas, nenhuma saída. Os **vinte** finais do
catálogo estavam nesse estado.

**Nada errava.** Sem exceção, sem log, sem tela branca, sem tipo errado: uma
porta trancada por dentro tem exatamente a aparência de uma porta. E os portões
existentes ficaram verdes por construção — `tests/e2e/jornadas.spec.ts`
percorria a jornada com `if (await continuar.isDisabled()) break`, isto é,
**desistia no beco**; e `jornada-etapa-unica.spec.ts` parava de clicar assim que
o painel de instrução aparecia, que é justamente em `reconhecer`.

A causa raiz não é nenhuma das três etapas. É que **a regra de conclusão e o que
a tela desenha eram duas fontes da mesma verdade, e nada as amarrava.** A mesma
forma existia do lado das Aberturas (`Math.max(itensGuiadosMinimo, decisoes)`),
onde ainda não mordia porque nenhuma abertura do catálogo é curta o bastante.

## Decisão

### 1. A regra de itens NASCE da contagem dos itens que existem

`src/domain/jornada/exigencia.ts` acrescenta `regraDeItens(itens)`. Ela recebe a
**lista**, nunca um número — quem chama não tem onde enfiar um piso.

Cada domínio ganha a função que produz essa lista, e ela é a **fonte única do
contrato**: a jornada conta o que ela devolve, a tela desenha o que ela devolve.

- finais: `itensDaEtapaDeFinal(etapa, conteudo)` (`src/domain/endgames/itens-da-etapa.ts`);
- aberturas: `itensDaPraticaGuiadaDeAbertura(opening)` (`src/domain/openings/itens-da-etapa.ts`).

**Lista vazia vira `{ tipo: 'leitura' }`**, e não `{ tipo: 'itens', total: 0 }`.
Zero de zero passaria por acidente, e descreveria a etapa errado para o Mapa do
estudo e para a frase do "Continuar" travado.

### 2. Os pisos foram apagados, não recalibrados

Saíram `itensDeReconhecimentoPadrao`, `variacoesMinimas` e `ladosMinimos` de
`JORNADA_DE_FINAL_CONFIG`, e `itensGuiadosMinimo` de `ABERTURA_TREINO_CONFIG`.

`Math.max(conteúdo, PISO)` é **a assinatura deste defeito**: o piso promete o que
o conteúdo pode não ter. Número ajustável só faz sentido quando existe régua para
ajustá-lo; aqui o número certo é sempre "quantos o conteúdo tem", e isso se
conta, não se configura.

`posicoesMinimasParaTransferencia: 2` **fica**. Ele não é piso de cobrança: é
teto de quantas posições o treino exige, e conteúdo que não o alcança é
**recusado** por `problemasDoConteudoDeFinal` em vez de virar etapa impossível.

### 3. Um ponto único renderiza itens

`EtapaDeEstudo`, em `EndgameStudyJourney.tsx`, tem UMA condição:

```tsx
if (stage.regra.tipo !== 'itens') return prosa
return <ItensDaEtapaDeFinal … >{prosa}</ItensDaEtapaDeFinal>
```

Antes, cada `case` do `switch` decidia sozinho se desenhava exercício. Agora "a
regra diz itens" **implica** "o exercício aparece", por construção — etapa nova
não tem como escapar da condição.

### 4. As etapas que não tinham exercício ganharam um, derivado do conteúdo

`variacoes`, `dois-lados` e `pratica-guiada` passam a pedir **um lance no
tabuleiro**, um item por posição / por lado / com dica.

Não é um quiz gerado, e a escolha é pedagógica: distrator inventado por máquina
ensina errado, e o catálogo já repete a **mesma** pergunta de reconhecimento nos
vinte finais. Jogar um lance é prática de verdade, não depende de copy nova por
final, e honra a regra que a jornada de finais existe para afirmar — em final não
existe "fora do repertório". Como a regra da etapa é `itens`, **responder**
conclui; errar comenta e não reprova.

### 5. O tabuleiro publica a posição

`ChessBoardView` ganhou `data-fen` ao lado do `data-testid` que já tinha. Um
portão que precisa jogar um lance tem de saber que posição está na tela; sem
isso, o e2e só conseguia descobrir o lance por força bruta — e um portão que leva
trinta segundos para achar um clique é um portão que alguém desliga. A
alternativa (cravar o UCI no teste) amarraria o portão a uma FEN do catálogo, e
ele reprovaria quando o **conteúdo** mudasse.

## O que NÃO muda

- **`concluirEtapa` continua recusando** etapa cuja regra não foi cumprida, e
  `jornadaConcluida` continua exigindo a regra de cada etapa, inclusive a
  cobertura do treino. Nada aqui afrouxa conclusão: o conserto foi tornar a
  cobrança **possível**, não menor.
- **Só o treino final reprova.** As quatro etapas de itens concluem por
  responder, certo ou errado (ADR-0011: "concluir não é dominar").
- **O modo referência continua sem registrar nada** — ele recebe só a prosa, para
  não existir um segundo caminho até `registrarItem`.
- A casca, o Mapa do estudo e "uma etapa por vez" do ADR-0016 seguem iguais.

## Portões

- `tests/unit/jornada-exige-o-que-a-tela-oferece.test.ts` — varre
  `ENDGAME_DEFINITIONS` e `OPENING_COURSES`, monta o conteúdo pelo **mesmo**
  caminho da página (`conteudoDoFinal`) e exige que nenhuma etapa cobre o que a
  lista não oferece. Tem canário (quatro formas de defeito que ele **precisa**
  acusar, mais um caso que ele precisa aprovar) e lista de dívida declarada que
  morde dos dois lados.
- `tests/unit/endgames-jornada-tela.test.tsx` — monta a jornada em React e exige
  que toda etapa de itens tenha controle habilitado e que usá-lo grave o item.
- `tests/e2e/jornada-sem-beco.spec.ts` — percorre `/finais/atividade-do-rei` e
  `/aberturas/italiana` etapa por etapa: onde o "Continuar" está travado, ele
  **responde** e exige que a porta abra.
- `tests/e2e/jornadas.spec.ts` — o `break` silencioso virou asserção.

**Prova de que o portão morde:** rodado contra o `HEAD` de `main` num worktree
descartável, o portão reprovou **20 de 20** finais, nomeando `reconhecer`,
`variacoes` e `dois-lados`. Portão que nasce verde não provou nada.

## Custos e pontos cegos declarados

- **O exercício novo é genérico.** "Jogue o primeiro lance" vale para qualquer
  final, e é por isso que não precisa de texto por final — mas também é por isso
  que ele não ensina nada específico. A biblioteca de variações de verdade
  continua sendo a dívida que o ADR-0016 já declarou.
- **Sem juiz, o lance não é avaliado.** Estas etapas conferem legalidade e leem
  mate/afogamento localmente; comparação de técnica é do treino final. A tela diz
  isso ao aluno em vez de fingir um veredito.
- **O treino final continua sem terminar.** `/finais/[slug]` não passa `julgar`,
  então a rodada nunca alcança `sucesso` e a cobertura nunca fecha. Este ADR
  **não** conserta isso — é a entrega seguinte, com issue própria.
  RESOLVIDO PELO ADR-0018, que ligou o juiz e, no caminho, descobriu que
  dezessete das quarenta e uma posições de treino declaravam um resultado que a
  tablebase desmente.
- **`CompletionRule` do planner não está coberto.** `planner-v2.ts` ainda crava
  `{ tipo: 'itens', total: 4 }` para atividades que apontam para telas
  arbitrárias: mesma classe de defeito, outro subsistema, issue própria.
- **A jornada de finais fala PT mesmo em EN.** A prosa das etapas está embutida
  no TSX e os textos novos seguiram o padrão do arquivo. `i18n.test.ts` só confere
  paridade de chaves, então não acusa.
- **Colisão de número:** o worktree `.claude/worktrees/jornadas-aberturas-e-finais`
  (não mergeado) também usa o 0017. Como o índice proíbe buraco na numeração, uma
  branch saída de `main` é obrigada a usá-lo. Quem mergear depois renumera.
