import { useState } from "react";
import { KPI, Pill } from "../shared";
import { fmt, subTotal } from "../../utils";
import { Card, PanelTitle, Chip, Segmented, tableStyles } from "../ui";
import { TrendingDown, Percent, BarChart3 } from "lucide-react";

export default function TabSavings({
  jogosFiltered, divulgados, totOrcJogos, totProvJogos,
  filtroRod, setFiltroRod, filtroCat, setFiltroCat,
  rodadasList, T
}) {
  const [savingsMode, setSavingsMode] = useState("individual");
  const [deRodada, setDeRodada] = useState(null);
  const [ateRodada, setAteRodada] = useState(null);
  const TS = tableStyles(T);

  const rodadasDisp = Array.from(new Set(divulgados.map(j => j.rodada))).sort((a, b) => a - b);
  const minRod = rodadasDisp.length ? rodadasDisp[0] : 1;
  const maxRod = rodadasDisp.length ? rodadasDisp[rodadasDisp.length - 1] : 1;
  const deRodadaEfetiva = deRodada ?? minRod;
  const ateRodadaEfetiva = ateRodada ?? maxRod;

  const savingsJogos = savingsMode === "acumulado"
    ? divulgados.filter(j => j.rodada >= deRodadaEfetiva && j.rodada <= ateRodadaEfetiva && (filtroCat === "Todas" || j.categoria === filtroCat))
    : jogosFiltered;

  const sOrc  = savingsJogos.reduce((s, j) => s + subTotal(j.orcado), 0);
  const sProv = savingsJogos.reduce((s, j) => s + subTotal(j.provisionado), 0);

  const acumByRodada = savingsMode === "acumulado" ? rodadasDisp.filter(r => r >= deRodadaEfetiva && r <= ateRodadaEfetiva).map(rod => {
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

  const rangeLabel = `Rd ${deRodadaEfetiva}–${ateRodadaEfetiva}`;

  return (
    <>
      {/* Toolbar */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:18,alignItems:"center"}}>
        <Segmented T={T} value={savingsMode} onChange={setSavingsMode}
          options={[{value:"individual",label:"Por Rodada"},{value:"acumulado",label:"Acumulado"}]}/>
        <div style={{width:1,height:24,background:T.border}}/>
        {["Todas","B1","B2"].map(c => (
          <Chip key={c} active={filtroCat===c} onClick={()=>setFiltroCat(c)} T={T} color={T.warning}>
            {c==="Todas" ? "B1+B2" : c}
          </Chip>
        ))}
      </div>

      {savingsMode === "individual" && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
          {rodadasList.map(r => (
            <Chip key={r} active={filtroRod===r} onClick={()=>setFiltroRod(r)} T={T}>
              {r==="Todas" ? "Todas" : `Rd ${r}`}
            </Chip>
          ))}
        </div>
      )}

      {savingsMode === "acumulado" && (
        <Card T={T} style={{marginBottom:20}}>
          <div style={{padding:"18px 20px"}}>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <span style={{color:T.textMd,fontSize:11,fontWeight:700,minWidth:90,letterSpacing:"0.06em",textTransform:"uppercase"}}>Da Rodada</span>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {rodadasDisp.filter(r => r <= ateRodadaEfetiva).map(r => (
                    <Chip key={r} active={deRodadaEfetiva===r} onClick={()=>setDeRodada(r)} T={T} color={T.info}>{r}</Chip>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <span style={{color:T.textMd,fontSize:11,fontWeight:700,minWidth:90,letterSpacing:"0.06em",textTransform:"uppercase"}}>Até Rodada</span>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {rodadasDisp.filter(r => r >= deRodadaEfetiva).map(r => (
                    <Chip key={r} active={ateRodadaEfetiva===r} onClick={()=>setAteRodada(r)} T={T}>{r}</Chip>
                  ))}
                </div>
              </div>
              <div style={{borderTop:`1px solid ${T.border}`,paddingTop:12,display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                <span className="num" style={{color:T.text,fontSize:14,fontWeight:700}}>{rangeLabel}</span>
                <span style={{color:T.textSm,fontSize:12}}>{savingsJogos.length} jogos selecionados</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:24}}>
        <KPI label={savingsMode==="acumulado" ? `Saving (${rangeLabel})` : "Saving (Orç − Prov)"} value={fmt(sOrc - sProv)} sub={`${sOrc ? ((sOrc - sProv) / sOrc * 100).toFixed(1) : 0}% do budget`} color={T.brand} T={T}/>
        <KPI label="% Saving" value={sOrc ? `${((sOrc - sProv) / sOrc * 100).toFixed(1)}%` : "—"} sub="sobre o orçado" color={T.info} T={T}/>
        <KPI label="Custo Médio / Jogo" value={savingsJogos.length ? fmt(sOrc / savingsJogos.length) : "—"} sub="orçado" color="#a855f7" T={T}/>
      </div>

      {savingsMode === "acumulado" && acumProgressive.length > 0 && (
        <Card T={T} style={{marginBottom:20}}>
          <PanelTitle T={T} title={`Evolução Acumulada por Rodada (${rangeLabel})`} subtitle="Progressão do saving ao longo das rodadas"/>
          <div style={TS.wrap}>
            <table style={{...TS.table, minWidth:680}}>
              <thead><tr style={TS.thead}>
                {["Rodada","Jogos","Orç. Rodada","Orç. Acum.","Prov. Acum.","Saving Acum."].map(h =>
                  <th key={h} style={{...TS.th, ...(h==="Rodada"?TS.thLeft:TS.thRight)}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {acumProgressive.map(r => (
                  <tr key={r.rodada} style={TS.tr}>
                    <td style={{...TS.td, fontWeight:600}}>Rodada {r.rodada}</td>
                    <td className="num" style={{...TS.tdNum, color:T.textMd, fontSize:12}}>{r.qtd}</td>
                    <td className="num" style={TS.tdNum}>{fmt(r.orc)}</td>
                    <td className="num" style={{...TS.tdNum, fontWeight:700}}>{fmt(r.acumOrc)}</td>
                    <td className="num" style={{...TS.tdNum, color:T.info}}>{fmt(r.acumProv)}</td>
                    <td className="num" style={{...TS.tdNum, fontWeight:700, color:r.acumSav>=0?T.brand:T.danger}}>{fmt(r.acumSav)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card T={T}>
        <PanelTitle T={T} title={savingsMode==="acumulado" ? `Saving por Jogo (${rangeLabel})` : "Saving por Jogo"} subtitle={`${savingsJogos.length} jogos`}/>
        <div style={TS.wrap}>
          <table style={{...TS.table, minWidth:600}}>
            <thead>
              <tr style={TS.thead}>
                {["Jogo","Rd","Cat.","Orçado","Provisionado","Saving"].map(h => (
                  <th key={h} style={{...TS.th, ...((h==="Orçado"||h==="Provisionado"||h==="Saving")?TS.thRight:TS.thLeft)}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {savingsJogos.map(j => {
                const o = subTotal(j.orcado), p = subTotal(j.provisionado), sv = o - p;
                return (
                  <tr key={j.id} style={TS.tr}>
                    <td style={{...TS.td, fontWeight:600, whiteSpace:"nowrap"}}>{j.mandante} × {j.visitante}</td>
                    <td className="num" style={{...TS.td, color:T.textMd}}>{j.rodada}</td>
                    <td style={TS.td}><Pill label={j.categoria} color={j.categoria==="B1"?T.brand:T.warning}/></td>
                    <td className="num" style={TS.tdNum}>{fmt(o)}</td>
                    <td className="num" style={{...TS.tdNum, color:T.info}}>{fmt(p)}</td>
                    <td className="num" style={{...TS.tdNum, fontWeight:700, color:sv>=0?T.brand:T.danger}}>{fmt(sv)}</td>
                  </tr>
                );
              })}
              <tr style={TS.totalRow}>
                <td colSpan={3} style={{...TS.td, textTransform:"uppercase", letterSpacing:"0.04em", fontSize:11}}>Total</td>
                <td className="num" style={TS.tdNum}>{fmt(sOrc)}</td>
                <td className="num" style={{...TS.tdNum, color:T.info}}>{fmt(sProv)}</td>
                <td className="num" style={{...TS.tdNum, color:(sOrc-sProv)>=0?T.brand:T.danger}}>{fmt(sOrc - sProv)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
