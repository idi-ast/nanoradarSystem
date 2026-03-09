import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import type { GsapAnimationProps } from "../types";

export function useGsapAnimation<T extends HTMLElement>(
  props: GsapAnimationProps = {}
) {
  const {
    from,
    to,
    duration = 1,
    delay = 0,
    ease = "power2.out",
    autoPlay = true,
    onComplete,
    onStart,
  } = props;

  const elementRef = useRef<T>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  const play = useCallback(() => {
    if (tweenRef.current) {
      tweenRef.current.play();
    }
  }, []);

  const pause = useCallback(() => {
    if (tweenRef.current) {
      tweenRef.current.pause();
    }
  }, []);

  const reverse = useCallback(() => {
    if (tweenRef.current) {
      tweenRef.current.reverse();
    }
  }, []);

  const restart = useCallback(() => {
    if (tweenRef.current) {
      tweenRef.current.restart();
    }
  }, []);

  useEffect(() => {
    if (!elementRef.current) return;

    const element = elementRef.current;

    if (from && to) {
      tweenRef.current = gsap.fromTo(element, from, {
        ...to,
        duration,
        delay,
        ease,
        paused: !autoPlay,
        onComplete,
        onStart,
      });
    } else if (to) {
      tweenRef.current = gsap.to(element, {
        ...to,
        duration,
        delay,
        ease,
        paused: !autoPlay,
        onComplete,
        onStart,
      });
    } else if (from) {
      tweenRef.current = gsap.from(element, {
        ...from,
        duration,
        delay,
        ease,
        paused: !autoPlay,
        onComplete,
        onStart,
      });
    }

    return () => {
      if (tweenRef.current) {
        tweenRef.current.kill();
      }
    };
  }, [from, to, duration, delay, ease, autoPlay, onComplete, onStart]);

  return {
    ref: elementRef,
    play,
    pause,
    reverse,
    restart,
    getTween: () => tweenRef.current,
  };
}
