import type { Metadata } from 'next'
import { runtimeDependencies, plannedDependencies } from '@/lib/legal/licenses'
import styles from './page.module.css'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Licenças e fontes de dados' }

/**
 * Uma tabela de dependências, ou a frase do estado vazio.
 *
 * O ESTADO VAZIO NÃO É DECORAÇÃO: "Previstos no roadmap" esvazia de verdade
 * quando o último item sai para "Em uso hoje" — foi o que quase aconteceu com o
 * Opening Explorer nesta fase. Sem isto, a página desenharia um cabeçalho de
 * tabela com nenhuma linha embaixo, que o leitor lê como "faltou carregar" e não
 * como "não há mais nada previsto". `vazio` é obrigatório para que ninguém
 * consiga renderizar uma tabela sem decidir o que ela diz quando não tem linha.
 */
function Table({ rows, vazio }: { rows: typeof runtimeDependencies; vazio: string }) {
  if (rows.length === 0) {
    return <p>{vazio}</p>
  }
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Componente</th>
            <th scope="col">Licença</th>
            <th scope="col">Uso</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((dep) => (
            <tr key={dep.name}>
              <th scope="row">
                <a href={dep.url} rel="noreferrer noopener" target="_blank">
                  {dep.name}
                </a>
              </th>
              <td>{dep.license}</td>
              <td>{dep.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function LicensesPage() {
  return (
    <>
      <PageHeader
        title="Licenças e fontes de dados"
        description="Software e dados abertos fazem parte da arquitetura do LanceZero. Aqui estão as obrigações e fontes usadas."
      />

      <h2>Em uso hoje</h2>
      <Table
        rows={runtimeDependencies}
        vazio="Nenhuma dependência de terceiros distribuída — o que, num app de xadrez, seria um erro desta página e não um fato."
      />

      <h2>Previstos no roadmap</h2>
      <p>
        Ainda não distribuídos. Cada item entra junto com a fase que o exige e só depois de revisão
        de licença.
      </p>
      <Table
        rows={plannedDependencies}
        vazio="Nada previsto no momento: tudo que o LanceZero usa já está na tabela acima."
      />

      <h2>Stockfish e GPL</h2>
      <p>
        Quando a engine entrar (Fase 2), os artefatos do Stockfish ficarão isolados em{' '}
        <code>public/engine/stockfish/</code>, acompanhados de <code>COPYING.txt</code> e de um{' '}
        <code>SOURCE.txt</code> com versão, tag e URL exatas de origem. O código da engine não será
        modificado.
      </p>
    </>
  )
}
