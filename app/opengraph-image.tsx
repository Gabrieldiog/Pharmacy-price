import { ImageResponse } from "next/og";

// Imagem de marca pro preview de compartilhamento (WhatsApp, Google, redes). Uma so,
// gerada no build — o dado especifico do remedio vai no titulo/descricao da pagina.
export const alt = "Pharmacy-price — o preço justo do seu remédio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// gerada uma vez no build (site estatico, output: export)
export const dynamic = "force-static";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #0f766e 0%, #0b5a54 55%, #094e37 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: "30px", opacity: 0.92 }}>
          <div
            style={{
              display: "flex",
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "#ffffff",
              color: "#0f766e",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            R$
          </div>
          <span>Pharmacy-price</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          <div style={{ fontSize: "78px", fontWeight: 800, lineHeight: 1.05 }}>O preço justo do seu remédio</div>
          <div style={{ fontSize: "34px", opacity: 0.92, lineHeight: 1.3, maxWidth: "930px" }}>
            Preço real das farmácias × o teto legal da Anvisa, e o que é de graça no Farmácia Popular.
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", fontSize: "26px", opacity: 0.9 }}>
          <span style={{ display: "flex", padding: "10px 24px", borderRadius: "999px", background: "rgba(255,255,255,0.16)" }}>
            Piloto em Goiânia
          </span>
          <span style={{ display: "flex", padding: "10px 24px", borderRadius: "999px", background: "rgba(255,255,255,0.16)" }}>
            Dados públicos CMED
          </span>
        </div>
      </div>
    ),
    size,
  );
}
