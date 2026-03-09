# GSAP

Libreria de animaciones profesional para JavaScript.

## Caracteristicas

- Alto rendimiento
- Timeline para secuencias
- Scroll animations
- TypeScript nativo
- Plugins extensibles

## Uso Basico

```tsx
import { useGsapAnimation, useGsapTimeline, useScrollTrigger } from "@/libs/gsap";

function AnimatedComponent() {
  const elementRef = useGsapAnimation<HTMLDivElement>({
    from: { opacity: 0, y: 50 },
    to: { opacity: 1, y: 0 },
    duration: 1,
  });

  return <div ref={elementRef}>Contenido animado</div>;
}
```

## Con Timeline

```tsx
function SequenceAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useGsapTimeline({
    containerRef,
    animations: [
      { target: ".title", to: { opacity: 1, y: 0 }, duration: 0.5 },
      { target: ".subtitle", to: { opacity: 1, y: 0 }, duration: 0.5, position: "-=0.3" },
      { target: ".content", to: { opacity: 1, y: 0 }, duration: 0.5, position: "-=0.3" },
    ],
  });

  return (
    <div ref={containerRef}>
      <h1 className="title">Titulo</h1>
      <h2 className="subtitle">Subtitulo</h2>
      <p className="content">Contenido</p>
    </div>
  );
}
```

## Con ScrollTrigger

```tsx
function ScrollAnimation() {
  const sectionRef = useScrollTrigger<HTMLDivElement>({
    animation: {
      from: { opacity: 0, scale: 0.8 },
      to: { opacity: 1, scale: 1 },
    },
    trigger: {
      start: "top 80%",
      end: "bottom 20%",
      scrub: true,
    },
  });

  return <section ref={sectionRef}>Contenido con scroll animation</section>;
}
```

## Hooks Disponibles

| Hook | Descripcion |
|------|-------------|
| `useGsapAnimation` | Animacion simple de entrada/salida |
| `useGsapTimeline` | Secuencia de animaciones |
| `useScrollTrigger` | Animaciones basadas en scroll |
| `useGsapContext` | Contexto GSAP para cleanup |

## Utilidades

| Funcion | Descripcion |
|---------|-------------|
| `fadeIn` | Preset de fade in |
| `fadeOut` | Preset de fade out |
| `slideIn` | Preset de slide desde direccion |
| `scaleIn` | Preset de escala |
| `staggerChildren` | Animacion escalonada de hijos |
