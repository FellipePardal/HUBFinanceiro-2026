import { useState, useEffect } from "react";
import { getState, setState, getNFFile } from "../lib/supabase";

const T = { bg:"#f8fafc", card:"#fff", border:"#e2e8f0", muted:"#cbd5e1", text:"#1e293b", textMd:"#475569", textSm:"#64748b" };
const fmt = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});

export default function EnvioPublico({ numero }) {
  const [envio, setEnvio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    getState('envios').then(ev => {
      setEnvio((ev || []).find(e => e.numero === numero) || null);
      setLoading(false);
    });
  }, [numero]);

  const confirmarPagamento = async () => {
    setPaying(true);
    try {
      // Re-busca a lista mais recente pra evitar sobrescrever outras alterações
      const todosEnvios = (await getState('envios')) || [];
      const hoje = new Date();
      const dataHoje = hoje.toLocaleDateString("pt-BR");
      const atualizado = todosEnvios.map(e => e.numero === numero
        ? {...e, pago:true, pagoEm:hoje.toISOString(), pagoPor:(payerName||"").trim() || null, dataPagamentoEfetiva:dataHoje}
        : e
      );
      await setState('envios', atualizado);
      setEnvio(atualizado.find(e => e.numero === numero) || null);
      setShowConfirm(false);
      setPayerName("");
    } catch (e) {
      alert("Erro ao confirmar pagamento: " + e.message);
    }
    setPaying(false);
  };

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
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <h1 style={{fontSize:24,fontWeight:700,margin:0}}>Envio {envio.numero}</h1>
                <span style={{background:envio.pago?"#22c55e":"#ef4444",color:"#fff",borderRadius:8,padding:"4px 12px",fontSize:11,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase"}}>
                  {envio.pago?"Pago":"Aguardando Pgto"}
                </span>
              </div>
              <p style={{fontSize:13,margin:"6px 0 0",color:"#bbf7d0"}}>
                {new Date(envio.criadoEm).toLocaleDateString("pt-BR")} · {envio.qtdNotas} nota{envio.qtdNotas!==1?"s":""}
              </p>
              {envio.dataPagamento && <p style={{fontSize:12,margin:"4px 0 0",color:"#86efac",fontWeight:600}}>Pagamento previsto: {envio.dataPagamento}</p>}
              {envio.pago && (envio.dataPagamentoEfetiva || envio.pagoPor) && (
                <p style={{fontSize:12,margin:"4px 0 0",color:"#86efac",fontWeight:600}}>
                  Pago{envio.dataPagamentoEfetiva?` em ${envio.dataPagamentoEfetiva}`:""}{envio.pagoPor?` por ${envio.pagoPor}`:""}
                </p>
              )}
              {envio.obs && <p style={{fontSize:12,margin:"4px 0 0",color:"#bbf7d0",fontStyle:"italic"}}>{envio.obs}</p>}
              {!envio.pago && (
                <button onClick={()=>setShowConfirm(true)} className="no-print" style={{marginTop:12,background:"#fff",color:"#166534",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700,fontSize:13,boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>
                  ✓ Confirmar Pagamento
                </button>
              )}
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

        {/* Resumo */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
          {envio.totalJogos > 0 && (
            <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px",borderTop:"3px solid #22c55e"}}>
              <p style={{fontSize:11,color:T.textSm,margin:"0 0 4px"}}>NFs de Jogos</p>
              <p style={{fontSize:18,fontWeight:700,color:"#22c55e",margin:0}}>{fmt(envio.totalJogos)}</p>
              <p style={{fontSize:11,color:T.textSm,margin:"4px 0 0"}}>{(envio.notasResumo||[]).length} notas</p>
            </div>
          )}
          {envio.totalMensais > 0 && (
            <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px",borderTop:"3px solid #06b6d4"}}>
              <p style={{fontSize:11,color:T.textSm,margin:"0 0 4px"}}>NFs Mensais</p>
              <p style={{fontSize:18,fontWeight:700,color:"#06b6d4",margin:0}}>{fmt(envio.totalMensais)}</p>
              <p style={{fontSize:11,color:T.textSm,margin:"4px 0 0"}}>{(envio.mensaisResumo||[]).length} notas</p>
            </div>
          )}
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px",borderTop:"3px solid #8b5cf6"}}>
            <p style={{fontSize:11,color:T.textSm,margin:"0 0 4px"}}>Total do Envio</p>
            <p style={{fontSize:18,fontWeight:700,color:"#8b5cf6",margin:0}}>{fmt(envio.totalGeral)}</p>
            <p style={{fontSize:11,color:T.textSm,margin:"4px 0 0"}}>{envio.qtdNotas} notas</p>
          </div>
        </div>

        {/* ── NOTAS FISCAIS DE JOGOS ── */}
        {(envio.notasResumo||[]).length > 0 && (<>
          <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 16px",color:"#166534"}}>Notas Fiscais — Jogos</h2>
          <table style={{width:"100%",borderCollapse:"collapse",marginBottom:32,background:T.card,borderRadius:10,overflow:"hidden"}}>
            <thead><tr style={{background:"#f1f5f9"}}>
              {["Código","Nº NF","Fornecedor","Valor","Emissão","Data Pgto","Jogo","Rd","Serviços",""].map(h => <th key={h} style={thS}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(envio.notasResumo||[]).map(n => (
                <tr key={n.id}>
                  <td style={tdS}><code style={{color:"#166534",fontSize:10,fontWeight:600}}>{n.codigo}</code></td>
                  <td style={{...tdS,fontWeight:600}}>{n.numeroNF||"—"}</td>
                  <td style={tdS}>{n.fornecedor}</td>
                  <td style={{...tdS,fontWeight:600,color:"#8b5cf6",whiteSpace:"nowrap"}}>{fmt(n.valorNF)}</td>
                  <td style={{...tdS,color:T.textSm}}>{n.dataEmissao||"—"}</td>
                  <td style={{...tdS,color:T.textSm}}>{n.dataPagamento||"—"}</td>
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
                <td colSpan={6}/>
              </tr>
            </tbody>
          </table>
        </>)}

        {/* ── NOTAS FISCAIS MENSAIS ── */}
        {(envio.mensaisResumo||[]).length > 0 && (<>
          <h2 style={{fontSize:16,fontWeight:700,margin:"0 0 16px",color:"#166534"}}>Notas Fiscais — Mensais</h2>
          <table style={{width:"100%",borderCollapse:"collapse",marginBottom:32,background:T.card,borderRadius:10,overflow:"hidden"}}>
            <thead><tr style={{background:"#f1f5f9"}}>
              {["Fornecedor","Categoria","Mês","Nº NF","Valor","Emissão","Data Pgto",""].map(h => <th key={h} style={thS}>{h}</th>)}
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
                  <td style={{...tdS,color:T.textSm}}>{n.dataPagamento||"—"}</td>
                  <td style={tdS} className="no-print">
                    {n.hasFile && <button onClick={() => downloadNF(n.id, `NF_${n.fornecedor}`)} style={{background:"#3b82f6",color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:10,fontWeight:600}}>Baixar</button>}
                  </td>
                </tr>
              ))}
              <tr style={{background:"#f1f5f9",fontWeight:700}}>
                <td colSpan={4} style={tdS}>TOTAL</td>
                <td style={{...tdS,color:"#8b5cf6"}}>{fmt(envio.totalMensais)}</td>
                <td colSpan={3}/>
              </tr>
            </tbody>
          </table>
        </>)}

        <div style={{marginTop:32,paddingTop:16,borderTop:`1px solid ${T.border}`,fontSize:11,color:T.textSm,textAlign:"center"}}>
          FFU — Transmissões · Brasileirão Série A 2026 · Envio {envio.numero} · {new Date(envio.criadoEm).toLocaleDateString("pt-BR")}
        </div>
      </div>

      {showConfirm && (
        <div className="no-print" style={{position:"fixed",inset:0,background:"#00000099",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:T.card,borderRadius:14,padding:28,maxWidth:440,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <h3 style={{margin:"0 0 8px",fontSize:18,color:T.text}}>Confirmar Pagamento</h3>
            <p style={{margin:"0 0 6px",color:T.textMd,fontSize:13}}>
              Você está prestes a marcar o <b>Envio {envio.numero}</b> como pago.
            </p>
            <p style={{margin:"0 0 18px",color:T.textMd,fontSize:13}}>
              Valor total: <b style={{color:"#166534"}}>{fmt(envio.totalGeral)}</b> · {envio.qtdNotas} nota{envio.qtdNotas!==1?"s":""}
            </p>
            <div style={{marginBottom:18}}>
              <label style={{display:"block",fontSize:11,color:T.textSm,textTransform:"uppercase",letterSpacing:1,marginBottom:6,fontWeight:600}}>Seu nome (opcional)</label>
              <input value={payerName} onChange={e=>setPayerName(e.target.value)} placeholder="Ex: Maria Silva"
                style={{width:"100%",boxSizing:"border-box",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:T.text,background:T.bg}}/>
              <p style={{margin:"6px 0 0",fontSize:11,color:T.textSm}}>Para registro de quem confirmou o pagamento.</p>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowConfirm(false);setPayerName("");}} disabled={paying}
                style={{background:T.border,color:T.text,border:"none",borderRadius:8,padding:"10px 18px",cursor:"pointer",fontWeight:600,fontSize:13,opacity:paying?0.5:1}}>
                Cancelar
              </button>
              <button onClick={confirmarPagamento} disabled={paying}
                style={{background:paying?"#1f3d24":"#166534",color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",cursor:paying?"default":"pointer",fontWeight:700,fontSize:13}}>
                {paying ? "Confirmando..." : "✓ Confirmar Pagamento"}
              </button>
            </div>
            <p style={{margin:"14px 0 0",fontSize:11,color:T.textSm,textAlign:"center"}}>
              Esta ação só pode ser revertida pela equipe administrativa.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
