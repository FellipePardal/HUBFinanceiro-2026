import { useState, useEffect } from "react";
import { CATS } from "../constants";
import { getState, getNFFile } from "../lib/supabase";

const T = { bg:"#fff", card:"#f8fafc", border:"#e2e8f0", muted:"#cbd5e1", text:"#1e293b", textMd:"#475569", textSm:"#64748b" };
const fmt = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const SUBS_MENSAL = new Set(["transporte","uber","hospedagem","seg_espacial"]);
const catTotal = (subs, cat) => cat.subs.reduce((s, sub) => s + (subs?.[sub.key]||0), 0);
const subTotal = subs => Object.values(subs||{}).reduce((s,v) => s+(v||0), 0);

export default function RelatorioEnvio() {
  const [jogos, setJogos] = useState([]);
  const [notas, setNotas] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rodadaDe, setRodadaDe] = useState(1);
  const [rodadaAte, setRodadaAte] = useState(8);

  useEffect(() => {
    Promise.all([getState('jogos'), getState('notas'), getState('servicos')]).then(([j, n, s]) => {
      if (j) setJogos(j);
      if (n) setNotas(n);
      if (s) setServicos(s);
      setLoading(false);
    });
  }, []);

  const divulgados = jogos.filter(j => j.mandante !== "A definir");
  const rodadas = Array.from(new Set(divulgados.map(j => j.rodada))).sort((a, b) => a - b);
  const jogosPeriodo = divulgados.filter(j => j.rodada >= rodadaDe && j.rodada <= rodadaAte);
  const notasPeriodo = notas.filter(n => n.rodada >= rodadaDe && n.rodada <= rodadaAte);

  // Orçamento resumo
  const totOrc = jogosPeriodo.reduce((s, j) => s + subTotal(j.orcado), 0);
  const totProv = jogosPeriodo.reduce((s, j) => s + subTotal(j.provisionado), 0);
  const totReal = jogosPeriodo.reduce((s, j) => s + subTotal(j.realizado), 0);

  const catResumo = CATS.map(cat => ({
    label: cat.label, color: cat.color,
    orc: jogosPeriodo.reduce((s, j) => s + catTotal(j.orcado, cat), 0),
    prov: jogosPeriodo.reduce((s, j) => s + catTotal(j.provisionado, cat), 0),
    real: jogosPeriodo.reduce((s, j) => s + catTotal(j.realizado, cat), 0),
  }));

  // Serviços fixos
  const fixoOrc = servicos.reduce((s, sec) => s + sec.itens.reduce((t, i) => t + i.orcado, 0), 0);
  const fixoReal = servicos.reduce((s, sec) => s + sec.itens.reduce((t, i) => t + i.realizado, 0), 0);

  const totalNFValor = notasPeriodo.reduce((s, n) => s + (n.valorNF || 0), 0);

  const downloadNF = async (nota) => {
    const data = await getNFFile(nota.id);
    if (!data) { alert("Arquivo não encontrado"); return; }
    const a = document.createElement("a");
    a.href = data; a.download = nota.codigo || `NF_${nota.id}`; a.click();
  };

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>
      <p style={{color:"#666",fontSize:16}}>Carregando...</p>
    </div>
  );

  const thS = { padding:"8px 12px", textAlign:"left", fontSize:11, color:T.textSm, borderBottom:`2px solid ${T.border}`, whiteSpace:"nowrap" };
  const tdS = { padding:"8px 12px", fontSize:12, borderBottom:`1px solid ${T.border}` };

  return (
    <div style={{minHeight:"100vh",background:"#fff",fontFamily:"'Inter',sans-serif",color:T.text}}>
      {/* Header — não imprime os controles */}
      <div style={{background:"linear-gradient(135deg,#166534,#15803d)",padding:"20px 24px",color:"#fff"}} className="no-print-bg">
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <p style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",margin:"0 0 4px",color:"#86efac"}}>FFU — Transmissões</p>
          <h1 style={{fontSize:20,fontWeight:700,margin:0}}>Relatório de Envio — Brasileirão 2026</h1>
          <p style={{fontSize:12,margin:"4px 0 0",color:"#bbf7d0"}}>Rodadas {rodadaDe} a {rodadaAte} · {jogosPeriodo.length} jogos · {notasPeriodo.length} notas fiscais</p>
        </div>
      </div>

      {/* Controles — só na tela */}
      <div style={{maxWidth:900,margin:"0 auto",padding:"16px 24px",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}} className="no-print">
        <span style={{fontSize:13,fontWeight:600,color:T.textMd}}>Período:</span>
        <select value={rodadaDe} onChange={e => setRodadaDe(parseInt(e.target.value))} style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}}>
          {rodadas.map(r => <option key={r} value={r}>Rodada {r}</option>)}
        </select>
        <span style={{color:T.textSm}}>até</span>
        <select value={rodadaAte} onChange={e => setRodadaAte(parseInt(e.target.value))} style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${T.border}`,fontSize:13}}>
          {rodadas.filter(r => r >= rodadaDe).map(r => <option key={r} value={r}>Rodada {r}</option>)}
        </select>
        <div style={{flex:1}}/>
        <button onClick={() => window.print()} style={{background:"#166534",color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontWeight:600,fontSize:13}}>
          Imprimir / Salvar PDF
        </button>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"0 24px 40px"}}>

        {/* ── RETRATO DO ORÇAMENTO ── */}
        <h2 style={{fontSize:15,fontWeight:700,margin:"24px 0 12px",color:T.text,borderBottom:`2px solid #166534`,paddingBottom:6}}>1. Retrato do Orçamento</h2>

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
          {[{l:"Orçado",v:totOrc+fixoOrc,c:"#166534"},{l:"Provisionado",v:totProv,c:"#3b82f6"},{l:"Realizado",v:totReal+fixoReal,c:"#f59e0b"},{l:"Saldo",v:(totOrc+fixoOrc)-(totReal+fixoReal),c:"#22c55e"}].map(k => (
            <div key={k.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px",borderTop:`3px solid ${k.c}`}}>
              <p style={{fontSize:10,color:T.textSm,margin:"0 0 4px"}}>{k.l}</p>
              <p style={{fontSize:16,fontWeight:700,color:k.c,margin:0}}>{fmt(k.v)}</p>
            </div>
          ))}
        </div>

        <table style={{width:"100%",borderCollapse:"collapse",marginBottom:24}}>
          <thead><tr>
            {["Categoria","Orçado","Provisionado","Realizado","Saving"].map(h => <th key={h} style={{...thS,textAlign:h==="Categoria"?"left":"right"}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {catResumo.map(c => (
              <tr key={c.label}>
                <td style={{...tdS,fontWeight:600,color:c.color}}>{c.label}</td>
                <td style={{...tdS,textAlign:"right"}}>{fmt(c.orc)}</td>
                <td style={{...tdS,textAlign:"right",color:"#3b82f6"}}>{fmt(c.prov)}</td>
                <td style={{...tdS,textAlign:"right",color:"#f59e0b"}}>{fmt(c.real)}</td>
                <td style={{...tdS,textAlign:"right",fontWeight:600,color:c.orc-c.real>=0?"#22c55e":"#ef4444"}}>{fmt(c.orc-c.real)}</td>
              </tr>
            ))}
            <tr style={{fontWeight:700,background:T.card}}>
              <td style={{...tdS}}>TOTAL VARIÁVEL</td>
              <td style={{...tdS,textAlign:"right"}}>{fmt(totOrc)}</td>
              <td style={{...tdS,textAlign:"right",color:"#3b82f6"}}>{fmt(totProv)}</td>
              <td style={{...tdS,textAlign:"right",color:"#f59e0b"}}>{fmt(totReal)}</td>
              <td style={{...tdS,textAlign:"right",color:"#22c55e"}}>{fmt(totOrc-totReal)}</td>
            </tr>
          </tbody>
        </table>

        {/* ── CONTROLE DE NOTAS FISCAIS ── */}
        <h2 style={{fontSize:15,fontWeight:700,margin:"24px 0 12px",color:T.text,borderBottom:`2px solid #166534`,paddingBottom:6}}>2. Controle de Notas Fiscais</h2>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px",borderTop:"3px solid #8b5cf6"}}>
            <p style={{fontSize:10,color:T.textSm,margin:"0 0 4px"}}>Total NFs no período</p>
            <p style={{fontSize:16,fontWeight:700,color:"#8b5cf6",margin:0}}>{notasPeriodo.length} notas</p>
          </div>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px",borderTop:"3px solid #06b6d4"}}>
            <p style={{fontSize:10,color:T.textSm,margin:"0 0 4px"}}>Valor Total NFs</p>
            <p style={{fontSize:16,fontWeight:700,color:"#06b6d4",margin:0}}>{fmt(totalNFValor)}</p>
          </div>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px",borderTop:"3px solid #22c55e"}}>
            <p style={{fontSize:10,color:T.textSm,margin:"0 0 4px"}}>Rodadas cobertas</p>
            <p style={{fontSize:16,fontWeight:700,color:"#22c55e",margin:0}}>{rodadaDe}–{rodadaAte}</p>
          </div>
        </div>

        <table style={{width:"100%",borderCollapse:"collapse",marginBottom:16}}>
          <thead><tr>
            {["Código","Nº NF","Fornecedor","Valor","Emissão","Envio","Jogo","Rd","Serviços"].map(h =>
              <th key={h} style={thS}>{h}</th>)}
          </tr></thead>
          <tbody>
            {notasPeriodo.map(n => (
              <tr key={n.id}>
                <td style={{...tdS,fontFamily:"monospace",fontSize:10,color:"#166534",fontWeight:600}}>{n.codigo}</td>
                <td style={{...tdS,fontWeight:600}}>{n.numeroNF || "—"}</td>
                <td style={tdS}>{n.fornecedor}</td>
                <td style={{...tdS,fontWeight:600,color:"#8b5cf6",whiteSpace:"nowrap"}}>{fmt(n.valorNF)}</td>
                <td style={{...tdS,color:T.textSm}}>{n.dataEmissao || "—"}</td>
                <td style={{...tdS,color:T.textSm}}>{n.dataEnvio || "—"}</td>
                <td style={{...tdS,whiteSpace:"nowrap"}}>{n.jogoLabel}</td>
                <td style={tdS}>{n.rodada}</td>
                <td style={{...tdS,fontSize:10,color:T.textSm}}>{(n.servicosLabels||[]).join(", ")}</td>
              </tr>
            ))}
            {notasPeriodo.length > 0 && (
              <tr style={{fontWeight:700,background:T.card}}>
                <td colSpan={3} style={tdS}>TOTAL</td>
                <td style={{...tdS,color:"#8b5cf6"}}>{fmt(totalNFValor)}</td>
                <td colSpan={5}/>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── ARQUIVOS PARA DOWNLOAD ── */}
        <h2 style={{fontSize:15,fontWeight:700,margin:"24px 0 12px",color:T.text,borderBottom:`2px solid #166534`,paddingBottom:6}} className="no-print">3. Arquivos das Notas Fiscais</h2>

        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}} className="no-print">
          {notasPeriodo.filter(n => n.hasFile).map(n => (
            <button key={n.id} onClick={() => downloadNF(n)}
              style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:T.text}}>{n.fornecedor}</div>
                <div style={{fontSize:10,color:T.textSm,fontFamily:"monospace"}}>{n.codigo}</div>
              </div>
              <span style={{fontSize:11,color:"#3b82f6",fontWeight:600}}>Baixar</span>
            </button>
          ))}
          {notasPeriodo.filter(n => n.hasFile).length === 0 && (
            <p style={{color:T.textSm,fontSize:12,gridColumn:"1/-1"}}>Nenhum arquivo anexo no período</p>
          )}
        </div>

        <div style={{marginTop:40,paddingTop:16,borderTop:`1px solid ${T.border}`,fontSize:10,color:T.textSm,textAlign:"center"}}>
          FFU — Transmissões · Brasileirão Série A 2026 · Gerado em {new Date().toLocaleDateString("pt-BR")}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .no-print-bg { background: #166534 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { margin: 0; }
          @page { margin: 10mm; }
        }
      `}</style>
    </div>
  );
}
