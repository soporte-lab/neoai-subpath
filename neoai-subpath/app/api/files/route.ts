// app/api/files/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) console.warn('⚠️ Falta OPENAI_API_KEY');

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin');
  return new Response(null, { status: 204, headers: corsHeaders(origin) as any });
}

/**
 * GET /api/files?id=file-xxx
 * Descarga el contenido del file (usando ESTA API key) y devuelve un preview de texto
 */
export async function GET(req: Request) {
  const origin = req.headers.get('origin');
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return Response.json(
      { ok: false, error: 'Missing id' },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  try {
    const r = await fetch(`https://api.openai.com/v1/files/${encodeURIComponent(id)}/content`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    });

    const status = r.status;
    const text = await r.text().catch(() => '');

    if (!r.ok) {
      return Response.json(
        { ok: false, status, error: text || 'download failed' },
        { status, headers: corsHeaders(origin) }
      );
    }

    // Preview limitado
    const preview = text.slice(0, 2000);
    return Response.json(
      { ok: true, status, id, preview, truncated: text.length > preview.length },
      { headers: corsHeaders(origin) }
    );
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin');

  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof Blob)) {
      return Response.json(
        { ok: false, error: 'Missing file' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return Response.json(
        { ok: false, error: 'File too large (max 20MB)' },
        { status: 413, headers: corsHeaders(origin) }
      );
    }

    // Subida a OpenAI Files — usa SIEMPRE ESTA API key
    const upstreamForm = new FormData();
    // Recomendado para Assistants/Responses v2
    upstreamForm.append('purpose', 'assistants');
    upstreamForm.append('file', file, (file as any).name || 'upload.bin');

    const up = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: upstreamForm,
    });

    const j = await up.json().catch(() => ({}));
    if (!up.ok) {
      return Response.json(
        { ok: false, error: j?.error?.message || 'OpenAI upload failed' },
        { status: up.status, headers: corsHeaders(origin) }
      );
    }

    return Response.json(
      {
        ok: true,
        file_id: j.id, // p.ej. "file-abc123"
        filename: (file as any).name || 'upload.bin',
        bytes: file.size || 0,
        purpose: j.purpose,
      },
      { status: 200, headers: corsHeaders(origin) }
    );
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

export async function DELETE(req: Request) {
  const origin = req.headers.get('origin');

  try {
    const url = new URL(req.url);
    let id = url.searchParams.get('id');
    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body?.id;
    }
    if (!id || typeof id !== 'string') {
      return Response.json(
        { ok: false, error: 'Missing id' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const up = await fetch(`https://api.openai.com/v1/files/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    });

    const j = await up.json().catch(() => ({}));
    if (!up.ok) {
      return Response.json(
        { ok: false, error: j?.error?.message || 'OpenAI delete failed' },
        { status: up.status, headers: corsHeaders(origin) }
      );
    }

    return Response.json({ ok: true, id }, { headers: corsHeaders(origin) });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
