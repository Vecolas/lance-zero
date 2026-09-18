# Linha de base — antes da quitação da dívida pós-expansão

Os números do repositório no ponto em que a quitação começou, para que "melhorou"
e "piorou" tenham contra o que ser medidos.

**Commit:** `959de88` (merge do PR #114)
**Data da medição:** 18 de setembro de 2026

> **Honestidade sobre este arquivo.** As medições abaixo foram feitas em
> `959de88`, mas o arquivo foi escrito depois, durante a quitação. Ele registra
> execuções reais naquele commit — não é uma reconstrução por memória, e também
> não é um artefato gerado na hora certa. Da próxima vez ele nasce antes.

## Verde na base

| Comando               | Cobertura                                   | Resultado                               |
| --------------------- | ------------------------------------------- | --------------------------------------- |
| `pnpm check`          | formato, lint, tipos, testes                | 143 arquivos, **2239 testes**, 0 falhas |
| `pnpm test:e2e:prod`  | e2e contra o build de produção              | **398 testes**, 0 falhas, 12 pulados    |
| `pnpm security:check` | segredos públicos, RLS, testes de segurança | **105 testes**, 0 falhas                |

Três avisos de lint em `src/components/training/ReviewSession.tsx`, todos
anteriores a esta frente e fora do escopo dela.

## Conteúdo na base

| Medida                                                     | Valor                                  |
| ---------------------------------------------------------- | -------------------------------------- |
| Cursos de abertura                                         | 35                                     |
| Variações                                                  | 86, das quais **80 core**              |
| Planos                                                     | 105                                    |
| Planos com microdecisão                                    | **2**                                  |
| Ramos core sem motivo tático declarado                     | **52**                                 |
| Ramos core inalcançáveis pelo bot no papel invertido       | **1** (`escandinava-qd6`)              |
| Faixa de dificuldade                                       | 1 a 3, com **15 de 35** cursos no topo |
| ADRs                                                       | 0001 a 0029                            |
| Planos normativos versionados                              | 2 de 3                                 |
| Citações `§N` sem destino em `src/`, `tests/` e `docs/adr` | **25**                                 |

## O que esta base já sabia estar errado

As sete dívidas D-01 a D-07, levantadas na devolutiva da expansão. Elas não eram
regressões: eram coisas que a entrega deixou para trás de propósito ou por
limite, e que foram medidas antes de qualquer conserto.
