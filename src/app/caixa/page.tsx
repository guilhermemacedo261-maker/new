'use client';

import { useEffect, useState } from 'react';
import ParticipantAvatar from '@/components/ParticipantAvatar';
import type { FundTransaction, PublicParticipant } from '@/types/database';

type TransactionRow = FundTransaction & { participant: PublicParticipant | null };

export default function CaixaPage() {
  const [total, setTotal] = useState(0);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/fund')
      .then((r) => r.json())
      .then((res) => {
        setTotal(res.total ?? 0);
        setTransactions(res.transactions ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl text-center mb-1">🐷 Caixa da festa</h1>
      <p className="text-center text-xs text-buteco-white/50 mb-6">
        Vaquinha semanal (líder paga menos, lanterna paga mais) - guardado sem fins lucrativos pra festa de fim de ano.
      </p>

      <div className="bg-buteco-charcoal rounded-2xl p-6 text-center mb-8">
        <p className="text-xs text-buteco-white/50 mb-1">Saldo acumulado</p>
        <p className="font-display text-4xl text-buteco-gold">R$ {total.toFixed(2)}</p>
      </div>

      <h2 className="font-display text-lg mb-3">Extrato</h2>
      {loading ? (
        <p className="text-center text-buteco-white/60 py-8">Carregando...</p>
      ) : transactions.length === 0 ? (
        <p className="text-center text-buteco-white/60 py-8">Ainda não tem nenhuma movimentação.</p>
      ) : (
        <div className="bg-buteco-charcoal rounded-2xl divide-y divide-white/5">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              {t.participant ? (
                <ParticipantAvatar name={t.participant.name} photoUrl={t.participant.photo_url} size="sm" />
              ) : (
                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-sm">🎉</span>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold">{t.participant ? t.participant.name : t.description || 'Despesa da festa'}</p>
                <p className="text-xs text-buteco-white/50">{new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <span className={`font-semibold text-sm ${t.type === 'contribution' ? 'text-buteco-green' : 'text-buteco-red'}`}>
                {t.type === 'contribution' ? '+' : '-'}R$ {Number(t.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
