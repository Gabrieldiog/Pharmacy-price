import type { LojaMeta } from "@/lib/types";
import { mapsBusca, mapsUrl } from "@/lib/maps";

// "Onde comprar" de uma rede. O preco praticado e da REDE (o mesmo em qualquer
// loja dela e no site) — entao o objetivo aqui nao e apontar "a loja com esse
// preco", e sim ajudar a achar a rede na cidade. Quando temos o endereco/coord
// de algumas lojas, mostramos com mapa; quando nao temos, ainda entregamos um
// link de busca da rede no mapa. Nunca some — a inconsistencia de antes (mapa so
// pra Pague Menos) era so falta de dado, nao ausencia de lojas.

export interface PontoCompra {
  rotulo: string; // "Setor Bueno · Avenida T, 63"
  mapa: string; // url do google maps (coordenada exata)
}

export interface OndeComprar {
  rede: string;
  cidade: string;
  lojas: PontoCompra[]; // ate 3 lojas com endereco, quando temos; senao []
  buscaRede: string; // link pra achar a rede no mapa — sempre presente
  temEndereco: boolean; // true = mostramos endereco+coordenada de loja(s)
}

export function ondeComprar(rede: string, cidade: string, lojas: LojaMeta[] = []): OndeComprar {
  const pontos: PontoCompra[] = lojas
    .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng))
    .slice(0, 3)
    .map((l) => ({
      rotulo: [l.bairro, l.endereco].filter(Boolean).join(" · "),
      mapa: mapsUrl(l.lat, l.lng),
    }))
    .filter((p) => p.rotulo);

  return {
    rede,
    cidade,
    lojas: pontos,
    buscaRede: mapsBusca(`${rede} farmácia ${cidade}`),
    temEndereco: pontos.length > 0,
  };
}
