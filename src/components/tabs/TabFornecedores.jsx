import { useState } from "react";
import { KPI, Pill } from "../shared";
import { btnStyle, iSty } from "../../constants";

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
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.card,borderRadius:16,padding:28,width:"100%",maxWidth:540,maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 20px",fontSize:16,color:T.text}}>{fornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}</h3>
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
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
          <button onClick={onClose} style={{...btnStyle,background:"#475569"}}>Cancelar</button>
          <button onClick={handleSave} style={{...btnStyle,background:"#06b6d4"}}>Salvar</button>
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

  return (
    <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        <KPI label="Total Cadastrados" value={String(fornecedores.length)} sub="Fornecedores + Prestadores" color="#06b6d4" T={T}/>
        <KPI label="Fornecedores" value={String(totalFornecedores)} sub="Empresas" color="#f59e0b" T={T}/>
        <KPI label="Prestadores" value={String(totalPrestadores)} sub="Pessoas físicas" color="#3b82f6" T={T}/>
        <KPI label="Operações / Conteúdo" value={`${totalOperacoes} / ${totalConteudo}`} sub="Por área" color="#8b5cf6" T={T}/>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." style={{...IS,width:200,padding:"6px 12px"}}/>
          <div style={{width:1,height:24,background:T.border}}/>
          {AREAS.map(a => (
            <button key={a} onClick={() => setFiltroArea(a)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,
              background:filtroArea===a?"#06b6d4":T.card,color:filtroArea===a?"#fff":T.textMd}}>{a}</button>
          ))}
          <div style={{width:1,height:24,background:T.border}}/>
          {TIPOS.map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,
              background:filtroTipo===t?"#f59e0b":T.card,color:filtroTipo===t?"#000":T.textMd}}>{t}</button>
          ))}
        </div>
        <button onClick={() => {setEditing(null);setShowModal(true);}} style={{...btnStyle,background:"#06b6d4",fontSize:12}}>+ Novo Fornecedor</button>
      </div>

      <div style={{background:T.card,borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,color:T.textSm,fontSize:12}}>{filtered.length} fornecedores</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}>
            <thead><tr style={{background:T.bg}}>
              {["Apelido","Razão Social","CNPJ","Função","Área","Tipo","Contato",""].map(h =>
                <th key={h} style={{padding:"10px 12px",textAlign:"left",color:T.textSm,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} style={{borderTop:`1px solid ${T.border}`}}>
                  <td style={{padding:"10px 12px",fontWeight:600,fontSize:13,color:T.text,whiteSpace:"nowrap"}}>{f.apelido}</td>
                  <td style={{padding:"10px 12px",color:T.textMd,fontSize:12,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.razaoSocial}</td>
                  <td style={{padding:"10px 12px",color:T.textMd,fontSize:11,whiteSpace:"nowrap",fontFamily:"monospace"}}>{f.cnpj}</td>
                  <td style={{padding:"10px 12px",color:T.text,fontSize:12}}>{f.funcao}</td>
                  <td style={{padding:"10px 12px"}}><Pill label={f.area||"—"} color={f.area==="Operações"?"#f59e0b":"#3b82f6"}/></td>
                  <td style={{padding:"10px 12px"}}><Pill label={f.tipo||"—"} color={f.tipo==="Fornecedor"?"#06b6d4":"#8b5cf6"}/></td>
                  <td style={{padding:"10px 12px",fontSize:11,color:T.textSm,whiteSpace:"nowrap"}}>{f.email || f.telefone || "—"}</td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={() => {setEditing(f);setShowModal(true);}} style={{...btnStyle,background:T.border,padding:"4px 10px",fontSize:11}}>✏</button>
                      <button onClick={() => deleteFornecedor(f.id)} style={{...btnStyle,background:"#7f1d1d",padding:"4px 10px",fontSize:11}}>🗑</button>
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
      </div>

      {showModal && <FornecedorModal fornecedor={editing} onSave={saveFornecedor} onClose={() => {setShowModal(false);setEditing(null);}} T={T}/>}
    </>
  );
}
