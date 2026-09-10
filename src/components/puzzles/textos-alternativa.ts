/**
 * O que a TELA de puzzles diz sobre um lance alternativo julgado (issue #17).
 *
 * DECISÃO QUE ESTE ARQUIVO CARREGA: nos três vereditos a tela FALA. O caso
 * `pior` desconta a maestria, e desconto silencioso é punição sem causa
 * aparente — o aluno veria o número andar devagar sem nunca saber por quê. O
 * caso `indeterminado` não desconta nada, e é justamente por isso que ele
 * precisa de frase: silêncio depois de um lance lê como aprovação, e o aluno
 * concluiria que o lance estava certo quando o que houve foi a máquina não
 * saber responder.
 *
 * SEGUNDA DECISÃO: a frase carrega NÚMERO CONFERÍVEL. "Não foi o melhor" não
 * ensina nada e não é auditável. "Custa 6,4 pontos percentuais, e a tolerância
 * é 3" diz o que a conta fez, com o mesmo limiar que o código usou — lido de
 * `AlternativaConfig`, não copiado para cá.
 *
 * `Record` sobre as uniões do domínio, e não `switch` com `default`: veredito
 * ou motivo novo NÃO COMPILA até alguém escrever o que a tela diz dele. Com
 * `default`, o caso novo cairia na frase mais parecida, em silêncio.
 */

import { ALTERNATIVA_CONFIG, type AlternativaConfig } from '@/domain/puzzles'
import type {
  MotivoIndeterminado,
  PuzzleAlternativaRegistro,
  VereditoAlternativa,
} from '@/domain/types'

/** Cabeçalho do bloco: ícone + rótulo. Status nunca depende só de cor. */
export interface ApresentacaoDaAlternativa {
  icone: string
  rotulo: string
}

export const APRESENTACAO_DA_ALTERNATIVA: Record<VereditoAlternativa, ApresentacaoDaAlternativa> = {
  // O rótulo diz as DUAS metades onde elas existem. Só "acertou" apagaria o
  // desconto; só "não é o melhor" faria o aluno ler reprovação onde houve
  // acerto — e nenhuma das duas leituras é verdade.
  equivalente: { icone: '=', rotulo: 'Outra linha, mesmo valor' },
  pior: { icone: '≈', rotulo: 'Ganha, mas não é o melhor lance' },
  indeterminado: { icone: '?', rotulo: 'Não deu para confirmar este lance' },
}

/**
 * Por que não deu para comparar, em uma frase.
 *
 * Nenhuma delas culpa o jogador: o que falhou foi a conferência. Dizer "seu
 * lance é inválido" quando o defeito é nosso (FEN podre, linha do dataset
 * ilegal) seria acusar o aluno de um problema do app.
 */
export const FRASE_DO_MOTIVO: Record<MotivoIndeterminado, string> = {
  'fen-invalido': 'a posição guardada para este puzzle não pôde ser lida',
  'lance-do-jogador-ilegal': 'não foi possível reproduzir seu lance nesta posição',
  'lance-esperado-ilegal': 'a linha guardada para este puzzle não fecha nesta posição',
  'avaliacao-falhou': 'a análise não completou',
  'avaliacao-ausente': 'a análise não respondeu',
  'avaliacao-nao-confiavel': 'a análise voltou sem um número comparável',
}

/** Número com uma casa, em vírgula: é assim que ele se lê em português. */
function pp(valor: number): string {
  return valor.toFixed(1).replace('.', ',')
}

/**
 * A frase de um julgamento.
 *
 * `uciEsperado` é o lance da linha do dataset naquele ponto, e vem de quem
 * chama: depois que a alternativa é aceita a tentativa não guarda mais o
 * índice de onde ela aconteceu. `null` só tira o nome do lance da frase — o
 * número continua lá.
 */
export function descreverAlternativa(
  registro: PuzzleAlternativaRegistro,
  uciEsperado: string | null,
  config: AlternativaConfig = ALTERNATIVA_CONFIG,
): string {
  const tolerancia = pp(config.toleranciaPp)
  const contra = uciEsperado === null ? 'a linha do problema' : uciEsperado

  if (registro.veredito === 'indeterminado') {
    // O domínio sempre preenche o motivo neste veredito. A alternativa existe
    // para a frase nunca sair truncada se isso mudar.
    const motivo =
      registro.motivo === undefined
        ? 'a conferência não foi possível'
        : FRASE_DO_MOTIVO[registro.motivo]
    return (
      `Você jogou ${registro.uci} e ${motivo}. Não conta como erro e também não conta ` +
      'como acerto: a posição continua como estava, e você pode jogar de novo.'
    )
  }

  // Lance aceito SEMPRE traz número — inclusive o zero de quando as duas linhas
  // dão na mesma posição. A ausência é tratada porque o tipo GRAVADO permite
  // ela: um registro vindo de backup editado à mão não pode quebrar a frase.
  const margem = registro.margemPp === undefined ? null : pp(registro.margemPp)

  if (registro.veredito === 'equivalente') {
    return margem === null
      ? `Você jogou ${registro.uci}, que leva à mesma posição de ${contra}. Conta como acerto.`
      : `Você jogou ${registro.uci} em vez de ${contra}. A análise põe os dois no mesmo ` +
          `patamar: ${margem} de perda em pontos percentuais de pontuação esperada, abaixo da ` +
          `tolerância de ${tolerancia}. Conta como acerto.`
  }

  return (
    `Você jogou ${registro.uci}, que também ganha. Comparado com ${contra}, ele custa ` +
    `${margem ?? '—'} em pontos percentuais de pontuação esperada, acima da tolerância de ` +
    `${tolerancia}. Conta como acerto com desconto: o melhor lance é o que carrega o espírito ` +
    'do problema.'
  )
}
