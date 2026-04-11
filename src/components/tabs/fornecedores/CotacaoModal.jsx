import { useState } from "react";
import { iSty, RADIUS } from "../../../constants";
import { Button, Badge } from "../../ui";
import { STATUS_COTACAO, CAMPEONATOS_COTACAO } from "../../../data/negociacoes";

// Modal unificado de Cotação — reutilizado em Negociações e Cotações por Campeonato
export default function CotacaoModal({ cotacao, fornecedores, jogos, defaultCampeonatoId, onSave, onClose, T }) {
  const IS = iSty(T);
  const labelSty = { color:T.textMd, fontSize:11, fontWeight:600, display:"block", marginBottom:4, letterSpacing:"0.04em", textTransform:"uppercase" };

  const [form, setForm] = useState(() => cotacao || {
    fornecedorId:  "",
    campeonatoId:  defaultCampeonatoId || CAMPEONATOS_COTACAO[0].id,
    jogoIds:       [],
    status:        "rascunho",
    valorProposto:    0,
    valorContraproposta: 0,
    prazo:         "",
    observacoes:   "",
    createdAt:     new Date().toISOString(),
  });

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const toggleJogo = id => setForm(f => {
    const has = (f.jogoIds || []).includes(id);
    return {...f, jogoIds: has ? f.jogoIds.filter(x => x !== id) : [...(f.jogoIds||[]), id]};
  });

  const handleSave = () => {
    if (!form.fornecedorId) { alert("Selecione um fornecedor"); return; }
    const now = new Date().toISOString();
    onSave({
      ...form,
      id: cotacao?.id || Date.now(),
      createdAt: cotacao?.createdAt || now,
      updatedAt: now,
      fornecedorId: Number(form.fornecedorId),
      valorProposto: Number(form.valorProposto) || 0,
      valorContraproposta: Number(form.valorContraproposta) || 0,
    });
  };

  // Jogos disponíveis: só os do campeonato selecionado e com mandante definido
  const jogosDisponiveis = (jogos || [])
    .filter(j => j.mandante && j.mandante !== "A definir")
    .sort((a,b) => (a.data||"").localeCompare(b.data||""));

  const campColor = CAMPEONATOS_COTACAO.find(c => c.id === form.campeonatoId)?.cor || T.brand;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:120,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.surface||T.card,borderRadius:RADIUS.xl,padding:28,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${T.border}`,boxShadow:T.shadow}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,gap:12}}>
          <h3 style={{margin:0,fontSize:18,color:T.text,fontWeight:800,letterSpacing:"-0.02em"}}>
            {cotacao ? "Editar Cotação" : "Nova Cotação"}
          </h3>
          <Badge color={campColor} T={T} size="md">{CAMPEONATOS_COTACAO.find(c=>c.id===form.campeonatoId)?.nome || "—"}</Badge>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:14}}>
            <label style={labelSty}>Fornecedor *</label>
            <select value={form.fornecedorId} onChange={e => set("fornecedorId", e.target.value)} style={IS}>
              <option value="">— Selecione —</option>
              {(fornecedores||[]).map(f => (
                <option key={f.id} value={f.id}>{f.apelido}{f.funcao ? ` · ${f.funcao}` : ""}</option>
              ))}
            </select>
          </div>

          <div style={{marginBottom:14}}>
            <label style={labelSty}>Campeonato *</label>
            <select value={form.campeonatoId} onChange={e => set("campeonatoId", e.target.value)} style={IS}>
              {CAMPEONATOS_COTACAO.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div style={{marginBottom:14}}>
            <label style={labelSty}>Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)} style={IS}>
              {STATUS_COTACAO.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          <div style={{marginBottom:14}}>
            <label style={labelSty}>Prazo de Resposta</label>
            <input type="date" value={form.prazo} onChange={e => set("prazo", e.target.value)} style={IS}/>
          </div>

          <div style={{marginBottom:14}}>
            <label style={labelSty}>Valor Proposto (R$)</label>
            <input type="number" value={form.valorProposto} onChange={e => set("valorProposto", e.target.value)} style={{...IS,textAlign:"right"}}/>
          </div>

          <div style={{marginBottom:14}}>
            <label style={labelSty}>Contraproposta (R$)</label>
            <input type="number" value={form.valorContraproposta} onChange={e => set("valorContraproposta", e.target.value)} style={{...IS,textAlign:"right"}}/>
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={labelSty}>Jogos Vinculados ({(form.jogoIds||[]).length})</label>
          <div style={{border:`1px solid ${T.border}`,borderRadius:RADIUS.sm,padding:8,maxHeight:140,overflowY:"auto",background:T.bg}}>
            {jogosDisponiveis.length === 0 ? (
              <div style={{padding:8,color:T.textSm,fontSize:11,textAlign:"center"}}>Nenhum jogo com mandante definido</div>
            ) : jogosDisponiveis.map(j => {
              const on = (form.jogoIds||[]).includes(j.id);
              return (
                <button key={j.id} type="button" onClick={() => toggleJogo(j.id)} style={{
                  display:"block",
                  width:"100%",
                  textAlign:"left",
                  padding:"5px 8px",
                  borderRadius:4,
                  border:"none",
                  cursor:"pointer",
                  background: on ? (T.brandSoft||"rgba(16,185,129,0.12)") : "transparent",
                  color: on ? (T.brand||"#10b981") : T.textMd,
                  fontSize:11,
                  fontWeight: on ? 700 : 500,
                  marginBottom:1,
                }}>
                  R{j.rodada} · {j.data||"?"} · {j.mandante} × {j.visitante} ({j.categoria})
                </button>
              );
            })}
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={labelSty}>Observações</label>
          <textarea value={form.observacoes} onChange={e => set("observacoes", e.target.value)} rows={3} style={{...IS,resize:"vertical",fontFamily:"inherit"}}/>
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}
