# Assets da engine (GPL-3.0) — pasta isolada de propósito

Aqui moram os binários do Stockfish (build WASM do projeto `nmrugg/stockfish.js`).
Eles são licenciados sob **GPL-3.0**, enquanto o restante do LanceZero não é.

Por isso a pasta é isolada e tem regras próprias:

- os arquivos são **distribuídos como estão**, sem nenhuma modificação;
- eles **não entram no bundle da aplicação**: são servidos como assets estáticos
  e carregados em tempo de execução dentro de um Web Worker;
- nenhum código nosso é linkado com a engine — a conversa é só por mensagens de
  texto do protocolo UCI;
- `COPYING.txt` traz o texto integral da GPL-3.0;
- `SOURCE.txt` registra pacote, versão exata, URLs de origem e hash sha256 de
  cada arquivo, para que qualquer pessoa consiga reproduzir o download.

Quem fala com estes arquivos:

- `src/lib/engine/worker-factory.ts` — monta a URL do worker;
- `src/workers/stockfish.worker.ts` — ponte fina de mensagens;
- `src/lib/engine/stockfish-provider.ts` — protocolo, fila e cancelamento.

Não carregue a engine na página inicial: são ~7 MB de WASM. O carregamento é sob
demanda, na primeira análise.
