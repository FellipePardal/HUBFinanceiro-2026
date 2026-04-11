import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://buubjnddzsadzcumrvdt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dWJqbmRkenNhZHpjdW1ydmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjQ3OTUsImV4cCI6MjA5MDIwMDc5NX0.mMEoVzmgdT1nHj1TLUWfhXzd4tcnzFad-HtF6TKPMw4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function getState(key) {
  const { data } = await supabase.from('app_state').select('value').eq('key', key).single();
  return data?.value ?? null;
}

export async function setState(key, value) {
  await supabase.from('app_state').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}

// ─── ARQUIVOS NF ─────────────────────────────────────────────────────────────
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function saveNFFile(notaId, dataUrl) {
  await setState(`nf_file_${notaId}`, dataUrl);
}

export async function getNFFile(notaId) {
  return getState(`nf_file_${notaId}`);
}

export async function deleteNFFile(notaId) {
  await supabase.from('app_state').delete().eq('key', `nf_file_${notaId}`);
}

// ─── CHAT DE NEGOCIAÇÕES ─────────────────────────────────────────────────────
// Mensagens, anexos (Supabase Storage) e links públicos por cotação.

export async function fetchChatMensagens(cotacaoId) {
  const { data, error } = await supabase
    .from('chat_mensagens')
    .select('*, chat_anexos(*)')
    .eq('cotacao_id', String(cotacaoId))
    .order('created_at', { ascending: true });
  if (error) { console.error('fetchChatMensagens', error); return []; }
  return data || [];
}

export async function sendChatMensagem({ cotacaoId, fornecedorId, autorTipo = 'interno', autorNome, conteudo, metadata = {} }) {
  const { data, error } = await supabase
    .from('chat_mensagens')
    .insert({
      cotacao_id: String(cotacaoId),
      fornecedor_id: fornecedorId ? String(fornecedorId) : null,
      autor_tipo: autorTipo,
      autor_nome: autorNome || null,
      conteudo,
      metadata,
    })
    .select()
    .single();
  if (error) { console.error('sendChatMensagem', error); return null; }
  return data;
}

export async function uploadChatAnexo({ cotacaoId, mensagemId, file }) {
  const path = `${cotacaoId}/${Date.now()}_${file.name}`;
  const up = await supabase.storage.from('negociacoes').upload(path, file, { upsert: false });
  if (up.error) { console.error('uploadChatAnexo upload', up.error); return null; }
  const { data, error } = await supabase
    .from('chat_anexos')
    .insert({
      mensagem_id: mensagemId || null,
      cotacao_id: String(cotacaoId),
      nome_arquivo: file.name,
      mime_type: file.type || null,
      tamanho: file.size || null,
      storage_path: path,
    })
    .select()
    .single();
  if (error) { console.error('uploadChatAnexo insert', error); return null; }
  return data;
}

export function getAnexoPublicUrl(storagePath) {
  const { data } = supabase.storage.from('negociacoes').getPublicUrl(storagePath);
  return data?.publicUrl || null;
}

export async function gerarCotacaoLink({ cotacaoId, fornecedorId, criadoPor, diasValidade = 30 }) {
  const expira = new Date(Date.now() + diasValidade * 86400000).toISOString();
  const { data, error } = await supabase
    .from('cotacao_links')
    .insert({
      cotacao_id: String(cotacaoId),
      fornecedor_id: fornecedorId ? String(fornecedorId) : null,
      criado_por: criadoPor || null,
      expira_em: expira,
    })
    .select()
    .single();
  if (error) { console.error('gerarCotacaoLink', error); return null; }
  return data;
}

export async function listarCotacaoLinks(cotacaoId) {
  const { data, error } = await supabase
    .from('cotacao_links')
    .select('*')
    .eq('cotacao_id', String(cotacaoId))
    .order('created_at', { ascending: false });
  if (error) { console.error('listarCotacaoLinks', error); return []; }
  return data || [];
}

export async function revogarCotacaoLink(token) {
  await supabase.from('cotacao_links').update({ revogado: true }).eq('token', token);
}

export function subscribeChatMensagens(cotacaoId, onInsert) {
  return supabase
    .channel(`chat_${cotacaoId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_mensagens',
      filter: `cotacao_id=eq.${cotacaoId}`,
    }, payload => onInsert(payload.new))
    .subscribe();
}

// ─── IA INTERMEDIADORA (Anthropic via Edge Function) ─────────────────────────
// A Edge Function 'chat-ia' precisa estar publicada no projeto Supabase com o
// secret ANTHROPIC_API_KEY configurado. Fallback gracioso caso não esteja.
export async function callChatIA({ historico, novaMensagem, contexto }) {
  try {
    const { data, error } = await supabase.functions.invoke('chat-ia', {
      body: { historico, novaMensagem, contexto },
    });
    if (error) throw error;
    return data?.resposta || null;
  } catch (e) {
    console.warn('callChatIA falhou — verifique se a Edge Function "chat-ia" está publicada', e);
    return null;
  }
}
