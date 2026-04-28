import { useState } from "react";
import { iSty, RADIUS } from "../../constants";
import { Button, Chip } from "../ui";
import { slugify, parseCSV, jogoFromCSVRow, CSV_TEMPLATE, FASES_PRESETS } from "../../data/customCampeonato";
import { Trophy, AlertCircle, ArrowRight, ArrowLeft, Copy, FastForward, Check } from "lucide-react";

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

const StepDot = ({ active, done, T }) => (
  <div style={{
    width:24, height:24, borderRadius:"50%",
    background: active ? T.brand || "#10b981" : done ? (T.brand||"#10b981")+"33" : T.border,
    color: active ? "#fff" : done ? T.brand||"#10b981" : T.textSm,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:11, fontWeight:700,
  }}/>
);

export function NovoCampeonatoModal({ onSave, onClose, T }) {
  // ── Step state ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  // Step 1
  const [nome, setNome]               = useState("");
  const [edicao, setEdicao]           = useState("2026");
  const [icon, setIcon]               = useState("🏆");
  const [cor, setCor]                 = useState("#ec4899");
  const [status, setStatus]           = useState("Em andamento");
  const [descricao, setDescricao]     = useState("");
  const [fasesSel, setFasesSel]       = useState(["grupos","play_in","semi","final"]);
  // Step 2
  const [csvTexto, setCsvTexto]       = useState("");
  const [erro, setErro]               = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [copied, setCopied]           = useState(false);

  const IS = iSty(T);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const validarStep1 = () => {
    if (!nome.trim())   { setErro("Informe o nome do campeonato."); return false; }
    if (!edicao.trim()) { setErro("Informe a edição (ex: 2026)."); return false; }
    if (fasesSel.length === 0) { setErro("Selecione pelo menos uma fase."); return false; }
    setErro("");
    return true;
  };

  const toggleFase = (key) => {
    setFasesSel(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const buildConfig = () => {
    const id = slugify(`${nome}-${edicao}`);
    const fases = FASES_PRESETS
      .filter(f => fasesSel.includes(f.key))
      .map((f, i) => ({ key:f.key, label:f.label, short:f.label, color:f.color, ordem:i+1 }));
    return {
      id, nome: nome.trim(), edicao: edicao.trim(), status,
      statusColor: status==="Em andamento" ? "#22c55e" : status==="Finalizado" ? "#94a3b8" : "#f59e0b",
      cor,
      corGrad: `linear-gradient(135deg, ${cor}, ${cor}dd)`,
      icon: icon || "🏆",
      descricao: descricao.trim() || `${nome.trim()} · ${edicao.trim()}`,
      fases,
      createdAt: new Date().toISOString(),
    };
  };

  const finalizar = async (comJogos) => {
    setErro("");
    if (!validarStep1()) { setStep(1); return; }
    const config = buildConfig();
    if (!config.id) { setErro("Não foi possível gerar um ID a partir do nome."); return; }

    let jogos = [];
    if (comJogos && csvTexto.trim()) {
      const { header, rows } = parseCSV(csvTexto);
      if (rows.length === 0) { setErro("CSV vazio ou sem linhas válidas."); return; }
      if (!header.includes("fase") && !header.includes("mandante")) {
        setErro("CSV não parece ter cabeçalho. Esperado pelo menos colunas: fase, rodada, mandante, visitante.");
        return;
      }
      jogos = rows.map((row, i) => jogoFromCSVRow(row, i));
    }

    setSubmitting(true);
    try { await onSave({ config, jogos, servicos: null }); }
    catch (e) { setErro("Falha ao salvar: " + (e?.message || e)); setSubmitting(false); }
  };

  const copiarTemplate = async () => {
    try { await navigator.clipboard.writeText(CSV_TEMPLATE); setCopied(true); setTimeout(()=>setCopied(false), 1500); }
    catch { setCsvTexto(CSV_TEMPLATE); }
  };

  // ── Header (steps) ─────────────────────────────────────────────────────────
  const Header = () => (
    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22}}>
      <div style={{
        width:42, height:42, borderRadius:12,
        background: cor + "22", border:`1px solid ${cor}55`, color: cor,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
      }}>{icon || "🏆"}</div>
      <div style={{flex:1, minWidth:0}}>
        <h3 style={{margin:0,fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>Criar Novo Campeonato</h3>
        <p style={{margin:"4px 0 0",fontSize:12,color:T.textSm}}>
          {step===1 ? "Etapa 1 de 2 — Informações básicas" : "Etapa 2 de 2 — Jogos (opcional)"}
        </p>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:4}}>
        <StepDot active={step===1} done={step>1} T={T}/>
        <div style={{width:18, height:1, background:T.border}}/>
        <StepDot active={step===2} done={false} T={T}/>
      </div>
    </div>
  );

  const Field = ({ label, children, span=1 }) => (
    <div style={{ gridColumn: `span ${span}`, marginBottom:12 }}>
      <label style={{ color:T.textMd, fontSize:12, display:"block", marginBottom:4, fontWeight:600 }}>{label}</label>
      {children}
    </div>
  );

  // ── Step 1: Info básica + fases ────────────────────────────────────────────
  const Step1 = () => (
    <>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"0 16px"}}>
        <Field label="Nome do campeonato *" span={2}>
          <input value={nome} onChange={e=>setNome(e.target.value)} style={IS} placeholder="Ex: Carioca Feminino" autoFocus/>
        </Field>
        <Field label="Edição *">
          <input value={edicao} onChange={e=>setEdicao(e.target.value)} style={IS} placeholder="2026"/>
        </Field>

        <Field label="Ícone (emoji)">
          <input value={icon} onChange={e=>setIcon(e.target.value)} style={IS} placeholder="🏆" maxLength={3}/>
        </Field>
        <Field label="Status">
          <select value={status} onChange={e=>setStatus(e.target.value)} style={IS}>
            <option>Em andamento</option>
            <option>Planejamento</option>
            <option>Finalizado</option>
          </select>
        </Field>
        <Field label="Cor do tema">
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

        <Field label="Descrição (opcional)" span={3}>
          <input value={descricao} onChange={e=>setDescricao(e.target.value)} style={IS} placeholder="Estadual Carioca · Federação X"/>
        </Field>
      </div>

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
    </>
  );

  // ── Step 2: CSV opcional ───────────────────────────────────────────────────
  const Step2 = () => (
    <>
      <div style={{
        padding:"14px 16px",
        background: T.surfaceAlt || T.bg,
        border:`1px solid ${T.border}`,
        borderRadius:10,
        marginBottom:14,
      }}>
        <p style={{margin:"0 0 6px",fontSize:13,color:T.text,fontWeight:600}}>Como adicionar os jogos?</p>
        <p style={{margin:0,fontSize:12,color:T.textMd, lineHeight:1.5}}>
          <b>Opção A · Cole uma planilha CSV</b> abaixo (Excel/Sheets exporta direto). O cabeçalho da
          primeira linha define as colunas. Use o template como referência das colunas suportadas.
          <br/>
          <b>Opção B · Pular essa etapa</b> e adicionar os jogos depois pelo botão "Novo Jogo" na aba Jogos.
        </p>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
        <Button T={T} variant="secondary" size="sm" icon={copied ? Check : Copy} onClick={copiarTemplate}>
          {copied ? "Copiado!" : "Copiar template (1 linha de exemplo)"}
        </Button>
        <Button T={T} variant="secondary" size="sm" onClick={()=>setCsvTexto(CSV_TEMPLATE)}>
          Colar template aqui
        </Button>
      </div>

      <textarea
        value={csvTexto}
        onChange={e=>setCsvTexto(e.target.value)}
        rows={12}
        placeholder="Cole o CSV aqui (com cabeçalho na primeira linha)..."
        style={{...IS, fontFamily:"'JetBrains Mono', monospace", fontSize:11, resize:"vertical", whiteSpace:"pre"}}
      />

      <p style={{margin:"8px 0 0", fontSize:11, color:T.textSm}}>
        Separadores aceitos: vírgula, ponto e vírgula ou tab. Aspas para campos com vírgula. Colunas faltando viram 0/vazio.
      </p>
    </>
  );

  // ── Footer (botões mudam por step) ─────────────────────────────────────────
  const Footer = () => {
    if (step === 1) {
      return (
        <div style={{display:"flex",gap:8,justifyContent:"space-between",marginTop:18,alignItems:"center"}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" icon={ArrowRight} onClick={()=>{ if(validarStep1()) setStep(2); }}>
            Próximo
          </Button>
        </div>
      );
    }
    return (
      <div style={{display:"flex",gap:8,justifyContent:"space-between",marginTop:18,flexWrap:"wrap"}}>
        <Button T={T} variant="secondary" size="md" icon={ArrowLeft} onClick={()=>setStep(1)} disabled={submitting}>Voltar</Button>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Button T={T} variant="secondary" size="md" icon={FastForward} onClick={()=>finalizar(false)} disabled={submitting}>
            {submitting ? "..." : "Pular e criar vazio"}
          </Button>
          <Button T={T} variant="primary" size="md" icon={Trophy} onClick={()=>finalizar(true)} disabled={submitting || !csvTexto.trim()}>
            {submitting ? "Criando..." : "Criar com jogos"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle(T, 760)}>
        <Header/>
        {step === 1 ? <Step1/> : <Step2/>}
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
        <Footer/>
      </div>
    </div>
  );
}
