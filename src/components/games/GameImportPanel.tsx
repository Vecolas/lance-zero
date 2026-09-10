'use client'

import { useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import type { Game } from '@/domain/types'
import {
  ChessComImporter,
  dedupeGames,
  importPgnTextDetailed,
  LichessImporter,
} from '@/lib/importers'
import { PgnLimitError } from '@/lib/importers/pgn-limits'
import styles from './GameImportPanel.module.css'

type Fonte = 'pgn' | 'lichess' | 'chesscom'

type Feedback = { tipo: 'ok' | 'bad'; texto: string } | null

/** Janela padrão da importação automática. Meses inteiros vazios custam requisição. */
const DIAS_PADRAO = 90

const ROTULO: Record<Fonte, string> = {
  pgn: 'Colar PGN',
  lichess: 'Lichess',
  chesscom: 'Chess.com',
}

export function GameImportPanel({ onImported }: { onImported: () => void }) {
  const { repo, profile, saveProfile } = useRepository()
  const [fonte, setFonte] = useState<Fonte>('pgn')
  const [pgn, setPgn] = useState('')
  /**
   * Arquivo escolhido, quando houver.
   *
   * Fica separado do campo de texto de propósito: um PGN de exportação tem
   * centenas de partidas e megabytes, e jogar isso dentro de um `<textarea>`
   * trava a digitação. O campo mostra que o arquivo está pronto, sem carregá-lo
   * na interface.
   */
  const [arquivo, setArquivo] = useState<{ nome: string; texto: string } | null>(null)
  const [usuario, setUsuario] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  async function gravar(novas: Game[], avisos: number) {
    if (!repo) return
    const existentes = await repo.listGames()
    const { result, toSave } = dedupeGames(existentes, novas)
    for (const jogo of toSave) {
      await repo.saveGame(jogo)
    }
    const partes = [`${result.importadas} importadas`]
    if (result.duplicadas > 0) partes.push(`${result.duplicadas} já existiam`)
    if (avisos > 0) partes.push(`${avisos} não deram para ler`)
    setFeedback({ tipo: 'ok', texto: `${partes.join(', ')}.` })
    onImported()
  }

  async function importar() {
    if (!repo) return
    setOcupado(true)
    setFeedback(null)
    try {
      if (fonte === 'pgn') {
        // O arquivo tem precedência: se ele está carregado, é o que o usuário
        // acabou de escolher, e importar o texto antigo seria surpresa.
        const texto = arquivo?.texto ?? pgn
        const { games, issues } = importPgnTextDetailed(texto, {
          username: profile?.lichessUsername ?? profile?.chesscomUsername,
        })
        if (games.length === 0) {
          setFeedback({
            tipo: 'bad',
            texto:
              issues.length > 0
                ? `Nenhuma partida legível. Primeiro problema: ${issues[0].message}`
                : 'Nenhuma partida encontrada neste texto.',
          })
          return
        }
        await gravar(games, issues.length)
        return
      }

      const identidade = usuario.trim()
      if (!identidade) {
        setFeedback({ tipo: 'bad', texto: 'Informe o nome de usuário.' })
        return
      }

      // `since` é `Date` no contrato: a comparação por texto deixou de ser
      // possível de escrever, e é por isso que o `.toISOString()` saiu daqui.
      const since = new Date(Date.now() - DIAS_PADRAO * 24 * 60 * 60 * 1000)
      const importer =
        fonte === 'lichess'
          ? new LichessImporter({ fetchFn: fetch.bind(globalThis) })
          : new ChessComImporter({ fetchFn: fetch.bind(globalThis) })

      const pagina = await importer.listGames(identidade, { since, max: 50 })
      if (pagina.games.length === 0) {
        setFeedback({
          tipo: 'bad',
          texto: `Nenhuma partida de ${identidade} nos últimos ${DIAS_PADRAO} dias.`,
        })
        return
      }
      await gravar(pagina.games, 0)

      if (profile) {
        const campo = fonte === 'lichess' ? 'lichessUsername' : 'chesscomUsername'
        if (profile[campo] !== identidade) {
          await saveProfile({ ...profile, [campo]: identidade })
        }
      }
    } catch (e) {
      // Limite de entrada já vem com mensagem escrita para o usuário.
      if (e instanceof PgnLimitError) {
        setFeedback({ tipo: 'bad', texto: e.message })
        return
      }
      setFeedback({
        tipo: 'bad',
        texto:
          e instanceof Error
            ? `Não consegui importar: ${e.message}`
            : 'Não consegui importar agora.',
      })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="importar">
      <h2 id="importar" className={styles.label}>
        Importar partidas
      </h2>

      <div className={styles.tabs} role="group" aria-label="Origem das partidas">
        {(Object.keys(ROTULO) as Fonte[]).map((opcao) => (
          <button
            key={opcao}
            type="button"
            className={styles.tab}
            aria-pressed={fonte === opcao}
            onClick={() => {
              setFonte(opcao)
              setFeedback(null)
            }}
          >
            {ROTULO[opcao]}
          </button>
        ))}
      </div>

      {fonte === 'pgn' ? (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pgn-import">
            PGN
          </label>
          <textarea
            id="pgn-import"
            aria-describedby="pgn-import-ajuda"
            className={styles.textarea}
            value={pgn}
            onChange={(e) => {
              setPgn(e.target.value)
              // Digitar no campo tira o arquivo do caminho. Sem isto, o texto
              // recém-escrito seria ignorado em silêncio pela precedência.
              setArquivo(null)
            }}
            placeholder="Cole uma ou várias partidas"
            spellCheck={false}
          />
          <p id="pgn-import-ajuda" className={styles.help}>
            Várias partidas seguidas no mesmo texto funcionam.
          </p>

          <label className={styles.label} htmlFor="pgn-arquivo">
            Ou envie um arquivo .pgn
          </label>
          <input
            id="pgn-arquivo"
            type="file"
            accept=".pgn,application/x-chess-pgn,text/plain"
            className={styles.fileInput}
            aria-describedby="pgn-arquivo-ajuda"
            disabled={ocupado}
            onChange={(e) => {
              const escolhido = e.target.files?.[0]
              if (!escolhido) {
                setArquivo(null)
                return
              }
              setFeedback(null)
              void escolhido
                .text()
                .then((texto) => setArquivo({ nome: escolhido.name, texto }))
                .catch(() => setFeedback({ tipo: 'bad', texto: 'Não consegui ler este arquivo.' }))
            }}
          />
          <p id="pgn-arquivo-ajuda" className={styles.help}>
            {arquivo
              ? `${arquivo.nome} pronto para importar. Ele tem prioridade sobre o texto acima.`
              : 'É o mesmo formato: o arquivo que o Lichess ou o Chess.com exporta.'}
          </p>
        </div>
      ) : (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="usuario-import">
            Seu usuário no {ROTULO[fonte]}
          </label>
          <input
            id="usuario-import"
            aria-describedby="usuario-import-ajuda"
            className={styles.input}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            spellCheck={false}
          />
          <p id="usuario-import-ajuda" className={styles.help}>
            Só a API pública de leitura, últimos {DIAS_PADRAO} dias. Nada sai daqui além da
            requisição ao próprio {ROTULO[fonte]}.
          </p>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={importar} disabled={ocupado}>
          {ocupado ? 'Importando…' : 'Importar'}
        </button>
      </div>

      {feedback ? (
        <p
          className={`${styles.feedback} ${feedback.tipo === 'ok' ? styles.ok : styles.bad}`}
          role={feedback.tipo === 'bad' ? 'alert' : 'status'}
        >
          {feedback.texto}
        </p>
      ) : null}
    </section>
  )
}
