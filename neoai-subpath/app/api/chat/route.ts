// app/api/chat/route.ts
import { cookies, headers } from "next/headers";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
if (!OPENAI_API_KEY) console.warn('⚠️ Falta OPENAI_API_KEY');

const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID || '';
const ENABLE_WEB_SEARCH = (process.env.ENABLE_WEB_SEARCH ?? '1') !== '0';

// ===== CORS =====
function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

const sseHeaders = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
};

type UIMessage = { role: 'user' | 'assistant'; content: string };

export async function OPTIONS(req: Request) {
  return new Response(null, { headers: corsHeaders(req.headers.get('origin')) });
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin');

  try {
    const {
      messages = [],
      images = [],
      file_ids = [],
      inline_texts = [],
    } = (await req.json().catch(() => ({}))) as {
      messages?: UIMessage[];
      images?: string[];
      file_ids?: string[];     // IDs de OpenAI Files
      inline_texts?: string[]; // Texto en línea capturado en cliente (txt/md/csv)
    };

    // ===== Language detection (es/en/fr/it/de) =====
    type SupportedLang = "es" | "en" | "fr" | "it" | "de";
    const supportedLangs: readonly SupportedLang[] = ["es", "en", "fr", "it", "de"];

    const isSupportedLang = (lang: string): lang is SupportedLang =>
      (supportedLangs as readonly string[]).includes(lang);

    const pickLangFromAccept = (acceptHeader: string): SupportedLang => {
      const prefs = acceptHeader
        .split(",")
        .map((p) => p.split(";")[0].trim().toLowerCase())
        .map((code) => code.split("-")[0]);
      return (prefs.find(isSupportedLang) || "es") as SupportedLang;
    };

    const cookieLang = cookies().get("lang")?.value?.toLowerCase();
    const accept = headers().get("accept-language") || "";
    const lang: SupportedLang =
      cookieLang && isSupportedLang(cookieLang) ? cookieLang : pickLangFromAccept(accept);

    const attachmentRuleByLang: Record<SupportedLang, string> = {
      es: "Responde únicamente basándote en los archivos adjuntos de este turno. No uses la base de conocimiento global ni de la web.",
      en: "Answer only using the files attached in this turn. Do not use the global knowledge base or the web.",
      fr: "Réponds uniquement en te basant sur les fichiers joints à ce tour. N’utilise pas la base de connaissances globale ni le web.",
      it: "Rispondi solo basandoti sui file allegati in questo turno. Non usare la base di conoscenza globale né il web.",
      de: "Antworte ausschließlich basierend auf den in diesem Zug angehängten Dateien. Nutze weder die globale Wissensbasis noch das Web.",
    };

    // 1) Historial (mapea tipos por rol)
    const input: any[] = [];

    // System message to enforce language (must be first)
    input.unshift({
      role: "system",
      content: [
        {
          type: "input_text",
          text:
            `You are a helpful AI assistant. Always reply in ${lang}. ` +
            `Use the same language as the user's last message whenever possible. ` +
            `Never translate unless the user asks you to translate.`
        }
      ],
    });

    for (const m of messages) {
      if (!m || typeof m.content !== 'string') continue;
      input.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: [{ type: m.role === 'assistant' ? 'output_text' : 'input_text', text: m.content }],
      });
    }

    // 2) Imágenes del turno (si las usas)
    if (Array.isArray(images)) {
      for (const img of images) {
        if (typeof img === 'string' && img.startsWith('data:image/')) {
          input.push({ role: 'user', content: [{ type: 'input_image', image_url: img }] });
        }
      }
    }

    // 3) Adjuntos del turno: separar PDF vs NO-PDF por metadata
    const validIds = (Array.isArray(file_ids) ? file_ids : []).filter(
      (fid: any) => typeof fid === 'string' && (fid.startsWith('file-') || fid.startsWith('file_'))
    );

    const pdfIds: string[] = [];
    const nonPdfIds: Array<{ id: string; name: string }> = [];

    for (const fid of validIds) {
      try {
        const metaRes = await fetch(`https://api.openai.com/v1/files/${encodeURIComponent(fid)}`, {
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        });
        const meta = await metaRes.json().catch(() => ({} as any));
        const filename: string = meta?.filename || meta?.name || '';
        const ext = (filename.split('.').pop() || '').toLowerCase();
        if (ext === 'pdf') pdfIds.push(fid);
        else nonPdfIds.push({ id: fid, name: filename || fid });
      } catch {
        // Si falló la metadata, trátalo como NO-PDF por seguridad (evita error de context stuffing)
        nonPdfIds.push({ id: fid, name: fid });
      }
    }

    // 4) Texto inline del cliente para txt/md/csv
    const inline = (Array.isArray(inline_texts) ? inline_texts : [])
      .filter((t) => typeof t === 'string' && t.trim().length > 0)
      .map((t, i) => `\n[ARCHIVO_INLINE_${i + 1}]\n${t}\n`);

    // 5) Construcción de tools según si hay adjuntos o no
    const tools: any[] = [];

    if (pdfIds.length > 0 || inline.length > 0 || nonPdfIds.length > 0) {
      // ✅ MODO A: SOLO adjuntos del turno
      input.push({
        role: 'user',
        content: [{
          type: 'input_text',
          text: attachmentRuleByLang[lang],
        }],
      });

      // 5a) PDFs → como input_file
      for (const fid of pdfIds) {
        input.push({ role: 'user', content: [{ type: 'input_file', file_id: fid }] });
      }

      // 5b) Inline ya recibido desde el cliente (txt/md/csv leídos en el cliente)
      if (inline.length > 0) {
        input.push({ role: 'user', content: [{ type: 'input_text', text: inline.join('\n') }] });
      }

      // 5c) Fallback robusto: si hay NO-PDF sin inline recibido, descargamos en el servidor y lo inyectamos como texto
      for (const { id, name } of nonPdfIds) {
        // Si ya vino inline_texts, no hace falta duplicar
        if (inline.length > 0) continue;

        try {
          const r = await fetch(`https://api.openai.com/v1/files/${encodeURIComponent(id)}/content`, {
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          });
          if (!r.ok) {
            input.push({
              role: 'user',
              content: [{ type: 'input_text', text: `⚠️ No se pudo descargar el archivo ${name} (HTTP ${r.status}).` }],
            });
            continue;
          }
          const txt = await r.text();
          const safe = (txt || '').slice(0, 100_000);
          if (safe.trim().length === 0) {
            input.push({
              role: 'user',
              content: [{ type: 'input_text', text: `⚠️ El archivo ${name} está vacío o no contiene texto legible.` }],
            });
          } else {
            input.push({
              role: 'user',
              content: [{ type: 'input_text', text: `--- CONTENIDO (${name}) ---\n${safe}\n--- FIN (${name}) ---` }],
            });
          }
        } catch (e: any) {
          input.push({
            role: 'user',
            content: [{ type: 'input_text', text: `⚠️ Error al leer ${name}: ${e?.message || String(e)}` }],
          });
        }
      }

      // Importante: cuando hay adjuntos, NO añadimos vector store ni web_search
    } else {
      // ✅ MODO B: sin adjuntos → base global (VECTOR_STORE_ID) y web si quieres
      if (VECTOR_STORE_ID) tools.push({ type: 'file_search', vector_store_ids: [VECTOR_STORE_ID] });
      if (ENABLE_WEB_SEARCH) tools.push({ type: 'web_search' });
    }

    // 6) Llamada a Responses API (SSE)
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input,
        ...(tools.length ? { tools } : {}),
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => '');
      return new Response(`Upstream error: ${upstream.status} ${errText}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain', ...corsHeaders(origin) },
      });
    }

    // 7) Reemitir SSE al cliente
    const readable = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        const enc = new TextEncoder();
        const send = (obj: any) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = new TextDecoder().decode(value);

            for (const line of chunk.split('\n')) {
              const m = line.match(/^\s*data:\s*(\{.*\})\s*$/);
              if (!m) continue;
              try {
                const evt = JSON.parse(m[1]);
                if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
                  send({ type: 'response.output_text.delta', delta: evt.delta });
                } else if (typeof evt.output_text === 'string') {
                  send({ output_text: evt.output_text });
                }
              } catch { /* ignore malformed lines */ }
            }
          }
        } finally {
          controller.enqueue(enc.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, { headers: { ...sseHeaders, ...corsHeaders(origin) } });
  } catch (e: any) {
    return new Response(`Upstream error: ${e?.message || String(e)}`, {
      status: 400,
      headers: { 'Content-Type': 'text/plain', ...corsHeaders(origin) },
    });
  }
}
