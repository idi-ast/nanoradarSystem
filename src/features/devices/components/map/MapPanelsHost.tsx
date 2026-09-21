import { createPortal } from "react-dom";
import { IconChevronLeft, IconX } from "@tabler/icons-react";
import { MAP_PANELS_HOST_ID, getMapPanelsHost } from "./mapPanelHostUtils";

export { MAP_PANELS_HOST_ID };

/**
 * Nodo vacío montado dentro del slot del rightbar. Los paneles del menú
 * se portalean acá para reutilizar ese espacio en lugar de flotar sobre
 * el mapa.
 */
export function MapPanelsHost() {
  return (
    <div
      id={MAP_PANELS_HOST_ID}
      className="absolute inset-0 pointer-events-none"
    />
  );
}

/**
 * Envía el contenido de un panel al host del rightbar.
 * Si el host no existe (p.ej. en pantallas compactas sin rightbar
 * abierto) cae a `document.body` manteniendo el comportamiento anterior.
 */
export function MapPanelPortal({ children }: { children: React.ReactNode }) {
  const host = getMapPanelsHost();
  if (host) return createPortal(children, host);
  // Sin host (pantallas compactas sin rightbar): ancla a la derecha como un drawer
  return createPortal(
    <div className="fixed inset-y-0 right-0 z-40 w-[min(88vw,20rem)] overflow-hidden">
      {children}
    </div>,
    document.body,
  );
}

/**
 * Marco base para los paneles que se abren desde la barra de botones.
 *
 * Rellena por completo el host (quedando por encima del rightbar) e
 * incluye una cabecera con:
 *  - botón "volver" (solo cuando hay un submenú abierto)
 *  - botón "cerrar" el panel
 */
export function PanelShell({
  title,
  icon,
  onClose,
  onBack,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-bg-100 pointer-events-auto overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title="Volver"
              className="shrink-0 p-0.5 rounded text-text-200 hover:text-text-100 hover:bg-bg-300 transition-colors"
            >
              <IconChevronLeft size={16} stroke={2} />
            </button>
          )}
          {icon && <span className="shrink-0 text-text-200">{icon}</span>}
          <h4 className="text-xs font-bold uppercase tracking-wide text-text-100 truncate">
            {title}
          </h4>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Cerrar"
            className="shrink-0 p-0.5 rounded text-text-200 hover:text-text-100 hover:bg-bg-300 transition-colors"
          >
            <IconX size={15} stroke={2} />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin scrollbar-track-bg-300 scrollbar-thumb-bg-400">
        {children}
      </div>
    </div>
  );
}
