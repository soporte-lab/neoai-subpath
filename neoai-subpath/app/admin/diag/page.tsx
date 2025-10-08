'use client';
import { useState } from 'react';

export default function AdminDiagPage() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setResult('');
    try {
      const r = await fetch('/api/admin/diag', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const t = await r.text();
      setResult(t);
    } catch (e: any) {
      setResult('Error: ' + String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <h1 className="text-2xl mb-4">Diagnóstico (Vector Store & Config)</h1>
      <div className="space-y-3 mb-4">
        <input
          type="password"
          placeholder="ADMIN_UPLOAD_TOKEN"
          value={token}
          onChange={(e)=>setToken(e.target.value)}
          className="w-full bg-neutral-900 rounded px-3 py-2"
        />
        <button
          onClick={run}
          disabled={!token || busy}
          className="px-4 py-2 bg-white/10 rounded hover:bg-white/20 disabled:opacity-50"
        >
          {busy ? 'Cargando…' : 'Ver diagnóstico'}
        </button>
      </div>
      {result && (
        <pre className="text-xs whitespace-pre-wrap break-words bg-neutral-900 p-3 rounded">
{result}
        </pre>
      )}
    </main>
  );
}
