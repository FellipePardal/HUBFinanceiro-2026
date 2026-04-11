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

