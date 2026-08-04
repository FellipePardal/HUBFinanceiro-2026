import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { loadPortalData } from '../lib/portalLink';

const TABLES_BY_CAMP = {
  brasileirao: ['brasileirao_jogos', 'perifericos_brasileirao'],
  paulistao:   ['paulistao_feminino_jogos', 'perifericos_paulistao'],
};

// Carrega dados operacionais do Portal e mantém atualizados via realtime.
// Retorna { portal: { controle, periferico }, loading }.
// `enabled=false` desliga tudo (nenhuma consulta, nenhum canal realtime) — usado
// enquanto o Portal está em reestruturação para virar a matriz (2026-08).
export function usePortalLink(campeonato = 'brasileirao', { enabled = true } = {}) {
  const [portal, setPortal] = useState({ controle: new Map(), periferico: new Map() });
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function load() {
      const data = await loadPortalData(campeonato);
      if (!cancelled) {
        setPortal(data);
        setLoading(false);
      }
    }
    load();

    const tables = TABLES_BY_CAMP[campeonato] || TABLES_BY_CAMP.brasileirao;
    const channel = supabase.channel(`portal_link_${campeonato}`);
    tables.forEach(t => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, load);
    });
    channel.subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campeonato, enabled]);

  return { portal, loading };
}
