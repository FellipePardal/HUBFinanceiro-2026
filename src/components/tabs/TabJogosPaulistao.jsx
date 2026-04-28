import { Pill } from "../shared";
import { fmtK, subTotal } from "../../utils";
import { Card, PanelTitle, Button, Chip, tableStyles } from "../ui";
import { Search, Pencil, Trash2, Plus } from "lucide-react";
import { FASES_PAULISTAO } from "../../constants";
import { getFase, ordemFase } from "../../data/paulistao";

export default function TabJogosPaulistao({
  jogos, filtroFase, setFiltroFase, filtroGrupo, setFiltroGrupo,
  showPlaceholder, setShowPlaceholder,
  setMicroJogoId, setTab, setNovo, onDelete, onEdit, T,
}) {
  const TS = tableStyles(T);

  const consumidos = FASES_PAULISTAO.reduce((acc, f) => {
    acc[f.key] = jogos.filter(j => j.fase === f.key && j.mandante !== "A definir").length;
    return acc;
  }, {});
  const totaisFase = FASES_PAULISTAO.reduce((acc, f) => {
    acc[f.key] = jogos.filter(j => j.fase === f.key).length;
    return acc;
  }, {});

  const filtrados = (showPlaceholder ? jogos : jogos.filter(j => j.mandante !== "A definir"))
    .filter(j => filtroFase === "Todas" || j.fase === filtroFase)
    .filter(j => filtroGrupo === "Todos" || j.grupo === filtroGrupo)
    .sort((a,b) => ordemFase(a.fase) - ordemFase(b.fase) || a.rodada - b.rodada || a.id - b.id);

  const StatBox = ({ label, value, total, color }) => (
    <div style={{
      flex:"1 1 140px",
      padding:"12px 16px",
      background: T.surfaceAlt || T.bg,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      borderLeft: `3px solid ${color}`,
    }}>
      <p style={{margin:0,color:T.textSm,fontSize:10,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:600}}>{label}</p>
      <p className="num" style={{margin:"4px 0 0",color:T.text,fontSize:18,fontWeight:800,letterSpacing:"-0.02em"}}>
        {value}<span style={{color:T.textSm,fontSize:12,fontWeight:600}}> / {total}</span>
      </p>
    </div>
  );

  return (
    <>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:18}}>
        {FASES_PAULISTAO.map(f => (
          <StatBox key={f.key} label={f.short} value={consumidos[f.key]||0} total={totaisFase[f.key]||0} color={f.color}/>
        ))}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <Chip active={filtroFase==="Todas"} onClick={()=>setFiltroFase("Todas")} T={T}>Todas as fases</Chip>
          {FASES_PAULISTAO.map(f => (
            <Chip key={f.key} active={filtroFase===f.key} onClick={()=>setFiltroFase(f.key)} T={T} color={f.color}>
              {f.short}
            </Chip>
          ))}
          <div style={{width:1,height:24,background:T.border,margin:"0 6px"}}/>
          {["Todos","A","B","C","D"].map(g => (
            <Chip key={g} active={filtroGrupo===g} onClick={()=>setFiltroGrupo(g)} T={T} color={T.info}>
              {g==="Todos" ? "Todos grupos" : `Grupo ${g}`}
            </Chip>
          ))}
          <Chip active={showPlaceholder} onClick={()=>setShowPlaceholder(p=>!p)} T={T} color="#a855f7">
            {showPlaceholder ? "Ocultar a divulgar" : "Ver a divulgar"}
          </Chip>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <Button T={T} variant="primary" size="sm" icon={Plus} onClick={()=>setNovo(true)}>Novo Jogo</Button>
        </div>
      </div>

      <Card T={T}>
        <PanelTitle T={T} title="Jogos" subtitle={`${filtrados.length} resultado${filtrados.length!==1?"s":""}`}/>
        <div style={TS.wrap}>
          <table style={{...TS.table, minWidth:920}}>
            <thead>
              <tr style={TS.thead}>
                {["Jogo","Fase","Grupo","Rd","Cidade","Data","Detentor","Orçado","Provisionado","Realizado","Saving",""].map(h => (
                  <th key={h} style={{...TS.th, ...((h==="Orçado"||h==="Provisionado"||h==="Realizado"||h==="Saving")?TS.thRight:TS.thLeft)}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(j => {
                const o=subTotal(j.orcado), p=subTotal(j.provisionado), r=subTotal(j.realizado);
                const isDef = j.mandante==="A definir";
                const fase = getFase(j.fase);
                return (
                  <tr key={j.id} style={{...TS.tr, opacity:isDef?0.5:1}}>
                    <td style={{...TS.td, fontWeight:600, whiteSpace:"nowrap"}}>
                      {isDef ? <span style={{color:T.textSm,fontStyle:"italic"}}>A divulgar</span> : `${j.mandante} × ${j.visitante}`}
                    </td>
                    <td style={TS.td}><Pill label={fase.short} color={fase.color}/></td>
                    <td style={{...TS.td, color:T.textMd, fontSize:12}}>{j.grupo}</td>
                    <td className="num" style={{...TS.td, color:T.textMd, fontSize:12}}>{j.rodada}</td>
                    <td style={{...TS.td, color:T.textMd, fontSize:12, whiteSpace:"nowrap"}}>{j.cidade}</td>
                    <td style={{...TS.td, color:T.textMd, fontSize:12, whiteSpace:"nowrap"}}>{j.data}</td>
                    <td style={{...TS.td, color:T.textMd, fontSize:11, whiteSpace:"nowrap"}}>{j.detentor}</td>
                    <td className="num" style={TS.tdNum}>{fmtK(o)}</td>
                    <td className="num" style={{...TS.tdNum, color:T.info}}>{fmtK(p)}</td>
                    <td className="num" style={{...TS.tdNum, color:T.warning}}>{fmtK(r)}</td>
                    <td className="num" style={{...TS.tdNum, fontWeight:700, color:(o-p)>=0?T.brand:T.danger}}>{fmtK(o-p)}</td>
                    <td style={TS.td}>
                      <div style={{display:"flex",gap:4}}>
                        <Button T={T} variant="secondary" size="sm" icon={Search} onClick={()=>{setMicroJogoId(j.id);setTab("micro");}}/>
                        {!isDef && <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={()=>onEdit(j)}/>}
                        {!isDef && <Button T={T} variant="danger"    size="sm" icon={Trash2} onClick={()=>onDelete(j.id)}/>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
