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

// Conta células preenchidas — suporta tabela antiga e negociação com rodadas
export function contarCelulasPreenchidas(tabelaOuNeg) {
  let vals;
  if (tabelaOuNeg?.rodadas?.length) vals = getRodadaAtual(tabelaOuNeg)?.valores || {};
  else vals = tabelaOuNeg?.valores || {};
  let n = 0;
  Object.values(vals).forEach(porItem => {
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

// ── Cotações ──────────────────────────────────────────────────────────────
// O ciclo simplificado: rascunho (provisionado) -> aprovada (confirmado pra
// realizar) -> cancelada (descartado). A "negociação" em si é a tabela de
// preços; aqui só aplicamos o valor-base ao jogo + ajustes pré-jogo.
export const STATUS_COTACAO_NOVO = [
  { key:"rascunho",  label:"Rascunho",  color:"#64748b" },
  { key:"aprovada",  label:"Aprovada",  color:"#10b981" },
  { key:"cancelada", label:"Cancelada", color:"#94a3b8" },
];

export const statusCotacaoInfo = key =>
  STATUS_COTACAO_NOVO.find(s => s.key === key) || STATUS_COTACAO_NOVO[0];

// Encontra a tabela/negociação vigente de um par (fornecedor, campeonato).
export function getTabelaVigente(tabelas, fornecedorId, campeonatoId) {
  return (tabelas || []).find(t =>
    String(t.fornecedorId) === String(fornecedorId) &&
    t.campeonatoId === campeonatoId &&
    (t.status === "vigente" || t.status === "aprovada")
  ) || null;
}

// Devolve o objeto de valores vigente (suporta formato antigo e novo com rodadas)
export function getValoresVigentes(tabela) {
  if (tabela?.rodadas?.length) return getRodadaAtual(tabela)?.valores || {};
  return tabela?.valores || {};
}

export function calcularItensBase({ tabela, fornecedor, jogo, campeonato }) {
  if (!tabela || !jogo) return [];
  const itens = (campeonato?.itens?.length)
    ? campeonato.itens.filter(i => i.ativo !== false)
    : (fornecedor?.catalogo || []).filter(i => i.ativo !== false);
  const vals = getValoresVigentes(tabela);
  const fakeTab = { valores: vals };
  return itens.map(it => {
    const valor = getCelula(fakeTab, it.id, jogo.cidadeId, jogo.categoria);
    return {
      itemId:    it.id,
      nome:      it.nome,
      unidade:   it.unidade,
      valorBase: valor != null ? Number(valor) : null,
      incluso:   valor != null && valor > 0,
    };
  });
}

// Recalcula totais de uma cotação (chamar sempre que itens/adicionais mudarem)
export function recalcularCotacao(cotacao) {
  const valorBase = (cotacao.itensBase || [])
    .filter(i => i.incluso && i.valorBase != null)
    .reduce((s, i) => s + Number(i.valorBase || 0), 0);
  const valorAdicionais = (cotacao.adicionais || [])
    .reduce((s, a) => s + Number(a.valorTotal || 0), 0);
  return {
    ...cotacao,
    valorBase,
    valorAdicionais,
    valorTotal: valorBase + valorAdicionais,
    atualizadoEm: new Date().toISOString(),
  };
}

// Cria uma cotação nova já com valor-base calculado
export function criarCotacao({ jogo, fornecedor, tabela }) {
  const now = new Date().toISOString();
  const itensBase = calcularItensBase({ tabela, fornecedor, jogo });
  const cot = {
    id: `cot-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    jogoId:           jogo.id,
    fornecedorId:     fornecedor.id,
    campeonatoId:     jogo.campeonatoId,
    cidadeId:         jogo.cidadeId,
    categoria:        jogo.categoria,
    tabelaIdSnapshot: tabela?.id || null,
    itensBase,
    adicionais:       [],
    valorBase:        0,
    valorAdicionais:  0,
    valorTotal:       0,
    status:           "rascunho",
    observacoes:      "",
    criadoEm:         now,
    atualizadoEm:     now,
  };
  return recalcularCotacao(cot);
}

export const novoAdicional = () => ({
  id: `add-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
  nome: "",
  quantidade: 1,
  valorUnitario: 0,
  valorTotal: 0,
  justificativa: "",
});

// ── Negociações com rodadas ────────────────────────────────────────────────
// Substitui o modelo de Tabelas pelo modelo de Negociações com histórico de
// rounds. Cada rodada representa uma proposta (nossa ou do fornecedor).
//
// Status: rascunho → aguardando_forn → em_analise → contraproposta → aprovada
//         (qualquer estado pode ir para arquivada)
export const STATUS_NEGOCIACAO = [
  { key:"rascunho",        label:"Rascunho",              color:"#64748b" },
  { key:"aguardando_forn", label:"Aguardando Fornecedor", color:"#3b82f6" },
  { key:"em_analise",      label:"Em Análise",            color:"#f59e0b" },
  { key:"contraproposta",  label:"Contra-proposta",       color:"#a855f7" },
  { key:"aprovada",        label:"Aprovada",              color:"#10b981" },
  { key:"arquivada",       label:"Arquivada",             color:"#94a3b8" },
];

export const statusNegociacaoInfo = key =>
  STATUS_NEGOCIACAO.find(s => s.key === key) || STATUS_NEGOCIACAO[0];

export function criarRodada({ numero = 1, propostaPor = "livemode", valores = {}, observacoes = "" } = {}) {
  return {
    numero,
    propostaPor, // "livemode" | "fornecedor"
    valores,
    observacoes,
    criadaEm: new Date().toISOString(),
    enviadaEm: null,
  };
}

export function criarNegociacao({ fornecedorId, campeonatoId }) {
  const now = new Date().toISOString();
  return {
    id: `neg-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    fornecedorId,
    campeonatoId,
    status: "rascunho",
    rodadas: [criarRodada({ numero: 1, propostaPor: "livemode" })],
    token: null,
    tokenExpiraEm: null,
    tokenRevogado: false,
    criadoEm: now,
    atualizadoEm: now,
  };
}

export function getRodadaAtual(neg) {
  if (!neg?.rodadas?.length) return null;
  return neg.rodadas[neg.rodadas.length - 1];
}

// Cria nova rodada (contra-proposta) copiando os valores da rodada atual
export function adicionarRodada(neg, propostaPor = "livemode") {
  const atual = getRodadaAtual(neg);
  const novaRodada = criarRodada({
    numero: (atual?.numero || 0) + 1,
    propostaPor,
    valores: JSON.parse(JSON.stringify(atual?.valores || {})),
    observacoes: "",
  });
  return {
    ...neg,
    rodadas: [...neg.rodadas, novaRodada],
    atualizadoEm: new Date().toISOString(),
  };
}

// Atualiza imutavelmente a ÚLTIMA rodada de uma negociação
export function setCelulaRodada(neg, itemId, cidadeId, categoria, valor) {
  if (!neg?.rodadas?.length) return neg;
  const rodadas = [...neg.rodadas];
  const idx = rodadas.length - 1;
  const rodadaAtualizada = setCelula(rodadas[idx], itemId, cidadeId, categoria, valor);
  rodadas[idx] = rodadaAtualizada;
  return { ...neg, rodadas, atualizadoEm: new Date().toISOString() };
}

// Retorna % de variação entre primeira e última rodada (positivo = saving)
export function calcularDeltaRodadas(neg) {
  if (!neg?.rodadas || neg.rodadas.length < 2) return null;
  const somarCelulas = vals =>
    Object.values(vals || {}).flatMap(i =>
      Object.values(i || {}).flatMap(c => Object.values(c || {}))
    ).filter(x => x > 0);
  const celsPrimeira = somarCelulas(neg.rodadas[0].valores);
  const celsUltima   = somarCelulas(neg.rodadas[neg.rodadas.length - 1].valores);
  if (!celsPrimeira.length || !celsUltima.length) return null;
  const med = arr => arr.reduce((a,b)=>a+b,0) / arr.length;
  const prim = med(celsPrimeira);
  if (!prim) return null;
  return ((prim - med(celsUltima)) / prim) * 100;
}

// Compara célula entre rodada anterior e atual (retorna null se não mudou)
export function deltaCelula(neg, itemId, cidadeId, categoria) {
  if (!neg?.rodadas || neg.rodadas.length < 2) return null;
  const prev = neg.rodadas[neg.rodadas.length - 2];
  const curr = neg.rodadas[neg.rodadas.length - 1];
  const vPrev = getCelula(prev, itemId, cidadeId, categoria);
  const vCurr = getCelula(curr, itemId, cidadeId, categoria);
  if (vPrev == null || vCurr == null) return null;
  if (vPrev === 0) return null;
  return ((vPrev - vCurr) / vPrev) * 100;
}

// Migra tabela no formato antigo para o novo formato com rodadas
export function migrarTabelaLegada(tabela) {
  if (tabela?.rodadas) return tabela;
  const statusMap = {
    rascunho:  "rascunho",
    enviada:   "aguardando_forn",
    devolvida: "em_analise",
    vigente:   "aprovada",
    arquivada: "arquivada",
  };
  return {
    ...tabela,
    status: statusMap[tabela.status] || "rascunho",
    rodadas: [criarRodada({
      numero: tabela.versao || 1,
      propostaPor: "livemode",
      valores: tabela.valores || {},
      observacoes: tabela.observacoes || "",
    })],
  };
}

// ── Catálogo master de itens de serviço ───────────────────────────────────
// Lista global de serviços que podem ser precificados nas negociações.
// Gerenciada em Catálogos e persistida em app_state['forn_itens_master'].
// Campeonatos selecionam um subconjunto dessa lista.
export const ITENS_MASTER_INIT = [
  { id:"um-b1",      nome:"UM B1",                  unidade:"jogo" },
  { id:"um-b2",      nome:"UM B2",                  unidade:"jogo" },
  { id:"um-b3",      nome:"UM B3",                  unidade:"jogo" },
  { id:"drone",      nome:"Drone",                  unidade:"jogo" },
  { id:"minidrone",  nome:"Minidrone",              unidade:"jogo" },
  { id:"grua",       nome:"Grua",                   unidade:"jogo" },
  { id:"goalcam",    nome:"Goal Cam",               unidade:"jogo" },
  { id:"carrinho",   nome:"Carrinho",               unidade:"jogo" },
  { id:"eq-b1",      nome:"Equipe Operacional B1",  unidade:"jogo" },
  { id:"eq-b2",      nome:"Equipe Operacional B2",  unidade:"jogo" },
  { id:"eq-b3",      nome:"Equipe Operacional B3",  unidade:"jogo" },
  { id:"coord-prod", nome:"Coordenador de Produção",unidade:"diaria" },
  { id:"dir-tv",     nome:"Diretor de TV",          unidade:"diaria" },
];

export const novoItemMaster = (nome = "", unidade = "jogo") => ({
  id: `it-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
  nome: nome.trim(),
  unidade,
});

// Kept for backward compat
export const novoItemCampeonato = novoItemMaster;
