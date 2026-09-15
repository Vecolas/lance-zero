# Integration Notes

## Substituir skill visual antiga

A versão antiga de `lancezero-design-system` é ampla, porém não incorpora plenamente:
- nova página Hoje;
- Treino como hub;
- biblioteca de Aberturas;
- páginas de abertura;
- biblioteca de Finais;
- ensino de finais orientado a posições;
- visual-regression gates.

Substituir pela versão 2.0 deste pacote.

## Não duplicar lógica pedagógica

Estas skills definem **como apresentar** a pedagogia.

Exemplos:
- `lancezero-learning-engine` decide quando algo é lesson/practice/review;
- `lancezero-learning-interface` decide como deixar essa distinção visualmente clara.

- `OpeningGraph` pertence ao domínio;
- `lancezero-chessboard-interface` decide como tabuleiro, move list e comentário coexistem.

## Evitar redesign isolado

Ao alterar página importante, revisar:
1. título e subtítulo;
2. ação primária;
3. densidade;
4. espaço reservado ao tabuleiro;
5. estados vazios/loading/error;
6. mobile;
7. zoom/text resize;
8. screenshot baseline.
