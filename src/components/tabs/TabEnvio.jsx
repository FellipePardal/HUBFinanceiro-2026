import { useState } from "react";
import { KPI, Pill } from "../shared";
import { fmt, subTotal } from "../../utils";
import { CATS, btnStyle } from "../../constants";
import { getNFFile } from "../../lib/supabase";

const catTotal = (subs, cat) => cat.subs.reduce((s, sub) => s + (subs?.[sub.key]||0), 0);

export default function TabEnvio({ jogos, notas, servicos, T }) {
  const divulgados = jogos.filter(j => j.mandante !== "A definir");
  const rodadas = Array.from(new Set(divulgados.map(j => j.rodada))).sort((a, b) => a - b);
  const [rodadaDe, setRodadaDe] = useState(rodadas[0] || 1);
  const [rodadaAte, setRodadaAte] = useState(rodadas[rodadas.length - 1] || 1);

  const jogosPeriodo = divulgados.filter(j => j.rodada >= rodadaDe && j.rodada <= rodadaAte);
  const notasPeriodo = notas.filter(n => n.rodada >= rodadaDe && n.rodada <= rodadaAte);

  const totOrc = jogosPeriodo.reduce((s, j) => s + subTotal(j.orcado), 0);
  const totProv = jogosPeriodo.reduce((s, j) => s + subTotal(j.provisionado), 0);
  const totReal = jogosPeriodo.reduce((s, j) => s + subTotal(j.realizado), 0);
  const fixoOrc = servicos.reduce((s, sec) => s + sec.itens.reduce((t, i) => t + i.orcado, 0), 0);
  const fixoReal = servicos.reduce((s, sec) => s + sec.itens.reduce((t, i) => t + i.realizado, 0), 0);
  const totalNFValor = notasPeriodo.reduce((s, n) => s + (n.valorNF || 0), 0);

  const catResumo = CATS.map(cat => ({
    label: cat.label, color: cat.color,
    orc: jogosPeriodo.reduce((s, j) => s + catTotal(j.orcado, cat), 0),
    prov: jogosPeriodo.reduce((s, j) => s + catTotal(j.provisionado, cat), 0),
    real: jogosPeriodo.reduce((s, j) => s + catTotal(j.realizado, cat), 0),
  }));

  const downloadNF = async (nota) => {
    const data = await getNFFile(nota.id);
    if (!data) { alert("Arquivo não encontrado"); return; }
    const a = document.createElement("a");
    a.href = data; a.download = nota.codigo || `NF_${nota.id}`; a.click();
  };

  const downloadAll = async () => {
    const nfsComArquivo = notasPeriodo.filter(n => n.hasFile);
    for (const n of nfsComArquivo) { await downloadNF(n); }
  };

  const copyPlanilha = () => {
    const header = "Código\tNº NF\tFornecedor\tValor\tEmissão\tEnvio\tJogo\tRodada\tServiços";
    const rows = notasPeriodo.map(n =>
      `${n.codigo}\t${n.numeroNF}\t${n.fornecedor}\t${n.valorNF||0}\t${n.dataEmissao}\t${n.dataEnvio}\t${n.jogoLabel}\t${n.rodada||""}\t${(n.servicosLabels||[]).join(", ")}`
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
    alert("Planilha copiada!");
  };

  const thS = { padding:"8px 12px", textAlign:"left", fontSize:11, color:T.textSm, whiteSpace:"nowrap" };
  const tdS = { padding:"8px 12px", fontSize:12 };

  return (
    <div>
      {/* Seletor período */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{color:T.textMd,fontSize:13,fontWeight:600}}>Período:</span>
          <select value={rodadaDe} onChange={e => setRodadaDe(parseInt(e.target.value))}
            style={{background:T.bg,border:`1px solid ${T.muted}`,borderRadius:8,color:T.text,padding:"6px 12px",fontSize:13,fontWeight:600}}>
            {rodadas.map(r => <option key={r} value={r}>Rodada {r}</option>)}
          </select>
          <span style={{color:T.textSm}}>até</span>
          <select value={rodadaAte} onChange={e => setRodadaAte(parseInt(e.target.value))}
            style={{background:T.bg,border:`1px solid ${T.muted}`,borderRadius:8,color:T.text,padding:"6px 12px",fontSize:13,fontWeight:600}}>
            {rodadas.filter(r => r >= rodadaDe).map(r => <option key={r} value={r}>Rodada {r}</option>)}
          </select>
          <span style={{color:T.textSm,fontSize:12}}>{jogosPeriodo.length} jogos · {notasPeriodo.length} NFs</span>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={copyPlanilha} style={{...btnStyle,background:"#22c55e",fontSize:11,padding:"6px 14px"}}>Copiar Planilha</button>
          <button onClick={downloadAll} style={{...btnStyle,background:"#3b82f6",fontSize:11,padding:"6px 14px"}}>Baixar Arquivos</button>
        </div>
      </div>

      {/* KPIs orçamento */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <KPI label="Orçado (período)" value={fmt(totOrc+fixoOrc)} sub="Variável + fixo" color="#22c55e" T={T}/>
        <KPI label="Realizado" value={fmt(totReal+fixoReal)} sub={`${(totOrc+fixoOrc)?((totReal+fixoReal)/(totOrc+fixoOrc)*100).toFixed(1):0}% executado`} color="#f59e0b" T={T}/>
        <KPI label="Saving" value={fmt((totOrc+fixoOrc)-(totReal+fixoReal))} sub="Orçado - Realizado" color={(totOrc+fixoOrc)-(totReal+fixoReal)>=0?"#22c55e":"#ef4444"} T={T}/>
        <KPI label="Total NFs" value={fmt(totalNFValor)} sub={`${notasPeriodo.length} notas`} color="#8b5cf6" T={T}/>
      </div>

      {/* Tabela orçamento por categoria */}
      <div style={{background:T.card,borderRadius:12,overflow:"hidden",marginBottom:20}}>
        <div style={{padding:"12px 20px",borderBottom:`1px solid ${T.border}`}}>
          <h3 style={{margin:0,fontSize:14,color:T.textMd}}>Retrato do Orçamento</h3>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:T.bg}}>
              {["Categoria","Orçado","Provisionado","Realizado","Saving","% Exec."].map(h =>
                <th key={h} style={{...thS,textAlign:h==="Categoria"?"left":"right"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {catResumo.map(c => {
                const sv = c.orc - c.real;
                const pct = c.orc ? (c.real/c.orc*100).toFixed(1) : 0;
                return (
                  <tr key={c.label} style={{borderTop:`1px solid ${T.border}`}}>
                    <td style={{...tdS,fontWeight:600,color:c.color}}>{c.label}</td>
                    <td style={{...tdS,textAlign:"right"}}>{fmt(c.orc)}</td>
                    <td style={{...tdS,textAlign:"right",color:"#3b82f6"}}>{fmt(c.prov)}</td>
                    <td style={{...tdS,textAlign:"right",color:"#f59e0b"}}>{fmt(c.real)}</td>
                    <td style={{...tdS,textAlign:"right",fontWeight:600,color:sv>=0?"#22c55e":"#ef4444"}}>{fmt(sv)}</td>
                    <td style={{...tdS,textAlign:"right",color:T.textMd}}>{pct}%</td>
                  </tr>
                );
              })}
              <tr style={{borderTop:`2px solid ${T.muted}`,background:T.bg,fontWeight:700}}>
                <td style={tdS}>TOTAL</td>
                <td style={{...tdS,textAlign:"right"}}>{fmt(totOrc)}</td>
                <td style={{...tdS,textAlign:"right",color:"#3b82f6"}}>{fmt(totProv)}</td>
                <td style={{...tdS,textAlign:"right",color:"#f59e0b"}}>{fmt(totReal)}</td>
                <td style={{...tdS,textAlign:"right",color:totOrc-totReal>=0?"#22c55e":"#ef4444"}}>{fmt(totOrc-totReal)}</td>
                <td style={{...tdS,textAlign:"right",color:T.textMd}}>{totOrc?(totReal/totOrc*100).toFixed(1):0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela de NFs */}
      <div style={{background:T.card,borderRadius:12,overflow:"hidden",marginBottom:20}}>
        <div style={{padding:"12px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h3 style={{margin:0,fontSize:14,color:T.textMd}}>Notas Fiscais do Período</h3>
          <span style={{color:"#8b5cf6",fontWeight:700,fontSize:13}}>Total: {fmt(totalNFValor)}</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
            <thead><tr style={{background:T.bg}}>
              {["Código","Nº NF","Fornecedor","Valor","Emissão","Envio","Jogo","Rd","Serviços",""].map(h =>
                <th key={h} style={thS}>{h}</th>)}
            </tr></thead>
            <tbody>
              {notasPeriodo.map(n => (
                <tr key={n.id} style={{borderTop:`1px solid ${T.border}`}}>
                  <td style={tdS}><code style={{color:"#22c55e",fontSize:10,fontWeight:600}}>{n.codigo}</code></td>
                  <td style={{...tdS,fontWeight:600}}>{n.numeroNF || "—"}</td>
                  <td style={tdS}>{n.fornecedor}</td>
                  <td style={{...tdS,fontWeight:600,color:"#8b5cf6",whiteSpace:"nowrap"}}>{fmt(n.valorNF)}</td>
                  <td style={{...tdS,color:T.textSm}}>{n.dataEmissao || "—"}</td>
                  <td style={{...tdS,color:T.textSm}}>{n.dataEnvio || "—"}</td>
                  <td style={{...tdS,whiteSpace:"nowrap"}}>{n.jogoLabel}</td>
                  <td style={tdS}>{n.rodada}</td>
                  <td style={{...tdS,fontSize:10,color:T.textSm}}>{(n.servicosLabels||[]).join(", ")}</td>
                  <td style={tdS}>
                    {n.hasFile && <button onClick={() => downloadNF(n)} style={{...btnStyle,background:"#3b82f6",padding:"3px 8px",fontSize:10}}>Baixar</button>}
                  </td>
                </tr>
              ))}
              {notasPeriodo.length === 0 && (
                <tr><td colSpan={10} style={{padding:30,textAlign:"center",color:T.textSm}}>Nenhuma NF no período selecionado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
