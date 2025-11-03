// components/Gallery.jsx
import Image from "next/image";

export default function Gallery() {
  const imgs = ["/img/hero1.jpg", "/img/hero2.jpg", "/img/hero3.jpg"];
  return (
    <div className="gal-grid">
      {imgs.map((src, i) => (
        <div key={src} className="gal-img">
          <Image
            src={src}
            alt={`Galería ${i + 1}`}
            width={600}
            height={800}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="gal-img__image"
          />
        </div>
      ))}
    </div>
  );
}
