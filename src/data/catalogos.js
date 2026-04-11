// ─── CATÁLOGOS DO HUB DE FORNECEDORES ────────────────────────────────────────
// Entidades de fundação do novo modelo de negociação:
//   • cidades (id, nome, uf)
//   • campeonatos do hub (id, nome, ano, ativo, cidadeIds[], categorias[])
//   • catálogo de itens por fornecedor (vive em fornecedor.catalogo)
//
// Persistidos via Supabase em app_state nas keys:
//   forn_cidades · forn_campeonatos
// O catálogo de itens vive aninhado dentro de cada fornecedor (key fornecedores).

// ── Cidades ────────────────────────────────────────────────────────────────
// Lista inicial com as praças mais comuns. Pode ser editada na sub-aba
// Catálogos. O ID é estável (slug) pra não quebrar referências históricas.
export const CIDADES_INIT = [
  { id:"rj-rj",  nome:"Rio de Janeiro", uf:"RJ" },
  { id:"sp-sp",  nome:"São Paulo",      uf:"SP" },
  { id:"bh-mg",  nome:"Belo Horizonte", uf:"MG" },
  { id:"poa-rs", nome:"Porto Alegre",   uf:"RS" },
  { id:"cwb-pr", nome:"Curitiba",       uf:"PR" },
  { id:"rec-pe", nome:"Recife",         uf:"PE" },
  { id:"ssa-ba", nome:"Salvador",       uf:"BA" },
  { id:"for-ce", nome:"Fortaleza",      uf:"CE" },
  { id:"goi-go", nome:"Goiânia",        uf:"GO" },
  { id:"chp-sc", nome:"Chapecó",        uf:"SC" },
  { id:"mir-sp", nome:"Mirassol",       uf:"SP" },
];

// ── Categorias de jogo ─────────────────────────────────────────────────────
// Por enquanto o Brasileirão usa B1 e B2. As categorias são configuráveis
// por campeonato pra acomodar futuras competições com classificação distinta.
export const CATEGORIAS_DEFAULT = [
  { codigo:"B1", nome:"B1" },
  { codigo:"B2", nome:"B2" },
];

// ── Campeonatos do hub ─────────────────────────────────────────────────────
// Diferente de constants.CAMPEONATOS (usado pra navegação no portal),
// aqui guardamos os dados operacionais usados pelo módulo de negociação:
// cidades-sede e categorias ativas. Apenas campeonatos `ativo:true` aparecem
// nos seletores de cotação e tabela de preços.
export const CAMPEONATOS_FORN_INIT = [
  {
    id:"brasileirao-2026",
    nome:"Brasileirão Série A 2026",
    ano:2026,
    ativo:true,
    cidadeIds:["rj-rj","sp-sp","bh-mg","poa-rs","cwb-pr","rec-pe","ssa-ba","for-ce","chp-sc","mir-sp"],
    categorias:[
      { codigo:"B1", nome:"B1" },
      { codigo:"B2", nome:"B2" },
    ],
  },
];

// ── Unidades de medida do catálogo de itens ────────────────────────────────
// Equipamentos/periféricos/UM são contratados por jogo. Prestadores
// (coordenadores, operadores) são contratados por diária ou por diária +
// alimentação. Hora e unidade existem como escape pra casos pontuais.
export const UNIDADES_MEDIDA = [
  { key:"jogo",               label:"Por jogo" },
  { key:"diaria",             label:"Diária" },
  { key:"diaria_alimentacao", label:"Diária + Alimentação" },
  { key:"hora",               label:"Hora" },
  { key:"unidade",            label:"Unidade" },
];

export const unidadeLabel = key =>
  UNIDADES_MEDIDA.find(u => u.key === key)?.label || key || "—";

// ── Tabelas de preço ───────────────────────────────────────────────────────
// Cada tabela = um snapshot da matriz de preços de UM fornecedor para UM
// campeonato. Persistida em app_state.forn_tabelas_preco como array.
//
// Estrutura de valores: objeto aninhado para tornar a edição na UI eficiente
//   valores[itemId][cidadeId][categoriaCodigo] = number
//
// Status do ciclo de vida:
//   rascunho   — admin criou e está montando localmente
//   enviada    — admin gerou link e fornecedor preencheu/devolveu
//   devolvida  — admin revisou e devolveu para ajustes
//   vigente    — aprovada, valores em uso para cotações
//   arquivada  — substituída por uma versão mais nova
export const STATUS_TABELA = [
  { key:"rascunho",  label:"Rascunho",  color:"#64748b" },
  { key:"enviada",   label:"Enviada",   color:"#3b82f6" },
  { key:"devolvida", label:"Devolvida", color:"#f59e0b" },
  { key:"vigente",   label:"Vigente",   color:"#10b981" },
  { key:"arquivada", label:"Arquivada", color:"#94a3b8" },
];

export const statusTabelaInfo = key =>
  STATUS_TABELA.find(s => s.key === key) || STATUS_TABELA[0];

export function criarTabelaVazia({ fornecedorId, campeonatoId }) {
  const now = new Date().toISOString();
  return {
    id: `tab-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    fornecedorId,
    campeonatoId,
    status: "rascunho",
    versao: 1,
    observacoes: "",
    valores: {},
    criadoEm: now,
    atualizadoEm: now,
    enviadaEm: null,
    aprovadaEm: null,
    token: null,
    tokenExpiraEm: null,
    tokenRevogado: false,
  };
}

// Lê um valor de célula com segurança
export const getCelula = (tabela, itemId, cidadeId, categoria) =>
  tabela?.valores?.[itemId]?.[cidadeId]?.[categoria] ?? null;

// Atualiza imutavelmente um valor de célula e devolve nova tabela
export function setCelula(tabela, itemId, cidadeId, categoria, valor) {
  const valores = { ...(tabela.valores || {}) };
  const porItem = { ...(valores[itemId] || {}) };
  const porCidade = { ...(porItem[cidadeId] || {}) };
  if (valor === null || valor === "" || Number.isNaN(valor)) {
    delete porCidade[categoria];
  } else {
    porCidade[categoria] = Number(valor);
  }
  // Limpeza ascendente: se a cidade ficou vazia, remove do item; idem item
  if (Object.keys(porCidade).length === 0) delete porItem[cidadeId];
  else porItem[cidadeId] = porCidade;
  if (Object.keys(porItem).length === 0) delete valores[itemId];
  else valores[itemId] = porItem;
  return { ...tabela, valores, atualizadoEm: new Date().toISOString() };
}

// Conta quantas células estão preenchidas (para progresso/percentual)
export function contarCelulasPreenchidas(tabela) {
  let n = 0;
  Object.values(tabela?.valores || {}).forEach(porItem => {
    Object.values(porItem).forEach(porCidade => {
      Object.values(porCidade).forEach(v => { if (v != null && v !== "") n++; });
    });
  });
  return n;
}

// ── Token público ──────────────────────────────────────────────────────────
// Gera/regenera o token de compartilhamento de uma tabela. O fornecedor abre
// /#tabela/<token> sem login para preencher e devolver. Validade padrão 30d.
export function gerarTokenTabela(tabela, diasValidade = 30) {
  const token = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `tok-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
  return {
    ...tabela,
    token,
    tokenExpiraEm: new Date(Date.now() + diasValidade * 86400000).toISOString(),
    tokenRevogado: false,
    atualizadoEm: new Date().toISOString(),
  };
}

export function revogarTokenTabela(tabela) {
  return { ...tabela, tokenRevogado: true, atualizadoEm: new Date().toISOString() };
}

// Estado do token: 'sem' | 'ativo' | 'expirado' | 'revogado'
export function statusTokenTabela(tabela) {
  if (!tabela?.token) return "sem";
  if (tabela.tokenRevogado) return "revogado";
  if (tabela.tokenExpiraEm && new Date(tabela.tokenExpiraEm) < new Date()) return "expirado";
  return "ativo";
}
