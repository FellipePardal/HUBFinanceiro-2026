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

// ─── ACESSO DO VISUALIZADOR POR ENTIDADE ─────────────────────────────────────
// Valores possíveis de profiles.entidade (múltiplos separados por vírgula).
// Os ids reaproveitam os ids de campeonato por legado — "brasileirao-2026"
// significa FFU e "paulistao-feminino-2026" significa FPF.
export const ENTIDADES_VISUALIZADOR = [
  { id: "brasileirao-2026",        label: "FFU - Futebol Forte União" },
  { id: "paulistao-feminino-2026", label: "FPF - Federação Paulista de Futebol" },
  { id: "outro",                   label: "Outro" },
];

// Um usuário com esse role/entidade pode ver o campeonato?
// `organizador` = entidade dona de um campeonato custom (config.organizador,
// um dos ids de ENTIDADES_VISUALIZADOR). Custom sem organizador definido fica
// visível só para "outro"/sem entidade — negar por padrão evita vazamento.
export function podeVerCampeonato(role, entidadeStr, campId, organizador = null) {
  if (role !== "visualizador") return true;
  const ents = String(entidadeStr || "").split(",").map(s => s.trim()).filter(Boolean);
  if (ents.length === 0 || ents.includes("outro")) return true;
  const dono = campId === "brasileirao-2026" || campId === "paulistao-feminino-2026"
    ? campId
    : (organizador === "outro" ? null : organizador || null);
  return dono != null && ents.includes(dono);
}
