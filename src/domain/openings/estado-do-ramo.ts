/**
 * O ESTADO DE APRENDIZADO DE CADA RAMO — a evidência que falta para calibrar.
 *
 * POR QUE ISTO EXISTE. Cinco entregas desta rodada declararam o mesmo ponto
 * cego: a seleção do que treinar é sorteio entre pendentes, e o score adaptativo
 * do plano §29 e §34.1 pede `userWeakness`, `dueState`, `realGameRelevance`.
 * Nenhum desses números existe. Sortear com peso inventado seria FALSA
 * ADAPTAÇÃO — a tela diria "escolhido para você" sobre um `Math.random`.
 *
 * O plano §75 é explícito sobre a causa: "hoje os pesos não foram calibrados com
 * dados de alunos. Portanto registrar eventos que permitam calibrar."
 *
 * ONDE ISSO NÃO VAI. `docs/PRIVACIDADE.md` e os ADR-0003 e ADR-0009 dizem que o
 * núcleo funciona sem conta e sem servidor, e que quase nada sai do aparelho.
 * Então esta telemetria é LOCAL: ela mora no IndexedDB do aluno, sai junto no
 * backup dele, e não é enviada a lugar nenhum. "Registrar eventos que permitam
 * calibrar" não obriga a mandá-los para fora — obriga a não descartá-los.
 *
 * O QUE ELA NÃO MEDE (plano §76): cliques. "O aluno clicou 50 vezes" não é
 * sucesso. O que está aqui é acerto de primeira, uso de dica, cobertura por
 * papel e desvio em partida real.
 *
 * PURO: sem relógio, sem armazenamento. O instante entra por parâmetro.
 */

import type { ImportanciaDoRamo } from './index'

/**
 * O que o aluno já demonstrou num ramo (plano VNext §41).
 *
 * OS QUATRO BOOLEANOS SÃO DIFERENTES DE PROPÓSITO, e a diferença é o que o
 * sorteio de hoje não consegue ver: quem acertou com apoio não demonstrou o
 * mesmo que quem acertou sozinho, e quem joga o repertório não demonstrou saber
 * enfrentá-lo.
 */
export interface EstadoDeAprendizadoDoRamo {
  ramoId: string
  /** O ramo foi aberto e lido alguma vez. */
  visto: boolean
  /** Acertou na prática guiada, onde o apoio existe. */
  guiadaConcluida: boolean
  /** Acertou no treino final, sem apoio. */
  independenteConcluida: boolean
  /** Demonstrado pelo lado do repertório. */
  papelPrincipalConcluido: boolean
  /** Demonstrado pelo lado de lá. */
  papelReversoConcluido: boolean

  /* --- os números que o score do §34.1 precisa --- */

  /** Quantas vezes o ramo foi COBRADO, com ou sem acerto. */
  tentativas: number
  /** Quantas terminaram certo na primeira tentativa daquela decisão. */
  acertosDePrimeira: number
  /** Quantas dicas foram abertas. Uso de dica não é erro — é sinal. */
  dicasUsadas: number
  /** Falhas em revisão espaçada: o esquecimento medido no tempo. */
  falhasEmRevisao: number
  /** Vezes que uma PARTIDA REAL saiu do repertório neste ramo. */
  desviosEmPartidaReal: number

  /** ISO. `null` enquanto nunca foi praticado. */
  praticadoEm: string | null
}

export function estadoInicialDoRamo(ramoId: string): EstadoDeAprendizadoDoRamo {
  return {
    ramoId,
    visto: false,
    guiadaConcluida: false,
    independenteConcluida: false,
    papelPrincipalConcluido: false,
    papelReversoConcluido: false,
    tentativas: 0,
    acertosDePrimeira: 0,
    dicasUsadas: 0,
    falhasEmRevisao: 0,
    desviosEmPartidaReal: 0,
    praticadoEm: null,
  }
}

/** Os eventos que produzem evidência. Nenhum deles é "clicou". */
export type EventoDoRamo =
  | { tipo: 'visto' }
  | { tipo: 'guiada'; acertouDePrimeira: boolean; dicas: number }
  | { tipo: 'treino'; papel: 'principal' | 'reverso'; sucesso: boolean }
  | { tipo: 'revisao'; acertou: boolean }
  | { tipo: 'desvio-em-partida' }

/**
 * Aplica um evento ao estado de um ramo.
 *
 * NUNCA REBAIXA UMA CONQUISTA. Um booleano que já virou `true` não volta a
 * `false` — errar hoje o que se acertou ontem é informação para `falhasEmRevisao`
 * e para o score, não motivo para apagar o que foi demonstrado. Zerar conquista a
 * cada erro é punição, e transforma o treino numa corrida de sorte.
 *
 * `praticadoEm` SÓ ANDA COM PRÁTICA. Abrir a tela não é praticar — é a mesma
 * regra que separou "visto" de "praticado" no ADR-0022.
 */
export function aplicarEventoDoRamo(
  estado: EstadoDeAprendizadoDoRamo,
  evento: EventoDoRamo,
  agora: string,
): EstadoDeAprendizadoDoRamo {
  switch (evento.tipo) {
    case 'visto':
      return estado.visto ? estado : { ...estado, visto: true }

    case 'guiada':
      return {
        ...estado,
        visto: true,
        guiadaConcluida: true,
        tentativas: estado.tentativas + 1,
        acertosDePrimeira: estado.acertosDePrimeira + (evento.acertouDePrimeira ? 1 : 0),
        dicasUsadas: estado.dicasUsadas + Math.max(evento.dicas, 0),
        praticadoEm: agora,
      }

    case 'treino': {
      /*
        A TENTATIVA CONTA MESMO QUANDO FALHA, e é o ponto: um ramo que o aluno
        tentou cinco vezes e concluiu uma é exatamente o que o score precisa
        enxergar. Contar só os sucessos apagaria a dificuldade.
      */
      const base = {
        ...estado,
        visto: true,
        tentativas: estado.tentativas + 1,
        praticadoEm: agora,
      }
      if (!evento.sucesso) return base
      return {
        ...base,
        independenteConcluida: true,
        acertosDePrimeira: base.acertosDePrimeira + 1,
        papelPrincipalConcluido: base.papelPrincipalConcluido || evento.papel === 'principal',
        papelReversoConcluido: base.papelReversoConcluido || evento.papel === 'reverso',
      }
    }

    case 'revisao':
      return evento.acertou
        ? { ...estado, praticadoEm: agora }
        : { ...estado, falhasEmRevisao: estado.falhasEmRevisao + 1, praticadoEm: agora }

    case 'desvio-em-partida':
      /*
        NÃO MEXE EM `praticadoEm`: uma partida real não é uma sessão de estudo, e
        marcar que o aluno "praticou" porque errou numa partida faria o app
        adiar a revisão justamente do que ele acabou de esquecer.
      */
      return { ...estado, desviosEmPartidaReal: estado.desviosEmPartidaReal + 1 }
  }
}

/**
 * A taxa de acerto de primeira, ou `null` quando não há tentativa.
 *
 * `null` E NÃO ZERO. Zero significaria "ele erra sempre", e ausência de dado não
 * é evidência de fraqueza — é o mesmo erro que o portão V3 da revisão já
 * combate. Um score que lesse zero aqui priorizaria justamente os ramos sobre os
 * quais nada se sabe.
 */
export function acertoDePrimeira(estado: EstadoDeAprendizadoDoRamo): number | null {
  if (estado.tentativas === 0) return null
  return estado.acertosDePrimeira / estado.tentativas
}

/**
 * O quanto este ramo pede atenção, de 0 a 1.
 *
 * ELE NÃO ESCOLHE NADA AINDA. É a leitura da evidência, e existe para que a
 * seleção adaptativa do §34.1 possa ser escrita quando houver dados — com pesos
 * calibrados, não inventados. Enquanto isso, quem escolhe continua sendo o
 * sorteio entre pendentes, e a tela não promete adaptação que não faz.
 *
 * OS PESOS AQUI SÃO PROVISÓRIOS E ESTÃO DECLARADOS COMO TAL. Ver §75.
 */
export const PESOS_DA_ATENCAO = {
  /** Erro em partida real é a evidência mais cara que existe. */
  desvioEmPartidaReal: 0.35,
  /** Esquecer no tempo é o que a revisão existe para medir. */
  falhaEmRevisao: 0.3,
  /** Errar sob cobrança. */
  erroNoTreino: 0.2,
  /** Ainda não demonstrado sem apoio. */
  naoIndependente: 0.15,
} as const

export function atencaoDoRamo(
  estado: EstadoDeAprendizadoDoRamo,
  importancia: ImportanciaDoRamo,
): number {
  const taxa = acertoDePrimeira(estado)
  const erro = taxa === null ? 0 : 1 - taxa

  const bruto =
    PESOS_DA_ATENCAO.desvioEmPartidaReal * Math.min(estado.desviosEmPartidaReal / 3, 1) +
    PESOS_DA_ATENCAO.falhaEmRevisao * Math.min(estado.falhasEmRevisao / 3, 1) +
    PESOS_DA_ATENCAO.erroNoTreino * erro +
    PESOS_DA_ATENCAO.naoIndependente * (estado.independenteConcluida ? 0 : 1)

  /*
    A IMPORTÂNCIA MODULA, e não decide. Um ramo `optional` que falhou três vezes
    numa partida real ainda importa mais que um `core` intocado — foi o tabuleiro
    real que disse isso, e ele ganha de qualquer classificação editorial.
  */
  const fator = importancia === 'core' ? 1 : importancia === 'secondary' ? 0.8 : 0.6
  return Math.min(bruto * fator, 1)
}

/**
 * Um ponto que continua falhando apesar das revisões (plano VNext §49).
 *
 * O CRITÉRIO É CONFIGURÁVEL porque é heurística, e heurística espalhada pelo
 * código é heurística que ninguém consegue recalibrar.
 *
 * "NÃO APENAS REPETIR MAIS" (§50): quem identifica um ponto resistente devolve
 * a informação, e quem decide o que fazer com ela é a tela — reaprender com
 * exemplo e contexto, não enfileirar a mesma pergunta de novo.
 */
export interface ConfigDePontoResistente {
  falhasEmRevisao: number
  desviosEmPartidaReal: number
}

export const RESISTENTE_CONFIG: ConfigDePontoResistente = {
  falhasEmRevisao: 3,
  desviosEmPartidaReal: 2,
}

export function ehPontoResistente(
  estado: EstadoDeAprendizadoDoRamo,
  config: ConfigDePontoResistente = RESISTENTE_CONFIG,
): boolean {
  return (
    estado.falhasEmRevisao >= config.falhasEmRevisao ||
    estado.desviosEmPartidaReal >= config.desviosEmPartidaReal
  )
}

/* -------------------------------------------------------------------------- */
/* A ponte com o progresso gravado                                            */
/* -------------------------------------------------------------------------- */

/**
 * Lê o estado de um ramo dentro do progresso da abertura.
 *
 * AUSÊNCIA VIRA ESTADO INICIAL, e não zero de desempenho. São coisas
 * diferentes: "nunca tentou" e "errou tudo" pedem decisões opostas do score.
 */
export function estadoDoRamoNoProgresso(
  progresso: { ramos?: Record<string, EstadoDeAprendizadoDoRamo> } | undefined,
  ramoId: string,
): EstadoDeAprendizadoDoRamo {
  return progresso?.ramos?.[ramoId] ?? estadoInicialDoRamo(ramoId)
}

/**
 * Devolve um progresso novo com o evento aplicado ao ramo.
 *
 * NÃO MUTA, e devolve o MESMO objeto quando nada mudou — é o que permite chamar
 * isto no caminho de escrita sem gravar um registro idêntico a cada visita.
 */
export function registrarEventoDeRamo<
  T extends { ramos?: Record<string, EstadoDeAprendizadoDoRamo> },
>(progresso: T, ramoId: string, evento: EventoDoRamo, agora: string): T {
  const antes = estadoDoRamoNoProgresso(progresso, ramoId)
  const depois = aplicarEventoDoRamo(antes, evento, agora)
  if (depois === antes) return progresso
  return { ...progresso, ramos: { ...(progresso.ramos ?? {}), [ramoId]: depois } }
}
