// components/Envelope.jsx
import { useEffect, useRef, useState } from 'react';

export default function Envelope({ onOpen }) {
  const [open, setOpen] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (open && !fired.current) {
      fired.current = true;
      // espera a que termine la animación de la solapa
      setTimeout(() => onOpen?.(), 900);
    }
  }, [open, onOpen]);

  return (
    <button
      type="button"
      className={`euca-env ${open ? 'is-open' : ''}`}
      onClick={() => setOpen(true)}
      aria-label="Abrir invitación"
    >
      <span className="euca-env__shadow" />
      <span className="euca-env__pocket" />
      <span className="euca-env__flap" />
      <span className="euca-env__card">
        <span className="euca-env__card-inner">
          <h3 className="h-font">Nuestra Boda</h3>
          <p className="body-font">Toca para abrir</p>
        </span>
      </span>
    </button>
  );
}
