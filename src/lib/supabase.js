import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://buubjnddzsadzcumrvdt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dWJqbmRkenNhZHpjdW1ydmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjQ3OTUsImV4cCI6MjA5MDIwMDc5NX0.mMEoVzmgdT1nHj1TLUWfhXzd4tcnzFad-HtF6TKPMw4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function getState(key) {
  const { data, error } = await supabase.from('app_state').select('value').eq('key', key).single();
  if (error) {
    // PGRST116 = nenhuma linha encontrada: a key realmente não existe ainda, pode
    // seedar com defaults. Qualquer outro erro (rede, timeout, etc.) precisa
    // propagar — se engolirmos e devolvermos null aqui, quem chama confunde
    // "erro transitório" com "linha não existe" e sobrescreve dados reais com
    // defaults (incidente 2026-05-01, que se repetiu por essa mesma causa).
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data?.value ?? null;
}

const MAX_BACKUPS = 15;

// Antes de qualquer escrita, guarda o valor ATUAL (o que está sendo substituído)
// numa pilha própria (key + "::backup"), até MAX_BACKUPS versões. Isso não depende
// de nenhum código estar certo — mesmo que um bug futuro grave o valor errado em
// `jogos`/`notas`/etc., a versão de imediatamente antes fica preservada aqui, e dá
// pra restaurar com restoreBackup(key). É a rede de segurança contra o incidente
// de perda de dados de 2026-07 (ver getState/createPersistedSetter acima).
async function pushBackup(key, valorAtual) {
  if (key.startsWith('nf_file_') || key.endsWith('::backup')) return;
  try {
    const backupKey = `${key}::backup`;
    const { data } = await supabase.from('app_state').select('value').eq('key', backupKey).single();
    const pilha = Array.isArray(data?.value) ? data.value : [];
    const nova = [{ at: new Date().toISOString(), value: valorAtual }, ...pilha].slice(0, MAX_BACKUPS);
    await supabase.from('app_state').upsert({ key: backupKey, value: nova, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  } catch (err) {
    console.error(`Falha ao gravar backup de "${key}" (a escrita principal segue mesmo assim):`, err);
  }
}

export async function setState(key, value) {
  const atual = await getState(key).catch(() => null);
  if (atual != null) await pushBackup(key, atual);
  const { error } = await supabase.from('app_state').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

// ─── OPERAÇÕES ATÔMICAS DE LISTA (RPC) ───────────────────────────────────────
// append/remove viram um UPDATE atômico no Postgres (migration
// 20260724000000_atomic_list_ops): escritas concorrentes serializam no lock de
// linha, então duas NFs chegando juntas (ou duas pessoas aprovando em paralelo)
// não se sobrescrevem mais. Se a função ainda não existir no banco, cai no
// caminho antigo de ler-modificar-gravar (melhor do que quebrar o formulário).
const rpcIndisponivel = err =>
  err?.code === '42883' || err?.code === 'PGRST202' || /function .*does not exist/i.test(err?.message || '');

// Acrescenta `entry` (objeto ou array de objetos) na lista `key`. Se algum
// elemento com o mesmo clientRef já estiver lá (reenvio após falha), não grava.
export async function appendState(key, entry) {
  const { error } = await supabase.rpc('append_app_state_list', { k: key, entry });
  if (!error) return;
  if (!rpcIndisponivel(error)) throw error;
  console.warn(`RPC append_app_state_list indisponível — usando caminho legado para "${key}"`);
  const itens = Array.isArray(entry) ? entry : [entry];
  const ref = itens[0]?.clientRef;
  const atual = (await getState(key)) || [];
  if (ref && atual.some(s => s.clientRef === ref)) return;
  await setState(key, [...atual, ...itens]);
}

// Remove da lista `key` o elemento com esse id. Retorna true se removeu,
// false se o item já não estava lá (alguém decidiu antes) — quem chama usa
// isso pra não repetir efeitos colaterais (ex.: criar a nota duas vezes).
export async function removeFromStateList(key, id) {
  const { data, error } = await supabase.rpc('remove_app_state_list', { k: key, item_id: String(id) });
  if (!error) return data === true;
  if (!rpcIndisponivel(error)) throw error;
  console.warn(`RPC remove_app_state_list indisponível — usando caminho legado para "${key}"`);
  const atual = (await getState(key)) || [];
  if (!atual.some(s => String(s.id) === String(id))) return false;
  await setState(key, atual.filter(s => String(s.id) !== String(id)));
  return true;
}

// Lista as versões anteriores de `key` (mais recente primeiro). Use para
// inspecionar antes de decidir restaurar.
export async function getBackups(key) {
  const data = await getState(`${key}::backup`);
  return Array.isArray(data) ? data : [];
}

// Restaura `key` para a versão `stepsBack` passos atrás (0 = a gravação
// imediatamente anterior à atual). Sobrescreve o valor atual — a versão que
// estava valendo entra na pilha de backup antes de ser substituída, então
// restaurar também não é uma via de mão única.
export async function restoreBackup(key, stepsBack = 0) {
  const pilha = await getBackups(key);
  const versao = pilha[stepsBack];
  if (!versao) throw new Error(`Não há backup ${stepsBack} passos atrás para "${key}"`);
  await setState(key, versao.value);
  return versao;
}

// Cria um setter que atualiza o estado local na hora (otimista), mas relê o
// valor atual do Supabase antes de gravar de volta, reaplicando as mudanças
// pendentes por cima dele em vez de um `prev` local que pode estar
// desatualizado (aba parada, realtime caído, etc.) — sem isso, dois clientes
// editando quase ao mesmo tempo podem fazer um sobrescrever o outro.
// `persistRefs` é um objeto estável (ex: useRef({}).current) compartilhado
// entre todos os setters do componente, uma entrada por key.
export function createPersistedSetter(key, setRaw, persistRefs, { empty = [], debounceMs = 0 } = {}) {
  if (!persistRefs[key]) persistRefs[key] = { pending: [], timer: null, queue: Promise.resolve(), inFlight: 0 };
  const s = persistRefs[key];
  const flush = () => {
    const fns = s.pending; s.pending = [];
    s.inFlight++;
    s.queue = s.queue.then(async () => {
      try {
        const atual = await getState(key);
        let next = atual != null ? atual : empty;
        for (const f of fns) next = typeof f === "function" ? f(next) : f;
        await setState(key, next);
      } catch (err) {
        console.error(`Falha ao persistir "${key}" no Supabase:`, err);
      } finally {
        s.inFlight--;
      }
    });
  };
  return fn => {
    setRaw(prev => (typeof fn === "function" ? fn(prev) : fn));
    s.pending.push(fn);
    if (debounceMs > 0) {
      if (s.timer) clearTimeout(s.timer);
      s.timer = setTimeout(() => { s.timer = null; flush(); }, debounceMs);
    } else {
      flush();
    }
  };
}

// Enquanto essa key tem uma escrita local pendente (aguardando debounce ou já
// em voo pro Supabase), o estado local já é mais atual do que qualquer eco de
// realtime que possa chegar -- aplicar o eco por cima causaria o "rollback"
// visual clássico (o campo que a pessoa está digitando volta pra um valor de
// alguns caracteres atrás). isPersistPending deixa o handler de realtime
// pular esses ecos com segurança: quando a escrita local terminar, o próprio
// eco dela (já com o valor final) chega e sincroniza normalmente.
export function isPersistPending(persistRefs, key) {
  const s = persistRefs[key];
  if (!s) return false;
  return s.pending.length > 0 || s.inFlight > 0 || !!s.timer;
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

