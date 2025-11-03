import { useRef, useState } from "react";

export default function AudioPlayer({
  src = "/music/sample.mp3",
  label = "Música"
}) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play(); setPlaying(true); }
  };
  return (
    <div className="aud">
      <button className="btn" type="button" onClick={toggle}>
        {playing ? "Pausar música" : "Reproducir música"}
      </button>
      <audio ref={ref} src={src} preload="auto" loop />
      <style jsx>{`
        .btn {
          background: linear-gradient(180deg,#d8a9ad,#a97579);
          color:#fff; padding:10px 16px; border-radius:10px;
        }
      `}</style>
    </div>
  );
}
