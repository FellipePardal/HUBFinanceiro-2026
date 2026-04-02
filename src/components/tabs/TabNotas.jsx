import { useState, useMemo, useRef } from "react";
import { KPI, Pill } from "../shared";
import { fmt, subTotal } from "../../utils";
import { CATS, btnStyle, iSty } from "../../constants";
import { uploadNF, deleteNFFile, getNFUrl } from "../../lib/supabase";

const STATUS_NF = ["Pendente","Solicitada","Recebida","Conferida"];
const STATUS_COLOR = {"Pendente":"#f59e0b","Solicitada":"#3b82f6","Recebida":"#8b5cf6","Conferida":"#22c55e"};

function extrairServicos(jogo) {
  const servicos = [];
  CATS.forEach(cat => {
    cat.subs.forEach(sub => {
      const valOrc  = jogo.orcado?.[sub.key] || 0;
      const valProv = jogo.provisionado?.[sub.key] || 0;
      const val = valProv || valOrc;
      if (val > 0) {
        servicos.push({ subKey: sub.key, subLabel: sub.label, catLabel: cat.label, catColor: cat.color, valorRef: val });
      }
    });
  });
  return servicos;
}

function abreviar(nome) {
  if (!nome || nome === "A definir") return "TBD";
  const map = {"Fluminense":"FLU","Botafogo":"BOT","Flamengo":"FLA","Vasco":"VAS","Corinthians":"COR","Palmeiras":"PAL","São Paulo":"SAO","Athletico PR":"CAP","Grêmio":"GRE","Internacional":"INT","Cruzeiro":"CRU","Atlético MG":"CAM","Chapecoense":"CHA","Santos":"SAN","Vitória":"VIT","Mirassol":"MIR","Coritiba":"CFC"};
  return map[nome] || nome.slice(0,3).toUpperCase();
}

function gerarCodigo(rodada, mandante, visitante, valorNF, numeroNF) {
  const rd = String(rodada).padStart(2, "0");
  const m = abreviar(mandante);
  const v = abreviar(visitante);
  const val = Math.round(valorNF || 0);
  const nf = (numeroNF || "SN").replace(/\s/g, "");
  return `RD${rd}_${m}x${v}_${val}_NF${nf}`;
}

// ─── Modal para registrar NF (suporta multi-serviço) ─────────────────────────
function RegistrarNFModal({ jogo, servicosDisponiveis, notasExistentes, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState({
    numeroNF: "", fornecedor: "", dataEmissao: "", dataEnvio: "", obs: "",
  });
  const [selecionados, setSelecionados] = useState({}); // { subKey: valorUnit }
  const [arquivo, setArquivo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const servicosLivres = servicosDisponiveis.filter(s => {
    const key = `${jogo.id}_${s.subKey}`;
    const nota = notasExistentes.find(n => n.servicosKeys?.includes(key));
    return !nota || nota.status !== "Conferida";
  });

  const toggleServico = (subKey, valorRef) => {
    setSelecionados(prev => {
      if (prev[subKey] !== undefined) { const n = {...prev}; delete n[subKey]; return n; }
      return {...prev, [subKey]: valorRef};
    });
  };

  const setValorUnit = (subKey, val) => {
    setSelecionados(prev => ({...prev, [subKey]: parseFloat(val) || 0}));
  };

  const selectAll = () => {
    const all = {};
    servicosLivres.forEach(s => { all[s.subKey] = s.valorRef; });
    setSelecionados(all);
  };

  const selKeys = Object.keys(selecionados);
  const totalNF = Object.values(selecionados).reduce((s, v) => s + (v || 0), 0);
  const codigo = gerarCodigo(jogo.rodada, jogo.mandante, jogo.visitante, totalNF, form.numeroNF);

  const handleSave = async () => {
    if (!form.numeroNF && !form.fornecedor) return;
    if (selKeys.length === 0) return;
    setUploading(true);
    let filePath = null, fileUrl = null;
    try {
      if (arquivo) {
        const result = await uploadNF(codigo, arquivo);
        filePath = result.path;
        fileUrl = result.url;
      }
    } catch (e) { console.error("Upload falhou:", e); }
    const servicosKeys = selKeys.map(sk => `${jogo.id}_${sk}`);
    const servicosValores = {};
    selKeys.forEach(sk => { servicosValores[sk] = selecionados[sk]; });
    onSave({
      id: Date.now(),
      codigo,
      ...form,
      valorNF: totalNF,
      rodada: jogo.rodada,
      jogoId: jogo.id,
      jogoLabel: `${jogo.mandante} x ${jogo.visitante}`,
      mandante: jogo.mandante,
      visitante: jogo.visitante,
      servicosKeys,
      servicosLabels: servicosDisponiveis.filter(s => selKeys.includes(s.subKey)).map(s => s.subLabel),
      servicosValores,
      tipo: "prevista",
      status: "Conferida",
      filePath,
      fileUrl,
    });
    setUploading(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.card,borderRadius:16,padding:28,width:"100%",maxWidth:620,maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 4px",fontSize:16,color:T.text}}>Registrar Nota Fiscal</h3>
        <p style={{color:T.textSm,fontSize:12,margin:"0 0 16px"}}>Rd {jogo.rodada} · {jogo.mandante} x {jogo.visitante}</p>

        {/* Seleção de serviços com valor unitário */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <label style={{color:T.textMd,fontSize:12,fontWeight:600}}>Serviços cobertos por esta NF:</label>
            <button onClick={selectAll} style={{...btnStyle,background:T.border,padding:"3px 10px",fontSize:10,color:T.text}}>Selecionar todos</button>
          </div>
          <div style={{background:T.bg,borderRadius:8,padding:8,maxHeight:280,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
            {servicosLivres.length === 0 && <p style={{color:T.textSm,fontSize:12,padding:8,margin:0}}>Todos os serviços já possuem NF</p>}
            {/* Header */}
            {servicosLivres.length > 0 && (
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 8px",fontSize:10,color:T.textSm}}>
                <span style={{width:20}}/>
                <span style={{flex:1}}>Serviço</span>
                <span style={{width:70,textAlign:"right"}}>Ref.</span>
                <span style={{width:100,textAlign:"right"}}>Valor NF</span>
              </div>
            )}
            {servicosLivres.map(s => {
              const checked = selecionados[s.subKey] !== undefined;
              return (
                <div key={s.subKey} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:6,
                  background:checked?s.catColor+"18":"transparent"}}>
                  <input type="checkbox" checked={checked} onChange={() => toggleServico(s.subKey, s.valorRef)}/>
                  <span style={{fontSize:13,color:T.text,flex:1}}>{s.subLabel}</span>
                  <span style={{fontSize:11,color:T.textSm,width:70,textAlign:"right"}}>{fmt(s.valorRef)}</span>
                  {checked
                    ? <input type="number" value={selecionados[s.subKey]} onChange={e => setValorUnit(s.subKey, e.target.value)}
                        style={{...IS,width:100,textAlign:"right",padding:"3px 6px",fontSize:12,color:"#8b5cf6",fontWeight:600}}/>
                    : <span style={{width:100}}/>}
                </div>
              );
            })}
          </div>
          {selKeys.length > 0 && (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,padding:"0 8px"}}>
              <span style={{color:T.textMd,fontSize:11}}>{selKeys.length} serviço{selKeys.length>1?"s":""}</span>
              <span style={{fontSize:14,fontWeight:700,color:"#8b5cf6"}}>Total NF: {fmt(totalNF)}</span>
            </div>
          )}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Fornecedor</label>
            <input value={form.fornecedor} onChange={e => set("fornecedor", e.target.value)} style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Nº da Nota</label>
            <input value={form.numeroNF} onChange={e => set("numeroNF", e.target.value)} style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Valor NF (R$)</label>
            <input type="number" value={form.valorNF} onChange={e => set("valorNF", e.target.value)} style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Data Emissão</label>
            <input value={form.dataEmissao} onChange={e => set("dataEmissao", e.target.value)} placeholder="dd/mm" style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Data Envio</label>
            <input value={form.dataEnvio} onChange={e => set("dataEnvio", e.target.value)} placeholder="dd/mm" style={IS}/>
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Observações</label>
          <input value={form.obs} onChange={e => set("obs", e.target.value)} style={IS}/>
        </div>

        {/* Upload de arquivo */}
        <div style={{marginBottom:16}}>
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Arquivo da NF (PDF/imagem)</label>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e => setArquivo(e.target.files[0] || null)} style={{display:"none"}}/>
          <div onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {e.preventDefault(); setArquivo(e.dataTransfer.files[0] || null);}}
            style={{border:`2px dashed ${arquivo?'#22c55e':T.muted}`,borderRadius:8,padding:"14px 16px",cursor:"pointer",textAlign:"center",
              background:arquivo?"#22c55e11":T.bg,transition:"all 0.2s"}}>
            {arquivo
              ? <p style={{margin:0,color:"#22c55e",fontSize:13,fontWeight:600}}>{arquivo.name} ({(arquivo.size/1024).toFixed(0)} KB)</p>
              : <p style={{margin:0,color:T.textSm,fontSize:12}}>Clique ou arraste o arquivo aqui</p>}
          </div>
        </div>

        {/* Código gerado */}
        {(form.numeroNF || form.valorNF > 0) && (
          <div style={{background:T.bg,borderRadius:8,padding:"12px 16px",marginBottom:16}}>
            <p style={{color:T.textSm,fontSize:11,margin:"0 0 4px"}}>Código do arquivo:</p>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <code style={{fontSize:15,fontWeight:700,color:"#22c55e",letterSpacing:0.5,flex:1}}>{codigo}</code>
              <button onClick={() => {navigator.clipboard.writeText(codigo);}} style={{...btnStyle,background:T.border,padding:"4px 10px",fontSize:10,color:T.text}}>Copiar</button>
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{...btnStyle,background:"#475569"}}>Cancelar</button>
          <button onClick={handleSave} disabled={selecionados.length===0||uploading} style={{...btnStyle,background:selecionados.length>0?"#22c55e":"#475569",opacity:selecionados.length>0&&!uploading?1:0.5}}>
            {uploading ? "Enviando..." : "Salvar NF"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal para NF avulsa (não prevista) ─────────────────────────────────────
function NFAvulsaModal({ jogos, onSave, onClose, T }) {
  const IS = iSty(T);
  const divulgados = jogos.filter(j => j.mandante !== "A definir");
  const [jogoId, setJogoId] = useState(divulgados[0]?.id || null);
  const jogo = divulgados.find(j => j.id === parseInt(jogoId)) || divulgados[0];
  const [form, setForm] = useState({
    numeroNF: "", fornecedor: "", valorNF: 0, dataEmissao: "", dataEnvio: "", obs: "", descricao: "",
  });
  const [arquivo, setArquivo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const codigo = jogo ? gerarCodigo(jogo.rodada, jogo.mandante, jogo.visitante, form.valorNF, form.numeroNF) : "";

  const handleSave = async () => {
    if (!jogo || (!form.numeroNF && !form.fornecedor)) return;
    setUploading(true);
    let filePath = null, fileUrl = null;
    try {
      if (arquivo) {
        const result = await uploadNF(codigo, arquivo);
        filePath = result.path;
        fileUrl = result.url;
      }
    } catch (e) { console.error("Upload falhou:", e); }
    onSave({
      id: Date.now(),
      codigo,
      ...form,
      valorNF: parseFloat(form.valorNF) || 0,
      rodada: jogo.rodada,
      jogoId: jogo.id,
      jogoLabel: `${jogo.mandante} x ${jogo.visitante}`,
      mandante: jogo.mandante,
      visitante: jogo.visitante,
      servicosKeys: [],
      servicosLabels: [form.descricao || "Avulsa"],
      tipo: "avulsa",
      status: "Conferida",
      filePath,
      fileUrl,
    });
    setUploading(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.card,borderRadius:16,padding:28,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 4px",fontSize:16,color:T.text}}>NF Avulsa / Não Prevista</h3>
        <p style={{color:T.textSm,fontSize:12,margin:"0 0 16px"}}>Para notas que não estavam previstas ou com valores diferentes</p>

        <div style={{marginBottom:12}}>
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Jogo</label>
          <select value={jogoId} onChange={e => setJogoId(e.target.value)} style={IS}>
            {divulgados.map(j => <option key={j.id} value={j.id}>Rd {j.rodada} · {j.mandante} x {j.visitante}</option>)}
          </select>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Fornecedor</label>
            <input value={form.fornecedor} onChange={e => set("fornecedor", e.target.value)} style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Nº da Nota</label>
            <input value={form.numeroNF} onChange={e => set("numeroNF", e.target.value)} style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Valor NF (R$)</label>
            <input type="number" value={form.valorNF} onChange={e => set("valorNF", e.target.value)} style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Data Emissão</label>
            <input value={form.dataEmissao} onChange={e => set("dataEmissao", e.target.value)} placeholder="dd/mm" style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Data Envio</label>
            <input value={form.dataEnvio} onChange={e => set("dataEnvio", e.target.value)} placeholder="dd/mm" style={IS}/>
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Descrição do serviço</label>
          <input value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Ex: Frete extra, serviço adicional..." style={IS}/>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Observações</label>
          <input value={form.obs} onChange={e => set("obs", e.target.value)} style={IS}/>
        </div>

        {/* Upload */}
        <div style={{marginBottom:16}}>
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Arquivo da NF (PDF/imagem)</label>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e => setArquivo(e.target.files[0] || null)} style={{display:"none"}}/>
          <div onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {e.preventDefault(); setArquivo(e.dataTransfer.files[0] || null);}}
            style={{border:`2px dashed ${arquivo?'#22c55e':T.muted}`,borderRadius:8,padding:"14px 16px",cursor:"pointer",textAlign:"center",
              background:arquivo?"#22c55e11":T.bg}}>
            {arquivo
              ? <p style={{margin:0,color:"#22c55e",fontSize:13,fontWeight:600}}>{arquivo.name} ({(arquivo.size/1024).toFixed(0)} KB)</p>
              : <p style={{margin:0,color:T.textSm,fontSize:12}}>Clique ou arraste o arquivo aqui</p>}
          </div>
        </div>

        {(form.numeroNF || form.valorNF > 0) && (
          <div style={{background:T.bg,borderRadius:8,padding:"12px 16px",marginBottom:16}}>
            <p style={{color:T.textSm,fontSize:11,margin:"0 0 4px"}}>Código do arquivo:</p>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <code style={{fontSize:15,fontWeight:700,color:"#22c55e",letterSpacing:0.5,flex:1}}>{codigo}</code>
              <button onClick={() => {navigator.clipboard.writeText(codigo);}} style={{...btnStyle,background:T.border,padding:"4px 10px",fontSize:10,color:T.text}}>Copiar</button>
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{...btnStyle,background:"#475569"}}>Cancelar</button>
          <button onClick={handleSave} disabled={uploading} style={{...btnStyle,background:"#f59e0b",color:"#000",opacity:uploading?0.5:1}}>
            {uploading ? "Enviando..." : "Salvar NF Avulsa"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function TabNotas({ notas, setNotas, jogos, T }) {
  const [tab, setTab] = useState("rodada");
  const [rodadaSel, setRodadaSel] = useState(null);
  const [showRegistrar, setShowRegistrar] = useState(null); // jogo
  const [showAvulsa, setShowAvulsa] = useState(false);
  const [filtroPlanilha, setFiltroPlanilha] = useState("Todas");

  const divulgados = jogos.filter(j => j.mandante !== "A definir");
  const rodadas = Array.from(new Set(divulgados.map(j => j.rodada))).sort((a, b) => a - b);
  const rodadaEfetiva = rodadaSel ?? (rodadas.length ? rodadas[rodadas.length - 1] : 1);
  const jogosRodada = divulgados.filter(j => j.rodada === rodadaEfetiva);

  // Stats
  const allServicos = useMemo(() => {
    return divulgados.flatMap(jogo => {
      const servicos = extrairServicos(jogo);
      return servicos.map(s => {
        const key = `${jogo.id}_${s.subKey}`;
        const nota = notas.find(n => n.servicosKeys?.includes(key));
        return { key, rodada: jogo.rodada, status: nota ? "Conferida" : "Pendente" };
      });
    });
  }, [divulgados, notas]);

  const totalPendente  = allServicos.filter(i => i.status === "Pendente").length;
  const totalConferida = allServicos.filter(i => i.status === "Conferida").length;
  const totalNotas     = notas.length;
  const totalValor     = notas.reduce((s, n) => s + (n.valorNF || 0), 0);
  const notasAvulsas   = notas.filter(n => n.tipo === "avulsa").length;

  const addNota = nota => { setNotas(ns => [...ns, nota]); setShowRegistrar(null); setShowAvulsa(false); };

  const deleteNota = id => {
    if (window.confirm("Excluir esta NF?")) setNotas(ns => ns.filter(n => n.id !== id));
  };

  // Planilha
  const planilhaRodadas = ["Todas", ...Array.from(new Set(notas.map(n => String(n.rodada)).filter(Boolean))).sort((a, b) => a - b)];
  const planilhaItens = notas
    .filter(n => filtroPlanilha === "Todas" || String(n.rodada) === filtroPlanilha)
    .sort((a, b) => (a.rodada || 0) - (b.rodada || 0));

  const copyPlanilha = () => {
    const header = "Código\tNº NF\tFornecedor\tValor\tEmissão\tEnvio\tJogo\tRodada\tServiços\tTipo\tObs";
    const rows = planilhaItens.map(n =>
      `${n.codigo}\t${n.numeroNF}\t${n.fornecedor}\t${n.valorNF || 0}\t${n.dataEmissao}\t${n.dataEnvio}\t${n.jogoLabel}\t${n.rodada || ""}\t${(n.servicosLabels||[]).join(", ")}\t${n.tipo||"prevista"}\t${n.obs || ""}`
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
    alert("Planilha copiada!");
  };

  const TABS_NF = ["rodada", "planilha", "resumo"];

  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:4}}>
          {TABS_NF.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{padding:"6px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
              background:tab===t?"#8b5cf6":"transparent",color:tab===t?"#fff":T.textMd,textTransform:"capitalize"}}>
              {t === "rodada" ? "Por Rodada" : t === "planilha" ? "Planilha" : "Resumo"}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAvulsa(true)} style={{...btnStyle,background:"#f59e0b",color:"#000",fontSize:12}}>+ NF Avulsa</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        <KPI label="Serviços Pendentes" value={String(totalPendente)} sub="Sem NF" color="#f59e0b" T={T}/>
        <KPI label="Serviços Conferidos" value={String(totalConferida)} sub="Com NF" color="#22c55e" T={T}/>
        <KPI label="Notas Registradas" value={`${totalNotas} (${notasAvulsas} avulsa${notasAvulsas!==1?"s":""})`} sub="" color="#8b5cf6" T={T}/>
        <KPI label="Valor Total NFs" value={fmt(totalValor)} sub={`${totalNotas} notas`} color="#06b6d4" T={T}/>
      </div>

      {/* ── POR RODADA ── */}
      {tab === "rodada" && (<>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20,alignItems:"center"}}>
          <span style={{color:T.textMd,fontSize:13,fontWeight:600}}>Rodada:</span>
          {rodadas.map(r => (
            <button key={r} onClick={() => setRodadaSel(r)} style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
              background:rodadaEfetiva===r?"#8b5cf6":T.card,color:rodadaEfetiva===r?"#fff":T.textMd}}>
              {r}
            </button>
          ))}
        </div>

        {jogosRodada.map(jogo => {
          const servicos = extrairServicos(jogo);
          const nfsDoJogo = notas.filter(n => n.jogoId === jogo.id);
          const servicosComNF = new Set(nfsDoJogo.flatMap(n => n.servicosKeys || []));
          const pendentes = servicos.filter(s => !servicosComNF.has(`${jogo.id}_${s.subKey}`)).length;
          const conferidas = servicos.filter(s => servicosComNF.has(`${jogo.id}_${s.subKey}`)).length;

          return (
            <div key={jogo.id} style={{background:T.card,borderRadius:12,overflow:"hidden",marginBottom:16}}>
              <div style={{padding:"14px 20px",background:T.bg,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <Pill label={jogo.categoria} color={jogo.categoria==="B1"?"#22c55e":"#f59e0b"}/>
                  <span style={{fontWeight:700,fontSize:15,color:T.text}}>{jogo.mandante} x {jogo.visitante}</span>
                  <span style={{color:T.textSm,fontSize:12}}>{jogo.data} · {jogo.cidade}</span>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{color:"#f59e0b",fontSize:12}}>{pendentes} pendente{pendentes!==1?"s":""}</span>
                  <span style={{color:"#22c55e",fontSize:12}}>{conferidas}/{servicos.length}</span>
                  <button onClick={() => setShowRegistrar(jogo)} style={{...btnStyle,background:"#8b5cf6",padding:"5px 14px",fontSize:11}}>+ Registrar NF</button>
                </div>
              </div>

              {/* Serviços do jogo */}
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
                  <thead><tr style={{background:T.bg}}>
                    {["Serviço","Categoria","Valor Ref.","Valor NF","Status","NF Vinculada"].map(h =>
                      <th key={h} style={{padding:"8px 14px",textAlign:"left",color:T.textSm,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {servicos.map(s => {
                      const key = `${jogo.id}_${s.subKey}`;
                      const nota = nfsDoJogo.find(n => n.servicosKeys?.includes(key));
                      const valorUnit = nota?.servicosValores?.[s.subKey];
                      const diff = valorUnit != null ? valorUnit - s.valorRef : null;
                      return (
                        <tr key={s.subKey} style={{borderTop:`1px solid ${T.border}`}}>
                          <td style={{padding:"8px 14px",fontWeight:600,fontSize:13,color:T.text}}>{s.subLabel}</td>
                          <td style={{padding:"8px 14px"}}><Pill label={s.catLabel} color={s.catColor}/></td>
                          <td style={{padding:"8px 14px",color:T.textSm,fontSize:12}}>{fmt(s.valorRef)}</td>
                          <td style={{padding:"8px 14px",fontSize:12}}>
                            {valorUnit != null ? (
                              <span style={{display:"flex",alignItems:"center",gap:4}}>
                                <span style={{color:"#8b5cf6",fontWeight:600}}>{fmt(valorUnit)}</span>
                                {diff !== 0 && <span style={{fontSize:10,color:diff>0?"#ef4444":"#22c55e",fontWeight:600}}>{diff>0?"+":""}{fmt(diff)}</span>}
                              </span>
                            ) : <span style={{color:T.textSm}}>—</span>}
                          </td>
                          <td style={{padding:"8px 14px"}}>
                            <Pill label={nota ? "Conferida" : "Pendente"} color={nota ? "#22c55e" : "#f59e0b"}/>
                          </td>
                          <td style={{padding:"8px 14px",fontSize:11}}>
                            {nota ? (
                              <span style={{color:T.text,display:"flex",alignItems:"center",gap:6}}>
                                <code style={{color:"#22c55e",fontSize:11}}>{nota.codigo}</code>
                                <span style={{color:T.textSm}}>{nota.fornecedor}</span>
                                {nota.fileUrl && <a href={nota.fileUrl} target="_blank" rel="noreferrer" style={{color:"#3b82f6",fontSize:10,fontWeight:600,textDecoration:"none",background:"#3b82f622",padding:"2px 6px",borderRadius:4}}>Ver</a>}
                              </span>
                            ) : <span style={{color:T.textSm}}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* NFs avulsas deste jogo */}
              {nfsDoJogo.filter(n => n.tipo === "avulsa").length > 0 && (
                <div style={{padding:"8px 14px",borderTop:`1px solid ${T.border}`,background:T.bg}}>
                  <p style={{color:"#f59e0b",fontSize:11,fontWeight:600,margin:"0 0 4px"}}>NFs Avulsas neste jogo:</p>
                  {nfsDoJogo.filter(n => n.tipo === "avulsa").map(n => (
                    <div key={n.id} style={{display:"flex",gap:12,alignItems:"center",fontSize:12,padding:"2px 0"}}>
                      <code style={{color:"#22c55e",fontSize:11}}>{n.codigo}</code>
                      <span style={{color:T.text}}>{n.fornecedor}</span>
                      <span style={{color:"#8b5cf6",fontWeight:600}}>{fmt(n.valorNF)}</span>
                      <span style={{color:T.textSm}}>{(n.servicosLabels||[]).join(", ")}</span>
                      <button onClick={() => deleteNota(n.id)} style={{...btnStyle,background:"#7f1d1d",padding:"2px 8px",fontSize:10}}>🗑</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </>)}

      {/* ── PLANILHA ── */}
      {tab === "planilha" && (<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{color:T.textMd,fontSize:12,fontWeight:600}}>Rodada:</span>
            {planilhaRodadas.map(r => (
              <button key={r} onClick={() => setFiltroPlanilha(r)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,
                background:filtroPlanilha===r?"#8b5cf6":T.card,color:filtroPlanilha===r?"#fff":T.textMd}}>
                {r === "Todas" ? "Todas" : `Rd ${r}`}
              </button>
            ))}
          </div>
          <button onClick={copyPlanilha} style={{...btnStyle,background:"#22c55e",fontSize:12}}>Copiar Planilha</button>
        </div>

        <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",color:T.textSm,fontSize:12}}>
            <span>{planilhaItens.length} notas</span>
            <span>Total: <b style={{color:"#8b5cf6"}}>{fmt(planilhaItens.reduce((s, n) => s + (n.valorNF || 0), 0))}</b></span>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
              <thead><tr style={{background:T.bg}}>
                {["Código","Nº NF","Fornecedor","Valor","Emissão","Envio","Jogo","Rd","Serviços","Tipo",""].map(h =>
                  <th key={h} style={{padding:"10px 12px",textAlign:"left",color:T.textSm,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {planilhaItens.map(n => (
                  <tr key={n.id} style={{borderTop:`1px solid ${T.border}`}}>
                    <td style={{padding:"10px 12px"}}><code style={{color:"#22c55e",fontSize:11,fontWeight:600}}>{n.codigo}</code></td>
                    <td style={{padding:"10px 12px",color:T.text,fontSize:13,fontWeight:600}}>{n.numeroNF}</td>
                    <td style={{padding:"10px 12px",color:T.text,fontSize:13}}>{n.fornecedor}</td>
                    <td style={{padding:"10px 12px",color:"#8b5cf6",fontWeight:600,whiteSpace:"nowrap"}}>{fmt(n.valorNF || 0)}</td>
                    <td style={{padding:"10px 12px",color:T.textMd,fontSize:12}}>{n.dataEmissao}</td>
                    <td style={{padding:"10px 12px",color:T.textMd,fontSize:12}}>{n.dataEnvio}</td>
                    <td style={{padding:"10px 12px",color:T.text,fontSize:12,whiteSpace:"nowrap"}}>{n.jogoLabel}</td>
                    <td style={{padding:"10px 12px",color:T.textMd,fontSize:12}}>{n.rodada}</td>
                    <td style={{padding:"10px 12px",color:T.textSm,fontSize:11,maxWidth:200}}>{(n.servicosLabels||[]).join(", ")}</td>
                    <td style={{padding:"10px 12px"}}><Pill label={n.tipo==="avulsa"?"Avulsa":"Prevista"} color={n.tipo==="avulsa"?"#f59e0b":"#22c55e"}/></td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:4}}>
                        {n.fileUrl && <a href={n.fileUrl} target="_blank" rel="noreferrer" style={{...btnStyle,background:"#3b82f6",padding:"4px 8px",fontSize:10,textDecoration:"none"}}>Ver</a>}
                        <button onClick={() => deleteNota(n.id)} style={{...btnStyle,background:"#7f1d1d",padding:"4px 8px",fontSize:10}}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {planilhaItens.length === 0 && (
                  <tr><td colSpan={11} style={{padding:40,textAlign:"center",color:T.textSm}}>Nenhuma nota registrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>)}

      {/* ── RESUMO ── */}
      {tab === "resumo" && (
        <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`}}>
            <h3 style={{margin:0,fontSize:14,color:T.textMd}}>Status por Rodada</h3>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:T.bg}}>
                {["Rodada","Serviços","Pendente","Conferida","NFs","Valor NFs","% Concluído"].map(h =>
                  <th key={h} style={{padding:"10px 14px",textAlign:h==="Rodada"?"left":"right",color:T.textSm,fontSize:11}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rodadas.map(rod => {
                  const rodServicos = allServicos.filter(i => i.rodada === rod);
                  const tot = rodServicos.length;
                  const pend = rodServicos.filter(i => i.status === "Pendente").length;
                  const conf = rodServicos.filter(i => i.status === "Conferida").length;
                  const rodNotas = notas.filter(n => n.rodada === rod);
                  const rodValor = rodNotas.reduce((s, n) => s + (n.valorNF || 0), 0);
                  const pct = tot ? (conf / tot * 100).toFixed(0) : 0;
                  return (
                    <tr key={rod} style={{borderTop:`1px solid ${T.border}`}}>
                      <td style={{padding:"10px 14px",fontWeight:600,color:T.text}}>Rodada {rod}</td>
                      <td style={{padding:"10px 14px",textAlign:"right",color:T.text}}>{tot}</td>
                      <td style={{padding:"10px 14px",textAlign:"right",color:pend>0?"#f59e0b":T.textSm}}>{pend}</td>
                      <td style={{padding:"10px 14px",textAlign:"right",color:conf>0?"#22c55e":T.textSm}}>{conf}</td>
                      <td style={{padding:"10px 14px",textAlign:"right",color:T.text}}>{rodNotas.length}</td>
                      <td style={{padding:"10px 14px",textAlign:"right",color:"#8b5cf6",fontWeight:600}}>{fmt(rodValor)}</td>
                      <td style={{padding:"10px 14px",textAlign:"right"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end"}}>
                          <span style={{color:T.textMd,fontSize:12}}>{pct}%</span>
                          <div style={{width:60,background:T.border,borderRadius:4,height:6}}>
                            <div style={{width:`${pct}%`,height:"100%",borderRadius:4,background:"#22c55e"}}/>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showRegistrar && <RegistrarNFModal jogo={showRegistrar} servicosDisponiveis={extrairServicos(showRegistrar)} notasExistentes={notas} onSave={addNota} onClose={() => setShowRegistrar(null)} T={T}/>}
      {showAvulsa && <NFAvulsaModal jogos={jogos} onSave={addNota} onClose={() => setShowAvulsa(false)} T={T}/>}
    </>
  );
}
