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
        flexShrink: 0,
        background: "transparent",
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
// Hover: item ativo cresce e ganha sombra; demais ficam com blur e opacidade reduzida.
export function EntityLogoStack({ entityIds = [], size = 24, max = 4, T, overlap = 8 }) {
  const [hover, setHover] = useState(null);
  const visible = entityIds.slice(0, max);
  const rest = entityIds.length - visible.length;
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center" }}
      onMouseLeave={() => setHover(null)}
    >
      {visible.map((id, i) => {
        const isActive = hover === i;
        const isOther = hover !== null && hover !== i;
        return (
          <span
            key={id}
            className="entity-stack-item"
            onMouseEnter={() => setHover(i)}
            style={{
              marginLeft: i === 0 ? 0 : -overlap,
              display: "inline-flex",
              position: "relative",
              zIndex: isActive ? 99 : (i + 1),
              transition: "transform 240ms cubic-bezier(0.16, 1, 0.3, 1), filter 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms cubic-bezier(0.16, 1, 0.3, 1)",
              cursor: "default",
              transform: isActive ? "translateY(-4px) scale(1.45)" : "none",
              opacity: isOther ? 0.4 : 1,
              filter: isActive
                ? "drop-shadow(0 10px 18px rgba(0,0,0,0.32))"
                : isOther
                  ? "blur(2.5px) drop-shadow(0 1px 1px rgba(0,0,0,0.10))"
                  : "drop-shadow(0 1px 2px rgba(0,0,0,0.18))",
            }}
          >
            <EntityLogo entityId={id} size={size} T={T}/>
          </span>
        );
      })}
      {rest > 0 && (
        <span style={{
          marginLeft: -overlap,
          width: size,
          height: size,
          borderRadius: 4,
          color: T?.textMd || "#6B7280",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT.ui,
          fontSize: 10,
          fontWeight: 600,
          flexShrink: 0,
          position: "relative",
          zIndex: visible.length + 1,
          transition: "opacity 240ms, filter 240ms",
          opacity: hover !== null ? 0.4 : 1,
          filter: hover !== null ? "blur(2.5px)" : "none",
        }}>+{rest}</span>
      )}
    </span>
  );
}
