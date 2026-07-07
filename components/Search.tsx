"use client";

import { useEffect, useMemo, useState } from "react";
import MiniSearch from "minisearch";
import type { ClientMed, PrecosMeta } from "@/lib/types";
import { MedCard } from "./MedCard";

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Search() {
  const [byId, setById] = useState<Map<string, ClientMed> | null>(null);
  const [mini, setMini] = useState<MiniSearch | null>(null);
  const [meta, setMeta] = useState<PrecosMeta | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/medicamentos-go.json").then((r) => r.json()),
      fetch("/precos-meta.json").then((r) => r.json()).catch(() => null),
    ])
      .then(([data, m]: [ClientMed[], PrecosMeta | null]) => {
        if (!alive) return;
        const map = new Map<string, ClientMed>();
        for (const med of data) map.set(med.id, med);
        const ms = new MiniSearch({
          idField: "id",
          fields: ["produto", "substancia"],
          processTerm: norm,
          searchOptions: { prefix: true, fuzzy: 0.2, boost: { produto: 3, substancia: 2 } },
        });
        ms.addAll([...map.values()]);
        setById(map);
        setMini(ms);
        setMeta(m);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => {
    if (!mini || !byId || q.trim().length < 2) return [];
    return mini
      .search(q)
      .slice(0, 40)
      .map((r) => byId.get(String(r.id)))
      .filter((m): m is ClientMed => Boolean(m));
  }, [q, mini, byId]);

  const show = q.trim().length >= 2;

  return (
    <div className="search">
      <div className="search-box">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={loading ? "Carregando a base de medicamentos…" : "Digite o remédio (ex.: dipirona, losartana, insulina…)"}
          disabled={loading}
          autoFocus
          aria-label="Buscar medicamento"
        />
      </div>

      {show && (
        <div className="results">
          <div className="results-count">
            {results.length ? `${results.length} resultado${results.length > 1 ? "s" : ""}` : "Nada encontrado — tente o nome genérico"}
          </div>
          {results.map((m) => (
            <MedCard key={m.id} med={m} meta={meta} />
          ))}
        </div>
      )}
    </div>
  );
}
