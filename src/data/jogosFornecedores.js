// ─── JOGOS DO MÓDULO DE FORNECEDORES ─────────────────────────────────────────
// Coleção dedicada de jogos com a estrutura que o módulo de Fornecedores
// precisa: campeonatoId, cidadeId, categoria (B1/B2/...), data ISO,
// mandante e visitante. Independente de src/data.js (que serve ao módulo
// financeiro original e tem outro shape).
//
// Objetivo: alimentar Próximos Jogos e Cotações com dados reais. Quando o
// "portal matriz" (substituto da planilha de controle) entrar no ar, esse
// arquivo é descartado e o adapter src/lib/portalMatriz.js passa a buscar
// da API real — o resto do sistema não muda.
//
// Persistido em app_state.forn_jogos. O seed roda apenas se a chave estiver
// vazia, então editar este arquivo NÃO sobrescreve o que já está salvo.

// Estrutura de um jogo:
// {
//   id: 'j-2026-r1-001',
//   campeonatoId: 'brasileirao-2026',
//   cidadeId: 'rj-rj',
//   categoria: 'B1',
//   rodada: 1,
//   data: '2026-04-12T16:00:00-03:00',
//   mandante: 'Flamengo',
//   visitante: 'Atlético MG',
//   estadio: 'Maracanã',
// }

const j = (id, rodada, cidadeId, categoria, data, mandante, visitante, estadio) => ({
  id, campeonatoId: "brasileirao-2026", cidadeId, categoria, rodada, data, mandante, visitante, estadio,
});

// Mock inicial: 3 rodadas distribuídas pelas cidades-sede do Brasileirão.
// O catálogo real virá do portal matriz; aqui o objetivo é só ter dados
// suficientes para validar fluxos de cotação e dashboard.
export const JOGOS_FORN_INIT = [
  // Rodada 1 — abertura
  j("j-r1-01", 1, "rj-rj",  "B1", "2026-04-11T16:00:00-03:00", "Flamengo",     "Atlético MG", "Maracanã"),
  j("j-r1-02", 1, "sp-sp",  "B1", "2026-04-11T18:30:00-03:00", "Corinthians",  "Palmeiras",   "Neo Química"),
  j("j-r1-03", 1, "poa-rs", "B2", "2026-04-12T16:00:00-03:00", "Internacional","Grêmio",      "Beira-Rio"),
  j("j-r1-04", 1, "bh-mg",  "B2", "2026-04-12T18:30:00-03:00", "Cruzeiro",     "Vitória",     "Mineirão"),
  j("j-r1-05", 1, "rec-pe", "B2", "2026-04-12T20:00:00-03:00", "Sport",        "Bahia",       "Ilha do Retiro"),
  j("j-r1-06", 1, "cwb-pr", "B2", "2026-04-13T19:00:00-03:00", "Athletico PR", "Coritiba",    "Arena da Baixada"),
  j("j-r1-07", 1, "for-ce", "B2", "2026-04-13T21:30:00-03:00", "Fortaleza",    "Ceará",       "Castelão"),
  j("j-r1-08", 1, "ssa-ba", "B2", "2026-04-14T20:00:00-03:00", "Vitória",      "Bahia",       "Barradão"),
  j("j-r1-09", 1, "chp-sc", "B2", "2026-04-14T21:30:00-03:00", "Chapecoense",  "Athletico PR","Arena Condá"),
  j("j-r1-10", 1, "mir-sp", "B2", "2026-04-15T19:00:00-03:00", "Mirassol",     "Santos",      "Maião"),

  // Rodada 2
  j("j-r2-01", 2, "rj-rj",  "B1", "2026-04-18T16:00:00-03:00", "Fluminense",   "Botafogo",    "Maracanã"),
  j("j-r2-02", 2, "sp-sp",  "B1", "2026-04-18T18:30:00-03:00", "São Paulo",    "Palmeiras",   "Morumbi"),
  j("j-r2-03", 2, "bh-mg",  "B2", "2026-04-19T16:00:00-03:00", "Atlético MG",  "Cruzeiro",    "Arena MRV"),
  j("j-r2-04", 2, "poa-rs", "B2", "2026-04-19T18:30:00-03:00", "Grêmio",       "Internacional","Arena do Grêmio"),
  j("j-r2-05", 2, "rec-pe", "B2", "2026-04-19T20:00:00-03:00", "Bahia",        "Sport",       "Arena Pernambuco"),
  j("j-r2-06", 2, "for-ce", "B2", "2026-04-20T19:00:00-03:00", "Ceará",        "Fortaleza",   "Castelão"),
  j("j-r2-07", 2, "cwb-pr", "B2", "2026-04-20T21:30:00-03:00", "Coritiba",     "Athletico PR","Couto Pereira"),
  j("j-r2-08", 2, "ssa-ba", "B2", "2026-04-21T20:00:00-03:00", "Bahia",        "Vitória",     "Arena Fonte Nova"),

  // Rodada 3
  j("j-r3-01", 3, "rj-rj",  "B1", "2026-04-25T16:00:00-03:00", "Flamengo",     "Fluminense",  "Maracanã"),
  j("j-r3-02", 3, "sp-sp",  "B1", "2026-04-25T18:30:00-03:00", "Palmeiras",    "Corinthians", "Allianz Parque"),
  j("j-r3-03", 3, "bh-mg",  "B2", "2026-04-26T16:00:00-03:00", "Cruzeiro",     "Atlético MG", "Mineirão"),
  j("j-r3-04", 3, "poa-rs", "B2", "2026-04-26T18:30:00-03:00", "Internacional","Grêmio",      "Beira-Rio"),
  j("j-r3-05", 3, "rj-rj",  "B2", "2026-04-26T20:00:00-03:00", "Vasco",        "Botafogo",    "São Januário"),
  j("j-r3-06", 3, "cwb-pr", "B2", "2026-04-27T19:00:00-03:00", "Athletico PR", "Coritiba",    "Arena da Baixada"),
];
