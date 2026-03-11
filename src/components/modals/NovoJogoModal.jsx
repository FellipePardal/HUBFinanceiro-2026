import { useState } from "react";
import { TIMES, CIDADES, DETENTORES, CENARIO_INFO, btnStyle, iSty } from "../../constants";
import { getDefaults, allSubKeys } from "../../data";
import { fmt } from "../../utils";

// ─── MODAL NOVO JOGO RÁPIDO (por cenário) ─────────────────────────────────────
export function NovoRapidoModal({cenario, jogos, onSave, onClose, T}) {
  const info = CENARIO_INFO[cenario];
  const proximaRodada = Math.max(0, ...jogos.filter(j=>j.mandante!=="A definir").map(j=>j.rodada)) + 1;
  const [form, setForm] = useState({mandante:"",visitante:"",rodada:String(proximaRodada),cidade:"",data:"",hora:"",detentor:"A definir"});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const IS = iSty(T);

  const field = (label, key, opts=null) => (
    <div style={{marginBottom:12}}>
      <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>{label}</label>
      {opts
        ? <select value={form[key]} onChange={e=>set(key,e.target.value)} style={IS}>{opts.map(o=><option key={o}>{o}</option>)}</select>
        : <input value={form[key]} onChange={e=>set(key,e.target.value)} style={IS}/>
      }
    </div>
  );

  const handleSave = () => {
    if(!form.mandante||!form.visitante) return;
    const defs = getDefaults(info.cat, info.regiao);
    onSave({...form, id:Date.now(), rodada:parseInt(form.rodada)||0, categoria:info.cat, regiao:info.regiao, orcado:{...defs}, provisionado:{...defs}, realizado:{...allSubKeys()}});
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{background:T.card,borderRadius:16,padding:28,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <div style={{width:4,height:28,background:info.color,borderRadius:2}}/>
          <div>
            <h3 style={{margin:0,fontSize:16,color:T.text}}>Novo Jogo — {info.label}</h3>
            <p style={{margin:"4px 0 0",fontSize:12,color:T.textSm}}>Orçado automático: <b style={{color:info.color}}>{fmt(info.total)}</b></p>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          {field("Mandante","mandante",TIMES)}
          {field("Visitante","visitante",TIMES)}
          {field("Rodada","rodada")}
          {field("Data","data")}
          {field("Hora","hora")}
          {field("Cidade","cidade",CIDADES)}
          {field("Detentor","detentor",DETENTORES)}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
          <button onClick={onClose} style={{...btnStyle,background:"#475569"}}>Cancelar</button>
          <button onClick={handleSave} style={{...btnStyle,background:info.color,color:cenario==="b2sul"?"#000":"#fff"}}>Adicionar Jogo</button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL NOVO JOGO COMPLETO ─────────────────────────────────────────────────
export function NovoJogoModal({onSave, onClose, T}) {
  const [form, setForm] = useState({mandante:"",visitante:"",rodada:"",cidade:"",data:"",hora:"",categoria:"B1",regiao:"Sudeste",detentor:"A definir"});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const IS = iSty(T);

  const field = (label, key, opts=null) => (
    <div style={{marginBottom:12}}>
      <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>{label}</label>
      {opts
        ? <select value={form[key]} onChange={e=>set(key,e.target.value)} style={IS}>{opts.map(o=><option key={o}>{o}</option>)}</select>
        : <input value={form[key]} onChange={e=>set(key,e.target.value)} style={IS}/>
      }
    </div>
  );

  const handleSave = () => {
    if(!form.mandante||!form.visitante) return;
    const defs = getDefaults(form.categoria, form.regiao==="Sul"?"sul":"sudeste");
    onSave({...form, id:Date.now(), rodada:parseInt(form.rodada)||0, orcado:{...defs}, provisionado:{...defs}, realizado:{...allSubKeys()}});
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{background:T.card,borderRadius:16,padding:28,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 20px",fontSize:16,color:T.text}}>Novo Jogo</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          {field("Mandante","mandante",TIMES)}
          {field("Visitante","visitante",TIMES)}
          {field("Rodada","rodada")}
          {field("Data","data")}
          {field("Hora","hora")}
          {field("Cidade","cidade",CIDADES)}
          {field("Categoria","categoria",["B1","B2"])}
          {field("Região","regiao",["Sudeste","Sul"])}
          {field("Detentor","detentor",DETENTORES)}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
          <button onClick={onClose} style={{...btnStyle,background:"#475569"}}>Cancelar</button>
          <button onClick={handleSave} style={{...btnStyle,background:"#22c55e"}}>Adicionar</button>
        </div>
      </div>
    </div>
  );
}
