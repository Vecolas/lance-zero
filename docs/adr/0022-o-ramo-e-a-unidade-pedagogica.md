# ADR-0022 — O ramo é a unidade pedagógica, e a jornada tem oito etapas

- **Estado:** aceito
- **Data:** 2026-09-17
- **Relacionado:** ADR-0018 (quem desvia decide a etapa — **substituído em parte por este**), ADR-0016 (uma etapa por vez), ADR-0017 (a variação se ensina e se enfrenta)

## Contexto

O ADR-0018 dividiu duas etapas da jornada de abertura por **quem tomava a
decisão**: "Melhores respostas do adversário" mostrava os ramos em que quem
recusava a linha principal era o outro, e "Variações importantes" mostrava o
complemento. Um portão afirmava que as duas listas eram complementares e
exaustivas.

A partição estava tecnicamente correta e resolveu um problema real — antes
disso, as duas etapas mostravam **a mesma lista** e diziam a mesma coisa.

O que ela não resolveu foi o modelo mental. O jogador pensa:

> "estou na Defesa dos Dois Cavalos"

e não:

> "estou na lista de ramos cujo autor da decisão foi o oponente."

A consequência prática apareceu no conteúdo: depois da partição, quatro das seis
aberturas ficavam com a etapa 5/9 **vazia**, porque todos os desvios autorados
eram do adversário. O próprio ADR-0018 registrou isso como ponto cego, e o
comentário em `jornada-etapa-unica.spec.ts` já dizia que o V5.1 previa **oito**
etapas com "Respostas" fundida.

## Decisão

### 1. O ramo é a unidade que o aluno vê

`src/domain/openings/ramos.ts` expõe **uma** lista, `ramosDaAbertura`, e nela o
`autor` — `aluno`, `adversario` ou `nenhum` — é **metadata**.

Ele continua sendo verdade e continua tendo efeito: decide se a frase da tela
diz "o adversário joga" ou "você joga", e separa os papéis na cobertura dos dois
lados. Deixou de decidir **em que etapa** o aluno encontra o ramo.

`nenhum` não é caso de borda inventado: é o Giuoco Piano, que no conteúdo atual
é o nome de um trecho da própria linha principal e não ramifica. Chamá-lo de
escolha de alguém ensinaria uma bifurcação que não existe no tabuleiro.

### 2. A jornada vai de nove para oito etapas

```
visão → ideias → linha principal → variações → planos →
dois lados → prática guiada → treino final
```

O id da etapa fundida continua sendo `variacoes`, e isso é deliberado: é ele que
está gravado em `studyJourneys`. Trocá-lo obrigaria a migrar por nome em vez de
por identidade.

### 3. Importância: `core`, `secondary`, `optional`

Existe para o curso **não ser infinito**. Um repertório de verdade tem dezenas
de desvios possíveis, e exigir todos antes da conclusão é a forma mais rápida de
o aluno nunca concluir.

Só `core` bloqueia a conclusão inicial. `secondary` e `optional` continuam
visíveis e estudáveis — esconder conteúdo é o defeito que o ADR-0016 desfez. O
que muda é o que **bloqueia**, não o que aparece.

Ausência de classificação significa `core`, e o padrão é deliberado: um ramo
autorado sem classificação é um ramo que alguém achou importante o bastante para
escrever. Rebaixá-lo por omissão esconderia conteúdo em silêncio.

### 4. Todo ramo `core` traz intenção e objetivo

Dois campos novos, exigidos por portão:

- `intencaoDoAdversario` — o que ele quer com este desvio;
- `objetivoDoAluno` — o que você busca nesta posição.

Sem eles o ramo volta a ser uma sequência de lances. **A pergunta que o aluno
leva para a partida não é "qual era o lance?", é "o que ele está tentando
fazer?"** — e essa é a que sobrevive quando a ordem dos lances muda.

### 5. O portão de complementaridade do ADR-0018 saiu

Ele afirmava que `respostasDoAdversario` + `variacoesDoAluno` = total. Com uma
lista só, ele guardaria uma promessa vazia — o pior tipo de portão, porque fica
verde para sempre.

No lugar entraram três invariantes sobre a lista única:

1. **unicidade** — todo ramo autorado aparece exatamente uma vez, com id único;
2. **alcançabilidade** — a posição de bifurcação de todo ramo existe no grafo. Um
   ramo pode ser legal do começo ao fim e ainda assim nunca acontecer numa
   partida que siga o repertório;
3. **metadata obrigatória em `core`** — intenção e objetivo, com piso de tamanho.

As duas funções antigas foram **removidas** do domínio, com lápide: uma função
que devolva "só as respostas do adversário" convida a reconstruir a etapa que
este ADR removeu.

### 6. A migração de nove para oito não apaga progresso

`migrarJornadaDeAbertura` traduz o que está gravado. A regra de fusão é
**conservadora**:

| Antes                                    | Depois                                  |
| ---------------------------------------- | --------------------------------------- |
| `respostas` **e** `variacoes` concluídas | `variacoes` concluída                   |
| **uma** das duas concluída               | `variacoes` **em andamento**            |
| cursor em `respostas`                    | cursor em `variacoes`                   |
| itens de `respostas`                     | unidos aos de `variacoes`, sem duplicar |

Rebaixar quem fez metade custa alguns minutos de releitura; promover quem fez
metade esconde para sempre o conteúdo que ele não viu — e a etapa fundida é
justamente a que passou a cobrir os dois lados.

A migração é **idempotente** e roda no caminho de leitura, gravando só quando de
fato mudou algo.

## O defeito silencioso que isto evita

`studyJourneys` é persistido. Sem traduzir, uma jornada com
`currentStageId: 'respostas'` encontraria `stages.find(...)` devolvendo
`undefined`, a tela cairia no `?? stages[0]`, e **o aluno que estava na etapa 4
reabriria o curso na Visão**. Nenhuma exceção, nenhum log, nenhum teste vermelho
— só alguém perdendo o lugar e concluindo que o app esqueceu dele.

`tests/unit/openings-migracao.test.ts` cobre os casos por aluno, incluindo o
recém-chegado, o que fez metade, o que fez as duas e o que já concluiu tudo.

## Ponto cego declarado

1. **`importancia` foi classificada por julgamento editorial, não por dados.**
   Nenhum número de uso de aluno existe ainda. A classificação está no conteúdo,
   num lugar só, para mudar quando houver telemetria.
2. **A cobertura do treino final ainda deriva de `opening.variations` inteiro**,
   e não de `ramosCore`. Isso significa que um ramo `secondary` continua sendo
   cobrado no treino. Fica para a fase do treino adaptativo — declarar é melhor
   que mudar duas coisas ao mesmo tempo.
3. **O campo `frequency` das arestas do grafo continua com o nome enganoso.** Ele
   conta linhas autoradas, não popularidade. O plano VNext §10 manda renomear; é
   mudança de contrato e vai em entrega própria.
