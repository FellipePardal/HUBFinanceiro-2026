import { useState, useRef, useEffect } from "react";
import { KPI, Pill } from "../shared";
import { fmt } from "../../utils";
import { btnStyle, iSty } from "../../constants";
import { fileToDataUrl, saveNFFile, getNFFile, deleteNFFile } from "../../lib/supabase";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const CATEGORIAS_MENSAL = ["Transporte","Uber","Hospedagem","Seg. Espacial","Outro"];
const STATUS_COLOR = {"Pendente":"#f59e0b","Recebida":"#8b5cf6","Conferida":"#22c55e"};

function FornecedorInput({ value, onChange, fornecedores, T }) {
  const IS = iSty(T);
  const [open, setOpen] = useState(false);
  const query = value.toLowerCase();
  const filtered = query.length > 0
    ? fornecedores.filter(f => f.apelido.toLowerCase().includes(query) || f.razaoSocial.toLowerCase().includes(query) || f.funcao.toLowerCase().includes(query)).slice(0, 8)
    : [];

  return (
    <div style={{position:"relative"}}>
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
              <span style={{fontSize:11,color:T.textSm}}>{f.funcao}</span>
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
    setLoading(true); setSrc(null);
    getNFFile(nota.id).then(data => { setSrc(data); setLoading(false); }).catch(() => setLoading(false));
  }, [nota?.id]);

  if (!nota) return null;
  const isPdf = src?.startsWith('data:application/pdf');

  return (
    <div style={{position:"fixed",inset:0,background:"#000000dd",zIndex:200,display:"flex",flexDirection:"column"}} onClick={onClose}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",flexShrink:0}} onClick={e => e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <span style={{color:"#fff",fontSize:13,fontWeight:700}}>{nota.fornecedor}</span>
          <span style={{color:"#8b5cf6",fontWeight:600,fontSize:13}}>{fmt(nota.valor)}</span>
          <span style={{color:"#94a3b8",fontSize:12}}>{nota.categoria} · {nota.mesLabel}</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          {src && <a href={src} download={`${nota.fornecedor}_${nota.mesLabel}`} style={{...btnStyle,background:"#3b82f6",padding:"6px 14px",fontSize:12,textDecoration:"none"}}>Download</a>}
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
            <img src={src} alt={nota.fornecedor} style={{maxWidth:"100%",maxHeight:"100%",borderRadius:12,objectFit:"contain"}}/>
          </div>
        )}
      </div>
    </div>
  );
}

function NovaNotaMensalModal({ fornecedores, onSave, onClose, T }) {
  const IS = iSty(T);
  const mesAtual = new Date().getMonth();
  const [form, setForm] = useState({
    fornecedor: "", categoria: "Transporte", mes: mesAtual, numeroNF: "",
    valor: 0, dataEmissao: "", dataEnvio: "", descricao: "", obs: "",
  });
  const [arquivo, setArquivo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const handleSave = async () => {
    if (!form.fornecedor) return;
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
      ...form,
      valor: parseFloat(form.valor) || 0,
      mes: parseInt(form.mes),
      mesLabel: MESES[parseInt(form.mes)],
      status: "Conferida",
      hasFile,
    });
    setUploading(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.card,borderRadius:16,padding:28,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 20px",fontSize:16,color:T.text}}>Nova Nota Fiscal Mensal</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Fornecedor</label>
            <FornecedorInput value={form.fornecedor} onChange={v => set("fornecedor", v)} fornecedores={fornecedores} T={T}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Categoria</label>
            <select value={form.categoria} onChange={e => set("categoria", e.target.value)} style={IS}>
              {CATEGORIAS_MENSAL.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Mês de referência</label>
            <select value={form.mes} onChange={e => set("mes", e.target.value)} style={IS}>
              {MESES.map((m,i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Nº da Nota</label>
            <input value={form.numeroNF} onChange={e => set("numeroNF", e.target.value)} style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Valor (R$)</label>
            <input type="number" value={form.valor} onChange={e => set("valor", e.target.value)} style={IS}/>
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
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Descrição</label>
          <input value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Ex: Transporte Janeiro, Uber Fevereiro..." style={IS}/>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Observações</label>
          <input value={form.obs} onChange={e => set("obs", e.target.value)} style={IS}/>
        </div>
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
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{...btnStyle,background:"#475569"}}>Cancelar</button>
          <button onClick={handleSave} disabled={uploading} style={{...btnStyle,background:"#06b6d4",opacity:uploading?0.5:1}}>
            {uploading ? "Enviando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TabNotasMensal({ notas, setNotas, fornecedores = [], T }) {
  const [mesSel, setMesSel] = useState(new Date().getMonth());
  const [filtroCat, setFiltroCat] = useState("Todas");
  const [showNova, setShowNova] = useState(false);
  const [preview, setPreview] = useState(null);
  const uploadRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);

  const mesesComNotas = Array.from(new Set(notas.map(n => n.mes))).sort((a, b) => a - b);
  const mesesExibir = Array.from(new Set([...mesesComNotas, mesSel])).sort((a, b) => a - b);

  const filtered = notas.filter(n =>
    n.mes === mesSel &&
    (filtroCat === "Todas" || n.categoria === filtroCat)
  );

  const totalValor = filtered.reduce((s, n) => s + (n.valor || 0), 0);
  const totalGeral = notas.reduce((s, n) => s + (n.valor || 0), 0);

  const addNota = n => { setNotas(ns => [...ns, n]); setShowNova(false); };

  const deleteNota = id => {
    if (window.confirm("Excluir esta nota?")) {
      deleteNFFile(id);
      setNotas(ns => ns.filter(n => n.id !== id));
    }
  };

  const handleUploadLater = async (file, nota) => {
    if (!file || !nota) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      await saveNFFile(nota.id, dataUrl);
      setNotas(ns => ns.map(n => n.id === nota.id ? {...n, hasFile: true} : n));
    } catch(_){}
    setUploadTarget(null);
  };

  // Resumo por categoria no mês
  const resumoCat = CATEGORIAS_MENSAL.map(cat => {
    const ns = filtered.filter(n => n.categoria === cat);
    return { cat, qtd: ns.length, valor: ns.reduce((s, n) => s + (n.valor || 0), 0) };
  }).filter(r => r.qtd > 0);

  return (
    <>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
        <KPI label={`Total ${MESES[mesSel]}`} value={fmt(totalValor)} sub={`${filtered.length} notas`} color="#06b6d4" T={T}/>
        <KPI label="Total Geral (todos os meses)" value={fmt(totalGeral)} sub={`${notas.length} notas`} color="#8b5cf6" T={T}/>
        <KPI label="Categorias no mês" value={String(resumoCat.length)} sub={resumoCat.map(r => r.cat).join(", ") || "—"} color="#22c55e" T={T}/>
      </div>

      {/* Seletor de mês + filtros */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{color:T.textMd,fontSize:13,fontWeight:600}}>Mês:</span>
          <select value={mesSel} onChange={e => setMesSel(parseInt(e.target.value))}
            style={{background:T.bg,border:`1px solid ${T.muted}`,borderRadius:8,color:T.text,padding:"6px 12px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <div style={{width:1,height:24,background:T.border}}/>
          {["Todas",...CATEGORIAS_MENSAL].map(c => (
            <button key={c} onClick={() => setFiltroCat(c)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,
              background:filtroCat===c?"#f59e0b":T.card,color:filtroCat===c?"#000":T.textMd}}>
              {c}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNova(true)} style={{...btnStyle,background:"#06b6d4",fontSize:12}}>+ Nova NF Mensal</button>
      </div>

      {/* Resumo por categoria */}
      {resumoCat.length > 0 && (
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {resumoCat.map(r => (
            <div key={r.cat} style={{background:T.card,borderRadius:8,padding:"8px 16px",display:"flex",gap:12,alignItems:"center"}}>
              <span style={{color:T.text,fontSize:12,fontWeight:600}}>{r.cat}</span>
              <span style={{color:"#06b6d4",fontSize:12,fontWeight:700}}>{fmt(r.valor)}</span>
              <span style={{color:T.textSm,fontSize:11}}>{r.qtd} NF{r.qtd>1?"s":""}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabela */}
      <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",color:T.textSm,fontSize:12}}>
          <span>{filtered.length} notas em {MESES[mesSel]}</span>
          <span>Total: <b style={{color:"#06b6d4"}}>{fmt(totalValor)}</b></span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
            <thead><tr style={{background:T.bg}}>
              {["Fornecedor","Categoria","Nº NF","Valor","Emissão","Envio","Descrição",""].map(h =>
                <th key={h} style={{padding:"10px 12px",textAlign:"left",color:T.textSm,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(n => (
                <tr key={n.id} style={{borderTop:`1px solid ${T.border}`}}>
                  <td style={{padding:"10px 12px",fontWeight:600,fontSize:13,color:T.text,whiteSpace:"nowrap"}}>{n.fornecedor}</td>
                  <td style={{padding:"10px 12px"}}><Pill label={n.categoria} color="#06b6d4"/></td>
                  <td style={{padding:"10px 12px",color:T.textMd,fontSize:12}}>{n.numeroNF || "—"}</td>
                  <td style={{padding:"10px 12px",color:"#06b6d4",fontWeight:600,whiteSpace:"nowrap"}}>{fmt(n.valor)}</td>
                  <td style={{padding:"10px 12px",color:T.textMd,fontSize:12}}>{n.dataEmissao || "—"}</td>
                  <td style={{padding:"10px 12px",color:T.textMd,fontSize:12}}>{n.dataEnvio || "—"}</td>
                  <td style={{padding:"10px 12px",color:T.textSm,fontSize:12,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.descricao || n.obs || "—"}</td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",gap:4}}>
                      {n.hasFile
                        ? <button onClick={() => setPreview(n)} style={{...btnStyle,background:"#3b82f6",padding:"4px 8px",fontSize:10}}>Ver</button>
                        : <button onClick={() => {setUploadTarget(n); uploadRef.current?.click();}} style={{...btnStyle,background:"#f59e0b",padding:"4px 8px",fontSize:10}}>Enviar</button>}
                      <button onClick={() => deleteNota(n.id)} style={{...btnStyle,background:"#7f1d1d",padding:"4px 8px",fontSize:10}}>Apagar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{padding:40,textAlign:"center",color:T.textSm}}>Nenhuma nota mensal em {MESES[mesSel]}</td></tr>
              )}
              {filtered.length > 0 && (
                <tr style={{borderTop:`2px solid ${T.border}`,background:T.bg,fontWeight:700}}>
                  <td style={{padding:"12px 12px",color:T.text}}>TOTAL</td>
                  <td colSpan={2}/>
                  <td style={{padding:"12px 12px",color:"#06b6d4",whiteSpace:"nowrap"}}>{fmt(totalValor)}</td>
                  <td colSpan={4}/>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNova && <NovaNotaMensalModal fornecedores={fornecedores} onSave={addNota} onClose={() => setShowNova(false)} T={T}/>}
      {preview && <PreviewModal nota={preview} onClose={() => setPreview(null)} T={T}/>}
      <input ref={uploadRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" style={{display:"none"}}
        onChange={e => {if (e.target.files[0] && uploadTarget) handleUploadLater(e.target.files[0], uploadTarget); e.target.value="";}}/>
    </>
  );
}
