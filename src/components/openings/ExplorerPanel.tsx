'use client'

/**
 * O caminho da estatística do Opening Explorer, e a única parte desta tela que
 * fala com a rede.
 *
 * DECISÃO 1 — A TELA NASCE SEM ESTATÍSTICA, e este painel é opcional por dentro,
 * não só por fora (issue #71). Em 2026-09-09 e 2026-09-10, de duas máquinas
 * diferentes, `explorer.lichess.ovh` respondeu **401 a requisições anônimas**,
 * enquanto a tablebase respondeu 200 pelo MESMO caminho de rede. Consultar
 * sozinho, a cada render, gastaria dados de quem está no celular numa
 * requisição que sabemos que falha. Por isso a consulta é POR PEDIDO: o aluno
 * escolhe a posição e clica. No dia em que o acesso voltar, o mesmo botão passa
 * a devolver estatística sem uma linha de código mudar — é isso que "liga
 * sozinho" quer dizer aqui.
 *
 * DECISÃO 2 — O MOTIVO DA FALHA É DITO, E ELE MUDA A INTERFACE. Não é só texto
 * diferente: `timeout` ganha um botão de tentar de novo e `sem-autorizacao` NÃO
 * ganha, porque insistir não resolve e o aluno não tem como saber disso.
 * `podeTentarDeNovo` é derivado de `MOTIVOS_PASSAGEIROS` — a regra mora num
 * lugar só.
 *
 * DECISÃO 3 — AUSÊNCIA DE ESTATÍSTICA NUNCA VIRA "ESTA POSIÇÃO NÃO TEM
 * PARTIDAS". É o defeito que o adapter foi desenhado para evitar, e o único
 * lugar do app onde ele ainda poderia ser cometido é aqui. A frase de "nenhuma
 * partida chegou a esta posição" só é alcançável no ramo em que
 * `estatisticas !== null` — ou seja, quando o serviço respondeu de verdade.
 *
 * DECISÃO 4 — O TRANSPORTE É INJETÁVEL. Em produção nasce um
 * `LichessExplorerProvider` sobre o `fetch` global; no teste entra um dublê.
 * É o que permite cobrir os sete motivos de falha sem rede — e é ponto cego
 * declarado, porque o explorer NUNCA respondeu 200 para nós: o formato da
 * resposta é conhecimento de documentação, não fato observado.
 *
 * DECISÃO 5 — FALHA AO MONTAR A CONSULTA NÃO SE DISFARÇA DE FALHA DO SERVIÇO.
 * `consultar` lança para FEN inválido (bug nosso). Traduzir isso em
 * `resposta-invalida` culparia a Lichess por um erro daqui, e o console ficaria
 * limpo. Ela tem estado próprio.
 */

import { useCallback, useId, useMemo, useState } from 'react'
import {
  FILTRO_PADRAO,
  LichessExplorerProvider,
  participacaoDe,
  type RespostaDoExplorer,
} from '@/lib/openings'
import type { ExplorerFilters } from '@/domain/types'
import {
  APRESENTACAO_POR_INDISPONIBILIDADE,
  AVISO_DE_FREQUENCIA,
  descreverFiltro,
  participacaoLegivel,
  placarLegivel,
  podeTentarDeNovo,
  SEM_PARTIDAS_NA_POSICAO,
} from './textos'
import styles from './ExplorerPanel.module.css'

/** A consulta, reduzida ao que este painel usa. Injetável para o teste. */
export type ConsultaDoExplorer = (
  fen: string,
  filtros: ExplorerFilters,
) => Promise<RespostaDoExplorer>

/** Uma posição consultável, já rotulada pela tela. */
export interface PosicaoConsultavel {
  /** Identidade da posição. Serve de valor do `select` e de chave. */
  identidade: string
  /** FEN carregável, derivado da identidade pela árvore. */
  fen: string
  /** Como o aluno reconhece a posição: `1. e4 e5 2. Nf3`. */
  rotulo: string
}

export interface ExplorerPanelProps {
  posicoes: readonly PosicaoConsultavel[]
  /** Injetado no teste; ausente em produção, quando o adapter real é criado aqui. */
  consultar?: ConsultaDoExplorer
}

type Estado =
  | { tipo: 'inicial' }
  | { tipo: 'consultando' }
  | { tipo: 'respondeu'; resposta: RespostaDoExplorer }
  | { tipo: 'falha-local'; mensagem: string }

export function ExplorerPanel({ posicoes, consultar }: ExplorerPanelProps) {
  const idBase = useId()
  const [escolhida, setEscolhida] = useState<string>(posicoes[0]?.identidade ?? '')
  const [estado, setEstado] = useState<Estado>({ tipo: 'inicial' })

  /**
   * O adapter real, criado uma vez. Fora do `useMemo` ele nasceria de novo a
   * cada render e o cache dele — que existe para não repetir requisição —
   * nunca guardaria nada.
   */
  const consultaPadrao = useMemo<ConsultaDoExplorer>(() => {
    const provider = new LichessExplorerProvider({
      fetchFn: (...args) => globalThis.fetch(...args),
    })
    return (fen, filtros) => provider.consultar(fen, filtros)
  }, [])

  const consulta = consultar ?? consultaPadrao
  const posicao = posicoes.find((p) => p.identidade === escolhida) ?? posicoes[0] ?? null

  const consultarAgora = useCallback(async () => {
    if (posicao === null) {
      return
    }
    setEstado({ tipo: 'consultando' })
    try {
      const resposta = await consulta(posicao.fen, FILTRO_PADRAO)
      setEstado({ tipo: 'respondeu', resposta })
    } catch (e) {
      setEstado({
        tipo: 'falha-local',
        mensagem:
          e instanceof Error
            ? `Não consegui montar a consulta desta posição: ${e.message}`
            : 'Não consegui montar a consulta desta posição.',
      })
    }
  }, [consulta, posicao])

  if (posicao === null) {
    return null
  }

  return (
    <div className={styles.painel}>
      <h4 className={styles.titulo}>O que o mundo joga (opcional)</h4>
      <p className={styles.aviso}>
        Nada acima depende disto. O explorador da Lichess é enriquecimento: o repertório, as ideias
        e a frequência das suas partidas funcionam com ele fora do ar.
      </p>

      <div className={styles.controles}>
        <label className={styles.rotulo} htmlFor={`${idBase}-posicao`}>
          Posição
        </label>
        <select
          id={`${idBase}-posicao`}
          className={styles.select}
          value={posicao.identidade}
          onChange={(evento) => {
            setEscolhida(evento.target.value)
            // Resposta de outra posição não pode ficar na tela ao lado do novo
            // rótulo: seria estatística verdadeira apresentada como sendo de
            // uma posição em que ela nunca foi medida.
            setEstado({ tipo: 'inicial' })
          }}
        >
          {posicoes.map((opcao) => (
            <option key={opcao.identidade} value={opcao.identidade}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles.botao}
          onClick={() => void consultarAgora()}
          disabled={estado.tipo === 'consultando'}
        >
          {estado.tipo === 'consultando' ? 'Consultando…' : 'Consultar o explorador'}
        </button>
      </div>

      <p className={styles.filtro}>{descreverFiltro(FILTRO_PADRAO)}</p>

      <div className={styles.resultado} role="status">
        <Resultado estado={estado} onTentarDeNovo={() => void consultarAgora()} />
      </div>
    </div>
  )
}

function Resultado({ estado, onTentarDeNovo }: { estado: Estado; onTentarDeNovo: () => void }) {
  if (estado.tipo === 'inicial') {
    return <p className={styles.neutro}>Nenhuma consulta feita nesta posição.</p>
  }

  if (estado.tipo === 'consultando') {
    return <p className={styles.neutro}>Consultando o explorador…</p>
  }

  if (estado.tipo === 'falha-local') {
    return (
      <p className={styles.ruim}>
        <span aria-hidden="true">✕</span> {estado.mensagem}
      </p>
    )
  }

  const { estatisticas, indisponivel } = estado.resposta

  if (indisponivel !== null) {
    const apresentacao = APRESENTACAO_POR_INDISPONIBILIDADE[indisponivel]
    return (
      <div className={styles[apresentacao.tom]}>
        <p className={styles.chip}>
          <span aria-hidden="true">{apresentacao.icone}</span> {apresentacao.rotulo}
        </p>
        <p className={styles.frase}>{apresentacao.frase}</p>
        {podeTentarDeNovo(indisponivel) ? (
          <button type="button" className={styles.botao} onClick={onTentarDeNovo}>
            Consultar de novo
          </button>
        ) : null}
      </div>
    )
  }

  if (estatisticas === null) {
    // O adapter garante que um dos dois campos é não-nulo. Se os dois vierem
    // nulos, o contrato quebrou — e dizer isso é melhor que desenhar o vazio.
    return (
      <p className={styles.ruim}>
        <span aria-hidden="true">✕</span> O explorador devolveu uma resposta que não sei
        interpretar.
      </p>
    )
  }

  if (estatisticas.total === 0) {
    return (
      <p className={styles.neutro}>
        <span aria-hidden="true">·</span> {SEM_PARTIDAS_NA_POSICAO}
      </p>
    )
  }

  return (
    <div>
      <p className={styles.placar}>{placarLegivel(estatisticas)}</p>
      <ul className={styles.lances}>
        {estatisticas.lances.map((lance) => (
          <li key={lance.uci} className={styles.lance}>
            <span className={styles.san}>{lance.san}</span>
            <span className={styles.participacao}>
              {participacaoLegivel(participacaoDe(lance, estatisticas), estatisticas.total)}
            </span>
            <span className={styles.detalhe}>{placarLegivel(lance)}</span>
          </li>
        ))}
      </ul>
      <p className={styles.frase}>{AVISO_DE_FREQUENCIA}</p>
    </div>
  )
}
