import { useState } from "react";
import { iSty, RADIUS } from "../../constants";
import { Button } from "../ui";
import { slugify, derivarFases, jogoFromJSON } from "../../data/customCampeonato";
import { Trophy, AlertCircle } from "lucide-react";

const overlayStyle = {
  position:"fixed", inset:0,
  background:"rgba(0,0,0,0.65)",
  backdropFilter:"blur(4px)",
  zIndex:100,
  display:"flex", alignItems:"center", justifyContent:"center",
  padding:16,
};
const dialogStyle = (T, max=760) => ({
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

export function NovoCampeonatoModal({ onSave, onClose, T }) {
  const [nome, setNome]               = useState("");
  const [edicao, setEdicao]           = useState("2026");
  const [icon, setIcon]               = useState("🏆");
  const [cor, setCor]                 = useState("#ec4899");
  const [status, setStatus]           = useState("Em andamento");
  const [descricao, setDescricao]     = useState("");
  const [jogosTexto, setJogosTexto]   = useState("");
  const [servicosTexto, setServicosTexto] = useState("");
  const [erro, setErro]               = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const IS = iSty(T);

  const submit = async () => {
    setErro("");
    if (!nome.trim())   return setErro("Informe o nome do campeonato.");
    if (!edicao.trim()) return setErro("Informe a edição (ex: 2026).");
    if (!jogosTexto.trim()) return setErro("Cole o JSON dos jogos.");

    let parsed;
    try { parsed = JSON.parse(jogosTexto); }
    catch (e) { return setErro("JSON dos jogos inválido: " + e.message); }
    const jogos = Array.isArray(parsed) ? parsed : (parsed.jogos || []);
    if (!Array.isArray(jogos) || jogos.length === 0) return setErro("Nenhum jogo encontrado no JSON. Esperado array em `jogos` ou raiz.");

    let servicos = null;
    if (servicosTexto.trim()) {
      try { servicos = JSON.parse(servicosTexto); }
      catch (e) { return setErro("JSON dos serviços fixos inválido: " + e.message); }
      if (!Array.isArray(servicos)) return setErro("Serviços fixos deve ser um array de seções.");
    }

    const id = slugify(`${nome}-${edicao}`);
    if (!id) return setErro("Não foi possível gerar um ID a partir do nome.");

    const fases = derivarFases(jogos);
    const jogosNorm = jogos.map((j, i) => jogoFromJSON(j, i));

    const config = {
      id, nome: nome.trim(), edicao: edicao.trim(), status,
      statusColor: status==="Em andamento" ? "#22c55e" : status==="Finalizado" ? "#94a3b8" : "#f59e0b",
      cor,
      corGrad: `linear-gradient(135deg, ${cor}, ${cor}dd)`,
      icon: icon || "🏆",
      descricao: descricao.trim() || `${nome.trim()} · ${edicao.trim()}`,
      fases,
      createdAt: new Date().toISOString(),
    };

    setSubmitting(true);
    try { await onSave({ config, jogos: jogosNorm, servicos }); }
    catch (e) { setErro("Falha ao salvar: " + (e?.message || e)); setSubmitting(false); }
  };

  const Field = ({ label, children, span=1 }) => (
    <div style={{ gridColumn: `span ${span}`, marginBottom:12 }}>
      <label style={{ color:T.textMd, fontSize:12, display:"block", marginBottom:4, fontWeight:600 }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle(T, 760)}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22}}>
          <div style={{
            width:42, height:42, borderRadius:12,
            background: cor + "22", border:`1px solid ${cor}55`, color: cor,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
          }}>{icon || "🏆"}</div>
          <div>
            <h3 style={{margin:0,fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>Criar Novo Campeonato</h3>
            <p style={{margin:"4px 0 0",fontSize:12,color:T.textSm}}>Cole o JSON dos jogos no formato padrão e o campeonato será criado com todas as funcionalidades do HUB.</p>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"0 16px"}}>
          <Field label="Nome do campeonato" span={2}>
            <input value={nome} onChange={e=>setNome(e.target.value)} style={IS} placeholder="Ex: Carioca Feminino"/>
          </Field>
          <Field label="Edição">
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
          <Field label="Cor">
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {COR_PRESETS.map(c => (
                <button key={c} onClick={()=>setCor(c)} type="button"
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

        <Field label="JSON dos jogos">
          <textarea
            value={jogosTexto}
            onChange={e=>setJogosTexto(e.target.value)}
            rows={10}
            placeholder={`{\n  "campeonato": "Nome",\n  "jogos": [\n    { "codigo_orcamento":"X1", "fase":"Primeira Fase", "rodada":"1", "data":"01/02/2026", "mandante":"Time A", "visitante":"Time B", "logistica":{...}, "pessoal":{...}, "operacao":{...} }\n  ]\n}`}
            style={{...IS, fontFamily:"'JetBrains Mono', monospace", fontSize:12, resize:"vertical"}}
          />
        </Field>

        <Field label="JSON dos serviços fixos (opcional)">
          <textarea
            value={servicosTexto}
            onChange={e=>setServicosTexto(e.target.value)}
            rows={5}
            placeholder={`[\n  { "secao":"Pessoal", "itens":[{ "id":1, "nome":"Coordenador", "orcado":24000, "provisionado":0, "realizado":0, "obs":"" }] }\n]`}
            style={{...IS, fontFamily:"'JetBrains Mono', monospace", fontSize:12, resize:"vertical"}}
          />
        </Field>

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

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button T={T} variant="primary"   size="md" onClick={submit}  disabled={submitting} icon={Trophy}>
            {submitting ? "Criando..." : "Criar Campeonato"}
          </Button>
        </div>
      </div>
    </div>
  );
}
