import { useState, useEffect, useMemo, useRef } from "react";
import { Card, PanelTitle, Button, Badge } from "../../ui";
import { iSty, RADIUS } from "../../../constants";
import { fmt } from "../../../utils";
import { statusInfo, CAMPEONATOS_COTACAO } from "../../../data/negociacoes";
import {
  fetchChatMensagens, sendChatMensagem, uploadChatAnexo, getAnexoPublicUrl,
  subscribeChatMensagens, callChatIA, gerarCotacaoLink, listarCotacaoLinks, revogarCotacaoLink,
  supabase,
} from "../../../lib/supabase";
import {
  Send, Paperclip, Bot, Link2, Copy, Trash2, User, Building2, Sparkles,
} from "lucide-react";

function MessageBubble({ msg, T, onDeleteAnexo }) {
  const tipo = msg.autor_tipo;
  const isInterno    = tipo === "interno";
  const isFornecedor = tipo === "fornecedor";
  const isIA         = tipo === "ia";
  const isSistema    = tipo === "sistema";

  if (isSistema) {
    return (
      <div style={{textAlign:"center",margin:"8px 0",color:T.textSm,fontSize:10,fontStyle:"italic"}}>
        {msg.conteudo}
      </div>
    );
  }

  const align = isInterno ? "flex-end" : "flex-start";
  const bg =
    isInterno    ? (T.brand||"#10b981") :
    isFornecedor ? (T.info||"#3b82f6") :
    isIA         ? "rgba(168,85,247,0.12)" : T.surfaceAlt;
  const color =
    isInterno || isFornecedor ? "#fff" :
    isIA ? "#a855f7" : T.text;
  const border =
    isIA ? "1px solid rgba(168,85,247,0.3)" : "none";
  const Icon = isIA ? Sparkles : (isFornecedor ? Building2 : User);

  return (
    <div style={{display:"flex",justifyContent:align,marginBottom:10}}>
      <div style={{maxWidth:"72%",display:"flex",flexDirection:"column",alignItems:align}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,fontSize:10,color:T.textSm}}>
          <Icon size={11}/>
          <span style={{fontWeight:700}}>
            {isInterno ? "Equipe Interna" : isFornecedor ? "Fornecedor" : "IA"}
            {msg.autor_nome ? ` · ${msg.autor_nome}` : ""}
          </span>
          <span>·</span>
          <span>{new Date(msg.created_at).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>
        </div>
        <div style={{
          background: bg,
          color,
          border,
          padding:"10px 14px",
          borderRadius: RADIUS.lg,
          fontSize:13,
          lineHeight:1.5,
          whiteSpace:"pre-wrap",
          wordBreak:"break-word",
          boxShadow: isInterno || isFornecedor ? `0 2px 8px ${bg}33` : "none",
        }}>
          {msg.conteudo}
        </div>
        {(msg.chat_anexos || []).length > 0 && (
          <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:4,alignItems:align}}>
            {msg.chat_anexos.map(a => (
              <a key={a.id} href={getAnexoPublicUrl(a.storage_path)} target="_blank" rel="noreferrer" style={{
                display:"inline-flex",alignItems:"center",gap:6,
                padding:"5px 10px",background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:RADIUS.sm,
                fontSize:11,color:T.textMd,textDecoration:"none",
              }}>
                <Paperclip size={11}/>{a.nome_arquivo}
                {a.tamanho && <span style={{color:T.textSm}}>· {(a.tamanho/1024).toFixed(0)}kb</span>}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversaItem({ cotacao, fornecedor, active, ultimaMsg, onClick, T }) {
  const st = statusInfo(cotacao.status);
  const camp = CAMPEONATOS_COTACAO.find(c => c.id === cotacao.campeonatoId);
  return (
    <button onClick={onClick} style={{
      display:"block",
      width:"100%",
      textAlign:"left",
      padding:"12px 14px",
      background: active ? (T.brandSoft||"rgba(16,185,129,0.12)") : "transparent",
      border:"none",
      borderLeft: active ? `3px solid ${T.brand||"#10b981"}` : `3px solid transparent`,
      borderBottom:`1px solid ${T.border}`,
      cursor:"pointer",
      transition:"background .15s",
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,gap:6}}>
        <span style={{fontSize:12,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {fornecedor?.apelido || "Fornecedor"}
        </span>
        <Badge color={st.color} T={T} size="sm">{st.label}</Badge>
      </div>
      <div style={{fontSize:10,color:T.textSm,marginBottom:3}}>{camp?.nome || "—"}</div>
      {ultimaMsg && (
        <div style={{fontSize:11,color:T.textMd,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {ultimaMsg}
        </div>
      )}
      {cotacao.valorProposto > 0 && (
        <div className="num" style={{fontSize:10,color:T.textSm,marginTop:3}}>Prop: {fmt(cotacao.valorProposto)}</div>
      )}
    </button>
  );
}

export default function Chat({ fornecedores, cotacoes, filtroCampeonato = "todos", T }) {
  const IS = iSty(T);
  const [selId, setSelId] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novaMsg, setNovaMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);
  const [links, setLinks] = useState([]);
  const fileRef = useRef(null);
  const scrollRef = useRef(null);

  const selecionada = useMemo(() => (cotacoes||[]).find(c => c.id === selId), [cotacoes, selId]);
  const fornecedorSel = useMemo(() => fornecedores.find(f => f.id === selecionada?.fornecedorId), [fornecedores, selecionada]);

  // Conversas ordenadas por atualização mais recente (respeitando filtro global)
  const conversas = useMemo(() => {
    return [...(cotacoes||[])]
      .filter(c => filtroCampeonato === "todos" || c.campeonatoId === filtroCampeonato)
      .sort((a,b) => (b.updatedAt||b.createdAt||"").localeCompare(a.updatedAt||a.createdAt||""));
  }, [cotacoes, filtroCampeonato]);

  // Se a conversa selecionada não estiver no filtro atual, limpa a seleção
  useEffect(() => {
    if (selId && !conversas.find(c => c.id === selId)) setSelId(null);
  }, [conversas, selId]);

  // Seleciona a primeira cotação automaticamente
  useEffect(() => {
    if (!selId && conversas.length > 0) setSelId(conversas[0].id);
  }, [conversas, selId]);

  // Carrega mensagens + links + assinatura realtime
  useEffect(() => {
    if (!selId) { setMensagens([]); setLinks([]); return; }
    let channel;
    setLoading(true);
    fetchChatMensagens(selId).then(ms => { setMensagens(ms); setLoading(false); });
    listarCotacaoLinks(selId).then(setLinks);
    channel = subscribeChatMensagens(selId, novaMensagem => {
      setMensagens(prev => prev.some(m => m.id === novaMensagem.id) ? prev : [...prev, { ...novaMensagem, chat_anexos: [] }]);
    });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [selId]);

  // Auto-scroll ao final quando chegar mensagem
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensagens]);

  const enviar = async (autorTipo = "interno") => {
    if (!novaMsg.trim() || !selecionada) return;
    const msg = await sendChatMensagem({
      cotacaoId: selecionada.id,
      fornecedorId: selecionada.fornecedorId,
      autorTipo,
      autorNome: autorTipo === "interno" ? "Equipe" : (fornecedorSel?.apelido || null),
      conteudo: novaMsg.trim(),
    });
    if (msg) setNovaMsg("");
  };

  const enviarComAnexo = async (file) => {
    if (!selecionada || !file) return;
    const msg = await sendChatMensagem({
      cotacaoId: selecionada.id,
      fornecedorId: selecionada.fornecedorId,
      autorTipo: "interno",
      autorNome: "Equipe",
      conteudo: `📎 ${file.name}`,
    });
    if (msg) await uploadChatAnexo({ cotacaoId: selecionada.id, mensagemId: msg.id, file });
  };

  const sugerirIA = async () => {
    if (!selecionada) return;
    setIaLoading(true);
    try {
      const contexto = {
        fornecedor:   fornecedorSel?.apelido,
        campeonato:   CAMPEONATOS_COTACAO.find(c => c.id === selecionada.campeonatoId)?.nome,
        valorProposto: selecionada.valorProposto,
        valorContra:   selecionada.valorContraproposta,
        prazo:         selecionada.prazo,
        observacoes:   selecionada.observacoes,
      };
      const resposta = await callChatIA({ historico: mensagens, novaMensagem: novaMsg, contexto });
      if (resposta) {
        await sendChatMensagem({
          cotacaoId: selecionada.id,
          fornecedorId: selecionada.fornecedorId,
          autorTipo: "ia",
          autorNome: "Claude",
          conteudo: resposta,
        });
      } else {
        await sendChatMensagem({
          cotacaoId: selecionada.id,
          autorTipo: "sistema",
          conteudo: "IA indisponível. Verifique se a Edge Function 'chat-ia' está publicada e se ANTHROPIC_API_KEY está configurada.",
        });
      }
    } finally {
      setIaLoading(false);
    }
  };

  const novoLink = async () => {
    if (!selecionada) return;
    const link = await gerarCotacaoLink({
      cotacaoId: selecionada.id,
      fornecedorId: selecionada.fornecedorId,
      criadoPor: "interno",
    });
    if (link) setLinks(l => [link, ...l]);
  };

  const copiarLink = token => {
    const url = `${window.location.origin}/negociacao/${token}`;
    navigator.clipboard?.writeText(url);
  };

  const revogar = async token => {
    await revogarCotacaoLink(token);
    setLinks(l => l.map(x => x.token === token ? { ...x, revogado: true } : x));
  };

  // ── Renderização ──────────────────────────────────────────────────────────
  if (conversas.length === 0) {
    return (
      <Card T={T}>
        <PanelTitle T={T} title="Chat por Fornecedor" subtitle="Canal de negociação com IA intermediadora"/>
        <div style={{padding:40,textAlign:"center",color:T.textSm,fontSize:12}}>
          Nenhuma cotação ainda. Crie uma cotação na sub-aba Negociações para iniciar uma conversa.
        </div>
      </Card>
    );
  }

  return (
    <Card T={T}>
      <PanelTitle T={T} title="Chat por Fornecedor" subtitle="Canal por cotação · IA intermediadora · Link público"/>

      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",minHeight:560,borderTop:`1px solid ${T.border}`}}>
        {/* ── Sidebar ── */}
        <div style={{borderRight:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg,overflowY:"auto",maxHeight:640}}>
          {conversas.map(c => {
            const f = fornecedores.find(x => x.id === c.fornecedorId);
            const ultima = mensagens.length && selId === c.id ? mensagens[mensagens.length-1]?.conteudo : "";
            return <ConversaItem key={c.id} cotacao={c} fornecedor={f} active={selId===c.id} ultimaMsg={ultima} onClick={() => setSelId(c.id)} T={T}/>;
          })}
        </div>

        {/* ── Thread + composer ── */}
        <div style={{display:"flex",flexDirection:"column",minHeight:560,maxHeight:640}}>
          {/* Header da conversa */}
          {selecionada && (
            <div style={{padding:"12px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:T.text}}>{fornecedorSel?.apelido || "Fornecedor"}</div>
                <div style={{fontSize:11,color:T.textSm}}>
                  {CAMPEONATOS_COTACAO.find(c => c.id === selecionada.campeonatoId)?.nome || "—"}
                  {selecionada.valorProposto > 0 && ` · Prop ${fmt(selecionada.valorProposto)}`}
                  {selecionada.prazo && ` · Prazo ${selecionada.prazo}`}
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <Button T={T} variant="secondary" size="sm" icon={Link2} onClick={novoLink}>Novo Link</Button>
              </div>
            </div>
          )}

          {/* Links públicos */}
          {links.length > 0 && (
            <div style={{padding:"8px 18px",borderBottom:`1px solid ${T.border}`,background:T.surfaceAlt||T.bg,display:"flex",flexDirection:"column",gap:4}}>
              {links.map(l => (
                <div key={l.token} style={{display:"flex",alignItems:"center",gap:8,fontSize:11}}>
                  <Badge color={l.revogado ? T.danger : T.info} T={T} size="sm">
                    {l.revogado ? "Revogado" : "Ativo"}
                  </Badge>
                  <code style={{color:T.textMd,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:280}}>
                    /negociacao/{l.token}
                  </code>
                  <span style={{color:T.textSm,fontSize:10}}>expira {l.expira_em ? new Date(l.expira_em).toLocaleDateString("pt-BR") : "—"}</span>
                  {!l.revogado && (
                    <>
                      <Button T={T} variant="ghost" size="sm" icon={Copy} onClick={() => copiarLink(l.token)}/>
                      <Button T={T} variant="ghost" size="sm" icon={Trash2} onClick={() => revogar(l.token)}/>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Thread */}
          <div ref={scrollRef} style={{flex:1,padding:"16px 18px",overflowY:"auto",background:T.bg}}>
            {loading && <div style={{textAlign:"center",color:T.textSm,fontSize:11}}>Carregando mensagens…</div>}
            {!loading && mensagens.length === 0 && (
              <div style={{textAlign:"center",color:T.textSm,fontSize:12,marginTop:40}}>
                Nenhuma mensagem ainda. Envie a primeira proposta abaixo.
              </div>
            )}
            {mensagens.map(m => <MessageBubble key={m.id} msg={m} T={T}/>)}
          </div>

          {/* Composer */}
          <div style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:8,background:T.surface||T.card}}>
            <textarea
              value={novaMsg}
              onChange={e => setNovaMsg(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); enviar("interno"); } }}
              placeholder="Mensagem (Ctrl+Enter para enviar)…"
              rows={2}
              style={{...IS,resize:"vertical",fontFamily:"inherit"}}
            />
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:6}}>
                <input
                  type="file"
                  ref={fileRef}
                  onChange={e => { const f = e.target.files?.[0]; if (f) enviarComAnexo(f); e.target.value = ""; }}
                  style={{display:"none"}}
                />
                <Button T={T} variant="secondary" size="sm" icon={Paperclip} onClick={() => fileRef.current?.click()}>Anexo</Button>
                <Button T={T} variant="secondary" size="sm" icon={Bot} onClick={sugerirIA} disabled={iaLoading}>
                  {iaLoading ? "Analisando…" : "IA sugerir"}
                </Button>
              </div>
              <div style={{display:"flex",gap:6}}>
                <Button T={T} variant="secondary" size="sm" onClick={() => enviar("fornecedor")}>Registrar resposta do fornecedor</Button>
                <Button T={T} variant="primary" size="sm" icon={Send} onClick={() => enviar("interno")}>Enviar</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
