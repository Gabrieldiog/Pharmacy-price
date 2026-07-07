import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como isso funciona · Pharmacy-price",
  description:
    "De onde vem cada número: teto da CMED, gratuidade do Farmácia Popular, preço das redes e como o semáforo é calculado.",
};

const CAMADAS = [
  {
    nome: "Teto legal",
    fonte: "CMED / Anvisa",
    o: "Quanto a farmácia pode cobrar por lei — o preço máximo de cada apresentação.",
    nota: "Referência oficial e nacional. Não é uma oferta.",
  },
  {
    nome: "Preço da rede",
    fonte: "Pague Menos, São João, Drogal",
    o: "Quanto a rede cobra hoje no e-commerce, comparado entre si.",
    nota: "Preço nacional da rede — confirme na loja.",
  },
  {
    nome: "Balcão",
    fonte: "Colaboração (NFC-e)",
    o: "O que alguém pagou de verdade numa farmácia de Goiânia.",
    nota: "Esparso, e melhora conforme mais gente colabora.",
  },
];

const FONTES = [
  {
    titulo: "Teto legal — CMED / Anvisa",
    o: "O preço máximo (PMC) de cada apresentação, por estado.",
    como: "Sai numa planilha mensal da CMED. Goiás usa a coluna de ICMS de 19%. Guardo tudo em centavos (número inteiro) pra não ter erro de arredondamento com vírgula.",
    pegadinha:
      "O nome do arquivo muda todo mês com um número imprevisível. Em vez de adivinhar, o ETL raspa o link direto da página da Anvisa.",
  },
  {
    titulo: "De graça — Farmácia Popular",
    o: "A lista de remédios que o governo dá de graça.",
    como: "Cruzo essa lista com a base da CMED pelo código de barras (EAN), e valido o dígito verificador do EAN-13.",
    pegadinha:
      "Não existe API — a lista sai só em PDF mensal. Extraio o texto do PDF e caso item por item.",
  },
  {
    titulo: "Preço praticado — redes VTEX",
    o: "O preço de balcão/e-commerce em Pague Menos, São João e Drogal.",
    como: "As três rodam a mesma plataforma (VTEX) com catálogo público. O preço é nacional: o CEP só decide qual loja retira, não o valor. As lojas de Goiânia vêm do endpoint de pontos de retirada.",
    pegadinha:
      "Adicionar uma rede nova é uma linha de configuração — o mesmo conector genérico atende todas. Redes atrás de firewall (Drogasil, Pacheco) ficam de fora, honestamente marcadas.",
  },
];

const SEMAFORO = [
  { cls: "verde", faixa: "até 90% do teto", txt: "tem folga em relação ao máximo legal" },
  { cls: "ambar", faixa: "entre 90% e 100%", txt: "colado no teto" },
  { cls: "vermelho", faixa: "acima de 100%", txt: "acima do que a lei permite — dá pra denunciar no Procon" },
];

const LIMITES = [
  "Não é aconselhamento médico. Não substitui médico nem farmacêutico.",
  "O teto é a referência legal, não uma oferta. O preço da rede é nacional e pode variar na loja.",
  "O piloto é Goiânia — a cobertura de preço real começa aqui e vai crescendo.",
  "Um relato de balcão isolado não prova nada; vira dado quando várias pessoas confirmam.",
  "É um projeto de portfólio, sem fins comerciais.",
];

export default function MetodologiaPage() {
  return (
    <main className="page">
      <header className="hero hero-sub">
        <Link href="/" className="voltar">
          ← voltar
        </Link>
        <span className="badge-pill">Fontes e metodologia</span>
        <h1 className="title">Como isso funciona</h1>
        <p className="lede">
          Não existe uma fonte única de preço de remédio no Brasil. Existe a tabela do governo, o PDF do
          Farmácia Popular, o catálogo de cada rede num formato diferente e a nota fiscal na sua mão. Este
          projeto junta tudo num lugar só — e aqui embaixo está de onde vem cada número, porque um comparador
          que você não pode conferir não serve pra nada.
        </p>
      </header>

      <section className="met-sec">
        <h2 className="met-h2">As três camadas de preço</h2>
        <div className="met-camadas">
          {CAMADAS.map((c) => (
            <div key={c.nome} className="met-camada">
              <span className="met-camada-nome">{c.nome}</span>
              <span className="met-camada-fonte">{c.fonte}</span>
              <p>{c.o}</p>
              <span className="met-camada-nota">{c.nota}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="met-sec">
        <h2 className="met-h2">De onde vem cada dado</h2>
        <div className="met-fontes">
          {FONTES.map((f) => (
            <article key={f.titulo} className="met-fonte">
              <h3>{f.titulo}</h3>
              <p className="met-o">{f.o}</p>
              <p className="met-como">{f.como}</p>
              <p className="met-pegadinha">
                <span className="met-peg-tag">a pegadinha</span> {f.pegadinha}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="met-sec">
        <h2 className="met-h2">Como o semáforo funciona</h2>
        <p className="met-sec-lede">
          Comparo o menor preço praticado com o teto legal do mesmo remédio. A razão entre os dois vira uma
          cor:
        </p>
        <div className="met-semaforo">
          {SEMAFORO.map((s) => (
            <div key={s.cls} className="met-sem-linha">
              <span className={`semaforo sem-${s.cls}`}>{s.faixa}</span>
              <span className="met-sem-txt">{s.txt}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="met-sec">
        <h2 className="met-h2">Equivalentes na mesma dose</h2>
        <p className="met-sec-lede">
          Dois remédios são equivalentes quando têm o mesmo princípio ativo e a mesma concentração. É isso que
          deixa a página de cada remédio te mostrar os genéricos e similares da mesma dose — quase sempre bem
          mais baratos que a marca de referência.
        </p>
      </section>

      <section className="met-sec">
        <h2 className="met-h2">A colaboração e a nota fiscal</h2>
        <p className="met-sec-lede">
          Em Goiás não há portal público de preço de balcão, então esse mapa é colaborativo. Quando você
          reporta um preço, a chave da NFC-e é validada no seu próprio navegador (44 dígitos, dígito
          verificador, UF de Goiás, modelo NFC-e) pra servir de comprovante. Puxar os itens direto da SEFAZ
          esbarra em bloqueio de origem no navegador, então, no piloto, o preço é digitado e a nota fica como
          referência. Cada relato vira uma sugestão pública no repositório do projeto — auditável por qualquer
          um.
        </p>
      </section>

      <section className="met-sec">
        <h2 className="met-h2">O que este projeto não faz</h2>
        <ul className="met-limites">
          {LIMITES.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>

      <footer className="foot">
        Teto: CMED/Anvisa (lista de jun/2026), com o ICMS de 19% de Goiás. De graça: Farmácia Popular de
        jun/2026. Preço das redes: coleta própria via catálogo público.
      </footer>
    </main>
  );
}
