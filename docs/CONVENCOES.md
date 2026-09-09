# CONVENÇÕES — como se trabalha neste repositório

Regras de processo. Elas existem porque cada uma já foi quebrada aqui e custou
retrabalho ou deixou a `main` vermelha.

---

## 1. Nunca commitar na `main`

Todo trabalho acontece em branch própria.

```bash
git checkout -b <tipo>/<assunto-curto>
```

Tipos: `feat`, `correcao`, `docs`, `seguranca`, `refactor`, `teste`, `infra`.

A `main` recebe código por Pull Request, nunca por push direto.

**Por que:** commit direto na `main` publica um erro antes de qualquer revisão, e
foi assim que este repositório acumulou CI vermelho por dois commits seguidos.

---

## 2. Verde local antes de abrir PR

```bash
pnpm check          # formato, lint, tipos e testes
pnpm test:e2e       # end-to-end em dev
```

E, quando o PR mexe em CSP, headers, engine ou build:

```bash
pnpm test:e2e:prod  # a política de produção é mais estrita que a de dev
pnpm security:check
```

**Nunca abra PR contando que "o CI descobre".** As duas quebras que já
aconteceram aqui teriam sido pegas por `pnpm check` local:

- um arquivo escrito à mão e não formatado pelo Prettier;
- uma referência de action do GitHub que não existia.

---

## 3. Dividir em issues quando o trabalho tem mais de uma decisão

Abra issue antes de codar quando:

- a mudança envolve mais de uma decisão que alguém poderia questionar depois;
- há dependência externa (credencial, conta, serviço) que bloqueia parte do
  trabalho;
- o trabalho não cabe numa revisão de uma sentada;
- existe dívida conhecida que ficará para depois.

Uma issue precisa dizer:

1. **Objetivo** — uma frase sobre o que passa a ser possível.
2. **Entregas** — checklist.
3. **Critério de aceite** — como saber que acabou.
4. **Fora de escopo** — o que explicitamente não entra, para não invadir a
   próxima fase.
5. **Bloqueios** — o que depende de outra pessoa, com nome.

Dívida descoberta no meio do caminho vira issue **no mesmo dia**. Dívida que só
existe na cabeça de quem escreveu não existe.

---

## 4. Uma fase por vez

O `CLAUDE.md` manda: nunca implementar mais de uma fase numerada sem instrução
explícita. Isso continua valendo. Trabalho paralelo é permitido apenas entre
partes **sem dependência entre si**, e cada uma na sua branch.

---

## 5. Não afrouxar verificação para ficar verde

Proibido, sem exceção:

- desabilitar RLS, nem "temporariamente";
- apagar ou pular um teste que ficou vermelho, em vez de entender por quê;
- baixar o nível do `pnpm audit` para esconder vulnerabilidade;
- adicionar `eslint-disable` sem comentário dizendo o motivo;
- trocar asserção por `toBeTruthy()` para o teste parar de reclamar.

Se uma verificação está atrapalhando, **ou ela está errada e conserta-se a
verificação, ou ela está certa e conserta-se o código.** Um verificador que
dispara em falso positivo é pior que nenhum: as pessoas aprendem a ignorá-lo.

---

## 6. Decisão cara de reverter vira ADR

Escolha de biblioteca com implicação de licença, fronteira de camada, formato de
dado persistido, dependência externa: tudo isso vira ADR em `docs/adr/`.

O ADR precisa registrar **o custo da decisão**, não só o benefício. E o índice
`docs/adr/README.md` precisa listar o ADR novo — há um teste que garante isso.

Se implementação e documentação divergirem, para-se a feature afetada e
documenta-se a divergência. Não se inventa comportamento de produto.

---

## 7. Toda dependência nova é registrada

`docs/LICENSES.md` **e** `src/lib/legal/licenses.ts`, com pacote, versão,
licença, motivo de uso e URL. Sem isso a Definition of Done não fecha.

---

## 8. Honestidade sobre o que não foi verificado

Ao terminar um trabalho, diga o que **não** foi provado. Exemplos reais deste
repositório:

- "o contrato da engine roda contra worker falso, não contra o Stockfish real";
- "a política de CSP de produção nunca passou por um navegador";
- "os orçamentos de nós são chute, nunca foram medidos".

Cada uma dessas frases virou issue e duas viraram bug encontrado. **Relatar o
limite é parte da entrega**, não confissão de fracasso.

---

## 9. Mensagem de commit explica o porquê

O diff já mostra o quê. A mensagem serve para o _porquê_, para a decisão que foi
tomada, e para o que ficou de fora.

---

## 10. Segredo nunca entra no Git

Nada de chave em código, em teste ou em log. `.env.local` é ignorado;
`.env.example` documenta os nomes com valores em branco.

Segredo com prefixo `NEXT_PUBLIC_` é segredo público — o CI recusa.
