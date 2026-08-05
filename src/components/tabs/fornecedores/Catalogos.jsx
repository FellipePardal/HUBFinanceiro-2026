import { useState, useMemo } from "react";
import { iSty, RADIUS } from "../../../constants";
import { Card, PanelTitle, Button, Badge, tableStyles } from "../../ui";
import {
  UNIDADES_MEDIDA, unidadeLabel, novoItemMaster,
  CATEGORIAS_ITEM, categoriaItemLabel,
} from "../../../data/catalogos";
import {
  Plus, Pencil, Trash2, MapPin, Trophy, Tag, Check, X,
  Package, Camera, Users, ChevronDown, ChevronRight,
} from "lucide-react";

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const slugify = s =>
  String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

const CAT_META = {
  periferico: { label:"Periféricos",         color:"#3b82f6", icon:Camera },
  equipe:     { label:"Equipe Operacional",  color:"#f59e0b", icon:Users  },
};

// ── Seção colapsável reutilizável ────────────────────────────────────────────
function CollapsibleSection({ title, subtitle, color, icon:Icon, count, badge, right, children, defaultOpen=true, T }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background:T.surface||T.card,
      border:`1px solid ${T.border}`,
      borderRadius:RADIUS.lg,
      overflow:"hidden",
    }}>
      <div
        onClick={()=>setOpen(o=>!o)}
        style={{
          display:"flex",alignItems:"center",gap:10,
          padding:"12px 16px",cursor:"pointer",
          borderBottom: open ? `1px solid ${T.border}` : "none",
          userSelect:"none",
        }}
      >
        {Icon && (
          <div style={{
            width:30,height:30,borderRadius:RADIUS.sm,flexShrink:0,
            background:`${color}18`,color,
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>
            <Icon size={15} strokeWidth={2.25}/>
          </div>
        )}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:T.text,fontSize:13,fontWeight:700}}>{title}</span>
            {count !== undefined && (
              <span style={{
                background:`${color}18`,color,
                fontSize:10,fontWeight:800,padding:"1px 7px",
                borderRadius:RADIUS.pill,
              }}>{count}</span>
            )}
            {badge}
          </div>
          {subtitle && <p style={{margin:0,fontSize:11,color:T.textSm,marginTop:2}}>{subtitle}</p>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {right && <div onClick={e=>e.stopPropagation()}>{right}</div>}
          {open
            ? <ChevronDown size={15} color={T.textSm}/>
            : <ChevronRight size={15} color={T.textSm}/>}
        </div>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

// ── Modal de Cidade ──────────────────────────────────────────────────────────
function CidadeModal({ cidade, cidades, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(cidade||{id:"",nome:"",uf:"SP"});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleSave = () => {
    const nome = form.nome.trim();
    if (!nome) return;
    const id = cidade?.id||`${slugify(nome)}-${form.uf.toLowerCase()}`;
    if (cidades.some(c=>c.id===id&&c.id!==cidade?.id)) return alert("Já existe uma cidade com esse nome e UF.");
    onSave({id,nome,uf:form.uf});
  };
  return (
    <div style={overlay}>
      <div style={{...modal(T),maxWidth:420}}>
        <h3 style={mTitle(T)}>{cidade?"Editar Cidade":"Nova Cidade"}</h3>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12,marginBottom:16}}>
          <div>
            <label style={lbl}>Nome</label>
            <input value={form.nome} onChange={e=>set("nome",e.target.value)} style={IS} placeholder="Ex: São Paulo"/>
          </div>
          <div>
            <label style={lbl}>UF</label>
            <select value={form.uf} onChange={e=>set("uf",e.target.value)} style={IS}>
              {UFS.map(u=><option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div style={mFooter}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary"   size="md" onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Item Master ─────────────────────────────────────────────────────
function ItemMasterModal({ item, itensMaster, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(item||{id:"",nome:"",unidade:"jogo",categoria:"periferico"});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleSave = () => {
    const nome = form.nome.trim();
    if (!nome) return alert("Informe o nome do serviço.");
    if (itensMaster.some(i=>i.nome.toLowerCase()===nome.toLowerCase()&&i.id!==form.id))
      return alert("Já existe um item com esse nome.");
    const id = item?.id||novoItemMaster(nome).id;
    onSave({id,nome,unidade:form.unidade,categoria:form.categoria});
  };
  return (
    <div style={overlay}>
      <div style={{...modal(T),maxWidth:420}}>
        <h3 style={mTitle(T)}>{item?"Editar serviço":"Novo serviço"}</h3>
        <div style={{marginBottom:12}}>
          <label style={lbl}>Categoria</label>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            {CATEGORIAS_ITEM.map(cat=>{
              const on = form.categoria===cat.key;
              const Meta = CAT_META[cat.key];
              return (
                <button key={cat.key} onClick={()=>set("categoria",cat.key)} style={{
                  flex:1,padding:"8px 12px",borderRadius:RADIUS.md,cursor:"pointer",
                  border:`1px solid ${on?cat.color:T.border}`,
                  background:on?`${cat.color}18`:"transparent",
                  color:on?cat.color:T.textMd,
                  fontSize:12,fontWeight:700,
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                }}>
                  <Meta.icon size={13}/>{cat.label}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={lbl}>Nome do serviço</label>
          <input value={form.nome} onChange={e=>set("nome",e.target.value)} style={IS} placeholder="Ex: Drone, Grua, UM B1..."/>
        </div>
        <div style={{marginBottom:16}}>
          <label style={lbl}>Unidade</label>
          <select value={form.unidade} onChange={e=>set("unidade",e.target.value)} style={IS}>
            {UNIDADES_MEDIDA.map(u=><option key={u.key} value={u.key}>{u.label}</option>)}
          </select>
        </div>
        <div style={mFooter}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary"   size="md" onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Campeonato ──────────────────────────────────────────────────────
function CampeonatoModal({ campeonato, cidades, campeonatos, itensMaster, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(()=>campeonato||{
    id:"", nome:"", ano:new Date().getFullYear(), ativo:true,
    cidadeIds:[], categorias:[{codigo:"B1",nome:"B1"},{codigo:"B2",nome:"B2"}],
    itens:[],
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const toggleCidade = id => set("cidadeIds",
    form.cidadeIds.includes(id)?form.cidadeIds.filter(x=>x!==id):[...form.cidadeIds,id]
  );

  const addCategoria    = () => set("categorias",[...form.categorias,{codigo:"",nome:""}]);
  const removeCategoria = i  => set("categorias",form.categorias.filter((_,idx)=>idx!==i));
  const updateCategoria = (i,k,v) => set("categorias",form.categorias.map((c,idx)=>idx===i?{...c,[k]:v}:c));

  const itensSelecionadosIds = useMemo(()=>new Set((form.itens||[]).map(i=>i.id)),[form.itens]);
  const toggleItem = masterItem => {
    const on = itensSelecionadosIds.has(masterItem.id);
    set("itens", on
      ? (form.itens||[]).filter(i=>i.id!==masterItem.id)
      : [...(form.itens||[]), {id:masterItem.id,nome:masterItem.nome,unidade:masterItem.unidade,categoria:masterItem.categoria||"equipe",ativo:true}]
    );
  };

  const handleSave = () => {
    const nome = form.nome.trim();
    if (!nome) return alert("Informe o nome do campeonato.");
    const ano = parseInt(form.ano,10)||new Date().getFullYear();
    const id = campeonato?.id||`${slugify(nome)}-${ano}`;
    if (campeonatos.some(c=>c.id===id&&c.id!==campeonato?.id)) return alert("Já existe um campeonato com esse nome e ano.");
    const cats = form.categorias.filter(c=>c.codigo.trim()).map(c=>({codigo:c.codigo.trim(),nome:c.nome.trim()||c.codigo.trim()}));
    if (!cats.length) return alert("Adicione ao menos uma categoria.");
    onSave({id,nome,ano,ativo:!!form.ativo,origemHub:!!campeonato?.origemHub,cidadeIds:form.cidadeIds,categorias:cats,itens:form.itens||[]});
  };

  // Group master items by category
  const itensPorCategoria = useMemo(()=>{
    const map = {};
    CATEGORIAS_ITEM.forEach(c=>{ map[c.key] = []; });
    itensMaster.forEach(it=>{ const k = it.categoria||"equipe"; if (map[k]) map[k].push(it); else map[k] = [it]; });
    return map;
  },[itensMaster]);

  return (
    <div style={overlay}>
      <div style={{...modal(T),maxWidth:720,maxHeight:"92vh",overflowY:"auto"}}>
        <h3 style={mTitle(T)}>{campeonato?"Editar Campeonato":"Novo Campeonato"}</h3>

        {/* Nome / Ano / Ativo — nome/ano vêm do campeonato do HUB quando sincronizado */}
        <div style={{display:"grid",gridTemplateColumns:"3fr 1fr 1fr",gap:12,marginBottom:18}}>
          <div>
            <label style={lbl}>Nome {campeonato?.origemHub&&<span style={{fontWeight:400,textTransform:"none"}}>(do HUB)</span>}</label>
            <input value={form.nome} onChange={e=>set("nome",e.target.value)} style={{...IS,opacity:campeonato?.origemHub?0.6:1}} placeholder="Ex: Brasileirão Série A 2026" disabled={!!campeonato?.origemHub}/>
          </div>
          <div>
            <label style={lbl}>Ano</label>
            <input type="number" value={form.ano} onChange={e=>set("ano",e.target.value)} style={{...IS,opacity:campeonato?.origemHub?0.6:1}} disabled={!!campeonato?.origemHub}/>
          </div>
          <div>
            <label style={lbl}>Ativo</label>
            <select value={form.ativo?"sim":"nao"} onChange={e=>set("ativo",e.target.value==="sim")} style={IS}>
              <option value="sim">Sim</option><option value="nao">Não</option>
            </select>
          </div>
        </div>

        {/* Categorias de jogo */}
        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <label style={lbl}>Categorias de jogo</label>
            <Button T={T} variant="ghost" size="sm" icon={Plus} onClick={addCategoria}>Adicionar</Button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {form.categorias.map((c,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"100px 1fr 36px",gap:8,alignItems:"center"}}>
                <input value={c.codigo} onChange={e=>updateCategoria(i,"codigo",e.target.value.toUpperCase())} style={IS} placeholder="B1"/>
                <input value={c.nome} onChange={e=>updateCategoria(i,"nome",e.target.value)} style={IS} placeholder="Descrição (opcional)"/>
                <button onClick={()=>removeCategoria(i)} style={btnDanger(T)}><Trash2 size={14}/></button>
              </div>
            ))}
            {!form.categorias.length&&<p style={{color:T.textSm,fontSize:12,margin:0}}>Nenhuma categoria. Adicione ao menos uma.</p>}
          </div>
        </div>

        {/* Itens de serviço — agrupados por categoria */}
        <div style={{marginBottom:18}}>
          <label style={{...lbl,display:"block",marginBottom:6}}>
            Itens de serviço <span style={{fontSize:10,fontWeight:400,color:T.textSm}}>({itensSelecionadosIds.size} selecionados)</span>
          </label>
          {itensMaster.length===0?(
            <p style={{fontSize:12,color:T.textSm,padding:"10px 14px",background:T.surfaceAlt||T.bg,border:`1px dashed ${T.border}`,borderRadius:RADIUS.md,margin:0}}>
              Nenhum serviço no catálogo. Adicione em Catálogos &gt; Serviços.
            </p>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {CATEGORIAS_ITEM.map(cat=>{
                const items = itensPorCategoria[cat.key]||[];
                if (!items.length) return null;
                const Meta = CAT_META[cat.key];
                const selCount = items.filter(it=>itensSelecionadosIds.has(it.id)).length;
                return (
                  <div key={cat.key} style={{border:`1px solid ${T.border}`,borderRadius:RADIUS.md,overflow:"hidden"}}>
                    <div style={{
                      padding:"8px 12px",
                      background:T.surfaceAlt||T.bg,
                      display:"flex",alignItems:"center",gap:8,
                    }}>
                      <Meta.icon size={13} color={cat.color}/>
                      <span style={{fontSize:12,fontWeight:700,color:cat.color}}>{cat.label}</span>
                      {selCount>0&&(
                        <span style={{marginLeft:"auto",fontSize:10,color:cat.color,fontWeight:700}}>
                          {selCount}/{items.length} selecionados
                        </span>
                      )}
                    </div>
                    <div style={{padding:"10px 12px",display:"flex",flexWrap:"wrap",gap:6}}>
                      {items.map(it=>{
                        const on = itensSelecionadosIds.has(it.id);
                        return (
                          <button key={it.id} onClick={()=>toggleItem(it)} style={{
                            display:"inline-flex",alignItems:"center",gap:6,
                            padding:"6px 13px",borderRadius:RADIUS.pill,cursor:"pointer",
                            border:`1px solid ${on?cat.color:T.border}`,
                            background:on?`${cat.color}18`:"transparent",
                            color:on?cat.color:T.textMd,
                            fontSize:12,fontWeight:600,transition:"all .1s",
                          }}>
                            {on?<Check size={12}/>:<Meta.icon size={12}/>}
                            {it.nome}
                            <span style={{fontSize:10,color:on?cat.color:T.textSm,fontWeight:400}}>
                              {unidadeLabel(it.unidade)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cidades-sede */}
        <div style={{marginBottom:18}}>
          <label style={{...lbl,display:"block",marginBottom:8}}>
            Cidades-sede <span style={{fontSize:10,fontWeight:400,color:T.textSm}}>({form.cidadeIds.length} selecionadas)</span>
          </label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {cidades.map(c=>{
              const on = form.cidadeIds.includes(c.id);
              return (
                <button key={c.id} onClick={()=>toggleCidade(c.id)} style={{
                  display:"inline-flex",alignItems:"center",gap:6,
                  padding:"6px 12px",borderRadius:RADIUS.pill,cursor:"pointer",
                  border:`1px solid ${on?(T.brand||"#10b981"):T.border}`,
                  background:on?(T.brandSoft||"rgba(16,185,129,0.12)"):"transparent",
                  color:on?(T.brand||"#10b981"):T.textMd,
                  fontSize:12,fontWeight:600,
                }}>
                  {on?<Check size={12}/>:<MapPin size={12}/>}
                  {c.nome}/{c.uf}
                </button>
              );
            })}
            {!cidades.length&&<p style={{color:T.textSm,fontSize:12,margin:0}}>Nenhuma cidade cadastrada ainda.</p>}
          </div>
        </div>

        <div style={mFooter}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary"   size="md" onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Estilos compartilhados ───────────────────────────────────────────────────
const overlay   = {position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16};
const modal     = T => ({background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",border:`1px solid ${T.border}`,boxShadow:T.shadow});
const mTitle    = T => ({margin:"0 0 20px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"});
const mFooter   = {display:"flex",gap:8,justifyContent:"flex-end"};
const lbl       = {fontSize:11,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase"};
const btnDanger = T => ({background:"transparent",border:`1px solid ${T.border}`,color:T.danger||"#ef4444",borderRadius:RADIUS.sm,height:34,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"});
const btnIcon   = T => ({background:"transparent",border:`1px solid ${T.border}`,color:T.textMd,borderRadius:RADIUS.sm,width:30,height:30,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"});

// ── Tabela de itens (reutilizada por cada seção de serviços) ─────────────────
function TabelaItens({ items, onEdit, onRemove, color, tbl, T }) {
  if (!items.length) return (
    <p style={{padding:"16px 16px",color:T.textSm,fontSize:12,margin:0}}>Nenhum item nesta categoria.</p>
  );
  return (
    <table style={{...tbl.table,margin:0}}>
      <thead>
        <tr>
          <th style={tbl.th}>Serviço</th>
          <th style={{...tbl.th,width:140}}>Unidade</th>
          <th style={{...tbl.th,width:80,textAlign:"right"}}>Ações</th>
        </tr>
      </thead>
      <tbody>
        {items.map(it=>(
          <tr key={it.id} style={tbl.tr}>
            <td style={tbl.td}>
              <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
                <Package size={13} color={color}/>
                <span style={{color:T.text,fontWeight:600,fontSize:13}}>{it.nome}</span>
              </span>
            </td>
            <td style={{...tbl.td,fontSize:12,color:T.textMd}}>{unidadeLabel(it.unidade)}</td>
            <td style={{...tbl.td,textAlign:"right"}}>
              <div style={{display:"inline-flex",gap:4}}>
                <button onClick={()=>onEdit(it)} style={btnIcon(T)}><Pencil size={12}/></button>
                <button onClick={()=>onRemove(it.id)} style={{...btnIcon(T),color:T.danger||"#ef4444"}}><Trash2 size={12}/></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function Catalogos({
  cidades, setCidades,
  campeonatos, setCampeonatos,
  itensMaster=[], setItensMaster=()=>{},
  filtroCampeonato="todos",
  T,
}) {
  const [cidadeEdit,     setCidadeEdit]     = useState(null);
  const [campEdit,       setCampEdit]       = useState(null);
  const [itemEdit,       setItemEdit]       = useState(null);
  const [showNovaCidade, setShowNovaCidade] = useState(false);
  const [showNovoCamp,   setShowNovoCamp]   = useState(false);
  const [showNovoItem,   setShowNovoItem]   = useState(false);
  const [expandido,      setExpandido]      = useState(null);

  const tbl = tableStyles(T);

  const campSelecionado    = filtroCampeonato!=="todos" ? campeonatos.find(c=>c.id===filtroCampeonato) : null;
  const cidadesVisiveis    = campSelecionado ? (campSelecionado.cidadeIds||[]).map(id=>cidades.find(c=>c.id===id)).filter(Boolean) : cidades;
  const campeonatosVisiveis = campSelecionado ? [campSelecionado] : campeonatos;

  // Items por categoria
  const itensPorCategoria = useMemo(()=>{
    const map = { periferico:[], equipe:[] };
    itensMaster.forEach(it=>{ const k=it.categoria||"equipe"; if(map[k]) map[k].push(it); else map[k]=[it]; });
    return map;
  },[itensMaster]);

  // ── Cidades ─────────────────────────────────────────────────────────────
  const saveCidade = c => {
    setCidades(list=>list.some(x=>x.id===c.id)?list.map(x=>x.id===c.id?c:x):[...list,c]);
    setCidadeEdit(null); setShowNovaCidade(false);
  };
  const removeCidade = id => {
    if (!confirm("Remover esta cidade?")) return;
    setCidades(list=>list.filter(x=>x.id!==id));
  };

  // ── Itens master ─────────────────────────────────────────────────────────
  const saveItem = it => {
    setItensMaster(list=>list.some(x=>x.id===it.id)?list.map(x=>x.id===it.id?it:x):[...list,it]);
    setItemEdit(null); setShowNovoItem(false);
  };
  const removeItem = id => {
    if (!confirm("Remover este serviço? Campeonatos que já o incluem não serão afetados.")) return;
    setItensMaster(list=>list.filter(x=>x.id!==id));
  };

  // ── Campeonatos ──────────────────────────────────────────────────────────
  const saveCamp = c => {
    setCampeonatos(list=>list.some(x=>x.id===c.id)?list.map(x=>x.id===c.id?c:x):[...list,c]);
    setCampEdit(null); setShowNovoCamp(false);
  };
  const removeCamp = id => {
    if (!confirm("Remover este campeonato?")) return;
    setCampeonatos(list=>list.filter(x=>x.id!==id));
  };
  const toggleAtivo = c => saveCamp({...c,ativo:!c.ativo});

  const cidadesByCamp = useMemo(()=>{
    const map = {};
    campeonatos.forEach(c=>{ map[c.id]=(c.cidadeIds||[]).map(id=>cidades.find(x=>x.id===id)?.nome||id); });
    return map;
  },[campeonatos,cidades]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:20,alignItems:"start"}}>

        {/* ── Coluna esquerda ─────────────────────────────────────────── */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>

          {/* Cidades */}
          <CollapsibleSection
            T={T} color={T.info||"#3b82f6"} icon={MapPin}
            title={campSelecionado?`Cidades · ${campSelecionado.nome}`:"Cidades"}
            subtitle={campSelecionado
              ?`${cidadesVisiveis.length} praça(s) — edite o campeonato para alterar`
              :"Praças disponíveis para os campeonatos"}
            count={cidadesVisiveis.length}
            right={<Button T={T} variant="primary" size="sm" icon={Plus} onClick={()=>setShowNovaCidade(true)}>Nova</Button>}
          >
            <div style={{padding:"0 4px 12px"}}>
              <table style={tbl.table}>
                <thead>
                  <tr>
                    <th style={tbl.th}>Cidade</th>
                    <th style={{...tbl.th,width:60,textAlign:"center"}}>UF</th>
                    <th style={{...tbl.th,width:80,textAlign:"right"}}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cidadesVisiveis.map(c=>(
                    <tr key={c.id} style={tbl.tr}>
                      <td style={tbl.td}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
                          <MapPin size={13} color={T.textSm}/>
                          <span style={{color:T.text,fontWeight:600,fontSize:13}}>{c.nome}</span>
                        </span>
                      </td>
                      <td style={{...tbl.td,textAlign:"center"}}>
                        <Badge T={T} color={T.textMd} size="sm">{c.uf}</Badge>
                      </td>
                      <td style={{...tbl.td,textAlign:"right"}}>
                        <div style={{display:"inline-flex",gap:4}}>
                          <button onClick={()=>setCidadeEdit(c)} style={btnIcon(T)}><Pencil size={12}/></button>
                          <button onClick={()=>removeCidade(c.id)} style={{...btnIcon(T),color:T.danger||"#ef4444"}}><Trash2 size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!cidadesVisiveis.length&&(
                    <tr><td colSpan={3} style={{...tbl.td,textAlign:"center",color:T.textSm,padding:"20px 8px"}}>
                      {campSelecionado?"Nenhuma cidade-sede. Edite o campeonato.":"Nenhuma cidade cadastrada"}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>

          {/* Periféricos */}
          <CollapsibleSection
            T={T} color="#3b82f6" icon={Camera}
            title="Periféricos"
            subtitle="Equipamentos de câmera adicionais"
            count={itensPorCategoria.periferico.length}
            right={
              <Button T={T} variant="primary" size="sm" icon={Plus} onClick={()=>{
                setItemEdit({id:"",nome:"",unidade:"jogo",categoria:"periferico"});
                setShowNovoItem(true);
              }}>Novo</Button>
            }
          >
            <TabelaItens
              items={itensPorCategoria.periferico}
              color="#3b82f6"
              onEdit={it=>{setItemEdit(it);setShowNovoItem(true);}}
              onRemove={removeItem}
              tbl={tbl} T={T}
            />
          </CollapsibleSection>

          {/* Equipe Operacional */}
          <CollapsibleSection
            T={T} color="#f59e0b" icon={Users}
            title="Equipe Operacional"
            subtitle="Unidades móveis, equipes e profissionais"
            count={itensPorCategoria.equipe.length}
            right={
              <Button T={T} variant="primary" size="sm" icon={Plus} onClick={()=>{
                setItemEdit({id:"",nome:"",unidade:"jogo",categoria:"equipe"});
                setShowNovoItem(true);
              }}>Novo</Button>
            }
          >
            <TabelaItens
              items={itensPorCategoria.equipe}
              color="#f59e0b"
              onEdit={it=>{setItemEdit(it);setShowNovoItem(true);}}
              onRemove={removeItem}
              tbl={tbl} T={T}
            />
          </CollapsibleSection>
        </div>

        {/* ── Campeonatos ─────────────────────────────────────────────── */}
        <CollapsibleSection
          T={T} color={T.brand||"#10b981"} icon={Trophy}
          title={campSelecionado?"Campeonato selecionado":"Campeonatos"}
          subtitle={campSelecionado
            ?"Detalhes da temporada filtrada no header"
            :"Puxados dos campeonatos do HUB — configure cidades-sede, categorias e itens"}
          count={campeonatosVisiveis.length}
        >
          <div style={{padding:"12px 16px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {campeonatosVisiveis.map(c=>{
              const exp = expandido===c.id;
              // Group items by category for expanded view
              const campItensCat = { periferico:[], equipe:[] };
              (c.itens||[]).forEach(it=>{ const k=it.categoria||"equipe"; if(campItensCat[k]) campItensCat[k].push(it); else campItensCat[k]=[it]; });

              return (
                <div key={c.id} style={{
                  background:T.surfaceAlt||T.bg,
                  border:`1px solid ${c.ativo?(T.brandBorder||T.border):T.border}`,
                  borderRadius:RADIUS.md,overflow:"hidden",
                }}>
                  <div style={{padding:14,cursor:"pointer"}} onClick={()=>setExpandido(exp?null:c.id)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                          <Trophy size={14} color={c.ativo?(T.brand||"#10b981"):T.textSm}/>
                          <span style={{color:T.text,fontSize:14,fontWeight:700}}>{c.nome}</span>
                          {c.ativo
                            ?<Badge T={T} color={T.brand||"#10b981"} size="sm">Ativo</Badge>
                            :<Badge T={T} color={T.textSm} size="sm">Inativo</Badge>}
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>
                          {(c.categorias||[]).map(cat=>(
                            <span key={cat.codigo} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:RADIUS.pill,background:T.brandSoft||"rgba(16,185,129,0.12)",color:T.brand||"#10b981",fontSize:11,fontWeight:700}}>
                              <Tag size={10}/>{cat.codigo}
                            </span>
                          ))}
                          <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:RADIUS.pill,background:"rgba(59,130,246,0.10)",border:"1px solid rgba(59,130,246,0.2)",color:"#3b82f6",fontSize:11}}>
                            <Camera size={10}/>{campItensCat.periferico.length} periféricos
                          </span>
                          <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:RADIUS.pill,background:"rgba(245,158,11,0.10)",border:"1px solid rgba(245,158,11,0.2)",color:"#f59e0b",fontSize:11}}>
                            <Users size={10}/>{campItensCat.equipe.length} equipe
                          </span>
                          <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:RADIUS.pill,background:T.surfaceAlt||T.bg,border:`1px solid ${T.border}`,color:T.textMd,fontSize:11}}>
                            <MapPin size={10}/>{(c.cidadeIds||[]).length} cidades
                          </span>
                        </div>
                      </div>
                      <div style={{display:"inline-flex",gap:4,flexShrink:0}}>
                        <button onClick={e=>{e.stopPropagation();toggleAtivo(c);}} style={{...btnIcon(T),color:c.ativo?(T.warning||"#f59e0b"):(T.brand||"#10b981")}}>
                          {c.ativo?<X size={13}/>:<Check size={13}/>}
                        </button>
                        <button onClick={e=>{e.stopPropagation();setCampEdit(c);}} style={btnIcon(T)}><Pencil size={13}/></button>
                        {!c.origemHub&&(
                          <button onClick={e=>{e.stopPropagation();removeCamp(c.id);}} style={{...btnIcon(T),color:T.danger||"#ef4444"}}><Trash2 size={13}/></button>
                        )}
                        {exp
                          ? <ChevronDown size={14} color={T.textSm} style={{marginLeft:2}}/>
                          : <ChevronRight size={14} color={T.textSm} style={{marginLeft:2}}/>}
                      </div>
                    </div>
                  </div>

                  {exp&&(
                    <div style={{borderTop:`1px solid ${T.border}`}}>
                      {/* Cidades-sede */}
                      <div style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}>
                        <div style={{fontSize:11,fontWeight:700,color:T.textMd,letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                          <MapPin size={11} color={T.info||"#3b82f6"}/> Cidades-sede
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                          {(cidadesByCamp[c.id]||[]).map(nome=>(
                            <span key={nome} style={{padding:"3px 8px",borderRadius:RADIUS.pill,background:T.surface||T.card,border:`1px solid ${T.border}`,color:T.textMd,fontSize:11}}>{nome}</span>
                          ))}
                          {!(cidadesByCamp[c.id]||[]).length&&<span style={{color:T.textSm,fontSize:11}}>Nenhuma</span>}
                        </div>
                      </div>

                      {/* Periféricos + Equipe lado a lado */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                        {CATEGORIAS_ITEM.map((cat,idx)=>{
                          const Meta = CAT_META[cat.key];
                          const items = campItensCat[cat.key]||[];
                          return (
                            <div key={cat.key} style={{
                              padding:"12px 14px",
                              borderRight: idx===0 ? `1px solid ${T.border}` : "none",
                            }}>
                              <div style={{fontSize:11,fontWeight:700,color:cat.color,letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                                <Meta.icon size={11}/> {cat.label}
                              </div>
                              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                {items.map(it=>(
                                  <span key={it.id} style={{
                                    display:"inline-flex",alignItems:"center",gap:5,
                                    padding:"3px 9px",borderRadius:RADIUS.pill,
                                    background:`${cat.color}12`,border:`1px solid ${cat.color}30`,
                                    color:cat.color,fontSize:11,fontWeight:600,
                                  }}>
                                    <Meta.icon size={9}/>{it.nome}
                                  </span>
                                ))}
                                {!items.length&&<span style={{color:T.textSm,fontSize:11,fontStyle:"italic"}}>Nenhum</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {!campeonatosVisiveis.length&&(
              <p style={{color:T.textSm,fontSize:13,textAlign:"center",padding:"32px 0",margin:0}}>Nenhum campeonato cadastrado</p>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* Modais */}
      {(showNovaCidade||cidadeEdit)&&(
        <CidadeModal cidade={cidadeEdit} cidades={cidades} onSave={saveCidade} onClose={()=>{setCidadeEdit(null);setShowNovaCidade(false);}} T={T}/>
      )}
      {(showNovoItem||itemEdit)&&(
        <ItemMasterModal item={itemEdit} itensMaster={itensMaster} onSave={saveItem} onClose={()=>{setItemEdit(null);setShowNovoItem(false);}} T={T}/>
      )}
      {(showNovoCamp||campEdit)&&(
        <CampeonatoModal campeonato={campEdit} cidades={cidades} campeonatos={campeonatos} itensMaster={itensMaster} onSave={saveCamp} onClose={()=>{setCampEdit(null);setShowNovoCamp(false);}} T={T}/>
      )}
    </div>
  );
}
