export const runtime = 'nodejs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const ADMIN_UPLOAD_TOKEN = process.env.ADMIN_UPLOAD_TOKEN || '';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || '';
  if (!ADMIN_UPLOAD_TOKEN || auth !== `Bearer ${ADMIN_UPLOAD_TOKEN}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!OPENAI_API_KEY) return new Response('Missing OPENAI_API_KEY', { status: 500 });

  const { name = 'cursos-neorejuvenation' } = await req.json().catch(() => ({}));

  const r = await fetch('https://api.openai.com/v1/vector_stores', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  const text = await r.text();
  if (!r.ok) return new Response(text, { status: 400 });
  return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
}
