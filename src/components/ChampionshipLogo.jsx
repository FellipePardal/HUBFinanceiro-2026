import { useState } from "react";
import { getChampionshipConfig } from "../config/championships";
import { FONT } from "../constants";

// Logo de campeonato com fallback para iniciais coloridas.
// Props:
//   championshipId — id do campeonato (chave em CHAMPIONSHIP_CONFIG)
//   size           — tamanho em px (default 48)
//   config         — fallback para campeonatos custom (passar { nome, cor, bgColor, corGrad })
export default function ChampionshipLogo({ championshipId, size = 48, config: customConfig, radius = 8 }) {
  const config = getChampionshipConfig(championshipId, customConfig || {});
  const [imgError, setImgError] = useState(false);

  if (config.logo && !imgError) {
    return (
      <img
        src={config.logo}
        alt={championshipId}
        width={size}
        height={size}
        style={{
          objectFit: "contain",
          borderRadius: radius,
          padding: 4,
          flexShrink: 0,
        }}
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback: iniciais com cor do campeonato.
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: radius,
      background: `${config.accentColor}22`,
      border: `1px solid ${config.accentColor}55`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT.display,
      fontWeight: 700,
      fontSize: Math.round(size * 0.36),
      color: config.accentColor,
      flexShrink: 0,
      letterSpacing: "0.02em",
    }}>
      {config.logoFallback}
    </div>
  );
}
