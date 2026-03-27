import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

interface MapPanelContextValue {
  activePanel: string | null;
  openPanel: (id: string) => void;
  closePanel: (id: string) => void;
  isOpen: (id: string) => boolean;
}

const MapPanelContext = createContext<MapPanelContextValue>({
  activePanel: null,
  openPanel: () => {},
  closePanel: () => {},
  isOpen: () => false,
});

export function MapPanelProvider({ children }: { children: React.ReactNode }) {
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const openPanel = useCallback(
    (id: string) => setActivePanel((prev) => (prev === id ? null : id)),
    [],
  );

  const closePanel = useCallback(
    (id: string) => setActivePanel((prev) => (prev === id ? null : prev)),
    [],
  );

  const isOpen = useCallback(
    (id: string) => activePanel === id,
    [activePanel],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePanel(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <MapPanelContext.Provider value={{ activePanel, openPanel, closePanel, isOpen }}>
      {children}
    </MapPanelContext.Provider>
  );
}

export function useMapPanel() {
  return useContext(MapPanelContext);
}
