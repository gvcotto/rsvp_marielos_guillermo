export default function Itinerary({
  items = [
    { time: "4:00 PM", title: "Ceremonia" },
    { time: "5:30 PM", title: "Boquitas de bienvenida" },
    { time: "6:00 PM", title: "Ingreso de esposos" },
    { time: "7:30 PM", title: "Cena" },
    { time: "8:15 PM", title: "Fiesta" },
    { time: "10:30 PM", title: "Cierre de fiesta" },
  ],
}) {
  return (
    <ul className="it-list">
      {items.map((it, i) => (
        <li key={i} className="it-item">
          <span className="it-time">{it.time}</span>
          <span className="it-title">{it.title}</span>
        </li>
      ))}
      <style jsx>{`
        .it-list { display:grid; gap:10px; }
        .it-item { display:flex; gap:14px; align-items:center; }
        .it-time {
          width: 90px; text-align:center;
          border:1px solid #e6c9cb; color:#a97579; border-radius:10px; padding:6px 0;
          font-weight:600;
        }
        .it-title { font-size:1.05rem; }
      `}</style>
    </ul>
  );
}
