import { fmt } from "../utils";
import { RADIUS, FONT } from "../constants";

// Pill — preserva o contrato { label, color }, agora com visual pastel refinado.
export const Pill = ({label, color}) => (
  <span style={{
    background: color + "1a",
    color,
    border: `1px solid ${color}40`,
    borderRadius: RADIUS.pill,
    padding: "0 10px",
    height: 22,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: FONT.ui,
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
  }}>{label}</span>
);

// KPI — preserva contrato { label, value, sub, color, T }, agora com visual Livemode.
// Border-top 3px na cor semântica + valor em Barlow Condensed (Alternate Gothic).
export const KPI = ({label, value, sub, color, T}) => {
  const accent = color || T.brand || "#65B32E";
  return (
    <div style={{
      background: T.surface || T.card,
      border: `1px solid ${T.border}`,
      borderTop: `3px solid ${accent}`,
      borderRadius: RADIUS.lg,
      padding: "16px 18px",
      position: "relative",
      overflow: "hidden",
      boxShadow: T.shadow || "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <p style={{
        color: T.textMd,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        margin: 0,
        fontFamily: FONT.ui,
      }}>{label}</p>
      <p className="num" style={{
        fontFamily: FONT.display,
        fontSize: 36,
        fontWeight: 700,
        color: T.text,
        margin: "10px 0 4px",
        letterSpacing: "-0.01em",
        lineHeight: 1,
      }}>{value}</p>
      {sub && <p style={{ color: T.textSm, fontSize: 11, margin: 0, fontWeight: 400, fontFamily: FONT.ui }}>{sub}</p>}
    </div>
  );
};

export const CustomTooltip = ({active, payload, label, T}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{
      background: T.surface || T.card,
      border: `1px solid ${T.borderStrong || T.border}`,
      borderRadius: RADIUS.md,
      padding: "10px 14px",
      boxShadow: T.shadow || "0 8px 24px rgba(0,0,0,0.12)",
      fontFamily: FONT.ui,
    }}>
      <p style={{color: T.textMd, marginBottom: 6, fontWeight: 500, fontSize: 12}}>{label}</p>
      {payload.map(p => (
        <p key={p.name} className="num" style={{color: p.fill||p.color, margin: "2px 0", fontSize: 12}}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};
