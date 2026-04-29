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

// ─── EXTRAÇÃO AUTOMÁTICA DA NF (edge function + Claude) ──────────────────────
export async function extractNF(submissionId) {
  const { data, error } = await supabase.functions.invoke('extract-nf', {
    body: { submissionId },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'Falha na extração');
  return data.extracted;
}

// Compara o que o fornecedor digitou com o que foi extraído da NF.
// Retorna um array de { campo, label, digitado, extraido, status: 'ok'|'warn'|'fail' }.
export function diffNF(sub, ext, fornecedoresMap = {}) {
  if (!ext) return [];
  const out = [];
  // Número da NF
  if (sub.numeroNF || ext.numero_nf) {
    const a = String(sub.numeroNF || '').replace(/\D/g, '');
    const b = String(ext.numero_nf || '').replace(/\D/g, '');
    out.push({
      campo: 'numero_nf',
      label: 'Nº NF',
      digitado: sub.numeroNF || '—',
      extraido: ext.numero_nf || '—',
      status: !a || !b ? 'warn' : (a === b ? 'ok' : 'fail'),
    });
  }
  // Valor total
  const valDig = Number(sub.valorNF || 0);
  const valExt = Number(ext.valor_total || 0);
  if (valDig || valExt) {
    const diff = Math.abs(valDig - valExt);
    const tol = Math.max(1, valDig * 0.01);
    out.push({
      campo: 'valor_total',
      label: 'Valor',
      digitado: valDig,
      extraido: valExt,
      status: !valExt ? 'warn' : (diff <= tol ? 'ok' : 'fail'),
    });
  }
  // CNPJ vs fornecedor cadastrado
  const fornec = fornecedoresMap[sub.fornecedor];
  const cnpjCad = fornec?.cnpj ? String(fornec.cnpj).replace(/\D/g, '') : '';
  const cnpjExt = ext.cnpj_emitente ? String(ext.cnpj_emitente).replace(/\D/g, '') : '';
  if (cnpjCad || cnpjExt) {
    out.push({
      campo: 'cnpj',
      label: 'CNPJ',
      digitado: cnpjCad || '—',
      extraido: cnpjExt || '—',
      status: !cnpjCad || !cnpjExt ? 'warn' : (cnpjCad === cnpjExt ? 'ok' : 'fail'),
    });
  }
  // Data emissão (apenas avisa)
  if (sub.dataEmissao || ext.data_emissao) {
    out.push({
      campo: 'data_emissao',
      label: 'Emissão',
      digitado: sub.dataEmissao || '—',
      extraido: ext.data_emissao || '—',
      status: 'warn',
    });
  }
  return out;
}

