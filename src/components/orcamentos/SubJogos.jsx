import { useState } from "react";
import { iSty, CATS, FONT } from "../../constants";
import { Card, SectionHeader, Button, Badge, tableStyles } from "../ui";
import { calcOrcadoJogo, blocosJogo } from "../../data/orcamentos";
import { fmt } from "../../utils";
import { CalendarDays, Plus, Trash2, Copy, ChevronDown, ChevronUp, Eraser, Zap } from "lucide-react";

// Jogos estimados do orçamento. O orçado de cada linha é DERIVADO ao vivo
// (premissa do padrão + logística da faixa da praça); a linha expandida
// permite override pontual de qualquer subKey (vence premissa e faixa).
export default function SubJogos({ orc, setOrc, readOnly, T }) {
  const IS = iSty(T);
  const ts = tableStyles(T);
  const [expandido, setExpandido] = useState(null);
  const [loteQtd, setLoteQtd]     = useState("2");
  const [loteFase, setLoteFase]   = useState("");
  const [lotePraca, setLotePraca] = useState("");
  const [lotePadrao, setLotePadrao] = useState("");

  const jogos   = orc.jogos || [];
  const pracas  = orc.pracas || [];
  const padroes = orc.padroes || [];
  const pontosCorridos = orc.meta.formato === "pontos_corridos";
  const fases = pontosCorridos ? [] : (orc.meta.fases || []);

  const proximoId = () => jogos.reduce((m, j) => Math.max(m, Number(j.id) || 0), 0) + 1;

  const novoJogo = (base = {}) => ({
    id: proximoId(),
    fase: pontosCorridos ? "rodadas" : (base.fase || fases[0]?.key || "grupos"),
    rodada: base.rodada || (jogos.length + 1),
    mandante: base.mandante || "",
    visitante: base.visitante || "",
    pracaId: base.pracaId || pracas[0]?.id || "",
    padrao: base.padrao || padroes[0] || "",
    data: base.data || "",
    obs: base.obs || "",
    overrides: base.overrides ? { ...base.overrides } : {},
  });

  const addJogo = () => setOrc(prev => ({ ...prev, jogos: [...(prev.jogos || []), novoJogo()] }));

  const gerarLote = () => {
    const n = Math.min(parseInt(loteQtd) || 0, 50);
    if (n < 1) return;
    setOrc(prev => {
      const atuais = prev.jogos || [];
      let nextId = atuais.reduce((m, j) => Math.max(m, Number(j.id) || 0), 0);
      const novos = Array.from({ length: n }, (_, i) => ({
        id: ++nextId,
        fase: pontosCorridos ? "rodadas" : (loteFase || fases[0]?.key || "grupos"),
        rodada: atuais.length + i + 1,
        mandante: "", visitante: "",
        pracaId: lotePraca || pracas[0]?.id || "",
        padrao: lotePadrao || padroes[0] || "",
        data: "", obs: "", overrides: {},
      }));
      return { ...prev, jogos: [...atuais, ...novos] };
    });
  };

  const duplicarJogo = (j) => setOrc(prev => {
    const nextId = (prev.jogos || []).reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
    return { ...prev, jogos: [...(prev.jogos || []), { ...j, id: nextId, overrides: { ...(j.overrides || {}) } }] };
  });

  const removerJogo = (id) => {
    if (!window.confirm("Remover este jogo do orçamento?")) return;
    setOrc(prev => ({ ...prev, jogos: (prev.jogos || []).filter(j => j.id !== id) }));
    if (expandido === id) setExpandido(null);
  };

  const patchJogo = (id, patch) =>
    setOrc(prev => ({ ...prev, jogos: (prev.jogos || []).map(j => j.id === id ? { ...j, ...patch } : j) }));

  const setOverride = (id, subKey, raw) => {
    setOrc(prev => ({
      ...prev,
      jogos: (prev.jogos || []).map(j => {
        if (j.id !== id) return j;
        const overrides = { ...(j.overrides || {}) };
        const v = String(raw).replace(/[^0-9.,\-]/g, "").replace(",", ".");
        if (v === "" || v === "-") delete overrides[subKey];
        else overrides[subKey] = parseFloat(v) || 0;
        return { ...j, overrides };
      }),
    }));
  };

  const limparOverrides = (id) => {
    if (!window.confirm("Limpar todos os overrides deste jogo? Ele volta a usar só premissa + faixa.")) return;
    patchJogo(id, { overrides: {} });
  };

  const selSty = { ...IS, fontSize:12, padding:"5px 8px", opacity:readOnly?0.7:1 };
  const inpSty = { ...selSty };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <Card T={T}>
        <SectionHeader T={T} icon={CalendarDays} title={`Jogos estimados (${jogos.length})`}
          subtitle="Lista placeholder — a lista real chega quando o campeonato existir; célula laranja = override manual"
          right={!readOnly && <Button T={T} variant="primary" size="sm" icon={Plus} onClick={addJogo} disabled={pracas.length===0 || padroes.length===0}>Adicionar jogo</Button>}/>

        {(pracas.length === 0 || padroes.length === 0) && (
          <p style={{margin:0,padding:"14px 20px",fontSize:12,color:T.warning||"#D97706"}}>
            Antes de criar jogos, defina ao menos um <b>padrão</b> (aba Padrões & Premissas) e uma <b>praça</b> (aba Praças & Logística).
          </p>
        )}

        <div style={ts.wrap}>
          <table style={{...ts.table, minWidth:980}}>
            <thead style={ts.thead}>
              <tr>
                <th style={{...ts.th, ...ts.thLeft}}>{pontosCorridos ? "Rodada" : "Fase"}</th>
                {!pontosCorridos && <th style={{...ts.th, ...ts.thRight}}>Rod.</th>}
                <th style={{...ts.th, ...ts.thLeft}}>Mandante</th>
                <th style={{...ts.th, ...ts.thLeft}}>Visitante</th>
                <th style={{...ts.th, ...ts.thLeft}}>Praça</th>
                <th style={{...ts.th, ...ts.thLeft}}>Padrão</th>
                <th style={{...ts.th, ...ts.thLeft}}>Data</th>
                <th style={{...ts.th, ...ts.thRight}}>Logística</th>
                <th style={{...ts.th, ...ts.thRight}}>Pessoal</th>
                <th style={{...ts.th, ...ts.thRight}}>Operações</th>
                <th style={{...ts.th, ...ts.thRight}}>Total</th>
                <th style={ts.th}/>
              </tr>
            </thead>
            <tbody>
              {jogos.map((j, idx) => {
                const blocos = blocosJogo(orc, j);
                const nOverrides = Object.keys(j.overrides || {}).length;
                const aberto = expandido === j.id;
                return [
                  <tr key={j.id} style={{...ts.tr, background: aberto ? (T.surfaceAlt||T.bg) : undefined}}>
                    <td style={{...ts.td, padding:"6px 10px"}}>
                      {pontosCorridos ? (
                        <input value={j.rodada ?? ""} disabled={readOnly} inputMode="numeric"
                          onChange={e=>patchJogo(j.id, {rodada: parseInt(e.target.value.replace(/[^0-9]/g,"")) || ""})}
                          style={{...inpSty, maxWidth:64, textAlign:"right", fontFamily:FONT.num}}/>
                      ) : (
                        <select value={j.fase} disabled={readOnly} onChange={e=>patchJogo(j.id, {fase:e.target.value})} style={{...selSty, maxWidth:130}}>
                          {fases.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                      )}
                    </td>
                    {!pontosCorridos && (
                      <td style={{...ts.td, padding:"6px 10px"}}>
                        <input value={j.rodada ?? ""} disabled={readOnly} inputMode="numeric"
                          onChange={e=>patchJogo(j.id, {rodada: parseInt(e.target.value.replace(/[^0-9]/g,"")) || ""})}
                          style={{...inpSty, maxWidth:52, textAlign:"right", fontFamily:FONT.num}}/>
                      </td>
                    )}
                    <td style={{...ts.td, padding:"6px 10px"}}>
                      <input value={j.mandante} disabled={readOnly} placeholder={`Time ${idx*2+1}`}
                        onChange={e=>patchJogo(j.id, {mandante:e.target.value})} style={{...inpSty, minWidth:110}}/>
                    </td>
                    <td style={{...ts.td, padding:"6px 10px"}}>
                      <input value={j.visitante} disabled={readOnly} placeholder={`Time ${idx*2+2}`}
                        onChange={e=>patchJogo(j.id, {visitante:e.target.value})} style={{...inpSty, minWidth:110}}/>
                    </td>
                    <td style={{...ts.td, padding:"6px 10px"}}>
                      <select value={j.pracaId} disabled={readOnly} onChange={e=>patchJogo(j.id, {pracaId:e.target.value})}
                        style={{...selSty, maxWidth:150, borderColor: pracas.some(p=>p.id===j.pracaId) ? undefined : (T.danger||"#DC2626")}}>
                        {!pracas.some(p=>p.id===j.pracaId) && <option value={j.pracaId}>— praça? —</option>}
                        {pracas.map(p => <option key={p.id} value={p.id}>{p.cidade}</option>)}
                      </select>
                    </td>
                    <td style={{...ts.td, padding:"6px 10px"}}>
                      <select value={j.padrao} disabled={readOnly} onChange={e=>patchJogo(j.id, {padrao:e.target.value})}
                        style={{...selSty, maxWidth:100, borderColor: padroes.includes(j.padrao) ? undefined : (T.danger||"#DC2626")}}>
                        {!padroes.includes(j.padrao) && <option value={j.padrao}>—</option>}
                        {padroes.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td style={{...ts.td, padding:"6px 10px"}}>
                      <input value={j.data} disabled={readOnly} placeholder="dd/mm"
                        onChange={e=>patchJogo(j.id, {data:e.target.value})} style={{...inpSty, maxWidth:90}}/>
                    </td>
                    <td className="num" style={ts.tdNum}>{fmt(blocos.logistica)}</td>
                    <td className="num" style={ts.tdNum}>{fmt(blocos.pessoal)}</td>
                    <td className="num" style={ts.tdNum}>{fmt(blocos.operacoes)}</td>
                    <td className="num" style={{...ts.tdNum, fontWeight:700}}>
                      {fmt(blocos.total)}
                      {nOverrides > 0 && (
                        <span title={`${nOverrides} override(s) manual(is)`} style={{marginLeft:6}}>
                          <Badge T={T} color={T.warning||"#D97706"} size="sm">{nOverrides}</Badge>
                        </span>
                      )}
                    </td>
                    <td style={{...ts.td, padding:"6px 10px", whiteSpace:"nowrap"}}>
                      <button title={aberto ? "Fechar detalhe" : "Abrir detalhe / overrides"} onClick={()=>setExpandido(aberto ? null : j.id)}
                        style={{border:"none",background:"transparent",cursor:"pointer",color:T.textMd,padding:4}}>
                        {aberto ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                      </button>
                      {!readOnly && (
                        <>
                          <button title="Duplicar jogo" onClick={()=>duplicarJogo(j)}
                            style={{border:"none",background:"transparent",cursor:"pointer",color:T.textMd,padding:4}}>
                            <Copy size={14}/>
                          </button>
                          <button title="Remover jogo" onClick={()=>removerJogo(j.id)}
                            style={{border:"none",background:"transparent",cursor:"pointer",color:T.danger||"#DC2626",padding:4}}>
                            <Trash2 size={14}/>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>,
                  aberto && (
                    <tr key={`${j.id}-det`} style={{background:T.surfaceAlt||T.bg}}>
                      <td colSpan={pontosCorridos ? 11 : 12} style={{padding:"14px 20px", borderTop:`1px dashed ${T.border}`}}>
                        <DetalheOverrides orc={orc} jogo={j} readOnly={readOnly} T={T}
                          onSetOverride={(k, v)=>setOverride(j.id, k, v)}
                          onLimpar={()=>limparOverrides(j.id)}/>
                      </td>
                    </tr>
                  ),
                ];
              })}
              {jogos.length === 0 && (
                <tr><td colSpan={12} style={{...ts.td, color:T.textSm, fontSize:12}}>Nenhum jogo estimado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Gerar em lote ── */}
        {!readOnly && pracas.length > 0 && padroes.length > 0 && (
          <div style={{padding:"14px 20px 18px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <Zap size={14} color={T.brand||"#65B32E"}/>
            <span style={{fontSize:12,color:T.textMd,fontWeight:600}}>Gerar em lote:</span>
            <input value={loteQtd} onChange={e=>setLoteQtd(e.target.value.replace(/[^0-9]/g,""))} style={{...IS, maxWidth:56, textAlign:"right"}} placeholder="N"/>
            <span style={{fontSize:12,color:T.textSm}}>jogos</span>
            {!pontosCorridos && (
              <select value={loteFase} onChange={e=>setLoteFase(e.target.value)} style={{...IS, maxWidth:150}}>
                <option value="">Fase: {fases[0]?.label || "—"}</option>
                {fases.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            )}
            <select value={lotePraca} onChange={e=>setLotePraca(e.target.value)} style={{...IS, maxWidth:170}}>
              <option value="">Praça: {pracas[0]?.cidade || "—"}</option>
              {pracas.map(p => <option key={p.id} value={p.id}>{p.cidade}</option>)}
            </select>
            <select value={lotePadrao} onChange={e=>setLotePadrao(e.target.value)} style={{...IS, maxWidth:120}}>
              <option value="">Padrão: {padroes[0] || "—"}</option>
              {padroes.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <Button T={T} variant="secondary" size="sm" icon={Plus} onClick={gerarLote} disabled={!parseInt(loteQtd)}>Gerar</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// Linha expandida: overrides por subKey — placeholder mostra o valor derivado
// (premissa + faixa); digitar cria o override; limpar o campo remove.
function DetalheOverrides({ orc, jogo, readOnly, T, onSetOverride, onLimpar }) {
  const IS = iSty(T);
  const semOverrides = { ...jogo, overrides: {} };
  const base = calcOrcadoJogo(orc, semOverrides);
  const nOverrides = Object.keys(jogo.overrides || {}).length;

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <p style={{margin:0,fontSize:12,fontWeight:700,color:T.text}}>
          Overrides do jogo {jogo.mandante || "—"} × {jogo.visitante || "—"}
        </p>
        <p style={{margin:0,fontSize:11,color:T.textSm}}>
          Cinza = valor derivado (premissa + faixa). Digite para sobrescrever; apague para voltar ao derivado.
        </p>
        {!readOnly && nOverrides > 0 && (
          <Button T={T} variant="ghost" size="sm" icon={Eraser} onClick={onLimpar}>Limpar overrides ({nOverrides})</Button>
        )}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
        {CATS.map(cat => (
          <div key={cat.key}>
            <p style={{margin:"0 0 8px",fontSize:10,fontWeight:700,color:cat.color,letterSpacing:"0.08em",textTransform:"uppercase"}}>{cat.label}</p>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {cat.subs.map(sub => {
                const temOverride = jogo.overrides != null && sub.key in jogo.overrides;
                return (
                  <div key={sub.key} style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:T.textMd,flex:1,minWidth:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sub.label}</span>
                    <input
                      value={temOverride ? jogo.overrides[sub.key] : ""}
                      disabled={readOnly}
                      placeholder={String(base[sub.key] || 0)}
                      inputMode="decimal"
                      onChange={e=>onSetOverride(sub.key, e.target.value)}
                      style={{
                        ...IS,
                        maxWidth:96,
                        textAlign:"right",
                        fontFamily:FONT.num,
                        fontSize:11,
                        padding:"3px 7px",
                        background: temOverride ? (T.warning||"#D97706")+"1a" : (T.surface||T.bg),
                        borderColor: temOverride ? (T.warning||"#D97706")+"88" : undefined,
                        opacity: readOnly ? 0.7 : 1,
                      }}/>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
