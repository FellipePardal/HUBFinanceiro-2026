import { useState } from "react";
import { iSty } from "../constants";

// Autocomplete de fornecedor sobre a base única. Devolve o apelido (string),
// como as NFs guardam. Extraído de TabNotasMensal em 09/2026 para ser
// reaproveitado pelos contratos fixos (CobrancasFixos).
export default function FornecedorInput({ value, onChange, fornecedores = [], T, placeholder = "Digite para buscar..." }) {
  const IS = iSty(T);
  const [open, setOpen] = useState(false);
  const query = (value || "").toLowerCase();
  const filtered = query.length > 0
    ? fornecedores.filter(f => (f.apelido||"").toLowerCase().includes(query) || (f.razaoSocial||"").toLowerCase().includes(query) || (f.funcao||"").toLowerCase().includes(query)).slice(0, 8)
    : [];

  return (
    <div style={{position:"relative"}}>
      <input value={value || ""} onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder} style={IS}/>
      {open && filtered.length > 0 && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:50,background:T.card,border:`1px solid ${T.border}`,borderRadius:8,marginTop:4,maxHeight:200,overflowY:"auto",boxShadow:"0 8px 24px rgba(0,0,0,0.3)"}}>
          {filtered.map(f => (
            <div key={f.id} onMouseDown={() => { onChange(f.apelido, f); setOpen(false); }}
              style={{padding:"8px 12px",cursor:"pointer",borderBottom:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:2}}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:600,color:T.text}}>{f.apelido}</span>
                <span style={{fontSize:10,color:T.textSm,background:T.bg,padding:"1px 6px",borderRadius:4}}>{f.tipo}</span>
              </div>
              <span style={{fontSize:11,color:T.textSm}}>{f.funcao}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
