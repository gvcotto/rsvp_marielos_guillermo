
import { useRef, useState, useEffect } from 'react';

export default function EnvelopeV6({ onOpened, headline='Nuestra Boda' }){
  const [open,setOpen] = useState(false);
  const fired = useRef(false);
  useEffect(()=>{ if(open && !fired.current){ fired.current=true; setTimeout(()=>onOpened?.(), 850); }},[open,onOpened]);
  return (
    <div className="env-wrap">
      <div className={`env ${open?'open':''}`} onClick={()=>setOpen(true)} role="button" aria-label="Abrir invitación">
        <div className="env-card">
          <div>
            <h3 className="h-font">{headline}</h3>
            <p>Toca para abrir</p>
          </div>
        </div>
      </div>
      <div style={{textAlign:'center',marginTop:12}}>
        <button className="btn-rose" type="button" onClick={()=>setOpen(true)}>Abrir invitación</button>
      </div>
    </div>
  );
}
