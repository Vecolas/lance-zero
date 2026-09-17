/**
 * Os ITENS de cada etapa da jornada de um final.
 *
 * ESTE ARQUIVO É A FONTE ÚNICA DO CONTRATO regra↔tela. A regra de conclusão da
 * etapa nasce da CONTAGEM do que esta função devolve (`descritores()` em
 * `jornada.ts`), e a tela renderiza exatamente esta lista
 * (`ItensDaEtapaDeFinal`). Uma etapa não tem como cobrar o que ela não produz, e
 * a tela não tem como oferecer o que a regra não conta — é uma coisa só, olhada
 * de dois lados.
 *
 * O DEFEITO QUE ISSO APAGA: antes, `descritores()` cravava
 * `{ tipo: 'itens', total: 1 }` para `reconhecer`, `variacoes` e `dois-lados`, e
 * a tela dessas etapas desenhava prosa e tabuleiro estático. O aluno ficava
 * preso na etapa 2 de 10 dos vinte finais do catálogo, sem nada para clicar e
 * sem uma linha no console. Ver `@/domain/jornada/exigencia`.
 *
 * A TABELA É EXAUSTIVA por `EtapaDeFinal`, e as seis etapas de leitura aparecem
 * devolvendo `[]` DE PROPÓSITO: etapa nova sem decisão aqui não compila, em vez
 * de cair num `default` que devolve lista vazia e vira leitura em silêncio.
 *
 * POR QUE O EXERCÍCIO É UM LANCE NO TABULEIRO, e não um quiz gerado: distrator
 * inventado por máquina ensina errado, e o catálogo já repete a MESMA pergunta
 * de reconhecimento nos vinte finais. Jogar um lance na posição é prática de
 * verdade, não depende de texto novo por final, e honra a regra que a jornada de
 * finais existe para afirmar — em final não existe "fora do repertório": todo
 * lance que preserva o resultado está certo. Como a regra da etapa é `itens`,
 * RESPONDER conclui; errar comenta e nunca reprova. Só o treino final reprova.
 *
 * PUREZA: nada aqui chama relógio, rede, tablebase ou engine.
 */

import type { EndgamePosition } from './catalogo'
import type { EtapaDeFinal } from './etapas'
import {
  admiteDefesa,
  papelDaPosicao,
  posicaoPrincipal,
  posicoesDeAtaque,
  posicoesDeDefesa,
  type ConteudoDoFinal,
  type PapelDoAluno,
} from './papeis'

/**
 * Um item de etapa de final.
 *
 * O `id` é derivado do CONTEÚDO (a posição, o índice da pergunta na lição) e
 * nunca de um contador de quantos já foram respondidos. `registrarItem`
 * deduplica por id, e um id vindo de contador paralelo repetiria na retomada —
 * a etapa fecharia em menos itens do que promete, sem erro nenhum.
 */
export type ItemDeFinal =
  /** Pergunta de múltipla escolha escrita na lição do final. */
  | {
      id: string
      tipo: 'pergunta'
      pergunta: string
      opcoes: readonly string[]
      correta: number
      explicacao: string
    }
  /** Jogue o primeiro lance desta posição. Errar NÃO reprova. */
  | {
      id: string
      tipo: 'lance'
      posicao: EndgamePosition
      papel: PapelDoAluno
      enunciado: string
      /**
       * A dica, quando a etapa ainda oferece apoio.
       *
       * `null` é a decisão de não dar dica, ESCRITA — diferente de esquecer. É o
       * que faz a ajuda desvanecer entre `variacoes`/`dois-lados` (sem apoio) e
       * `pratica-guiada` (último degrau com apoio), em vez de a diferença
       * depender de cada tela lembrar dela.
       */
      dica: string | null
    }

/**
 * A dica da prática guiada, por papel.
 *
 * NÍVEL 1 DA ESCADA (categoria de pensamento). Ela nunca nomeia peça, casa nem
 * lance: entregar o lance no primeiro degrau transformaria a prática guiada em
 * cópia, e o degrau seguinte da jornada — o treino — mediria memória em vez de
 * técnica. Ver a escada em `docs/PEDAGOGY.md`.
 */
const DICA_POR_PAPEL: Record<PapelDoAluno, string> = {
  atacante:
    'Antes de calcular: o que decide esta posição, e qual das suas peças está pior colocada?',
  defensor:
    'Aqui empatar é vitória. Pergunte o que o adversário PRECISA conseguir — e negue exatamente isso.',
}

/** As perguntas que a lição escreveu. São as que o aluno RESPONDE. */
function perguntasDaLicao(conteudo: ConteudoDoFinal): ItemDeFinal[] {
  const itens: ItemDeFinal[] = []
  ;(conteudo.passosDaLicao ?? []).forEach((passo, indice) => {
    if (passo.type !== 'recognition' && passo.type !== 'decision') return
    itens.push({
      // O índice é o do PASSO na lição, não o da posição na lista filtrada:
      // acrescentar um passo de texto antes não remexe os ids já gravados.
      id: `pergunta:${indice}`,
      tipo: 'pergunta',
      pergunta: passo.question,
      opcoes: passo.options,
      correta: passo.answer,
      explicacao: passo.explanation,
    })
  })
  return itens
}

function itemDeLance(
  etapa: EtapaDeFinal,
  posicao: EndgamePosition,
  enunciado: string,
  dica: string | null,
): ItemDeFinal {
  const papel = papelDaPosicao(posicao)
  return {
    // Etapa no id porque a MESMA posição aparece em mais de uma etapa, e o id
    // precisa distinguir os itens DENTRO dela. Papel porque a mesma posição pode
    // ser jogada dos dois lados sem que uma resposta valha pela outra.
    id: `${etapa}:${posicao.id}:${papel}`,
    tipo: 'lance',
    posicao,
    papel,
    enunciado,
    dica,
  }
}

/**
 * Os itens de UMA etapa.
 *
 * Devolve `[]` para as etapas de leitura. Quem transforma isso em regra é
 * `regraDeItens`, que faz lista vazia virar `{ tipo: 'leitura' }` — nunca
 * `{ tipo: 'itens', total: 0 }`, que passaria por acidente.
 */
export function itensDaEtapaDeFinal(
  etapa: EtapaDeFinal,
  conteudo: ConteudoDoFinal,
): readonly ItemDeFinal[] {
  switch (etapa) {
    case 'reconhecer':
      // Pode ser vazio: um final sem pergunta escrita tem uma etapa de leitura
      // honesta, e não uma cobrança impossível. O portão guarda a lista dos que
      // estão nesse estado, para a dívida ser declarada em vez de esquecida.
      return perguntasDaLicao(conteudo)

    case 'variacoes':
      // A PRIMEIRA POSIÇÃO FICA DE FORA: ela é a que o aluno acabou de ver na
      // demonstração. Variação é o que MUDA, e repetir a mesma FEN aqui mediria
      // memória da tela anterior.
      return conteudo.posicoes
        .slice(1)
        .map((posicao) =>
          itemDeLance(
            etapa,
            posicao,
            'A mesma técnica, outra disposição de peças. Jogue o primeiro lance que você jogaria aqui.',
            null,
          ),
        )

    case 'dois-lados': {
      const itens: ItemDeFinal[] = []
      const ataque = posicoesDeAtaque(conteudo)[0]
      if (ataque) {
        itens.push(
          itemDeLance(etapa, ataque, 'Pelo lado forte: jogue o primeiro lance da conversão.', null),
        )
      }
      // O lado fraco entra só quando o final TEM defesa. Em rei e torre contra
      // rei sozinho não existe lado fraco com escolhas, e pedir um lance
      // defensivo ali seria exigir o que a posição não oferece. No extremo
      // oposto — Philidor, bispos de cores opostas — não existe lado FORTE para
      // o aluno, e a etapa fica com o único lado que a posição tem.
      const defesa = admiteDefesa(conteudo) ? posicoesDeDefesa(conteudo)[0] : undefined
      if (defesa) {
        itens.push(
          itemDeLance(
            etapa,
            defesa,
            'Agora pelo lado fraco: jogue o primeiro lance de quem precisa segurar.',
            null,
          ),
        )
      }
      return itens
    }

    case 'pratica-guiada': {
      // A posição PRINCIPAL, e não a de ataque: num final defensivo o degrau
      // guiado treina a defesa. Ler `posicoesDeAtaque` aqui devolvia lista vazia
      // para Philidor, e a etapa degradava para leitura em silêncio — uma etapa
      // interativa a menos, sem ninguém decidir isso.
      const posicao = posicaoPrincipal(conteudo)
      if (!posicao) return []
      return [
        itemDeLance(
          etapa,
          posicao,
          'Execute a técnica. Este é o último degrau com apoio: a dica está disponível, e no treino ela some.',
          DICA_POR_PAPEL[papelDaPosicao(posicao)],
        ),
      ]
    }

    // As etapas de leitura, escritas uma a uma em vez de um `default`: etapa
    // nova sem decisão aqui reprova no compilador, em vez de virar leitura sem
    // ninguém ter decidido isso.
    case 'visao':
    case 'principio':
    case 'demonstracao':
    case 'progredir':
    case 'defender':
      return []

    // O treino final é de COBERTURA, não de itens: ele reprova, e a regra que
    // reprova mora num lugar só.
    case 'treino-final':
      return []

    default:
      return etapaNaoTratada(etapa)
  }
}

function etapaNaoTratada(etapa: never): never {
  throw new Error(`Etapa de final sem decisão sobre itens: ${JSON.stringify(etapa)}`)
}
