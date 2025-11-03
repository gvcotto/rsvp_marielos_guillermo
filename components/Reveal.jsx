// components/Reveal.jsx
import { useEffect, useRef } from "react";

export default function Reveal(props) {
  const { children, className = "", delay = 0, ...rest } = props;
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timer;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            timer = setTimeout(() => {
              el.classList.add("reveal-visible");
            }, delay);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );

    io.observe(el);
    return () => {
      clearTimeout(timer);
      io.disconnect();
    };
  }, [delay]);

  return (
    <div ref={ref} className={`reveal ${className}`} {...rest}>
      {children}
    </div>
  );
}
