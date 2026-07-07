// Redes de farmacia que rodam VTEX com catalogo publico aberto. Adicionar uma rede nova
// e literalmente uma linha aqui — o conector generico (vtex.ts) faz o resto.
// Preco VTEX e nacional (e-commerce/entrega); o pickup-points decide loja fisica em Goiania.
export interface Rede {
  nome: string;
  host: string;
  sc: string; // sales channel (nao usado na busca publica, mas util pra checkout)
}

export const REDES: Rede[] = [
  { nome: "Pague Menos", host: "www.paguemenos.com.br", sc: "1" },
  { nome: "São João", host: "www.saojoaofarmacias.com.br", sc: "1" },
  { nome: "Drogal", host: "www.drogal.com.br", sc: "1" },
];
