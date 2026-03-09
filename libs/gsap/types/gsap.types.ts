import type { RefObject } from "react";

export interface GsapAnimationProps {
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  duration?: number;
  delay?: number;
  ease?: string;
  autoPlay?: boolean;
  onComplete?: () => void;
  onStart?: () => void;
}

export interface GsapTimelineAnimation {
  target: string | Element;
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  duration?: number;
  position?: string | number;
}

export interface GsapTimelineProps {
  containerRef: RefObject<HTMLElement>;
  animations: GsapTimelineAnimation[];
  repeat?: number;
  yoyo?: boolean;
  paused?: boolean;
  onComplete?: () => void;
}

export interface ScrollTriggerConfig {
  start?: string;
  end?: string;
  scrub?: boolean | number;
  pin?: boolean;
  markers?: boolean;
  toggleActions?: string;
  onEnter?: () => void;
  onLeave?: () => void;
  onEnterBack?: () => void;
  onLeaveBack?: () => void;
}

export interface ScrollTriggerProps {
  animation: {
    from?: gsap.TweenVars;
    to?: gsap.TweenVars;
  };
  trigger?: ScrollTriggerConfig;
  duration?: number;
}

export type AnimationDirection = "left" | "right" | "top" | "bottom";

export interface SlideAnimationOptions {
  direction?: AnimationDirection;
  distance?: number;
  duration?: number;
  delay?: number;
  ease?: string;
}

export interface StaggerOptions {
  amount?: number;
  from?: "start" | "end" | "center" | "edges" | "random";
  grid?: [number, number] | "auto";
  ease?: string;
}

export interface AnimationPreset {
  from: gsap.TweenVars;
  to: gsap.TweenVars;
  duration: number;
  ease: string;
}
