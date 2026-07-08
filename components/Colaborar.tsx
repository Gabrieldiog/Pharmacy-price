"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClientMed } from "@/lib/types";
import { loadMedsIndex, searchMeds, type MedsIndex } from "@/lib/meds-client";
import { semaforo } from "@/lib/semaforo";
import { parseNfceInput, decodeChaveNfce, formatCnpj, type ChaveNfce } from "@/lib/nfce";
import { Denuncia } from "./Denuncia";
import { LeitorNota } from "./LeitorNota";

const REPO = "Gabrieldiog/Pharmacy-price";

function brl(cents: number | null): string | null {
  if (cents == null) return null;
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function precoParaCents(raw: string): number | null {
  let s = raw.replace(/[^0-9.,]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); // pt-BR: virgula decimal
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function issueUrl(med: ClientMed, farmacia: string, cents: number, chave: ChaveNfce | null): string {
  const teto = med.tetoGo != null ? brl(med.tetoGo) : "sem teto";
  const sem = med.tetoGo != null && !med.semTeto ? semaforo(cents, med.tetoGo) : null;
  const body = [
    `**Remédio:** ${med.produto}${med.concentracao ? ` (${med.concentracao})` : ""}`,
    med.laboratorio ? `**Laboratório:** ${med.laboratorio}` : "",
    `**Farmácia:** ${farmacia}`,
    `**Cidade:** Goiânia / GO`,
    `**Preço de balcão pago:** ${brl(cents)}`,
    `**Teto legal (GO):** ${teto}`,
    sem ? `**Situação:** ${sem.label}` : "",
    chave ? `**NFC-e:** ${chave.chave} — ${chave.uf ?? "?"} · ${String(chave.mes).padStart(2, "0")}/${chave.ano} · CNPJ ${formatCnpj(chave.cnpj)}` : "",
    "",
    "_Relato enviado pela página de colaboração do Pharmacy-price._",
  ]
    .filter(Boolean)
    .join("\n");
  const title = `Preço de balcão: ${med.produto} — ${farmacia}`;
  return `https://github.com/${REPO}/issues/new?labels=preco-balcao&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

export function Colaborar() {
  const [idx, setIdx] = useState<MedsIndex | null>(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [med, setMed] = useState<ClientMed | null>(null);
  const [farmacia, setFarmacia] = useState("");
  const [precoStr, setPrecoStr] = useState("");
  const [nfceRaw, setNfceRaw] = useState("");

  useEffect(() => {
    let alive = true;
    loadMedsIndex()
      .then((i) => {
        if (!alive) return;
        setIdx(i);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const sugestoes = useMemo(
    () => (idx && !med ? searchMeds(idx, q, 6) : []),
    [idx, med, q]
  );

  const cents = precoParaCents(precoStr);
  const sem = med && cents && med.tetoGo != null && !med.semTeto ? semaforo(cents, med.tetoGo) : null;

  const chave = useMemo(() => {
    const parsed = parseNfceInput(nfceRaw);
    return parsed ? decodeChaveNfce(parsed) : null;
  }, [nfceRaw]);
  const nfceMexeu = nfceRaw.trim().length > 0;
  // so anexa a nota ao relato se for uma NFC-e de Goias com digito verificador valido
  const chaveOk = chave?.valido && chave.isGoias && chave.isNfce ? chave : null;

  const pronto = Boolean(med && farmacia.trim() && cents);
  const url = pronto ? issueUrl(med!, farmacia.trim(), cents!, chaveOk) : null;

  return (
    <div className="colab">
      {/* 1. remedio */}
      <label className="colab-field">
        <span className="colab-label">1 · Qual remédio?</span>
        {med ? (
          <div className="colab-chosen">
            <div>
              <strong>{med.produto}</strong>
              {med.concentracao && <span className="colab-chosen-sub"> · {med.concentracao}</span>}
              <div className="colab-chosen-teto">
                {med.semTeto
                  ? "preço liberado (sem teto legal)"
                  : med.tetoGo != null
                    ? `teto legal em GO: ${brl(med.tetoGo)}`
                    : "teto indisponível"}
              </div>
            </div>
            <button type="button" className="colab-trocar" onClick={() => { setMed(null); setQ(""); }}>
              trocar
            </button>
          </div>
        ) : (
          <>
            <input
              className="colab-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={loading ? "Carregando a base…" : "ex.: dipirona, losartana…"}
              disabled={loading}
              autoFocus
            />
            {sugestoes.length > 0 && (
              <ul className="colab-sug">
                {sugestoes.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => setMed(m)}>
                      <span className="colab-sug-nome">{m.produto}</span>
                      <span className="colab-sug-meta">
                        {[m.concentracao, m.laboratorio].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </label>

      {/* 2. farmacia */}
      <label className="colab-field">
        <span className="colab-label">2 · Em qual farmácia (Goiânia)?</span>
        <input
          className="colab-input"
          value={farmacia}
          onChange={(e) => setFarmacia(e.target.value)}
          placeholder="ex.: Drogasil Setor Bueno, Farmácia do bairro…"
        />
      </label>

      {/* 3. preco + semaforo ao vivo */}
      <label className="colab-field">
        <span className="colab-label">3 · Quanto você pagou no balcão?</span>
        <div className="colab-preco-wrap">
          <span className="colab-preco-prefix">R$</span>
          <input
            className="colab-input colab-preco"
            value={precoStr}
            onChange={(e) => setPrecoStr(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
          />
        </div>
      </label>

      {med && cents != null && (
        <div className={`colab-veredito ${sem ? `sem-${sem.cls}` : "sem-neutro"}`}>
          {sem ? (
            <>
              <strong>{sem.label}</strong>
              <span>
                Você pagou {brl(cents)} · teto legal {brl(med.tetoGo)}
                {sem.cls === "vermelho" && " — acima do permitido por lei."}
              </span>
            </>
          ) : (
            <span>
              Você pagou {brl(cents)}. Esse remédio não tem teto legal na CMED para comparar.
            </span>
          )}
        </div>
      )}

      {sem?.cls === "vermelho" && med && cents != null && med.tetoGo != null && (
        <Denuncia produto={med.produto} precoCents={cents} tetoCents={med.tetoGo} farmacia={farmacia.trim() || null} uf="GO" />
      )}

      {/* 4. NFC-e (opcional) */}
      <div className="colab-field">
        <span className="colab-label">4 · Nota fiscal <span className="colab-opt">(opcional, mas dá credibilidade)</span></span>
        <LeitorNota onLido={setNfceRaw} />
        <input
          className="colab-input"
          value={nfceRaw}
          onChange={(e) => setNfceRaw(e.target.value)}
          placeholder="ou cole o link do QR da nota / a chave de 44 dígitos"
        />
        {nfceMexeu && (
          <div className={`colab-nfce ${chave?.valido && chave.isGoias && chave.isNfce ? "ok" : "warn"}`}>
            {!chave ? (
              "Não reconheci uma chave de NFC-e aí. Cole o link do QR ou os 44 dígitos."
            ) : !chave.valido ? (
              "Chave com dígito verificador inválido — confere se copiou certinho."
            ) : !chave.isGoias ? (
              `Essa nota é de ${chave.uf ?? "outra UF"}, não de Goiás. O piloto é Goiânia.`
            ) : !chave.isNfce ? (
              "Essa é uma NF-e (modelo 55), não a NFC-e do consumidor. Use a notinha da sua compra."
            ) : (
              <>
                Nota reconhecida · NFC-e · Goiás ·{" "}
                {String(chave.mes).padStart(2, "0")}/{chave.ano} · CNPJ {formatCnpj(chave.cnpj)}
              </>
            )}
          </div>
        )}
      </div>

      {/* envio */}
      {url ? (
        <a className="colab-enviar" href={url} target="_blank" rel="noopener noreferrer">
          Enviar relato →
        </a>
      ) : (
        <button className="colab-enviar" disabled>
          Preencha remédio, farmácia e preço
        </button>
      )}
      <p className="colab-nota">
        O relato abre uma sugestão pública no GitHub do projeto (precisa de conta) — é assim que a
        colaboração fica transparente e auditável. Nada é enviado sem você revisar e confirmar.
      </p>
    </div>
  );
}
