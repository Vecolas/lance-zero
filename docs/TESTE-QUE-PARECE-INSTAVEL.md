# TESTE QUE PARECE INSTÁVEL

> Um teste que passa sozinho e reprova na suíte **não é instável até prova em
> contrário**. Enquanto essa prova não existe, ele é um defeito não diagnosticado.

Este documento existe porque essa frase custou horas. Em 2026-09-17, um defeito
de layout REAL — o cabeçalho da jornada rolando na horizontal em 360 px, já no ar
desde o ADR-0016 — foi tratado como instabilidade por várias rodadas. Duas
tentativas de "estabilizar o teste" introduziram regressões novas antes de
alguém olhar para a coisa certa.

O que quebrou o impasse não foi mais um ajuste. Foi **fazer o portão dizer qual
elemento e que largura**.

---

## A ordem de investigação

Siga nesta ordem. Cada passo é mais caro que o anterior, e parar no primeiro que
responder economiza o resto.

### 1. O portão nomeia o culpado?

Se a mensagem de falha é `"alguma coisa ultrapassa a viewport"`, `"elemento não
encontrado"` ou `expected false, received true`, **pare e conserte a mensagem
primeiro**. Não é desvio do problema: é o problema.

Antes:

```
Error: /aberturas/italiana?mode=learn em mobile ultrapassa a viewport
```

Depois:

```
Error: /aberturas/italiana?mode=learn em mobile ultrapassa a viewport:
       389px contra 360px —
       DIV.StudyStageHeader.direita right=389 | BUTTON.StudyStageHeader.mapa right=389
```

O defeito apareceu na **primeira execução** depois dessa mudança. As rodadas
anteriores foram gastas adivinhando.

**Um portão que acusa sem apontar gasta o tempo de quem confia nele.** Vale para
overflow, para contraste, para ausência de elemento e para qualquer asserção
sobre um conjunto: diga o item, não o veredito.

### 2. Reproduza a CONDIÇÃO, não o teste

"Passa sozinho" quase nunca significa "é aleatório". Significa que a suíte cria
uma condição que a execução isolada não cria. Ache a condição:

- **outra viewport antes**? O perfil `desktop` percorre as quatro viewports na
  mesma página e começa pela de 360; o perfil `mobile` já nasce em 360. Só a
  primeira combinação expunha o defeito do cabeçalho;
- **outra rota antes**? Estado gravado em IndexedDB atravessa navegações dentro
  do mesmo teste;
- **a própria instrumentação**? `page.screenshot({ fullPage: true })` expande a
  área de renderização, e a rota navegada em seguida herda a largura. Está
  medido: o mesmo laço sem capturas não acusa nada.

Escreva um teste descartável que reproduza a sequência exata e imprima os
valores. É barato e responde.

### 3. Rode contra o build de produção

`pnpm test:e2e:prod`. Se o sintoma some, ele era do `next dev`, que compila rota
sob demanda — sob concorrência ele devolve **404 em rota dinâmica** e, às vezes,
a própria tela de erro do Next com `SyntaxError: Unexpected end of JSON input` e
dezoito quadros ignorados na pilha. Nada disso é do app.

Se o sintoma PERMANECE em produção e some quando isolado, vá ao passo 4.

### 4. Compare a duração, não só o resultado

Este é o sinal mais subestimado.

| Execução                              | Duração |
| ------------------------------------- | ------- |
| `pipeline` com a engine real, isolado | 7 s     |
| o mesmo teste, na suíte cheia         | 46 s    |

Seis vezes mais lento é **contenção de CPU**, não lógica. O Stockfish é WASM e
disputa núcleo com o outro worker; um lance estourou o orçamento de 30 s e o
worker reiniciou, contando como falha.

E o mesmo raciocínio vale para a suíte inteira: execuções de ~7 min e de ~10,5
min não são "às vezes mais rápido". As curtas são as que **reprovaram cedo** — o
Playwright para de agendar quando acumula falhas. A suíte verde é estável em
10,5 min com variação de 2%.

### 5. Só então declare infraestrutura

E declare com evidência, não com cansaço. Para valer:

- passa no ambiente exato em que falhou;
- a falha é parcial de um jeito que um defeito sistemático não seria — **um** de
  cinco lances falhou; bloqueio de CSP derrubaria os cinco;
- o CI não tem o problema, e dá para dizer por quê (`workers: CI ? 1 : 2`).

---

## O que NÃO fazer

**Não afrouxe a asserção.** O teste do `pipeline` exige zero falhas da engine, e
o comentário dele explica: _"engine real falhando em lance isolado invalida o
resto"_. Quem baixa essa barra para calar o teste troca um portão por um enfeite.

**Não mexa em número de produto para acalmar teste.** `analysisTimeoutMs` é
30 s — quanto um aluno espera antes de o app desistir. Esticar isso para um teste
passar paga com a experiência de quem usa uma conta que é da máquina de quem
desenvolve.

**Não empilhe esperas.** Aquecimento, `waitUntil`, `fonts.ready` e relógio maior
reduzem a janela do problema quando a causa é tempo. Quando não é, eles escondem
o defeito e **criam regressões novas**: nesta investigação, um aquecimento caro
estourou o relógio do teste e um `waitUntil: 'commit'` criou uma corrida que não
existia.

**Não presuma que o `setViewportSize` desfaz.** Com o mesmo tamanho ele é no-op
no Playwright. Para desfazer a contaminação de uma captura, separe as passadas:
meça tudo primeiro, fotografe depois.

---

## Regras que o projeto passa a exigir

1. **Toda asserção sobre um conjunto nomeia o item que falhou.** Overflow diz o
   elemento e a largura; ausência diz o seletor e o que havia na tela.
2. **Teste não pode depender de ambiente não declarado.** O `idioma.spec.ts`
   afirmava o painel "Conta online indisponível" e o comentário dizia "o e2e roda
   sem Supabase" — deixou de ser verdade quando surgiu um `.env.local` com
   chaves, e o teste passou a medir a MÁQUINA. Um teste assim afirma o que vale
   nos dois estados, ou declara a exigência e falha dizendo qual variável falta.
3. **Instabilidade declarada vira issue com evidência**, nunca comentário solto.
   A issue carrega: o ambiente, a duração isolada contra a duração sob carga, e o
   que já foi descartado.
4. **`pnpm test:e2e:prod` antes de concluir que um sintoma é do produto.** A CSP
   de desenvolvimento é mais frouxa de propósito; o inverso também engana.

---

## Limitação conhecida da máquina de desenvolvimento

`playwright.config.ts` usa `workers: process.env.CI ? 1 : 2`, e o número foi
MEDIDO — o próprio arquivo registra 4 workers → 3 falhas, 2 workers → 0. Aquela
medição é de quando a suíte levava 3,2 min.

Hoje ela leva 10,5 min e inclui `jornada-sem-beco`, que percorre jornadas
inteiras, e `pipeline`, que roda o Stockfish de verdade. A folga diminuiu: com
dois workers locais, o teste da engine pode reprovar por contenção.

No CI, com um worker, o problema não existe. Localmente, um `pipeline` vermelho
isolado — e só ele — é candidato a contenção antes de ser candidato a defeito:
rode-o sozinho antes de investigar.
