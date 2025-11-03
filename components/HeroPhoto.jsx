import Image from "next/image";

export default function HeroPhoto({
  title = "Marielos & Guillermo",
  subtitle = "¡Nos casamos!",
  src = "/photos/hero1.jpg",
}) {
  return (
    <section className="hero-photo relative overflow-hidden rounded-3xl bg-black/40">
      <div className="relative h-[60vh] min-h-[360px] w-full">
        <Image
          src={src}
          alt={title}
          fill
          priority
          className="hero-photo__img object-cover object-center"
        />
        <div className="hero-photo__overlay absolute inset-0 bg-gradient-to-b from-black/10 via-black/50 to-black/20" />
        <div className="hero-photo__text absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
          <p className="h-font hero-sub hero-sub-white tracking-[0.4em] text-xs uppercase md:text-sm">
            Nuestra boda
          </p>
          <h1
            className="h-font hero-photo__title hero-names-outline text-4xl md:text-6xl"
            data-text={title}
          >
            {title}
          </h1>
          <p className="hero-photo__subtitle mt-4 text-base md:text-xl">
            {subtitle}
          </p>
        </div>
        <a
          href="#rsvp"
          className="hero-photo__chevron absolute bottom-6 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
          aria-label="Ir a confirmar asistencia"
        >
          <span />
        </a>
      </div>
    </section>
  );
}
