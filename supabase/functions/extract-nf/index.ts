// Edge Function: extract-nf
// Recebe { submissionId } no body. Lê o arquivo da NF salvo em app_state
// (key = `nf_file_<id>`, valor = data URL base64), envia para Claude (vision/PDF)
// e devolve um JSON estruturado com os campos da NF.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROMPT = `Você é um extrator de dados de Notas Fiscais brasileiras (NFe / NFS-e).
Analise a nota fiscal anexada e responda APENAS com um JSON válido (sem markdown, sem texto extra) no formato:

{
  "numero_nf": "string ou null",
  "valor_total": number_ou_null,
  "cnpj_emitente": "string só dígitos ou null",
  "razao_social_emitente": "string ou null",
  "data_emissao": "YYYY-MM-DD ou null",
  "descricao_servicos": "string com resumo do que foi prestado",
  "confianca": "alta|media|baixa",
  "observacoes": "string com qualquer alerta relevante (ilegível, parcial, etc)"
}

Regras:
- valor_total deve ser o VALOR LÍQUIDO total da nota (em reais, número com ponto decimal).
- cnpj_emitente: apenas dígitos, sem máscara.
- Se o documento não parecer uma NF brasileira, retorne todos os campos como null e confianca "baixa".
- NUNCA invente dados. Se não conseguir ler, use null.`;

function dataUrlToBase64(dataUrl: string): { mime: string; base64: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

async function callClaude(file: { mime: string; base64: string }) {
  const isPdf = file.mime === "application/pdf";
  const content: any[] = [
    isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.base64 } }
      : { type: "image", source: { type: "base64", media_type: file.mime, data: file.base64 } },
    { type: "text", text: PROMPT },
  ];

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content }],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Claude API ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  const text = data.content?.[0]?.text ?? "";
  // Remove eventual cerca de markdown
  const clean = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(clean);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");
    const { submissionId } = await req.json();
    if (!submissionId) throw new Error("submissionId obrigatório");

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: row, error } = await sb
      .from("app_state")
      .select("value")
      .eq("key", `nf_file_${submissionId}`)
      .single();

    if (error || !row?.value) throw new Error("Arquivo da NF não encontrado");

    const file = dataUrlToBase64(row.value as string);
    if (!file) throw new Error("Arquivo inválido (data URL malformado)");

    const extracted = await callClaude(file);

    return new Response(JSON.stringify({ ok: true, extracted }), {
      headers: { ...CORS, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }
});
