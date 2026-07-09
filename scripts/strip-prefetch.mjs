// Pos-build: o Next 16 gera ~7 arquivos de segment-prefetch (__next.*.txt) por pagina.
// Com 21k paginas isso vira ~190k arquivos e trava o deploy no Netlify. Esses arquivos
// so aceleram o prefetch da navegacao client-side; o HTML e o RSC da pagina (<nome>.txt)
// continuam la, entao a navegacao ainda funciona (cai no RSC/full nav). Removemos so o
// segment-cache pra o deploy ficar enxuto.
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const OUT = "out";
let removidos = 0;

async function limpar(dir) {
  const entradas = await readdir(dir, { withFileTypes: true });
  let vazia = entradas.length > 0;
  for (const e of entradas) {
    const caminho = join(dir, e.name);
    if (e.isDirectory()) {
      const subVazia = await limpar(caminho);
      if (subVazia) {
        await rm(caminho, { recursive: true, force: true });
      } else {
        vazia = false;
      }
    } else if (e.name.startsWith("__next.")) {
      await rm(caminho, { force: true });
      removidos++;
    } else {
      vazia = false;
    }
  }
  return vazia;
}

await limpar(OUT);
console.log(`strip-prefetch: ${removidos} arquivos de segment-cache removidos`);
