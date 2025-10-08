export const runtime = 'nodejs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const VECTOR_STORE_ID_ENV = process.env.VECTOR_STORE_ID || '';
const ADMIN_UPLOAD_TOKEN = process.env.ADMIN_UPLOAD_TOKEN || '';

function cors() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
}

export async function OPTIONS() { return new Response(null, { status: 204, headers: cors() as any }); }

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const ok = ADMIN_UPLOAD_TOKEN && auth === `Bearer ${ADMIN_UPLOAD_TOKEN}`;
    if (!ok) return new Response('Unauthorized', { status: 401 });

    if (!OPENAI_API_KEY) return new Response('Missing OPENAI_API_KEY', { status: 500 });

    const form = await req.formData();
    const files = form.getAll('files') as File[];
    const vectorStoreId = (form.get('vectorStoreId') as string) || VECTOR_STORE_ID_ENV;
    if (!vectorStoreId) return new Response('Missing VECTOR_STORE_ID', { status: 500 });
    if (!files?.length) return new Response('No files', { status: 400 });

    // 1) Subir a Files API
    const uploadedIds: string[] = [];
    for (const f of files) {
      const fForm = new FormData();
      fForm.append('purpose', 'assistants');
      fForm.append('file', new File([await f.arrayBuffer()], f.name, { type: f.type || 'application/pdf' }));
      const up = await fetch('https://api.openai.com/v1/files', { method: 'POST', headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, body: fForm });
      if (!up.ok) return new Response('Upload failed: ' + await up.text(), { status: 400 });
      const j = await up.json();
      uploadedIds.push(j.id);
    }

    // 2) Asociar al vector store
    for (const id of uploadedIds) {
      const resp = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: id }),
      });
      if (!resp.ok) return new Response('Attach failed: ' + await resp.text(), { status: 400 });
    }

    return Response.json({ ok: true, file_ids: uploadedIds }, { headers: cors() as any });
  } catch (e: any) {
    return new Response('Error: ' + (e?.message || String(e)), { status: 500 });
  }
}
