import { CAMPEONATOS, RADIUS } from "../constants";
import { Card, Stat, Button, Badge } from "./ui";
import {
  Radio, Trophy, Calendar, Building2, Sun, Moon,
  ArrowRight, Lock, Activity, BarChart3, Handshake, Globe2,
} from "lucide-react";

export default function Home({ onEnter, onOpenHub, T, darkMode, setDarkMode }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header style={{
        background: T.surface || T.card,
        borderBottom: `1px solid ${T.border}`,
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        position: "sticky",
        top: 0,
        zIndex: 10,
        backdropFilter: "saturate(180%) blur(8px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: T.gradBrand || "linear-gradient(135deg,#059669,#10b981)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
          }}>
            <Radio size={20} color="#fff" strokeWidth={2.25} />
          </div>
          <div>
            <p style={{
              color: T.textSm,
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              margin: "0 0 2px",
              fontWeight: 600,
            }}>HUB Financeiro</p>
            <h1 style={{
              fontSize: 17,
              fontWeight: 700,
              margin: 0,
              color: T.text,
              letterSpacing: "-0.02em",
            }}>Livemode · Transmissões</h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
      <main style={{ padding: "40px 32px 64px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Hero */}
        <div style={{ marginBottom: 32 }}>
          <p style={{
            color: T.brand || "#10b981",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            margin: "0 0 8px",
          }}>Visão Geral</p>
          <h2 style={{
            fontSize: 28,
            fontWeight: 800,
            color: T.text,
            margin: "0 0 8px",
            letterSpacing: "-0.025em",
          }}>Painel de campeonatos</h2>
          <p style={{ color: T.textMd, fontSize: 14, margin: 0, maxWidth: 640 }}>
            Acompanhe orçamento, execução e operação financeira de cada campeonato em um único lugar.
          </p>
        </div>

        {/* KPIs */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 40,
        }}>
          <Stat T={T} label="Campeonatos Ativos" value="1" sub="de 2 planejados" color={T.brand} icon={Trophy} />
          <Stat T={T} label="Temporada"          value="2026" sub="Janeiro – Dezembro" color={T.info} icon={Calendar} />
          <Stat T={T} label="Detentores"         value="3" sub="CazeTV · Record · Amazon" color="#a855f7" icon={Building2} />
        </div>

        {/* Section header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: 16,
              color: T.text,
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}>Campeonatos</h3>
            <p style={{ color: T.textSm, fontSize: 12, margin: "2px 0 0" }}>
              {CAMPEONATOS.length} projetos cadastrados
            </p>
          </div>
        </div>

        {/* Cards de campeonatos */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: 20,
        }}>
          {CAMPEONATOS.map(camp => (
            <Card
              key={camp.id}
              T={T}
              hoverable={!camp.emBreve}
              style={{
                opacity: camp.emBreve ? 0.65 : 1,
                cursor: camp.emBreve ? "not-allowed" : "pointer",
              }}
            >
              {/* faixa superior */}
              <div style={{
                background: camp.corGrad,
                padding: "22px 24px 20px",
                position: "relative",
                overflow: "hidden",
              }}>
                {/* glow decorativo */}
                <div style={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 160,
                  height: 160,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 60%)",
                  pointerEvents: "none",
                }}/>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  position: "relative",
                  gap: 12,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 32, lineHeight: 1, display: "block", marginBottom: 12 }}>{camp.icon}</span>
                    <h4 style={{
                      margin: "0 0 4px",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#fff",
                      letterSpacing: "-0.015em",
                    }}>{camp.nome}</h4>
                    <p style={{
                      margin: 0,
                      fontSize: 12,
                      color: "rgba(255,255,255,0.72)",
                    }}>{camp.edicao} · {camp.descricao}</p>
                  </div>
                  <span style={{
                    background: camp.statusColor + "22",
                    color: camp.statusColor === "#22c55e" ? "#86efac" : camp.statusColor,
                    border: `1px solid ${camp.statusColor}55`,
                    borderRadius: RADIUS.pill,
                    padding: "4px 10px",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}>{camp.status}</span>
                </div>
              </div>

              {/* corpo do card */}
              <div style={{ padding: "18px 24px 22px" }}>
                {camp.id === "brasileirao-2026" && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 18,
                    paddingBottom: 18,
                    borderBottom: `1px solid ${T.border}`,
                  }}>
                    <div>
                      <p style={{ color: T.textSm, fontSize: 10, margin: "0 0 4px", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>Rodadas</p>
                      <p className="num" style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: 0 }}>{camp.rodadas}</p>
                    </div>
                    <div>
                      <p style={{ color: T.textSm, fontSize: 10, margin: "0 0 4px", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>Detentores</p>
                      <p style={{ color: T.text, fontSize: 12, fontWeight: 600, margin: 0 }}>CazeTV · Record · Amazon</p>
                    </div>
                  </div>
                )}
                {camp.emBreve && (
                  <p style={{ color: T.textSm, fontSize: 12, margin: "0 0 16px", fontStyle: "italic" }}>
                    Em estruturação — disponível em breve.
                  </p>
                )}
                <Button
                  T={T}
                  variant={camp.emBreve ? "secondary" : "primary"}
                  size="md"
                  fullWidth
                  disabled={camp.emBreve}
                  icon={camp.emBreve ? Lock : ArrowRight}
                  onClick={() => !camp.emBreve && onEnter(camp.id)}
                >
                  {camp.emBreve ? "Em breve" : "Abrir campeonato"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Módulos Transversais ────────────────────────────────── */}
        <div style={{ marginTop: 48, marginBottom: 16 }}>
          <h3 style={{
            margin: 0,
            fontSize: 16,
            color: T.text,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}>
            <Globe2 size={16} color={T.brand || "#10b981"} strokeWidth={2.25}/>
            Módulos
          </h3>
          <p style={{ color: T.textSm, fontSize: 12, margin: "2px 0 0" }}>
            Ferramentas financeiras transversais a todos os campeonatos
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: 20,
        }}>
          <Card T={T} hoverable style={{ cursor: "pointer" }}>
            <div style={{
              background: "linear-gradient(135deg,#047857 0%,#10b981 60%,#34d399 100%)",
              padding: "22px 24px 20px",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute",
                top: -40, right: -40,
                width: 180, height: 180,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 60%)",
                pointerEvents: "none",
              }}/>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                position: "relative",
                gap: 12,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 12,
                    backdropFilter: "blur(4px)",
                  }}>
                    <Handshake size={22} color="#fff" strokeWidth={2.25}/>
                  </div>
                  <h4 style={{
                    margin: "0 0 4px",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-0.015em",
                  }}>Hub de Fornecedores</h4>
                  <p style={{
                    margin: 0,
                    fontSize: 12,
                    color: "rgba(255,255,255,0.78)",
                  }}>Cadastro, cotações, chat com IA e análise preditiva</p>
                </div>
                <span style={{
                  background: "rgba(255,255,255,0.18)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.32)",
                  borderRadius: RADIUS.pill,
                  padding: "4px 10px",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}>Ativo</span>
              </div>
            </div>
            <div style={{ padding: "18px 24px 22px" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
                marginBottom: 18,
                paddingBottom: 18,
                borderBottom: `1px solid ${T.border}`,
              }}>
                <div>
                  <p style={{ color: T.textSm, fontSize: 10, margin: "0 0 4px", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>Escopo</p>
                  <p style={{ color: T.text, fontSize: 12, fontWeight: 600, margin: 0 }}>Cross-camp.</p>
                </div>
                <div>
                  <p style={{ color: T.textSm, fontSize: 10, margin: "0 0 4px", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>Sub-abas</p>
                  <p className="num" style={{ color: T.text, fontSize: 12, fontWeight: 600, margin: 0 }}>6 módulos</p>
                </div>
                <div>
                  <p style={{ color: T.textSm, fontSize: 10, margin: "0 0 4px", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>IA</p>
                  <p style={{ color: T.brand, fontSize: 12, fontWeight: 600, margin: 0 }}>Claude</p>
                </div>
              </div>
              <Button
                T={T}
                variant="primary"
                size="md"
                fullWidth
                icon={ArrowRight}
                onClick={() => onOpenHub && onOpenHub("todos")}
              >
                Abrir Hub
              </Button>
            </div>
          </Card>
        </div>

        <div style={{
          marginTop: 56,
          paddingTop: 24,
          borderTop: `1px solid ${T.border}`,
          textAlign: "center",
          color: T.textSm,
          fontSize: 11,
          letterSpacing: "0.04em",
        }}>
          HUB Financeiro · Livemode Sports · Temporada 2026
        </div>
      </main>
    </div>
  );
}
