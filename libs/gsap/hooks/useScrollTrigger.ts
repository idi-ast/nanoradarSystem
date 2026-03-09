import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ScrollTriggerProps } from "../types";

gsap.registerPlugin(ScrollTrigger);

export function useScrollTrigger<T extends HTMLElement>(
  props: ScrollTriggerProps
) {
  const {
    animation,
    trigger = {},
    duration = 1,
  } = props;

  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const element = elementRef.current;

    const {
      start = "top 80%",
      end = "bottom 20%",
      scrub = false,
      pin = false,
      markers = false,
      toggleActions = "play none none reverse",
      onEnter,
      onLeave,
      onEnterBack,
      onLeaveBack,
    } = trigger;

    const scrollTriggerConfig: ScrollTrigger.Vars = {
      trigger: element,
      start,
      end,
      scrub,
      pin,
      markers,
      toggleActions,
      onEnter,
      onLeave,
      onEnterBack,
      onLeaveBack,
    };

    let tween: gsap.core.Tween;

    if (animation.from && animation.to) {
      tween = gsap.fromTo(element, animation.from, {
        ...animation.to,
        duration,
        scrollTrigger: scrollTriggerConfig,
      });
    } else if (animation.to) {
      tween = gsap.to(element, {
        ...animation.to,
        duration,
        scrollTrigger: scrollTriggerConfig,
      });
    } else if (animation.from) {
      tween = gsap.from(element, {
        ...animation.from,
        duration,
        scrollTrigger: scrollTriggerConfig,
      });
    }

    return () => {
      if (tween) {
        tween.kill();
      }
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === element) {
          st.kill();
        }
      });
    };
  }, [animation, trigger, duration]);

  return elementRef;
}
