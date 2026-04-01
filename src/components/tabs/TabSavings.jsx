import { useState } from "react";
import { KPI, Pill } from "../shared";
import { fmt, subTotal } from "../../utils";

export default function TabSavings({
  jogosFiltered, divulgados, totOrcJogos, totProvJogos,
  filtroRod, setFiltroRod, filtroCat, setFiltroCat,
  rodadasList, T
}) {
  const [savingsMode, setSavingsMode] = useState("individual");
  const [ateRodada, setAteRodada] = useState(null);

  const rodadasDisp = Array.from(new Set(divulgados.map(j => j.rodada))).sort((a, b) => a - b);
  const maxRod = rodadasDisp.length ? rodadasDisp[rodadasDisp.length - 1] : 1;
  const ateRodadaEfetiva = ateRodada ?? maxRod;

  const savingsJogos = savingsMode === "acumulado"
    ? divulgados.filter(j => j.rodada <= ateRodadaEfetiva && (filtroCat === "Todas" || j.categoria === filtroCat))
    : jogosFiltered;

  const sOrc  = savingsJogos.reduce((s, j) => s + subTotal(j.orcado), 0);
  const sProv = savingsJogos.reduce((s, j) => s + subTotal(j.provisionado), 0);

  // Dados acumulados por rodada
  const acumByRodada = savingsMode === "acumulado" ? rodadasDisp.filter(r => r <= ateRodadaEfetiva).map(rod => {
    const jogosRod = divulgados.filter(j => j.rodada === rod && (filtroCat === "Todas" || j.categoria === filtroCat));
    const rOrc  = jogosRod.reduce((s, j) => s + subTotal(j.orcado), 0);
    const rProv = jogosRod.reduce((s, j) => s + subTotal(j.provisionado), 0);
    return { rodada: rod, orc: rOrc, prov: rProv, qtd: jogosRod.length };
  }) : [];

  let acumOrc = 0, acumProv = 0;
  const acumProgressive = acumByRodada.map(r => {
    acumOrc += r.orc; acumProv += r.prov;
    return { ...r, acumOrc, acumProv, acumSav: acumOrc - acumProv };
  });

  return (
    <>
      {/* Toggle modo + filtro categoria */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
        <div style={{display:"flex",gap:2,background:T.card,borderRadius:8,padding:2}}>
          {[{k:"individual",l:"Por Rodada"},{k:"acumulado",l:"Acumulado"}].map(m => (
            <button key={m.k} onClick={() => setSavingsMode(m.k)} style={{padding:"6px 16px",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
              background:savingsMode===m.k?"#22c55e":"transparent",color:savingsMode===m.k?"#fff":T.textMd}}>
              {m.l}
            </button>
          ))}
        </div>
        <div style={{width:1,height:24,background:T.border}}/>
        {["Todas","B1","B2"].map(c => (
          <button key={c} onClick={() => setFiltroCat(c)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,
            background:filtroCat===c?"#f59e0b":T.card,color:filtroCat===c?"#000":T.textMd}}>
            {c==="Todas" ? "B1+B2" : c}
          </button>
        ))}
      </div>

      {/* Filtro por rodada individual */}
      {savingsMode === "individual" && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
          {rodadasList.map(r => (
            <button key={r} onClick={() => setFiltroRod(r)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,
              background:filtroRod===r?"#22c55e":T.card,color:filtroRod===r?"#fff":T.textMd}}>
              {r==="Todas" ? "Todas" : `Rd ${r}`}
            </button>
          ))}
        </div>
      )}

      {/* Seletor acumulado */}
      {savingsMode === "acumulado" && (
        <div style={{background:T.card,borderRadius:12,padding:"16px 20px",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
            <span style={{color:T.textMd,fontSize:13,fontWeight:600}}>Analisar da Rodada 1 até:</span>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {rodadasDisp.map(r => (
                <button key={r} onClick={() => setAteRodada(r)} style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
                  background:ateRodadaEfetiva===r?"#22c55e":T.bg,color:ateRodadaEfetiva===r?"#fff":T.textMd,
                  boxShadow:ateRodadaEfetiva===r?"0 2px 8px rgba(34,197,94,0.3)":"none"}}>
                  Rd {r}
                </button>
              ))}
            </div>
            <span style={{color:T.textSm,fontSize:12}}>({savingsJogos.length} jogos · Rodadas 1–{ateRodadaEfetiva})</span>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
        <KPI label={savingsMode==="acumulado" ? `Saving (Rd 1–${ateRodadaEfetiva})` : "Saving (Orç − Prov)"} value={fmt(sOrc - sProv)} sub={`${sOrc ? ((sOrc - sProv) / sOrc * 100).toFixed(1) : 0}% do budget`} color="#22c55e" T={T}/>
        <KPI label="% Saving" value={sOrc ? `${((sOrc - sProv) / sOrc * 100).toFixed(1)}%` : "—"} sub="sobre o orçado" color="#3b82f6" T={T}/>
        <KPI label="Custo Médio / Jogo" value={savingsJogos.length ? fmt(sOrc / savingsJogos.length) : "—"} sub="orçado" color="#8b5cf6" T={T}/>
      </div>

      {/* Tabela evolução acumulada */}
      {savingsMode === "acumulado" && acumProgressive.length > 0 && (
        <div style={{background:T.card,borderRadius:12,overflow:"hidden",marginBottom:20}}>
          <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`}}>
            <h3 style={{margin:0,fontSize:14,color:T.textMd}}>Evolução Acumulada por Rodada</h3>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
              <thead><tr style={{background:T.bg}}>
                {["Rodada","Jogos","Orç. Rodada","Orç. Acum.","Prov. Acum.","Saving Acum."].map(h =>
                  <th key={h} style={{padding:"10px 14px",textAlign:h==="Rodada"?"left":"right",color:T.textSm,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {acumProgressive.map(r => (
                  <tr key={r.rodada} style={{borderTop:`1px solid ${T.border}`}}>
                    <td style={{padding:"10px 14px",fontWeight:600,color:T.text}}>Rodada {r.rodada}</td>
                    <td style={{padding:"10px 14px",textAlign:"right",color:T.textMd,fontSize:12}}>{r.qtd}</td>
                    <td style={{padding:"10px 14px",textAlign:"right",color:T.text,whiteSpace:"nowrap"}}>{fmt(r.orc)}</td>
                    <td style={{padding:"10px 14px",textAlign:"right",color:T.text,fontWeight:600,whiteSpace:"nowrap"}}>{fmt(r.acumOrc)}</td>
                    <td style={{padding:"10px 14px",textAlign:"right",color:"#3b82f6",whiteSpace:"nowrap"}}>{fmt(r.acumProv)}</td>
                    <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:r.acumSav>=0?"#22c55e":"#ef4444",whiteSpace:"nowrap"}}>{fmt(r.acumSav)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabela de jogos */}
      <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`}}>
          <h3 style={{margin:0,fontSize:14,color:T.textMd}}>{savingsMode==="acumulado" ? `Saving por Jogo (Rd 1–${ateRodadaEfetiva})` : "Saving por Jogo"}</h3>
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
              {savingsJogos.map(j => {
                const o = subTotal(j.orcado), p = subTotal(j.provisionado), sv = o - p;
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
                <td style={{padding:"12px 14px",whiteSpace:"nowrap",color:T.text}}>{fmt(sOrc)}</td>
                <td style={{padding:"12px 14px",color:"#3b82f6",whiteSpace:"nowrap"}}>{fmt(sProv)}</td>
                <td style={{padding:"12px 14px",fontWeight:700,color:(sOrc-sProv)>=0?"#22c55e":"#ef4444",whiteSpace:"nowrap"}}>{fmt(sOrc - sProv)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
