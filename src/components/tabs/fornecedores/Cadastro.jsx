import { useState, useMemo } from "react";
import { KPI, Pill } from "../../shared";
import { CIDADES, iSty, RADIUS } from "../../../constants";
import { fmt } from "../../../utils";
import { Card, PanelTitle, Button, Chip, Badge, tableStyles } from "../../ui";
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight, DollarSign, MapPin } from "lucide-react";

const AREAS = ["Todas","Operações","Conteúdo"];
const TIPOS = ["Todos","Fornecedor","Prestador"];

// Tipos de tabela de preço por classificação do fornecedor
const TIPO_TABELA = {
  produtora:  "Produtora",
  periferico: "Periférico",
  equipe:     "Equipe Operacional",
};

const REGIOES = ["Sudeste","Sul","Nordeste","Centro Oeste","Norte"];

// ── Modal de Fornecedor (dados cadastrais) ───────────────────────────────────
function FornecedorModal({ fornecedor, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(() => {
    const base = fornecedor || {
      apelido:"",razaoSocial:"",cnpj:"",funcao:"",area:"Operações",tipo:"Fornecedor",
      nome:"",telefone:"",email:"",cpf:"",rg:"",
      tipoTabela:"",precos:[],
    };
    return { ...base, tipoTabela: base.tipoTabela || "" };
  });
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const field = (label, key, opts=null, span=false) => (
    <div style={{marginBottom:12,gridColumn:span?"1 / -1":"auto"}}>
      <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>{label}</label>
      {opts
        ? <select value={form[key]} onChange={e => set(key, e.target.value)} style={IS}>{opts.map(o => <option key={typeof o==="string"?o:o.v} value={typeof o==="string"?o:o.v}>{typeof o==="string"?o:o.l}</option>)}</select>
        : <input value={form[key]} onChange={e => set(key, e.target.value)} style={IS}/>}
    </div>
  );

  const handleSave = () => {
    if (!form.apelido) return;
    onSave({...form, id: fornecedor?.id || Date.now(), precos: form.precos || []});
  };

  const tipoOpts = [{v:"",l:"— Sem tabela —"},{v:"produtora",l:"Produtora"},{v:"periferico",l:"Periférico"},{v:"equipe",l:"Equipe Operacional"}];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <h3 style={{margin:"0 0 20px",fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>{fornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          {field("Apelido","apelido")}
          {field("CNPJ","cnpj")}
          {field("Razão Social","razaoSocial",null,true)}
          {field("Função","funcao")}
          {field("Área","area",["Operações","Conteúdo"])}
          {field("Tipo Cadastro","tipo",["Fornecedor","Prestador"])}
          {field("Classificação Tabela","tipoTabela",tipoOpts)}
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

// ═══════════════════════════════════════════════════════════════════════════════
// TABELA PRODUTORA — Região, Cidade, Estádio/Time, B1, B2, B3, B4, Montagem
// ═══════════════════════════════════════════════════════════════════════════════
function ProdutoraPrecoModal({ entry, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(entry || {
    regiao:"Sudeste", cidade:"", estadio:"", b1:0, b2:0, b3:0, b4:0, montagem:0, obs:"",
  });
  const set = (k, v) => setForm(f => ({...f, [k]: v}));
  const labelSty = {color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:4,letterSpacing:"0.04em",textTransform:"uppercase"};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:110,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <h3 style={{margin:"0 0 20px",fontSize:18,color:T.text,fontWeight:800}}>{entry ? "Editar Linha" : "Nova Linha"}</h3>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:14}}>
            <label style={labelSty}>Região</label>
            <select value={form.regiao} onChange={e=>set("regiao",e.target.value)} style={IS}>
              {REGIOES.map(r=><option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={{marginBottom:14}}>
            <label style={labelSty}>Cidade</label>
            <input value={form.cidade} onChange={e=>set("cidade",e.target.value)} style={IS}/>
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={labelSty}>Estádio / Mandante</label>
          <input value={form.estadio} onChange={e=>set("estadio",e.target.value)} style={IS} placeholder="Ex: Maracanã, São Januário..."/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"0 12px"}}>
          {["b1","b2","b3","b4"].map(k => (
            <div key={k} style={{marginBottom:14}}>
              <label style={labelSty}>{k.toUpperCase()} (UM)</label>
              <input type="number" value={form[k]} onChange={e=>set(k,parseFloat(e.target.value)||0)} style={{...IS,textAlign:"right"}}/>
            </div>
          ))}
        </div>

        <div style={{marginBottom:14}}>
          <label style={labelSty}>Montagem Véspera (R$)</label>
          <input type="number" value={form.montagem} onChange={e=>set("montagem",parseFloat(e.target.value)||0)} style={{...IS,textAlign:"right"}}/>
        </div>

        <div style={{marginBottom:14}}>
          <label style={labelSty}>Observação</label>
          <input value={form.obs||""} onChange={e=>set("obs",e.target.value)} style={IS}/>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={()=>{ if(!form.cidade) return; onSave({...form, id:entry?.id||Date.now()}); }}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

function TabelaProdutora({ precos, onUpdate, T }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const TS = tableStyles(T);

  const save = p => { const u=[...precos]; const i=u.findIndex(x=>x.id===p.id); if(i>=0) u[i]=p; else u.push(p); onUpdate(u); setShowModal(false); setEditing(null); };
  const del = id => { if(window.confirm("Excluir esta linha?")) onUpdate(precos.filter(p=>p.id!==id)); };

  const sorted = [...precos].sort((a,b) => a.regiao.localeCompare(b.regiao) || a.cidade.localeCompare(b.cidade) || (a.estadio||"").localeCompare(b.estadio||""));

  // Agrupar por região
  const regioes = {};
  sorted.forEach(p => { if(!regioes[p.regiao]) regioes[p.regiao]=[]; regioes[p.regiao].push(p); });

  const valColor = (v) => v ? (T.brand||"#10b981") : (T.textSm||"#64748b");

  return (
    <>
      <div style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <DollarSign size={15} color={T.brand||"#10b981"}/>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>Tabela Produtora</span>
          <Badge color={T.brand} T={T} size="sm">{precos.length} linha{precos.length!==1?"s":""}</Badge>
        </div>
        <Button T={T} variant="primary" size="sm" icon={Plus} onClick={()=>{setEditing(null);setShowModal(true);}}>Nova Linha</Button>
      </div>

      {precos.length === 0 ? (
        <div style={{padding:"20px 20px 24px",textAlign:"center",color:T.textSm,fontSize:12}}>
          Nenhum preço cadastrado. Clique em "Nova Linha" para adicionar.
        </div>
      ) : (
        <div style={{...TS.wrap, padding:"0 0 4px"}}>
          <table style={{...TS.table, minWidth:900}}>
            <thead>
              <tr style={TS.thead}>
                {["Região","Cidade","Estádio/Mandante","B1 (UM)","B2 (UM)","B3 (UM)","B4 (UM)","Montagem","Obs",""].map(h =>
                  <th key={h} style={{...TS.th, ...(["B1 (UM)","B2 (UM)","B3 (UM)","B4 (UM)","Montagem"].includes(h)?TS.thRight:TS.thLeft)}}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {Object.entries(regioes).map(([regiao, items]) => [
                ...items.map((p,i) => (
                  <tr key={p.id} style={TS.tr}>
                    {i===0 ? <td rowSpan={items.length} style={{...TS.td,fontWeight:700,verticalAlign:"top",borderRight:`1px solid ${T.border}`,fontSize:12,color:T.textMd}}>{regiao}</td> : null}
                    <td style={{...TS.td,fontWeight:600,fontSize:13}}>{p.cidade}</td>
                    <td style={{...TS.td,fontSize:12,color:T.textMd}}>{p.estadio||"—"}</td>
                    <td className="num" style={{...TS.tdNum,fontWeight:700,color:valColor(p.b1)}}>{p.b1?fmt(p.b1):"—"}</td>
                    <td className="num" style={{...TS.tdNum,fontWeight:700,color:valColor(p.b2)}}>{p.b2?fmt(p.b2):"—"}</td>
                    <td className="num" style={{...TS.tdNum,fontWeight:600,color:valColor(p.b3),fontSize:12}}>{p.b3?fmt(p.b3):"—"}</td>
                    <td className="num" style={{...TS.tdNum,fontWeight:600,color:valColor(p.b4),fontSize:12}}>{p.b4?fmt(p.b4):"—"}</td>
                    <td className="num" style={{...TS.tdNum,fontSize:12,color:p.montagem?(T.warning||"#f59e0b"):T.textSm}}>{p.montagem?fmt(p.montagem):"—"}</td>
                    <td style={{...TS.td,fontSize:11,color:T.textSm}}>{p.obs||""}</td>
                    <td style={TS.td}>
                      <div style={{display:"flex",gap:4}}>
                        <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={()=>{setEditing(p);setShowModal(true);}}/>
                        <Button T={T} variant="danger" size="sm" icon={Trash2} onClick={()=>del(p.id)}/>
                      </div>
                    </td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <ProdutoraPrecoModal entry={editing} onSave={save} onClose={()=>{setShowModal(false);setEditing(null);}} T={T}/>}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABELA PERIFÉRICO — Cidade, Serviço, Quantidade, Valor unitário
// ═══════════════════════════════════════════════════════════════════════════════
const SERVICOS_PERIFERICOS = ["Drone","Mini Drone","Grua/Policam","DSLR + Microlink","Carrinho","Goalcam","Gerador","SNG","SNG Extra","LiveU","Especial","Outro"];

function PerifericoPrecoModal({ entry, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(entry || {
    cidade:"", servico:SERVICOS_PERIFERICOS[0], qtd:1, valorUnit:0, obs:"",
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const labelSty = {color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:4,letterSpacing:"0.04em",textTransform:"uppercase"};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:110,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <h3 style={{margin:"0 0 20px",fontSize:18,color:T.text,fontWeight:800}}>{entry ? "Editar" : "Novo Periférico"}</h3>
        <div style={{marginBottom:14}}>
          <label style={labelSty}>Cidade</label>
          <input value={form.cidade} onChange={e=>set("cidade",e.target.value)} style={IS}/>
        </div>
        <div style={{marginBottom:14}}>
          <label style={labelSty}>Serviço</label>
          <select value={form.servico} onChange={e=>set("servico",e.target.value)} style={IS}>
            {SERVICOS_PERIFERICOS.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:14}}>
            <label style={labelSty}>Quantidade</label>
            <input type="number" value={form.qtd} onChange={e=>set("qtd",parseInt(e.target.value)||1)} style={{...IS,textAlign:"right"}}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={labelSty}>Valor Unitário (R$)</label>
            <input type="number" value={form.valorUnit} onChange={e=>set("valorUnit",parseFloat(e.target.value)||0)} style={{...IS,textAlign:"right"}}/>
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={labelSty}>Observação</label>
          <input value={form.obs||""} onChange={e=>set("obs",e.target.value)} style={IS}/>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={()=>{if(!form.cidade||!form.valorUnit)return; onSave({...form,id:entry?.id||Date.now()});}}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

function TabelaPeriferico({ precos, onUpdate, T }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const TS = tableStyles(T);

  const save = p => { const u=[...precos]; const i=u.findIndex(x=>x.id===p.id); if(i>=0) u[i]=p; else u.push(p); onUpdate(u); setShowModal(false); setEditing(null); };
  const del = id => { if(window.confirm("Excluir?")) onUpdate(precos.filter(p=>p.id!==id)); };
  const total = precos.reduce((s,p)=>s+(p.valorUnit||0)*(p.qtd||1),0);

  return (
    <>
      <div style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <DollarSign size={15} color="#a855f7"/>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>Tabela Periférico</span>
          <Badge color="#a855f7" T={T} size="sm">{precos.length} item{precos.length!==1?"ns":""}</Badge>
          {total>0 && <span className="num" style={{fontSize:12,fontWeight:700,color:"#a855f7"}}>{fmt(total)}</span>}
        </div>
        <Button T={T} variant="primary" size="sm" icon={Plus} onClick={()=>{setEditing(null);setShowModal(true);}}>Novo Item</Button>
      </div>

      {precos.length === 0 ? (
        <div style={{padding:"20px 20px 24px",textAlign:"center",color:T.textSm,fontSize:12}}>Nenhum preço cadastrado.</div>
      ) : (
        <div style={{...TS.wrap, padding:"0 0 4px"}}>
          <table style={{...TS.table, minWidth:600}}>
            <thead>
              <tr style={TS.thead}>
                {["Cidade","Serviço","Qtd","Valor Unit.","Total","Obs",""].map(h =>
                  <th key={h} style={{...TS.th, ...(["Qtd","Valor Unit.","Total"].includes(h)?TS.thRight:TS.thLeft)}}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {[...precos].sort((a,b)=>a.cidade.localeCompare(b.cidade)||a.servico.localeCompare(b.servico)).map(p => (
                <tr key={p.id} style={TS.tr}>
                  <td style={{...TS.td,fontWeight:600,fontSize:13}}><div style={{display:"flex",alignItems:"center",gap:4}}><MapPin size={11} color={T.textSm}/>{p.cidade}</div></td>
                  <td style={{...TS.td,fontSize:12}}>{p.servico}</td>
                  <td className="num" style={{...TS.tdNum,fontSize:13}}>{p.qtd||1}</td>
                  <td className="num" style={{...TS.tdNum,fontWeight:600,color:"#a855f7"}}>{fmt(p.valorUnit)}</td>
                  <td className="num" style={{...TS.tdNum,fontWeight:700,color:T.brand||"#10b981"}}>{fmt((p.valorUnit||0)*(p.qtd||1))}</td>
                  <td style={{...TS.td,fontSize:11,color:T.textSm}}>{p.obs||"—"}</td>
                  <td style={TS.td}>
                    <div style={{display:"flex",gap:4}}>
                      <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={()=>{setEditing(p);setShowModal(true);}}/>
                      <Button T={T} variant="danger" size="sm" icon={Trash2} onClick={()=>del(p.id)}/>
                    </div>
                  </td>
                </tr>
              ))}
              {precos.length>1 && (
                <tr style={TS.totalRow}>
                  <td colSpan={4} style={{...TS.td,fontWeight:700,color:T.textMd}}>Total</td>
                  <td className="num" style={{...TS.tdNum,fontWeight:800,color:T.brand||"#10b981"}}>{fmt(total)}</td>
                  <td colSpan={2}/>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {showModal && <PerifericoPrecoModal entry={editing} onSave={save} onClose={()=>{setShowModal(false);setEditing(null);}} T={T}/>}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABELA EQUIPE OPERACIONAL — Valor fixo/jogo + Diária de alimentação
// ═══════════════════════════════════════════════════════════════════════════════
function EquipePrecoModal({ entry, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(entry || {
    funcao:"", valorJogo:0, diaria:0, obs:"",
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const labelSty = {color:T.textMd,fontSize:11,fontWeight:600,display:"block",marginBottom:4,letterSpacing:"0.04em",textTransform:"uppercase"};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:110,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <h3 style={{margin:"0 0 20px",fontSize:18,color:T.text,fontWeight:800}}>{entry ? "Editar" : "Novo Profissional"}</h3>
        <div style={{marginBottom:14}}>
          <label style={labelSty}>Função</label>
          <input value={form.funcao} onChange={e=>set("funcao",e.target.value)} style={IS} placeholder="Ex: Vmix, DTV, Áudio..."/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:14}}>
            <label style={labelSty}>Valor por Jogo (R$)</label>
            <input type="number" value={form.valorJogo} onChange={e=>set("valorJogo",parseFloat(e.target.value)||0)} style={{...IS,textAlign:"right"}}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={labelSty}>Diária Alimentação (R$)</label>
            <input type="number" value={form.diaria} onChange={e=>set("diaria",parseFloat(e.target.value)||0)} style={{...IS,textAlign:"right"}}/>
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={labelSty}>Observação</label>
          <input value={form.obs||""} onChange={e=>set("obs",e.target.value)} style={IS}/>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={()=>{if(!form.funcao)return; onSave({...form,id:entry?.id||Date.now()});}}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

function TabelaEquipe({ precos, onUpdate, T }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const TS = tableStyles(T);

  const save = p => { const u=[...precos]; const i=u.findIndex(x=>x.id===p.id); if(i>=0) u[i]=p; else u.push(p); onUpdate(u); setShowModal(false); setEditing(null); };
  const del = id => { if(window.confirm("Excluir?")) onUpdate(precos.filter(p=>p.id!==id)); };
  const totalJogo = precos.reduce((s,p)=>s+(p.valorJogo||0),0);
  const totalDiaria = precos.reduce((s,p)=>s+(p.diaria||0),0);

  return (
    <>
      <div style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <DollarSign size={15} color={T.info||"#3b82f6"}/>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>Tabela Equipe Operacional</span>
          <Badge color={T.info} T={T} size="sm">{precos.length} profissional{precos.length!==1?"is":""}</Badge>
        </div>
        <Button T={T} variant="primary" size="sm" icon={Plus} onClick={()=>{setEditing(null);setShowModal(true);}}>Novo Profissional</Button>
      </div>

      {precos.length === 0 ? (
        <div style={{padding:"20px 20px 24px",textAlign:"center",color:T.textSm,fontSize:12}}>Nenhum profissional cadastrado.</div>
      ) : (
        <div style={{...TS.wrap, padding:"0 0 4px"}}>
          <table style={{...TS.table, minWidth:500}}>
            <thead>
              <tr style={TS.thead}>
                {["Função","Valor/Jogo","Diária Alim.","Total/Jogo","Obs",""].map(h =>
                  <th key={h} style={{...TS.th, ...(["Valor/Jogo","Diária Alim.","Total/Jogo"].includes(h)?TS.thRight:TS.thLeft)}}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {[...precos].sort((a,b)=>(a.funcao||"").localeCompare(b.funcao||"")).map(p => (
                <tr key={p.id} style={TS.tr}>
                  <td style={{...TS.td,fontWeight:600,fontSize:13}}>{p.funcao}</td>
                  <td className="num" style={{...TS.tdNum,fontWeight:700,color:T.info||"#3b82f6"}}>{fmt(p.valorJogo)}</td>
                  <td className="num" style={{...TS.tdNum,fontSize:12,color:T.warning||"#f59e0b"}}>{fmt(p.diaria)}</td>
                  <td className="num" style={{...TS.tdNum,fontWeight:700,color:T.brand||"#10b981"}}>{fmt((p.valorJogo||0)+(p.diaria||0))}</td>
                  <td style={{...TS.td,fontSize:11,color:T.textSm}}>{p.obs||"—"}</td>
                  <td style={TS.td}>
                    <div style={{display:"flex",gap:4}}>
                      <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={()=>{setEditing(p);setShowModal(true);}}/>
                      <Button T={T} variant="danger" size="sm" icon={Trash2} onClick={()=>del(p.id)}/>
                    </div>
                  </td>
                </tr>
              ))}
              <tr style={TS.totalRow}>
                <td style={{...TS.td,fontWeight:700,color:T.textMd}}>Total</td>
                <td className="num" style={{...TS.tdNum,fontWeight:800,color:T.info||"#3b82f6"}}>{fmt(totalJogo)}</td>
                <td className="num" style={{...TS.tdNum,fontWeight:700,color:T.warning||"#f59e0b"}}>{fmt(totalDiaria)}</td>
                <td className="num" style={{...TS.tdNum,fontWeight:800,color:T.brand||"#10b981"}}>{fmt(totalJogo+totalDiaria)}</td>
                <td colSpan={2}/>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {showModal && <EquipePrecoModal entry={editing} onSave={save} onClose={()=>{setShowModal(false);setEditing(null);}} T={T}/>}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE WRAPPER — renderiza a tabela certa conforme tipoTabela
// ═══════════════════════════════════════════════════════════════════════════════
function TabelaPrecosFornecedor({ fornecedor, onUpdate, T }) {
  const precos = fornecedor.precos || [];
  const tipo = fornecedor.tipoTabela;

  const handleUpdate = newPrecos => onUpdate({...fornecedor, precos: newPrecos});

  if (!tipo) return (
    <div style={{borderTop:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg,padding:"20px 20px 24px",textAlign:"center",color:T.textSm,fontSize:12}}>
      Este fornecedor não tem classificação de tabela definida. Edite o cadastro e selecione uma "Classificação Tabela".
    </div>
  );

  return (
    <div style={{borderTop:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg}}>
      {tipo === "produtora"  && <TabelaProdutora  precos={precos} onUpdate={handleUpdate} T={T}/>}
      {tipo === "periferico" && <TabelaPeriferico  precos={precos} onUpdate={handleUpdate} T={T}/>}
      {tipo === "equipe"     && <TabelaEquipe      precos={precos} onUpdate={handleUpdate} T={T}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — Lista de fornecedores com expand para tabela de preços
// ═══════════════════════════════════════════════════════════════════════════════
export default function Cadastro({ fornecedores, setFornecedores, T }) {
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
  const comTabela = fornecedores.filter(f => f.tipoTabela).length;

  const saveFornecedor = f => {
    setFornecedores(fs => {
      const idx = fs.findIndex(x => x.id === f.id);
      if (idx >= 0) {
        return fs.map(x => x.id === f.id ? {...f, precos: x.precos || f.precos || []} : x);
      }
      return [...fs, f];
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

  const tipoTabelaLabel = t => TIPO_TABELA[t] || "—";
  const tipoTabelaColor = t => t==="produtora"?(T.brand||"#10b981"):t==="periferico"?purple:t==="equipe"?(T.info||"#3b82f6"):T.textSm;

  return (
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:24}}>
        <KPI label="Total Cadastrados" value={String(fornecedores.length)} sub="Fornecedores + Prestadores" color={cyan} T={T}/>
        <KPI label="Fornecedores / Prestadores" value={`${totalFornecedores} / ${totalPrestadores}`} sub="Por tipo" color={T.warning} T={T}/>
        <KPI label="Com Classificação" value={String(comTabela)} sub={`de ${fornecedores.length} cadastrados`} color={T.info||"#3b82f6"} T={T}/>
        <KPI label="Com Preços" value={String(comPrecos)} sub="Tabelas preenchidas" color={T.brand||"#10b981"} T={T}/>
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
        <PanelTitle T={T} title="Fornecedores e Prestadores" subtitle={`${filtered.length} resultado${filtered.length!==1?"s":""} · Clique para ver tabela de preços`}/>
        <div style={TS.wrap}>
          <table style={{...TS.table, minWidth:920}}>
            <thead>
              <tr style={TS.thead}>
                {["","Apelido","Razão Social","CNPJ","Função","Área","Tipo","Tabela","Preços",""].map(h =>
                  <th key={h} style={{...TS.th, ...TS.thLeft, ...(h==="Preços"?{textAlign:"right"}:{})}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const isExpanded = expandedId === f.id;
                const numPrecos = (f.precos || []).length;

                return [
                  <tr key={f.id} style={{...TS.tr, cursor:"pointer", background: isExpanded ? (T.brandSoft||"rgba(16,185,129,0.06)") : "transparent"}}
                    onClick={() => toggleExpand(f.id)}>
                    <td style={{...TS.td, width:32, padding:"13px 8px 13px 16px"}}>
                      {isExpanded
                        ? <ChevronDown size={15} color={T.brand||"#10b981"}/>
                        : <ChevronRight size={15} color={T.textSm}/>}
                    </td>
                    <td style={{...TS.td, fontWeight:600, whiteSpace:"nowrap"}}>{f.apelido}</td>
                    <td style={{...TS.td, color:T.textMd, fontSize:12, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{f.razaoSocial}</td>
                    <td className="num" style={{...TS.td, color:T.textMd, fontSize:11, whiteSpace:"nowrap"}}>{f.cnpj}</td>
                    <td style={{...TS.td, fontSize:12}}>{f.funcao}</td>
                    <td style={TS.td}><Pill label={f.area||"—"} color={f.area==="Operações"?T.warning:T.info}/></td>
                    <td style={TS.td}><Pill label={f.tipo||"—"} color={f.tipo==="Fornecedor"?cyan:purple}/></td>
                    <td style={TS.td}>
                      {f.tipoTabela
                        ? <Badge color={tipoTabelaColor(f.tipoTabela)} T={T} size="sm">{tipoTabelaLabel(f.tipoTabela)}</Badge>
                        : <span style={{fontSize:11,color:T.textSm}}>—</span>}
                    </td>
                    <td className="num" style={{...TS.td, textAlign:"right", whiteSpace:"nowrap"}}>
                      {numPrecos > 0
                        ? <Badge color={T.brand} T={T} size="sm">{numPrecos} linha{numPrecos!==1?"s":""}</Badge>
                        : <span style={{fontSize:11,color:T.textSm}}>—</span>}
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
                      <td colSpan={10} style={{padding:0}}>
                        <TabelaPrecosFornecedor fornecedor={f} onUpdate={updateFornecedor} T={T}/>
                      </td>
                    </tr>
                  ),
                ];
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{padding:40,textAlign:"center",color:T.textSm}}>Nenhum fornecedor encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && <FornecedorModal fornecedor={editing} onSave={saveFornecedor} onClose={() => {setShowModal(false);setEditing(null);}} T={T}/>}
    </>
  );
}
