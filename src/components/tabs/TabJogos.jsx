import { Pill } from "../shared";
import { fmtK, subTotal } from "../../utils";
import { Card, PanelTitle, Button, Chip, tableStyles } from "../ui";
import { Search, Pencil, Trash2, Plus, Eye, EyeOff } from "lucide-react";

const PLANO_JOGOS = { b1:34, b2s:18, b2sul:24 };
const TOTAL_PLANO = PLANO_JOGOS.b1 + PLANO_JOGOS.b2s + PLANO_JOGOS.b2sul;
const CIDADES_SUL = ["Porto Alegre","Curitiba","Chapecó","Chapeco","Criciúma","Criciuma","Florianópolis","Florianopolis"];
const cenarioDoJogo = j => {
  if (j.categoria === "B1") return "b1";
  const isSul = j.regiao ? String(j.regiao).toLowerCase()==="sul" : CIDADES_SUL.includes(j.cidade);
  return isSul ? "b2sul" : "b2s";
};

export default function TabJogos({
  jogos, filtrados, filtroRod, setFiltroRod, filtroCat, setFiltroCat,
  showPlaceholder, setShowPlaceholder, rodadasList,
  setMicroJogoId, setTab, setNovo, setNovoRapido, onDelete, onEdit, T
}) {
  const TS = tableStyles(T);

  const consumidos = { b1:0, b2s:0, b2sul:0 };
  jogos.filter(j => j.mandante !== "A definir").forEach(j => { consumidos[cenarioDoJogo(j)]++; });
  const totalConsumidos = consumidos.b1 + consumidos.b2s + consumidos.b2sul;
  const restantes = {
    b1: Math.max(0, PLANO_JOGOS.b1 - consumidos.b1),
    b2s: Math.max(0, PLANO_JOGOS.b2s - consumidos.b2s),
    b2sul: Math.max(0, PLANO_JOGOS.b2sul - consumidos.b2sul),
  };
  const totalRestantes = restantes.b1 + restantes.b2s + restantes.b2sul;

  const StatBox = ({ label, value, total, color, sub }) => (
    <div style={{
      flex:"1 1 180px",
      padding:"14px 18px",
      background: T.surfaceAlt || T.bg,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      borderLeft: `3px solid ${color}`,
    }}>
      <p style={{margin:0,color:T.textSm,fontSize:10,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:600}}>{label}</p>
      <p className="num" style={{margin:"4px 0 0",color:T.text,fontSize:22,fontWeight:800,letterSpacing:"-0.02em"}}>
        {value}<span style={{color:T.textSm,fontSize:13,fontWeight:600}}> / {total}</span>
      </p>
      {sub && <p style={{margin:"4px 0 0",color:T.textSm,fontSize:11}}>{sub}</p>}
    </div>
  );

  return (
    <>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:18}}>
        <StatBox label="Consumidos"      value={totalConsumidos} total={TOTAL_PLANO}        color={T.brand||"#10b981"} sub={`B1: ${consumidos.b1}/${PLANO_JOGOS.b1} · B2 SE: ${consumidos.b2s}/${PLANO_JOGOS.b2s} · B2 Sul: ${consumidos.b2sul}/${PLANO_JOGOS.b2sul}`}/>
        <StatBox label="A consumir"      value={totalRestantes}  total={TOTAL_PLANO}        color="#a855f7"            sub={`B1: ${restantes.b1} · B2 SE: ${restantes.b2s} · B2 Sul: ${restantes.b2sul}`}/>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          {rodadasList.map(r => (
            <Chip key={r} active={filtroRod===r} onClick={()=>setFiltroRod(r)} T={T}>
              {r==="Todas" ? "Todas" : `Rd ${r}`}
            </Chip>
          ))}
          <div style={{width:1,height:24,background:T.border,margin:"0 6px"}}/>
          {["Todas","B1","B2"].map(c => (
            <Chip key={c} active={filtroCat===c} onClick={()=>setFiltroCat(c)} T={T} color={T.warning}>
              {c==="Todas" ? "B1+B2" : c}
            </Chip>
          ))}
          <Chip active={showPlaceholder} onClick={()=>setShowPlaceholder(p=>!p)} T={T} color="#a855f7">
            {showPlaceholder ? "Ocultar a divulgar" : "Ver a divulgar"}
          </Chip>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <Button T={T} variant="primary"   size="sm" icon={Plus} onClick={()=>setNovoRapido("b1")}>B1 Sudeste</Button>
          <Button T={T} variant="secondary" size="sm" icon={Plus} onClick={()=>setNovoRapido("b2s")}>B2 Sudeste</Button>
          <Button T={T} variant="secondary" size="sm" icon={Plus} onClick={()=>setNovoRapido("b2sul")}>B2 Sul</Button>
          <Button T={T} variant="secondary" size="sm" icon={Plus} onClick={()=>setNovo(true)}>Personalizado</Button>
        </div>
      </div>

      <Card T={T}>
        <PanelTitle T={T} title="Jogos" subtitle={`${filtrados.length} resultado${filtrados.length!==1?"s":""}`}/>
        <div style={TS.wrap}>
          <table style={{...TS.table, minWidth:880}}>
            <thead>
              <tr style={TS.thead}>
                {["Jogo","Rd","Cidade","Data","Cat.","Detentor","Orçado","Provisionado","Realizado","Saving",""].map(h => (
                  <th key={h} style={{...TS.th, ...((h==="Orçado"||h==="Provisionado"||h==="Realizado"||h==="Saving")?TS.thRight:TS.thLeft)}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(j => {
                const o=subTotal(j.orcado), p=subTotal(j.provisionado), r=subTotal(j.realizado);
                const isDef = j.mandante==="A definir";
                return (
                  <tr key={j.id} style={{...TS.tr, opacity:isDef?0.5:1}}>
                    <td style={{...TS.td, fontWeight:600, whiteSpace:"nowrap"}}>
                      {isDef ? <span style={{color:T.textSm,fontStyle:"italic"}}>A divulgar</span> : `${j.mandante} × ${j.visitante}`}
                    </td>
                    <td className="num" style={{...TS.td, color:T.textMd, fontSize:12}}>{j.rodada}</td>
                    <td style={{...TS.td, color:T.textMd, fontSize:12, whiteSpace:"nowrap"}}>{j.cidade}</td>
                    <td style={{...TS.td, color:T.textMd, fontSize:12, whiteSpace:"nowrap"}}>{j.data}</td>
                    <td style={TS.td}><Pill label={j.categoria} color={j.categoria==="B1"?T.brand:T.warning}/></td>
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
