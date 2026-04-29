import { useState } from "react";
import { getEntity } from "../config/entities";
import { FONT } from "../constants";

// Logo compacto de entidade (organizador / detentor) com fallback de iniciais.
// Use em badges, listas de detentores, breadcrumbs, etc.
//
// Props:
//   entityId — id em src/config/entities.js (ex: "cazetv", "cbf")
//   size     — tamanho em px (default 24)
//   title    — tooltip (default = name da entidade)
//   showName — mostra label ao lado do logo (default false)
export default function EntityLogo({ entityId, size = 24, title, showName = false, T }) {
  const ent = getEntity(entityId);
  const [imgError, setImgError] = useState(false);

  const logo = ent.logo && !imgError ? (
    <img
      src={ent.logo}
      alt={ent.name}
      title={title || ent.name}
      width={size}
      height={size}
      style={{
        objectFit: "contain",
        borderRadius: 4,
        flexShrink: 0,
      }}
      onError={() => setImgError(true)}
    />
  ) : (
    <span
      title={title || ent.name}
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        background: `${ent.color}1a`,
        color: ent.color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT.display,
        fontWeight: 700,
        fontSize: Math.round(size * 0.42),
        flexShrink: 0,
        letterSpacing: "0.01em",
      }}
    >
      {ent.logoFallback}
    </span>
  );

  if (!showName) return logo;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontFamily: FONT.ui, fontSize: 11, color: T?.text || "#1A1A1A" }}>
      {logo}
      {ent.name}
    </span>
  );
}

// Lista horizontal de logos sobrepostos (avatar stack) — útil para "detentores".
export function EntityLogoStack({ entityIds = [], size = 24, max = 4, T }) {
  const visible = entityIds.slice(0, max);
  const rest = entityIds.length - visible.length;
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {visible.map((id, i) => (
        <span key={id} style={{
          marginLeft: i === 0 ? 0 : -6,
          background: T?.surface || "#fff",
          padding: 1,
          borderRadius: 5,
          display: "inline-flex",
        }}>
          <EntityLogo entityId={id} size={size} T={T}/>
        </span>
      ))}
      {rest > 0 && (
        <span style={{
          marginLeft: -6,
          width: size,
          height: size,
          borderRadius: 4,
          background: T?.surfaceAlt || "#F8F9FA",
          color: T?.textMd || "#6B7280",
          border: `1px solid ${T?.border || "rgba(0,0,0,0.08)"}`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT.ui,
          fontSize: 10,
          fontWeight: 600,
          flexShrink: 0,
        }}>+{rest}</span>
      )}
    </span>
  );
}
