import { useState } from "react";
import { KPI, Pill } from "../shared";
import { fmt, subTotal } from "../../utils";
import { CATS, btnStyle, iSty } from "../../constants";
import { getNFFile } from "../../lib/supabase";

const catTotal = (subs, cat) => cat.subs.reduce((s, sub) => s + (subs?.[sub.key]||0), 0);

export default function TabEnvio({ jogos, notas, notasMensais, servicos, envios, setEnvios, T }) {
  const [view, setView] = useState("lista"); // "lista" | "novo" | "detalhe"
  const [envioDetalhe, setEnvioDetalhe] = useState(null);

  // Novo envio state
  const [selJogosNFs, setSelJogosNFs] = useState(new Set());
  const [selMensaisNFs, setSelMensaisNFs] = useState(new Set());
  const [obs, setObs] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");

  const IS = iSty(T);
  const divulgados = jogos.filter(j => j.mandante !== "A definir");

  // NFs que já foram enviadas em algum envio
  const nfsEnviadas = new Set(envios.flatMap(e => [...(e.notasIds||[]), ...(e.mensaisIds||[])]));

  // NFs disponíveis (não enviadas ainda)
  const nfsDisponiveis = notas.filter(n => !nfsEnviadas.has(n.id));
  const mensaisDisponiveis = notasMensais.filter(n => !nfsEnviadas.has(n.id));

  const toggleJogoNF = id => setSelJogosNFs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleMensalNF = id => setSelMensaisNFs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAllJogos = () => setSelJogosNFs(new Set(nfsDisponiveis.map(n => n.id)));
  const selectAllMensais = () => setSelMensaisNFs(new Set(mensaisDisponiveis.map(n => n.id)));

  const selJogosArr = notas.filter(n => selJogosNFs.has(n.id));
  const selMensaisArr = notasMensais.filter(n => selMensaisNFs.has(n.id));
  const totalSelValor = selJogosArr.reduce((s, n) => s + (n.valorNF||0), 0) + selMensaisArr.reduce((s, n) => s + (n.valor||0), 0);

  const criarEnvio = () => {
    if (selJogosNFs.size === 0 && selMensaisNFs.size === 0) return;
    const numero = envios.length + 1;
    const novo = {
      id: Date.now(),
      numero,
      criadoEm: new Date().toISOString(),
      dataPagamento,
      obs,
      notasIds: [...selJogosNFs],
      mensaisIds: [...selMensaisNFs],
      notasResumo: selJogosArr.map(n => ({id:n.id,codigo:n.codigo,fornecedor:n.fornecedor,valorNF:n.valorNF,numeroNF:n.numeroNF,jogoLabel:n.jogoLabel,rodada:n.rodada,servicosLabels:n.servicosLabels,dataEmissao:n.dataEmissao,dataPagamento,hasFile:n.hasFile})),
      mensaisResumo: selMensaisArr.map(n => ({id:n.id,fornecedor:n.fornecedor,valor:n.valor,numeroNF:n.numeroNF,categoria:n.categoria,mesLabel:n.mesLabel,dataEmissao:n.dataEmissao,dataPagamento,hasFile:n.hasFile})),
      totalJogos: selJogosArr.reduce((s, n) => s + (n.valorNF||0), 0),
      totalMensais: selMensaisArr.reduce((s, n) => s + (n.valor||0), 0),
      totalGeral: totalSelValor,
      qtdNotas: selJogosNFs.size + selMensaisNFs.size,
    };
    setEnvios(ev => [...ev, novo]);
    setView("lista");
    setSelJogosNFs(new Set());
    setSelMensaisNFs(new Set());
    setObs("");
    setDataPagamento("");
  };

  const excluirEnvio = (id) => {
    if (!window.confirm("Excluir este envio? As NFs voltarão a ficar disponíveis.")) return;
    setEnvios(ev => ev.filter(e => e.id !== id));
  };

  const downloadNF = async (notaId, filename) => {
    const data = await getNFFile(notaId);
    if (!data) { alert("Arquivo não encontrado"); return; }
    const a = document.createElement("a"); a.href = data; a.download = filename; a.click();
  };

  const copyEnvioPlanilha = (envio) => {
    const header = "Tipo\tCódigo\tNº NF\tFornecedor\tValor\tEmissão\tData Pgto\tJogo/Mês\tRodada\tServiços";
    const jogosRows = (envio.notasResumo||[]).map(n =>
      `Jogo\t${n.codigo}\t${n.numeroNF}\t${n.fornecedor}\t${n.valorNF||0}\t${n.dataEmissao}\t${n.dataPagamento||""}\t${n.jogoLabel}\t${n.rodada}\t${(n.servicosLabels||[]).join(", ")}`
    );
    const mensaisRows = (envio.mensaisResumo||[]).map(n =>
      `Mensal\t—\t${n.numeroNF}\t${n.fornecedor}\t${n.valor||0}\t${n.dataEmissao}\t${n.dataPagamento||""}\t${n.mesLabel} · ${n.categoria}\t—\t${n.categoria}`
    );
    navigator.clipboard.writeText([header, ...jogosRows, ...mensaisRows].join("\n"));
    alert("Planilha copiada!");
  };

  // KPIs gerais
  const totalEnvios = envios.length;
  const totalNFsEnviadas = envios.reduce((s, e) => s + e.qtdNotas, 0);
  const totalValorEnviado = envios.reduce((s, e) => s + e.totalGeral, 0);

  const thS = { padding:"8px 12px", textAlign:"left", fontSize:11, color:T.textSm, whiteSpace:"nowrap" };
  const tdS = { padding:"8px 12px", fontSize:12 };

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <KPI label="Total Envios" value={String(totalEnvios)} sub="Pacotes enviados" color="#8b5cf6" T={T}/>
        <KPI label="NFs Enviadas" value={String(totalNFsEnviadas)} sub="Jogos + Mensais" color="#22c55e" T={T}/>
        <KPI label="Valor Enviado" value={fmt(totalValorEnviado)} sub="Acumulado" color="#06b6d4" T={T}/>
        <KPI label="Pendentes" value={String(nfsDisponiveis.length + mensaisDisponiveis.length)} sub="Não enviadas" color="#f59e0b" T={T}/>
      </div>

      {/* ── LISTA DE ENVIOS ── */}
      {view === "lista" && (<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{color:T.textMd,fontSize:13,fontWeight:600}}>{envios.length} envio{envios.length!==1?"s":""}</span>
          <button onClick={() => setView("novo")} style={{...btnStyle,background:"#8b5cf6",fontSize:12}}>+ Novo Envio</button>
        </div>

        {envios.length === 0 && (
          <div style={{background:T.card,borderRadius:12,padding:40,textAlign:"center"}}>
            <p style={{color:T.textSm,fontSize:13,margin:0}}>Nenhum envio realizado ainda</p>
            <p style={{color:T.textSm,fontSize:11,margin:"8px 0 0"}}>Clique em "+ Novo Envio" para montar seu primeiro pacote</p>
          </div>
        )}

        {[...envios].reverse().map(envio => (
          <div key={envio.id} style={{background:T.card,borderRadius:12,padding:"16px 20px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{background:"#8b5cf6",color:"#fff",borderRadius:8,padding:"4px 12px",fontSize:14,fontWeight:700}}>Envio {envio.numero}</span>
                <span style={{color:T.textSm,fontSize:12}}>{new Date(envio.criadoEm).toLocaleDateString("pt-BR")}</span>
                <span style={{color:T.textMd,fontSize:12}}>{envio.qtdNotas} nota{envio.qtdNotas!==1?"s":""}</span>
              </div>
              <span style={{color:"#06b6d4",fontWeight:700,fontSize:16}}>{fmt(envio.totalGeral)}</span>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
              {envio.totalJogos > 0 && <Pill label={`Jogos: ${fmt(envio.totalJogos)}`} color="#22c55e"/>}
              {envio.totalMensais > 0 && <Pill label={`Mensais: ${fmt(envio.totalMensais)}`} color="#06b6d4"/>}
              {envio.dataPagamento && <Pill label={`Pgto: ${envio.dataPagamento}`} color="#8b5cf6"/>}
              {envio.obs && <span style={{color:T.textSm,fontSize:11}}>Obs: {envio.obs}</span>}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={() => { setEnvioDetalhe(envio); setView("detalhe"); }} style={{...btnStyle,background:"#3b82f6",padding:"5px 16px",fontSize:11}}>Ver detalhes</button>
              <button onClick={() => { const url = `${window.location.origin}${window.location.pathname}#envio/${envio.numero}`; navigator.clipboard.writeText(url); alert("Link copiado!\n"+url); }}
                style={{...btnStyle,background:"#8b5cf6",padding:"5px 16px",fontSize:11}}>Compartilhar link</button>
              <button onClick={() => window.open(`#envio/${envio.numero}`,"_blank")} style={{...btnStyle,background:"#166534",padding:"5px 16px",fontSize:11}}>Abrir página</button>
              <button onClick={() => excluirEnvio(envio.id)} style={{...btnStyle,background:"#7f1d1d",padding:"5px 16px",fontSize:11}}>Excluir</button>
            </div>
          </div>
        ))}
      </>)}

      {/* ── NOVO ENVIO ── */}
      {view === "novo" && (<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{margin:0,fontSize:16,color:T.text}}>Novo Envio — Envio {envios.length + 1}</h3>
          <button onClick={() => setView("lista")} style={{...btnStyle,background:"#475569",padding:"6px 16px",fontSize:12}}>Cancelar</button>
        </div>

        {/* NFs de Jogos */}
        <div style={{background:T.card,borderRadius:12,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"12px 20px",background:T.bg,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:700,fontSize:14,color:"#22c55e"}}>NFs de Jogos ({nfsDisponiveis.length} disponíveis)</span>
            <div style={{display:"flex",gap:6}}>
              <button onClick={selectAllJogos} style={{...btnStyle,background:T.border,padding:"3px 10px",fontSize:10,color:T.text}}>Selecionar todas</button>
              <span style={{color:T.textMd,fontSize:12,padding:"3px 0"}}>{selJogosNFs.size} selecionada{selJogosNFs.size!==1?"s":""}</span>
            </div>
          </div>
          {nfsDisponiveis.length === 0 ? (
            <p style={{color:T.textSm,fontSize:12,padding:16,margin:0}}>Todas as NFs de jogos já foram enviadas</p>
          ) : (
            <div style={{maxHeight:300,overflowY:"auto"}}>
              {nfsDisponiveis.map(n => {
                const sel = selJogosNFs.has(n.id);
                return (
                  <div key={n.id} onClick={() => toggleJogoNF(n.id)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"8px 20px",cursor:"pointer",borderTop:`1px solid ${T.border}`,background:sel?"#22c55e11":"transparent"}}>
                    <input type="checkbox" checked={sel} readOnly/>
                    <span style={{flex:1,fontSize:12,color:T.text,fontWeight:600}}>{n.fornecedor}</span>
                    <span style={{fontSize:11,color:T.textSm}}>{n.jogoLabel}</span>
                    <Pill label={`Rd ${n.rodada}`} color="#f59e0b"/>
                    <span style={{fontSize:12,color:"#8b5cf6",fontWeight:600,minWidth:80,textAlign:"right"}}>{fmt(n.valorNF)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* NFs Mensais */}
        <div style={{background:T.card,borderRadius:12,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"12px 20px",background:T.bg,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:700,fontSize:14,color:"#06b6d4"}}>NFs Mensais ({mensaisDisponiveis.length} disponíveis)</span>
            <div style={{display:"flex",gap:6}}>
              <button onClick={selectAllMensais} style={{...btnStyle,background:T.border,padding:"3px 10px",fontSize:10,color:T.text}}>Selecionar todas</button>
              <span style={{color:T.textMd,fontSize:12,padding:"3px 0"}}>{selMensaisNFs.size} selecionada{selMensaisNFs.size!==1?"s":""}</span>
            </div>
          </div>
          {mensaisDisponiveis.length === 0 ? (
            <p style={{color:T.textSm,fontSize:12,padding:16,margin:0}}>Todas as NFs mensais já foram enviadas</p>
          ) : (
            <div style={{maxHeight:300,overflowY:"auto"}}>
              {mensaisDisponiveis.map(n => {
                const sel = selMensaisNFs.has(n.id);
                return (
                  <div key={n.id} onClick={() => toggleMensalNF(n.id)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"8px 20px",cursor:"pointer",borderTop:`1px solid ${T.border}`,background:sel?"#06b6d411":"transparent"}}>
                    <input type="checkbox" checked={sel} readOnly/>
                    <span style={{flex:1,fontSize:12,color:T.text,fontWeight:600}}>{n.fornecedor}</span>
                    <Pill label={n.mesLabel} color="#06b6d4"/>
                    <Pill label={n.categoria} color="#f59e0b"/>
                    <span style={{fontSize:12,color:"#8b5cf6",fontWeight:600,minWidth:80,textAlign:"right"}}>{fmt(n.valor)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Data pagamento + Obs */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12,marginBottom:16}}>
          <div>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Data de Pagamento</label>
            <input value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} placeholder="dd/mm/aaaa" style={IS}/>
          </div>
          <div>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Observações (opcional)</label>
            <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: Inclui NF atrasada da Rd 8" style={IS}/>
          </div>
        </div>

        {/* Resumo + Criar */}
        <div style={{background:T.card,borderRadius:12,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <div>
            <span style={{color:T.textMd,fontSize:13}}>{selJogosNFs.size + selMensaisNFs.size} nota{selJogosNFs.size+selMensaisNFs.size!==1?"s":""} selecionada{selJogosNFs.size+selMensaisNFs.size!==1?"s":""}</span>
            <span style={{color:"#06b6d4",fontWeight:700,fontSize:16,marginLeft:16}}>{fmt(totalSelValor)}</span>
          </div>
          <button onClick={criarEnvio} disabled={selJogosNFs.size+selMensaisNFs.size===0}
            style={{...btnStyle,background:selJogosNFs.size+selMensaisNFs.size>0?"#8b5cf6":"#475569",padding:"10px 28px",fontSize:14,
              opacity:selJogosNFs.size+selMensaisNFs.size>0?1:0.5}}>
            Criar Envio {envios.length + 1}
          </button>
        </div>
      </>)}

      {/* ── DETALHE DO ENVIO ── */}
      {view === "detalhe" && envioDetalhe && (<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{background:"#8b5cf6",color:"#fff",borderRadius:8,padding:"4px 14px",fontSize:16,fontWeight:700}}>Envio {envioDetalhe.numero}</span>
            <span style={{color:T.textSm,fontSize:12}}>{new Date(envioDetalhe.criadoEm).toLocaleDateString("pt-BR")}</span>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={() => { const url = `${window.location.origin}${window.location.pathname}#envio/${envioDetalhe.numero}`; navigator.clipboard.writeText(url); alert("Link copiado!"); }}
              style={{...btnStyle,background:"#8b5cf6",padding:"6px 16px",fontSize:12}}>Compartilhar link</button>
            <button onClick={() => window.open(`#envio/${envioDetalhe.numero}`,"_blank")} style={{...btnStyle,background:"#166534",padding:"6px 16px",fontSize:12}}>Abrir página</button>
            <button onClick={() => setView("lista")} style={{...btnStyle,background:"#475569",padding:"6px 16px",fontSize:12}}>Voltar</button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
          <KPI label="NFs de Jogos" value={fmt(envioDetalhe.totalJogos)} sub={`${(envioDetalhe.notasResumo||[]).length} notas`} color="#22c55e" T={T}/>
          <KPI label="NFs Mensais" value={fmt(envioDetalhe.totalMensais)} sub={`${(envioDetalhe.mensaisResumo||[]).length} notas`} color="#06b6d4" T={T}/>
          <KPI label="Total Envio" value={fmt(envioDetalhe.totalGeral)} sub={`${envioDetalhe.qtdNotas} notas`} color="#8b5cf6" T={T}/>
        </div>

        {envioDetalhe.obs && (
          <div style={{background:T.card,borderRadius:8,padding:"10px 16px",marginBottom:16,color:T.textMd,fontSize:12}}>
            Obs: {envioDetalhe.obs}
          </div>
        )}

        {/* NFs Jogos */}
        {(envioDetalhe.notasResumo||[]).length > 0 && (
          <div style={{background:T.card,borderRadius:12,overflow:"hidden",marginBottom:16}}>
            <div style={{padding:"12px 20px",borderBottom:`1px solid ${T.border}`}}>
              <h3 style={{margin:0,fontSize:14,color:"#22c55e"}}>Notas Fiscais de Jogos</h3>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
                <thead><tr style={{background:T.bg}}>
                  {["Código","Nº NF","Fornecedor","Valor","Emissão","Data Pgto","Jogo","Rd","Serviços",""].map(h => <th key={h} style={thS}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {envioDetalhe.notasResumo.map(n => (
                    <tr key={n.id} style={{borderTop:`1px solid ${T.border}`}}>
                      <td style={tdS}><code style={{color:"#22c55e",fontSize:10,fontWeight:600}}>{n.codigo}</code></td>
                      <td style={{...tdS,fontWeight:600}}>{n.numeroNF||"—"}</td>
                      <td style={tdS}>{n.fornecedor}</td>
                      <td style={{...tdS,color:"#8b5cf6",fontWeight:600,whiteSpace:"nowrap"}}>{fmt(n.valorNF)}</td>
                      <td style={{...tdS,color:T.textSm}}>{n.dataEmissao||"—"}</td>
                      <td style={{...tdS,color:T.textSm}}>{n.dataPagamento||"—"}</td>
                      <td style={{...tdS,whiteSpace:"nowrap"}}>{n.jogoLabel}</td>
                      <td style={tdS}>{n.rodada}</td>
                      <td style={{...tdS,fontSize:10,color:T.textSm}}>{(n.servicosLabels||[]).join(", ")}</td>
                      <td style={tdS}>{n.hasFile && <button onClick={() => downloadNF(n.id, n.codigo)} style={{...btnStyle,background:"#3b82f6",padding:"3px 8px",fontSize:10}}>Baixar</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* NFs Mensais */}
        {(envioDetalhe.mensaisResumo||[]).length > 0 && (
          <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"12px 20px",borderBottom:`1px solid ${T.border}`}}>
              <h3 style={{margin:0,fontSize:14,color:"#06b6d4"}}>Notas Fiscais Mensais</h3>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:T.bg}}>
                  {["Fornecedor","Categoria","Mês","Nº NF","Valor","Emissão","Data Pgto",""].map(h => <th key={h} style={thS}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {envioDetalhe.mensaisResumo.map(n => (
                    <tr key={n.id} style={{borderTop:`1px solid ${T.border}`}}>
                      <td style={{...tdS,fontWeight:600}}>{n.fornecedor}</td>
                      <td style={tdS}><Pill label={n.categoria} color="#06b6d4"/></td>
                      <td style={tdS}>{n.mesLabel}</td>
                      <td style={tdS}>{n.numeroNF||"—"}</td>
                      <td style={{...tdS,color:"#8b5cf6",fontWeight:600}}>{fmt(n.valor)}</td>
                      <td style={{...tdS,color:T.textSm}}>{n.dataEmissao||"—"}</td>
                      <td style={{...tdS,color:T.textSm}}>{n.dataPagamento||"—"}</td>
                      <td style={tdS}>{n.hasFile && <button onClick={() => downloadNF(n.id, `NF_${n.fornecedor}`)} style={{...btnStyle,background:"#3b82f6",padding:"3px 8px",fontSize:10}}>Baixar</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>)}
    </div>
  );
}
