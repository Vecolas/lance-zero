/**
 * Os QUATRO níveis de conclusão, e a proibição que eles existem para tornar
 * inexprimível.
 *
 * O BUG QUE ESTE ARQUIVO MATA, e vale escrever qual era, porque ele é o tipo de
 * defeito que parece um detalhe de texto e é um erro de modelo:
 *
 *     o aluno sai do repertório
 *     → a rodada termina
 *     → a tela mostra "Atividade concluída ✓"
 *
 * Em `OpeningCourse` a condição era `if (!result.nextNodeId || …) setDone(true)`
 * seguida de `completeOpeningActivity(...)`. E `!result.nextNodeId` é
 * exatamente o caso FORA DO REPERTÓRIO. Ou seja: o único caminho de ERRO era
 * também o caminho que marcava a atividade como concluída e gravava isso no
 * progresso.
 *
 * A causa não foi desatenção. Foi haver UM único conceito de "acabou" para
 * quatro coisas diferentes:
 *
 *   STEP    — terminei de ler/ver esta tela.
 *   ROUND   — esta rodada de jogo terminou. Pode ter terminado em ERRO.
 *   STAGE   — esta etapa da jornada cumpriu a regra dela.
 *   JOURNEY — a abertura/final inteiro foi estudado e treinado.
 *
 * "Rodada terminou" e "atividade concluída" são frases diferentes sobre fatos
 * diferentes, e colapsá-las num booleano `done` é o que produziu a mentira.
 *
 * A REGRA, afirmada como função pura e testável: `resultadoDeRodada` é a ÚNICA
 * porta entre round e stage, e uma rodada falha nunca atravessa.
 */

/**
 * Os níveis, do mais estreito ao mais amplo. A ORDEM É A LISTA — ninguém
 * redeclara a hierarquia em outro lugar.
 */
export const NIVEIS_DE_CONCLUSAO = ['step', 'round', 'stage', 'journey'] as const

export type NivelDeConclusao = (typeof NIVEIS_DE_CONCLUSAO)[number]

/**
 * Como uma rodada terminou.
 *
 * `falhou` é um DESFECHO DE PRIMEIRA CLASSE, e não a ausência de sucesso. É por
 * isso que existe como valor e não como `success: boolean` — um booleano
 * convida o chamador a tratar o caso falso como "não faz nada" e seguir em
 * frente, que é literalmente o que acontecia.
 */
export type DesfechoDaRodada = 'ativa' | 'sucesso' | 'falhou'

/**
 * O texto que o aluno lê quando a rodada termina.
 *
 * MORA AQUI, e não na tela, porque a proibição é sobre o TEXTO: nenhuma rodada
 * falha pode exibir "Atividade concluída". Deixar a frase no JSX faria a regra
 * depender de cada componente lembrar dela; aqui ela é derivada do desfecho, e
 * um portão consegue varrer todos os desfechos possíveis.
 */
export const TITULO_DA_RODADA: Record<Exclude<DesfechoDaRodada, 'ativa'>, string> = {
  sucesso: 'Rodada concluída',
  falhou: 'Rodada encerrada',
}

/**
 * Frases proibidas num desfecho de rodada.
 *
 * Existe para o portão ter o que varrer. "Atividade concluída" é a frase do
 * bug; as outras são as variações que alguém escreveria sem perceber que está
 * recriando o mesmo defeito com outras palavras.
 */
export const FRASES_PROIBIDAS_NA_RODADA = [
  'atividade concluída',
  'atividade concluida',
  'etapa concluída',
  'jornada concluída',
  'abertura concluída',
  'final concluído',
] as const

/**
 * A rodada terminou com sucesso?
 *
 * Função, e não comparação solta, porque é ela que o resto do domínio consulta.
 * Um `=== 'sucesso'` espalhado por dez chamadores é a mesma dispersão que criou
 * o problema.
 */
export function rodadaFoiSucesso(desfecho: DesfechoDaRodada): boolean {
  return desfecho === 'sucesso'
}

/** A rodada acabou, de qualquer maneira? Sucesso E falha encerram. */
export function rodadaTerminou(desfecho: DesfechoDaRodada): boolean {
  return desfecho !== 'ativa'
}

/**
 * O que uma rodada encerrada AUTORIZA no nível acima.
 *
 * ESTA É A TRAVA. Uma rodada que falhou devolve `avancaCobertura: false`, e a
 * cobertura é a única coisa que faz uma etapa de treino concluir. Não existe
 * caminho de código que transforme falha em conclusão sem mexer nesta função —
 * e mexer nela é visível numa revisão, diferente de um `||` no meio de um `if`.
 */
export interface EfeitoDaRodada {
  /** A rodada conta para a cobertura exigida pela etapa? */
  avancaCobertura: boolean
  /** O título que a tela mostra. Nunca "Atividade concluída". */
  titulo: string
}

export function efeitoDaRodada(desfecho: Exclude<DesfechoDaRodada, 'ativa'>): EfeitoDaRodada {
  return {
    avancaCobertura: rodadaFoiSucesso(desfecho),
    titulo: TITULO_DA_RODADA[desfecho],
  }
}
