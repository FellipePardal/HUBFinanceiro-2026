import { useState } from "react";
import { iSty, RADIUS } from "../../constants";
import { Button, Chip } from "../ui";
import { slugify, FASES_PRESETS } from "../../data/customCampeonato";
import { novoOrcamento } from "../../data/orcamentos";
import { Calculator, AlertCircle } from "lucide-react";

const overlayStyle = {
  position:"fixed", inset:0,
  background:"rgba(0,0,0,0.65)",
  backdropFilter:"blur(4px)",
  zIndex:100,
  display:"flex", alignItems:"center", justifyContent:"center",
  padding:16,
};
const dialogStyle = (T, max=720) => ({
  background:T.surface||T.card,
  borderRadius:RADIUS.xl,
  padding:28,
  width:"100%",
  maxWidth:max,
  maxHeight:"92vh",
  overflowY:"auto",
  border:`1px solid ${T.border}`,
  boxShadow:T.shadow||"0 20px 40px rgba(0,0,0,0.4)",
});

const COR_PRESETS = ["#ec4899","#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#22c55e"];

// Definidos fora do componente para não remontarem (e perderem o foco do
// input) a cada re-render durante a digitação.
const Field = ({ T, label, children, span=1 }) => (
  <div style={{ gridColumn: `span ${span}`, marginBottom:12 }}>
    <label style={{ color:T.textMd, fontSize:12, display:"block", marginBottom:4, fontWeight:600 }}>{label}</label>
    {children}
  </div>
);

const FormatoBtn = ({ T, cor, value, titulo, sub, ativo, onSelect }) => (
  <button type="button" onClick={()=>onSelect(value)} style={{
    flex:1,
    padding:"14px 18px",
    border: ativo ? `2px solid ${cor}` : `1px solid ${T.border}`,
    background: ativo ? cor + "11" : T.surfaceAlt || T.bg,
    borderRadius: 10,
    cursor:"pointer",
    textAlign:"left",
    transition:"all .15s",
  }}>
    <p style={{margin:"0 0 4px",fontSize:13,fontWeight:700,color: ativo ? cor : T.text,letterSpacing:"-0.01em"}}>{titulo}</p>
    <p style={{margin:0,fontSize:11,color:T.textMd,lineHeight:1.4}}>{sub}</p>
  </button>
);

// Modal de criação de orçamento — só os metadados; padrões, premissas, praças
// e jogos são preenchidos depois nas sub-abas do editor.
export function NovoOrcamentoModal({ onSave, onClose, T, idsExistentes = [] }) {
  const [formato, setFormato]       = useState("mata_mata");
  const [numRodadas, setNumRodadas] = useState("38");
  const [nome, setNome]             = useState("");
  const [edicao, setEdicao]         = useState("2027");
  const [icon, setIcon]             = useState("🏆");
  const [cor, setCor]               = useState("#ec4899");
  const [descricao, setDescricao]   = useState("");
  const [fasesSel, setFasesSel]     = useState(["grupos","play_in","semi","final"]);
  const [erro, setErro]             = useState("");
  const [submitting, setSubmitting] = useState(false);

  const IS = iSty(T);

  const toggleFase = (key) => {
    setFasesSel(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const criar = async () => {
    if (!nome.trim())   { setErro("Informe o nome do campeonato."); return; }
    if (!edicao.trim()) { setErro("Informe a edição (ex: 2027)."); return; }
    if (formato === "mata_mata" && fasesSel.length === 0) { setErro("Selecione pelo menos uma fase."); return; }
    if (formato === "pontos_corridos") {
      const n = parseInt(numRodadas);
      if (!n || n < 1 || n > 99) { setErro("Informe um número de rodadas entre 1 e 99."); return; }
    }
    const id = slugify(`${nome}-${edicao}`);
    if (!id) { setErro("Não foi possível gerar um ID a partir do nome."); return; }
    if (idsExistentes.includes(id)) { setErro(`Já existe um orçamento ou campeonato com o ID "${id}".`); return; }

    const fases = formato === "pontos_corridos"
      ? [{ key:"rodadas", label:"Rodadas", short:"Rodadas", color:cor, ordem:1 }]
      : FASES_PRESETS
          .filter(f => fasesSel.includes(f.key))
          .map((f, i) => ({ key:f.key, label:f.label, short:f.label, color:f.color, ordem:i+1 }));

    const doc = novoOrcamento({ nome, edicao, formato, numRodadas, fases, cor, icon, descricao });
    setErro("");
    setSubmitting(true);
    try { await onSave(doc); }
    catch (e) { setErro("Falha ao salvar: " + (e?.message || e)); setSubmitting(false); }
  };

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle(T, 720)}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22}}>
          <div style={{
            width:42, height:42, borderRadius:12,
            background: cor + "22", border:`1px solid ${cor}55`, color: cor,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
          }}>{icon || "🏆"}</div>
          <div style={{flex:1, minWidth:0}}>
            <h3 style={{margin:0,fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>Novo Orçamento</h3>
            <p style={{margin:"4px 0 0",fontSize:12,color:T.textSm}}>
              O campeonato só é criado quando o orçamento for aprovado.
            </p>
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{ color:T.textMd, fontSize:12, display:"block", marginBottom:8, fontWeight:600 }}>Formato do campeonato *</label>
          <div style={{display:"flex", gap:8}}>
            <FormatoBtn
              T={T} cor={cor} onSelect={setFormato}
              value="pontos_corridos"
              titulo="Pontos Corridos"
              sub="Turno único ou ida/volta. Define o número de rodadas; sem mata-mata."
              ativo={formato==="pontos_corridos"}
            />
            <FormatoBtn
              T={T} cor={cor} onSelect={setFormato}
              value="mata_mata"
              titulo="Primeira Fase + Mata-mata"
              sub="Fase classificatória + Play In / Oitavas / Quartas / Semi / Final."
              ativo={formato==="mata_mata"}
            />
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"0 16px"}}>
          <Field T={T} label="Nome do campeonato *" span={2}>
            <input value={nome} onChange={e=>setNome(e.target.value)} style={IS} placeholder="Ex: Paulistão" autoFocus/>
          </Field>
          <Field T={T} label="Edição *">
            <input value={edicao} onChange={e=>setEdicao(e.target.value)} style={IS} placeholder="2027"/>
          </Field>

          <Field T={T} label="Ícone (emoji)">
            <input value={icon} onChange={e=>setIcon(e.target.value)} style={IS} placeholder="🏆" maxLength={3}/>
          </Field>
          <Field T={T} label="Cor do tema" span={2}>
            <div style={{display:"flex",gap:6,alignItems:"center",height:32}}>
              {COR_PRESETS.map(c => (
                <button key={c} onClick={()=>setCor(c)} type="button"
                  title={c}
                  style={{
                    width:24, height:24, borderRadius:6, cursor:"pointer",
                    background:c,
                    border: cor===c ? `2px solid ${T.text}` : `1px solid ${T.border}`,
                  }}/>
              ))}
            </div>
          </Field>

          <Field T={T} label="Descrição (opcional)" span={3}>
            <input value={descricao} onChange={e=>setDescricao(e.target.value)} style={IS} placeholder="Estadual Paulista Feminino · FPF"/>
          </Field>
        </div>

        {formato === "pontos_corridos" ? (
          <div style={{marginTop:8, marginBottom:12}}>
            <label style={{ color:T.textMd, fontSize:12, display:"block", marginBottom:6, fontWeight:600 }}>Número de rodadas *</label>
            <input value={numRodadas} onChange={e=>setNumRodadas(e.target.value.replace(/[^0-9]/g, ""))}
                   style={{...IS, maxWidth:120}} placeholder="38"/>
          </div>
        ) : (
          <div style={{marginTop:8, marginBottom:12}}>
            <label style={{ color:T.textMd, fontSize:12, display:"block", marginBottom:8, fontWeight:600 }}>
              Fases do campeonato * <span style={{color:T.textSm, fontWeight:500}}>(clique para adicionar/remover)</span>
            </label>
            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
              {FASES_PRESETS.map(f => (
                <Chip key={f.key} active={fasesSel.includes(f.key)} onClick={()=>toggleFase(f.key)} T={T} color={f.color}>
                  {f.label}
                </Chip>
              ))}
            </div>
            <p style={{margin:"8px 0 0", fontSize:11, color:T.textSm}}>
              Ordem usada: {fasesSel.length===0 ? "—" : FASES_PRESETS.filter(f=>fasesSel.includes(f.key)).map(f=>f.label).join(" → ")}
            </p>
          </div>
        )}

        {erro && (
          <div style={{
            display:"flex", alignItems:"flex-start", gap:8,
            padding:"10px 14px",
            background: (T.danger||"#ef4444") + "15",
            border: `1px solid ${(T.danger||"#ef4444")}55`,
            borderRadius:8, marginTop:12,
          }}>
            <AlertCircle size={16} color={T.danger||"#ef4444"} style={{flexShrink:0,marginTop:2}}/>
            <p style={{margin:0,fontSize:12,color:T.danger||"#ef4444",fontWeight:600}}>{erro}</p>
          </div>
        )}

        <div style={{display:"flex",gap:8,justifyContent:"space-between",marginTop:18,alignItems:"center"}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" icon={Calculator} onClick={criar} disabled={submitting}>
            {submitting ? "Criando..." : "Criar orçamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}
