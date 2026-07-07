// Uma apresentacao da CMED = marca + principio ativo + concentracao + forma + quantidade.
// O teto (PMC) nao e um valor unico: varia por aliquota de ICMS (portanto por UF).
export interface Apresentacao {
  ggrem: string | null;
  registro: string | null;
  substancia: string | null;
  produto: string | null;
  laboratorio: string | null;
  cnpj: string | null;
  apresentacao: string | null;
  classe_terapeutica: string | null;
  tipo: string | null; // Generico | Similar | Novo | Biologico | ...
  tarja: string | null;
  regime: string | null; // "Liberado" => sem teto
  restricao_hospitalar: string | null;
  eans: string[]; // EAN 1/2/3 nao vazios
  // teto por aliquota de ICMS, em CENTAVOS. Chave = aliquota ("0","12","17","17.5","19"...).
  pmc: Record<string, number | null>;
  vigencia: string; // AAAA-MM da lista
}
