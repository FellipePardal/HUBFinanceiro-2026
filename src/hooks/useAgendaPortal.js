import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { aplicarAgendaPortal, lerAgendaPortal, gravarLinkAdocao } from '../lib/portalAgenda';

// Mantém a agenda do Hub espelhando o Portal de Controle (a matriz desde
// 2026-08): sincroniza ao montar e a cada mudança na tabela do Portal via
// realtime. Só toca campos descritivos; financeiro fica intacto (ver
// lib/portalAgenda.js). Se o Portal estiver fora do ar, não faz nada.
export function useAgendaPortal({ tabela, rodadaCol = 'eu', extras = [], jogos, setJogos, pronto, enabled = true }) {
  // O sync usa sempre o snapshot mais recente sem re-rodar o efeito a cada
  // mudança de jogos (senão cada eco de realtime do próprio setJogos re-dispararia).
  const jogosRef = useRef(jogos);
  jogosRef.current = jogos;

  useEffect(() => {
    if (!enabled || !pronto || !tabela) return;
    let cancelled = false;

    async function sync() {
      const rows = await lerAgendaPortal(tabela);
      if (cancelled || !rows) return;
      const { changed, adocoes } = aplicarAgendaPortal(jogosRef.current, rows, { rodadaCol, extras });
      if (!changed) return;
      // O persisted setter relê o servidor antes de gravar; aplicar a MESMA
      // transformação lá dentro mantém a consistência mesmo com outra aba editando.
      setJogos(js => aplicarAgendaPortal(js, rows, { rodadaCol, extras }).next);
      for (const a of adocoes) {
        await gravarLinkAdocao(tabela, a.portalRowId, a.hubJogoId);
      }
    }

    sync();
    const channel = supabase
      .channel(`agenda_portal_${tabela}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tabela }, () => sync())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [enabled, pronto, tabela]);
}
