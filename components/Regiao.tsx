"use client";

import { useEffect, useRef, useState } from "react";

const ESTADOS: { uf: string; nome: string }[] = [
  { uf: "AC", nome: "Acre" }, { uf: "AL", nome: "Alagoas" }, { uf: "AP", nome: "Amapá" },
  { uf: "AM", nome: "Amazonas" }, { uf: "BA", nome: "Bahia" }, { uf: "CE", nome: "Ceará" },
  { uf: "DF", nome: "Distrito Federal" }, { uf: "ES", nome: "Espírito Santo" }, { uf: "GO", nome: "Goiás" },
  { uf: "MA", nome: "Maranhão" }, { uf: "MT", nome: "Mato Grosso" }, { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" }, { uf: "PA", nome: "Pará" }, { uf: "PB", nome: "Paraíba" },
  { uf: "PR", nome: "Paraná" }, { uf: "PE", nome: "Pernambuco" }, { uf: "PI", nome: "Piauí" },
  { uf: "RJ", nome: "Rio de Janeiro" }, { uf: "RN", nome: "Rio Grande do Norte" }, { uf: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", nome: "Rondônia" }, { uf: "RR", nome: "Roraima" }, { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" }, { uf: "SE", nome: "Sergipe" }, { uf: "TO", nome: "Tocantins" },
];

export function Regiao() {
  const [uf, setUf] = useState("GO");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // le a escolha salva depois de montar (localStorage nao existe no build/SSR)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pp:uf");
      if (saved && ESTADOS.some((e) => e.uf === saved)) setUf(saved);
    } catch {}
  }, []);

  // fecha o menu ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (u: string) => {
    setUf(u);
    setOpen(false);
    try {
      localStorage.setItem("pp:uf", u);
    } catch {}
  };

  const isGO = uf === "GO";
  const nome = ESTADOS.find((e) => e.uf === uf)?.nome ?? uf;

  return (
    <div className="regiao" ref={ref}>
      <button type="button" className="regiao-chip" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox">
        <span className="regiao-dot" />
        {isGO ? "Piloto: Goiânia · GO" : `Você está em ${nome} · ${uf}`}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="regiao-menu" role="listbox">
          {ESTADOS.map((e) => (
            <button key={e.uf} type="button" role="option" aria-selected={e.uf === uf} className={e.uf === uf ? "sel" : ""} onClick={() => pick(e.uf)}>
              <span>{e.nome}</span>
              <span className="regiao-uf">{e.uf}</span>
            </button>
          ))}
        </div>
      )}

      <p className={`regiao-cobertura ${isGO ? "full" : "parcial"}`}>
        {isGO ? (
          <>Cobertura completa aqui: <strong>preço praticado das redes</strong>, teto legal e Farmácia Popular — e você pode reportar preço de balcão.</>
        ) : (
          <>O piloto de preço local é em Goiânia. Em {nome}, por enquanto: <strong>teto legal</strong> (referência nacional) e <strong>Farmácia Popular</strong>. Preço de rede/balcão da sua região ainda não.</>
        )}
      </p>
    </div>
  );
}
