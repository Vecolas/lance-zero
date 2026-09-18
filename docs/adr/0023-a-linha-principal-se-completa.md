# ADR-0023 — A linha principal se completa, e a ajuda decresce

- **Estado:** aceito
- **Data:** 2026-09-17
- **Relacionado:** ADR-0022 (o ramo é a unidade), ADR-0016 (uma etapa por vez),
  ADR-0019 (responder é jogar), plano VNext §15

## Contexto

A etapa "Linha principal" era uma leitura: tabuleiro fixo, `←` / `→`,
comentário ao lado. Boa como referência.

O problema não aparecia em nenhuma tela: o aluno atravessava nove lances **sem
produzir nenhum**, e saía com a sensação de ter aprendido. É o desfecho mais
provável e o menos verdadeiro, e nada no produto o contradizia — a etapa marcava
✓ do mesmo jeito.

O plano VNext §3.2–§3.4 nomeia o que falta, na ordem:

- **worked example** primeiro, porque cobrar produção antes de haver o que
  reproduzir só mede quem já sabia;
- **completion** depois, porque recuperar da memória é o que fixa;
- **fading**, porque ajuda constante vira muleta e ajuda ausente vira
  adivinhação.

## Decisão

### 1. Dois tempos dentro da MESMA etapa

```
ENTENDER   o computador demonstra os primeiros lances, comentados
   ↓
COMPLETAR  dali em diante o lance é do aluno, no tabuleiro
```

Sem aba nova, sem etapa nova. §15.4 é explícito e a razão é de contagem: cada
lance virar etapa global inflaria a jornada de 8 para dezenas, e o contador que
o aluno lê ("Etapa 4 de 8") passaria a medir plies em vez de assuntos.

### 2. A demonstração para em `min(2, metade das decisões)`

Dois vem do exemplo do próprio plano (§15.2): a Italiana mostra `e4 e5 Nf3 Nc6`
e então pergunta por `Bc4`.

**A metade não é enfeite.** Sem ela, uma principal de seis plies pelas pretas —
que dá ao aluno três decisões — gastaria duas em demonstração e cobraria **uma**.
Um exercício único no fim de uma leitura é a leitura com um passo a mais, não
prática. Com a metade, as seis aberturas do curso cobram pelo menos duas.

Isso virou portão: `toda abertura cobra pelo menos duas decisões`. Quem autorar
uma principal de quatro plies reprova na build.

### 3. A ajuda decresce pela ORDEM, e só por ela

| Decisão cobrada | O que a tela mostra    |
| --------------- | ---------------------- |
| 1ª              | objetivo + uma casa    |
| 2ª              | objetivo               |
| 3ª em diante    | a posição, e nada mais |

Derivar da ordem é o ponto. Qualquer regra que olhasse o conteúdo do lance
("este é difícil, dá mais ajuda") poderia **aumentar** a ajuda no meio do
caminho, que é o contrário de fading. O portão `a ajuda decresce e nunca volta a
subir` mede exatamente isso.

### 4. O objetivo é conteúdo autorado, e não pode entregar o lance

A frase vem de `strategicIdea` / `tacticalIdea`. Um autor distraído escreve
"jogue Bc4 para pressionar f7" no campo que a tela mostra **antes** da resposta,
e isso não dá erro nenhum: só transforma a pergunta em enunciado com gabarito.

Portão: o objetivo de uma decisão cobrada nunca contém o SAN do lance.

Quando o conteúdo não declara objetivo, a tela pergunta sem enunciado em vez de
inventar um.

### 5. A dica tem dois degraus, e a casa alvo vem primeiro

`highlights[0]` → "a casa que decide é f7", que diz **o que procurar** sem dizer
o que jogar: mais de um lance mira f7. `arrows[0].from` é o degrau seguinte e
quase entrega a resposta; só entra quando não há alvo marcado.

A dica sai do domínio como **dado**, não como frase — devolver prosa de lá
obrigaria a traduzir o domínio.

### 6. Errar não pune, e existe saída

Lance fora da linha: a peça volta, **a posição não anda**, o texto ao lado diz o
que aconteceu. O aluno fica na decisão até resolvê-la.

E há "Não lembro — mostrar o lance". Sem ela, quem travou fica preso, e a etapa
que devia ensinar vira portão. Revelar não é falhar: é o último degrau da
escada.

### 7. A etapa continua sendo de LEITURA

Completar é o que ensina, mas transformar isso em tranca contradiz o ADR-0016:
orientar não é aprisionar. Quem cobra de verdade é o treino final, que exige
cobertura e reprova rodada falha.

Consequência assumida: **dá para clicar em Continuar e pular a fase de
completar.** É a mesma liberdade que o Mapa do estudo já dá, e o preço de
fechá-la seria maior que o de deixá-la aberta.

## O que o portão de e2e afirma

Três fatos, e os três são o contrato:

1. a porta "Agora é a sua vez" existe — sem ela a etapa teria voltado a ser uma
   leitura de fim mudo;
2. o lance errado deixa a FEN **idêntica** — a prova do snapback;
3. o lance certo anda **dois plies**, o do aluno e a resposta do computador, sem
   nenhum clique entre eles.

O terceiro é o que morde de verdade: um teste que aceitasse "andou" passaria com
a resposta do adversário faltando — que é justamente o defeito que esta etapa
veio consertar.

## Ponto cego declarado

1. **`DEMONSTRACOES_MAXIMAS = 2` nunca foi calibrado com dados de aluno.** É
   heurística de produto, e está numa constante só para mudar quando houver
   telemetria.
2. **A fase de completar não grava nada.** Ela não alimenta `itensRespondidos`
   nem o modelo de domínio, de propósito: §15.4 proíbe dupla contagem, e a
   decisão de o que dela vira estado pertence à fase do `OpeningBranchState`
   (VNext §41).
3. **O aluno que volta à etapa recomeça pela demonstração.** A fase é estado de
   tela, não de jornada. Rever quatro lances é barato; gravar mais um eixo de
   progresso antes de o modelo de branch existir seria criar a segunda fonte da
   mesma verdade.
