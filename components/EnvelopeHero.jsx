// components/EnvelopeHero.jsx
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

/**
 * Pantalla 1:
 * - Título "Nuestra Boda", nombres grandes
 * - Sobre cerrado estilo "Lovent" (rose-gold) con sello + ramito
 * - Nombre del invitado abajo
 * - Tarjeta "Hemos reservado X lugares" -> X = members.length (desde Apps Script con token p)
 * 
 * Si falla la consulta, usa s (query) como fallback y 1 por defecto.
 */
export default function EnvelopeHero() {
  const router = useRouter();
  const { n, s, p } = router.query;

  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(n ? decodeURIComponent(n) : "");
  const [seats, setSeats] = useState(Number(s || 1));

  // Carga seats desde Google Apps Script via /api/party?token=...
  useEffect(() => {
    async function load() {
      try {
        if (!p) return; // sin token, usamos fallback
        const r = await fetch(`/api/party?token=${encodeURIComponent(p)}`);
        const j = await r.json();
        if (j?.ok && j.party) {
          const party = j.party;
          // seats = cantidad de miembros (sin allowedExtra)
          const m = Array.isArray(party.members) ? party.members.length : 1;
          setSeats(m > 0 ? m : 1);

          // si no nos pasaron n, usa displayName de la party
          if (!n && party.displayName) setDisplayName(party.displayName);
        }
      } catch {}
    }
    load();
  }, [p, n]);

  // De momento, al abrir no navegamos (solo animación); si quieres ir al RSVP, descomenta:
  // useEffect(() => {
  //   if (open) {
  //     const t = setTimeout(() => {
  //       const params = new URLSearchParams();
  //       if (p) params.set("p", p);
  //       if (n) params.set("n", n);
  //       router.push(`/rsvp?${params.toString()}`);
  //     }, 780);
  //     return () => clearTimeout(t);
  //   }
  // }, [open]);

  return (
    <main>
      <header className="hero-head">
        <div className="h-font hero-sub">NUESTRA BODA</div>
        <h1 className="h-font hero-names">Sheny &amp; Milo</h1>
      </header>

      <section className="envelope-wrap">
        <div
          className={`envelope-closed ${open ? "open" : ""}`}
          onClick={() => setOpen(true)}
          role="button"
          aria-label="Abrir invitación"
        >
          {/* Cuatro pliegues diagonales */}
          <div className="closed tl" />
          <div className="closed tr" />
          <div className="closed bl" />
          <div className="closed br" />

          {/* Texto "clic para abrir" arriba */}
          <div className="closed-hint h-font">
            Clic aquí<br/>para abrir
          </div>

          {/* Bouquet + sello */}
          <Image className="bouquet" src="/img/bouquet.svg" alt="" width={110} height={110} priority />
          <div className="seal" />

          {/* Nombre invitado (abajo centrado) */}
          {displayName && <div className="guest">{displayName}</div>}
        </div>
      </section>

      <div className="reserve-card">
        <div className="reserve-inner h-font" style={{ fontSize: 18 }}>
          <span>Hemos reservado</span>
          <span className="reserve-num">{seats}</span>
          <span>lugar(es) en tu honor</span>
        </div>
      </div>
    </main>
  );
}
