import { useState, useRef, useEffect } from "react";

export default function FloralFrame({ children, names="Nuestra Boda", onOpen }) {
  const [open, setOpen] = useState(false);
  const detailsRef = useRef(null);

  const handleOpen = () => {
    if (open) return;
    setOpen(true);
    // después del fade del sobre, enfocamos la sección de detalles
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      onOpen?.();
    }, 700);
  };

  // hero + sobre + tarjeta interior
  return (
    <>
      <section className="envelope-hero">
        <div className="envelope-wrap">
          <div className={`envelope ${open ? "open" : ""}`} onClick={handleOpen} role="button" aria-label="Abrir invitación">
            <div className="envelope-card">
              <div>
                <h2 className="h-font text-[28px] md:text-[32px]" style={{color:'var(--rose-500)'}}> {names} </h2>
                <p className="mt-3 text-[15px] opacity-80">Toca para abrir</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Botón música (opcional) */}
      <div className="text-center">
        <button className="btn-rose" onClick={()=>document.getElementById('audio')?.play()}>
          Reproducir música
        </button>
        <p className="tap-hint mt-3">Toca el sobre para abrir</p>
      </div>

      {/* CONTENIDO REAL – vive ya en el flujo; lo enfocamos al abrir */}
      <div ref={detailsRef} className="mt-14" />
      <div className="px-6 md:px-10">
        <div className="card-soft p-6 md:p-10">
          {children}
        </div>
      </div>
    </>
  );
}
