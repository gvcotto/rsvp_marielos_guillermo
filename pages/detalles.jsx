import Image from "next/image";
import jsPDF from "jspdf";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";

import CalendarBadge from "@/components/CalendarBadge";
import Countdown from "@/components/Countdown";
import Reveal from "@/components/Reveal";
import RSVPInline from "@/components/RSVPInline";

const QRCodeCanvas = dynamic(
  () =>
    import("qrcode.react").then(
      (mod) => mod.QRCodeCanvas ?? mod.default ?? mod
    ),
  { ssr: false }
);

const WEDDING_START = "2025-12-27T16:00:00-06:00";
const WEDDING_END = "2025-12-28T00:00:00-06:00";
const EVENT_ID = "boda-marielos-guillermo-2025";
const AFFIRMATIVE_VALUES = new Set(["sa-", "sí", "si", "yes"]);

const normalizeAnswer = (value) => {
  if (value == null) return "";
  const base = String(value).trim();
  const simplified = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (["si", "sa-", "yes", "y"].includes(simplified)) return "Sí";
  if (["no", "n"].includes(simplified)) return "No";
  return base;
};

const parseStoredNote = (noteValue) => {
  if (noteValue == null || noteValue === "") return {};
  if (typeof noteValue === "string") {
    try {
      return JSON.parse(noteValue);
    } catch {
      return { comment: noteValue };
    }
  }
  if (typeof noteValue === "object") return noteValue;
  return {};
};

const statusToSummary = (status, fallbackName = "") => {
  const parsed = parseStoredNote(status.note);
  let members = Array.isArray(parsed.members)
    ? parsed.members.map((member) => ({
        name: member?.name || fallbackName || "",
        answer: normalizeAnswer(member?.answer),
      }))
    : [];

  if (!members.length && status.name) {
    members = [
      { name: status.name, answer: normalizeAnswer(status.answer) },
    ];
  } else if (!members.length && fallbackName) {
    members = [
      { name: fallbackName, answer: normalizeAnswer(status.answer) },
    ];
  }

  const extras = Array.isArray(parsed.extras) ? parsed.extras : [];
  const comment =
    typeof parsed.comment === "string" && parsed.comment.trim()
      ? parsed.comment.trim()
      : typeof status.note === "string" && !parsed.members
      ? status.note
      : null;

  const confirmedMembers = members.filter(
    (member) => normalizeAnswer(member.answer) === "Sí"
  ).length;

  const guests =
    typeof status.guests === "number"
      ? status.guests
      : confirmedMembers + extras.length;

  const confirmedTotal = confirmedMembers + extras.length;

  return {
    type: members.length > 1 ? "grupo" : "individual",
    submittedAt: status.receivedAt || status.timestamp || null,
    note: comment,
    guests,
    confirmed: confirmedTotal,
    confirmedMembers,
    members,
    extras,
    hash: status.entryHash || null,
  };
};

const formatDateTime = (isoString) => {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    return date.toLocaleString("es-GT", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
};

const encodePayload = (data) => {
  if (typeof window === "undefined") return "";
  const raw = JSON.stringify(data);
  return window.btoa(unescape(encodeURIComponent(raw)));
};

const fetchAssetAsDataUrl = async (src) => {
  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("No se pudo cargar el recurso", err);
    return null;
  }
};

const INFO_CARDS = [
  {
    id: "dress-code",
    icon: "/icons/icon1.png",
    subtitle: "Elegante",
    title: "Código de vestimenta",
    description: [
      "Por favor evita prendas en blanco, dorado, corinto o tonos muy similares. Toma de referencia la paleta de más abajo.",
      "La celebración será en jardín al aire libre. Como en Antigua las noches suelen ser frías, te sugerimos llevar abrigo o pashmina.",
    ],
    palette: ["#0B2230", "#2F3E35", "#4A4F54", "#3A2344", "#3B2A20"],
  },
  {
    id: "adults-only",
    title: "Reservado para adultos",
    description: [
      "Desde el cariño y el respeto, esta celebración será exclusiva para adultos.",
      "Agradecemos tu comprensión y cariño.",
    ],
    textVariant: "large",
},
  {
    id: "gift",
    title: "Lluvia de sobres",
    description: [
      "",
      "Tu presencia es el mejor regalo para nosotros.",
      "",
      "Si deseas hacernos un obsequio, agradeceríamos que sea en forma de sobre. Tendremos un lugar especial disponible durante el evento.",
    ],
    textVariant: "large",
},
{
  id: "template-hospedaje",
  title: "Hospedaje",
  description: [
    "Si deseas pasar la noche en Antigua después del evento, te recomendamos reservar con anticipación (27 de diciembre es temporada alta).",
    "• Hotel Mesón de María – Colonial y accesible.",
    "• La Villa Serena – Tranquilo y con buen precio.",
    "• Casa Noble Hotel – Habitaciones sencillas y agradables.",
    "• Hostal Antigüeño – Opción básica con desayuno incluido.",
  ],
    textVariant: "large",
},
  {
    id: "template-2",
    title: "Parqueo",
    description: ["", "Para su comodidad, Hotel Soleil La Antigua ofrece servicio de parqueo durante todo el evento.", 
      "", 
      "El costo preferencial para nuestros invitados es de Q.50 por vehículo (tarifa única, válida por toda la celebración).",
    ],
    textVariant: "large",
},
  {
    id: "template-3",
    title: "Fotos & Recuerdos",
    description: [
      "Ayúdanos a guardar los mejores momentos de este día. Puedes tomar fotos libremente durante la celebración y compartirlas durante el evento. #MarielosYGuillermo2025",
    "",
    "Gracias por acompañarnos en este día tan especial y ser parte de nuestra historia.",
    "",
    "Con cariño,",
    "Marielos & Guillermo"
    ],
    textVariant: "large",
},
];

export default function DetallesPage() {
  const router = useRouter();
  const { p, n } = router.query;

  const [displayName, setDisplayName] = useState(
    n ? decodeURIComponent(n) : ""
  );
  const [seats, setSeats] = useState(1);
  const [showQR, setShowQR] = useState(false);
  const [confirmationSummary, setConfirmationSummary] = useState(null);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const qrWrapperRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let audio = window.__weddingBgm;
    if (!audio) {
      audio = new Audio("/music/music.mp3");
      audio.loop = true;
      audio.preload = "auto";
      window.__weddingBgm = audio;
    }

    const syncState = () => setIsAudioPlaying(!audio.paused);
    audio.addEventListener("play", syncState);
    audio.addEventListener("pause", syncState);
    audio.addEventListener("ended", syncState);

    setIsAudioReady(true);
    setIsAudioPlaying(!audio.paused);

    audio.play().catch(() => {});

    return () => {
      audio.removeEventListener("play", syncState);
      audio.removeEventListener("pause", syncState);
      audio.removeEventListener("ended", syncState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const anchors = document.querySelectorAll("[data-slow-scroll]");
    if (!anchors.length) return;

    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const handleClick = (event) => {
      const anchor = event.currentTarget;
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("#")) return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();

      const startY = window.scrollY;
      const targetY = target.getBoundingClientRect().top + window.scrollY;
      const distance = targetY - startY;
      const duration = 1200;
      let startTime = null;

      const step = (timestamp) => {
        if (startTime === null) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = easeInOutCubic(progress);
        window.scrollTo(0, startY + distance * ease);
        if (elapsed < duration) {
          window.requestAnimationFrame(step);
        }
      };

      window.requestAnimationFrame(step);
    };

    anchors.forEach((anchor) => {
      anchor.addEventListener("click", handleClick);
    });

    return () => {
      anchors.forEach((anchor) => {
        anchor.removeEventListener("click", handleClick);
      });
    };
  }, []);

  const toggleAudio = () => {
    if (typeof window === "undefined") return;
    const audio = window.__weddingBgm;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  useEffect(() => {
    async function load() {
      if (!p) return;

      try {
        const response = await fetch(
          `/api/party?token=${encodeURIComponent(p)}`
        );
        const json = await response.json();

        if (json?.ok && json.party) {
          const members = Array.isArray(json.party.members)
            ? json.party.members.filter(Boolean).length
            : 0;
          const extras = Number(json.party.allowedExtra || 0);
          const totalSeats = members + extras;
          setSeats(totalSeats > 0 ? totalSeats : 1);
          if (!n && json.party.displayName) {
            setDisplayName(json.party.displayName);
          }
        }
      } catch (err) {
        console.error("No se pudo cargar el grupo", err);
      }
    }

    load();
  }, [p, n]);

  useEffect(() => {
    if (!p || confirmationSummary) return;
    let cancelled = false;

    async function fetchStatus() {
      try {
        const response = await fetch(
          `/api/rsvp-status?token=${encodeURIComponent(p)}`
        );
        const json = await response.json();
        if (cancelled) return;
        if (json?.ok && json.status) {
          const summary = statusToSummary(json.status, json.status?.name || displayName);
          setConfirmationSummary(summary);
          setShowQR(true);
        }
      } catch (err) {
        console.error("No se pudo cargar el estado de la confirmación", err);
      }
    }

    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, [p, displayName, confirmationSummary]);

  const entryPayload = useMemo(() => {
    const base = {
      type: "wedding-entry",
      event: EVENT_ID,
      name: displayName || "Invitado/a",
      seats,
      token: p || null,
    };

    if (confirmationSummary?.hash) {
      base.hash = confirmationSummary.hash;
    }

    return encodePayload(base);
  }, [displayName, seats, p, confirmationSummary?.hash]);

  const calendarUrl = useMemo(() => {
    const format = (value) =>
      value.replace(/[-:]/g, "").replace(".000", "").replace(/Z$/, "");
    const query = new URLSearchParams({
      action: "TEMPLATE",
      text: "Boda de Marielos y Guillermo",
      dates: `${format(WEDDING_START)}/${format(WEDDING_END)}`,
      details: "Te esperamos para celebrar con nosotros.",
      location: "San José Catedral y Hotel Soleil La Antigua",
    });
    return `https://calendar.google.com/calendar/render?${query.toString()}`;
  }, []);

  const handleDownloadPdf = async () => {
    const wrapper = qrWrapperRef.current;
    const canvas = wrapper?.querySelector("canvas");
    if (!canvas) return;

    const qrDataUrl = canvas.toDataURL("image/png");
    const logoDataUrl = await fetchAssetAsDataUrl("/canva/logo.png");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a6" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    pdf.setFillColor(252, 224, 157);
    pdf.rect(0, 0, pageWidth, 24, "F");

    if (logoDataUrl) {
      const logoSize = 18;
      pdf.addImage(
        logoDataUrl,
        "PNG",
        pageWidth - margin - logoSize,
        6,
        logoSize,
        logoSize * 0.95
      );
    }

    pdf.setTextColor(133, 95, 13);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Boda Marielos & Guillermo", margin, 16);

    pdf.setDrawColor(211, 176, 102);
    pdf.roundedRect(margin, 28, pageWidth - margin * 2, pageHeight - 38, 8, 8);

    const qrSize = Math.min(pageWidth - 70, pageHeight / 2.5);
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = 42;

    pdf.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    let cursorY = qrY + qrSize + 12;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(displayName || "Invitado/a", pageWidth / 2, cursorY, {
      align: "center",
    });

    cursorY += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const confirmedSeats =
      typeof confirmationSummary?.confirmed === "number"
        ? confirmationSummary.confirmed
        : confirmationSummary?.members
        ? confirmationSummary.members.reduce((total, member) => {
            const normalized = (member.answer || "")
              .toString()
              .trim()
              .toLowerCase();
            return total + (AFFIRMATIVE_VALUES.has(normalized) ? 1 : 0);
          }, 0)
        : seats;
    pdf.text(`Lugares confirmados: ${confirmedSeats}`, pageWidth / 2, cursorY, {
      align: "center",
    });

    cursorY += 8;

    if (confirmationSummary?.members?.length) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Detalle de confirmación:", margin + 2, cursorY);
      cursorY += 5;

      pdf.setFont("helvetica", "normal");
      pdf.setLineWidth(0.1);
      pdf.line(margin + 2, cursorY - 3, pageWidth - margin - 2, cursorY - 3);

      confirmationSummary.members.forEach((member) => {
        const normalizedAnswer = (member.answer || "")
          .toString()
          .trim()
          .toLowerCase();
        const isYes = AFFIRMATIVE_VALUES.has(normalizedAnswer);
        let readableAnswer;
        if (isYes) {
          readableAnswer = "Sí";
        } else if (normalizedAnswer === "no") {
          readableAnswer = "No";
        } else if (member.answer) {
          readableAnswer = member.answer;
        } else {
          readableAnswer = "No";
        }
        const label = `${member.name}: ${readableAnswer}`;
        pdf.text(label, margin + 4, cursorY);
        cursorY += 4.6;
      });
    }

    if (confirmationSummary?.extras?.length) {
      cursorY += 4;
      pdf.setFont("helvetica", "bold");
      pdf.text("Acompañantes extra:", margin + 2, cursorY);
      cursorY += 5;

      pdf.setFont("helvetica", "normal");
      confirmationSummary.extras.forEach((extra) => {
        pdf.text(`• ${extra}`, margin + 4, cursorY);
        cursorY += 4.6;
      });
    }

    if (confirmationSummary?.note) {
      cursorY += 4;
      pdf.setFont("helvetica", "bold");
      pdf.text("Mensaje:", margin + 2, cursorY);
      cursorY += 5;
      pdf.setFont("helvetica", "normal");
      const split = pdf.splitTextToSize(
        confirmationSummary.note,
        pageWidth - margin * 2 - 4
      );
      pdf.text(split, margin + 4, cursorY);
    }

    pdf.save("invitacion-qr.pdf");
  };

  return (
    <main className="invite-wrap text-ink">
      <button
        type="button"
        className="sound-toggle"
        onClick={toggleAudio}
        disabled={!isAudioReady}
        aria-label={isAudioPlaying ? "Silenciar música" : "Reproducir música"}
      >
        <span aria-hidden="true">{isAudioPlaying ? "🔊" : "🔇"}</span>
      </button>
      <section className="section">
        <div className="relative overflow-hidden rounded-3xl bg-black/40 shadow-soft">
          <div className="relative h-[68vh] min-h-[420px] w-full">
            <Image
              src="/photos/hero1.jpg"
              alt="Marielos y Guillermo"
              fill
              priority
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/60 to-black/25" />

            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <p className="h-font hero-sub hero-sub-white">Nuestra boda</p>
              <h1 className="h-font hero-names hero-names-outline text-4xl leading-tight md:text-6xl lg:text-7xl" data-text="Marielos & Guillermo">
                Marielos &amp; Guillermo
              </h1>
              <p className="hero-date mt-4 max-w-xl text-base md:text-lg">
                27 de diciembre de 2025 - La Antigua Guatemala
              </p>
            </div>

            <a
              href="#rsvp"
              className="absolute bottom-8 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition hover:bg-white/20"
              data-slow-scroll
              aria-label="Ir a confirmar asistencia"
            >
              <span className="border-b-2 border-r-2 border-white/90 p-2.5 rotate-45" />
            </a>
          </div>
        </div>
      </section>

      <Reveal className="section narrow">
        <div className="gold-card gold-card--soft parents-card text-center">
          <p className="frase mx-auto max-w-3xl">
            Dios nos ha concedido el privilegio de conocernos y amarnos. Con su bendición y la de nuestros padres queremos unir nuestras vidas para siempre.
          </p>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="titulo mt-0">
                Padres de la novia
              </h3>
              <div className="mt-4 space-y-1 nombres">
                <div>Edwin Baños (+)</div>
                <div>Sheny Ortiz</div>
              </div>
            </div>
            <div>
              <h3 className="titulo mt-0">
                Padres del novio
              </h3>
              <div className="mt-4 space-y-1 nombres">
                <div>Vinicio Cotto</div>
                <div>Marilú Mux</div>
              </div>
            </div>
          </div>

          <p className="frase mx-auto mt-10 max-w-3xl">
            Te invitamos a ser parte de este capítulo tan especial en nuestra historia.
          </p>
        </div>
      </Reveal>

      <Reveal className="section narrow">
        <div className="gold-card gold-card--soft flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center">
          <div className="gold-card__inner flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <h3 className="gold-gradient font-petrona text-2xl uppercase tracking-[0.26em]">
                ¡Prepárate!
              </h3>
              <p className="font-petrona text-lg uppercase tracking-[0.24em] text-[#2f2f2f]">
                Nos vemos dentro de
              </p>
            </div>
            <Countdown targetISO={WEDDING_START} />
          </div>
          <div className="flex flex-col items-center gap-4">
            <CalendarBadge />
            <a
              href={calendarUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-gold font-petrona tracking-[0.18em] uppercase text-xs"
            >
              Añadir al calendario
            </a>
          </div>
        </div>
      </Reveal>

      <Reveal className="section narrow">
        <div className="grid gap-6 md:grid-cols-2">
          <PlaceCard
            icon="/icons/ceremonia.png"
            title="Ceremonia"
            time="4:00 PM"
            location="San José Catedral, La Antigua Guatemala"
            link="https://maps.app.goo.gl/bqNP5wttNgiLvKL18"
          />
          <PlaceCard
            icon="/icons/recepcion.png"
            title="Recepción"
            time="5:30 PM"
            location="Jardín Bugambilias, Hotel Soleil La Antigua"
            link="https://maps.app.goo.gl/QXUBcS3RtBeH7Xp4A"
          />
        </div>
      </Reveal>

      <Reveal className="section narrow">
        <div className="grid gap-6 md:grid-cols-3">
          {INFO_CARDS.map((card, index) => (
            <InfoCard
              key={card.id}
              {...card}
              icon={card.icon ?? `/icons/icon${index + 1}.png`}
            />
          ))}
        </div>
      </Reveal>

      <Reveal className="section narrow" id="rsvp">
        <div className="gold-card gold-card--soft">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="mb-5 flex items-center gap-3">
              <span className="heart-badge">
                <span>
                  <HeartIcon />
                </span>
              </span>
              <h2 className="font-petrona text-2xl gold-gradient uppercase tracking-[0.26em]">
                {confirmationSummary ? "¡Gracias por confirmar!" : "Confirma tu asistencia"}
              </h2>
            </div>
            {confirmationSummary ? (
              <>
                <p className="sec-text mb-2">
                  Registramos tu respuesta el {confirmationSummary.submittedAt ? formatDateTime(confirmationSummary.submittedAt) || "día indicado" : "día indicado"}.
                </p>
                <div className="sec-text" style={{ marginBottom: 16 }}>
                  <div>
                    Invitados:
                    {confirmationSummary.members.map((member) => (
                      <div key={member.name}>
                        {member.name}: {normalizeAnswer(member.answer) || "—"}
                      </div>
                    ))}
                  </div>
                  {confirmationSummary.extras?.length ? (
                    <div style={{ marginTop: 10 }}>
                      Acompañantes extra:
                      {confirmationSummary.extras.map((extra, index) => (
                        <div key={`${extra}-${index}`}>{extra}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <p className="sec-text mb-6">
                  Invitación para <b>{displayName || "Invitado/a"}</b>. Lugares reservados: <b>{seats}</b>
                </p>
                <p className="sec-text mb-6">
                  Agradecemos confirmar tu asistencia a más tardar el <b>15 de Noviembre de 2025</b>, para preparar con cariño cada detalle para ti y tus acompañantes.
                </p>
              </>
            )}
          </div>

          {!confirmationSummary && (
            <RSVPInline
              token={p}
              fallbackName={displayName}
              initialStatus={confirmationSummary}
              onConfirmed={(summary) => {
                setConfirmationSummary(summary);
                setShowQR(true);
              }}
            />
          )}
        </div>
      </Reveal>

      {showQR && (
        <Reveal className="section narrow">
          <div className="gold-card gold-card--soft text-center">
            <h3 className="font-petrona gold-gradient text-xl uppercase tracking-[0.2em]">Tu código QR</h3>
            <p className="sec-text mb-6">
              Presenta este código al llegar. El equipo validará tu invitación y asignará tu mesa.
            </p>
            {entryPayload && (
              <div
                ref={qrWrapperRef}
                className="mx-auto w-max rounded-2xl border border-[#d9b97a80] bg-white p-4 shadow-inner"
              >
                <QRCodeCanvas value={entryPayload} size={200} includeMargin level="M" />
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={handleDownloadPdf} className="btn-gold">
                Descargar PDF
              </button>
            </div>
            <p className="sec-text mt-4">{displayName || "Invitado/a"}</p>
          </div>
        </Reveal>
      )}

      <Reveal className="section narrow text-center">
        <p className="font-petrona gold-gradient text-lg uppercase tracking-[0.24em]">
          “Uno solo puede ser vencido, pero dos pueden resistir
          ¡La cuerda de tres hilos no se rompe fácilmente!”
        </p>
        <p className="sec-text mt-4 font-petrona tracking-[0.18em] uppercase">
          Eclesiastés 4:12
        </p>
      </Reveal>

      <Reveal className="section narrow text-center">
        <p className="sec-text font-petrona">
          ¿Dudas? Escríbenos por{" "}
          <a
            className="link-gold font-semibold"
            href="https://wa.me/50248075868"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </p>
      </Reveal>
    </main>
  );
}

function PlaceCard({ icon, title, time, location, link }) {
  return (
    <div className="gold-card place-card flex items-center gap-6">
      <div className="flex h-24 w-24 flex-none items-center justify-center rounded-2xl bg-white shadow-inner">
        <Image
          src={icon}
          alt={title}
          width={80}
          height={80}
          className="object-contain"
        />
      </div>
      <div className="place-details space-y-3 w-full text-center flex flex-col items-center">
        <h3 className="font-petrona gold-gradient text-2xl uppercase tracking-[0.2em]">
          {title}
        </h3>
        <p className="place-time">{time}</p>
        <p className="text-gray-700 font-libre max-w-xs">{location}</p>
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="btn-gold btn-map font-petrona text-xs uppercase tracking-[0.26em] self-center"
        >
          Ver ubicación
        </a>
      </div>
    </div>
  );
}

function InfoCard({ title, description, icon, subtitle, palette, textVariant }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const safeDescription = Array.isArray(description) ? description : [description].filter(Boolean);
  const textClassName = `info-card__text${textVariant === "large" ? " info-card__text--large" : ""}`;

  const toggleFlip = () => setIsFlipped((prev) => !prev);
  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleFlip();
    }
  };

  return (
    <div className="info-card">
      <button
        type="button"
        className={`info-card__inner${isFlipped ? " info-card__inner--flipped" : ""}`}
        onClick={toggleFlip}
        onKeyDown={handleKeyDown}
        aria-pressed={isFlipped}
        aria-label={
          isFlipped ? `Ocultar detalles de ${title}` : `Mostrar detalles de ${title}`
        }
      >
        <div className="gold-card info-card__face info-card__face--front">
          {icon ? (
            <span className="info-card__icon" aria-hidden="true">
              <Image src={icon} alt="" width={150} height={150} />
            </span>
          ) : (
            <span className="info-card__front-placeholder" aria-hidden="true">
              {title}
            </span>
          )}
          <span className="info-card__hint">Toca o haz clic para ver detalles</span>
        </div>
        <div className="gold-card info-card__face info-card__face--back">
          <h3 className="gold-gradient info-card__title">{title}</h3>
          {subtitle && (
            <>
              <p className="info-card__subtitle">{subtitle}</p>
              <span className="info-card__divider" aria-hidden="true" />
            </>
          )}
          <div className="info-card__body">
            {safeDescription.map((paragraph, index) => (
              <p key={index} className={textClassName}>
                {paragraph}
              </p>
            ))}
          </div>
          {Array.isArray(palette) && palette.length > 0 && (
            <div className="info-card__palette" aria-label="Colores sugeridos">
              <p className="info-card__palette-heading">Colores sugeridos:</p>
              <div className="info-card__palette-swatches">
                {palette.map((color, index) => (
                  <span
                    key={color ?? index}
                    className="info-card__palette-color"
                    style={{ backgroundColor: color }}
                    aria-label={`Color ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg
      width="20"
      height="18"
      viewBox="0 0 24 22"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M11.76 21.35L10.1 19.82C4.44 14.67 1 11.55 1 7.64 1 4.52 3.49 2 6.54 2 8.36 2 10.09 2.87 11.1 4.24 12.11 2.87 13.84 2 15.66 2 18.71 2 21.2 4.52 21.2 7.64 21.2 11.55 17.76 14.67 12.1 19.82L11.76 21.35Z" />
    </svg>
  );
}
