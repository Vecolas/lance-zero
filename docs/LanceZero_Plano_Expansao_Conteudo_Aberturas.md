# Plano de Expansão de Conteúdo — Aberturas

> **Procedência.** Este é o plano aprovado que guiou a expansão do catálogo de
> aberturas de 6 para 35 cursos (PR #114). Ele entra no repositório porque o
> código e os testes o citam como norma: há mais de dez comentários em `src/` e
> `tests/` na forma "plano de expansão §N", e até esta gravação esses ponteiros
> não tinham destino verificável.
>
> **O corpo abaixo é o texto aprovado, sem reorganização.** Nenhuma seção foi
> renumerada, reordenada, resumida ou promovida a cabeçalho de Markdown — a
> numeração `1.` a `74.` é o endereço que os comentários usam, e mexer nela
> quebraria as referências em silêncio. Quem quiser reformatar este documento
> deve alterar as citações no mesmo commit; o portão
> `tests/unit/docs-referencias-normativas.test.ts` reprova se uma citação ficar
> sem destino.
>
> **Discrepância conhecida, registrada e não corrigida aqui.** O §52
> (_PlanLibrary_) exige "microdecisão no board" em **cada plano**. O conteúdo de
> hoje tem microdecisão em 2 dos 105 planos. Isso é a dívida D-01, e a decisão
> de relaxar §52 — se for tomada — pertence a um ADR, não a este documento.

---

O documento tem cerca de 2.100 linhas. Parti do que existe hoje: o LanceZero já possui seis cursos — Italiana, Caro-Kann, Gambito da Dama Recusado, Escocesa, Londres e Eslava — e eles já têm linha principal, variações, planos, estruturas e grafo derivado. A expansão, portanto, não começa criando vinte cards novos: primeiro transforma essas seis em cursos VNext completos.

Para padronizar nomenclatura e evitar invenções de nomes/linhas, defini o dataset CC0 lichess-org/chess-openings como referência canônica de ECO, nome, PGN, UCI e EPD. Ele também foi construído explicitamente para lidar com transposições por posição, o que casa muito bem com o grafo que o LanceZero já possui. Para decidir o catálogo mais reconhecível, comparei também famílias apresentadas como populares nas bibliotecas atuais de abertura; aparecem consistentemente Siciliana, Francesa, Ruy López, Caro-Kann, Italiana, Escandinava, Pirc, Gambito da Dama, Eslava, Índia do Rei, Nimzo-Índia, Catalã, Grünfeld, Holandesa, Londres, Réti e Inglesa, entre outras.

A expansão ficou dividida em ondas:

Onda 0: aprofundar Italiana, Caro-Kann, QGD, Escocesa, Londres e Eslava. Onda 1: Ruy López, Siciliana Foundation, Francesa, Gambito da Dama Aceito, Índia do Rei, Nimzo-Índia, Catalã e Inglesa. Onda 2: Semi-Eslava, Grünfeld, Índia da Dama, Holandesa, Escandinava, Pirc, Moderna e Réti. Onda 3: Viena, Gambito do Rei, Alekhine, Benoni Moderna, Benko, Trompowsky, Ataque Índia do Rei, Bogo-Índia, Tarrasch e Jobava London. Depois entram cursos especializados como Najdorf, Dragão e Sveshnikov.

Também não tratei “Siciliana” como um curso monstruoso. O plano cria primeiro:

Sicilian Defense — Foundation

com:

Open Sicilian
Alapin
Closed Sicilian
Smith-Morra
Rossolimo/Moscow concepts

e depois cursos próprios:

Sicilian Najdorf
Sicilian Dragon
Sicilian Sveshnikov

Isso é especialmente importante porque a Siciliana possui uma quantidade enorme de teoria; até referências generalistas já separam Open, Closed, Najdorf, Alapin e Dragon entre suas linhas principais.

Para cada abertura deixei variações concretas. Por exemplo, a Italiana ganha Giuoco Piano, Pianissimo, Two Knights e Evans Gambit como núcleo; essas estão entre as linhas mais reconhecidas da família. A Caro-Kann recebe Classical, Advance, Exchange, Panov-Botvinnik e Fantasy. A Francesa recebe Advance, Tarrasch, Winawer, Classical e Exchange. A Índia do Rei inclui Classical, Sämisch, Four Pawns, Fianchetto e Averbakh, enquanto a Nimzo cobre Rubinstein, Classical/Capablanca, Sämisch, Three Knights e Leningrad.

O mesmo foi feito com Catalã, Grünfeld, Holandesa, Pirc, Escandinava, Viena, Gambito do Rei, Alekhine, Benoni, Benko e Trompowsky, sempre distinguindo:

CORE
SECONDARY
OPTIONAL

Isso impede que “mais conteúdo” destrua a didática. Por exemplo, a Alekhine fica inicialmente em Modern, Exchange e Four Pawns, que são justamente as três grandes famílias normalmente usadas para explicar a defesa.

Um ponto importante do plano é que adicionar 30 aberturas não transforma o Roadmap em 30 obrigações. A arquitetura vira baseada em escolhas de repertório:

Brancas:
escolha 1.e4 / 1.d4 / 1.c4-Nf3

Pretas vs 1.e4:
escolha e5 / Siciliana / Francesa / Caro / ...

Pretas vs 1.d4:
escolha QGD / Slav / KID / Nimzo / ...

A biblioteca oferece tudo; o Roadmap ajuda a montar um repertório coerente.

Também deixei uma regra editorial importante: um nome ECO não vira automaticamente uma lição. O dataset serve para classificar e validar. Só vira branch pedagógica quando houver valor real de ensino. Isso evita terminar com centenas de microvariações sem importância prática.

Cada core branch só pode ser lançado se tiver:

posição representativa
branch point
intenção do adversário
objetivo do aluno
explicação
plano
erro comum
training boundary
política para jogar do outro lado
PT-BR
EN
testes

E cada curso precisa obrigatoriamente ter:

VariationLibrary
PlanLibrary
Guided Practice
Final Training
Transposition Map
Review Mapping
Real-game Mapping

Também documentei relações importantes para evitar duplicação:

QGD ↔ Catalan
QGD ↔ Ragozin ↔ Nimzo
Slav ↔ Semi-Slav
Réti ↔ English ↔ QGD
Pirc ↔ Modern
Nimzo ↔ QID/Bogo
Italian ↔ Scotch Gambit

Como o sistema já reconhece posições e transposições pelo grafo, essa expansão deve reaproveitar isso em vez de copiar a mesma explicação para três cursos.

Por fim, o plano inclui pipeline editorial, estrutura de arquivos, versionamento de cursos, migração de progresso, gates automáticos, content-gap derivado das partidas reais, QA, releases sugeridas e critérios de conclusão. Também deixei explícito que um usuário que já concluiu uma abertura não deve perder o ✓ simplesmente porque cinco variações opcionais foram adicionadas depois.

A regra que governa todo o documento é:

Expandir a biblioteca sem transformar o LanceZero numa enciclopédia. Cada nova abertura precisa ensinar o jogador a reconhecer, entender, jogar, variar, lembrar e aplicar aquela família em partidas reais. LanceZero — Plano Definitivo de Expansão de Conteúdo das Aberturas

Catálogo real, variações, prioridades editoriais e regras de implementação sobre o VNext

Status: executar depois da estabilização do plano arquitetural/pedagógico VNext de Aberturas.

Objetivo

Ampliar de forma real o catálogo sem transformar o LanceZero em uma enciclopédia de nomes ECO. O foco passa a ser:

aprofundar primeiro as 6 aberturas atuais;

adicionar as famílias mais conhecidas em ondas;

documentar variações core, secondary e optional;

ligar cada branch a ideias, planos, estruturas, erros e training boundary;

reutilizar posições/transposições;

manter o tabuleiro como meio de ensino e resposta;

preservar FSRS, treino por cobertura, ambos os lados, PT-BR/EN e integração com partidas reais.

A regra editorial é:

menos cursos rasos

>

mais nomes no catálogo

e:

branch entendida

>

sequência memorizada sem contexto

1. Fontes canônicas

1.1 Nomenclatura / ECO / posições

Usar o dataset CC0:

lichess-org/chess-openings

https://github.com/lichess-org/chess-openings

Usos permitidos no pipeline editorial:

nome em inglês;

ECO;

PGN;

UCI;

EPD;

aliases;

identificação de transposições.

Ele serve para nomear e validar, não para gerar automaticamente o currículo.

1.2 Curadoria secundária

Usar Chess.com Openings apenas como referência editorial sobre famílias e linhas amplamente ensinadas:

https://www.chess.com/openings

1.3 Benchmark de treino

Usar ChessTempo Opening Trainer como benchmark de:

branch training;

breadth vs depth;

repetição espaçada;

desvios pós-partida.

Não copiar UI.

2. Meta de catálogo

Base atual:

6 cursos

Após Onda 0:

as 6 atuais aprofundadas

Após Onda 1:

14 famílias

Após Onda 2:

22 famílias

Após Onda 3:

aprox. 30 famílias/cursos

O número não é KPI. É um limite de planejamento.

3. Hierarquia editorial

Todo branch:

importance:
| 'core'
| 'secondary'
| 'optional'

Core

Obrigatório para conclusão inicial.

Secondary

Importante, mas não bloqueia o núcleo.

Optional

Explorável e útil, porém não necessário para considerar o curso principal concluído.

Meta por curso novo:

1 main branch
3–5 core
2–4 secondary
0–3 optional

Se um curso precisa de 15 branches core:

ele está grande demais.

Criar curso filho.

4. Curso pai e curso filho

Exemplo principal:

Sicilian Defense — Foundation

não deve conter toda a teoria de:

Najdorf
Dragon
Sveshnikov
Scheveningen
Classical
Accelerated Dragon
Taimanov
Kan
Closed
Alapin
Smith-Morra
Rossolimo
...

O Foundation ensina o mapa da Siciliana.

Depois:

Sicilian Najdorf
Sicilian Dragon
Sicilian Sveshnikov

podem virar cursos especializados.

Aplicar a mesma lógica quando necessário a:

Ruy López;

King's Indian;

Nimzo-Indian;

English;

Semi-Slav;

Grünfeld.

5. Conteúdo obrigatório por curso

Cada OpeningCourseVNext deve conter:

Visão;

Ideias;

Linha Principal;

VariationLibrary;

PlanLibrary;

prática pelos dois lados;

Guided Practice;

Final Training;

transposition map;

review mapping;

real-game deviation mapping;

preview board da biblioteca.

6. Conteúdo obrigatório por branch

Cada core branch:

id
nome PT
nome EN
ECO
branchPointPositionId
sequência mínima canônica
actor metadata
importance
opponentIntent
studentGoal
conceptIds
planIds
pawnStructureIds
tacticalMotifIds
commonMistakes
trainingBoundary
acceptedTranspositions
reverseRolePolicy

Não criar branch só porque um nome existe no ECO.

7. Onda 0 — aprofundar os 6 cursos atuais

Antes de adicionar nova família:

Italiana

Caro-Kann

Gambito da Dama Recusado

Escocesa

Londres

Eslava

precisam passar integralmente pelo VNext.

8. Italiana

Entry

1.e4 e5
2.Nf3 Nc6
3.Bc4

Core branches

Giuoco Piano

3...Bc5

Ensinar:

desenvolvimento simétrico;

pressão f2/f7;

c3 + d4;

segurança do rei;

quando abrir o centro.

Giuoco Pianissimo

Estruturas com:

d3

Ensinar:

centro fechado;

reagrupamentos;

preparar d4;

manobras antes do rompimento.

Two Knights Defense

3...Nf6

Ensinar:

ataque imediato a e4;

diferença em relação a ...Bc5;

perigo de jogar automaticamente.

Evans Gambit

3...Bc5
4.b4

Ensinar:

tempo vs material;

iniciativa;

abertura de linhas;

aceitar/recusar.

Secondary

Center Attack;

Ng5/Fried-Liver motifs;

Italian Gambit.

Não ensinar “armadilha” isolada: ligar sempre ao princípio.

PlanLibrary

d4 break;

Nbd2-f1-g3;

pressão f7;

a4;

melhorar o bispo c1;

quando trocar no centro.

9. Caro-Kann

Entry

1.e4 c6
2.d4 d5

Core

Classical

3.Nc3 dxe4
4.Nxe4 Bf5

Advance

3.e5

Subbranches secondary:

Short;

Tal;

Shirov.

Exchange

3.exd5 cxd5

Panov-Botvinnik

3.exd5 cxd5
4.c4

Fantasy

3.f3

PlanLibrary

...c5;

Bf5 antes de ...e6;

pressão central;

finais sólidos;

IQP no Panov.

10. Gambito da Dama Recusado

Entry

1.d4 d5
2.c4 e6

Core

Orthodox

Estrutura:

...Nf6
...Be7
...O-O
...Nbd7

Exchange

cxd5 exd5

Ensinar:

Carlsbad;

minority attack;

e4 break.

Tartakower

Ideia:

...h6
...b6
...Bb7

Cambridge Springs

...Nbd7
...c6
...Qa5

Secondary

Ragozin;

Semi-Tarrasch;

Harrwitz/Neo-Orthodox.

Cursos separados

Tarrasch Defense;

Semi-Slav.

11. Escocesa

Entry

1.e4 e5
2.Nf3 Nc6
3.d4

Core

Classical ...Bc5;

Schmidt ...Nf6;

Mieses structures;

Scotch Gambit Bc4.

Secondary

Göring Gambit;

Steinitz;

Dubois-Réti;

Four Knights transpositions.

12. Sistema Londres

Posição conceitual

d4
Bf4
Nf3
e3
c3

Não tratar como sequência rígida.

Core response families

mainline ...d5 / ...c5;

Indian setup ...Nf6 / ...g6;

early ...c5 + ...Qb6;

mirror ...Bf5.

Secondary

early ...Nh5;

...e6 structures;

alternate ...c5 setups.

Curso separado

Jobava London

O cavalo em c3 altera demais a estrutura para ser apenas branch core da London clássica.

13. Defesa Eslava

Entry

1.d4 d5
2.c4 c6

Core

Main Slav com ...dxc4/...Bf5;

Exchange Slav;

e3 systems;

...a6 / Chebanenko-type structure.

Secondary

Geller ideas;

Czech/Mainline structures;

Smyslov-type setups.

Curso separado

Semi-Slav.

14. Onda 1 — novas famílias essenciais

Adicionar:

Ruy López

Sicilian Defense — Foundation

French Defense

Queen's Gambit Accepted

King's Indian Defense

Nimzo-Indian Defense

Catalan Opening

English Opening

15. Ruy López

Entry

1.e4 e5
2.Nf3 Nc6
3.Bb5

Core

Morphy / Closed family

3...a6
4.Ba4 Nf6
5.O-O Be7

Berlin

3...Nf6

Exchange

3...a6
4.Bxc6

Open Variation

Ensinar como identidade própria.

Marshall / Anti-Marshall

Introduzir a ideia sem exigir teoria profunda.

Secondary dentro do Closed

Chigorin;

Breyer;

Zaitsev.

PlanLibrary

c3+d4;

Nbd2-f1-g3;

a4;

pressão e5;

manobra central;

kingside pressure.

16. Sicilian Defense — Foundation

Entry

1.e4 c5

Core

Open Sicilian

2.Nf3
3.d4

Alapin

2.c3

Closed Sicilian

2.Nc3

Smith-Morra

2.d4 cxd4
3.c3

Rossolimo / Moscow concept

Ensinar como anti-Sicilian conceitual conforme a resposta preta.

Final do Foundation

Mostrar como mapa de expansão:

Najdorf;

Dragon;

Classical;

Scheveningen;

Sveshnikov;

Accelerated Dragon;

Taimanov/Kan.

Não exigir todos.

17. Sicilian Najdorf — curso filho

Entry

1.e4 c5
2.Nf3 d6
3.d4 cxd4
4.Nxd4 Nf6
5.Nc3 a6

Core White systems

6.Bg5;

6.Be3 English Attack;

6.Be2;

6.Bc4;

6.f3.

Secondary

h3;

g3;

positional systems.

18. Sicilian Dragon — curso filho

Core:

Classical;

Yugoslav Attack;

Fianchetto;

Soltis-type ideas como secondary.

Ensinar:

opposite-side castling;

open c-file;

exchange sacrifice on c3;

h-pawn attack.

19. Sicilian Sveshnikov — curso filho posterior

Ensinar:

...e5;

hole em d5;

...f5;

dynamic compensation.

Não precisa entrar na primeira onda.

20. Defesa Francesa

Entry

1.e4 e6
2.d4 d5

Core

Advance 3.e5;

Tarrasch 3.Nd2;

Winawer 3.Nc3 Bb4;

Classical 3.Nc3 Nf6 4.Bg5;

Exchange 3.exd5.

PlanLibrary

...c5;

...f6;

atacar a base da cadeia;

problema do bispo c8;

kingside vs queenside.

21. Gambito da Dama Aceito

Entry

1.d4 d5
2.c4 dxc4

Core

3.Nf3;

3.e3;

3.e4 Central Variation.

Secondary

3.Nc3;

early ...a6/...b5;

Classical structures.

Concepts

Black não precisa “segurar o peão”;

desenvolvimento vs material;

centro e4;

c-file.

22. Defesa Índia do Rei

Entry

1.d4 Nf6
2.c4 g6
3.Nc3 Bg7
4.e4 d6

Core

Classical;

Sämisch;

Four Pawns Attack;

Fianchetto;

Averbakh.

Secondary

Makogonov;

Petrosian;

Bayonet como subbranch do Classical.

Plans

...e5;

...f5;

kingside attack;

queenside expansion branca;

locked-center timing.

23. Nimzo-Indian

Entry

1.d4 Nf6
2.c4 e6
3.Nc3 Bb4

Core

Rubinstein 4.e3;

Classical/Capablanca 4.Qc2;

Sämisch 4.a3;

Three Knights 4.Nf3;

Leningrad 4.Bg5.

Concepts

bishop pair;

doubled c-pawns;

control of e4;

structure vs development;

transposition to Ragozin.

24. Catalã

Entry

1.d4 Nf6
2.c4 e6
3.g3

Aceitar ordens vindas do QGD.

Core

Open Catalan ...dxc4;

Closed Catalan ...d5/...c6;

...c5 / Anti-Catalan structures.

Concepts

long diagonal;

c4 pawn;

positional gambit;

long-term queenside pressure.

Esse curso deve funcionar como teste forte do sistema de transposições.

25. Abertura Inglesa

Entry

1.c4

Foundation core

Reversed Sicilian ...e5;

Symmetrical English ...c5;

Anglo-Indian ...Nf6;

Four Knights structures;

Botvinnik setup.

Transpositions

Mapear explicitamente:

Réti;

QGD;

KID;

Nimzo/QID structures.

26. Onda 2 — cobertura ampla

Adicionar:

Semi-Slav

Grünfeld

Queen's Indian

Dutch

Scandinavian

Pirc

Modern Defense

Réti

27. Semi-Slav

Entry

1.d4 d5
2.c4 c6
3.Nf3 Nf6
4.Nc3 e6

Core

Meran;

Anti-Meran;

Botvinnik;

Moscow;

Anti-Moscow.

Primeira versão:

ensinar identidade + decisões + planos.

Não tentar cobrir 25 lances de teoria em cada linha.

28. Grünfeld

Entry

1.d4 Nf6
2.c4 g6
3.Nc3 d5

Core

Exchange;

Russian;

Fianchetto;

Bf4 systems.

Concepts

centro branco como alvo;

...c5;

pressão d4;

diagonal longa;

atividade dinâmica.

29. Queen's Indian

Entry

1.d4 Nf6
2.c4 e6
3.Nf3 b6

Core

Fianchetto/Nimzowitsch ...Ba6;

Petrosian 4.a3;

4.g3 systems;

e3 structures.

30. Dutch

Entry

1.d4 f5

Core

Leningrad;

Stonewall;

Classical.

Secondary anti-systems

Staunton Gambit;

Hopton Attack.

31. Scandinavian

Entry

1.e4 d5
2.exd5

Core

2...Qxd5 3.Nc3 Qa5;

...Qd6;

Modern 2...Nf6.

Secondary

Portuguese;

Icelandic;

...Qd8.

32. Pirc

Entry

1.e4 d6
2.d4 Nf6
3.Nc3 g6

Core

Classical;

Austrian Attack;

150 Attack;

Byrne;

Fianchetto/Sveshnikov system.

33. Modern Defense

Entry

1.e4 g6
2.d4 Bg7

Core

Standard with ...d6;

Two Knights;

Averbakh/Anti-Modern;

Gurgenidze.

Secondary

Pterodactyl;

early ...c5.

Compartilhar nodes com a Pirc quando a posição for idêntica.

34. Réti

Entry

1.Nf3

Core

1...d5 2.c4;

Réti Gambit concepts;

KIA setup;

English transpositions;

QGD/Indian transpositions.

O curso deve ensinar flexibilidade, não uma sequência rígida.

35. Onda 3 — clássicas e armas populares

Adicionar progressivamente:

Vienna Game

King's Gambit

Alekhine Defense

Modern Benoni

Benko Gambit

Trompowsky Attack

King's Indian Attack

Bogo-Indian

Tarrasch Defense

Jobava London

36. Vienna Game

Entry

1.e4 e5
2.Nc3

Core

Falkbeer ...Nf6;

Mieses g3;

Vienna Gambit f4;

Max Lange ...Nc6;

Frankenstein-Dracula tactical branch.

37. King's Gambit

Entry

1.e4 e5
2.f4

Core

Accepted — King's Knight;

Accepted — Bishop's Gambit;

Declined — Falkbeer;

Declined — Classical.

Secondary

Fischer Defense;

Cunningham ideas.

38. Alekhine

Entry

1.e4 Nf6

Core

Modern;

Exchange;

Four Pawns Attack.

Secondary

Alburt;

Larsen;

Two Pawns.

39. Modern Benoni

Entry structure

1.d4 Nf6
2.c4 c5
3.d5 e6
4.Nc3 exd5
5.cxd5 d6
6.e4 g6

Core

Classical;

Fianchetto;

Taimanov/Flick-Knife;

positional/knight-tour structures.

Concepts

white space;

e5 break;

...b5;

dark-square bishop;

queenside counterplay.

40. Benko Gambit

Entry

1.d4 Nf6
2.c4 c5
3.d5 b5

Core

Fully Accepted 7.e4;

Fully Accepted 7.g3;

Fully Accepted 7.Nf3;

Half-Accepted;

Declined.

41. Trompowsky

Entry

1.d4 Nf6
2.Bg5

Core

2...Ne4;

2...e6;

2...d5;

2...c5;

2...g6.

42. King's Indian Attack

Estrutura conceitual

Nf3
g3
Bg2
d3
O-O
Nbd2
e4

Core opposition

...d5/...Nf6;

...c5;

...e5;

French/Sicilian structures.

43. Bogo-Indian

Entry

1.d4 Nf6
2.c4 e6
3.Nf3 Bb4+

Core:

Bd2;

Nbd2;

exchange structures.

Serve de ponte entre Nimzo e QID.

44. Tarrasch Defense

Entry

1.d4 d5
2.c4 e6
3.Nc3 c5

Core

Main Line;

IQP structures;

modern setups.

Concepts

active pieces;

IQP;

activity vs weakness.

45. Jobava London

Entry

1.d4 Nf6
2.Nc3 d5
3.Bf4

Curso separado porque:

Nc3 bloqueia c-pawn;

e4 fica mais central;

Nb5 motifs;

ataques diferem do London tradicional.

46. Long tail que pode esperar

Não priorizar antes das ondas acima:

Grob;

Polish/Sokolsky;

Englund;

Elephant;

Latvian;

Owen;

Blackmar-Diemer;

Danish;

Center Game;

Bird;

Larsen;

Colle;

Torre;

Veresov.

Podem entrar no futuro.

47. Transposições obrigatórias

Criar links explícitos:

Italian ↔ Scotch Gambit
QGD ↔ Catalan
QGD ↔ Ragozin ↔ Nimzo
Slav ↔ Semi-Slav
Réti ↔ English ↔ QGD
Pirc ↔ Modern
Nimzo ↔ QID/Bogo

48. Modelo

interface OpeningTranspositionLink {
positionId: string
courseIds: string[]
canonicalOwnerCourseId?: string
noteKey?: string
}

Não duplicar explicação quando a posição é a mesma.

49. Shared Concepts

Criar conteúdo compartilhado:

IQP;

Carlsbad;

minority attack;

bishop pair;

space vs counterplay;

material vs initiative;

central break d4;

central break e5;

open file;

backward pawn;

hanging pawns.

Cada curso explica:

como isso aparece aqui.

50. Shared Pawn Structures

IDs:

carlsbad
iqp
hanging-pawns
benoni-center
kid-locked-center
slav-triangle
french-chain
caro-advance-chain

51. Typical tactical motifs

Por curso:

2–6 motifs

Não criar capítulo de “armadilhas” separado por padrão.

Toda tática precisa ser ligada ao conceito.

52. PlanLibrary

Por curso:

3–6 planos

Cada plano:

representative FEN;

quando usar;

objetivo;

o que o adversário faz;

microdecisão no board.

53. Model game slices

Por curso:

1–3

Não exigir partida completa.

Slice:

saída da abertura
→ plano
→ 5–12 lances instrutivos

Comentários autorais do LanceZero.

54. Training boundary

Não definir por:

“sempre 12 plies”.

Definir por branch.

type OpeningBoundary =
| { type: 'graph-leaf' }
| { type: 'ply'; maxPly: number }
| { type: 'position'; positionIds: string[] }
| { type: 'handoff'; planId: string }

Parar quando a habilidade correta deixa de ser lembrar teoria e passa a ser executar o plano.

55. Roadmap com catálogo grande

Nunca exigir:

todas as aberturas.

Criar choice groups.

Brancas

Escolher:

1.e4 family
1.d4 family
1.c4/Nf3 family

Pretas vs 1.e4

Escolher uma defesa principal:

e5;

Sicilian;

French;

Caro;

Scandinavian;

Pirc/Modern;

Alekhine.

Pretas vs 1.d4

Escolher:

QGD;

Slav/Semi-Slav;

KID;

Nimzo/QID;

Grünfeld;

Dutch;

Benoni.

Biblioteca mostra tudo.

Roadmap orienta escolhas.

56. Catalog completeness ≠ user completion

Quanto mais conteúdo o produto recebe, menos faz sentido:

“complete todas as aberturas”.

Separar:

currículo essencial
repertório escolhido
biblioteca opcional.

57. Não punir usuários antigos

Se curso recebe novas branches depois que usuário já concluiu:

não retirar:

✓ núcleo concluído.

Mostrar:

Novo conteúdo disponível.

58. Course version

Persistir:

courseVersion
coreVersion

Nova branch optional não reduz progresso.

Mudança core exige migration explícita.

59. Migração de branch IDs

Se renomear:

usar:

legacyAliases

para preservar review cards e progresso.

60. Pipeline editorial de um curso novo

Fase A — definição

id;

entry position;

main branch;

branch list;

importance.

Fase B — chess data

PGN;

UCI;

FEN/EPD;

position identity;

transpositions;

boundaries.

Fase C — pedagogy

Por branch:

opponent intent;

student goal;

concepts;

plan;

mistakes;

hints.

Fase D — plans

typical positions;

microdecisions.

Fase E — role reversal

primary role;

reverse role targets.

Fase F — Guided Practice

branch pool;

fading policy;

selection.

Fase G — Final Training

coverage derived from core branches;

role coverage;

boundary.

Fase H — Review

grouping;

context reconstruction;

relearn target.

Fase I — Real games

first deviation detection;

branch mapping.

Fase J — localization

PT-BR;

EN.

Fase K — QA

unit;

contracts;

E2E;

visual.

61. Checklist obrigatório por core branch

[ ] canonical name
[ ] ECO
[ ] legal line
[ ] branch point
[ ] representative FEN
[ ] opponent intent
[ ] student goal
[ ] explanation
[ ] plan
[ ] common mistake
[ ] boundary
[ ] reverse-role policy
[ ] PT
[ ] EN
[ ] tests

62. Gates

Criar gates:

illegal branch;

unreachable branch;

duplicated branch;

duplicated position not declared as transposition;

core without plan;

core without intent;

core without goal;

core without boundary;

missing translation;

invalid previewFen;

expected move illegal;

stale manual counts;

training target not derived from content.

63. Dataset import

Criar script:

scripts/openings/import-names

Resultado:

canonical name lookup
ECO
PGN
UCI
EPD

Mas o registro oficial do LanceZero continua:

OpeningCourseRegistry

Somente conteúdo autorado entra na UI.

64. Estrutura de diretórios sugerida

src/content/openings/
registry.ts

shared/
concepts/
structures/
motifs/

courses/
italian/
caro-kann/
qgd/
scotch/
london/
slav/
ruy-lopez/
sicilian-foundation/
french/
qga/
kings-indian/
nimzo-indian/
catalan/
english/
...

Por curso:

course.ts
branches.ts
plans.ts
positions.ts
mistakes.ts
model-games.ts
pt-BR.ts
en.ts

Adaptar à organização real sem duplicar sistema existente.

65. Fonte e popularidade

O campo atual frequency do graph não pode ser usado como popularidade real.

Renomear antes da expansão:

authoringPathCount

Se futuramente houver:

referenceFrequency

exigir:

fonte;

data;

população;

rating band;

time control;

sample size.

66. Não depender do live explorer

A jornada precisa continuar:

local-first
offline-capable
determinística

O live explorer pode ser referência externa, nunca requisito.

67. Real-game content loop

Com mais cursos, criar:

Das suas partidas

por curso.

Exemplo:

Você saiu do repertório nesta posição em 3 partidas.

[mini board]

[Estudar esta branch]

68. Content gaps

Se partidas reais mostram repetidamente uma jogada ainda não autorada:

registrar:

interface OpeningContentGap {
positionId: string
observedMove: string
userCount: number
gameCount: number
courseId?: string
}

Não autorar automaticamente.

Entrar em:

fila editorial.

69. Complexidade dos cursos

Pode mostrar:

baixa
média
alta

como “complexidade teórica”.

Não usar como bloqueio.

Exemplos:

London: baixa/média
Italian: média
Najdorf: alta
Catalan: média/alta

70. Ordem de releases recomendada

C0 — enriquecer existentes

Italian, Caro, QGD, Scotch, London, Slav.

C1

Ruy López

French

Sicilian Foundation

Queen's Gambit Accepted

C2

King's Indian

Nimzo-Indian

Catalan

English

C3

Semi-Slav

Grünfeld

Queen's Indian

Dutch

C4

Scandinavian

Pirc

Modern

Réti

C5

Vienna

King's Gambit

Alekhine

Benoni

Benko

Trompowsky

Advanced packs

Najdorf

Dragon

Sveshnikov

KIA

Bogo

Tarrasch

Jobava.

71. Não adicionar tudo de uma vez

Cada release deve passar:

check
unit
contract
e2e
visual
migration

antes da próxima.

72. Critério de qualidade

Um curso só está pronto quando o aluno consegue:

reconhecer a posição;

explicar objetivo geral;

jogar mainline;

responder a core variations;

explicar o que o adversário quer;

identificar estrutura;

executar ao menos um plano de meio-jogo;

jogar pelos dois lados;

reconhecer transposição;

recuperar sem ajuda;

revisar depois;

corrigir desvio de partida real.

73. O que não fazer

Não:

adicionar 30 cursos rasos;

usar cada nome ECO como lição;

aprofundar 25 lances antes de ensinar o plano;

duplicar posição transposta;

exigir todas as aberturas no Roadmap;

usar SAN como resposta;

usar Stockfish livre como professor do repertório;

confundir authoringPathCount com popularidade;

depender de explorer online;

apagar conclusão antiga após expansão;

deixar core branch sem PT/EN;

introduzir branch sem boundary;

criar “armadilhas” sem princípio.

74. Instrução final para o agente

Expandir Aberturas somente sobre a arquitetura VNext estabilizada.

Invariantes:

deepen the six existing courses before expanding breadth;

use the CC0 Lichess opening dataset as canonical naming/ECO/PGN/UCI/EPD reference, but never auto-generate curriculum from it;

author around pedagogically meaningful branches;

every course has main/core/secondary/optional branches;

split huge families into foundation and specialized child courses;

Sicilian must start with a Foundation course before Najdorf/Dragon/Sveshnikov deep dives;

add Ruy López, Sicilian Foundation, French, QGA, KID, Nimzo, Catalan and English in Wave 1;

add Semi-Slav, Grünfeld, QID, Dutch, Scandinavian, Pirc, Modern and Réti in Wave 2;

add Vienna, King's Gambit, Alekhine, Modern Benoni, Benko, Trompowsky, KIA, Bogo, Tarrasch and Jobava progressively in Wave 3;

preserve the VNext eight-stage journey;

never restore an isolated Opponent Responses stage;

every core branch needs board position, opponent intent, student goal, plan, mistake, boundary, reverse-role policy, PT and EN;

every course needs a VariationLibrary and PlanLibrary;

do not continue theory past the point where the correct skill becomes middlegame planning;

share structures and concepts across courses rather than duplicating instruction;

aggressively reuse transposition-aware position identity;

never treat legacy graph frequency as external popularity;

preserve board-based interaction, MesaDeEstudo, adaptive Guided Practice, coverage-driven Final Training, FSRS and real-game deviation feedback;

keep the Roadmap repertoire-based instead of forcing completion of the entire library;

adding new content must not revoke previously earned core completion;

version course content and migrate progress deterministically;

all new courses must pass legality, reachability, transposition, localization, boundary and coverage gates;

game-derived content gaps go to an editorial queue and never become auto-authored official repertoire.

A expansão está correta quando o LanceZero possui uma biblioteca ampla e reconhecível, mas cada curso ainda ensina como entender, jogar, variar, lembrar e aplicar a abertura — em vez de simplesmente adicionar mais nomes. agora prossiga com a implementação desse plano
