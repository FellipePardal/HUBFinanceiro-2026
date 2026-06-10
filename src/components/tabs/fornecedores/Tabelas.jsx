import { useState, useMemo } from "react";
import { RADIUS } from "../../../constants";
import { Button, Badge } from "../../ui";
import {
  Trophy, Building2, Camera, Users,
} from "lucide-react";
import { fmt } from "../../../utils";

const CAT_META = {
  periferico: { label: "Periféricos",        color: "#3b82f6", Icon: Camera },
  equipe:     { label: "Equipe Operacional", color: "#f59e0b", Icon: Users  },
};

// ── helpers ──────────────────────────────────────────────────────────────────
function getAtrib(atribuicoes, itemId) {
  return atribuicoes.find(a => a.itemId === itemId) ?? { itemId, fornecedorId: null, valores: {} };
}

// ════════════════════════════════════════════════════════════════════════════
export default function Tabelas({
  fornecedores,
  cidades,
  campeonatos,
  setCampeonatos,
  filtroCampeonato = "todos",
  T,
}) {
  const [selectedId, setSelectedId] = useState(() => {
    if (filtroCampeonato !== "todos") return filtroCampeonato;
    return campeonatos[0]?.id ?? null;
  });

  const camp          = campeonatos.find(c => c.id === selectedId) ?? null;
  const cidadesDoCamp = useMemo(() =>
    (camp?.cidadeIds ?? []).map(id => cidades.find(c => c.id === id)).filter(Boolean),
    [camp, cidades]
  );
  const categorias = camp?.categorias ?? [];
  const itens      = camp?.itens ?? [];
  const atribuicoes = camp?.orcamento?.atribuicoes ?? [];

  const fornById = useMemo(() =>
    Object.fromEntries(fornecedores.map(f => [String(f.id), f])),
    [fornecedores]
  );

  const itensPorCat = useMemo(() => {
    const map = { periferico: [], equipe: [] };
    itens.forEach(it => {
      const k = it.categoria ?? "equipe";
      if (map[k]) map[k].push(it);
    });
    return map;
  }, [itens]);

  // ── writers (functional updater to avoid stale closure) ──────────────────
  const setFornecedor = (itemId, val) => {
    setCampeonatos(list => {
      const c = list.find(x => x.id === selectedId);
      if (!c) return list;
      const prev = c.orcamento?.atribuicoes ?? [];
      const cur  = prev.find(a => a.itemId === itemId) ?? { itemId, fornecedorId: null, valores: {} };
      const upd  = { ...cur, fornecedorId: val ? Number(val) : null };
      const next = prev.some(a => a.itemId === itemId)
        ? prev.map(a => a.itemId === itemId ? upd : a)
        : [...prev, upd];
      return list.map(x => x.id === selectedId ? { ...x, orcamento: { atribuicoes: next } } : x);
    });
  };

  const setValor = (itemId, cidadeId, catCodigo, raw) => {
    const v = raw === "" ? null : parseFloat(raw);
    setCampeonatos(list => {
      const c = list.find(x => x.id === selectedId);
      if (!c) return list;
      const prev   = c.orcamento?.atribuicoes ?? [];
      const cur    = prev.find(a => a.itemId === itemId) ?? { itemId, fornecedorId: null, valores: {} };
      const valores = { ...(cur.valores ?? {}) };
      const byCity  = { ...(valores[cidadeId] ?? {}) };
      if (v === null || isNaN(v)) delete byCity[catCodigo];
      else byCity[catCodigo] = v;
      if (!Object.keys(byCity).length) delete valores[cidadeId];
      else valores[cidadeId] = byCity;
      const upd  = { ...cur, valores };
      const next = prev.some(a => a.itemId === itemId)
        ? prev.map(a => a.itemId === itemId ? upd : a)
        : [...prev, upd];
      return list.map(x => x.id === selectedId ? { ...x, orcamento: { atribuicoes: next } } : x);
    });
  };

  // ── totais por cidade × categoria ─────────────────────────────────────────
  const totais = useMemo(() => {
    const map = {};
    atribuicoes.forEach(a => {
      Object.entries(a.valores ?? {}).forEach(([cidadeId, cats]) => {
        Object.entries(cats).forEach(([cat, val]) => {
          const k = `${cidadeId}:${cat}`;
          map[k] = (map[k] ?? 0) + Number(val);
        });
      });
    });
    return map;
  }, [atribuicoes]);

  const hasTotais = Object.keys(totais).length > 0;

  // ── styles ────────────────────────────────────────────────────────────────
  const cellStyle = hasVal => ({
    background: hasVal ? "rgba(16,185,129,0.08)" : "transparent",
    border: `1px solid ${hasVal ? "rgba(16,185,129,0.30)" : T.border}`,
    borderRadius: RADIUS.sm,
    color: T.text,
    padding: "4px 6px",
    fontSize: 12,
    fontWeight: hasVal ? 700 : 400,
    width: "100%",
    minWidth: 76,
    textAlign: "right",
    boxSizing: "border-box",
    fontFamily: "'JetBrains Mono',ui-monospace,monospace",
    outline: "none",
  });

  const stickyBg = T.surface || T.card;

  // ── campeonato summary ────────────────────────────────────────────────────
  const campNAtrib = atribuicoes.filter(a => a.fornecedorId).length;
  const campNItens  = itens.length;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "220px 1fr",
      border: `1px solid ${T.border}`,
      borderRadius: RADIUS.lg,
      overflow: "hidden",
      minHeight: "72vh",
      background: T.surface || T.card,
    }}>

      {/* ── Left: campeonato list ─────────────────────────────────────────── */}
      <div style={{ borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Campeonatos</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {!campeonatos.length ? (
            <div style={{ padding: 20, textAlign: "center", color: T.textSm, fontSize: 12 }}>
              Nenhum campeonato. Crie em Catálogos.
            </div>
          ) : campeonatos.map(c => {
            const isSel  = c.id === selectedId;
            const nItens = (c.itens ?? []).length;
            const nAtrib = (c.orcamento?.atribuicoes ?? []).filter(a => a.fornecedorId).length;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  padding: "11px 14px",
                  cursor: "pointer",
                  borderBottom: `1px solid ${T.border}`,
                  borderLeft: `3px solid ${isSel ? (T.brand || "#10b981") : "transparent"}`,
                  background: isSel ? (T.brandSoft || "rgba(16,185,129,0.06)") : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                  <Trophy size={12} color={c.ativo ? (T.brand || "#10b981") : T.textSm} />
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: isSel ? (T.brand || "#10b981") : T.text,
                    flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{c.nome}</span>
                </div>
                <div style={{ fontSize: 11, color: T.textSm }}>
                  {nItens} item{nItens !== 1 ? "s" : ""} · {nAtrib}/{nItens} com fornecedor
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: orçamento editor ───────────────────────────────────────── */}
      {!camp ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: T.textSm }}>
          <Trophy size={32} color={T.border} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Selecione um campeonato</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt || T.bg, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
              <Trophy size={16} color={T.brand || "#10b981"} />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>{camp.nome}</h2>
              {camp.ativo
                ? <Badge T={T} color={T.brand || "#10b981"} size="sm">Ativo</Badge>
                : <Badge T={T} color={T.textSm} size="sm">Inativo</Badge>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              {categorias.map(cat => (
                <span key={cat.codigo} style={{
                  padding: "2px 7px", borderRadius: RADIUS.pill,
                  background: T.brandSoft || "rgba(16,185,129,0.1)",
                  color: T.brand || "#10b981", fontSize: 11, fontWeight: 700,
                }}>{cat.codigo}</span>
              ))}
              <span style={{ fontSize: 12, color: T.textSm }}>{cidadesDoCamp.length} cidade{cidadesDoCamp.length !== 1 ? "s" : ""}</span>
              <span style={{ fontSize: 12, color: T.textSm }}>·</span>
              <span style={{ fontSize: 12, color: T.textSm }}>{campNAtrib}/{campNItens} itens com fornecedor</span>
            </div>
          </div>

          {!itens.length ? (
            <div style={{ padding: 32, textAlign: "center", color: T.textSm, fontSize: 12 }}>
              Nenhum item neste campeonato. Edite em Catálogos → Campeonatos para adicionar itens.
            </div>
          ) : (
            <div style={{ flex: 1, overflow: "auto", padding: "0 0 20px" }}>
              <table style={{ borderCollapse: "separate", borderSpacing: 0, fontSize: 12 }}>
                <colgroup>
                  <col style={{ width: 160 }} />
                  <col style={{ width: 160 }} />
                  {cidadesDoCamp.flatMap(c =>
                    categorias.map(cat => <col key={`${c.id}-${cat.codigo}`} style={{ width: 88 }} />)
                  )}
                </colgroup>

                <thead>
                  <tr>
                    {/* Item col header */}
                    <th style={{
                      position: "sticky", top: 0, left: 0, zIndex: 3,
                      background: T.surfaceAlt || T.bg,
                      padding: "9px 14px", textAlign: "left",
                      borderBottom: `1px solid ${T.border}`,
                      borderRight: `1px solid ${T.border}`,
                      fontSize: 11, fontWeight: 700, color: T.textMd,
                      whiteSpace: "nowrap",
                    }}>Item</th>

                    {/* Fornecedor col header */}
                    <th style={{
                      position: "sticky", top: 0, left: 160, zIndex: 3,
                      background: T.surfaceAlt || T.bg,
                      padding: "9px 12px", textAlign: "left",
                      borderBottom: `1px solid ${T.border}`,
                      borderRight: `2px solid ${T.border}`,
                      fontSize: 11, fontWeight: 700, color: T.textMd,
                      whiteSpace: "nowrap",
                    }}>Fornecedor</th>

                    {/* Cidade × Categoria col headers */}
                    {cidadesDoCamp.flatMap(cidade =>
                      categorias.map((cat, i) => (
                        <th key={`${cidade.id}-${cat.codigo}`} style={{
                          position: "sticky", top: 0, zIndex: 2,
                          background: T.surfaceAlt || T.bg,
                          padding: "9px 8px", textAlign: "center",
                          borderBottom: `1px solid ${T.border}`,
                          borderRight: i === categorias.length - 1 ? `1px solid ${T.border}` : "none",
                          fontSize: 11, fontWeight: 700, color: T.text,
                          whiteSpace: "nowrap",
                        }}>
                          {cidade.nome.length > 10 ? cidade.uf : cidade.nome}/{cat.codigo}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>

                <tbody>
                  {["periferico", "equipe"].map(catKey => {
                    const items = itensPorCat[catKey];
                    if (!items.length) return null;
                    const { label, color, Icon } = CAT_META[catKey];

                    return [
                      // Category group header row
                      <tr key={`grp-${catKey}`}>
                        <td
                          colSpan={2 + cidadesDoCamp.length * categorias.length}
                          style={{
                            padding: "7px 14px",
                            fontSize: 10, fontWeight: 800,
                            color, letterSpacing: "0.06em", textTransform: "uppercase",
                            background: `${color}10`,
                            borderBottom: `1px solid ${T.border}`,
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Icon size={10} />{label}
                          </span>
                        </td>
                      </tr>,

                      // Item rows
                      ...items.map(item => {
                        const atrib = getAtrib(atribuicoes, item.id);
                        const forn  = atrib.fornecedorId ? fornById[String(atrib.fornecedorId)] : null;

                        return (
                          <tr key={item.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                            {/* Item name */}
                            <td style={{
                              position: "sticky", left: 0, zIndex: 1,
                              background: stickyBg,
                              padding: "7px 14px",
                              borderRight: `1px solid ${T.border}`,
                              fontWeight: 600, color: T.text, fontSize: 12,
                              whiteSpace: "nowrap",
                            }}>
                              {item.nome}
                            </td>

                            {/* Fornecedor selector */}
                            <td style={{
                              position: "sticky", left: 160, zIndex: 1,
                              background: stickyBg,
                              padding: "5px 8px",
                              borderRight: `2px solid ${T.border}`,
                            }}>
                              <select
                                value={atrib.fornecedorId ?? ""}
                                onChange={e => setFornecedor(item.id, e.target.value)}
                                style={{
                                  width: "100%",
                                  background: "transparent",
                                  border: `1px solid ${forn ? (T.brand || "#10b981") : T.border}`,
                                  borderRadius: RADIUS.sm,
                                  color: forn ? (T.brand || "#10b981") : T.textSm,
                                  fontSize: 11,
                                  fontWeight: forn ? 700 : 400,
                                  padding: "4px 6px",
                                  outline: "none",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                <option value="">— Sem fornecedor —</option>
                                {[...fornecedores]
                                  .sort((a, b) => (a.apelido || "").localeCompare(b.apelido || ""))
                                  .map(f => (
                                    <option key={f.id} value={f.id}>{f.apelido}</option>
                                  ))}
                              </select>
                            </td>

                            {/* Value cells */}
                            {cidadesDoCamp.flatMap(cidade =>
                              categorias.map((cat, i) => {
                                const val    = atrib.valores?.[cidade.id]?.[cat.codigo] ?? null;
                                const hasVal = val !== null && val !== undefined;
                                return (
                                  <td
                                    key={`${cidade.id}-${cat.codigo}`}
                                    style={{
                                      padding: "3px 3px",
                                      borderRight: i === categorias.length - 1 ? `1px solid ${T.border}` : "none",
                                    }}
                                  >
                                    <input
                                      type="number"
                                      key={`${selectedId}-${item.id}-${cidade.id}-${cat.codigo}`}
                                      defaultValue={hasVal ? val : ""}
                                      onBlur={e => setValor(item.id, cidade.id, cat.codigo, e.target.value)}
                                      placeholder="—"
                                      style={cellStyle(hasVal)}
                                    />
                                  </td>
                                );
                              })
                            )}
                          </tr>
                        );
                      }),
                    ];
                  })}

                  {/* Total row */}
                  {hasTotais && (
                    <tr style={{ borderTop: `2px solid ${T.border}` }}>
                      <td style={{
                        position: "sticky", left: 0, zIndex: 1,
                        background: T.surfaceAlt || T.bg,
                        padding: "8px 14px",
                        borderRight: `1px solid ${T.border}`,
                        fontWeight: 800, color: T.textMd, fontSize: 12,
                      }}>Total estimado</td>
                      <td style={{
                        position: "sticky", left: 160, zIndex: 1,
                        background: T.surfaceAlt || T.bg,
                        borderRight: `2px solid ${T.border}`,
                      }} />
                      {cidadesDoCamp.flatMap(cidade =>
                        categorias.map((cat, i) => {
                          const key   = `${cidade.id}:${cat.codigo}`;
                          const total = totais[key];
                          return (
                            <td
                              key={`tot-${cidade.id}-${cat.codigo}`}
                              style={{
                                padding: "7px 6px",
                                textAlign: "right",
                                fontFamily: "'JetBrains Mono',ui-monospace,monospace",
                                fontWeight: 800,
                                color: T.brand || "#10b981",
                                fontSize: 12,
                                background: T.surfaceAlt || T.bg,
                                borderRight: i === categorias.length - 1 ? `1px solid ${T.border}` : "none",
                              }}
                            >
                              {total ? fmt(total) : "—"}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
