import { useState } from "react";
import { KPI, Pill } from "../shared";
import { btnStyle, iSty, RADIUS } from "../../constants";
import { Card, PanelTitle, Button, Chip, tableStyles } from "../ui";
import { Plus, Pencil, Trash2, Search, Users, Building2, UserCheck, Briefcase } from "lucide-react";

const AREAS = ["Todas","Operações","Conteúdo"];
const TIPOS = ["Todos","Fornecedor","Prestador"];

function FornecedorModal({ fornecedor, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(fornecedor || {
    apelido:"",razaoSocial:"",cnpj:"",funcao:"",area:"Operações",tipo:"Fornecedor",nome:"",telefone:"",email:"",cpf:"",rg:"",
  });
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const field = (label, key, opts=null, span=false) => (
    <div style={{marginBottom:12,gridColumn:span?"1 / -1":"auto"}}>
      <label style={{color:T.textMd,fontSize:12,display:"block",marginBottom:4}}>{label}</label>
      {opts
        ? <select value={form[key]} onChange={e => set(key, e.target.value)} style={IS}>{opts.map(o => <option key={o}>{o}</option>)}</select>
        : <input value={form[key]} onChange={e => set(key, e.target.value)} style={IS}/>}
    </div>
  );

  const handleSave = () => {
    if (!form.apelido) return;
    onSave({...form, id: fornecedor?.id || Date.now()});
  };

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

export default function TabFornecedores({ fornecedores, setFornecedores, T }) {
  const [filtroArea, setFiltroArea] = useState("Todas");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = fornecedores.filter(f =>
    (filtroArea === "Todas" || f.area === filtroArea) &&
    (filtroTipo === "Todos" || f.tipo === filtroTipo) &&
    (busca === "" || f.apelido.toLowerCase().includes(busca.toLowerCase()) || f.razaoSocial.toLowerCase().includes(busca.toLowerCase()) || f.funcao.toLowerCase().includes(busca.toLowerCase()))
  );

  const totalFornecedores = fornecedores.filter(f => f.tipo === "Fornecedor").length;
  const totalPrestadores  = fornecedores.filter(f => f.tipo === "Prestador").length;
  const totalOperacoes    = fornecedores.filter(f => f.area === "Operações").length;
  const totalConteudo     = fornecedores.filter(f => f.area === "Conteúdo").length;

  const saveFornecedor = f => {
    setFornecedores(fs => {
      const idx = fs.findIndex(x => x.id === f.id);
      return idx >= 0 ? fs.map(x => x.id === f.id ? f : x) : [...fs, f];
    });
    setShowModal(false);
    setEditing(null);
  };

  const deleteFornecedor = id => {
    if (window.confirm("Excluir este fornecedor?")) setFornecedores(fs => fs.filter(f => f.id !== id));
  };

  const IS = iSty(T);
  const TS = tableStyles(T);
  const cyan = "#06b6d4";
  const purple = "#a855f7";

  return (
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:24}}>
        <KPI label="Total Cadastrados" value={String(fornecedores.length)} sub="Fornecedores + Prestadores" color={cyan} T={T}/>
        <KPI label="Fornecedores" value={String(totalFornecedores)} sub="Empresas" color={T.warning} T={T}/>
        <KPI label="Prestadores" value={String(totalPrestadores)} sub="Pessoas físicas" color={T.info} T={T}/>
        <KPI label="Operações / Conteúdo" value={`${totalOperacoes} / ${totalConteudo}`} sub="Por área" color={purple} T={T}/>
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
        <PanelTitle T={T} title="Fornecedores e Prestadores" subtitle={`${filtered.length} resultado${filtered.length!==1?"s":""}`}/>
        <div style={TS.wrap}>
          <table style={{...TS.table, minWidth:880}}>
            <thead>
              <tr style={TS.thead}>
                {["Apelido","Razão Social","CNPJ","Função","Área","Tipo","Contato",""].map(h =>
                  <th key={h} style={{...TS.th, ...TS.thLeft}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} style={TS.tr}>
                  <td style={{...TS.td, fontWeight:600, whiteSpace:"nowrap"}}>{f.apelido}</td>
                  <td style={{...TS.td, color:T.textMd, fontSize:12, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{f.razaoSocial}</td>
                  <td className="num" style={{...TS.td, color:T.textMd, fontSize:11, whiteSpace:"nowrap"}}>{f.cnpj}</td>
                  <td style={{...TS.td, fontSize:12}}>{f.funcao}</td>
                  <td style={TS.td}><Pill label={f.area||"—"} color={f.area==="Operações"?T.warning:T.info}/></td>
                  <td style={TS.td}><Pill label={f.tipo||"—"} color={f.tipo==="Fornecedor"?cyan:purple}/></td>
                  <td style={{...TS.td, fontSize:11, color:T.textSm, whiteSpace:"nowrap"}}>{f.email || f.telefone || "—"}</td>
                  <td style={TS.td}>
                    <div style={{display:"flex",gap:4}}>
                      <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={()=>{setEditing(f);setShowModal(true);}}/>
                      <Button T={T} variant="danger" size="sm" icon={Trash2} onClick={()=>deleteFornecedor(f.id)}/>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{padding:40,textAlign:"center",color:T.textSm}}>Nenhum fornecedor encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && <FornecedorModal fornecedor={editing} onSave={saveFornecedor} onClose={() => {setShowModal(false);setEditing(null);}} T={T}/>}
    </>
  );
}
