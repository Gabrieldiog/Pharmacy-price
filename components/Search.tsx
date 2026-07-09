"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { loadMedsIndex, searchMeds, type MedsIndex } from "@/lib/meds-client";
import { MedCard } from "./MedCard";

export function Search({ fallback }: { fallback?: ReactNode }) {
  const [idx, setIdx] = useState<MedsIndex | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

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

  // porUtilidade: na busca da home, quem tem preço/de-graça sobe (o que a pessoa veio ver)
  const results = useMemo(() => (idx ? searchMeds(idx, q, 40, true) : []), [q, idx]);
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

      {show ? (
        <div className="results">
          <div className="results-count">
            {results.length ? `${results.length} resultado${results.length > 1 ? "s" : ""}` : "Nada encontrado — tente o nome genérico"}
          </div>
          {results.map((m) => (
            <MedCard key={m.id} med={m} meta={idx?.meta ?? null} />
          ))}
        </div>
      ) : (
        // destaques aparecem na hora (2 KB proprios), sem esperar o indice de busca (8,5 MB)
        fallback
      )}
    </div>
  );
}
