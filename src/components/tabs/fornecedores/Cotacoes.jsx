import { useState, useMemo } from "react";
import { iSty, RADIUS } from "../../../constants";
import { fmt } from "../../../utils";
import { KPI } from "../../shared";
import { Card, PanelTitle, Button, Badge, Chip, tableStyles } from "../../ui";
import {
  STATUS_COTACAO_NOVO, statusCotacaoInfo,
  getTabelaVigente, criarCotacao,
} from "../../../data/catalogos";
import {
  Plus, Search, Pencil, Trash2, AlertCircle, FileSpreadsheet,
  MapPin, Tag, Building2, Calendar, Wallet, CheckCircle2,
} from "lucide-react";
import CotacaoEditor from "./CotacaoEditor";

// ════════════════════════════════════════════════════════════════════════════
// COTAÇÕES — listagem por jogo, com criação a partir da tabela vigente
// ----------------------------------------------------------------------------
// Cada cotação representa o que VAI SER PAGO a um fornecedor por um jogo
// específico. O valor-base sai automaticamente da tabela vigente do
// fornecedor para a cidade × categoria do jogo (Fase C). Adicionais
// pré-jogo são lançados manualmente.
// ════════════════════════════════════════════════════════════════════════════

const FILTRO_TODOS = "todos";
const fmtData = iso => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }); }
  catch { return iso; }
};

// ── Modal: nova cotação (selecionar jogo + fornecedor) ──────────────────────
function NovaCotacaoModal({ jogosForn, fornecedores, tabelas, campeonatos, cidades, filtroCampeonato, onCreate, onClose, T }) {
  const IS = iSty(T);
  const [jogoId, setJogoId] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");

  const jogosOrdenados = useMemo(() => {
    return [...jogosForn]
      .filter(j => filtroCampeonato === FILTRO_TODOS || j.campeonatoId === filtroCampeonato)
      .sort((a,b) => (a.data||"").localeCompare(b.data||""));
  }, [jogosForn, filtroCampeonato]);

  const jogo = jogosForn.find(j => j.id === jogoId);
  const fornecedor = fornecedores.find(f => String(f.id) === String(fornecedorId));
  const tabelaVigente = jogo && fornecedor ? getTabelaVigente(tabelas, fornecedor.id, jogo.campeonatoId) : null;

  const podeCriar = jogo && fornecedor && tabelaVigente;

  const handleCriar = () => {
    if (!podeCriar) return;
    onCreate(criarCotacao({ jogo, fornecedor, tabela: tabelaVigente }));
  };

  const cidade = jogo ? cidades.find(c => c.id === jogo.cidadeId) : null;
  const camp = jogo ? campeonatos.find(c => c.id === jogo.campeonatoId) : null;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:130,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <h3 style={{margin:"0 0 6px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>Nova cotação</h3>
        <p style={{margin:"0 0 18px",fontSize:12,color:T.textMd}}>
          Selecione o jogo e o fornecedor. Os valores virão da tabela vigente do fornecedor para essa cidade × categoria.
        </p>

        <div style={{marginBottom:14}}>
          <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"}}>Jogo</label>
          <select value={jogoId} onChange={e=>setJogoId(e.target.value)} style={IS}>
            <option value="">— Selecione —</option>
            {jogosOrdenados.map(j => (
              <option key={j.id} value={j.id}>
                R{j.rodada} · {fmtData(j.data)} · {j.mandante} × {j.visitante} · {j.categoria}
              </option>
            ))}
          </select>
        </div>

        <div style={{marginBottom:14}}>
          <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"}}>Fornecedor</label>
          <select value={fornecedorId} onChange={e=>setFornecedorId(e.target.value)} style={IS}>
            <option value="">— Selecione —</option>
            {[...fornecedores].sort((a,b)=>(a.apelido||"").localeCompare(b.apelido||"")).map(f => (
              <option key={f.id} value={f.id}>
                {f.apelido} {(f.catalogo||[]).length ? `· ${f.catalogo.length} itens` : "· (sem catálogo)"}
              </option>
            ))}
          </select>
        </div>

        {jogo && fornecedor && (
          <div style={{padding:"12px 14px",background:tabelaVigente?(T.brandSoft||"rgba(16,185,129,0.10)"):(T.warning?`${T.warning}1a`:"rgba(245,158,11,0.12)"),border:`1px solid ${tabelaVigente?(T.brandBorder||T.border):(T.warning||"#f59e0b")}`,borderRadius:RADIUS.md,marginBottom:14,fontSize:12,color:T.text,lineHeight:1.55}}>
            {tabelaVigente ? (
              <>
                <CheckCircle2 size={13} style={{display:"inline",verticalAlign:"-2px",marginRight:6,color:T.brand||"#10b981"}}/>
                Tabela vigente encontrada (v{tabelaVigente.versao}). Itens base serão calculados automaticamente para
                <b> {cidade?.nome}/{cidade?.uf} · {jogo.categoria}</b>.
              </>
            ) : (
              <>
                <AlertCircle size={13} style={{display:"inline",verticalAlign:"-2px",marginRight:6,color:T.warning||"#f59e0b"}}/>
                Não há tabela <b>vigente</b> de <b>{fornecedor.apelido}</b> para o <b>{camp?.nome}</b>. Crie e aprove uma tabela em <b>Tabelas</b> antes de cotar.
              </>
            )}
          </div>
        )}

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={handleCriar} disabled={!podeCriar}>Criar cotação</Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function Cotacoes({
  fornecedores,
  cotacoes,
  setCotacoes,
  jogosForn,
  cidades,
  campeonatos,
  tabelas,
  filtroCampeonato = FILTRO_TODOS,
  T,
}) {
  const [showNova, setShowNova] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroFornId, setFiltroFornId] = useState("todos");
  const [busca, setBusca] = useState("");

  const fornById = useMemo(() => Object.fromEntries(fornecedores.map(f => [String(f.id), f])), [fornecedores]);
  const jogoById = useMemo(() => Object.fromEntries((jogosForn||[]).map(j => [j.id, j])), [jogosForn]);
  const cidadeById = useMemo(() => Object.fromEntries(cidades.map(c => [c.id, c])), [cidades]);
  const campById = useMemo(() => Object.fromEntries(campeonatos.map(c => [c.id, c])), [campeonatos]);

  // ── Filtragem ────────────────────────────────────────────────────────────
  const cotacoesFiltradas = useMemo(() => {
    return (cotacoes || [])
      .filter(c => filtroCampeonato === FILTRO_TODOS || c.campeonatoId === filtroCampeonato)
      .filter(c => filtroStatus === "todos" || c.status === filtroStatus)
      .filter(c => filtroFornId === "todos" || String(c.fornecedorId) === String(filtroFornId))
      .filter(c => {
        if (!busca.trim()) return true;
        const j = jogoById[c.jogoId];
        const f = fornById[String(c.fornecedorId)];
        const q = busca.toLowerCase();
        return (f?.apelido||"").toLowerCase().includes(q)
          || (j?.mandante||"").toLowerCase().includes(q)
          || (j?.visitante||"").toLowerCase().includes(q);
      })
      .sort((a,b) => (b.atualizadoEm||"").localeCompare(a.atualizadoEm||""));
  }, [cotacoes, filtroCampeonato, filtroStatus, filtroFornId, busca, jogoById, fornById]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const escopo = (cotacoes||[]).filter(c => filtroCampeonato === FILTRO_TODOS || c.campeonatoId === filtroCampeonato);
    const aprovadas = escopo.filter(c => c.status === "aprovada");
    const totalAprovado = aprovadas.reduce((s,c) => s + Number(c.valorTotal||0), 0);
    const totalProvisionado = escopo.filter(c => c.status !== "cancelada").reduce((s,c) => s + Number(c.valorTotal||0), 0);
    const fornUnicos = new Set(escopo.map(c => String(c.fornecedorId))).size;
    return {
      total: escopo.length,
      aprovadas: aprovadas.length,
      totalProvisionado,
      totalAprovado,
      fornUnicos,
    };
  }, [cotacoes, filtroCampeonato]);

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const criarCot = (cot) => {
    setCotacoes(list => [...(list||[]), cot]);
    setShowNova(false);
    setEditandoId(cot.id);
  };
  const salvarCot = (cot) => {
    setCotacoes(list => (list||[]).map(c => c.id === cot.id ? cot : c));
  };
  const removerCot = (id) => {
    if (!confirm("Remover esta cotação?")) return;
    setCotacoes(list => (list||[]).filter(c => c.id !== id));
    if (editandoId === id) setEditandoId(null);
  };

  const cotEdit = editandoId ? (cotacoes||[]).find(c => c.id === editandoId) : null;
  const jogoEdit = cotEdit ? jogoById[cotEdit.jogoId] : null;
  const fornEdit = cotEdit ? fornById[String(cotEdit.fornecedorId)] : null;
  const campEdit = cotEdit ? campById[cotEdit.campeonatoId] : null;
  const cidEdit  = cotEdit ? cidadeById[cotEdit.cidadeId] : null;

  const TS = tableStyles(T);

  return (
    <>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:20}}>
        <KPI label="Total Cotações" value={String(kpis.total)} sub={`${kpis.aprovadas} aprovadas`} color={T.info||"#3b82f6"} T={T}/>
        <KPI label="Provisionado" value={fmt(kpis.totalProvisionado)} sub="Não canceladas" color={T.warning||"#f59e0b"} T={T}/>
        <KPI label="Aprovado" value={fmt(kpis.totalAprovado)} sub="Confirmado pra realizar" color={T.brand||"#10b981"} T={T}/>
        <KPI label="Fornecedores" value={String(kpis.fornUnicos)} sub="Distintos no escopo" color="#a855f7" T={T}/>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <Search size={14} color={T.textSm} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar fornecedor ou time..." style={{...iSty(T),width:280,padding:"8px 12px 8px 34px"}}/>
          </div>

          <div style={{width:1,height:24,background:T.border}}/>
          <Chip active={filtroStatus==="todos"} onClick={()=>setFiltroStatus("todos")} T={T}>Todos</Chip>
          {STATUS_COTACAO_NOVO.map(s => (
            <Chip key={s.key} active={filtroStatus===s.key} onClick={()=>setFiltroStatus(s.key)} T={T} color={s.color}>{s.label}</Chip>
          ))}

          <div style={{width:1,height:24,background:T.border}}/>
          <select value={filtroFornId} onChange={e=>setFiltroFornId(e.target.value)} style={{...iSty(T), width:200}}>
            <option value="todos">Todos os fornecedores</option>
            {[...fornecedores].sort((a,b)=>(a.apelido||"").localeCompare(b.apelido||"")).map(f => (
              <option key={f.id} value={f.id}>{f.apelido}</option>
            ))}
          </select>
        </div>

        <Button T={T} variant="primary" size="md" icon={Plus} onClick={()=>setShowNova(true)}>Nova cotação</Button>
      </div>

      {/* Listagem */}
      <Card T={T} padding={0}>
        <PanelTitle T={T}
          title="Cotações"
          subtitle={`${cotacoesFiltradas.length} cotação${cotacoesFiltradas.length!==1?"ões":""} · ordenadas por atualização`}
          color={T.brand||"#10b981"}
        />

        {cotacoesFiltradas.length === 0 ? (
          <div style={{padding:"56px 20px",textAlign:"center"}}>
            <div style={{
              width:64,height:64,borderRadius:16,
              background:T.surfaceAlt||T.bg,
              border:`1px solid ${T.border}`,
              color:T.textSm,
              display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14,
            }}><FileSpreadsheet size={28} strokeWidth={2}/></div>
            <h3 style={{margin:"0 0 6px",fontSize:16,fontWeight:800,color:T.text}}>Nenhuma cotação</h3>
            <p style={{margin:"0 0 16px",fontSize:13,color:T.textMd,maxWidth:420,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>
              Crie uma nova cotação a partir de um jogo do calendário. Você precisa ter ao menos uma <b>tabela vigente</b> para o fornecedor no campeonato escolhido.
            </p>
            <Button T={T} variant="primary" size="md" icon={Plus} onClick={()=>setShowNova(true)}>Nova cotação</Button>
          </div>
        ) : (
          <div style={TS.wrap}>
            <table style={{...TS.table, minWidth:1000}}>
              <thead>
                <tr style={TS.thead}>
                  {["Status","Data jogo","Jogo","Cidade","Cat.","Fornecedor","Base","Adic.","Total",""].map(h =>
                    <th key={h} style={{...TS.th, ...TS.thLeft, ...(["Base","Adic.","Total"].includes(h)?{textAlign:"right"}:{})}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {cotacoesFiltradas.map(c => {
                  const f = fornById[String(c.fornecedorId)];
                  const j = jogoById[c.jogoId];
                  const cid = cidadeById[c.cidadeId];
                  const status = statusCotacaoInfo(c.status);
                  return (
                    <tr key={c.id} style={{...TS.tr, cursor:"pointer"}} onClick={()=>setEditandoId(c.id)}>
                      <td style={TS.td}><Badge T={T} color={status.color} size="sm">{status.label}</Badge></td>
                      <td style={{...TS.td, fontSize:11, color:T.textSm, whiteSpace:"nowrap"}}>
                        <Calendar size={11} style={{display:"inline",verticalAlign:"-1px",marginRight:4}}/>
                        {fmtData(j?.data)}
                      </td>
                      <td style={{...TS.td, fontSize:13, fontWeight:600}}>
                        {j ? <>{j.mandante} <span style={{color:T.textSm,fontWeight:400}}>×</span> {j.visitante}</> : <span style={{color:T.textSm}}>(jogo removido)</span>}
                      </td>
                      <td style={{...TS.td, fontSize:12}}>
                        {cid ? <span style={{display:"inline-flex",alignItems:"center",gap:4}}><MapPin size={11} color={T.textSm}/>{cid.nome}/{cid.uf}</span> : "—"}
                      </td>
                      <td style={TS.td}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:RADIUS.pill,background:T.brandSoft||"rgba(16,185,129,0.12)",color:T.brand||"#10b981",fontSize:11,fontWeight:700}}>
                          <Tag size={10}/>{c.categoria}
                        </span>
                      </td>
                      <td style={{...TS.td, fontSize:13, fontWeight:600}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                          <Building2 size={12} color={T.textSm}/>
                          {f?.apelido || "(removido)"}
                        </span>
                      </td>
                      <td style={{...TS.td, textAlign:"right", fontFamily:"'JetBrains Mono',ui-monospace,monospace", fontSize:12, color:T.textMd}}>{fmt(c.valorBase)}</td>
                      <td style={{...TS.td, textAlign:"right", fontFamily:"'JetBrains Mono',ui-monospace,monospace", fontSize:12, color:c.valorAdicionais>0?(T.warning||"#f59e0b"):T.textSm}}>{c.valorAdicionais>0?fmt(c.valorAdicionais):"—"}</td>
                      <td style={{...TS.td, textAlign:"right", fontFamily:"'JetBrains Mono',ui-monospace,monospace", fontSize:13, fontWeight:800, color:T.brand||"#10b981"}}>{fmt(c.valorTotal)}</td>
                      <td style={TS.td} onClick={e => e.stopPropagation()}>
                        <div style={{display:"flex",gap:4}}>
                          <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={()=>setEditandoId(c.id)}/>
                          <Button T={T} variant="danger"    size="sm" icon={Trash2} onClick={()=>removerCot(c.id)}/>
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

      {showNova && (
        <NovaCotacaoModal
          jogosForn={jogosForn||[]}
          fornecedores={fornecedores}
          tabelas={tabelas}
          campeonatos={campeonatos}
          cidades={cidades}
          filtroCampeonato={filtroCampeonato}
          onCreate={criarCot}
          onClose={()=>setShowNova(false)}
          T={T}
        />
      )}

      {cotEdit && (
        <CotacaoEditor
          cotacao={cotEdit}
          jogo={jogoEdit}
          fornecedor={fornEdit}
          campeonato={campEdit}
          cidade={cidEdit}
          onSave={salvarCot}
          onClose={()=>setEditandoId(null)}
          T={T}
        />
      )}
    </>
  );
}
