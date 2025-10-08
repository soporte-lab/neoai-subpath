// app/api/transcribe/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
if (!OPENAI_API_KEY) console.warn('⚠️ Falta OPENAI_API_KEY');

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin');
  return new Response(null, { status: 204, headers: corsHeaders(origin) as any });
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin');

  try {
    const form = await req.formData();
    const audio = form.get('audio');

    if (!(audio instanceof Blob)) {
      return Response.json(
        { ok: false, error: 'Missing audio file' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    if (audio.size > 25 * 1024 * 1024) {
      return Response.json(
        { ok: false, error: 'Audio too large (max 25MB)' },
        { status: 413, headers: corsHeaders(origin) }
      );
    }

    // Subimos el WAV a Whisper
    const upstream = new FormData();
    upstream.append('file', audio, 'recording.wav');
    upstream.append('model', 'whisper-1'); // modelo de transcripción
    // upstream.append('language', 'es');  // opcional: fuerza idioma
    // upstream.append('prompt', '');      // opcional: sesgo léxico

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: upstream,
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return Response.json(
        { ok: false, error: json?.error?.message || 'Transcription failed' },
        { status: resp.status, headers: corsHeaders(origin) }
      );
    }

    // Respuesta estándar de whisper: { text: "..." }
    return Response.json(
      { ok: true, text: json?.text || '' },
      { status: 200, headers: corsHeaders(origin) }
    );
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
