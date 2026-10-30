import { useCallback, useEffect, useRef, useState } from "react";

const RECONNECT_BASE_MS = 2500;
const RECONNECT_MAX_MS = 10_000;

export function getWhepBaseUrl(urlStream: string): string {
  const base = import.meta.env.VITE_MEDIAMTX_BASE_URL || "";

  try {
    // Intentar como URL absoluta
    const u = new URL(urlStream);
    u.pathname = u.pathname
      .replace(/\/index\.m3u8$/, "")
      .replace(/^\/streams\//, "/")
      .replace(/\/$/, "");
    return u.toString();
  } catch {
    // url_stream es relativa: construir con la base de MediaMTX.
    // Sin base => mismo origen: /streams/ lo sirve nginx o el proxy de Vite
    const path = urlStream.replace(/\/index\.m3u8$/, "").replace(/\/$/, "");
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalized}`;
  }
}

export function useWebRtcPlayer(streamUrl: string) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setConnectionError(null);
    setRetryCount((n) => n + 1);
  }, []);

  // ── Reconexión automática ──
  // Ante "Conexión perdida" o error de negociación, reintenta solo con
  // retroceso progresivo (2.5s → 10s) mientras el error persista.
  const errorRef = useRef<string | null>(null);
  errorRef.current = connectionError;

  useEffect(() => {
    if (!connectionError) return; // recuperado: no hay nada que reintentar
    const attempts = Math.max(1, retryCount);
    const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * attempts);
    const t = setTimeout(() => {
      if (errorRef.current) retry();
    }, delay);
    return () => clearTimeout(t);
  }, [connectionError, retryCount, retry]);

  const videoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (!node) return;

      cleanupRef.current?.();

      let destroyed = false;
      setConnectionError(null);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        streamRef.current = event.streams[0];
        setStream(event.streams[0]);
        if (node.srcObject !== event.streams[0]) {
          node.srcObject = event.streams[0];
          node.play().catch(() => {});
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          (pc.connectionState === "failed" ||
            pc.connectionState === "disconnected") &&
          !destroyed
        ) {
          setConnectionError("Conexión perdida");
        }
      };

      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      async function negotiate() {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (destroyed) return;

        const resp = await fetch(`${streamUrl}/whep`, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: offer.sdp,
        });

        if (!resp.ok) {
          throw new Error(`WHEP ${resp.status} ${resp.statusText}`);
        }
        if (destroyed) return;

        const answerSdp = await resp.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      }

      negotiate().catch((e) => {
        if (!destroyed) {
          const msg =
            e instanceof TypeError
              ? "No se pudo conectar al servidor (red o CORS)"
              : String(e.message ?? e);
          console.error("[WebRTC PTZ]", streamUrl, e);
          setConnectionError(msg);
        }
      });

      cleanupRef.current = () => {
        destroyed = true;
        pc.close();
        pcRef.current = null;
        streamRef.current = null;
        setStream(null);
      };
    },
    // retryCount hace que el callback-ref se recree al reconectar
    // (automático o manual)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamUrl, retryCount],
  );

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return { videoRef, streamRef, stream, connectionError, retry };
}
