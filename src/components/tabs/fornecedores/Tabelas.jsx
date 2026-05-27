import { useState, useMemo } from "react";
import { iSty, RADIUS } from "../../../constants";
import { KPI } from "../../shared";
import { Card, PanelTitle, Button, Badge, Chip, tableStyles } from "../../ui";
import {
  STATUS_NEGOCIACAO, statusNegociacaoInfo,
  criarNegociacao, contarCelulasPreenchidas,
  migrarTabelaLegada, calcularDeltaRodadas, getRodadaAtual,
} from "../../../data/catalogos";
import {
  Plus, Search, Trash2, Pencil, Building2, Trophy,
  CheckCircle2, TrendingDown, TrendingUp, RefreshCw, AlertCircle,
} from "lucide-react";
import TabelaPrecoEditor from "./TabelaPrecoEditor";

const FILTRO_TODOS = "todos";

// ── Modal: nova negociação ────────────────────────────────────────────────
function NovaNegociacaoModal({ fornecedores, campeonatos, tabelas, onCreate, onClose, T }) {
  const IS = iSty(T);
  const [fornecedorId, setFornecedorId] = useState("");
  const [campeonatoId, setCampeonatoId] = useState(
    campeonatos.find(c=>c.ativo)?.id || campeonatos[0]?.id || ""
  );

  const fornOrdenados = [...fornecedores].sort((a,b)=>(a.apelido||"").localeCompare(b.apelido||""));
  const campSelecionado = campeonatos.find(c=>c.id===campeonatoId);

  const jaTemAprovada = fornecedorId && campeonatoId && tabelas.some(t =>
    String(t.fornecedorId)===String(fornecedorId) && t.campeonatoId===campeonatoId && t.status==="aprovada"
  );

  const handleCreate = () => {
    if (!fornecedorId || !campeonatoId) return;
    const nova = criarNegociacao({ fornecedorId:Number(fornecedorId), campeonatoId });
    onCreate(nova);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:130,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:520,border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <h3 style={{margin:"0 0 6px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>Nova negociação</h3>
        <p style={{margin:"0 0 18px",fontSize:12,color:T.textMd}}>
          Selecione o fornecedor e o campeonato. Uma matriz vazia será criada com os itens de serviço e cidades-sede do campeonato.
        </p>

        <div style={{marginBottom:14}}>
          <label style={lbl}>Fornecedor</label>
          <select value={fornecedorId} onChange={e=>setFornecedorId(e.target.value)} style={IS}>
            <option value="">— Selecione —</option>
            {fornOrdenados.map(f => <option key={f.id} value={f.id}>{f.apelido}</option>)}
          </select>
        </div>

        <div style={{marginBottom:14}}>
          <label style={lbl}>Campeonato</label>
          <select value={campeonatoId} onChange={e=>setCampeonatoId(e.target.value)} style={IS}>
            {campeonatos.filter(c=>c.ativo).map(c => (
              <option key={c.id} value={c.id}>
                {c.nome} · {(c.itens||[]).length} itens · {(c.cidadeIds||[]).length} cidades
              </option>
            ))}
          </select>
        </div>

        {campSelecionado && !(campSelecionado.itens||[]).length && (
          <div style={{padding:"10px 12px",background:T.warning?`${T.warning}1a`:"rgba(245,158,11,0.12)",border:`1px solid ${T.warning||"#f59e0b"}`,borderRadius:RADIUS.md,marginBottom:14,display:"flex",gap:8,alignItems:"flex-start"}}>
            <AlertCircle size={14} color={T.warning||"#f59e0b"} style={{marginTop:2,flexShrink:0}}/>
            <span style={{fontSize:12,color:T.text,lineHeight:1.5}}>
              Este campeonato ainda não tem <b>itens de serviço</b> cadastrados. Vá em <b>Catálogos</b> e adicione os serviços que serão orçados (UM B1, drone, equipe...).
            </span>
          </div>
        )}

        {jaTemAprovada && (
          <div style={{padding:"10px 12px",background:T.warning?`${T.warning}1a`:"rgba(245,158,11,0.12)",border:`1px solid ${T.warning||"#f59e0b"}`,borderRadius:RADIUS.md,marginBottom:14,display:"flex",gap:8,alignItems:"flex-start"}}>
            <AlertCircle size={14} color={T.warning||"#f59e0b"} style={{marginTop:2,flexShrink:0}}/>
            <span style={{fontSize:12,color:T.text,lineHeight:1.5}}>
              Já existe uma negociação <b>aprovada</b> para este par. A nova rodará em paralelo e ao ser aprovada substituirá a anterior.
            </span>
          </div>
        )}

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={handleCreate} disabled={!fornecedorId||!campeonatoId}>Criar negociação</Button>
        </div>
      </div>
    </div>
  );
}

const lbl = {color:"inherit",fontSize:11,fontWeight:600,display:"block",marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"};

// ════════════════════════════════════════════════════════════════════════════
export default function Tabelas({
  fornecedores, cidades, campeonatos,
  tabelas, setTabelas,
  filtroCampeonato = FILTRO_TODOS,
  T,
}) {
  const [showNova, setShowNova]       = useState(false);
  const [editandoId, setEditandoId]   = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroFornId, setFiltroFornId] = useState("todos");
  const [busca, setBusca]             = useState("");

  const fornById = useMemo(() => Object.fromEntries(fornecedores.map(f=>[f.id,f])), [fornecedores]);
  const campById = useMemo(() => Object.fromEntries(campeonatos.map(c=>[c.id,c])), [campeonatos]);

  // Migra tabelas no formato antigo para o novo na hora de exibir
  const tabelasMigradas = useMemo(() => tabelas.map(t => migrarTabelaLegada(t)), [tabelas]);

  const tabelasFiltradas = useMemo(() => {
    return tabelasMigradas
      .filter(t => filtroCampeonato===FILTRO_TODOS || t.campeonatoId===filtroCampeonato)
      .filter(t => filtroStatus==="todos" || t.status===filtroStatus)
      .filter(t => filtroFornId==="todos" || String(t.fornecedorId)===String(filtroFornId))
      .filter(t => {
        if (!busca.trim()) return true;
        const f = fornById[t.fornecedorId];
        const c = campById[t.campeonatoId];
        const q = busca.toLowerCase();
        return (f?.apelido||"").toLowerCase().includes(q)
          || (c?.nome||"").toLowerCase().includes(q);
      })
      .sort((a,b)=>(b.atualizadoEm||"").localeCompare(a.atualizadoEm||""));
  }, [tabelasMigradas, filtroCampeonato, filtroStatus, filtroFornId, busca, fornById, campById]);

  const kpis = useMemo(() => {
    const esc = filtroCampeonato===FILTRO_TODOS ? tabelasMigradas : tabelasMigradas.filter(t=>t.campeonatoId===filtroCampeonato);
    return {
      total:      esc.length,
      aprovadas:  esc.filter(t=>t.status==="aprovada").length,
      emAndamento:esc.filter(t=>["aguardando_forn","em_analise","contraproposta"].includes(t.status)).length,
      rascunhos:  esc.filter(t=>t.status==="rascunho").length,
    };
  }, [tabelasMigradas, filtroCampeonato]);

  // ── CRUD ───────────────────────────────────────────────────────────────
  const criarNeg = nova => {
    setTabelas(list => [...list, nova]);
    setShowNova(false);
    setEditandoId(nova.id);
  };

  const salvarNeg = atualizada => {
    setTabelas(list => {
      return list.map(t => {
        if (t.id===atualizada.id) return atualizada;
        // Ao aprovar, arquiva a aprovada anterior do mesmo par
        if (atualizada.status==="aprovada"
          && t.status==="aprovada"
          && String(t.fornecedorId)===String(atualizada.fornecedorId)
          && t.campeonatoId===atualizada.campeonatoId) {
          return {...t, status:"arquivada", atualizadoEm:new Date().toISOString()};
        }
        return t;
      });
    });
  };

  const removerNeg = id => {
    if (!confirm("Remover esta negociação permanentemente?")) return;
    setTabelas(list => list.filter(t=>t.id!==id));
    if (editandoId===id) setEditandoId(null);
  };

  const negAberta = editandoId ? tabelasMigradas.find(t=>t.id===editandoId) : null;
  const fornAberto = negAberta ? fornById[negAberta.fornecedorId] : null;
  const campAberto = negAberta ? campById[negAberta.campeonatoId] : null;

  const TS = tableStyles(T);

  return (
    <>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:20}}>
        <KPI label="Total" value={String(kpis.total)} sub={filtroCampeonato===FILTRO_TODOS?"Todos os campeonatos":campById[filtroCampeonato]?.nome||""} color={T.info||"#3b82f6"} T={T}/>
        <KPI label="Aprovadas" value={String(kpis.aprovadas)} sub="Valores vigentes para cotação" color={T.brand||"#10b981"} T={T}/>
        <KPI label="Em andamento" value={String(kpis.emAndamento)} sub="Aguardando / em análise / contra-proposta" color={T.warning||"#f59e0b"} T={T}/>
        <KPI label="Rascunhos" value={String(kpis.rascunhos)} sub="Não enviadas ainda" color="#64748b" T={T}/>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <Search size={14} color={T.textSm} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar fornecedor ou campeonato..." style={{...iSty(T),width:280,padding:"8px 12px 8px 34px"}}/>
          </div>
          <div style={{width:1,height:24,background:T.border}}/>
          <Chip active={filtroStatus==="todos"} onClick={()=>setFiltroStatus("todos")} T={T}>Todos</Chip>
          {STATUS_NEGOCIACAO.map(s => (
            <Chip key={s.key} active={filtroStatus===s.key} onClick={()=>setFiltroStatus(s.key)} T={T} color={s.color}>{s.label}</Chip>
          ))}
          <div style={{width:1,height:24,background:T.border}}/>
          <select value={filtroFornId} onChange={e=>setFiltroFornId(e.target.value)} style={{...iSty(T),width:220}}>
            <option value="todos">Todos os fornecedores</option>
            {[...fornecedores].sort((a,b)=>(a.apelido||"").localeCompare(b.apelido||"")).map(f=>(
              <option key={f.id} value={f.id}>{f.apelido}</option>
            ))}
          </select>
        </div>
        <Button T={T} variant="primary" size="md" icon={Plus} onClick={()=>setShowNova(true)}>Nova negociação</Button>
      </div>

      {/* Listagem */}
      <Card T={T} padding={0}>
        <PanelTitle T={T}
          title="Negociações de Tabela de Preço"
          subtitle={`${tabelasFiltradas.length} negociação${tabelasFiltradas.length!==1?"ões":""} · clique para abrir o editor`}
          color={T.brand||"#10b981"}
        />

        {tabelasFiltradas.length === 0 ? (
          <EmptyState T={T} onNew={()=>setShowNova(true)} hasData={tabelas.length>0}/>
        ) : (
          <div style={TS.wrap}>
            <table style={{...TS.table, minWidth:980}}>
              <thead>
                <tr style={TS.thead}>
                  {["Fornecedor","Campeonato","Status","Rodadas","Preenchido","Variação","Atualizada",""].map(h => (
                    <th key={h} style={{...TS.th,...TS.thLeft,...(["Rodadas","Preenchido"].includes(h)?{textAlign:"center"}:{}),...(["Variação"].includes(h)?{textAlign:"right"}:{})}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabelasFiltradas.map(t => {
                  const f   = fornById[t.fornecedorId];
                  const c   = campById[t.campeonatoId];
                  const st  = statusNegociacaoInfo(t.status);
                  const itens = (c?.itens?.length) ? c.itens : (f?.catalogo||[]);
                  const cels = (c?.cidadeIds?.length||0) * (c?.categorias?.length||0) * itens.length;
                  const pre  = contarCelulasPreenchidas(t);
                  const pct  = cels ? Math.round((pre/cels)*100) : 0;
                  const delta = calcularDeltaRodadas(t);
                  const rodadas = t.rodadas?.length || 1;
                  return (
                    <tr key={t.id} style={{...TS.tr,cursor:"pointer"}} onClick={()=>setEditandoId(t.id)}>
                      <td style={{...TS.td,fontWeight:600}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:7}}>
                          <Building2 size={13} color={T.textSm}/>
                          {f?.apelido||<span style={{color:T.textSm}}>(removido)</span>}
                        </span>
                      </td>
                      <td style={{...TS.td,fontSize:12,color:T.textMd}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                          <Trophy size={12} color={T.textSm}/>
                          {c?.nome||<span style={{color:T.textSm}}>(removido)</span>}
                        </span>
                      </td>
                      <td style={TS.td}>
                        <Badge T={T} color={st.color} size="sm">{st.label}</Badge>
                      </td>
                      <td style={{...TS.td,textAlign:"center"}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,color:T.textMd}}>
                          <RefreshCw size={11} color={T.textSm}/> {rodadas}
                        </span>
                      </td>
                      <td style={{...TS.td,textAlign:"center"}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12,fontWeight:700,color:pct===100?(T.brand||"#10b981"):pct>0?(T.info||"#3b82f6"):T.textSm}}>
                          {pct===100&&<CheckCircle2 size={12}/>}
                          {pre}/{cels} ({pct}%)
                        </span>
                      </td>
                      <td style={{...TS.td,textAlign:"right"}}>
                        {delta !== null ? (
                          <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:700,color:delta>0?(T.brand||"#10b981"):(T.danger||"#ef4444")}}>
                            {delta>0?<TrendingDown size={12}/>:<TrendingUp size={12}/>}
                            {delta>0?"-":"+"}{Math.abs(delta).toFixed(1)}%
                          </span>
                        ) : <span style={{color:T.textSm,fontSize:11}}>—</span>}
                      </td>
                      <td style={{...TS.td,fontSize:11,color:T.textSm}}>
                        {t.atualizadoEm?new Date(t.atualizadoEm).toLocaleDateString("pt-BR"):"—"}
                      </td>
                      <td style={TS.td} onClick={e=>e.stopPropagation()}>
                        <div style={{display:"flex",gap:4}}>
                          <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={()=>setEditandoId(t.id)}/>
                          <Button T={T} variant="danger"    size="sm" icon={Trash2} onClick={()=>removerNeg(t.id)}/>
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
        <NovaNegociacaoModal
          fornecedores={fornecedores}
          campeonatos={campeonatos}
          tabelas={tabelasMigradas}
          onCreate={criarNeg}
          onClose={()=>setShowNova(false)}
          T={T}
        />
      )}

      {negAberta && (
        <TabelaPrecoEditor
          tabela={negAberta}
          fornecedor={fornAberto}
          campeonato={campAberto}
          cidades={cidades}
          onSave={salvarNeg}
          onClose={()=>setEditandoId(null)}
          T={T}
        />
      )}
    </>
  );
}

function EmptyState({ T, onNew, hasData }) {
  return (
    <div style={{padding:"56px 20px",textAlign:"center"}}>
      <div style={{width:64,height:64,borderRadius:16,background:T.surfaceAlt||T.bg,border:`1px solid ${T.border}`,color:T.textSm,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
        <RefreshCw size={28} strokeWidth={2}/>
      </div>
      <h3 style={{margin:"0 0 6px",fontSize:16,fontWeight:800,color:T.text}}>
        {hasData?"Nenhuma negociação nos filtros":"Sem negociações ainda"}
      </h3>
      <p style={{margin:"0 0 16px",fontSize:13,color:T.textMd,maxWidth:420,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>
        {hasData
          ?"Ajuste os filtros para ver outras negociações."
          :"Crie a primeira negociação selecionando um fornecedor e um campeonato. Você precisará ter os itens de serviço configurados no campeonato (em Catálogos)."}
      </p>
      {!hasData && <Button T={T} variant="primary" size="md" icon={Plus} onClick={onNew}>Nova negociação</Button>}
    </div>
  );
}
