/**
 * A AGENDA DE REVISÃO: tudo que a tela de Revisar precisa saber, calculado aqui.
 *
 * POR QUE UM MÓDULO DE DOMÍNIO e não contas dentro do componente: a regra de
 * arquitetura 1 do `CLAUDE.md` é que `src/domain/**` não depende de React, e o
 * motivo prático aparece exatamente aqui — recorte de dia no fuso do aluno,
 * filtro de elegibilidade e agrupamento de log são as três coisas mais fáceis de
 * errar deste trabalho, e são as três que não dão para testar num componente sem
 * subir um navegador.
 *
 * A CONTAGEM PASSA PELA ELEGIBILIDADE, e essa é a correção de um defeito real.
 * `TreinoHub` contava `getDueCards().length` cru enquanto a fila aplicava
 * `cardPodeSerRevisado`. O hub podia dizer "3 itens vencidos" e a sessão abrir
 * com 1 — dois números para a mesma pergunta, e o aluno sem como saber qual
 * mentia. Aqui existe UMA porta: nada sai deste módulo sem passar pelo mesmo
 * filtro que a sessão usa.
 *
 * O QUE ESTE MÓDULO NÃO FAZ, de propósito:
 *
 * - não diz maestria por habilidade — é pergunta do Roadmap;
 * - não monta plano do dia — é do Hoje;
 * - não calcula probabilidade de recordação. Existe uma `retrievability()` em
 *   `@/lib/fsrs/scheduler` e ela continua sem chamador: é número de modelo, e o
 *   princípio 8 do `CLAUDE.md` proíbe apresentá-lo ao aluno como se fosse
 *   medida da cabeça dele.
 */

import { cardPodeSerRevisado } from './elegibilidade'
import type { RecallOutcome } from '@/domain/roadmap'
import type { ReviewCard, ReviewCardKind, ReviewLog, SkillId } from '@/domain/types'

/**
 * A faixa de vencimento de um card.
 *
 * `atrasado` é separado de `hoje` porque as duas situações pedem reações
 * diferentes: o que vence hoje ainda vai vencer; o que está atrasado já passou
 * do ponto em que o FSRS previa a melhor revisão. Juntar os dois num número só
 * esconderia acúmulo — que é justamente o que faz alguém abandonar revisão
 * espaçada.
 */
export type FaixaDeVencimento = 'atrasado' | 'hoje' | 'amanha' | 'sete-dias' | 'depois'

export interface ContagemPorFaixa {
  atrasado: number
  hoje: number
  amanha: number
  /** Dos próximos sete dias, SEM contar hoje e amanhã. */
  seteDias: number
  depois: number
}

export interface OrigemDaRevisao {
  kind: ReviewCardKind
  total: number
  /** Quantos desses já estão vencidos agora. */
  vencidos: number
}

/**
 * Um card que o aluno já esqueceu mais de uma vez.
 *
 * `lapses` vem do próprio FSRS e conta quantas vezes o card voltou para
 * reaprendizado. É o sinal mais acionável que o escalonador produz, e hoje ele
 * não aparece em lugar nenhum da interface — o aluno revisa a mesma coisa pela
 * quarta vez sem o app nunca dizer isso em voz alta.
 */
export interface Reincidente {
  cardId: string
  prompt: string
  kind: ReviewCardKind
  skillIds: readonly SkillId[]
  lapses: number
  /** O card está neste instante em reaprendizado. */
  reaprendendo: boolean
}

/** Uma sessão passada, derivada dos logs. */
export interface SessaoRevisada {
  /** Dia no fuso do aluno, `YYYY-MM-DD`. */
  dia: string
  /** Instante do último log do grupo — é ele que ordena. */
  terminadaEm: string
  total: number
  porDesfecho: Partial<Record<RecallOutcome, number>>
}

export interface Agenda {
  /** Vencidos E elegíveis. É o número que o botão de revisar promete. */
  vencidas: readonly ReviewCard[]
  contagem: ContagemPorFaixa
  origens: readonly OrigemDaRevisao[]
  reincidentes: readonly Reincidente[]
  historico: readonly SessaoRevisada[]
}

export interface EntradaDaAgenda {
  /** TODOS os cards, não só os vencidos: a previsão depende do futuro. */
  cards: readonly ReviewCard[]
  /** Os logs mais recentes. Lista vazia é "nunca revisou", não é erro. */
  logs: readonly ReviewLog[]
  habilidadesEnsinadas: ReadonlySet<SkillId>
  agora: Date
  /** Quantas sessões passadas devolver. O resto é cortado aqui, não na tela. */
  maximoDeSessoes?: number
}

/** Quantos `lapses` bastam para o card ser chamado de reincidente. */
export const LAPSES_PARA_REINCIDIR = 2

const MAXIMO_DE_SESSOES_PADRAO = 5

/**
 * O dia no fuso do ALUNO.
 *
 * Duplicar `chaveDoDia` de `@/domain/aprendizado/plano` seria a segunda fonte da
 * mesma verdade; importá-la de lá arrastaria o módulo de planejamento inteiro
 * para dentro da revisão. A saída é a terceira: a função é trivial e vive aqui
 * com o mesmo corpo e a mesma justificativa — e há teste dos dois lados.
 *
 * `toISOString().slice(0,10)` daria o dia em UTC, e um aluno em São Paulo
 * revisando às 22h veria a sessão cair no dia seguinte. O recorte por fuso já
 * mordeu este projeto uma vez.
 */
export function diaLocal(instante: Date): string {
  const ano = instante.getFullYear()
  const mes = String(instante.getMonth() + 1).padStart(2, '0')
  const dia = String(instante.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** Meia-noite local de `instante`, mais `dias`. */
function meiaNoiteLocal(instante: Date, dias = 0): Date {
  const d = new Date(instante.getFullYear(), instante.getMonth(), instante.getDate() + dias)
  return d
}

/**
 * Em que faixa um card cai.
 *
 * O CORTE É POR DIA LOCAL E NÃO POR "24 HORAS A PARTIR DE AGORA". Um card que
 * vence às 23h de hoje está em `hoje` mesmo faltando uma hora, e um que vence às
 * 00h30 de amanhã está em `amanha` mesmo faltando menos tempo. É assim que uma
 * pessoa lê um calendário, e é a leitura que a tela promete.
 */
export function faixaDoVencimento(dueAt: string, agora: Date): FaixaDeVencimento {
  const vence = new Date(dueAt)
  if (vence.getTime() <= agora.getTime()) {
    // Vencido agora: `atrasado` só quando passou do dia de hoje.
    return vence.getTime() < meiaNoiteLocal(agora).getTime() ? 'atrasado' : 'hoje'
  }
  if (vence.getTime() < meiaNoiteLocal(agora, 1).getTime()) return 'hoje'
  if (vence.getTime() < meiaNoiteLocal(agora, 2).getTime()) return 'amanha'
  if (vence.getTime() < meiaNoiteLocal(agora, 8).getTime()) return 'sete-dias'
  return 'depois'
}

/**
 * Agrupa os logs em sessões.
 *
 * POR DIA, e não por um id de sessão, porque `ReviewLog` não tem um. Inventar um
 * exigiria mudar o formato do que já está gravado no aparelho de quem usa o app
 * — e o ganho seria distinguir duas sessões no mesmo dia, que é uma distinção
 * que ninguém pediu e que a tela não usaria.
 *
 * O dia é o do ALUNO: agrupar por dia UTC juntaria a revisão das 22h de segunda
 * com a das 9h de terça para metade do mundo.
 */
export function agruparEmSessoes(
  logs: readonly ReviewLog[],
  maximo = MAXIMO_DE_SESSOES_PADRAO,
): SessaoRevisada[] {
  const porDia = new Map<string, SessaoRevisada>()

  for (const log of logs) {
    const instante = new Date(log.reviewedAt)
    const dia = diaLocal(instante)
    const existente = porDia.get(dia)
    const sessao: SessaoRevisada = existente ?? {
      dia,
      terminadaEm: log.reviewedAt,
      total: 0,
      porDesfecho: {},
    }
    sessao.total += 1
    if (log.reviewedAt > sessao.terminadaEm) sessao.terminadaEm = log.reviewedAt
    /*
      LOG SEM DESFECHO É LOG LEGADO, não é erro. `outcome` entrou depois no
      formato e está declarado opcional. Contá-lo como `failed` inventaria um
      fracasso que ninguém registrou; ignorá-lo faria a soma dos desfechos não
      bater com o total. Ele entra no total e fica de fora da quebra — e a tela
      pode dizer isso.
    */
    if (log.outcome) {
      sessao.porDesfecho[log.outcome] = (sessao.porDesfecho[log.outcome] ?? 0) + 1
    }
    porDia.set(dia, sessao)
  }

  return [...porDia.values()]
    .sort((a, b) => b.terminadaEm.localeCompare(a.terminadaEm))
    .slice(0, maximo)
}

/**
 * A agenda inteira, de uma leitura só.
 *
 * Uma função e não cinco getters: a tela precisa das cinco respostas juntas, e
 * cinco entradas separadas convidariam a chamar quatro delas com o filtro de
 * elegibilidade e esquecer na quinta — que é exatamente o defeito que este
 * módulo existe para fechar.
 */
export function montarAgenda({
  cards,
  logs,
  habilidadesEnsinadas,
  agora,
  maximoDeSessoes,
}: EntradaDaAgenda): Agenda {
  const elegiveis = cards.filter((card) => cardPodeSerRevisado(card, habilidadesEnsinadas))

  const contagem: ContagemPorFaixa = {
    atrasado: 0,
    hoje: 0,
    amanha: 0,
    seteDias: 0,
    depois: 0,
  }
  const porKind = new Map<ReviewCardKind, OrigemDaRevisao>()
  const vencidas: ReviewCard[] = []
  const reincidentes: Reincidente[] = []

  for (const card of elegiveis) {
    const faixa = faixaDoVencimento(card.dueAt, agora)
    const vencido = faixa === 'atrasado' || new Date(card.dueAt).getTime() <= agora.getTime()

    if (faixa === 'atrasado') contagem.atrasado += 1
    else if (faixa === 'hoje') contagem.hoje += 1
    else if (faixa === 'amanha') contagem.amanha += 1
    else if (faixa === 'sete-dias') contagem.seteDias += 1
    else contagem.depois += 1

    if (vencido) vencidas.push(card)

    const origem = porKind.get(card.kind) ?? { kind: card.kind, total: 0, vencidos: 0 }
    origem.total += 1
    if (vencido) origem.vencidos += 1
    porKind.set(card.kind, origem)

    const reaprendendo = card.scheduler.state === 'relearning'
    if (reaprendendo || card.scheduler.lapses >= LAPSES_PARA_REINCIDIR) {
      reincidentes.push({
        cardId: card.id,
        prompt: card.prompt,
        kind: card.kind,
        skillIds: card.skillIds,
        lapses: card.scheduler.lapses,
        reaprendendo,
      })
    }
  }

  return {
    // Mesma ordem da fila: o mais vencido primeiro, e o id desempata para a
    // ordem não depender de como o banco devolveu.
    vencidas: vencidas.sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id)),
    contagem,
    // Mais dolorido primeiro; o nome do kind desempata, pelo mesmo motivo.
    origens: [...porKind.values()].sort(
      (a, b) => b.vencidos - a.vencidos || b.total - a.total || a.kind.localeCompare(b.kind),
    ),
    reincidentes: reincidentes
      .sort((a, b) => b.lapses - a.lapses || a.cardId.localeCompare(b.cardId))
      .slice(0, 5),
    historico: agruparEmSessoes(logs, maximoDeSessoes),
  }
}
