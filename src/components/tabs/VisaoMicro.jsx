import { useState } from "react";
import { CATS, iSty, RADIUS } from "../../constants";
import { fmt, subTotal, catTotal } from "../../utils";
import { allSubKeys } from "../../data";
import { Pill } from "../shared";
import { Card, PanelTitle, Button, Segmented } from "../ui";
import { ChevronLeft, ChevronRight, Pencil, Save, X, Copy, Trophy } from "lucide-react";

export default function VisaoMicro({jogos, jogoId, onChangeJogo, onSave, T}) {
  const divulgados = jogos.filter(j => j.mandante !== "A definir");
  const idx  = divulgados.findIndex(j => j.id === jogoId);
  const jogo = divulgados[idx];

  const [draft,     setDraft]     = useState(null);
  const [editing,   setEditing]   = useState(false);
  const [activeTab, setActiveTab] = useState("orcado");

  const emptyNums = () => allSubKeys();
  const safeDraft = j => ({
    ...j,
    orcado:       {...emptyNums(), ...(j.orcado||{})},
    provisionado: {...emptyNums(), ...(j.provisionado||{})},
    realizado:    {...emptyNums(), ...(j.realizado||{})},
  });

  const setVal     = (tipo,subkey,v) => setDraft(d => ({...d, [tipo]:{...d[tipo],[subkey]:v===""?"":(parseFloat(v)||0)}}));
  const startEdit  = () => { setDraft(safeDraft(jogo)); setEditing(true); };
  const cancelEdit = () => { setDraft(null); setEditing(false); };
  const saveEdit   = () => {
    const sanitize = obj => { const out={}; Object.keys(obj||{}).forEach(k=>{out[k]=parseFloat(obj[k])||0;}); return out; };
    onSave({...draft, orcado:sanitize(draft.orcado), provisionado:sanitize(draft.provisionado), realizado:sanitize(draft.realizado)});
    setEditing(false); setDraft(null);
  };
  const copyOrcadoToProvisionado = () => { if(!draft) return; setDraft(d=>({...d,provisionado:{...d.orcado}})); };

  if(!jogo) return <p style={{color:T.textSm,padding:20}}>Nenhum jogo selecionado.</p>;

  const data    = editing && draft ? draft : jogo;
  const IS      = iSty(T);
  const safeOrc  = {...emptyNums(), ...(data.orcado||{})};
  const safeProv = {...emptyNums(), ...(data.provisionado||{})};
  const safeReal = {...emptyNums(), ...(data.realizado||{})};
  const totOrc   = subTotal(safeOrc);
  const totProv  = subTotal(safeProv);
  const totReal  = subTotal(safeReal);
  const compareTabs   = [
    {value:"orcado", label:"Orçado"},
    {value:"provisionado", label:"Provisionado"},
    {value:"realizado", label:"Realizado"},
  ];

  return (
    <div>
      {/* Navegação entre jogos */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Button T={T} variant="secondary" size="md" icon={ChevronLeft}
            disabled={idx===0}
            onClick={()=>idx>0&&onChangeJogo(divulgados[idx-1].id)}/>
          <select value={jogoId} onChange={e=>onChangeJogo(parseInt(e.target.value))}
            style={{...IS,width:"auto",padding:"9px 14px",fontWeight:600,maxWidth:"60vw",borderRadius:RADIUS.md}}>
            {divulgados.map(j=><option key={j.id} value={j.id}>Rd {j.rodada} · {j.mandante} × {j.visitante}</option>)}
          </select>
          <Button T={T} variant="secondary" size="md" icon={ChevronRight}
            disabled={idx===divulgados.length-1}
            onClick={()=>idx<divulgados.length-1&&onChangeJogo(divulgados[idx+1].id)}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          {!editing
            ? <Button T={T} variant="primary" size="md" icon={Pencil} onClick={startEdit}>Editar valores</Button>
            : <>
                {activeTab==="provisionado" && <Button T={T} variant="secondary" size="md" icon={Copy} onClick={copyOrcadoToProvisionado}>Copiar Orçado</Button>}
                <Button T={T} variant="secondary" size="md" icon={X} onClick={cancelEdit}>Cancelar</Button>
                <Button T={T} variant="primary" size="md" icon={Save} onClick={saveEdit}>Salvar</Button>
              </>
          }
        </div>
      </div>

      {/* Card do jogo */}
      <Card T={T} style={{marginBottom:20}}>
        <div style={{padding:"22px 24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{
                width:46,height:46,borderRadius:12,
                background:T.brandSoft||"rgba(16,185,129,0.12)",
                color:T.brand||"#10b981",
                border:`1px solid ${T.brandBorder||"rgba(16,185,129,0.28)"}`,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                <Trophy size={22} strokeWidth={2.25}/>
              </div>
              <div>
                <h2 style={{margin:"0 0 4px",fontSize:20,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>{data.mandante} × {data.visitante}</h2>
                <p style={{color:T.textMd,fontSize:12,margin:0}}>
                  <span className="num" style={{fontWeight:600,color:T.text}}>Rd {data.rodada}</span>
                  <span style={{margin:"0 8px",color:T.border}}>·</span>
                  {data.cidade}
                  <span style={{margin:"0 8px",color:T.border}}>·</span>
                  <span className="num">{data.data} {data.hora}</span>
                  <span style={{margin:"0 8px",color:T.border}}>·</span>
                  {data.detentor}
                </p>
              </div>
            </div>
            <Pill label={data.categoria} color={data.categoria==="B1"?(T.brand||"#10b981"):(T.warning||"#f59e0b")}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginTop:20}}>
            {[
              {label:"Orçado",      value:fmt(totOrc),          color:T.brand},
              {label:"Provisionado",value:fmt(totProv),         color:T.info},
              {label:"Realizado",   value:fmt(totReal),         color:T.warning},
              {label:"Saving",      value:fmt(totOrc-totProv),  color:(totOrc-totProv)>=0?T.brand:T.danger},
            ].map(k => (
              <div key={k.label} style={{
                background:T.surfaceAlt||T.bg,
                borderRadius:RADIUS.md,
                padding:"14px 18px",
                border:`1px solid ${T.border}`,
                position:"relative",
                overflow:"hidden",
              }}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:k.color,boxShadow:`0 0 12px ${k.color}88`}}/>
                <p style={{color:T.textSm,fontSize:10,margin:"4px 0 6px",letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:700}}>{k.label}</p>
                <p className="num" style={{color:k.color,fontWeight:800,fontSize:18,margin:0,letterSpacing:"-0.02em"}}>{k.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {editing && (
        <div style={{marginBottom:16}}>
          <Segmented T={T} value={activeTab} onChange={setActiveTab} options={compareTabs}/>
        </div>
      )}

      {CATS.map(cat => {
        const cOrc  = catTotal(safeOrc, cat);
        const cProv = catTotal(safeProv, cat);
        const cReal = catTotal(safeReal, cat);
        const draftTipo = editing && draft ? {
          orcado:       {...emptyNums(), ...(draft.orcado||{})},
          provisionado: {...emptyNums(), ...(draft.provisionado||{})},
          realizado:    {...emptyNums(), ...(draft.realizado||{})},
        } : null;

        return (
          <Card key={cat.key} T={T} style={{marginBottom:16}} accent={cat.color}>
            <PanelTitle T={T} title={cat.label} color={cat.color}
              right={
                <div style={{display:"flex",gap:14,fontSize:11}}>
                  <span style={{color:T.textMd}}>Orç: <b className="num" style={{color:T.brand}}>{fmt(cOrc)}</b></span>
                  <span style={{color:T.textMd}}>Prov: <b className="num" style={{color:T.info}}>{fmt(cProv)}</b></span>
                  <span style={{color:T.textMd}}>Real: <b className="num" style={{color:T.warning}}>{fmt(cReal)}</b></span>
                  <span style={{color:T.textMd}}>Saving: <b className="num" style={{color:(cOrc-cProv)>=0?T.brand:T.danger}}>{fmt(cOrc-cProv)}</b></span>
                </div>
              }
            />
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
                <thead>
                  <tr style={{background:T.surfaceAlt||T.bg}}>
                    {["Item","Orçado","Provisionado","Realizado","Saving"].map(h => (
                      <th key={h} style={{padding:"11px 20px",textAlign:h==="Item"?"left":"right",color:T.textSm,fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",borderBottom:`1px solid ${T.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cat.subs.map(sub => {
                    const o = safeOrc[sub.key]||0, p = safeProv[sub.key]||0, r = safeReal[sub.key]||0;
                    if(!editing && o===0 && p===0 && r===0) return null;
                    return (
                      <tr key={sub.key} style={{borderTop:`1px solid ${T.border}`}}>
                        <td style={{padding:"11px 20px",fontSize:13,color:T.text}}>{sub.label}</td>
                        {["orcado","provisionado","realizado"].map(tipo => {
                          const val = tipo==="orcado"?o:tipo==="provisionado"?p:r;
                          const col = tipo==="orcado"?T.brand:tipo==="provisionado"?T.info:T.warning;
                          const active = !editing || activeTab===tipo;
                          return (
                            <td key={tipo} className="num" style={{padding:"9px 20px",textAlign:"right",opacity:editing&&!active?0.35:1}}>
                              {editing && active && draftTipo
                                ? <input value={draftTipo[tipo][sub.key]??0} onChange={e=>setVal(tipo,sub.key,e.target.value)} style={{...IS,width:100,textAlign:"right",padding:"5px 10px",color:col}}/>
                                : <span style={{fontSize:13,color:val===0?T.textSm:col}}>{fmt(val)}</span>
                              }
                            </td>
                          );
                        })}
                        <td className="num" style={{padding:"11px 20px",textAlign:"right",fontWeight:700,color:(o-p)>=0?T.brand:T.danger,fontSize:13}}>{fmt(o-p)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{borderTop:`2px solid ${T.borderStrong||T.border}`,background:T.surfaceAlt||T.bg,fontWeight:700}}>
                    <td style={{padding:"12px 20px",fontSize:11,color:T.text,textTransform:"uppercase",letterSpacing:"0.04em"}}>Total {cat.label}</td>
                    <td className="num" style={{padding:"12px 20px",textAlign:"right",color:T.brand}}>{fmt(cOrc)}</td>
                    <td className="num" style={{padding:"12px 20px",textAlign:"right",color:T.info}}>{fmt(cProv)}</td>
                    <td className="num" style={{padding:"12px 20px",textAlign:"right",color:T.warning}}>{fmt(cReal)}</td>
                    <td className="num" style={{padding:"12px 20px",textAlign:"right",color:(cOrc-cProv)>=0?T.brand:T.danger}}>{fmt(cOrc-cProv)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
