# Auditoria de internacionalização

Levantamento feito **antes** de traduzir, como o plano manda (§12, §170). O
número é medido por varredura do repositório, não estimado — o script está em
`docs/` como referência no fim deste arquivo.

## O tamanho do problema

**~1.800 trechos de texto em português** no código, fora comentários.

| Área                      | Trechos | Situação                               |
| ------------------------- | ------: | -------------------------------------- |
| `src/content/lessons`     |     558 | ❌ prosa pedagógica — não traduzida    |
| `src/content/openings`    |     154 | ⚠️ nomes traduzidos; comentários não   |
| `src/content/endgames`    |     137 | ⚠️ nomes traduzidos; explicações não   |
| `src/domain/roadmap`      |      85 | ✅ títulos e descrições traduzidos     |
| `src/components/openings` |      84 | ⚠️ catálogo traduzido; jornada não     |
| `src/components/endgames` |      73 | ⚠️ biblioteca traduzida; treinador não |
| `src/components/training` |      62 | ❌ Hoje, hub e revisão                 |
| `src/content/diagnostic`  |      60 | ❌ banco do diagnóstico                |
| `src/app/[lang]`          |      54 | ⚠️ layout e metadata traduzidos        |
| `src/domain/puzzles`      |      51 | ❌ explicações de puzzle               |
| `src/lib/legal`           |      50 | ❌ licenças                            |
| demais                    |    ~430 | ❌                                     |

## O que está traduzido, e sem mistura

Estas telas podem ser usadas inteiras em inglês:

- **Casca**: cabeçalho, navegação principal, navegação inferior, rodapé, skip
  link, seletor de idioma, botão de tema;
- **Roadmap**: título, resumo, filtros, legenda, áreas, estados, ações, nomes e
  descrições dos 57 nós, e a mensagem de conteúdo ausente;
- **Catálogo de Aberturas**: filtros, status, níveis, estados vazios e os nomes
  oficiais das 6 aberturas;
- **Biblioteca de Finais**: filtros, status, níveis e os nomes dos 14 finais;
- **Jornada de lições**: trilha, etapas, estados e as quatro frases de modo;
- **Casca da jornada** (Aberturas e Finais): contagem de etapas e o aviso de modo;
- **Conta**: título, descrição, formulário de entrada e cadastro, perfil, exportação
  e o bloco de exclusão — inclusive a frase de confirmação, que é `APAGAR CONTA`
  em português e `DELETE ACCOUNT` em inglês. O servidor aceita as duas.

  Ela era a maior exceção do app: estava inteira em português fixo, e um aluno em
  inglês lia "Excluir definitivamente" ao lado de um campo pedindo "APAGAR CONTA"
  — na tela onde errar é irreversível. A única coisa que continua chegando em
  inglês nos dois idiomas é a mensagem de erro do Supabase, e de propósito:
  traduzi-la por tabela exigiria manter a lista de um serviço que muda sem avisar,
  e uma tradução errada de "invalid login credentials" manda a pessoa investigar a
  coisa errada.

## O que NÃO está, e por quê

O **texto pedagógico** — o que a lição explica, o que a abertura comenta, o que o
final ensina, o que o feedback de erro diz.

São ~850 trechos de prosa de xadrez. Traduzi-los por máquina produziria
exatamente o que o `CLAUDE.md` proíbe: texto que soa certo e não é, numa área em
que estar errado ensina errado. A regra do projeto é explícita — explicação
inventada é pior que explicação ausente — e ela não deixa de valer porque o
idioma mudou.

Enquanto isso, o app **diz** que aquele texto está em português, em vez de fingir.
A mensagem está em `contentNotice` e é mostrada onde o conteúdo ainda não foi
traduzido.

## Ordem para terminar

A prioridade é a do plano (§163–168), com o que já foi feito riscado:

1. ~~Casca: navegação, botões, estados~~ ✅
2. ~~Roadmap~~ ✅
   2b. ~~Conta~~ ✅ (fora de ordem: a tela toca dado e exclusão, e texto errado ali
   custa mais que numa lição)
3. **Hoje e Treinar** — `src/components/training` (62)
4. **Revisão** — `ReviewSession`, incluindo "Fora do repertório" (parte dos 62)
5. **Lições** — `src/content/lessons` (558). O maior item, e o mais delicado
6. **Aberturas**: comentários, planos, erros comuns (154)
7. **Finais**: princípios, técnica, feedback (137)
8. **Puzzles e diagnóstico** (111)
9. **Análise de partidas**
10. **Legal e licenças** (50)

O inglês só deve ser anunciado como pronto quando nenhum fluxo principal misturar
idiomas — que é o critério do §169 e a regra final do plano.

## Estrutura para o conteúdo pedagógico

O caminho já está desenhado e é o da Opção B do plano (§54): a **estrutura** do
conteúdo (FEN, lances, setas, destaques, ids) é compartilhada entre idiomas, e só
o texto é localizado. `nomes-de-conteudo.ts` já faz isso para os nomes; as lições
seguem o mesmo molde, com `pt-BR.ts` e `en.ts` ao lado de um `structure.ts`.

FEN e lances **não** são duplicados. Duplicá-los criaria duas versões da mesma
lição, livres para divergir num lance.

## Como o número foi medido

Varredura por heurística sobre `src/`, contando literais de string e texto JSX que
contenham acento ou palavra funcional do português, ignorando comentários,
caminhos e identificadores. O número tem falsos positivos (strings técnicas com
acento) e falsos negativos (texto em português sem acento), então vale como
**ordem de grandeza**, que é para o que ele é usado aqui.
