import { fmt } from "../utils";
import { RADIUS } from "../constants";

// Pill — preserva o contrato { label, color }, agora com visual refinado.
export const Pill = ({label, color}) => (
  <span style={{
    background: color + "1f",
    color,
    border: `1px solid ${color}33`,
    borderRadius: RADIUS.pill,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
  }}>{label}</span>
);

// KPI — preserva o contrato { label, value, sub, color, T }, agora com visual de stat corporativo.
export const KPI = ({label, value, sub, color, T}) => {
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
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:accent, boxShadow:`0 0 24px ${accent}88` }}/>
      <p style={{
        color: T.textMd,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        margin: "4px 0 0",
      }}>{label}</p>
      <p className="num" style={{
        fontSize: 30,
        fontWeight: 800,
        color: T.text,
        margin: "14px 0 6px",
        letterSpacing: "-0.025em",
        lineHeight: 1,
      }}>{value}</p>
      {sub && <p style={{ color: T.textSm, fontSize: 11, margin: 0, fontWeight:500 }}>{sub}</p>}
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
      boxShadow: T.shadow || "0 8px 24px rgba(0,0,0,0.2)",
    }}>
      <p style={{color: T.textMd, marginBottom: 6, fontWeight: 600, fontSize: 12}}>{label}</p>
      {payload.map(p => (
        <p key={p.name} className="num" style={{color: p.fill||p.color, margin: "2px 0", fontSize: 12}}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};
