import { KPI, Pill } from "../shared";
import { fmt, subTotal } from "../../utils";

export default function TabSavings({
  jogosFiltered, totOrcJogos, totProvJogos,
  filtroRod, setFiltroRod, filtroCat, setFiltroCat,
  rodadasList, T
}) {
  return (
    <>
      {/* Filtros */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
        {rodadasList.map(r => (
          <button key={r} onClick={()=>setFiltroRod(r)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,background:filtroRod===r?"#22c55e":T.card,color:filtroRod===r?"#fff":T.textMd}}>
            {r==="Todas" ? "Todas" : `Rd ${r}`}
          </button>
        ))}
        <div style={{width:1,background:T.border,margin:"0 4px"}}/>
        {["Todas","B1","B2"].map(c => (
          <button key={c} onClick={()=>setFiltroCat(c)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,background:filtroCat===c?"#f59e0b":T.card,color:filtroCat===c?"#000":T.textMd}}>
            {c==="Todas" ? "B1+B2" : c}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
        <KPI label="Saving (Orç − Prov)" value={fmt(totOrcJogos-totProvJogos)} sub={`${totOrcJogos?((totOrcJogos-totProvJogos)/totOrcJogos*100).toFixed(1):0}% do budget`} color="#22c55e" T={T}/>
        <KPI label="% Saving" value={totOrcJogos?`${((totOrcJogos-totProvJogos)/totOrcJogos*100).toFixed(1)}%`:"—"} sub="sobre o orçado" color="#3b82f6" T={T}/>
        <KPI label="Custo Médio / Jogo" value={jogosFiltered.length?fmt(totOrcJogos/jogosFiltered.length):"—"} sub="orçado" color="#8b5cf6" T={T}/>
      </div>

      {/* Tabela */}
      <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`}}>
          <h3 style={{margin:0,fontSize:14,color:T.textMd}}>Saving por Jogo</h3>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
            <thead>
              <tr style={{background:T.bg}}>
                {["Jogo","Rd","Cat.","Orçado","Provisionado","Saving"].map(h => (
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",color:T.textSm,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jogosFiltered.map(j => {
                const o=subTotal(j.orcado), p=subTotal(j.provisionado), sv=o-p;
                return (
                  <tr key={j.id} style={{borderTop:`1px solid ${T.border}`}}>
                    <td style={{padding:"10px 14px",fontWeight:600,fontSize:13,whiteSpace:"nowrap",color:T.text}}>{j.mandante} x {j.visitante}</td>
                    <td style={{padding:"10px 14px",color:T.textMd}}>{j.rodada}</td>
                    <td style={{padding:"10px 14px"}}><Pill label={j.categoria} color={j.categoria==="B1"?"#22c55e":"#f59e0b"}/></td>
                    <td style={{padding:"10px 14px",whiteSpace:"nowrap",color:T.text}}>{fmt(o)}</td>
                    <td style={{padding:"10px 14px",color:"#3b82f6",whiteSpace:"nowrap"}}>{fmt(p)}</td>
                    <td style={{padding:"10px 14px",fontWeight:700,color:sv>=0?"#22c55e":"#ef4444",whiteSpace:"nowrap"}}>{fmt(sv)}</td>
                  </tr>
                );
              })}
              <tr style={{borderTop:`2px solid ${T.muted}`,background:T.bg,fontWeight:700}}>
                <td colSpan={3} style={{padding:"12px 14px",color:T.text}}>TOTAL</td>
                <td style={{padding:"12px 14px",whiteSpace:"nowrap",color:T.text}}>{fmt(totOrcJogos)}</td>
                <td style={{padding:"12px 14px",color:"#3b82f6",whiteSpace:"nowrap"}}>{fmt(totProvJogos)}</td>
                <td style={{padding:"12px 14px",fontWeight:700,color:(totOrcJogos-totProvJogos)>=0?"#22c55e":"#ef4444",whiteSpace:"nowrap"}}>{fmt(totOrcJogos-totProvJogos)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
