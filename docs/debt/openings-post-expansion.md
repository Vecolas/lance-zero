# Dívida pós-expansão de Aberturas — registro de quitação

As sete dívidas levantadas na devolutiva da expansão de 6 para 35 cursos, o que
foi feito em cada uma, e o portão que impede a volta.

Linha de base em [`openings-post-expansion-baseline.md`](./openings-post-expansion-baseline.md).

## Estado

| ID   | Dívida                                 | Estado      | Portão que segura                     | Onde                                                  |
| ---- | -------------------------------------- | ----------- | ------------------------------------- | ----------------------------------------------------- |
| D-03 | Plano de expansão fora do repositório  | **quitada** | `docs-referencias-normativas.test.ts` | `docs/LanceZero_Plano_Expansao_Conteudo_Aberturas.md` |
| D-04 | ADRs ausentes da metade de conteúdo    | **quitada** | portão do índice de ADR               | ADR-0030, ADR-0031, ADR-0032                          |
| D-01 | 33 de 35 cursos com Planos sem decisão | **quitada** | `openings-planos.test.ts` (por curso) | 35/35 cursos com microdecisão                         |
| D-02 | Ramos inalcançáveis pelo bot           | **quitada** | `openings-sparring-alcance.test.ts`   | `sparring.ts` + 3 ramos restaurados                   |
| D-05 | 54 de 83 ramos core sem motivo tático  | **quitada** | `openings-onda0.test.ts`              | `RAZOES_SEM_MOTIVO`                                   |
| D-06 | Um número para teoria e pré-requisito  | **quitada** | schema + catálogo                     | `theoryComplexity` 1–4                                |
| D-07 | Estado vazio do catálogo sem cobertura | **quitada** | `openings-catalogo-vazio.test.tsx`    | teste de componente                                   |

## O que mudou, por dívida

### D-03 — o plano entrou sem ser reorganizado

O corpo é byte a byte o texto aprovado. A numeração 1–74 é o endereço que os
comentários usam, e promovê-la a cabeçalho de Markdown quebraria as referências
em silêncio.

**O portão achou mais do que a dívida dizia.** São **três** planos normativos, e
o código cita os três com a mesma notação `§N` — a primeira versão do portão
conhecia um só e acusou 80 órfãs, quase todas legítimas. Sobraram 25 citações que
passam de §101 e não existem em plano nenhum; elas são de jornada, lições, i18n e
finais, não desta frente, e ficam **declaradas** em `SEM_DESTINO_CONHECIDO`. O
portão reprova se a lista crescer e também se um item deixar de ser necessário.

### D-04 — três ADRs, e não dois

A devolutiva nomeava três decisões e o conserto pedia dois arquivos. A terceira —
os portões de autoria — era a mais importante, e ia ficar sem registro.

O ADR-0032 carrega a lição central desta quitação: **o escopo da asserção é o
escopo do contrato.**

### D-01 — o portão passou a medir o curso

Era `comMicro.length > 0` sobre o catálogo inteiro, com o nome dizendo "do
curso". Dois planos em 35 cursos bastavam.

A ordem foi: portão por curso → vermelho observado, com os 33 nomeados → conteúdo
em cinco lotes.

**Uma correção ao que a devolutiva afirmou:** ela dizia que `§24.3` não existia.
Existe — no plano VNext. O que é verdade é que a regra mora no §52 do plano de
expansão, que exige microdecisão em **cada plano**, e que "quando possível" não
aparece nele nenhuma vez. O piso por curso é um relaxamento deliberado do §52, e
está registrado como tal no ADR-0032.

### D-02 — o bot enumera, e não sorteia

A devolutiva descrevia "ordinal errada contada do histórico". Não era isso: a
seleção já era por posição, e o errado era a aritmética. `(seed + ply) % opcoes`
amarra bifurcações umas às outras, e na Escandinava isso tornava um ramo
inalcançável para **todo** seed.

Duas tentativas falharam antes da certa, e as duas ensinam:

1. **hash** — espalha, mas não promete. O orçamento de partidas do contrato é
   pequeno, e espalhamento erra uma combinação específica dentro dele;
2. **FNV-1a sem avalanche** — o consumidor faz `% opcoes`, que lê o bit mais
   baixo, e no FNV-1a esse bit não depende da posição.

A resposta foi **enumerar**: a rodada é um número em base mista sobre as
bifurcações do bot.

Os três ramos suprimidos voltaram: `ruy-aberta`, `ruy-steinitz`,
`kid-quatro-peoes`.

### D-05 — ausência declarada

Obrigar motivo em todo ramo produziria tática inventada. O contrato é o do meio:
motivo **ou** razão de não ter, nunca os dois, nunca nenhum, com as razões num
conjunto fechado.

A auditoria do §16 rendeu um motivo novo e só um — `motif.pin-on-f6` — que cumpre
o piso de três cursos do ADR-0030 e corrige uma imprecisão na Semi-Eslava.

### D-06 — duas dimensões

`theoryComplexity: 1|2|3|4` mede estudo teórico; `prerequisites` responde o que
saber antes, e agora aparece no card. Najdorf, Dragão, Sveshnikov, Benko e
Semi-Eslava no degrau 4; a Siciliana Fundamentos fica no 3 — ela era o caso que
provava o problema.

### D-07 — o vazio coberto pela fonte

A separação de D-06 devolveu uma combinação vazia de graça ("brancas E
especializada"), e o e2e voltou a passar por lá. O teste de componente entra
**mesmo assim**: aquela combinação é um acidente do conteúdo de hoje.

## Auditoria de escopo dos portões (§23)

Varredura mecânica por portões cujo nome promete universalidade e cujo corpo só
agrega. **Nenhum segundo caso do defeito de D-01 foi encontrado.** Dois achados
menores, os dois consertados:

- `openings-treino-vnext.test.ts` chamava-se "as seis aberturas do curso" e o
  corpo já percorria as 35. Etiqueta que mente sobre o alcance é portão que
  ninguém sabe se pode remover;
- `openings-onda0.test.ts` citava o §52 ("3 a 6 planos") e cobrava só o piso.

**O helper `expectEveryCourse` do §24 não foi criado**, e a razão é que ele não
teve uso: os portões de Aberturas já iteram por entidade e já nomeiam curso e
ramo na mensagem. Um helper sem chamador seria cerimônia.

## Revalidação de "Responder é jogar" (§21)

O plano externo (`~/.claude/plans/starry-riding-pascal.md`, fora do repositório)
abre declarando dois e2e vermelhos: `treino.spec.ts` e `biblioteca.spec.ts`,
ambos parando em "Etapa 2 de 9" depois de dois cliques em `Continuar`.

**A premissa não reproduz.** Os dois passam contra o build de produção, junto com
os outros 396. E eles não estão verdes por fraqueza: cravam os rótulos
`Etapa 1 de 9`, `Etapa 2 de 9` e `Etapa 3 de 9` e exigem que o segundo clique
avance — é exatamente o comportamento que o plano dizia estar quebrado.

A conclusão é que o defeito era da branch em que o plano foi escrito, ou já foi
corrigido. **Quem for implementar aquele plano deve reescrever a seção do bug
antes de começar**, em vez de caçar uma falha que não existe mais aqui.

## Fora de escopo, e registrado

Itens que apareceram no caminho e pertencem a outras frentes:

- `tests/e2e/finais.spec.ts` tem um teste desligado sem condição, preso à issue
  #30 (CSP _enforcing_);
- três avisos de lint em `ReviewSession.tsx`, dois deles verificadamente
  anteriores a esta frente;
- um _stash_ pendurado de `correcao/becos-sem-saida-na-jornada-de-finais`;
- as 25 citações `§N` sem destino conhecido, declaradas no portão.

## Regra de liberação

D-01 a D-04 eram bloqueadores para uma nova expansão grande, e estão quitados.
D-05 e D-06 também. **O catálogo está liberado para crescer de novo.**

A regra que fica: o objetivo não é a suíte verde — ela já estava verde. É que
cada portão verde esteja verde pelo motivo que o contrato dele afirma medir.
