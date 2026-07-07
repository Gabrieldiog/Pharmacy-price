# Decisões de produto e estratégia

> Bússola do projeto. Consolida as decisões tomadas após 4 varreduras de pesquisa + uma rodada de
> estratégia. O detalhe técnico das fontes está em [fontes.md](fontes.md); aqui ficam o **modelo de
> produto**, as **regras** e a **narrativa**.

## 1. O modelo de 3 camadas de preço (a tese do produto)

A maior variação de preço de medicamento no Brasil é **entre redes e entre apresentações** (genérico vs.
referência), **não entre lojas da mesma rede** — o Procon-GO comprova (variações de 600%+ são rede-vs-rede
e genérico-vs-referência). Logo, o produto foca onde a variação realmente está, com honestidade sobre a
natureza de cada dado:

| Camada | Certeza | O que é | Rótulo na UI |
|---|---|---|---|
| **Teto** | Absoluta, nacional | PMC da CMED por UF (GO = coluna 19%) | "Teto legal (CMED)" — referência, não oferta |
| **Rede** | Alta | Preço nacional da rede via VTEX | "Preço da rede X — confirme na loja" |
| **Balcão** | Crua, esparsa | NFC-e (QR) e Procon, por loja nomeada + data | "Notinha" / "Procon-GO" |

**Resposta honesta pra "onde é mais barato perto de mim":** o que muda perto do usuário **não é o preço, é
qual rede tem loja no raio dele**. O app mostra *"a rede mais barata que tem loja perto de você"*. Ex.: no
Setor Sul, a Pague Menos a 600 m sai mais barata que a Drogasil a 400 m — decisão real, dado real, sem
prometer precisão por-loja que não existe.

**Regionalização VTEX:** essas redes usam **seller único nacional** para farma — a simulação por CEP devolve
o mesmo preço em qualquer lugar (o CEP só decide **qual loja retira**, não o preço). Não perseguir "preço por
loja de rede". Em vez disso, exibir o selo de transparência **"esta rede pratica preço único nacional"** —
informação útil que nenhum concorrente dá.

## 2. Os 5 tipos de preço e a regra anti-engano

Só 2 são "compre agora" (Retirada, Delivery); os outros 3 são referência/histórico (Teto, Notinha, Procon).
**A palavra "balcão" só aparece em Notinha (NFC-e) e Procon.** E-commerce é sempre "retirada/delivery da loja
X". Cada card mostra tipo + frescor ("hoje", "pesquisa de mar/2026") + comparação com o teto ("% abaixo" ou
"ACIMA DO TETO — denuncie"). Ordenação em duas faixas: "Comprar agora" (por preço total, frete somado) e
"Referência/histórico" (por mais recente).

## 3. Antifraude do crowdsourcing de notinha

O usuário **nunca digita o preço** — ele fornece a chave/QR e o preço vem da SEFAZ (autenticado). Isso mata a
fraude de "preço inventado" de saída. Camadas, das baratas às caras:

1. **Dedup por chave de acesso** (UNIQUE, idempotência).
2. **Validar a chave:** 44 dígitos, cUF=52 (GO), modelo=65 (NFC-e), DV mod-11.
3. **Emitente é farmácia?** cruzar o CNPJ do emitente com CNAE 4771 (via CNES, que já usamos pra geo).
4. **Rate-limit por dispositivo/sessão** (não por login — nada de cadastro no dia 1).
5. **Item que não casa por EAN → fila "match pendente"** (fuzzy + revisão), não descartar.
6. **Reputação só quando escalar** — não construir antes de ter volume (over-engineering).

**LGPD:** a NFC-e pode trazer CPF do consumidor → **descartar e nunca persistir**. Guardar só item + emitente
(CNPJ é dado público de PJ).

## 4. Ordem de bootstrap (útil no dia 1, sem um único usuário)

1. **CMED + Farmácia Popular** cobre o Brasil inteiro sozinho ("custa no máximo R$ X, e esse aqui é de graça").
2. **VTEX** (Pague Menos + DPSP + 5 redes abertas) = preço real de rede, nacional, legítimo, dia 1.
3. **Seed Procon-GO** = camada balcão inicial com farmácias nomeadas (datada, mas ancora "preço típico").
4. **QR NFC-e** = camada que **melhora com uso**, nunca pré-requisito.

Separar "útil no dia 1" (1–3, seed/batch) de "melhor com escala" (4). Nunca reféns do crowdsourcing.

## 5. Fora do core (por decisão consciente)

- **iFood/Rappi:** anti-bot agressivo + ToS restritivos + preço com markup de marketplace (semanticamente pior
  que VTEX direto). Só como experimento rotulado "delivery (pode ter taxa)", nunca fonte de "quanto custa".
- **RD Saúde (Drogasil/Raia):** WAF Akamai. Spikes possíveis (feed Google Shopping, JSON-LD, afiliado — todos
  com ressalva de ToS/WAF); default = cobrir via NFC-e/Procon e rotular "preço não disponível publicamente".
- **Menor Preço Brasil (federado):** exige engenharia reversa do APK (mitmproxy/jadx) + checar licença. Fonte
  oportunista, não backbone.

Mostrar que sabemos **quando parar de forçar** é sinal de senioridade, não de fraqueza.

## 6. Narrativa de portfólio (para o README)

**Não vender o resultado ("um comparador"), vender o problema resolvido.** A frase de abertura:

> "Não existe uma fonte de preço de remédio no Brasil. Existem fontes incompatíveis, formatos que brigam, uma
> planilha do governo com nome de arquivo aleatório, PDFs escaneados, WAFs e um app federado sem documentação.
> Eu construí a camada que faltava."

Destaques, por impacto:
1. **A "camada do meio" / normalização multi-fonte** — enquadrar como **data engineering**, não scraping:
   "reconcilio N fontes heterogêneas num modelo canônico chaveado por EAN, com resolução de conflito e
   proveniência por preço".
2. **Os 5 tipos de preço rotulados** — maturidade de produto: honestidade sobre a natureza do dado é feature.
   A regra "balcão só com NFC-e" como exemplo de rigor epistêmico.
3. **Cruzamento Farmácia Popular (de graça)** — o gancho humano; print no topo do README.
4. **Resiliência do ETL** — nome de arquivo imprevisível → raspar link; WAF → degradar; Paraná em 503 → app
   não cai. "Penso em produção, não só em happy path."
5. **Honestidade sobre cobertura** — um mapa do Brasil (balcão real vs. só teto) vira o maior flex: conheço o
   terreno tão bem que sei exatamente o que **não** sei.

**Estrutura do README:** print do Farmácia Popular → parágrafo "não existe uma fonte" → diagrama da arquitetura
de ingestão → tabela dos 5 tipos de preço → "decisões e trade-offs" (por que parei de forçar a RD, por que
iFood ficou de fora) → "limitações honestas".

**Fio condutor:** o projeto não é sobre farmácia, é sobre **domar dados públicos hostis** — a competência mais
valiosa e menos ensinável de um engenheiro de dados. Mesma veia do **Balcão**, agora com uma dor humana real
no fim.
