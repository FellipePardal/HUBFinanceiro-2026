import { useState, useMemo, useRef, useEffect } from "react";
import { KPI, Pill } from "../shared";
import { fmt, subTotal } from "../../utils";
import { CATS, btnStyle, iSty } from "../../constants";
import { fileToDataUrl, saveNFFile, getNFFile, deleteNFFile, getState, setState as setSupabaseState } from "../../lib/supabase";

const STATUS_NF = ["Pendente","Solicitada","Recebida","Conferida"];
const STATUS_COLOR = {"Pendente":"#f59e0b","Solicitada":"#3b82f6","Recebida":"#8b5cf6","Conferida":"#22c55e"};

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

function PreviewModal({ nota, onClose, T }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nota) return;
    setLoading(true);
    setSrc(null);
    getNFFile(nota.id).then(data => { setSrc(data); setLoading(false); }).catch(() => setLoading(false));
  }, [nota?.id]);

  if (!nota) return null;
  const isPdf = src?.startsWith('data:application/pdf');
  return (
    <div style={{position:"fixed",inset:0,background:"#000000dd",zIndex:200,display:"flex",flexDirection:"column"}}
      onClick={onClose}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",flexShrink:0}}
        onClick={e => e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <code style={{color:"#22c55e",fontSize:13,fontWeight:700}}>{nota.codigo}</code>
          <span style={{color:"#fff",fontSize:13}}>{nota.fornecedor}</span>
          <span style={{color:"#8b5cf6",fontWeight:600,fontSize:13}}>{fmt(nota.valorNF)}</span>
          <span style={{color:"#94a3b8",fontSize:12}}>{nota.jogoLabel} · Rd {nota.rodada}</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <a href={src} download={nota.codigo} style={{...btnStyle,background:"#3b82f6",padding:"6px 14px",fontSize:12,textDecoration:"none"}}>Download</a>
          <button onClick={onClose} style={{...btnStyle,background:"#475569",padding:"6px 14px",fontSize:12}}>Fechar</button>
        </div>
      </div>
      <div style={{flex:1,padding:"0 20px 20px",minHeight:0}} onClick={e => e.stopPropagation()}>
        {loading ? (
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <p style={{color:"#94a3b8",fontSize:16}}>Carregando...</p>
          </div>
        ) : !src ? (
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <p style={{color:"#94a3b8",fontSize:16}}>Arquivo não encontrado</p>
          </div>
        ) : isPdf ? (
          <iframe src={src} style={{width:"100%",height:"100%",border:"none",borderRadius:12,background:"#fff"}}/>
        ) : (
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",overflow:"auto"}}>
            <img src={src} alt={nota.codigo} style={{maxWidth:"100%",maxHeight:"100%",borderRadius:12,objectFit:"contain"}}/>
          </div>
        )}
      </div>
    </div>
  );
}

const SUBS_EXCLUIR = new Set(["transporte","uber","hospedagem","seg_espacial","infra","seg_extra"]);
// Subs que aceitam várias NFs compondo o mesmo provisionado (ex: diária, extras)
const SUBS_MULTI_NF = new Set(["diaria","extra"]);

function extrairServicos(jogo) {
  const servicos = [];
  CATS.forEach(cat => {
    cat.subs.forEach(sub => {
      if (SUBS_EXCLUIR.has(sub.key)) return;
      const valProv = jogo.provisionado?.[sub.key] || 0;
      if (valProv > 0) {
        servicos.push({ subKey: sub.key, subLabel: sub.label, catLabel: cat.label, catColor: cat.color, valorRef: valProv });
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

// ─── Modal para registrar NF (suporta multi-jogo e multi-serviço) ────────────
function RegistrarNFModal({ jogosRodada, notasExistentes, fornecedores, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState({
    numeroNF: "", fornecedor: "", dataEmissao: "", dataEnvio: "", obs: "",
  });
  // selecionados: { "jogoId_subKey": valor }
  const [selecionados, setSelecionados] = useState({});
  const [arquivo, setArquivo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  // Soma de NFs já lançadas por (jogoId, subKey) — usado para subs multi-NF
  const valoresLancados = {};
  notasExistentes.forEach(n => {
    if (n.servicosDetalhe) {
      Object.entries(n.servicosDetalhe).forEach(([k, v]) => {
        valoresLancados[k] = (valoresLancados[k] || 0) + (v || 0);
      });
    } else if (n.servicosValores && n.jogoId) {
      Object.entries(n.servicosValores).forEach(([subKey, v]) => {
        const k = `${n.jogoId}_${subKey}`;
        valoresLancados[k] = (valoresLancados[k] || 0) + (v || 0);
      });
    }
  });

  // Serviços livres por jogo
  const jogosComServicos = jogosRodada.map(jogo => {
    const servicos = extrairServicos(jogo).map(s => {
      const key = `${jogo.id}_${s.subKey}`;
      const lancado = valoresLancados[key] || 0;
      const restante = Math.max(0, s.valorRef - lancado);
      return { ...s, lancado, restante, multi: SUBS_MULTI_NF.has(s.subKey) };
    }).filter(s => {
      if (s.multi) return s.restante > 0.01; // mantém visível enquanto sobrar valor
      const key = `${jogo.id}_${s.subKey}`;
      const nota = notasExistentes.find(n => n.servicosKeys?.includes(key));
      return !nota || nota.status !== "Conferida";
    });
    return { jogo, servicos };
  }).filter(j => j.servicos.length > 0);

  const toggleServico = (jogoId, subKey, valorSugerido) => {
    const key = `${jogoId}_${subKey}`;
    setSelecionados(prev => {
      if (prev[key] !== undefined) { const n = {...prev}; delete n[key]; return n; }
      return {...prev, [key]: valorSugerido};
    });
  };

  const setValorUnit = (key, val) => {
    setSelecionados(prev => ({...prev, [key]: parseFloat(val) || 0}));
  };

  const selKeys = Object.keys(selecionados);
  const totalNF = Object.values(selecionados).reduce((s, v) => s + (v || 0), 0);
  const rodada = jogosRodada[0]?.rodada;
  const jogoIds = [...new Set(selKeys.map(k => parseInt(k.split("_")[0])))];
  const jogoLabel = jogoIds.map(id => { const j = jogosRodada.find(x => x.id === id); return j ? `${j.mandante} x ${j.visitante}` : ""; }).join(" + ");
  const firstJogo = jogosRodada.find(j => j.id === jogoIds[0]) || jogosRodada[0];
  const codigo = firstJogo ? gerarCodigo(rodada, firstJogo.mandante, firstJogo.visitante, totalNF, form.numeroNF) : "";

  const handleSave = async () => {
    if (!form.numeroNF && !form.fornecedor) return;
    if (selKeys.length === 0) return;
    setUploading(true);
    const notaId = Date.now();
    let hasFile = false;
    if (arquivo) {
      try { const dataUrl = await fileToDataUrl(arquivo); await saveNFFile(notaId, dataUrl); hasFile = true; } catch(_){}
    }
    // servicosValores agrupado por subKey (para sync realizado), mas servicosKeys com jogoId
    const servicosValores = {};
    selKeys.forEach(k => {
      const subKey = k.split("_").slice(1).join("_");
      servicosValores[subKey] = (servicosValores[subKey] || 0) + selecionados[k];
    });
    // jogoIds envolvidos — salvar array para sync multi-jogo
    const jogosEnvolvidos = [...new Set(selKeys.map(k => parseInt(k.split("_")[0])))];
    const allLabels = selKeys.map(k => {
      const subKey = k.split("_").slice(1).join("_");
      for (const jcs of jogosComServicos) { const s = jcs.servicos.find(x => x.subKey === subKey); if (s) return s.subLabel; }
      return subKey;
    });

    onSave({
      id: notaId,
      codigo,
      ...form,
      valorNF: totalNF,
      rodada,
      jogoId: jogosEnvolvidos.length === 1 ? jogosEnvolvidos[0] : jogosEnvolvidos[0],
      jogoIds: jogosEnvolvidos,
      jogoLabel,
      servicosKeys: selKeys,
      servicosLabels: [...new Set(allLabels)],
      servicosValores,
      servicosDetalhe: {...selecionados}, // "jogoId_subKey": valor (granular)
      tipo: "prevista",
      status: "Conferida",
      hasFile,
    });
    setUploading(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.card,borderRadius:16,padding:28,width:"100%",maxWidth:660,maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 4px",fontSize:16,color:T.text}}>Registrar Nota Fiscal</h3>
        <p style={{color:T.textSm,fontSize:12,margin:"0 0 16px"}}>Rodada {rodada} · Selecione serviços de um ou mais jogos</p>

        {/* Seleção por jogo */}
        <div style={{marginBottom:16}}>
          {jogosComServicos.map(({ jogo, servicos }) => (
            <div key={jogo.id} style={{marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <Pill label={jogo.categoria} color={jogo.categoria==="B1"?"#22c55e":"#f59e0b"}/>
                <span style={{fontWeight:700,fontSize:13,color:T.text}}>{jogo.mandante} x {jogo.visitante}</span>
              </div>
              <div style={{background:T.bg,borderRadius:8,padding:8,display:"flex",flexDirection:"column",gap:2}}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"2px 8px",fontSize:10,color:T.textSm}}>
                  <span style={{width:20}}/><span style={{flex:1}}>Serviço</span>
                  <span style={{width:80,textAlign:"right"}}>Ref. / Rest.</span>
                  <span style={{width:100,textAlign:"right"}}>Valor NF</span>
                </div>
                {servicos.map(s => {
                  const key = `${jogo.id}_${s.subKey}`;
                  const checked = selecionados[key] !== undefined;
                  const valorSugerido = s.multi ? s.restante : s.valorRef;
                  return (
                    <div key={key} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:6,
                      background:checked?s.catColor+"18":"transparent"}}>
                      <input type="checkbox" checked={checked} onChange={() => toggleServico(jogo.id, s.subKey, valorSugerido)}/>
                      <span style={{fontSize:13,color:T.text,flex:1,display:"flex",alignItems:"center",gap:6}}>
                        {s.subLabel}
                        {s.multi && s.lancado > 0 && (
                          <span style={{fontSize:9,padding:"1px 6px",borderRadius:4,background:"#f59e0b22",color:"#f59e0b",fontWeight:600,letterSpacing:0.3}}>
                            {fmt(s.lancado)} / {fmt(s.valorRef)}
                          </span>
                        )}
                        {s.multi && s.lancado === 0 && (
                          <span style={{fontSize:9,padding:"1px 6px",borderRadius:4,background:"#3b82f622",color:"#3b82f6",fontWeight:600,letterSpacing:0.3}}>
                            multi-NF
                          </span>
                        )}
                      </span>
                      <span style={{fontSize:11,color:T.textSm,width:80,textAlign:"right"}}>
                        {s.multi ? <>Rest. <b style={{color:T.textMd}}>{fmt(s.restante)}</b></> : fmt(s.valorRef)}
                      </span>
                      {checked
                        ? <input type="number" value={selecionados[key]} onChange={e => setValorUnit(key, e.target.value)}
                            style={{...IS,width:100,textAlign:"right",padding:"3px 6px",fontSize:12,color:"#8b5cf6",fontWeight:600}}/>
                        : <span style={{width:100}}/>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {jogosComServicos.length === 0 && <p style={{color:T.textSm,fontSize:12}}>Todos os serviços já possuem NF</p>}
          {selKeys.length > 0 && (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,padding:"0 8px"}}>
              <span style={{color:T.textMd,fontSize:11}}>{selKeys.length} serviço{selKeys.length>1?"s":""}{jogoIds.length>1?` em ${jogoIds.length} jogos`:""}</span>
              <span style={{fontSize:14,fontWeight:700,color:"#8b5cf6"}}>Total NF: {fmt(totalNF)}</span>
            </div>
          )}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Fornecedor</label>
            <FornecedorInput value={form.fornecedor} onChange={v => set("fornecedor", v)} fornecedores={fornecedores} T={T}/>
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
function NFAvulsaModal({ jogos, fornecedores, onSave, onClose, T }) {
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
    const notaId = Date.now();
    let hasFile = false;
    if (arquivo) {
      try {
        const dataUrl = await fileToDataUrl(arquivo);
        await saveNFFile(notaId, dataUrl);
        hasFile = true;
      } catch(_){}
    }
    onSave({
      id: notaId,
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
      hasFile,
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
            <FornecedorInput value={form.fornecedor} onChange={v => set("fornecedor", v)} fornecedores={fornecedores} T={T}/>
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

// ─── RECEBIDAS (submissões do formulário externo) ────────────────────────────
function RecebidasTab({ notas, addNota, jogos, T }) {
  const [submissions, setSubmissions] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editServicos, setEditServicos] = useState({});
  const [viewTab, setViewTab] = useState("pendentes"); // "pendentes" | "historico"

  const divulgados = jogos.filter(j => j.mandante !== "A definir");

  const loadAll = () => {
    setLoading(true);
    Promise.all([getState('nf_submissions'), getState('nf_historico')]).then(([s, h]) => {
      setSubmissions(s || []);
      setHistorico(h || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadAll(); }, []);

  const salvarHistorico = (next) => { setHistorico(next); setSupabaseState('nf_historico', next); };

  const startEdit = (sub) => {
    setEditingId(sub.id);
    // Copiar servicosValores para edição
    setEditServicos({...(sub.servicosValores || {})});
  };

  const toggleEditServico = (sub, subKey) => {
    setEditServicos(prev => {
      const next = {...prev};
      if (next[subKey] !== undefined) { delete next[subKey]; }
      else { next[subKey] = 0; }
      return next;
    });
  };

  const setEditValor = (subKey, val) => {
    setEditServicos(prev => ({...prev, [subKey]: parseFloat(val) || 0}));
  };

  const aprovar = (sub) => {
    const sv = editingId === sub.id ? editServicos : (sub.servicosValores || {});
    const valorNF = Object.values(sv).reduce((s, v) => s + (v || 0), 0);
    const jogo = divulgados.find(j => j.id === sub.jogoId);
    const allServicos = jogo ? extrairServicos(jogo) : [];
    const servicosKeys = Object.keys(sv).map(sk => `${sub.jogoId}_${sk}`);
    const servicosLabels = Object.keys(sv).map(sk => {
      const s = allServicos.find(x => x.subKey === sk);
      return s ? s.subLabel : sk;
    });

    const nota = {
      ...sub,
      servicosValores: sv,
      servicosKeys,
      servicosLabels,
      valorNF,
      tipo: "prevista",
      status: "Conferida",
      codigo: `RD${String(sub.rodada).padStart(2,"0")}_${sub.jogoLabel?.replace(/\s*x\s*/,"x").replace(/\s+/g,"").slice(0,10)}_${Math.round(valorNF)}_NF${(sub.numeroNF||"SN").replace(/\s/g,"")}`,
    };
    addNota(nota);
    salvarHistorico([...historico, {...sub, decisao:"aprovada", decidoEm: new Date().toISOString()}]);
    const next = submissions.filter(s => s.id !== sub.id);
    setSubmissions(next);
    setSupabaseState('nf_submissions', next);
    setEditingId(null);
  };

  const rejeitar = (id) => {
    if (!window.confirm("Rejeitar esta submissão?")) return;
    const sub = submissions.find(s => s.id === id);
    salvarHistorico([...historico, {...sub, decisao:"rejeitada", decidoEm: new Date().toISOString()}]);
    const next = submissions.filter(s => s.id !== id);
    setSubmissions(next);
    setSupabaseState('nf_submissions', next);
  };

  const recuperar = (item) => {
    const next = [...submissions, {...item, decisao:undefined, decidoEm:undefined}];
    setSubmissions(next);
    setSupabaseState('nf_submissions', next);
    salvarHistorico(historico.filter(h => h.id !== item.id));
  };

  const excluirDefinitivo = (id) => {
    if (!window.confirm("Excluir definitivamente do histórico?")) return;
    deleteNFFile(id);
    salvarHistorico(historico.filter(h => h.id !== id));
  };

  if (loading) return <p style={{color:T.textSm,padding:20}}>Carregando submissões...</p>;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{display:"flex",gap:4}}>
          {[{k:"pendentes",l:`Pendentes (${submissions.length})`},{k:"historico",l:`Histórico (${historico.length})`}].map(t => (
            <button key={t.k} onClick={() => setViewTab(t.k)} style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
              background:viewTab===t.k?"#8b5cf6":"transparent",color:viewTab===t.k?"#fff":T.textMd}}>
              {t.l}
            </button>
          ))}
        </div>
        <button onClick={loadAll} style={{...btnStyle,background:T.border,padding:"5px 14px",fontSize:11,color:T.text}}>Atualizar</button>
      </div>
      {viewTab === "pendentes" && submissions.length === 0 && (
        <div style={{background:T.card,borderRadius:12,padding:40,textAlign:"center"}}>
          <p style={{color:T.textSm,fontSize:13,margin:0}}>Nenhuma NF recebida pelo formulário externo</p>
          <p style={{color:T.textSm,fontSize:11,margin:"8px 0 0"}}>Link do formulário: <code style={{color:"#22c55e"}}>{window.location.origin}/#formulario</code></p>
        </div>
      )}
      {viewTab === "pendentes" && submissions.map(sub => {
        const isEditing = editingId === sub.id;
        const jogo = divulgados.find(j => j.id === sub.jogoId);
        const allServicos = jogo ? extrairServicos(jogo) : [];
        const svAtual = isEditing ? editServicos : (sub.servicosValores || {});
        const valorAtual = Object.values(svAtual).reduce((s, v) => s + (v || 0), 0);

        return (
          <div key={sub.id} style={{background:T.card,borderRadius:12,padding:"16px 20px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:12}}>
              <div>
                <span style={{fontWeight:700,fontSize:14,color:T.text}}>{sub.fornecedor}</span>
                <span style={{color:T.textSm,fontSize:12,marginLeft:12}}>{sub.jogoLabel} · Rd {sub.rodada}</span>
                {sub.numeroNF && <span style={{color:T.textSm,fontSize:11,marginLeft:8}}>NF {sub.numeroNF}</span>}
              </div>
              <span style={{color:"#8b5cf6",fontWeight:700,fontSize:16}}>{fmt(valorAtual)}</span>
            </div>

            {/* Serviços — modo visualização ou edição */}
            {!isEditing ? (
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                {Object.entries(svAtual).map(([sk, val]) => {
                  const label = allServicos.find(x => x.subKey === sk)?.subLabel || sk;
                  return <Pill key={sk} label={`${label}: ${fmt(val)}`} color="#06b6d4"/>;
                })}
              </div>
            ) : (
              <div style={{background:T.bg,borderRadius:8,padding:10,marginBottom:12}}>
                <p style={{color:T.textMd,fontSize:11,fontWeight:600,margin:"0 0 8px"}}>Editar serviços e valores:</p>
                {allServicos.map(s => {
                  const ativo = editServicos[s.subKey] !== undefined;
                  return (
                    <div key={s.subKey} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,padding:"4px 0"}}>
                      <input type="checkbox" checked={ativo} onChange={() => toggleEditServico(sub, s.subKey)}/>
                      <span style={{flex:1,fontSize:12,color:ativo?T.text:T.textSm}}>{s.subLabel}</span>
                      {ativo && (
                        <input type="number" value={editServicos[s.subKey]} onChange={e => setEditValor(s.subKey, e.target.value)}
                          style={{background:T.card,border:`1px solid ${T.muted}`,borderRadius:6,color:"#8b5cf6",padding:"4px 8px",width:90,textAlign:"right",fontSize:12,fontWeight:600}}/>
                      )}
                    </div>
                  );
                })}
                <div style={{borderTop:`1px solid ${T.border}`,marginTop:6,paddingTop:6,textAlign:"right"}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#8b5cf6"}}>Total: {fmt(valorAtual)}</span>
                </div>
              </div>
            )}

            <div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:12,color:T.textSm,marginBottom:12}}>
              {sub.dataEmissao && <span>Emissão: {sub.dataEmissao}</span>}
              {sub.dataEnvio && <span>Envio: {sub.dataEnvio}</span>}
              {sub.obs && <span>Obs: {sub.obs}</span>}
              {sub.hasFile && <Pill label="Arquivo anexo" color="#22c55e"/>}
              <span style={{color:T.textSm}}>Enviado: {new Date(sub.enviadoEm).toLocaleDateString("pt-BR")}</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              {!isEditing && <button onClick={() => startEdit(sub)} style={{...btnStyle,background:"#3b82f6",padding:"6px 20px",fontSize:12}}>Editar</button>}
              {isEditing && <button onClick={() => setEditingId(null)} style={{...btnStyle,background:"#475569",padding:"6px 20px",fontSize:12}}>Cancelar</button>}
              <button onClick={() => aprovar(sub)} style={{...btnStyle,background:"#22c55e",padding:"6px 20px",fontSize:12}}>Aprovar</button>
              <button onClick={() => rejeitar(sub.id)} style={{...btnStyle,background:"#7f1d1d",padding:"6px 20px",fontSize:12}}>Rejeitar</button>
            </div>
          </div>
        );
      })}

      {/* Histórico */}
      {viewTab === "historico" && (
        <>
          {historico.length === 0 && (
            <div style={{background:T.card,borderRadius:12,padding:40,textAlign:"center"}}>
              <p style={{color:T.textSm,fontSize:13,margin:0}}>Nenhum registro no histórico</p>
            </div>
          )}
          {[...historico].reverse().map(item => (
            <div key={item.id} style={{background:T.card,borderRadius:12,padding:"14px 20px",marginBottom:10,opacity:item.decisao==="rejeitada"?0.7:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Pill label={item.decisao==="aprovada"?"Aprovada":"Rejeitada"} color={item.decisao==="aprovada"?"#22c55e":"#ef4444"}/>
                  <span style={{fontWeight:700,fontSize:13,color:T.text}}>{item.fornecedor}</span>
                  <span style={{color:T.textSm,fontSize:11}}>{item.jogoLabel} · Rd {item.rodada}</span>
                </div>
                <span style={{color:"#8b5cf6",fontWeight:700,fontSize:14}}>{fmt(item.valorNF)}</span>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                {(item.servicosLabels||[]).map(s => <Pill key={s} label={s} color="#06b6d4"/>)}
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:11,color:T.textSm,marginBottom:10}}>
                {item.numeroNF && <span>NF {item.numeroNF}</span>}
                {item.decidoEm && <span>{item.decisao==="aprovada"?"Aprovada":"Rejeitada"} em {new Date(item.decidoEm).toLocaleDateString("pt-BR")}</span>}
                {item.enviadoEm && <span>Enviada em {new Date(item.enviadoEm).toLocaleDateString("pt-BR")}</span>}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={() => recuperar(item)} style={{...btnStyle,background:"#3b82f6",padding:"5px 16px",fontSize:11}}>Recuperar</button>
                <button onClick={() => excluirDefinitivo(item.id)} style={{...btnStyle,background:"#7f1d1d",padding:"5px 16px",fontSize:11}}>Excluir</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function TabNotas({ notas, setNotas, jogos, setJogos, fornecedores = [], envios = [], T }) {
  const [tab, setTab] = useState("rodada");
  const [rodadaSel, setRodadaSel] = useState(null);
  const [showRegistrar, setShowRegistrar] = useState(null);
  const [showAvulsa, setShowAvulsa] = useState(false);
  const [filtroPlanilha, setFiltroPlanilha] = useState("Todas");
  const [preview, setPreview] = useState(null);
  const uploadRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);

  const handleUploadLater = async (file, nota) => {
    if (!file || !nota) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      await saveNFFile(nota.id, dataUrl);
      setNotas(ns => ns.map(n => n.id === nota.id ? {...n, hasFile: true} : n));
    } catch (e) { console.error("Upload falhou:", e); }
    setUploadTarget(null);
  };

  const divulgados = jogos.filter(j => j.mandante !== "A definir");
  const rodadas = Array.from(new Set(divulgados.map(j => j.rodada))).sort((a, b) => a - b);
  const rodadaEfetiva = rodadaSel ?? (rodadas.length ? rodadas[rodadas.length - 1] : 1);
  const jogosRodada = divulgados.filter(j => j.rodada === rodadaEfetiva);

  // Mapa de notaId → número do envio
  const envioMap = useMemo(() => {
    const map = {};
    (envios || []).forEach(e => {
      const info = { numero: e.numero, dataPagamento: e.dataPagamento };
      (e.notasIds || []).forEach(id => { map[id] = info; });
    });
    return map;
  }, [envios]);

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

  // Recalcula o realizado sempre que as notas mudam
  useEffect(() => {
    setJogos(js => js.map(j => {
      const realizado = {...(j.realizado || {})};
      CATS.forEach(cat => cat.subs.forEach(sub => {
        if (!SUBS_EXCLUIR.has(sub.key)) realizado[sub.key] = 0;
      }));
      // Somar valores — usa servicosDetalhe (granular por jogo) se disponível
      notas.forEach(n => {
        if (n.servicosDetalhe) {
          // Multi-jogo: pegar só as chaves deste jogo
          Object.entries(n.servicosDetalhe).forEach(([k, valor]) => {
            const [jId, ...rest] = k.split("_");
            if (parseInt(jId) === j.id) {
              const subKey = rest.join("_");
              realizado[subKey] = (realizado[subKey] || 0) + valor;
            }
          });
        } else if (n.jogoId === j.id && n.servicosValores) {
          // Formato antigo: jogoId simples
          Object.entries(n.servicosValores).forEach(([subKey, valor]) => {
            realizado[subKey] = (realizado[subKey] || 0) + valor;
          });
        }
      });
      return {...j, realizado};
    }));
  }, [notas]); // eslint-disable-line react-hooks/exhaustive-deps

  const addNota = nota => {
    setNotas(ns => [...ns, nota]);
    setShowRegistrar(null);
    setShowAvulsa(false);
  };

  const deleteNota = id => {
    if (window.confirm("Excluir esta NF?")) {
      deleteNFFile(id);
      setNotas(ns => ns.filter(n => n.id !== id));
    }
  };

  const limparRodada = (rodada) => {
    const nfsRodada = notas.filter(n => n.rodada === rodada);
    if (nfsRodada.length === 0) return;
    if (!window.confirm(`Apagar todas as ${nfsRodada.length} NFs da rodada ${rodada}? Os arquivos também serão removidos.`)) return;
    nfsRodada.forEach(n => deleteNFFile(n.id));
    setNotas(ns => ns.filter(n => n.rodada !== rodada));
  };

  // Planilha
  const planilhaRodadas = ["Todas", ...Array.from(new Set(notas.map(n => String(n.rodada)).filter(Boolean))).sort((a, b) => a - b)];
  const planilhaItens = notas
    .filter(n => filtroPlanilha === "Todas" || String(n.rodada) === filtroPlanilha)
    .sort((a, b) => (a.rodada || 0) - (b.rodada || 0));

  const copyPlanilha = () => {
    const header = "Código\tNº NF\tFornecedor\tValor\tEmissão\tEnvio\tPagamento\tJogo\tRodada\tServiços\tTipo\tObs";
    const rows = planilhaItens.map(n =>
      `${n.codigo}\t${n.numeroNF}\t${n.fornecedor}\t${n.valorNF || 0}\t${n.dataEmissao}\t${n.dataEnvio}\t${envioMap[n.id]?.dataPagamento || ""}\t${n.jogoLabel}\t${n.rodada || ""}\t${(n.servicosLabels||[]).join(", ")}\t${n.tipo||"prevista"}\t${n.obs || ""}`
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
    alert("Planilha copiada!");
  };

  const TABS_NF = ["rodada", "planilha", "resumo", "recebidas"];

  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:4}}>
          {TABS_NF.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{padding:"6px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
              background:tab===t?"#8b5cf6":"transparent",color:tab===t?"#fff":T.textMd,textTransform:"capitalize"}}>
              {t === "rodada" ? "Por Rodada" : t === "planilha" ? "Planilha" : t === "resumo" ? "Resumo" : "Recebidas"}
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
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{color:T.textMd,fontSize:13,fontWeight:600}}>Rodada:</span>
            {rodadas.map(r => (
              <button key={r} onClick={() => setRodadaSel(r)} style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,
                background:rodadaEfetiva===r?"#8b5cf6":T.card,color:rodadaEfetiva===r?"#fff":T.textMd}}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={() => setShowRegistrar(true)} style={{...btnStyle,background:"#8b5cf6",fontSize:12,padding:"8px 20px"}}>+ Registrar NF (Rodada {rodadaEfetiva})</button>
        </div>

        {jogosRodada.map(jogo => {
          const servicos = extrairServicos(jogo);
          const nfsDoJogo = notas.filter(n => n.servicosKeys?.some(k => k.startsWith(`${jogo.id}_`)));
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
                      const isMulti = SUBS_MULTI_NF.has(s.subKey);
                      // Todas as NFs vinculadas a esta linha
                      const notasDestaLinha = nfsDoJogo.filter(n => n.servicosKeys?.includes(key));
                      // Soma considerando servicosDetalhe (granular por jogo) ou servicosValores (legado)
                      const valorUnit = notasDestaLinha.reduce((sum, n) => {
                        if (n.servicosDetalhe && n.servicosDetalhe[key] != null) return sum + n.servicosDetalhe[key];
                        if (n.servicosValores?.[s.subKey] != null) return sum + n.servicosValores[s.subKey];
                        return sum;
                      }, 0);
                      const hasNotas = notasDestaLinha.length > 0;
                      const diff = hasNotas ? valorUnit - s.valorRef : null;
                      const restante = s.valorRef - valorUnit;
                      const statusLabel = !hasNotas ? "Pendente" : (isMulti && restante > 0.01 ? "Parcial" : "Conferida");
                      const statusColor = !hasNotas ? "#f59e0b" : (statusLabel === "Parcial" ? "#3b82f6" : "#22c55e");
                      const nota = notasDestaLinha[0];
                      return (
                        <tr key={s.subKey} style={{borderTop:`1px solid ${T.border}`}}>
                          <td style={{padding:"8px 14px",fontWeight:600,fontSize:13,color:T.text}}>{s.subLabel}</td>
                          <td style={{padding:"8px 14px"}}><Pill label={s.catLabel} color={s.catColor}/></td>
                          <td style={{padding:"8px 14px",color:T.textSm,fontSize:12}}>{fmt(s.valorRef)}</td>
                          <td style={{padding:"8px 14px",fontSize:12}}>
                            {hasNotas ? (
                              <span style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                                <span style={{color:"#8b5cf6",fontWeight:600}}>{fmt(valorUnit)}</span>
                                {diff !== 0 && <span style={{fontSize:10,color:diff>0?"#ef4444":(isMulti?"#3b82f6":"#22c55e"),fontWeight:600}}>{diff>0?"+":""}{fmt(diff)}</span>}
                                {isMulti && notasDestaLinha.length > 1 && <span style={{fontSize:9,padding:"1px 5px",borderRadius:4,background:"#3b82f622",color:"#3b82f6",fontWeight:600}}>{notasDestaLinha.length} NFs</span>}
                              </span>
                            ) : <span style={{color:T.textSm}}>—</span>}
                          </td>
                          <td style={{padding:"8px 14px"}}>
                            <Pill label={statusLabel} color={statusColor}/>
                          </td>
                          <td style={{padding:"8px 14px",fontSize:11}}>
                            {!hasNotas ? <span style={{color:T.textSm}}>—</span>
                              : notasDestaLinha.length > 1 ? (
                                <span style={{color:T.textSm,fontSize:11}}>
                                  {notasDestaLinha.map(n => n.fornecedor).filter(Boolean).join(", ")}
                                </span>
                              ) : (
                                <span style={{color:T.text,display:"flex",alignItems:"center",gap:6}}>
                                  <code style={{color:"#22c55e",fontSize:11}}>{nota.codigo}</code>
                                  <span style={{color:T.textSm}}>{nota.fornecedor}</span>
                                  {envioMap[nota.id] && <Pill label={`Envio ${envioMap[nota.id].numero}`} color="#8b5cf6"/>}
                                  {nota.hasFile
                                    ? <button onClick={() => setPreview(nota)} style={{color:"#3b82f6",fontSize:10,fontWeight:600,background:"#3b82f622",padding:"2px 6px",borderRadius:4,border:"none",cursor:"pointer"}}>Ver</button>
                                    : <button onClick={() => {setUploadTarget(nota); uploadRef.current?.click();}} style={{color:"#f59e0b",fontSize:10,fontWeight:600,background:"#f59e0b22",padding:"2px 6px",borderRadius:4,border:"none",cursor:"pointer"}}>Enviar</button>}
                                  <button onClick={() => deleteNota(nota.id)} style={{color:"#ef4444",fontSize:10,fontWeight:600,background:"#ef444422",padding:"2px 6px",borderRadius:4,border:"none",cursor:"pointer"}}>Apagar</button>
                                </span>
                              )}
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
                {["Código","Nº NF","Fornecedor","Valor","Emissão","Envio","Pagamento","Jogo","Rd","Serviços","Tipo",""].map(h =>
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
                    <td style={{padding:"10px 12px",color:T.textMd,fontSize:12}}>{envioMap[n.id]?.dataPagamento || "—"}</td>
                    <td style={{padding:"10px 12px",color:T.text,fontSize:12,whiteSpace:"nowrap"}}>{n.jogoLabel}</td>
                    <td style={{padding:"10px 12px",color:T.textMd,fontSize:12}}>{n.rodada}</td>
                    <td style={{padding:"10px 12px",color:T.textSm,fontSize:11,maxWidth:200}}>{(n.servicosLabels||[]).join(", ")}</td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:4}}>
                        <Pill label={n.tipo==="avulsa"?"Avulsa":"Prevista"} color={n.tipo==="avulsa"?"#f59e0b":"#22c55e"}/>
                        {envioMap[n.id] && <Pill label={`Envio ${envioMap[n.id].numero}`} color="#8b5cf6"/>}
                      </div>
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:4}}>
                        {n.hasFile
                          ? <button onClick={() => setPreview(n)} style={{...btnStyle,background:"#3b82f6",padding:"4px 8px",fontSize:10}}>Ver</button>
                          : <button onClick={() => {setUploadTarget(n); uploadRef.current?.click();}} style={{...btnStyle,background:"#f59e0b",padding:"4px 8px",fontSize:10}}>Enviar</button>}
                        <button onClick={() => deleteNota(n.id)} style={{...btnStyle,background:"#7f1d1d",padding:"4px 8px",fontSize:10}}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {planilhaItens.length === 0 && (
                  <tr><td colSpan={12} style={{padding:40,textAlign:"center",color:T.textSm}}>Nenhuma nota registrada</td></tr>
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

      {/* ── RECEBIDAS (do formulário externo) ── */}
      {tab === "recebidas" && (
        <RecebidasTab notas={notas} addNota={addNota} jogos={jogos} T={T}/>
      )}

      {showRegistrar && <RegistrarNFModal jogosRodada={jogosRodada} notasExistentes={notas} fornecedores={fornecedores} onSave={addNota} onClose={() => setShowRegistrar(null)} T={T}/>}
      {showAvulsa && <NFAvulsaModal jogos={jogos} fornecedores={fornecedores} onSave={addNota} onClose={() => setShowAvulsa(false)} T={T}/>}
      {preview && <PreviewModal nota={preview} onClose={() => setPreview(null)} T={T}/>}
      <input ref={uploadRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" style={{display:"none"}}
        onChange={e => {if (e.target.files[0] && uploadTarget) handleUploadLater(e.target.files[0], uploadTarget); e.target.value="";}}/>
    </>
  );
}
