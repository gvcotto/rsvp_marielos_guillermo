export default function CalendarBadge(){
  // Diciembre 2025, resaltando el 27
  const days = ["D","L","M","M","J","V","S"];
  // Diciembre 2025 empieza lunes -> agregamos un "hueco" para domingo
  const numbers = [
    "",1,2,3,4,5,6,
    7,8,9,10,11,12,13,
    14,15,16,17,18,19,20,
    21,22,23,24,25,26,27,
    28,29,30,31
  ];

  return (
    <div className="cal-badge">
      <div className="cal-head">
        <span className="cal-dot" />
        <span className="h-font">Diciembre 2025</span>
        <span className="cal-dot" />
      </div>
      <div className="cal-grid">
        {days.map((d,i)=> <div key={'d'+i} className="cal-day">{d}</div>)}
        {numbers.map((n,i)=>(
          n === 27
            ? <div key={'n'+i} className="cal-num highlight">27</div>
            : <div key={'n'+i} className="cal-num">{n || ""}</div>
        ))}
      </div>
    </div>
  );
}
