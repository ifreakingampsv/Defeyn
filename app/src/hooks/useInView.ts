import { useEffect, useRef, useState } from 'react';

/**
 * True while the element is intersecting the viewport. The marketing demos
 * autoplay when scrolled into view and pause when off-screen, so at most the
 * visible demos run their clocks at any time.
 */
export function useInView<T extends Element>(rootMargin = '200px', once = false) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, once]);

  return { ref, inView };
}
