'use client';

import { useEffect, useState } from 'react';
import ParticipantAvatar from '@/components/ParticipantAvatar';
import type { PublicParticipant, Week, WeeklyPayment } from '@/types/database';

type PaymentRow = WeeklyPayment & { participant: PublicParticipant };
type ContributionRow = { participant: PublicParticipant; totalPaid: number; weeksPaid: number };
type FundBalance = { total: number; contributions: ContributionRow[] };

const STATUS_LABEL: Record<WeeklyPayment['status'], string> = {
  pending: 'Pendente',
  paid: 'Pago',
  waived: 'Perdoado',
};

const STATUS_COLOR: Record<WeeklyPayment['status'], string> = {
  pending: 'text-buteco-gold',
  paid: 'text-buteco-green',
  waived: 'text-buteco-white/40',
};

export default function AdminPagamentosPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [weekId, setWeekId] = useState('');
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [fund, setFund] = useState<FundBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  useEffect(() => {
    fetch('/api/admin/weeks')
      .then((r) => r.json())
      .then((res) => {
        setWeeks(res.weeks ?? []);
        if (res.weeks?.[0]) setWeekId(res.weeks[0].id);
      });
    loadFund();
  }, []);

  useEffect(() => {
    if (!weekId) return;
    setLoading(true);
    fetch(`/api/admin/payments?weekId=${weekId}`)
      .then((r) => r.json())
      .then((res) => {
        setPayments(res.payments ?? []);
        setLoading(false);
      });
  }, [weekId]);

  function loadFund() {
    fetch('/api/fund')
      .then((r) => r.json())
      .then((res) => setFund({ total: res.total ?? 0, contributions: res.contributions ?? [] }));
  }

  async function runAction(paymentId: string, action: 'paid' | 'waived' | 'regenerate') {
    setBusyId(paymentId);
    const res = await fetch(`/api/admin/payments/${paymentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const updated = await fetch(`/api/admin/payments?weekId=${weekId}`).then((r) => r.json());
      setPayments(updated.payments ?? []);
      loadFund();
    } else {
      const body = await res.json();
      alert(body.error ?? 'Erro ao atualizar cobrança');
    }
    setBusyId(null);
  }

  async function handleAddExpense() {
    const amount = Number(expenseAmount);
    if (!amount || amount <= 0) return;
    setSavingExpense(true);
    await fetch('/api/admin/fund/expense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, description: expenseDesc }),
    });
    setExpenseAmount('');
    setExpenseDesc('');
    setSavingExpense(false);
    loadFund();
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <h1 className="font-display text-2xl mb-2">Pagamentos (vaquinha)</h1>
      <p className="text-sm text-buteco-white/50 mb-1">
        Caixa acumulado: <span className="text-buteco-gold font-semibold">R$ {(fund?.total ?? 0).toFixed(2)}</span>
      </p>
      <p className="text-xs text-buteco-white/40 mb-6">
        Você sempre pode liberar alguém manualmente com &quot;Marcar pago&quot; (ex: quem pagou em espécie fora do
        app) - não depende do Pix cair pelo Mercado Pago.
      </p>

      {fund && fund.contributions.length > 0 && (
        <>
          <h2 className="font-display text-lg mb-3">Quanto cada um já contribuiu</h2>
          <div className="bg-buteco-charcoal rounded-2xl divide-y divide-white/5 mb-8">
            {fund.contributions.map((c) => (
              <div key={c.participant.id} className="flex items-center gap-3 px-4 py-3">
                <ParticipantAvatar name={c.participant.name} photoUrl={c.participant.photo_url} size="sm" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{c.participant.name}</p>
                  <p className="text-xs text-buteco-white/50">{c.weeksPaid} rodada(s) paga(s)</p>
                </div>
                <span className="font-display text-buteco-gold">R$ {c.totalPaid.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <select
        value={weekId}
        onChange={(e) => setWeekId(e.target.value)}
        className="w-full bg-buteco-charcoal border border-white/10 rounded-lg px-4 py-2 mb-6"
      >
        {weeks.map((w) => (
          <option key={w.id} value={w.id}>
            Semana {w.week_number} ({w.status})
          </option>
        ))}
      </select>

      {loading ? (
        <p className="text-center text-buteco-white/60 py-8">Carregando...</p>
      ) : payments.length === 0 ? (
        <p className="text-center text-buteco-white/60 py-8">
          Nenhuma cobrança gerada ainda pra essa semana (só é gerada quando todos os jogos terminam).
        </p>
      ) : (
        <div className="bg-buteco-charcoal rounded-2xl divide-y divide-white/5 mb-8">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <ParticipantAvatar name={p.participant.name} photoUrl={p.participant.photo_url} size="sm" />
              <div className="flex-1">
                <p className="font-semibold text-sm">{p.participant.name}</p>
                <p className="text-xs text-buteco-white/50">
                  R$ {Number(p.amount).toFixed(2)} · <span className={STATUS_COLOR[p.status]}>{STATUS_LABEL[p.status]}</span>
                  {!p.pix_copia_cola && p.status === 'pending' && ' · sem Pix gerado'}
                </p>
              </div>
              {p.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => runAction(p.id, 'regenerate')}
                    disabled={busyId === p.id}
                    className="text-xs px-3 py-2 rounded-lg bg-buteco-gold/20 text-buteco-gold disabled:opacity-40"
                  >
                    {p.pix_copia_cola ? 'Gerar Pix novo' : 'Gerar Pix'}
                  </button>
                  <button
                    onClick={() => runAction(p.id, 'paid')}
                    disabled={busyId === p.id}
                    className="text-xs px-3 py-2 rounded-lg bg-buteco-green/20 text-buteco-green disabled:opacity-40"
                  >
                    Marcar pago
                  </button>
                  <button
                    onClick={() => runAction(p.id, 'waived')}
                    disabled={busyId === p.id}
                    className="text-xs px-3 py-2 rounded-lg bg-white/10 text-buteco-white/60 disabled:opacity-40"
                  >
                    Perdoar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="font-display text-lg mb-3">Lançar despesa da festa</h2>
      <div className="bg-buteco-charcoal rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <input
          type="number"
          step="0.01"
          placeholder="Valor (R$)"
          value={expenseAmount}
          onChange={(e) => setExpenseAmount(e.target.value)}
          className="flex-1 bg-buteco-black border border-white/10 rounded-lg px-3 py-2"
        />
        <input
          type="text"
          placeholder="Descrição (ex: bebida, espaço)"
          value={expenseDesc}
          onChange={(e) => setExpenseDesc(e.target.value)}
          className="flex-[2] bg-buteco-black border border-white/10 rounded-lg px-3 py-2"
        />
        <button
          onClick={handleAddExpense}
          disabled={savingExpense || !expenseAmount}
          className="px-4 py-2 rounded-lg bg-buteco-red font-display disabled:opacity-40"
        >
          Lançar
        </button>
      </div>
    </div>
  );
}
