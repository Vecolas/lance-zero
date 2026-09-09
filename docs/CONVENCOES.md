# CONVENÇÕES — como se trabalha neste repositório

As regras gerais de engenharia **não moram aqui**. Elas moram na skill
`disciplina-de-engenharia` (`~/.claude/skills/disciplina-de-engenharia/`), que é
a fonte de verdade para: portões, falso verde, onde mora um número, nomes e
comentários, ponto cego declarado, duas fontes para a mesma verdade, git, issue
como unidade de trabalho e o que uma entrega precisa declarar.

Duplicar aquilo aqui criaria duas fontes para a mesma verdade — que é
exatamente o que a seção 7 da skill proíbe. Este arquivo guarda **só o que é
específico do LanceZero**.

Leitura obrigatória antes de implementar:

| Onde                                       | O quê                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `SKILL.md`, seção 14                       | ramo, commit, PR                                                      |
| `references/processo-e-entrega.md`         | issue, bloqueio nomeado, entrega que declara o que não foi verificado |
| `references/o-verificador-tambem-mente.md` | o falso verde na camada das ferramentas                               |
| `references/portoes-e-reguas.md`           | portão que morde dos dois lados                                       |

---

## O que é específico deste projeto

### 1. Ramo e PR

```bash
git checkout -b <tipo>/<assunto-curto>
```

Tipos em uso: `feat`, `correcao`, `docs`, `seguranca`, `refactor`, `teste`,
`infra`.

**Proteção de branch não está ativa** — exige GitHub Pro em repositório privado
(issue #37). Ou seja, a regra "nunca commitar na `main`" depende de disciplina,
não de trava. O histórico deste repositório mostra o que acontece sem ela.

### 2. Verde local antes de abrir PR

```bash
pnpm check           # formato, lint, tipos e testes
pnpm test:e2e        # end-to-end em dev
```

E, se o PR mexe em CSP, headers, engine ou build:

```bash
pnpm test:e2e:prod   # a política de produção é MAIS ESTRITA que a de dev
pnpm security:check
```

`test:e2e:prod` não é zelo: a CSP de desenvolvimento libera `unsafe-eval` e
websocket para o runtime do Next. Uma violação exclusiva de produção passa
batida em `next dev`.

### 3. Uma fase por vez

O `CLAUDE.md` manda: nunca implementar mais de uma fase numerada sem instrução
explícita. Trabalho paralelo só entre partes sem dependência entre si, cada uma
na sua branch, com fronteira de arquivo escrita
(`references/processo-e-entrega.md`).

### 4. Regras que não se afrouxam, específicas daqui

- **RLS nunca é desabilitada**, nem "temporariamente". Tabela com `user_id` sem
  RLS é release blocker (ADR-0008).
- **Nunca confiar em identificador vindo do frontend.** A identidade sai da
  sessão verificada.
- **Nunca `select('*')`** devolvendo linha ao navegador: a saída passa por DTO.
- **Segredo nunca com prefixo `NEXT_PUBLIC_`** — vai para o bundle. O CI recusa.
- **O núcleo funciona sem conta.** Se uma funcionalidade do núcleo passar a
  exigir conta, o ADR-0009 foi violado.
- **Motivo inventado é pior que `unknown`.** Detector abaixo do limiar de
  confiança devolve `unknown`, e a taxa de `unknown` é medida, não escondida.
- **WDL do Stockfish nunca é rotulado como chance humana de vitória.**

### 5. Artefatos gerados

`src/domain/puzzles/temas-suportados.json` é **gerado**, não escrito à mão. A
autoridade é `src/domain/puzzles/themes.ts`; o JSON existe só porque um `.mjs`
não importa `.ts` sem etapa de build.

```bash
pnpm gerar:temas   # depois de mexer no mapa de temas
```

Um portão compara os dois e reprova se divergirem — em qualquer direção, tema
faltando ou sobrando. Editar o JSON à mão é criar a segunda fonte da mesma
verdade, que é o que ele existe para impedir.

### 6. Dependência nova

`docs/LICENSES.md` **e** `src/lib/legal/licenses.ts`, com pacote, versão,
licença, motivo e URL. Sem isso a Definition of Done não fecha.

Artefato GPL fica isolado em `public/engine/stockfish/`, sem modificação, com
`COPYING.txt` e `SOURCE.txt` (ADR-0005).

### 7. Decisão cara de reverter vira ADR

`docs/adr/`, registrando **o custo** e não só o benefício, e o que **não** muda.
Há um teste que exige que todo ADR do disco esteja no índice — ele existe porque
dois ADRs já ficaram de fora sem ninguém notar.
