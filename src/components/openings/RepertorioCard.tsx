'use client'

/**
 * Um repertório inteiro na tela: o princípio, as linhas com as ideias, o que
 * falta escrever e o que falta treinar.
 *
 * DECISÃO 1 — A IDEIA É O PRODUTO, e por isso ela não é detalhe escondido atrás
 * de clique. `CLAUDE.md` e a issue #10 dizem a mesma coisa: repertório sem ideia
 * é memorização, e memorização é explicitamente a experiência ERRADA para
 * ~1100. Toda linha desenhada aqui carrega a frase do lance — inclusive os
 * lances do ADVERSÁRIO, porque saber o que o outro lado está tentando é metade
 * do que falta a este jogador.
 *
 * DECISÃO 2 — LACUNA E DESVIO EM SEÇÕES SEPARADAS, com títulos, explicações e
 * AÇÕES diferentes. Ver DECISÃO 2 de `textos.ts`. Uma lista única de "fora do
 * livro" seria mais curta e destruiria o diagnóstico: as duas pedem coisas
 * opostas do aluno.
 *
 * DECISÃO 3 — SEM PARTIDA IMPORTADA, NENHUMA CONTAGEM APARECE. As seções de
 * lacuna e desvio só existem quando há partida lida. Mostrar "0 lacunas" com
 * zero partidas é afirmar que o repertório cobre tudo — a conclusão exatamente
 * oposta à verdade, e sem um erro no caminho.
 *
 * DECISÃO 4 — O REPERTÓRIO NÃO DEPENDE DO ARMAZENAMENTO. Aba anônima, permissão
 * negada, IndexedDB fora do ar: as linhas e as ideias aparecem do mesmo jeito, e
 * só o bloco de frequência diz que não conseguiu ler. O conteúdo é local e
 * versionado; travá-lo atrás do banco seria inventar uma dependência.
 *
 * DECISÃO 5 — CONFLITO DE CONTEÚDO APARECE. `construirRepertorio` devolve
 * `conflitos` em vez de lançar, e o portão de conteúdo exige lista vazia. Se
 * mesmo assim um conflito chegar aqui, a tela DIZ — em vez de desenhar um ramo
 * sem ideia, que é indistinguível de "ainda não carregou".
 */

import { useMemo } from 'react'
import { fenJogavelDe } from '@/lib/openings'
import {
  nosDeEstudo,
  type ArvoreDeRepertorio,
  type FrequenciaDeRepertorio,
  type SaidaDoLivro,
} from '@/domain/repertoire'
import { arvoreLegivel, type RamoLegivel } from './arvore-legivel'
import { ExplorerPanel, type ConsultaDoExplorer } from './ExplorerPanel'
import {
  APRESENTACAO_POR_SAIDA,
  caminhoLegivel,
  dataCurta,
  fraseDaSituacao,
  lanceComNumero,
  nomeDaAbertura,
  nomeDoLado,
  numeroDoLance,
  situacaoDaFrequencia,
  type TipoDeSaida,
} from './textos'
import styles from './RepertorioCard.module.css'

/**
 * O que a tela sabe sobre as partidas do aluno.
 *
 * União discriminada porque "ainda lendo" e "não consegui ler" precisam de
 * frases diferentes, e nenhum dos dois pode ser desenhado como "nenhuma
 * partida" — que é uma afirmação sobre os dados, não sobre a leitura.
 */
export type EstadoDasPartidas =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; frequencia: FrequenciaDeRepertorio }

export interface RepertorioCardProps {
  arvore: ArvoreDeRepertorio
  partidas: EstadoDasPartidas
  /** Injetada no teste. Ausente em produção: o painel cria o adapter real. */
  consultarExplorer?: ConsultaDoExplorer
}

export function RepertorioCard({ arvore, partidas, consultarExplorer }: RepertorioCardProps) {
  const linhas = useMemo(() => arvoreLegivel(arvore), [arvore])

  const posicoes = useMemo(
    () =>
      nosDeEstudo(arvore).map((no) => ({
        identidade: no.identidade,
        fen: fenJogavelDe(no.identidade),
        rotulo: `Depois de ${caminhoLegivel(no.caminhos[0] ?? [])}`,
      })),
    [arvore],
  )

  return (
    <section className={styles.card} aria-labelledby={`repertorio-${arvore.id}`}>
      <h2 className={styles.titulo} id={`repertorio-${arvore.id}`}>
        {arvore.titulo}
      </h2>
      <p className={styles.lado}>Você joga de {nomeDoLado(arvore.lado)}.</p>
      <p className={styles.principio}>{arvore.principio}</p>

      {arvore.conflitos.length > 0 ? (
        <p className={styles.ruim}>
          <span aria-hidden="true">✕</span> Este repertório tem{' '}
          {arvore.conflitos.length === 1 ? 'um problema' : `${arvore.conflitos.length} problemas`}{' '}
          de conteúdo: {arvore.conflitos.map((conflito) => conflito.mensagem).join(' ')}
        </p>
      ) : null}

      <h3 className={styles.secao}>As linhas</h3>
      <ListaDeRamos ramos={linhas} />

      <Frequencia arvore={arvore} partidas={partidas} />

      <ExplorerPanel posicoes={posicoes} consultar={consultarExplorer} />
    </section>
  )
}

function ListaDeRamos({ ramos }: { ramos: readonly RamoLegivel[] }) {
  if (ramos.length === 0) {
    return <p className={styles.neutro}>Este repertório não tem nenhuma linha escrita ainda.</p>
  }
  return (
    <ul className={styles.ramos}>
      {ramos.map((ramo) => (
        <li key={ramo.chave} className={styles.ramo}>
          <p className={styles.lance}>
            <span className={styles.san}>{lanceComNumero(ramo.nivel, ramo.san)}</span>
            <span className={ramo.doUsuario ? styles.meu : styles.dele}>
              <span aria-hidden="true">{ramo.doUsuario ? '●' : '○'}</span>{' '}
              {ramo.doUsuario ? 'seu lance' : 'lance do adversário'}
            </span>
          </p>

          {ramo.aberturaNova === null ? null : (
            <p className={styles.abertura}>
              {nomeDaAbertura(ramo.aberturaNova)} ({ramo.aberturaNova.eco})
            </p>
          )}

          {ramo.ideia.trim().length > 0 ? (
            <p className={styles.ideia}>{ramo.ideia}</p>
          ) : (
            <p className={styles.ruim}>
              <span aria-hidden="true">✕</span> Este lance está sem ideia escrita. Um lance sem
              ideia é memorização, e é o que este repertório recusa a ser.
            </p>
          )}

          {ramo.transposicaoDe === null ? null : (
            <p className={styles.transposicao}>
              <span aria-hidden="true">↔</span> Transposição: esta mesma posição já apareceu depois
              de {caminhoLegivel(ramo.transposicaoDe)}. É uma posição só, não duas para decorar.
            </p>
          )}

          {ramo.filhos.length > 0 ? <ListaDeRamos ramos={ramo.filhos} /> : null}
        </li>
      ))}
    </ul>
  )
}

function Frequencia({
  arvore,
  partidas,
}: {
  arvore: ArvoreDeRepertorio
  partidas: EstadoDasPartidas
}) {
  if (partidas.tipo === 'carregando') {
    return (
      <>
        <h3 className={styles.secao}>Nas suas partidas</h3>
        <p className={styles.neutro}>Lendo suas partidas importadas…</p>
      </>
    )
  }

  if (partidas.tipo === 'erro') {
    return (
      <>
        <h3 className={styles.secao}>Nas suas partidas</h3>
        <p className={styles.atencao}>
          <span aria-hidden="true">!</span> {partidas.mensagem} As linhas e as ideias acima não
          dependem disso e continuam válidas.
        </p>
      </>
    )
  }

  const { frequencia } = partidas
  const situacao = situacaoDaFrequencia(frequencia)

  return (
    <>
      <h3 className={styles.secao}>Nas suas partidas</h3>
      <p className={styles.situacao}>{fraseDaSituacao(situacao, arvore.lado)}</p>

      {situacao.tipo === 'com-partidas' ? (
        <>
          <Saidas tipo="lacuna" arvore={arvore} saidas={frequencia.lacunas} />
          <Saidas tipo="desvio" arvore={arvore} saidas={frequencia.desvios} />
        </>
      ) : null}
    </>
  )
}

/**
 * Uma das duas listas de saída do livro.
 *
 * O componente é UM porque a estrutura é a mesma; o que muda vem inteiro do
 * `Record` de apresentação. Dois componentes quase iguais divergiriam no dia em
 * que alguém consertasse um só — e o que NÃO pode acontecer é a fusão dos dois
 * conceitos, que o `tipo` obrigatório impede.
 */
function Saidas({
  tipo,
  arvore,
  saidas,
}: {
  tipo: TipoDeSaida
  arvore: ArvoreDeRepertorio
  saidas: readonly SaidaDoLivro[]
}) {
  const apresentacao = APRESENTACAO_POR_SAIDA[tipo]
  // O nome acessível não é enfeite: é o que dá às duas listas fronteiras
  // próprias para quem navega por região, e o que impede uma de ser lida como
  // continuação da outra.
  const tituloId = `saidas-${arvore.id}-${tipo}`

  return (
    <section className={styles.saidas} aria-labelledby={tituloId}>
      <h4 className={styles.tituloDaSaida} id={tituloId}>
        <span aria-hidden="true">{apresentacao.icone}</span> {apresentacao.titulo}
      </h4>
      <p className={styles.explicacao}>{apresentacao.explicacao}</p>

      {saidas.length === 0 ? (
        // O texto do vazio vem do `Record`, e não de um `if` aqui: o componente
        // não pode conhecer os dois tipos por dentro, senão o terceiro nasceria
        // com a frase de um deles.
        <p className={styles.neutro}>{apresentacao.vazio}</p>
      ) : (
        <>
          <p className={styles.acao}>
            <strong>O que fazer:</strong> {apresentacao.acao}
          </p>
          <ol className={styles.listaDeSaidas}>
            {saidas.map((saida) => (
              <li key={`${saida.origem}|${saida.san}`} className={styles[apresentacao.tom]}>
                <LinhaDaSaida arvore={arvore} saida={saida} />
                <p className={styles.contagem}>{apresentacao.frase(saida.partidas)}</p>
                <Quando saida={saida} />
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}

/** Onde a partida saiu: o caminho até ali e o lance jogado, com o número certo. */
function LinhaDaSaida({ arvore, saida }: { arvore: ArvoreDeRepertorio; saida: SaidaDoLivro }) {
  const no = arvore.nos.get(saida.origem)
  const caminho = no?.caminhos[0] ?? []
  return (
    <p className={styles.lance}>
      <span className={styles.san}>
        {numeroDoLance(caminho.length)} {saida.san}
      </span>
      <span className={styles.depoisDe}>depois de {caminhoLegivel(caminho)}</span>
    </p>
  )
}

/**
 * A última vez que isto apareceu.
 *
 * Some quando a data não deu para ler, em vez de virar um traço: traço parece
 * dado. A CONTAGEM não é repetida aqui — ela já sai de `apresentacao.frase`, e
 * `gameIds.length` ao lado de `partidas` seriam duas fontes da mesma verdade,
 * livres para divergir no dia em que o domínio mudar uma das duas.
 */
function Quando({ saida }: { saida: SaidaDoLivro }) {
  const quando = dataCurta(saida.ultimaEm)
  if (quando === null) {
    return null
  }
  return <p className={styles.quando}>Última vez em {quando}.</p>
}
