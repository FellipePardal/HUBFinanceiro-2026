import { useState } from "react";
import { FONT } from "../constants";

// Logotipo Livemode oficial. Usa o PNG em /public/assets/logos/livemode.png.
// Se a imagem falhar, cai pro fallback inline (texto "LM" com bolinha verde).
//
// Props:
//   size — lado do quadrado em px (default 40)
//   onClick — opcional (vira <button>)
//   title — tooltip
export default function LivemodeLogo({ size = 40, onClick, title = "Livemode", radius = 8 }) {
  const [imgError, setImgError] = useState(false);

  const Wrapper = onClick ? "button" : "div";
  const wrapperProps = onClick
    ? { onClick, type: "button", title, "aria-label": title }
    : { title };

  if (!imgError) {
    return (
      <Wrapper
        {...wrapperProps}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: onClick ? "pointer" : "default",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <img
          src="/assets/logos/livemode.png"
          alt="Livemode"
          width={size}
          height={size}
          style={{
            width: size,
            height: size,
            objectFit: "cover",
            borderRadius: radius,
            display: "block",
          }}
          onError={() => setImgError(true)}
        />
      </Wrapper>
    );
  }

  // Fallback: marca inline LM + bolinha verde sobre fundo cinza-escuro Livemode
  return (
    <Wrapper
      {...wrapperProps}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "#585455",
        color: "#fff",
        border: "none",
        cursor: onClick ? "pointer" : "default",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        fontFamily: FONT.display,
        fontWeight: 700,
        fontSize: Math.round(size * 0.42),
        letterSpacing: "0.02em",
        flexShrink: 0,
      }}
    >
      LM<span style={{
        width: Math.round(size * 0.16),
        height: Math.round(size * 0.16),
        borderRadius: "50%",
        background: "#65B32E",
        display: "inline-block",
        marginLeft: 1,
      }}/>
    </Wrapper>
  );
}
