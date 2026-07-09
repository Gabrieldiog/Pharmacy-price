"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Redireciona os links antigos /remedio?id=<id> pra rota nova /remedio/<id>.
// Sem id, volta pra busca. (A pagina que usa isto e noindex, pra nao virar
// duplicata da home aos olhos do Google.)
function Redirecionar() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const id = params.get("id");
    router.replace(id ? `/remedio/${encodeURIComponent(id)}` : "/");
  }, [router, params]);
  return <p className="det-loading">Redirecionando…</p>;
}

export function RedirecionaLegado() {
  return (
    <Suspense fallback={<p className="det-loading">Carregando…</p>}>
      <Redirecionar />
    </Suspense>
  );
}
