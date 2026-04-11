import { useState, useMemo } from "react";
import { iSty, RADIUS } from "../../../constants";
import { KPI } from "../../shared";
import { Card, PanelTitle, Button, Badge, Chip, tableStyles } from "../../ui";
import { filtrarJogos, classificarTemporal } from "../../../lib/portalMatriz";
import {
  Calendar, MapPin, Tag, Search, Plus, Pencil, Trash2, Clock,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// PRÓXIMOS JOGOS — visão cronológica dos jogos do(s) campeonato(s)
// ----------------------------------------------------------------------------
// Consome a coleção forn_jogos via adapter portalMatriz. Hoje os jogos são
// editáveis manualmente; quando o portal matriz interno entrar no ar, o
// botão "Novo jogo" desaparece e a coleção passa a ser sincronizada.
// ════════════════════════════════════════════════════════════════════════════

const FILTROS_TEMPORAL = [
  { key:"futuros",  label:"Futuros" },
  { key:"semana",   label:"Próximos 7 dias" },
  { key:"hoje",     label:"Hoje" },
  { key:"passados", label:"Passados" },
  { key:"todos",    label:"Todos" },
];

const COR_TEMPORAL = {
  passado:  "#94a3b8",
  hoje:     "#ef4444",
  urgente:  "#f59e0b",
  semana:   "#3b82f6",
  futuro:   "#10b981",
  sem_data: "#64748b",
};
const LABEL_TEMPORAL = {
  passado:"Passado",hoje:"Hoje",urgente:"Em até 3 dias",semana:"Esta semana",futuro:"Futuro",sem_data:"Sem data",
};

const fmtData = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
  } catch { return iso; }
};

// ── Modal de jogo (criar/editar manualmente) ────────────────────────────────
function JogoModal({ jogo, campeonatos, cidades, onSave, onClose, T }) {
  const IS = iSty(T);
  const camposPadrao = useMemo(() => {
    const camp = campeonatos.find(c => c.ativo) || campeonatos[0];
    return {
      campeonatoId: camp?.id || "",
      cidadeId:     camp?.cidadeIds?.[0] || "",
      categoria:    camp?.categorias?.[0]?.codigo || "",
      rodada:       1,
      data:         "",
      mandante:     "",
      visitante:    "",
      estadio:      "",
    };
  }, [campeonatos]);
  const [form, setForm] = useState(jogo || camposPadrao);
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const camp = campeonatos.find(c => c.id === form.campeonatoId);
  const cidadesDoCamp = (camp?.cidadeIds || []).map(id => cidades.find(c => c.id === id)).filter(Boolean);
  const categoriasDoCamp = camp?.categorias || [];

  const handleSave = () => {
    if (!form.mandante.trim() || !form.visitante.trim()) return alert("Informe mandante e visitante.");
    if (!form.cidadeId) return alert("Selecione a cidade.");
    if (!form.categoria) return alert("Selecione a categoria.");
    const id = jogo?.id || `j-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
    onSave({ ...form, id, rodada: parseInt(form.rodada,10) || 1 });
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:130,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <h3 style={{margin:"0 0 6px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>{jogo ? "Editar jogo" : "Novo jogo"}</h3>
        <p style={{margin:"0 0 18px",fontSize:12,color:T.textMd}}>
          Cadastro manual provisório — quando o portal matriz integrar, jogos vêm direto de lá.
        </p>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <div style={{marginBottom:12,gridColumn:"1 / -1"}}>
            <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"}}>Campeonato</label>
            <select value={form.campeonatoId} onChange={e=>set("campeonatoId",e.target.value)} style={IS}>
              {campeonatos.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"}}>Cidade</label>
            <select value={form.cidadeId} onChange={e=>set("cidadeId",e.target.value)} style={IS}>
              <option value="">— Selecione —</option>
              {cidadesDoCamp.map(c => <option key={c.id} value={c.id}>{c.nome}/{c.uf}</option>)}
            </select>
          </div>

          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"}}>Categoria</label>
            <select value={form.categoria} onChange={e=>set("categoria",e.target.value)} style={IS}>
              <option value="">— Selecione —</option>
              {categoriasDoCamp.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo}</option>)}
            </select>
          </div>

          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"}}>Rodada</label>
            <input type="number" value={form.rodada} onChange={e=>set("rodada",e.target.value)} style={IS}/>
          </div>

          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"}}>Data e hora</label>
            <input type="datetime-local" value={form.data ? form.data.slice(0,16) : ""} onChange={e=>set("data", e.target.value ? new Date(e.target.value).toISOString() : "")} style={IS}/>
          </div>

          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"}}>Mandante</label>
            <input value={form.mandante} onChange={e=>set("mandante",e.target.value)} style={IS}/>
          </div>

          <div style={{marginBottom:12}}>
            <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"}}>Visitante</label>
            <input value={form.visitante} onChange={e=>set("visitante",e.target.value)} style={IS}/>
          </div>

          <div style={{marginBottom:12,gridColumn:"1 / -1"}}>
            <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"}}>Estádio (opcional)</label>
            <input value={form.estadio||""} onChange={e=>set("estadio",e.target.value)} style={IS}/>
          </div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function ProximosJogos({
  jogosForn = [], setJogosForn = ()=>{},
  cidades = [], campeonatos = [],
  cotacoes = [],
  filtroCampeonato = "todos",
  T,
}) {
  const [filtroTemporal, setFiltroTemporal] = useState("futuros");
  const [filtroCidade, setFiltroCidade] = useState("todas");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [busca, setBusca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const cidadeById = useMemo(() => Object.fromEntries(cidades.map(c => [c.id, c])), [cidades]);
  const campById = useMemo(() => Object.fromEntries(campeonatos.map(c => [c.id, c])), [campeonatos]);

  const agora = useMemo(() => new Date(), []);

  const jogosFiltrados = useMemo(() => {
    let lista = filtrarJogos(jogosForn, {
      campeonatoId: filtroCampeonato !== "todos" ? filtroCampeonato : undefined,
      cidadeId:     filtroCidade !== "todas"   ? filtroCidade   : undefined,
      categoria:    filtroCategoria !== "todas"? filtroCategoria: undefined,
    });
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(j =>
        (j.mandante||"").toLowerCase().includes(q) ||
        (j.visitante||"").toLowerCase().includes(q) ||
        (j.estadio||"").toLowerCase().includes(q)
      );
    }
    return lista
      .map(j => ({ ...j, _temporal: classificarTemporal(j, agora) }))
      .filter(j => {
        if (filtroTemporal === "todos") return true;
        if (filtroTemporal === "futuros")  return ["hoje","urgente","semana","futuro"].includes(j._temporal);
        if (filtroTemporal === "passados") return j._temporal === "passado";
        if (filtroTemporal === "semana")   return ["hoje","urgente","semana"].includes(j._temporal);
        if (filtroTemporal === "hoje")     return j._temporal === "hoje";
        return true;
      })
      .sort((a,b) => (a.data||"").localeCompare(b.data||""));
  }, [jogosForn, filtroCampeonato, filtroCidade, filtroCategoria, busca, filtroTemporal, agora]);

  const kpis = useMemo(() => {
    const escopo = filtrarJogos(jogosForn, {
      campeonatoId: filtroCampeonato !== "todos" ? filtroCampeonato : undefined,
    }).map(j => ({...j, _t: classificarTemporal(j, agora)}));
    return {
      total:    escopo.length,
      futuros:  escopo.filter(j => ["hoje","urgente","semana","futuro"].includes(j._t)).length,
      semana:   escopo.filter(j => ["hoje","urgente","semana"].includes(j._t)).length,
      passados: escopo.filter(j => j._t === "passado").length,
    };
  }, [jogosForn, filtroCampeonato, agora]);

  const cotacoesPorJogo = useMemo(() => {
    const map = {};
    (cotacoes||[]).forEach(c => {
      if (!c.jogoId) return;
      map[c.jogoId] = (map[c.jogoId] || 0) + 1;
    });
    return map;
  }, [cotacoes]);

  const cidadesDisponiveis = useMemo(() => {
    if (filtroCampeonato === "todos") return cidades;
    const camp = campById[filtroCampeonato];
    return (camp?.cidadeIds || []).map(id => cidadeById[id]).filter(Boolean);
  }, [filtroCampeonato, campById, cidades, cidadeById]);

  const categoriasDisponiveis = useMemo(() => {
    if (filtroCampeonato === "todos") {
      const set = new Set();
      campeonatos.forEach(c => (c.categorias||[]).forEach(cat => set.add(cat.codigo)));
      return [...set];
    }
    return (campById[filtroCampeonato]?.categorias || []).map(c => c.codigo);
  }, [filtroCampeonato, campById, campeonatos]);

  const salvar = (jogo) => {
    setJogosForn(list => {
      const idx = list.findIndex(j => j.id === jogo.id);
      return idx >= 0 ? list.map(j => j.id===jogo.id?jogo:j) : [...list, jogo];
    });
    setShowModal(false); setEditing(null);
  };
  const remover = (id) => {
    if (!confirm("Remover este jogo?")) return;
    setJogosForn(list => list.filter(j => j.id !== id));
  };

  const TS = tableStyles(T);

  return (
    <>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:20}}>
        <KPI label="Total de Jogos" value={String(kpis.total)} sub={filtroCampeonato==="todos"?"Todos os campeonatos":campById[filtroCampeonato]?.nome||""} color={T.info||"#3b82f6"} T={T}/>
        <KPI label="Próximos" value={String(kpis.futuros)} sub="Hoje em diante" color={T.brand||"#10b981"} T={T}/>
        <KPI label="Próximos 7 dias" value={String(kpis.semana)} sub="Janela crítica" color={T.warning||"#f59e0b"} T={T}/>
        <KPI label="Passados" value={String(kpis.passados)} sub="Já realizados" color="#94a3b8" T={T}/>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <Search size={14} color={T.textSm} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por time ou estádio..." style={{...iSty(T),width:260,padding:"8px 12px 8px 34px"}}/>
          </div>

          <div style={{width:1,height:24,background:T.border}}/>
          {FILTROS_TEMPORAL.map(f => (
            <Chip key={f.key} active={filtroTemporal===f.key} onClick={()=>setFiltroTemporal(f.key)} T={T}>{f.label}</Chip>
          ))}

          <div style={{width:1,height:24,background:T.border}}/>
          <select value={filtroCidade} onChange={e=>setFiltroCidade(e.target.value)} style={{...iSty(T), width:160}}>
            <option value="todas">Todas cidades</option>
            {cidadesDisponiveis.map(c => <option key={c.id} value={c.id}>{c.nome}/{c.uf}</option>)}
          </select>
          <select value={filtroCategoria} onChange={e=>setFiltroCategoria(e.target.value)} style={{...iSty(T), width:130}}>
            <option value="todas">Todas categorias</option>
            {categoriasDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <Button T={T} variant="primary" size="md" icon={Plus} onClick={()=>{setEditing(null);setShowModal(true);}}>Novo jogo</Button>
      </div>

      {/* Listagem */}
      <Card T={T} padding={0}>
        <PanelTitle T={T}
          title="Próximos Jogos"
          subtitle={`${jogosFiltrados.length} jogo${jogosFiltrados.length!==1?"s":""} · ordenados por data`}
          color={T.info||"#3b82f6"}
        />

        {jogosFiltrados.length === 0 ? (
          <div style={{padding:"56px 20px",textAlign:"center"}}>
            <div style={{
              width:64,height:64,borderRadius:16,
              background:T.surfaceAlt||T.bg,
              border:`1px solid ${T.border}`,
              color:T.textSm,
              display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14,
            }}><Calendar size={28} strokeWidth={2}/></div>
            <p style={{margin:0,fontSize:13,color:T.textMd}}>Nenhum jogo encontrado com esses filtros.</p>
          </div>
        ) : (
          <div style={TS.wrap}>
            <table style={{...TS.table, minWidth:920}}>
              <thead>
                <tr style={TS.thead}>
                  {["Status","Data","Rodada","Cidade","Cat.","Jogo","Cotações",""].map(h =>
                    <th key={h} style={{...TS.th, ...TS.thLeft}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {jogosFiltrados.map(j => {
                  const cid = cidadeById[j.cidadeId];
                  const cor = COR_TEMPORAL[j._temporal];
                  const numCot = cotacoesPorJogo[j.id] || 0;
                  return (
                    <tr key={j.id} style={TS.tr}>
                      <td style={TS.td}>
                        <Badge T={T} color={cor} size="sm">{LABEL_TEMPORAL[j._temporal]}</Badge>
                      </td>
                      <td style={{...TS.td, fontSize:12, color:T.textMd, whiteSpace:"nowrap"}}>
                        <Clock size={11} style={{display:"inline",verticalAlign:"-1px",marginRight:4}} color={T.textSm}/>
                        {fmtData(j.data)}
                      </td>
                      <td style={{...TS.td, fontSize:12, color:T.textSm}}>R{j.rodada}</td>
                      <td style={{...TS.td, fontSize:12}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:5}}>
                          <MapPin size={11} color={T.textSm}/>
                          {cid ? `${cid.nome}/${cid.uf}` : "—"}
                        </span>
                      </td>
                      <td style={TS.td}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:RADIUS.pill,background:T.brandSoft||"rgba(16,185,129,0.12)",color:T.brand||"#10b981",fontSize:11,fontWeight:700}}>
                          <Tag size={10}/>{j.categoria}
                        </span>
                      </td>
                      <td style={{...TS.td, fontWeight:600}}>
                        {j.mandante} <span style={{color:T.textSm,fontWeight:400,fontSize:12}}>×</span> {j.visitante}
                        {j.estadio && <div style={{fontSize:11,color:T.textSm,marginTop:2}}>{j.estadio}</div>}
                      </td>
                      <td style={TS.td}>
                        {numCot > 0
                          ? <Badge T={T} color={T.brand||"#10b981"} size="sm">{numCot} cotação{numCot!==1?"ões":""}</Badge>
                          : <span style={{fontSize:11,color:T.textSm}}>—</span>}
                      </td>
                      <td style={TS.td}>
                        <div style={{display:"flex",gap:4}}>
                          <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={()=>{setEditing(j);setShowModal(true);}}/>
                          <Button T={T} variant="danger"    size="sm" icon={Trash2} onClick={()=>remover(j.id)}/>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <JogoModal
          jogo={editing}
          campeonatos={campeonatos}
          cidades={cidades}
          onSave={salvar}
          onClose={()=>{setShowModal(false);setEditing(null);}}
          T={T}
        />
      )}
    </>
  );
}
