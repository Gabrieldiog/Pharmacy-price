# Pharmacy-price

Comparador de preços de medicamentos para o Brasil. Cruza o **preço-teto legal** (CMED/Anvisa) com
**preços reais praticados**, avisa quando uma farmácia cobra **acima do teto**, e destaca quando o
remédio é **de graça no Farmácia Popular**.

**Ver ao vivo:** [pharmacy-price.netlify.app](https://pharmacy-price.netlify.app)

> **Não existe uma fonte de preço de remédio no Brasil.** Existem fontes incompatíveis, formatos que
> brigam, uma planilha do governo com nome de arquivo aleatório, PDFs escaneados, WAFs e um app federado
> sem documentação. Este projeto constrói a camada que faltava.

Projeto de portfólio, sem fins comerciais. Cobertura nacional no teto; preço real começa regional, com
cidade-piloto em **Goiânia/GO**.

## O modelo de 3 camadas de preço

| Camada | Certeza | O que é |
|---|---|---|
| **Teto** | Absoluta, nacional | PMC da CMED por UF (é a régua legal, não uma oferta) |
| **Rede** | Alta | Preço da rede via e-commerce (rotulado "confirme na loja") |
| **Balcão** | Crua, esparsa | NFC-e (notinha) e Procon, por loja nomeada e datada |

A UI **sempre** diferencia a natureza de cada preço. A palavra "balcão" só aparece com nota fiscal ou
pesquisa Procon. Ver [docs/decisoes.md](docs/decisoes.md) e [docs/fontes.md](docs/fontes.md).

## Stack

Next.js (SSG estático) · TypeScript · dataset NDJSON gerado no build · busca client-side (MiniSearch) ·
ETL via GitHub Actions · deploy Netlify. Sem backend permanente, custo zero.

## Status

No ar (link acima). O **teto legal (CMED)** já está integrado — cobertura nacional por UF. O **preço real de balcão** começa regional, com piloto em Goiânia/GO. Em evolução ativa.

## Docs

- [docs/fontes.md](docs/fontes.md) — cada fonte de dados, com veredito ✅/⚠️/❌ (verificação ao vivo).
- [docs/decisoes.md](docs/decisoes.md) — modelo de produto, regras e narrativa.
