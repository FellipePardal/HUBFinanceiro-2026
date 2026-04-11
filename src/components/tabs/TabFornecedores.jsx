import { useState } from "react";
import { RADIUS } from "../../constants";
import {
  Users, Handshake, CalendarDays, FileSpreadsheet, MessageSquare, LineChart,
} from "lucide-react";

import Cadastro      from "./fornecedores/Cadastro";
import Negociacoes   from "./fornecedores/Negociacoes";
import ProximosJogos from "./fornecedores/ProximosJogos";
import Cotacoes      from "./fornecedores/Cotacoes";
import Chat          from "./fornecedores/Chat";
import Dashboard     from "./fornecedores/Dashboard";

// Navegação das sub-abas da aba Fornecedores
const SUBTABS = [
  { key:"cadastro",    label:"Cadastro",      icon:Users },
  { key:"negociacoes", label:"Negociações",   icon:Handshake },
  { key:"jogos",       label:"Próximos Jogos",icon:CalendarDays },
  { key:"cotacoes",    label:"Cotações",      icon:FileSpreadsheet },
  { key:"chat",        label:"Chat",          icon:MessageSquare },
  { key:"dashboard",   label:"Dashboard",     icon:LineChart },
];

function SubTabNav({ active, onChange, T }) {
  return (
    <div style={{
      display:"flex",
      gap:4,
      marginBottom:20,
      padding:4,
      background:T.surfaceAlt||T.bg,
      border:`1px solid ${T.border}`,
      borderRadius:RADIUS.md,
      flexWrap:"wrap",
    }}>
      {SUBTABS.map(({key, label, icon:Icon}) => {
        const on = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              display:"inline-flex",
              alignItems:"center",
              gap:8,
              padding:"9px 16px",
              borderRadius:RADIUS.sm,
              border:"none",
              cursor:"pointer",
              fontSize:12,
              fontWeight:600,
              letterSpacing:"-0.005em",
              background: on ? (T.brand||"#10b981") : "transparent",
              color: on ? "#fff" : T.textMd,
              boxShadow: on ? `0 2px 8px ${(T.brand||"#10b981")}55` : "none",
              transition:"all .15s",
              whiteSpace:"nowrap",
            }}>
            <Icon size={14} strokeWidth={2.25}/>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function TabFornecedores({
  fornecedores, setFornecedores,
  cotacoes, setCotacoes,
  jogos, T,
}) {
  const [sub, setSub] = useState("cadastro");

  return (
    <>
      <SubTabNav active={sub} onChange={setSub} T={T}/>

      {sub === "cadastro"    && <Cadastro      fornecedores={fornecedores} setFornecedores={setFornecedores} T={T}/>}
      {sub === "negociacoes" && <Negociacoes   fornecedores={fornecedores} cotacoes={cotacoes} setCotacoes={setCotacoes} jogos={jogos} T={T}/>}
      {sub === "jogos"       && <ProximosJogos jogos={jogos} cotacoes={cotacoes} T={T}/>}
      {sub === "cotacoes"    && <Cotacoes      fornecedores={fornecedores} cotacoes={cotacoes} setCotacoes={setCotacoes} jogos={jogos} T={T}/>}
      {sub === "chat"        && <Chat          fornecedores={fornecedores} cotacoes={cotacoes} T={T}/>}
      {sub === "dashboard"   && <Dashboard     fornecedores={fornecedores} cotacoes={cotacoes} jogos={jogos} T={T}/>}
    </>
  );
}
