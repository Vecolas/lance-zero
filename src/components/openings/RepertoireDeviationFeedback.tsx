'use client'

/**
 * FORA DO REPERTÓRIO — a identidade própria do erro de abertura.
 *
 * ESTE COMPONENTE EXISTE PARA DIZER UMA COISA DIFÍCIL SEM MENTIR.
 *
 * No treino de abertura, qualquer lance que sai do repertório estudado encerra
 * a rodada — mesmo que o lance seja bom no xadrez, mesmo que a engine aprove,
 * mesmo que outra escola de abertura o jogue. O objetivo do modo é consolidar
 * UM repertório específico, e sair dele falha nesse objetivo.
 *
 * Mas chamar isso de "blunder" seria falso, e o aluno percebe. Um jogador que
 * joga 5.Cc3 numa posição onde o repertório pede 5.d4 não jogou mal; ele jogou
 * OUTRA COISA. Se o app disser "erro grave", ele aprende que o app não entende
 * xadrez — e passa a desconfiar também quando o app estiver certo.
 *
 * Por isso a separação é estrutural aqui: `consequenciaEnxadristica` é um campo
 * SEPARADO e opcional. O painel diz sempre "saiu do repertório"; só diz "e além
 * disso perde material" quando isso for verdade e tiver sido verificado. Juntar
 * as duas coisas num texto só é como um app perde a autoridade que precisa ter
 * para ensinar.
 *
 * O TOM É DE ATENÇÃO, não de punição (plano §129): sem vermelho de perigo, sem
 * "péssimo", sem ponto de exclamação.
 */

import styles from './RepertoireDeviationFeedback.module.css'

export interface RepertoireDeviationFeedbackProps {
  /** O lance que o aluno jogou, em notação curta. */
  sanJogado: string
  /** O lance que o repertório prevê ali. */
  sanEsperado?: string
  /** Nome da linha que estava sendo consolidada. */
  linha?: string
  /**
   * O que o lance custa NO TABULEIRO, quando isso foi de fato verificado.
   *
   * Opcional de propósito: ausente significa "não sei", e não "não custa nada".
   * Afirmar consequência enxadrística sem ter conferido é o motivo inventado
   * que o CLAUDE.md proíbe.
   */
  consequenciaEnxadristica?: string
  aoReaprender?: () => void
}

export function RepertoireDeviationFeedback({
  sanJogado,
  sanEsperado,
  linha,
  consequenciaEnxadristica,
  aoReaprender,
}: RepertoireDeviationFeedbackProps) {
  return (
    <div className={styles.painel}>
      <p className={styles.rotulo}>
        <span className={styles.icone} aria-hidden="true">
          ↗
        </span>
        FORA DO REPERTÓRIO
      </p>

      <p className={styles.texto}>
        Você jogou <strong>{sanJogado}</strong>. Esse lance pode ser jogável, mas não pertence ao
        repertório{linha ? ` da ${linha}` : ''} que você está consolidando nesta abertura.
      </p>

      {sanEsperado ? (
        <p className={styles.texto}>
          O repertório estudado continua com <strong>{sanEsperado}</strong>.
        </p>
      ) : null}

      <details className={styles.porque}>
        <summary>Por que isso encerra a rodada?</summary>
        <p className={styles.texto}>
          No treino estamos verificando se você consegue recuperar o repertório estudado. Sair dele
          encerra esta rodada mesmo quando o lance é aceitável no xadrez — o que está sendo medido
          aqui é a recuperação da linha, não a qualidade objetiva do lance.
        </p>
      </details>

      {consequenciaEnxadristica ? (
        <div className={styles.consequencia}>
          {/*
            Seção SEPARADA, e só quando houve verificação. É a diferença entre
            "saiu do repertório" e "jogou mal" — duas afirmações distintas que o
            produto não pode fundir sem perder a confiança do aluno.
          */}
          <p className={styles.consequenciaTitulo}>Consequência enxadrística</p>
          <p className={styles.texto}>{consequenciaEnxadristica}</p>
        </div>
      ) : null}

      {aoReaprender ? (
        <button type="button" className={styles.acao} onClick={aoReaprender}>
          Reaprender esta posição
        </button>
      ) : null}
    </div>
  )
}
