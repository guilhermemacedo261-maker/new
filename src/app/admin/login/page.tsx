'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? 'Erro ao entrar');
      return;
    }
    router.replace(searchParams.get('next') || '/admin');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-buteco-charcoal rounded-2xl p-8 w-full max-w-sm">
      <h1 className="font-display text-2xl text-center mb-6">🔐 ADMIN</h1>
      <input
        type="password"
        placeholder="Senha do administrador"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg bg-buteco-black border border-white/10 px-4 py-3 mb-4 outline-none focus:border-buteco-gold"
        autoFocus
      />
      {error && <p className="text-buteco-red text-sm mb-4">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-buteco-red font-display disabled:opacity-50"
      >
        {loading ? 'ENTRANDO...' : 'ENTRAR'}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Suspense fallback={null}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
