# ADR-0007 — Adotar o guia de identidade visual e substituir a paleta do CLAUDE.md

- **Estado:** aceito
- **Data:** 2026-09-09
- **Substitui:** a seção "Brand system" do `CLAUDE.md` e a seção 6 do `docs/RESEARCH.md`

## Contexto

O `CLAUDE.md` e o PRD definiam uma paleta quente: papel `#F6F1E8`, tinta
`#101318` e coral `#FF6B4A` como destaque. A Fase 0 implementou exatamente isso.

Depois disso entrou no repositório o
`identidade-visual/LanceZero_Guia_Identidade_Visual.md`, um design system
completo e muito mais detalhado: paleta navy com destaque azul-ciano, cores
semânticas, tipografia, grid, bordas, raios, sombras, botões, cards, tabuleiro,
estados do tabuleiro, classificação de lances e modo escuro.

Os dois documentos não podiam coexistir. A regra do projeto manda parar a
feature afetada e documentar a divergência em vez de escolher em silêncio.

## Decisão

O guia de identidade visual passa a ser a fonte de verdade para tudo que é
visual. O `CLAUDE.md` e o PRD são corrigidos para apontar para ele.

Concretamente:

- `src/lib/design/tokens.ts` e `src/app/tokens.css` passam a espelhar o guia;
- o tabuleiro usa os temas **Claro** (`#EDF3F6`/`#AFC6D1`) e **Contraste**
  (`#E8EEF2`/`#8FABB9`), com último lance `#C8EDF5` e seleção `#7FD7E8`;
- o símbolo vira "zero + peão" com o gradiente da marca, no lugar da trajetória
  de cavalo;
- o wordmark separa "Lance" (navy) de "Zero" (azul da marca);
- raios passam a 6/8/12/16 px e as sombras às do guia.

### Modo claro e escuro

O guia define o modo escuro (seção 38) e o produto passa a ter os dois, com três
estados de preferência: **sistema** (padrão), **claro** e **escuro**. A escolha
explícita grava `data-theme` no `<html>` e persiste em `localStorage`; um script
inline no `<head>` aplica o tema antes da primeira pintura para a tela não
piscar branca.

O tabuleiro **não** muda com o tema: casas são conteúdo, não cromo, e a mesma
posição não deve mudar de aparência quando o usuário troca o tema da interface.

### Desvios deliberados, por acessibilidade

O projeto exige WCAG AA. Medidas as combinações do guia sobre `#F7F9FB`:

| Combinação do guia                      | Contraste | Situação                |
| --------------------------------------- | --------- | ----------------------- |
| Branco sobre Zero Blue (botão primário) | 2.75:1    | reprova                 |
| Zero Blue como texto                    | 2.60:1    | reprova                 |
| Sucesso `#18A572` como texto            | 2.99:1    | reprova                 |
| Atenção `#E5A82B` como texto            | 2.00:1    | reprova                 |
| Erro `#D9534F` como texto               | 3.75:1    | reprova em texto normal |
| Slate 400 como texto                    | 2.55:1    | reprova                 |

Então:

1. **Botão primário usa Zero Deep `#087DA7`** com texto branco (4.66:1), não
   Zero Blue. O próprio guia reserva Zero Deep para "elementos com contraste".
   Zero Blue continua no hover, no foco, nos destaques do tabuleiro e em tudo
   que não carrega texto.
2. **Cores semânticas ganham variante `-text`** mais escura, do mesmo matiz,
   para uso como texto sobre fundo claro. As cores originais do guia continuam
   valendo para preenchimento, ícone e borda.
3. No **modo escuro** nada disso é necessário: todas as cores do guia passam em
   AA sobre `#07131C`, e são usadas como estão.

O teste `tests/unit/tokens.test.ts` trava esses limites: ele verifica AA nos dois
temas e documenta, com asserção, por que o botão primário não usa Zero Blue.

## Consequências

- A Fase 0 foi refeita visualmente. Foi barato porque só existiam seis
  componentes; teria sido caro depois do dashboard e das telas de puzzle.
- Passamos a ter dois lugares de verdade sobre marca: o guia (visual) e o
  `CLAUDE.md` (produto e arquitetura). O `CLAUDE.md` remete ao guia.
- O guia define componentes que ainda não existem — sidebar, barra de avaliação,
  cards de habilidade. Eles entram junto com a fase que os cria, não antes.
- Se o guia for revisado, este ADR é substituído por outro; não editado.
