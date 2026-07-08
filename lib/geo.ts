"use client";

// Localizacao do usuario pro preco ao vivo ("lojas perto de voce"). Guardamos a
// ultima posicao em localStorage pra nao pedir toda hora; quando a pessoa nao
// compartilha, caimos no centro da capital como referencia aproximada.

export interface Geo {
  lat: number;
  lng: number;
}

const KEY = "pp:geo";

// Centro aproximado das capitais que hoje tem fonte de preco ao vivo. Serve de
// fallback quando a localizacao exata nao esta disponivel (distancias ficam
// medidas a partir do centro, o que ja da uma boa nocao).
const CENTROIDES: Record<string, Geo> = {
  PR: { lat: -25.4284, lng: -49.2733 }, // Curitiba
  GO: { lat: -16.6869, lng: -49.2648 }, // Goiania
};

export function centroide(uf: string): Geo | null {
  return CENTROIDES[uf] ?? null;
}

export function geoSalva(): Geo | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as Partial<Geo>;
    if (typeof g.lat === "number" && typeof g.lng === "number") return { lat: g.lat, lng: g.lng };
  } catch {}
  return null;
}

export function salvaGeo(g: Geo): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch {}
}

// Pede a localizacao ao navegador. Resolve null se a pessoa negar ou se nao
// houver suporte — nunca rejeita, pra quem chama tratar so o caso feliz.
export function pedirGeo(): Promise<Geo | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const g = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        salvaGeo(g);
        resolve(g);
      },
      () => resolve(null),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  });
}
