import { brl } from "./med-format";

// Monta o texto pronto de denuncia quando um preco passa do teto legal (PMC).
export interface DenunciaInput {
  produto: string;
  precoCents: number;
  tetoCents: number;
  farmacia?: string | null;
  uf?: string;
}

export function textoDenuncia(d: DenunciaInput): string {
  const uf = d.uf ?? "GO";
  const partes: string[] = [
    "Quero relatar a venda de medicamento acima do preço máximo permitido por lei.",
    "",
    `Medicamento: ${d.produto}`,
  ];
  if (d.farmacia) partes.push(`Estabelecimento: ${d.farmacia}`);
  partes.push(
    `Preço cobrado: ${brl(d.precoCents)}`,
    `Preço máximo ao consumidor (PMC) em ${uf}: ${brl(d.tetoCents)}`,
    `Valor cobrado a mais: ${brl(d.precoCents - d.tetoCents)}.`,
    "",
    "O PMC é o preço máximo definido pela CMED (Câmara de Regulação do Mercado de Medicamentos, ligada à Anvisa). Vender acima desse valor é irregular.",
  );
  return partes.join("\n");
}
