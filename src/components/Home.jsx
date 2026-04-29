import { CAMPEONATOS, RADIUS, FONT } from "../constants";
import { getChampionshipConfig } from "../config/championships";
import ChampionshipLogo from "./ChampionshipLogo";
import { Card, Stat, Button, Badge } from "./ui";
import {
  Trophy, Calendar, Building2, Sun, Moon,
  ArrowRight, Lock, Activity, Handshake, Globe2,
  Plus, Trash2,
} from "lucide-react";

// Logotipo Livemode — versão compacta inline (LM + círculo verde).
function LivemodeMark({ size = 36 }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 8,
      background: "#1A1A1A",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      fontFamily: FONT.display,
      fontWeight: 700,
      color: "#fff",
      fontSize: Math.round(size * 0.42),
      letterSpacing: "0.02em",
      flexShrink: 0,
    }}>
      LM
      <span style={{
        width: Math.round(size * 0.18),
        height: Math.round(size * 0.18),
        borderRadius: "50%",
        background: "#65B32E",
        display: "inline-block",
        marginLeft: 1,
      }}/>
    </div>
  );
}

// Stats por campeonato — extraído pra ler de qualquer estrutura sem alterar dados.
function CampStats({ camp, T }) {
  if (camp.id === "brasileirao-2026") {
    return (
      <>
        <StatBlock label="Rodadas" value={camp.rodadas} T={T}/>
        <StatBlock label="Detentores" value="3" T={T} hint="CazeTV · Record · Amazon"/>
      </>
    );
  }
  if (camp.id === "paulistao-feminino-2026") {
    return (
      <>
        <StatBlock label="Fases" value={camp.fases} T={T}/>
        <StatBlock label="Formato" value="Mata-mata" T={T} hint="Grupos + Mata-mata"/>
      </>
    );
  }
  return (
    <>
      <StatBlock label="Fases" value={camp.fases?.length || 0} T={T}/>
      <StatBlock label="Tipo" value="Custom" T={T} hint="HUB Custom"/>
    </>
  );
}

function StatBlock({ label, value, hint, T }) {
  return (
    <div>
      <p style={{
        color: "rgba(255,255,255,0.45)",
        fontSize: 10,
        margin: "0 0 4px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontWeight: 600,
        fontFamily: FONT.ui,
      }}>{label}</p>
      <p className="num" style={{
        color: "#fff",
        fontFamily: FONT.display,
        fontSize: 18,
        fontWeight: 700,
        margin: 0,
        letterSpacing: "-0.005em",
        lineHeight: 1.2,
      }}>{value}</p>
      {hint && <p style={{
        color: "rgba(255,255,255,0.45)",
        fontSize: 10,
        margin: "2px 0 0",
        fontFamily: FONT.ui,
      }}>{hint}</p>}
    </div>
  );
}

// ── Card de campeonato — fundo escuro temático com logo + stats + CTA ──────────
function ChampCard({ camp, onEnter, onDelete }) {
  const cfg = getChampionshipConfig(camp.id, camp);
  return (
    <div className="lm-card-hover" style={{
      background: cfg.bgGradient,
      backgroundColor: cfg.bgColor,
      borderRadius: RADIUS.lg,
      padding: 22,
      cursor: "pointer",
      border: "1px solid rgba(255,255,255,0.06)",
      position: "relative",
      overflow: "hidden",
      minHeight: 240,
      display: "flex",
      flexDirection: "column",
      gap: 18,
    }} onClick={() => onEnter(camp.id.startsWith("custom-") ? `custom:${camp.id}` : camp.id)}>
      {/* Cabeçalho: logo + nome + badge */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap: 12 }}>
        <div style={{ display:"flex", alignItems:"center", gap: 14, minWidth: 0 }}>
          <ChampionshipLogo championshipId={camp.id} size={48} config={camp}/>
          <div style={{ minWidth: 0 }}>
            <h4 style={{
              margin: "0 0 2px",
              fontFamily: FONT.display,
              fontSize: 20,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "-0.005em",
              lineHeight: 1.1,
            }}>{camp.nome}</h4>
            <p style={{
              margin: 0,
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              fontFamily: FONT.ui,
            }}>{camp.edicao} · Temporada</p>
          </div>
        </div>

        {/* Badge "Em andamento" com ponto pulsante */}
        <span style={{
          background: "rgba(101,179,46,0.12)",
          border: "1px solid rgba(101,179,46,0.35)",
          color: "#8ed45c",
          borderRadius: RADIUS.pill,
          padding: "0 10px",
          height: 22,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: FONT.ui,
        }}>
          <span className="live-dot" style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#65B32E",
            display: "inline-block",
          }}/>
          {camp.status}
        </span>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <CampStats camp={camp}/>
      </div>

      <div style={{ flex: 1 }}/>

      {/* CTA + (opcional) excluir */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={e => { e.stopPropagation(); onEnter(camp.id.startsWith("custom-") ? `custom:${camp.id}` : camp.id); }}
          style={{
            flex: 1,
            background: "rgba(101,179,46,0.12)",
            border: "1px solid rgba(101,179,46,0.35)",
            color: "#8ed45c",
            borderRadius: 8,
            height: 36,
            cursor: "pointer",
            fontFamily: FONT.ui,
            fontWeight: 500,
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            letterSpacing: "0",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(101,179,46,0.18)";
            e.currentTarget.style.borderColor = "rgba(101,179,46,0.55)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(101,179,46,0.12)";
            e.currentTarget.style.borderColor = "rgba(101,179,46,0.35)";
          }}
        >
          Abrir campeonato <ArrowRight size={14} strokeWidth={2.25}/>
        </button>
        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(camp); }}
            title="Excluir"
            style={{
              width: 36,
              height: 36,
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.2)",
              color: "#fca5a5",
              borderRadius: 8,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Trash2 size={14} strokeWidth={2.25}/>
          </button>
        )}
      </div>
    </div>
  );
}

export default function Home({ onEnter, onOpenHub, T, darkMode, setDarkMode, customCampeonatos = [], onCriarCampeonato, onExcluirCampeonato }) {
  const totalAtivos = CAMPEONATOS.filter(c => !c.emBreve).length + customCampeonatos.filter(c => c.status === "Em andamento").length;

  return (
    <div className="page-enter" style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header style={{
        background: T.surface || T.card,
        borderBottom: `1px solid ${T.border}`,
        height: 52,
        padding: "0 28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LivemodeMark size={32}/>
          <span style={{
            fontFamily: FONT.display,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: T.textMd,
          }}>HUB FINANCEIRO</span>
          <span style={{ width: 1, height: 18, background: T.border, margin: "0 4px" }}/>
          <span style={{
            fontFamily: FONT.ui,
            fontSize: 12,
            color: T.textMd,
          }}>Livemode · Transmissões</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Badge color={T.brand} T={T}>
            <Activity size={11} strokeWidth={2.5} />
            Temporada 2026
          </Badge>
          <Button
            T={T}
            variant="secondary"
            size="sm"
            icon={darkMode ? Sun : Moon}
            onClick={() => setDarkMode(d => !d)}
          >
            {darkMode ? "Claro" : "Escuro"}
          </Button>
        </div>
      </header>

      {/* ── Conteúdo ──────────────────────────────────────────────────────── */}
      <main style={{ padding: "32px 28px 64px", maxWidth: 1240, margin: "0 auto" }}>
        {/* Hero */}
        <div style={{ marginBottom: 28 }}>
          <p style={{
            color: T.brand || "#65B32E",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            margin: "0 0 8px",
            fontFamily: FONT.ui,
          }}>Visão Geral</p>
          <h2 style={{
            fontFamily: FONT.display,
            fontSize: 32,
            fontWeight: 700,
            color: T.text,
            margin: "0 0 6px",
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
          }}>Painel de campeonatos</h2>
          <p style={{ color: T.textMd, fontSize: 13, margin: 0, maxWidth: 640, fontFamily: FONT.ui }}>
            Acompanhe orçamento, execução e operação financeira de cada campeonato em um único lugar.
          </p>
        </div>

        {/* KPIs */}
        <div className="stagger" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 36,
        }}>
          <Stat T={T} label="Campeonatos Ativos" value={String(totalAtivos)} sub={`${CAMPEONATOS.length + customCampeonatos.length} cadastrados`} color={T.brand} icon={Trophy} />
          <Stat T={T} label="Temporada"          value="2026" sub="Janeiro – Dezembro" color={T.info} icon={Calendar} />
          <Stat T={T} label="Detentores"         value="3" sub="CazeTV · Record · Amazon" color={T.projetado || "#7C3AED"} icon={Building2} />
        </div>

        {/* Section header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontFamily: FONT.display,
              fontSize: 20,
              color: T.text,
              fontWeight: 700,
              letterSpacing: "-0.005em",
            }}>Campeonatos</h3>
            <p style={{ color: T.textSm, fontSize: 11, margin: "2px 0 0", fontFamily: FONT.ui }}>
              {CAMPEONATOS.length + customCampeonatos.length} projetos cadastrados
            </p>
          </div>
          <Button T={T} variant="primary" size="md" icon={Plus} onClick={onCriarCampeonato}>
            Novo campeonato
          </Button>
        </div>

        {/* Cards de campeonatos */}
        <div className="stagger" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 18,
        }}>
          {CAMPEONATOS.map(camp => (
            <ChampCard
              key={camp.id}
              camp={camp}
              onEnter={onEnter}
            />
          ))}

          {customCampeonatos.map(camp => (
            <ChampCard
              key={camp.id}
              camp={camp}
              onEnter={(id) => onEnter(`custom:${camp.id}`)}
              onDelete={(c) => {
                if (window.confirm(`Excluir o campeonato "${c.nome}"? Os dados (jogos, notas, logística) ficam no Supabase mas o campeonato some do portal.`)) {
                  onExcluirCampeonato && onExcluirCampeonato(c.id);
                }
              }}
            />
          ))}

          {/* Card "+ Criar novo" — borda dashed transparente */}
          <button onClick={onCriarCampeonato} className="lm-card-hover" style={{
            cursor: "pointer",
            border: `1.5px dashed ${T.borderStrong || T.border}`,
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 240,
            borderRadius: RADIUS.lg,
            padding: 22,
            color: T.textMd,
            fontFamily: FONT.ui,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                border: `1.5px dashed ${T.brand || "#65B32E"}`,
                color: T.brand || "#65B32E",
                background: "rgba(101,179,46,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}>
                <Plus size={22} strokeWidth={2.25}/>
              </div>
              <p style={{margin: "0 0 4px", fontSize: 13, fontWeight: 500, color: T.text}}>Criar novo campeonato</p>
              <p style={{margin: 0, fontSize: 11, color: T.textSm, maxWidth: 240}}>Cole um JSON no formato padrão e o campeonato é criado com todas as funcionalidades do HUB.</p>
            </div>
          </button>
        </div>

        {/* ── Módulos Transversais ────────────────────────────────── */}
        <div style={{ marginTop: 44, marginBottom: 14 }}>
          <h3 style={{
            margin: 0,
            fontFamily: FONT.display,
            fontSize: 20,
            color: T.text,
            fontWeight: 700,
            letterSpacing: "-0.005em",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}>
            <Globe2 size={18} color={T.brand || "#65B32E"} strokeWidth={2.25}/>
            Módulos
          </h3>
          <p style={{ color: T.textSm, fontSize: 11, margin: "2px 0 0", fontFamily: FONT.ui }}>
            Ferramentas financeiras transversais a todos os campeonatos
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 18,
        }}>
          {/* Módulo Hub de Fornecedores — card claro com ícone verde */}
          <button
            onClick={() => onOpenHub && onOpenHub("todos")}
            className="lm-card-hover"
            style={{
              background: T.surface || T.card,
              border: `1px solid ${T.border}`,
              borderRadius: RADIUS.lg,
              padding: 20,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              boxShadow: T.shadow || "0 1px 3px rgba(0,0,0,0.06)",
              fontFamily: FONT.ui,
              color: T.text,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 9,
                  background: "rgba(101,179,46,0.10)",
                  color: T.brand || "#65B32E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Handshake size={20} strokeWidth={2.25}/>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: T.text }}>Hub de Fornecedores</h4>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSm }}>Cadastro, cotações, chat com IA e análise preditiva</p>
                </div>
              </div>
              <span style={{
                background: "rgba(101,179,46,0.12)",
                border: "1px solid rgba(101,179,46,0.35)",
                color: T.brand || "#65B32E",
                borderRadius: RADIUS.pill,
                padding: "0 10px",
                height: 22,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
              }}>Ativo</span>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              paddingTop: 16,
              borderTop: `1px solid ${T.border}`,
            }}>
              <div>
                <p style={{ color: T.textSm, fontSize: 10, margin: "0 0 4px", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Escopo</p>
                <p style={{ color: T.text, fontSize: 12, fontWeight: 500, margin: 0 }}>Cross-camp.</p>
              </div>
              <div>
                <p style={{ color: T.textSm, fontSize: 10, margin: "0 0 4px", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Sub-abas</p>
                <p className="num" style={{ color: T.text, fontSize: 12, fontWeight: 500, margin: 0, fontFamily: FONT.num }}>6 módulos</p>
              </div>
              <div>
                <p style={{ color: T.textSm, fontSize: 10, margin: "0 0 4px", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>IA</p>
                <p style={{ color: T.brand, fontSize: 12, fontWeight: 500, margin: 0 }}>Claude</p>
              </div>
            </div>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.brand, fontSize: 12, fontWeight: 500 }}>
              Abrir Hub <ArrowRight size={14} strokeWidth={2.25}/>
            </div>
          </button>
        </div>

        <div style={{
          marginTop: 56,
          paddingTop: 24,
          borderTop: `1px solid ${T.border}`,
          textAlign: "center",
          color: T.textSm,
          fontSize: 11,
          letterSpacing: "0.04em",
          fontFamily: FONT.ui,
        }}>
          HUB Financeiro · Livemode Sports · Temporada 2026
        </div>
      </main>
    </div>
  );
}
