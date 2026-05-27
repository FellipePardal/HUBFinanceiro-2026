import { useState, useMemo } from "react";
import { iSty, RADIUS } from "../../../constants";
import { Card, PanelTitle, Button, Badge, tableStyles } from "../../ui";
import { UNIDADES_MEDIDA, unidadeLabel, novoItemMaster } from "../../../data/catalogos";
import { Plus, Pencil, Trash2, MapPin, Trophy, Tag, Check, X, Package } from "lucide-react";

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const slugify = s =>
  String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

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
  const [form, setForm] = useState(item||{id:"",nome:"",unidade:"jogo"});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleSave = () => {
    const nome = form.nome.trim();
    if (!nome) return alert("Informe o nome do serviço.");
    if (itensMaster.some(i=>i.nome.toLowerCase()===nome.toLowerCase()&&i.id!==form.id))
      return alert("Já existe um item com esse nome.");
    const id = item?.id||novoItemMaster(nome).id;
    onSave({id,nome,unidade:form.unidade});
  };
  return (
    <div style={overlay}>
      <div style={{...modal(T),maxWidth:400}}>
        <h3 style={mTitle(T)}>{item?"Editar serviço":"Novo serviço"}</h3>
        <div style={{marginBottom:12}}>
          <label style={lbl}>Nome do serviço</label>
          <input value={form.nome} onChange={e=>set("nome",e.target.value)} style={IS} placeholder="Ex: UM B1, Drone, Grua..."/>
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

  // Itens: selecionados por id; armazena o objeto completo do master
  const itensSelecionadosIds = useMemo(()=>new Set((form.itens||[]).map(i=>i.id)),[form.itens]);
  const toggleItem = masterItem => {
    const on = itensSelecionadosIds.has(masterItem.id);
    set("itens", on
      ? (form.itens||[]).filter(i=>i.id!==masterItem.id)
      : [...(form.itens||[]), {id:masterItem.id, nome:masterItem.nome, unidade:masterItem.unidade, ativo:true}]
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
    onSave({id,nome,ano,ativo:!!form.ativo,cidadeIds:form.cidadeIds,categorias:cats,itens:form.itens||[]});
  };

  return (
    <div style={overlay}>
      <div style={{...modal(T),maxWidth:720,maxHeight:"92vh",overflowY:"auto"}}>
        <h3 style={mTitle(T)}>{campeonato?"Editar Campeonato":"Novo Campeonato"}</h3>

        {/* Nome / Ano / Ativo */}
        <div style={{display:"grid",gridTemplateColumns:"3fr 1fr 1fr",gap:12,marginBottom:18}}>
          <div>
            <label style={lbl}>Nome</label>
            <input value={form.nome} onChange={e=>set("nome",e.target.value)} style={IS} placeholder="Ex: Brasileirão Série A 2026"/>
          </div>
          <div>
            <label style={lbl}>Ano</label>
            <input type="number" value={form.ano} onChange={e=>set("ano",e.target.value)} style={IS}/>
          </div>
          <div>
            <label style={lbl}>Ativo</label>
            <select value={form.ativo?"sim":"nao"} onChange={e=>set("ativo",e.target.value==="sim")} style={IS}>
              <option value="sim">Sim</option><option value="nao">Não</option>
            </select>
          </div>
        </div>

        {/* Categorias */}
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

        {/* Itens de serviço — seleção por chips */}
        <div style={{marginBottom:18}}>
          <label style={{...lbl,display:"block",marginBottom:4}}>
            Itens de serviço ({itensSelecionadosIds.size} selecionados)
          </label>
          <p style={{margin:"0 0 10px",fontSize:11,color:T.textSm}}>
            Clique nos serviços que serão orçados neste campeonato. Para adicionar novos serviços, use o painel "Serviços" em Catálogos.
          </p>
          {itensMaster.length===0?(
            <p style={{fontSize:12,color:T.textSm,padding:"10px 14px",background:T.surfaceAlt||T.bg,border:`1px dashed ${T.border}`,borderRadius:RADIUS.md,margin:0}}>
              Nenhum serviço no catálogo. Adicione serviços no painel "Serviços" em Catálogos.
            </p>
          ):(
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {itensMaster.map(it=>{
                const on = itensSelecionadosIds.has(it.id);
                return (
                  <button key={it.id} onClick={()=>toggleItem(it)} style={{
                    display:"inline-flex",alignItems:"center",gap:6,
                    padding:"6px 13px",borderRadius:RADIUS.pill,cursor:"pointer",
                    border:`1px solid ${on?(T.brand||"#10b981"):T.border}`,
                    background:on?(T.brandSoft||"rgba(16,185,129,0.12)"):"transparent",
                    color:on?(T.brand||"#10b981"):T.textMd,
                    fontSize:12,fontWeight:600,transition:"all .1s",
                  }}>
                    {on?<Check size={12}/>:<Package size={12}/>}
                    {it.nome}
                    <span style={{fontSize:10,color:on?(T.brand||"#10b981"):T.textSm,fontWeight:400}}>
                      {unidadeLabel(it.unidade)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cidades-sede */}
        <div style={{marginBottom:18}}>
          <label style={{...lbl,display:"block",marginBottom:8}}>
            Cidades-sede ({form.cidadeIds.length} selecionadas)
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
const overlay = {position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16};
const modal  = T => ({background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",border:`1px solid ${T.border}`,boxShadow:T.shadow});
const mTitle = T => ({margin:"0 0 20px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"});
const mFooter = {display:"flex",gap:8,justifyContent:"flex-end"};
const lbl = {fontSize:11,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase"};
const btnDanger = T => ({background:"transparent",border:`1px solid ${T.border}`,color:T.danger||"#ef4444",borderRadius:RADIUS.sm,height:34,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"});
const btnIcon   = T => ({background:"transparent",border:`1px solid ${T.border}`,color:T.textMd,borderRadius:RADIUS.sm,width:30,height:30,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"});

// ════════════════════════════════════════════════════════════════════════════
export default function Catalogos({
  cidades, setCidades,
  campeonatos, setCampeonatos,
  itensMaster=[], setItensMaster=()=>{},
  filtroCampeonato="todos",
  T,
}) {
  const [cidadeEdit,  setCidadeEdit]  = useState(null);
  const [campEdit,    setCampEdit]    = useState(null);
  const [itemEdit,    setItemEdit]    = useState(null);
  const [showNovaCidade, setShowNovaCidade] = useState(false);
  const [showNovoCamp,   setShowNovoCamp]   = useState(false);
  const [showNovoItem,   setShowNovoItem]   = useState(false);
  const [expandido, setExpandido]     = useState(null);

  const tbl = tableStyles(T);

  const campSelecionado = filtroCampeonato!=="todos"
    ? campeonatos.find(c=>c.id===filtroCampeonato)
    : null;
  const cidadesVisiveis   = campSelecionado
    ? (campSelecionado.cidadeIds||[]).map(id=>cidades.find(c=>c.id===id)).filter(Boolean)
    : cidades;
  const campeonatosVisiveis = campSelecionado?[campSelecionado]:campeonatos;

  // ── Cidades ────────────────────────────────────────────────────────────
  const saveCidade = c => {
    setCidades(list=>list.some(x=>x.id===c.id)?list.map(x=>x.id===c.id?c:x):[...list,c]);
    setCidadeEdit(null); setShowNovaCidade(false);
  };
  const removeCidade = id => {
    if (!confirm("Remover esta cidade?")) return;
    setCidades(list=>list.filter(x=>x.id!==id));
  };

  // ── Itens master ────────────────────────────────────────────────────────
  const saveItem = it => {
    setItensMaster(list=>list.some(x=>x.id===it.id)?list.map(x=>x.id===it.id?it:x):[...list,it]);
    setItemEdit(null); setShowNovoItem(false);
  };
  const removeItem = id => {
    if (!confirm("Remover este serviço? Campeonatos que já o incluem não serão afetados.")) return;
    setItensMaster(list=>list.filter(x=>x.id!==id));
  };

  // ── Campeonatos ─────────────────────────────────────────────────────────
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
    campeonatos.forEach(c=>{
      map[c.id]=(c.cidadeIds||[]).map(id=>cidades.find(x=>x.id===id)?.nome||id);
    });
    return map;
  },[campeonatos,cidades]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:20}}>

        {/* ── Coluna esquerda: Cidades + Serviços ───────────────── */}
        <div style={{display:"flex",flexDirection:"column",gap:20}}>

          {/* Cidades */}
          <Card T={T} padding={0}>
            <PanelTitle T={T}
              title={campSelecionado?`Cidades-sede · ${campSelecionado.nome}`:"Cidades"}
              subtitle={campSelecionado
                ?`${cidadesVisiveis.length} praça${cidadesVisiveis.length!==1?"s":""} · edite o campeonato para incluir/remover`
                :"Praças disponíveis para alocar em campeonatos"}
              color={T.info||"#3b82f6"}
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
                  {cidadesVisiveis.map(c=>(
                    <tr key={c.id} style={tbl.tr}>
                      <td style={tbl.td}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
                          <MapPin size={13} color={T.textSm}/>
                          <span style={{color:T.text,fontWeight:600,fontSize:13}}>{c.nome}</span>
                        </span>
                      </td>
                      <td style={{...tbl.td,textAlign:"center"}}><Badge T={T} color={T.textMd} size="sm">{c.uf}</Badge></td>
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
                      {campSelecionado?"Nenhuma cidade-sede. Edite o campeonato para adicionar.":"Nenhuma cidade cadastrada"}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Catálogo de Serviços (master) */}
          <Card T={T} padding={0}>
            <PanelTitle T={T}
              title="Serviços"
              subtitle="Catálogo global de itens que podem ser orçados nos campeonatos"
              color="#a855f7"
              right={<Button T={T} variant="primary" size="sm" icon={Plus} onClick={()=>setShowNovoItem(true)}>Novo</Button>}/>
            <div style={{padding:"0 4px 16px"}}>
              <table style={tbl.table}>
                <thead>
                  <tr>
                    <th style={tbl.th}>Serviço</th>
                    <th style={{...tbl.th,width:140}}>Unidade</th>
                    <th style={{...tbl.th,width:80,textAlign:"right"}}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itensMaster.map(it=>(
                    <tr key={it.id} style={tbl.tr}>
                      <td style={tbl.td}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
                          <Package size={13} color={T.textSm}/>
                          <span style={{color:T.text,fontWeight:600,fontSize:13}}>{it.nome}</span>
                        </span>
                      </td>
                      <td style={{...tbl.td,fontSize:12,color:T.textMd}}>{unidadeLabel(it.unidade)}</td>
                      <td style={{...tbl.td,textAlign:"right"}}>
                        <div style={{display:"inline-flex",gap:4}}>
                          <button onClick={()=>setItemEdit(it)} style={btnIcon(T)}><Pencil size={12}/></button>
                          <button onClick={()=>removeItem(it.id)} style={{...btnIcon(T),color:T.danger||"#ef4444"}}><Trash2 size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!itensMaster.length&&(
                    <tr><td colSpan={3} style={{...tbl.td,textAlign:"center",color:T.textSm,padding:"20px 8px"}}>
                      Nenhum serviço cadastrado. Crie os itens que serão orçados.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── Campeonatos ────────────────────────────────────────── */}
        <Card T={T} padding={0}>
          <PanelTitle T={T}
            title={campSelecionado?"Campeonato selecionado":"Campeonatos"}
            subtitle={campSelecionado
              ?"Detalhes da temporada filtrada no header"
              :"Temporadas ativas, cidades-sede, categorias e itens de serviço"}
            color={T.brand||"#10b981"}
            right={<Button T={T} variant="primary" size="sm" icon={Plus} onClick={()=>setShowNovoCamp(true)}>Novo</Button>}/>

          <div style={{padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {campeonatosVisiveis.map(c=>{
              const exp = expandido===c.id;
              return (
                <div key={c.id} style={{background:T.surfaceAlt||T.bg,border:`1px solid ${c.ativo?(T.brandBorder||T.border):T.border}`,borderRadius:RADIUS.md,overflow:"hidden"}}>
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
                          <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:RADIUS.pill,background:T.surfaceAlt||T.bg,border:`1px solid ${T.border}`,color:T.textMd,fontSize:11}}>
                            <Package size={10}/>{(c.itens||[]).length} serviços
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
                        <button onClick={e=>{e.stopPropagation();removeCamp(c.id);}} style={{...btnIcon(T),color:T.danger||"#ef4444"}}><Trash2 size={13}/></button>
                      </div>
                    </div>
                  </div>

                  {exp&&(
                    <div style={{padding:"0 14px 14px",borderTop:`1px solid ${T.border}`}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:12}}>
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:T.textMd,letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:6}}>Cidades-sede</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {(cidadesByCamp[c.id]||[]).map(nome=>(
                              <span key={nome} style={{padding:"3px 8px",borderRadius:RADIUS.pill,background:T.surface||T.card,border:`1px solid ${T.border}`,color:T.textMd,fontSize:11}}>{nome}</span>
                            ))}
                            {!(cidadesByCamp[c.id]||[]).length&&<span style={{color:T.textSm,fontSize:11}}>Nenhuma</span>}
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:T.textMd,letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:6}}>Serviços incluídos</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {(c.itens||[]).map(it=>(
                              <span key={it.id} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:RADIUS.pill,background:"rgba(168,85,247,0.10)",border:"1px solid rgba(168,85,247,0.25)",color:"#a855f7",fontSize:11,fontWeight:600}}>
                                <Package size={10}/>{it.nome}
                              </span>
                            ))}
                            {!(c.itens||[]).length&&<span style={{color:T.textSm,fontSize:11,fontStyle:"italic"}}>Nenhum serviço selecionado.</span>}
                          </div>
                        </div>
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
        </Card>
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
