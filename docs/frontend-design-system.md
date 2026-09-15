# Design system de frontend

Este documento resume a implementação real do LanceZero; as regras de decisão
continuam nas skills de design e acessibilidade.

## Composição

- `PageContainer` é a unidade de largura e não deve impor altura.
- `PageHeader` tem um único H1, descrição opcional e ações que quebram linha.
- `SectionHeader` introduz regiões com H2; não usar H1 secundário em cards.
- `Card` cresce com o conteúdo. Textos pedagógicos não usam truncamento.
- `Tabs` são botões semânticos com rolagem horizontal local em mobile.
- `FilterBar` agrupa filtros sem transformar a página inteira em uma faixa rolável.

## Tokens

A fonte TypeScript é `src/lib/design/tokens.ts`; `src/app/tokens.css` espelha
os valores para CSS. Espaçamento usa `--space-1` a `--space-8`, radius usa
`--radius-sm` a `--radius-xl` e superfícies usam tokens semânticos para os dois
temas. Não adicionar hex avulso em componentes.

## Estados e pedagogia

`StatusBadge` sempre combina símbolo e texto. `ModeLabel` diferencia Aprender,
Praticar, Revisar e Diagnóstico sem depender de cor. `StatePanel` reserva espaço
para loading, empty, error e completed; erro de um bloco não substitui a página.

## Xadrez

O board é dominante em tarefas centradas em xadrez. Comentário, feedback,
movelist e ações ficam em regiões próprias. Mini-boards são previews estáticos:
não carregam engine, tablebase ou explorer.
