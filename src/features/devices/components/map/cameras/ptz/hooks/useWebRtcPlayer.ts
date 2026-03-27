import { useCallback, useRef, useState } from "react";

export function getWhepBaseUrl(urlStream: string): string {
  try {
    const u = new URL(urlStream);
    u.pathname = u.pathname.replace(/\/index\.m3u8$/, "").replace(/\/$/, "");
    return u.toString();
  } catch {
    return "";
  }
}

export function useWebRtcPlayer(streamUrl: string) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setConnectionError(null);
    setRetryCount((n) => n + 1);
  }, []);

  const videoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (!node) return;

      let destroyed = false;
      setConnectionError(null);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        streamRef.current = event.streams[0];
        if (node.srcObject !== event.streams[0]) {
          node.srcObject = event.streams[0];
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

      return () => {
        destroyed = true;
        pc.close();
        pcRef.current = null;
        streamRef.current = null;
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamUrl, retryCount],
  );

  return { videoRef, streamRef, connectionError, retry };
}
