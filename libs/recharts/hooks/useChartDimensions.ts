import { useState, useEffect, useCallback, useMemo, type RefObject } from "react";
import type { ChartDimensions } from "../types";

interface UseChartDimensionsOptions {
  margin?: Partial<ChartDimensions["margin"]>;
  debounceMs?: number;
}

const DEFAULT_MARGIN: ChartDimensions["margin"] = {
  top: 20,
  right: 30,
  bottom: 20,
  left: 40,
};

export function useChartDimensions(
  containerRef: RefObject<HTMLElement>,
  options: UseChartDimensionsOptions = {}
): ChartDimensions {
  const { margin: customMargin, debounceMs = 100 } = options;

  const margin = useMemo(
    () => ({ ...DEFAULT_MARGIN, ...customMargin }),
    [customMargin]
  );

  const [dimensions, setDimensions] = useState<ChartDimensions>({
    width: 0,
    height: 0,
    margin,
  });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: Math.max(0, width - margin.left - margin.right),
        height: Math.max(0, height - margin.top - margin.bottom),
        margin,
      });
    }
  }, [containerRef, margin]);

  useEffect(() => {
    updateDimensions();

    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, debounceMs);
    };

    window.addEventListener("resize", handleResize);

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, [updateDimensions, debounceMs, containerRef]);

  return dimensions;
}
