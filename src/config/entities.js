// ─── ENTIDADES (organizadores + detentores) ──────────────────────────────────
// Drop os PNGs/SVGs em /public/assets/entities/ com o nome do `logo` aqui.
// Se faltar arquivo, o EntityLogo cai pro logoFallback (iniciais).
export const ENTITIES = {
  // Organizadores
  "cbf": {
    name: "CBF",
    type: "organizador",
    logo: "/assets/entities/cbf.png",
    logoFallback: "CBF",
    color: "#FACC15",
  },
  "fpf": {
    name: "FPF",
    type: "organizador",
    logo: "/assets/entities/fpf.png",
    logoFallback: "FPF",
    color: "#DC2626",
  },

  // Detentores (broadcasters)
  "cazetv": {
    name: "CazeTV",
    type: "detentor",
    logo: "/assets/entities/cazetv.png",
    logoFallback: "CT",
    color: "#1A1A1A",
  },
  "record": {
    name: "Record",
    type: "detentor",
    logo: "/assets/entities/record.png",
    logoFallback: "RC",
    color: "#0F4C9F",
  },
  "premiere": {
    name: "Premiere",
    type: "detentor",
    logo: "/assets/entities/premiere.png",
    logoFallback: "PM",
    color: "#E60000",
  },
  "amazon": {
    name: "Amazon",
    type: "detentor",
    logo: "/assets/entities/amazon.png",
    logoFallback: "AM",
    color: "#FF9900",
  },
};

export function getEntity(id) {
  return ENTITIES[id] || {
    name: id,
    type: "outro",
    logo: null,
    logoFallback: (id || "??").slice(0, 2).toUpperCase(),
    color: "#6B7280",
  };
}

// Mapa: id de campeonato → ids de entidades organizadoras + detentores.
// Adicione aqui quando criar campeonatos novos.
export const CAMPEONATO_ENTITIES = {
  "brasileirao-2026": {
    organizador: "cbf",
    detentores: ["cazetv", "record", "premiere", "amazon"],
  },
  "paulistao-feminino-2026": {
    organizador: "fpf",
    detentores: [],
  },
};
