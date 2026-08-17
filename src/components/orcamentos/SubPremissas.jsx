import { useState } from "react";
import { iSty, FONT } from "../../constants";
import { Card, SectionHeader, Button, Badge, tableStyles } from "../ui";
import { PADROES_SUGERIDOS, GRUPOS_PREMISSA, SERVICOS_PADRAO_FAIXA, umKeyDoPadrao } from "../../data/orcamentos";
import { fmt } from "../../utils";
import { Layers, Plus, Trash2, Copy, ChevronDown, ChevronUp, Route } from "lucide-react";

// Premissas por padrão: o que compõe um jogo daquele padrão (pessoal +
// operações). A logística NÃO entra aqui — vem da faixa da praça.
export default function SubPremissas({ orc, setOrc, readOnly, T }) {
  const IS = iSty(T);
  const ts = tableStyles(T);
  const [novoPadrao, setNovoPadrao] = useState("");
  // Grupos da matriz recolhidos por padrão — a tabela é grande; abre o que precisa.
  const [abertos, setAbertos] = useState({});
  const toggleAberto = (key) => setAbertos(prev => ({ ...prev, [key]: !prev[key] }));

  const padroes = orc.padroes || [];

  const addPadrao = (nome) => {
    const p = String(nome || "").trim();
    if (!p || padroes.includes(p)) return;
    setOrc(prev => ({
      ...prev,
      padroes: [...(prev.padroes || []), p],
      premissas: { ...prev.premissas, [p]: prev.premissas?.[p] || {} },
    }));
    setNovoPadrao("");
  };

  const removePadrao = (p) => {
    const emUso = (orc.jogos || []).filter(j => j.padrao === p).length;
    if (emUso > 0) { window.alert(`O padrão "${p}" está em uso por ${emUso} jogo(s). Troque o padrão desses jogos antes de remover.`); return; }
    if (!window.confirm(`Remover o padrão "${p}" e suas premissas?`)) return;
    setOrc(prev => {
      const premissas = { ...prev.premissas };
      delete premissas[p];
      return { ...prev, padroes: (prev.padroes || []).filter(x => x !== p), premissas };
    });
  };

  const duplicarPadrao = (p) => {
    const novo = window.prompt(`Duplicar as premissas de "${p}" para um novo padrão. Nome do novo padrão:`, `${p} copy`);
    const nome = String(novo || "").trim();
    if (!nome) return;
    if (padroes.includes(nome)) { window.alert(`O padrão "${nome}" já existe.`); return; }
    setOrc(prev => ({
      ...prev,
      padroes: [...(prev.padroes || []), nome],
      premissas: { ...prev.premissas, [nome]: { ...(prev.premissas?.[p] || {}) } },
    }));
  };

  const setValor = (p, subKey, raw) => {
    setOrc(prev => {
      const atual = { ...(prev.premissas?.[p] || {}) };
      const v = String(raw).replace(/[^0-9.,\-]/g, "").replace(",", ".");
      if (v === "" || v === "-") delete atual[subKey];
      else atual[subKey] = parseFloat(v) || 0;
      return { ...prev, premissas: { ...prev.premissas, [p]: atual } };
    });
  };

  const totalPadrao = (p) =>
    Object.values(orc.premissas?.[p] || {}).reduce((s, v) => s + (Number(v) || 0), 0);

  // Matriz padrão × faixa: célula vazia herda a premissa base do padrão.
  const setValorFaixaMatriz = (p, faixaKey, servKey, raw) => {
    setOrc(prev => {
      const doPadrao = { ...(prev.premissasFaixa?.[p] || {}) };
      const daFaixa = { ...(doPadrao[faixaKey] || {}) };
      const v = String(raw).replace(/[^0-9.,\-]/g, "").replace(",", ".");
      if (v === "" || v === "-") delete daFaixa[servKey];
      else daFaixa[servKey] = parseFloat(v) || 0;
      if (Object.keys(daFaixa).length === 0) delete doPadrao[faixaKey];
      else doPadrao[faixaKey] = daFaixa;
      return { ...prev, premissasFaixa: { ...(prev.premissasFaixa || {}), [p]: doPadrao } };
    });
  };

  const basePadraoServico = (p, servKey) => {
    const prem = orc.premissas?.[p] || {};
    if (servKey === "um") return Number(prem[umKeyDoPadrao(orc, p)]) || 0;
    return Number(prem[servKey]) || 0;
  };

  const gruposPremissa = GRUPOS_PREMISSA; // Pessoal · Operações · Livemode (NF por jogo)

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {/* ── Padrões ── */}
      <Card T={T}>
        <SectionHeader T={T} icon={Layers} title="Padrões deste orçamento"
          subtitle="Categorias de jogo (ex.: B1, B2, B3, B3+) — cada uma tem sua premissa de custos"/>
        <div style={{padding:20}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            {padroes.map(p => (
              <div key={p} style={{display:"inline-flex",alignItems:"center",gap:6}}>
                <Badge T={T} color={T.info||"#3b82f6"}>{p}</Badge>
                {!readOnly && (
                  <>
                    <button title={`Duplicar ${p}`} onClick={()=>duplicarPadrao(p)}
                      style={{border:"none",background:"transparent",cursor:"pointer",color:T.textSm,padding:2,display:"flex"}}>
                      <Copy size={12}/>
                    </button>
                    <button title={`Remover ${p}`} onClick={()=>removePadrao(p)}
                      style={{border:"none",background:"transparent",cursor:"pointer",color:T.danger||"#DC2626",padding:2,display:"flex"}}>
                      <Trash2 size={12}/>
                    </button>
                  </>
                )}
              </div>
            ))}
            {padroes.length === 0 && <p style={{margin:0,fontSize:12,color:T.textSm}}>Nenhum padrão ainda — adicione abaixo.</p>}
          </div>

          {!readOnly && (
            <div style={{display:"flex",gap:8,marginTop:14,alignItems:"center",flexWrap:"wrap"}}>
              <input value={novoPadrao} onChange={e=>setNovoPadrao(e.target.value)}
                onKeyDown={e=>{ if (e.key === "Enter") addPadrao(novoPadrao); }}
                style={{...IS, maxWidth:160}} placeholder="Novo padrão..."/>
              <Button T={T} variant="primary" size="sm" icon={Plus} onClick={()=>addPadrao(novoPadrao)} disabled={!novoPadrao.trim()}>
                Adicionar
              </Button>
              <span style={{fontSize:11,color:T.textSm}}>Sugestões:</span>
              {PADROES_SUGERIDOS.filter(s => !padroes.includes(s)).map(s => (
                <button key={s} onClick={()=>addPadrao(s)} style={{
                  border:`1px dashed ${T.borderStrong||T.border}`,
                  background:"transparent",
                  borderRadius:6,
                  padding:"3px 10px",
                  fontSize:11,
                  color:T.textMd,
                  cursor:"pointer",
                  fontFamily:FONT.ui,
                }}>{s}</button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ── Matriz de premissas (grupos recolhíveis) ── */}
      {padroes.length > 0 && gruposPremissa.map(cat => {
        const aberto = !!abertos[cat.key];
        const resumoFechado = padroes
          .map(p => `${p} ${fmt(cat.subs.reduce((s, sub) => s + (Number(orc.premissas?.[p]?.[sub.key]) || 0), 0))}`)
          .join(" · ");
        return (
        <Card T={T} key={cat.key}>
          <button onClick={()=>toggleAberto(cat.key)} style={{
            width:"100%",
            padding:"14px 20px",
            border:"none",
            borderBottom: aberto ? `1px solid ${T.border}` : "none",
            background:"transparent",
            cursor:"pointer",
            display:"flex",
            alignItems:"center",
            justifyContent:"space-between",
            gap:12,
            textAlign:"left",
            fontFamily:FONT.ui,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
              <div style={{
                width:32, height:32, borderRadius:8,
                background:cat.color+"14", color:cat.color,
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              }}>
                <Layers size={16} strokeWidth={2.25}/>
              </div>
              <div style={{minWidth:0}}>
                <h3 style={{margin:0,fontSize:13,fontWeight:600,color:T.text,letterSpacing:"-0.005em"}}>{cat.label}</h3>
                <p style={{margin:"2px 0 0",fontSize:11,color:T.textSm,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  {aberto ? `Valores por jogo, para cada padrão — ${cat.subs.length} linhas` : resumoFechado}
                </p>
              </div>
            </div>
            <span style={{display:"inline-flex",alignItems:"center",gap:6,color:T.textMd,fontSize:11,fontWeight:600,flexShrink:0}}>
              {aberto ? "Ocultar" : "Mostrar"}
              {aberto ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
            </span>
          </button>
          {aberto && <div style={ts.wrap}>
            <table style={ts.table}>
              <thead style={ts.thead}>
                <tr>
                  <th style={{...ts.th, ...ts.thLeft}}>Serviço</th>
                  {padroes.map(p => <th key={p} style={{...ts.th, ...ts.thRight, minWidth:110}}>{p}</th>)}
                </tr>
              </thead>
              <tbody>
                {cat.subs.map(sub => (
                  <tr key={sub.key} style={ts.tr}>
                    <td style={{...ts.td, color: cat.color, fontWeight:500, fontSize:12}}>{sub.label}</td>
                    {padroes.map(p => {
                      const v = orc.premissas?.[p]?.[sub.key];
                      return (
                        <td key={p} style={{...ts.tdNum, padding:"6px 10px"}}>
                          <input
                            value={v ?? ""}
                            disabled={readOnly}
                            onChange={e=>setValor(p, sub.key, e.target.value)}
                            placeholder="0"
                            inputMode="decimal"
                            style={{
                              ...IS,
                              maxWidth:110,
                              textAlign:"right",
                              fontFamily:FONT.num,
                              fontSize:12,
                              padding:"5px 8px",
                              background: v ? (cat.color+"0d") : (T.surface||T.bg),
                              opacity: readOnly ? 0.7 : 1,
                            }}/>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr style={ts.totalRow}>
                  <td style={{...ts.td, fontWeight:700, fontSize:12}}>Total {cat.label}</td>
                  {padroes.map(p => {
                    const t = cat.subs.reduce((s, sub) => s + (Number(orc.premissas?.[p]?.[sub.key]) || 0), 0);
                    return <td key={p} style={{...ts.tdNum, fontWeight:700}}>{fmt(t)}</td>;
                  })}
                </tr>
              </tbody>
            </table>
          </div>}
        </Card>
        );
      })}

      {/* ── Matriz padrão × faixa: UM / Geradores / SNG (lógica da cotação) ── */}
      {padroes.length > 0 && (() => {
        const faixas = orc.faixas || [];
        const aberto = !!abertos["padrao_faixa"];
        return (
          <Card T={T}>
            <button onClick={()=>toggleAberto("padrao_faixa")} style={{
              width:"100%",
              padding:"14px 20px",
              border:"none",
              borderBottom: aberto ? `1px solid ${T.border}` : "none",
              background:"transparent",
              cursor:"pointer",
              display:"flex",
              alignItems:"center",
              justifyContent:"space-between",
              gap:12,
              textAlign:"left",
              fontFamily:FONT.ui,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
                <div style={{
                  width:32, height:32, borderRadius:8,
                  background:"#D9770614", color:"#D97706",
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                }}>
                  <Route size={16} strokeWidth={2.25}/>
                </div>
                <div style={{minWidth:0}}>
                  <h3 style={{margin:0,fontSize:13,fontWeight:600,color:T.text,letterSpacing:"-0.005em"}}>Operações por Distância — UM · Geradores · SNG</h3>
                  <p style={{margin:"2px 0 0",fontSize:11,color:T.textSm}}>
                    Valor por padrão × faixa, como na cotação enviada às produtoras. Célula vazia herda a premissa base do padrão.
                  </p>
                </div>
              </div>
              <span style={{display:"inline-flex",alignItems:"center",gap:6,color:T.textMd,fontSize:11,fontWeight:600,flexShrink:0}}>
                {aberto ? "Ocultar" : "Mostrar"}
                {aberto ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
              </span>
            </button>
            {aberto && (faixas.length === 0 ? (
              <p style={{margin:0,padding:"14px 20px",fontSize:12,color:T.warning||"#D97706"}}>
                Crie as faixas de distância na aba Praças & Logística para preencher esta matriz.
              </p>
            ) : (
              <div style={{padding:"6px 0 8px"}}>
                {SERVICOS_PADRAO_FAIXA.map(serv => (
                  <div key={serv.key}>
                    <p style={{margin:0,padding:"10px 20px 2px",fontSize:11,color:T.textMd,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"}}>
                      {serv.label}{serv.key === "um" ? " (vai para a linha UM do padrão)" : ""}
                    </p>
                    <div style={ts.wrap}>
                      <table style={{...ts.table, minWidth:420}}>
                        <thead style={ts.thead}>
                          <tr>
                            <th style={{...ts.th, ...ts.thLeft, minWidth:120}}>Padrão</th>
                            {faixas.map(f => <th key={f.key} style={{...ts.th, ...ts.thRight, minWidth:110}}>{f.label}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {padroes.map(p => (
                            <tr key={p} style={ts.tr}>
                              <td style={{...ts.td, fontSize:12, fontWeight:600}}>{p}</td>
                              {faixas.map(f => {
                                const v = orc.premissasFaixa?.[p]?.[f.key]?.[serv.key];
                                const temValor = v != null && v !== "";
                                return (
                                  <td key={f.key} style={{...ts.tdNum, padding:"6px 10px"}}>
                                    <input
                                      value={temValor ? v : ""}
                                      disabled={readOnly}
                                      onChange={e=>setValorFaixaMatriz(p, f.key, serv.key, e.target.value)}
                                      placeholder={String(basePadraoServico(p, serv.key))}
                                      inputMode="decimal"
                                      style={{
                                        ...IS, maxWidth:110, textAlign:"right",
                                        fontFamily:FONT.num, fontSize:12, padding:"5px 8px",
                                        background: temValor ? "#D9770614" : (T.surface||T.bg),
                                        borderColor: temValor ? "#D9770688" : undefined,
                                        opacity: readOnly ? 0.7 : 1,
                                      }}/>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </Card>
        );
      })()}

      {/* ── Total geral por padrão ── */}
      {padroes.length > 0 && (
        <Card T={T}>
          <div style={{padding:"14px 20px",display:"flex",gap:24,flexWrap:"wrap"}}>
            {padroes.map(p => (
              <div key={p}>
                <p style={{margin:0,fontSize:10,color:T.textSm,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600}}>
                  Premissa {p} (sem logística)
                </p>
                <p className="num" style={{margin:"4px 0 0",fontSize:18,fontWeight:700,color:T.text,fontFamily:FONT.num}}>{fmt(totalPadrao(p))}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
