"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ClientMed } from "@/lib/types";
import { temPrecoAoVivo, precoAoVivo, type PrecoLoja } from "@/lib/balcao";
import { centroide, geoSalva, pedirGeo, type Geo } from "@/lib/geo";
import { brl, haQuantoTempo } from "@/lib/med-format";
import { mapsBusca } from "@/lib/maps";

type Status = "carregando" | "ok" | "vazio" | "erro";

const NOME_UF: Record<string, string> = {
  GO: "Goiânia", PR: "Paraná", SP: "São Paulo", RJ: "Rio de Janeiro", MG: "Minas Gerais",
  BA: "Bahia", RS: "Rio Grande do Sul", SC: "Santa Catarina", DF: "Distrito Federal",
};

function ondeLabel(uf: string): string {
  return NOME_UF[uf] ?? `seu estado (${uf})`;
}

// Linha de uma loja: "Farmacia Z, bairro · a X km · ha N dias" + preco + mapa.
function LinhaLoja({ loja, melhor }: { loja: PrecoLoja; melhor: boolean }) {
  const nome = loja.estabelecimento ?? "Farmácia";
  const local = [loja.bairro, loja.municipio].filter(Boolean).join(", ");
  const dist = loja.distanciaKm != null ? `a ${loja.distanciaKm.toFixed(1).replace(".", ",")} km` : null;
  const idade = haQuantoTempo(loja.atualizado);
  const rodape = [dist, idade].filter(Boolean).join(" · ");
  // só oferece o mapa quando há algo real pra procurar (nome de verdade ou
  // endereço/cidade). Sem isso, o link cairia numa busca genérica por "Farmácia".
  const alvo = [loja.estabelecimento, loja.endereco, loja.municipio].filter(Boolean).join(" ");

  return (
    <li className={melhor ? "vivo-loja melhor" : "vivo-loja"}>
      <div className="vivo-loja-info">
        <span className="vivo-loja-nome">
          {nome}
          {melhor && <span className="vivo-chip">menor</span>}
        </span>
        {local && <span className="vivo-loja-local">{local}</span>}
        {rodape && <span className="vivo-loja-meta">{rodape}</span>}
      </div>
      <div className="vivo-loja-dir">
        <span className="vivo-loja-val">{brl(loja.valorCents)}</span>
        {alvo && (
          <a
            className="vivo-loja-mapa"
            href={mapsBusca(alvo)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ver no mapa: ${nome}${local ? `, ${local}` : ""} (abre em nova aba)`}
          >
            ver no mapa →
          </a>
        )}
      </div>
    </li>
  );
}

export function PrecoAoVivo({ med }: { med: ClientMed }) {
  const [uf, setUf] = useState<string | null>(null);
  const [lojas, setLojas] = useState<PrecoLoja[]>([]);
  const [status, setStatus] = useState<Status>("carregando");
  const [usandoCentroide, setUsandoCentroide] = useState(true);
  const reqRef = useRef(0);

  // termo de busca: o nome do produto (Venvanse, Dipirona...) e o que aparece na
  // descricao da nota. Cai pra substancia se faltar.
  const termo = (med.produto || med.substancia || "").trim();

  useEffect(() => {
    const salvo = (() => {
      try {
        return localStorage.getItem("pp:uf");
      } catch {
        return null;
      }
    })();
    setUf(salvo || "GO");
  }, []);

  // busca o preco ao vivo quando ja sabemos a UF (e ela tem fonte)
  useEffect(() => {
    if (uf == null) return;
    if (!temPrecoAoVivo(uf)) return;

    const salva = geoSalva();
    const geo = salva ?? centroide(uf);
    setUsandoCentroide(!salva);
    if (!geo) {
      setStatus("erro");
      return;
    }

    const ctrl = new AbortController();
    const meu = ++reqRef.current;
    setStatus("carregando");
    precoAoVivo(uf, termo, geo, { signal: ctrl.signal })
      .then((res) => {
        if (meu !== reqRef.current) return;
        setLojas(res);
        setStatus(res.length ? "ok" : "vazio");
      })
      .catch(() => {
        if (meu !== reqRef.current || ctrl.signal.aborted) return;
        setStatus("erro");
      });
    return () => ctrl.abort();
  }, [uf, termo]);

  // refina com a localizacao exata quando a pessoa permite
  const usarMinhaLocalizacao = async () => {
    const g = await pedirGeo();
    if (!g || uf == null) return;
    refazer(g);
  };

  const refazer = (geo: Geo) => {
    if (uf == null) return;
    const ctrl = new AbortController();
    const meu = ++reqRef.current;
    setUsandoCentroide(false);
    setStatus("carregando");
    precoAoVivo(uf, termo, geo, { signal: ctrl.signal })
      .then((res) => {
        if (meu !== reqRef.current) return;
        setLojas(res);
        setStatus(res.length ? "ok" : "vazio");
      })
      .catch(() => {
        if (meu !== reqRef.current) return;
        setStatus("erro");
      });
  };

  if (uf == null) return null;

  // UF sem fonte de preco ao vivo (inclui Goiania, o piloto): bloco honesto.
  if (!temPrecoAoVivo(uf)) {
    const goiania = uf === "GO";
    return (
      <section className="det-vivo">
        <div className="vivo-head">
          <span className="vivo-titulo">Preço ao vivo</span>
        </div>
        <div className="vivo-indisponivel">
          <p>
            Preço ao vivo por farmácia ainda não em <strong>{ondeLabel(uf)}</strong>. Alguns estados publicam o
            preço real de cada loja a partir das notas fiscais (NFC-e){goiania ? " — Goiás ainda não tem esse app" : ""}.
            {goiania ? " Até lá, o preço de balcão aqui depende de gente como você." : ""}
          </p>
          <Link href="/colaborar" className="vivo-cta">
            Escanear uma nota e ajudar →
          </Link>
        </div>
      </section>
    );
  }

  const primeira = lojas[0];

  return (
    <section className="det-vivo">
      <div className="vivo-head">
        <span className="vivo-dot" />
        <span className="vivo-titulo">Preço ao vivo · {ondeLabel(uf)}</span>
      </div>

      {status === "carregando" && <p className="vivo-msg">Buscando preços perto de você…</p>}

      {status === "erro" && (
        <p className="vivo-msg">Não consegui o preço ao vivo agora. Tente recarregar a página.</p>
      )}

      {status === "vazio" && (
        <p className="vivo-msg">Nenhuma loja registrou esse preço por perto ainda.</p>
      )}

      {status === "ok" && primeira && (
        <>
          <p className="vivo-sub">
            {primeira.descricao || termo} — direto das notas fiscais, da loja mais barata pra mais cara.
          </p>
          <ul className="vivo-lista">
            {lojas.slice(0, 6).map((l, i) => (
              <LinhaLoja key={`${l.estabelecimento}-${i}`} loja={l} melhor={i === 0} />
            ))}
          </ul>
          <div className="vivo-pe">
            <span>Preço da última venda vista na nota fiscal — pode ter alguns dias.</span>
            {usandoCentroide && (
              <button type="button" className="vivo-refina" onClick={usarMinhaLocalizacao}>
                usar minha localização
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
