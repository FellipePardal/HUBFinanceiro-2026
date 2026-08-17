import { useState } from "react";
import { iSty, CATS, FONT } from "../../constants";
import { Card, SectionHeader, Button, Badge, tableStyles } from "../ui";
import { PADROES_SUGERIDOS } from "../../data/orcamentos";
import { fmt } from "../../utils";
import { Layers, Plus, Trash2, Copy } from "lucide-react";

// Premissas por padrão: o que compõe um jogo daquele padrão (pessoal +
// operações). A logística NÃO entra aqui — vem da faixa da praça.
export default function SubPremissas({ orc, setOrc, readOnly, T }) {
  const IS = iSty(T);
  const ts = tableStyles(T);
  const [novoPadrao, setNovoPadrao] = useState("");

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

  const gruposPremissa = [CATS[1], CATS[2]]; // pessoal + operações

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

      {/* ── Matriz de premissas ── */}
      {padroes.length > 0 && gruposPremissa.map(cat => (
        <Card T={T} key={cat.key}>
          <SectionHeader T={T} title={cat.label}
            subtitle={`Valores por jogo, para cada padrão — ${cat.subs.length} linhas`}
            icon={Layers}/>
          <div style={ts.wrap}>
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
          </div>
        </Card>
      ))}

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
