# ADR-0029 — "Das suas partidas": o único conteúdo que não é autorado

- **Estado:** aceito
- **Data:** 2026-09-17
- **Relacionado:** ADR-0028 (revisão por ramo), ADR-0022 (o ramo é a unidade),
  plano VNext §36–§38

## Contexto

Todo o repertório é conteúdo que alguém escreveu: a linha principal, os ramos, a
importância de cada um, as três perguntas de cada variação. É bom conteúdo, e é
inteiramente nossa opinião sobre o que importa.

O plano VNext §36 pede a seção que quebra isso: **os pontos em que as partidas do
aluno saíram do repertório**. Um desvio que aconteceu duas vezes nas partidas
dele vale mais que um ramo que alguém achou interessante.

O §36.1 diz como fazer, e é a parte mais importante da especificação: **não
exigir backend novo**. As partidas já são importadas, e `reviewOpeningGame` já
detecta o primeiro desvio e quem o cometeu.

## Decisão

### 1. Agregar o que já existe, e só enriquecer o que faltava

`reviewOpeningGame` devolvia classificação, ply e nó — mas não **qual lance** foi
jogado nem qual o repertório previa. Ele ganhou os três campos.

Sem esse par, a tela não ensina nada: o aluno fica sabendo que errou e não o que
era certo. E computá-los por fora significaria **duas travessias do mesmo grafo**
— duas respostas para a mesma pergunta, e a segunda envelhece sozinha.

### 2. A contagem é real, e é a única do módulo que pode ser

`frequency`, no grafo, conta **linhas autoradas**. O plano §58 proíbe
apresentá-lo como estatística, e o ADR-0022 já o declarou como nome enganoso.

Esta seção conta **partidas**. É por isso que ela pode dizer "2 partidas saíram
daqui" — e é a única do módulo de aberturas que pode.

### 3. Três ações, e a diferença entre elas é o que o app SABE

| Quem desviou | Existe ramo? | Ação                    |
| ------------ | ------------ | ----------------------- |
| o aluno      | —            | reaprender esta posição |
| o adversário | sim          | treinar a resposta      |
| o adversário | **não**      | **analisar**            |

A terceira linha é a recusa do §38.2: **não inventar um ramo no repertório**
porque o adversário jogou algo. Um lance que apareceu uma vez não é teoria, e
promovê-lo a conteúdo autorado misturaria o que foi revisado com o que foi apenas
encontrado — o curso passaria a ensinar o que ninguém escreveu.

Dizer "treinar a resposta" onde não há resposta seria prometer conteúdo
inexistente. O app admite o limite.

### 4. Sem partidas, a seção não existe — e não existe vazia

Uma tela de diagnóstico que aparece zerada ensina o aluno a ignorá-la: ele vê
"0 partidas saíram da linha" na primeira visita, conclui que ali não há nada, e
não volta no dia em que houver. Tem portão de e2e sobre a **ausência**.

## O defeito que um teste encontrou

Uma partida de `1.d4` passada ao curso da Italiana era classificada como **erro
de repertório no primeiro lance**.

Tecnicamente verdade — o repertório manda `1.e4`. Pedagogicamente, ruído: o aluno
jogou **outra abertura**; ele não esqueceu a Italiana. Numa seção cujo propósito é
responder "onde eu erro", isso é a pior espécie de item, porque parece um
diagnóstico e é um erro de atribuição.

A regra que faltava agora é explícita: **a partida precisa ter entrado na abertura
para dizer algo sobre ela.** Ela não confia em quem chama ter atribuído a partida
ao curso certo.

E ela quase nasceu muda: `ply` é **1-based**, não 0-based. Conferi contra
`parsePgn` em vez de supor — com a convenção errada a guarda nunca dispararia, o
ruído voltaria, e nada avisaria.

## Ponto cego declarado

1. **A atribuição partida → curso continua sendo de quem chama.** A tela passa
   todas as partidas do aluno; o módulo descarta as que nunca entraram na
   abertura. Isso funciona porque o descarte é barato, mas não é o mesmo que ter
   um vínculo explícito — que é o que o §37 chama de "partida vinculável".
2. **O PGN é lido a cada montagem da tela.** Não há cache: `Game` guarda o texto,
   que é a fonte. Uma cópia analisada no armazenamento seria a metade que
   envelhece quando o parser melhorar. Com poucas partidas isso é irrelevante; com
   milhares, precisará de medida.
3. **Só o PRIMEIRO desvio de cada partida entra.** É o que `reviewOpeningGame`
   detecta, e é defensável — depois de sair da linha, o resto da partida não é
   mais evidência sobre o repertório. Mas significa que um aluno que erra no
   lance 8 nunca vê o erro do lance 12.
