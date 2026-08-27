import { useMemo, useState } from "react";
import { FONT, iSty } from "../../constants";
import { Card, SectionHeader, Stat, Button } from "../ui";
import {
  diffBaseline, novaBaseline, GRUPOS_COMPARATIVO,
} from "../../data/orcamentos";
import { fmt, fmtK } from "../../utils";
import {
  GitCompareArrows, Wallet, TrendingUp, TrendingDown, Sparkles,
  Pencil, Check, Plus, X, Briefcase,
} from "lucide-react";

// Selos automáticos do comparativo — a cor fala de CUSTO (aumento = vermelho).
const SELOS = {
  addon:    { label: "ADD-ON",    color: "#8b5cf6" },
  aumento:  { label: "↑ aumento", color: "#DC2626" },
  reducao:  { label: "↓ redução", color: "#16A34A" },
  removido: { label: "removido",  color: "#6b7280" },
  igual:    { label: "=",         color: null },
};

const Selo = ({ status, T }) => {
  const s = SELOS[status];
  if (!s || !s.color) return <span style={{fontSize:11,color:T.textSm}}>=</span>;
  return (
    <span style={{
      fontSize:9.5, fontWeight:700, letterSpacing:"0.06em", whiteSpace:"nowrap",
      padding:"2px 8px", borderRadius:999,
      background:`${s.color}1c`, color:s.color, border:`1px solid ${s.color}44`,
    }}>{s.label}</span>
  );
};

const deltaCor = (delta, T) => delta > 0 ? "#DC2626" : delta < 0 ? "#16A34A" : T.textSm;
const fmtDelta = (delta) => delta === 0 ? "—" : `${delta > 0 ? "+" : "−"}${fmt(Math.abs(delta))}`;

const thStyle = (T, left) => ({
  padding:"11px 16px",
  textAlign:left ? "left" : "right",
  color:T.textSm,
  fontSize:10,
  fontWeight:700,
  letterSpacing:"0.06em",
  textTransform:"uppercase",
  whiteSpace:"nowrap",
  borderBottom:`1px solid ${T.border}`,
});

// ─── COMPARATIVO EDIÇÃO × EDIÇÃO ─────────────────────────────────────────────
// Base congelada (ex: orçamento aprovado de 2026) × orçamento atual, linha a
// linha, com selo automático. A base é editável aqui mesmo (modo edição).
export default function SubComparativo({ orc, setOrc, readOnly, T }) {
  const [editando, setEditando] = useState(false);
  const [novaLinha, setNovaLinha] = useState(null); // { grupo|secao, label, valor, subKey }
  const IS = iSty(T);
  const bl = orc.baseline || null;
  const diff = useMemo(() => diffBaseline(orc), [orc]);

  const patchBaseline = (fn) => setOrc(prev => prev.baseline ? ({ ...prev, baseline: fn(prev.baseline) }) : prev);

  const setValorBase = (baseItemId, campo, valor) => patchBaseline(b => ({
    ...b,
    [campo]: b[campo].map(i => i.id === baseItemId ? { ...i, valor: valor === "" ? 0 : (Number(valor) || 0) } : i),
  }));
  const removeBase = (baseItemId, campo) => patchBaseline(b => ({
    ...b, [campo]: b[campo].filter(i => i.id !== baseItemId),
  }));

  const addLinha = () => {
    if (!novaLinha || !String(novaLinha.label || "").trim()) return;
    const id = `bl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (novaLinha.tipo === "fixo") {
      patchBaseline(b => ({ ...b, fixos: [...b.fixos, { id, secao: novaLinha.secao, nome: novaLinha.label.trim(), valor: Number(novaLinha.valor) || 0 }] }));
    } else {
      patchBaseline(b => ({ ...b, itens: [...b.itens, {
        id, grupo: novaLinha.grupo, label: novaLinha.label.trim(),
        subKey: novaLinha.subKey || null, valor: Number(novaLinha.valor) || 0,
      }] }));
    }
    setNovaLinha(null);
  };

  // ── Sem base ainda: estado vazio ──
  if (!bl) {
    const edicaoAnterior = String((parseInt(orc.meta.edicao) || 0) - 1 || "anterior");
    return (
      <Card T={T}>
        <div style={{padding:"48px 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:12,textAlign:"center"}}>
          <GitCompareArrows size={36} color={T.textSm}/>
          <p style={{margin:0,fontSize:15,fontWeight:700,color:T.text}}>Nenhuma base de comparação ainda</p>
          <p style={{margin:0,fontSize:12.5,color:T.textMd,maxWidth:480,lineHeight:1.6}}>
            A base é o orçamento de referência da edição anterior (ex: {orc.meta.nome} {edicaoAnterior}).
            Com ela, este comparativo mostra linha a linha o que mudou — e marca automaticamente
            os <b>add-ons</b>, aumentos, reduções e remoções da edição atual.
          </p>
          {!readOnly && (
            <Button T={T} variant="primary" size="md" icon={Plus}
              onClick={() => setOrc(prev => ({ ...prev, baseline: novaBaseline(`${prev.meta.nome} ${edicaoAnterior}`) }))}>
              Criar base {orc.meta.nome} {edicaoAnterior}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const renderRow = (row, g, campoBase) => (
    <tr key={row.key} style={{borderTop:`1px solid ${T.border}`,opacity:row.status === "removido" ? 0.65 : 1}}>
      <td style={{padding:"10px 16px 10px 40px",whiteSpace:"nowrap",color:T.text,fontSize:12.5,fontWeight:500}}>
        {row.label}
        {row.labelBase && row.labelBase !== row.label && (
          <span style={{marginLeft:8,fontSize:10,color:T.textSm}}>(base: {row.labelBase})</span>
        )}
      </td>
      <td className="num" style={{padding:"10px 16px",textAlign:"right",whiteSpace:"nowrap",color:T.textMd,fontSize:12.5,fontFamily:FONT.num}}>
        {editando && row.baseItemId ? (
          <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
            <input
              defaultValue={row.base || ""}
              onBlur={e => setValorBase(row.baseItemId, campoBase, e.target.value)}
              style={{...IS, width:110, textAlign:"right", padding:"4px 8px", fontSize:12}}
              inputMode="numeric"
            />
            <button title="Remover linha da base" onClick={() => removeBase(row.baseItemId, campoBase)}
              style={{border:"none",background:"none",cursor:"pointer",color:T.danger||"#DC2626",padding:2,display:"flex"}}>
              <X size={13}/>
            </button>
          </span>
        ) : (row.base ? fmt(row.base) : "—")}
      </td>
      <td className="num" style={{padding:"10px 16px",textAlign:"right",whiteSpace:"nowrap",color:T.text,fontSize:12.5,fontWeight:600,fontFamily:FONT.num}}>
        {row.atual ? fmt(row.atual) : "—"}
      </td>
      <td className="num" style={{padding:"10px 16px",textAlign:"right",whiteSpace:"nowrap",fontSize:12.5,color:deltaCor(row.delta, T),fontFamily:FONT.num}}>
        {fmtDelta(row.delta)}
      </td>
      <td style={{padding:"10px 16px",textAlign:"right"}}><Selo status={row.status} T={T}/></td>
    </tr>
  );

  const renderHeaderGrupo = (titulo, color, tot, extra) => (
    <tr key={`hd_${titulo}`} style={{borderTop:`2px solid ${T.borderStrong||T.border}`,background:T.surfaceAlt||T.bg}}>
      <td style={{padding:"12px 16px",fontWeight:700,whiteSpace:"nowrap",color:T.text,fontSize:12.5}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
          <span style={{width:8,height:8,borderRadius:2,background:color,flexShrink:0}}/>
          {titulo}
        </span>
      </td>
      <td className="num" style={{padding:"12px 16px",textAlign:"right",color:T.textMd,fontSize:12.5,fontWeight:600,fontFamily:FONT.num}}>{fmt(tot.totalBase)}</td>
      <td className="num" style={{padding:"12px 16px",textAlign:"right",color:T.text,fontSize:12.5,fontWeight:700,fontFamily:FONT.num}}>{fmt(tot.totalAtual)}</td>
      <td className="num" style={{padding:"12px 16px",textAlign:"right",fontSize:12.5,fontWeight:600,color:deltaCor(tot.delta, T),fontFamily:FONT.num}}>{fmtDelta(tot.delta)}</td>
      <td style={{padding:"12px 16px",textAlign:"right"}}>{extra || null}</td>
    </tr>
  );

  const renderAddLinha = (tipo, grupoKey, secao) => {
    const aberta = novaLinha && ((tipo === "fixo" && novaLinha.secao === secao && novaLinha.tipo === "fixo")
      || (tipo !== "fixo" && novaLinha.grupo === grupoKey && novaLinha.tipo !== "fixo"));
    if (!editando) return null;
    if (!aberta) return (
      <tr key={`add_${tipo}_${grupoKey || secao}`}>
        <td colSpan={5} style={{padding:"4px 16px 10px 40px"}}>
          <button
            onClick={() => setNovaLinha(tipo === "fixo" ? { tipo:"fixo", secao, label:"", valor:"" } : { grupo:grupoKey, label:"", valor:"", subKey:"" })}
            style={{border:`1px dashed ${T.border}`,background:"none",cursor:"pointer",color:T.textMd,fontSize:11,padding:"4px 10px",borderRadius:6,display:"inline-flex",alignItems:"center",gap:6}}>
            <Plus size={12}/> linha da base
          </button>
        </td>
      </tr>
    );
    const grupo = GRUPOS_COMPARATIVO.find(g => g.key === grupoKey);
    return (
      <tr key={`add_${tipo}_${grupoKey || secao}`} style={{background:T.surfaceAlt||T.bg}}>
        <td colSpan={5} style={{padding:"8px 16px 12px 40px"}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <input autoFocus placeholder="Nome do serviço na base" value={novaLinha.label}
              onChange={e => setNovaLinha(n => ({ ...n, label: e.target.value }))}
              style={{...IS, width:240, padding:"5px 10px", fontSize:12}}/>
            <input placeholder="Valor 2026" value={novaLinha.valor} inputMode="numeric"
              onChange={e => setNovaLinha(n => ({ ...n, valor: e.target.value.replace(/[^0-9.,]/g, "") }))}
              style={{...IS, width:120, padding:"5px 10px", fontSize:12, textAlign:"right"}}/>
            {tipo !== "fixo" && (
              <select value={novaLinha.subKey} onChange={e => setNovaLinha(n => ({ ...n, subKey: e.target.value }))}
                style={{...IS, width:190, padding:"5px 10px", fontSize:12}}>
                <option value="">— sem serviço equivalente —</option>
                {(grupo?.subs || []).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            )}
            <Button T={T} variant="primary" size="sm" icon={Check} onClick={addLinha}>Adicionar</Button>
            <Button T={T} variant="secondary" size="sm" onClick={() => setNovaLinha(null)}>Cancelar</Button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {/* ── KPIs ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
        <Stat T={T} label={`Base · ${bl.label}`} value={fmtK(diff.totalBase)} sub={fmt(diff.totalBase)} color={T.textMd||"#6b7280"} icon={Wallet}/>
        <Stat T={T} label={`Atual · ${orc.meta.nome} ${orc.meta.edicao}`} value={fmtK(diff.totalAtual)} sub={fmt(diff.totalAtual)} color={T.info||"#2563EB"} icon={Wallet}/>
        <Stat T={T} label="Variação" value={fmtDelta(diff.delta)}
          sub={diff.totalBase ? `${diff.delta >= 0 ? "+" : ""}${((diff.delta / diff.totalBase) * 100).toFixed(1)}% vs base` : "—"}
          color={deltaCor(diff.delta, T)} icon={diff.delta >= 0 ? TrendingUp : TrendingDown}/>
        <Stat T={T} label="Add-ons" value={String(diff.numAddons)} sub="Serviços novos nesta edição" color="#8b5cf6" icon={Sparkles}/>
      </div>

      {/* ── Tabela comparativa ── */}
      <Card T={T}>
        <SectionHeader
          T={T}
          title={`Comparativo · ${bl.label} × ${orc.meta.nome} ${orc.meta.edicao}`}
          subtitle="Linha a linha por serviço — selo automático: add-on, aumento, redução ou removido"
          icon={GitCompareArrows}
          right={!readOnly ? (
            <Button T={T} variant={editando ? "primary" : "secondary"} size="sm" icon={editando ? Check : Pencil}
              onClick={() => { setEditando(v => !v); setNovaLinha(null); }}>
              {editando ? "Concluir edição" : "Editar base"}
            </Button>
          ) : null}
        />
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
            <thead>
              <tr style={{background:T.surfaceAlt||T.bg}}>
                <th style={thStyle(T, true)}>Serviço</th>
                <th style={thStyle(T)}>{bl.label}</th>
                <th style={thStyle(T)}>{orc.meta.nome} {orc.meta.edicao}</th>
                <th style={thStyle(T)}>Δ</th>
                <th style={thStyle(T)}>Selo</th>
              </tr>
            </thead>
            <tbody>
              {diff.grupos.map(g => (g.rows.length > 0 || editando) ? [
                renderHeaderGrupo(g.label, g.color, g),
                ...g.rows.map(row => renderRow(row, g, "itens")),
                renderAddLinha("var", g.key),
              ] : null)}

              {(diff.fixos.length > 0 || editando) && renderHeaderGrupo(
                "Serviços Fixos", "#a855f7",
                {
                  totalBase: diff.fixos.reduce((s, f) => s + f.totalBase, 0),
                  totalAtual: diff.fixos.reduce((s, f) => s + f.totalAtual, 0),
                  delta: diff.fixos.reduce((s, f) => s + f.delta, 0),
                },
                <Briefcase size={13} color={T.textSm}/>
              )}
              {diff.fixos.map(sec => [
                <tr key={`sec_${sec.secao}`} style={{borderTop:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg}}>
                  <td style={{padding:"8px 16px 6px 40px",fontSize:10,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:T.textSm}}>{sec.secao}</td>
                  <td className="num" style={{padding:"8px 16px",textAlign:"right",fontSize:11,color:T.textSm,fontFamily:FONT.num}}>{fmt(sec.totalBase)}</td>
                  <td className="num" style={{padding:"8px 16px",textAlign:"right",fontSize:11,color:T.textSm,fontFamily:FONT.num,fontWeight:600}}>{fmt(sec.totalAtual)}</td>
                  <td className="num" style={{padding:"8px 16px",textAlign:"right",fontSize:11,color:deltaCor(sec.delta, T),fontFamily:FONT.num}}>{fmtDelta(sec.delta)}</td>
                  <td/>
                </tr>,
                ...sec.rows.map(row => renderRow(row, sec, "fixos")),
                renderAddLinha("fixo", null, sec.secao),
              ])}
              {editando && diff.fixos.length === 0 && renderAddLinha("fixo", null, "Serviços")}

              <tr style={{borderTop:`2px solid ${T.borderStrong||T.border}`,background:T.surfaceAlt||T.bg,fontWeight:700}}>
                <td style={{padding:"14px 16px",color:T.text,fontSize:12,letterSpacing:"0.04em",textTransform:"uppercase"}}>Total Geral</td>
                <td className="num" style={{padding:"14px 16px",textAlign:"right",color:T.textMd,whiteSpace:"nowrap",fontSize:14,fontWeight:600,fontFamily:FONT.num}}>{fmt(diff.totalBase)}</td>
                <td className="num" style={{padding:"14px 16px",textAlign:"right",color:T.info||"#2563EB",whiteSpace:"nowrap",fontSize:14,fontWeight:700,fontFamily:FONT.num}}>{fmt(diff.totalAtual)}</td>
                <td className="num" style={{padding:"14px 16px",textAlign:"right",whiteSpace:"nowrap",fontSize:14,fontWeight:700,color:deltaCor(diff.delta, T),fontFamily:FONT.num}}>{fmtDelta(diff.delta)}</td>
                <td/>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{margin:0,padding:"10px 16px 14px",fontSize:11,color:T.textSm,lineHeight:1.5}}>
          Base importada em {new Date(bl.importadoEm).toLocaleDateString("pt-BR")} — os valores da base são congelados e
          editáveis aqui; o lado atual é sempre o orçamento vivo (jogos × premissas + serviços fixos).
        </p>
      </Card>
    </div>
  );
}
