/**
 * A LINHA PRINCIPAL DEIXA DE SER SÓ LEITURA: entender, depois completar.
 *
 * O QUE ESTE ARQUIVO GUARDA é a política de ajuda decrescente — quantos lances
 * o computador demonstra antes de cobrar o primeiro, e quanta ajuda cada
 * decisão cobrada recebe.
 *
 * O MODO DE FALHA QUE ELE PEGA é o oposto do que parece. Não é "a tela quebrou":
 * é a tela continuar funcionando enquanto a política silenciosamente deixa de
 * ensinar — demonstrar a linha inteira e não cobrar nada, cobrar o primeiro
 * lance sem ter demonstrado nenhum, ou oferecer dica no fim e não no começo.
 * Todos os três rodam sem erro e parecem certos numa captura de tela.
 */

import { describe, expect, it } from 'vitest'
import { OPENING_COURSES } from '@/content/openings/course'
import { percursoDaLinhaPrincipal, type NivelDeAjuda } from '@/domain/openings/linha-principal'
import { applyMove } from '@/lib/chess'

const ITALIANA = OPENING_COURSES.find((o) => o.slug === 'italiana')!

/** A ajuda só pode cair. Um nível maior depois de um menor é regressão. */
const PESO: Record<NivelDeAjuda, number> = {
  'objetivo-e-dica': 0,
  objetivo: 1,
  posicao: 2,
}

describe('o percurso da linha principal', () => {
  it('demonstra antes de cobrar, e o exemplo do plano é a Italiana', () => {
    /*
      O plano VNext §15.2 escreve o alvo com esta abertura: "Você já viu: e4 e5
      Nf3 Nc6. Agora: qual lance continua a ideia?" — e a resposta é Bc4.
    */
    const percurso = percursoDaLinhaPrincipal(ITALIANA)

    expect(percurso.demonstrados).toBe(4)
    expect(ITALIANA.mainline.slice(0, 4).map((l) => l.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])
    expect(percurso.decisoes[0]?.san).toBe('Bc4')
  })

  it('a fase de completar começa na posição que a demonstração deixou', () => {
    const percurso = percursoDaLinhaPrincipal(ITALIANA)

    let fen = ITALIANA.rootFen
    for (const lance of ITALIANA.mainline.slice(0, percurso.demonstrados)) {
      fen = applyMove(fen, lance.san)!.fenAfter
    }
    expect(percurso.linha.fenInicial).toBe(fen)
    // E a linha treinável é o RESTO, não a linha inteira: repetir o que já foi
    // demonstrado faria o aluno rejogar de cor o que acabou de ver.
    expect(percurso.linha.lances).toEqual(
      ITALIANA.mainline.slice(percurso.demonstrados).map((l) => l.uci),
    )
  })

  it('o aluno só é cobrado pelos lances do PRÓPRIO lado', () => {
    for (const opening of OPENING_COURSES) {
      const percurso = percursoDaLinhaPrincipal(opening)
      for (const decisao of percurso.decisoes) {
        const lance = opening.mainline[decisao.indice]
        expect(lance?.san, `${opening.slug}`).toBe(decisao.san)
        // Ply ímpar é das brancas. Cobrar o lance do adversário é o defeito que
        // já apareceu uma vez na prática guiada, com o índice do item valendo
        // como índice de ply.
        const ehDasBrancas = (lance?.ply ?? 0) % 2 === 1
        expect(ehDasBrancas, `${opening.slug} ${decisao.san}`).toBe(opening.side === 'white')
      }
    }
  })

  it('toda abertura cobra pelo menos duas decisões', () => {
    /*
      PORTÃO DE CONTEÚDO, e ele morde: uma linha principal curta demais produz
      uma fase de completar com um lance só, que é demonstração com passo extra
      — não prática. Quem autorar uma principal de quatro plies reprova aqui.
    */
    for (const opening of OPENING_COURSES) {
      const percurso = percursoDaLinhaPrincipal(opening)
      expect(percurso.decisoes.length, `${opening.slug}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('a demonstração nunca engole a linha inteira', () => {
    for (const opening of OPENING_COURSES) {
      const percurso = percursoDaLinhaPrincipal(opening)
      expect(percurso.demonstrados, `${opening.slug}`).toBeLessThan(opening.mainline.length)
      expect(percurso.demonstrados, `${opening.slug}`).toBeGreaterThan(0)
    }
  })

  it('a ajuda decresce e nunca volta a subir', () => {
    for (const opening of OPENING_COURSES) {
      const niveis = percursoDaLinhaPrincipal(opening).decisoes.map((d) => PESO[d.nivel])
      for (let i = 1; i < niveis.length; i += 1) {
        expect(niveis[i], `${opening.slug} decisão ${i}`).toBeGreaterThanOrEqual(niveis[i - 1]!)
      }
    }
  })

  it('a primeira decisão cobrada é a mais amparada de todas', () => {
    for (const opening of OPENING_COURSES) {
      const decisoes = percursoDaLinhaPrincipal(opening).decisoes
      expect(decisoes[0]?.nivel, `${opening.slug}`).toBe('objetivo-e-dica')
      expect(decisoes[1]?.nivel, `${opening.slug}`).toBe('objetivo')
    }
  })

  it('o objetivo mostrado nunca entrega o lance', () => {
    /*
      A FRASE DE AJUDA É CONTEÚDO AUTORADO, e um autor distraído escreve "jogue
      Bc4 para pressionar f7" no campo que a tela mostra ANTES da resposta. Isso
      não dá erro nenhum: só transforma a pergunta em enunciado com gabarito.
    */
    for (const opening of OPENING_COURSES) {
      for (const decisao of percursoDaLinhaPrincipal(opening).decisoes) {
        if (!decisao.objetivo) continue
        expect(
          decisao.objetivo.includes(decisao.san),
          `${opening.slug}: "${decisao.objetivo}" entrega ${decisao.san}`,
        ).toBe(false)
      }
    }
  })

  it('a dica aponta uma casa que existe no tabuleiro', () => {
    for (const opening of OPENING_COURSES) {
      for (const decisao of percursoDaLinhaPrincipal(opening).decisoes) {
        if (!decisao.dica) continue
        expect(decisao.dica.casa, `${opening.slug}`).toMatch(/^[a-h][1-8]$/)
      }
    }
  })

  it('é determinístico — a mesma abertura dá o mesmo percurso', () => {
    const a = percursoDaLinhaPrincipal(ITALIANA)
    const b = percursoDaLinhaPrincipal(ITALIANA)
    expect(b).toEqual(a)
  })
})
