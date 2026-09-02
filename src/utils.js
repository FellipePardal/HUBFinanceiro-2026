// ─── FORMATAÇÃO ───────────────────────────────────────────────────────────────
// Valor inteiro sai sem centavos (R$ 21.499); com centavos sai com 2 casas
// (R$ 21.499,12) — antes arredondava tudo e a NF com centavos parecia errada.
export const fmt    = v => {
  const n = Number(v) || 0;
  const dec = Math.abs(n - Math.round(n)) < 0.005 ? 0 : 2;
  return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:dec,maximumFractionDigits:dec});
};
// Valor digitado livre com centavos: aceita "1234,56", "1.234,56" e "1234.56"
// (vírgula é o separador decimal BR; com vírgula presente, pontos são milhar).
// Os inputs de valor guardam o texto cru e parseiam só na hora de somar/salvar —
// parsear por tecla engolia a vírgula e impedia lançar centavos.
export const parseValorBR = v => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/[^\d.,]/g, "");
  if (!s) return 0;
  const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return parseFloat(norm) || 0;
};
export const fmtK   = v => `R$${((v||0)/1000).toFixed(0)}k`;
export const fmtNum = n => Number(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
export const fmtR   = v => "R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
export const fmtRs  = v => "R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0});
export const parseBR = s => parseFloat((s||"0").toString().replace(/\./g,"").replace(",",".")) || 0;

// ─── CÁLCULOS ─────────────────────────────────────────────────────────────────
export const subTotal = subs => Object.values(subs||{}).reduce((s,v) => s+(v||0), 0);
export const catTotal = (subs, cat) => cat.subs.reduce((s,sub) => s+(subs?.[sub.key]||0), 0);

// ─── PERSISTÊNCIA ─────────────────────────────────────────────────────────────
export function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
export function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
