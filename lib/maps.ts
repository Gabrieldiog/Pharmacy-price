// Link universal do Google Maps (abre o app no celular, a web no desktop).
// Sem embutir mapa nem tile: custo zero de JS. O param api=1 e obrigatorio.
export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// Busca por texto no Maps — pro preco ao vivo, onde temos nome/endereco da loja
// mas nao a coordenada (a fonte da NFC-e nao devolve lat/lng).
export function mapsBusca(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
