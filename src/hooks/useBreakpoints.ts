import { useState, useEffect } from "react";

const queries = {
  isMobile: "(max-width: 767px)",
  isTablet: "(min-width: 768px) and (max-width: 1023px)",
  isDesktop: "(min-width: 1024px)",
};

export const useBreakpoint = () => {
  const [matches, setMatches] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
  });

  useEffect(() => {
    const mediaQueryLists = {
      isMobile: window.matchMedia(queries.isMobile),
      isTablet: window.matchMedia(queries.isTablet),
      isDesktop: window.matchMedia(queries.isDesktop),
    };

    const handler = () => {
      setMatches({
        isMobile: mediaQueryLists.isMobile.matches,
        isTablet: mediaQueryLists.isTablet.matches,
        isDesktop: mediaQueryLists.isDesktop.matches,
      });
    };

    // Ejecutar al montar
    handler();

    // Escuchar cambios
    Object.values(mediaQueryLists).forEach((mql) =>
      mql.addEventListener("change", handler),
    );

    return () => {
      Object.values(mediaQueryLists).forEach((mql) =>
        mql.removeEventListener("change", handler),
      );
    };
  }, []);

  return matches;
};
