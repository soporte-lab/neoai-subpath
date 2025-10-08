// app/api/admin/diag/route.ts
export const runtime = 'nodejs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID || '';
const ADMIN_UPLOAD_TOKEN = process.env.ADMIN_UPLOAD_TOKEN || '';
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN || '')
  .split(',').map(s => s.trim()).filter(Boolean);

export async function GET(req: Request) {
  // Authorization: Bearer <ADMIN_UPLOAD_TOKEN>
  const auth = req.headers.get('authorization') || '';
  if (!ADMIN_UPLOAD_TOKEN || auth !== `Bearer ${ADMIN_UPLOAD_TOKEN}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const out: any = {
    env: {
      OPENAI_API_KEY: !!OPENAI_API_KEY,
      VECTOR_STORE_ID: VECTOR_STORE_ID ? 'present' : '',
      ADMIN_UPLOAD_TOKEN: !!ADMIN_UPLOAD_TOKEN,
      ALLOWED_ORIGIN,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
    },
    vectorStore: null,
    files: [] as Array<{ id: string; status?: string; filename?: string; bytes?: number }>,
    errors: [] as string[],
  };

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify(out, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (VECTOR_STORE_ID) {
      // Info del store
      const vs = await fetch(`https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}`, {
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      });
      out.vectorStore = await vs.json();

      // Lista de archivos
      const lst = await fetch(
        `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files?limit=100`,
        { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
      );
      const lj = await lst.json();
      const files = Array.isArray(lj?.data) ? lj.data : [];

      // Metadatos de cada file
      for (const f of files) {
        try {
          const fr = await fetch(`https://api.openai.com/v1/files/${f.id}`, {
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          });
          const fj = await fr.json();
          out.files.push({
            id: f.id,
            status: f.status,
            filename: fj?.filename,
            bytes: fj?.bytes,
          });
        } catch (e: any) {
          out.files.push({ id: f.id, status: f.status });
          out.errors.push(`file ${f.id} meta error: ${String(e?.message || e)}`);
        }
      }
    } else {
      out.errors.push('VECTOR_STORE_ID missing');
    }
  } catch (e: any) {
    out.errors.push(String(e?.message || e));
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
