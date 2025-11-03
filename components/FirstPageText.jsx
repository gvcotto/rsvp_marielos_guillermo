import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

export default function FirstPageText() {
  const router = useRouter();
  const { n, p, s } = router.query;

  const [displayName, setDisplayName] = useState(
    n ? decodeURIComponent(n) : ""
  );
  const [seats, setSeats] = useState(Number(s || 1));
  const [leaving, setLeaving] = useState(false);
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    async function load() {
      if (!p) return;

      try {
        const response = await fetch(
          `/api/party?token=${encodeURIComponent(p)}`
        );
        const json = await response.json();

        if (json?.ok && json.party) {
          const totalMembers = Array.isArray(json.party.members)
            ? json.party.members.filter(Boolean).length
            : 0;
          const allowedExtra = Number(json.party.allowedExtra || 0);
          const computedSeats = totalMembers + allowedExtra;
          setSeats(computedSeats > 0 ? computedSeats : 1);

          const sheetName = json.party.displayName?.trim();
          const urlName = n ? decodeURIComponent(n).trim() : null;
          setDisplayName(urlName || sheetName || "Invitado/a");
        }
      } catch (err) {
        console.error("No se pudo cargar la invitación", err);
      }
    }

    load();
  }, [p, n]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.__weddingBgm) {
      const audio = new Audio("/music/music.mp3");
      audio.loop = true;
      audio.preload = "auto";
      window.__weddingBgm = audio;
    }
  }, []);

  const seatsFragment = useMemo(
    () => (
      <span
        className="seat-num seat-num-only"
        aria-label={`Lugares reservados: ${seats}`}
      >
        {seats}
      </span>
    ),
    [seats]
  );

  const handleOpen = () => {
    if (opening) return;

    if (typeof window !== "undefined") {
      const audio =
        window.__weddingBgm || new Audio("/music/music.mp3");
      audio.loop = true;
      try {
        audio.currentTime = 0;
      } catch {
        // ignore if not ready
      }
      window.__weddingBgm = audio;
      audio.play().catch(() => {});
    }

    setOpening(true);
    setLeaving(true);

    const params = new URLSearchParams();
    if (p) params.set("p", p);
    if (n) params.set("n", n);

    setTimeout(() => {
      router.push(`/detalles?${params.toString()}`);
    }, 950);
  };

  return (
    <main className="cover-wrap cover-white">
      <section className="cover-centerpiece">
        <button
          type="button"
          className={`centerpiece-button ${opening ? "opening" : ""}`}
          onClick={handleOpen}
          aria-label="Abrir invitación"
        >
          <Image
            src="/canva/centerpiece.png"
            alt="Sobre de invitación"
            className="centerpiece main-centerpiece"
            draggable={false}
            width={560}
            height={420}
            priority
          />
        </button>
      </section>

      <div className="cover-guest">
        <span className="h-font gold-gradient cover-label">Tu invitación</span>
        <span className="h-font gold-gradient guest-name-normal">
          {displayName?.trim() || "Invitado/a"}
        </span>
      </div>

      <section className="cover-reserve">
        <div className="reserve-card-canvas gold-frame">
          <div className="reserve-inner">
            <span className="h-font gold-gradient">Hemos reservado</span>
            {seatsFragment}
            <span className="h-font gold-gradient">lugar(es) en tu honor</span>
          </div>
        </div>
      </section>

      <div className={`page-fader ${leaving ? "show" : ""}`} />
    </main>
  );
}
