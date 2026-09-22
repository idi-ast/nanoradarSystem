import { useEffect, useState } from "react";
import { fetchTiposAlertas } from "../services";
import type { TiposAlertas } from "../types";

export function useTiposAlertas() {
  const [tiposAlertas, setTiposAlertas] = useState<TiposAlertas[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchTiposAlertas();
        setTiposAlertas(data);
      } finally {
        // opcional: limpieza
      }
    };
    loadData();
  }, []);

  return { tiposAlertas };
}
