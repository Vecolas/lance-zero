/**
 * A jornada de estudo de UM FINAL: as dez etapas, a rodada de treino e a
 * política de lance prático do computador.
 *
 * O QUE MORA AQUI: a REGRA DE DOMÍNIO dos finais — como se monta a sequência de
 * etapas, o que conta como acerto num lance de final, quando uma rodada morre, e
 * como o computador escolhe entre lances que preservam o resultado.
 *
 * O QUE NÃO MORA AQUI: a FORMA da jornada (etapas em ordem, retomada, progresso,
 * os quatro níveis de conclusão) — isso é `@/domain/jornada`, compartilhado com
 * Aberturas; a comparação de WDL/DTM — isso é `julgarLanceDeFinal`; a avaliação
 * do objetivo — isso é `avaliarObjetivo`; e nenhuma tela.
 *
 * A DIFERENÇA QUE ESTE ARQUIVO EXISTE PARA AFIRMAR, e ela é a fronteira contra o
 * `GenericChessTrainer`: EM FINAIS NÃO EXISTE "FORA DO REPERTÓRIO".
 *
 * Em abertura, sair da linha estudada É o erro — a linha é o conteúdo. Em final,
 * a linha modelo é UM caminho, não O caminho: o mate de torre tem dezenas de
 * ordens de lances que ganham, e o aluno que acha outra técnica correta acertou.
 * Reprovar o lance "diferente do exemplo" ensinaria a decorar a FEN, que é o
 * oposto exato do que um final treina.
 *
 * Por isso a regra de aceitação é NEGATIVA: aceita-se tudo que preserva o
 * objetivo, e só se reprova o que o perde de forma objetiva (vitória virou
 * empate, empate virou derrota) ou o que joga fora um alvo técnico declarado
 * pela lição. Lance que mantém o resultado por um caminho mais longo é ACEITO e
 * COMENTADO — nunca reprovado. É o degrau `mantem-mas-e-pior` de
 * `julgamento.ts`, e ele não é erro.
 *
 * A TRAVA QUE ATRAVESSA TUDO: uma rodada pode terminar em ERRO sem que a etapa
 * ou a jornada concluam. Quem grava o resultado de uma rodada aqui é
 * `registrarRodadaDeFinal`, que só sabe chamar `registrarRodada` de
 * `@/domain/jornada` — e aquela recusa rodada falha por construção. Não existe
 * neste arquivo um caminho que escreva em `alvosCobertos` por fora dela.
 *
 * PUREZA: nada aqui chama relógio, rede, tablebase ou engine. O veredito sobre o
 * lance CHEGA POR PARÂMETRO (`VereditoDeLanceDeFinal`), montado por quem tem o
 * IO na mão. É o que deixa a rodada testável sem WASM e sem rede, e o que impede
 * este arquivo de virar o lugar onde alguém "só dá uma consultadinha" na
 * Lichess.
 */

import { normalizeUci } from '@/lib/chess'
import {
  etapaCumprida,
  registrarRodada,
  rodadaTerminou,
  type DesfechoDaRodada,
  type StudyJourney,
  type StudyStage,
} from '@/domain/jornada'
import type { EndgameDefinition, EndgameLessonStep, EndgamePosition } from './catalogo'
import type { JulgamentoDoLance } from './julgamento'
import type { ResultadoObjetivo } from './objetivo'

// ------------------------------------------------------------------ os papéis

/**
 * Quem o ALUNO é na rodada.
 *
 * Dois valores e nunca um terceiro: "quem tenta ganhar" e "quem tenta segurar".
 * O papel decide o que é progresso e o que é resistência, e por isso é dado da
 * rodada em vez de ser deduzido do FEN a cada lance — deduzir de novo dentro de
 * cada função seria a segunda fonte da mesma verdade.
 */
export type PapelDoAluno = 'atacante' | 'defensor'

/**
 * O objetivo da rodada, na linguagem do treino.
 *
 * `hold` existe porque o catálogo chama o papel de `defend` (o que a POSIÇÃO
 * pede) e a rodada precisa dizer o que o ALUNO faz (segurar). A tradução é uma
 * tabela exaustiva e não um `if`: objetivo novo no catálogo sem decisão aqui não
 * compila, em vez de virar `undefined` numa tela.
 */
export type ObjetivoDaRodada = 'win' | 'draw' | 'mate' | 'promote' | 'hold' | 'reach-target'

export const OBJETIVO_DA_RODADA_POR_POSICAO: Record<
  EndgamePosition['objective'],
  ObjetivoDaRodada
> = {
  win: 'win',
  draw: 'draw',
  mate: 'mate',
  promote: 'promote',
  'reach-target': 'reach-target',
  defend: 'hold',
}

/**
 * De que lado da técnica a posição treina.
 *
 * Tabela exaustiva pelo mesmo motivo da de cima. É ela que responde a pergunta
 * que decide a cobertura do treino final: este final ADMITE defesa?
 */
export const PAPEL_POR_OBJETIVO_DE_POSICAO: Record<EndgamePosition['objective'], PapelDoAluno> = {
  win: 'atacante',
  mate: 'atacante',
  promote: 'atacante',
  'reach-target': 'atacante',
  draw: 'defensor',
  defend: 'defensor',
}

export function papelDaPosicao(posicao: EndgamePosition): PapelDoAluno {
  return PAPEL_POR_OBJETIVO_DE_POSICAO[posicao.objective]
}

// --------------------------------------------------------- alvos de cobertura

/**
 * O nome de um alvo de cobertura.
 *
 * FUNÇÃO, e não template solto no chamador: o alvo que a rodada grava e o alvo
 * que a etapa exige têm de ser a MESMA string, e duas montagens à mão divergem
 * no dia em que alguém trocar o separador. A etapa ficaria eternamente
 * incompleta, sem erro nenhum — falso vermelho silencioso.
 *
 * O alvo é `papel:posição` porque cobrir os dois papéis da MESMA posição não
 * prova transferência, e cobrir a mesma posição duas vezes com o mesmo papel não
 * prova nada. As duas dimensões precisam aparecer no nome.
 */
export function alvoDeCobertura(posicaoId: string, papel: PapelDoAluno): string {
  return `${papel}:${posicaoId}`
}

// ------------------------------------------------------------- as dez etapas

/**
 * Números da montagem da jornada de finais.
 *
 * HEURÍSTICA DE PRODUTO, NUNCA CALIBRADA: os três primeiros valores foram
 * escolhidos para a jornada existir antes de haver telemetria. Recalibrar com
 * tentativas reais, não com opinião.
 *
 * `posicoesMinimasParaTransferencia` NÃO é heurística: é a regra pedagógica de
 * que treino final em uma posição só mede memória de FEN. Mexer nele é mudar o
 * produto, e por isso ele está aqui, visível, e não enterrado num `if`.
 */
export const JORNADA_DE_FINAL_CONFIG = {
  /** Itens da etapa de reconhecimento quando a lição não traz nenhum. */
  itensDeReconhecimentoPadrao: 1,
  /** Itens da etapa de variações quando a família tem uma posição só além da base. */
  variacoesMinimas: 1,
  /** Itens da etapa "jogar pelos dois lados" quando o final não admite defesa. */
  ladosMinimos: 1,
  /** Posições DISTINTAS que o treino final precisa exigir. */
  posicoesMinimasParaTransferencia: 2,
} as const

/** Os ids das dez etapas, na ordem. É a FONTE — ninguém redeclara a sequência. */
export const ETAPAS_DA_JORNADA_DE_FINAL = [
  'visao',
  'reconhecer',
  'principio',
  'demonstracao',
  'progredir',
  'defender',
  'variacoes',
  'dois-lados',
  'pratica-guiada',
  'treino-final',
] as const

export type EtapaDeFinal = (typeof ETAPAS_DA_JORNADA_DE_FINAL)[number]

/**
 * O conteúdo de que a montagem precisa.
 *
 * Entra por parâmetro, e não é lido de `@/content`: a função fica pura, o teste
 * monta o final que quiser provar, e o domínio não passa a depender da ordem em
 * que os módulos de conteúdo carregam.
 */
export interface ConteudoDoFinal {
  /**
   * Posições treináveis da MESMA família, na ordem em que o aluno as encontra.
   * É daqui que saem os papéis, a transferência e os alvos do treino final.
   */
  posicoes: readonly EndgamePosition[]
  /** Passos da lição, quando o tema tem uma. De onde saem os itens de reconhecimento. */
  passosDaLicao?: readonly EndgameLessonStep[]
}

/** As posições em que o aluno ATACA (converte, promove, dá mate). */
export function posicoesDeAtaque(conteudo: ConteudoDoFinal): readonly EndgamePosition[] {
  return conteudo.posicoes.filter((posicao) => papelDaPosicao(posicao) === 'atacante')
}

/** As posições em que o aluno DEFENDE (segura o empate). */
export function posicoesDeDefesa(conteudo: ConteudoDoFinal): readonly EndgamePosition[] {
  return conteudo.posicoes.filter((posicao) => papelDaPosicao(posicao) === 'defensor')
}

/**
 * Este final admite defesa?
 *
 * DERIVADO DO CONTEÚDO, e essa é a decisão central da etapa `defender`. Nem todo
 * final tem os dois lados: em rei e torre contra rei sozinho não existe defesa —
 * o lado fraco não tem o que segurar, o final é vitória forçada. Exigir um alvo
 * defensivo ali criaria uma etapa de treino IMPOSSÍVEL de completar, e o aluno
 * ficaria preso numa jornada que nenhuma jogada resolve. É o falso vermelho
 * simétrico ao bug do "atividade concluída": a tela não mentiria dizendo que
 * acabou, mentiria dizendo que ainda falta algo inexistente.
 *
 * Derivar da existência de posição defensiva, em vez de uma bandeira escrita à
 * mão na definição do final, é deliberado: bandeira e conteúdo divergem no dia
 * em que alguém acrescentar a posição de defesa e esquecer de virar a bandeira.
 */
export function admiteDefesa(conteudo: ConteudoDoFinal): boolean {
  return posicoesDeDefesa(conteudo).length > 0
}

/**
 * Os alvos que o TREINO FINAL exige.
 *
 * Três ingredientes, e cada um mata um jeito diferente de passar sem saber:
 *
 * 1. a posição de ataque base — provar que converte;
 * 2. uma SEGUNDA posição distinta — provar que transferiu a técnica, e não
 *    decorou uma FEN. Quando a família tem duas posições de ataque, é a segunda
 *    delas; quando só tem uma, é a posição de defesa, que também é outra FEN;
 * 3. o alvo DEFENSIVO, e só quando o final admite defesa (ver `admiteDefesa`).
 */
export function alvosDoTreinoFinal(conteudo: ConteudoDoFinal): string[] {
  const ataque = posicoesDeAtaque(conteudo)
  const defesa = posicoesDeDefesa(conteudo)
  const alvos: string[] = []
  for (const posicao of ataque.slice(0, JORNADA_DE_FINAL_CONFIG.posicoesMinimasParaTransferencia)) {
    alvos.push(alvoDeCobertura(posicao.id, 'atacante'))
  }
  const primeiraDefesa = defesa[0]
  if (primeiraDefesa !== undefined) {
    alvos.push(alvoDeCobertura(primeiraDefesa.id, 'defensor'))
  }
  return alvos
}

/** Quantas posições DISTINTAS um conjunto de alvos exige. */
function posicoesDistintas(alvos: readonly string[]): number {
  return new Set(alvos.map((alvo) => alvo.slice(alvo.indexOf(':') + 1))).size
}

/**
 * O que impede este conteúdo de virar jornada.
 *
 * Erro como VALOR, e não exceção, porque quem chama isto é um portão que quer
 * listar TODOS os finais quebrados de uma vez — a primeira exceção esconderia os
 * outros dezenove.
 */
export function problemasDoConteudoDeFinal(conteudo: ConteudoDoFinal): string[] {
  const problemas: string[] = []
  if (posicoesDeAtaque(conteudo).length === 0) {
    problemas.push('nenhuma posição em que o aluno converta: não há o que treinar')
  }
  const distintas = posicoesDistintas(alvosDoTreinoFinal(conteudo))
  if (distintas < JORNADA_DE_FINAL_CONFIG.posicoesMinimasParaTransferencia) {
    problemas.push(
      `o treino final exigiria ${distintas} posição: sem uma segunda posição da família, ele ` +
        'mede memória de FEN e não técnica',
    )
  }
  return problemas
}

interface DescritorDeEtapa {
  id: EtapaDeFinal
  titulo: string
  rotuloCurto: string
  objetivo: string
  regra: StudyStage['regra']
  ehTreinoFinal?: boolean
}

/**
 * Quantos itens a etapa de reconhecimento pede.
 *
 * Conta os passos da lição que o aluno RESPONDE. Uma etapa de `itens` conclui ao
 * responder, certo ou errado — reconhecer é diagnóstico, e reprovar aqui
 * transformaria a primeira pergunta da jornada num muro.
 */
/**
 * Quantos itens a etapa de reconhecimento pode COBRAR.
 *
 * ZERO É UMA RESPOSTA VÁLIDA, e não cobri-la era um beco sem saída.
 *
 * O `Math.max(respondiveis, 1)` que estava aqui exigia um item mesmo quando o
 * conteúdo não tinha nenhum passo de reconhecimento escrito — e HOJE NENHUM
 * final tem. O efeito: a etapa pedia uma resposta que a tela não tinha como
 * oferecer, o "Continuar" nascia desabilitado e o aluno ficava preso na segunda
 * etapa de toda jornada de final, sem nada para clicar.
 *
 * Uma regra de conclusão que o conteúdo não consegue satisfazer não é rigor: é
 * uma porta trancada por dentro. O mínimo só vale quando há o que cobrar.
 */
function itensDeReconhecimento(conteudo: ConteudoDoFinal): number {
  const respondiveis = (conteudo.passosDaLicao ?? []).filter(
    (passo) => passo.type === 'recognition' || passo.type === 'decision',
  ).length
  if (respondiveis === 0) return 0
  return Math.max(respondiveis, JORNADA_DE_FINAL_CONFIG.itensDeReconhecimentoPadrao)
}

function descritores(conteudo: ConteudoDoFinal): DescritorDeEtapa[] {
  const defende = admiteDefesa(conteudo)
  const variacoes = Math.max(conteudo.posicoes.length - 1, JORNADA_DE_FINAL_CONFIG.variacoesMinimas)
  const lados = defende ? 2 : JORNADA_DE_FINAL_CONFIG.ladosMinimos

  return [
    {
      id: 'visao',
      titulo: 'Visão da posição',
      rotuloCurto: 'Visão',
      objetivo: 'Ver a posição inteira antes de pensar em lance.',
      regra: { tipo: 'leitura' },
    },
    {
      id: 'reconhecer',
      titulo: 'Reconhecer o tipo',
      rotuloCurto: 'Reconhecer',
      objetivo: 'Dizer que final é este e o que ele decide, sem calcular.',
      /*
        SEM ITEM PARA COBRAR, A ETAPA É DE LEITURA.

        Manter `{ tipo: 'itens', total: 0 }` funcionaria por acidente — zero de
        zero é cumprido — mas descreveria a etapa errado para todo mundo que
        lesse a jornada. Ela é, de fato, uma etapa de leitura enquanto o final
        não tiver perguntas de reconhecimento escritas.
      */
      regra:
        itensDeReconhecimento(conteudo) > 0
          ? { tipo: 'itens', total: itensDeReconhecimento(conteudo) }
          : { tipo: 'leitura' },
    },
    {
      id: 'principio',
      titulo: 'Princípio',
      rotuloCurto: 'Princípio',
      objetivo: 'Enunciar a regra que resolve a família, não a sequência da FEN.',
      regra: { tipo: 'leitura' },
    },
    {
      id: 'demonstracao',
      titulo: 'Demonstração',
      rotuloCurto: 'Demonstrar',
      objetivo: 'Ver a técnica funcionando de ponta a ponta uma vez.',
      regra: { tipo: 'leitura' },
    },
    {
      id: 'progredir',
      titulo: 'Como progredir / ganhar',
      rotuloCurto: 'Progredir',
      objetivo: 'Saber o que é PROGRESSO aqui, para não jogar lances que só esperam.',
      regra: { tipo: 'leitura' },
    },
    {
      id: 'defender',
      titulo: 'Como defender / segurar',
      rotuloCurto: 'Defender',
      // O texto muda com o conteúdo porque a etapa muda de natureza: onde há
      // defesa, ela ensina a segurar; onde não há, ela ensina POR QUE não há —
      // conhecimento de final tão útil quanto a técnica, e o que impede o aluno
      // de procurar uma salvação que não existe.
      objetivo: defende
        ? 'Saber o que o lado fraco tenta, para reconhecer quando a defesa falha.'
        : 'Entender por que este final não tem defesa: contra jogo correto, não há salvação.',
      regra: { tipo: 'leitura' },
    },
    {
      id: 'variacoes',
      titulo: 'Variações de posição',
      rotuloCurto: 'Variações',
      objetivo: 'Reconhecer a mesma técnica em outra disposição de peças.',
      regra: { tipo: 'itens', total: variacoes },
    },
    {
      id: 'dois-lados',
      titulo: 'Jogar pelos dois lados',
      rotuloCurto: 'Dois lados',
      objetivo: defende
        ? 'Jogar a posição atacando e defendendo, para ver a técnica dos dois ângulos.'
        : 'Jogar a posição pelo lado forte até o fim, sem atalho.',
      regra: { tipo: 'itens', total: lados },
    },
    {
      id: 'pratica-guiada',
      titulo: 'Prática guiada',
      rotuloCurto: 'Guiada',
      objetivo: 'Executar a técnica com dica disponível, antes de tentar sozinho.',
      // `itens` e não `cobertura`: aqui a orientação ainda existe, e errar com
      // dica na tela faz parte. A regra que REPROVA mora só no treino final —
      // concentrá-la num lugar é o que mantém "errar não conclui" auditável.
      regra: { tipo: 'itens', total: 1 },
    },
    {
      id: 'treino-final',
      titulo: 'Treino final',
      rotuloCurto: 'Treino',
      objetivo: 'Converter e (quando existe) segurar, em mais de uma posição, sem ajuda.',
      regra: { tipo: 'cobertura', alvosExigidos: alvosDoTreinoFinal(conteudo) },
      ehTreinoFinal: true,
    },
  ]
}

/**
 * Monta as dez etapas de um final.
 *
 * LANÇA quando o conteúdo não sustenta o treino final. Não é preciosismo: uma
 * jornada cujo treino exige uma posição inexistente, ou um alvo defensivo
 * impossível, é uma jornada que NUNCA conclui — e o sintoma seria um aluno preso
 * numa etapa que nenhuma jogada resolve, sem uma linha no console. Quem quer a
 * lista completa de finais quebrados chama `problemasDoConteudoDeFinal`.
 */
export function construirJornadaDeFinal(
  endgame: EndgameDefinition,
  conteudo: ConteudoDoFinal,
): StudyStage[] {
  const problemas = problemasDoConteudoDeFinal(conteudo)
  if (problemas.length > 0) {
    throw new Error(`Final ${endgame.id} não vira jornada: ${problemas.join('; ')}`)
  }
  return descritores(conteudo).map((descritor) => ({
    id: descritor.id,
    tipo: descritor.id,
    titulo: descritor.titulo,
    rotuloCurto: descritor.rotuloCurto,
    objetivo: descritor.objetivo,
    regra: descritor.regra,
    ...(descritor.ehTreinoFinal === true ? { ehTreinoFinal: true } : {}),
  }))
}

// ------------------------------------------------------------------ a rodada

/**
 * Por que a rodada morreu. Nunca "não teve sucesso" — o motivo é o que a tela
 * usa para ensinar, e um booleano não ensina nada.
 */
export type MotivoDaFalhaDaRodada = 'objetivo-perdido' | 'alvo-tecnico-perdido' | 'illegal'

export interface EndgameTrainingRound {
  id: string
  endgameId: string
  /** A família de posições a que esta rodada pertence. */
  positionFamilyId: string
  /** O alvo que esta rodada cobre SE terminar em sucesso. */
  alvoDeCobertura: string
  startFen: string
  currentFen: string
  userRole: PapelDoAluno
  objetivo: ObjetivoDaRodada
  desfecho: DesfechoDaRodada
  failureReason?: MotivoDaFalhaDaRodada
  /** UCIs normalizados já jogados NESTA rodada. */
  playedMoves: string[]
}

export interface InicioDaRodadaDeFinal {
  /**
   * Id da rodada. Nomeia O QUE ela treina, nunca quando começou: um carimbo de
   * tempo aqui tornaria o estado irreproduzível num teste, e bug de final só se
   * conserta reproduzindo a sequência exata.
   */
  id: string
  endgameId: string
  /** A família de posições — na prática, o conjunto de drills do final. */
  positionFamilyId: string
  posicao: EndgamePosition
}

/**
 * Abre uma rodada a partir da posição.
 *
 * Papel, objetivo e alvo são DERIVADOS da posição, nunca passados à mão: um
 * alvo montado no chamador discorda do alvo exigido pela etapa no dia em que
 * alguém trocar uma letra, e aí o treino nunca fecha por mais que o aluno
 * acerte — falso vermelho silencioso.
 */
export function iniciarRodadaDeFinal(inicio: InicioDaRodadaDeFinal): EndgameTrainingRound {
  const papel = papelDaPosicao(inicio.posicao)
  return {
    id: inicio.id,
    endgameId: inicio.endgameId,
    positionFamilyId: inicio.positionFamilyId,
    alvoDeCobertura: alvoDeCobertura(inicio.posicao.id, papel),
    startFen: inicio.posicao.fen,
    currentFen: inicio.posicao.fen,
    userRole: papel,
    objetivo: OBJETIVO_DA_RODADA_POR_POSICAO[inicio.posicao.objective],
    desfecho: 'ativa',
    playedMoves: [],
  }
}

/**
 * Um alvo técnico que a LIÇÃO declara para aquele momento.
 *
 * Existe porque nem tudo que se perde num final aparece no resultado teórico: em
 * Lucena, largar a torre da quarta fileira pode continuar ganhando pela
 * tablebase e já ter jogado fora A PONTE, que é o que a lição ensina. Sem isto,
 * o treino aprovaria quem abandonou a técnica e ganhou por outro caminho — e o
 * aluno sairia sem a ferramenta.
 *
 * Quem decide se o alvo caiu é quem monta o veredito, não este arquivo: a
 * condição é específica de cada técnica e não cabe numa regra geral.
 */
export interface AlvoTecnico {
  id: string
  /** Continua de pé depois do lance? */
  preservado: boolean
  /** O que era, em PT-BR, para a tela dizer o que se perdeu. */
  descricao: string
}

/**
 * O que o mundo externo diz sobre UM lance.
 *
 * TUDO POR PARÂMETRO (decisão E de `julgamento.ts`, mantida aqui): tablebase e
 * engine são IO, e o domínio tem de julgar a rodada sem rede. Quem chama monta
 * `julgamento` com `julgarLanceDeFinal` e `objetivo` com `avaliarObjetivo` —
 * este arquivo não reimplementa nenhum dos dois.
 */
export interface VereditoDeLanceDeFinal {
  /** O lance é legal na posição? Ilegal encerra a rodada sem julgar nada. */
  legal: boolean
  /** Posição depois do lance do aluno e da resposta do computador. */
  fenDepois: string
  /** Veredito da tablebase. `null` quando não houve juiz — decisão B de `julgamento.ts`. */
  julgamento: JulgamentoDoLance | null
  /** Estado do objetivo depois do lance. `null` quando não foi avaliado. */
  objetivo: ResultadoObjetivo | null
  /** Alvo técnico que este lance tinha de preservar, quando a lição declara um. */
  alvoTecnico: AlvoTecnico | null
}

/**
 * O que aconteceu com o lance, como CÓDIGO.
 *
 * Mesma regra de `objetivo.ts` e `julgamento.ts`: função de domínio não tem
 * tradutor. O texto vem separado, em `AVISO_POR_MOTIVO`.
 */
export const MOTIVOS_DO_LANCE_DE_FINAL = [
  'preserva-o-objetivo',
  'tecnica-mais-simples',
  'objetivo-cumprido',
  'objetivo-perdido',
  'alvo-tecnico-perdido',
  'lance-ilegal',
  'sem-juiz',
  'rodada-ja-encerrada',
] as const

export type MotivoDoLanceDeFinal = (typeof MOTIVOS_DO_LANCE_DE_FINAL)[number]

/**
 * O aviso que acompanha o lance, quando há o que avisar.
 *
 * Record EXAUSTIVO de propósito: motivo novo sem uma decisão sobre o que o aluno
 * lê não compila. `null` é a decisão de não dizer nada, escrita — diferente de
 * esquecer.
 *
 * O aviso de `tecnica-mais-simples` é o coração da regra deste arquivo: ele
 * INFORMA sem reprovar. A frase evita "errado" e "pior" porque o lance não
 * falhou — ele ganha por um caminho mais longo, e dizer isso é ensinar.
 */
export const AVISO_POR_MOTIVO: Record<MotivoDoLanceDeFinal, string | null> = {
  'preserva-o-objetivo': null,
  'tecnica-mais-simples': 'Funciona, mas existe técnica mais simples.',
  'objetivo-cumprido': null,
  'objetivo-perdido': null,
  'alvo-tecnico-perdido': null,
  'lance-ilegal': null,
  'sem-juiz': 'Não deu para comparar este lance com a tablebase.',
  'rodada-ja-encerrada': null,
}

export interface ResultadoDoLanceDeFinal {
  /** O lance entra na partida? Falha e rodada já encerrada não entram. */
  aceito: boolean
  desfecho: DesfechoDaRodada
  motivo: MotivoDoLanceDeFinal
  /** Texto para o aluno, ou `null`. Sai de `AVISO_POR_MOTIVO`, nunca da mão. */
  aviso: string | null
}

/** O lance jogou fora o resultado que a posição valia? */
function perdeuOObjetivo(veredito: VereditoDeLanceDeFinal): boolean {
  if (veredito.julgamento?.grau === 'perde-o-resultado') {
    return true
  }
  return veredito.objetivo?.estado === 'falhou'
}

function resultado(
  motivo: MotivoDoLanceDeFinal,
  desfecho: DesfechoDaRodada,
): ResultadoDoLanceDeFinal {
  return {
    aceito: desfecho !== 'falhou' && motivo !== 'rodada-ja-encerrada',
    desfecho,
    motivo,
    aviso: AVISO_POR_MOTIVO[motivo],
  }
}

/**
 * Joga um lance na rodada. NÃO MUTA a rodada recebida.
 *
 * A ORDEM DAS DECISÕES É A REGRA, e ela é fail-closed: as duas maneiras de
 * PERDER são conferidas ANTES de "cumpriu o objetivo". Se um veredito chegar
 * dizendo as duas coisas ao mesmo tempo, ele é contraditório — e declarar
 * sucesso numa rodada que perdeu um alvo declarado é exatamente a mentira que
 * este trabalho vem matar. Na dúvida a rodada morre; nunca conclui.
 *
 * O QUE ESTA FUNÇÃO SE RECUSA A FAZER: terminar no primeiro bom lance. Um lance
 * que preserva a vitória devolve `ativa`, não `sucesso` — conversão se joga até
 * o fim, e "achou a ideia" não é "converteu". Só o objetivo avaliado como
 * `cumprido` fecha a rodada em sucesso.
 */
export function jogarNaRodadaDeFinal(
  round: EndgameTrainingRound,
  uci: string,
  veredito: VereditoDeLanceDeFinal,
): { round: EndgameTrainingRound; resultado: ResultadoDoLanceDeFinal } {
  // Rodada encerrada não ressuscita. Sem isto, um clique atrasado da tela
  // reabriria uma rodada já falhada e poderia terminá-la em sucesso.
  if (rodadaTerminou(round.desfecho)) {
    return { round, resultado: resultado('rodada-ja-encerrada', round.desfecho) }
  }

  const lance = normalizeUci(uci)

  // Lance ilegal não entra em `playedMoves` nem mexe no FEN: ele não foi jogado.
  // Registrá-lo criaria um histórico que a reprodução da partida não reproduz.
  if (!veredito.legal) {
    return {
      round: { ...round, desfecho: 'falhou', failureReason: 'illegal' },
      resultado: resultado('lance-ilegal', 'falhou'),
    }
  }

  const avancada: EndgameTrainingRound = {
    ...round,
    currentFen: veredito.fenDepois,
    playedMoves: [...round.playedMoves, lance],
  }

  if (perdeuOObjetivo(veredito)) {
    return {
      round: { ...avancada, desfecho: 'falhou', failureReason: 'objetivo-perdido' },
      resultado: resultado('objetivo-perdido', 'falhou'),
    }
  }

  if (veredito.alvoTecnico !== null && !veredito.alvoTecnico.preservado) {
    return {
      round: { ...avancada, desfecho: 'falhou', failureReason: 'alvo-tecnico-perdido' },
      resultado: resultado('alvo-tecnico-perdido', 'falhou'),
    }
  }

  if (veredito.objetivo?.estado === 'cumprido') {
    return {
      round: { ...avancada, desfecho: 'sucesso' },
      resultado: resultado('objetivo-cumprido', 'sucesso'),
    }
  }

  // Daqui para baixo o lance PRESERVA, e nenhum destes ramos reprova. É a regra
  // negativa deste arquivo em código: diferente do exemplo não é erro.
  if (veredito.julgamento?.grau === 'mantem-mas-e-pior') {
    return { round: avancada, resultado: resultado('tecnica-mais-simples', 'ativa') }
  }
  if (veredito.julgamento === null || veredito.julgamento.grau === 'indeterminado') {
    return { round: avancada, resultado: resultado('sem-juiz', 'ativa') }
  }
  return { round: avancada, resultado: resultado('preserva-o-objetivo', 'ativa') }
}

/**
 * Aplica a resposta do ADVERSÁRIO na rodada.
 *
 * SEPARADA DE `jogarNaRodadaDeFinal`, e a separação é o ponto: aquela função
 * julga o lance DO ALUNO e pode reprovar a rodada — objetivo perdido, alvo
 * técnico perdido, lance ilegal. Passar o lance do computador por ela faria o
 * adversário reprovar o aluno ao jogar bem, que é o avesso do que um treino de
 * final mede.
 *
 * Aqui não há veredito nenhum: o lance do computador só avança a posição e entra
 * no histórico. Quem decide se o objetivo caiu continua sendo o lance seguinte
 * do aluno.
 *
 * Rodada encerrada não recebe lance: um clique atrasado da tela não ressuscita
 * uma rodada que já terminou.
 */
export function aplicarRespostaDoAdversarioNoFinal(
  round: EndgameTrainingRound,
  uci: string,
  fenDepois: string,
): EndgameTrainingRound {
  if (rodadaTerminou(round.desfecho)) return round
  return {
    ...round,
    currentFen: fenDepois,
    playedMoves: [...round.playedMoves, normalizeUci(uci)],
  }
}

/**
 * Grava o desfecho da rodada na jornada.
 *
 * A ÚNICA PORTA entre rodada e etapa, e ela só sabe chamar `registrarRodada` —
 * que recusa desfecho diferente de `sucesso`. Rodada falha atravessa esta função
 * e devolve a jornada IDÊNTICA: sem alvo novo, `etapaCumprida` continua `false`,
 * e o treino final não conclui. Não existe segundo caminho para `alvosCobertos`
 * neste domínio.
 */
export function registrarRodadaDeFinal(
  jornada: StudyJourney,
  stageId: string,
  round: EndgameTrainingRound,
): StudyJourney {
  return registrarRodada(jornada, stageId, round.alvoDeCobertura, round.desfecho)
}

// ----------------------------------------------- lance prático do computador

/**
 * Um lance candidato do computador, já medido por quem tem o IO.
 *
 * `preserveOutcome` é o único campo que é REGRA: os outros pontuam, ele VETA.
 * Ver `escolherLancePratico`.
 *
 * Os cinco critérios de qualidade são 0..1 e vêm de fora porque cada um depende
 * de dado que o domínio não tem: DTM/DTZ da tablebase, mobilidade, contagem de
 * peças. Normalizá-los aqui exigiria a tablebase dentro desta função.
 */
export interface CandidatoPratico {
  uci: string
  /** O lance mantém o resultado teórico do computador? */
  preserveOutcome: boolean
  /** 0..1 — quanto obriga o aluno a provar a técnica (DTM/DTZ maiores contra ele). */
  defensiveResistance: number
  /** 0..1 — quanto aproxima a conversão. */
  conversionProgress: number
  /** 0..1 — atividade das peças depois do lance. */
  activity: number
  /** 0..1 — quanto a posição resultante é simples de entender. */
  simplicity: number
  /** 0..1 — quanto o lance expõe a IDEIA que a lição ensina. */
  pedagogicalValue: number
}

export interface ContextoDoLancePratico {
  /** O COMPUTADOR está defendendo ou atacando nesta rodada. */
  papelDoComputador: PapelDoAluno
  /** UCIs que o computador já jogou nesta rodada. Alimenta a anti-repetição. */
  lancesJaJogados: readonly string[]
  /**
   * Semente do desempate. Existe para o computador não jogar sempre o mesmo
   * lance entre equivalentes SEM usar `Math.random()` — aleatório de verdade
   * tornaria a rodada irreprodutível, e bug de final só se conserta
   * reproduzindo a sequência exata.
   */
  seed: number
}

/**
 * Pesos da escolha prática do computador.
 *
 * NUNCA CALIBRADOS. São a primeira hipótese, escrita para existir um critério em
 * vez de "o primeiro lance da lista" — que é o que produz o computador que se
 * deixa dar mate e ensina o aluno a esperar o erro do adversário.
 *
 * A assimetria entre as duas colunas é a decisão, não os números: DEFENDENDO, a
 * resistência domina (o defensor que entrega o final não treina ninguém);
 * ATACANDO, o progresso domina (o atacante que anda de um lado para o outro faz
 * o aluno empatar por 50 lances sem entender por quê).
 *
 * Recalibrar com rodadas reais — tempo até a conversão, taxa de abandono — e não
 * com opinião sobre qual lance "parece" melhor.
 */
export const PESOS_DO_LANCE_PRATICO = {
  defendendo: {
    defensiveResistance: 1,
    conversionProgress: 0,
    activity: 0.2,
    simplicity: 0.1,
    pedagogicalValue: 0.4,
    antiRepeticao: 0.6,
  },
  atacando: {
    defensiveResistance: 0,
    conversionProgress: 1,
    activity: 0.3,
    simplicity: 0.2,
    pedagogicalValue: 0.4,
    antiRepeticao: 0.6,
  },
} as const

/**
 * Casas decimais da pontuação.
 *
 * NÃO é enfeite: sem arredondar, somas como `0.1 + 0.2` fazem dois lances
 * genuinamente equivalentes pontuarem diferente por 1e-17, o empate nunca
 * acontece e a anti-repetição nunca entra em cena — o computador voltaria a
 * repetir o mesmo lance para sempre, e sem uma linha no console.
 */
const PRECISAO_DA_PONTUACAO = 1e6

function arredondar(valor: number): number {
  return Math.round(valor * PRECISAO_DA_PONTUACAO) / PRECISAO_DA_PONTUACAO
}

/**
 * A nota de um candidato.
 *
 * `-Infinity` para quem não preserva, e não uma nota baixa: nota baixa é
 * comparável, e "comparável" é como um lance que joga fora o final acaba vencendo
 * por pontuar alto em atividade e simplicidade. O veto tem de ser veto.
 */
export function pontuarLancePratico(
  candidato: CandidatoPratico,
  contexto: ContextoDoLancePratico,
): number {
  if (!candidato.preserveOutcome) {
    return Number.NEGATIVE_INFINITY
  }
  const pesos =
    contexto.papelDoComputador === 'defensor'
      ? PESOS_DO_LANCE_PRATICO.defendendo
      : PESOS_DO_LANCE_PRATICO.atacando
  const uci = normalizeUci(candidato.uci)
  const repeticoes = contexto.lancesJaJogados.filter(
    (jogado) => normalizeUci(jogado) === uci,
  ).length
  const bruto =
    pesos.defensiveResistance * candidato.defensiveResistance +
    pesos.conversionProgress * candidato.conversionProgress +
    pesos.activity * candidato.activity +
    pesos.simplicity * candidato.simplicity +
    pesos.pedagogicalValue * candidato.pedagogicalValue -
    pesos.antiRepeticao * repeticoes
  return arredondar(bruto)
}

/**
 * Escolhe o lance do computador entre os que PRESERVAM o resultado.
 *
 * O problema que resolve (plano parte XI): entre vários lances que mantêm o
 * final, escolher arbitrariamente — o primeiro da lista, o de menor DTZ —
 * produz um adversário que não ensina. Defendendo, ele entrega a posição e o
 * aluno "aprende" uma técnica que nunca foi testada. Atacando, ele fica dando
 * voltas e o aluno conclui que o final é empate.
 *
 * `null` quando NENHUM candidato preserva. É um estado real — a posição já está
 * perdida para o computador — e devolver um lance qualquer ali esconderia de
 * quem chama que o final acabou.
 *
 * DETERMINISMO: mesma lista, mesmo contexto, mesma saída. O desempate entre
 * equivalentes é `seed % n` sobre a lista ordenada por UCI, e não sorteio: duas
 * rodadas com sementes diferentes veem lances diferentes, e a MESMA rodada se
 * reproduz lance a lance.
 */
export function escolherLancePratico(
  candidatos: readonly CandidatoPratico[],
  contexto: ContextoDoLancePratico,
): CandidatoPratico | null {
  const viaveis = candidatos.filter((candidato) => candidato.preserveOutcome)
  if (viaveis.length === 0) {
    return null
  }
  const pontuados = viaveis.map((candidato) => ({
    candidato,
    nota: pontuarLancePratico(candidato, contexto),
  }))
  const melhorNota = Math.max(...pontuados.map((item) => item.nota))
  const empatados = pontuados
    .filter((item) => item.nota === melhorNota)
    .map((item) => item.candidato)
    .sort((a, b) => normalizeUci(a.uci).localeCompare(normalizeUci(b.uci)))
  // Resto positivo mesmo com semente negativa: `-1 % 3` é `-1` em JS, e um
  // índice negativo devolveria `undefined` em vez de um lance.
  const indice = ((contexto.seed % empatados.length) + empatados.length) % empatados.length
  return empatados[indice] ?? null
}

// -------------------------------------------------------------- a cobertura

/**
 * A leitura da cobertura de uma etapa de treino.
 *
 * DERIVADA na hora de `jornada.alvosCobertos`, nunca guardada em paralelo: um
 * contador que alguém incrementa à mão é a segunda fonte da mesma verdade, e
 * diverge no dia em que um caminho novo esquecer de incrementá-lo — que é como
 * "faltando: 0" apareceria com alvo faltando de verdade.
 */
export interface EndgameCoverageTracker {
  exigidos: readonly string[]
  cobertos: readonly string[]
  faltando: readonly string[]
  completa: boolean
}

export function coberturaDoFinal(
  jornada: StudyJourney,
  stageId: string,
  alvosExigidos: readonly string[],
): EndgameCoverageTracker {
  const gravados = new Set(jornada.alvosCobertos[stageId] ?? [])
  const cobertos = alvosExigidos.filter((alvo) => gravados.has(alvo))
  const faltando = alvosExigidos.filter((alvo) => !gravados.has(alvo))
  return {
    exigidos: alvosExigidos,
    cobertos,
    faltando,
    // Lista vazia NÃO é cobertura completa: etapa de treino sem alvo nenhum é
    // conteúdo quebrado, e dizer "completa" ali seria aprovar quem não jogou.
    completa: alvosExigidos.length > 0 && faltando.length === 0,
  }
}

/**
 * A etapa de treino final está cumprida?
 *
 * Delega a `etapaCumprida` em vez de reimplementar a comparação: a regra de
 * conclusão é da infraestrutura de jornada, e uma segunda cópia aqui poderia
 * discordar dela — discordar para o lado errado é o bug de novo.
 */
export function treinoFinalCumprido(jornada: StudyJourney, stages: readonly StudyStage[]): boolean {
  const treino = stages.find((stage) => stage.ehTreinoFinal === true)
  return treino === undefined ? false : etapaCumprida(jornada, treino)
}
