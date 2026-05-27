import { useState, useMemo } from "react";
import { iSty, RADIUS } from "../../../constants";
import { fmt } from "../../../utils";
import { KPI } from "../../shared";
import { Card, PanelTitle, Button, Badge, Chip, tableStyles } from "../../ui";
import {
  STATUS_COTACAO_NOVO, statusCotacaoInfo,
  getTabelaVigente, criarCotacao, getValoresVigentes, getCelula,
} from "../../../data/catalogos";
import {
  Plus, Search, Pencil, Trash2, AlertCircle, FileSpreadsheet,
  MapPin, Tag, Building2, Calendar, CheckCircle2, ArrowRight,
} from "lucide-react";
import CotacaoEditor from "./CotacaoEditor";

const FILTRO_TODOS = "todos";
const fmtData = iso => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}); }
  catch { return iso; }
};

// Calcula estimativa de custo para um fornecedor × jogo com base na tabela vigente
function estimarCusto(fornecedor, jogo, tabelas, campeonatos) {
  const tab = getTabelaVigente(tabelas, fornecedor.id, jogo.campeonatoId);
  if (!tab) return null;
  const camp = campeonatos.find(c=>c.id===jogo.campeonatoId);
  const itens = camp?.itens?.length ? camp.itens.filter(i=>i.ativo!==false) : (fornecedor.catalogo||[]).filter(i=>i.ativo!==false);
  const vals = getValoresVigentes(tab);
  const fakeTab = { valores: vals };
  let total = 0;
  let cobertos = 0;
  itens.forEach(it => {
    const v = getCelula(fakeTab, it.id, jogo.cidadeId, jogo.categoria);
    if (v != null && v > 0) { total += Number(v); cobertos++; }
  });
  return { total, cobertos, totalItens: itens.length, tabelaId: tab.id };
}

// ── Modal: nova cotação com comparativo ────────────────────────────────────
function NovaCotacaoModal({ jogosForn, fornecedores, tabelas, campeonatos, cidades, filtroCampeonato, onCreate, onClose, T }) {
  const IS = iSty(T);
  const [passo, setPasso]           = useState(1); // 1 = jogo, 2 = comparativo, 3 = confirmar
  const [jogoId, setJogoId]         = useState("");
  const [fornecedorId, setFornecedorId] = useState("");

  const jogosOrdenados = useMemo(()=>[...jogosForn]
    .filter(j=>filtroCampeonato===FILTRO_TODOS||j.campeonatoId===filtroCampeonato)
    .sort((a,b)=>(a.data||"").localeCompare(b.data||""))
  ,[jogosForn,filtroCampeonato]);

  const jogo       = jogosForn.find(j=>j.id===jogoId);
  const cidade     = jogo ? cidades.find(c=>c.id===jogo.cidadeId) : null;
  const camp       = jogo ? campeonatos.find(c=>c.id===jogo.campeonatoId) : null;

  // Todos os fornecedores com tabela vigente para este jogo
  const opcoes = useMemo(()=>{
    if (!jogo) return [];
    return fornecedores
      .map(f => {
        const est = estimarCusto(f, jogo, tabelas, campeonatos);
        if (!est) return null;
        return { fornecedor: f, ...est };
      })
      .filter(Boolean)
      .sort((a,b) => a.total - b.total);
  },[jogo, fornecedores, tabelas, campeonatos]);

  const fornSelecionado = fornecedores.find(f=>String(f.id)===String(fornecedorId));
  const tabelaVigente   = jogo && fornSelecionado ? getTabelaVigente(tabelas, fornSelecionado.id, jogo.campeonatoId) : null;
  const podeCriar = jogo && fornSelecionado && tabelaVigente;

  const handleCriar = () => {
    if (!podeCriar) return;
    onCreate(criarCotacao({ jogo, fornecedor: fornSelecionado, tabela: tabelaVigente, campeonato: camp }));
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:130,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <h3 style={{margin:"0 0 6px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>Nova cotação</h3>

        {/* Passo 1: selecionar jogo */}
        <div style={{marginBottom:14}}>
          <label style={lbl}>Jogo</label>
          <select value={jogoId} onChange={e=>{setJogoId(e.target.value); setFornecedorId("");}} style={IS}>
            <option value="">— Selecione —</option>
            {jogosOrdenados.map(j=>(
              <option key={j.id} value={j.id}>
                R{j.rodada} · {fmtData(j.data)} · {j.mandante} × {j.visitante} · {j.categoria}
              </option>
            ))}
          </select>
        </div>

        {/* Passo 2: comparativo de fornecedores */}
        {jogo && (
          <>
            <div style={{padding:"10px 12px",background:T.surfaceAlt||T.bg,border:`1px solid ${T.border}`,borderRadius:RADIUS.md,marginBottom:14,fontSize:12}}>
              <span style={{color:T.textMd}}>
                <MapPin size={11} style={{display:"inline",verticalAlign:"-1px",marginRight:4}}/>{cidade?.nome}/{cidade?.uf}
                <Tag size={11} style={{display:"inline",verticalAlign:"-1px",margin:"0 4px 0 10px"}}/>{jogo.categoria}
                <span style={{color:T.brand||"#10b981",fontWeight:700,marginLeft:10}}>{camp?.nome}</span>
              </span>
            </div>

            {opcoes.length === 0 ? (
              <div style={{padding:"16px",background:T.warning?`${T.warning}1a`:"rgba(245,158,11,0.12)",border:`1px solid ${T.warning||"#f59e0b"}`,borderRadius:RADIUS.md,marginBottom:14,display:"flex",gap:8,alignItems:"flex-start"}}>
                <AlertCircle size={14} color={T.warning||"#f59e0b"} style={{marginTop:2,flexShrink:0}}/>
                <span style={{fontSize:12,color:T.text,lineHeight:1.5}}>
                  Nenhum fornecedor tem tabela <b>aprovada</b> para <b>{camp?.nome}</b>. Crie e aprove negociações em <b>Negociações</b> antes de cotar.
                </span>
              </div>
            ) : (
              <>
                <div style={{marginBottom:8}}>
                  <label style={{...lbl,marginBottom:8}}>Fornecedores disponíveis — clique para selecionar</label>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {opcoes.map((op, idx) => {
                      const selected = String(fornecedorId)===String(op.fornecedor.id);
                      const isMelhor = idx===0;
                      return (
                        <button key={op.fornecedor.id} onClick={()=>setFornecedorId(String(op.fornecedor.id))} style={{
                          display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,
                          padding:"12px 14px",borderRadius:RADIUS.md,cursor:"pointer",textAlign:"left",
                          border:`2px solid ${selected?(T.brand||"#10b981"):isMelhor?(T.brandBorder||T.border):T.border}`,
                          background:selected?(T.brandSoft||"rgba(16,185,129,0.10)"):T.bg,
                          transition:"all .1s",
                        }}>
                          <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                            {selected ? <CheckCircle2 size={16} color={T.brand||"#10b981"}/> : <Building2 size={16} color={T.textSm}/>}
                            <div style={{minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:700,color:selected?(T.brand||"#10b981"):T.text}}>{op.fornecedor.apelido}</div>
                              <div style={{fontSize:11,color:T.textSm,marginTop:2}}>
                                {op.cobertos}/{op.totalItens} itens cobertos
                              </div>
                            </div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                            {isMelhor&&!selected&&<Badge T={T} color={T.brand||"#10b981"} size="sm">Menor preço</Badge>}
                            {op.cobertos<op.totalItens&&<Badge T={T} color={T.warning||"#f59e0b"} size="sm">Cobertura parcial</Badge>}
                            <span style={{fontSize:16,fontWeight:800,color:selected?(T.brand||"#10b981"):T.text,fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}>
                              {fmt(op.total)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" icon={ArrowRight} onClick={handleCriar} disabled={!podeCriar}>
            Criar cotação
          </Button>
        </div>
      </div>
    </div>
  );
}

const lbl = {color:"inherit",fontSize:11,fontWeight:600,display:"block",marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"};

// ════════════════════════════════════════════════════════════════════════════
export default function Cotacoes({
  fornecedores, cotacoes, setCotacoes,
  jogosForn, cidades, campeonatos, tabelas,
  filtroCampeonato=FILTRO_TODOS,
  T,
}) {
  const [showNova, setShowNova]       = useState(false);
  const [editandoId, setEditandoId]   = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroFornId, setFiltroFornId] = useState("todos");
  const [busca, setBusca]             = useState("");

  const fornById  = useMemo(()=>Object.fromEntries(fornecedores.map(f=>[String(f.id),f])),[fornecedores]);
  const jogoById  = useMemo(()=>Object.fromEntries((jogosForn||[]).map(j=>[j.id,j])),[jogosForn]);
  const cidadeById = useMemo(()=>Object.fromEntries(cidades.map(c=>[c.id,c])),[cidades]);
  const campById  = useMemo(()=>Object.fromEntries(campeonatos.map(c=>[c.id,c])),[campeonatos]);

  const cotacoesFiltradas = useMemo(()=>
    (cotacoes||[])
      .filter(c=>filtroCampeonato===FILTRO_TODOS||c.campeonatoId===filtroCampeonato)
      .filter(c=>filtroStatus==="todos"||c.status===filtroStatus)
      .filter(c=>filtroFornId==="todos"||String(c.fornecedorId)===String(filtroFornId))
      .filter(c=>{
        if (!busca.trim()) return true;
        const j = jogoById[c.jogoId];
        const f = fornById[String(c.fornecedorId)];
        const q = busca.toLowerCase();
        return (f?.apelido||"").toLowerCase().includes(q)
          ||(j?.mandante||"").toLowerCase().includes(q)
          ||(j?.visitante||"").toLowerCase().includes(q);
      })
      .sort((a,b)=>(b.atualizadoEm||"").localeCompare(a.atualizadoEm||""))
  ,[cotacoes,filtroCampeonato,filtroStatus,filtroFornId,busca,jogoById,fornById]);

  const kpis = useMemo(()=>{
    const escopo = (cotacoes||[]).filter(c=>filtroCampeonato===FILTRO_TODOS||c.campeonatoId===filtroCampeonato);
    const aprovadas = escopo.filter(c=>c.status==="aprovada");
    const totalAprovado = aprovadas.reduce((s,c)=>s+Number(c.valorTotal||0),0);
    const totalProvisionado = escopo.filter(c=>c.status!=="cancelada").reduce((s,c)=>s+Number(c.valorTotal||0),0);
    return {
      total: escopo.length,
      aprovadas: aprovadas.length,
      totalProvisionado,
      totalAprovado,
      fornUnicos: new Set(escopo.map(c=>String(c.fornecedorId))).size,
    };
  },[cotacoes,filtroCampeonato]);

  const criarCot = cot => {
    setCotacoes(list=>[...(list||[]),cot]);
    setShowNova(false);
    setEditandoId(cot.id);
  };
  const salvarCot = cot => setCotacoes(list=>(list||[]).map(c=>c.id===cot.id?cot:c));
  const removerCot = id => {
    if (!confirm("Remover esta cotação?")) return;
    setCotacoes(list=>(list||[]).filter(c=>c.id!==id));
    if (editandoId===id) setEditandoId(null);
  };

  const cotEdit  = editandoId?(cotacoes||[]).find(c=>c.id===editandoId):null;
  const jogoEdit = cotEdit?jogoById[cotEdit.jogoId]:null;
  const fornEdit = cotEdit?fornById[String(cotEdit.fornecedorId)]:null;
  const campEdit = cotEdit?campById[cotEdit.campeonatoId]:null;
  const cidEdit  = cotEdit?cidadeById[cotEdit.cidadeId]:null;

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
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar fornecedor ou time..." style={{...iSty(T),width:280,padding:"8px 12px 8px 34px"}}/>
          </div>
          <div style={{width:1,height:24,background:T.border}}/>
          <Chip active={filtroStatus==="todos"} onClick={()=>setFiltroStatus("todos")} T={T}>Todos</Chip>
          {STATUS_COTACAO_NOVO.map(s=>(
            <Chip key={s.key} active={filtroStatus===s.key} onClick={()=>setFiltroStatus(s.key)} T={T} color={s.color}>{s.label}</Chip>
          ))}
          <div style={{width:1,height:24,background:T.border}}/>
          <select value={filtroFornId} onChange={e=>setFiltroFornId(e.target.value)} style={{...iSty(T),width:200}}>
            <option value="todos">Todos os fornecedores</option>
            {[...fornecedores].sort((a,b)=>(a.apelido||"").localeCompare(b.apelido||"")).map(f=>(
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
        {cotacoesFiltradas.length===0?(
          <div style={{padding:"56px 20px",textAlign:"center"}}>
            <div style={{width:64,height:64,borderRadius:16,background:T.surfaceAlt||T.bg,border:`1px solid ${T.border}`,color:T.textSm,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
              <FileSpreadsheet size={28} strokeWidth={2}/>
            </div>
            <h3 style={{margin:"0 0 6px",fontSize:16,fontWeight:800,color:T.text}}>Nenhuma cotação</h3>
            <p style={{margin:"0 0 16px",fontSize:13,color:T.textMd,maxWidth:420,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>
              Selecione um jogo, compare os fornecedores disponíveis e crie uma cotação com 1 clique.
            </p>
            <Button T={T} variant="primary" size="md" icon={Plus} onClick={()=>setShowNova(true)}>Nova cotação</Button>
          </div>
        ):(
          <div style={TS.wrap}>
            <table style={{...TS.table,minWidth:1000}}>
              <thead>
                <tr style={TS.thead}>
                  {["Status","Data jogo","Jogo","Cidade","Cat.","Fornecedor","Base","Adic.","Total",""].map(h=>(
                    <th key={h} style={{...TS.th,...TS.thLeft,...(["Base","Adic.","Total"].includes(h)?{textAlign:"right"}:{})}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cotacoesFiltradas.map(c=>{
                  const f   = fornById[String(c.fornecedorId)];
                  const j   = jogoById[c.jogoId];
                  const cid = cidadeById[c.cidadeId];
                  const st  = statusCotacaoInfo(c.status);
                  return (
                    <tr key={c.id} style={{...TS.tr,cursor:"pointer"}} onClick={()=>setEditandoId(c.id)}>
                      <td style={TS.td}><Badge T={T} color={st.color} size="sm">{st.label}</Badge></td>
                      <td style={{...TS.td,fontSize:11,color:T.textSm,whiteSpace:"nowrap"}}>
                        <Calendar size={11} style={{display:"inline",verticalAlign:"-1px",marginRight:4}}/>
                        {fmtData(j?.data)}
                      </td>
                      <td style={{...TS.td,fontSize:13,fontWeight:600}}>
                        {j?<>{j.mandante} <span style={{color:T.textSm,fontWeight:400}}>×</span> {j.visitante}</>:<span style={{color:T.textSm}}>(removido)</span>}
                      </td>
                      <td style={{...TS.td,fontSize:12}}>
                        {cid?<span style={{display:"inline-flex",alignItems:"center",gap:4}}><MapPin size={11} color={T.textSm}/>{cid.nome}/{cid.uf}</span>:"—"}
                      </td>
                      <td style={TS.td}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:RADIUS.pill,background:T.brandSoft||"rgba(16,185,129,0.12)",color:T.brand||"#10b981",fontSize:11,fontWeight:700}}>
                          <Tag size={10}/>{c.categoria}
                        </span>
                      </td>
                      <td style={{...TS.td,fontSize:13,fontWeight:600}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                          <Building2 size={12} color={T.textSm}/>{f?.apelido||"(removido)"}
                        </span>
                      </td>
                      <td style={{...TS.td,textAlign:"right",fontFamily:"'JetBrains Mono',ui-monospace,monospace",fontSize:12,color:T.textMd}}>{fmt(c.valorBase)}</td>
                      <td style={{...TS.td,textAlign:"right",fontFamily:"'JetBrains Mono',ui-monospace,monospace",fontSize:12,color:c.valorAdicionais>0?(T.warning||"#f59e0b"):T.textSm}}>{c.valorAdicionais>0?fmt(c.valorAdicionais):"—"}</td>
                      <td style={{...TS.td,textAlign:"right",fontFamily:"'JetBrains Mono',ui-monospace,monospace",fontSize:13,fontWeight:800,color:T.brand||"#10b981"}}>{fmt(c.valorTotal)}</td>
                      <td style={TS.td} onClick={e=>e.stopPropagation()}>
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

      {showNova&&(
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
      {cotEdit&&(
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
