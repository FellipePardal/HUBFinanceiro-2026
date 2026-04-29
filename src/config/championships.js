// ─── CONFIG DE CAMPEONATOS ────────────────────────────────────────────────────
// Logos, cores oficiais e fundos temáticos por campeonato.
// Adicione novos campeonatos aqui — o componente ChampionshipLogo cuida do
// fallback (iniciais com cor do campeonato) caso a imagem ainda não exista.
export const CHAMPIONSHIP_CONFIG = {
  "brasileirao-2026": {
    logo: "/assets/championships/brasileirao-serie-a.png",
    logoFallback: "BR",
    accentColor: "#009C3B",
    bgColor: "#0A1A0B",
    bgGradient: "radial-gradient(ellipse at 80% 50%, rgba(0,156,59,0.15) 0%, #0A1A0B 70%)",
  },
  "paulistao-feminino-2026": {
    logo: "/assets/championships/paulistao-feminino.png",
    logoFallback: "PF",
    accentColor: "#7C3AED",
    bgColor: "#150A1A",
    bgGradient: "radial-gradient(ellipse at 80% 50%, rgba(124,58,237,0.18) 0%, #150A1A 70%)",
  },
};

export function getChampionshipConfig(id, fallback = {}) {
  return CHAMPIONSHIP_CONFIG[id] || {
    logo: null,
    logoFallback: (fallback.nome || "??").slice(0, 2).toUpperCase(),
    accentColor: fallback.cor || "#65B32E",
    bgColor: fallback.bgColor || "#1A1A1A",
    bgGradient: fallback.corGrad || `radial-gradient(ellipse at 80% 50%, ${(fallback.cor || "#65B32E")}22 0%, #1A1A1A 70%)`,
  };
}
