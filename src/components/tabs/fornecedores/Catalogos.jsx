import { useState, useMemo } from "react";
import { iSty, RADIUS } from "../../../constants";
import { Card, PanelTitle, Button, Badge, tableStyles } from "../../ui";
import { Plus, Pencil, Trash2, MapPin, Trophy, Tag, Check, X } from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// CATÁLOGOS — gestão de Cidades e Campeonatos do Hub de Fornecedores
// ----------------------------------------------------------------------------
// Cidades alimentam as linhas das tabelas de preço. Campeonatos definem quais
// cidades-sede e categorias estão ativas em cada temporada — essa configuração
// é o que permite gerar a matriz de preço para o fornecedor preencher.
// ════════════════════════════════════════════════════════════════════════════

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

// Slug estável (para id de cidade nova)
const slugify = (s) =>
  String(s||"")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ── Modal de Cidade ─────────────────────────────────────────────────────────
function CidadeModal({ cidade, cidades, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(cidade || { id:"", nome:"", uf:"SP" });
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const handleSave = () => {
    const nome = form.nome.trim();
    if (!nome) return;
    const id = cidade?.id || `${slugify(nome)}-${form.uf.toLowerCase()}`;
    const colide = cidades.some(c => c.id === id && c.id !== cidade?.id);
    if (colide) return alert("Já existe uma cidade com esse nome e UF.");
    onSave({ id, nome, uf: form.uf });
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:420,border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <h3 style={{margin:"0 0 20px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>{cidade ? "Editar Cidade" : "Nova Cidade"}</h3>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12,marginBottom:16}}>
          <div>
            <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:4,letterSpacing:"0.04em",textTransform:"uppercase"}}>Nome</label>
            <input value={form.nome} onChange={e=>set("nome",e.target.value)} style={IS} placeholder="Ex: São Paulo"/>
          </div>
          <div>
            <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:4,letterSpacing:"0.04em",textTransform:"uppercase"}}>UF</label>
            <select value={form.uf} onChange={e=>set("uf",e.target.value)} style={IS}>
              {UFS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Campeonato ─────────────────────────────────────────────────────
function CampeonatoModal({ campeonato, cidades, campeonatos, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(() => campeonato || {
    id:"", nome:"", ano:new Date().getFullYear(), ativo:true, cidadeIds:[], categorias:[{codigo:"B1",nome:"B1"},{codigo:"B2",nome:"B2"}],
  });
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const toggleCidade = (id) => set("cidadeIds",
    form.cidadeIds.includes(id) ? form.cidadeIds.filter(x => x !== id) : [...form.cidadeIds, id]
  );

  const addCategoria = () => set("categorias", [...form.categorias, { codigo:"", nome:"" }]);
  const removeCategoria = (i) => set("categorias", form.categorias.filter((_,idx) => idx !== i));
  const updateCategoria = (i, k, v) => set("categorias", form.categorias.map((c,idx) => idx===i ? {...c,[k]:v} : c));

  const handleSave = () => {
    const nome = form.nome.trim();
    if (!nome) return alert("Informe o nome do campeonato.");
    const ano = parseInt(form.ano,10) || new Date().getFullYear();
    const id = campeonato?.id || `${slugify(nome)}-${ano}`;
    const colide = campeonatos.some(c => c.id === id && c.id !== campeonato?.id);
    if (colide) return alert("Já existe um campeonato com esse nome e ano.");
    const cats = form.categorias.filter(c => c.codigo.trim()).map(c => ({ codigo:c.codigo.trim(), nome:c.nome.trim()||c.codigo.trim() }));
    if (!cats.length) return alert("Adicione ao menos uma categoria.");
    onSave({ id, nome, ano, ativo: !!form.ativo, cidadeIds: form.cidadeIds, categorias: cats });
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:680,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <h3 style={{margin:"0 0 20px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>{campeonato ? "Editar Campeonato" : "Novo Campeonato"}</h3>

        <div style={{display:"grid",gridTemplateColumns:"3fr 1fr 1fr",gap:12,marginBottom:18}}>
          <div>
            <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:4,letterSpacing:"0.04em",textTransform:"uppercase"}}>Nome</label>
            <input value={form.nome} onChange={e=>set("nome",e.target.value)} style={IS} placeholder="Ex: Brasileirão Série A 2026"/>
          </div>
          <div>
            <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:4,letterSpacing:"0.04em",textTransform:"uppercase"}}>Ano</label>
            <input type="number" value={form.ano} onChange={e=>set("ano",e.target.value)} style={IS}/>
          </div>
          <div>
            <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:4,letterSpacing:"0.04em",textTransform:"uppercase"}}>Ativo</label>
            <select value={form.ativo?"sim":"nao"} onChange={e=>set("ativo",e.target.value==="sim")} style={IS}>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </div>
        </div>

        {/* Categorias */}
        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <label style={{color:T.textMd,fontSize:11,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase"}}>Categorias de jogo</label>
            <Button T={T} variant="ghost" size="sm" icon={Plus} onClick={addCategoria}>Adicionar</Button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {form.categorias.map((c, i) => (
              <div key={i} style={{display:"grid",gridTemplateColumns:"100px 1fr 36px",gap:8,alignItems:"center"}}>
                <input value={c.codigo} onChange={e=>updateCategoria(i,"codigo",e.target.value.toUpperCase())} style={IS} placeholder="B1"/>
                <input value={c.nome} onChange={e=>updateCategoria(i,"nome",e.target.value)} style={IS} placeholder="Descrição (opcional)"/>
                <button onClick={()=>removeCategoria(i)} title="Remover" style={{background:"transparent",border:`1px solid ${T.border}`,color:T.danger||"#ef4444",borderRadius:RADIUS.sm,height:34,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
            {!form.categorias.length && <p style={{color:T.textSm,fontSize:12,margin:0}}>Nenhuma categoria. Adicione ao menos uma.</p>}
          </div>
        </div>

        {/* Cidades-sede */}
        <div style={{marginBottom:18}}>
          <label style={{color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:8,letterSpacing:"0.04em",textTransform:"uppercase"}}>
            Cidades-sede ({form.cidadeIds.length} selecionadas)
          </label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {cidades.map(c => {
              const on = form.cidadeIds.includes(c.id);
              return (
                <button key={c.id} onClick={()=>toggleCidade(c.id)} style={{
                  display:"inline-flex",alignItems:"center",gap:6,
                  padding:"6px 12px",borderRadius:RADIUS.pill,
                  border:`1px solid ${on ? (T.brand||"#10b981") : T.border}`,
                  background: on ? (T.brandSoft || "rgba(16,185,129,0.12)") : "transparent",
                  color: on ? (T.brand||"#10b981") : T.textMd,
                  fontSize:12, fontWeight:600, cursor:"pointer",
                }}>
                  {on ? <Check size={12}/> : <MapPin size={12}/>}
                  {c.nome}/{c.uf}
                </button>
              );
            })}
            {!cidades.length && <p style={{color:T.textSm,fontSize:12,margin:0}}>Nenhuma cidade cadastrada ainda.</p>}
          </div>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
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
export default function Catalogos({ cidades, setCidades, campeonatos, setCampeonatos, T }) {
  const [cidadeEdit, setCidadeEdit] = useState(null);
  const [campEdit, setCampEdit]     = useState(null);
  const [showNovaCidade, setShowNovaCidade] = useState(false);
  const [showNovoCamp, setShowNovoCamp]     = useState(false);

  const tbl = tableStyles(T);

  // ── Cidades ──────────────────────────────────────────────────────────────
  const saveCidade = (c) => {
    setCidades(list => {
      const exists = list.some(x => x.id === c.id);
      return exists ? list.map(x => x.id===c.id ? c : x) : [...list, c];
    });
    setCidadeEdit(null); setShowNovaCidade(false);
  };
  const removeCidade = (id) => {
    if (!confirm("Remover esta cidade? Tabelas de preço e cotações que a referenciam continuam, mas não terão mais cidade vinculada.")) return;
    setCidades(list => list.filter(x => x.id !== id));
  };

  // ── Campeonatos ──────────────────────────────────────────────────────────
  const saveCamp = (c) => {
    setCampeonatos(list => {
      const exists = list.some(x => x.id === c.id);
      return exists ? list.map(x => x.id===c.id ? c : x) : [...list, c];
    });
    setCampEdit(null); setShowNovoCamp(false);
  };
  const removeCamp = (id) => {
    if (!confirm("Remover este campeonato?")) return;
    setCampeonatos(list => list.filter(x => x.id !== id));
  };
  const toggleAtivo = (c) => saveCamp({ ...c, ativo: !c.ativo });

  const cidadesByCamp = useMemo(() => {
    const map = {};
    campeonatos.forEach(c => {
      map[c.id] = (c.cidadeIds||[]).map(id => cidades.find(x => x.id===id)?.nome || id);
    });
    return map;
  }, [campeonatos, cidades]);

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:20}}>

      {/* ── Cidades ───────────────────────────────────────────────── */}
      <Card T={T} padding={0}>
        <PanelTitle T={T} title="Cidades" subtitle="Praças disponíveis para alocar em campeonatos" color={T.info||"#3b82f6"}
          right={<Button T={T} variant="primary" size="sm" icon={Plus} onClick={()=>setShowNovaCidade(true)}>Nova</Button>}/>

        <div style={{padding:"0 4px 16px"}}>
          <table style={tbl.table}>
            <thead>
              <tr>
                <th style={tbl.th}>Cidade</th>
                <th style={{...tbl.th,width:60,textAlign:"center"}}>UF</th>
                <th style={{...tbl.th,width:80,textAlign:"right"}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {cidades.map(c => (
                <tr key={c.id} style={tbl.tr}>
                  <td style={tbl.td}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:8}}>
                      <MapPin size={13} color={T.textSm} strokeWidth={2.25}/>
                      <span style={{color:T.text,fontWeight:600,fontSize:13}}>{c.nome}</span>
                    </div>
                  </td>
                  <td style={{...tbl.td,textAlign:"center"}}>
                    <Badge T={T} color={T.textMd} size="sm">{c.uf}</Badge>
                  </td>
                  <td style={{...tbl.td,textAlign:"right"}}>
                    <div style={{display:"inline-flex",gap:4}}>
                      <button onClick={()=>setCidadeEdit(c)} title="Editar" style={{background:"transparent",border:`1px solid ${T.border}`,color:T.textMd,borderRadius:RADIUS.sm,width:28,height:28,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                        <Pencil size={12}/>
                      </button>
                      <button onClick={()=>removeCidade(c.id)} title="Remover" style={{background:"transparent",border:`1px solid ${T.border}`,color:T.danger||"#ef4444",borderRadius:RADIUS.sm,width:28,height:28,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!cidades.length && (
                <tr><td colSpan={3} style={{...tbl.td,textAlign:"center",color:T.textSm,padding:"24px 8px"}}>Nenhuma cidade cadastrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Campeonatos ───────────────────────────────────────────── */}
      <Card T={T} padding={0}>
        <PanelTitle T={T} title="Campeonatos" subtitle="Temporadas ativas e suas cidades-sede + categorias" color={T.brand||"#10b981"}
          right={<Button T={T} variant="primary" size="sm" icon={Plus} onClick={()=>setShowNovoCamp(true)}>Novo</Button>}/>

        <div style={{padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:10}}>
          {campeonatos.map(c => (
            <div key={c.id} style={{
              background:T.surfaceAlt||T.bg,
              border:`1px solid ${c.ativo ? (T.brandBorder || T.border) : T.border}`,
              borderRadius:RADIUS.md,
              padding:14,
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <Trophy size={14} color={c.ativo ? (T.brand||"#10b981") : T.textSm} strokeWidth={2.25}/>
                    <span style={{color:T.text,fontSize:14,fontWeight:700}}>{c.nome}</span>
                    {c.ativo
                      ? <Badge T={T} color={T.brand||"#10b981"} size="sm">Ativo</Badge>
                      : <Badge T={T} color={T.textSm} size="sm">Inativo</Badge>}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                    {(c.categorias||[]).map(cat => (
                      <span key={cat.codigo} style={{
                        display:"inline-flex",alignItems:"center",gap:4,
                        padding:"3px 9px",borderRadius:RADIUS.pill,
                        background: T.brandSoft || "rgba(16,185,129,0.12)",
                        color: T.brand || "#10b981",
                        fontSize:11, fontWeight:700, letterSpacing:"0.02em",
                      }}>
                        <Tag size={10}/>{cat.codigo}
                      </span>
                    ))}
                  </div>
                  <p style={{margin:"10px 0 0",color:T.textSm,fontSize:12}}>
                    <MapPin size={11} style={{display:"inline",verticalAlign:"-1px",marginRight:4}}/>
                    {(cidadesByCamp[c.id]||[]).length
                      ? cidadesByCamp[c.id].join(" · ")
                      : "Nenhuma cidade-sede definida"}
                  </p>
                </div>
                <div style={{display:"inline-flex",gap:4,flexShrink:0}}>
                  <button onClick={()=>toggleAtivo(c)} title={c.ativo?"Desativar":"Ativar"} style={{background:"transparent",border:`1px solid ${T.border}`,color: c.ativo ? (T.warning||"#f59e0b") : (T.brand||"#10b981"),borderRadius:RADIUS.sm,width:30,height:30,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                    {c.ativo ? <X size={13}/> : <Check size={13}/>}
                  </button>
                  <button onClick={()=>setCampEdit(c)} title="Editar" style={{background:"transparent",border:`1px solid ${T.border}`,color:T.textMd,borderRadius:RADIUS.sm,width:30,height:30,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                    <Pencil size={13}/>
                  </button>
                  <button onClick={()=>removeCamp(c.id)} title="Remover" style={{background:"transparent",border:`1px solid ${T.border}`,color:T.danger||"#ef4444",borderRadius:RADIUS.sm,width:30,height:30,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!campeonatos.length && (
            <p style={{color:T.textSm,fontSize:13,textAlign:"center",padding:"32px 0",margin:0}}>Nenhum campeonato cadastrado</p>
          )}
        </div>
      </Card>

      {(showNovaCidade || cidadeEdit) && (
        <CidadeModal
          cidade={cidadeEdit}
          cidades={cidades}
          onSave={saveCidade}
          onClose={()=>{setCidadeEdit(null);setShowNovaCidade(false);}}
          T={T}
        />
      )}
      {(showNovoCamp || campEdit) && (
        <CampeonatoModal
          campeonato={campEdit}
          cidades={cidades}
          campeonatos={campeonatos}
          onSave={saveCamp}
          onClose={()=>{setCampEdit(null);setShowNovoCamp(false);}}
          T={T}
        />
      )}
    </div>
  );
}
