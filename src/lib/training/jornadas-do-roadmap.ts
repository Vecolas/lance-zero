/**
 * A ponte entre os nós do Roadmap e as jornadas de Aberturas e Finais.
 *
 * O PROBLEMA QUE ELA RESOLVE: o Roadmap nomeia os conteúdos com ids próprios
 * (`opening.italian`), e o catálogo de conteúdo usa outros (`italiana`). Os dois
 * vocabulários nasceram separados e nenhum é errado — o Roadmap fala de
 * currículo, o catálogo fala de conteúdo.
 *
 * COMO A PONTE É FEITA, e por que assim: por NOME NORMALIZADO, derivado dos dois
 * catálogos na hora. A alternativa seria uma tabela `opening.italian → italiana`
 * escrita à mão, que é a segunda fonte da mesma verdade — e que ficaria
 * desatualizada em silêncio no dia em que uma abertura entrasse só num dos dois
 * lugares.
 *
 * O PONTO CEGO DESTA ESCOLHA, declarado: se alguém renomear "Abertura Italiana"
 * num dos catálogos e não no outro, o nó perde o link para a jornada. O
 * comportamento degrada com segurança — o card continua funcionando e leva ao
 * lugar antigo —, e `nosSemJornada` existe para um portão conseguir MEDIR
 * quantos ficaram sem par, em vez de a divergência passar despercebida.
 */

import { ENDGAME_DEFINITIONS } from '@/content/endgames/biblioteca'
import { OPENING_COURSES } from '@/content/openings/course'
import { ROADMAP_DEFINITION, type RoadmapNode } from '@/domain/roadmap'
import { rotaDaJornada, type DominioDeJornada } from '@/domain/jornada'

export interface ConteudoDoNo {
  dominio: DominioDeJornada
  slug: string
  /** O id usado na store de jornadas: `abertura:italiana`. */
  jornadaId: string
  rota: string
}

/**
 * Nome comparável: sem acento, sem caixa, sem pontuação.
 *
 * "Abertura Italiana" e "abertura italiana" são o mesmo conteúdo; "Jogo
 * Escoces" (sem acento, como está no Roadmap) e "Jogo Escocês" também.
 */
function normalizar(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** O índice nome → conteúdo, montado uma vez a partir dos dois catálogos. */
function indice(): Map<string, ConteudoDoNo> {
  const mapa = new Map<string, ConteudoDoNo>()

  for (const abertura of OPENING_COURSES) {
    mapa.set(normalizar(abertura.name), {
      dominio: 'abertura',
      slug: abertura.slug,
      jornadaId: `abertura:${abertura.id}`,
      rota: rotaDaJornada('abertura', abertura.slug),
    })
  }

  for (const final of ENDGAME_DEFINITIONS) {
    mapa.set(normalizar(final.name), {
      dominio: 'final',
      slug: final.slug,
      jornadaId: `final:${final.id}`,
      rota: rotaDaJornada('final', final.slug),
    })
  }

  return mapa
}

/**
 * O nó é um CONTEÚDO (uma abertura, um final), e não uma habilidade?
 *
 * `contentType` sozinho NÃO responde isso, e descobrir por quê custou um teste
 * vermelho: o Roadmap deriva `contentType` da ÁREA, então "Desenvolvimento" —
 * que é uma habilidade da área de aberturas — também chega aqui como
 * `'opening'`. Tratá-la como conteúdo faria o card procurar uma jornada da
 * "abertura Desenvolvimento", que não existe.
 *
 * O discriminador honesto é `skillId`: nós de habilidade têm um, nós de
 * conteúdo não. É uma propriedade da forma do dado, e não uma convenção de
 * nome — um id novo não a quebra.
 */
function ehNoDeConteudo(node: Pick<RoadmapNode, 'contentType' | 'skillId'>): boolean {
  if (node.skillId !== undefined) return false
  return node.contentType === 'opening' || node.contentType === 'endgame'
}

/**
 * O conteúdo de um nó do Roadmap, quando ele tem jornada.
 *
 * `null` para os nós de habilidade (tática, cálculo, fundamentos, e também
 * "Desenvolvimento" ou "Finais de torre"), que continuam apontando para a
 * biblioteca de lições.
 */
export function conteudoDoNo(
  node: Pick<RoadmapNode, 'title' | 'contentType' | 'skillId'>,
): ConteudoDoNo | null {
  if (!ehNoDeConteudo(node)) return null

  /*
    CORRESPONDÊNCIA EXATA, e só ela.

    Houve aqui uma segunda passada que aceitava o nome do catálogo TERMINANDO
    com o nome do nó, para acomodar "Caro-Kann" (Roadmap) contra "Defesa
    Caro-Kann" (conteúdo). Ela foi REMOVIDA quando os dois catálogos passaram a
    escrever o mesmo nome.

    A remoção é a parte que importa: busca aproximada resolve a divergência de
    hoje e ESCONDE a de amanhã. Com ela no lugar, uma abertura nova grafada
    diferente casaria por acidente e o portão `nosSemJornada` nunca reprovaria —
    até o dia em que duas aberturas parecidas casassem com o mesmo nó e o card
    levasse à errada. Exigir o nome exato faz a próxima divergência aparecer
    como teste vermelho, que é onde ela deve aparecer.
  */
  return indice().get(normalizar(node.title)) ?? null
}

/**
 * Os nós de abertura/final que NÃO acharam conteúdo.
 *
 * Existe para o portão: a ponte por nome degrada com segurança, mas "degrada em
 * silêncio" é o que este projeto chama de falso verde. Medir quantos ficaram
 * sem par transforma a divergência em número, e número reprova.
 */
export function nosSemJornada(): string[] {
  return (
    ROADMAP_DEFINITION.nodes
      .filter(ehNoDeConteudo)
      // Usa a MESMA função que a tela usa. Reimplementar a busca aqui faria o
      // portão medir uma ligação diferente da que o aluno recebe — que é a forma
      // mais elegante de um portão passar sem proteger nada.
      .filter((node) => conteudoDoNo(node) === null)
      .map((node) => node.id)
  )
}
