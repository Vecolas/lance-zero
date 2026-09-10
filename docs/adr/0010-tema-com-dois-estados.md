# ADR-0010 — O controle de tema tem dois estados, e o armazenamento tem três

- **Estado:** aceito
- **Data:** 2026-09-09
- **Contradiz:** a regra "a preferência tem três estados: sistema (padrão),
  claro e escuro", que estava no `CLAUDE.md` e valeu desde o ADR-0007

## Contexto

O botão de tema ciclava por três posições: Sistema → Claro → Escuro → Sistema.
Era coerente com o modelo de dados e ruim de usar: para trocar de claro para
escuro às vezes bastava um clique, às vezes eram dois, dependendo de onde o
ciclo estava. Um controle cuja próxima posição a pessoa não consegue prever
obriga a olhar o rótulo antes de cada clique.

A marca também mudou nesta mesma passada: o símbolo do cabeçalho passou a ser a
arte do guia (`identidade-visual/icon.png`) no lugar de um SVG aproximado.

## Decisão

**O botão tem duas posições — claro e escuro — e nenhuma delas é "sistema".**

O armazenamento **continua com três estados**. "Sistema" deixou de ser opção
escolhível e virou o estado de quem ainda não escolheu: enquanto não houver nada
gravado, vale o `prefers-color-scheme` do aparelho.

Apagar o terceiro estado obrigaria a gravar um tema já na primeira visita, e o
app pararia de acompanhar o aparelho de quem nunca mexeu nisso — que é a
maioria. **O modelo de dados é mais rico que o controle, de propósito.**

## Consequências

### Aceitas

**Não há caminho de volta para "seguir o sistema" pela interface.** Quem escolher
uma vez fica com a escolha até limpar os dados do site. É o preço de um botão
previsível, e foi decisão consciente do dono do produto.

**O ícone é escolhido por CSS, não por JavaScript.** Os dois desenhos ficam no
DOM e o tema em vigor esconde um. O servidor não tem como saber o
`prefers-color-scheme` do aparelho: decidir em JS faria a primeira pintura
mostrar o símbolo errado e trocá-lo depois da hidratação — um piscar em toda
navegação. O rótulo acessível continua vindo do JS, onde o custo é aceitável
porque ninguém o lê antes da hidratação.

### Custo medido, e a mitigação

A arte da marca tem fundo transparente e **duas das suas três partes somem no
modo escuro**. Medido contra `--dark-background`:

| parte               | sobre o tema claro | sobre o tema escuro |
| ------------------- | ------------------ | ------------------- |
| peão                | 13,73:1            | **1,30:1**          |
| metade navy do anel | 15,54:1            | **1,14:1**          |
| arco azul           | 4,95:1             | 3,59:1              |

Sem tratar, o símbolo perderia justamente o peão — a parte que diz que isto é
xadrez.

A mitigação é uma **placa clara atrás da marca, só no modo escuro**. Ela não
toca na arte e não cria uma segunda versão do arquivo, que divergiria da
primeira. No tema claro a placa não aparece, porque o fundo da página já faz
esse papel e uma moldura sem função é ruído.

**O que isto NÃO resolve:** a mesma arte usada em qualquer superfície escura
fora do cabeçalho terá o mesmo problema, e quem a colocar lá precisa repetir a
placa. Um símbolo com variante para fundo escuro resolveria de vez, e é decisão
de marca, não de código.

## Alternativas descartadas

**Manter as três posições no botão.** Era o estado anterior. O problema não é o
terceiro estado existir, é ele estar no caminho de quem só quer trocar.

**Duas versões da arte, uma por tema.** Duas fontes para a mesma verdade; elas
divergem na primeira atualização da marca e nada acusa.

**Escolher o ícone em JavaScript.** Produz o piscar descrito acima.
