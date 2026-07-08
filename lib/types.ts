// Preco praticado por uma rede, em centavos.
export interface RedePreco {
  rede: string;
  centavos: number;
}

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
  precos: RedePreco[]; // precos por rede, ordenados asc (o menor primeiro); [] se nao houver
  grupo: string | null; // chave de equivalencia (substancia|concentracao); null se faltar um dos dois
}

// Metadados da coleta de preco praticado (cidade, data, redes cobertas com nº de lojas).
export interface LojaMeta {
  bairro: string | null;
  endereco: string;
  lat: number;
  lng: number;
}
export interface RedeMeta {
  nome: string;
  lojasCount: number;
  lojas?: LojaMeta[];
}
export interface PrecosMeta {
  cidade: string;
  uf: string;
  tipo: string;
  observadoEm: string;
  redes: RedeMeta[];
}

// Destaques precomputados no build pra home mostrar valor antes de qualquer busca.
export interface EconomiaCard {
  id: string; // do mais barato (link do detalhe)
  substancia: string | null;
  concentracao: string | null;
  apresentacao: string | null;
  baratoProduto: string;
  baratoLab: string | null;
  baratoCents: number;
  caroProduto: string;
  caroLab: string | null;
  caroCents: number;
  economiaPct: number;
}
export interface GratisCard {
  id: string;
  produto: string;
  substancia: string | null;
  indicacao: string | null;
}
export interface TetoCard {
  id: string;
  produto: string;
  cents: number;
  teto: number;
  acimaPct: number;
  rede: string;
}
export interface Destaques {
  economia: EconomiaCard[];
  gratis: GratisCard[];
  acimaDoTeto: TetoCard[];
}

// Numeros agregados do dataset pra pagina de panorama.
export interface PanoramaIndicacao {
  indicacao: string;
  count: number;
}
export interface Panorama {
  totalMeds: number;
  comTeto: number;
  deGraca: number;
  comPreco: number;
  economiaMediaPct: number | null;
  gratisTopIndicacoes: PanoramaIndicacao[];
  gratisMaisCaro: { id: string; produto: string; cents: number } | null;
  redesCount: number;
  lojas: number;
  cidade: string;
  observadoEm: string;
}
