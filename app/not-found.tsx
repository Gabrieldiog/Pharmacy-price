import Link from "next/link";

// Vira o out/404.html do site estatico. O Netlify serve pra qualquer caminho sem
// pagina — inclui link de remedio antigo/desatualizado (id que saiu da base). Antes
// da rota /remedio/[id], a pagina client mostrava esse aviso pra id desconhecido;
// aqui restauramos a saida amigavel, com a cara do site, em vez do 404 cru do Next.
export default function NotFound() {
  return (
    <main className="page">
      <div className="det-vazio">
        <p>Página não encontrada.</p>
        <p className="results-vazio-dica">
          O link pode estar desatualizado — às vezes um remédio sai da base ou muda de endereço.
        </p>
        <Link href="/" className="voltar">
          ← voltar para a busca
        </Link>
      </div>
    </main>
  );
}
