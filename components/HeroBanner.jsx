import Image from "next/image";

export default function HeroBanner({
  names = "Marielos & Guillermo",
  subtitle = "¡Nos casamos!",
  src = "/photos/hero1.jpg",
}) {
  return (
    <section className="hero-banner relative w-full h-[70vh] md:h-[86vh] overflow-hidden">
      <Image
        src={src}
        alt="Foto portada"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.25)_40%,rgba(0,0,0,0.15)_100%)]" />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <h1
          className="h-font hero-names hero-names-outline text-4xl md:text-6xl lg:text-7xl tracking-wide"
          data-text={names}
        >
          {names}
        </h1>
        <p className="mt-4 h-font hero-sub hero-sub-white text-xl md:text-2xl lg:text-3xl">
          {subtitle}
        </p>
      </div>
    </section>
  );
}
