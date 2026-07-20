import { useState, useRef } from "react";
import { CATS, btnStyle, iSty } from "../../constants";
import { fileToDataUrl, saveNFFile } from "../../lib/supabase";
import { Pill } from "../shared";

const fmt = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});

const LOG_SUBS = (CATS.find(c => c.key === "logistica")?.subs || []).map(s => s.key);
const logProvTotal = jogo => LOG_SUBS.reduce((s, k) => s + (jogo.provisionado?.[k] || 0), 0);

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

function FornecedorInput({ value, onChange, fornecedores, T }) {
  const IS = iSty(T);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const query = value.toLowerCase();
  const filtered = query.length > 0
    ? fornecedores.filter(f => f.apelido.toLowerCase().includes(query) || f.razaoSocial.toLowerCase().includes(query) || f.funcao.toLowerCase().includes(query)).slice(0, 8)
    : [];

  return (
    <div style={{position:"relative"}} ref={ref}>
      <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Digite para buscar..." style={IS}/>
      {open && filtered.length > 0 && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:50,background:T.card,border:`1px solid ${T.border}`,borderRadius:8,marginTop:4,maxHeight:200,overflowY:"auto",boxShadow:"0 8px 24px rgba(0,0,0,0.3)"}}>
          {filtered.map(f => (
            <div key={f.id} onMouseDown={() => { onChange(f.apelido); setOpen(false); }}
              style={{padding:"8px 12px",cursor:"pointer",borderBottom:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:2}}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:600,color:T.text}}>{f.apelido}</span>
                <span style={{fontSize:10,color:T.textSm,background:T.bg,padding:"1px 6px",borderRadius:4}}>{f.tipo}</span>
              </div>
              <span style={{fontSize:11,color:T.textSm}}>{f.funcao} · {f.razaoSocial.slice(0,40)}{f.razaoSocial.length>40?"...":""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// NF de reembolso que a Livemode emite cobrindo a logística de um lote de jogos --
// é a fonte de verdade do realizado de Logística (ver buildRealizadoPorJogo em
// notasFiscais.js). Usado tanto pela aba Notas Fiscais quanto pela aba Logística.
export function ReembolsoLogisticaModal({ jogos, fornecedores, onSave, onClose, T }) {
  const IS = iSty(T);
  const divulgados = jogos.filter(j => j.mandante !== "A definir");
  const [form, setForm] = useState({ fornecedor: "Livemode", numeroNF: "", valorNF: "", dataEmissao: "", dataEnvio: "", obs: "" });
  const [jogosSel, setJogosSel] = useState(new Set());
  const [distrib, setDistrib] = useState({});
  const [arquivo, setArquivo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const toggleJogo = (jogoId) => {
    setJogosSel(prev => {
      const next = new Set(prev);
      if (next.has(jogoId)) {
        next.delete(jogoId);
        setDistrib(d => { const nd = {...d}; delete nd[jogoId]; return nd; });
      } else {
        next.add(jogoId);
        const jogo = divulgados.find(j => j.id === jogoId);
        setDistrib(d => ({...d, [jogoId]: logProvTotal(jogo)}));
      }
      return next;
    });
  };

  const autoDistribuir = () => {
    const totalNF = parseFloat(form.valorNF) || 0;
    if (totalNF === 0 || jogosSel.size === 0) return;
    const selecionados = divulgados.filter(j => jogosSel.has(j.id));
    const totalProv = selecionados.reduce((s, j) => s + logProvTotal(j), 0);
    const next = {};
    selecionados.forEach((j, i) => {
      if (totalProv === 0) {
        next[j.id] = i < selecionados.length - 1
          ? Math.round(totalNF / selecionados.length * 100) / 100
          : totalNF - selecionados.slice(0, i).reduce((s, x) => s + (next[x.id] || 0), 0);
      } else {
        const proporcional = Math.round((logProvTotal(j) / totalProv) * totalNF * 100) / 100;
        next[j.id] = i < selecionados.length - 1
          ? proporcional
          : Math.round((totalNF - selecionados.slice(0, i).reduce((s, x) => s + (next[x.id] || 0), 0)) * 100) / 100;
      }
    });
    setDistrib(next);
  };

  const totalDistrib = Object.values(distrib).reduce((s, v) => s + (v || 0), 0);
  const totalNF = parseFloat(form.valorNF) || 0;
  const diff = Math.round((totalNF - totalDistrib) * 100) / 100;
  const ok = Math.abs(diff) < 0.01;

  const jogosSelecionados = divulgados.filter(j => jogosSel.has(j.id));
  const firstJogo = jogosSelecionados[0];
  const rodada = firstJogo?.rodada;
  const jogoLabel = jogosSelecionados.map(j => `${j.mandante} x ${j.visitante}`).join(" + ");
  const codigo = firstJogo ? gerarCodigo(rodada, firstJogo.mandante, firstJogo.visitante, totalNF, form.numeroNF) : "";
  // Reembolso costuma cobrir varias rodadas de uma vez -- "rodada" sozinho (so a
  // primeira) é enganoso na etiqueta. rodadasLabel mostra a faixa real (Rd 1-3).
  const rodadasArr = [...new Set(jogosSelecionados.map(j => j.rodada))].sort((a, b) => a - b);
  const rodadasLabel = rodadasArr.length === 0 ? "" : rodadasArr.length === 1 ? `Rd ${rodadasArr[0]}` : `Rd ${rodadasArr[0]}-${rodadasArr[rodadasArr.length - 1]}`;

  const handleSave = async () => {
    if (jogosSel.size === 0 || totalNF === 0) return;
    setUploading(true);
    const notaId = Date.now();
    let hasFile = false;
    if (arquivo) {
      try { const dataUrl = await fileToDataUrl(arquivo); await saveNFFile(notaId, dataUrl); hasFile = true; } catch(_) {}
    }
    const jogoIds = [...jogosSel];
    const servicosDetalhe = {};
    jogoIds.forEach(id => { servicosDetalhe[`${id}_reembolso_log`] = distrib[id] || 0; });

    onSave({
      id: notaId, codigo, ...form,
      valorNF: totalNF, rodada,
      rodadas: rodadasArr, rodadasLabel,
      jogoId: jogoIds[0], jogoIds, jogoLabel,
      servicosKeys: [], servicosLabels: ["Reembolso Log. Livemode"],
      servicosDetalhe,
      tipo: "reembolso_livemode", status: "Conferida", hasFile,
    });
    setUploading(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.card,borderRadius:16,padding:28,width:"100%",maxWidth:660,maxHeight:"92vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 4px",fontSize:16,color:T.text}}>NF de Reembolso — Logística Multi-jogo</h3>
        <p style={{color:T.textSm,fontSize:12,margin:"0 0 16px"}}>NF emitida pela Livemode cobrindo logística de vários jogos — distribua o valor proporcionalmente pelo provisionado</p>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          {[
            ["Fornecedor","fornecedor","text"],
            ["Nº da Nota","numeroNF","text"],
            ["Valor Total NF (R$)","valorNF","number"],
            ["Data Emissão","dataEmissao","text","dd/mm"],
            ["Data Envio","dataEnvio","text","dd/mm"],
            ["Observações","obs","text"],
          ].map(([label, key, type, ph]) => (
            <div key={key} style={{marginBottom:12}}>
              <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>{label}</label>
              {key === "fornecedor"
                ? <FornecedorInput value={form.fornecedor} onChange={v => set("fornecedor", v)} fornecedores={fornecedores} T={T}/>
                : <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={ph||""} style={IS}/>}
            </div>
          ))}
        </div>

        {/* Seleção de jogos */}
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <label style={{color:T.textMd,fontSize:12,fontWeight:600}}>Jogos cobertos pela NF</label>
            {jogosSel.size > 0 && totalNF > 0 && (
              <button onClick={autoDistribuir} style={{...btnStyle,background:"#3b82f6",padding:"4px 12px",fontSize:11}}>
                Auto-distribuir proporcionalmente
              </button>
            )}
          </div>
          <div style={{background:T.bg,borderRadius:8,padding:8,display:"flex",flexDirection:"column",gap:3}}>
            {divulgados.length === 0 && <p style={{color:T.textSm,fontSize:12,padding:8}}>Nenhum jogo divulgado</p>}
            {divulgados.map(jogo => {
              const sel = jogosSel.has(jogo.id);
              const lp = logProvTotal(jogo);
              return (
                <div key={jogo.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:6,
                  background:sel?"#3b82f622":"transparent",border:`1px solid ${sel?"#3b82f644":"transparent"}`}}>
                  <input type="checkbox" checked={sel} onChange={() => toggleJogo(jogo.id)}/>
                  <Pill label={jogo.categoria} color={jogo.categoria==="B1"?"#22c55e":"#f59e0b"}/>
                  <span style={{flex:1,fontSize:13,color:T.text,fontWeight:600}}>
                    Rd {jogo.rodada} · {jogo.mandante} × {jogo.visitante}
                  </span>
                  <span style={{fontSize:11,color:T.textSm}}>Log. prov.: <b style={{color:T.textMd}}>{fmt(lp)}</b></span>
                  {sel && (
                    <input type="number" value={distrib[jogo.id] ?? ""}
                      onChange={e => setDistrib(d => ({...d, [jogo.id]: parseFloat(e.target.value) || 0}))}
                      style={{...IS,width:110,textAlign:"right",padding:"3px 6px",fontSize:12,color:"#8b5cf6",fontWeight:600}}/>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumo distribuição */}
        {jogosSel.size > 0 && (
          <div style={{background:T.bg,borderRadius:8,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:T.textMd}}>Distribuído: <b style={{color:"#8b5cf6"}}>{fmt(totalDistrib)}</b></span>
            <span style={{fontSize:12,color:T.textMd}}>Total NF: <b style={{color:T.text}}>{fmt(totalNF)}</b></span>
            <span style={{fontSize:12,color:T.textMd}}>Diferença: <b style={{color:ok?"#22c55e":"#ef4444"}}>{ok?"✓ zerado":fmt(diff)}</b></span>
          </div>
        )}

        {/* Upload */}
        <div style={{marginBottom:16}}>
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Arquivo da NF (PDF/imagem)</label>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e => setArquivo(e.target.files[0]||null)} style={{display:"none"}}/>
          <div onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault(); setArquivo(e.dataTransfer.files[0]||null);}}
            style={{border:`2px dashed ${arquivo?'#22c55e':T.muted}`,borderRadius:8,padding:"12px 16px",cursor:"pointer",textAlign:"center",background:arquivo?"#22c55e11":T.bg}}>
            {arquivo
              ? <p style={{margin:0,color:"#22c55e",fontSize:13,fontWeight:600}}>{arquivo.name}</p>
              : <p style={{margin:0,color:T.textSm,fontSize:12}}>Clique ou arraste o arquivo</p>}
          </div>
        </div>

        {(form.numeroNF || totalNF > 0) && codigo && (
          <div style={{background:T.bg,borderRadius:8,padding:"10px 14px",marginBottom:16}}>
            <p style={{color:T.textSm,fontSize:11,margin:"0 0 4px"}}>Código:</p>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <code style={{fontSize:14,fontWeight:700,color:"#22c55e",flex:1}}>{codigo}</code>
              <button onClick={() => navigator.clipboard.writeText(codigo)} style={{...btnStyle,background:T.border,padding:"4px 10px",fontSize:10,color:T.text}}>Copiar</button>
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{...btnStyle,background:"#475569"}}>Cancelar</button>
          <button onClick={handleSave} disabled={jogosSel.size===0||totalNF===0||uploading}
            style={{...btnStyle,background:jogosSel.size>0&&totalNF>0?"#65B32E":"#475569",opacity:jogosSel.size>0&&totalNF>0&&!uploading?1:0.5}}>
            {uploading ? "Enviando..." : "Salvar NF de Reembolso"}
          </button>
        </div>
      </div>
    </div>
  );
}
