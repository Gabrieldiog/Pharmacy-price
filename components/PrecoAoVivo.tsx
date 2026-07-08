"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ClientMed } from "@/lib/types";
import { fonteAoVivo, precoAoVivo, type PrecoLoja } from "@/lib/balcao";
import { centroide, geoSalva, pedirGeo, type Geo } from "@/lib/geo";
import { brl, haQuantoTempo } from "@/lib/med-format";
import { mapsBusca } from "@/lib/maps";

type Status = "carregando" | "ok" | "vazio" | "erro";

const NOME_UF: Record<string, string> = {
  GO: "Goiânia", PR: "Paraná", SP: "São Paulo", RJ: "Rio de Janeiro", MG: "Minas Gerais",
  BA: "Bahia", RS: "Rio Grande do Sul", SC: "Santa Catarina", DF: "Distrito Federal",
};

// Uma linha do resultado. A forma muda com a fonte: NFC-e é uma LOJA vendendo o
// produto (mostra loja, bairro, distância, mapa); e-commerce é um PRODUTO da rede
// (mostra o produto e o preço, sem loja/distância — é preço de internet).
function Linha({ loja, melhor, porLoja }: { loja: PrecoLoja; melhor: boolean; porLoja: boolean }) {
  if (!porLoja) {
    const nome = loja.descricao || loja.estabelecimento || "Produto";
    return (
      <li className={melhor ? "vivo-loja melhor" : "vivo-loja"}>
        <div className="vivo-loja-info">
          <span className="vivo-loja-nome">
            {nome}
            {melhor && <span className="vivo-chip">menor</span>}
          </span>
        </div>
        <div className="vivo-loja-dir">
          <span className="vivo-loja-val">{brl(loja.valorCents)}</span>
        </div>
      </li>
    );
  }

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

  // termo de busca: o nome do produto (Venvanse, Dipirona...). Cai pra substancia.
  const termo = (med.produto || med.substancia || "").trim();
  const fonte = uf ? fonteAoVivo(uf) : null;

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
    const f = fonteAoVivo(uf);
    if (!f) return;

    // fonte por loja (NFC-e) precisa de onde buscar; e-commerce ignora geo
    let geo: Geo | null = null;
    if (f.porLoja) {
      const salva = geoSalva();
      geo = salva ?? centroide(uf);
      setUsandoCentroide(!salva);
      if (!geo) {
        setStatus("erro");
        return;
      }
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

  // refina com a localizacao exata quando a pessoa permite (só faz sentido por loja)
  const usarMinhaLocalizacao = async () => {
    const g = await pedirGeo();
    if (!g || uf == null) return;
    const ctrl = new AbortController();
    const meu = ++reqRef.current;
    setUsandoCentroide(false);
    setStatus("carregando");
    precoAoVivo(uf, termo, g, { signal: ctrl.signal })
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

  // UF sem fonte de preco ao vivo: bloco honesto + convite pra colaborar.
  if (!fonte) {
    return (
      <section className="det-vivo">
        <div className="vivo-head">
          <span className="vivo-titulo">Preço ao vivo</span>
        </div>
        <div className="vivo-indisponivel">
          <p>
            Preço ao vivo ainda não em <strong>{NOME_UF[uf] ?? `seu estado (${uf})`}</strong>. Onde há uma fonte
            aberta — nota fiscal do estado ou catálogo de uma rede — a gente mostra aqui. Até lá, o preço de balcão
            depende de gente como você.
          </p>
          <Link href="/colaborar" className="vivo-cta">
            Escanear uma nota e ajudar →
          </Link>
        </div>
      </section>
    );
  }

  const primeira = lojas[0];
  const sub =
    fonte.porLoja && primeira
      ? `${primeira.descricao || termo} — ${fonte.comoObtido}.`
      : `${fonte.comoObtido.charAt(0).toUpperCase()}${fonte.comoObtido.slice(1)}.`;

  return (
    <section className="det-vivo">
      <div className="vivo-head">
        <span className="vivo-dot" />
        <span className="vivo-titulo">Preço ao vivo · {fonte.titulo}</span>
      </div>

      {status === "carregando" && (
        <p className="vivo-msg">{fonte.porLoja ? "Buscando preços perto de você…" : "Buscando preços ao vivo…"}</p>
      )}

      {status === "erro" && (
        <p className="vivo-msg">Não consegui o preço ao vivo agora. Tente recarregar a página.</p>
      )}

      {status === "vazio" && (
        <p className="vivo-msg">Nenhum preço ao vivo pra esse remédio por aqui ainda.</p>
      )}

      {status === "ok" && primeira && (
        <>
          <p className="vivo-sub">{sub}</p>
          <ul className="vivo-lista">
            {lojas.slice(0, 6).map((l, i) => (
              <Linha key={`${l.estabelecimento ?? l.descricao}-${i}`} loja={l} melhor={i === 0} porLoja={fonte.porLoja} />
            ))}
          </ul>
          <div className="vivo-pe">
            <span>{fonte.nota}</span>
            {fonte.porLoja && usandoCentroide && (
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
