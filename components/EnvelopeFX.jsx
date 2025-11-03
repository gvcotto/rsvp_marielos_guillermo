// components/EnvelopeFX.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/router";

/**
 * EnvelopeFX
 * - Dibuja la “solapa” animada (3D) sobre tu imagen base
 * - Al completarse la animación, navega a /rsvp con p y n
 * - imageUrl: opcional, si quieres usar la imagen como textura de fondo
 */
export default function EnvelopeFX({ token, name, imageUrl }) {
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const [playing, setPlaying] = useState(false);

  const goRSVP = () => {
    const q = new URLSearchParams();
    if (token) q.set("p", token);
    if (name) q.set("n", name);
    router.push(`/rsvp?${q.toString()}`);
  };

  const handleOpen = () => {
    if (playing) return;
    setPlaying(true);
    setOpened(true);
  };

  return (
    <div className="fx-wrap abs-on-centerpiece" onClick={handleOpen}>
      {/* Carta interior que asoma al abrir */}
      <motion.div
        className="fx-letter"
        initial={{ y: 40, opacity: 0 }}
        animate={opened ? { y: -40, opacity: 1 } : { y: 40, opacity: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <div className="fx-letter-card" />
      </motion.div>

      {/* Base del sobre: laterales + cuerpo.
          Con la imagen base visible detrás, aquí sólo añadimos sombras. */}
      <div className="fx-env-base">
        <div className="fx-side left" />
        <div className="fx-side right" />
        <div className="fx-body" />
        {/* Solapa superior (animada) */}
        <motion.div
          className="fx-flap"
          style={{ transformOrigin: "50% 0%" }}
          initial={{ rotateX: 0 }}
          animate={opened ? { rotateX: -180 } : { rotateX: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 0.61, 0.36, 1] }}
          onAnimationComplete={() => setTimeout(goRSVP, 250)}
        >
          <div
            className="fx-flap-inner"
            style={
              imageUrl
                ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.12)), url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : undefined
            }
          />
          <div className="fx-seal">
            <div className="fx-seal-coin" />
            <div className="fx-gyps"></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
