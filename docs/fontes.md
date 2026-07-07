# Fontes de dados e metodologia

> Documento-fonte do projeto. Resultado de três varreduras de pesquisa (52 agentes no total),
> várias com **verificação adversarial ao vivo** (um segundo agente tentando refutar os
> endpoints). Marca sempre o que foi **✅ confirmado** (alguém baixou o arquivo / bateu no
> endpoint e viu o dado), **⚠️ parcial** (existe, mas não testado ponta a ponta) e
> **❌ não confirmado** (inferência ou bloqueio de acesso). Datas de verificação: julho/2026.

---

## 1. Resumo executivo

O que dá pra fazer com alta confiança: um comparador que cruza o **preço-teto legal**
(CMED/Anvisa — nacional, oficial, grátis) com **preços reais praticados**, sinalizando quando
uma farmácia cobra **acima do teto** (irregular) e onde está mais barato — e, o maior
diferencial, destacando quando o remédio é **de graça no Farmácia Popular**.

A verdade dura, dita sem rodeios: **não existe fonte pública, gratuita e nacional de preço
real de balcão.** O preço praticado existe fragmentado em portais estaduais de NFC-e (AL e PR
têm o melhor acesso). Então a cobertura de "preço real" será **regional e desigual**; o **teto**
é que é nacional e sólido. A estratégia honesta: **teto nacional já na Fase 1; preço real como
piloto (PR + AL + online VTEX) na Fase 2**, sempre com a limitação geográfica dita na cara.

Nenhum concorrente comercial (Consulta Remédios, CliqueFarma) confronta preço praticado contra
o teto legal, nem cruza com o Farmácia Popular. **Essa é a história do portfólio.**

### Confiança por camada

| Camada | Confiança | Situação |
|---|---|---|
| Teto legal (CMED) | **Alta** | Confirmado abrindo o XLSX real (74 colunas, ~25.392 apresentações). |
| Farmácia Popular (de graça) | **Alta** | PDF mensal com 655 EANs, extraído e conferido. 100% gratuito desde fev/2025. |
| Enriquecimento (Anvisa CSVs) | **Alta** | `DADOS_ABERTOS_MEDICAMENTOS.csv` (43.287 linhas) baixado. Classe terapêutica em PT. |
| Preço real — Paraná | **Alta** | API REST/JSON confirmada ao vivo, com GTIN preenchido pra remédios. |
| Preço real — Alagoas | **Alta** | API oficial confirmada (403 ao vivo sem token); endpoints e contrato mapeados. |
| Preço real — online (VTEX) | **Alta (2 redes)** | Drogal e Drogaria Catarinense confirmadas ao vivo. |
| Preço real — Bahia | **Média-alta** | Endpoint interno confirmado, mas frágil (CSRF/antibot). Experimental. |
| Localização de farmácias | **Média** | CNES confirmado, mas ~50% sem coordenada e sem varejo privado. |
| PBM / cartões de desconto | **Alta (negativa)** | Confirmado que NÃO há API pública de preço com desconto. Vira camada informativa. |

---

## 2. Fontes de dados

### 2.1. CMED / Anvisa — preço-teto oficial (PMC) — ✅ CONFIRMADO

A fonte canônica do teto legal. **Baixado e aberto o próprio XLSX** (jun/2026).

- **Origem (raspar daqui):** `https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos`
- **Arquivo confirmado:** `xls_conformidade_site_20260610_121627707.xlsx` (~12,2 MB), via padrão `/@@download/file`
- **Auth:** nenhuma. **Formato:** XLSX (apesar do prefixo `xls_`), 1 aba, **74 colunas, ~25.392 apresentações**
- **Padrão de nome:** `xls_conformidade_site_YYYYMMDD_HHMMSSmmm.xlsx` — o sufixo é timestamp de upload, **imprevisível**. **Não hardcode a URL — raspe o link vigente da página.**

**Estrutura confirmada:**
- Linhas 1–42 = preâmbulo legal. **Cabeçalho por volta da linha 43. Dados a partir da 44.** (Detectar dinamicamente a linha que contém "SUBSTÂNCIA"/"PMC" — não fixar o número.)
- Colunas 1–13: SUBSTÂNCIA, CNPJ, LABORATÓRIO, GGREM, REGISTRO, EAN 1, EAN 2, EAN 3, PRODUTO, APRESENTAÇÃO, CLASSE TERAPÊUTICA, TIPO DE PRODUTO, REGIME DE PREÇO
- **PMC (Preço Máximo ao Consumidor)** e PF repetidos **por alíquota de ICMS** (0, 12, 17, 17,5, 18, 19, 19,5, 20, 20,5, 21, 22, 22,5, 23%), cada uma com variante ` ALC` (Zona Franca / Áreas de Livre Comércio — **não usar como padrão**)
- Finais: RESTRIÇÃO HOSPITALAR, CAP, CONFAZ 87, ICMS 0%, TARJA, etc.

**Armadilhas de parsing (confirmadas):**
- Preços são **strings com vírgula** (`"27,44"`) → trocar `,`→`.`, **guardar em centavos (integer)**
- Ausências vêm como `'    -     '` (traço entre espaços) **ou** string vazia → tratar os dois
- EAN, GGREM (15 díg), REGISTRO (13 díg) → **tratar como STRING** (zeros à esquerda; EAN vira notação científica se lido como número)
- CNPJ mascarado (`18.459.628/0001-15`); SUBSTÂNCIA usa `;` como separador interno; TARJA real é `"Tarja Sem Tarja"`

**Alternativa mais leve — CSV oficial:** `TA_PRECO_MEDICAMENTO.csv` (singular!), em
`https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/arquivos/ta_preco_medicamento.csv`
— latin-1, `;`, decimal com vírgula. Traz `CO_EAN` + `CO_GGREM` + `NU_REGISTRO` + `DS_SUBSTANCIA` + `DS_CAS` + tipo + preços. É a **ponte EAN↔registro↔classe** e mais fácil de parsear que o XLSX.

- **Recomendação:** SheetJS (`xlsx`) com detecção dinâmica de cabeçalho, **ou** o CSV. Usar **PMC**, nunca PMVG (venda ao governo). **Fase 0 — é a base de tudo.**
- **⚠️ Achado crítico:** o PMC **não é único por apresentação** — varia por UF via ICMS. Comparar preço de um estado contra o teto de outro gera falso "acima do teto". Ver §3.

### 2.2. Farmácia Popular (PFPB) — remédio de graça — ✅ CONFIRMADO (tese) / ✏️ números corrigidos

O **maior diferencial de "preço real"** do app, e cruzável por EAN.

- **100% gratuito desde 13/02/2025** (Portaria GM/MS nº 6.613/2025 — extinguiu o copagamento). Copy da UI: **"de graça"**, não "desconto de até 90%" (defasado). Condição real: receita + documento.
- **Lista oficial "Lista de Medicamentos PFPB - EAN"**, PDF mensal, 3 colunas: `PRODUTO | INDICAÇÃO | EAN-13`. Confirmada por extração (março/2026).
- **655 EANs únicos** (✏️ não 638), ~40 apresentações, 10 indicações: Hipertensão (277), Diabetes (116), Dislipidemia (93), Asma (43), Anticoncepção (39), Osteoporose (24), Parkinson (14), Glaucoma (14), Rinite (13), Diabetes+DCV (5).
- ✏️ **Dapagliflozina ESTÁ no PDF** (5 EANs). **Fraldas geriátricas e absorventes** têm EAN em **PDFs separados** (`lista-de-fraldas-geriatricas-ean-*.pdf`, `lista-de-absorventes-higienicos-ean-*.pdf`).
- ✏️ **1 dos 655 EANs falha o dígito verificador** (`5000456095373`); alguns usam prefixo `5000456` (GTIN não-BR) — validar check-digit mas **não descartar por prefixo ≠ 789**.
- **URL:** `.../farmacia-popular/codigos-de-barras/{ano}/lista-de-medicamentos-ean-{mes}-{ano}.pdf` (os links têm sufixo `/view`; o arquivo baixa sem ele).

**Como incorporar:**
- **Match primário = EAN-13** → badge verde de destaque máximo "Você pega de graça no Farmácia Popular".
- **Match secundário = princípio ativo + dosagem** → "Equivalente disponível de graça (depende da marca aceita)".
- **Pipeline:** job mensal baixa os PDFs, parseia (regex `\d{13}` + check-digit), gera `ean, principio_ativo, dosagem, indicacao, mes_referencia`, embute JSON no build.
- **"Onde pegar":** dataset `farmacia_popular_estabelecimento` (dados.gov.br, nível municipal) pro mapa.
- **❌ Não confirmado:** nenhuma API/CSV do elenco por EAN — **só PDF mensal**. Normalizar isso é a "camada do meio" que vale ouro no README.

### 2.3. Menor Preço Nota Paraná — preço real de NFC-e (PR) — ✅ CONFIRMADO (melhor fonte)

**A melhor fonte de preço real confirmada ao vivo**, com JSON limpo, sem auth, e GTIN preenchido pra remédios.

- **Base:** `https://menorpreco.notaparana.pr.gov.br/api/v1` (auto-descrita em `/config`)
- **Endpoint:** `GET /api/v1/produtos?local=<geohash>&termo=<busca>&raio=<km>&offset=<n>&data=-1`
- **Auth:** nenhuma. **CORS aberto** (`access-control-allow-origin: *`)
- **Confirmação ao vivo:** `termo=dipirona` → total **9.133**, `gtin: "7896714273198"`, `ncm`, farmácias reais (Pague Menos, Raia Drogasil), `valor`, `datahora`, `distkm`, `estabelecimento{}`
- **Quirks:** `local` (geohash) é **obrigatório** — sem ele **HTTP 500**. Gerar com `ngeohash.encode(lat, lng, 9)`. Paginação por `offset` em blocos ~48–50; parar pelo `total`.
- **Limitação:** cobre **só o PR**; API **não-oficial** (pode mudar sem aviso).
- **Recomendação:** **conector-piloto de preço real.** Cache por `(geohash+termo+raio)`, TTL 300–600s.

### 2.4. Economiza Alagoas (SEFAZ-AL) — preço real de NFC-e (AL) — ✅ CONFIRMADO

**Única UF do Brasil com API pública oficial de preços de NFC-e.** 403 ao vivo sem token (host no ar); endpoints confirmados na coleção Postman oficial da SEFAZ + cliente PHP de terceiros.

- **Base de produção:** `http://api.sefaz.al.gov.br` (**HTTP puro, sem TLS** — o gateway do projeto deve adicionar HTTPS)
- **Auth:** header `AppToken: <token>` + `Content-Type: application/json`. Token grátis por email a `api@sefaz.al.gov.br` (CPF, nome, nome do app, empresa/URL).
- **Método:** **POST + JSON**. Endpoints:
  - `consultarPrecosPorCodigoDeBarras` — por GTIN/EAN (ideal pra remédio)
  - `consultarPrecosPorDescricao` — por texto (fallback)
  - `consultarPrecoProdutoEmEstabelecimento` — preço num estabelecimento específico
- **Body:** `{ codigoDeBarras|descricao, dias (máx 3), latitude, longitude, raio (km, máx 15) }` — **filtro geográfico nativo** (farmácia perto de mim).
- **Resposta:** array por estabelecimento com `valMinimoVendido`, `valMaximoVendido`, `valUltimaVenda`, `dthEmissaoUltimaVenda` (ISO), `numCNPJ`, `nomRazaoSocial`, `nomFantasia`, endereço.
- **Atualização:** a cada 3h; **retenção 10 dias** (só preço recente, sem série histórica longa).
- **⚠️ Divergência de path não resolvida:** artigo da SEFAZ usa `/sfz-economiza-alagoas-api/api/public/`; Postman oficial + PHP usam `/sfz_nfce_api/api/public/`. Ambos deram 403 (não 404) ao vivo — **confirmar o canônico ao pedir o token.**
- **Recomendação:** segundo conector de preço real (piloto AL). Fase 2–3. O manual renderizado é SPA JS (não abre por fetch), mas o contrato acima está corroborado por 3 fontes.

### 2.5. Preço da Hora Bahia (SEFAZ-BA) — ⚠️ CONFIRMADO como mecanismo, EXPERIMENTAL

Cobre medicamentos, mas é **frágil**.

- **URL:** `https://precodahora.ba.gov.br/` (Flask atrás de nginx). **Sem API oficial.**
- **Handshake CSRF em 2 passos:** (1) GET pega cookie `session` + token no HTML (`#validate[data-id]`); (2) POST `form-urlencoded` com `X-CSRFToken` + `X-Requested-With: XMLHttpRequest`
- **Endpoints:** `POST /produtos/` (`gtin`, `latitude`, `longitude` obrigatórios, `raio`, `horas`) e `POST /sugestao/`
- **Mecanismo confirmado** no código de 3 libs open-source + site vivo. **Riscos:** token assinado que expira, WAF, bloqueio silencioso.
- **Recomendação:** conector **EXPERIMENTAL**, isolar seletores, cache TTL de horas, circuit breaker. Nunca fonte primária.

### 2.6. E-commerce de farmácias via VTEX — ✅ CONFIRMADO (2 redes) — preço ONLINE

- **Endpoint:** `GET /api/catalog_system/pub/products/search/{termo}?_from=0&_to=49` — **sem auth**, HTTP 206 + JSON
- **Confirmados ao vivo:** **Drogal** (`www.drogal.com.br`, ex. `ean 7898700413014`) e **Drogaria Catarinense** (`www.drogariacatarinense.com.br`, Grupo Clamed)
- **Estrutura:** `produto → items[] → sellers[] → commertialOffer {Price, ListPrice, AvailableQuantity}`; item traz `ean`
- **❌ Bloqueados (WAF):** Drogaria São Paulo + Pacheco (DPSP), Raia/Drogasil (stack própria, 403), Araújo, Panvel
- **Recomendação:** preço **online nacional** rotulado explicitamente ("online, pode diferir do balcão"). Respeitar robots.txt, User-Agent honesto, rate limit baixo.

### 2.7. Enriquecimento e utilitários

- **`DADOS_ABERTOS_MEDICAMENTOS.csv` (Anvisa)** — ✅ CONFIRMADO (baixado): 43.287 linhas, **latin-1**, `;`. Colunas incluem `NOME_PRODUTO`, `PRINCIPIO_ATIVO`, `CLASSE_TERAPEUTICA` (~500 classes em PT), `CATEGORIA_REGULATORIA` (Genérico/Similar/Novo), `SITUACAO_REGISTRO`, `NUMERO_REGISTRO_PRODUTO`. **Sem EAN.** ~26% com classe vazia (fallback por princípio ativo). Join com CMED por registro. **É o eixo de navegação por categoria — melhor que ATC pra público leigo.**
- **Bluesoft Cosmos** — ⚠️ PARCIAL. `GET https://api.cosmos.bluesoft.com.br/gtins/{ean}.json` (confirmado existir: 401 sem token). Header `X-Cosmos-Token`. **Cota grátis incerta** (25/dia vs 10/mês — divergem). Só enriquecimento (foto, descrição), **nunca preço**. Cache persistente.
- **CNES/DEMAS (localização)** — ⚠️ `https://apidadosabertos.saude.gov.br/cnes/estabelecimentos` (sem auth). **~50% sem coordenada** e **varejo privado em geral NÃO está no CNES**. Bom pra farmácia pública/popular; pro varejo, geocodificar por CNPJ (BrasilAPI). Endpoint TCU/AppCivico de raio: **morto (404)**.
- **Agregadores de teto (conveniência):** `medicamentos.api.br` (grátis, 100 req/dia, wrapper CMED), `PharmaDB` (pago). **Não depender no caminho crítico** — baixar o XLS/CSV oficial.
- **DCB / ATC / Bulário** — ❌ em geral bloqueados por Cloudflare/TLS ou pagos. ATC via repos MIT (`who-atc-ddd-index`), ponte por substância. Bula: **linkar ao bulário oficial**, sem API. Fase 3+.

### 2.8. PBM / cartões de desconto — ✅ CONFIRMADO (negativa)

A causa do **"preço muda com o CPF"**: o balcão manda CPF+EAN a um autorizador (ePharma, Interplayers, Vidalink, Funcional, Orizon) em tempo real. **Confirmado que NÃO há API pública de preço com desconto** — tudo é B2B credenciado. Faixas 10–90% são marketing.
- **Decisão de produto:** PBM vira **camada informativa rotulada** ("pode haver desconto via programa do laboratório/empresa — varia por CPF, não é público"), **nunca preço prometido**. Desconto de PBM **não legaliza** preço acima do teto. Página educativa "Por que o preço muda com o CPF?".

### 2.9. Prior art (concorrentes)

Consulta Remédios e CliqueFarma têm preço + localização, mas são **marketplace/afiliado**, sem API pública, e **não confrontam preço × teto legal** nem cruzam com Farmácia Popular. Painel SCMED (Anvisa) é dashboard, não API. **A lacuna que o projeto preenche: sinalizar abuso vs teto + "de graça no Farmácia Popular".**

---

## 3. Como chegar "muito próximo do valor real"

1. **Teto CMED sempre local (por UF).** Usuário escolhe UF → mapear UF → alíquota de ICMS de medicamentos → selecionar a **coluna PMC correspondente**. **Não hardcode alíquotas** — manter tabela `uf_aliquota` versionada. Alíquota de medicamento ≠ modal (SP/MG têm 12% pra genéricos; RJ 22% + FECP). Coluna 0% é só isentos por convênio — não usar no geral. Regime "Liberado" = **sem teto** → 4º estado no semáforo.
2. **Preço real por UF, com rótulo de origem.** PR (API), AL (API), BA (experimental), online (VTEX). Cada preço carrega: fonte, UF, `coletado_em`, **rótulo balcão vs online**.
3. **Match por EAN (chave forte) com fallback fuzzy.** Cascata: (1) EAN exato → (2) chave derivada (substância+concentração+forma+quantidade) → (3) fuzzy por nome com blocking por princípio ativo. Indexar os **3 EANs** da CMED. Validar dígito verificador GTIN. **Concentração+forma+quantidade têm de bater exatamente** (casar 500mg com 50mg num app de saúde é perigoso). **Nunca alertar "acima do teto" em match fuzzy de baixa confiança.**
4. **Frescor.** Guardar `coletado_em`, calcular idade na consulta (fuso America/Sao_Paulo), limiares 7d/15d. Ordenar por score combinado (proximidade + economia + frescor), não só distância.

**Limitações honestas (no README):** cobertura de preço real é **regional** (PR/AL fortes, BA experimental, online = 2 redes), não nacional. Preço online ≠ balcão. PMC é **teto**, não preço justo — o semáforo distingue **legalidade** (vs teto) de **bom negócio** (vs mediana). Apresentações hospitalares: filtrar do varejo.

---

## 4. Arquitetura de dados (site estático) — recomendação definitiva

O teto CMED é **read-heavy, refresh mensal, somente-leitura** → arquitetura estática.

- **Servir a base:** **JSON/NDJSON estático gerado no build.** ~25 mil linhas → **1–4 MB com Brotli**. Baixa uma vez, indexa em memória com **FlexSearch ou MiniSearch** (busca sub-ms, sem rede por consulta). Preferir **NDJSON**. Descartar colunas de PMC não usadas. Versionar no nome (`cmed-2026-07.ndjson.br`) + `Cache-Control: immutable`. Particionar só se passar de ~5–8 MB comprimido.
- **`sql.js-httpvfs`** (SQLite via Range Requests): **vitrine no README** ("se crescer pra série histórica, o mesmo deploy serve um `.db` read-only"), **não implementar agora**.
- **DESCARTADO:** Netlify Functions com banco (reintroduz backend/cold start), OPFS (headers COOP/COEP complicam o deploy).
- **Cache de APIs vivas** (preço de balcão): separar por volatilidade. CMED/ICMS → assar no build. Preço real → 1 Function + L2 (Cloudflare KV ou Upstash Redis free), TTL 1–6h, stale-while-revalidate. Netlify Blobs: só snapshot de build, não cache quente.
- **ETL idempotente:** guardar `sha256` do arquivo (pular se não mudou); staging + upsert; versionar por competência; **nunca parsear XLS dentro de Function**.

---

## 5. Stack recomendada (definitiva)

| Camada | Escolha | Justificativa |
|---|---|---|
| **Frontend** | **Next.js (App Router), SSG estático** (`output: export`) | Página estática por apresentação (`/medicamento/[slug]`) → SEO é a porta de entrada. Mesmo padrão do resto do portfólio. |
| **Banco (MVP)** | **NDJSON/SQLite versionado via ETL** | ~25k apresentações = poucos MB, commitável, consultado em build/cliente. **Zero infra, custo zero, nunca "dorme".** |
| **Banco (se houver escrita futura)** | **Neon** (não Supabase) | Neon: scale-to-zero com auto-resume; Supabase free pausa após 7 dias (mata portfólio). |
| **ETL** | **GitHub Actions** cron mensal | Raspa link CMED → parseia → reconstrói dataset → rebuild Netlify. Cron é UTC; a rodada mensal mantém o schedule vivo. |
| **Parsing** | **SheetJS** (`xlsx`) ou o CSV oficial | Detecção dinâmica de cabeçalho; preços→centavos; EAN→string. |
| **Busca** | **MiniSearch / FlexSearch** (client-side) | Índice no browser → autocomplete latência zero. Acentos dobrados (`normalize('NFD')`), boost nome comercial 3x + substância 2x. |
| **Gráfico (histórico)** | **uPlot** (~22 KB, canvas) | `next/dynamic ssr:false`. Recharts só pra mini-cards. |
| **Testes** | **Vitest + MSW v2** | Fixtures em disco, `onUnhandledRequest:'error'`, snapshot da saída normalizada, parser CMED com XLS de amostra. **Nunca tocam a rede.** |
| **Deploy** | **Netlify** (estático) | SSG no CDN; Functions só se precisar de preço vivo. |
| **Linguagem** | **TypeScript** ponta a ponta | Mesmo tsconfig no ETL, scrapers e front. |

**Fluxo:** GitHub Actions (mensal) → ETL TS → NDJSON commitado → Netlify build → Next.js SSG → CDN. Sem banco em runtime, sem custo recorrente, sem sleep.

---

## 6. Design e paleta

**Paleta A — "Clínica Confiável" (recomendada, dark-first):** base `#0B1220` (nunca `#000`), superfície `#131C2E`, elevado `#1B2740`, borda `#263349`; texto `#E8EEF5` / `#9AA8BC`; brand teal `#2DD4BF`, hover `#14B8A6`.
**Paleta B — "Farmácia Calma" (sage):** base `#12140F`, brand `#7CB69A`; light `#F6F8F4`.

**Semáforo do teto (coração visual) — SEMPRE cor + ícone + rótulo:** verde `#34D399` "dentro do teto"; âmbar `#F5C453` "perto do teto"; vermelho `#F26D6D` "**acima do teto CMED**". Reservar vermelho só pra "acima do teto". Legível pra daltônicos.

**Tipografia (Fontshare, fugindo de Inter/Roboto):** corpo **Satoshi**; display/preços **General Sans** ou **Clash Display**. Numerais em `tabular-nums`.

**Assinatura do produto — "barra de teto":** medidor animado mostrando % do teto CMED que a farmácia cobra ("R$18 = 74% do teto R$24,30"), verde→âmbar→vermelho ao cruzar 100%. Transforma o dado regulatório em algo visual.

**Microinterações contidas:** count-up de preço/economia, skeleton (não spinner), transições 200–300ms, respeitar `prefers-reduced-motion`.

---

## 7. UX

- **Empty states:** nunca "vazio" — o teto CMED sempre existe → tela **parcial**, dois níveis de confiança: Nível 1 = teto CMED ("Preço máximo legal · CMED/Anvisa · data"), Nível 2 = preço observado (badge de origem + frescor). Copy: *"Por lei, nenhuma farmácia pode cobrar acima de R$ X. Ainda não vimos quanto as farmácias da sua região cobram de verdade."* Frescor relativo sempre visível ("há 2h", "há 3d"). Incerteza categórica ("estimativa · poucos relatos"), não falsa precisão. Ausência vira contribuição ("Informar preço").
- **Acessibilidade (WCAG 2.2 AA, público idoso):** semáforo com cor + ícone/forma + texto + `aria-label` (item mais crítico — 1.4.1). Alvos de toque **44px**. Contraste 4.5:1 texto / 3:1 componentes. Corpo ≥16px (ideal 18px+ pra preço/dosagem), controle A-/A+, reflow em 320px, foco visível não obscurecido por barra sticky. CI: `@axe-core/playwright` + Lighthouse + checklist manual.
- **Histórico de preços:** tabela **append-only** `precos_observados(ean, farmacia_id, uf, preco, fonte, coletado_em)`, índice `(ean, coletado_em)`, nunca UPDATE. Downsample diário no build → `/data/historico/{ean}.json` colunar → uPlot. Marcar quando passou do teto.
- **Componentes de comparação:** card-herói do produto (foto, nome, dosagem, badge genérico/similar/referência, **teto CMED na UF** como âncora) + lista de ofertas. Anatomia da oferta (≤6–7 elementos): farmácia → **preço em destaque** → **preço/comprimido** → selo "menor preço" (só o 1º) → semáforo vs teto → frescor+fonte → distância → ação. **Preço/comprimido + semáforo-vs-teto = o que ninguém faz bem** → protagonista.

---

## 8. SEO

- **`Product` + `AggregateOffer`** (`priceCurrency:'BRL'`, `lowPrice`, `highPrice`, `offerCount`). **NUNCA merchant listing** (exige ser o vendedor). Preço no JSON-LD = número puro em string (`"12.90"`).
- **Uma página SSG por apresentação específica** (`/medicamento/[slug-com-dosagem-quantidade]`) — casa com busca long-tail e com a granularidade do teto. **Só gerar página pra apresentação com dado útil** (thin content dilui crawl budget).
- **Sitemap index** + fatias ≤50k URLs, `<lastmod>` real. BreadcrumbList + FAQPage complementares. Interligar apresentações (genérico ↔ dosagens ↔ "mais baratos na sua cidade").
- **Restrição do estático puro:** sem ISR — toda página existe no build. Atacar tempo de build (Next paraleliza).

---

## 9. Legal, LGPD e disclaimers

- **CMED é o terreno mais seguro** (dado público, LAI, sem dado pessoal). Atribuir "Fonte: CMED/Anvisa, lista de MM/AAAA", **sem afirmar CC-BY** (a página não declara licença aberta).
- **Scraping de farmácias:** coletar **só preço/produto** (não é dado pessoal). Risco vira **Termos de Uso** — respeitar robots.txt, ler ToS, User-Agent honesto, rate limit conservador, cache TTL longo.
- **LGPD real:** o que o **usuário busca** (remédio ligado a pessoa = dado sensível de saúde, art. 11). Minimizar: **sem login**, **não logar buscas com IP/identidade**, analytics anonimizado/cookieless (Counterscale/Umami/Plausible).
- **RDC 96/2008 (propaganda de medicamento):** a UI deve ser **"lista de preços" neutra, não "vitrine"** (art. 18 permite informar preço até de tarjado em lista). **Sem** foto/claim promocional colado no preço em destaque, **sem** "compre"/"oferta"/"mais vendido". Comparação só entre **intercambiáveis** (mesmo princípio ativo). O alerta "acima do teto" é **fato público objetivo** (permitido); cuidar do risco cível (não difamar farmácia nomeada sem base factual + disclaimer). Marcar no schema o status regulatório (MIP × prescrição × tarja).

**Disclaimers obrigatórios (rodapé/README):**
1. **Não é aconselhamento** — não substitui médico/farmacêutico.
2. **Preço pode variar** — referências coletadas num momento; descontos/convênios alteram; confirme na loja.
3. **Teto CMED** — PMC é o teto legal; vender acima é irregular (denúncia à Anvisa/Procon). Fonte + mês/ano.
4. **Isenção de vínculo** — projeto de portfólio, sem fins comerciais, sem vínculo com Anvisa/CMED/farmácias.

---

## 10. Dataset de demo (curado)

EAN = SKU específico → **N EANs por princípio ativo**, com flag `ean_confirmado`. 12 de 15 confirmados em base pública:

| Medicamento | Apresentação | EAN | Status |
|---|---|---|---|
| Dipirona (ref. Novalgina) | 500mg cx 10 | `7896004769196` | ✅ |
| Paracetamol (ref. Tylenol) | 750mg cx 20 | `7896004703596` | ✅ |
| Losartana (ref. Cozaar) | 50mg cx 30 | `7896004706795` | ✅ |
| Ibuprofeno (ref. Advil) | 600mg cx 30 | `7899547528619` | ✅ |
| Azitromicina (ref. Zitromax) | 500mg cx 3 | `7899095236929` | ✅ |
| Cimegripe (Cimed) | cx 20 caps | `7896523200576` | ✅ |
| Dorflex (Sanofi) | cx 10 | `7891058002916` | ✅ |
| Amoxicilina (ref. Amoxil) | 500mg cx 21 | `7898912189097` | ⚠️ reverificar |
| Metformina (ref. Glifage) | 850mg cx 30 | `7898148291298` | ⚠️ reverificar |
| Sinvastatina (ref. Zocor) | 20mg cx 30 | `7896004710761` | ⚠️ reverificar |
| Omeprazol (ref. Losec) | 20mg cx 28 | — | ❌ EAN inválido, substituir antes do seed |
| Nimesulida / Hidroclorotiazida / Neosoro | — | — | ❌ EAN não confirmado |

Incluir de propósito itens sob prescrição (amoxicilina, azitromicina, anticoncepcional) pra exercitar a UI de tarja/"requer receita".

---

## 11. Roadmap por fases

**Fase 0 — De-risk do teto:** raspar o link CMED, parser com detecção dinâmica de cabeçalho, schema (`apresentacoes` PK GGREM, `eans` 1:N, `tetos_pmc` UNIQUE(ggrem, aliquota, vigencia), `uf_aliquota` versionada). *Done: dataset populado com ~25k apresentações + PMC por alíquota.*

**Fase 1 — Teto nacional navegável (já é portfólio):** ETL + enriquecimento Anvisa (classe terapêutica) + **cruzamento Farmácia Popular por EAN** (badge "de graça") + Next.js SSG + busca client-side + UI "lista de preços" com semáforo acessível + badge genérico/intercambiável + SEO + testes offline. *Done: site estático buscável, teto por UF, badge Farmácia Popular.*

**Fase 2 — Preço real (o diferencial):** conector **Nota Paraná** (piloto) + **Economiza AL** + **VTEX** (online rotulado) + semáforo/barra-de-teto + camada informativa PBM + /status + /metodologia + analytics cookieless + histórico de preços + navegação por classe. *Done: comparador real (PR/AL) + online, sinalizando "acima do teto".*

**Fase 3+ — Amplitude:** Preço da Hora BA (experimental) + ATC + mapa PFPB + sql.js-httpvfs (vitrine) + design de crowdsourcing via QR NFC-e.

**Regra de ouro:** fechar cada fase antes da próxima. **A Fase 1 sozinha já é um projeto honesto e defensável.**

---

## 12. Nota de honestidade (confirmado / plausível / corrigido)

**✅ Confirmado ao vivo:** CMED (XLSX + estrutura), Farmácia Popular (100% grátis + PDF-EAN), `DADOS_ABERTOS_MEDICAMENTOS.csv`, Nota Paraná (JSON + GTIN), Economiza AL (403 + endpoints), VTEX (Drogal + Catarinense), genérico→intercambiável por lei, Google `AggregateOffer` ≠ merchant listing, PBM sem API pública, WCAG 2.2, base legal RDC 96/Lei 9.294/STJ 2024, 8+ EANs de demo.

**⚠️ Plausível (não testado ponta a ponta):** elenco PFPB só em PDF (sem API); path canônico do Economiza AL; colunas de `TA_RESTRICAO_MEDICAMENTO.csv`; corpo do DCB/bulário (Cloudflare/TLS); free tiers atuais de analytics; schema completo de resposta do AL (dump truncado).

**✏️ Corrigido:** 655 EANs (não 638); dapagliflozina ESTÁ no PDF; fraldas/absorventes têm EAN em PDFs separados; 1 EAN falha check-digit; EAN do omeprazol de demo é inválido; nome real `TA_PRECO_MEDICAMENTO.csv` (singular).

---

## Preço de balcão e preço por loja (nacional)

> Como o Balcão descobre **preço por loja física específica perto do usuário**, em qualquer cidade do Brasil. Não existe uma API nacional única: são **três tipos de preço ortogonais**, cada um com fonte e técnica próprias. A UI **tem** que rotular qual é qual, porque a semântica é diferente (venda passada registrada em nota vs. preço vigente de e-commerce vs. delivery com acréscimo).
>
> Legenda de veredito: ✅ confirmado por GET próprio · ⚠️ parcial / plausível / exige POST não executado · ❌ não confirmado / indisponível.

### 1. Os três tipos de preço (regra clara)

| Tipo | Nome | De onde vem | Vínculo com a loja | Observação |
|---|---|---|---|---|
| **(A)** | **Balcão literal** | **Só** portais estaduais de **NFC-e** (nota fiscal do consumidor) das SEFAZ | CNPJ + geo do estabelecimento que emitiu a nota | É o preço realmente cobrado no caixa. Fragmentado por UF; **não** há endpoint federal aberto. |
| **(B)** | **Retirada na loja** | E-commerce por **CEP** (VTEX `orderForms/simulation` → SLA `pickup-in-point`; "Compre e Retire") | Loja física via `pickupStoreInfo` / `seller` id | Preço **online** de retirar na unidade. Pode divergir do balcão físico. |
| **(C)** | **Delivery** | Marketplace por unidade (iFood, Rappi) | Merchant/loja no app | Pode ter **acréscimo** vs. balcão. Fonte instável, ToS sensível. |

Regra de ouro para a UI: **nunca** apresentar preço de e-commerce/app (B ou C) como se fosse balcão (A). Um quarto rótulo, **referência**, cobre o teto CMED (preço-teto regulado, só para sanity-check).

Distinção que separa fonte útil de ruído em (A): quase todo estado tem **"consulta de nota por chave/QR de acesso"** (44 dígitos) — isso é **inútil** para comparar preço. O que o projeto precisa é **"busca por PRODUTO/GTIN + geolocalização"**, que só ~metade dos estados oferece publicamente.

### 2. Balcão via NFC-e — mapa estado por estado (tipo A)

O terreno se divide em **quatro famílias de engine**. A maior é o app federado **Menor Preço Brasil** (SVRS/Procergs-RS, chancelado pelo CONFAZ), um backend único compartilhado por **16 UFs + DF**. As demais têm engine própria.

**Lista oficial (SEFAZ-RS) das UFs no federado Menor Preço Brasil (16 + DF):** AC, AL, AP, CE, DF, ES, PA, PE, PI, RJ, RN, RO, RR, SE, TO, RS. *(Correção de verificação: a Bahia **não** é federada — roda engine própria; AM/MA/MT/MG **não** constam na lista oficial de 16, apesar de citados em fontes secundárias; SC aparece como possível adesão nova. Tratar a lista como aproximada e revalidar por UF.)*

| UF / Fonte | Endpoint | Cobertura / técnica | Veredito |
|---|---|---|---|
| **Federado — Menor Preço Brasil** (16 UFs+DF acima) | Host HTTP do backend **não confirmado** (`menorpreco.svrs…`, `mpbr.svrs…` não resolvem) | GTIN/descrição/marca + lat/long + raio (≤30 km) + janela (≤7 dias); base NFC-e/NF-e em tempo real | ⚠️ Cobertura certa; **consumo exige engenharia reversa do app** (mitmproxy). App Android `br.gov.rs.procergs.mpbr` / iOS `id1483644418`. |
| **Bahia — Preço da Hora** | `api.precodahora.ba.gov.br/v1` (home `precodahora.ba.gov.br` 200; raiz da API 404 mas `/v1/...` responde) | `gtin, latitude, longitude, raio, horas, ordenar=preco.asc, pagina`; **exige GET na home p/ cookie + token CSRF, depois POST**. Tem seção de medicamentos. Repos de referência: `igorpereirag/precodahora_api`, `Pedneri1/precodahora-api` | ⚠️ Vivo; **POST não executado** (exige orquestrar CSRF+sessão). Melhor candidato a conector de referência do tipo A (API REST clara). |
| **Alagoas — Economiza Alagoas** | Web: POST `exibicaoPrecoProduto.htm` (form `consultaForm`, campo descrição/código de barras). App: `api.sefaz.al.gov.br/sfz-economiza-alagoas-api` (token grátis por e-mail `api@sefaz.al.gov.br`) | Busca por descrição ou código de barras | ⚠️ Portal 200 (vivo). Token/endpoints do "Manual do Desenvolvedor" não são públicos na web — **não inventar path**. A mais amigável do lote. |
| **Rio Grande do Sul — Nota Fiscal Gaúcha** | `nfg.sefaz.rs.gov.br/site/MenorPreco.aspx` | Busca por descrição/marca/código de barras em 300k+ estabelecimentos | ⚠️ Protegido por **Google reCAPTCHA** (dificulta automação). Berço da tecnologia. |
| **Paraná — Menor Preço do Nota Paraná** | `menorpreco.notaparana.pr.gov.br/api/v1/produtos?local=lat,long&termo=&raio=&offset=&limit=` | Busca por termo ou código de barras, raio ≤20 km (roda engine própria, não é federado) | ⚠️ **HTTP 503 hoje** — portal em manutenção ("Voltaremos assim que possível"). Formato dos params é histórico/plausível, não verificado ao vivo. |
| **Paraná — Menor Preço Compras** (⚠️ **não** é balcão) | `compras.menorpreco.pr.gov.br` | Cálculo **estatístico sobre NF-e B2B** dos últimos 180 dias, para licitação | ❌ para o projeto: **não** é NFC-e por loja em tempo real. Não confundir com o app consumidor. |
| **Mato Grosso — Nota MT Menor Preço** | `menorpreco.sefaz.mt.gov.br` | Busca por produto em +50 mil estabelecimentos | ⚠️ Citado (família similar), não sondado ao vivo neste sweep. |
| **Mato Grosso do Sul — Consulta Valor** | `servicos.efazenda.ms.gov.br/consultavalor` | "Produtos e Preços SEFAZ" | ❌ **Fora do ar**: 302 → `manutencao.ms.gov.br`. Revalidar com health-check. |
| **São Paulo — Nota Fiscal Paulista** | `portal.fazenda.sp.gov.br/servicos/nfp` | Só créditos + consulta de nota por **chave** | ❌ **Maior lacuna nacional**: SP não tem busca de preço por produto/geo e **não** aderiu ao federado. Existe comparação por **terceiros** (`meusprecos.com.br`, que raspam a NFP), não oficial. |
| **Goiás — SEFAZ-GO** (🔴 **crítico p/ o projeto**) | `nfeweb.sefaz.go.gov.br` / `sefaz.go.gov.br/nfce/consulta` | **Só** consulta de NFC-e por **chave/QR** ("Consulta Pública de Documentos Fiscais") | ❌ **Sem busca por produto/GTIN.** GO **não** consta na adesão do federado. **Balcão literal via NFC-e NÃO cobre Goiânia hoje.** |

**Padrão comum a normalizar** (confirmado em Preço da Hora, Nota Paraná, federado): entrada = descrição | marca | GTIN; filtro = lat + long + raio (≤20–30 km) + janela temporal (dias); saída = lista de estabelecimentos `{cnpj, nome, endereço, lat/long, preço_unitário, data_venda, distância}` ordenada por menor preço. **Esse é o schema único do conector NFC-e.**

### 3. Universo VTEX das farmácias (habilita tipo B)

O endpoint `GET /api/catalog_system/pub/products/search/{termo}` (ou `?ft={termo}`) responde 200 com array JSON (`Price`/`ListPrice`) em VTEX clássico sem auth. Testado com "dipirona" nos hostnames das maiores redes.

| Rede | VTEX? | Hostname | Catálogo público | Veredito |
|---|---|---|---|---|
| **Pague Menos** | ✅ | `www.paguemenos.com.br` | ✅ 200 (productId 27155, R$8,79) + `regions` + `pickup-points` (Loja 500 Goiânia confirmada) | ✅ Catálogo **aberto**. Cada loja = um `seller` (ex. `paguemenos00500`). Cobre Goiânia. |
| **Extrafarma** | ✅ | `www.extrafarma.com.br` | ✅ 200 — **mesma instância** do Pague Menos (mesmo productId 27155) | ✅ Contar como **um alvo técnico** com Pague Menos (dona da Extrafarma). |
| **São João** | ✅ | `www.saojoaofarmacias.com.br` | ✅ 200 (productId 1247759) + `/api/checkout/pub/orderForm` com `orderFormId` | ✅ Catálogo + checkout público. |
| **Drogaria Globo** | ✅ | `www.drogariaglobo.com.br` | ✅ 200 (productId 26674) + `orderForm` | ✅ |
| **Drogaria Venâncio** | ✅ | `www.drogariavenancio.com.br` | ✅ 200 (productId 6193) | ✅ |
| **Drogaria Rosário** | ✅ | `www.drogariarosario.com.br` | ✅ 200 **via `?ft=`** (path `/search/{termo}` volta vazio) | ✅ Hostname correto é `drogariarosario` (não `drogariasrosario`). |
| **Drogal** | ✅ | `www.drogal.com.br` | ✅ (sweep anterior) — `regions` devolveu `regionId` `v2.1BB18…` + `sellers[]` | ✅ Bom para provar a regionalização (conta VTEX sem WAF). |
| **Drogaria Catarinense** | ✅ | — | ✅ (sweep anterior) | ✅ |
| **Araújo** | ✅ (case oficial VTEX 2013) | `www.araujo.com.br` | ❌ 403 WAF | ⚠️ VTEX atrás de WAF. Só com headers de browser/IP BR. |
| **Onofre** | ✅ (RaiaDrogasil) | `www.onofre.com.br` | ❌ 403 WAF | ❌ Mesmo WAF do grupo RD; marca só-online. |
| **Droga Raia / Drogasil (RD)** | ✅ | `www.drogaraia.com.br` / `www.drogasil.com.br` | ❌ 403 WAF em **todos** os endpoints (inclusive `regions` e `pickup-points`) | ❌ Host inteiro sob WAF. Ver §4. |
| **DPSP (Drogaria São Paulo + Pacheco)** | ✅ (case VTEX 2024) | `www.drogariaspacheco.com.br` | ❌ 403 WAF (até no `robots.txt`) | ❌ ~1.500 lojas, bloqueado. |
| **Panvel** | ❌ | `www.panvel.com` | ❌ 404 | ❌ Storefront próprio/headless; VTEX só no marketplace backend. |
| **Nissei** | ❌ | `www.farmaciasnissei.com.br` | ❌ 404 | ❌ Stack própria (agência Avanti). Hostname correto confirmado. |
| **Ultrafarma** | ❌ | `www.ultrafarma.com.br` | ❌ 404 | ❌ Plataforma proprietária; preço único online (não por loja). |

**Universo VTEX aberto confirmado: 8 instâncias / 7 alvos distintos** (Pague Menos + Extrafarma = 1). Um **único conector VTEX genérico** cobre todos — muda só o hostname/account.

⚠️ **Ressalva transversal:** o `POST /api/checkout/pub/orderForms/simulation` (o que de fato entrega preço regionalizado por CEP = tipo B) **não foi executado por ninguém** — WebFetch só faz GET. Está confirmado o **precursor** (catálogo + `orderForm` públicos). GET no `orderForm` só auto-cria carrinho vazio; **não** prova preço por CEP. Classificar as redes abertas como **tipo B plausível / pendente de spike POST**, não confirmado.

### 4. RD Saúde (Drogasil / Droga Raia) por CEP

Não há API pública documentada da Drogasil. O preço por CEP vem da **camada de regionalização VTEX** por baixo do front Next.js/React — técnica **nacional**, válida para qualquer conta VTEX:

1. **CEP → regionId + sellers:** `GET /api/checkout/pub/regions?country=BRA&postalCode={CEP}` → `id` (regionId, formato `v2.1DC18…`) + `sellers[]`. **Confirmado o formato** contra `drogal.com.br` (conta sem WAF): retornou `[{"id":"v2.1BB18…","sellers":[]}]`.
2. **regionId → preço regional:** injeta o regionId no cookie `vtex_segment` (base64) e consulta o Intelligent Search (`fq=alternateIds_Ean:{ean}`) ou o `POST /api/graphql` (mutation `ValidateSession`, FastStore).
3. **Lojas de retirada:** `GET /api/checkout/pub/pickup-points?geoCoordinates={lon};{lat}` (ou `?postalCode=&countryCode=BRA`) e/ou o SLA `pickup-in-point` da simulation.

**O que foi confirmado:** `drogasil.com.br` responde **403** a cliente não-navegador (WAF Akamai/Cloudflare) — inclusive em `/regions` **e** `/pickup-points` (o host **inteiro** está sob WAF, não só o catálogo). O padrão VTEX é canônico (doc oficial) e **reproduzível numa conta aberta** (provado no Drogal), mas **contra a RD nenhum endpoint "pub" abriu** de datacenter.

**Gargalo prático:** a simulation exige `skuId` interno (≠ EAN), e o `EAN→skuId` depende do Intelligent Search, que na RD está sob WAF. Estratégia: manter mapa `(rede, EAN)→skuId` via scrape pontual da PDP / sitemap / feed do Google Shopping, e só então chamar a simulation com headers de browser + `vtex_segment` + provável **IP residencial BR**.

Veredito: ⚠️ tipo B **plausível-não-verificado** para a RD; documentar como **"retirada indisponível (WAF)"** na UI e não prometer preço por loja. (Isso vira história de engenharia honesta, não rodapé.)

### 5. Pague Menos + outras redes

**Pague Menos** é o melhor caso do tipo B: VTEX IO, catálogo **aberto** (sem WAF, ao contrário de RD/DPSP), **cada loja física é um `seller`**, e cobre **Goiânia** (confirmado: `pickup-points?geoCoordinates=-49.25;-16.68` → "Pague Menos - Rua 10, 180 (Loja 500)", Setor Sul, 0,30 km, id `paguemenos00500_<uuid>` — o **prefixo do id de pickup É o seller id**). Fluxo por loja:

1. `pickup-points` (geo/CEP) → lojas + distância;
2. `regions?postalCode=` → `regionId` (base64) + sellers da região (ex. `paguemenos00500/00290/00304`);
3. `catalog_system/pub/products/search/{termo}?regionId=` → preço regional (sem `regionId` cai no seller default `1` = preço nacional);
4. `POST orderForms/simulation` → preço final + retirada por seller. ⚠️ **POST não executado**; no teste, passar um `regionId` truncado caiu no seller `1` — usar o `id` **completo** da resposta de `/regions`.

Demais redes: **Panvel/Nissei/Ultrafarma** não são VTEX → buscar API própria (inspecionar XHR) ou tratar como delivery. **Onofre/Araújo** = VTEX sob WAF (mesmo tratamento da RD).

### 6. Delivery (iFood / Rappi) — viabilidade e ToS

| Marketplace | Descoberta / catálogo | Status | ToS |
|---|---|---|---|
| **iFood** | `GET marketplace.ifood.com.br/v1/merchants?latitude=&longitude=&channel=IFOOD` (descoberta por lat/long); merchant UUID casa com `ifood.com.br/delivery/{cidade}/{loja}/{uuid}`; catálogo por loja tem preço + `originalValue` + EAN-13 | ⚠️ **`/v1/merchants` retornou 404 ao vivo** (provável geo-block de IP US ou migração p/ `/v2/merchants/{id}`) — **não confirmado hoje**. Menu antigo `wsloja.ifood.com.br/ifood-ws-v3/restaurants/{id}/menu` → **403**. Per-item por loja é extraível (Apify "iFood Supermarket Scraper" confirma preço+EAN+Farmácia, BR). Host `marketplace.ifood.com.br` existe. | Termos **vedam** rastreadores/robôs. Merchant-API oficial (`merchant-api.ifood.com.br/catalog/v2.0`) é **do lojista autenticado**, não serve p/ consulta de terceiro. |
| **Rappi** | API interna no host `services.grability.rappi.com` (vivo, 200); lojas em `rappi.com.br/lojas/{store_id}-{cidade}`; catálogo por store (Apify confirma) | ⚠️ `rappi.com.br` → **403 CloudFront/WAF**; bandeiras (Raia/Drogasil/DPSP + dark stores "Turbo Farma") e padrão de URL **não** verificados ao vivo (só Apify/Exame). | Termos vedam coleta automatizada. |
| **Cornershop / Uber** | `/api/v3/branch_groups?country=BR` → **301 defasado** | ❌ **Descartar como fonte de farmácia.** *(Correção: a marca **não** foi "descontinuada" — Uber **integrou** a Cornershop ao próprio app em mar/2023 e ela segue operando **mercado** em 100+ cidades BR; mas é mercado, não farmácia, e o endpoint está defasado.)* Uber Eats saiu do Brasil em mar/2022. | — |

**Insight-chave:** RD e DPSP, que bloqueiam o catálogo VTEX no próprio site, **são parceiras** de iFood e Rappi — o marketplace é a **porta dos fundos** para preço dessas bandeiras por unidade. Mas é engenharia reversa instável: relato público de dev que abandonou o scraping do iFood ("mais tempo mantendo scraping do que usando os dados"). Tratar (C) como **fonte opcional, de baixo volume, sempre rotulada "preço no delivery (pode ter acréscimo)"**, isolada atrás do contrato de conector para poder desligar.

### 7. Outras fontes de preço por loja

| Fonte | O que é | Veredito |
|---|---|---|
| **Consulta Remédios / CliqueFarma / Zoom · Buscapé · Bondfaro** | Comparadores = **vitrines de e-commerce** que redirecionam à loja **online** do parceiro; CEP filtra entrega, não revela prateleira física. Zoom/Buscapé/Bondfaro = mesmo grupo (Mosaico/Banco PAN). | ❌ para balcão. **Nenhum tem API pública de leitura**; só scraping frágil de HTML. `buscape-company/api-ofertas` é feed de **escrita** (lojista envia ofertas). |
| **Google Content API / Merchant API — Price Competitiveness** | Leitura escopada ao **próprio merchant**; relatório agregado e gated por ToS. | ❌ Não lê preço de concorrente por loja. **Content API desligado em 18/08/2026.** |
| **Farmácias App** | Marketplace nacional que integra o PDV das farmácias e ordena por **preço/distância/estoque por loja** — melhor granularidade fora do NFC-e. | ⚠️ **Delivery (tipo C)**, privado. `developers.farmaciasapp.com.br` → 403; API é de **parceiro** (OAuth2 `api.farmaciasapp.com.br/oauth2/token`, gestão de pedidos = escrita), **sem leitura pública**. Números de marketing (3000+ lojas) não verificados. |
| **Apps de fidelidade (Pague Menos "Cliente Sempre", Drogasil)** | "Ver estoque na loja mais próxima", mas o preço é do app/online e **diverge do balcão** (reclamações no Reclame Aqui). | ⚠️ Só via engenharia reversa de app privado. Stretch de baixa prioridade. |
| **ABCFarma / CMED · ANVISA (medAnvisaPrice, PharmaDB)** | Preço-**teto** regulado (PMC/PF) + dados cadastrais. | Usar só como **referência/enriquecimento** (teto legal, sanity-check), **nunca** como preço praticado. |

### 8. Receita VTEX `orderForms/simulation` — o conector reutilizável (tipo B)

Todos os endpoints são **`/pub`** (públicos, sem token). A barreira é **WAF**, não auth. Preços vêm **em centavos** (inteiros — dividir por 100).

**Pipeline canônico por loja VTEX:**

1. **CEP → coordenadas:** `GET /api/checkout/pub/postal-code/BRA/{cep}` → endereço + `geoCoordinates`.
2. **EAN → skuId:** `GET /api/catalog_system/pub/products/search?fq=alternateIds_Ean:{EAN}` → `products[].items[].itemId` (= skuId). *(`commertialOffer.Price` aqui é o preço base do `sc` default, **não** regionalizado — usar só p/ achar o skuId.)*
3. **Preço + retirada por CEP:**

```
POST https://www.{loja}.com.br/api/checkout/pub/orderForms/simulation?sc={salesChannel}
Content-Type: application/json

{"items":[{"id":"<skuId>","quantity":1,"seller":"1"}],
 "postalCode":"74080420","country":"BRA"}
```

**Resposta (campos que importam):**
- `items[].price` / `items[].listPrice` / `items[].sellingPrice` — **centavos**; preferir `sellingPrice` (com promoção). `items[].priceValidUntil` (quando expira → refetch). `items[].availability`.
- `logisticsInfo[].slas[]` — cada SLA tem `deliveryChannel`:
  - `"delivery"` → é **tipo C** (entrega).
  - `"pickup-in-point"` → é **tipo B** (retirada), e carrega `pickupStoreInfo.friendlyName` + `pickupStoreInfo.address` (rua, cidade, UF, CEP, geo) = **o vínculo direto preço ↔ loja física**, mais `price` (frete/retirada, normalmente 0) e `shippingEstimate` (prazo).

**Apoio (independem de produto):**
- `GET /api/checkout/pub/pickup-points?geoCoordinates={lon};{lat}` — lojas físicas próximas com `id`, `friendlyName`, `address`, `businessHours[7]`, `distance`. ⚠️ **`geoCoordinates` é `longitude;latitude`** (invertido!) e aceita **só um** método por request (geo **ou** CEP, nunca ambos).
- `GET /api/checkout/pub/regions?country=BRA&postalCode={cep}[&sc=N]` — `regionId` + sellers que atendem o CEP.

**Chave de "preço por loja" no VTEX = a tripla `(skuId, sc/região, CEP)`** — é também a chave de cache. `seller:"1"` vale para lojas mono-seller (o varejista é o white-label seller). A simulation (POST) costuma ser **mais protegida** que o catálogo (GET): usar o domínio público da loja (não `*.vtexcommercestable.com.br`), headers de browser real (UA, Accept, Referer da PDP) e reaproveitar cookies do orderForm; se bloquear → marcar rede como *catalog-only* e cair pro preço base com aviso na UI. **Modelar UM conector genérico** parametrizado por `{accountName, salesChannel, sellerId}` — "adicionar rede VTEX nova = uma linha de config".

### 9. Arquitetura (schema, cache, resiliência, rótulos)

**Schema `precos_observados`:**

| coluna | tipo | nota |
|---|---|---|
| `tipo_preco` | enum `balcao \| retirada \| delivery \| referencia \| procon` | **nunca** fundir tipos num só "menor preço" |
| `fonte` | texto | nome do conector (ex. `precodahora_ba`, `vtex:paguemenos`) |
| `ean` | texto | chave de cruzamento cross-rede |
| `loja_cnpj`, `loja_geo`, `uf` | — | identidade da loja física |
| `preco`, `moeda` | — | normalizado (÷100 se veio de VTEX) |
| `observado_em` | timestamp | **quando a nota/simulação ocorreu** (não o de coleta) |
| `coletado_em`, `ttl` | timestamp / int | controle de cache |

O resolver mescla teto CMED (referência) + balcão NFC-e + retirada VTEX + delivery numa resposta única, **cada linha rotulada com tipo e "quando foi observado"**.

**Cache em 2 camadas** (chave por tipo, para não explodir cardinalidade nem virar rastreio):
- Balcão → `(uf, ean, geohash-do-CEP-truncado)` TTL **6–12 h**.
- Retirada → `(rede, skuId, cep)` TTL **1–3 h** (e-commerce muda mais); respeitar `priceValidUntil`.
- L1 in-memory (`cachetools`) + L2 KV/Redis. **Truncar CEP/geohash.**

**Resiliência:** fan-out por fonte com `asyncio.gather(return_exceptions=True)` + **circuit breaker por conector**; se uma UF/rede cai, retorna as demais e serve **cache stale rotulado** ("preço de HH:MM"). Timeout curto (**2–4 s**) — portais gov são instáveis. Single-flight (dedupe de requests em voo) por chave; **sem full-scan** de catálogo; NFC-e só sob demanda com geo real do usuário.

**Etiqueta / postura legal** (projeto de portfólio, não operação p/ terceiros): User-Agent **honesto e identificável** (nunca spoofar Chrome), rate limit por host + backoff em 429/403, cache obrigatório, coletar **só** preço/produto/disponibilidade (nunca PII), honrar `robots.txt` como política, **não burlar WAF**. `robots.txt` verificado: **Pague Menos** 200 e permissivo (libera ClaudeBot/GPTBot/Perplexity/CCBot, não menciona `/api`), **Panvel** 200, **iFood** 200 (`/api` não bloqueado); **Drogasil, Pacheco, Rappi** → **403 até no `robots.txt`** (WAF). Lembrar: `robots` não mencionar `/api` **não é permissão** — o vínculo no Brasil é ToS + LGPD.

**Regra de rótulo na UI (obrigatória):**
- **(A)** → "preço de balcão · visto em NFC-e ({UF}, {data})"
- **(B)** → "para retirar na {Loja X} (a {Y} km) · preço online, compre e retire"
- **(C)** → "no delivery · pode ter acréscimo"
- **referência** → "teto CMED (preço máximo regulado)"

### 10. Recomendação priorizada

**Fase 3a — Retirada VTEX (tipo B) — maior ROI, e é o que cobre Goiânia.**
Implementar **um conector VTEX genérico**. Ligar primeiro as 7 instâncias de catálogo aberto: **Pague Menos/Extrafarma, São João, Globo, Venâncio, Rosário, Drogal, Catarinense**. **Rodar o spike POST `orderForms/simulation` real** (curl + headers de browser) para validar preço por CEP + `pickup-in-point` — é o único passo não executado. RD/DPSP/Onofre/Araújo → marcar **"retirada indisponível (WAF)"**, sem tentar burlar.

**Fase 3b — Balcão NFC-e (tipo A) — o diferenciador de engenharia.**
Começar por **Bahia (Preço da Hora)** como conector de referência (única API REST clara e viva, com repos open-source para copiar o fluxo CSRF+sessão). Depois **Alagoas** (token grátis por e-mail). Marcar **PR e MS como "confirmados porém em manutenção"** com health-check automático antes de ligar. Normalizar tudo no schema comum de §2.

**Fase 3c — Spike de engenharia reversa do federado Menor Preço Brasil.**
Rodar o app com **mitmproxy/Charles** para capturar host + rota + headers reais. Se confirmar, **um driver cobre ~16 UFs+DF** de uma vez. Até lá: **PLAUSÍVEL, não verificado.**

**Limitação regional honesta (documentar no README):** **não existe fonte NFC-e de balcão para Goiás hoje** (SEFAZ-GO só consulta por chave/QR; GO não é federado). Em Goiânia o app depende de **(B) retirada VTEX** — felizmente confirmada (Pague Menos Loja 500) — e **(C) delivery**. Isso é ponto de engenharia, não fraqueza.

**Baixa prioridade / descartar:** Google Shopping (leitura só do próprio merchant, sunset 18/08/2026), comparadores (só vitrine, sem API de leitura), Cornershop (mercado, não farmácia; endpoint defasado), apps de fidelidade (privados, preço diverge). **Delivery (C):** opcional, rotulado, ToS-sensível, isolável atrás do contrato de conector.

**Regra de ouro:** a graça está na **camada do meio** — normalização do schema comum de balcão, o conector VTEX plugável por config, resiliência com degradação para cache, e a **rotulagem honesta dos três tipos**. Seis conectores sólidos e bem rotulados > 27 pela metade.

---

## Goiânia - cidade teste

> Cidade-piloto do comparador. Goiás **não tem** portal estadual de preço via NFC-e (não há equivalente ao "Menor Preço" do Paraná/RS — confirmado: GO está fora das 16 UFs do app Menor Preço Brasil/CONFAZ, e a "Nota Fiscal Goiana" é só cidadania fiscal/sorteios, sem consulta de preço por produto). Por isso o preço em Goiânia vem de 3 caminhos independentes. Faixa de CEP: Goiânia **74000-001 a 74899-999**; Aparecida de Goiânia **74900-001 a 74999-999** (município vizinho, decidir se entra no MVP). IBGE Goiânia = 5208707; UF Goiás = 52.

### 1. Resumo — como conseguimos preço em Goiânia

Três caminhos, com naturezas diferentes de preço (a UI **precisa** diferenciar):

| # | Caminho | Tipo de preço | O que dá | Confiança |
|---|---|---|---|---|
| (a) | **E-commerce das redes por CEP/loja** (VTEX simulation, "Compre e Retire") | "retirada na loja X" / "delivery da loja X" — **NUNCA** "balcão" | preço ao vivo por loja/região | ✅ alta p/ Pague Menos e DPSP (host nativo); ⚠️ RD atrás de WAF |
| (b) | **Crowdsourcing via QR da NFC-e** (usuário escaneia a notinha) | **balcão literal** (documento fiscal autenticado) | preço real de balcão, por loja física | ⚠️ parcial — fluxo mapeado, host corrigido, POST não executado ao vivo |
| (c) | **Seed do Procon-GO** (pesquisas de preço em PDF) | **balcão** (datado/histórico) | benchmark/seed de balcão | ✅ arquivos confirmados HTTP 200 e inspecionados |

**Regra de ouro de produto:** a palavra "balcão" só aparece em **notinha (NFC-e)** e **Procon-GO**. E-commerce por CEP é sempre "retirada/delivery da loja X". Teto CMED é limite legal, não oferta.

### 2. Teto legal GO (ICMS + coluna CMED) — ✅ confirmado

- **Alíquota interna modal de ICMS em Goiás = 19%**, vigente desde **01/04/2024** (antes 17%). Base: Lei estadual 22.460/2023 alterando o art. 27, I da Lei 11.651/91 (RCTE).
- Medicamentos no varejo ao consumidor em GO seguem o **modal de 19%** — não há alíquota reduzida específica de balcão.
- **Coluna CMED a usar para todos os CEPs de Goiânia/Aparecida = PMC 19% (ICMS 19).** Regra CMED: em venda interestadual usa-se a coluna do estado de **destino** — para entrega em Goiânia, sempre 19%.
- **PROTEGE** (Fundo de Proteção Social de GO, adicional de 2%, Lei 15.505/2005) incide só sobre supérfluos (energia, itens do Anexo IX). **NÃO** entra em medicamentos no regime geral → o 19% é modal puro, **sem FECP embutido** (diferente do RJ, onde 22% = 20% + 2% baked-in).
- CMED atualizou fatores de conversão PF/PMC para 19% via **IN nº 1/2025** (emissão 04/02, vigência 23/02) e consolidou na **IN nº 2/2025** (24/03) — usar a nº 2 como referência mais recente.
- ⚠️ **A confirmar antes de fixar o parser:** o rótulo textual exato da coluna no XLS da Anvisa ("PMC 19%"/"ICMS 19%") é plausível pelo padrão histórico, mas não foi aberto linha a linha. Baixar o XLS oficial e mapear o header.
- **Recomendação:** versionar a alíquota por UF com data de vigência (GO: 17% até 31/03/2024, 19% desde 01/04/2024) e monitorar a reforma tributária (IBS/CBS) a partir de 2026.
- **UI:** rotular como "Preço Máximo ao Consumidor (teto legal GO, ICMS 19%)"; mostrar selo de alerta se qualquer preço (inclusive notinha/delivery) exceder o PMC-GO.

### 3. QR NFC-e Goiás (crowdsourcing) — ⚠️ VEREDITO: viável, é o caminho central de balcão

**Correção crítica de host** (o agente inicial errou o canônico):

- ✅ **URL de produção CORRETA (canônica desde 16/06/2025, IT 2025.003):**
  `https://nfeweb.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe?p=<payload>`
- ❌ `https://nfe.sefaz.go.gov.br/...` é a **antiga** (HTTP, aceita só até 30/08/2025) — o erro TLS nela **não** é quirk de rede, é o endpoint descontinuado.
- Homologação: `https://nfewebhomolog.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe`

**Formato do payload `p=` (QR v3 online, produção atual):** `chave44|versaoQRCode|tpAmb` — **sem hash** (o `cHashQRCode`/CSC do v2 foi removido no v3). Fazer split por pipe e pegar sempre o 1º campo como chave, sem assumir o resto (contingência tpEmis=9 acrescenta dhEmi, vNF, digVal).

**A chave de 44 dígitos codifica:** `cUF` (=52 GO), AAMM, **CNPJ do emitente (pos 7-20)**, modelo (=65 NFC-e), série, número, tpEmis, código numérico e DV mod-11.

**Fluxo de 5 etapas:**
1. **Leitura no navegador:** `getUserMedia` exige HTTPS (secure context). `BarcodeDetector` nativa funciona no Chrome/Android mas **não no WebKit/iOS** (falha silenciosa em todo iPhone). Usar `html5-qrcode` (nativa + fallback ZXing/WASM) ou `qr-scanner` (Nimiq/WASM). Sempre oferecer fallback de upload de foto (`input capture=environment`).
2. **Extração da chave:** guardar a **string `p=` INTEIRA**, não só os 44 dígitos. Validar em cliente **e** servidor: 44 dígitos, cUF=52, modelo=65, DV mod-11, extrair CNPJ emitente.
3. **Busca server-side (obrigatório):** o browser não pode buscar direto (CORS + a SEFAZ devolve HTML). Rota FastAPI com `httpx.AsyncClient` GET na URL do QR → recebe o DANFE e faz **parse do HTML** (descrição, qtd, valor unitário/total, cEAN/GTIN quando presente, CNPJ/endereço/razão do emitente, data/hora). **Não há API JSON oficial da SEFAZ-GO** → é scraping (tratar como quirk no README; fallback pago = Infosimples). Cache longo/permanente por chave (a nota é imutável).
4. **Antifraude** (o trunfo: a nota é autenticada pela SEFAZ — se renderiza, o preço é real): rejeitar cUF≠52/modelo≠65/DV inválido; **dedup por chave UNIQUE** (idempotência); rate-limit por usuário/IP; sanidade de data; casar item→catálogo preferindo **GTIN (cEAN)**, com fila de moderação humana pro que não casar.
5. **Gravação:** `precos_observados` com `fonte='nfce_qr'`, `tipo='balcao'`, `cnpj_emitente`, `chave_acesso` (UNIQUE), `gtin`, `descricao_item`, `preco_unitario`, `data_emissao`, `municipio` (confirmar Goiânia pelo CNPJ/endereço do **emitente**, não pelo CEP do comprador).

**Pontos ainda plausíveis, não confirmados ao vivo:** consulta manual por chave digitada usa Cloudflare Turnstile/captcha, enquanto a URL do QR (com sessão) renderiza o DANFE **sem** captcha — coerente com o padrão nacional, mas o POST/GET real não foi executado neste sweep. WAF F5 BIG-IP e throttling sob volume: testar em runtime com nota real e ter circuit breaker. **Nunca varrer faixas de chaves** — só consumir QRs que o próprio usuário trouxe (consentimento).

**LGPD:** a NFC-e pode trazer CPF do consumidor — **descartar e nunca persistir**; guardar só dados do item e do emitente (CNPJ é dado público de PJ).

### 4. Procon-GO (seed) — ✅ arquivos confirmados e inspecionados

Formato: **matriz larga** (drogarias nas colunas, medicamentos nas linhas), com **Período da coleta impresso**. Traz os 4 campos que o produto precisa: estabelecimento (rede+bairro), medicamento (nome+apresentação+denominação genérico/referência+laboratório), preço (R$) e data.

**PDFs confirmados HTTP 200** (padrão `/procon/wp-content/uploads/sites/19/ANO/MES/Planilha-Medicamentos-ANO.pdf`):
- 2018 — `.../2018/04/Planilha-Medicamentos-2018.pdf` (17 drogarias, 66 itens, coleta 2-16/abr; edição "600%")
- 2020 — `.../2020/09/Planilha-Medicamentos-2020.pdf` **(inspecionado: 12 drogarias, 65 itens, coleta 17-23/set/2020)** + `Relatório-Medicamentos-2020.pdf`
- 2021 — `.../2021/04/Planilha-Medicamentos-2021.pdf` (+ relatório; edição "431%")
- 2017 — `.../2017/04/relatorio-pesquisa-medicamentos-2017.pdf`

**Como importar:** parser de PDF (camelot/tabula) fazendo **unpivot** da matriz larga para longo: `(estabelecimento, rede, regiao, medicamento, apresentacao, tipo[generico|referencia], laboratorio, preco_reais, data_coleta, edicao_ano)`. Fonte `procon_go`, `tipo='balcao'`, com **data da coleta sempre visível na UI** ("Procon-GO — coleta 17-23/set/2020"). Guardar os PDFs originais no bucket (proveniência).

**Ressalvas honestas:**
- ⚠️ **Recência subestimada:** existe edição mais nova que 2021 (22 drogarias, 68 itens: 34 ref + 34 gen, variação até 972,26% — Cloridrato de Ranitidina) referenciada no portal, mas o **link direto do PDF não foi localizado** neste sweep. Re-checar após o período eleitoral (páginas recentes sob aviso de suspensão — plausível, não verificado) e no domínio antigo `procon.go.gov.br/tag/pesquisa-de-preco`.
- ⚠️ **Extração pode exigir OCR:** ao menos a edição 2018 (e o relatório 2017) são **PDF de imagem/escaneado** — tabula/camelot (texto vetorial) falham; precisa OCR.
- ❌ **Sem CEP/endereço** na fonte: o match loja→unidade física é por **nome da rede + bairro/região** (St. Central, Vila Nova, Jd. Goiás, etc.).
- É snapshot datado: seed/benchmark, não preço vivo.

### 5. Preço por loja das redes

Contrato reutilizável (qualquer rede VTEX): **um conector VTEX genérico** parametrizado por `accountName`, `sc` e ambiente. Dois métodos:
- **Preço regionalizado:** `POST /api/checkout/pub/orderForms/simulation?sc=1` body `{"items":[{"id":"<skuId>","quantity":1,"seller":"1"}],"country":"BRA","postalCode":"74xxxxxx"}`. Valores **em CENTAVOS** (1990 = R$19,90). Ler de `priceDefinition.calculatedSellingPrice` (não `sellingPrice`, que arredonda); usar `priceValidUntil` como TTL de cache.
- **Lojas de retirada:** `GET /api/checkout/pub/pickup-points?geoCoordinates=<lon>;<lat>` (ordem **longitude;latitude**, `;`) ou `?postalCode=&countryCode=BRA` (só um método por request; CHK0264 = sem ponto perto).
- SLAs: `deliveryChannel='pickup-in-point'` ("RETIRE NA LOJA (<id>)") = **retirada**; `deliveryChannel='delivery'` = **delivery** com prazo/taxa.
- Descoberta de SKU: `GET /api/catalog_system/pub/products/search/{termo}` (preço do sc default, **não** regionalizado — usar só p/ mapear SKU→EAN).

| Rede | Plataforma | Contas / endpoint | Confirmado | Rótulo UI |
|---|---|---|---|---|
| **RD Saúde** (Drogasil / Droga Raia) | VTEX (IO/headless) | contas `drogasil` e `drogaraia` (302 → smartcheckout welcome) | ✅ plataforma e slugs. ❌ **WAF Akamai devolve 403 em `/compre-retire` e todo `/api/*`** de IP de datacenter → endpoints **plausíveis, não executados**. "Compre e Retire" grátis, retirada em ~1h. | "Retirada na loja Drogasil/Raia" / "Delivery" |
| **DPSP** (Pacheco / Drogaria São Paulo) | VTEX | `drogariaspacheco` / `drogariasaopaulo`. **Pegadinha:** `www.*` atrás de CloudFront+AWS WAF (403); **host nativo `{conta}.vtexcommercestable.com.br` responde sem WAF** | ✅ catálogo GET (206) e pickup-points GET (30 filiais em CEPs 742xx de Goiânia). ⚠️ simulation POST plausível (padrão VTEX), não executado por mim. ⚠️ **bandeira por loja ambígua** — o host da São Paulo devolveu filiais rotuladas "Pacheco"; atribuir loja pelo `friendlyName`/endereço, não pela conta VTEX | "Retirada na loja Pacheco/São Paulo (742xx)" / "Delivery" |
| **Pague Menos** | VTEX | `www.paguemenos.com.br` (endpoints públicos, sem WAF no teste) | ✅ **TUDO confirmado, incl. POST simulation ao vivo** (dipirona 27155, CEP 74120-090 → 879 centavos = R$8,79). **Descoberta de produto: preço é NACIONAL** (seller único "1"), **não varia por CEP** — passar regionId de Goiânia não mudou o preço. A granularidade por CEP é só **fulfillment** (quais das ~22 lojas de Goiânia/Aparecida retiram, taxa/prazo). SLAs: retirada grátis; Econômica R$4,90/1d, Expressa R$6,90/2h, Super Expressa R$7,90/60min | mostrar **um preço "Pague Menos"** + lojas como opção de logística, "retirada/delivery" |
| **Santa Marta** (rede local, 30 lojas em Goiânia) | VTEX oficial **quebrado** | `www.drogariasantamarta.com.br` → **HTTP 500** (host PHP compartilhado, cert `*.websiteseguro.com` — não VTEX agora); conta VTEX ativa não localizada | ✅ **WooCommerce Store API da unidade Vila Pedroso** aberta: `farmaciasantamartavp.com.br/wp-json/wc/store/products` (200, preços em centavos, `currency_minor_unit=2`) — **única fonte de preço lida ao vivo** (só essa unidade). ❌ Rappi/iFood 403 a bots | "Santa Marta Vila Pedroso — loja online"; demais só via NFC-e/Procon |
| **Delivery iFood / Rappi** | API interna não-oficial | iFood: `marketplace.ifood.com.br/v1/merchants/{merchantId}/catalog` (merchantId = UUID da URL da loja); Rappi: storefront interno | ⚠️ **EXPERIMENTAL — nunca pipeline central.** Páginas por unidade em Goiânia confirmadas (UUIDs batem). Exige **Bearer de sessão de conta** (login OTP/oAuth), tem **anti-bot 403**, muda sem aviso e **viola ToS**. Scraper público maduro de Rappi só cobre Colômbia | "Delivery via app (pode ter acréscimo)" — nunca "balcão" |

**Outras redes locais** (e-commerce a validar, não confirmadas como VTEX): DrogaShop/DrogaShow (⚠️ `drogashop.com` é site de **franquia**, não varejo — achar o domínio de varejo real), Droga Clara, Alexfarma (tem `/cart/`), Drogaria Rosário (roda **RetailON**, não VTEX — capturar endpoint no DevTools Network), Farmácia Modelo, Drogaria Vitta, Farmácia do Povo GO.

### 6. Geo das lojas de Goiânia (tabela de lojas + join com a NFC-e)

Três camadas:
1. **BACKBONE = CNES/DATASUS** (download mensal `BASE_DE_DADOS_CNES_AAAAMM.ZIP` em `cnes.datasus.gov.br/pages/downloads/arquivosBaseDados.jsp`). Tabela `tbEstabelecimento` é a **única fonte pública** que junta `CO_CNPJ` (14 díg) + endereço + `NU_LATITUDE`/`NU_LONGITUDE` + CNAE, de graça e sem chave. Filtrar UF 52, município 5208707, CNAE **4771-7/01** (sem manipulação), **/02** (com), **/03** (homeopáticos).
2. **ENRIQUECIMENTO:** VTEX `pickup-points` (Pague Menos, Droga Raia/Drogasil), RetailON (Rosário), Google Places API New (`includedTypes:['pharmacy','drugstore']` — preciso p/ lat/lng/horário/place_id, mas **pago e sem CNPJ**).
3. **NORMALIZAÇÃO:** BrasilAPI `/api/cnpj/v1/{cnpj}` (razão social, nome fantasia, CNAE) e `/api/cep/v2/{cep}` (lat/lng do CEP).

**JOIN com a notinha = CNPJ de 14 dígitos** do emitente da NFC-e (`<emit><CNPJ>`, também nas pos 7-20 da chave). PRIMARY KEY em `cnpj14`. ⚠️ **Cuidado:** o CNES às vezes traz só a raiz de 8 díg (matriz), enquanto a NFC-e sempre traz a filial (14) → onde só houver raiz, fallback fuzzy por (raiz + CEP + logradouro). Lat/lng do CNES pode vir vazio/impreciso → validar contra Places.

**Modelo `lojas`:** `id, cnpj14 (unique), rede, razao_social, nome_fantasia, cep, logradouro, numero, bairro, municipio, uf, lat, lng, fonte_geo (cnes|places|locator), canais (balcao|retirada|delivery), place_id_google, cnes_id, updated_at`. Guardar **proveniência** de cada campo geo.

Setores de maior densidade p/ priorizar a varredura: Bueno, Marista, Oeste, Central, Sul, Jardim Goiás, Campinas, Nova Suíça, Leste Vila Nova, Negrão de Lima.

### 7. Regras de UI por tipo de preço

Os 5 tipos **não** são comparáveis no mesmo eixo: só 2 são "compre agora" (Retirada, Delivery); os outros 3 são referência/histórico (Teto, Notinha, Procon).

**Taxonomia de badge** (cor semântica + ícone + rótulo fixo — nunca só cor, por acessibilidade):

| Tipo | Ícone | Cor | Rótulo | Microcopy |
|---|---|---|---|---|
| Teto legal GO | escudo/martelo | azul neutro | "Teto legal (CMED)" | "Preço máximo que qualquer farmácia pode cobrar por lei. Referência, não é oferta." |
| Retirada na loja | sacola/loja | **verde** (acionável) | "Retirada na loja" | "Compra no site da {loja}, retira no balcão. Sem frete. Confirmado para o CEP {cep}." |
| Delivery | moto | **âmbar** (cautela) | "Delivery" | "Entrega via {app}. Pode ter taxa e preço diferente do balcão." |
| Notinha (NFC-e) | nota fiscal | teal (comunidade) | "Notinha" | "Preço de balcão de uma nota fiscal real, escaneada em {data} na {loja}." |
| Procon-GO | prédio institucional | azul institucional | "Procon-GO" | "Coletado pela pesquisa do Procon Goiás em {mês/ano}." |

**Regras:**
- **Anti-engano:** "balcão" só em Notinha e Procon. Retirada/Delivery = "retirada/delivery da loja X".
- **Ordenação em duas faixas:** Faixa A "Comprar agora" (Retirada + Delivery) por **preço total** (item + frete/taxa já somados — nunca ordenar delivery só pelo item); Faixa B "Referência e histórico" (Notinha + Procon) por **mais recente**. Teto fixo no topo como barra de referência ("Teto CMED em GO: R$ XX,XX").
- **Chip de frescor** obrigatório em Notinha e Procon ("hoje", "há 3 dias", "pesquisa de mar/2026"); esmaecer + selo "pode estar desatualizado" acima de ~45 dias (notinha) / ~90 dias (Procon). Retirada/Delivery = "preço ao vivo".
- **Comparação com o teto** em todo card: "% abaixo do teto" (verde) ou "ACIMA DO TETO — denuncie ao Procon" (vermelho). Só mostrar se houver casamento por EAN/registro Anvisa com a coluna GO (evitar falso positivo).
- **Farmácia sem preço** = estado vazio convidativo: "Ainda sem preço aqui." + CTA "Tem a notinha? Escaneie e ajude Goiânia a saber o preço real."
- Justificativa didática: ~80% dos consumidores não sabem que existe teto (Procon-SP) → destacar o Teto CMED.

### 8. Massa de teste de Goiânia

⚠️ Endereços/CEPs/CNPJs de diretórios (Páginas Amarelas, Econodata, guias) — bons pra **semear/demonstrar**, validar no ViaCEP/Receita/CNES antes de virar "verdade de produto".

**6 farmácias** (CEPs na faixa correta):
1. **Drogasil** — Setor Bueno, Av. 85, 3022, CEP **74223-010** — Raia Drogasil S.A., CNPJ raiz **61.585.865**
2. **Droga Raia** — Setor Oeste, Av. B, 729 (Lt 72/6), CEP **74110-030** — mesma RD (bom caso de dedup "mesma rede, lojas/preços distintos")
3. **Farmácia Pague Menos** — Setor Campinas, Av. 24 de Outubro, 1262, CEP **74505-010** — Empreendimentos Pague Menos S/A, CNPJ raiz **06.626.253**
4. **Drogaria Santa Marta** — rede goiana, matriz em Aparecida de Goiânia (Anel Viário Qd.1 Mód.4), CNPJ raiz **16.010.431**; lojas na capital (⚠️ verificar recuperação judicial / operação ativa)
5. **Drogaria Rosário** — Av. T-63, Qd.580, Lt.7, Setor Nova Suíça, CEP **74280-150** (RetailON)
6. **Independente** — Jardim América, Praça C-170, Qd.430 Lt.24 (⚠️ nome exato a confirmar; placeholder do "independente")

**8 remédios** (genéricos mais vendidos BR — cobertura garantida em qualquer catálogo): Dipirona sódica 500mg (20cp e gotas), Losartana potássica 50mg (30cp), Metformina 850mg (30cp), Omeprazol 20mg (28cp), Amoxicilina 500mg (21cáps), Paracetamol 750mg (20cp), Ibuprofeno 400mg, Sinvastatina 20mg (30cp). Fixar as apresentações (mesma dosagem/qtd em todas as lojas) p/ comparação maçã-com-maçã.

### 9. Encaixe no roadmap (Fase 1 — piloto-Goiânia)

**Entra já na Fase 1:**
- Conector **VTEX genérico** (accountName + sc + host nativo) → **Pague Menos** (100% validado, incl. POST) e **DPSP** via `{conta}.vtexcommercestable.com.br` (catálogo/pickup-points confirmados). Rótulos retirada/delivery.
- Backbone de lojas via **CNES** (download + filtro CNAE 4771/UF 52/Goiânia) + join por `cnpj14`.
- Ingestão **Procon-GO** como seed `procon_go`/`tipo=balcao` (parser matriz→longo, com OCR onde o PDF for imagem; data sempre visível).
- Teto **CMED coluna 19%** carregado e casado por EAN, como guard-rail de UI.
- Regras de UI dos 5 tipos (badges/faixas/frescor/anti-engano).

**Fase 2 (resiliência + crowdsourcing):**
- Fluxo **NFC-e por QR** (leitura no browser com fallback iOS → validação da chave → busca server-side no host `nfeweb.sefaz.go.gov.br` → parse HTML → `precos_observados`/`fonte=nfce_qr`). Retry + circuit breaker + cache por chave. Fixture com nota real de farmácia de Goiânia p/ calibrar o parser.
- **Santa Marta** via WooCommerce Store API (Vila Pedroso) como conector WooCommerce piloto.

**Fora do MVP / experimental (feature flag, isolado do core):**
- **RD Saúde** (Drogasil/Raia): bloqueado por Akamai — cobrir via NFC-e/Procon até haver coleta assistida por browser ou parceria.
- **iFood/Rappi:** só amostragem manual/spike, rótulo "delivery (pode ter acréscimo)", nunca central (ToS + anti-bot + fragilidade).

**Quirks pro README** (é aqui que o projeto vira engenharia): GO sem portal estadual de preço; host canônico da NFC-e mudou (nfe→nfeweb) em 2025; SEFAZ-GO sem API JSON (scraping de HTML); WAF por rede (Akamai na RD, CloudFront na DPSP `www.*`, host nativo VTEX como saída); Pague Menos precifica nacional (CEP só afeta fulfillment); Procon em PDF-imagem (OCR); CNES com CNPJ-raiz vs NFC-e com filial.

---

### RD Saúde (Drogasil/Raia): caminhos legítimos para o preço

Contexto: a RD Saúde (Drogasil `www.drogasil.com.br` + Droga Raia `www.drogaraia.com.br`) é a maior rede do país, mas o site inteiro fica atrás de **Akamai Bot Manager** na borda — confirmado ao vivo: `403 Forbidden` até no `/robots.txt` a partir de IP de datacenter (não é bloqueio pontual de `/api/*`). Investigamos 5 caminhos para obter o preço de forma legítima. Resumo honesto abaixo.

#### 1. Tabela

| Caminho | Viável? | Legitimidade | Esforço | Veredito |
|---|---|---|---|---|
| **Google Shopping / SERP APIs** (SerpApi, DataForSEO…) | ❌ Não (p/ medicamento por loja) | ⚠️→❌ ToS-sensível / **juridicamente contestado** | Alto | **Descartado** |
| **JSON-LD `schema.org/Product` nas PDPs** + WAF por User-Agent | ⚠️ só de IP residencial · ❌ em datacenter | ❌ gray-area (circumvenção de WAF) | Médio | **Bloqueado em produção** |
| **Feed de afiliado** (Awin / Rakuten) | ⚠️ parcial (preço nacional, gated) | ⚠️ legítimo, mas condicionado ao ToS do programa | Médio-alto | **Inadequado p/ preço por CEP** |
| **API pública / engenharia reversa do app** | ❌ Não | ❌ proibido-ou-bloqueado | Muito alto | **Descartado** |
| **Agregador Farmaindex** (alimentado por feed CPC **oficial** da RD) | ⚠️ Sim, p/ preço **nacional** | ⚠️ gray-area (ToS do Farmaindex) | Baixo-médio | **Melhor via p/ preço de referência — não por CEP** |

#### 2. Detalhe de cada caminho

**1. Google Shopping / SERP APIs — ❌**
As ferramentas (SerpApi, DataForSEO, SearchApi, Bright Data) existem e parseiam a aba Shopping, mas não servem ao caso: (a) medicamento é categoria **restrita** no Merchant Center (exige certificação de farmácia + Google; prescrição geralmente barrada) — sem evidência de que Drogasil/Raia submetam feed de medicamentos nem apareçam como *seller* no Shopping BR; (b) granularidade errada — devolve preço de vitrine por *merchant*, **nunca por CEP/loja**; (c) legitimidade pior que "gray-area": em dez/2025 o Google **processou a SerpApi** (DMCA + circunvenção), caso em litígio ativo (motion to dismiss em fev/2026). Pago, instável e juridicamente contestado.

**2. JSON-LD nas PDPs + WAF por User-Agent — ❌ (em produção)**
Fato confirmado ao vivo: as PDPs `.html` servem `JSON-LD schema.org/Product` com `offers.price` (BRL), `gtin13`, `sku`, `availability` e `priceValidUntil` — o dado de preço existe embutido no HTML por SEO (ex.: Dipirona 1g Drogasil `19.49` / gtin `7899547500363`; Raia `27.98` / gtin `7896004782553`). O WAF filtra por **User-Agent sem validar reverse DNS** (Googlebot=200, Chrome=403, sem-UA=200). **Porém**: (a) o teste que passou saiu de **IP residencial**; todo fetch de datacenter levou `403` até no `robots.txt` — no Render provavelmente falha **independente do UA**; (b) forjar UA de Googlebot para furar o WAF é **circumvenção de controle de acesso** (o operador bloqueia navegadores reais de propósito); (c) é preço **nacional/default do SSR, não por CEP/loja** (personalização é client-side); (d) **não há sitemap de produtos** (`/sitemap.xml`=404, sem linha `Sitemap:` no robots) — descoberta de URL quebrada. Inviável e ToS-sensível para deploy em datacenter.

**3. Feed de afiliado (Awin / Rakuten) — ⚠️ legítimo, mas inadequado**
A RD tem programas oficiais de afiliado (Drogasil e Droga Raia na Awin; case study oficial do Grupo RD na Rakuten). O datafeed da Awin traz preço/disponibilidade/deep link — canal **sancionado por ToS**, sem tocar no site bloqueado. **Mas**: exige aprovação dupla (publisher + programa RD, não garantida e às vezes **pausada** — Lomadee mostrou Droga Raia/Drogasil "Anunciante pausado"); o preço é o **online nacional**, não por CEP/loja; refresh ~diário; e usar feed de afiliado como comparador puro tende a **violar os T&Cs** (muitos exigem tráfego via link de afiliado). Ninguém logou na Awin para inspecionar o feed real da RD — a existência de preço no feed vem de doc genérica, não do feed RD verificado. Legítimo apenas para promoção com deep link, não para alimentar comparador por CEP.

**4. API pública / engenharia reversa do app — ❌**
Não há API pública de produto/preço, portal de desenvolvedor nem dados abertos da RD. Stack é VTEX (endpoints padrão existem, mas **todos atrás do Akamai**). O app **não escapa** do WAF: apps sob Akamai Bot Manager exigem `x-acf-sensor-data` + cookies `_abck`/`bm_sz` gerados por SDK ofuscado atrelado a TLS fingerprint + IP; chamada de datacenter cai no mesmo `403`. Reverter o app com jadx/mitmproxy só para **entender** é aceitável como estudo; **reproduzir** a geração de `sensor_data` para consumir a API = evasão de bot = viola ToS e é instável. (Nota: *RD Ads* = retail media, não API de preço; *RD Station* = outra empresa.)

**5. Agregador Farmaindex — ⚠️ a via realmente utilizável (preço nacional)**
A tese inicial de que "nenhum agregador tem o preço da RD" foi **refutada ao vivo (07/07/2026)**. CliqueFarma, Consulta Remédios, Zoom e Buscapé de fato **não** trazem a RD — mas o **Farmaindex** (`farmaindex.com`) traz Drogasil **e** Droga Raia lado a lado (ex.: cabergolina — Droga Raia `R$ 141,98`, Drogasil `R$ 143,00`). Os deep links carregam `utm_campaign=…feedprodutos:rd:drogasil:alwayson…` e `utm_medium=cpc` — string da **própria RD**: ou seja, a RD **deliberadamente sindica seu catálogo com preço** a comparadores parceiros e paga por clique (CPC). Crucialmente, o **Farmaindex respondeu normalmente a fetch de datacenter (sem 403)**, diferente do site da RD. Então dá para obter um preço RD **sem furar o Akamai**. Ressalvas: (a) é o preço **nacional do e-commerce RD, não por CEP/loja física**; (b) raspar o HTML do Farmaindex é **gray-area quanto ao ToS do Farmaindex** (sem API pública confirmada); (c) estabilidade depende da RD manter a campanha "alwayson" e do Farmaindex não adicionar anti-bot — é dependência de parceiro comercial, não contrato nosso.

#### 3. Recomendação final

**Existe um caminho legítimo e estável para o preço da RD *por CEP/loja*? Não.** Nenhuma das 5 vias entrega o preço regionalizado por loja: o site está 100% atrás do Akamai (bloqueado em datacenter, evasão = ToS), o app idem, e todos os canais que fornecem algum preço (afiliado, Farmaindex) entregam o **preço nacional do e-commerce**, não o da loja física por CEP.

**O que é defensável fazer:**

1. **Fechar a RD como fonte DIRETA de preço** — com honestidade — e rotular como **"preço por loja/CEP não disponível publicamente"**. Documentar no README (seção "armadilhas de cada API") que a maior rede do país fica atrás de Akamai Bot Manager (site + app), sem API pública/portal/dados abertos. Isso vira **narrativa de engenharia**, não buraco.

2. **Cobrir o preço praticado da RD via NFC-e / Procon** (preços de venda reais capturados de nota fiscal e das pesquisas de preço do Procon) — é a via legítima e aberta que efetivamente traz preço de varejo, e cobre a RD por tabela indireta sem tocar no WAF.

3. **Preço de referência (opcional, legítimo):** usar a tabela **CMED/ANVISA (PMC/PMVG)** em CSV oficial como **teto regulatório** por medicamento/UF — 100% legítima e aberta (não é o preço praticado pela RD, mas é a referência mais defensável).

4. **Se quiser exibir um preço RD indicativo:** o **Farmaindex** (alimentado pelo feed CPC oficial da RD) é a única via que obtém um preço RD **sem evadir WAF** — mas deve ser marcado explicitamente como **"preço nacional do e-commerce, não por loja/CEP"** e **gray-area de ToS do Farmaindex**. Não confiar como fonte estável; tratar como enriquecimento oportunista.

**Por que a decisão é consciente e defensável:** o projeto é portfólio com postura anti-ToS-risk (ver CLAUDE.md). Tentar bypass de Akamai (proxies residenciais, spoof de sensor, headless farm) é ToS-violating, instável e **contradiz a proposta "legítima"** do Balcão. Cobrir a RD via NFC-e/Procon (preço praticado) + CMED (teto oficial), e rotular o preço-por-loja da RD como "não disponível publicamente", é a escolha honesta: entrega valor real ao usuário, documenta a limitação como engenharia, e não coloca o projeto em zona cinzenta jurídica por uma única rede.
