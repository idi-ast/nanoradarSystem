import gsap from "gsap";
import type {
  AnimationDirection,
  AnimationPreset,
  SlideAnimationOptions,
  StaggerOptions,
} from "../types";

export const ANIMATION_PRESETS: Record<string, AnimationPreset> = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 0.5,
    ease: "power2.out",
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
    duration: 0.5,
    ease: "power2.in",
  },
  scaleIn: {
    from: { scale: 0, opacity: 0 },
    to: { scale: 1, opacity: 1 },
    duration: 0.5,
    ease: "back.out(1.7)",
  },
  scaleOut: {
    from: { scale: 1, opacity: 1 },
    to: { scale: 0, opacity: 0 },
    duration: 0.5,
    ease: "back.in(1.7)",
  },
  bounceIn: {
    from: { scale: 0, opacity: 0 },
    to: { scale: 1, opacity: 1 },
    duration: 0.6,
    ease: "elastic.out(1, 0.5)",
  },
};

export function fadeIn(
  element: gsap.TweenTarget,
  duration = 0.5,
  delay = 0
): gsap.core.Tween {
  return gsap.fromTo(
    element,
    { opacity: 0 },
    { opacity: 1, duration, delay, ease: "power2.out" }
  );
}

export function fadeOut(
  element: gsap.TweenTarget,
  duration = 0.5,
  delay = 0
): gsap.core.Tween {
  return gsap.to(element, {
    opacity: 0,
    duration,
    delay,
    ease: "power2.in",
  });
}

export function slideIn(
  element: gsap.TweenTarget,
  options: SlideAnimationOptions = {}
): gsap.core.Tween {
  const {
    direction = "left",
    distance = 100,
    duration = 0.5,
    delay = 0,
    ease = "power2.out",
  } = options;

  const directionMap: Record<AnimationDirection, gsap.TweenVars> = {
    left: { x: -distance },
    right: { x: distance },
    top: { y: -distance },
    bottom: { y: distance },
  };

  return gsap.from(element, {
    ...directionMap[direction],
    opacity: 0,
    duration,
    delay,
    ease,
  });
}

export function slideOut(
  element: gsap.TweenTarget,
  options: SlideAnimationOptions = {}
): gsap.core.Tween {
  const {
    direction = "left",
    distance = 100,
    duration = 0.5,
    delay = 0,
    ease = "power2.in",
  } = options;

  const directionMap: Record<AnimationDirection, gsap.TweenVars> = {
    left: { x: -distance },
    right: { x: distance },
    top: { y: -distance },
    bottom: { y: distance },
  };

  return gsap.to(element, {
    ...directionMap[direction],
    opacity: 0,
    duration,
    delay,
    ease,
  });
}

export function scaleIn(
  element: gsap.TweenTarget,
  duration = 0.5,
  delay = 0
): gsap.core.Tween {
  return gsap.fromTo(
    element,
    { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, duration, delay, ease: "back.out(1.7)" }
  );
}

export function staggerChildren(
  parent: gsap.TweenTarget,
  childSelector: string,
  animation: gsap.TweenVars,
  stagger: StaggerOptions = {}
): gsap.core.Tween {
  const {
    amount = 0.5,
    from = "start",
    ease = "power2.out",
  } = stagger;

  return gsap.from(`${parent} ${childSelector}`, {
    ...animation,
    stagger: {
      amount,
      from,
      ease,
    },
  });
}

export function createTimeline(
  options: gsap.TimelineVars = {}
): gsap.core.Timeline {
  return gsap.timeline(options);
}

export function killAllAnimations(): void {
  gsap.killTweensOf("*");
}

export function pauseAllAnimations(): void {
  gsap.globalTimeline.pause();
}

export function resumeAllAnimations(): void {
  gsap.globalTimeline.resume();
}
