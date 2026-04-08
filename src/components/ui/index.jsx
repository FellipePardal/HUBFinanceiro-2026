// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
// Componentes base do design system corporativo. Reutilizáveis em todo o portal.
// IMPORTANTE: nada aqui altera dados, fórmulas ou lógica do app — apenas visual.

import { RADIUS, FONT } from "../../constants";

// ── Surface / Card ────────────────────────────────────────────────────────────
export const Card = ({ T, children, padding = 0, style = {}, hoverable = false, accent, raised = true }) => (
  <div
    style={{
      background: T.surface || T.card,
      backgroundImage: T.gradCard || "none",
      border: `1px solid ${T.border}`,
      borderRadius: RADIUS.lg,
      boxShadow: raised ? (T.shadow || T.shadowSoft || "none") : (T.shadowSoft || "none"),
      padding,
      position: "relative",
      overflow: "hidden",
      transition: "border-color .2s, box-shadow .2s, transform .2s",
      ...(hoverable ? { cursor: "pointer" } : {}),
      ...style,
    }}
  >
    {accent && (
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background: accent, boxShadow:`0 0 18px ${accent}66` }} />
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
          width:32, height:32, borderRadius:8,
          background: T.brandSoft || "rgba(16,185,129,0.1)",
          color: T.brand || "#10b981",
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
          fontWeight:700,
          color:T.text,
          letterSpacing:"-0.01em",
        }}>{title}</h3>
        {subtitle && (
          <p style={{ margin:"2px 0 0", fontSize:11, color:T.textSm }}>{subtitle}</p>
        )}
      </div>
    </div>
    {right && <div style={{ display:"flex", alignItems:"center", gap:8 }}>{right}</div>}
  </div>
);

// ── Stat / KPI corporativo ────────────────────────────────────────────────────
export const Stat = ({ T, label, value, sub, color, icon: Icon, trend }) => {
  const accent = color || T.brand || "#10b981";
  return (
    <div style={{
      background: T.surface || T.card,
      backgroundImage: `${T.gradCard || ""}, radial-gradient(circle at 0% 0%, ${accent}14 0%, transparent 55%)`,
      border: `1px solid ${T.border}`,
      borderRadius: RADIUS.lg,
      padding: "20px 22px 22px",
      position: "relative",
      overflow: "hidden",
      boxShadow: T.shadow || "none",
      transition: "border-color .2s, transform .2s, box-shadow .2s",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:accent, boxShadow:`0 0 24px ${accent}88` }}/>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginTop:4 }}>
        <p style={{
          color:T.textMd,
          fontSize:11,
          fontWeight:700,
          letterSpacing:"0.08em",
          textTransform:"uppercase",
          margin:0,
        }}>{label}</p>
        {Icon && (
          <div style={{
            width:34, height:34, borderRadius:10,
            background:`${accent}1f`,
            color:accent,
            border:`1px solid ${accent}3a`,
            display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink:0,
            boxShadow:`0 4px 12px ${accent}22`,
          }}>
            <Icon size={16} strokeWidth={2.25} />
          </div>
        )}
      </div>
      <p className="num" style={{
        fontSize:30,
        fontWeight:800,
        color:T.text,
        margin:"14px 0 6px",
        letterSpacing:"-0.025em",
        lineHeight:1,
      }}>{value}</p>
      {(sub || trend) && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
          {trend && (
            <span style={{
              fontSize:11,
              fontWeight:700,
              color: trend.positive ? (T.success||"#22c55e") : (T.danger||"#ef4444"),
              background: (trend.positive ? (T.success||"#22c55e") : (T.danger||"#ef4444")) + "1f",
              padding:"3px 8px",
              borderRadius:6,
            }}>{trend.label}</span>
          )}
          {sub && <p style={{ color:T.textSm, fontSize:11, margin:0, fontWeight:500 }}>{sub}</p>}
        </div>
      )}
    </div>
  );
};

// ── Button ────────────────────────────────────────────────────────────────────
export const Button = ({ T, children, onClick, variant = "primary", size = "md", icon: Icon, style = {}, disabled, type, title, fullWidth }) => {
  const sizes = {
    sm: { padding: "6px 12px", fontSize: 12, iconSize: 14, gap: 6 },
    md: { padding: "9px 16px", fontSize: 13, iconSize: 15, gap: 8 },
    lg: { padding: "12px 22px", fontSize: 14, iconSize: 16, gap: 10 },
  };
  const s = sizes[size];
  const variants = {
    primary: {
      background: T.gradBrand || T.brand || "#10b981",
      color: "#fff",
      border: "1px solid transparent",
      boxShadow: "0 1px 0 rgba(255,255,255,0.15) inset, 0 1px 2px rgba(0,0,0,0.2)",
    },
    secondary: {
      background: T.surface || T.card,
      color: T.text,
      border: `1px solid ${T.borderStrong || T.border}`,
    },
    ghost: {
      background: "transparent",
      color: T.textMd,
      border: "1px solid transparent",
    },
    danger: {
      background: T.danger || "#ef4444",
      color: "#fff",
      border: "1px solid transparent",
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
        fontFamily: FONT.ui,
        fontWeight: 600,
        borderRadius: RADIUS.md,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        whiteSpace: "nowrap",
        transition: "transform .1s, box-shadow .2s, background .2s",
        width: fullWidth ? "100%" : "auto",
        letterSpacing: "-0.005em",
        ...style,
      }}
    >
      {Icon && <Icon size={s.iconSize} strokeWidth={2.25} />}
      {children}
    </button>
  );
};

// ── Badge ─────────────────────────────────────────────────────────────────────
export const Badge = ({ children, color, T, variant = "soft", size = "md" }) => {
  const c = color || T?.brand || "#10b981";
  const sizes = {
    sm: { padding: "2px 8px", fontSize: 10 },
    md: { padding: "3px 10px", fontSize: 11 },
  };
  const styles = variant === "solid"
    ? { background: c, color: "#fff", border: "1px solid transparent" }
    : { background: c + "1f", color: c, border: `1px solid ${c}33` };
  return (
    <span style={{
      ...styles,
      ...sizes[size],
      borderRadius: RADIUS.pill,
      fontWeight: 600,
      letterSpacing: "0.01em",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
};

// ── Progress bar ──────────────────────────────────────────────────────────────
export const Progress = ({ value, T, color, height = 6 }) => {
  const v = Math.max(0, Math.min(100, value || 0));
  const c = color || (v > 90 ? (T.danger || "#ef4444") : v > 60 ? (T.warning || "#f59e0b") : (T.brand || "#10b981"));
  return (
    <div style={{
      background: T.surfaceAlt || T.bg,
      borderRadius: RADIUS.pill,
      height,
      minWidth: 60,
      overflow: "hidden",
    }}>
      <div style={{
        background: c,
        width: `${v}%`,
        height: "100%",
        borderRadius: RADIUS.pill,
        transition: "width .4s ease",
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
    padding: "12px 16px",
    color: T.textSm,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    borderBottom: `1px solid ${T.border}`,
  },
  thLeft: { textAlign: "left" },
  thRight: { textAlign: "right" },
  tr: { borderTop: `1px solid ${T.border}`, transition: "background .15s" },
  td: { padding: "13px 16px", fontSize: 13, color: T.text },
  tdNum: { padding: "13px 16px", fontSize: 13, color: T.text, textAlign: "right", whiteSpace: "nowrap" },
  totalRow: { borderTop: `2px solid ${T.borderStrong || T.border}`, background: T.surfaceAlt || T.bg, fontWeight: 700 },
});

// Heading section padronizada (faixa superior em painel)
export const PanelTitle = ({ T, title, subtitle, color, right }) => {
  const c = color || T.brand || "#10b981";
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
        <span style={{ width: 4, height: 22, background: c, borderRadius: 2, boxShadow: `0 0 12px ${c}88` }}/>
        <div>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "-0.005em" }}>{title}</h4>
          {subtitle && <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSm }}>{subtitle}</p>}
        </div>
      </div>
      {right && <div style={{ display:"flex", alignItems:"center", gap:10 }}>{right}</div>}
    </div>
  );
};

// Chip (filtro de pílula segmentado)
export const Chip = ({ children, active, onClick, T, color }) => {
  const c = color || T.brand || "#10b981";
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px",
      borderRadius: RADIUS.pill,
      border: active ? `1px solid ${c}` : `1px solid ${T.border}`,
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
      background: active ? c + "1f" : (T.surface || T.card),
      color: active ? c : T.textMd,
      transition: "all .15s",
      whiteSpace: "nowrap",
      letterSpacing: "-0.005em",
      boxShadow: active ? `0 0 0 3px ${c}1a` : "none",
    }}>{children}</button>
  );
};

// Segmented (toggle de modos)
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
          padding: "6px 14px",
          borderRadius: RADIUS.sm,
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          background: active ? (T.brand || "#10b981") : "transparent",
          color: active ? "#fff" : T.textMd,
          transition: "all .15s",
          letterSpacing: "-0.005em",
          boxShadow: active ? `0 2px 8px ${(T.brand || "#10b981")}55` : "none",
        }}>{o.label}</button>
      );
    })}
  </div>
);

// ── IconButton (sidebar / toolbar) ────────────────────────────────────────────
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
        background: active
          ? (isSidebar ? "rgba(16,185,129,0.18)" : (T?.brandSoft || "rgba(16,185,129,0.1)"))
          : (isSidebar ? "transparent" : (T?.surface || "transparent")),
        color: active
          ? "#34d399"
          : (isSidebar ? "#94a3b8" : (T?.textMd || "#94a3b8")),
        boxShadow: active && isSidebar ? "inset 2px 0 0 #10b981" : "none",
        transition: "all .15s",
      }}
      onMouseEnter={e => { if(!active) e.currentTarget.style.background = isSidebar ? "rgba(255,255,255,0.06)" : (T?.surfaceAlt || "rgba(0,0,0,0.04)"); }}
      onMouseLeave={e => { if(!active) e.currentTarget.style.background = isSidebar ? "transparent" : (T?.surface || "transparent"); }}
    >
      <Icon size={18} strokeWidth={2} />
    </button>
  );
};
