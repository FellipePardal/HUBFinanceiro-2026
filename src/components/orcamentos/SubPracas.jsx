import { useState } from "react";
import { iSty, FONT } from "../../constants";
import { Card, SectionHeader, Button, tableStyles } from "../ui";
import { SUBS_LOGISTICA, logisticaDaPraca } from "../../data/orcamentos";
import { fmt } from "../../utils";
import { MapPin, Route, Plus, Trash2 } from "lucide-react";

// Faixas de distância (tabela de logística por faixa) + praças (cidade → faixa).
// A logística de todo jogo é herdada da faixa da sua praça; ajustes pontuais
// são feitos por override na linha do jogo (aba Jogos).
export default function SubPracas({ orc, setOrc, readOnly, T }) {
  const IS = iSty(T);
  const ts = tableStyles(T);
  const [novaFaixa, setNovaFaixa] = useState("");
  const [novaCidade, setNovaCidade] = useState("");

  const faixas = orc.faixas || [];
  const pracas = orc.pracas || [];

  const slugFaixa = (label) => String(label).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  const addFaixa = () => {
    const label = novaFaixa.trim();
    if (!label) return;
    const key = slugFaixa(label);
    if (!key || faixas.some(f => f.key === key)) { window.alert(`Já existe uma faixa "${label}".`); return; }
    setOrc(prev => ({
      ...prev,
      faixas: [...(prev.faixas || []), { key, label, logistica:{ transporte:0, uber:0, hospedagem:0, diaria:0, outros_log:0 } }],
    }));
    setNovaFaixa("");
  };

  const removeFaixa = (key) => {
    const emUso = pracas.filter(p => p.faixaKey === key).length;
    if (emUso > 0) { window.alert(`Esta faixa está em uso por ${emUso} praça(s). Troque a faixa dessas praças antes de remover.`); return; }
    if (!window.confirm("Remover esta faixa de distância?")) return;
    setOrc(prev => ({ ...prev, faixas: (prev.faixas || []).filter(f => f.key !== key) }));
  };

  const setValorFaixa = (key, subKey, raw) => {
    setOrc(prev => ({
      ...prev,
      faixas: (prev.faixas || []).map(f => {
        if (f.key !== key) return f;
        const v = String(raw).replace(/[^0-9.,\-]/g, "").replace(",", ".");
        return { ...f, logistica: { ...f.logistica, [subKey]: v === "" ? 0 : (parseFloat(v) || 0) } };
      }),
    }));
  };

  const renomearFaixa = (key, label) => {
    setOrc(prev => ({
      ...prev,
      faixas: (prev.faixas || []).map(f => f.key === key ? { ...f, label } : f),
    }));
  };

  const totalFaixa = (f) => SUBS_LOGISTICA.reduce((s, sub) => s + (Number(f.logistica?.[sub.key]) || 0), 0);

  const addPraca = () => {
    const cidade = novaCidade.trim();
    if (!cidade) return;
    if (pracas.some(p => p.cidade.toLowerCase() === cidade.toLowerCase())) { window.alert(`A praça "${cidade}" já existe.`); return; }
    setOrc(prev => ({
      ...prev,
      pracas: [...(prev.pracas || []), {
        id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        cidade,
        faixaKey: (prev.faixas || [])[0]?.key || "",
      }],
    }));
    setNovaCidade("");
  };

  const removePraca = (id) => {
    const emUso = (orc.jogos || []).filter(j => j.pracaId === id).length;
    if (emUso > 0) { window.alert(`Esta praça está em uso por ${emUso} jogo(s). Troque a praça desses jogos antes de remover.`); return; }
    setOrc(prev => ({ ...prev, pracas: (prev.pracas || []).filter(p => p.id !== id) }));
  };

  const patchPraca = (id, patch) => {
    setOrc(prev => ({ ...prev, pracas: (prev.pracas || []).map(p => p.id === id ? { ...p, ...patch } : p) }));
  };

  // Alterna o modo de logística da praça: "própria" começa copiando os valores
  // da faixa atual (ponto de partida); voltar para "faixa" descarta a própria.
  const setModoPraca = (id, modo) => {
    setOrc(prev => ({
      ...prev,
      pracas: (prev.pracas || []).map(p => {
        if (p.id !== id) return p;
        if (modo === "propria") {
          if (p.logistica) return p;
          const faixa = (prev.faixas || []).find(f => f.key === p.faixaKey);
          return { ...p, logistica: { transporte:0, uber:0, hospedagem:0, diaria:0, outros_log:0, ...(faixa?.logistica || {}) } };
        }
        if (p.logistica && !window.confirm(`Voltar a herdar da faixa? Os valores próprios de "${p.cidade}" serão descartados.`)) return p;
        return { ...p, logistica: null };
      }),
    }));
  };

  const setValorPraca = (id, subKey, raw) => {
    setOrc(prev => ({
      ...prev,
      pracas: (prev.pracas || []).map(p => {
        if (p.id !== id || !p.logistica) return p;
        const v = String(raw).replace(/[^0-9.,\-]/g, "").replace(",", ".");
        return { ...p, logistica: { ...p.logistica, [subKey]: v === "" ? 0 : (parseFloat(v) || 0) } };
      }),
    }));
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {/* ── Faixas de distância ── */}
      <Card T={T}>
        <SectionHeader T={T} icon={Route} title="Logística por faixa de distância"
          subtitle="Valores por jogo — todo jogo herda a logística da faixa da sua praça"/>
        <div style={ts.wrap}>
          <table style={ts.table}>
            <thead style={ts.thead}>
              <tr>
                <th style={{...ts.th, ...ts.thLeft, minWidth:140}}>Faixa</th>
                {SUBS_LOGISTICA.map(sub => <th key={sub.key} style={{...ts.th, ...ts.thRight, minWidth:105}}>{sub.label}</th>)}
                <th style={{...ts.th, ...ts.thRight}}>Total / jogo</th>
                {!readOnly && <th style={ts.th}/>}
              </tr>
            </thead>
            <tbody>
              {faixas.map(f => (
                <tr key={f.key} style={ts.tr}>
                  <td style={{...ts.td, padding:"6px 14px"}}>
                    <input value={f.label} disabled={readOnly} onChange={e=>renomearFaixa(f.key, e.target.value)}
                      style={{...IS, maxWidth:130, fontWeight:600, fontSize:12, padding:"5px 8px", opacity:readOnly?0.7:1}}/>
                  </td>
                  {SUBS_LOGISTICA.map(sub => (
                    <td key={sub.key} style={{...ts.tdNum, padding:"6px 10px"}}>
                      <input
                        value={f.logistica?.[sub.key] ?? ""}
                        disabled={readOnly}
                        onChange={e=>setValorFaixa(f.key, sub.key, e.target.value)}
                        placeholder="0"
                        inputMode="decimal"
                        style={{
                          ...IS, maxWidth:100, textAlign:"right",
                          fontFamily:FONT.num, fontSize:12, padding:"5px 8px",
                          background: Number(f.logistica?.[sub.key]) ? "#16A34A0d" : (T.surface||T.bg),
                          opacity: readOnly ? 0.7 : 1,
                        }}/>
                    </td>
                  ))}
                  <td className="num" style={{...ts.tdNum, fontWeight:700}}>{fmt(totalFaixa(f))}</td>
                  {!readOnly && (
                    <td style={{...ts.td, padding:"6px 10px"}}>
                      <button title="Remover faixa" onClick={()=>removeFaixa(f.key)}
                        style={{border:"none",background:"transparent",cursor:"pointer",color:T.danger||"#DC2626",padding:4,display:"flex"}}>
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {faixas.length === 0 && (
                <tr><td colSpan={SUBS_LOGISTICA.length + 2} style={{...ts.td, color:T.textSm, fontSize:12}}>Nenhuma faixa — adicione abaixo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {!readOnly && (
          <div style={{padding:"12px 20px 18px",display:"flex",gap:8,alignItems:"center"}}>
            <input value={novaFaixa} onChange={e=>setNovaFaixa(e.target.value)}
              onKeyDown={e=>{ if (e.key === "Enter") addFaixa(); }}
              style={{...IS, maxWidth:180}} placeholder="Nova faixa (ex: SP600)..."/>
            <Button T={T} variant="secondary" size="sm" icon={Plus} onClick={addFaixa} disabled={!novaFaixa.trim()}>Adicionar faixa</Button>
          </div>
        )}
      </Card>

      {/* ── Praças ── */}
      <Card T={T}>
        <SectionHeader T={T} icon={MapPin} title="Praças"
          subtitle="Cada praça herda a logística da faixa OU define valores próprios (mesmos 5 campos)"/>
        <div style={ts.wrap}>
          <table style={{...ts.table, minWidth:560}}>
            <thead style={ts.thead}>
              <tr>
                <th style={{...ts.th, ...ts.thLeft}}>Cidade</th>
                <th style={{...ts.th, ...ts.thLeft}}>Faixa</th>
                <th style={{...ts.th, ...ts.thLeft}}>Logística</th>
                <th style={{...ts.th, ...ts.thRight}}>Logística / jogo</th>
                <th style={{...ts.th, ...ts.thRight}}>Jogos</th>
                {!readOnly && <th style={ts.th}/>}
              </tr>
            </thead>
            <tbody>
              {pracas.map(p => {
                const faixa = faixas.find(f => f.key === p.faixaKey);
                const propria = !!p.logistica;
                const { logistica } = logisticaDaPraca(orc, p);
                const totalLog = logistica ? SUBS_LOGISTICA.reduce((s, sub) => s + (Number(logistica[sub.key]) || 0), 0) : null;
                const jogosNaPraca = (orc.jogos || []).filter(j => j.pracaId === p.id).length;
                return [
                  <tr key={p.id} style={ts.tr}>
                    <td style={{...ts.td, padding:"6px 14px"}}>
                      <input value={p.cidade} disabled={readOnly} onChange={e=>patchPraca(p.id, {cidade:e.target.value})}
                        style={{...IS, maxWidth:220, fontSize:12, padding:"5px 8px", opacity:readOnly?0.7:1}}/>
                    </td>
                    <td style={{...ts.td, padding:"6px 14px"}}>
                      <select value={p.faixaKey} disabled={readOnly} onChange={e=>patchPraca(p.id, {faixaKey:e.target.value})}
                        style={{...IS, maxWidth:160, fontSize:12, padding:"5px 8px", opacity:readOnly?0.7:1,
                                borderColor: (faixa || propria) ? undefined : (T.danger||"#DC2626")}}>
                        {!faixa && <option value={p.faixaKey}>{propria ? "— (usa própria)" : "Faixa inválida"}</option>}
                        {faixas.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                    </td>
                    <td style={{...ts.td, padding:"6px 14px"}}>
                      <select value={propria ? "propria" : "faixa"} disabled={readOnly}
                        onChange={e=>setModoPraca(p.id, e.target.value)}
                        style={{...IS, maxWidth:150, fontSize:12, padding:"5px 8px", opacity:readOnly?0.7:1,
                                color: propria ? (T.warning||"#D97706") : T.text,
                                borderColor: propria ? (T.warning||"#D97706")+"88" : undefined}}>
                        <option value="faixa">Herda da faixa</option>
                        <option value="propria">Própria</option>
                      </select>
                    </td>
                    <td className="num" style={{...ts.tdNum, color: propria ? (T.warning||"#D97706") : T.text}}>
                      {totalLog != null ? fmt(totalLog) : "—"}
                    </td>
                    <td className="num" style={ts.tdNum}>{jogosNaPraca}</td>
                    {!readOnly && (
                      <td style={{...ts.td, padding:"6px 10px"}}>
                        <button title="Remover praça" onClick={()=>removePraca(p.id)}
                          style={{border:"none",background:"transparent",cursor:"pointer",color:T.danger||"#DC2626",padding:4,display:"flex"}}>
                          <Trash2 size={14}/>
                        </button>
                      </td>
                    )}
                  </tr>,
                  propria && (
                    <tr key={`${p.id}-log`} style={{background:T.surfaceAlt||T.bg}}>
                      <td colSpan={readOnly ? 5 : 6} style={{padding:"10px 20px", borderTop:`1px dashed ${T.border}`}}>
                        <div style={{display:"flex",gap:14,alignItems:"flex-end",flexWrap:"wrap"}}>
                          <span style={{fontSize:11,color:T.warning||"#D97706",fontWeight:700,paddingBottom:6}}>
                            Logística própria de {p.cidade}:
                          </span>
                          {SUBS_LOGISTICA.map(sub => (
                            <div key={sub.key}>
                              <label style={{display:"block",fontSize:10,color:T.textSm,fontWeight:600,marginBottom:3,letterSpacing:"0.04em",textTransform:"uppercase"}}>{sub.label}</label>
                              <input
                                value={p.logistica?.[sub.key] ?? ""}
                                disabled={readOnly}
                                onChange={e=>setValorPraca(p.id, sub.key, e.target.value)}
                                placeholder="0"
                                inputMode="decimal"
                                style={{
                                  ...IS, maxWidth:100, textAlign:"right",
                                  fontFamily:FONT.num, fontSize:12, padding:"5px 8px",
                                  background: Number(p.logistica?.[sub.key]) ? (T.warning||"#D97706")+"14" : (T.surface||T.bg),
                                  opacity: readOnly ? 0.7 : 1,
                                }}/>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
              {pracas.length === 0 && (
                <tr><td colSpan={6} style={{...ts.td, color:T.textSm, fontSize:12}}>Nenhuma praça — adicione abaixo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {!readOnly && (
          <div style={{padding:"12px 20px 18px",display:"flex",gap:8,alignItems:"center"}}>
            <input value={novaCidade} onChange={e=>setNovaCidade(e.target.value)}
              onKeyDown={e=>{ if (e.key === "Enter") addPraca(); }}
              style={{...IS, maxWidth:220}} placeholder="Nova praça (cidade)..."/>
            <Button T={T} variant="secondary" size="sm" icon={Plus} onClick={addPraca} disabled={!novaCidade.trim() || faixas.length === 0}>
              Adicionar praça
            </Button>
            {faixas.length === 0 && <span style={{fontSize:11,color:T.textSm}}>Crie ao menos uma faixa antes.</span>}
          </div>
        )}
      </Card>
    </div>
  );
}
