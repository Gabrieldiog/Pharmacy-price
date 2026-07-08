"use client";

import { useEffect, useRef, useState } from "react";

// Le o QR da NFC-e pela camera (ou por foto) e devolve o texto lido.
// A lib qr-scanner usa o BarcodeDetector nativo quando existe (Android/Chrome) e cai
// pro decoder WASM quando nao (iPhone). Carregada sob demanda pra nao pesar o bundle.
export function LeitorNota({ onLido }: { onLido: (texto: string) => void }) {
  const [scanning, setScanning] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<{ stop: () => void; destroy: () => void } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const parar = () => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setScanning(false);
  };

  // desliga a camera se o componente sair da tela com o scanner aberto
  useEffect(() => {
    return () => {
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  const entregar = (result: unknown) => {
    const texto = typeof result === "string" ? result : (result as { data?: string })?.data;
    if (texto) {
      onLido(texto);
      parar();
    }
  };

  const escanear = async () => {
    setErro(null);
    setScanning(true);
    try {
      const QrScanner = (await import("qr-scanner")).default;
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const video = videoRef.current;
      if (!video) throw new Error("sem video");
      const scanner = new QrScanner(video, entregar, {
        preferredCamera: "environment",
        highlightScanRegion: true,
        highlightCodeOutline: true,
        returnDetailedScanResult: true,
      });
      scannerRef.current = scanner;
      await scanner.start();
    } catch {
      parar();
      setErro("Não consegui abrir a câmera. Envie uma foto da nota ou cole a chave abaixo.");
    }
  };

  const daFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErro(null);
    try {
      const QrScanner = (await import("qr-scanner")).default;
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      entregar(result);
    } catch {
      setErro("Não achei um QR nessa foto. Tenta outra, ou cole a chave abaixo.");
    }
  };

  return (
    <div className="leitor">
      {scanning ? (
        <div className="leitor-cam">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} playsInline muted className="leitor-video" />
          <button type="button" className="leitor-fechar" onClick={parar}>
            fechar
          </button>
        </div>
      ) : (
        <div className="leitor-acoes">
          <button type="button" className="leitor-btn" onClick={escanear}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            Escanear a nota
          </button>
          <button type="button" className="leitor-foto" onClick={() => fileRef.current?.click()}>
            ou enviar uma foto
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={daFoto} hidden />
        </div>
      )}
      {erro && <p className="leitor-erro">{erro}</p>}
    </div>
  );
}
