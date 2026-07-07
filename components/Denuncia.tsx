"use client";

import { useState } from "react";
import { textoDenuncia, type DenunciaInput } from "@/lib/denuncia";

export function Denuncia(props: DenunciaInput) {
  const [copiado, setCopiado] = useState(false);
  const texto = textoDenuncia(props);

  const copiar = () => {
    navigator.clipboard
      ?.writeText(texto)
      .then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <div className="denuncia">
      <p className="denuncia-head">Cobrar acima do teto é irregular. Dá pra registrar a denúncia em 2 passos:</p>
      <ol className="denuncia-passos">
        <li>Copie o texto pronto abaixo (já tem remédio, preço, teto e a base legal).</li>
        <li>Abra o canal oficial e cole na reclamação.</li>
      </ol>
      <pre className="denuncia-texto">{texto}</pre>
      <div className="denuncia-acoes">
        <button type="button" onClick={copiar} className="denuncia-copiar">
          {copiado ? "copiado!" : "copiar denúncia"}
        </button>
        <a className="denuncia-link" href="https://www.consumidor.gov.br/" target="_blank" rel="noopener noreferrer">
          abrir consumidor.gov.br →
        </a>
      </div>
    </div>
  );
}
