import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ClientMed } from "./types";

// Base lida uma vez no build, do proprio public/. Serve o generateStaticParams e o
// generateMetadata da rota /remedio/[id]. Nada disso vai pro bundle do cliente:
// e um modulo de servidor (usa fs) importado so pela pagina server-side.
let arrayCache: Promise<ClientMed[]> | null = null;
let mapaCache: Promise<Map<string, ClientMed>> | null = null;

export function todosOsMeds(): Promise<ClientMed[]> {
  if (!arrayCache) {
    const caminho = join(process.cwd(), "public", "medicamentos-go.json");
    arrayCache = readFile(caminho, "utf8").then((t) => JSON.parse(t) as ClientMed[]);
  }
  return arrayCache;
}

// Map por id pra o lookup do generateMetadata ficar O(1) (senao seria 21k x 21k no build).
export function medsPorId(): Promise<Map<string, ClientMed>> {
  if (!mapaCache) mapaCache = todosOsMeds().then((a) => new Map(a.map((m) => [m.id, m])));
  return mapaCache;
}

export async function medPorId(id: string): Promise<ClientMed | null> {
  return (await medsPorId()).get(id) ?? null;
}
