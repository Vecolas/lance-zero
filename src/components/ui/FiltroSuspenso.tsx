'use client'

/**
 * O filtro secundário: um ícone, depois dos botões, que abre as opções.
 *
 * O QUE ELE SUBSTITUI, e por que a troca é uma correção e não um gosto: havia
 * uma fileira de `<select>` rotulados ("Primeiro lance", "Nível", "Status")
 * ABAIXO dos botões de filtro, puxada para cima por uma margem negativa de 2rem
 * para parecer que estava na mesma linha. Ela não estava — e o resultado, na
 * largura em que os botões quebravam para uma segunda linha, era texto por cima
 * de texto. Um layout que só funciona numa largura não é layout, é coincidência.
 *
 * A margem negativa é o defeito em uma linha. O conserto não é ajustá-la: é
 * parar de posicionar uma fileira por cima de outra. O filtro secundário passa a
 * morar DENTRO da mesma fileira dos botões, depois do último — que é onde o olho
 * já está quando termina de ler as opções.
 *
 * O ESTADO NÃO DEPENDE SÓ DE COR. Com filtro ativo, o botão ganha um ponto E o
 * rótulo acessível passa a dizer qual valor está em vigor. É a régua do
 * CLAUDE.md: cor + ícone + texto, sempre.
 *
 * TECLADO: `Escape` fecha e devolve o foco ao botão; clicar fora fecha. Um menu
 * que só fecha com o mouse é um menu que prende quem usa teclado.
 */

import { useEffect, useId, useRef, useState } from 'react'
import styles from './FiltroSuspenso.module.css'

export interface OpcaoDeFiltro<T extends string> {
  valor: T
  rotulo: string
}

export interface FiltroSuspensoProps<T extends string> {
  /** O que este filtro filtra: "Nível", "Status". Vai no rótulo acessível. */
  titulo: string
  /** Rótulo do botão para leitor de tela, já traduzido. */
  rotuloDoBotao: string
  opcoes: readonly OpcaoDeFiltro<T>[]
  valor: T
  /** O valor que significa "sem filtro". Ele NÃO acende o indicador. */
  valorNeutro: T
  aoEscolher: (valor: T) => void
}

export function FiltroSuspenso<T extends string>({
  titulo,
  rotuloDoBotao,
  opcoes,
  valor,
  valorNeutro,
  aoEscolher,
}: FiltroSuspensoProps<T>) {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const idDoMenu = useId()

  const ativo = valor !== valorNeutro
  const escolhido = opcoes.find((opcao) => opcao.valor === valor)

  useEffect(() => {
    if (!aberto) return

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return
      setAberto(false)
      // O foco VOLTA para o botão. Sem isso, fechar com Escape deixa o foco no
      // nada e a navegação por teclado recomeça do topo da página.
      botao.current?.focus()
    }

    function aoClicarFora(evento: MouseEvent) {
      if (caixa.current?.contains(evento.target as Node)) return
      setAberto(false)
    }

    document.addEventListener('keydown', aoTeclar)
    document.addEventListener('mousedown', aoClicarFora)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.removeEventListener('mousedown', aoClicarFora)
    }
  }, [aberto])

  return (
    <div className={styles.caixa} ref={caixa}>
      <button
        ref={botao}
        type="button"
        className={ativo ? `${styles.botao} ${styles.ativo}` : styles.botao}
        aria-expanded={aberto}
        aria-haspopup="true"
        aria-controls={idDoMenu}
        /* O rótulo diz o que o controle É e o que está em vigor. Só o nome do
           filtro deixaria quem não vê o ponto sem saber que há filtro ativo. */
        aria-label={ativo ? `${rotuloDoBotao}: ${escolhido?.rotulo ?? valor}` : rotuloDoBotao}
        onClick={() => setAberto((estava) => !estava)}
      >
        <svg
          className={styles.icone}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 5h16l-6.2 7.3v5.4L10.2 20v-7.7z" />
        </svg>
        {/* O ponto é o SINAL VISUAL de filtro ativo. Ele acompanha o rótulo
            acessível acima; nenhum dos dois trabalha sozinho. */}
        {ativo ? <span className={styles.ponto} aria-hidden="true" /> : null}
      </button>

      {aberto ? (
        <div className={styles.menu} id={idDoMenu} role="group" aria-label={titulo}>
          <p className={styles.titulo}>{titulo}</p>
          {opcoes.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              className={opcao.valor === valor ? styles.opcaoAtiva : styles.opcao}
              aria-pressed={opcao.valor === valor}
              onClick={() => {
                aoEscolher(opcao.valor)
                setAberto(false)
                botao.current?.focus()
              }}
            >
              <span aria-hidden="true">{opcao.valor === valor ? '✓' : ''}</span>
              {opcao.rotulo}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
