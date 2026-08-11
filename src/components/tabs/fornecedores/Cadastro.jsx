import { useState, useMemo, useEffect } from "react";
import { iSty, RADIUS } from "../../../constants";
import { fmt } from "../../../utils";
import { Button, Chip, Badge, tableStyles } from "../../ui";
import {
  Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight,
  DollarSign, MapPin, Package, Camera, Users, Check,
  Mail, Phone, User, Building2, Tag, Save,
} from "lucide-react";
import CatalogoItensModal from "./CatalogoItensModal";
import { unidadeLabel } from "./CatalogoItensModal";
import { supabase } from "../../../lib/supabase";

// ─── Constants ───────────────────────────────────────────────────────────────
const CAT_META = {
  periferico: { label: "Periféricos",       color: "#3b82f6", Icon: Camera },
  equipe:     { label: "Equipe Operacional", color: "#f59e0b", Icon: Users  },
};

const AREAS  = ["Todas",  "Operações", "Conteúdo"];
const TIPOS  = ["Todos",  "Fornecedor", "Prestador"];
const REGIOES = ["Sudeste","Sul","Nordeste","Centro Oeste","Norte"];

const TIPO_TABELA = {
  produtora:  "Produtora",
  periferico: "Periférico",
  equipe:     "Equipe Operacional",
};

const SERVICOS_PERIFERICOS = [
  "Drone","Mini Drone","Grua/Policam","DSLR + Microlink","Carrinho",
  "Goalcam","Gerador","SNG","SNG Extra","LiveU","Especial","Outro",
];

// ─── Collapsible Section ──────────────────────────────────────────────────────
function SecaoDetalhe({ title, count, color, icon: Icon, defaultOpen = true, children, extra, T }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: "11px 20px", cursor: "pointer", display: "flex",
          alignItems: "center", gap: 8,
          background: T.surfaceAlt || T.bg, userSelect: "none",
        }}
      >
        {open
          ? <ChevronDown  size={13} color={T.textSm} />
          : <ChevronRight size={13} color={T.textSm} />}
        {Icon && <Icon size={13} color={color} />}
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text, flex: 1 }}>{title}</span>
        {extra}
        {count !== undefined && (
          <span style={{
            fontSize: 10, fontWeight: 800, padding: "1px 7px",
            borderRadius: RADIUS.pill,
            background: `${color}18`, color,
          }}>{count}</span>
        )}
      </div>
      {open && <div style={{ background: T.surface || T.card }}>{children}</div>}
    </div>
  );
}

// ─── FornecedorModal (cadastro) ───────────────────────────────────────────────
function FornecedorModal({ fornecedor, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(() => {
    const base = fornecedor || {
      apelido: "", razaoSocial: "", cnpj: "", funcao: "", area: "Operações", tipo: "Fornecedor",
      nome: "", telefone: "", email: "", cpf: "", rg: "", tipoTabela: "", precos: [],
    };
    return { ...base, tipoTabela: base.tipoTabela || "" };
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const field = (label, key, opts = null, span = false) => (
    <div style={{ marginBottom: 12, gridColumn: span ? "1 / -1" : "auto" }}>
      <label style={{ color: T.textMd, fontSize: 12, display: "block", marginBottom: 4 }}>{label}</label>
      {opts
        ? <select value={form[key]} onChange={e => set(key, e.target.value)} style={IS}>
            {opts.map(o => <option key={typeof o === "string" ? o : o.v} value={typeof o === "string" ? o : o.v}>{typeof o === "string" ? o : o.l}</option>)}
          </select>
        : <input value={form[key]} onChange={e => set(key, e.target.value)} style={IS} />}
    </div>
  );

  const handleSave = () => {
    if (!form.apelido) return;
    onSave({ ...form, id: fornecedor?.id || Date.now(), precos: form.precos || [] });
  };

  const tipoOpts = [
    { v: "", l: "— Sem tabela —" },
    { v: "produtora",  l: "Produtora" },
    { v: "periferico", l: "Periférico" },
    { v: "equipe",     l: "Equipe Operacional" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: T.surface || T.card, borderRadius: RADIUS.xl, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 18, color: T.text, fontWeight: 800, letterSpacing: "-0.02em" }}>
          {fornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          {field("Apelido",              "apelido")}
          {field("CNPJ",                 "cnpj")}
          {field("Razão Social",         "razaoSocial", null, true)}
          {field("Função",               "funcao")}
          {field("Área",                 "area",       ["Operações", "Conteúdo"])}
          {field("Tipo Cadastro",        "tipo",       ["Fornecedor", "Prestador"])}
          {field("Classificação Tabela", "tipoTabela", tipoOpts)}
          {field("Nome Completo",        "nome")}
          {field("Telefone",             "telefone")}
          {field("Email",                "email")}
          {field("CPF",                  "cpf")}
          {field("RG",                   "rg")}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary"   size="md" onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

// ─── ProdutoraPrecoModal ──────────────────────────────────────────────────────
function ProdutoraPrecoModal({ entry, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(entry || {
    regiao: "Sudeste", cidade: "", estadio: "", b1: 0, b2: 0, b3: 0, b4: 0, montagem: 0, obs: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const labelSty = { color: T.textMd, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: T.surface || T.card, borderRadius: RADIUS.xl, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 18, color: T.text, fontWeight: 800 }}>{entry ? "Editar Linha" : "Nova Linha"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSty}>Região</label>
            <select value={form.regiao} onChange={e => set("regiao", e.target.value)} style={IS}>
              {REGIOES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSty}>Cidade</label>
            <input value={form.cidade} onChange={e => set("cidade", e.target.value)} style={IS} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelSty}>Estádio / Mandante</label>
          <input value={form.estadio} onChange={e => set("estadio", e.target.value)} style={IS} placeholder="Ex: Maracanã, São Januário..." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 12px" }}>
          {["b1","b2","b3","b4"].map(k => (
            <div key={k} style={{ marginBottom: 14 }}>
              <label style={labelSty}>{k.toUpperCase()} (UM)</label>
              <input type="number" value={form[k]} onChange={e => set(k, parseFloat(e.target.value) || 0)} style={{ ...IS, textAlign: "right" }} />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelSty}>Montagem Véspera (R$)</label>
          <input type="number" value={form.montagem} onChange={e => set("montagem", parseFloat(e.target.value) || 0)} style={{ ...IS, textAlign: "right" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelSty}>Observação</label>
          <input value={form.obs || ""} onChange={e => set("obs", e.target.value)} style={IS} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary" size="md" onClick={() => { if (!form.cidade) return; onSave({ ...form, id: entry?.id || Date.now() }); }}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

function TabelaProdutora({ precos, onUpdate, T }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const TS = tableStyles(T);

  const save = p => {
    const u = [...precos]; const i = u.findIndex(x => x.id === p.id);
    if (i >= 0) u[i] = p; else u.push(p);
    onUpdate(u); setShowModal(false); setEditing(null);
  };
  const del = id => { if (window.confirm("Excluir esta linha?")) onUpdate(precos.filter(p => p.id !== id)); };

  const sorted  = [...precos].sort((a, b) => a.regiao.localeCompare(b.regiao) || a.cidade.localeCompare(b.cidade) || (a.estadio || "").localeCompare(b.estadio || ""));
  const regioes = {};
  sorted.forEach(p => { if (!regioes[p.regiao]) regioes[p.regiao] = []; regioes[p.regiao].push(p); });

  const valColor = v => v ? (T.brand || "#10b981") : (T.textSm || "#64748b");

  return (
    <>
      <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DollarSign size={15} color={T.brand || "#10b981"} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Tabela Produtora</span>
          <Badge color={T.brand} T={T} size="sm">{precos.length} linha{precos.length !== 1 ? "s" : ""}</Badge>
        </div>
        <Button T={T} variant="primary" size="sm" icon={Plus} onClick={() => { setEditing(null); setShowModal(true); }}>Nova Linha</Button>
      </div>
      {precos.length === 0 ? (
        <div style={{ padding: "20px 20px 24px", textAlign: "center", color: T.textSm, fontSize: 12 }}>
          Nenhum preço cadastrado. Clique em "Nova Linha" para adicionar.
        </div>
      ) : (
        <div style={{ ...TS.wrap, padding: "0 0 4px" }}>
          <table style={{ ...TS.table, minWidth: 900 }}>
            <thead>
              <tr style={TS.thead}>
                {["Região","Cidade","Estádio/Mandante","B1 (UM)","B2 (UM)","B3 (UM)","B4 (UM)","Montagem","Obs",""].map(h =>
                  <th key={h} style={{ ...TS.th, ...(["B1 (UM)","B2 (UM)","B3 (UM)","B4 (UM)","Montagem"].includes(h) ? TS.thRight : TS.thLeft) }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {Object.entries(regioes).map(([regiao, items]) =>
                items.map((p, i) => (
                  <tr key={p.id} style={TS.tr}>
                    {i === 0 ? <td rowSpan={items.length} style={{ ...TS.td, fontWeight: 700, verticalAlign: "top", borderRight: `1px solid ${T.border}`, fontSize: 12, color: T.textMd }}>{regiao}</td> : null}
                    <td style={{ ...TS.td, fontWeight: 600, fontSize: 13 }}>{p.cidade}</td>
                    <td style={{ ...TS.td, fontSize: 12, color: T.textMd }}>{p.estadio || "—"}</td>
                    <td className="num" style={{ ...TS.tdNum, fontWeight: 700, color: valColor(p.b1) }}>{p.b1 ? fmt(p.b1) : "—"}</td>
                    <td className="num" style={{ ...TS.tdNum, fontWeight: 700, color: valColor(p.b2) }}>{p.b2 ? fmt(p.b2) : "—"}</td>
                    <td className="num" style={{ ...TS.tdNum, fontWeight: 600, color: valColor(p.b3), fontSize: 12 }}>{p.b3 ? fmt(p.b3) : "—"}</td>
                    <td className="num" style={{ ...TS.tdNum, fontWeight: 600, color: valColor(p.b4), fontSize: 12 }}>{p.b4 ? fmt(p.b4) : "—"}</td>
                    <td className="num" style={{ ...TS.tdNum, fontSize: 12, color: p.montagem ? (T.warning || "#f59e0b") : T.textSm }}>{p.montagem ? fmt(p.montagem) : "—"}</td>
                    <td style={{ ...TS.td, fontSize: 11, color: T.textSm }}>{p.obs || ""}</td>
                    <td style={TS.td}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={() => { setEditing(p); setShowModal(true); }} />
                        <Button T={T} variant="danger"    size="sm" icon={Trash2} onClick={() => del(p.id)} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {showModal && <ProdutoraPrecoModal entry={editing} onSave={save} onClose={() => { setShowModal(false); setEditing(null); }} T={T} />}
    </>
  );
}

// ─── PerifericoPrecoModal / TabelaPeriferico ──────────────────────────────────
function PerifericoPrecoModal({ entry, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(entry || { cidade: "", servico: SERVICOS_PERIFERICOS[0], qtd: 1, valorUnit: 0, obs: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const labelSty = { color: T.textMd, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: T.surface || T.card, borderRadius: RADIUS.xl, padding: 28, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 18, color: T.text, fontWeight: 800 }}>{entry ? "Editar" : "Novo Periférico"}</h3>
        <div style={{ marginBottom: 14 }}>
          <label style={labelSty}>Cidade</label>
          <input value={form.cidade} onChange={e => set("cidade", e.target.value)} style={IS} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelSty}>Serviço</label>
          <select value={form.servico} onChange={e => set("servico", e.target.value)} style={IS}>
            {SERVICOS_PERIFERICOS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSty}>Quantidade</label>
            <input type="number" value={form.qtd} onChange={e => set("qtd", parseInt(e.target.value) || 1)} style={{ ...IS, textAlign: "right" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSty}>Valor Unitário (R$)</label>
            <input type="number" value={form.valorUnit} onChange={e => set("valorUnit", parseFloat(e.target.value) || 0)} style={{ ...IS, textAlign: "right" }} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelSty}>Observação</label>
          <input value={form.obs || ""} onChange={e => set("obs", e.target.value)} style={IS} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary"   size="md" onClick={() => { if (!form.cidade || !form.valorUnit) return; onSave({ ...form, id: entry?.id || Date.now() }); }}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

function TabelaPeriferico({ precos, onUpdate, T }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const TS = tableStyles(T);

  const save  = p => { const u = [...precos]; const i = u.findIndex(x => x.id === p.id); if (i >= 0) u[i] = p; else u.push(p); onUpdate(u); setShowModal(false); setEditing(null); };
  const del   = id => { if (window.confirm("Excluir?")) onUpdate(precos.filter(p => p.id !== id)); };
  const total = precos.reduce((s, p) => s + (p.valorUnit || 0) * (p.qtd || 1), 0);

  return (
    <>
      <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DollarSign size={15} color="#a855f7" />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Tabela Periférico</span>
          <Badge color="#a855f7" T={T} size="sm">{precos.length} item{precos.length !== 1 ? "ns" : ""}</Badge>
          {total > 0 && <span className="num" style={{ fontSize: 12, fontWeight: 700, color: "#a855f7" }}>{fmt(total)}</span>}
        </div>
        <Button T={T} variant="primary" size="sm" icon={Plus} onClick={() => { setEditing(null); setShowModal(true); }}>Novo Item</Button>
      </div>
      {precos.length === 0 ? (
        <div style={{ padding: "20px 20px 24px", textAlign: "center", color: T.textSm, fontSize: 12 }}>Nenhum preço cadastrado.</div>
      ) : (
        <div style={{ ...TS.wrap, padding: "0 0 4px" }}>
          <table style={{ ...TS.table, minWidth: 600 }}>
            <thead>
              <tr style={TS.thead}>
                {["Cidade","Serviço","Qtd","Valor Unit.","Total","Obs",""].map(h =>
                  <th key={h} style={{ ...TS.th, ...(["Qtd","Valor Unit.","Total"].includes(h) ? TS.thRight : TS.thLeft) }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {[...precos].sort((a, b) => a.cidade.localeCompare(b.cidade) || a.servico.localeCompare(b.servico)).map(p => (
                <tr key={p.id} style={TS.tr}>
                  <td style={{ ...TS.td, fontWeight: 600, fontSize: 13 }}><div style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} color={T.textSm} />{p.cidade}</div></td>
                  <td style={{ ...TS.td, fontSize: 12 }}>{p.servico}</td>
                  <td className="num" style={{ ...TS.tdNum, fontSize: 13 }}>{p.qtd || 1}</td>
                  <td className="num" style={{ ...TS.tdNum, fontWeight: 600, color: "#a855f7" }}>{fmt(p.valorUnit)}</td>
                  <td className="num" style={{ ...TS.tdNum, fontWeight: 700, color: T.brand || "#10b981" }}>{fmt((p.valorUnit || 0) * (p.qtd || 1))}</td>
                  <td style={{ ...TS.td, fontSize: 11, color: T.textSm }}>{p.obs || "—"}</td>
                  <td style={TS.td}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={() => { setEditing(p); setShowModal(true); }} />
                      <Button T={T} variant="danger"    size="sm" icon={Trash2} onClick={() => del(p.id)} />
                    </div>
                  </td>
                </tr>
              ))}
              {precos.length > 1 && (
                <tr style={TS.totalRow}>
                  <td colSpan={4} style={{ ...TS.td, fontWeight: 700, color: T.textMd }}>Total</td>
                  <td className="num" style={{ ...TS.tdNum, fontWeight: 800, color: T.brand || "#10b981" }}>{fmt(total)}</td>
                  <td colSpan={2} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {showModal && <PerifericoPrecoModal entry={editing} onSave={save} onClose={() => { setShowModal(false); setEditing(null); }} T={T} />}
    </>
  );
}

// ─── EquipePrecoModal / TabelaEquipe ─────────────────────────────────────────
function EquipePrecoModal({ entry, onSave, onClose, T }) {
  const IS = iSty(T);
  const [form, setForm] = useState(entry || { funcao: "", valorJogo: 0, diaria: 0, obs: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const labelSty = { color: T.textMd, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: T.surface || T.card, borderRadius: RADIUS.xl, padding: 28, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 18, color: T.text, fontWeight: 800 }}>{entry ? "Editar" : "Novo Profissional"}</h3>
        <div style={{ marginBottom: 14 }}>
          <label style={labelSty}>Função</label>
          <input value={form.funcao} onChange={e => set("funcao", e.target.value)} style={IS} placeholder="Ex: Vmix, DTV, Áudio..." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSty}>Valor por Jogo (R$)</label>
            <input type="number" value={form.valorJogo} onChange={e => set("valorJogo", parseFloat(e.target.value) || 0)} style={{ ...IS, textAlign: "right" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSty}>Diária Alimentação (R$)</label>
            <input type="number" value={form.diaria} onChange={e => set("diaria", parseFloat(e.target.value) || 0)} style={{ ...IS, textAlign: "right" }} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelSty}>Observação</label>
          <input value={form.obs || ""} onChange={e => set("obs", e.target.value)} style={IS} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <Button T={T} variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
          <Button T={T} variant="primary"   size="md" onClick={() => { if (!form.funcao) return; onSave({ ...form, id: entry?.id || Date.now() }); }}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

function TabelaEquipe({ precos, onUpdate, T }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const TS = tableStyles(T);

  const save        = p => { const u = [...precos]; const i = u.findIndex(x => x.id === p.id); if (i >= 0) u[i] = p; else u.push(p); onUpdate(u); setShowModal(false); setEditing(null); };
  const del         = id => { if (window.confirm("Excluir?")) onUpdate(precos.filter(p => p.id !== id)); };
  const totalJogo   = precos.reduce((s, p) => s + (p.valorJogo || 0), 0);
  const totalDiaria = precos.reduce((s, p) => s + (p.diaria    || 0), 0);

  return (
    <>
      <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DollarSign size={15} color={T.info || "#3b82f6"} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Tabela Equipe Operacional</span>
          <Badge color={T.info} T={T} size="sm">{precos.length} profissional{precos.length !== 1 ? "is" : ""}</Badge>
        </div>
        <Button T={T} variant="primary" size="sm" icon={Plus} onClick={() => { setEditing(null); setShowModal(true); }}>Novo Profissional</Button>
      </div>
      {precos.length === 0 ? (
        <div style={{ padding: "20px 20px 24px", textAlign: "center", color: T.textSm, fontSize: 12 }}>Nenhum profissional cadastrado.</div>
      ) : (
        <div style={{ ...TS.wrap, padding: "0 0 4px" }}>
          <table style={{ ...TS.table, minWidth: 500 }}>
            <thead>
              <tr style={TS.thead}>
                {["Função","Valor/Jogo","Diária Alim.","Total/Jogo","Obs",""].map(h =>
                  <th key={h} style={{ ...TS.th, ...(["Valor/Jogo","Diária Alim.","Total/Jogo"].includes(h) ? TS.thRight : TS.thLeft) }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {[...precos].sort((a, b) => (a.funcao || "").localeCompare(b.funcao || "")).map(p => (
                <tr key={p.id} style={TS.tr}>
                  <td style={{ ...TS.td, fontWeight: 600, fontSize: 13 }}>{p.funcao}</td>
                  <td className="num" style={{ ...TS.tdNum, fontWeight: 700, color: T.info || "#3b82f6" }}>{fmt(p.valorJogo)}</td>
                  <td className="num" style={{ ...TS.tdNum, fontSize: 12, color: T.warning || "#f59e0b" }}>{fmt(p.diaria)}</td>
                  <td className="num" style={{ ...TS.tdNum, fontWeight: 700, color: T.brand || "#10b981" }}>{fmt((p.valorJogo || 0) + (p.diaria || 0))}</td>
                  <td style={{ ...TS.td, fontSize: 11, color: T.textSm }}>{p.obs || "—"}</td>
                  <td style={TS.td}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={() => { setEditing(p); setShowModal(true); }} />
                      <Button T={T} variant="danger"    size="sm" icon={Trash2} onClick={() => del(p.id)} />
                    </div>
                  </td>
                </tr>
              ))}
              <tr style={TS.totalRow}>
                <td style={{ ...TS.td, fontWeight: 700, color: T.textMd }}>Total</td>
                <td className="num" style={{ ...TS.tdNum, fontWeight: 800, color: T.info || "#3b82f6" }}>{fmt(totalJogo)}</td>
                <td className="num" style={{ ...TS.tdNum, fontWeight: 700, color: T.warning || "#f59e0b" }}>{fmt(totalDiaria)}</td>
                <td className="num" style={{ ...TS.tdNum, fontWeight: 800, color: T.brand || "#10b981" }}>{fmt(totalJogo + totalDiaria)}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {showModal && <EquipePrecoModal entry={editing} onSave={save} onClose={() => { setShowModal(false); setEditing(null); }} T={T} />}
    </>
  );
}

// ─── TabelaPrecosFornecedor (legacy wrapper) ──────────────────────────────────
function TabelaPrecosFornecedor({ fornecedor, onUpdate, T }) {
  const precos = fornecedor.precos || [];
  const tipo   = fornecedor.tipoTabela;
  const handleUpdate = newPrecos => onUpdate({ ...fornecedor, precos: newPrecos });

  if (!tipo) return (
    <div style={{ background: T.surfaceAlt || T.bg, padding: "20px 20px 24px", textAlign: "center", color: T.textSm, fontSize: 12 }}>
      Este fornecedor não tem classificação de tabela definida. Edite o cadastro e selecione uma "Classificação Tabela".
    </div>
  );

  return (
    <div style={{ background: T.surfaceAlt || T.bg }}>
      {tipo === "produtora"  && <TabelaProdutora  precos={precos} onUpdate={handleUpdate} T={T} />}
      {tipo === "periferico" && <TabelaPeriferico precos={precos} onUpdate={handleUpdate} T={T} />}
      {tipo === "equipe"     && <TabelaEquipe     precos={precos} onUpdate={handleUpdate} T={T} />}
    </div>
  );
}

// ─── FornecedorDetalhe (right-panel detail view) ──────────────────────────────
function FornecedorDetalhe({ fornecedor, itensMaster = [], cidades = [], onSave, onDelete, onEditModal, T }) {
  const [f, setF]         = useState(fornecedor);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setF(fornecedor);
    setDirty(false);
  }, [fornecedor?.id]);

  const update = patch => { setF(prev => ({ ...prev, ...patch })); setDirty(true); };
  const save   = () => { onSave(f); setDirty(false); };

  // ── derived ──────────────────────────────────────────────────────────────
  const itensPorCat = useMemo(() => {
    const map = { periferico: [], equipe: [] };
    itensMaster.forEach(it => { const k = it.categoria || "equipe"; if (map[k]) map[k].push(it); });
    return map;
  }, [itensMaster]);

  const toggleServico = id => {
    const s = new Set(f.servicosPrestados || []);
    s.has(id) ? s.delete(id) : s.add(id);
    update({ servicosPrestados: Array.from(s) });
  };
  const toggleCidade = id => {
    const next = (f.cidadesAtuacao || []).includes(id)
      ? (f.cidadesAtuacao || []).filter(x => x !== id)
      : [...(f.cidadesAtuacao || []), id];
    update({ cidadesAtuacao: next });
  };

  const isPrestador = f.tipo === "Prestador";

  // ── info fields ───────────────────────────────────────────────────────────
  const infoFields = [
    { label: "CNPJ",                 value: f.cnpj    },
    { label: "Área",                 value: f.area    },
    { label: "Tipo",                 value: f.tipo    },
    { label: "Classificação Tabela", value: f.tipoTabela ? (TIPO_TABELA[f.tipoTabela] || f.tipoTabela) : null },
    ...(isPrestador ? [
      { label: "Nome Completo", value: f.nome     },
      { label: "Email",         value: f.email    },
      { label: "Telefone",      value: f.telefone },
      { label: "CPF",           value: f.cpf      },
      { label: "RG",            value: f.rg       },
    ] : []),
  ];

  const cyan   = "#06b6d4";
  const purple = "#a855f7";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Sticky header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt || T.bg, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>{f.apelido || "—"}</h2>
          {f.area && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: RADIUS.pill, background: "rgba(245,158,11,0.12)", color: T.warning || "#f59e0b" }}>{f.area}</span>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: RADIUS.pill, background: f.tipo === "Fornecedor" ? "rgba(6,182,212,0.12)" : "rgba(168,85,247,0.12)", color: f.tipo === "Fornecedor" ? cyan : purple }}>{f.tipo || "—"}</span>
          {dirty && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: RADIUS.pill, background: "rgba(245,158,11,0.12)", color: T.warning || "#f59e0b" }}>Não salvo</span>
          )}
        </div>
        <div style={{ fontSize: 13, color: T.textMd, marginBottom: 2 }}>{f.funcao || "—"}</div>
        <div style={{ fontSize: 12, color: T.textSm, marginBottom: 10 }}>{f.razaoSocial || ""}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button T={T} variant="primary"   size="sm" icon={Save}   onClick={save}               disabled={!dirty}>Salvar</Button>
          <Button T={T} variant="secondary" size="sm" icon={Pencil} onClick={() => onEditModal(f)}>Editar cadastro</Button>
          <Button T={T} variant="danger"    size="sm" icon={Trash2} onClick={() => onDelete(f.id)}>Excluir</Button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 0 }}>

        {/* Section 1: Informações */}
        <SecaoDetalhe title="Informações" color="#06b6d4" icon={Tag} defaultOpen T={T}>
          <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
            {infoFields.map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.textSm, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{value || "—"}</div>
              </div>
            ))}
          </div>
        </SecaoDetalhe>

        {/* Section 2: Serviços Prestados */}
        <SecaoDetalhe title="Serviços Prestados" color={purple} icon={Package} count={(f.servicosPrestados || []).length} defaultOpen T={T}>
          {!itensMaster?.length ? (
            <p style={{ padding: "12px 20px", margin: 0, fontSize: 12, color: T.textSm }}>
              Nenhum serviço no catálogo global. Vá em Catálogos → Periféricos / Equipe.
            </p>
          ) : (
            <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.entries(itensPorCat).map(([catKey, items]) => {
                if (!items.length) return null;
                const { label, color, Icon } = CAT_META[catKey] || { label: catKey, color: T.textMd, Icon: Package };
                return (
                  <div key={catKey}>
                    <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon size={11} />{label}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {items.map(it => {
                        const on = (f.servicosPrestados || []).includes(it.id);
                        return (
                          <button key={it.id} onClick={() => toggleServico(it.id)} style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "5px 11px", borderRadius: RADIUS.pill, cursor: "pointer",
                            border: `1px solid ${on ? color : T.border}`,
                            background: on ? `${color}14` : "transparent",
                            color: on ? color : T.textMd,
                            fontSize: 12, fontWeight: 600, transition: "all .1s",
                          }}>
                            {on ? <Check size={11} /> : <Icon size={11} />}
                            {it.nome}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SecaoDetalhe>

        {/* Section 3: Cidades de Atuação */}
        <SecaoDetalhe title="Cidades de Atuação" color="#3b82f6" icon={MapPin} count={(f.cidadesAtuacao || []).length} defaultOpen T={T}>
          <div style={{ padding: "12px 20px" }}>
            {!cidades?.length ? (
              <p style={{ margin: 0, fontSize: 12, color: T.textSm }}>Nenhuma cidade no catálogo. Vá em Catálogos → Cidades.</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {cidades.map(c => {
                  const on = (f.cidadesAtuacao || []).includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleCidade(c.id)} style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "5px 11px", borderRadius: RADIUS.pill, cursor: "pointer",
                      border: `1px solid ${on ? "#3b82f6" : T.border}`,
                      background: on ? "rgba(59,130,246,0.12)" : "transparent",
                      color: on ? "#3b82f6" : T.textMd,
                      fontSize: 12, fontWeight: 600,
                    }}>
                      {on ? <Check size={11} /> : <MapPin size={11} />}
                      {c.nome}/{c.uf}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SecaoDetalhe>

        {/* Section 4: Tabela de Preços (Legado) */}
        <SecaoDetalhe title="Tabela de Preços (Legado)" color="#64748b" defaultOpen={false} T={T}>
          <TabelaPrecosFornecedor
            fornecedor={f}
            onUpdate={updated => { setF(updated); setDirty(true); }}
            T={T}
          />
        </SecaoDetalhe>

      </div>
    </div>
  );
}

// ─── Main Cadastro Component ──────────────────────────────────────────────────
export default function Cadastro({ fornecedores, setFornecedores, itensMaster = [], cidades = [], T }) {
  const [filtroArea, setFiltroArea] = useState("Todas");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [busca, setBusca]           = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [editingModal, setEditingModal] = useState(null);
  const [catalogoEdit, setCatalogoEdit] = useState(null);
  const [selectedId, setSelectedId]     = useState(null);

  const filtered = useMemo(() =>
    fornecedores.filter(f =>
      (filtroArea === "Todas" || f.area === filtroArea) &&
      (filtroTipo === "Todos" || f.tipo === filtroTipo) &&
      (!busca ||
        (f.apelido    || "").toLowerCase().includes(busca.toLowerCase()) ||
        (f.razaoSocial || "").toLowerCase().includes(busca.toLowerCase()) ||
        (f.funcao     || "").toLowerCase().includes(busca.toLowerCase())
      )
    ).sort((a, b) => (a.apelido || "").localeCompare(b.apelido || "")),
    [fornecedores, filtroArea, filtroTipo, busca]
  );

  const selectedForn = selectedId ? fornecedores.find(f => f.id === selectedId) || null : null;

  const saveFornecedor = f => {
    // Renome de apelido PROPAGA para as escalas do Portal de Controle (o
    // vínculo lá é por nome): a RPC renomear_fornecedor troca o nome em todas
    // as colunas de fornecedor das tabelas do Portal + links externos.
    const anterior = fornecedores.find(x => x.id === f.id);
    if (anterior && anterior.apelido && f.apelido && anterior.apelido.trim() !== f.apelido.trim()) {
      supabase.rpc('renomear_fornecedor', { antigo: anterior.apelido.trim(), novo: f.apelido.trim() })
        .then(({ data, error }) => {
          if (error) console.error('Falha ao propagar renome para o Portal:', error.message);
          else console.log(`Renome propagado ao Portal: ${data} célula(s) atualizadas`);
        });
    }
    setFornecedores(fs => {
      const idx = fs.findIndex(x => x.id === f.id);
      return idx >= 0 ? fs.map(x => x.id === f.id ? f : x) : [...fs, f];
    });
    setShowModal(false);
    setEditingModal(null);
  };

  const deleteFornecedor = id => {
    if (!confirm("Excluir este fornecedor?")) return;
    setFornecedores(fs => fs.filter(f => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const cyan   = "#06b6d4";
  const purple = "#a855f7";

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "300px 1fr",
      border: `1px solid ${T.border}`, borderRadius: RADIUS.lg,
      // Altura FIXA na janela: a rolagem acontece DENTRO dos painéis (lista à
      // esquerda, detalhe à direita) — a página em si não cresce mais.
      overflow: "hidden", height: "calc(100vh - 240px)", minHeight: 460,
      background: T.surface || T.card,
    }}>

      {/* ── LEFT PANEL ── */}
      <div style={{ borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Fornecedores</span>
          <Button T={T} variant="primary" size="sm" icon={Plus} onClick={() => { setEditingModal(null); setShowModal(true); }}>Novo</Button>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ position: "relative" }}>
            <Search size={13} color={T.textSm} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar..."
              style={{
                ...iSty(T), padding: "7px 10px 7px 28px", fontSize: 12,
                width: "100%", boxSizing: "border-box",
              }}
            />
          </div>
          {/* Area chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 7 }}>
            {AREAS.map(a => (
              <Chip key={a} active={filtroArea === a} onClick={() => setFiltroArea(a)} T={T} color={cyan}>{a}</Chip>
            ))}
          </div>
          {/* Tipo chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            {TIPOS.map(t => (
              <Chip key={t} active={filtroTipo === t} onClick={() => setFiltroTipo(t)} T={T} color={T.warning}>{t}</Chip>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: T.textSm, fontSize: 12 }}>Nenhum resultado</div>
          ) : (
            filtered.map(forn => {
              const selected = forn.id === selectedId;
              const nServ = (forn.servicosPrestados || []).length;
              const nCid  = (forn.cidadesAtuacao    || []).length;
              return (
                <div
                  key={forn.id}
                  onClick={() => setSelectedId(forn.id)}
                  style={{
                    padding: "10px 12px 10px 13px",
                    borderLeft: `3px solid ${selected ? (T.brand || "#10b981") : "transparent"}`,
                    background: selected ? (T.brandSoft || "rgba(16,185,129,0.06)") : "transparent",
                    cursor: "pointer",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  {/* Row 1: apelido + tipo badge */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{forn.apelido || "—"}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: RADIUS.pill,
                      background: forn.tipo === "Fornecedor" ? "rgba(6,182,212,0.12)" : "rgba(168,85,247,0.12)",
                      color: forn.tipo === "Fornecedor" ? cyan : purple,
                      flexShrink: 0,
                    }}>{forn.tipo || "—"}</span>
                  </div>
                  {/* Row 2: funcao */}
                  {forn.funcao && (
                    <div style={{ fontSize: 12, color: T.textSm, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3 }}>
                      {forn.funcao}
                    </div>
                  )}
                  {/* Row 3: counts */}
                  {(nServ > 0 || nCid > 0) && (
                    <div style={{ fontSize: 11, color: T.textSm }}>
                      {[nServ > 0 && `${nServ} serviço${nServ !== 1 ? "s" : ""}`, nCid > 0 && `${nCid} cidade${nCid !== 1 ? "s" : ""}`].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedForn ? (
          <FornecedorDetalhe
            key={selectedForn.id}
            fornecedor={selectedForn}
            itensMaster={itensMaster}
            cidades={cidades}
            onSave={saveFornecedor}
            onDelete={deleteFornecedor}
            onEditModal={f => { setEditingModal(f); setShowModal(true); }}
            T={T}
          />
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: T.textSm }}>
            <Building2 size={36} color={T.border} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Selecione um fornecedor</span>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <FornecedorModal
          fornecedor={editingModal}
          onSave={saveFornecedor}
          onClose={() => { setShowModal(false); setEditingModal(null); }}
          T={T}
        />
      )}
      {catalogoEdit && (
        <CatalogoItensModal
          fornecedor={catalogoEdit}
          onSave={f => { saveFornecedor(f); setCatalogoEdit(null); }}
          onClose={() => setCatalogoEdit(null)}
          T={T}
        />
      )}
    </div>
  );
}
