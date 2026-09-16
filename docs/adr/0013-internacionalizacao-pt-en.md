# ADR-0013 — Internacionalização PT-BR/EN sem biblioteca de roteamento

- **Estado:** aceito
- **Data:** 2026-09-16

## Contexto

O produto nasceu em português, com as URLs em português, o conteúdo pedagógico em
português e usuários que já dependem dele. Adicionar inglês não pode custar
nenhuma dessas três coisas.

O plano de produto exige, entre outras invariantes:

- `pt-BR` continua sendo o padrão;
- as URLs portuguesas **continuam sem prefixo** — `/aberturas` é `/aberturas`;
- trocar de idioma **não pode perder o lugar** do aluno;
- FEN, UCI, ids e progresso **não têm idioma**;
- nada de `locale === 'en' ? ... : ...` espalhado pelas telas.

## Decisão

### 1. Segmento `[lang]` com reescrita, não redirecionamento

O app inteiro passou a viver em `src/app/[lang]/…`, e `src/proxy.ts` reescreve
cada requisição para o segmento certo. `/aberturas` chega como `/pt-BR/aberturas`
e a barra do navegador continua mostrando `/aberturas`.

É o que permite `<html lang>` sair certo do servidor — leitor de tela escolhe a
voz por esse atributo — sem mexer em nenhuma URL existente.

### 2. Caminho sem prefixo é PORTUGUÊS

A primeira versão deixava o cookie e o `Accept-Language` decidirem em qualquer
caminho sem prefixo, e o efeito apareceu no primeiro teste: um navegador em
inglês abria `/aberturas/italiana` e recebia inglês. A URL existente deixava de
significar o que significava.

`/aberturas` não é um endereço neutro — é o endereço português. Só a **raiz**
(`/`) não diz nem seção nem idioma, e é lá que a preferência gravada decide.

### 3. Sem biblioteca de i18n

`next-intl` e equivalentes resolvem roteamento, negociação, formatação e ICU. O
projeto já tem roteamento (`rotas.ts`), negociação (`proxy.ts`) e formatação
(`Intl` nativo, que a biblioteca usa por baixo). O que sobra é interpolação e
plural: sessenta linhas em `mensagens.ts`.

O `CLAUDE.md` pede necessidade demonstrada para dependência nova. O custo concreto
de uma dependência de roteamento é ela decidir como as URLs se comportam — e este
produto tem um requisito que contraria o padrão da maioria delas: **o idioma
padrão não ganha prefixo**.

A troca continua barata: `traduzir` vira a chamada da biblioteca e o resto fica.

### 4. O domínio devolve a ESCOLHA, não a palavra

`rotuloDeRetomada` devolvia `'Estudar'`. Agora `retomadaDaJornada` devolve
`'estudar'`, e quem escreve a palavra é a tela. O mesmo para `verboDoHoje` e para
`resumoDaJornada`, que devolvia `"1 de 3 etapas"` e agora devolve os dois números
— porque a frase não atravessa idioma: em inglês a ordem muda e o plural depende
do número.

Era a única forma de traduzir os cards sem traduzir dentro do domínio.

### 5. Id é canônico; nome é apresentação

`italiana` continua `italiana` na URL, no progresso e na store de jornadas; o que
muda é "Abertura Italiana" virar "Italian Game". O mesmo para `opposition` e
`tactics.fork`.

O **português dos nomes vem do próprio catálogo**, não de uma cópia: só o inglês é
escrito à mão. Assim o português nunca diverge do conteúdo, e o que falta em
inglês aparece como número num portão.

### 6. Slug dinâmico não é traduzido — por enquanto

`/en/openings/italiana` mantém o slug português. Traduzi-lo exigiria um mapa por
conteúdo, mantido à mão, em dois idiomas; no dia em que ele divergisse do
catálogo, produziria um link que abre a abertura errada. O plano prevê essa
escolha (§32): manter o slug canônico primeiro, localizar depois, sem bloquear a
internacionalização inteira.

## Consequências

**O que passou a ser possível.** Trocar PT/EN em qualquer tela, continuando no
mesmo lugar, com a query — e portanto o checkpoint — preservada. O tema
sobrevive à troca; o progresso também, porque é indexado por ids sem idioma.

**Um defeito descoberto pelo caminho.** Cruzar o segmento `[lang]` re-renderiza o
layout raiz, e o React reconcilia o `<html>` com o que o servidor mandou — o
`data-theme` escrito pelo botão sumia. Trocar de idioma apagava o tema.
`ThemeSync` reafirma a preferência a cada navegação.

**O que ainda não está pronto.** O conteúdo pedagógico. Está medido em
`docs/i18n-audit.md`, e pelo critério do próprio plano (§169) o inglês ainda não é
uma experiência de aprendizado completa. A alternativa — traduzir ~850 trechos de
prosa de xadrez por máquina — produziria o que o `CLAUDE.md` proíbe: explicação
que soa certa e não é.

**O custo aceito.** Uma string nova exige duas entradas, e uma chave sem par
reprova no portão. É deliberado: é o que impede a próxima tela de nascer só em
português.

## Portões

- `tests/unit/i18n.test.ts`
- `tests/e2e/idioma.spec.ts`
