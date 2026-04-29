// ─── UI PRIMITIVES — LIVEMODE ─────────────────────────────────────────────────
// Componentes base do design system corporativo. Reutilizáveis em todo o portal.
// IMPORTANTE: nada aqui altera dados, fórmulas ou lógica do app — apenas visual.

import { RADIUS, FONT } from "../../constants";

// ── Surface / Card ────────────────────────────────────────────────────────────
export const Card = ({ T, children, padding = 0, style = {}, hoverable = false, accent, raised = true }) => (
  <div
    className={hoverable ? "lm-card-hover" : undefined}
    style={{
      background: T.surface || T.card,
      border: `1px solid ${T.border}`,
      borderRadius: RADIUS.lg,
      boxShadow: raised ? (T.shadow || "0 1px 3px rgba(0,0,0,0.06)") : (T.shadowSoft || "none"),
      padding,
      position: "relative",
      overflow: "hidden",
      ...(hoverable ? { cursor: "pointer" } : {}),
      ...style,
    }}
  >
    {accent && (
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background: accent }} />
    )}
    {children}
  </div>
);

// ── Section header (título de bloco) ──────────────────────────────────────────
export const SectionHeader = ({ T, title, subtitle, right, icon: Icon }) => (
  <div style={{
    padding: "16px 20px",
    borderBottom: `1px solid ${T.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  }}>
    <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
      {Icon && (
        <div style={{
          width:32, height:32, borderRadius: RADIUS.md,
          background: T.brandSoft || "rgba(101,179,46,0.10)",
          color: T.brand || "#65B32E",
          display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0,
        }}>
          <Icon size={16} strokeWidth={2.25} />
        </div>
      )}
      <div style={{ minWidth:0 }}>
        <h3 style={{
          margin:0,
          fontSize:13,
          fontWeight:600,
          color:T.text,
          fontFamily: FONT.ui,
          letterSpacing:"-0.005em",
        }}>{title}</h3>
        {subtitle && (
          <p style={{ margin:"2px 0 0", fontSize:11, color:T.textSm, fontFamily: FONT.ui }}>{subtitle}</p>
        )}
      </div>
    </div>
    {right && <div style={{ display:"flex", alignItems:"center", gap:8 }}>{right}</div>}
  </div>
);

// ── Stat / KPI corporativo ────────────────────────────────────────────────────
// Border-top 3px na cor semântica + valor em Alternate Gothic / Barlow Condensed.
export const Stat = ({ T, label, value, sub, color, icon: Icon, trend }) => {
  const accent = color || T.brand || "#65B32E";
  return (
    <div style={{
      background: T.surface || T.card,
      border: `1px solid ${T.border}`,
      borderRadius: RADIUS.lg,
      borderTop: `3px solid ${accent}`,
      padding: "16px 18px",
      position: "relative",
      overflow: "hidden",
      boxShadow: T.shadow || "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
        <p style={{
          color: T.textMd,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          margin: 0,
          fontFamily: FONT.ui,
        }}>{label}</p>
        {Icon && (
          <div style={{
            width: 28, height: 28, borderRadius: RADIUS.sm,
            background: `${accent}14`,
            color: accent,
            display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink: 0,
          }}>
            <Icon size={15} strokeWidth={2.25} />
          </div>
        )}
      </div>
      <p className="num" style={{
        fontFamily: FONT.display,
        fontSize: 36,
        fontWeight: 700,
        color: T.text,
        margin: "10px 0 4px",
        letterSpacing: "-0.01em",
        lineHeight: 1,
      }}>{value}</p>
      {(sub || trend) && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:2 }}>
          {trend && (
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: trend.positive ? (T.success || "#16A34A") : (T.danger || "#DC2626"),
              background: (trend.positive ? (T.success || "#16A34A") : (T.danger || "#DC2626")) + "1a",
              padding: "2px 7px",
              borderRadius: 4,
              fontFamily: FONT.ui,
              letterSpacing: "0.02em",
            }}>{trend.label}</span>
          )}
          {sub && <p style={{ color: T.textSm, fontSize: 11, margin: 0, fontWeight: 400, fontFamily: FONT.ui }}>{sub}</p>}
        </div>
      )}
    </div>
  );
};

// ── Button ────────────────────────────────────────────────────────────────────
// Primário: fundo verde sólido. Secundário: borda discreta. Destrutivo: vermelho pastel.
export const Button = ({ T, children, onClick, variant = "primary", size = "md", icon: Icon, style = {}, disabled, type, title, fullWidth }) => {
  const sizes = {
    sm: { padding: "5px 12px", fontSize: 11, iconSize: 13, gap: 6, height: 28 },
    md: { padding: "0 14px",   fontSize: 12, iconSize: 14, gap: 8, height: 32 },
    lg: { padding: "0 18px",   fontSize: 13, iconSize: 16, gap: 10, height: 38 },
  };
  const s = sizes[size];
  const variants = {
    primary: {
      background: T.brand || "#65B32E",
      color: "#fff",
      border: "1px solid transparent",
    },
    secondary: {
      background: "transparent",
      color: T.text,
      border: `1px solid ${T.borderStrong || T.border}`,
    },
    ghost: {
      background: "transparent",
      color: T.textMd,
      border: "1px solid transparent",
    },
    danger: {
      background: "rgba(220,38,38,0.08)",
      color: T.danger || "#DC2626",
      border: "1px solid rgba(220,38,38,0.2)",
    },
  };
  return (
    <button
      type={type || "button"}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...variants[variant],
        padding: s.padding,
        fontSize: s.fontSize,
        height: s.height,
        fontFamily: FONT.ui,
        fontWeight: variant === "primary" ? 500 : 400,
        borderRadius: 7,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        whiteSpace: "nowrap",
        width: fullWidth ? "100%" : "auto",
        letterSpacing: "0",
        ...style,
      }}
    >
      {Icon && <Icon size={s.iconSize} strokeWidth={2.25} />}
      {children}
    </button>
  );
};

// ── Badge ─────────────────────────────────────────────────────────────────────
// Soft pastel: 10% bg + 25% border + texto na cor (saturação reduzida).
export const Badge = ({ children, color, T, variant = "soft", size = "md" }) => {
  const c = color || T?.brand || "#65B32E";
  const sizes = {
    sm: { padding: "2px 8px", fontSize: 10, height: 20 },
    md: { padding: "0 10px",  fontSize: 11, height: 22 },
  };
  const styles = variant === "solid"
    ? { background: c, color: "#fff", border: "1px solid transparent" }
    : { background: c + "1a", color: c, border: `1px solid ${c}40` };
  return (
    <span style={{
      ...styles,
      ...sizes[size],
      borderRadius: RADIUS.pill,
      fontWeight: 600,
      fontFamily: FONT.ui,
      letterSpacing: "0.02em",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
};

// ── Progress bar ──────────────────────────────────────────────────────────────
// Barra fina (4px) com fill que anima ao montar.
export const Progress = ({ value, T, color, height = 4 }) => {
  const v = Math.max(0, Math.min(100, value || 0));
  const c = color || (v > 90 ? (T.danger || "#DC2626") : v > 60 ? (T.warning || "#D97706") : (T.brand || "#65B32E"));
  return (
    <div style={{
      background: "rgba(0,0,0,0.08)",
      borderRadius: 2,
      height,
      minWidth: 60,
      overflow: "hidden",
    }}>
      <div style={{
        background: c,
        width: `${v}%`,
        height: "100%",
        borderRadius: 2,
        transition: "width 600ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}/>
    </div>
  );
};

// ── Table primitives ──────────────────────────────────────────────────────────
export const tableStyles = (T) => ({
  wrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 500 },
  thead: { background: T.surfaceAlt || T.bg },
  th: {
    padding: "10px 14px",
    color: T.textSm,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    borderBottom: `1px solid ${T.border}`,
    fontFamily: FONT.ui,
  },
  thLeft: { textAlign: "left" },
  thRight: { textAlign: "right" },
  tr: { borderTop: `1px solid ${T.border}`, transition: "background .15s" },
  td: { padding: "12px 14px", fontSize: 13, color: T.text, fontFamily: FONT.ui },
  tdNum: { padding: "12px 14px", fontSize: 13, color: T.text, textAlign: "right", whiteSpace: "nowrap", fontFamily: FONT.num, fontVariantNumeric: "tabular-nums" },
  totalRow: { borderTop: `2px solid ${T.borderStrong || T.border}`, background: T.surfaceAlt || T.bg, fontWeight: 600 },
});

// Heading section padronizada (faixa superior em painel)
export const PanelTitle = ({ T, title, subtitle, color, right }) => {
  const c = color || T.brand || "#65B32E";
  return (
    <div style={{
      padding: "14px 20px",
      background: T.surfaceAlt || T.bg,
      borderBottom: `1px solid ${T.border}`,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 12,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
        <span style={{ width: 3, height: 22, background: c, borderRadius: 2 }}/>
        <div>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: T.text, fontFamily: FONT.ui, letterSpacing: "-0.005em" }}>{title}</h4>
          {subtitle && <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSm, fontFamily: FONT.ui }}>{subtitle}</p>}
        </div>
      </div>
      {right && <div style={{ display:"flex", alignItems:"center", gap:10 }}>{right}</div>}
    </div>
  );
};

// Chip (filtro de pílula segmentado)
export const Chip = ({ children, active, onClick, T, color }) => {
  const c = color || T.brand || "#65B32E";
  return (
    <button onClick={onClick} style={{
      padding: "5px 12px",
      height: 28,
      borderRadius: 6,
      border: active ? `1px solid ${c}` : `1px solid ${T.border}`,
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 500,
      background: active ? c + "1a" : (T.surface || T.card),
      color: active ? c : T.textMd,
      whiteSpace: "nowrap",
      fontFamily: FONT.ui,
      letterSpacing: "-0.005em",
    }}>{children}</button>
  );
};

// Segmented (toggle de modos / pills da topbar)
export const Segmented = ({ options, value, onChange, T }) => (
  <div style={{
    display: "inline-flex",
    background: T.surfaceAlt || T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: RADIUS.md,
    padding: 3,
    gap: 2,
  }}>
    {options.map(o => {
      const active = value === o.value;
      return (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          padding: "5px 12px",
          height: 24,
          borderRadius: 5,
          border: "none",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 500,
          background: active ? (T.brand || "#65B32E") : "transparent",
          color: active ? "#fff" : T.textMd,
          fontFamily: FONT.ui,
          letterSpacing: "0",
        }}>{o.label}</button>
      );
    })}
  </div>
);

// ── IconButton (sidebar / toolbar) ────────────────────────────────────────────
// Sidebar: ícones em opacidade 0.4 inativo, 1.0 ativo + borda esquerda verde + bg dim.
export const IconButton = ({ icon: Icon, onClick, title, active = false, size = 40, T, variant = "sidebar" }) => {
  const isSidebar = variant === "sidebar";
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: size,
        height: size,
        borderRadius: RADIUS.md,
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background: active
          ? (isSidebar ? "rgba(101,179,46,0.12)" : (T?.brandSoft || "rgba(101,179,46,0.10)"))
          : "transparent",
        color: active
          ? "#8ed45c"
          : (isSidebar ? "rgba(255,255,255,0.4)" : (T?.textMd || "#9CA3AF")),
        boxShadow: active && isSidebar ? "inset 3px 0 0 #65B32E" : "none",
        transition: "background-color .15s, color .15s, opacity .15s",
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = isSidebar ? "rgba(255,255,255,0.06)" : (T?.surfaceAlt || "rgba(0,0,0,0.04)");
          e.currentTarget.style.color = isSidebar ? "rgba(255,255,255,0.85)" : (T?.text || "#1A1A1A");
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = isSidebar ? "rgba(255,255,255,0.4)" : (T?.textMd || "#9CA3AF");
        }
      }}
    >
      <Icon size={18} strokeWidth={2} />
    </button>
  );
};
