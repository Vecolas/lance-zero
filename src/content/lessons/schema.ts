/**
 * Esquema de microlição.
 *
 * A REGRA DO PEDAGOGY QUE ESTE ARQUIVO EXISTE PARA IMPEDIR DE QUEBRAR: toda
 * lição termina em RECUPERAÇÃO ATIVA, nunca em texto solto. Ler a explicação
 * uma segunda vez não ensina; tentar responder ensina.
 *
 * E ela é impedida na FORMA, não cobrada num portão depois. Três travas, e cada
 * uma pega o que a anterior deixa passar:
 *
 * 1. `recuperacao` é uma TUPLA NÃO-VAZIA. Uma lição com a lista vazia não
 *    compila — o erro aparece enquanto se escreve o conteúdo, não no CI.
 * 2. `Licao` é um tipo MARCADO. Nenhum objeto literal satisfaz o tipo: a única
 *    forma de produzir uma lição é `definirLicao`, que confere no ato. Sem a
 *    marca, alguém montaria a lição na mão e furaria a trava 1 com um `as`.
 * 3. A ORDEM das etapas é derivada de `ETAPAS_DA_LICAO`, uma lista só, e a
 *    recuperação é a última. Nenhuma tela escolhe a ordem por conta própria,
 *    então não existe a tela que mostra o exercício antes do conceito nem a que
 *    termina no texto.
 *
 * A segunda regra do PEDAGOGY que a forma carrega: RECUPERAÇÃO ANTES DA
 * EXPLICAÇÃO. O enunciado do exercício não nomeia o tema, e a explicação só
 * existe depois da resposta — por isso ela é campo do exercício e não do
 * enunciado. Dizer "garfo" antes destrói exatamente o que a etapa mede.
 *
 * DÍVIDA DECLARADA: um esquema não é conteúdo e deveria morar em
 * `src/domain/lessons/`. Ele está aqui porque esta rodada de trabalho só podia
 * criar `src/domain/diagnostic/` e `src/content/lessons/`. Está relatado.
 */

import {
  avaliarLance,
  verificarExercicio,
  type ExercicioPosicional,
  type FalhaDeItem,
  type NaoVazia,
  type ObjetivoDeDiagnostico,
} from '@/domain/diagnostic'
import { applyMove, normalizeUci, parseUci } from '@/lib/chess'
import type { SkillId, Side } from '@/domain/types'

/**
 * Números das lições.
 *
 * HEURÍSTICA DE PRODUTO: os minutos servem para a tela dimensionar a lição
 * antes de existir telemetria. Recalibrar com o tempo real medido, não com
 * opinião.
 */
export const LICAO_CONFIG = {
  /** Minutos estimados de leitura do conceito e do exemplo resolvido. */
  minutosDeLeitura: 2,
  /** Minutos estimados por exercício de recuperação. */
  minutosPorExercicio: 2,
} as const

export type LicaoConfig = Record<keyof typeof LICAO_CONFIG, number>

/**
 * A ORDEM das etapas de uma lição. É a FONTE, e a última é a recuperação.
 *
 * Uma tela que quisesse outra ordem teria de mexer aqui, onde o portão olha —
 * em vez de mexer no JSX, onde ninguém olharia.
 */
export const ETAPAS_DA_LICAO = ['conceito', 'exemplo', 'recuperacao'] as const

export type EtapaDaLicao = (typeof ETAPAS_DA_LICAO)[number]

/**
 * Exercício de recuperação: o aluno responde SEM dica e sem o tema na tela.
 *
 * Herda `ExercicioPosicional` porque a prova de que ele é conferível é a mesma
 * do banco de diagnóstico, e ela mora num lugar só.
 */
export interface ExercicioDeRecuperacao extends ExercicioPosicional {
  /** O que se pede, em uma frase. NÃO nomeia o tema. */
  enunciado: string
  /** O que o exercício ensina. Só aparece DEPOIS da resposta. */
  explicacao: string
}

/**
 * Exemplo resolvido: a solução à mostra, de propósito.
 *
 * É o "guidance" que o PEDAGOGY manda começar forte e desvanecer. O aluno vê a
 * linha inteira aqui, e depois responde sozinho na etapa seguinte.
 */
export interface ExemploResolvido {
  fen: string
  ladoDoAluno: Side
  objetivo: ObjetivoDeDiagnostico
  /**
   * Linha em UCI a partir de `fen`, alternando os lados e começando pelo aluno.
   * O PRIMEIRO lance é o que cumpre o objetivo, e é ele que o portão confere.
   */
  linhaModelo: NaoVazia<string>
  /** Por que a linha funciona, em uma ou duas frases. */
  comentario: string
}

/**
 * Marca de validação. NÃO é exportada de propósito: sem acesso à chave, nenhum
 * módulo de fora consegue montar um objeto que satisfaça `Licao` — o único
 * caminho é `definirLicao`.
 */
const LICAO_VALIDADA: unique symbol = Symbol('licao-validada')

export interface Licao {
  readonly [LICAO_VALIDADA]: true
  /** Único no catálogo. */
  id: string
  titulo: string
  /** Habilidade do catálogo que esta lição treina. */
  habilidade: SkillId
  /** O conceito em uma ou duas frases. Não é aula: é o que fica na cabeça. */
  conceito: string
  exemploResolvido: ExemploResolvido
  /** O FECHO. Tupla não-vazia: lição sem recuperação não existe. */
  recuperacao: NaoVazia<ExercicioDeRecuperacao>
}

/** Uma lição antes de passar pela validação. */
export type EntradaDeLicao = Omit<Licao, typeof LICAO_VALIDADA>

/**
 * Única forma de produzir uma `Licao`.
 *
 * LANÇA em vez de devolver erro: aqui quem erra é quem escreve o conteúdo, e o
 * módulo nem chega a carregar — a varredura de módulos e qualquer tela que
 * importe o catálogo acusam na hora. Erro de conteúdo que vira valor de retorno
 * é erro que alguém esquece de olhar.
 */
export function definirLicao(entrada: EntradaDeLicao): Licao {
  if (entrada.recuperacao.length === 0) {
    throw new Error(`Lição ${entrada.id} não termina em recuperação ativa.`)
  }
  const ids = entrada.recuperacao.map((exercicio) => exercicio.id)
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Lição ${entrada.id} repete o id de um exercício.`)
  }
  return { ...entrada, [LICAO_VALIDADA]: true }
}

/** Minutos estimados. Derivado na hora, nunca gravado no conteúdo. */
export function estimarMinutos(licao: Licao, config: LicaoConfig = LICAO_CONFIG): number {
  return config.minutosDeLeitura + licao.recuperacao.length * config.minutosPorExercicio
}

/**
 * As etapas da lição, na ordem em que a tela deve mostrá-las.
 *
 * A tela consome ISTO. Ela não monta a sequência por conta própria, e é por
 * isso que "termina em recuperação" vale para toda tela sem ninguém repetir a
 * regra em cada componente.
 */
export function etapasDaLicao(): readonly EtapaDaLicao[] {
  return ETAPAS_DA_LICAO
}

/** Problema encontrado numa lição. */
export type FalhaDeLicao = FalhaDeItem

/**
 * Confere uma lição inteira e devolve TODOS os problemas dela.
 *
 * O exemplo resolvido é conferido como o banco: o primeiro lance da linha tem
 * de CUMPRIR o objetivo declarado, e o resto da linha tem de ser jogável. Um
 * exemplo resolvido com linha ilegal é pior que nenhum exemplo — ele ensina
 * errado e parece certo.
 */
export function verificarLicao(licao: Licao): FalhaDeLicao[] {
  const falhas: FalhaDeLicao[] = []
  const exemplo = licao.exemploResolvido

  const veredito = avaliarLance(
    exemplo.fen,
    exemplo.ladoDoAluno,
    exemplo.linhaModelo[0],
    exemplo.objetivo,
  )
  if (!veredito.cumpre) {
    falhas.push({
      itemId: `${licao.id}/exemplo`,
      problema: `o exemplo resolvido não cumpre o objetivo: ${veredito.motivo}`,
    })
  }

  let fen = exemplo.fen
  for (const [indice, uci] of exemplo.linhaModelo.entries()) {
    const entrada = parseUci(normalizeUci(uci))
    const aplicado = entrada === null ? null : applyMove(fen, entrada)
    if (aplicado === null) {
      falhas.push({
        itemId: `${licao.id}/exemplo`,
        problema: `lance ${indice + 1} (${uci}) é ilegal em ${fen}`,
      })
      break
    }
    fen = aplicado.fenAfter
  }

  for (const exercicio of licao.recuperacao) {
    falhas.push(...verificarExercicio(exercicio))
  }

  return falhas
}
