// Registro enxuto que o cliente carrega (piloto Goiania).
export interface ClientMed {
  id: string;
  produto: string;
  substancia: string | null;
  concentracao: string | null;
  apresentacao: string | null;
  laboratorio: string | null;
  tipo: string | null;
  tarja: string | null;
  deGraca: boolean;
  indicacao: string | null;
  semTeto: boolean;
  tetoGo: number | null; // centavos
  precoRede: number | null; // preco praticado da rede piloto, em centavos
}

// Metadados da coleta de preco praticado (rede, cidade, data, nº de lojas).
export interface PrecosMeta {
  rede: string;
  cidade: string;
  uf: string;
  tipo: string;
  observadoEm: string;
  lojasCount: number;
}
