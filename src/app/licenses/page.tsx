import type { Metadata } from 'next'
import { runtimeDependencies, plannedDependencies } from '@/lib/legal/licenses'
import styles from './page.module.css'

export const metadata: Metadata = { title: 'Licenças e fontes de dados' }

function Table({ rows }: { rows: typeof runtimeDependencies }) {
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
      <h1>Licenças e fontes de dados</h1>
      <p>
        O LanceZero é construído sobre software e dados abertos. Esta página existe desde a primeira
        linha de código porque as obrigações de licença — em especial a GPL do Stockfish — moldam a
        arquitetura, e não o contrário.
      </p>

      <h2>Em uso hoje</h2>
      <Table rows={runtimeDependencies} />

      <h2>Previstos no roadmap</h2>
      <p>
        Ainda não distribuídos. Cada item entra junto com a fase que o exige e só depois de revisão
        de licença.
      </p>
      <Table rows={plannedDependencies} />

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
