import React, { useState, useEffect, useRef } from "react";

/**
 * Hook de animación de entrada basado en IntersectionObserver.
 * @param {Object} options
 * @param {string} options.animation - Tipo de animación: 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn' | 'slideUpFade'
 * @param {number} options.delay - Delay en ms antes de activar la animación
 * @param {number} options.threshold - Umbral de visibilidad (0-1)
 * @returns {[React.RefObject, boolean]} [ref, isVisible]
 */
export function useAnimatedSection({
  animation = "fadeInUp",
  delay = 0,
  threshold = 0.1,
} = {}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);

  const animationClass = {
    fadeInUp: "animate-fade-in-up",
    fadeInDown: "animate-fade-in-down",
    fadeInLeft: "animate-fade-in-left",
    fadeInRight: "animate-fade-in-right",
    scaleIn: "animate-scale-in",
    slideUpFade: "animate-slide-up-fade",
  }[animation];

  return [ref, visible, animationClass];
}

/**
 * Componente wrapper que anima su contenido al hacerse visible.
 */
export default function AnimatedSection({
  children,
  animation = "fadeInUp",
  delay = 0,
  threshold = 0.1,
  className = "",
  once = true,
  as: Tag = "div",
  ...props
}) {
  const [ref, visible, animationClass] = useAnimatedSection({
    animation,
    delay,
    threshold,
  });

  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible
          ? `opacity-100 ${animationClass}`
          : "opacity-0"
      } ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

/**
 * Contenedor para animaciones escalonadas de hijos.
 * Cada hijo debe tener la prop `style={{ animationDelay: `${index * delay}ms` }}`.
 */
export function StaggerContainer({
  children,
  staggerDelay = 100,
  className = "",
  as: Tag = "div",
  ...props
}) {
  const [ref, visible] = useAnimatedSection({ delay: 50 });

  return (
    <Tag
      ref={ref}
      className={className}
      {...props}
    >
      {visible
        ? React.Children.map(children, (child, index) =>
            React.cloneElement(child, {
              style: {
                ...child.props.style,
                animationDelay: `${index * staggerDelay}ms`,
                animationFillMode: "both",
              },
            })
          )
        : children}
    </Tag>
  );
}

/**
 * Componente de transición de página - anima toda la página al montarse.
 */
export function PageTransition({ children, className = "" }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`transition-all duration-700 ease-out ${
        mounted
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
}
