import { useState, useMemo } from "react";
import { CIDADES, RADIUS, iSty } from "../../constants";
import { fmt } from "../../utils";
import { KPI } from "../shared";
import { Card, PanelTitle, SectionHeader, Button, Chip, Badge, tableStyles } from "../ui";
import { Plus, Pencil, Trash2, Search, DollarSign, MapPin, Tag, Filter, ChevronDown, ChevronRight } from "lucide-react";

const CATEGORIAS_JOGO = ["B1","B2"];
const SERVICOS_FORNECIDOS = [
  "UM B1","UM B2","SNG","SNG Extra","Gerador","Drone","Mini Drone","Grua/Policam",
  "DSLR + Microlink","Carrinho","Goalcam","Especial","Infra + Distr.",
  "Transporte","Coordenação","Produção","Vmix","DTV","Áudio","Outro",
];

function PrecoModal({ entry, fornecedores, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(entry || {
    fornecedorId: fornecedores[0]?.id || 0,
    servico: SERVICOS_FORNECIDOS[0],
    categoria: "B1",
    cidade: CIDADES[0],
    montagem: false,
    valor: 0,
    obs: "",
  });
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const field = (label, key, opts = null, type = "text") => (
    <div style={{marginBottom:14}}>
      <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:4,letterSpacing:"0.04em",textTransform:"uppercase"}}>{label}</label>
      {opts
        ? <select value={form[key]} onChange={e => set(key, e.target.value)} style={IS}>{opts.map(o => <option key={o} value={o}>{o}</option>)}</select>
        : type === "number"
          ? <input type="number" value={form[key]} onChange={e => set(key, parseFloat(e.target.value) || 0)} style={{...IS, textAlign:"right"}}/>
          : type === "checkbox"
            ? <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:T.text}}>
                <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)}
                  style={{width:18,height:18,accentColor:T.brand||"#10b981",cursor:"pointer"}}/>
                {form[key] ? "Sim" : "Nao"}
              </label>
            : <input value={form[key]} onChange={e => set(key, e.target.value)} style={IS}/>
      }
    </div>
  );

  const fornecedorOpts = fornecedores.map(f => f.apelido).sort();

  const handleSave = () => {
    if (!form.fornecedorId || !form.valor) return;
    onSave({...form, id: entry?.id || Date.now()});
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <h3 style={{margin:"0 0 20px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>{entry ? "Editar Preco" : "Novo Preco"}</h3>

        <div style={{marginBottom:14}}>
          <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:4,letterSpacing:"0.04em",textTransform:"uppercase"}}>Fornecedor</label>
          <select value={form.fornecedorId} onChange={e => set("fornecedorId", parseInt(e.target.value))} style={IS}>
            {fornecedores.sort((a,b) => a.apelido.localeCompare(b.apelido)).map(f => (
              <option key={f.id} value={f.id}>{f.apelido}</option>
            ))}
          </select>
        </div>

        {field("Servico","servico",SERVICOS_FORNECIDOS)}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          {field("Categoria","categoria",CATEGORIAS_JOGO)}
          {field("Cidade","cidade",CIDADES)}
        </div>
        {field("Montagem na Vespera","montagem",null,"checkbox")}
        {field("Valor (R$)","valor",null,"number")}
        {field("Observacao","obs")}

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

export default function TabTabelaPrecos({ tabelaPrecos, setTabelaPrecos, fornecedores, T }) {
  const [filtroFornecedor, setFiltroFornecedor] = useState("Todos");
  const [filtroCat, setFiltroCat] = useState("Todas");
  const [filtroCidade, setFiltroCidade] = useState("Todas");
  const [busca, setBusca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedForn, setExpandedForn] = useState({});

  const fornMap = useMemo(() => {
    const m = {};
    fornecedores.forEach(f => { m[f.id] = f; });
    return m;
  }, [fornecedores]);

  const filtered = useMemo(() => tabelaPrecos.filter(p =>
    (filtroFornecedor === "Todos" || p.fornecedorId === parseInt(filtroFornecedor)) &&
    (filtroCat === "Todas" || p.categoria === filtroCat) &&
    (filtroCidade === "Todas" || p.cidade === filtroCidade) &&
    (busca === "" || (fornMap[p.fornecedorId]?.apelido || "").toLowerCase().includes(busca.toLowerCase()) || p.servico.toLowerCase().includes(busca.toLowerCase()))
  ), [tabelaPrecos, filtroFornecedor, filtroCat, filtroCidade, busca, fornMap]);

  // Agrupar por fornecedor
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const fId = p.fornecedorId;
      if (!map[fId]) map[fId] = { fornecedor: fornMap[fId], items: [] };
      map[fId].items.push(p);
    });
    return Object.values(map).sort((a, b) => (a.fornecedor?.apelido || "").localeCompare(b.fornecedor?.apelido || ""));
  }, [filtered, fornMap]);

  const totalOrcado = filtered.reduce((s, p) => s + (p.valor || 0), 0);
  const totalEntradas = filtered.length;
  const fornecedoresComPreco = new Set(tabelaPrecos.map(p => p.fornecedorId)).size;
  const fornecedoresSemPreco = fornecedores.length - fornecedoresComPreco;

  const savePreco = p => {
    setTabelaPrecos(ps => {
      const idx = ps.findIndex(x => x.id === p.id);
      return idx >= 0 ? ps.map(x => x.id === p.id ? p : x) : [...ps, p];
    });
    setShowModal(false);
    setEditing(null);
  };

  const deletePreco = id => {
    if (window.confirm("Excluir este preco?")) setTabelaPrecos(ps => ps.filter(p => p.id !== id));
  };

  const toggleExpand = fId => setExpandedForn(e => ({...e, [fId]: !e[fId]}));

  const IS = iSty(T);
  const TS = tableStyles(T);
  const cyan = "#06b6d4";

  // Fornecedores com entradas para o filtro
  const fornecedoresAtivos = useMemo(() => {
    const ids = new Set(tabelaPrecos.map(p => p.fornecedorId));
    return fornecedores.filter(f => ids.has(f.id)).sort((a,b) => a.apelido.localeCompare(b.apelido));
  }, [tabelaPrecos, fornecedores]);

  return (
    <>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:24}}>
        <KPI label="Total Orcado (tabela)" value={fmt(totalOrcado)} sub={`${totalEntradas} entrada${totalEntradas!==1?"s":""}`} color={T.brand||"#10b981"} T={T}/>
        <KPI label="Fornecedores c/ Preco" value={String(fornecedoresComPreco)} sub={`de ${fornecedores.length} cadastrados`} color={T.info||"#3b82f6"} T={T}/>
        <KPI label="Sem Tabela de Preco" value={String(fornecedoresSemPreco)} sub="Fornecedores sem valores" color={fornecedoresSemPreco > 0 ? (T.warning||"#f59e0b") : (T.brand||"#10b981")} T={T}/>
        <KPI label="Cidades Cobertas" value={String(new Set(tabelaPrecos.map(p => p.cidade)).size)} sub={`de ${CIDADES.length} cidades`} color={cyan} T={T}/>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <Search size={14} color={T.textSm} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar fornecedor ou servico..." style={{...IS,width:260,padding:"8px 12px 8px 34px"}}/>
          </div>

          <div style={{width:1,height:24,background:T.border}}/>

          {/* Filtro fornecedor */}
          <select value={filtroFornecedor} onChange={e => setFiltroFornecedor(e.target.value)} style={{...IS,width:"auto",padding:"7px 12px"}}>
            <option value="Todos">Todos fornecedores</option>
            {fornecedoresAtivos.map(f => <option key={f.id} value={f.id}>{f.apelido}</option>)}
          </select>

          <div style={{width:1,height:24,background:T.border}}/>

          {/* Filtro categoria */}
          {["Todas","B1","B2"].map(c => (
            <Chip key={c} active={filtroCat===c} onClick={() => setFiltroCat(c)} T={T} color={c==="B1"?"#22c55e":c==="B2"?"#3b82f6":T.brand}>{c}</Chip>
          ))}

          <div style={{width:1,height:24,background:T.border}}/>

          {/* Filtro cidade */}
          <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)} style={{...IS,width:"auto",padding:"7px 12px"}}>
            <option value="Todas">Todas cidades</option>
            {CIDADES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <Button T={T} variant="primary" size="md" icon={Plus} onClick={() => { setEditing(null); setShowModal(true); }}>Novo Preco</Button>
      </div>

      {/* Lista agrupada por fornecedor */}
      {grouped.length === 0 && (
        <Card T={T} padding={48}>
          <div style={{textAlign:"center",color:T.textSm}}>
            <DollarSign size={36} style={{marginBottom:12,opacity:0.4}}/>
            <p style={{fontSize:14,fontWeight:600,margin:"0 0 4px"}}>Nenhum preco cadastrado</p>
            <p style={{fontSize:12,margin:0}}>Clique em "Novo Preco" para adicionar a primeira entrada na tabela.</p>
          </div>
        </Card>
      )}

      {grouped.map(({ fornecedor: forn, items }) => {
        if (!forn) return null;
        const isExpanded = expandedForn[forn.id] !== false; // default expanded
        const totalForn = items.reduce((s, p) => s + (p.valor || 0), 0);
        const cats = [...new Set(items.map(p => p.categoria))];
        const cidades = [...new Set(items.map(p => p.cidade))];

        return (
          <Card T={T} key={forn.id} style={{marginBottom:16}}>
            {/* Header do fornecedor */}
            <div
              onClick={() => toggleExpand(forn.id)}
              style={{
                padding:"14px 20px",
                background:T.surfaceAlt||T.bg,
                borderBottom: isExpanded ? `1px solid ${T.border}` : "none",
                display:"flex",
                justifyContent:"space-between",
                alignItems:"center",
                cursor:"pointer",
                gap:12,
                flexWrap:"wrap",
              }}
            >
              <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
                {isExpanded ? <ChevronDown size={16} color={T.textMd}/> : <ChevronRight size={16} color={T.textMd}/>}
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:14,color:T.text}}>{forn.apelido}</span>
                    <Badge color={T.info} T={T} size="sm">{forn.funcao}</Badge>
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                    {cats.map(c => <Badge key={c} color={c==="B1"?"#22c55e":"#3b82f6"} T={T} size="sm">{c}</Badge>)}
                    <span style={{fontSize:11,color:T.textSm}}>{cidades.length} cidade{cidades.length!==1?"s":""} · {items.length} entrada{items.length!==1?"s":""}</span>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{textAlign:"right"}}>
                  <p style={{margin:0,fontSize:10,color:T.textSm,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Total</p>
                  <p className="num" style={{margin:0,fontSize:16,fontWeight:800,color:T.brand||"#10b981"}}>{fmt(totalForn)}</p>
                </div>
              </div>
            </div>

            {/* Tabela de precos */}
            {isExpanded && (
              <div style={TS.wrap}>
                <table style={{...TS.table, minWidth:780}}>
                  <thead>
                    <tr style={TS.thead}>
                      {["Servico","Categoria","Cidade","Montagem Vespera","Valor","Obs",""].map(h =>
                        <th key={h} style={{...TS.th, ...(h==="Valor"?TS.thRight:TS.thLeft)}}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {items.sort((a,b) => a.servico.localeCompare(b.servico) || a.categoria.localeCompare(b.categoria) || a.cidade.localeCompare(b.cidade)).map(p => (
                      <tr key={p.id} style={TS.tr}>
                        <td style={{...TS.td, fontWeight:600}}>{p.servico}</td>
                        <td style={TS.td}><Badge color={p.categoria==="B1"?"#22c55e":"#3b82f6"} T={T}>{p.categoria}</Badge></td>
                        <td style={TS.td}>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <MapPin size={12} color={T.textSm}/>
                            <span>{p.cidade}</span>
                          </div>
                        </td>
                        <td style={TS.td}>
                          <Badge color={p.montagem ? (T.warning||"#f59e0b") : (T.textSm||"#64748b")} T={T} size="sm">
                            {p.montagem ? "Sim" : "Nao"}
                          </Badge>
                        </td>
                        <td className="num" style={{...TS.tdNum, fontWeight:700, color:T.brand||"#10b981"}}>{fmt(p.valor)}</td>
                        <td style={{...TS.td, fontSize:11, color:T.textSm}}>{p.obs || "—"}</td>
                        <td style={TS.td}>
                          <div style={{display:"flex",gap:4}}>
                            <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={() => { setEditing(p); setShowModal(true); }}/>
                            <Button T={T} variant="danger" size="sm" icon={Trash2} onClick={() => deletePreco(p.id)}/>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Total row */}
                    <tr style={TS.totalRow}>
                      <td style={{...TS.td, fontWeight:700, color:T.textMd}} colSpan={4}>Total {forn.apelido}</td>
                      <td className="num" style={{...TS.tdNum, fontWeight:800, color:T.brand||"#10b981"}}>{fmt(totalForn)}</td>
                      <td colSpan={2}/>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}

      {showModal && (
        <PrecoModal
          entry={editing}
          fornecedores={fornecedores}
          onSave={savePreco}
          onClose={() => { setShowModal(false); setEditing(null); }}
          T={T}
        />
      )}
    </>
  );
}
