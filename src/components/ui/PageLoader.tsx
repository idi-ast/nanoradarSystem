import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import "./loader.css";
export function PageLoader() {
  const location = useLocation();
  return <PageLoaderInner key={location.key} />;
}

function PageLoaderInner() {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 500);
    const hideTimer = setTimeout(() => setHidden(true), 800);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-9999 flex flex-col items-center justify-center bg-bg-100 transition-opacity duration-300 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-bg-200/20"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-bg-400 animate-spin"></div>
        </div>
        
        <p className="text-text-200 text-sm tracking-[0.25em] animate-pulse uppercase">
          Cargando dispositivos
        </p>
      </div>
    </div>
  );
}
