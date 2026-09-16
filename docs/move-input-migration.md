# Migração da entrada de lances

## Decisão

Nas rotas de aluno, o lance é feito diretamente no tabuleiro por arrastar e
soltar. UCI, SAN e coordenadas são formatos de domínio, não controles da
interface.

O componente `ChessBoardView` é o ponto único da interação: ele valida a
legalidade visual, faz snapback de movimentos ilegais e abre o seletor de
promoção quando necessário. O fluxo recebe apenas `{ from, to, promotion }`.

## Auditoria

| Fluxo               | Antes                        | Depois                       | Estado      |
| ------------------- | ---------------------------- | ---------------------------- | ----------- |
| Revisar             | campo UCI + botão            | drag no tabuleiro + feedback | substituído |
| Finais              | campo UCI + botão            | drag no tabuleiro + feedback | substituído |
| Táticas             | drag no tabuleiro            | drag no tabuleiro            | mantido     |
| Aberturas           | drag no tabuleiro            | drag no tabuleiro            | mantido     |
| Cálculo             | seleção visual de candidatos | seleção visual de candidatos | mantido     |
| Diagnóstico         | seleção de lances gerados    | seleção visual de lances     | mantido     |
| Engine/debug/testes | UCI interno                  | UCI interno                  | interno     |

## Regra de busca

As strings de UI `Lance em UCI` e `Jogar lance` não podem aparecer em
componentes de aluno. Ocorrências de UCI no domínio, engine, adapters, fixtures
e comentários técnicos são esperadas e não representam vazamento de formato.
