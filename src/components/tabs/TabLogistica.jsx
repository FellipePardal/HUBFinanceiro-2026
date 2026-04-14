import { useState, useMemo, useRef } from "react";
import { KPI, Pill } from "../shared";
import { iSty, btnStyle } from "../../constants";
import { Card, Button, Progress, tableStyles } from "../ui";
import { Plus, Trash2, Paperclip, Eye, CheckCircle2, Clock, Send } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, CartesianGrid, Legend,
} from "recharts";
import { fileToDataUrl, saveNFFile, getNFFile, deleteNFFile } from "../../lib/supabase";

const fmt = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});

export const CATEGORIAS_LOG = [
  { key:"transporte_locado", label:"Transporte Locado", color:"#6366f1" },
  { key:"uber",              label:"Uber",              color:"#f59e0b" },
  { key:"hospedagem",        label:"Hospedagem",        color:"#22c55e" },
  { key:"outros",            label:"Outros",            color:"#a855f7" },
];

export const STATUS_REEMBOLSO = [
  { key:"pendente",    label:"Pendente",    color:"#f59e0b" },
  { key:"solicitado",  label:"Solicitado",  color:"#3b82f6" },
  { key:"reembolsado", label:"Reembolsado", color:"#22c55e" },
];

function abreviar(nome) {
  if (!nome || nome === "A definir") return "TBD";
  const map = {"Fluminense":"FLU","Botafogo":"BOT","Flamengo":"FLA","Vasco":"VAS","Corinthians":"COR","Palmeiras":"PAL","São Paulo":"SAO","Athletico PR":"CAP","Grêmio":"GRE","Internacional":"INT","Cruzeiro":"CRU","Atlético MG":"CAM","Chapecoense":"CHA","Santos":"SAN","Vitória":"VIT","Mirassol":"MIR","Coritiba":"CFC"};
  return map[nome] || nome.slice(0,3).toUpperCase();
}
function jogoLabel(j) { return `${abreviar(j.mandante)}x${abreviar(j.visitante)}`; }

// ─── Modal Novo/Editar Lançamento ────────────────────────────────────────────
function LogisticaModal({ onSave, onClose, jogos, lancamento, T }) {
  const IS = iSty(T);
  const divulgados = jogos.filter(j => j.mandante !== "A definir").sort((a,b) => a.rodada - b.rodada);
  const [selJogos, setSelJogos] = useState(new Set(lancamento?.jogosIds || []));
  const [form, setForm] = useState({
    data:         lancamento?.data         || "",
    categoria:    lancamento?.categoria    || "transporte_locado",
    descricao:    lancamento?.descricao    || "",
    valor:        lancamento?.valor        || 0,
    fornecedor:   lancamento?.fornecedor   || "",
    status:       lancamento?.status       || "pendente",
    obs:          lancamento?.obs          || "",
  });
  const [arquivo, setArquivo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  const toggleJogo = id => setSelJogos(p => { const n = new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const selectByRodada = rod => {
    const ids = divulgados.filter(j => j.rodada === rod).map(j => j.id);
    setSelJogos(p => { const n = new Set(p); ids.forEach(id => n.add(id)); return n; });
  };

  const rodadasComJogos = useMemo(() => {
    const map = {};
    divulgados.forEach(j => { if (!map[j.rodada]) map[j.rodada] = []; map[j.rodada].push(j); });
    return Object.entries(map).sort(([a],[b]) => a-b);
  }, [divulgados]);

  const jogosIds = [...selJogos];
  const selJogosArr = divulgados.filter(j => selJogos.has(j.id));
  const rodadasArr = [...new Set(selJogosArr.map(j => j.rodada))].sort((a,b) => a-b);
  const jogosResumoLabel = selJogos.size === 0 ? "" :
    selJogos.size <= 4 ? selJogosArr.map(j => `Rd${j.rodada} ${jogoLabel(j)}`).join(", ") :
    `${selJogos.size} jogos (Rd ${rodadasArr[0]}-${rodadasArr[rodadasArr.length-1]})`;

  const valorPorJogo = selJogos.size > 0 ? form.valor / selJogos.size : 0;

  const handleSave = async () => {
    if (selJogos.size === 0 || !form.valor || !form.categoria) return;
    setUploading(true);
    const id = lancamento?.id || Date.now();
    let hasFile = lancamento?.hasFile || false;
    if (arquivo) {
      try { const dataUrl = await fileToDataUrl(arquivo); await saveNFFile(id, dataUrl); hasFile = true; } catch(_){}
    }
    onSave({
      id,
      jogosIds,
      jogosResumoLabel,
      rodadas: rodadasArr,
      data:       form.data,
      categoria:  form.categoria,
      descricao:  form.descricao,
      fornecedor: form.fornecedor,
      valor:      parseFloat(form.valor) || 0,
      valorPorJogo,
      status:     form.status,
      obs:        form.obs,
      hasFile,
    });
    setUploading(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.card,borderRadius:16,padding:28,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 4px",fontSize:16,color:T.text}}>{lancamento?"Editar":"Novo"} Lançamento Logística</h3>
        <p style={{color:T.textSm,fontSize:12,margin:"0 0 16px"}}>Selecione os jogos relacionados a este gasto</p>

        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <label style={{color:T.textMd,fontSize:12}}>Jogos <span style={{color:T.textSm,fontSize:11}}>({selJogos.size} selecionado{selJogos.size!==1?"s":""})</span></label>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>setSelJogos(new Set(divulgados.map(j=>j.id)))} style={{...btnStyle,background:T.border,padding:"3px 8px",fontSize:10,color:T.text}}>Todos</button>
              <button onClick={()=>setSelJogos(new Set())} style={{...btnStyle,background:T.border,padding:"3px 8px",fontSize:10,color:T.text}}>Limpar</button>
            </div>
          </div>
          <div style={{maxHeight:200,overflowY:"auto",background:T.bg,borderRadius:8,padding:4}}>
            {rodadasComJogos.map(([rod, jgs]) => (
              <div key={rod}>
                <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px"}}>
                  <button onClick={()=>selectByRodada(parseInt(rod))} style={{background:"none",border:"none",color:T.textSm,fontSize:10,cursor:"pointer",fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase",padding:0}}>Rd {rod}</button>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,padding:"0 8px 6px"}}>
                  {jgs.map(j => {
                    const sel = selJogos.has(j.id);
                    return (
                      <button key={j.id} onClick={()=>toggleJogo(j.id)}
                        style={{
                          padding:"4px 10px", borderRadius:6,
                          border:`1px solid ${sel?"#14b8a6":T.muted}`,
                          background:sel?"#14b8a622":"transparent",
                          color:sel?"#14b8a6":T.textMd,
                          fontSize:11, fontWeight:sel?700:500, cursor:"pointer", whiteSpace:"nowrap",
                        }}>
                        {j.mandante} x {j.visitante}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {selJogos.size > 0 && <p style={{color:"#14b8a6",fontSize:11,margin:"6px 0 0",fontWeight:600}}>{jogosResumoLabel}{form.valor?` · ${fmt(valorPorJogo)}/jogo`:""}</p>}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Categoria</label>
            <select value={form.categoria} onChange={e=>set("categoria",e.target.value)} style={IS}>
              {CATEGORIAS_LOG.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Valor Total (R$)</label>
            <input type="number" value={form.valor} onChange={e=>set("valor",e.target.value)} style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Data</label>
            <input type="date" value={form.data} onChange={e=>set("data",e.target.value)} style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Fornecedor / Prestador</label>
            <input value={form.fornecedor} onChange={e=>set("fornecedor",e.target.value)} placeholder="Ex: Uber, Localiza..." style={IS}/>
          </div>
          <div style={{marginBottom:12,gridColumn:"1 / -1"}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Descrição</label>
            <input value={form.descricao} onChange={e=>set("descricao",e.target.value)} placeholder="Ex: Corrida aeroporto → hotel" style={IS}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Status Reembolso</label>
            <select value={form.status} onChange={e=>set("status",e.target.value)} style={IS}>
              {STATUS_REEMBOLSO.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Observações</label>
            <input value={form.obs} onChange={e=>set("obs",e.target.value)} style={IS}/>
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>Comprovante (PDF/imagem)</label>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e=>setArquivo(e.target.files[0]||null)} style={{display:"none"}}/>
          <div onClick={()=>fileRef.current?.click()}
            onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();setArquivo(e.dataTransfer.files[0]||null);}}
            style={{border:`2px dashed ${arquivo||lancamento?.hasFile?"#22c55e":T.muted}`,borderRadius:8,padding:"14px 16px",cursor:"pointer",textAlign:"center",background:arquivo?"#22c55e11":T.bg}}>
            {arquivo
              ? <p style={{margin:0,color:"#22c55e",fontSize:13,fontWeight:600}}>{arquivo.name} ({(arquivo.size/1024).toFixed(0)} KB)</p>
              : lancamento?.hasFile
                ? <p style={{margin:0,color:"#22c55e",fontSize:12}}>Comprovante anexado (clique para substituir)</p>
                : <p style={{margin:0,color:T.textSm,fontSize:12}}>Clique ou arraste o arquivo aqui</p>}
          </div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{...btnStyle,background:"#475569"}}>Cancelar</button>
          <button onClick={handleSave} disabled={selJogos.size===0||!form.valor||uploading}
            style={{...btnStyle,background:selJogos.size>0&&form.valor?"#22c55e":"#475569",opacity:selJogos.size>0&&form.valor&&!uploading?1:0.5}}>
            {uploading ? "Enviando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────
export default function TabLogistica({ logistica, setLogistica, jogos, T }) {
  const [tab, setTab] = useState("lancamentos");
  const [showModal, setShowModal] = useState(false);
  const [editLanc, setEditLanc] = useState(null);
  const [filtroCat, setFiltroCat] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const TS = tableStyles(T);
  const teal = "#14b8a6";
  const purple = "#a855f7";
  const danger = T.danger || "#ef4444";

  const lancamentos = Array.isArray(logistica) ? logistica : [];
  const divulgados = jogos.filter(j => j.mandante !== "A definir").sort((a,b) => a.rodada - b.rodada || a.id - b.id);

  const filtrados = lancamentos.filter(l =>
    (filtroCat === "todas" || l.categoria === filtroCat) &&
    (filtroStatus === "todos" || l.status === filtroStatus)
  );

  const totalGasto      = lancamentos.reduce((s,l) => s + (l.valor||0), 0);
  const totalPendente   = lancamentos.filter(l => l.status === "pendente").reduce((s,l) => s+(l.valor||0), 0);
  const totalSolicitado = lancamentos.filter(l => l.status === "solicitado").reduce((s,l) => s+(l.valor||0), 0);
  const totalReembolsado= lancamentos.filter(l => l.status === "reembolsado").reduce((s,l) => s+(l.valor||0), 0);

  const saveLancamento = lanc => {
    setLogistica(ls => {
      const arr = Array.isArray(ls) ? ls : [];
      const idx = arr.findIndex(x => x.id === lanc.id);
      if (idx >= 0) { const copy = [...arr]; copy[idx] = lanc; return copy; }
      return [...arr, lanc];
    });
    setShowModal(false); setEditLanc(null);
  };
  const deleteLancamento = id => {
    if (!window.confirm("Excluir este lançamento?")) return;
    deleteNFFile(id);
    setLogistica(ls => (ls||[]).filter(l => l.id !== id));
  };
  const verComprovante = async id => {
    const url = await getNFFile(id);
    if (!url) { alert("Sem comprovante anexado"); return; }
    const w = window.open(); w.document.write(`<iframe src="${url}" style="border:none;width:100%;height:100vh"></iframe>`);
  };
  const marcarStatus = (id, status) => {
    setLogistica(ls => (ls||[]).map(l => l.id === id ? {...l, status} : l));
  };

  // Gráficos
  const porCategoria = CATEGORIAS_LOG.map(c => ({
    name: c.label,
    valor: lancamentos.filter(l => l.categoria === c.key).reduce((s,l) => s+(l.valor||0), 0),
    color: c.color,
  }));

  const porJogo = useMemo(() => {
    const map = {};
    lancamentos.forEach(l => {
      const ids = l.jogosIds || [];
      const vpj = ids.length > 0 ? (l.valorPorJogo || (l.valor / ids.length)) : 0;
      ids.forEach(id => { map[id] = (map[id]||0) + vpj; });
    });
    return divulgados.map(j => ({
      name: `R${j.rodada} ${abreviar(j.mandante)}`,
      valor: Math.round(map[j.id] || 0),
    })).filter(x => x.valor > 0);
  }, [lancamentos, divulgados]);

  const catLabel = k => CATEGORIAS_LOG.find(c => c.key === k)?.label || k;
  const catColor = k => CATEGORIAS_LOG.find(c => c.key === k)?.color || T.textMd;
  const statusInfo = k => STATUS_REEMBOLSO.find(s => s.key === k) || STATUS_REEMBOLSO[0];

  const TABS = [
    {value:"lancamentos", label:"Lançamentos"},
    {value:"graficos",    label:"Gráficos"},
  ];

  return (
    <div>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:20}}>
        <KPI label="Total Gasto"       value={fmt(totalGasto)}       sub={`${lancamentos.length} lançamentos`} color={purple} T={T}/>
        <KPI label="Pendente"          value={fmt(totalPendente)}    sub="A solicitar"                          color="#f59e0b" T={T}/>
        <KPI label="Solicitado"        value={fmt(totalSolicitado)}  sub="Aguardando"                           color="#3b82f6" T={T}/>
        <KPI label="Reembolsado"       value={fmt(totalReembolsado)} sub={`${totalGasto?((totalReembolsado/totalGasto)*100).toFixed(0):0}% do total`} color="#22c55e" T={T}/>
      </div>

      {/* Sub-tabs + ações */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:4}}>
          {TABS.map(t => (
            <button key={t.value} onClick={()=>setTab(t.value)} style={{
              padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
              background:tab===t.value?teal:"transparent",color:tab===t.value?"#fff":T.textMd,
            }}>{t.label}</button>
          ))}
        </div>
        <Button T={T} variant="primary" size="md" icon={Plus} onClick={()=>{setEditLanc(null);setShowModal(true);}}>Novo Lançamento</Button>
      </div>

      {/* ABA LANÇAMENTOS */}
      {tab === "lancamentos" && (
        <>
          <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
            <select value={filtroCat} onChange={e=>setFiltroCat(e.target.value)} style={{...iSty(T),width:"auto"}}>
              <option value="todas">Todas categorias</option>
              {CATEGORIAS_LOG.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{...iSty(T),width:"auto"}}>
              <option value="todos">Todos status</option>
              {STATUS_REEMBOLSO.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          {filtrados.length === 0 ? (
            <Card T={T}>
              <div style={{padding:50,textAlign:"center"}}>
                <p style={{color:T.text,fontSize:14,margin:"0 0 4px",fontWeight:600}}>Nenhum lançamento</p>
                <p style={{color:T.textSm,fontSize:12,margin:0}}>Clique em "Novo Lançamento" para começar</p>
              </div>
            </Card>
          ) : (
            <Card T={T}>
              <div style={TS.wrap}>
                <table style={{...TS.table, minWidth:900}}>
                  <thead>
                    <tr style={TS.thead}>
                      {["Data","Jogos","Categoria","Descrição","Fornecedor","Valor","Status","Comp.",""].map(h =>
                        <th key={h} style={{...TS.th, ...(h==="Valor"?TS.thRight:TS.thLeft)}}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {[...filtrados].sort((a,b) => (b.data||"").localeCompare(a.data||"")).map(l => {
                      const st = statusInfo(l.status);
                      return (
                        <tr key={l.id} style={TS.tr}>
                          <td className="num" style={{...TS.td,fontSize:11,color:T.textSm,whiteSpace:"nowrap"}}>{l.data ? new Date(l.data).toLocaleDateString("pt-BR") : "—"}</td>
                          <td style={{...TS.td,fontSize:12,fontWeight:600,maxWidth:180}}>{l.jogosResumoLabel || `${(l.jogosIds||[]).length} jogos`}</td>
                          <td style={TS.td}><Pill label={catLabel(l.categoria)} color={catColor(l.categoria)}/></td>
                          <td style={{...TS.td,fontSize:12,color:T.textMd,maxWidth:200}}>{l.descricao||"—"}</td>
                          <td style={{...TS.td,fontSize:12}}>{l.fornecedor||"—"}</td>
                          <td className="num" style={{...TS.tdNum,color:purple,fontWeight:700}}>{fmt(l.valor)}</td>
                          <td style={TS.td}>
                            <select value={l.status} onChange={e=>marcarStatus(l.id,e.target.value)}
                              style={{background:st.color+"22",color:st.color,border:`1px solid ${st.color}55`,borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                              {STATUS_REEMBOLSO.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                            </select>
                          </td>
                          <td style={TS.td}>
                            {l.hasFile
                              ? <Button T={T} variant="secondary" size="sm" icon={Eye} onClick={()=>verComprovante(l.id)}/>
                              : <span style={{fontSize:10,color:T.textSm}}>—</span>}
                          </td>
                          <td style={TS.td}>
                            <div style={{display:"flex",gap:4}}>
                              <Button T={T} variant="secondary" size="sm" icon={Paperclip} onClick={()=>{setEditLanc(l);setShowModal(true);}}/>
                              <Button T={T} variant="danger" size="sm" icon={Trash2} onClick={()=>deleteLancamento(l.id)}/>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{borderTop:`2px solid ${T.borderStrong||T.border}`,background:T.surfaceAlt||T.bg,fontWeight:700}}>
                      <td colSpan={5} style={{...TS.td,fontSize:11,letterSpacing:"0.04em",textTransform:"uppercase"}}>Total ({filtrados.length})</td>
                      <td className="num" style={{...TS.tdNum,color:purple,fontWeight:700,fontSize:14}}>{fmt(filtrados.reduce((s,l)=>s+(l.valor||0),0))}</td>
                      <td colSpan={3}/>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ABA GRÁFICOS */}
      {tab === "graficos" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:16}}>
          <Card T={T}>
            <div style={{padding:"16px 20px"}}>
              <h4 style={{margin:"0 0 12px",color:T.text,fontSize:13,fontWeight:700}}>Gasto por Categoria</h4>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={porCategoria.filter(x=>x.valor>0)} dataKey="valor" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,valor})=>`${name}: ${fmt(valor)}`}>
                    {porCategoria.map((c,i) => <Cell key={i} fill={c.color}/>)}
                  </Pie>
                  <Tooltip formatter={v=>fmt(v)}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card T={T}>
            <div style={{padding:"16px 20px"}}>
              <h4 style={{margin:"0 0 12px",color:T.text,fontSize:13,fontWeight:700}}>Total por Categoria</h4>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={porCategoria}>
                  <CartesianGrid stroke={T.border} strokeDasharray="3 3"/>
                  <XAxis dataKey="name" tick={{fill:T.textMd,fontSize:11}}/>
                  <YAxis tick={{fill:T.textMd,fontSize:11}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={v=>fmt(v)}/>
                  <Bar dataKey="valor">
                    {porCategoria.map((c,i) => <Cell key={i} fill={c.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card T={T} style={{gridColumn:"1 / -1"}}>
            <div style={{padding:"16px 20px"}}>
              <h4 style={{margin:"0 0 12px",color:T.text,fontSize:13,fontWeight:700}}>Gasto por Jogo</h4>
              {porJogo.length === 0
                ? <p style={{color:T.textSm,fontSize:12,margin:0,padding:"20px 0",textAlign:"center"}}>Sem lançamentos</p>
                : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={porJogo}>
                    <CartesianGrid stroke={T.border} strokeDasharray="3 3"/>
                    <XAxis dataKey="name" tick={{fill:T.textMd,fontSize:10}} angle={-35} textAnchor="end" height={70}/>
                    <YAxis tick={{fill:T.textMd,fontSize:11}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                    <Tooltip formatter={v=>fmt(v)}/>
                    <Bar dataKey="valor" fill={teal}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      )}

      {showModal && <LogisticaModal onSave={saveLancamento} onClose={()=>{setShowModal(false);setEditLanc(null);}} jogos={jogos} lancamento={editLanc} T={T}/>}
    </div>
  );
}
