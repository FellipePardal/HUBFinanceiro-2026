import { getState, setState as setSupabaseState } from "./supabase";

// Append-only em nf_historico — toda criação/exclusão de NF deixa rastro
// (independente da origem: formulário público, "Registrar NF", "NF Avulsa" ou
// "NF de Reembolso" criada direto na aba Logística). Permite reconstruir o
// array de notas se ele for zerado por bug ou ação manual.
export async function pushHistorico(entry, historicoKey = 'nf_historico') {
  const atual = (await getState(historicoKey)) || [];
  await setSupabaseState(historicoKey, [...atual, entry]);
}
