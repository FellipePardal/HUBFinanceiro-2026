import { useState, useEffect } from "react";
import { CATS } from "../constants";
import { getState, getNFFile } from "../lib/supabase";

const T = { bg:"#f8fafc", card:"#fff", border:"#e2e8f0", muted:"#cbd5e1", text:"#1e293b", textMd:"#475569", textSm:"#64748b" };
const fmt = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const catTotal = (subs, cat) => cat.subs.reduce((s, sub) => s + (subs?.[sub.key]||0), 0);
const subTotal = subs => Object.values(subs||{}).reduce((s,v) => s+(v||0), 0);

export default function EnvioPublico({ numero }) {
  const [envio, setEnvio] = useState(null);
  const [jogos, setJogos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getState('envios'), getState('jogos'), getState('servicos')]).then(([ev, j, s]) => {
      const found = (ev || []).find(e => e.numero === numero);
      setEnvio(found || null);
      if (j) setJogos(j);
      if (s) setServicos(s);
      setLoading(false);
    });
  }, [numero]);

  const downloadNF = async (id, filename) => {
    const data = await getNFFile(id);
    if (!data) { alert("Arquivo não encontrado"); return; }
    const a = document.createElement("a"); a.href = data; a.download = filename; a.click();
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>
      <p style={{color:T.textMd,fontSize:16}}>Carregando...</p>
    </div>
  );

  if (!envio) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>
      <p style={{color:T.textMd,fontSize:16}}>Envio não encontrado</p>
    </div>
  );

  // Orçamento — pegar rodadas cobertas pelas NFs do envio
  const rodadasEnvio = Array.from(new Set((envio.notasResumo||[]).map(n => n.rodada).filter(Boolean)));
  const divulgados = jogos.filter(j => j.mandante !== "A definir");
  const jogosPeriodo = divulgados.filter(j => rodadasEnvio.includes(j.rodada));

  const totOrc = jogosPeriodo.reduce((s, j) => s + subTotal(j.orcado), 0);
  const totProv = jogosPeriodo.reduce((s, j) => s + subTotal(j.provisionado), 0);
  const totReal = jogosPeriodo.reduce((s, j) => s + subTotal(j.realizado), 0);
  const fixoOrc = servicos.reduce((s, sec) => s + sec.itens.reduce((t, i) => t + i.orcado, 0), 0);
  const fixoReal = servicos.reduce((s, sec) => s + sec.itens.reduce((t, i) => t + i.realizado, 0), 0);

  const catResumo = CATS.map(cat => ({
    label: cat.label, color: cat.color,
    orc: jogosPeriodo.reduce((s, j) => s + catTotal(j.orcado, cat), 0),
    prov: jogosPeriodo.reduce((s, j) => s + catTotal(j.provisionado, cat), 0),
    real: jogosPeriodo.reduce((s, j) => s + catTotal(j.realizado, cat), 0),
  }));

  const thS = { padding:"10px 14px", textAlign:"left", fontSize:11, color:T.textSm, borderBottom:`2px solid ${T.border}`, whiteSpace:"nowrap" };
  const tdS = { padding:"10px 14px", fontSize:12, borderBottom:`1px solid ${T.border}` };

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Inter',sans-serif",color:T.text}}>
      <style>{`@media print { .no-print{display:none!important} body{margin:0} @page{margin:12mm} }`}</style>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#166534,#15803d)",padding:"28px 24px",color:"#fff"}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
            <div>
              <p style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",margin:"0 0 6px",color:"#86efac"}}>FFU — Transmissões · Brasileirão 2026</p>
              <h1 style={{fontSize:24,fontWeight:700,margin:0}}>Envio {envio.numero}</h1>
              <p style={{fontSize:13,margin:"6px 0 0",color:"#bbf7d0"}}>
                {new Date(envio.criadoEm).toLocaleDateString("pt-BR")} · {envio.qtdNotas} nota{envio.qtdNotas!==1?"s":""} · {rodadasEnvio.length > 0 ? `Rodadas ${Math.min(...rodadasEnvio)}–${Math.max(...rodadasEnvio)}` : ""}
              </p>
              {envio.obs && <p style={{fontSize:12,margin:"4px 0 0",color:"#bbf7d0",fontStyle:"italic"}}>{envio.obs}</p>}
            </div>
            <div style={{textAlign:"right"}}>
              <p style={{fontSize:28,fontWeight:800,color:"#86efac",margin:0}}>{fmt(envio.totalGeral)}</p>
              <p style={{fontSize:11,color:"#bbf7d0",margin:"2px 0 0"}}>Valor total do envio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Botão imprimir */}
      <div style={{maxWidth:900,margin:"0 auto",padding:"16px 24px",textAlign:"right"}} className="no-print">
        <button onClick={() => window.print()} style={{background:"#166534",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",cursor:"pointer",fontWeight:600,fontSize:14}}>
          Imprimir / Salvar PDF
        </button>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"0 24px 48px"}}>

        {/* ── RETRATO DO ORÇAMENTO ── */}
        <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 16px",color:"#166534"}}>Retrato do Orçamento</h2>

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[
            {l:"Orçado",v:totOrc+fixoOrc,c:"#166534"},
            {l:"Provisionado",v:totProv,c:"#3b82f6"},
            {l:"Realizado",v:totReal+fixoReal,c:"#f59e0b"},
            {l:"Saving",v:(totOrc+fixoOrc)-(totReal+fixoReal),c:"#22c55e"},
          ].map(k => (
            <div key={k.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px",borderTop:`3px solid ${k.c}`}}>
              <p style={{fontSize:11,color:T.textSm,margin:"0 0 4px"}}>{k.l}</p>
              <p style={{fontSize:18,fontWeight:700,color:k.c,margin:0}}>{fmt(k.v)}</p>
            </div>
          ))}
        </div>

        <table style={{width:"100%",borderCollapse:"collapse",marginBottom:32,background:T.card,borderRadius:10,overflow:"hidden"}}>
          <thead><tr style={{background:"#f1f5f9"}}>
            {["Categoria","Orçado","Provisionado","Realizado","Saving","% Exec."].map(h =>
              <th key={h} style={{...thS,textAlign:h==="Categoria"?"left":"right"}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {catResumo.map(c => {
              const sv = c.orc - c.real;
              return (
                <tr key={c.label}>
                  <td style={{...tdS,fontWeight:600,color:c.color}}>{c.label}</td>
                  <td style={{...tdS,textAlign:"right"}}>{fmt(c.orc)}</td>
                  <td style={{...tdS,textAlign:"right",color:"#3b82f6"}}>{fmt(c.prov)}</td>
                  <td style={{...tdS,textAlign:"right",color:"#f59e0b"}}>{fmt(c.real)}</td>
                  <td style={{...tdS,textAlign:"right",fontWeight:600,color:sv>=0?"#22c55e":"#ef4444"}}>{fmt(sv)}</td>
                  <td style={{...tdS,textAlign:"right",color:T.textMd}}>{c.orc?(c.real/c.orc*100).toFixed(1):0}%</td>
                </tr>
              );
            })}
            <tr style={{background:"#f1f5f9",fontWeight:700}}>
              <td style={tdS}>TOTAL</td>
              <td style={{...tdS,textAlign:"right"}}>{fmt(totOrc)}</td>
              <td style={{...tdS,textAlign:"right",color:"#3b82f6"}}>{fmt(totProv)}</td>
              <td style={{...tdS,textAlign:"right",color:"#f59e0b"}}>{fmt(totReal)}</td>
              <td style={{...tdS,textAlign:"right",color:"#22c55e"}}>{fmt(totOrc-totReal)}</td>
              <td style={{...tdS,textAlign:"right"}}>{totOrc?(totReal/totOrc*100).toFixed(1):0}%</td>
            </tr>
          </tbody>
        </table>

        {/* ── NOTAS FISCAIS DE JOGOS ── */}
        {(envio.notasResumo||[]).length > 0 && (<>
          <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 16px",color:"#166534"}}>Notas Fiscais — Jogos</h2>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px",borderTop:"3px solid #22c55e"}}>
              <p style={{fontSize:11,color:T.textSm,margin:"0 0 4px"}}>Quantidade</p>
              <p style={{fontSize:18,fontWeight:700,color:"#22c55e",margin:0}}>{(envio.notasResumo||[]).length} notas</p>
            </div>
            <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px",borderTop:"3px solid #8b5cf6"}}>
              <p style={{fontSize:11,color:T.textSm,margin:"0 0 4px"}}>Valor Total</p>
              <p style={{fontSize:18,fontWeight:700,color:"#8b5cf6",margin:0}}>{fmt(envio.totalJogos)}</p>
            </div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",marginBottom:32,background:T.card,borderRadius:10,overflow:"hidden"}}>
            <thead><tr style={{background:"#f1f5f9"}}>
              {["Código","Nº NF","Fornecedor","Valor","Emissão","Jogo","Rd","Serviços",""].map(h => <th key={h} style={thS}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(envio.notasResumo||[]).map(n => (
                <tr key={n.id}>
                  <td style={tdS}><code style={{color:"#166534",fontSize:10,fontWeight:600}}>{n.codigo}</code></td>
                  <td style={{...tdS,fontWeight:600}}>{n.numeroNF||"—"}</td>
                  <td style={tdS}>{n.fornecedor}</td>
                  <td style={{...tdS,fontWeight:600,color:"#8b5cf6",whiteSpace:"nowrap"}}>{fmt(n.valorNF)}</td>
                  <td style={{...tdS,color:T.textSm}}>{n.dataEmissao||"—"}</td>
                  <td style={{...tdS,whiteSpace:"nowrap"}}>{n.jogoLabel}</td>
                  <td style={tdS}>{n.rodada}</td>
                  <td style={{...tdS,fontSize:10,color:T.textSm}}>{(n.servicosLabels||[]).join(", ")}</td>
                  <td style={tdS} className="no-print">
                    {n.hasFile && <button onClick={() => downloadNF(n.id, n.codigo)} style={{background:"#3b82f6",color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:10,fontWeight:600}}>Baixar</button>}
                  </td>
                </tr>
              ))}
              <tr style={{background:"#f1f5f9",fontWeight:700}}>
                <td colSpan={3} style={tdS}>TOTAL</td>
                <td style={{...tdS,color:"#8b5cf6"}}>{fmt(envio.totalJogos)}</td>
                <td colSpan={5}/>
              </tr>
            </tbody>
          </table>
        </>)}

        {/* ── NOTAS FISCAIS MENSAIS ── */}
        {(envio.mensaisResumo||[]).length > 0 && (<>
          <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 16px",color:"#166534"}}>Notas Fiscais — Mensais</h2>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px",borderTop:"3px solid #06b6d4"}}>
              <p style={{fontSize:11,color:T.textSm,margin:"0 0 4px"}}>Quantidade</p>
              <p style={{fontSize:18,fontWeight:700,color:"#06b6d4",margin:0}}>{(envio.mensaisResumo||[]).length} notas</p>
            </div>
            <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px",borderTop:"3px solid #8b5cf6"}}>
              <p style={{fontSize:11,color:T.textSm,margin:"0 0 4px"}}>Valor Total</p>
              <p style={{fontSize:18,fontWeight:700,color:"#8b5cf6",margin:0}}>{fmt(envio.totalMensais)}</p>
            </div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",marginBottom:32,background:T.card,borderRadius:10,overflow:"hidden"}}>
            <thead><tr style={{background:"#f1f5f9"}}>
              {["Fornecedor","Categoria","Mês","Nº NF","Valor","Emissão",""].map(h => <th key={h} style={thS}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(envio.mensaisResumo||[]).map(n => (
                <tr key={n.id}>
                  <td style={{...tdS,fontWeight:600}}>{n.fornecedor}</td>
                  <td style={tdS}><span style={{background:"#06b6d422",color:"#06b6d4",padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:600}}>{n.categoria}</span></td>
                  <td style={tdS}>{n.mesLabel}</td>
                  <td style={tdS}>{n.numeroNF||"—"}</td>
                  <td style={{...tdS,fontWeight:600,color:"#8b5cf6"}}>{fmt(n.valor)}</td>
                  <td style={{...tdS,color:T.textSm}}>{n.dataEmissao||"—"}</td>
                  <td style={tdS} className="no-print">
                    {n.hasFile && <button onClick={() => downloadNF(n.id, `NF_${n.fornecedor}`)} style={{background:"#3b82f6",color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:10,fontWeight:600}}>Baixar</button>}
                  </td>
                </tr>
              ))}
              <tr style={{background:"#f1f5f9",fontWeight:700}}>
                <td colSpan={4} style={tdS}>TOTAL</td>
                <td style={{...tdS,color:"#8b5cf6"}}>{fmt(envio.totalMensais)}</td>
                <td colSpan={2}/>
              </tr>
            </tbody>
          </table>
        </>)}

        <div style={{marginTop:32,paddingTop:16,borderTop:`1px solid ${T.border}`,fontSize:11,color:T.textSm,textAlign:"center"}}>
          FFU — Transmissões · Brasileirão Série A 2026 · Envio {envio.numero} · Gerado em {new Date(envio.criadoEm).toLocaleDateString("pt-BR")}
        </div>
      </div>
    </div>
  );
}
