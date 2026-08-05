import { useState, useMemo, useEffect } from "react";
import { iSty, RADIUS } from "../../../constants";
import { Button, Badge } from "../../ui";
import { fmt } from "../../../utils";
import {
  criarTabelaFornecedor, getTabelaFornecedor,
  getValorTabela, setValorTabela, contarCelulasPreenchidas,
  unidadeLabel,
} from "../../../data/catalogos";
import {
  Trophy, Building2, Camera, Users, Check, Plus, Trash2, Save,
  AlertCircle, CalendarRange, MapPin, Package,
} from "lucide-react";

const CAT_META = {
  periferico: { label: "Periféricos",        color: "#3b82f6", Icon: Camera },
  equipe:     { label: "Equipe Operacional", color: "#f59e0b", Icon: Users  },
};

// ════════════════════════════════════════════════════════════════════════════
// Tabelas de Preço — valores de cada fornecedor no catálogo do campeonato
// ----------------------------------------------------------------------------
// Fluxo: seleciona o campeonato → adiciona/seleciona um fornecedor → marca
// quais itens do catálogo ele faz → preenche a matriz item × cidade.
// Preenchimento direto (negociação anual, preços travados pela vigência).
// ════════════════════════════════════════════════════════════════════════════

// ── Editor da tabela de um fornecedor ────────────────────────────────────────
function TabelaEditor({ tabela: tabelaInicial, fornecedor, camp, cidades, onSave, onRemove, T }) {
  const [tab, setTab]     = useState(tabelaInicial);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setTab(tabelaInicial); setDirty(false); }, [tabelaInicial?.id]);

  const cidadesDoCamp = useMemo(() =>
    (camp?.cidadeIds || []).map(id => cidades.find(c => c.id === id)).filter(Boolean),
    [camp, cidades]
  );

  const itensDoCatalogo = useMemo(() =>
    (camp?.itens || []).filter(i => i.ativo !== false),
    [camp]
  );

  const itensPorCat = useMemo(() => {
    const map = { periferico: [], equipe: [] };
    itensDoCatalogo.forEach(it => { const k = it.categoria || "equipe"; if (map[k]) map[k].push(it); });
    return map;
  }, [itensDoCatalogo]);

  const feitos = useMemo(() => new Set(tab.itemIds || []), [tab.itemIds]);
  const itensAtivos = itensDoCatalogo.filter(it => feitos.has(it.id));

  const toggleItem = id => {
    const s = new Set(tab.itemIds || []);
    s.has(id) ? s.delete(id) : s.add(id);
    setTab(t => ({ ...t, itemIds: Array.from(s) }));
    setDirty(true);
  };

  const updateValor = (itemId, cidadeId, raw) => {
    const v = raw === "" ? null : parseFloat(raw);
    setTab(t => setValorTabela(t, itemId, cidadeId, v));
    setDirty(true);
  };

  const updateCampo = (k, v) => { setTab(t => ({ ...t, [k]: v })); setDirty(true); };

  const salvar = () => {
    onSave({ ...tab, atualizadoEm: new Date().toISOString() });
    setDirty(false);
  };

  const preenchidas = contarCelulasPreenchidas(tab);
  const totalCelulas = itensAtivos.length * cidadesDoCamp.length;
  const pct = totalCelulas ? Math.round((preenchidas / totalCelulas) * 100) : 0;

  const cellSty = hasVal => ({
    background: hasVal ? "rgba(16,185,129,0.08)" : "transparent",
    border: `1px solid ${hasVal ? "rgba(16,185,129,0.30)" : T.border}`,
    borderRadius: RADIUS.sm, color: T.text, padding: "5px 7px",
    fontSize: 12, fontWeight: hasVal ? 700 : 400,
    width: "100%", minWidth: 76, textAlign: "right",
    boxSizing: "border-box",
    fontFamily: "'JetBrains Mono',ui-monospace,monospace", outline: "none",
  });
  const stickyLeft = { position: "sticky", left: 0, background: T.surface || T.card, zIndex: 1 };
  const IS = iSty(T);
  const lbl = { fontSize: 11, fontWeight: 600, color: T.textMd, display: "block", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Header do editor */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt || T.bg, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>
            {fornecedor?.apelido || "Fornecedor"}
          </h2>
          <Badge T={T} color={T.brand || "#10b981"} size="sm">{camp?.nome}</Badge>
          {dirty && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px", background: "rgba(245,158,11,0.12)", color: T.warning || "#f59e0b", borderRadius: RADIUS.pill, fontSize: 10, fontWeight: 700 }}>
              <AlertCircle size={11}/> Não salvo
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: T.textMd }}>
          {itensAtivos.length}/{itensDoCatalogo.length} serviços · {cidadesDoCamp.length} cidade{cidadesDoCamp.length !== 1 ? "s" : ""} ·{" "}
          <span style={{ fontWeight: 700, color: pct === 100 && totalCelulas > 0 ? (T.brand || "#10b981") : T.text }}>
            {preenchidas}/{totalCelulas} valores ({pct}%)
          </span>
        </p>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <Button T={T} variant="primary"  size="sm" icon={Save}   onClick={salvar} disabled={!dirty}>Salvar</Button>
          <Button T={T} variant="danger"   size="sm" icon={Trash2} onClick={() => onRemove(tab.id)}>Excluir tabela</Button>
        </div>
      </div>

      {/* Corpo rolável */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

        {/* Vigência + observações */}
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={lbl}><CalendarRange size={10} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }}/>Vigência</label>
            <input value={tab.vigencia || ""} onChange={e => updateCampo("vigencia", e.target.value)} placeholder="Ex: 2026–2027" style={IS}/>
          </div>
          <div>
            <label style={lbl}>Observações</label>
            <input value={tab.observacoes || ""} onChange={e => updateCampo("observacoes", e.target.value)} placeholder="Condições, exclusões, prazos..." style={IS}/>
          </div>
        </div>

        {/* Itens do catálogo que o fornecedor faz */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMd, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
            Serviços que este fornecedor faz — catálogo do {camp?.nome}
          </div>
          {!itensDoCatalogo.length ? (
            <p style={{ margin: 0, fontSize: 12, color: T.textSm, padding: "12px 14px", border: `1px dashed ${T.border}`, borderRadius: RADIUS.md }}>
              O catálogo deste campeonato está vazio. Adicione itens em Catálogos → Campeonatos.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(itensPorCat).map(([catKey, items]) => {
                if (!items.length) return null;
                const { label, color, Icon } = CAT_META[catKey];
                return (
                  <div key={catKey}>
                    <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                      <Icon size={11}/>{label}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {items.map(it => {
                        const on = feitos.has(it.id);
                        return (
                          <button key={it.id} onClick={() => toggleItem(it.id)} style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "5px 11px", borderRadius: RADIUS.pill, cursor: "pointer",
                            border: `1px solid ${on ? color : T.border}`,
                            background: on ? `${color}14` : "transparent",
                            color: on ? color : T.textMd,
                            fontSize: 12, fontWeight: 600, transition: "all .1s",
                          }}>
                            {on ? <Check size={11}/> : <Icon size={11}/>}
                            {it.nome}
                            <span style={{ fontSize: 9, fontWeight: 400, color: on ? color : T.textSm }}>{unidadeLabel(it.unidade)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Matriz item × cidade */}
        {!itensAtivos.length ? (
          <div style={{ padding: "24px", textAlign: "center", color: T.textSm, fontSize: 12, border: `1px dashed ${T.border}`, borderRadius: RADIUS.md }}>
            Marque acima os serviços que o fornecedor faz para preencher os valores.
          </div>
        ) : !cidadesDoCamp.length ? (
          <div style={{ padding: "24px", textAlign: "center", color: T.textSm, fontSize: 12, border: `1px dashed ${T.border}`, borderRadius: RADIUS.md }}>
            Este campeonato não tem cidades-sede. Edite em Catálogos → Campeonatos.
          </div>
        ) : (
          <div style={{ overflowX: "auto", padding: "0 0 8px" }}>
            <table style={{ borderCollapse: "separate", borderSpacing: "3px 2px", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ ...stickyLeft, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: T.textMd, textAlign: "left", whiteSpace: "nowrap" }}>Serviço</th>
                  {cidadesDoCamp.map(c => (
                    <th key={c.id} style={{ padding: "6px 8px", fontSize: 11, fontWeight: 700, color: T.text, textAlign: "center", whiteSpace: "nowrap", borderBottom: `1px solid ${T.border}` }}>
                      {c.nome}/{c.uf}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {["periferico", "equipe"].map(catKey => {
                  const items = itensAtivos.filter(it => (it.categoria || "equipe") === catKey);
                  if (!items.length) return null;
                  const { label, color, Icon } = CAT_META[catKey];
                  return [
                    <tr key={`grp-${catKey}`}>
                      <td colSpan={1 + cidadesDoCamp.length} style={{
                        padding: "5px 12px", fontSize: 10, fontWeight: 800,
                        color, letterSpacing: "0.05em", textTransform: "uppercase",
                        background: `${color}10`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Icon size={10}/>{label}
                        </div>
                      </td>
                    </tr>,
                    ...items.map(item => (
                      <tr key={item.id}>
                        <td style={{ ...stickyLeft, padding: "4px 12px", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{item.nome}</span>
                          <small style={{ fontSize: 9, color: T.textSm, fontWeight: 400, marginLeft: 4 }}>{unidadeLabel(item.unidade)}</small>
                        </td>
                        {cidadesDoCamp.map(cid => {
                          const val = getValorTabela(tab, item.id, cid.id);
                          const hasVal = val !== null && val !== undefined;
                          return (
                            <td key={`${item.id}-${cid.id}`} style={{ padding: "2px 2px" }}>
                              <input
                                type="number"
                                value={hasVal ? val : ""}
                                onChange={e => updateValor(item.id, cid.id, e.target.value)}
                                style={cellSty(hasVal)}
                                placeholder="—"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function Tabelas({
  fornecedores,
  cidades,
  campeonatos,
  tabelas = [], setTabelas = () => {},
  filtroCampeonato = "todos",
  T,
}) {
  const [campId, setCampId] = useState(() => {
    if (filtroCampeonato !== "todos") return filtroCampeonato;
    return campeonatos.find(c => c.ativo)?.id ?? campeonatos[0]?.id ?? null;
  });
  const [fornSelId, setFornSelId] = useState(null);
  const [novoFornId, setNovoFornId] = useState("");

  const camp = campeonatos.find(c => c.id === campId) ?? null;

  const fornById = useMemo(() =>
    Object.fromEntries(fornecedores.map(f => [String(f.id), f])),
    [fornecedores]
  );

  // Tabelas do campeonato selecionado, com fornecedor resolvido
  const tabelasDoCamp = useMemo(() =>
    (tabelas || [])
      .filter(t => t.campeonatoId === campId)
      .map(t => ({ ...t, _forn: fornById[String(t.fornecedorId)] }))
      .filter(t => t._forn)
      .sort((a, b) => (a._forn.apelido || "").localeCompare(b._forn.apelido || "")),
    [tabelas, campId, fornById]
  );

  // Fornecedores sem tabela neste campeonato (para o select de adicionar)
  const fornsDisponiveis = useMemo(() => {
    const comTabela = new Set(tabelasDoCamp.map(t => String(t.fornecedorId)));
    return [...fornecedores]
      .filter(f => !comTabela.has(String(f.id)))
      .sort((a, b) => (a.apelido || "").localeCompare(b.apelido || ""));
  }, [fornecedores, tabelasDoCamp]);

  const tabelaSel = fornSelId ? getTabelaFornecedor(tabelas, fornSelId, campId) : null;
  const fornSel   = fornSelId ? fornById[String(fornSelId)] : null;

  const adicionarFornecedor = () => {
    if (!novoFornId || !campId) return;
    const nova = criarTabelaFornecedor({ fornecedorId: Number(novoFornId) || novoFornId, campeonatoId: campId });
    setTabelas(list => [...(list || []), nova]);
    setFornSelId(novoFornId);
    setNovoFornId("");
  };

  const salvarTabela = tab => {
    setTabelas(list => (list || []).map(t => t.id === tab.id ? tab : t));
  };

  const removerTabela = id => {
    if (!confirm("Excluir a tabela deste fornecedor neste campeonato? Os valores serão perdidos.")) return;
    setTabelas(list => (list || []).filter(t => t.id !== id));
    setFornSelId(null);
  };

  const selecionarCamp = id => { setCampId(id); setFornSelId(null); setNovoFornId(""); };

  const IS = iSty(T);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "230px 250px 1fr",
      border: `1px solid ${T.border}`,
      borderRadius: RADIUS.lg,
      overflow: "hidden",
      minHeight: "72vh",
      background: T.surface || T.card,
    }}>

      {/* ── Coluna 1: campeonatos ─────────────────────────────────────────── */}
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
            const isSel = c.id === campId;
            const nTabs = (tabelas || []).filter(t => t.campeonatoId === c.id).length;
            return (
              <div
                key={c.id}
                onClick={() => selecionarCamp(c.id)}
                style={{
                  padding: "11px 14px",
                  cursor: "pointer",
                  borderBottom: `1px solid ${T.border}`,
                  borderLeft: `3px solid ${isSel ? (T.brand || "#10b981") : "transparent"}`,
                  background: isSel ? (T.brandSoft || "rgba(16,185,129,0.06)") : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                  <Trophy size={12} color={c.ativo ? (T.brand || "#10b981") : T.textSm}/>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: isSel ? (T.brand || "#10b981") : T.text,
                    flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{c.nome}</span>
                </div>
                <div style={{ fontSize: 11, color: T.textSm }}>
                  {(c.itens || []).length} item{(c.itens || []).length !== 1 ? "s" : ""} no catálogo · {nTabs} fornecedor{nTabs !== 1 ? "es" : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Coluna 2: fornecedores com tabela ─────────────────────────────── */}
      <div style={{ borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Fornecedores</span>
        </div>

        {/* Adicionar fornecedor */}
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 6 }}>
          <select value={novoFornId} onChange={e => setNovoFornId(e.target.value)} style={{ ...IS, flex: 1, minWidth: 0, fontSize: 12 }}>
            <option value="">— Adicionar... —</option>
            {fornsDisponiveis.map(f => <option key={f.id} value={f.id}>{f.apelido}</option>)}
          </select>
          <Button T={T} variant="primary" size="sm" icon={Plus} onClick={adicionarFornecedor} disabled={!novoFornId}/>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {!tabelasDoCamp.length ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: T.textSm, fontSize: 12 }}>
              Nenhum fornecedor neste campeonato ainda. Adicione acima.
            </div>
          ) : tabelasDoCamp.map(t => {
            const isSel = String(t.fornecedorId) === String(fornSelId);
            const nItens = (t.itemIds || []).length;
            const nVals = contarCelulasPreenchidas(t);
            return (
              <div
                key={t.id}
                onClick={() => setFornSelId(t.fornecedorId)}
                style={{
                  padding: "10px 13px",
                  cursor: "pointer",
                  borderBottom: `1px solid ${T.border}`,
                  borderLeft: `3px solid ${isSel ? (T.brand || "#10b981") : "transparent"}`,
                  background: isSel ? (T.brandSoft || "rgba(16,185,129,0.06)") : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <Building2 size={12} color={isSel ? (T.brand || "#10b981") : T.textSm}/>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isSel ? (T.brand || "#10b981") : T.text }}>{t._forn.apelido}</span>
                </div>
                <div style={{ fontSize: 11, color: T.textSm }}>
                  {nItens} serviço{nItens !== 1 ? "s" : ""} · {nVals} valor{nVals !== 1 ? "es" : ""}
                  {t.vigencia && <> · {t.vigencia}</>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Coluna 3: editor ──────────────────────────────────────────────── */}
      {!camp ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: T.textSm }}>
          <Trophy size={32} color={T.border}/>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Selecione um campeonato</span>
        </div>
      ) : !tabelaSel || !fornSel ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: T.textSm, padding: 24, textAlign: "center" }}>
          <Package size={32} color={T.border}/>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Selecione um fornecedor para preencher a tabela</span>
          <span style={{ fontSize: 12, color: T.textSm, maxWidth: 340, lineHeight: 1.5 }}>
            Os itens e cidades vêm do catálogo do campeonato (sub-aba Catálogos).
          </span>
        </div>
      ) : (
        <TabelaEditor
          key={tabelaSel.id}
          tabela={tabelaSel}
          fornecedor={fornSel}
          camp={camp}
          cidades={cidades}
          onSave={salvarTabela}
          onRemove={removerTabela}
          T={T}
        />
      )}
    </div>
  );
}
