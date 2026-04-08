import { useState } from "react";
import { TIMES, CIDADES, DETENTORES, CENARIO_INFO, btnStyle, iSty, RADIUS } from "../../constants";
import { getDefaults, allSubKeys } from "../../data";
import { fmt } from "../../utils";
import { Button } from "../ui";

const overlayStyle = {
  position:"fixed", inset:0,
  background:"rgba(0,0,0,0.65)",
  backdropFilter:"blur(4px)",
  zIndex:100,
  display:"flex", alignItems:"center", justifyContent:"center",
  padding:16,
};
const dialogStyle = (T, max=460) => ({
  background:T.surface||T.card,
  borderRadius:RADIUS.xl,
  padding:28,
  width:"100%",
  maxWidth:max,
  maxHeight:"90vh",
  overflowY:"auto",
  border:`1px solid ${T.border}`,
  boxShadow:T.shadow||"0 20px 40px rgba(0,0,0,0.4)",
});

// ─── MODAL NOVO JOGO RÁPIDO (por cenário) ─────────────────────────────────────
export function NovoRapidoModal({cenario, jogos, onSave, onClose, T}) {
  const info = CENARIO_INFO[cenario];
  const proximaRodada = Math.max(0, ...jogos.filter(j=>j.mandante!=="A definir").map(j=>j.rodada)) + 1;
  const [form, setForm] = useState({mandante:TIMES[0],visitante:TIMES[0],rodada:String(proximaRodada),cidade:CIDADES[0],data:"",hora:"",detentor:"A definir"});
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
    <div style={overlayStyle}>
      <div style={dialogStyle(T, 460)}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22}}>
          <div style={{width:4,height:36,background:info.color,borderRadius:4,boxShadow:`0 0 12px ${info.color}88`}}/>
          <div>
            <h3 style={{margin:0,fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>Novo Jogo · {info.label}</h3>
            <p style={{margin:"4px 0 0",fontSize:12,color:T.textSm}}>Orçado automático: <b className="num" style={{color:info.color,fontWeight:700}}>{fmt(info.total)}</b></p>
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
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={handleSave}>Adicionar Jogo</Button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL NOVO JOGO COMPLETO ─────────────────────────────────────────────────
export function NovoJogoModal({jogo, onSave, onClose, T}) {
  const [form, setForm] = useState(jogo ? {
    mandante:  jogo.mandante,
    visitante: jogo.visitante,
    rodada:    String(jogo.rodada),
    cidade:    jogo.cidade,
    data:      jogo.data,
    hora:      jogo.hora,
    categoria: jogo.categoria,
    regiao:    jogo.regiao || "Sudeste",
    detentor:  jogo.detentor,
  } : {mandante:TIMES[0],visitante:TIMES[0],rodada:"",cidade:CIDADES[0],data:"",hora:"",categoria:"B1",regiao:"Sudeste",detentor:"A definir"});

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const IS = iSty(T);
  const isEdit = !!jogo;

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
    onSave({
      ...form,
      id:           jogo?.id || Date.now(),
      rodada:       parseInt(form.rodada)||0,
      orcado:       jogo?.orcado       || {...defs},
      provisionado: jogo?.provisionado || {...defs},
      realizado:    jogo?.realizado    || {...allSubKeys()},
    });
  };

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle(T, 480)}>
        <h3 style={{margin:"0 0 20px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>{isEdit ? "Editar Jogo" : "Novo Jogo"}</h3>
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
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={handleSave}>{isEdit ? "Salvar" : "Adicionar"}</Button>
        </div>
      </div>
    </div>
  );
}