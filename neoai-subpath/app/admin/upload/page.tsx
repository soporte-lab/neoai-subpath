'use client';
import { useState } from 'react';

export default function AdminUploadPage() {
  const [token, setToken] = useState('');
  const [vectorStoreId, setVectorStoreId] = useState(''); // opcional si aún no está en Vercel
  const [files, setFiles] = useState<FileList | null>(null);
  const [log, setLog] = useState<string>('');

  async function createStore() {
    setLog('Creando vector store...');
    const resp = await fetch('/api/admin/create-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'cursos-neorejuvenation' }),
    });
    const t = await resp.text();
    try { setLog('Store creado: ' + JSON.stringify(JSON.parse(t), null, 2)); }
    catch { setLog('Respuesta: ' + t); }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!files || !files.length) return;
    setLog('Subiendo…');

    const form = new FormData();
    for (const f of Array.from(files)) form.append('files', f);
    if (vectorStoreId) form.append('vectorStoreId', vectorStoreId); // útil antes de ponerlo en Vercel

    const resp = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    const t = await resp.text();
    try { setLog('OK: ' + JSON.stringify(JSON.parse(t), null, 2)); }
    catch { setLog('Respuesta: ' + t); }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <h1 className="text-2xl mb-4">Subir PDFs al Vector Store</h1>

      <div className="space-y-3 mb-8">
        <input
          type="password" placeholder="ADMIN_UPLOAD_TOKEN"
          value={token} onChange={(e)=>setToken(e.target.value)}
          className="w-full bg-neutral-900 rounded px-3 py-2"
        />
        <div className="flex gap-2 flex-wrap">
          <button onClick={createStore} className="px-4 py-2 bg-white/10 rounded hover:bg-white/20">
            Crear Vector Store
          </button>
          <input
            type="text" placeholder="VECTOR_STORE_ID (opcional si ya está en Vercel)"
            value={vectorStoreId} onChange={(e)=>setVectorStoreId(e.target.value)}
            className="flex-1 bg-neutral-900 rounded px-3 py-2"
          />
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input type="file" accept="application/pdf" multiple onChange={(e)=>setFiles(e.target.files)} className="w-full" required />
        <button className="px-4 py-2 bg-white/10 rounded hover:bg-white/20">Subir PDFs</button>
      </form>

      {log && <pre className="mt-6 text-sm whitespace-pre-wrap">{log}</pre>}
    </main>
  );
}
