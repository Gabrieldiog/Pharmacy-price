# Briefing — Comparador de Preços de Medicamentos (projeto "Pharmacy-price")

> Este documento é um resumo do estado do projeto para pedir ajuda pontual. Já rodamos 4 varreduras
> de pesquisa profundas (≈84 agentes, com verificação ao vivo dos endpoints). Abaixo está o que **já
> está confirmado** (não precisa refazer) e, no fim, **onde queremos ajuda**.

## O que é
Um comparador de preços de medicamentos para o Brasil que cruza o **preço-teto legal** (CMED/Anvisa) com
**preços reais praticados**, sinaliza quando uma farmácia cobra **acima do teto**, e destaca quando o remédio
é **de graça no Farmácia Popular**. Cobertura nacional no teto; preço real começa **regional**, com carinho
especial por **Goiânia (cidade-teste)**. Projeto de portfólio, sem fins comerciais.

## Stack e decisões já fechadas
- **Next.js (SSG estático) + dataset NDJSON gerado no build + busca client-side (MiniSearch) + ETL via GitHub Actions + deploy Netlify.** Zero backend permanente, custo zero, "nunca dorme". Functions pontuais só para preço ao vivo.
- Nome do produto: mantém **Pharmacy-price**. Paleta: dark, verde-farmácia como brand, azul de apoio, e **vermelho reservado só pro alerta "acima do teto"**.
- **Escopo Fase 1:** teto CMED nacional por UF + badge "de graça no Farmácia Popular" + busca + SEO, **com Goiânia como piloto de preço real** desde o começo.
- Regra de produto inegociável: a UI diferencia **5 tipos de preço** e a palavra "balcão" só aparece em nota fiscal (NFC-e) e Procon — nunca em e-commerce (que é "retirada na loja X" ou "delivery da loja X"). Teto CMED é referência legal, não oferta.

## O que JÁ pesquisamos e confirmamos (ao vivo)
- **CMED/Anvisa (teto):** XLSX mensal (~25 mil apresentações, PMC por alíquota de ICMS). Nome do arquivo tem timestamp imprevisível (raspar o link, não hardcode). Alternativa mais fácil: CSV `TA_PRECO_MEDICAMENTO.csv` (traz EAN+GGREM+registro+preço). Match entre fontes = **EAN/GTIN**.
- **Farmácia Popular:** 100% gratuito desde fev/2025; lista mensal oficial com **655 EANs** (só em PDF, sem API — normalizar isso é a "camada do meio" que valoriza o projeto). Cruza direto por EAN → badge "de graça".
- **Preço real por NFC-e (balcão literal) — mapa nacional:** só ~metade dos estados tem *busca por produto/GTIN* (o resto só consulta nota por chave, inútil pra comparar). Bahia (Preço da Hora, melhor API REST), Alagoas (API oficial c/ token), Paraná (**em manutenção/503 agora**), RS (reCAPTCHA). App federado "Menor Preço Brasil" (SVRS/Procergs, CONFAZ) cobre ~16 UFs+DF mas **não achamos o host HTTP**. **SP e GO não têm.**
- **Universo VTEX das farmácias (habilita "retirada por CEP"):** 7 redes com catálogo aberto — **Pague Menos**/Extrafarma, São João, Globo, Venâncio, Rosário, Drogal, Catarinense. **Drogasil/Raia (RD) e Pacheco/São Paulo (DPSP) estão atrás de WAF** (403). Um único conector VTEX genérico cobre todas.
- **Farmácia Popular, ICMS por UF, LGPD, RDC 96 (propaganda de medicamento), acessibilidade, SEO, histórico de preço** — tudo pesquisado e documentado.

## Goiânia (cidade-teste) — situação específica
- **ICMS-GO = 19%** (desde 01/04/2024) → usar a **coluna PMC 19%** da CMED como teto. Sem PROTEGE embutido em medicamento.
- **Goiás NÃO tem portal estadual de preço via NFC-e.** Então o preço em Goiânia vem de 3 caminhos: (a) **e-commerce por CEP** (Pague Menos e DPSP confirmados), (b) **crowdsourcing via QR da notinha** (usuário escaneia), (c) **seed do Procon-GO** (PDFs de pesquisa de preço, alguns escaneados = precisa OCR).
- **Pague Menos** é o herói: VTEX, catálogo aberto, POST de simulação **validado ao vivo** (dipirona → R$8,79). **PORÉM o preço é NACIONAL** (seller único) — o CEP só muda **qual loja retira**, não o preço. Confirmamos ~22 lojas em Goiânia/Aparecida.
- **DPSP:** o site `www.*` bloqueia (WAF), mas o host nativo `{conta}.vtexcommercestable.com.br` responde (catálogo + 30 lojas de Goiânia confirmadas).
- **RD (Drogasil/Raia):** WAF Akamai bloqueia tudo → cobrir só via NFC-e/Procon por enquanto.
- **QR NFC-e GO:** host correto é `nfeweb.sefaz.go.gov.br/.../danfeNFCe?p=<payload>` (v3, sem hash). Sem API JSON → parse de HTML server-side. Leitura no browser precisa de fallback pra iOS (BarcodeDetector não funciona no Safari).
- **Geo das lojas:** backbone = CNES/DATASUS (CNPJ + lat/lng), join com a notinha pelo **CNPJ de 14 dígitos**.

---

## ONDE QUEREMOS AJUDA (perguntas abertas)

1. **Preço nacional vs. preço por loja — a tensão central do produto.** Descobrimos que Pague Menos (e provavelmente Drogasil/DPSP) precificam **nacionalmente** — o CEP só define qual loja retira, não muda o preço. Ou seja: o preço varia **entre redes**, mas é **igual em todas as lojas da mesma rede**. As únicas fontes que capturam variação real **por loja física** são NFC-e (que não existe em GO) e Procon (datado). **Como desenhar o produto pra isso ser honesto e ainda resolver a dor do usuário ("onde é mais barato perto de mim")?** Existe alguma técnica pra obter preço regionalizado real dessas redes, ou aceitamos comparar entre-redes + usar notinha/Procon pra a variação por loja?

2. **App federado "Menor Preço Brasil" (SVRS/Procergs, ~16 UFs+DF).** Não achamos o host HTTP do backend por sondagem (`menorpreco.svrs…`, `mpbr.svrs…` não resolvem). Você conhece o host/rota/headers reais, ou algum projeto open-source que consome esse backend? Um único driver cobriria metade do país.

3. **RD Saúde (Drogasil/Raia) atrás de WAF Akamai.** Existe alguma forma **legítima** de obter o preço deles por CEP/loja (feed do Google Shopping, sitemap de produtos, API de parceiro/afiliado), ou o certo é aceitar que só cobrimos essa bandeira via NFC-e/Procon?

4. **Antifraude do crowdsourcing de notinha.** A chave da NFC-e é autenticada pela SEFAZ (se o DANFE renderiza, o preço é real). Além de dedup por chave + validar UF/modelo/DV, **quais camadas de moderação/reputação** valem pra evitar abuso (spam, nota de outro estado, item mal-casado)?

5. **Cold start dos dados.** Antes de ter usuários escaneando notinhas, como ter dados úteis desde o dia 1? (Seed do Procon + e-commerce das redes VTEX + ?). Estratégia de bootstrap dos preços reais.

6. **iFood/Rappi por unidade** — viável de forma legítima (ToS, anti-bot, Bearer de sessão) ou melhor deixar de fora e rotular só como "delivery" quando houver?

7. **Narrativa de portfólio.** Como contar a história dessa "camada do meio" (normalização multi-fonte, resiliência, os 5 tipos de preço rotulados, o cruzamento com Farmácia Popular e com o teto legal) de forma que **pare o scroll de um recrutador técnico**? O que destacar no README e no case study?

> Contexto pra quem responder: temos um `docs/fontes.md` de ~640 linhas com o detalhe técnico de cada fonte (endpoints, vereditos ✅/⚠️/❌, quirks). O que precisamos aqui é **estratégia e conhecimento**, não teste de endpoint. Pode focar nas perguntas acima.
