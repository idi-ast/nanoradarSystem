import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import type { GsapTimelineProps } from "../types";

export function useGsapTimeline(props: GsapTimelineProps) {
  const {
    containerRef,
    animations,
    repeat = 0,
    yoyo = false,
    paused = false,
    onComplete,
  } = props;

  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const play = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.play();
    }
  }, []);

  const pause = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.pause();
    }
  }, []);

  const reverse = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.reverse();
    }
  }, []);

  const restart = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.restart();
    }
  }, []);

  const seek = useCallback((time: number | string) => {
    if (timelineRef.current) {
      timelineRef.current.seek(time);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        repeat,
        yoyo,
        paused,
        onComplete,
      });

      animations.forEach((anim) => {
        const { target, from, to, duration = 1, position } = anim;

        if (from && to) {
          tl.fromTo(target, from, { ...to, duration }, position);
        } else if (to) {
          tl.to(target, { ...to, duration }, position);
        } else if (from) {
          tl.from(target, { ...from, duration }, position);
        }
      });

      timelineRef.current = tl;
    }, containerRef);

    return () => {
      ctx.revert();
    };
  }, [containerRef, animations, repeat, yoyo, paused, onComplete]);

  return {
    getTimeline: () => timelineRef.current,
    play,
    pause,
    reverse,
    restart,
    seek,
  };
}
