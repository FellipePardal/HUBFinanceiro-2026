import { useState } from "react";
import { TIMES, CIDADES, DETENTORES, FASES_PAULISTAO, btnStyle, iSty, RADIUS } from "../../constants";
import { getPaulistaoDefaults, allSubKeysPaulistao, PAULISTAO_GRUPOS } from "../../data/paulistao";
import { Button } from "../ui";

const overlayStyle = {
  position:"fixed", inset:0,
  background:"rgba(0,0,0,0.65)",
  backdropFilter:"blur(4px)",
  zIndex:100,
  display:"flex", alignItems:"center", justifyContent:"center",
  padding:16,
};
const dialogStyle = (T, max=480) => ({
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

export function NovoJogoPaulistaoModal({ jogo, onSave, onClose, T, fases = FASES_PAULISTAO, titulo = "Paulistão Feminino" }) {
  const faseInicial = fases?.[0]?.key || "grupos";
  const [form, setForm] = useState(jogo ? {
    mandante:  jogo.mandante,
    visitante: jogo.visitante,
    fase:      jogo.fase || faseInicial,
    grupo:     jogo.grupo || "A",
    rodada:    String(jogo.rodada || 1),
    cidade:    jogo.cidade,
    data:      jogo.data,
    hora:      jogo.hora,
    detentor:  jogo.detentor,
  } : { mandante:TIMES[0], visitante:TIMES[0], fase:faseInicial, grupo:"A", rodada:"1", cidade:CIDADES[0], data:"", hora:"", detentor:"A definir" });

  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  const IS  = iSty(T);
  const isEdit = !!jogo;
  const mostraGrupo = form.fase === "grupos";

  const field = (label, key, opts=null) => (
    <div style={{marginBottom:12}}>
      <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>{label}</label>
      {opts
        ? <select value={form[key]} onChange={e=>set(key,e.target.value)} style={IS}>
            {opts.map(o => typeof o === "object"
              ? <option key={o.value} value={o.value}>{o.label}</option>
              : <option key={o}>{o}</option>)}
          </select>
        : <input value={form[key]} onChange={e=>set(key,e.target.value)} style={IS}/>}
    </div>
  );

  const handleSave = () => {
    if (!form.mandante || !form.visitante) return;
    const defs = getPaulistaoDefaults();
    onSave({
      ...form,
      id:           jogo?.id || Date.now(),
      categoria:    "PAU",
      grupo:        mostraGrupo ? form.grupo : "-",
      rodada:       parseInt(form.rodada) || 1,
      orcado:       jogo?.orcado       || { ...defs },
      provisionado: jogo?.provisionado || { ...defs },
      realizado:    jogo?.realizado    || { ...allSubKeysPaulistao() },
    });
  };

  const fasesOpts = (fases || FASES_PAULISTAO).map(f => ({ value:f.key, label:f.label }));

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle(T, 520)}>
        <h3 style={{margin:"0 0 20px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>
          {isEdit ? "Editar Jogo" : `Novo Jogo · ${titulo}`}
        </h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          {field("Fase","fase",fasesOpts)}
          {mostraGrupo ? field("Grupo","grupo",PAULISTAO_GRUPOS) : field("Rodada","rodada")}
          {mostraGrupo && field("Rodada","rodada")}
          {field("Mandante","mandante",TIMES)}
          {field("Visitante","visitante",TIMES)}
          {field("Cidade","cidade",CIDADES)}
          {field("Data","data")}
          {field("Hora","hora")}
          {field("Detentor","detentor",DETENTORES)}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary"   size="md" onClick={handleSave}>{isEdit ? "Salvar" : "Adicionar"}</Button>
        </div>
      </div>
    </div>
  );
}
