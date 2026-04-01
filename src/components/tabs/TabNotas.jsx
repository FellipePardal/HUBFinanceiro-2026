import { useState } from "react";
import { KPI, Pill } from "../shared";
import { fmt } from "../../utils";
import { btnStyle } from "../../constants";

const STATUS_OPTS = ["Pendente","Em análise","Aprovada","Paga","Recusada"];
const STATUS_COLOR = {
  "Pendente":"#f59e0b","Em análise":"#3b82f6","Aprovada":"#22c55e","Paga":"#a3e635","Recusada":"#ef4444",
};

const iSty = T => ({background:T.bg,border:`1px solid ${T.muted}`,borderRadius:6,color:T.text,padding:"7px 10px",fontSize:13,width:"100%",boxSizing:"border-box"});

function NovaNotaModal({ onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState({
    fornecedor:"", numero:"", valor:0, dataEmissao:"", dataVencimento:"",
    descricao:"", categoria:"Logística", status:"Pendente", jogoId:null, obs:"",
  });
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const field = (label, key, opts=null, type="text") => (
    <div style={{marginBottom:12}}>
      <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>{label}</label>
      {opts
        ? <select value={form[key]} onChange={e => set(key, e.target.value)} style={IS}>{opts.map(o => <option key={o}>{o}</option>)}</select>
        : <input type={type} value={form[key]} onChange={e => set(key, type==="number" ? (parseFloat(e.target.value)||0) : e.target.value)} style={IS}/>}
    </div>
  );

  const handleSave = () => {
    if (!form.fornecedor || !form.numero) return;
    onSave({ ...form, id: Date.now(), criadoEm: new Date().toISOString() });
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.card,borderRadius:16,padding:28,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 20px",fontSize:16,color:T.text}}>Nova Nota Fiscal</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          {field("Fornecedor","fornecedor")}
          {field("Nº da Nota","numero")}
          {field("Valor (R$)","valor",null,"number")}
          {field("Categoria","categoria",["Logística","Pessoal","Operações","Infraestrutura","Transmissão","Outro"])}
          {field("Data Emissão","dataEmissao")}
          {field("Data Vencimento","dataVencimento")}
          {field("Status","status",STATUS_OPTS)}
        </div>
        {field("Descrição","descricao")}
        {field("Observações","obs")}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
          <button onClick={onClose} style={{...btnStyle,background:"#475569"}}>Cancelar</button>
          <button onClick={handleSave} style={{...btnStyle,background:"#8b5cf6"}}>Adicionar</button>
        </div>
      </div>
    </div>
  );
}

export default function TabNotas({ notas, setNotas, T }) {
  const [tab, setTab] = useState("lista");
  const [showNova, setShowNova] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroCat, setFiltroCat] = useState("Todas");
  const [editing, setEditing] = useState(null);

  const filtered = notas.filter(n =>
    (filtroStatus === "Todos" || n.status === filtroStatus) &&
    (filtroCat === "Todas" || n.categoria === filtroCat)
  );

  const totalValor     = filtered.reduce((s, n) => s + n.valor, 0);
  const totalPagas     = filtered.filter(n => n.status === "Paga").reduce((s, n) => s + n.valor, 0);
  const totalPendentes = filtered.filter(n => n.status === "Pendente" || n.status === "Em análise").reduce((s, n) => s + n.valor, 0);
  const totalAprovadas = filtered.filter(n => n.status === "Aprovada").reduce((s, n) => s + n.valor, 0);

  const addNota = n => { setNotas(ns => [...ns, n]); setShowNova(false); };
  const deleteNota = id => { if (window.confirm("Excluir esta nota?")) setNotas(ns => ns.filter(n => n.id !== id)); };
  const updateStatus = (id, status) => setNotas(ns => ns.map(n => n.id === id ? {...n, status} : n));

  const TABS_NF = ["lista","resumo"];

  return (
    <>
      {/* Sub-tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20}}>
        {TABS_NF.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{padding:"6px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
            background:tab===t?"#8b5cf6":"transparent",color:tab===t?"#fff":T.textMd,textTransform:"capitalize"}}>
            {t}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        <KPI label="Total Notas" value={fmt(totalValor)} sub={`${filtered.length} notas`} color="#8b5cf6" T={T}/>
        <KPI label="Pendentes" value={fmt(totalPendentes)} sub="Aguardando" color="#f59e0b" T={T}/>
        <KPI label="Aprovadas" value={fmt(totalAprovadas)} sub="A pagar" color="#22c55e" T={T}/>
        <KPI label="Pagas" value={fmt(totalPagas)} sub="Concluídas" color="#a3e635" T={T}/>
      </div>

      {tab === "lista" && (<>
        {/* Filtros + botão */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["Todos",...STATUS_OPTS].map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,
                background:filtroStatus===s?(STATUS_COLOR[s]||"#8b5cf6"):T.card,color:filtroStatus===s?"#fff":T.textMd}}>
                {s}
              </button>
            ))}
            <div style={{width:1,background:T.border,margin:"0 4px"}}/>
            {["Todas","Logística","Pessoal","Operações","Infraestrutura","Transmissão","Outro"].map(c => (
              <button key={c} onClick={() => setFiltroCat(c)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,
                background:filtroCat===c?"#6366f1":T.card,color:filtroCat===c?"#fff":T.textMd}}>
                {c}
              </button>
            ))}
          </div>
          <button onClick={() => setShowNova(true)} style={{...btnStyle,background:"#8b5cf6",fontSize:12}}>+ Nova Nota</button>
        </div>

        {/* Tabela */}
        <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,color:T.textSm,fontSize:12}}>{filtered.length} notas</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}>
              <thead><tr style={{background:T.bg}}>
                {["Fornecedor","Nº Nota","Categoria","Valor","Emissão","Vencimento","Status","Descrição",""].map(h =>
                  <th key={h} style={{padding:"10px 12px",textAlign:"left",color:T.textSm,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map(n => (
                  <tr key={n.id} style={{borderTop:`1px solid ${T.border}`}}>
                    <td style={{padding:"10px 12px",fontWeight:600,fontSize:13,color:T.text,whiteSpace:"nowrap"}}>{n.fornecedor}</td>
                    <td style={{padding:"10px 12px",color:T.textMd,fontSize:12}}>{n.numero}</td>
                    <td style={{padding:"10px 12px"}}><Pill label={n.categoria} color="#6366f1"/></td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:"#8b5cf6",whiteSpace:"nowrap"}}>{fmt(n.valor)}</td>
                    <td style={{padding:"10px 12px",color:T.textMd,fontSize:12,whiteSpace:"nowrap"}}>{n.dataEmissao}</td>
                    <td style={{padding:"10px 12px",color:T.textMd,fontSize:12,whiteSpace:"nowrap"}}>{n.dataVencimento}</td>
                    <td style={{padding:"10px 12px"}}>
                      <select value={n.status} onChange={e => updateStatus(n.id, e.target.value)}
                        style={{background:STATUS_COLOR[n.status]+"22",color:STATUS_COLOR[n.status],border:`1px solid ${STATUS_COLOR[n.status]}44`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                        {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"10px 12px",color:T.textSm,fontSize:12,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.descricao}</td>
                    <td style={{padding:"10px 12px"}}>
                      <button onClick={() => deleteNota(n.id)} style={{...btnStyle,background:"#7f1d1d",padding:"4px 10px",fontSize:11}}>🗑</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{padding:40,textAlign:"center",color:T.textSm}}>Nenhuma nota fiscal cadastrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>)}

      {tab === "resumo" && (
        <div style={{display:"grid",gap:16}}>
          {/* Por status */}
          <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`}}>
              <h3 style={{margin:0,fontSize:14,color:T.textMd}}>Resumo por Status</h3>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:T.bg}}>
                  {["Status","Qtd","Valor Total","% do Total"].map(h =>
                    <th key={h} style={{padding:"10px 16px",textAlign:h==="Status"?"left":"right",color:T.textSm,fontSize:11}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {STATUS_OPTS.map(s => {
                    const ns = notas.filter(n => n.status === s);
                    const val = ns.reduce((sum, n) => sum + n.valor, 0);
                    const totalAll = notas.reduce((sum, n) => sum + n.valor, 0);
                    const pct = totalAll ? (val / totalAll * 100).toFixed(1) : 0;
                    return (
                      <tr key={s} style={{borderTop:`1px solid ${T.border}`}}>
                        <td style={{padding:"10px 16px"}}><Pill label={s} color={STATUS_COLOR[s]}/></td>
                        <td style={{padding:"10px 16px",textAlign:"right",color:T.text}}>{ns.length}</td>
                        <td style={{padding:"10px 16px",textAlign:"right",color:STATUS_COLOR[s],fontWeight:600}}>{fmt(val)}</td>
                        <td style={{padding:"10px 16px",textAlign:"right",color:T.textMd}}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Por categoria */}
          <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.border}`}}>
              <h3 style={{margin:0,fontSize:14,color:T.textMd}}>Resumo por Categoria</h3>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:T.bg}}>
                  {["Categoria","Qtd","Valor Total","% do Total"].map(h =>
                    <th key={h} style={{padding:"10px 16px",textAlign:h==="Categoria"?"left":"right",color:T.textSm,fontSize:11}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {["Logística","Pessoal","Operações","Infraestrutura","Transmissão","Outro"].map(cat => {
                    const ns = notas.filter(n => n.categoria === cat);
                    if (ns.length === 0) return null;
                    const val = ns.reduce((sum, n) => sum + n.valor, 0);
                    const totalAll = notas.reduce((sum, n) => sum + n.valor, 0);
                    const pct = totalAll ? (val / totalAll * 100).toFixed(1) : 0;
                    return (
                      <tr key={cat} style={{borderTop:`1px solid ${T.border}`}}>
                        <td style={{padding:"10px 16px",fontWeight:600,color:T.text}}>{cat}</td>
                        <td style={{padding:"10px 16px",textAlign:"right",color:T.text}}>{ns.length}</td>
                        <td style={{padding:"10px 16px",textAlign:"right",color:"#8b5cf6",fontWeight:600}}>{fmt(val)}</td>
                        <td style={{padding:"10px 16px",textAlign:"right",color:T.textMd}}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showNova && <NovaNotaModal onSave={addNota} onClose={() => setShowNova(false)} T={T}/>}
    </>
  );
}
