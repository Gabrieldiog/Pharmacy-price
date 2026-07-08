// Link universal do Google Maps (abre o app no celular, a web no desktop).
// Sem embutir mapa nem tile: custo zero de JS. O param api=1 e obrigatorio.
export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
