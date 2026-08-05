// ─── AGENDA VEM DO PORTAL (matriz) ───────────────────────────────────────────
// Desde 2026-08 o Portal de Controle é a MATRIZ da agenda: jogo é criado e
// editado lá. O Hub herda os campos DESCRITIVOS (data, hora, times, cidade,
// rodada, padrão, detentor) e continua dono de tudo que é FINANCEIRO
// (orcado/provisionado/realizado, notas, envios) — esses campos nunca são
// tocados aqui.
//
// Regras:
//   • Linha do Portal com hub_jogo_id que bate num jogo do Hub → atualiza os
//     campos descritivos desse jogo (Portal vence).
//   • Linha SEM hub_jogo_id e com mandante preenchido → jogo novo criado no
//     Portal: o Hub "adota" substituindo um placeholder ("A definir"), que
//     mantém id e orçamento; o hub_jogo_id é gravado de volta na linha do
//     Portal (única escrita do Hub no Portal — só essa coluna, só na adoção).
//   • Linha com hub_jogo_id que NÃO existe no Hub → ignorada (id de uma
//     numeração antiga ou jogo removido de propósito; nunca recriar sozinho).
//   • Portal fora do ar / erro → não faz nada; o Hub segue com a cópia local.
import { supabase } from './supabase';

// Converte uma linha do Portal nos campos descritivos do jogo do Hub.
function camposDoRow(row, rodadaCol, extras) {
  const rodada = parseInt(row[rodadaCol], 10);
  const campos = {
    ...(Number.isFinite(rodada) ? { rodada } : {}),
    ...(row.data ? { data: row.data } : {}),
    ...(row.hora_brt ? { hora: row.hora_brt } : {}),
    ...(row.mandante ? { mandante: row.mandante } : {}),
    ...(row.visitante ? { visitante: row.visitante } : {}),
    ...(row.cidade ? { cidade: row.cidade } : {}),
    ...(row.padrao ? { categoria: row.padrao } : {}),
    ...(row.detentor ? { detentor: row.detentor } : {}),
  };
  (extras || []).forEach(([colPortal, campoHub]) => {
    if (row[colPortal]) campos[campoHub] = row[colPortal];
  });
  return campos;
}

// Aplica a agenda do Portal sobre a lista de jogos do Hub (função PURA).
// Retorna { next, changed, adocoes: [{portalRowId, hubJogoId}] }.
export function aplicarAgendaPortal(jogos, rows, { rodadaCol = 'eu', extras = [] } = {}) {
  const porHubId = new Map(rows.filter(r => r.hub_jogo_id).map(r => [String(r.hub_jogo_id), r]));
  let changed = false;

  // 1) Atualiza descritivo dos jogos já linkados
  let next = jogos.map(j => {
    const row = porHubId.get(String(j.id));
    if (!row) return j;
    const campos = camposDoRow(row, rodadaCol, extras);
    const diferente = Object.entries(campos).some(([k, v]) => j[k] !== v);
    if (!diferente) return j;
    changed = true;
    return { ...j, ...campos };
  });

  // 2) Adota jogos novos (linhas sem hub_jogo_id, com mandante), substituindo
  //    placeholders — determinístico: linhas por created_at, placeholders por id.
  const adocoes = [];
  const novas = rows
    .filter(r => !r.hub_jogo_id && r.mandante && String(r.mandante).trim() && r.mandante !== 'A definir')
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
  for (const row of novas) {
    const campos = camposDoRow(row, rodadaCol, extras);
    const placeholders = next.filter(j => j.mandante === 'A definir').sort((a, b) => (a.id > b.id ? 1 : -1));
    const alvo = placeholders.find(j => campos.categoria && j.categoria === campos.categoria) || placeholders[0];
    if (!alvo) {
      console.warn('[portalAgenda] Sem placeholder disponível para adotar jogo do Portal:', row.mandante, 'x', row.visitante);
      continue;
    }
    next = next.map(j => (j.id === alvo.id ? { ...j, ...campos } : j));
    adocoes.push({ portalRowId: row.id, hubJogoId: alvo.id, jogo: { mandante: row.mandante, visitante: row.visitante, data: row.data } });
    changed = true;
  }

  return { next, changed, adocoes };
}

// Lê a tabela do Portal. Erro/indisponível → null (chamador não faz nada).
export async function lerAgendaPortal(tabela) {
  try {
    const { data, error } = await supabase.from(tabela).select('*');
    if (error) return null;
    return data || [];
  } catch {
    return null;
  }
}

// Grava o hub_jogo_id na linha do Portal recém-adotada. Filtro por
// hub_jogo_id=is.null evita corrida (duas abas adotando ao mesmo tempo:
// só a primeira escreve). Se a tabela de periféricos irmã for informada,
// linka também a linha da MESMA partida lá (o Portal replica o jogo novo
// nas duas tabelas; match por mandante+visitante+data, só se ainda sem link).
export async function gravarLinkAdocao(tabela, portalRowId, hubJogoId, tabelaPeriferico, jogo) {
  try {
    await supabase
      .from(tabela)
      .update({ hub_jogo_id: String(hubJogoId) })
      .eq('id', portalRowId)
      .is('hub_jogo_id', null);
  } catch (err) {
    console.error('[portalAgenda] Falha ao gravar hub_jogo_id na adoção:', err);
  }
  if (!tabelaPeriferico || !jogo?.mandante || !jogo?.visitante) return;
  try {
    await supabase
      .from(tabelaPeriferico)
      .update({ hub_jogo_id: String(hubJogoId) })
      .eq('mandante', jogo.mandante)
      .eq('visitante', jogo.visitante)
      .eq('data', jogo.data || '')
      .is('hub_jogo_id', null);
  } catch (err) {
    console.error('[portalAgenda] Falha ao linkar periférico na adoção:', err);
  }
}
