import { useState, useMemo } from "react";
import { KPI, Pill } from "../shared";
import { CIDADES, btnStyle, iSty, RADIUS } from "../../constants";
import { fmt } from "../../utils";
import { Card, PanelTitle, Button, Chip, Badge, tableStyles } from "../ui";
import { Plus, Pencil, Trash2, Search, Users, ChevronDown, ChevronRight, DollarSign, MapPin } from "lucide-react";

const AREAS = ["Todas","Operacoes","Conteudo"];
const TIPOS = ["Todos","Fornecedor","Prestador"];
const CATEGORIAS_JOGO = ["B1","B2"];
const SERVICOS_FORNECIDOS = [
  "UM B1","UM B2","SNG","SNG Extra","Gerador","Drone","Mini Drone","Grua/Policam",
  "DSLR + Microlink","Carrinho","Goalcam","Especial","Infra + Distr.",
  "Transporte","Coordenacao","Producao","Vmix","DTV","Audio","Outro",
];

// ── Modal de Fornecedor (dados cadastrais) ───────────────────────────────────
function FornecedorModal({ fornecedor, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(fornecedor || {
    apelido:"",razaoSocial:"",cnpj:"",funcao:"",area:"Operacoes",tipo:"Fornecedor",nome:"",telefone:"",email:"",cpf:"",rg:"",precos:[],
  });
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const field = (label, key, opts=null, span=false) => (
    <div style={{marginBottom:12,gridColumn:span?"1 / -1":"auto"}}>
      <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>{label}</label>
      {opts
        ? <select value={form[key]} onChange={e => set(key, e.target.value)} style={IS}>{opts.map(o => <option key={o}>{o}</option>)}</select>
        : <input value={form[key]} onChange={e => set(key, e.target.value)} style={IS}/>}
    </div>
  );

  const handleSave = () => {
    if (!form.apelido) return;
    onSave({...form, id: fornecedor?.id || Date.now(), precos: form.precos || []});
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <h3 style={{margin:"0 0 20px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>{fornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          {field("Apelido","apelido")}
          {field("CNPJ","cnpj")}
          {field("Razao Social","razaoSocial",null,true)}
          {field("Funcao","funcao")}
          {field("Area","area",["Operacoes","Conteudo"])}
          {field("Tipo Cadastro","tipo",["Fornecedor","Prestador"])}
          {field("Nome Completo","nome")}
          {field("Telefone","telefone")}
          {field("Email","email")}
          {field("CPF","cpf")}
          {field("RG","rg")}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Preco (entrada na tabela de precos do fornecedor) ───────────────
function PrecoModal({ entry, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(entry || {
    servico: SERVICOS_FORNECIDOS[0],
    categoria: "B1",
    cidade: CIDADES[0],
    montagem: false,
    valor: 0,
    obs: "",
  });
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const handleSave = () => {
    if (!form.valor) return;
    onSave({...form, id: entry?.id || Date.now()});
  };

  const labelSty = {color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:4,letterSpacing:"0.04em",textTransform:"uppercase"};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:110,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <h3 style={{margin:"0 0 20px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>{entry ? "Editar Preco" : "Novo Preco"}</h3>

        <div style={{marginBottom:14}}>
          <label style={labelSty}>Servico</label>
          <select value={form.servico} onChange={e => set("servico",e.target.value)} style={IS}>
            {SERVICOS_FORNECIDOS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:14}}>
            <label style={labelSty}>Categoria</label>
            <select value={form.categoria} onChange={e => set("categoria",e.target.value)} style={IS}>
              {CATEGORIAS_JOGO.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{marginBottom:14}}>
            <label style={labelSty}>Cidade</label>
            <select value={form.cidade} onChange={e => set("cidade",e.target.value)} style={IS}>
              {CIDADES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={labelSty}>Montagem na Vespera</label>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:T.text}}>
            <input type="checkbox" checked={form.montagem} onChange={e => set("montagem",e.target.checked)}
              style={{width:18,height:18,accentColor:T.brand||"#10b981",cursor:"pointer"}}/>
            {form.montagem ? "Sim" : "Nao"}
          </label>
        </div>

        <div style={{marginBottom:14}}>
          <label style={labelSty}>Valor (R$)</label>
          <input type="number" value={form.valor} onChange={e => set("valor",parseFloat(e.target.value)||0)} style={{...IS,textAlign:"right"}}/>
        </div>

        <div style={{marginBottom:14}}>
          <label style={labelSty}>Observacao</label>
          <input value={form.obs||""} onChange={e => set("obs",e.target.value)} style={IS}/>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponente: Tabela de precos de um fornecedor ─────────────────────────
function TabelaPrecosFornecedor({ fornecedor, onUpdate, T }) {
  const [showPrecoModal, setShowPrecoModal] = useState(false);
  const [editingPreco, setEditingPreco] = useState(null);

  const precos = fornecedor.precos || [];
  const totalPrecos = precos.reduce((s, p) => s + (p.valor || 0), 0);
  const TS = tableStyles(T);

  const savePreco = p => {
    const updated = [...precos];
    const idx = updated.findIndex(x => x.id === p.id);
    if (idx >= 0) updated[idx] = p; else updated.push(p);
    onUpdate({...fornecedor, precos: updated});
    setShowPrecoModal(false);
    setEditingPreco(null);
  };

  const deletePreco = id => {
    if (window.confirm("Excluir este preco?"))
      onUpdate({...fornecedor, precos: precos.filter(p => p.id !== id)});
  };

  const sorted = [...precos].sort((a,b) =>
    a.servico.localeCompare(b.servico) || a.categoria.localeCompare(b.categoria) || a.cidade.localeCompare(b.cidade)
  );

  return (
    <div style={{borderTop:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg}}>
      {/* Header da secao de precos */}
      <div style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <DollarSign size={15} color={T.brand||"#10b981"}/>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>Tabela de Precos</span>
          <Badge color={T.brand} T={T} size="sm">{precos.length} entrada{precos.length!==1?"s":""}</Badge>
          {totalPrecos > 0 && (
            <span className="num" style={{fontSize:12,fontWeight:700,color:T.brand||"#10b981",marginLeft:4}}>{fmt(totalPrecos)}</span>
          )}
        </div>
        <Button T={T} variant="primary" size="sm" icon={Plus} onClick={() => { setEditingPreco(null); setShowPrecoModal(true); }}>
          Novo Preco
        </Button>
      </div>

      {precos.length === 0 ? (
        <div style={{padding:"20px 20px 24px",textAlign:"center",color:T.textSm,fontSize:12}}>
          Nenhum preco cadastrado para este fornecedor. Clique em "Novo Preco" para adicionar.
        </div>
      ) : (
        <div style={{...TS.wrap, padding:"0 8px 12px"}}>
          <table style={{...TS.table, minWidth:680}}>
            <thead>
              <tr style={TS.thead}>
                {["Servico","Categoria","Cidade","Montagem","Valor","Obs",""].map(h =>
                  <th key={h} style={{...TS.th, ...(h==="Valor"?TS.thRight:TS.thLeft)}}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id} style={TS.tr}>
                  <td style={{...TS.td, fontWeight:600}}>{p.servico}</td>
                  <td style={TS.td}><Badge color={p.categoria==="B1"?"#22c55e":"#3b82f6"} T={T} size="sm">{p.categoria}</Badge></td>
                  <td style={TS.td}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <MapPin size={11} color={T.textSm}/>
                      <span style={{fontSize:12}}>{p.cidade}</span>
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
                      <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={() => { setEditingPreco(p); setShowPrecoModal(true); }}/>
                      <Button T={T} variant="danger" size="sm" icon={Trash2} onClick={() => deletePreco(p.id)}/>
                    </div>
                  </td>
                </tr>
              ))}
              {precos.length > 1 && (
                <tr style={TS.totalRow}>
                  <td style={{...TS.td, fontWeight:700, color:T.textMd}} colSpan={4}>Total</td>
                  <td className="num" style={{...TS.tdNum, fontWeight:800, color:T.brand||"#10b981"}}>{fmt(totalPrecos)}</td>
                  <td colSpan={2}/>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showPrecoModal && (
        <PrecoModal
          entry={editingPreco}
          onSave={savePreco}
          onClose={() => { setShowPrecoModal(false); setEditingPreco(null); }}
          T={T}
        />
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function TabFornecedores({ fornecedores, setFornecedores, T }) {
  const [filtroArea, setFiltroArea] = useState("Todas");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const filtered = fornecedores.filter(f =>
    (filtroArea === "Todas" || f.area === filtroArea) &&
    (filtroTipo === "Todos" || f.tipo === filtroTipo) &&
    (busca === "" || f.apelido.toLowerCase().includes(busca.toLowerCase()) || f.razaoSocial.toLowerCase().includes(busca.toLowerCase()) || f.funcao.toLowerCase().includes(busca.toLowerCase()))
  );

  const totalFornecedores = fornecedores.filter(f => f.tipo === "Fornecedor").length;
  const totalPrestadores  = fornecedores.filter(f => f.tipo === "Prestador").length;
  const comPrecos = fornecedores.filter(f => (f.precos || []).length > 0).length;
  const totalOrcadoPrecos = fornecedores.reduce((s, f) => s + (f.precos || []).reduce((ss, p) => ss + (p.valor || 0), 0), 0);

  const saveFornecedor = f => {
    setFornecedores(fs => {
      const idx = fs.findIndex(x => x.id === f.id);
      return idx >= 0 ? fs.map(x => x.id === f.id ? {...x, ...f, precos: x.precos || f.precos || []} : x) : [...fs, f];
    });
    setShowModal(false);
    setEditing(null);
  };

  const updateFornecedor = f => {
    setFornecedores(fs => fs.map(x => x.id === f.id ? f : x));
  };

  const deleteFornecedor = id => {
    if (window.confirm("Excluir este fornecedor?")) setFornecedores(fs => fs.filter(f => f.id !== id));
  };

  const toggleExpand = id => setExpandedId(prev => prev === id ? null : id);

  const IS = iSty(T);
  const TS = tableStyles(T);
  const cyan = "#06b6d4";
  const purple = "#a855f7";

  return (
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:24}}>
        <KPI label="Total Cadastrados" value={String(fornecedores.length)} sub="Fornecedores + Prestadores" color={cyan} T={T}/>
        <KPI label="Fornecedores / Prestadores" value={`${totalFornecedores} / ${totalPrestadores}`} sub="Por tipo" color={T.warning} T={T}/>
        <KPI label="Com Tabela de Precos" value={String(comPrecos)} sub={`de ${fornecedores.length} cadastrados`} color={T.info||"#3b82f6"} T={T}/>
        <KPI label="Total Orcado (tabelas)" value={fmt(totalOrcadoPrecos)} sub="Soma de todas as tabelas" color={T.brand||"#10b981"} T={T}/>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <Search size={14} color={T.textSm} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar fornecedor..." style={{...IS,width:240,padding:"8px 12px 8px 34px"}}/>
          </div>
          <div style={{width:1,height:24,background:T.border}}/>
          {AREAS.map(a => (
            <Chip key={a} active={filtroArea===a} onClick={()=>setFiltroArea(a)} T={T} color={cyan}>{a}</Chip>
          ))}
          <div style={{width:1,height:24,background:T.border}}/>
          {TIPOS.map(t => (
            <Chip key={t} active={filtroTipo===t} onClick={()=>setFiltroTipo(t)} T={T} color={T.warning}>{t}</Chip>
          ))}
        </div>
        <Button T={T} variant="primary" size="md" icon={Plus} onClick={()=>{setEditing(null);setShowModal(true);}}>Novo Fornecedor</Button>
      </div>

      <Card T={T}>
        <PanelTitle T={T} title="Fornecedores e Prestadores" subtitle={`${filtered.length} resultado${filtered.length!==1?"s":""} · Clique para ver tabela de precos`}/>
        <div style={TS.wrap}>
          <table style={{...TS.table, minWidth:880}}>
            <thead>
              <tr style={TS.thead}>
                {["","Apelido","Razao Social","CNPJ","Funcao","Area","Tipo","Precos",""].map(h =>
                  <th key={h} style={{...TS.th, ...TS.thLeft, ...(h==="Precos"?{textAlign:"right"}:{})}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const isExpanded = expandedId === f.id;
                const numPrecos = (f.precos || []).length;
                const totalForn = (f.precos || []).reduce((s, p) => s + (p.valor || 0), 0);

                return [
                  <tr key={f.id} style={{...TS.tr, cursor:"pointer", background: isExpanded ? (T.brandSoft||"rgba(16,185,129,0.06)") : "transparent"}}
                    onClick={() => toggleExpand(f.id)}>
                    <td style={{...TS.td, width:32, padding:"13px 8px 13px 16px"}}>
                      {isExpanded
                        ? <ChevronDown size={15} color={T.brand||"#10b981"}/>
                        : <ChevronRight size={15} color={T.textSm}/>
                      }
                    </td>
                    <td style={{...TS.td, fontWeight:600, whiteSpace:"nowrap"}}>{f.apelido}</td>
                    <td style={{...TS.td, color:T.textMd, fontSize:12, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{f.razaoSocial}</td>
                    <td className="num" style={{...TS.td, color:T.textMd, fontSize:11, whiteSpace:"nowrap"}}>{f.cnpj}</td>
                    <td style={{...TS.td, fontSize:12}}>{f.funcao}</td>
                    <td style={TS.td}><Pill label={f.area||"—"} color={f.area==="Operacoes"||f.area==="Operações"?T.warning:T.info}/></td>
                    <td style={TS.td}><Pill label={f.tipo||"—"} color={f.tipo==="Fornecedor"?cyan:purple}/></td>
                    <td className="num" style={{...TS.td, textAlign:"right", whiteSpace:"nowrap"}}>
                      {numPrecos > 0 ? (
                        <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6}}>
                          <Badge color={T.brand} T={T} size="sm">{numPrecos}</Badge>
                          <span style={{fontSize:12,fontWeight:700,color:T.brand||"#10b981"}}>{fmt(totalForn)}</span>
                        </div>
                      ) : (
                        <span style={{fontSize:11,color:T.textSm}}>—</span>
                      )}
                    </td>
                    <td style={TS.td} onClick={e => e.stopPropagation()}>
                      <div style={{display:"flex",gap:4}}>
                        <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={()=>{setEditing(f);setShowModal(true);}}/>
                        <Button T={T} variant="danger" size="sm" icon={Trash2} onClick={()=>deleteFornecedor(f.id)}/>
                      </div>
                    </td>
                  </tr>,

                  isExpanded && (
                    <tr key={`${f.id}-precos`}>
                      <td colSpan={9} style={{padding:0}}>
                        <TabelaPrecosFornecedor fornecedor={f} onUpdate={updateFornecedor} T={T}/>
                      </td>
                    </tr>
                  ),
                ];
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{padding:40,textAlign:"center",color:T.textSm}}>Nenhum fornecedor encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && <FornecedorModal fornecedor={editing} onSave={saveFornecedor} onClose={() => {setShowModal(false);setEditing(null);}} T={T}/>}
    </>
  );
}
