import { useState, useMemo } from "react";
import { iSty, RADIUS } from "../../../constants";
import { KPI } from "../../shared";
import { Card, PanelTitle, Button, Badge, Chip, tableStyles } from "../../ui";
import {
  STATUS_TABELA, statusTabelaInfo, criarTabelaVazia, contarCelulasPreenchidas,
} from "../../../data/catalogos";
import {
  Plus, FileSpreadsheet, Building2, Trophy, Search, Trash2, Pencil,
  CheckCircle2, AlertCircle, Layers,
} from "lucide-react";
import TabelaPrecoEditor from "./TabelaPrecoEditor";

// ════════════════════════════════════════════════════════════════════════════
// TABELAS DE PREÇO — listagem, criação e abertura do editor
// ----------------------------------------------------------------------------
// Cada tabela = um snapshot da matriz de preços de UM fornecedor para UM
// campeonato. Filtra por campeonato (pré-aplicado pelo Hub), fornecedor e
// status.
// ════════════════════════════════════════════════════════════════════════════

const FILTRO_TODOS = "todos";

// ── Modal: criar nova tabela ─────────────────────────────────────────────────
function NovaTabelaModal({ fornecedores, campeonatos, tabelas, onCreate, onClose, T }) {
  const IS = iSty(T);
  const [fornecedorId, setFornecedorId] = useState("");
  const [campeonatoId, setCampeonatoId] = useState(
    campeonatos.find(c => c.ativo)?.id || campeonatos[0]?.id || ""
  );
  const [versaoAviso, setVersaoAviso] = useState(null);

  const fornecedoresOrdenados = [...fornecedores].sort((a,b) =>
    (a.apelido||"").localeCompare(b.apelido||"")
  );

  const handleCreate = () => {
    if (!fornecedorId || !campeonatoId) return;
    const fornNum = Number(fornecedorId);
    const existentes = tabelas.filter(t =>
      t.fornecedorId === fornNum && t.campeonatoId === campeonatoId
    );
    const proximaVersao = existentes.length
      ? Math.max(...existentes.map(t => t.versao || 1)) + 1
      : 1;
    const nova = {
      ...criarTabelaVazia({ fornecedorId: fornNum, campeonatoId }),
      versao: proximaVersao,
    };
    onCreate(nova);
  };

  // Aviso se já existe vigente para o par fornecedor+campeonato
  const fornNum = fornecedorId ? Number(fornecedorId) : null;
  const jaTemVigente = fornNum && campeonatoId
    && tabelas.some(t => t.fornecedorId === fornNum && t.campeonatoId === campeonatoId && t.status === "vigente");

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:130,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:480,border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <h3 style={{margin:"0 0 6px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>Nova tabela de preços</h3>
        <p style={{margin:"0 0 18px",fontSize:12,color:T.textMd}}>
          Selecione o fornecedor e o campeonato. Uma matriz vazia será criada
          com base no catálogo de itens do fornecedor e nas cidades-sede do
          campeonato.
        </p>

        <div style={{marginBottom:14}}>
          <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"}}>Fornecedor</label>
          <select value={fornecedorId} onChange={e=>setFornecedorId(e.target.value)} style={IS}>
            <option value="">— Selecione —</option>
            {fornecedoresOrdenados.map(f => (
              <option key={f.id} value={f.id}>
                {f.apelido} {(f.catalogo||[]).length ? `· ${f.catalogo.length} itens` : "· (sem catálogo)"}
              </option>
            ))}
          </select>
        </div>

        <div style={{marginBottom:14}}>
          <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"}}>Campeonato</label>
          <select value={campeonatoId} onChange={e=>setCampeonatoId(e.target.value)} style={IS}>
            {campeonatos.filter(c => c.ativo).map(c => (
              <option key={c.id} value={c.id}>
                {c.nome} · {(c.cidadeIds||[]).length} cidades · {(c.categorias||[]).length} categorias
              </option>
            ))}
          </select>
        </div>

        {jaTemVigente && (
          <div style={{padding:"10px 12px",background:T.warning?`${T.warning}1a`:"rgba(245,158,11,0.12)",border:`1px solid ${T.warning||"#f59e0b"}`,borderRadius:RADIUS.md,marginBottom:14,display:"flex",gap:8,alignItems:"flex-start"}}>
            <AlertCircle size={14} color={T.warning||"#f59e0b"} style={{marginTop:2,flexShrink:0}}/>
            <span style={{fontSize:12,color:T.text,lineHeight:1.5}}>
              Já existe uma tabela <b>vigente</b> para esse fornecedor e campeonato. A nova será uma versão posterior (e a anterior pode ser arquivada quando esta for aprovada).
            </span>
          </div>
        )}

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={handleCreate} disabled={!fornecedorId || !campeonatoId}>Criar tabela</Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function Tabelas({
  fornecedores,
  cidades,
  campeonatos,
  tabelas,
  setTabelas,
  filtroCampeonato = FILTRO_TODOS,
  T,
}) {
  const [showNova, setShowNova] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroFornId, setFiltroFornId] = useState("todos");
  const [busca, setBusca] = useState("");

  const fornById = useMemo(() => Object.fromEntries(fornecedores.map(f => [f.id, f])), [fornecedores]);
  const campById = useMemo(() => Object.fromEntries(campeonatos.map(c => [c.id, c])), [campeonatos]);

  const tabelasFiltradas = useMemo(() => {
    return tabelas
      .filter(t => filtroCampeonato === FILTRO_TODOS || t.campeonatoId === filtroCampeonato)
      .filter(t => filtroStatus === "todos" || t.status === filtroStatus)
      .filter(t => filtroFornId === "todos" || String(t.fornecedorId) === String(filtroFornId))
      .filter(t => {
        if (!busca.trim()) return true;
        const f = fornById[t.fornecedorId];
        const c = campById[t.campeonatoId];
        const q = busca.toLowerCase();
        return (f?.apelido||"").toLowerCase().includes(q)
          || (f?.razaoSocial||"").toLowerCase().includes(q)
          || (c?.nome||"").toLowerCase().includes(q);
      })
      .sort((a,b) => (b.atualizadoEm||"").localeCompare(a.atualizadoEm||""));
  }, [tabelas, filtroCampeonato, filtroStatus, filtroFornId, busca, fornById, campById]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const escopo = filtroCampeonato === FILTRO_TODOS
      ? tabelas
      : tabelas.filter(t => t.campeonatoId === filtroCampeonato);
    return {
      total:     escopo.length,
      vigentes:  escopo.filter(t => t.status === "vigente").length,
      enviadas:  escopo.filter(t => t.status === "enviada" || t.status === "devolvida").length,
      rascunhos: escopo.filter(t => t.status === "rascunho").length,
    };
  }, [tabelas, filtroCampeonato]);

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const criarTabela = (nova) => {
    setTabelas(list => [...list, nova]);
    setShowNova(false);
    setEditandoId(nova.id);
  };

  const salvarTabela = (atualizada) => {
    setTabelas(list => {
      // Quando uma tabela vira vigente, arquivar a vigente anterior do mesmo
      // par (fornecedor, campeonato) automaticamente — só pode haver uma
      // vigente por par.
      const next = list.map(t => {
        if (t.id === atualizada.id) return atualizada;
        if (atualizada.status === "vigente"
          && t.status === "vigente"
          && t.fornecedorId === atualizada.fornecedorId
          && t.campeonatoId === atualizada.campeonatoId) {
          return { ...t, status:"arquivada", atualizadoEm:new Date().toISOString() };
        }
        return t;
      });
      return next;
    });
  };

  const removerTabela = (id) => {
    if (!confirm("Remover esta tabela permanentemente? Essa ação não pode ser desfeita.")) return;
    setTabelas(list => list.filter(t => t.id !== id));
    if (editandoId === id) setEditandoId(null);
  };

  const tabelaAberta = editandoId ? tabelas.find(t => t.id === editandoId) : null;
  const fornAberto   = tabelaAberta ? fornById[tabelaAberta.fornecedorId] : null;
  const campAberto   = tabelaAberta ? campById[tabelaAberta.campeonatoId] : null;

  const TS = tableStyles(T);

  return (
    <>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:20}}>
        <KPI label="Total de Tabelas" value={String(kpis.total)} sub={filtroCampeonato===FILTRO_TODOS?"Todos os campeonatos":campById[filtroCampeonato]?.nome||""} color={T.info||"#3b82f6"} T={T}/>
        <KPI label="Vigentes" value={String(kpis.vigentes)} sub="Em uso para cotações" color={T.brand||"#10b981"} T={T}/>
        <KPI label="Em Negociação" value={String(kpis.enviadas)} sub="Enviadas / devolvidas" color={T.warning||"#f59e0b"} T={T}/>
        <KPI label="Rascunhos" value={String(kpis.rascunhos)} sub="Aguardando envio" color="#64748b" T={T}/>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <Search size={14} color={T.textSm} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por fornecedor ou campeonato..."
              style={{...iSty(T),width:280,padding:"8px 12px 8px 34px"}}
            />
          </div>

          <div style={{width:1,height:24,background:T.border}}/>
          <Chip active={filtroStatus==="todos"} onClick={()=>setFiltroStatus("todos")} T={T}>Todos</Chip>
          {STATUS_TABELA.map(s => (
            <Chip key={s.key} active={filtroStatus===s.key} onClick={()=>setFiltroStatus(s.key)} T={T} color={s.color}>{s.label}</Chip>
          ))}

          <div style={{width:1,height:24,background:T.border}}/>
          <select
            value={filtroFornId}
            onChange={e => setFiltroFornId(e.target.value)}
            style={{...iSty(T), width:220}}
          >
            <option value="todos">Todos os fornecedores</option>
            {[...fornecedores].sort((a,b)=>(a.apelido||"").localeCompare(b.apelido||"")).map(f => (
              <option key={f.id} value={f.id}>{f.apelido}</option>
            ))}
          </select>
        </div>

        <Button T={T} variant="primary" size="md" icon={Plus} onClick={()=>setShowNova(true)}>
          Nova tabela
        </Button>
      </div>

      {/* Listagem */}
      <Card T={T} padding={0}>
        <PanelTitle T={T}
          title="Tabelas de Preço"
          subtitle={`${tabelasFiltradas.length} tabela${tabelasFiltradas.length!==1?"s":""} · ordenadas por atualização`}
          color={T.brand||"#10b981"}
        />

        {tabelasFiltradas.length === 0 ? (
          <div style={{padding:"56px 20px",textAlign:"center"}}>
            <div style={{
              width:64,height:64,borderRadius:16,
              background:T.surfaceAlt||T.bg,
              border:`1px solid ${T.border}`,
              color:T.textSm,
              display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14,
            }}><FileSpreadsheet size={28} strokeWidth={2}/></div>
            <h3 style={{margin:"0 0 6px",fontSize:16,fontWeight:800,color:T.text}}>Nenhuma tabela encontrada</h3>
            <p style={{margin:"0 0 16px",fontSize:13,color:T.textMd,maxWidth:420,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>
              {tabelas.length === 0
                ? "Ainda não há tabelas de preço cadastradas. Crie a primeira a partir de um fornecedor com catálogo de itens preenchido."
                : "Nenhuma tabela bate com os filtros atuais."}
            </p>
            {tabelas.length === 0 && (
              <Button T={T} variant="primary" size="md" icon={Plus} onClick={()=>setShowNova(true)}>Criar primeira tabela</Button>
            )}
          </div>
        ) : (
          <div style={TS.wrap}>
            <table style={{...TS.table, minWidth:920}}>
              <thead>
                <tr style={TS.thead}>
                  {["Fornecedor","Campeonato","Status","Versão","Preenchido","Atualizada",""].map(h =>
                    <th key={h} style={{...TS.th, ...TS.thLeft, ...(["Preenchido","Versão"].includes(h)?{textAlign:"right"}:{})}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {tabelasFiltradas.map(t => {
                  const f = fornById[t.fornecedorId];
                  const c = campById[t.campeonatoId];
                  const status = statusTabelaInfo(t.status);
                  const itens = (f?.catalogo||[]).length;
                  const cels  = (c?.cidadeIds?.length||0) * (c?.categorias?.length||0) * itens;
                  const pre   = contarCelulasPreenchidas(t);
                  const pct   = cels ? Math.round((pre/cels)*100) : 0;
                  return (
                    <tr key={t.id} style={{...TS.tr, cursor:"pointer"}} onClick={()=>setEditandoId(t.id)}>
                      <td style={{...TS.td, fontWeight:600}}>
                        <div style={{display:"inline-flex",alignItems:"center",gap:8}}>
                          <Building2 size={13} color={T.textSm}/>
                          {f?.apelido || <span style={{color:T.textSm}}>(removido)</span>}
                        </div>
                      </td>
                      <td style={{...TS.td, fontSize:12, color:T.textMd}}>
                        <div style={{display:"inline-flex",alignItems:"center",gap:6}}>
                          <Trophy size={12} color={T.textSm}/>
                          {c?.nome || <span style={{color:T.textSm}}>(removido)</span>}
                        </div>
                      </td>
                      <td style={TS.td}>
                        <Badge T={T} color={status.color} size="sm">{status.label}</Badge>
                      </td>
                      <td style={{...TS.td, textAlign:"right", fontFamily:"'JetBrains Mono',ui-monospace,monospace", fontSize:12, color:T.textMd}}>
                        v{t.versao || 1}
                      </td>
                      <td style={{...TS.td, textAlign:"right"}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,fontWeight:700,color:pct===100?(T.brand||"#10b981"):pct>0?(T.info||"#3b82f6"):T.textSm}}>
                          {pct === 100 && <CheckCircle2 size={12}/>}
                          {pre}/{cels} ({pct}%)
                        </span>
                      </td>
                      <td style={{...TS.td, fontSize:11, color:T.textSm}}>
                        {t.atualizadoEm ? new Date(t.atualizadoEm).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td style={TS.td} onClick={e => e.stopPropagation()}>
                        <div style={{display:"flex",gap:4}}>
                          <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={()=>setEditandoId(t.id)}/>
                          <Button T={T} variant="danger"    size="sm" icon={Trash2} onClick={()=>removerTabela(t.id)}/>
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
        <NovaTabelaModal
          fornecedores={fornecedores}
          campeonatos={campeonatos}
          tabelas={tabelas}
          onCreate={criarTabela}
          onClose={()=>setShowNova(false)}
          T={T}
        />
      )}

      {tabelaAberta && (
        <TabelaPrecoEditor
          tabela={tabelaAberta}
          fornecedor={fornAberto}
          campeonato={campAberto}
          cidades={cidades}
          onSave={(t) => { salvarTabela(t); }}
          onClose={()=>setEditandoId(null)}
          T={T}
        />
      )}
    </>
  );
}
