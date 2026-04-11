// ============================================================================
// Edge Function: chat-ia
// ----------------------------------------------------------------------------
// Intermediadora de negociação entre equipe interna e fornecedor externo.
// Recebe o histórico + nova mensagem + contexto da cotação e devolve uma
// sugestão de resposta / análise / resumo usando o modelo Claude.
//
// Secrets esperados:
//   ANTHROPIC_API_KEY — chave da API do Anthropic
//
// Deploy:
//   supabase functions deploy chat-ia --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-opus-4-6";

const SYSTEM_PROMPT = `Você é uma IA intermediadora de negociações entre a equipe interna do HUB Financeiro (transmissões esportivas — Brasileirão 2026) e fornecedores externos de serviços de broadcast.

Seu papel:
1. Analisar o histórico de mensagens entre as partes.
2. Sugerir respostas claras, profissionais e em português do Brasil.
3. Destacar valores, prazos e riscos sempre que aparecerem.
4. Quando houver proposta de valor, apresentar comparações e sugerir contrapropostas razoáveis.
5. Manter tom formal, objetivo e conciso.

Formato da resposta:
- Comece com 1 linha resumindo o ponto principal da próxima ação.
- Em seguida, uma sugestão de resposta pronta para enviar.
- Se detectar pendências (prazo, documentação, valores faltantes), liste-as em bullets ao final.`;

function cors(resp: Response) {
  resp.headers.set("Access-Control-Allow-Origin", "*");
  resp.headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  resp.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return resp;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return cors(new Response("ok"));

  if (!ANTHROPIC_API_KEY) {
    return cors(new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), { status: 500 }));
  }

  try {
    const { historico = [], novaMensagem = "", contexto = {} } = await req.json();

    const contextoTexto = [
      contexto.fornecedor    && `Fornecedor: ${contexto.fornecedor}`,
      contexto.campeonato    && `Campeonato: ${contexto.campeonato}`,
      contexto.valorProposto && `Valor proposto: R$ ${contexto.valorProposto}`,
      contexto.valorContra   && `Contraproposta: R$ ${contexto.valorContra}`,
      contexto.prazo         && `Prazo: ${contexto.prazo}`,
      contexto.observacoes   && `Observações: ${contexto.observacoes}`,
    ].filter(Boolean).join("\n");

    const historicoTexto = (historico || [])
      .map((m: { autor_tipo: string; autor_nome?: string; conteudo: string }) => {
        const prefix = m.autor_tipo === "interno" ? "EQUIPE INTERNA" :
                       m.autor_tipo === "fornecedor" ? "FORNECEDOR" :
                       m.autor_tipo === "ia" ? "IA" : "SISTEMA";
        return `[${prefix}${m.autor_nome ? ` — ${m.autor_nome}` : ""}]: ${m.conteudo}`;
      })
      .join("\n\n");

    const userContent = [
      contextoTexto && `=== CONTEXTO DA COTAÇÃO ===\n${contextoTexto}`,
      historicoTexto && `=== HISTÓRICO ===\n${historicoTexto}`,
      novaMensagem && `=== NOVA MENSAGEM PARA ANALISAR ===\n${novaMensagem}`,
      `Com base no contexto e histórico acima, produza sua análise e sugestão.`,
    ].filter(Boolean).join("\n\n");

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return cors(new Response(JSON.stringify({ error: `Anthropic API: ${err}` }), { status: resp.status }));
    }

    const json = await resp.json();
    const resposta = json.content?.[0]?.text || "";

    return cors(new Response(JSON.stringify({ resposta }), {
      headers: { "content-type": "application/json" },
    }));
  } catch (e) {
    return cors(new Response(JSON.stringify({ error: String(e) }), { status: 500 }));
  }
});
