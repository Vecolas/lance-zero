/**
 * A jornada de estudo de UMA ABERTURA: currículo, rodada de treino e cobertura.
 *
 * O QUE MORA AQUI: as nove etapas na ordem em que se aprende uma abertura, o
 * ciclo de uma rodada de treino sobre o grafo de repertório, a escolha do
 * próximo ramo a treinar e a leitura da cobertura exigida pelo treino final.
 *
 * O QUE NÃO MORA AQUI, e a separação é deliberada:
 *
 *   - a FORMA da jornada (etapas, cursor, retomada, os quatro níveis de
 *     conclusão) mora em `@/domain/jornada` e é compartilhada com Finais;
 *   - o GRAFO, a classificação de lance e o oponente de treino já moram em
 *     `@/domain/openings` e são reaproveitados inteiros — este módulo não
 *     reimplementa nenhum dos três;
 *   - REGRA DE FINAIS. Nada aqui é parametrizável para tablebase, e é de
 *     propósito: um trainer genérico com condicionais para os dois domínios é
 *     exatamente o desenho que a infraestrutura de jornada recusa.
 *
 * O DEFEITO CONTRA O QUAL ESTE ARQUIVO FOI ESCRITO: em `OpeningCourse` o teste
 * de fim de rodada era `!result.nextNodeId`, que é precisamente o caso FORA DO
 * REPERTÓRIO — o único caminho de erro era também o que gravava "atividade
 * concluída". Aqui uma rodada tem `desfecho` de primeira classe, e o único
 * caminho entre rodada e etapa é `registrarRodada`, que recusa rodada falha por
 * construção. Nenhuma função deste arquivo escreve em `alvosCobertos`.
 *
 * Tudo aqui é PURO: sem relógio, sem rede, sem persistência, sem `Math.random`
 * — o gerador aleatório entra por parâmetro para a mesma semente dar a mesma
 * partida.
 */

import { applyMove, identidadeDePosicao, parseUci, START_FEN } from '@/lib/chess'
import type { DesfechoDaRodada, StudyJourney, StudyStage } from '@/domain/jornada'
import {
  chooseOpeningTrainingOpponent,
  classifyOpeningAttempt,
  type OpeningAttemptResult,
  type OpeningDefinition,
  type OpeningMoveLesson,
  type OpeningProgress,
  type OpeningSide,
  type WeightedMove,
} from './index'

/* -------------------------------------------------------------------------- */
/* Números ajustáveis                                                          */
/* -------------------------------------------------------------------------- */

export interface ConfigDeTreinoDeAbertura {
  /**
   * Teto de profundidade de uma rodada, em plies.
   *
   * Existe para uma abertura longa não virar uma sessão de vinte minutos no
   * celular, e NÃO para definir "onde a abertura acaba" — isso é conteúdo.
   */
  plyMaximoDaRodada: number
  /**
   * Quantos plies a rodada precisa avançar além do nó onde começa.
   *
   * Sem isso, uma variação cuja raiz já está no fim da própria linha (o caso
   * real do Giuoco Piano, cuja linha é um prefixo da principal) nasceria com
   * alvo igual ao começo: rodada impossível de jogar e impossível de concluir.
   */
  plyMinimoAlemDaRaiz: number
  /** Quantos alvos recentes o anti-repetição lembra entre rodadas. */
  recentesLembrados: number
  /** Piso de itens da prática guiada, para uma abertura curta não virar uma tela só. */
  itensGuiadosMinimo: number
}

/**
 * Padrões do treino de abertura. NUNCA FORAM CALIBRADOS com dados de aluno —
 * são heurísticas de produto, e estão aqui em vez de espalhados pelo código
 * justamente para poderem mudar num lugar quando houver telemetria.
 *
 * POR QUE NÃO EXISTE UM "LIMITE DA ABERTURA" GLOBAL: a principal da Italiana
 * termina em 9 plies (no roque) e a da Eslava em 6. Um número fixo de 10 faria
 * a rodada da Eslava nunca alcançar o alvo — o aluno jogaria o repertório
 * inteiro e a rodada seguiria "ativa", ou pior, o lance seguinte sairia do
 * repertório e a rodada falharia por culpa do conteúdo. Um número fixo de 6
 * cortaria a Italiana antes do roque, que é a decisão que ela ensina. O limite
 * é derivado da linha treinada; o config só põe um teto e um piso relativo.
 */
export const ABERTURA_TREINO_CONFIG: ConfigDeTreinoDeAbertura = {
  plyMaximoDaRodada: 24,
  plyMinimoAlemDaRaiz: 2,
  recentesLembrados: 2,
  itensGuiadosMinimo: 3,
}

/* -------------------------------------------------------------------------- */
/* Alvos de cobertura                                                          */
/* -------------------------------------------------------------------------- */

/** A linha principal, treinada pelo lado da abertura. */
export const ALVO_MAINLINE = 'mainline'

/**
 * Jogar a mesma abertura pelo lado de lá.
 *
 * É um alvo e não uma etapa separada porque a prova de que o aluno entendeu a
 * abertura é conseguir defendê-la — e isso precisa entrar na COBERTURA do
 * treino final, não numa leitura que ele marca como vista.
 */
export const ALVO_PERSPECTIVA_REVERSA = 'perspectiva-reversa'

/**
 * Os alvos exigidos pelo treino final desta abertura.
 *
 * DERIVADOS, nunca cravados: quem acrescenta uma variação ao conteúdo passa a
 * ter de demonstrá-la, sem editar este arquivo. Uma lista fixa aqui seria a
 * segunda fonte da mesma verdade, e a que envelheceria primeiro.
 */
export function alvosDeTreinoFinal(opening: OpeningDefinition): string[] {
  const alvos = [ALVO_MAINLINE, ...opening.variations.map((variacao) => variacao.id)]
  const unicos = alvos.filter((alvo, indice) => alvos.indexOf(alvo) === indice)
  return [...unicos.filter((alvo) => alvo !== ALVO_PERSPECTIVA_REVERSA), ALVO_PERSPECTIVA_REVERSA]
}

/** O lado que o aluno joga num alvo. A perspectiva reversa inverte; o resto não. */
export function ladoDoAlvo(opening: OpeningDefinition, alvo: string): OpeningSide {
  if (alvo !== ALVO_PERSPECTIVA_REVERSA) return opening.side
  return opening.side === 'white' ? 'black' : 'white'
}

/* -------------------------------------------------------------------------- */
/* 1. O currículo: nove etapas                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Quantos itens tem a prática guiada.
 *
 * Derivado das DECISÕES do aluno na linha principal — os plies em que é a vez
 * dele — porque é isso que a prática guiada exercita. Um total fixo pediria
 * itens que o conteúdo não tem, e a etapa nunca fecharia.
 *
 * A paridade vem do ÍNDICE e não do campo `ply` autorado: a linha é normalizada
 * a partir da posição inicial, então o índice é o fato, e o campo autorado é
 * apenas uma anotação que ninguém valida.
 */
export function itensDePraticaGuiada(
  opening: OpeningDefinition,
  config: ConfigDeTreinoDeAbertura = ABERTURA_TREINO_CONFIG,
): number {
  const decisoes = opening.mainline.filter(
    (_lance, indice) => ladoDoIndice(indice) === opening.side,
  ).length
  return Math.max(config.itensGuiadosMinimo, decisoes)
}

function ladoDoIndice(indice: number): OpeningSide {
  return indice % 2 === 0 ? 'white' : 'black'
}

/**
 * As nove etapas de uma abertura, na ordem em que se aprende.
 *
 * A ORDEM É O PRODUTO. O aluno escolhe a abertura; a sequência é decisão nossa
 * — antes disso ele tinha de escolher entre "Visão geral", "Aprender",
 * "Variações", "Planos" e "Treinar" a cada volta ao menu, o que é pedir que ele
 * entenda a arquitetura da tela para aprender xadrez.
 *
 * `ehTreinoFinal` marca a última e é o que faz a jornada entrar em `em-treino`.
 * Só ela tem regra de COBERTURA, e cobertura é a única regra que reprova.
 */
export function construirJornadaDeAbertura(opening: OpeningDefinition): StudyStage[] {
  const lado = opening.side === 'white' ? 'brancas' : 'pretas'
  const ladoOposto = opening.side === 'white' ? 'pretas' : 'brancas'
  return [
    {
      id: 'visao',
      tipo: 'abertura:visao',
      titulo: 'Visão e objetivo',
      rotuloCurto: 'Visão',
      objetivo: `Saber o que a ${opening.name} busca e por que ela entra no seu repertório.`,
      regra: { tipo: 'leitura' },
    },
    {
      id: 'ideias',
      tipo: 'abertura:ideias',
      titulo: 'Ideias centrais',
      rotuloCurto: 'Ideias',
      objetivo: 'Reconhecer as ideias que se repetem antes de decorar qualquer lance.',
      regra: { tipo: 'leitura' },
    },
    {
      id: 'linha-principal',
      tipo: 'abertura:linha-principal',
      titulo: 'Linha principal',
      rotuloCurto: 'Linha',
      objetivo: `Percorrer a linha principal entendendo a razão de cada lance das ${lado}.`,
      regra: { tipo: 'leitura' },
    },
    {
      id: 'respostas',
      tipo: 'abertura:respostas',
      titulo: 'Melhores respostas do adversário',
      rotuloCurto: 'Respostas',
      objetivo: `Antecipar o que as ${ladoOposto} realmente jogam nesta posição.`,
      regra: { tipo: 'leitura' },
    },
    {
      id: 'variacoes',
      tipo: 'abertura:variacoes',
      titulo: 'Variações importantes',
      /*
        O OBJETIVO MUDOU JUNTO COM A PARTIÇÃO (ADR-0018). Ele dizia "saber o que
        muda quando o ADVERSÁRIO desvia da linha principal" — que é, palavra por
        palavra, a etapa anterior. Enquanto as duas etapas liam a mesma lista, a
        duplicação passava despercebida; separá-las tornou a frase falsa, e uma
        promessa falsa no cabeçalho é pior que uma etapa magra.
      */
      rotuloCurto: 'Variações',
      objetivo: 'Saber onde VOCÊ escolhe a linha, e o que cada escolha compromete.',
      regra: { tipo: 'leitura' },
    },
    {
      id: 'planos',
      tipo: 'abertura:planos',
      titulo: 'Planos e estruturas',
      rotuloCurto: 'Planos',
      objetivo: 'Ligar a estrutura de peões ao plano que ela autoriza.',
      regra: { tipo: 'leitura' },
    },
    {
      id: 'dois-lados',
      tipo: 'abertura:dois-lados',
      titulo: 'Jogar pelos dois lados',
      rotuloCurto: 'Dois lados',
      objetivo: `Entender a posição também pelo lado das ${ladoOposto}, que é quem vai enfrentá-la.`,
      regra: { tipo: 'leitura' },
    },
    {
      id: 'pratica-guiada',
      tipo: 'abertura:pratica-guiada',
      titulo: 'Prática guiada',
      rotuloCurto: 'Guiada',
      objetivo: 'Escolher os lances com ajuda disponível, antes de treinar sem rede.',
      regra: { tipo: 'itens', total: itensDePraticaGuiada(opening) },
    },
    {
      id: 'treino-final',
      tipo: 'abertura:treino-final',
      titulo: 'Treino final',
      rotuloCurto: 'Treino',
      objetivo: 'Demonstrar a linha principal, cada variação estudada e o lado oposto.',
      regra: { tipo: 'cobertura', alvosExigidos: alvosDeTreinoFinal(opening) },
      ehTreinoFinal: true,
    },
  ]
}

/** O id da etapa de treino final. Um lugar só, para a tela não redigitar a string. */
export const ETAPA_DE_TREINO_DE_ABERTURA = 'treino-final'

/* -------------------------------------------------------------------------- */
/* 2. A rodada de treino                                                       */
/* -------------------------------------------------------------------------- */

/** Por que a rodada acabou mal. Só existem duas razões, e elas dizem coisas diferentes. */
export type MotivoDeFalhaNaAbertura = 'out_of_repertoire' | 'illegal'

export interface OpeningTrainingRound {
  /** Nomeia O QUE a rodada treina, não quando: derivado, para continuar puro. */
  id: string
  openingId: string
  /** O alvo de cobertura que esta rodada tenta cobrir. */
  branchScopeId: string
  startFen: string
  startNodeId: string
  userSide: OpeningSide
  /** Profundidade em que a rodada termina em sucesso. Derivada da linha treinada. */
  targetPly: number
  currentNodeId: string
  currentFen: string
  ply: number
  desfecho: DesfechoDaRodada
  failureReason?: MotivoDeFalhaNaAbertura
  playedMoves: string[]
}

interface RaizDoAlvo {
  nodeId: string
  fen: string
  ply: number
}

/**
 * Onde a rodada de um alvo começa.
 *
 * A variação começa no NÓ EM QUE ELA DIVERGE, e não na posição inicial: repetir
 * o prefixo compartilhado a cada rodada é o que faz o aluno parar de treinar
 * variação. Mainline e perspectiva reversa começam na raiz, porque é a linha
 * inteira que está sendo demonstrada.
 *
 * A profundidade é RECONTADA jogando a linha, e não lida de `node.ply`: o campo
 * é autorado e nada o valida, e uma profundidade errada aqui produziria um alvo
 * inalcançável — falha silenciosa, não erro.
 */
function raizDoAlvo(opening: OpeningDefinition, alvo: string): RaizDoAlvo {
  const raiz: RaizDoAlvo = {
    nodeId: opening.rootNodeId,
    fen: opening.rootFen,
    ply: 0,
  }
  const variacao = opening.variations.find((candidata) => candidata.id === alvo)
  if (!variacao) return raiz

  let fen = START_FEN
  for (let indice = 0; indice < variacao.line.length; indice += 1) {
    const lance = variacao.line[indice]
    if (!lance) break
    const aplicado = applyMove(fen, lance.san)
    if (!aplicado) break
    fen = aplicado.fenAfter
    if (identidadeDePosicao(fen) === variacao.rootNodeId) {
      return { nodeId: variacao.rootNodeId, fen, ply: indice + 1 }
    }
  }
  return raiz
}

/** Quantos plies a linha do alvo ensina. É daqui que sai o limite da rodada. */
function profundidadeDoAlvo(opening: OpeningDefinition, alvo: string): number {
  const variacao = opening.variations.find((candidata) => candidata.id === alvo)
  const linha: readonly OpeningMoveLesson[] = variacao?.line ?? opening.mainline
  return linha.length
}

/** O limite desta rodada. Ver `ABERTURA_TREINO_CONFIG` para por que não é global. */
export function plyAlvoDaRodada(
  opening: OpeningDefinition,
  alvo: string,
  config: ConfigDeTreinoDeAbertura = ABERTURA_TREINO_CONFIG,
): number {
  const raiz = raizDoAlvo(opening, alvo)
  const piso = raiz.ply + config.plyMinimoAlemDaRaiz
  const desejado = Math.max(profundidadeDoAlvo(opening, alvo), piso)
  return Math.min(desejado, Math.max(config.plyMaximoDaRodada, piso))
}

/**
 * Abre uma rodada ATIVA.
 *
 * Nasce em `ativa` e não em algum `done: false`: "ativa" é um desfecho nomeado,
 * e é o que impede o resto do código de tratar "ainda não terminou" e
 * "terminou mal" como o mesmo caso falso.
 */
export function iniciarRodadaDeAbertura(
  opening: OpeningDefinition,
  alvo: string,
  userSide: OpeningSide,
  config: ConfigDeTreinoDeAbertura = ABERTURA_TREINO_CONFIG,
): OpeningTrainingRound {
  const raiz = raizDoAlvo(opening, alvo)
  return {
    id: `${opening.id}:${alvo}:${userSide}`,
    openingId: opening.id,
    branchScopeId: alvo,
    startFen: raiz.fen,
    startNodeId: raiz.nodeId,
    userSide,
    targetPly: plyAlvoDaRodada(opening, alvo, config),
    currentNodeId: raiz.nodeId,
    currentFen: raiz.fen,
    ply: raiz.ply,
    desfecho: 'ativa',
    playedMoves: [],
  }
}

export interface LanceNaRodada {
  round: OpeningTrainingRound
  /**
   * `null` quando nada foi avaliado — a rodada já tinha terminado.
   *
   * Preferimos `null` a devolver uma classificação inventada: um veredito falso
   * sobre um lance que nem chegou a ser julgado é pior que a ausência dele.
   */
  resultado: OpeningAttemptResult | null
  /** O lance entrou na linha? Falso tanto para ilegal quanto para fora do repertório. */
  aceito: boolean
}

/**
 * O aluno joga.
 *
 * A ORDEM DAS PORTAS IMPORTA e está escrita aqui de propósito:
 *
 *   1. rodada já encerrada  → nada acontece, e nada é julgado;
 *   2. lance ilegal         → falha com motivo `illegal`;
 *   3. fora do repertório   → falha com motivo `out_of_repertoire`;
 *   4. lance do repertório  → avança.
 *
 * Os dois motivos existem separados porque a tela diz coisas diferentes: "esse
 * lance não é legal aqui" e "esse lance é jogável, mas sai do repertório" são
 * afirmações distintas, e colapsá-las num motivo só tornaria uma das duas
 * mentira. O que elas têm em comum é o que importa: NENHUMA delas avança
 * cobertura, porque nenhuma delas produz `desfecho: 'sucesso'`.
 *
 * O computador NÃO responde aqui. A resposta é `respostaDoComputador` mais
 * `aplicarRespostaDoComputador`, porque escolher e aplicar num passo só
 * obrigaria esta função a receber progresso e gerador aleatório para decidir
 * sobre o lance do ALUNO — e um lance do aluno não depende de sorteio.
 */
export function jogarNaRodada(
  opening: OpeningDefinition,
  round: OpeningTrainingRound,
  uci: string,
): LanceNaRodada {
  if (round.desfecho !== 'ativa') return { round, resultado: null, aceito: false }

  const lance = parseUci(uci)
  const aplicado = lance
    ? applyMove(round.currentFen, {
        from: lance.from,
        to: lance.to,
        ...(lance.promotion ? { promotion: lance.promotion } : {}),
      })
    : null
  if (!aplicado) {
    return {
      round: {
        ...round,
        desfecho: 'falhou',
        failureReason: 'illegal',
      },
      resultado: {
        classification: 'out_of_repertoire',
        message: 'Esse lance não é legal nesta posição.',
        nextNodeId: null,
      },
      aceito: false,
    }
  }

  const resultado = classifyOpeningAttempt(opening, round.currentNodeId, aplicado.move.uci)
  if (resultado.classification === 'out_of_repertoire' || resultado.nextNodeId === null) {
    return {
      round: {
        ...round,
        desfecho: 'falhou',
        failureReason: 'out_of_repertoire',
      },
      resultado,
      aceito: false,
    }
  }

  return {
    round: avancar(opening, round, aplicado.move.uci, aplicado.fenAfter),
    resultado,
    aceito: true,
  }
}

/**
 * Avança a rodada um ply.
 *
 * O id do nó vem da IDENTIDADE da posição alcançada, não do `nextNodeId` da
 * classificação — são o mesmo valor quando tudo está certo, e derivar do
 * tabuleiro é o que faz TRANSPOSIÇÃO funcionar de graça: chegar por outra ordem
 * de lances ao mesmo FEN cai no mesmo nó do repertório.
 *
 * O FEN guardado é o REAL da partida, e não o `fen` do nó: o nó guarda o FEN da
 * primeira linha que o criou, com os contadores daquela linha. Para abertura os
 * contadores não mudam nada, e é por isso mesmo que não vale a pena carregar um
 * valor levemente errado adiante.
 */
function avancar(
  opening: OpeningDefinition,
  round: OpeningTrainingRound,
  uci: string,
  fenDepois: string,
): OpeningTrainingRound {
  const nodeId = identidadeDePosicao(fenDepois)
  const ply = round.ply + 1
  const semContinuacao = (opening.graph.get(nodeId)?.outgoingMoves.length ?? 0) === 0
  return {
    ...round,
    currentNodeId: nodeId,
    currentFen: fenDepois,
    ply,
    playedMoves: [...round.playedMoves, uci],
    // Chegar ao alvo é sucesso. Acabar o repertório antes do alvo TAMBÉM é:
    // todos os lances do aluno estavam na linha e o conteúdo terminou. Isso não
    // é erro virando sucesso — um erro já teria fixado `falhou` antes daqui, e
    // esta função nunca é chamada sobre uma rodada encerrada.
    desfecho: ply >= round.targetPly || semContinuacao ? 'sucesso' : 'ativa',
  }
}

/** A linha que um alvo ensina. Reversa treina a mesma linha, só que do outro lado. */
function linhaDoAlvo(opening: OpeningDefinition, alvo: string): readonly OpeningMoveLesson[] {
  const variacao = opening.variations.find((candidata) => candidata.id === alvo)
  return variacao?.line ?? opening.mainline
}

/**
 * O lance que mantém a rodada DENTRO do ramo que ela diz treinar.
 *
 * Sem isto, uma rodada com `branchScopeId` da Defesa dos Dois Cavalos podia ver
 * o computador sortear o lance da linha principal — a rodada terminaria em
 * sucesso e marcaria como coberta uma variação que o aluno não jogou. Cobertura
 * que mede outra coisa é pior que cobertura nenhuma: ela fecha a etapa.
 *
 * Só vale enquanto a posição continua sobre a linha do alvo. Se o aluno desviou
 * por um lance aceitável de outro ramo, o oponente volta a ser o sorteado —
 * forçar a linha de um ramo que já não está no tabuleiro seria inventar lance.
 */
function lanceDirigidoDoRamo(
  opening: OpeningDefinition,
  round: OpeningTrainingRound,
): WeightedMove | null {
  const linha = linhaDoAlvo(opening, round.branchScopeId)
  const proximo = linha[round.ply]
  if (!proximo) return null

  let fen = START_FEN
  for (let indice = 0; indice < round.ply; indice += 1) {
    const lance = linha[indice]
    if (!lance) return null
    const aplicado = applyMove(fen, lance.san)
    if (!aplicado) return null
    fen = aplicado.fenAfter
  }
  if (identidadeDePosicao(fen) !== round.currentNodeId) return null

  const aplicado = applyMove(round.currentFen, proximo.san)
  if (!aplicado) return null
  return {
    uci: aplicado.move.uci,
    san: aplicado.move.san,
    weight: 1,
    nextNodeId: identidadeDePosicao(aplicado.fenAfter),
  }
}

/**
 * O lance do computador.
 *
 * Só ESCOLHE. Fora do ramo dirigido, reaproveita `chooseOpeningTrainingOpponent`
 * inteiro: o oponente do treino já sabe pesar frequência, nó aprendido e nó
 * fraco, e reescrever isso aqui criaria dois oponentes que divergiriam.
 *
 * Devolve `null` quando não é a vez do computador. A guarda existe porque um
 * chamador que peça a resposta fora de hora receberia um lance legal do LADO DO
 * ALUNO, e a rodada avançaria dois plies sem o aluno ter jogado — um erro que
 * não gera exceção nenhuma e some no meio da sessão.
 */
export function respostaDoComputador(
  opening: OpeningDefinition,
  round: OpeningTrainingRound,
  progress: OpeningProgress,
  rng: () => number,
): WeightedMove | null {
  if (round.desfecho !== 'ativa') return null
  if (vezDe(round.currentFen) === round.userSide) return null
  return (
    lanceDirigidoDoRamo(opening, round) ??
    chooseOpeningTrainingOpponent(opening, round.currentNodeId, progress, rng)
  )
}

/** De quem é a vez, lido do FEN. Uma fonte só: o tabuleiro. */
export function vezDe(fen: string): OpeningSide {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white'
}

/**
 * Aplica a resposta escolhida.
 *
 * Aceita `null` porque "o repertório não tem continuação" é um desfecho
 * legítimo e não um erro: o aluno jogou tudo o que existe para jogar, e a
 * rodada fecha em sucesso. Silenciar esse caso deixaria a rodada presa em
 * `ativa` para sempre, esperando um lance que ninguém pode dar.
 */
export function aplicarRespostaDoComputador(
  opening: OpeningDefinition,
  round: OpeningTrainingRound,
  resposta: WeightedMove | null,
): OpeningTrainingRound {
  if (round.desfecho !== 'ativa') return round
  if (!resposta) return { ...round, desfecho: 'sucesso' }

  const lance = parseUci(resposta.uci)
  const aplicado = lance
    ? applyMove(round.currentFen, {
        from: lance.from,
        to: lance.to,
        ...(lance.promotion ? { promotion: lance.promotion } : {}),
      })
    : null
  // Lance ilegal vindo do GRAFO é defeito de conteúdo, não do aluno: a rodada
  // não pode punir quem não errou, então ela encerra em sucesso no ponto em que
  // chegou. O portão que pega conteúdo torto é `validateOpeningDefinition`.
  if (!aplicado) return { ...round, desfecho: 'sucesso' }

  return avancar(opening, round, aplicado.move.uci, aplicado.fenAfter)
}

/* -------------------------------------------------------------------------- */
/* 3. Seleção de ramo entre rodadas                                            */
/* -------------------------------------------------------------------------- */

/**
 * Qual ramo treinar agora.
 *
 * DUAS PRIORIDADES, e a ordem entre elas é a regra inteira:
 *
 *   1. alvo ainda NÃO coberto vence sempre;
 *   2. dentro da mesma prioridade, evita os recentes.
 *
 * A ordem não se inverte. Escolher um alvo já coberto só para não repetir seria
 * trocar o que falta aprender por variedade — o aluno terminaria a sessão com a
 * sensação de ter treinado e a mesma variação B em aberto.
 *
 * `rng` é obrigatório, sem padrão `Math.random`: uma seleção que sorteia
 * sozinha não é testável, e o determinismo desta função é o que permite
 * reproduzir uma sessão inteira a partir de uma semente.
 */
export function proximoAlvoDeCobertura(
  alvosExigidos: readonly string[],
  alvosCobertos: readonly string[],
  recentes: readonly string[],
  rng: () => number,
): string {
  if (alvosExigidos.length === 0) return ''

  const cobertos = new Set(alvosCobertos)
  const pendentes = alvosExigidos.filter((alvo) => !cobertos.has(alvo))
  const prioridade = pendentes.length > 0 ? pendentes : [...alvosExigidos]

  const recenteSet = new Set(recentes)
  const semRepetir = prioridade.filter((alvo) => !recenteSet.has(alvo))
  const candidatos = semRepetir.length > 0 ? semRepetir : prioridade

  const sorteio = Math.min(Math.max(rng(), 0), 0.999999)
  const indice = Math.floor(sorteio * candidatos.length)
  return candidatos[Math.min(indice, candidatos.length - 1)] ?? candidatos[0] ?? ''
}

/**
 * Anota o alvo recém-treinado na janela de anti-repetição.
 *
 * A janela mora no config e não num `slice(-2)` solto: o tamanho é uma
 * heurística, e heurística espalhada pelo código é heurística que ninguém
 * consegue recalibrar.
 */
export function registrarAlvoRecente(
  recentes: readonly string[],
  alvo: string,
  config: ConfigDeTreinoDeAbertura = ABERTURA_TREINO_CONFIG,
): string[] {
  if (config.recentesLembrados <= 0) return []
  return [...recentes, alvo].slice(-config.recentesLembrados)
}

/* -------------------------------------------------------------------------- */
/* 4. Leitura da cobertura                                                     */
/* -------------------------------------------------------------------------- */

export interface OpeningCoverageTracker {
  exigidos: string[]
  cobertos: string[]
  faltando: string[]
  completa: boolean
}

/**
 * O que falta para o treino final fechar.
 *
 * LEITURA PURA do estado da jornada — não escreve nada, e é assim que tem de
 * ser: quem escreve em `alvosCobertos` é `registrarRodada`, e só ela, porque é
 * lá que mora a recusa a rodada falha. Uma segunda função capaz de marcar
 * cobertura seria um segundo caminho para o bug original voltar.
 *
 * Considera apenas os alvos EXIGIDOS: um alvo coberto que a etapa não pede (um
 * resto de uma versão anterior do conteúdo, por exemplo) não conta como
 * progresso nem é reportado como falta.
 */
export function coberturaDaAbertura(
  jornada: StudyJourney,
  stageId: string,
  alvosExigidos: readonly string[],
): OpeningCoverageTracker {
  const cobertosNaEtapa = new Set(jornada.alvosCobertos[stageId] ?? [])
  const exigidos = [...alvosExigidos]
  const cobertos = exigidos.filter((alvo) => cobertosNaEtapa.has(alvo))
  const faltando = exigidos.filter((alvo) => !cobertosNaEtapa.has(alvo))
  return {
    exigidos,
    cobertos,
    faltando,
    completa: exigidos.length > 0 && faltando.length === 0,
  }
}
