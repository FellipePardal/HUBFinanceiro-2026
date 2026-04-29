import { useEffect, useState, useMemo } from "react";
import { getState, setState as setSupabaseState, supabase } from "../lib/supabase";
import {
  setCelula, getCelula, contarCelulasPreenchidas,
  unidadeLabel, statusTabelaInfo, statusTokenTabela,
} from "../data/catalogos";
import {
  Package, MapPin, Tag, Save, Send, AlertCircle, CheckCircle2, Lock,
  Loader2, Building2, Trophy,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// Página pública de preenchimento de tabela de preços
// ----------------------------------------------------------------------------
// O fornecedor recebe um link /#tabela/<token>, abre sem autenticação e
// preenche a matriz cidade × categoria × item. Pode salvar progresso (mantém
// o status atual) ou enviar definitivamente para revisão (vira "enviada").
//
// O componente lê tudo do Supabase (forn_tabelas_preco, fornecedores,
// forn_campeonatos, forn_cidades) e identifica a tabela alvo pelo token.
// ════════════════════════════════════════════════════════════════════════════

// Tema autônomo (não depende do contexto de DARK/LIGHT do app principal)
const T = {
  bg:"#060912", surface:"#0f1623", surfaceAlt:"#0a0f1a", surfaceRaised:"#1a2435",
  border:"#1e293b", borderStrong:"#334155",
  text:"#f8fafc", textMd:"#cbd5e1", textSm:"#94a3b8",
  brand:"#10b981", brandStrong:"#059669",
  brandSoft:"rgba(16,185,129,0.14)", brandBorder:"rgba(16,185,129,0.32)",
  warning:"#f59e0b", danger:"#ef4444", info:"#3b82f6",
};

const fmt = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});

const inputCelulaSty = (preenchido) => ({
  background: preenchido ? T.brandSoft : T.bg,
  border: `1px solid ${preenchido ? T.brandBorder : T.border}`,
  borderRadius: 6,
  color: T.text,
  padding: "10px 12px",
  fontSize: 14,
  fontWeight: preenchido ? 700 : 500,
  width: "100%",
  textAlign: "right",
  boxSizing: "border-box",
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  outline: "none",
});

const btnSty = (variant = "primary") => ({
  display:"inline-flex",alignItems:"center",gap:8,
  padding:"12px 22px",
  borderRadius:10,
  border: variant === "secondary" ? `1px solid ${T.border}` : "none",
  background: variant === "primary" ? T.brand : "transparent",
  color: variant === "primary" ? "#fff" : T.textMd,
  fontWeight:700,fontSize:14,cursor:"pointer",
  fontFamily:"'Poppins',sans-serif",
  letterSpacing:"-0.005em",
});

export default function TabelaPrecoPublica({ token }) {
  const [estado, setEstado] = useState("loading"); // loading|invalido|expirado|revogado|finalizada|ok|erro
  const [tabela, setTabela] = useState(null);
  const [tabelas, setTabelas] = useState([]); // lista completa para persistência
  const [fornecedor, setFornecedor] = useState(null);
  const [campeonato, setCampeonato] = useState(null);
  const [cidades, setCidades] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  // ── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [tbs, forns, camps, cids] = await Promise.all([
          getState("forn_tabelas_preco"),
          getState("fornecedores"),
          getState("forn_campeonatos"),
          getState("forn_cidades"),
        ]);
        const lista = tbs || [];
        setTabelas(lista);
        const t = lista.find(x => x.token === token);
        if (!t) { setEstado("invalido"); return; }
        const tStatus = statusTokenTabela(t);
        if (tStatus === "revogado") { setTabela(t); setEstado("revogado"); return; }
        if (tStatus === "expirado") { setTabela(t); setEstado("expirado"); return; }
        if (t.status === "vigente" || t.status === "arquivada") { setTabela(t); setEstado("finalizada"); return; }

        const f = (forns || []).find(x => String(x.id) === String(t.fornecedorId));
        const c = (camps || []).find(x => x.id === t.campeonatoId);
        if (!f || !c) { setEstado("invalido"); return; }
        setFornecedor(f);
        setCampeonato(c);
        setCidades(cids || []);
        setTabela(t);
        setEstado("ok");
      } catch (e) {
        console.error(e);
        setEstado("erro");
      }
    }
    load();

    // Realtime: se admin revogar/aprovar enquanto fornecedor preenche
    const channel = supabase
      .channel(`tabela_publica_${token}`)
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"app_state" }, payload => {
        if (payload.new.key !== "forn_tabelas_preco") return;
        const lista = payload.new.value || [];
        const t = lista.find(x => x.token === token);
        if (!t) return;
        setTabelas(lista);
        // Só sobrescreve se o usuário não tem alterações pendentes
        setTabela(prev => dirty ? prev : t);
        const ts = statusTokenTabela(t);
        if (ts === "revogado") setEstado("revogado");
        else if (ts === "expirado") setEstado("expirado");
        else if (t.status === "vigente" || t.status === "arquivada") setEstado("finalizada");
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Cálculos ─────────────────────────────────────────────────────────────
  const itens = (fornecedor?.catalogo || []).filter(i => i.ativo !== false);
  const cidadesDoCamp = useMemo(
    () => (campeonato?.cidadeIds || []).map(id => cidades.find(c => c.id === id)).filter(Boolean),
    [campeonato, cidades]
  );
  const categorias = campeonato?.categorias || [];
  const totalCelulas = itens.length * cidadesDoCamp.length * categorias.length;
  const preenchidas = contarCelulasPreenchidas(tabela);
  const pct = totalCelulas ? Math.round((preenchidas / totalCelulas) * 100) : 0;

  // ── Edição ───────────────────────────────────────────────────────────────
  const updateCelula = (itemId, cidadeId, categoria, raw) => {
    const valor = raw === "" ? null : parseFloat(raw);
    setTabela(t => setCelula(t, itemId, cidadeId, categoria, valor));
    setDirty(true);
  };

  const persistir = async (statusNovo) => {
    if (!tabela) return;
    setSalvando(true);
    const next = {
      ...tabela,
      status: statusNovo || tabela.status,
      atualizadoEm: new Date().toISOString(),
      ...(statusNovo === "enviada" ? { enviadaEm: new Date().toISOString() } : {}),
    };
    const novaLista = tabelas.map(t => t.id === next.id ? next : t);
    await setSupabaseState("forn_tabelas_preco", novaLista);
    setTabelas(novaLista);
    setTabela(next);
    setDirty(false);
    setSalvando(false);
    setMensagem(statusNovo === "enviada"
      ? "Tabela enviada com sucesso! Você pode fechar esta página."
      : "Progresso salvo.");
    setTimeout(() => setMensagem(null), 4000);
  };

  // ── Estados de erro/limite ───────────────────────────────────────────────
  if (estado === "loading") return <FullCenter icon={Loader2} title="Carregando..." spin/>;
  if (estado === "invalido") return <FullCenter icon={AlertCircle} title="Link inválido" msg="Este link não corresponde a nenhuma tabela de preços. Verifique se foi copiado corretamente."/>;
  if (estado === "revogado") return <FullCenter icon={Lock} title="Link revogado" msg="Este link foi revogado pelo solicitante. Entre em contato para receber um novo."/>;
  if (estado === "expirado") return <FullCenter icon={Lock} title="Link expirado" msg="Este link já passou da data de validade. Entre em contato para receber um novo."/>;
  if (estado === "finalizada") return <FullCenter icon={CheckCircle2} title="Tabela finalizada" msg="Esta tabela já foi aprovada ou arquivada e não pode mais ser alterada."/>;
  if (estado === "erro") return <FullCenter icon={AlertCircle} title="Erro ao carregar" msg="Ocorreu um problema ao buscar os dados. Tente recarregar a página."/>;

  // ── Render principal ─────────────────────────────────────────────────────
  const status = statusTabelaInfo(tabela.status);

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Poppins',sans-serif"}}>
      {/* Header */}
      <div style={{
        background:T.surface,
        borderBottom:`1px solid ${T.border}`,
        padding:"24px 32px",
      }}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",color:T.brand}}>Tabela de preços</span>
            <span style={{padding:"3px 10px",borderRadius:999,background:status.color+"26",color:status.color,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em"}}>
              {status.label}
            </span>
            <span style={{fontSize:11,color:T.textSm}}>v{tabela.versao}</span>
          </div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,letterSpacing:"-0.02em",display:"flex",alignItems:"center",gap:10}}>
            <Building2 size={22} color={T.brand}/>
            {fornecedor.apelido}
          </h1>
          <p style={{margin:"4px 0 0",color:T.textMd,fontSize:14,display:"flex",alignItems:"center",gap:6}}>
            <Trophy size={13}/> {campeonato.nome}
          </p>

          <div style={{marginTop:16,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:200,maxWidth:360}}>
              <div style={{height:8,background:T.surfaceAlt,borderRadius:999,overflow:"hidden"}}>
                <div style={{width:`${pct}%`,height:"100%",background:T.brand,transition:"width .3s"}}/>
              </div>
            </div>
            <span style={{fontSize:13,fontWeight:700,color:T.textMd,fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}>
              {preenchidas}/{totalCelulas} ({pct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Instruções */}
      <div style={{maxWidth:1200,margin:"0 auto",padding:"20px 32px 0"}}>
        <div style={{padding:"14px 18px",background:T.brandSoft,border:`1px solid ${T.brandBorder}`,borderRadius:10,fontSize:13,color:T.text,lineHeight:1.55}}>
          Preencha o valor por jogo (em reais) para cada cidade-sede e categoria.
          Você pode <b>salvar o progresso</b> a qualquer momento e voltar mais tarde
          usando o mesmo link. Quando concluir, clique em <b>Enviar para revisão</b>.
        </div>
      </div>

      {/* Matriz por item */}
      <div style={{maxWidth:1200,margin:"0 auto",padding:"20px 32px 120px"}}>
        {itens.map(item => (
          <div key={item.id} style={{
            background:T.surface,
            border:`1px solid ${T.border}`,
            borderRadius:14,
            marginBottom:16,
            overflow:"hidden",
          }}>
            <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
                <div style={{
                  width:36,height:36,borderRadius:10,
                  background:T.brandSoft,
                  border:`1px solid ${T.brandBorder}`,
                  color:T.brand,
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}><Package size={17} strokeWidth={2.25}/></div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:700}}>{item.nome}</div>
                  {item.descricao && <div style={{fontSize:12,color:T.textSm,marginTop:2}}>{item.descricao}</div>}
                </div>
              </div>
              <span style={{padding:"4px 10px",borderRadius:999,background:T.info+"26",color:T.info,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em"}}>
                {unidadeLabel(item.unidade)}
              </span>
            </div>

            <div style={{padding:"6px 12px 16px",overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"separate",borderSpacing:"8px 6px"}}>
                <thead>
                  <tr>
                    <th style={{textAlign:"left",padding:"10px 12px",fontSize:11,fontWeight:700,color:T.textSm,letterSpacing:"0.04em",textTransform:"uppercase",minWidth:180}}>Cidade</th>
                    {categorias.map(cat => (
                      <th key={cat.codigo} style={{textAlign:"center",padding:"10px 12px",fontSize:11,fontWeight:700,color:T.textSm,letterSpacing:"0.04em",textTransform:"uppercase"}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Tag size={11}/>{cat.codigo}</span>
                      </th>
                    ))}
                    <th style={{textAlign:"right",padding:"10px 12px",fontSize:11,fontWeight:700,color:T.textSm,letterSpacing:"0.04em",textTransform:"uppercase",width:130}}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {cidadesDoCamp.map(cid => {
                    const subtotal = categorias.reduce((s, cat) => s + (getCelula(tabela, item.id, cid.id, cat.codigo) || 0), 0);
                    return (
                      <tr key={cid.id}>
                        <td style={{padding:"8px 12px",fontSize:14,color:T.text,fontWeight:600}}>
                          <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                            <MapPin size={12} color={T.textSm}/>
                            {cid.nome}
                            <span style={{color:T.textSm,fontWeight:500,fontSize:12}}>/{cid.uf}</span>
                          </span>
                        </td>
                        {categorias.map(cat => {
                          const v = getCelula(tabela, item.id, cid.id, cat.codigo);
                          return (
                            <td key={cat.codigo} style={{padding:"3px 0",minWidth:130}}>
                              <input
                                type="number"
                                value={v ?? ""}
                                onChange={e => updateCelula(item.id, cid.id, cat.codigo, e.target.value)}
                                placeholder="—"
                                style={inputCelulaSty(v != null && v !== "")}
                              />
                            </td>
                          );
                        })}
                        <td style={{padding:"8px 12px",fontSize:14,fontWeight:700,color:subtotal>0?T.brand:T.textSm,textAlign:"right",fontFamily:"'JetBrains Mono',ui-monospace,monospace"}}>
                          {subtotal > 0 ? fmt(subtotal) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {!itens.length && (
          <div style={{padding:40,textAlign:"center",background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,color:T.textMd}}>
            Esta tabela ainda não tem itens cadastrados. Entre em contato com o solicitante.
          </div>
        )}
      </div>

      {/* Footer fixo de ações */}
      <div style={{
        position:"fixed",bottom:0,left:0,right:0,
        background:T.surface,
        borderTop:`1px solid ${T.border}`,
        padding:"14px 32px",
        display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",
        boxShadow:"0 -8px 24px rgba(0,0,0,0.4)",
        zIndex:50,
      }}>
        <div style={{fontSize:12,color:T.textSm}}>
          {mensagem
            ? <span style={{color:T.brand,fontWeight:700,display:"inline-flex",alignItems:"center",gap:6}}><CheckCircle2 size={13}/>{mensagem}</span>
            : dirty
              ? <span style={{color:T.warning,fontWeight:600}}>Você tem alterações não salvas</span>
              : <>Atualizada em {new Date(tabela.atualizadoEm).toLocaleString("pt-BR")}</>}
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button style={btnSty("secondary")} onClick={()=>persistir(tabela.status)} disabled={salvando||!dirty}>
            <Save size={16}/> Salvar progresso
          </button>
          <button style={btnSty("primary")} onClick={()=>persistir("enviada")} disabled={salvando}>
            <Send size={16}/> Enviar para revisão
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tela de estado vazio/erro ───────────────────────────────────────────────
function FullCenter({ icon:Icon, title, msg, spin }) {
  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Poppins',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{maxWidth:420,textAlign:"center"}}>
        <div style={{
          width:72,height:72,borderRadius:18,
          background:T.surface,
          border:`1px solid ${T.border}`,
          color:T.textMd,
          display:"inline-flex",alignItems:"center",justifyContent:"center",
          marginBottom:18,
        }}>
          <Icon size={32} strokeWidth={2} style={spin?{animation:"spin 1s linear infinite"}:undefined}/>
        </div>
        <h1 style={{margin:"0 0 8px",fontSize:22,fontWeight:800,letterSpacing:"-0.02em"}}>{title}</h1>
        {msg && <p style={{margin:0,fontSize:14,color:T.textMd,lineHeight:1.5}}>{msg}</p>}
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
