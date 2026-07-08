"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

// Tooltip de glossario: um "?" clicavel que abre uma frase simples. Traduz o
// jargao (generico, teto, tarja) sem poluir a tela principal. Acessivel: abre
// por clique/toque, fecha no Esc ou clicando fora, com aria.
export function InfoTip({ children, rotulo = "O que é isso?" }: { children: ReactNode; rotulo?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <span className="infotip" ref={ref}>
      <button
        type="button"
        className="infotip-btn"
        aria-label={rotulo}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        ?
      </button>
      {open && (
        <span role="tooltip" id={id} className="infotip-pop">
          {children}
        </span>
      )}
    </span>
  );
}
