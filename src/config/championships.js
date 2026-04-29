// ─── CONFIG DE CAMPEONATOS ────────────────────────────────────────────────────
// Logos, cores oficiais e fundos temáticos por campeonato.
// Adicione novos campeonatos aqui — o componente ChampionshipLogo cuida do
// fallback (iniciais com cor do campeonato) caso a imagem ainda não exista.
export const CHAMPIONSHIP_CONFIG = {
  "brasileirao-2026": {
    logo: "/assets/championships/brasileirao-serie-a.png",
    logoFallback: "BR",
    accentColor: "#009C3B",
    bgColor: "#161616",
  },
  "paulistao-feminino-2026": {
    logo: "/assets/championships/paulistao-feminino.png",
    logoFallback: "PF",
    accentColor: "#7C3AED",
    bgColor: "#161616",
  },
};

export function getChampionshipConfig(id, fallback = {}) {
  return CHAMPIONSHIP_CONFIG[id] || {
    logo: null,
    logoFallback: (fallback.nome || "??").slice(0, 2).toUpperCase(),
    accentColor: fallback.cor || "#65B32E",
    bgColor: "#161616",
  };
}
