// Linkagem com o Portal de Controle (mesma instância Supabase).
// Lê tabelas operacionais do Portal e mapeia (jogo × subKey financeiro) → fornecedor operacional.

import { supabase } from './supabase';

// Mapeia subKey financeiro do Hub → coluna(s) do Portal que contém o nome operacional do fornecedor.
// Cada entry pode resolver para 1+ nomes operacionais (ex: especial = trilho + clipcam).
// Para periféricos, o nome só vale se o toggle (drone/dslr/etc.) estiver = "Sim".
export const SUBKEY_TO_PORTAL = {
  // Pessoal
  supervisor1: { source: 'controle', cols: ['supervisores_1'] },
  supervisor2: { source: 'controle', cols: ['supervisores_2'] },
  dtv:         { source: 'controle', cols: ['dtv'] },
  vmix:        { source: 'controle', cols: ['op_vmix'] },
  audio:       { source: 'controle', cols: ['op_audio'] },

  // Operações — UM (1 só coluna no Portal cobre b1/b2/b3)
  um_b1:       { source: 'controle', cols: ['um'] },
  um_b2:       { source: 'controle', cols: ['um'] },
  um_b3:       { source: 'controle', cols: ['um'] },

  geradores:   { source: 'controle', cols: ['gerador'] },

  // SNG: Hub tem subKey único, Portal tem 2 colunas — listamos as duas (gera 1 entry por fornecedor distinto)
  sng:         { source: 'controle', cols: ['sng_premiere', 'sng_host'] },

  // Periféricos — só conta se o toggle correspondente estiver = "Sim"
  drone:       { source: 'periferico', toggle: 'drone',     cols: ['fornecedor_drone'] },
  minidrone:   { source: 'periferico', toggle: 'minidrone', cols: ['fornecedor_minidrone'] },
  dslr:        { source: 'periferico', toggle: 'dslr',      cols: ['fornecedor_dslr'] },
  dslrs_transmissor: { source: 'periferico', toggle: 'dslr', cols: ['fornecedor_dslr'] },
  grua:        { source: 'periferico', toggle: 'grua',      cols: ['fornecedor_grua'] },
  goalcam:     { source: 'periferico', toggle: 'goalcam',   cols: ['fornecedor_goalcam'] },
  carrinho:    { source: 'periferico', toggle: 'carrinho',  cols: ['fornecedor_carrinho'] },

  // Especial = Trilho + ClipCam (cada um respeita seu próprio toggle)
  especial:    { source: 'periferico-multi', subs: [
    { toggle: 'trilho',  col: 'fornecedor_trilho' },
    { toggle: 'clipcam', col: 'fornecedor_clipcam' },
  ]},
};

// Tolerância: normaliza nome (lower, sem acento, espaço único, sem pontuação extra).
const norm = s => String(s || '')
  .trim()
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Match tolerante: aceita prefixo, contém, e troca de "Athletico"/"Athletico PR".
function matchAny(target, candidate) {
  const a = norm(target), b = norm(candidate);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(b + ' ') || b.startsWith(a + ' ')) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

// Encontra fornecedor (apelido) com tolerância
export function findFornecedorTolerante(fornecedores, nomeOperacional) {
  if (!nomeOperacional) return null;
  const target = norm(nomeOperacional);
  if (!target) return null;
  // 1) Match exato no apelido normalizado
  for (const f of fornecedores) {
    if (norm(f.apelido) === target) return f;
  }
  // 2) Match tolerante no apelido
  for (const f of fornecedores) {
    if (matchAny(f.apelido, nomeOperacional)) return f;
  }
  // 3) Match no início da razão social
  for (const f of fornecedores) {
    if (matchAny(f.razaoSocial, nomeOperacional)) return f;
  }
  return null;
}

// Tabelas operacionais do Portal por campeonato
const TABLES = {
  brasileirao: { controle: 'brasileirao_jogos', periferico: 'perifericos_brasileirao' },
  paulistao:   { controle: 'paulistao_feminino_jogos', periferico: 'perifericos_paulistao' },
};

// Busca rows de uma tabela e indexa por hub_jogo_id
async function fetchByHubId(tableName) {
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) return new Map();
  const map = new Map();
  (data || []).forEach(row => {
    if (row.hub_jogo_id) map.set(String(row.hub_jogo_id), row);
  });
  return map;
}

// Carrega dados operacionais do Portal para um campeonato.
// Retorna { controle: Map<hub_jogo_id, row>, periferico: Map<hub_jogo_id, row> }.
export async function loadPortalData(campeonato = 'brasileirao') {
  const t = TABLES[campeonato] || TABLES.brasileirao;
  const [controle, periferico] = await Promise.all([
    fetchByHubId(t.controle),
    fetchByHubId(t.periferico),
  ]);
  return { controle, periferico };
}

// Para um jogo do Hub e uma subKey financeira, retorna o(s) nome(s) operacional(is) do Portal.
// Retorna array (pode haver mais de um — ex: SNG Premiere + Host distintos).
export function getOperacionaisPorSubKey(jogoHubId, subKey, portal) {
  const cfg = SUBKEY_TO_PORTAL[subKey];
  if (!cfg || !portal) return [];
  const id = String(jogoHubId);

  if (cfg.source === 'controle') {
    const row = portal.controle.get(id);
    if (!row) return [];
    const nomes = cfg.cols.map(c => row[c]).filter(Boolean).map(s => String(s).trim()).filter(Boolean);
    return [...new Set(nomes)];
  }

  if (cfg.source === 'periferico') {
    const row = portal.periferico.get(id);
    if (!row) return [];
    if (row[cfg.toggle] !== 'Sim') return [];
    const nomes = cfg.cols.map(c => row[c]).filter(Boolean).map(s => String(s).trim()).filter(Boolean);
    return [...new Set(nomes)];
  }

  if (cfg.source === 'periferico-multi') {
    const row = portal.periferico.get(id);
    if (!row) return [];
    const nomes = [];
    cfg.subs.forEach(sub => {
      if (row[sub.toggle] === 'Sim' && row[sub.col]) {
        nomes.push(String(row[sub.col]).trim());
      }
    });
    return [...new Set(nomes.filter(Boolean))];
  }

  return [];
}

// Dado um array de jogos do Hub + uma subKey, retorna mapa { jogoId: [nomesOperacionais] }
export function mapearOperacionaisPorJogo(jogos, subKey, portal) {
  const out = {};
  jogos.forEach(j => {
    const nomes = getOperacionaisPorSubKey(j.id, subKey, portal);
    if (nomes.length) out[j.id] = nomes;
  });
  return out;
}
