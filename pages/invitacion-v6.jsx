
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import EnvelopeV6 from "@/components/EnvelopeV6";

export default function InvitacionLovent(){
  const [opened, setOpened] = useState(false);
  const afterRef = useRef(null);

  const handleOpen = () => {
    setOpened(true);
    setTimeout(()=>afterRef.current?.scrollIntoView({behavior:'smooth', block:'start'}), 200);
  };

  return (
    <main>
      {/* Cabecera tipo lovent */}
      <header className="container" style={{textAlign:'center',padding:'26px 0 0 0'}}>
        <Image
          src="/img/leaf.svg"
          alt=""
          width={150}
          height={150}
          style={{ position: "absolute", left: 18, top: 8, width: 150, opacity: 0.35 }}
          priority
        />
        <h1 className="h-font" style={{color:'var(--rose)',fontSize:'clamp(30px,5vw,46px)'}}>Sheny & Milo</h1>
        <p className="muted" style={{marginTop:6}}>Sábado, 27 de diciembre de 2025</p>
      </header>

      {/* HERO: sobre */}
      <section className="hero">
        <EnvelopeV6 headline="Nuestra Boda" onOpened={handleOpen}/>
      </section>

      {/* BLOQUES que aparecen tras abrir */}
      <div ref={afterRef} className={opened ? 'fade-in' : ''}>
        <section className="container">
          <div className="card">
            {/* Portada */}
            <div className="section" style={{textAlign:'center'}}>
              <h2 className="h-font" style={{color:'var(--rose)',fontSize:'28px'}}>¡Estás invitado(a)!</h2>
              <p className="muted">Acompáñanos a celebrar nuestra boda.</p>
              <div style={{marginTop:12,display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
                <Link className="btn-rose" href="/rsvp?p=TOKEN&n=Invitado">
                  Confirmar asistencia
                </Link>
                <a className="btn-ghost" href="#mapa">Cómo llegar</a>
              </div>
            </div>

            {/* Detalles del evento (timeline simple) */}
            <div className="section">
              <h2 className="h-font">Wedding Day</h2>
              <p className="muted" style={{marginBottom:16}}>Sábado, 27 de diciembre de 2025</p>
              <div className="timeline">
                <div className="item">
                  <div className="badge">16h</div>
                  <div>
                    <div className="h-font" style={{fontSize:18}}>Ceremonia</div>
                    <div className="muted">Parroquia de San Pedro</div>
                  </div>
                </div>
                <div className="item">
                  <div className="badge">18h</div>
                  <div>
                    <div className="h-font" style={{fontSize:18}}>Recepción</div>
                    <div className="muted">Finca La Esperanza, Antigua Guatemala</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dress code / indicaciones */}
            <div className="section">
              <h2 className="h-font">Dress Code</h2>
              <p>Formal de día. Paleta: blanco, champagne y rose gold.</p>
            </div>

            {/* Mapa */}
            <div id="mapa" className="section">
              <h2 className="h-font">Cómo llegar</h2>
              <div className="card" style={{overflow:'hidden'}}>
                <iframe className="map-embed" title="Mapa" src="https://www.google.com/maps?q=Antigua%20Guatemala&output=embed" loading="lazy"></iframe>
              </div>
            </div>

            {/* CTA final */}
            <div className="section" style={{textAlign:'center'}}>
              <Link className="btn-rose" href="/rsvp?p=TOKEN&n=Invitado">
                Confirmar asistencia
              </Link>
            </div>
          </div>
        </section>
      </div>

      <footer className="container">Hecho con ♥ en tu V6 estilo Lovent</footer>
    </main>
  );
}
