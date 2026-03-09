import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";

export function useGsapContext(
  scope: RefObject<HTMLElement>,
  callback: (context: gsap.Context) => void,
  dependencies: unknown[] = []
) {
  const contextRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    if (!scope.current) return;

    contextRef.current = gsap.context(callback, scope);

    return () => {
      if (contextRef.current) {
        contextRef.current.revert();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, ...dependencies]);

  return contextRef;
}
