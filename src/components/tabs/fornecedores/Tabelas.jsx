import { useState, useMemo } from "react";
import { iSty, RADIUS } from "../../../constants";
import { Card, Button, Badge, Chip } from "../../ui";
import {
  STATUS_NEGOCIACAO, statusNegociacaoInfo,
  criarNegociacao, contarCelulasPreenchidas,
  migrarTabelaLegada,
} from "../../../data/catalogos";
import { Plus, Search, Building2, Trash2, Check, MapPin } from "lucide-react";
import TabelaPrecoEditor from "./TabelaPrecoEditor";

const lbl = { fontSize:11, fontWeight:600, display:"block", marginBottom:5, letterSpacing:"0.04em", textTransform:"uppercase" };

// ── Modal: nova tabela de fornecedor ────────────────────────────────────────
function NovaTabela({ fornecedores, cidades, tabelas, onCreate, onClose, T }) {
  const IS = iSty(T);
  const [fornecedorId, setFornecedorId] = useState("");
  const [cidadeIds, setCidadeIds] = useState([]);
  const [categorias, setCategorias] = useState([
    {codigo:"B1",nome:"B1"},{codigo:"B2",nome:"B2"},{codigo:"B3",nome:"B3"},
  ]);
  const [novaCatCod, setNovaCatCod] = useState("");

  const fornSemTabela = useMemo(() => {
    const comTabela = new Set(tabelas.map(t=>String(t.fornecedorId)));
    return [...fornecedores].filter(f=>!comTabela.has(String(f.id))).sort((a,b)=>(a.apelido||"").localeCompare(b.apelido||""));
  },[fornecedores,tabelas]);

  const toggleCidade = id => setCidadeIds(prev => prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);

  const addCategoria = () => {
    const cod = novaCatCod.trim().toUpperCase();
    if (!cod || categorias.some(c=>c.codigo===cod)) return;
    setCategorias(c=>[...c,{codigo:cod,nome:cod}]);
    setNovaCatCod("");
  };
  const removeCategoria = i => setCategorias(c=>c.filter((_,idx)=>idx!==i));

  const handleCreate = () => {
    if (!fornecedorId) return;
    if (!categorias.length) return alert("Adicione ao menos uma categoria.");
    const nova = criarNegociacao({ fornecedorId:Number(fornecedorId), cidadeIds, categorias });
    onCreate(nova);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:130,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:680,border:`1px solid ${T.border}`,boxShadow:T.shadow,maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 18px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>Nova tabela de preços</h3>

        <div style={{marginBottom:16}}>
          <label style={lbl}>Fornecedor</label>
          <select value={fornecedorId} onChange={e=>setFornecedorId(e.target.value)} style={IS}>
            <option value="">— Selecione —</option>
            {fornSemTabela.map(f=><option key={f.id} value={f.id}>{f.apelido}{f.funcao?` · ${f.funcao}`:""}</option>)}
          </select>
          {!fornSemTabela.length && <p style={{fontSize:11,color:T.textSm,margin:"6px 0 0"}}>Todos os fornecedores já têm tabela.</p>}
        </div>

        <div style={{marginBottom:16}}>
          <label style={{...lbl,display:"block",marginBottom:6}}>
            Categorias de jogo <span style={{fontSize:10,fontWeight:400,color:T.textSm}}>({categorias.length})</span>
          </label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
            {categorias.map((c,i)=>(
              <span key={i} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:RADIUS.pill,background:T.brandSoft||"rgba(16,185,129,0.12)",border:`1px solid ${T.brandBorder||T.border}`,color:T.brand||"#10b981",fontSize:12,fontWeight:700}}>
                {c.codigo}
                <button onClick={()=>removeCategoria(i)} style={{background:"none",border:"none",cursor:"pointer",color:"inherit",padding:0,lineHeight:1,display:"flex"}}>×</button>
              </span>
            ))}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input value={novaCatCod} onChange={e=>setNovaCatCod(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCategoria()} placeholder="Ex: B4, B3+" style={{...IS,width:120}} />
            <Button T={T} variant="ghost" size="sm" icon={Plus} onClick={addCategoria}>Adicionar</Button>
          </div>
        </div>

        <div style={{marginBottom:20}}>
          <label style={{...lbl,display:"block",marginBottom:8}}>
            Cidades cobertas <span style={{fontSize:10,fontWeight:400,color:T.textSm}}>({cidadeIds.length} selecionadas)</span>
          </label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {cidades.map(c=>{
              const on=cidadeIds.includes(c.id);
              return (
                <button key={c.id} onClick={()=>toggleCidade(c.id)} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:RADIUS.pill,cursor:"pointer",border:`1px solid ${on?"#3b82f6":T.border}`,background:on?"rgba(59,130,246,0.12)":"transparent",color:on?"#3b82f6":T.textMd,fontSize:12,fontWeight:600}}>
                  {on?<Check size={12}/>:<MapPin size={12}/>}{c.nome}/{c.uf}
                </button>
              );
            })}
            {!cidades.length && <p style={{color:T.textSm,fontSize:12,margin:0}}>Nenhuma cidade cadastrada.</p>}
          </div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={handleCreate} disabled={!fornecedorId||!categorias.length}>Criar tabela</Button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function Tabelas({
  fornecedores, cidades, campeonatos,
  tabelas, setTabelas,
  itensMaster = [],
  filtroCampeonato = "todos",
  T,
}) {
  const [showNova, setShowNova]       = useState(false);
  const [selectedId, setSelectedId]   = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca]             = useState("");

  const fornById = useMemo(()=>Object.fromEntries(fornecedores.map(f=>[String(f.id),f])),[fornecedores]);

  const tabelasMigradas = useMemo(()=>tabelas.map(t=>migrarTabelaLegada(t)),[tabelas]);

  const tabelasFiltradas = useMemo(()=>{
    return tabelasMigradas
      .filter(t=>filtroStatus==="todos"||t.status===filtroStatus)
      .filter(t=>{
        if (!busca.trim()) return true;
        const f=fornById[String(t.fornecedorId)];
        return (f?.apelido||"").toLowerCase().includes(busca.toLowerCase());
      })
      .sort((a,b)=>(b.atualizadoEm||"").localeCompare(a.atualizadoEm||""));
  },[tabelasMigradas,filtroStatus,busca,fornById]);

  // ── CRUD ────────────────────────────────────────────────────────────────
  const criarNeg = nova => {
    setTabelas(list=>[...list,nova]);
    setShowNova(false);
    setSelectedId(nova.id);
  };

  const salvarNeg = atualizada => {
    setTabelas(list=>list.map(t=>{
      if (t.id===atualizada.id) return atualizada;
      if (atualizada.status==="aprovada"&&t.status==="aprovada"&&String(t.fornecedorId)===String(atualizada.fornecedorId))
        return {...t,status:"arquivada",atualizadoEm:new Date().toISOString()};
      return t;
    }));
  };

  const removerNeg = id => {
    if (!confirm("Remover esta negociação permanentemente?")) return;
    setTabelas(list=>list.filter(t=>t.id!==id));
    if (selectedId===id) setSelectedId(null);
  };

  const negSelecionada = selectedId ? tabelasMigradas.find(t=>t.id===selectedId)||null : null;

  return (
    <div style={{display:"grid",gridTemplateColumns:"280px 1fr",border:`1px solid ${T.border}`,borderRadius:RADIUS.lg,overflow:"hidden",minHeight:"72vh",background:T.surface||T.card}}>

      {/* ── Left panel ──────────────────────────────────────────────── */}
      <div style={{borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Header */}
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <span style={{fontSize:13,fontWeight:800,color:T.text,letterSpacing:"-0.01em"}}>Negociações</span>
          <Button T={T} variant="primary" size="sm" icon={Plus} onClick={()=>setShowNova(true)}>Nova</Button>
        </div>

        {/* Search */}
        <div style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          <div style={{position:"relative"}}>
            <Search size={13} color={T.textSm} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar fornecedor..." style={{...iSty(T),width:"100%",padding:"7px 10px 7px 30px",fontSize:12}}/>
          </div>
        </div>

        {/* Status chips */}
        <div style={{padding:"8px 12px",borderBottom:`1px solid ${T.border}`,display:"flex",flexWrap:"wrap",gap:5,flexShrink:0}}>
          <Chip active={filtroStatus==="todos"} onClick={()=>setFiltroStatus("todos")} T={T} size="xs">Todos</Chip>
          {STATUS_NEGOCIACAO.filter(s=>s.key!=="arquivada").map(s=>(
            <Chip key={s.key} active={filtroStatus===s.key} onClick={()=>setFiltroStatus(s.key)} T={T} color={s.color} size="xs">{s.label}</Chip>
          ))}
        </div>

        {/* List */}
        <div style={{flex:1,overflowY:"auto"}}>
          {tabelasFiltradas.length===0 && (
            <div style={{padding:"24px 16px",textAlign:"center",color:T.textSm,fontSize:12}}>
              {tabelas.length===0?"Nenhuma tabela ainda. Clique em Nova.":"Nenhum resultado."}
            </div>
          )}
          {tabelasFiltradas.map(t=>{
            const f=fornById[String(t.fornecedorId)];
            const st=statusNegociacaoInfo(t.status);
            const isSelected=selectedId===t.id;
            const totalCels=(t.cidadeIds?.length||0)*(t.categorias?.length||0)*itensMaster.length;
            const pre=contarCelulasPreenchidas({valores:(t.rodadas?.[t.rodadas.length-1]||{}).valores||{}});
            const pct=totalCels?Math.round((pre/totalCels)*100):0;
            return (
              <div
                key={t.id}
                onClick={()=>setSelectedId(isSelected?null:t.id)}
                style={{
                  padding:"12px 14px",
                  cursor:"pointer",
                  borderBottom:`1px solid ${T.border}`,
                  background:isSelected?(T.brandSoft||"rgba(16,185,129,0.07)"):"transparent",
                  borderLeft:`3px solid ${isSelected?(T.brand||"#10b981"):"transparent"}`,
                  transition:"all .1s",
                }}
              >
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6}}>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <Building2 size={12} color={T.textSm}/>
                      <span style={{fontSize:13,fontWeight:700,color:isSelected?(T.brand||"#10b981"):T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {f?.apelido||"(removido)"}
                      </span>
                    </div>
                    {f?.funcao && <div style={{fontSize:11,color:T.textSm,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.funcao}</div>}
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <Badge T={T} color={st.color} size="xs">{st.label}</Badge>
                      {totalCels>0 && (
                        <span style={{fontSize:10,color:pct===100?(T.brand||"#10b981"):T.textSm,fontWeight:700}}>
                          {pct}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{fontSize:10,color:T.textSm,flexShrink:0,textAlign:"right",marginTop:2}}>
                    {t.atualizadoEm?new Date(t.atualizadoEm).toLocaleDateString("pt-BR"):"—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────── */}
      <div style={{overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {negSelecionada ? (
          <TabelaPrecoEditor
            key={negSelecionada.id}
            tabela={negSelecionada}
            fornecedor={fornById[String(negSelecionada.fornecedorId)]}
            itensMaster={itensMaster}
            cidades={cidades}
            onSave={salvarNeg}
            onRemove={removerNeg}
            T={T}
          />
        ) : (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,gap:14,textAlign:"center",color:T.textSm}}>
            <div style={{width:56,height:56,borderRadius:RADIUS.lg,background:T.surfaceAlt||T.bg,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Building2 size={24} strokeWidth={1.75}/>
            </div>
            <div>
              <p style={{margin:"0 0 4px",fontSize:14,fontWeight:700,color:T.text}}>Selecione um fornecedor</p>
              <p style={{margin:0,fontSize:12}}>Escolha um fornecedor na lista para ver ou editar sua tabela de preços.</p>
            </div>
          </div>
        )}
      </div>

      {showNova && (
        <NovaTabela
          fornecedores={fornecedores}
          cidades={cidades}
          tabelas={tabelasMigradas}
          onCreate={criarNeg}
          onClose={()=>setShowNova(false)}
          T={T}
        />
      )}
    </div>
  );
}
